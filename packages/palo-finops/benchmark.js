/** Frozen, counterbalanced two-stage routing experiment. No claimed production savings. */
import {sha} from './provider.js';
import {assertWorkspace,summarize} from './index.js';
import {assertBillingBook,replayBilling} from './billing.js';
const check=(ok,m)=>{if(!ok)throw new Error(m);};
const nonempty=x=>typeof x==='string'&&x.trim().length>0&&x.length<=65536;
const money=x=>Number.isSafeInteger(x)&&x>=0;
const sum=xs=>{const n=xs.reduce((n,x)=>n+BigInt(x),0n);check(n<=BigInt(Number.MAX_SAFE_INTEGER)&&n>=-BigInt(Number.MAX_SAFE_INTEGER),'Benchmark amount overflow.');return Number(n);};
const roundRatio=(n,d)=>{const sign=n<0n?-1n:1n,abs=n<0n?-n:n,v=sign*(abs/d+(abs%d*2n>=d?1n:0n));check(v<=BigInt(Number.MAX_SAFE_INTEGER)&&v>=-BigInt(Number.MAX_SAFE_INTEGER),'Benchmark ratio overflow.');return Number(v);};

export function freezeBenchmarkPlan(spec,{at=new Date().toISOString()}={}){
 check(spec&&nonempty(spec.id)&&nonempty(spec.owner)&&nonempty(spec.datasetRef)&&nonempty(spec.qualityRuleRef),'Benchmark identity, owner, dataset and quality rule required.');
 check(Array.isArray(spec.tasks)&&spec.tasks.length>0&&spec.tasks.length<=100&&new Set(spec.tasks.map(t=>t.taskId)).size===spec.tasks.length&&spec.tasks.every(t=>nonempty(t.taskId)&&nonempty(t.prompt)&&nonempty(t.followup)&&t.followup.includes('{{previous}}')&&typeof t.expectedText==='string'),'Unique tasks, two-stage prompts and frozen expected output required.');
 check(spec.strategies?.length===2&&new Set(spec.strategies.map(s=>s.id)).size===2&&spec.strategies.every(s=>nonempty(s.id)&&s.routeIds?.length===2&&s.rateCardIds?.length===2&&s.routeIds.every(nonempty)&&s.rateCardIds.every(nonempty)&&money(s.reservedMicros)&&s.reservedMicros>0),'Two strategies with exact routes, rate cards and per-attempt reservations required.');
 check(spec.strategies[0].routeIds[0]===spec.strategies[0].routeIds[1]&&spec.strategies[1].routeIds[0]===spec.strategies[0].routeIds[0]&&spec.strategies[1].routeIds[1]!==spec.strategies[1].routeIds[0],'First strategy stays on the model; second switches after the same first-stage route.');
 check(spec.strategies[0].rateCardIds[0]===spec.strategies[0].rateCardIds[1]&&spec.strategies[1].rateCardIds[0]===spec.strategies[0].rateCardIds[0],'The common route must use the same frozen rate version.');
 check(Number.isInteger(spec.maxOutputTokens)&&spec.maxOutputTokens>=16&&spec.maxOutputTokens<=32768&&nonempty(spec.cacheControlRef),'Output bound of at least 16 tokens and explicit cache conditions required.');
 const plan={format:'palo-finops-routing-plan',schemaVersion:'1.0.0',at,spec:structuredClone(spec),acceptance:'exact-trimmed-final-text',schedule:spec.tasks.flatMap((t,i)=>(i%2?[...spec.strategies].reverse():spec.strategies).map(s=>({taskId:t.taskId,strategyId:s.id}))),notes:['Order is counterbalanced, not a guarantee of cache or traffic isolation.','The exact-match acceptance rule is suitable only for tasks designed for deterministic gold answers.','No automatic retries; every successful or failed dispatched attempt remains in accounting.']};
 return {...plan,digest:sha(plan)};
}
export function verifyBenchmarkPlan(plan){const {digest,...payload}=plan;check(digest===sha(payload),'Benchmark plan digest mismatch.');check(sha(freezeBenchmarkPlan(plan.spec,{at:plan.at}))===sha(plan),'Benchmark plan replay mismatch.');return plan;}

export async function runRoutingBenchmark(plan,gateway,{credential}={}){
 verifyBenchmarkPlan(plan);const w=assertWorkspace(gateway.snapshot());
 check(plan.spec.tasks.every(t=>w.tasks.some(x=>x.id===t.taskId)),'Benchmark tasks are missing from the pilot workspace.');
 check(!summarize(w).attempts.some(a=>plan.spec.tasks.some(t=>t.taskId===a.taskId)),'Use fresh task IDs for this experiment; existing attempts would confound the cohort.');
 const runs=[],startedAt=new Date().toISOString();
 for(const entry of plan.schedule){
  const task=plan.spec.tasks.find(t=>t.taskId===entry.taskId),strategy=plan.spec.strategies.find(s=>s.id===entry.strategyId),attempts=[];let previous='',terminalStatus='completed';
  for(let stage=0;stage<2;stage++){
   const input=stage===0?task.prompt:task.followup.replaceAll('{{previous}}',previous),requestId='bench-'+sha([plan.digest,entry,stage]).slice(0,48);
   try{
    const result=await gateway.dispatch({requestId,taskId:task.taskId,routeId:strategy.routeIds[stage],rateCardId:strategy.rateCardIds[stage],input,maxOutputTokens:plan.spec.maxOutputTokens,reservedMicros:strategy.reservedMicros},{credential});
    attempts.push({stage,requestId,attemptId:result.receipt?.attemptId??'pilot-'+requestId,receipt:result.receipt??null,replayed:result.replayed});
    if(result.replayed||result.receipt?.status!=='completed'||typeof result.outputText!=='string'){terminalStatus='incomplete';break;}
    previous=result.outputText;
   }catch(e){attempts.push({stage,requestId,attemptId:'pilot-'+requestId,receipt:null,error:'dispatch-rejected-or-interrupted'});terminalStatus='incomplete';break;}
  }
  runs.push({...entry,attempts,status:terminalStatus,accepted:terminalStatus==='completed'&&previous.trim()===task.expectedText.trim(),outputDigest:terminalStatus==='completed'?sha(previous):null,normalizedOutputDigest:terminalStatus==='completed'?sha(previous.trim()):null});
 }
 const payload={format:'palo-finops-routing-run',schemaVersion:'1.0.0',plan:structuredClone(plan),workspaceId:w.workspaceId,startedAt,endedAt:new Date().toISOString(),runs,providerExperiment:gateway.receipts().some(x=>x.receipt?.transport==='https-provider'),costsFinal:false};
 return {...payload,digest:sha(payload)};
}
export async function analyzeRoutingBenchmark(run,{workspace,book,additionalCosts,qualityMinimum=1}={}){
 const {digest,...payload}=run;check(digest===sha(payload),'Benchmark run digest mismatch.');verifyBenchmarkPlan(run.plan);assertWorkspace(workspace);await assertBillingBook(book);
 check(Array.isArray(run.runs)&&run.runs.length===run.plan.schedule.length,'Run does not cover the frozen schedule.');
 const seenAttempts=new Set();
 run.runs.forEach((r,index)=>{
  const expected=run.plan.schedule[index],task=run.plan.spec.tasks.find(t=>t.taskId===r.taskId),strategy=run.plan.spec.strategies.find(s=>s.id===r.strategyId);
  check(r.taskId===expected.taskId&&r.strategyId===expected.strategyId&&Array.isArray(r.attempts)&&r.attempts.length>0&&r.attempts.length<=2&&['completed','incomplete'].includes(r.status),'Run schedule, stage count or status mismatch.');
  r.attempts.forEach((a,stage)=>{const requestId='bench-'+sha([run.plan.digest,expected,stage]).slice(0,48);check(a.stage===stage&&a.requestId===requestId&&a.attemptId==='pilot-'+requestId&&!seenAttempts.has(a.attemptId),'Benchmark attempt identity/stage mismatch.');seenAttempts.add(a.attemptId);
   if(a.receipt)check(a.receipt.taskId===r.taskId&&a.receipt.routeId===strategy.routeIds[stage]&&a.receipt.attemptId===a.attemptId&&a.receipt.requestId===a.requestId,'Receipt is not bound to the scheduled attempt.');
  });
  if(r.status==='completed')check(r.attempts.length===2&&r.attempts.every(a=>a.receipt?.status==='completed'&&!a.replayed)&&typeof r.normalizedOutputDigest==='string','Completed run is missing successful stage evidence.');
  check(r.accepted===(r.status==='completed'&&r.normalizedOutputDigest===sha(task.expectedText.trim())),'Acceptance differs from the frozen exact-match rule.');
 });
 check(workspace.workspaceId===run.workspaceId&&book.workspaceId===workspace.workspaceId&&book.currency===workspace.currency&&book.costBasis==='billed','Benchmark accounting scope or billed basis mismatch.');
 check(Number.isFinite(qualityMinimum)&&qualityMinimum>=0&&qualityMinimum<=1,'Invalid quality minimum.');
 const s=summarize(workspace),b=replayBilling(book),reasons=[];const allRunAttempts=run.runs.flatMap(r=>r.attempts.map(a=>a.attemptId));
 const taskIds=new Set(run.plan.spec.tasks.map(t=>t.taskId));
 if(s.attempts.some(a=>taskIds.has(a.taskId)&&!allRunAttempts.includes(a.attemptId)))reasons.push('Unassigned attempts exist for benchmark tasks; retry or verification costs must not be excluded.');
 if(b.unresolvedImports.length)reasons.push('Billing imports remain quarantined.');
 if(!Array.isArray(additionalCosts))reasons.push('Declare ancillary costs for each task/strategy, including explicit zero or unknown.');
 const extra=additionalCosts??[];check(extra.every(x=>run.runs.some(r=>r.taskId===x.taskId&&r.strategyId===x.strategyId)),'Ancillary cost references an unknown task/strategy.');
 const comparisons=run.plan.spec.strategies.map(strategy=>{
  const rows=run.runs.filter(r=>r.strategyId===strategy.id),costs=[],latencies=[];
  for(const r of rows){
   if(r.attempts.length!==2||r.status!=='completed')reasons.push(`Incomplete execution ${r.taskId}/${r.strategyId}; report failure and liability.`);
   for(const a of r.attempts){const actual=s.attempts.find(x=>x.attemptId===a.attemptId),links=b.links.filter(l=>l.attemptId===a.attemptId);
    if(actual)check(actual.taskId===r.taskId&&actual.routeId===strategy.routeIds[a.stage]&&actual.rateCardId===strategy.rateCardIds[a.stage],'Ledger attempt differs from the frozen task, route or rate version.');
    if(!actual||actual.actualMicros===null||!links.length||sum(links.map(l=>l.amountMicros))!==actual.actualMicros||links.some(l=>l.measurementBasis!=='measured'||b.records.find(x=>x.ref===l.recordRef)?.finality!=='final'))reasons.push(`Cost is not final and reconciled for ${a.attemptId}.`);
    if(actual?.actualMicros!==null&&actual?.actualMicros!==undefined)costs.push(actual.actualMicros);
    if(a.receipt?.latencyMs!==undefined)latencies.push(a.receipt.latencyMs);
   }
   const ancillary=extra.filter(x=>x.taskId===r.taskId&&x.strategyId===r.strategyId);
   if(ancillary.length!==1||!ancillary[0]?.complete||ancillary[0]?.includedInLedger!==false||!nonempty(ancillary[0]?.evidenceRef)||!money(ancillary[0]?.amountMicros))reasons.push(`Ancillary costs incomplete or may duplicate ledger charges for ${r.taskId}/${r.strategyId}.`);else costs.push(ancillary[0].amountMicros);
  }
  const accepted=rows.filter(r=>r.accepted).length,known=sum(costs),quality=rows.length?accepted/rows.length:0;
  if(quality<qualityMinimum)reasons.push(`Quality minimum failed for ${strategy.id}.`);
  return {strategyId:strategy.id,attemptedTasks:rows.length,acceptedTasks:accepted,acceptanceRate:quality,knownCostMicros:known,costPerAcceptedMicros:null,totalObservedLatencyMs:latencies.reduce((a,b)=>a+b,0)};
 });
 // Source residuals must not be silently dropped when interpreting matched attempt totals.
 const linkedRefs=new Set(b.links.filter(l=>allRunAttempts.includes(l.attemptId)).map(l=>l.recordRef));
 if(b.records.some(r=>linkedRefs.has(r.ref)&&r.residualMicros!==0))reasons.push('Relevant source rows still have unlinked residuals.');
 for(const c of comparisons)if(!c.acceptedTasks)reasons.push(`No accepted tasks for ${c.strategyId}.`);
 if(!reasons.length)for(const c of comparisons){c.costPerAcceptedMicros=roundRatio(BigInt(c.knownCostMicros),BigInt(c.acceptedTasks));c.exactUnitCost={numeratorMicros:c.knownCostMicros,denominator:c.acceptedTasks};}
 const [left,right]=comparisons,difference=reasons.length?null:roundRatio(BigInt(left.knownCostMicros)*BigInt(right.acceptedTasks)-BigInt(right.knownCostMicros)*BigInt(left.acceptedTasks),BigInt(left.acceptedTasks)*BigInt(right.acceptedTasks));
 return {format:'palo-finops-routing-analysis',runDigest:run.digest,planDigest:run.plan.digest,accountingDigest:sha({workspace,book,additionalCosts:extra}),currency:workspace.currency,status:reasons.length?'incomplete':'complete_declared',reasons:[...new Set(reasons)],comparisons,unitCostDifferenceMicros:difference,rounding:'nearest-micro-half-away-from-zero; differences rounded once from exact ratios',savingsDemonstrated:false,causalClaim:false,scopeLimit:'Only the frozen tasks, routes, rate versions and declared cache/workload conditions in this run.'};
}
