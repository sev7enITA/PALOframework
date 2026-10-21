import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {sha} from './provider.js';

test('MCP stdio initializes, lists only four read tools, cites frozen evidence and rejects writes',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'palo-finops-mcp-')),bundle=join(dir,'bundle.json'),grant=join(dir,'grant.json'),token='synthetic-mcp-secret-for-local-test';
 const workspace=JSON.parse(readFileSync(new URL('../../data/finops-demo.json',import.meta.url)));
 writeFileSync(bundle,JSON.stringify({workspace}));writeFileSync(grant,JSON.stringify({principalId:'test-reader',tokenSha256:sha(token),scopes:['finops:read'],workspaceIds:[workspace.workspaceId],validUntil:'2099-01-01T00:00:00.000Z'}));
 const child=spawn(process.execPath,['scripts/finops-mcp.mjs',bundle,grant],{cwd:new URL('../..',import.meta.url),env:{...process.env,PALO_FINOPS_PRINCIPAL_TOKEN:token},stdio:['pipe','pipe','pipe']});
 const pending=new Map();let serial=0,stderr='';child.stderr.on('data',x=>stderr+=x);const lines=createInterface({input:child.stdout});
 lines.on('line',line=>{const value=JSON.parse(line),p=pending.get(value.id);if(p){clearTimeout(p.timer);pending.delete(value.id);p.resolve(value);}});
 function request(method,params={}){const id=++serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('MCP timeout: '+stderr));},4000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
 try{
  const init=await request('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'finops-test',version:'1'}});assert.equal(init.result.serverInfo.name,'palo-finops-reader');
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const listed=await request('tools/list');assert.deepEqual(listed.result.tools.map(t=>t.name).sort(),['finops_exceptions','finops_explain_cost','finops_period','finops_summary']);assert.ok(listed.result.tools.every(t=>t.annotations.readOnlyHint));
  const summary=await request('tools/call',{name:'finops_summary',arguments:{}});assert.equal(summary.result.structuredContent.readOnly,true);assert.equal(summary.result.structuredContent.citation.workspaceId,workspace.workspaceId);assert.match(summary.result.structuredContent.citation.bundleDigest,/^[a-f0-9]{64}$/);
  const period=await request('tools/call',{name:'finops_period',arguments:{}});assert.equal(period.result.isError,true);
  const denied=await request('tools/call',{name:'finops_settle',arguments:{}});assert.ok(denied.error||denied.result?.isError);
  const paths=await request('tools/call',{name:'finops_summary',arguments:{path:'/etc/passwd'}});assert.ok(paths.error||paths.result?.isError);
  const bad=spawnSync(process.execPath,['scripts/finops-mcp.mjs',bundle,grant],{cwd:new URL('../..',import.meta.url),env:{...process.env,PALO_FINOPS_PRINCIPAL_TOKEN:'wrong-but-long-enough-secret'},encoding:'utf8',timeout:4000});assert.equal(bad.status,1);assert.equal(bad.stdout,'');assert.match(bad.stderr,/denied/);
 }finally{for(const p of pending.values())clearTimeout(p.timer);lines.close();const done=once(child,'exit');child.kill();await done;rmSync(dir,{recursive:true,force:true});}
});
