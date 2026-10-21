#!/usr/bin/env node
import {readFile,writeFile,stat,open} from 'node:fs/promises';
import * as ops from '../packages/palo-finops/operations.js';
import {fetchOpenAICosts,mapOpenAICosts} from '../packages/palo-finops/provider.js';
import {freezeBenchmarkPlan,runRoutingBenchmark,analyzeRoutingBenchmark} from '../packages/palo-finops/benchmark.js';
const help=`PALO FinOps operations 1.2 (new files only; secrets through environment)
  init WORKSPACE.json NEW_OPERATIONS.json
  cases FINANCE_BUNDLE.json [NEW_OPERATIONS.json]
  case-update OPERATIONS.json ACTION.json NEW_OPERATIONS.json
  explain FINANCE_BUNDLE.json RECORD_REF
  metric SNAPSHOT.json CONTRACT.json BATCHES.json [NEW_RESULT.json]
  cfo FINANCE_BUNDLE.json SPEC.json NEW_REPORT.json
  rules FINANCE_BUNDLE.json ALTERNATIVE_RULES.json [NEW_RESULT.json]
  forecast SERIES.json OPTIONS.json [NEW_RESULT.json]
  connector CONFIG.json NEW_RESULT.json [PREVIOUS_BOOK.json]
  gateway LEDGER.sqlite CONFIG.json REQUEST.json NEW_RESULT.json
  plan SPEC.json NEW_PLAN.json
  benchmark-run PLAN.json LEDGER.sqlite CONFIG.json NEW_RUN.json
  benchmark-analyze RUN.json FINANCE_BUNDLE.json ANCILLARY.json NEW_RESULT.json
Connector reads PALO_FINOPS_OPENAI_ADMIN_KEY; gateway uses PALO_FINOPS_OPENAI_API_KEY
and PALO_FINOPS_PRINCIPAL_TOKEN. Gateway/benchmark-run can make billed provider calls
only with configured credentials, limits, route allowlists and a local ledger.`;
async function json(path){if(!path||(await stat(path)).size>2*1024*1024)throw new Error('A JSON input under 2 MiB is required.');return JSON.parse(await readFile(path,'utf8'));}
async function out(value,path){const text=JSON.stringify(value,null,2)+'\n';if(path)await writeFile(path,text,{flag:'wx',mode:0o600});else process.stdout.write(text);}
async function liveOut(path,action){
 if(!path)throw new Error('A new private output path is required before a provider operation.');
 const file=await open(path,'wx',0o600);
 const write=async value=>{const text=JSON.stringify(value,null,2)+'\n';await file.truncate(0);await file.write(text,0,'utf8');await file.sync();};
 try{await write({status:'in-progress',note:'If interrupted, inspect the ledger before any new request.'});const result=await action();await write(result);}
 catch(e){await write({status:'failed-or-interrupted',message:e.message,automaticRetry:false});throw e;}finally{await file.close();}
}
async function gateway(path,config){const {FinOpsGateway}=await import('../packages/palo-finops/gateway.js');return new FinOpsGateway(path,config,{apiKey:process.env.PALO_FINOPS_OPENAI_API_KEY});}
try{
 const [cmd,a,b,c,d]=process.argv.slice(2);
 if(!cmd||cmd==='--help'){process.stdout.write(help+'\n');}
 else if(cmd==='init')await out(ops.createOperations(await json(a)),b);
 else if(cmd==='cases'){const bundle=await json(a);await out(ops.syncCases(bundle.operations??ops.createOperations(bundle.workspace),ops.deriveCases(bundle.workspace,bundle.book??null,bundle.rules??[])),b);}
 else if(cmd==='case-update'){const action=await json(b);await out(ops.updateCase(await json(a),action.id,action),c);}
 else if(cmd==='explain'){const bundle=await json(a);await out(ops.explainCost(bundle.book,bundle.workspace,bundle.rules??[],b));}
 else if(cmd==='metric')await out(await ops.evaluateBusinessMetric(await json(a),await json(b),await json(c)),d);
 else if(cmd==='cfo'){const bundle=await json(a),spec=await json(b);await out(await ops.createCfoReport(bundle.book,bundle.workspace,spec.contract??spec,bundle.rules??[],spec.options),c);}
 else if(cmd==='rules'){const bundle=await json(a);await out(ops.compareRules(bundle.book,bundle.rules??[],await json(b)),c);}
 else if(cmd==='forecast')await out(ops.forecastSeries(await json(a),await json(b)),c);
 else if(cmd==='connector')await liveOut(b,async()=>{const capture=await fetchOpenAICosts(await json(a),{apiKey:process.env.PALO_FINOPS_OPENAI_ADMIN_KEY});return {...mapOpenAICosts(capture,c?await json(c):null),capture};});
 else if(cmd==='gateway')await liveOut(d,async()=>{const g=await gateway(a,await json(b));try{return await g.dispatch(await json(c),{credential:process.env.PALO_FINOPS_PRINCIPAL_TOKEN});}finally{g.close();}});
 else if(cmd==='plan')await out(freezeBenchmarkPlan(await json(a)),b);
 else if(cmd==='benchmark-run')await liveOut(d,async()=>{const g=await gateway(b,await json(c));try{return await runRoutingBenchmark(await json(a),g,{credential:process.env.PALO_FINOPS_PRINCIPAL_TOKEN});}finally{g.close();}});
 else if(cmd==='benchmark-analyze'){const bundle=await json(b);await out(await analyzeRoutingBenchmark(await json(a),{workspace:bundle.workspace,book:bundle.book,additionalCosts:await json(c)}),d);}
 else throw new Error(help);
}catch(e){process.stderr.write('FinOps operations: '+e.message+'\n');process.exitCode=1;}
