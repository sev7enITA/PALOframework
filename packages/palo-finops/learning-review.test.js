import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeLearningExperiment as analyze,freezeLearningPlan} from './learning.js';
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
