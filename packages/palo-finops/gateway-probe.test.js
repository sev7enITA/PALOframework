import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {FinOpsLedger} from './ledger.js';
import {FinOpsGatewayProbe} from './gateway-probe.js';
import {summarize} from './index.js';

async function fixture(handler){
 const server=createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const endpoint=`http://127.0.0.1:${server.address().port}/probe`;
 const dir=mkdtempSync(join(tmpdir(),'finops-gateway-')),path=join(dir,'ledger.sqlite');
 const w=JSON.parse(readFileSync(new URL('../../data/finops-demo.json',import.meta.url)));
 w.events=[];w.routes.find(r=>r.id==='efficient').endpointHost=new URL(endpoint).host;
 w.policy.validUntil='2099-01-01T00:00:00.000Z';for(const r of w.rateCards)r.validUntil='2099-01-01T00:00:00.000Z';
 const ledger=new FinOpsLedger(path,{initialize:w});ledger.close();
 const config={endpoint,principalId:'synthetic-principal',policyDigest:FinOpsGatewayProbe.policyDigest(w.policy),timeoutMs:150};
 const gateway=new FinOpsGatewayProbe(path,config);
 const at=new Date().toISOString();
 const request={fromRouteId:'frontier',toRouteId:'efficient',taskId:'task-code',workloadId:'engineering',requestedAt:at,policyRevision:'1',disclosureContractRef:w.policy.disclosureContractRef,toolSchemaDigest:w.routes[1].toolSchemaDigest,unresolvedEffects:false,qualityEvidenceRef:'urn:synthetic:quality',reason:'cost',stayMicros:200000,switchMicros:50000,worstCaseMicros:100000,uncertaintyMarginMicros:1000,cacheState:'cold'};
 const event={id:'reserve-test',type:'reserve',at,attemptId:'probe-attempt',taskId:'task-code',workloadId:'engineering',routeId:'efficient',rateCardId:'efficient-v1',reservedMicros:100000,estimatedMicros:50000,source:'synthetic'};
 const input={requestId:'probe-1',principalId:'synthetic-principal',request,event,body:{model:'Synthetic Efficient',input:'synthetic fixture'}};
 return {gateway,path,config,input,at,async close(){gateway.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true});}};
}
test('loopback probe reserves before dispatch, settles full costs and never repeats a request',async()=>{
 let calls=0,reservedAtServer=0,f;
 f=await fixture((request,response)=>{calls++;const ledger=new FinOpsLedger(f.path);reservedAtServer=summarize(ledger.snapshot()).reservedMicros;ledger.close();response.setHeader('content-type','application/json');response.end(JSON.stringify({final:true,costMicros:120000,evidenceRef:'urn:synthetic:provider'}));});
 try{
  const result=await f.gateway.dispatch(f.input,{at:f.at});assert.equal(calls,1);assert.equal(reservedAtServer,100000);assert.equal(result.costMicros,120000);assert.equal(result.productionQualified,false);
  assert.equal(summarize(f.gateway.snapshot()).knownMicros,120000);
  const again=await f.gateway.dispatch(f.input,{at:f.at});assert.equal(again.replayed,true);assert.equal(calls,1);
  await assert.rejects(()=>f.gateway.dispatch({...f.input,body:{model:'Synthetic Efficient',input:'changed'}},{at:f.at}),/different payload/);assert.equal(calls,1);
 }finally{await f.close();}
});
test('denial prevents network and budget mutation',async()=>{
 let calls=0;const f=await fixture((request,response)=>{calls++;response.end('{}');});
 try{
  await assert.rejects(()=>f.gateway.dispatch({...f.input,request:{...f.input.request,unresolvedEffects:true}},{at:f.at}),/rejected/);
  assert.equal(calls,0);assert.equal(summarize(f.gateway.snapshot()).committedMicros,0);
  await assert.rejects(()=>f.gateway.dispatch({...f.input,principalId:'other'},{at:f.at}),/principal/);
  await assert.rejects(()=>f.gateway.dispatch({...f.input,body:{model:'wrong'}},{at:f.at}),/model/);
 }finally{await f.close();}
});
test('timeout retains full reserve; reopened probe cannot resend even when outcome is unknown',async()=>{
 let calls=0;const f=await fixture(()=>{calls++;});
 try{
  const result=await f.gateway.dispatch(f.input,{at:f.at});assert.equal(result.state,'unknown');assert.equal(summarize(f.gateway.snapshot()).reservedMicros,100000);
  const reopened=new FinOpsGatewayProbe(f.path,f.config);
  try{const replay=await reopened.dispatch(f.input,{at:new Date().toISOString()});assert.equal(replay.replayed,true);assert.equal(calls,1);}finally{reopened.close();}
 }finally{await f.close();}
});
test('process crash during dispatch preserves capacity and prevents a second send',async()=>{
 let calls=0,arrived;const reached=new Promise(resolve=>{arrived=resolve;});
 const f=await fixture(()=>{calls++;arrived();});let child;
 try{
  f.config.timeoutMs=5000;
  const script=`import {FinOpsGatewayProbe} from ${JSON.stringify(new URL('./gateway-probe.js',import.meta.url).href)}; let data='';for await(const chunk of process.stdin)data+=chunk;const x=JSON.parse(data);const g=new FinOpsGatewayProbe(x.path,x.config);await g.dispatch(x.input,{at:x.at});g.close();`;
  child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['pipe','pipe','pipe']});
  child.stdin.end(JSON.stringify({path:f.path,config:f.config,input:f.input,at:f.at}));
  let timeout;
  try{await Promise.race([reached,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Child did not reach loopback server.')),4000);})]);}finally{clearTimeout(timeout);}
  const exited=once(child,'exit');child.kill('SIGKILL');await exited;
  const reopened=new FinOpsGatewayProbe(f.path,f.config);
  try{const recovered=await reopened.dispatch(f.input,{at:new Date().toISOString()});assert.equal(recovered.state,'reserved_no_retry');assert.equal(recovered.receipt,null);assert.equal(calls,1);assert.equal(summarize(reopened.snapshot()).reservedMicros,100000);}finally{reopened.close();}
 }finally{if(child&&!child.killed)child.kill('SIGKILL');await f.close();}
});
test('redirects cannot move execution outside the pinned endpoint',async()=>{
 let calls=0;const f=await fixture((request,response)=>{calls++;response.writeHead(302,{location:'http://example.invalid/never'});response.end();});
 try{const result=await f.gateway.dispatch(f.input,{at:f.at});assert.equal(result.state,'unknown');assert.equal(calls,1);assert.equal(summarize(f.gateway.snapshot()).reservedMicros,100000);assert.throws(()=>new FinOpsGatewayProbe(f.path,{...f.config,endpoint:'https://example.com/'}),/127/);}finally{await f.close();}
});
