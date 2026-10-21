/** FinOps operations: pure local workflows. No authority to settle, spend or release reserves. */
import {assertWorkspace,summarize} from './palo-finops-core.js';
import {canonical,digest,replayBilling,allocateBilling,createPeriodSnapshot,verifyPeriodSnapshot} from './palo-finops-billing.js';

const check=(ok,message)=>{if(!ok)throw new Error(message);};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=4096;
const stamp=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const int=x=>Number.isSafeInteger(x);
const clone=x=>structuredClone(x);
const iso=()=>new Date().toISOString();
const sum=xs=>{const n=xs.reduce((a,b)=>a+BigInt(b),0n);check(n>=-BigInt(Number.MAX_SAFE_INTEGER)&&n<=BigInt(Number.MAX_SAFE_INTEGER),'Amount overflow.');return Number(n);};
const ratioRounding='nearest-micro-half-away-from-zero';
function roundedRatio(n,d){check(d>0n,'Ratio denominator must be positive.');const sign=n<0n?-1n:1n,abs=n<0n?-n:n;const value=sign*(abs/d+(abs%d*2n>=d?1n:0n));check(value>=-BigInt(Number.MAX_SAFE_INTEGER)&&value<=BigInt(Number.MAX_SAFE_INTEGER),'Ratio amount overflow.');return Number(value);}
function windowCheck(w){check(obj(w)&&stamp(w.start)&&stamp(w.end)&&w.start<w.end,'Invalid UTC time window.');}
function strings(xs){return Array.isArray(xs)&&xs.length>0&&xs.length<=10000&&xs.every(text)&&new Set(xs).size===xs.length;}
const shared=r=>r.chargeKind==='shared'||r.chargeKind==='credit'&&r.allocationScope==='shared';
const tuple=(...parts)=>canonical(parts);

export function createOperations(workspace,{at=iso()}={}){
  assertWorkspace(workspace);check(stamp(at),'Invalid creation time.');
  return {format:'palo-finops-operations',schemaVersion:'1.0.0',workspaceId:workspace.workspaceId,createdAt:at,cases:[],metrics:[],metricBatches:[],initiatives:[]};
}
function metricCheck(c){
  check(obj(c)&&['id','version','label','unit','owner','sourceRef','acceptanceRule','cohortRef','partition'].every(k=>text(c[k])),'Incomplete metric contract.');
  windowCheck(c.window);check(strings(c.workloadIds)&&/^[A-Z]{3}$/.test(c.currency)&&c.periodBasis==='usage'&&['billed','effective'].includes(c.numeratorBasis),'Invalid metric scope or basis.');
}
function batchCheck(b){
  check(obj(b)&&['id','metricId','metricVersion','sourceRef','cohortRef'].every(k=>text(b[k]))&&['observed','forecast'].includes(b.kind)&&typeof b.complete==='boolean','Invalid metric batch.');
  windowCheck(b.window);check(Array.isArray(b.values)&&b.values.length<=10000,'Invalid metric values.');
  check(b.values.every(v=>obj(v)&&text(v.id)&&int(v.value)&&v.value>=0)&&new Set(b.values.map(v=>v.id)).size===b.values.length,'Metric observation IDs must be unique and values non-negative integers.');sum(b.values.map(v=>v.value));
}
export function assertOperations(o,workspaceId){
  check(obj(o)&&o.format==='palo-finops-operations'&&o.schemaVersion==='1.0.0'&&text(o.workspaceId)&&stamp(o.createdAt),'Invalid operations workspace.');
  if(workspaceId!==undefined)check(o.workspaceId===workspaceId,'Operations belong to a different workspace.');
  for(const k of ['cases','metrics','metricBatches','initiatives'])check(Array.isArray(o[k])&&o[k].length<=10000,'Invalid operations collection.');
  for(const c of o.cases){
    check(obj(c)&&['id','kind','title','detail','sourceRef','fingerprint'].every(k=>text(c[k]))&&Array.isArray(c.evidenceRefs)&&c.evidenceRefs.every(text),'Invalid case evidence.');
    check(typeof c.active==='boolean'&&['open','investigating','closed'].includes(c.status)&&typeof c.owner==='string'&&(c.dueAt===null||stamp(c.dueAt))&&stamp(c.openedAt)&&stamp(c.lastSeenAt)&&Array.isArray(c.history)&&c.history.length<=10000,'Invalid case state.');
    let previous=c.openedAt;
    for(const h of c.history){check(stamp(h.at)&&h.at>=previous&&text(h.action)&&text(h.reason),'Invalid case history.');previous=h.at;}
  }
  o.metrics.forEach(metricCheck);o.metricBatches.forEach(batchCheck);
  for(const b of o.metricBatches)check(o.metrics.some(c=>c.id===b.metricId&&c.version===b.metricVersion),'Batch references an unknown metric version.');
  for(const i of o.initiatives){
    check(obj(i)&&['id','title','owner','hypothesis','scopeRef'].every(k=>text(i[k]))&&['proposed','approved','applied','measured'].includes(i.status)&&Array.isArray(i.history)&&i.history.length>0,'Invalid initiative.');
    let previous=o.createdAt;
    const stages=['proposed','approved','applied','measured'];
    i.history.forEach((h,n)=>{check(h.status===stages[n]&&stamp(h.at)&&h.at>=previous&&(n===0||text(h.evidenceRef)),'Invalid initiative history.');previous=h.at;});
    check(i.history.at(-1).status===i.status,'Initiative status/history mismatch.');
    if(i.status==='measured')check(i.measurement?.format==='palo-finops-savings-comparison'&&i.measurement.savingsDemonstrated===false&&i.measurement.causalClaim===false,'Measured initiative needs a comparison, not a savings assertion.');
  }
  for(const key of ['cases','metricBatches','initiatives'])check(new Set(o[key].map(x=>x.id)).size===o[key].length,'Duplicate operation identity.');
  check(new Set(o.metrics.map(x=>tuple(x.id,x.version))).size===o.metrics.length,'Duplicate metric version.');
  return o;
}
function edit(o,fn){assertOperations(o);const n=clone(o);fn(n);return assertOperations(n);}
function bind(book,w){assertWorkspace(w);if(book)check(book.workspaceId===w.workspaceId&&book.currency===w.currency,'Billing/workspace scope mismatch.');}
export function deriveCases(workspace,book=null,rules=[],{at=iso()}={}){
  bind(book,workspace);check(stamp(at),'Invalid as-of.');const s=summarize(workspace),findings=[];
  function add(kind,sourceRef,title,detail,evidenceRefs,scope,workloadId=null){
    findings.push({id:tuple(workspace.workspaceId,kind,sourceRef),kind,sourceRef,title,detail,evidenceRefs,workloadId,fingerprint:canonical(scope)});
  }
  if(!book)add('missing-billing','workspace','Connect billing evidence','No billing book is available; ledger totals alone do not establish provider reconciliation.',['workspace:'+workspace.workspaceId],{missing:true});
  for(const a of s.attempts.filter(a=>a.actualMicros===null))add('unknown-cost',a.attemptId,'Review unresolved cost',`Reserve remains committed for ${a.attemptId}.`,[a.evidenceRef??'reservation:'+a.attemptId],{status:a.status,reserved:a.reservedMicros,evidence:a.evidenceRef??null},a.workloadId);
  for(const t of workspace.tasks.filter(t=>t.outcome==='pending'&&s.attempts.some(a=>a.taskId===t.id)))add('pending-outcome',t.id,'Review task outcome','Acceptance is still pending for an attempted task.',['task:'+t.id],{outcome:t.outcome},t.workloadId);
  if(book){
    const b=replayBilling(book),alloc=allocateBilling(book,rules,{at});
    for(const r of b.unresolvedImports)add('import-quarantine',r.id,'Resolve import quarantine',r.reason,['import:'+r.id],{digest:r.digest,reason:r.reason});
    for(const r of b.records){
      const a=alloc.find(x=>x.recordRef===r.ref);
      if(shared(r)&&a.unallocatedMicros!==0)add('missing-driver',r.sourceRecordId,'Allocate shared cost','Shared cost has no complete allocation driver.',[r.evidenceRef],{ref:r.ref,allocation:a});
      if(!shared(r)&&r.residualMicros!==0)add('billing-residual',r.sourceRecordId,'Reconcile source cost','Part of the active source revision remains unlinked.',[r.evidenceRef],{ref:r.ref,residual:r.residualMicros});
      if(r.finality!=='final')add('estimated-source',r.sourceRecordId,'Obtain final cost evidence','The active source amount is still estimated.',[r.evidenceRef],{ref:r.ref,amount:r.amountMicros});
    }
    for(const a of s.attempts.filter(a=>a.actualMicros!==null)){
      const links=b.links.filter(l=>l.attemptId===a.attemptId),linked=sum(links.map(l=>l.amountMicros));
      if(!links.length||linked!==a.actualMicros)add('ledger-difference',a.attemptId,'Review billing/ledger difference','The current linked source cost does not establish the settled ledger amount.',links.length?links.map(l=>l.evidenceRef):['attempt:'+a.attemptId],{linked,actual:a.actualMicros,links:links.map(l=>[l.recordRef,l.amountMicros])},a.workloadId);
    }
  }
  return findings.sort((a,b)=>a.id.localeCompare(b.id));
}
export function syncCases(o,findings,{at=iso()}={}){
  check(stamp(at)&&Array.isArray(findings)&&findings.length<=10000&&new Set(findings.map(f=>f.id)).size===findings.length,'Invalid findings or time.');
  return edit(o,n=>{
    check(at>=n.createdAt&&n.cases.every(c=>at>=c.lastSeenAt&&at>=(c.history.at(-1)?.at??c.openedAt)),'Cannot sync cases before their current history.');
    const ids=new Set(findings.map(f=>f.id));
    for(const c of n.cases)if(c.active&&!ids.has(c.id)){c.active=false;c.lastSeenAt=at;c.history.push({at,action:'condition-cleared',reason:'Condition absent at this evaluation; no accounting change performed.'});}
    for(const f of findings){
      const c=n.cases.find(c=>c.id===f.id);
      if(!c)n.cases.push({...clone(f),owner:'',dueAt:null,status:'open',active:true,openedAt:at,lastSeenAt:at,history:[{at,action:'opened',reason:f.detail}]});
      else{
        const changed=c.fingerprint!==f.fingerprint||!c.active;
        Object.assign(c,clone(f),{active:true,lastSeenAt:at});
        if(changed){c.status='open';c.history.push({at,action:'reopened',reason:'Source revision or condition changed; prior review retained.'});}
      }
    }
  });
}
export function updateCase(o,id,{owner,dueAt=null,status,reason},{at=iso()}={}){
  check(text(owner)&&text(reason)&&['open','investigating','closed'].includes(status)&&stamp(at)&&(dueAt===null||stamp(dueAt)&&dueAt>at),'Case needs owner, reason, state and a future due date if specified.');
  return edit(o,n=>{const c=n.cases.find(c=>c.id===id);check(c&&at>=c.lastSeenAt&&at>=(c.history.at(-1)?.at??c.openedAt),'Unknown case or invalid action time.');Object.assign(c,{owner,dueAt,status});c.history.push({at,action:status,reason,owner,dueAt});});
}
export function explainCost(book,workspace,rules,ref,{at=iso()}={}){
  bind(book,workspace);const b=replayBilling(book),record=b.records.find(r=>r.ref===ref);check(record,'Select an active source record.');
  const allocation=allocateBilling(book,rules,{at}).find(x=>x.recordRef===ref),attempts=summarize(workspace).attempts;
  return clone({record,links:b.links.filter(l=>l.recordRef===ref).map(l=>({...l,attempt:attempts.find(a=>a.attemptId===l.attemptId)??null,task:workspace.tasks.find(t=>t.id===attempts.find(a=>a.attemptId===l.attemptId)?.taskId)??null})),allocation,rule:rules.find(r=>r.id===allocation.ruleId)??null,history:b.history.filter(r=>r.sourceRecordId===record.sourceRecordId),sourceTotalMicros:record.amountMicros,unallocatedMicros:shared(record)?allocation.unallocatedMicros:record.residualMicros,disclaimer:'Allocation and links are separate views of the same source cost. A complete allocation does not verify its driver; declared outcomes are not independent acceptance evidence.'});
}
export function registerMetric(o,contract){metricCheck(contract);return edit(o,n=>{check(!n.metrics.some(x=>x.id===contract.id&&x.version===contract.version),'Metric version is immutable; register a new version.');n.metrics.push(clone(contract));});}
export function recordMetricBatch(o,batch){batchCheck(batch);return edit(o,n=>{const old=n.metricBatches.find(x=>x.id===batch.id);if(old){check(canonical(old)===canonical(batch),'Conflicting metric batch ID.');return;}const c=n.metrics.find(c=>c.id===batch.metricId&&c.version===batch.metricVersion);check(c&&c.cohortRef===batch.cohortRef&&canonical(c.window)===canonical(batch.window),'Metric batch cohort/window mismatch.');n.metricBatches.push(clone(batch));});}
export async function metricCohortRef(snapshot){
  await verifyPeriodSnapshot(snapshot);
  return 'sha256:'+await digest({workspaceId:snapshot.workspace.workspaceId,window:snapshot.contract.window,workloads:[...snapshot.contract.workloadIds].sort(),partition:snapshot.contract.partition,periodBasis:snapshot.contract.periodBasis,numeratorBasis:snapshot.contract.numeratorBasis,taskIds:snapshot.outcomes.map(t=>t.id).sort()});
}
export async function evaluateBusinessMetric(snapshot,contract,batches){
  await verifyPeriodSnapshot(snapshot);metricCheck(contract);check(Array.isArray(batches),'Metric batches required.');batches.forEach(batchCheck);
  const reasons=[...snapshot.result.reasons],s=snapshot.contract;
  if(contract.cohortRef!==await metricCohortRef(snapshot)||canonical([...contract.workloadIds].sort())!==canonical([...s.workloadIds].sort())||canonical(contract.window)!==canonical(s.window)||contract.partition!==s.partition||contract.periodBasis!==s.periodBasis||contract.numeratorBasis!==s.numeratorBasis||contract.currency!==snapshot.result.currency)reasons.push('Metric population, time, currency or cost basis differs from the frozen cost cohort.');
  const observed=batches.filter(b=>b.metricId===contract.id&&b.metricVersion===contract.version&&b.kind==='observed');
  if(observed.length!==1)reasons.push('Select exactly one observed batch for this metric version; combine disjoint observations explicitly upstream.');
  for(const b of observed)if(!b.complete||b.cohortRef!==contract.cohortRef||canonical(b.window)!==canonical(contract.window))reasons.push('Observed denominator is incomplete or has a different cohort/window.');
  const denominator=observed.length===1?sum(observed[0].values.map(v=>v.value)):0;
  if(!denominator)reasons.push('Denominator is zero or missing.');
  return {status:reasons.length?'unavailable':'complete_declared',reasons:[...new Set(reasons)],valueMicros:reasons.length?null:roundedRatio(BigInt(snapshot.result.numeratorMicros),BigInt(denominator)),exactUnitCost:reasons.length?null:{numeratorMicros:snapshot.result.numeratorMicros,denominator},rounding:ratioRounding,denominator,numeratorMicros:snapshot.result.numeratorMicros,unit:contract.unit,metricId:contract.id,metricVersion:contract.version,snapshotDigest:snapshot.digest,forecastIncluded:false,independentlyVerified:false};
}
export async function createCfoReport(book,workspace,contract,rules=[],{at=iso(),id=crypto.randomUUID()}={}){
  const snapshot=await createPeriodSnapshot(book,workspace,contract,rules,{at,id}),s=summarize(workspace);
  const payload={format:'palo-finops-cfo-report',schemaVersion:'1.0.0',id,at,scope:{...clone(contract),currency:workspace.currency,source:book.source,account:book.account,exportKind:'explicit-period-snapshot',operationalBudgetScope:'whole-workspace-current',costScope:'selected-period-and-workloads'},summary:{budgetMicros:s.budgetMicros,knownMicros:s.knownMicros,reservedMicros:s.reservedMicros,remainingMicros:s.remainingMicros,billingCostMicros:snapshot.result.numeratorMicros,sourceTotalMicros:snapshot.result.sourceTotalMicros,metricStatus:snapshot.result.status,metricReasons:snapshot.result.reasons,billingAndLedgerAdded:false,finality:snapshot.result.status==='complete_declared'?'complete-declared':'provisional'},snapshot};
  return {...payload,digest:await digest(payload)};
}
export function exportFilteredBilling(book,{query='',kind='all'}={}){
  check(typeof query==='string'&&query.length<=4096&&['all','usage','shared','credit'].includes(kind),'Invalid export filter.');const s=replayBilling(book),q=query.toLowerCase();
  const records=s.records.filter(r=>(kind==='all'||r.chargeKind===kind)&&`${r.sourceRecordId} ${r.evidenceRef}`.toLowerCase().includes(q));
  return {format:'palo-finops-filtered-billing',schemaVersion:'1.0.0',scope:{workspaceId:book.workspaceId,currency:book.currency,source:book.source,account:book.account,costBasis:book.costBasis,query,kind,currentRevisionsOnly:true},records:clone(records),subtotalMicros:sum(records.map(r=>r.amountMicros)),wholeBook:false,notRestorableArchive:true};
}
export function compareRules(book,before,after,{at=iso()}={}){
  const baseline=allocateBilling(book,before,{at}),alternative=allocateBilling(book,after,{at}),deltas=[];
  for(const a of baseline){const b=alternative.find(x=>x.recordRef===a.recordRef),destinations=new Set([...a.shares,...b.shares].map(x=>x.destination));destinations.add(null);
    for(const destination of destinations){const left=destination===null?a.unallocatedMicros:a.shares.find(x=>x.destination===destination)?.amountMicros??0,right=destination===null?b.unallocatedMicros:b.shares.find(x=>x.destination===destination)?.amountMicros??0;deltas.push({recordRef:a.recordRef,destination:destination??'(unallocated)',beforeMicros:left,afterMicros:right,deltaMicros:sum([right,-left])});}}
  return {format:'palo-finops-rule-comparison',at,baseline,alternative,deltas,savingsDemonstrated:false,book:clone(book),beforeRules:clone(before),afterRules:clone(after)};
}
export function createInitiative(o,input,{at=iso()}={}){
  check(obj(input)&&['id','title','owner','hypothesis','scopeRef'].every(k=>text(input[k]))&&stamp(at)&&at>=o.createdAt,'Incomplete initiative.');
  return edit(o,n=>{check(!n.initiatives.some(x=>x.id===input.id),'Initiative ID already exists.');n.initiatives.push({...clone(input),status:'proposed',history:[{status:'proposed',at}],measurement:null});});
}
export function advanceInitiative(o,id,{status,evidenceRef,measurement},{at=iso()}={}){
  check(stamp(at)&&text(evidenceRef),'Transition requires time and evidence.');
  return edit(o,n=>{const i=n.initiatives.find(x=>x.id===id),stages=['proposed','approved','applied','measured'];check(i&&stages.indexOf(status)===stages.indexOf(i.status)+1&&at>=i.history.at(-1).at,'Initiative transitions must be sequential and time ordered.');
    if(status==='measured'){check(measurement?.format==='palo-finops-savings-comparison'&&measurement.status==='compared_declared'&&measurement.savingsDemonstrated===false&&measurement.causalClaim===false,'A valid comparison is required before marking measured.');i.measurement=clone(measurement);}
    i.status=status;i.history.push({status,at,evidenceRef});});
}
export async function evaluateSavings(baseline,after,{interventionMicros,quality,comparisonRef,comparable=false}={}){
  await verifyPeriodSnapshot(baseline);await verifyPeriodSnapshot(after);
  check(int(interventionMicros)&&interventionMicros>=0&&text(comparisonRef)&&obj(quality)&&['baseline','after','minimum'].every(k=>Number.isFinite(quality[k])&&quality[k]>=0&&quality[k]<=1),'Comparison needs intervention cost, quality values and evidence.');
  const reasons=[];
  if(baseline.result.status!=='complete_declared'||after.result.status!=='complete_declared')reasons.push('Both periods require complete reconciled costs and outcomes.');
  if(baseline.result.currency!==after.result.currency||baseline.contract.numeratorBasis!==after.contract.numeratorBasis||baseline.contract.acceptanceRule!==after.contract.acceptanceRule)reasons.push('Currency, cost basis or acceptance rule differs.');
  if(baseline.contract.window.end>after.contract.window.start)reasons.push('Baseline and follow-up periods overlap or are reversed.');
  if(!comparable)reasons.push('Workload comparability has not been reviewed.');
  if(quality.after<quality.minimum||quality.baseline<quality.minimum||quality.after<quality.baseline)reasons.push('Quality guardrail failed.');
  const unitBaseline=baseline.result.denominator?roundedRatio(BigInt(baseline.result.numeratorMicros),BigInt(baseline.result.denominator)):null,unitAfter=after.result.denominator?roundedRatio(BigInt(after.result.numeratorMicros),BigInt(after.result.denominator)):null;
  const normalizedNumerator=reasons.length?null:BigInt(baseline.result.numeratorMicros)*BigInt(after.result.denominator);
  const gross=normalizedNumerator===null?null:roundedRatio(normalizedNumerator-BigInt(after.result.numeratorMicros)*BigInt(baseline.result.denominator),BigInt(baseline.result.denominator));
  const net=gross===null?null:sum([gross,-interventionMicros]);
  return {format:'palo-finops-savings-comparison',status:reasons.length?'unavailable':'compared_declared',reasons,baselineDigest:baseline.digest,afterDigest:after.digest,comparisonRef,interventionMicros,quality:clone(quality),grossDifferenceMicros:gross,netDifferenceMicros:net,baselineUnitMicros:unitBaseline,afterUnitMicros:unitAfter,normalization:'exact baseline cost times follow-up accepted count, divided by baseline count; round difference once',normalizationRational:normalizedNumerator===null?null:{numeratorMicrosTimesTasks:normalizedNumerator.toString(),denominator:baseline.result.denominator},rounding:ratioRounding,savingsDemonstrated:false,causalClaim:false,comparability:'user-declared',currency:after.result.currency};
}
export function forecastSeries(points,{horizon=7,minTrain=7,holdout=3,asOf=iso().slice(0,10)}={}){
  check(Array.isArray(points)&&points.length<=10000&&int(horizon)&&horizon>0&&horizon<=90&&int(minTrain)&&minTrain>=2&&int(holdout)&&holdout>=2,'Invalid forecast configuration.');
  check(/^\d{4}-\d\d-\d\d$/.test(asOf)&&Number.isFinite(Date.parse(asOf))&&new Date(asOf).toISOString().slice(0,10)===asOf,'Invalid forecast as-of date.');
  const reasons=[];let prior=null;
  for(const p of points){check(obj(p)&&typeof p.date==='string'&&/^\d{4}-\d\d-\d\d$/.test(p.date)&&Number.isFinite(Date.parse(p.date))&&new Date(p.date).toISOString().slice(0,10)===p.date&&int(p.amountMicros)&&p.amountMicros>=0&&text(p.sourceRef),'Invalid historical observation.');
    if(prior!==null&&Date.parse(p.date)-Date.parse(prior)!==86400000)reasons.push('Historical series must contain consecutive distinct daily observations in ascending order.');
    if(p.complete!==true)reasons.push('Incomplete historical observations.');if(p.date>=asOf)reasons.push('Only closed days before the as-of date are allowed.');prior=p.date;}
  if(points.length<minTrain+holdout)reasons.push('Insufficient history for chronological backtesting.');
  if(points.length&&Date.parse(asOf)-Date.parse(points.at(-1).date)!==86400000)reasons.push('History must end on the last closed day before as-of.');
  if(reasons.length)return {status:'unavailable',reasons:[...new Set(reasons)],model:null,backtest:null,forecast:[],budgetChanged:false};
  const predict=(train,name)=>name==='last-value'?train.at(-1).amountMicros:Math.round(sum(train.slice(-7).map(x=>x.amountMicros))/Math.min(7,train.length));
  const models=['last-value','trailing-mean-7'],results=models.map(model=>{
    const errors=[];for(let i=points.length-holdout;i<points.length;i++){const predicted=predict(points.slice(0,i),model);errors.push({date:points[i].date,predictedMicros:predicted,actualMicros:points[i].amountMicros,absoluteErrorMicros:Math.abs(predicted-points[i].amountMicros)});}
    return {model,maeMicros:sum(errors.map(e=>e.absoluteErrorMicros))/errors.length,errors};});
  const selected=[...results].sort((a,b)=>a.maeMicros-b.maeMicros)[0];const amount=predict(points,selected.model),date=Date.parse(points.at(-1).date);
  return {status:'forecast',reasons:[],model:selected.model,asOf,backtest:{kind:'rolling-origin-one-step',holdout,candidates:results,selectionUsesHoldout:true,independentTestScore:false,intervalCalibrated:false},forecast:Array.from({length:horizon},(_,i)=>({date:new Date(date+(i+1)*86400000).toISOString().slice(0,10),amountMicros:amount})),budgetChanged:false,evidence:clone(points)};
}
