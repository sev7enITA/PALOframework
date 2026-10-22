/** Experimental local-learning economics. Pure evaluation; no execution authority. */
import {canonical, digest} from './palo-finops-billing.js';

export const LEARNING_VERSION = '1.0.0';
export const LEARNING_REPORT_VERSION = '1.0.1';
export const ARM_IDS = ['external_only', 'hybrid_static', 'hybrid_distilled'];
export const COST_CATEGORIES = ['teacher_data', 'training', 'evaluation', 'hardware', 'energy', 'human_review', 'operations', 'local_inference', 'external_inference'];
export const COST_PHASES = ['sunk', 'investment', 'evaluation', 'future_fixed', 'future_per_attempt'];
const PAIRS = [['external_only','hybrid_static'], ['external_only','hybrid_distilled'], ['hybrid_static','hybrid_distilled']];
const MAX = BigInt(Number.MAX_SAFE_INTEGER);
const check = (ok, message) => { if (!ok) throw new Error(message); };
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 2048;
const hash = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const money = x => Number.isSafeInteger(x) && x >= 0;
const positive = x => money(x) && x > 0;
const rate = x => Number.isFinite(x) && x >= 0 && x <= 1;
const stamp = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x;
const safe = n => { check(n <= MAX && n >= -MAX, 'Learning economics amount overflow.'); return Number(n); };
const sum = xs => safe(xs.reduce((a,x) => a + BigInt(x), 0n));
const ratio = (n,d) => d > 0 ? {numeratorMicros:n, denominator:d} : null;
const unique = xs => new Set(xs).size === xs.length;
const exactKeys = (x, keys, name) => check(object(x) && Object.keys(x).every(k => keys.includes(k)), `Unknown ${name} field.`);

// Public JS callers must supply the same data domain as JSON file imports.
// Reject values that JSON.stringify would silently erase/coerce before hashing.
function jsonSnapshot(value) {
  const active=new WeakSet();
  function visit(v,depth=0) {
    check(depth<=64, 'JSON nesting exceeds 64 levels.');
    if(v===null || typeof v==='string' || typeof v==='boolean') return;
    if(typeof v==='number') {check(Number.isFinite(v), 'Non-JSON number.');return;}
    check(typeof v==='object', 'Non-JSON value.');
    check(!active.has(v), 'Cyclic JSON input.');
    const array=Array.isArray(v),prototype=Object.getPrototypeOf(v);
    check(array ? prototype===Array.prototype : prototype===Object.prototype || prototype===null, 'Expected a plain JSON object.');
    active.add(v);
    const keys=Reflect.ownKeys(v);
    if(array) check(v.length<=100000 && keys.length===v.length+1, 'Sparse or extended JSON array.');
    for(const k of keys) {
      if(array && k==='length') continue;
      const d=Object.getOwnPropertyDescriptor(v,k);
      check(typeof k==='string' && d.enumerable && Object.hasOwn(d,'value'), 'Non-JSON property.');
      if(array) check(/^(0|[1-9][0-9]*)$/.test(k) && Number(k)<v.length, 'Extended JSON array.');
      visit(d.value,depth+1);
    }
    active.delete(v);
  }
  visit(value);
  const serialized=JSON.stringify(value);
  check(new TextEncoder().encode(serialized).length<=8*1024*1024, 'Input exceeds 8 MiB.');
  return JSON.parse(serialized);
}

export function validateLearningPlan(p) {
  exactKeys(p, ['id','version','owner','registeredAt','registrationRef','workloadRef','currency','evidenceKind','sampling','acceptanceRuleRef','splits','arms','quality','scenario'], 'plan');
  for (const k of ['id','version','owner','registrationRef','workloadRef','acceptanceRuleRef']) check(text(p[k]), `Missing plan ${k}.`);
  check(stamp(p.registeredAt) && /^[A-Z]{3}$/.test(p.currency), 'Invalid plan date or currency.');
  check(['synthetic','declared_observations'].includes(p.evidenceKind), 'Declare synthetic or observed input provenance.');
  exactKeys(p.sampling, ['unit','independentUnitsDeclared','blindedScoringDeclared','holdoutUntouchedDeclared','fixedSampleDeclared','selectionCostsCompleteDeclared','ref'], 'sampling');
  check(p.sampling.unit === 'task' && text(p.sampling.ref), 'Define independent task sampling and its evidence reference.');
  for (const k of ['independentUnitsDeclared','blindedScoringDeclared','holdoutUntouchedDeclared','fixedSampleDeclared','selectionCostsCompleteDeclared']) check(typeof p.sampling[k] === 'boolean', `Declare ${k}.`);
  exactKeys(p.splits, ['train','validation','evaluation'], 'splits');
  const ids = new Set(), hashes = new Set(), groups = new Set();
  for (const split of ['train','validation','evaluation']) {
    check(Array.isArray(p.splits[split]) && p.splits[split].length <= 10000 && (split !== 'evaluation' || p.splits[split].length > 0), 'Invalid split size.');
    for (const t of p.splits[split]) {
      exactKeys(t, ['id','contentDigest','independenceId'], 'task');
      check(text(t.id) && hash(t.contentDigest) && text(t.independenceId), 'Invalid task identity/content digest/independence unit.');
      check(!ids.has(t.id) && !hashes.has(t.contentDigest) && !groups.has(t.independenceId), 'Duplicate or overlapping task, content or independence unit across splits.');
      ids.add(t.id); hashes.add(t.contentDigest); groups.add(t.independenceId);
    }
  }
  check(Array.isArray(p.arms) && p.arms.length === 3 && ARM_IDS.every(id => p.arms.some(a => a.id === id)), 'Exactly three specified learning arms required.');
  for (const a of p.arms) {
    exactKeys(a, ['id','label','modelRef','teacherRef','checkpointDigest','routingPolicyDigest','selectedAt','usefulLifeDays','capacityTasksPerDay','lineageRef'], 'arm');
    for (const k of ['label','modelRef','teacherRef','lineageRef']) check(text(a[k]), `Missing arm ${k}.`);
    check(hash(a.checkpointDigest) && hash(a.routingPolicyDigest) && stamp(a.selectedAt) && a.selectedAt <= p.registeredAt, 'Freeze checkpoints and routing policy before evaluation registration.');
    check(positive(a.usefulLifeDays) && a.usefulLifeDays <= 3650 && positive(a.capacityTasksPerDay), 'Declare finite useful life and daily capacity.');
  }
  exactKeys(p.quality, ['minimumAcceptance','nonInferiorityMargin','maximumLatencyMs','minimumLatencyPassRate','alpha'], 'quality');
  const q = p.quality;
  check(rate(q.minimumAcceptance) && q.minimumAcceptance > 0 && rate(q.nonInferiorityMargin) && q.nonInferiorityMargin < 1 && positive(q.maximumLatencyMs) && rate(q.minimumLatencyPassRate) && q.minimumLatencyPassRate > 0 && Number.isFinite(q.alpha) && q.alpha > 0 && q.alpha <= 0.2, 'Invalid predeclared quality thresholds.');
  exactKeys(p.scenario, ['id','horizonDays','attemptedTasks','assumptionsRef','stableRatesDeclared','stableQualityDeclared','singleInvestmentDeclared'], 'scenario');
  const s = p.scenario;
  check(text(s.id) && text(s.assumptionsRef) && positive(s.horizonDays) && s.horizonDays <= 3650 && positive(s.attemptedTasks), 'Invalid fixed-horizon volume scenario.');
  for (const k of ['stableRatesDeclared','stableQualityDeclared','singleInvestmentDeclared']) check(typeof s[k] === 'boolean', `Declare scenario ${k}.`);
  return p;
}

export async function freezeLearningPlan(spec) {
  spec=jsonSnapshot(spec);
  validateLearningPlan(spec);
  const payload = {format:'palo-finops-learning-plan', schemaVersion:LEARNING_VERSION, spec:structuredClone(spec)};
  return {...payload, digest:await digest(payload)};
}

export async function verifyLearningPlan(plan) {
  exactKeys(plan, ['format','schemaVersion','spec','digest'], 'frozen plan');
  check(plan.format === 'palo-finops-learning-plan' && plan.schemaVersion === LEARNING_VERSION, 'Unsupported learning plan.');
  check(hash(plan.digest), 'Missing plan digest.');
  check(plan.digest === (await freezeLearningPlan(plan.spec)).digest, 'Learning plan digest mismatch.');
  return plan;
}

function validateExperiment(x) {
  exactKeys(x, ['format','schemaVersion','plan','run'], 'experiment');
  check(x.format === 'palo-finops-learning-experiment' && x.schemaVersion === LEARNING_VERSION, 'Unsupported learning experiment.');
  const r = x.run, p = x.plan.spec;
  exactKeys(r, ['id','planDigest','startedAt','endedAt','allAttemptsIncludedDeclared','costCoverageRef','outcomes','costs','openReservations'], 'run');
  check(text(r.id) && r.planDigest === x.plan.digest && stamp(r.startedAt) && stamp(r.endedAt) && r.startedAt >= p.registeredAt && r.endedAt >= r.startedAt, 'Run must bind the frozen plan before evaluation.');
  check(typeof r.allAttemptsIncludedDeclared === 'boolean' && text(r.costCoverageRef), 'Declare attempt and cost coverage.');
  const tasks = new Map(p.splits.evaluation.map(t => [t.id,t])), seen = new Set();
  check(Array.isArray(r.outcomes) && r.outcomes.length <= tasks.size * 3, 'Invalid outcome count.');
  for (const o of r.outcomes) {
    exactKeys(o, ['armId','taskId','accepted','latencyMs','externalCalls','attempts','evidenceRef','checkpointDigest','routingPolicyDigest'], 'outcome');
    const a = p.arms.find(a => a.id === o.armId), key = canonical([o.armId,o.taskId]);
    check(a && tasks.has(o.taskId) && !seen.has(key), 'Outcome has unknown or duplicate arm/task.'); seen.add(key);
    check(o.checkpointDigest === a.checkpointDigest && o.routingPolicyDigest === a.routingPolicyDigest, 'Outcome checkpoint or route differs from the frozen arm.');
    check(typeof o.accepted === 'boolean' && (o.latencyMs === null || money(o.latencyMs)) && money(o.externalCalls) && positive(o.attempts) && o.externalCalls <= o.attempts && text(o.evidenceRef), 'Invalid outcome measurements.');
    check(o.armId !== 'external_only' || o.externalCalls === o.attempts, 'External-only arm contains undeclared local attempts.');
  }
  check(Array.isArray(r.costs) && r.costs.length <= 500, 'Invalid cost count.');
  const sourceKeys = new Set(), cells = new Set();
  for (const c of r.costs) {
    exactKeys(c, ['sourceKey','revision','phase','categories','amountMicros','status','evidenceRef','allocations'], 'cost');
    check(text(c.sourceKey) && !sourceKeys.has(c.sourceKey) && positive(c.revision), 'Duplicate economic source; import a single active revision.'); sourceKeys.add(c.sourceKey);
    check(COST_PHASES.includes(c.phase) && Array.isArray(c.categories) && c.categories.length > 0 && unique(c.categories) && c.categories.every(k => COST_CATEGORIES.includes(k)), 'Invalid cost phase or coverage categories.');
    const future = c.phase.startsWith('future_');
    check((future ? ['assumed','unknown'] : ['final','estimated','unknown']).includes(c.status) && text(c.evidenceRef), 'Invalid cost finality or missing evidence.');
    check(c.status === 'unknown' ? c.amountMicros === null : money(c.amountMicros), 'Unknown cost needs null; other amounts require nonnegative safe integer micros.');
    check(Array.isArray(c.allocations) && c.allocations.length > 0 && c.allocations.length <= 3 && unique(c.allocations.map(a => a.armId)), 'List each applicable standalone alternative once; allocations conserve observed spending, including zero shares.');
    for (const a of c.allocations) {
      exactKeys(a, ['armId','amountMicros'], 'allocation');
      check(ARM_IDS.includes(a.armId) && (c.status === 'unknown' ? a.amountMicros === null : money(a.amountMicros)), 'Invalid allocation amount.');
      for (const category of c.categories) {
        const cell = canonical([a.armId,c.phase,category]);
        check(!cells.has(cell), 'Overlapping cost coverage: all-in and component charges cannot be counted twice.'); cells.add(cell);
      }
    }
    if (c.status !== 'unknown') check(sum(c.allocations.map(a => a.amountMicros)) === c.amountMicros, 'Shared-cost allocations must conserve the source amount.');
  }
  check(Array.isArray(r.openReservations) && r.openReservations.length <= 1000 && unique(r.openReservations.map(v => v.id)), 'Invalid open reservations.');
  for (const v of r.openReservations) {
    exactKeys(v, ['id','armId','amountMicros','evidenceRef'], 'reservation');
    check(text(v.id) && ARM_IDS.includes(v.armId) && positive(v.amountMicros) && text(v.evidenceRef), 'Invalid reserved commitment.');
  }
  return {tasks, cells};
}

/** Two-sided Hoeffding intervals; nine prespecified intervals share one alpha budget. */
function interval(mean, n, range, alpha, lo, hi) {
  const radius = range * Math.sqrt((Math.log(18) - Math.log(alpha)) / (2 * n));
  return {lower:Math.max(lo,mean-radius), upper:Math.min(hi,mean+radius), radius};
}
function gate(bound, minimum) {
  return bound.lower >= minimum ? 'passes' : bound.upper < minimum ? 'fails' : 'inconclusive';
}

// Preserve the exact represented binary64 bound when comparing money products.
// Multiplying safe integer micros by Number probabilities can round unequal
// products to a tie. This does not make the statistical bounds arbitrary precision.
function binaryRatio(value) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0,value);
  const bits=view.getBigUint64(0), exponent=Number((bits>>52n)&2047n);
  const significand=(bits&((1n<<52n)-1n))+(exponent===0?0n:1n<<52n);
  const shift=exponent===0?-1074:exponent-1075;
  return shift>=0?[significand<<BigInt(shift),1n]:[significand,1n<<BigInt(-shift)];
}
function acceptedCostAtMost(candidateCost,baselineCost,candidateLower,baselineUpper) {
  if(candidateLower<=0)return false;
  const [cn,cd]=binaryRatio(candidateLower),[bn,bd]=binaryRatio(baselineUpper);
  return BigInt(candidateCost)*bn*cd<=BigInt(baselineCost)*cn*bd;
}

/** Exact integer attempted-task-volume regions for candidate cost <= baseline cost. */
export function crossover({baselineFixed, candidateFixed, baselineVariable, candidateVariable, maxTasks}) {
  check([baselineFixed,candidateFixed,baselineVariable,candidateVariable,maxTasks].every(money), 'Invalid crossover amounts.');
  const fixed = BigInt(candidateFixed)-BigInt(baselineFixed), saving = BigInt(baselineVariable)-BigInt(candidateVariable);
  let kind, first = null, last = null;
  if (saving > 0n) { kind = fixed > 0n ? 'break_even' : 'always_no_more_expensive'; first = fixed > 0n ? (fixed+saving-1n)/saving : 0n; }
  else if (saving === 0n) { kind = fixed <= 0n ? 'always_no_more_expensive' : 'never_breaks_even'; if (fixed <= 0n) first = 0n; }
  else if (fixed <= 0n) { kind = 'initial_advantage_expires'; first = 0n; last = (-fixed)/(-saving); }
  else kind = 'never_breaks_even';
  return {kind, firstNoMoreExpensiveAttempt:first?.toString() ?? null, lastNoMoreExpensiveAttempt:last?.toString() ?? null,
    withinDeclaredVolume:first !== null && first <= BigInt(maxTasks),
    noMoreExpensiveAtDeclaredVolume:fixed-saving*BigInt(maxTasks) <= 0n,
    fixedDifferenceMicros:safe(fixed), variableSavingMicros:safe(saving),
    differenceAtDeclaredVolumeMicros:safe(fixed-saving*BigInt(maxTasks))};
}

export async function analyzeLearningExperiment(input) {
  const x = jsonSnapshot(input);
  await verifyLearningPlan(x.plan);
  const {tasks,cells} = validateExperiment(x), p=x.plan.spec, r=x.run, q=p.quality, n=tasks.size;
  const designReasons=[];
  for (const [k,v] of Object.entries(p.sampling)) if (typeof v === 'boolean' && !v) designReasons.push(`Sampling declaration absent: ${k}.`);
  if (!r.allAttemptsIncludedDeclared) designReasons.push('All attempted work, retries and failed runs are not covered.');
  const arms=ARM_IDS.map(id => {
    const a=p.arms.find(a=>a.id===id), rows=r.outcomes.filter(o=>o.armId===id), reasons=[];
    const accepted=rows.filter(o=>o.accepted).length, latencyPassed=rows.filter(o=>o.latencyMs!==null && o.latencyMs<=q.maximumLatencyMs).length;
    if (rows.length!==n) reasons.push('Frozen evaluation task coverage is incomplete.');
    if (rows.some(o=>o.latencyMs===null)) reasons.push('Latency measurements are incomplete.');
    const phases=Object.fromEntries(COST_PHASES.map(phase => {
      const phaseReasons=[], selected=r.costs.filter(c=>c.phase===phase && c.allocations.some(v=>v.armId===id));
      for (const category of COST_CATEGORIES) if(!cells.has(canonical([id,phase,category]))) phaseReasons.push(`Missing ${category} coverage.`);
      for (const c of selected) if(c.status==='unknown'||c.status==='estimated') phaseReasons.push(`${c.sourceKey} is ${c.status}.`);
      const known=selected.filter(c=>['final','assumed'].includes(c.status));
      // Allocations conserve observed expenditure. Mutually exclusive future
      // alternatives each bear a common source in full, so an arbitrary
      // accounting split cannot manufacture an economic advantage.
      return [phase,{knownMicros:sum(known.map(c=>c.allocations.find(v=>v.armId===id).amountMicros)),scenarioBasisMicros:sum(known.map(c=>c.amountMicros)),estimatedMicros:sum(selected.filter(c=>c.status==='estimated').map(c=>c.allocations.find(v=>v.armId===id).amountMicros)),complete:phaseReasons.length===0,reasons:phaseReasons}];
    }));
    const reservation=sum(r.openReservations.filter(v=>v.armId===id).map(v=>v.amountMicros));
    const accountingReasons=['sunk','investment','evaluation'].flatMap(k=>phases[k].reasons.map(reason=>`${k}: ${reason}`));
    if(reservation) accountingReasons.push('Open cost reservations remain unresolved.');
    if(rows.length!==n) accountingReasons.push('Observed task coverage is incomplete.');
    if(!r.allAttemptsIncludedDeclared) accountingReasons.push('All attempts and failed runs are not included.');
    if(!p.sampling.selectionCostsCompleteDeclared) accountingReasons.push('Selection costs are not declared complete.');
    const accountingComplete=accountingReasons.length===0;
    const knownTotal=sum(['sunk','investment','evaluation'].map(k=>phases[k].knownMicros));
    const acceptanceBound=interval(accepted/n,n,1,q.alpha,0,1), latencyBound=interval(latencyPassed/n,n,1,q.alpha,0,1);
    const projectionReasons=[];
    if(a.usefulLifeDays<p.scenario.horizonDays) projectionReasons.push('Scenario horizon exceeds declared model useful life.');
    if(BigInt(a.capacityTasksPerDay)*BigInt(p.scenario.horizonDays)<BigInt(p.scenario.attemptedTasks)) projectionReasons.push('Scenario volume exceeds declared arm capacity.');
    for(const k of ['stableRatesDeclared','stableQualityDeclared','singleInvestmentDeclared']) if(!p.scenario[k]) projectionReasons.push(`Scenario assumption absent: ${k}.`);
    for(const phase of ['investment','future_fixed','future_per_attempt']) if(!phases[phase].complete) projectionReasons.push(`${phase} cost coverage is incomplete.`);
    return {id,label:a.label,plannedTasks:n,observedTasks:rows.length,acceptedTasks:accepted,attempts:sum(rows.map(o=>o.attempts)),externalCalls:sum(rows.map(o=>o.externalCalls)),
      acceptanceRate:accepted/n,acceptanceBound,latencyPassRate:latencyPassed/n,latencyBound,
      acceptanceGate:gate(acceptanceBound,q.minimumAcceptance),latencyGate:gate(latencyBound,q.minimumLatencyPassRate),
      knownObservedTotalMicros:knownTotal,openReservationsMicros:reservation,accountingStatus:accountingComplete?'complete_declared':'incomplete',
      observedCostPerAccepted:accountingComplete?ratio(knownTotal,accepted):null,
      evaluationCostPerAccepted:accountingComplete?ratio(phases.evaluation.knownMicros,accepted):null,
      phases,reasons,accountingReasons,projectionReasons};
  });
  const comparisons=PAIRS.map(([baselineId,candidateId])=>{
    const b=arms.find(a=>a.id===baselineId),c=arms.find(a=>a.id===candidateId),reasons=[...designReasons,...b.reasons,...c.reasons];
    const left=new Map(r.outcomes.filter(o=>o.armId===baselineId).map(o=>[o.taskId,o]));
    const right=new Map(r.outcomes.filter(o=>o.armId===candidateId).map(o=>[o.taskId,o]));
    const complete=left.size===n&&right.size===n;
    const difference=complete?[...tasks.keys()].reduce((v,k)=>v+Number(right.get(k).accepted)-Number(left.get(k).accepted),0)/n:null;
    const bound=complete?interval(difference,n,2,q.alpha,-1,1):null;
    const nonInferiorityGate=bound?gate(bound,-q.nonInferiorityMargin):'unavailable';
    const gates=[b.acceptanceGate,b.latencyGate,c.acceptanceGate,c.latencyGate,nonInferiorityGate];
    const qualityStatus=reasons.length?'invalid_design':gates.includes('fails')?'fails':gates.every(g=>g==='passes')?'passes':'inconclusive';
    const accountingReasons=[b,c].flatMap(a=>a.accountingReasons.map(reason=>`${a.label}: ${reason}`));
    const projectionReasons=[...new Set([...b.projectionReasons,...c.projectionReasons])];
    let scenario=null;
    if(!projectionReasons.length){
      const bf=sum([b.phases.investment.scenarioBasisMicros,b.phases.future_fixed.scenarioBasisMicros]),cf=sum([c.phases.investment.scenarioBasisMicros,c.phases.future_fixed.scenarioBasisMicros]);
      const bv=b.phases.future_per_attempt.scenarioBasisMicros,cv=c.phases.future_per_attempt.scenarioBasisMicros,N=p.scenario.attemptedTasks;
      scenario={...crossover({baselineFixed:bf,candidateFixed:cf,baselineVariable:bv,candidateVariable:cv,maxTasks:N}),
        baselineFixedMicros:bf,candidateFixedMicros:cf,baselineVariableMicros:bv,candidateVariableMicros:cv,
        baselineTotalMicros:safe(BigInt(bf)+BigInt(bv)*BigInt(N)),candidateTotalMicros:safe(BigInt(cf)+BigInt(cv)*BigInt(N)),
        attemptedTasks:N,horizonDays:p.scenario.horizonDays,
        // Conditional point ratios use observed acceptance rates, never a guarantee of future outcomes.
        baselineCostPerAcceptedAtObservedRate:b.acceptedTasks?{numeratorMicros:(BigInt(bf)+BigInt(bv)*BigInt(N)).toString(),multiplier:n,denominator:(BigInt(N)*BigInt(b.acceptedTasks)).toString()}:null,
        candidateCostPerAcceptedAtObservedRate:c.acceptedTasks?{numeratorMicros:(BigInt(cf)+BigInt(cv)*BigInt(N)).toString(),multiplier:n,denominator:(BigInt(N)*BigInt(c.acceptedTasks)).toString()}:null};
    }
    const evidenceComplete=b.accountingStatus==='complete_declared'&&c.accountingStatus==='complete_declared';
    // Even an allowed quality difference may erase per-task savings. Require
    // conservative accepted-outcome economics too; these bounds remain conditional
    // on fixed future costs and stable population acceptance probabilities.
    const acceptedCostBoundPass=Boolean(scenario && acceptedCostAtMost(
      scenario.candidateTotalMicros,scenario.baselineTotalMicros,c.acceptanceBound.lower,b.acceptanceBound.upper));
    const eligible=qualityStatus==='passes'&&evidenceComplete&&scenario?.noMoreExpensiveAtDeclaredVolume===true&&acceptedCostBoundPass;
    return {baselineId,candidateId,pairedAcceptanceDifference:difference,pairedBound:bound,nonInferiorityGate,qualityStatus,
      reasons:[...new Set(reasons)],accountingReasons,projectionReasons,scenario,acceptedCostBoundPass,
      assessment:eligible?(p.evidenceKind==='synthetic'?'synthetic_candidate':'conditional_candidate'):'not_demonstrated',
      executionAuthorized:false};
  });
  const report={format:'palo-finops-learning-report',schemaVersion:LEARNING_REPORT_VERSION,experimentDigest:await digest(x),planDigest:x.plan.digest,
    runId:r.id,asOf:r.endedAt,currency:p.currency,evidenceKind:p.evidenceKind,arms,comparisons,
    units:{sampling:'task',futureVolume:'attempted task',futureVariableCost:'micros per attempted task, including all retries and model calls',attempts:'model attempts within observed tasks',latency:'end-to-end task milliseconds, including retries',capacity:'complete attempted tasks per day'},
    inference:{method:'two-sided Hoeffding, Bonferroni over 9 fixed intervals',familywiseAlpha:q.alpha,sampleSize:n,independentUnitsAssumed:true,independenceVerified:false},
    limits:['Input evidence and sampling declarations are not independently authenticated.', 'Digest binding detects changes relative to a retained digest; it does not prove preregistration time.', 'Content hashes reject exact duplicates, not semantic overlap or undisclosed pretraining contamination.', 'Observed sunk, investment and evaluation costs are separate from hypothetical future spending.', 'Future fixed costs cover the whole declared horizon at every volume; the crossover is an attempt-volume threshold, not a calendar payback date.', 'Forecast unit costs use observed acceptance rates as assumptions; they do not establish equal quality or equal accepted volume.', 'Consistency between observed retries and declared retry-inclusive future costs remains the declarant responsibility.', 'A lower cost per attempted task can coexist with a higher cost per accepted outcome.', 'Acceptance and latency floors are separate marginal requirements; no joint success floor or latency noninferiority is tested.', 'Range-based intervals do not adapt to observed pair agreement; their coverage excludes uncertainty in future costs.', 'No model training, provider dispatch, route promotion or causal economic validation is performed.'],
    savingsDemonstrated:false,productionValidated:false,executionAuthorized:false};
  return {...report,digest:await digest(report)};
}

export async function verifyLearningReport(report, experiment) {
  check(report?.format==='palo-finops-learning-report' && report.schemaVersion===LEARNING_REPORT_VERSION, 'Unsupported learning report version; regenerate from the original experiment with analyze.');
  check(canonical(report)===canonical(await analyzeLearningExperiment(experiment)), 'Learning report replay mismatch.');
  return true;
}
