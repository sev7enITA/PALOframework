import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {analyzeLearningExperiment as analyze,freezeLearningPlan,verifyLearningReport,crossover} from './learning.js';
import {createLearningDemo} from '../../assets/palo-finops-learning-demo.js';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
const demo=options=>createLearningDemo(options);
const refreeze=async x=>{x.plan=await freezeLearningPlan(x.plan.spec);x.run.planDigest=x.plan.digest;return x;};
const distill=r=>r.comparisons.find(c=>c.baselineId==='external_only'&&c.candidateId==='hybrid_distilled');

test('published schema validates every example and rejects undeclared fields',async()=>{
  const ajv=new Ajv({allErrors:true,strict:true});addFormats(ajv);
  const schema=JSON.parse(await readFile(new URL('../../schemas/palo-finops-learning-experiment.schema.json',import.meta.url)));
  const validate=ajv.compile(schema);
  for(const scenario of ['favourable','expensive_training','quality_regression','small_sample','unknown_cost','short_lifetime','declining_advantage']){const x=await demo({scenario,sampleSize:24});assert.equal(validate(x),true,JSON.stringify(validate.errors));}
  const x=await demo({sampleSize:24});x.plan.spec.executeTraining=true;assert.equal(validate(x),false);
});

test('synthetic three-arm replay includes sunk costs but forward crossover excludes them',async()=>{
  const x=await demo(),r=await analyze(x),c=distill(r);
  assert.equal(c.scenario.firstNoMoreExpensiveAttempt,'11429');
  assert.equal(c.scenario.candidateTotalMicros,160000000);
  assert.equal(c.qualityStatus,'passes');assert.equal(c.assessment,'synthetic_candidate');
  assert.equal(r.arms[2].knownObservedTotalMicros,124800000);
  assert.deepEqual(r.arms[2].observedCostPerAccepted,{numeratorMicros:124800000,denominator:1140});
  assert.equal(r.savingsDemonstrated,false);assert.equal(r.executionAuthorized,false);
  assert.equal(await verifyLearningReport(r,x),true);
  x.run.costs.find(c=>c.phase==='sunk'&&c.allocations[0].armId==='hybrid_distilled').amountMicros=80000000;
  x.run.costs.find(c=>c.phase==='sunk'&&c.allocations[0].armId==='hybrid_distilled').allocations[0].amountMicros=80000000;
  const changed=await analyze(x);
  assert.equal(distill(changed).scenario.firstNoMoreExpensiveAttempt,'11429');
  assert.notEqual(changed.digest,r.digest);await assert.rejects(verifyLearningReport(r,x),/replay mismatch/);
});
test('all integer crossover sign cases agree with brute force, including equality',()=>{
  for(let bf=0;bf<=6;bf++)for(let cf=0;cf<=6;cf++)for(let bv=0;bv<=4;bv++)for(let cv=0;cv<=4;cv++) {
    const r=crossover({baselineFixed:bf,candidateFixed:cf,baselineVariable:bv,candidateVariable:cv,maxTasks:30});
    const actual=Array.from({length:31},(_,n)=>n).filter(n=>cf+cv*n<=bf+bv*n);
    assert.equal(r.noMoreExpensiveAtDeclaredVolume,actual.includes(30));
    assert.equal(r.withinDeclaredVolume,actual.length>0);
    if(actual.length)assert.equal(Number(r.firstNoMoreExpensiveAttempt),actual[0]);
    if(r.lastNoMoreExpensiveAttempt!==null)assert.equal(Math.min(30,Number(r.lastNoMoreExpensiveAttempt)),actual.at(-1));
  }
});
test('crossovers beyond safe integer remain exact strings; totals cannot overflow',()=>{
  assert.equal(crossover({baselineFixed:0,candidateFixed:Number.MAX_SAFE_INTEGER,baselineVariable:1,candidateVariable:0,maxTasks:0}).firstNoMoreExpensiveAttempt,String(Number.MAX_SAFE_INTEGER));
  assert.throws(()=>crossover({baselineFixed:0,candidateFixed:0,baselineVariable:Number.MAX_SAFE_INTEGER,candidateVariable:0,maxTasks:2}),/overflow/);
});
for(const [scenario,expected] of [['expensive_training','not_demonstrated'],['quality_regression','not_demonstrated'],['small_sample','not_demonstrated'],['unknown_cost','not_demonstrated'],['short_lifetime','not_demonstrated'],['declining_advantage','not_demonstrated']]) {
  test(`falsification: ${scenario}`,async()=>{const r=await analyze(await demo({scenario}));assert.equal(distill(r).assessment,expected);if(scenario==='small_sample')assert.equal(distill(r).qualityStatus,'inconclusive');if(scenario==='unknown_cost')assert.equal(r.arms[2].observedCostPerAccepted,null);if(scenario==='short_lifetime')assert.equal(distill(r).scenario,null);});
}
test('missing attempts are retained as a coverage failure, never paired complete-case deletion',async()=>{
  const x=await demo();x.run.outcomes.pop();const r=await analyze(x);assert.equal(distill(r).pairedBound,null);assert.equal(distill(r).assessment,'not_demonstrated');assert.equal(r.arms[2].observedCostPerAccepted,null);
});
test('same content under renamed IDs or clustered units cannot inflate sample size',async()=>{
  const x=await demo({sampleSize:30});x.plan.spec.splits.evaluation[0].contentDigest=x.plan.spec.splits.train[0].contentDigest;
  await assert.rejects(refreeze(x),/overlapping/);
  const y=await demo({sampleSize:30});y.plan.spec.splits.evaluation[1].independenceId=y.plan.spec.splits.evaluation[0].independenceId;await assert.rejects(refreeze(y),/overlapping/);
});
test('unverified independence, reused holdout or unblinded scoring cannot yield candidate',async()=>{
  for(const field of ['independentUnitsDeclared','blindedScoringDeclared','holdoutUntouchedDeclared','fixedSampleDeclared','selectionCostsCompleteDeclared']) {
    const x=await demo();x.plan.spec.sampling[field]=false;const r=await analyze(await refreeze(x));assert.equal(distill(r).assessment,'not_demonstrated');
  }
});
test('mutated thresholds, checkpoint identity and preregistration timing are rejected',async()=>{
  const x=await demo({sampleSize:30});x.plan.spec.quality.nonInferiorityMargin=0.5;await assert.rejects(analyze(x),/digest mismatch/);
  const y=await demo({sampleSize:30});y.run.outcomes[0].checkpointDigest='0'.repeat(64);await assert.rejects(analyze(y),/checkpoint/);
  const z=await demo({sampleSize:30});z.run.startedAt='2026-10-22T07:00:00.000Z';await assert.rejects(analyze(z),/before evaluation/);
});
test('source duplication, revisions and all-in overlap do not double count',async()=>{
  const x=await demo({sampleSize:30});x.run.costs.push(structuredClone(x.run.costs[0]));await assert.rejects(analyze(x),/Duplicate economic source/);
  const y=await demo({sampleSize:30});const row=structuredClone(y.run.costs[0]);row.sourceKey='different-label-same-coverage';y.run.costs.push(row);await assert.rejects(analyze(y),/Overlapping cost coverage/);
  const z=await demo({sampleSize:30});z.run.costs[0].categories.push('energy');await assert.rejects(analyze(z),/Overlapping cost coverage/);
});
test('shared allocations conserve source costs and accept consolidated category coverage',async()=>{
  const x=await demo({sampleSize:30});const rows=x.run.costs.filter(c=>c.phase==='evaluation'&&c.categories[0]==='human_review');
  x.run.costs=x.run.costs.filter(c=>!rows.includes(c));x.run.costs.push({...rows[0],sourceKey:'shared-review',amountMicros:90000,allocations:rows.flatMap(c=>c.allocations)});
  const r=await analyze(x);assert.equal(r.arms[0].phases.evaluation.knownMicros,330000);
  x.run.costs.at(-1).amountMicros++;await assert.rejects(analyze(x),/conserve/);
});
test('common-source allocation cannot manufacture a future advantage',async()=>{
  const x=await demo();
  const rows=x.run.costs.filter(c=>c.phase==='future_fixed'&&c.categories[0]==='operations');
  x.run.costs=x.run.costs.filter(c=>!rows.includes(c));
  const common={...rows[0],sourceKey:'common-platform',amountMicros:90000000,allocations:[
    {armId:'external_only',amountMicros:80000000},
    {armId:'hybrid_static',amountMicros:5000000},
    {armId:'hybrid_distilled',amountMicros:5000000}]};
  x.run.costs.push(common);
  const first=await analyze(x);
  assert.equal(first.arms[0].phases.future_fixed.knownMicros,80000000);
  assert.equal(first.arms[0].phases.future_fixed.scenarioBasisMicros,90000000);
  assert.equal(distill(first).scenario.firstNoMoreExpensiveAttempt,'11429');
  for(const a of common.allocations)a.amountMicros=30000000;
  const second=await analyze(x);
  assert.deepEqual(first.comparisons,second.comparisons);
  assert.equal(distill(second).scenario.baselineTotalMicros,310000000);
  assert.equal(distill(second).scenario.candidateTotalMicros,250000000);
});
test('missing or estimated costs never produce a final ratio or call estimates known',async()=>{
  const x=await demo({sampleSize:30});x.run.costs=x.run.costs.filter(c=>!(c.phase==='evaluation'&&c.categories[0]==='human_review'&&c.allocations[0].armId==='hybrid_distilled'));
  assert.equal((await analyze(x)).arms[2].observedCostPerAccepted,null);
  const y=await demo({sampleSize:30});const c=y.run.costs.find(c=>c.phase==='evaluation'&&c.categories[0]==='external_inference'&&c.allocations[0].armId==='external_only');c.status='estimated';
  const r=await analyze(y);assert.equal(r.arms[0].phases.evaluation.estimatedMicros,300000);assert.equal(r.arms[0].phases.evaluation.knownMicros,30000);assert.equal(r.arms[0].observedCostPerAccepted,null);
});
test('zero accepted outcomes leave cost-per-accepted unavailable',async()=>{
  const x=await demo({sampleSize:30});x.run.outcomes.filter(o=>o.armId==='hybrid_distilled').forEach(o=>o.accepted=false);const r=await analyze(x);assert.equal(r.arms[2].observedCostPerAccepted,null);assert.equal(distill(r).assessment,'not_demonstrated');
});
test('capacity and time assumptions independently block projected advantage',async()=>{
  for(const mutate of [p=>p.arms[2].capacityTasksPerDay=1,p=>p.scenario.stableRatesDeclared=false,p=>p.scenario.stableQualityDeclared=false,p=>p.scenario.singleInvestmentDeclared=false]) {
    const x=await demo({sampleSize:30});mutate(x.plan.spec);const r=await analyze(await refreeze(x));assert.equal(distill(r).scenario,null);
  }
});
test('a lower attempted-task cost cannot bypass conservative accepted-outcome economics',async()=>{
  const x=await demo();const a=x.run.costs.find(c=>c.phase==='future_fixed'&&c.categories[0]==='hardware'&&c.allocations[0].armId==='hybrid_distilled');a.amountMicros=68000000;a.allocations[0].amountMicros=68000000;
  const r=await analyze(x),c=distill(r);assert.equal(c.qualityStatus,'passes');assert.equal(c.scenario.noMoreExpensiveAtDeclaredVolume,true);assert.equal(c.acceptedCostBoundPass,false);assert.equal(c.assessment,'not_demonstrated');
});
test('the primary distilled-versus-static comparison can pass with enough conditional advantage',async()=>{
  const x=await demo();const c=x.run.costs.find(c=>c.phase==='investment'&&c.categories[0]==='training'&&c.allocations[0].armId==='hybrid_distilled');
  c.amountMicros=20000000;c.allocations[0].amountMicros=20000000;
  const r=await analyze(x),primary=r.comparisons.find(c=>c.baselineId==='hybrid_static');
  assert.equal(primary.scenario.firstNoMoreExpensiveAttempt,'6667');
  assert.equal(primary.assessment,'synthetic_candidate');
  assert.equal(primary.acceptedCostBoundPass,true);
  assert.equal(primary.executionAuthorized,false);
});
test('CLI exclusive outputs and independent replay',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'palo-learning-')),input=join(dir,'experiment.json'),output=join(dir,'report.json');await writeFile(input,JSON.stringify(await demo({sampleSize:30})));
  const cli=new URL('../../scripts/finops-learning.mjs',import.meta.url).pathname;
  assert.equal(spawnSync(process.execPath,[cli,'analyze',input,output]).status,0);
  assert.equal(spawnSync(process.execPath,[cli,'analyze',input,output]).status,1);
  assert.equal(spawnSync(process.execPath,[cli,'verify',input,output]).status,0);
  const r=JSON.parse(await readFile(output));r.executionAuthorized=true;await writeFile(output,JSON.stringify(r));assert.equal(spawnSync(process.execPath,[cli,'verify',input,output]).status,1);
});
