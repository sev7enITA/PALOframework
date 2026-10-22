import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {analyzeLearningExperiment as analyze,freezeLearningPlan,verifyLearningReport} from './learning.js';
import {createLearningDemo} from '../../assets/palo-finops-learning-demo.js';

const pair=r=>r.comparisons.find(c=>c.baselineId==='external_only'&&c.candidateId==='hybrid_distilled');
const refreeze=async x=>{x.plan=await freezeLearningPlan(x.plan.spec);x.run.planDigest=x.plan.digest;return x;};
function commonOverhead(x,amount){
  const rows=x.run.costs.filter(c=>c.phase==='future_fixed'&&c.categories[0]==='operations');
  x.run.costs=x.run.costs.filter(c=>!rows.includes(c));
  x.run.costs.push({...rows[0],sourceKey:'review-common-platform',amountMicros:amount,
    allocations:rows.map((c,i)=>({armId:c.allocations[0].armId,amountMicros:i===0?amount:0}))});
}
function futureTotal(x,armId,amount){
  for(const c of x.run.costs.filter(c=>c.allocations[0].armId===armId&&['investment','future_fixed','future_per_attempt'].includes(c.phase))){
    c.amountMicros=0;c.allocations[0].amountMicros=0;
  }
  const row=x.run.costs.find(c=>c.allocations[0].armId===armId&&c.phase==='future_fixed'&&c.categories[0]==='hardware');
  row.amountMicros=amount;row.allocations[0].amountMicros=amount;
}

test('review: real common overhead can change full-cost ratios without changing the raw cost difference',async()=>{
  const x=await createLearningDemo();
  const before=pair(await analyze(x));assert.equal(before.assessment,'synthetic_candidate');
  commonOverhead(x,1000000000);
  const after=pair(await analyze(x));
  assert.equal(after.scenario.differenceAtDeclaredVolumeMicros,before.scenario.differenceAtDeclaredVolumeMicros);
  assert.equal(after.scenario.noMoreExpensiveAtDeclaredVolume,true);
  assert.equal(after.acceptedCostBoundPass,false);
  assert.equal(after.assessment,'not_demonstrated');
});

test('review: better acceptance and common overhead cannot qualify a higher-total-cost candidate',async()=>{
  const x=await createLearningDemo({sampleSize:4000});
  const positions=new Map(x.plan.spec.splits.evaluation.map((t,i)=>[t.id,i]));
  for(const o of x.run.outcomes)o.accepted=positions.get(o.taskId)<(o.armId==='hybrid_distilled'?4000:3400);
  futureTotal(x,'external_only',100000000);futureTotal(x,'hybrid_distilled',120000000);
  const before=pair(await analyze(x));assert.equal(before.acceptedCostBoundPass,false);
  commonOverhead(x,200000000);
  const after=pair(await analyze(x));
  assert.equal(after.qualityStatus,'passes');assert.equal(after.acceptedCostBoundPass,true);
  assert.equal(after.scenario.noMoreExpensiveAtDeclaredVolume,false);
  assert.equal(after.assessment,'not_demonstrated');
});

test('review: separate marginal gates do not assert joint acceptance-and-latency success',async()=>{
  const x=await createLearningDemo({sampleSize:2400}),n=2400;
  x.plan.spec.quality.minimumLatencyPassRate=0.8;
  const positions=new Map(x.plan.spec.splits.evaluation.map((t,i)=>[t.id,i]));
  for(const o of x.run.outcomes){
    const i=positions.get(o.taskId);o.accepted=i<0.85*n;
    o.latencyMs=i<0.7*n||i>=0.85*n?1000:3000;
  }
  const r=await analyze(await refreeze(x));
  assert.equal(pair(r).qualityStatus,'passes');
  assert.equal(x.run.outcomes.filter(o=>o.armId==='hybrid_distilled'&&o.accepted&&o.latencyMs<=2500).length/n,0.7);
  assert.ok(r.limits.some(s=>s.includes('no joint success floor')));
});

test('review: identical paired outcomes can remain inconclusive under a conservative range bound',async()=>{
  const r=await analyze(await createLearningDemo({sampleSize:500})),c=pair(r);
  assert.equal(c.pairedAcceptanceDifference,0);
  assert.ok(Math.abs(c.pairedBound.lower+0.1534412098030009)<0.00001);
  assert.equal(c.nonInferiorityGate,'inconclusive');
  assert.equal(c.assessment,'not_demonstrated');
});

test('review: nonpositive acceptance lower bounds cannot pass even with zero future candidate cost',async()=>{
  const x=await createLearningDemo({sampleSize:1});
  for(const o of x.run.outcomes)o.accepted=true;
  futureTotal(x,'hybrid_distilled',0);
  const r=await analyze(x);
  assert.equal(r.arms[2].acceptanceBound.lower,0);
  assert.equal(pair(r).acceptedCostBoundPass,false);
  assert.equal(pair(r).assessment,'not_demonstrated');
  x.plan.spec.quality.minimumAcceptance=0;
  await assert.rejects(refreeze(x),/quality thresholds/);
});

test('review: final sunk and evaluation expenditure cannot subsidize forward eligibility',async()=>{
  const x=await createLearningDemo(),before=await analyze(x);
  for(const phase of ['sunk','evaluation']){
    const row=x.run.costs.find(c=>c.allocations[0].armId==='external_only'&&c.phase===phase&&c.categories[0]==='operations');
    row.amountMicros=10000000000;row.allocations[0].amountMicros=10000000000;
  }
  const after=await analyze(x);
  assert.deepEqual(after.comparisons,before.comparisons);
  assert.equal(after.arms[0].knownObservedTotalMicros-before.arms[0].knownObservedTotalMicros,20000000000);
});

test('review: unsupported projected totals fail closed instead of overflowing',async()=>{
  const x=await createLearningDemo({sampleSize:24});
  x.plan.spec.scenario.attemptedTasks=100000000000;
  x.plan.spec.arms.forEach(a=>a.capacityTasksPerDay=100000000000);
  const row=x.run.costs.find(c=>c.allocations[0].armId==='external_only'&&c.phase==='future_per_attempt'&&c.categories[0]==='external_inference');
  row.amountMicros=200000;row.allocations[0].amountMicros=200000;
  await assert.rejects(analyze(await refreeze(x)),/overflow/);
});

test('source review: rounded probability products cannot turn a higher accepted-outcome cost into a tie',async()=>{
  const x=await createLearningDemo();
  futureTotal(x,'external_only',9007199254740986);
  futureTotal(x,'hybrid_distilled',8114643714045151);
  const r=await analyze(x),c=pair(r);
  // These unequal exact products round to the same Number in the old gate.
  assert.equal(c.scenario.candidateTotalMicros*r.arms[0].acceptanceBound.upper,
    c.scenario.baselineTotalMicros*r.arms[2].acceptanceBound.lower);
  assert.equal(c.acceptedCostBoundPass,false);
  assert.equal(c.assessment,'not_demonstrated');
  futureTotal(x,'hybrid_distilled',8114643714045150);
  assert.equal(pair(await analyze(x)).assessment,'synthetic_candidate');
});


test('source review: non-JSON JS inputs cannot be silently coerced or dropped before hashing',async()=>{
  const mutations=[
    x=>x.run.outcomes[0].latencyMs=NaN,
    x=>x.run.outcomes[0].latencyMs=Infinity,
    x=>x.plan.spec.hiddenField=undefined,
    x=>x.plan.spec.hiddenField=()=>0,
    x=>x.plan.spec.hiddenField=Symbol('hidden'),
    x=>x.plan.spec.hiddenField=1n,
    x=>x.run.outcomes[0].latencyMs=new Date(),
    x=>delete x.run.outcomes[0],
    x=>x.run.outcomes.extra='ignored',
    x=>x.run.cycle=x,
    x=>Object.defineProperty(x.run,'hidden',{value:1,enumerable:false}),
    x=>Object.defineProperty(x.run,'id',{get:()=>{throw new Error('Accessor executed');},enumerable:true})
  ];
  for(const mutate of mutations){const x=await createLearningDemo({sampleSize:24});mutate(x);await assert.rejects(analyze(x),/JSON/);}
  const x=await createLearningDemo({sampleSize:24});x.plan.spec.hidden=undefined;
  await assert.rejects(freezeLearningPlan(x.plan.spec),/Non-JSON/);
});

test('source review: incomplete accounting explains exclusion separately from passing quality',async()=>{
  for(const phase of ['sunk','evaluation'])for(const mode of ['unknown','estimated','missing']){
    const x=await createLearningDemo();
    const row=x.run.costs.find(c=>c.phase===phase&&c.categories[0]==='operations'&&c.allocations[0].armId==='hybrid_distilled');
    if(mode==='missing')x.run.costs=x.run.costs.filter(c=>c!==row);
    else {row.status=mode;if(mode==='unknown'){row.amountMicros=null;row.allocations[0].amountMicros=null;}}
    const r=await analyze(x),c=pair(r);
    assert.equal(c.qualityStatus,'passes');assert.equal(c.acceptedCostBoundPass,true);
    assert.equal(c.assessment,'not_demonstrated');assert.ok(c.accountingReasons.some(s=>s.includes(phase)));
    assert.equal(r.arms[2].observedCostPerAccepted,null);
  }
  const x=await createLearningDemo({scenario:'unknown_cost'}),c=pair(await analyze(x));
  assert.equal(c.qualityStatus,'passes');assert.ok(c.accountingReasons.some(s=>s.includes('reservations')));
});

test('source review: schema and runtime reject whitespace and noncanonical timestamps',async()=>{
  const ajv=new Ajv({allErrors:true,strict:true});addFormats(ajv);
  const validate=ajv.compile(JSON.parse(await readFile(new URL('../../schemas/palo-finops-learning-experiment.schema.json',import.meta.url))));
  for(const mutate of [x=>x.plan.spec.owner='   ',x=>x.plan.spec.registeredAt='2026-10-22T08:00:00Z',x=>x.run.endedAt='2026-10-22T11:00:00+00:00']){
    const x=await createLearningDemo({sampleSize:24});mutate(x);
    assert.equal(validate(x),false);await assert.rejects(analyze(x));
  }
});

test('source review: model retries do not multiply already inclusive per-task scenario assumptions',async()=>{
  const x=await createLearningDemo(),before=await analyze(x);
  for(const o of x.run.outcomes.filter(o=>o.armId==='hybrid_distilled')){o.attempts=3;o.externalCalls=2;}
  const after=await analyze(x);
  assert.deepEqual(after.comparisons,before.comparisons);
  assert.equal(after.arms[2].attempts,3600);assert.equal(after.arms[2].externalCalls,2400);
  assert.match(after.units.futureVariableCost,/per attempted task, including all retries/);
  assert.match(after.units.latency,/end-to-end task/);
});

test('source review: CLI collision cleans its new file and preserves the pre-existing report',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'palo-source-review-')),input=join(dir,'experiment.json'),output=join(dir,'experiment.report.json');
  const cli=new URL('../../scripts/finops-learning.mjs',import.meta.url).pathname;
  await writeFile(output,'preserve existing report');
  const result=spawnSync(process.execPath,[cli,'demo','favourable',input],{encoding:'utf8'});
  assert.equal(result.status,1);assert.match(result.stderr,/EEXIST/);
  assert.equal(await readFile(output,'utf8'),'preserve existing report');
  await assert.rejects(access(input),{code:'ENOENT'});
  for(const args of [['verify',input],['freeze'],['analyze',input]]){
    const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
    assert.equal(result.status,1);assert.match(result.stderr,/Usage:/);assert.doesNotMatch(result.stderr,/ERR_INVALID_ARG_TYPE/);
  }
});


test('source review: report version identifies changed semantics and directs old exports to regeneration',async()=>{
  const x=await createLearningDemo({sampleSize:24}),r=await analyze(x);
  assert.equal(x.schemaVersion,'1.0.0');assert.equal(r.schemaVersion,'1.0.1');
  assert.equal(await verifyLearningReport(r,x),true);
  r.schemaVersion='1.0.0';
  await assert.rejects(verifyLearningReport(r,x),/regenerate from the original experiment with analyze/);
});
