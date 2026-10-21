import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {FinOpsLedger} from './ledger.js';
import {FinOpsGateway} from './gateway.js';
import {sha,decimalMicros,fetchOpenAICosts,mapOpenAICosts} from './provider.js';
import {createFinOpsReader} from './reader.js';
import {freezeBenchmarkPlan,runRoutingBenchmark,analyzeRoutingBenchmark} from './benchmark.js';
import {summarize,appendEvent} from './index.js';
import * as b from './billing.js';

const token='synthetic-principal-token-never-use-in-production',apiKey='synthetic-key-never-send';
const config={provider:'openai',organizationId:'org-test',projectIds:['proj-test'],currency:'USD',partition:'test',window:{start:'2026-10-19T00:00:00.000Z',end:'2026-10-20T00:00:00.000Z'}};
const page=(value='0.1000004',more=false)=>({data:[{object:'bucket',start_time:Date.parse(config.window.start)/1000,end_time:Date.parse(config.window.end)/1000,results:[{object:'organization.costs.result',project_id:'proj-test',line_item:'test input',amount:{value,currency:'usd'}}]}],has_more:more,next_page:more?'cursor':null});
const response=(value,more)=>new Response(JSON.stringify(page(value,more)),{headers:{'content-type':'application/json','x-request-id':'req-test'}});
async function capture(value='0.1000004'){return fetchOpenAICosts(config,{apiKey,fetchImpl:async()=>response(value),at:'2026-10-21T00:00:00.000Z'});}
function gatewayFixture(fetchImpl){
 const dir=mkdtempSync(join(tmpdir(),'palo-finops-runtime-')),path=join(dir,'ledger.sqlite');
 const w=JSON.parse(readFileSync(new URL('../../data/finops-demo.json',import.meta.url)));w.events=[];w.source='manual';w.createdAt='2026-01-01T00:00:00.000Z';
 for(const r of w.routes){r.provider='OpenAI';r.endpointHost='api.openai.com';r.model='synthetic-'+r.id;}
 for(const r of w.rateCards){r.validFrom='2026-01-01T00:00:00.000Z';r.validUntil='2099-01-01T00:00:00.000Z';for(const k of Object.keys(r.rates))r.rates[k]=100000;}
 w.policy.validUntil='2099-01-01T00:00:00.000Z';
 const ledger=new FinOpsLedger(path,{initialize:w});ledger.close();
 const cfg={provider:'openai',organizationId:'org-test',projectId:'proj-test',principalId:'pilot-user',tokenSha256:sha(token),policyDigest:sha(w.policy),workloadIds:w.workloads.map(w=>w.id),routeIds:w.routes.map(r=>r.id),maxRequestMicros:1000000,maxInputBytes:1000,maxOutputTokens:100,framingTokenAllowance:100,validUntil:'2099-01-01T00:00:00.000Z',timeoutMs:100};
 const g=new FinOpsGateway(path,cfg,{apiKey,fetchImpl});
 const request={requestId:'request-1',taskId:'task-code',routeId:'efficient',rateCardId:'efficient-v1',input:'synthetic test',maxOutputTokens:16,reservedMicros:50000};
 return {dir,path,w,cfg,g,request,close(){g.close();rmSync(dir,{recursive:true,force:true});}};
}
const reply=()=>new Response(JSON.stringify({id:'resp-test',status:'completed',usage:{input_tokens:4,output_tokens:1,input_tokens_details:{cached_tokens:2}},output:[{type:'message',content:[{type:'output_text',text:'OK'}]}]}),{headers:{'x-request-id':'provider-request'}});

test('provider decimal conversion preserves rounding provenance including negative credits',()=>{
 assert.equal(decimalMicros('0.0000005').amountMicros,1);assert.equal(decimalMicros('-0.0000005').amountMicros,-1);assert.equal(decimalMicros('1e-6').amountMicros,1);assert.equal(decimalMicros('0.1').rounded,false);assert.throws(()=>decimalMicros('NaN'),/decimal/);
});
test('read-only connector pins endpoint/scope, maps stable identities and records estimates',async()=>{
 let called;const c=await fetchOpenAICosts(config,{apiKey,fetchImpl:async(url,opts)=>{called={url,opts};return response();}});
 assert.equal(called.url.origin,'https://api.openai.com');assert.equal(called.opts.method,'GET');assert.deepEqual(called.url.searchParams.getAll('group_by'),['project_id','line_item']);assert.equal(called.opts.redirect,'error');
 const x=mapOpenAICosts(c);assert.equal(x.batch.records[0].amountMicros,100000);assert.equal(x.batch.records[0].finality,'estimated');assert.equal(x.batch.records[0].chargeKind,'shared');assert.equal(x.receipt.rounding[0].rounded,true);assert.equal(JSON.stringify(x).includes(apiKey),false);
 const w=JSON.parse(readFileSync(new URL('../../data/finops-demo.json',import.meta.url)));let book=b.createBillingBook(w,{source:'openai-costs-api',account:config.organizationId});book=await b.importBilling(book,x.batch);
 assert.equal(mapOpenAICosts(c,book).batch.records[0].revision,1);
 const changed=mapOpenAICosts(await capture('0.2'),book);assert.equal(changed.batch.records[0].revision,2);assert.equal(changed.batch.records[0].supersedes,b.recordRef(x.batch.records[0]));
});
test('connector rejects incomplete pagination, missing buckets, foreign projects and currencies',async()=>{
 let n=0;await assert.rejects(()=>fetchOpenAICosts(config,{apiKey,fetchImpl:async()=>++n===1?response('0.1',true):new Response('',{status:500})}),/HTTP 500/);
 const missing=await capture();missing.pages[0].data=[];assert.throws(()=>mapOpenAICosts(missing),/Missing daily/);
 const foreign=await capture();foreign.pages[0].data[0].results[0].project_id='other';assert.throws(()=>mapOpenAICosts(foreign),/allowlist/);
 const fx=await capture();fx.pages[0].data[0].results[0].amount.currency='eur';assert.throws(()=>mapOpenAICosts(fx),/currency/);
 const empty=await capture();empty.pages[0].data[0].results=[];assert.equal(mapOpenAICosts(empty).batch.records.length,0);
 const credit=mapOpenAICosts(await capture('-0.01'));assert.equal(credit.batch.records[0].amountMicros,-10000);assert.equal(credit.batch.records[0].allocationScope,'shared');
});
test('dispatch claim and reservation roll back together if the claim insert fails',async()=>{
 let calls=0;const f=gatewayFixture(async()=>{calls++;return reply();}),db=new DatabaseSync(f.path);
 try{
  db.exec("CREATE TRIGGER fail_dispatch_insert BEFORE INSERT ON finops_dispatch BEGIN SELECT RAISE(ABORT,'injected-claim-write-failure'); END;");
  await assert.rejects(()=>f.g.dispatch(f.request,{credential:token}),/injected-claim/);assert.equal(calls,0);assert.equal(f.g.snapshot().events.length,0);assert.equal(f.g.receipts().length,0);
  db.exec('DROP TRIGGER fail_dispatch_insert');await f.g.dispatch(f.request,{credential:token});assert.equal(calls,1);assert.equal(summarize(f.g.snapshot()).reservedMicros,50000);
 }finally{db.close();f.close();}
});
test('gateway authenticates and checks limits before any send, reserves before network and retains unknown invoice liability',async()=>{
 let calls=0,f;f=gatewayFixture(async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const l=new FinOpsLedger(f.path);assert.equal(summarize(l.snapshot()).reservedMicros,50000);l.close();const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.tools,undefined);return reply();});
 try{
  await assert.rejects(()=>f.g.dispatch(f.request,{credential:'bad-secret-long-enough-for-check'}),/identity denied/);
  await assert.rejects(()=>f.g.dispatch({...f.request,tools:[{}]},{credential:token}),/Unsupported/);
  await assert.rejects(()=>f.g.dispatch({...f.request,reservedMicros:0},{credential:token}),/Reservation/);assert.equal(calls,0);
  await assert.rejects(()=>f.g.dispatch({...f.request,maxOutputTokens:15},{credential:token}),/minimum/);assert.equal(calls,0);
  const result=await f.g.dispatch(f.request,{credential:token});assert.equal(result.receipt.status,'completed');assert.equal(result.outputText,'OK');assert.equal(result.receipt.costMicros,null);assert.equal(result.receipt.identityMode,'local-secret-authenticated-principal');
  assert.equal(summarize(f.g.snapshot()).reservedMicros,50000);assert.equal(summarize(f.g.snapshot()).unresolvedCount,1);
  const replay=await f.g.dispatch(f.request,{credential:token});assert.equal(replay.replayed,true);assert.equal(calls,1);
  await assert.rejects(()=>f.g.dispatch({...f.request,input:'different'},{credential:token}),/different contents/);
  assert.equal(JSON.stringify(f.g.receipts()).includes(token),false);assert.equal(JSON.stringify(f.g.receipts()).includes(apiKey),false);
 }finally{f.close();}
});
test('gateway repeated concurrent request cannot dispatch twice; transport failure preserves reservation',async()=>{
 let release,calls=0;const f=gatewayFixture(async()=>{calls++;await new Promise(resolve=>{release=resolve;});throw new Error('private error must not leak');});
 try{const first=f.g.dispatch(f.request,{credential:token});await new Promise(resolve=>setImmediate(resolve));const second=await f.g.dispatch(f.request,{credential:token});assert.equal(second.replayed,true);assert.equal(second.state,'reserved_no_retry');release();const r=await first;assert.equal(calls,1);assert.equal(r.receipt.errorCode,'transport-failure-or-timeout');assert.equal(summarize(f.g.snapshot()).reservedMicros,50000);}finally{f.close();}
});
test('crashed dispatch remains reserved and is not resent after restart',async()=>{
 const f=gatewayFixture(async()=>reply());f.g.close();
 const moduleUrl=new URL('./gateway.js',import.meta.url).href;
 const script=`import {FinOpsGateway} from ${JSON.stringify(moduleUrl)};const g=new FinOpsGateway(${JSON.stringify(f.path)},${JSON.stringify(f.cfg)},{apiKey:${JSON.stringify(apiKey)},fetchImpl:async()=>{process.stdout.write('SENT\\n');await new Promise(()=>{});}});await g.dispatch(${JSON.stringify(f.request)},{credential:${JSON.stringify(token)}});`;
 const child=spawn(process.execPath,['--input-type=module','-e',script],{stdio:['ignore','pipe','pipe']});
 try{
  let timer;const seen=await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('child timeout')),5000);})]).finally(()=>clearTimeout(timer));assert.match(String(seen[0]),/SENT/);const exit=once(child,'exit');child.kill('SIGKILL');await exit;
  let calls=0;const g=new FinOpsGateway(f.path,f.cfg,{apiKey,fetchImpl:async()=>{calls++;return reply();}});try{const r=await g.dispatch(f.request,{credential:token});assert.equal(r.replayed,true);assert.equal(r.state,'reserved_no_retry');assert.equal(calls,0);assert.equal(summarize(g.snapshot()).reservedMicros,50000);}finally{g.close();}
 }finally{child.kill('SIGKILL');rmSync(f.dir,{recursive:true,force:true});}
});
test('reader authenticates and pins scope; no model-supplied paths or write tools',async()=>{
 const w=JSON.parse(readFileSync(new URL('../../data/finops-demo.json',import.meta.url))),cfg={principalId:'reader',tokenSha256:sha(token),scopes:['finops:read'],workspaceIds:[w.workspaceId],validUntil:'2099-01-01T00:00:00.000Z'};
 await assert.rejects(()=>createFinOpsReader({workspace:w},{...cfg,workspaceIds:[]},{credential:token}),/outside/);
 await assert.rejects(()=>createFinOpsReader({workspace:w},cfg,{credential:'wrong-secret-long-enough'}),/denied/);
 const reader=await createFinOpsReader({workspace:w},cfg,{credential:token});const r=reader.query('finops_summary');assert.equal(r.readOnly,true);assert.match(r.citation.bundleDigest,/^[a-f0-9]{64}$/);assert.equal(reader.tools.length,4);
 assert.throws(()=>reader.query('finops_settle'),/allowlist/);assert.throws(()=>reader.query('finops_summary',{path:'/etc/passwd'}),/Unsupported/);
 w.events=[];assert.equal(reader.query('finops_summary').data.attempts.length,4);
 cfg.validUntil='2000-01-01T00:00:00.000Z';assert.equal(reader.query('finops_summary').data.attempts.length,4);
 await assert.rejects(()=>createFinOpsReader({workspace:w},{...cfg,validUntil:'2099-01-01'},{credential:token}),/canonical/);
});
test('routing plan freezes tasks and counterbalances order; all attempts are retained pending billing',async()=>{
 const f=gatewayFixture(async()=>reply());try{
 const plan=freezeBenchmarkPlan({id:'p1',owner:'reviewer',datasetRef:'urn:synthetic',qualityRuleRef:'urn:exact-match',cacheControlRef:'urn:cache-not-controlled-synthetic',maxOutputTokens:16,tasks:[{taskId:'task-code',prompt:'return OK',followup:'Review {{previous}} and return OK',expectedText:'OK'},{taskId:'task-research',prompt:'return OK',followup:'Review {{previous}} and return OK',expectedText:'OK'}],strategies:[{id:'stay',routeIds:['frontier','frontier'],rateCardIds:['frontier-v1','frontier-v1'],reservedMicros:50000},{id:'switch',routeIds:['frontier','efficient'],rateCardIds:['frontier-v1','efficient-v1'],reservedMicros:50000}]});
 assert.deepEqual(plan.schedule.map(x=>x.strategyId),['stay','switch','switch','stay']);
 const run=await runRoutingBenchmark(plan,f.g,{credential:token});assert.equal(run.runs.length,4);assert.equal(run.runs.flatMap(r=>r.attempts).length,8);assert.equal(run.runs.every(r=>r.accepted),true);assert.equal(run.costsFinal,false);assert.equal(run.providerExperiment,false);
 const book=b.createBillingBook(f.g.snapshot(),{source:'synthetic',account:'test'});const report=await analyzeRoutingBenchmark(run,{workspace:f.g.snapshot(),book,additionalCosts:[]});assert.equal(report.status,'incomplete');assert.equal(report.unitCostDifferenceMicros,null);assert.equal(report.savingsDemonstrated,false);
 let settled=f.g.snapshot();const batch=JSON.parse(readFileSync(new URL('../../data/finops-billing-demo.json',import.meta.url)));batch.source='synthetic';batch.account='test';batch.records=[];
 for(const r of run.runs)for(const a of r.attempts){const cost=r.strategyId==='stay'?10000:6000;settled=appendEvent(settled,{id:'reconcile-'+a.attemptId,type:'reconcile',at:run.endedAt,attemptId:a.attemptId,costMicros:cost,evidenceRef:'urn:synthetic:invoice',source:'synthetic'});batch.records.push({sourceRecordId:a.attemptId,revision:1,amountMicros:cost,chargeKind:'usage',finality:'final',usage:batch.coverage,invoice:batch.coverage,evidenceRef:'urn:synthetic:invoice',dimensions:{attemptId:a.attemptId}});}
 const estimatedBatch={...batch,records:batch.records.map(r=>({...r,finality:'estimated'}))};let finalBook=await b.importBilling(book,estimatedBatch);
 const revision={...batch,mode:'snapshot',records:batch.records.map(r=>({...r,revision:2,supersedes:b.recordRef(r),evidenceRef:'urn:synthetic:reviewed-final-invoice'}))};finalBook=await b.importBilling(finalBook,revision);for(const row of revision.records)finalBook=b.linkBilling(finalBook,settled,{recordRef:b.recordRef(row),attemptId:row.sourceRecordId,component:'total',amountMicros:row.amountMicros,measurementBasis:'measured',evidenceRef:'urn:synthetic:binding'});
 const extra=run.runs.map(r=>({taskId:r.taskId,strategyId:r.strategyId,amountMicros:1000,complete:true,includedInLedger:false,evidenceRef:'urn:synthetic:ancillary'}));
 const complete=await analyzeRoutingBenchmark(run,{workspace:settled,book:finalBook,additionalCosts:extra});assert.equal(complete.status,'complete_declared');assert.equal(complete.unitCostDifferenceMicros,8000);assert.equal(complete.causalClaim,false);
 const duplicate=await analyzeRoutingBenchmark(run,{workspace:settled,book:finalBook,additionalCosts:extra.map(x=>({...x,includedInLedger:true}))});assert.equal(duplicate.status,'incomplete');
 const tampered=structuredClone(run);tampered.runs[0].accepted=false;delete tampered.digest;tampered.digest=sha(tampered);await assert.rejects(()=>analyzeRoutingBenchmark(tampered,{workspace:settled,book:finalBook,additionalCosts:extra}),/Acceptance/);
 const rebound=structuredClone(run);rebound.runs[0].attempts[0].receipt.taskId='task-open';delete rebound.digest;rebound.digest=sha(rebound);await assert.rejects(()=>analyzeRoutingBenchmark(rebound,{workspace:settled,book:finalBook,additionalCosts:extra}),/bound/);
 plan.spec.tasks[0].expectedText='edited';await assert.rejects(()=>runRoutingBenchmark(plan,f.g,{credential:token}),/digest/);
 }finally{f.close();}
});
test('CLI refuses to overwrite output before initializing any provider runtime',()=>{
 const dir=mkdtempSync(join(tmpdir(),'finops-cli-')),dest=join(dir,'already.json');writeFileSync(dest,'preserve');
 try{const result=spawnSync(process.execPath,['scripts/finops-operations.mjs','gateway','missing.sqlite','missing-config.json','missing-request.json',dest],{cwd:new URL('../..',import.meta.url),encoding:'utf8'});assert.equal(result.status,1);assert.match(result.stderr,/EEXIST/);assert.equal(readFileSync(dest,'utf8'),'preserve');}finally{rmSync(dir,{recursive:true,force:true});}
});
