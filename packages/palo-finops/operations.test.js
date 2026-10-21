import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as o from './operations.js';
import * as b from './billing.js';
import {summarize} from './index.js';
const at='2026-10-21T12:00:00.000Z',later='2026-10-21T13:00:00.000Z';
const workspace=()=>JSON.parse(readFileSync(new URL('../../data/finops-demo.json',import.meta.url)));
const example=()=>JSON.parse(readFileSync(new URL('../../data/finops-billing-demo.json',import.meta.url)));
export async function fixture({shiftDays=0,scale=1}={}){
 const w=workspace(),batch=example();
 if(shiftDays){const shift=s=>new Date(Date.parse(s)+shiftDays*86400000).toISOString();w.createdAt=shift(w.createdAt);for(const e of w.events)e.at=shift(e.at);for(const range of [batch.coverage,...batch.records.flatMap(r=>[r.usage,r.invoice])]){range.start=shift(range.start);range.end=shift(range.end);}}
 for(const e of w.events)if(e.costMicros!==null&&e.costMicros!==undefined){e.costMicros=Math.round(e.costMicros*scale);delete e.usage;delete e.charges;}
 for(const r of batch.records)r.amountMicros=Math.round(r.amountMicros*scale);
 const time=new Date(Date.parse(at)+shiftDays*86400000).toISOString();
 let book=b.createBillingBook(w,{source:batch.source,account:batch.account,at:time});book=await b.importBilling(book,batch,{id:'import',at:time});
 for(const name of ['code','check','research','open'])book=b.linkBilling(book,w,{recordRef:JSON.stringify(['synthetic-'+name,1]),attemptId:'attempt-'+name,component:'total',amountMicros:batch.records.find(r=>r.sourceRecordId==='synthetic-'+name).amountMicros,measurementBasis:'measured',evidenceRef:'urn:synthetic:match'},{id:'link-'+name,at:time});
 const closed=(await b.settleFromBilling(book,w,{attemptId:'attempt-open',linkIds:['link-open'],owner:'reviewer',policyVersion:'1',evidenceRef:'urn:synthetic:review',sourceReviewed:true,bindingReviewed:true,componentsComplete:true},{at:time})).workspace;
 closed.tasks.find(t=>t.id==='task-open').outcome='failed';
 const contract={id:'accepted',version:'1',owner:'reviewer',partition:'all',acceptanceRule:'declared',outcomeSource:'workspace',window:batch.coverage,timezone:'UTC',periodBasis:'usage',numeratorBasis:'billed',workloadIds:closed.workloads.map(w=>w.id),outcomeWindowConfirmed:true};
 const rules=[{id:'pool',version:'1',priority:0,effectiveFrom:'2026-01-01T00:00:00.000Z',effectiveUntil:'2027-01-01T00:00:00.000Z',match:{pool:'shared'},weights:closed.workloads.map(w=>({id:w.id,weight:1}))}];
 const snapshot=await b.createPeriodSnapshot(book,closed,contract,rules,{id:'snapshot-'+shiftDays,at:batch.coverage.end});
 return {w:closed,book,rules,contract,snapshot};
}
test('case deduplication and source revisions preserve review history without touching accounting',async()=>{
 const w=workspace();let book=b.createBillingBook(w,{source:example().source,account:example().account,at});book=await b.importBilling(book,example(),{at});
 const before=JSON.stringify({w,book}),findings=o.deriveCases(w,book,[],{at});let ops=o.syncCases(o.createOperations(w,{at}),findings,{at});
 assert.equal(o.syncCases(ops,findings,{at:later}).cases.length,ops.cases.length);
 const c=ops.cases.find(c=>c.kind==='unknown-cost');ops=o.updateCase(ops,c.id,{owner:'reviewer',status:'closed',reason:'Investigated; waiting for source'},{at});
 ops=o.syncCases(ops,findings,{at:later});assert.equal(ops.cases.find(x=>x.id===c.id).status,'closed');
 const revised=structuredClone(findings);revised.find(x=>x.id===c.id).fingerprint+='revision';ops=o.syncCases(ops,revised,{at:later});
 assert.equal(ops.cases.find(x=>x.id===c.id).status,'open');assert.equal(ops.cases.find(x=>x.id===c.id).history.length,3);
 assert.equal(JSON.stringify({w,book}),before);assert.equal(summarize(w).reservedMicros,180000);
 ops=o.syncCases(ops,[],{at:later});assert.equal(ops.cases.every(c=>!c.active),true);
 assert.throws(()=>o.updateCase(ops,c.id,{owner:'',status:'closed',reason:'x'},{at:later}),/owner/);
});
test('cost explanation connects source, attempt, outcome and signed shared credit',async()=>{
 const f=await fixture(),e=o.explainCost(f.book,f.w,f.rules,'["synthetic-code",1]',{at});
 assert.equal(e.links[0].attempt.attemptId,'attempt-code');assert.equal(e.links[0].task.outcome,'accepted');assert.equal(e.unallocatedMicros,0);
 const credit=o.explainCost(f.book,f.w,f.rules,'["synthetic-shared-credit",1]',{at});assert.equal(credit.sourceTotalMicros,-3000);assert.equal(credit.allocation.shares.reduce((n,x)=>n+x.amountMicros,0),-3000);
});
test('metric versions freeze, cohort mismatches block, forecast denominators never mix with observations',async()=>{
 const f=await fixture();assert.equal(f.snapshot.result.status,'complete_declared');
 const contract={...f.contract,label:'Documents',unit:'document',sourceRef:'urn:documents',cohortRef:await o.metricCohortRef(f.snapshot),currency:'USD'};
 let ops=o.registerMetric(o.createOperations(f.w,{at}),contract);
 assert.throws(()=>o.registerMetric(ops,contract),/immutable/);
 const batch={id:'batch',metricId:contract.id,metricVersion:contract.version,kind:'observed',complete:true,sourceRef:'urn:observations',cohortRef:contract.cohortRef,window:contract.window,values:[{id:'docs',value:10}]};
 ops=o.recordMetricBatch(ops,batch);ops=o.recordMetricBatch(ops,batch);assert.equal(ops.metricBatches.length,1);
 ops=o.recordMetricBatch(ops,{...batch,id:'forecast',kind:'forecast',values:[{id:'docs',value:1000}]});
 const result=await o.evaluateBusinessMetric(f.snapshot,contract,ops.metricBatches);assert.equal(result.valueMicros,46700);assert.equal(result.denominator,10);
 const thirds=await o.evaluateBusinessMetric(f.snapshot,contract,[{...batch,values:[{id:'docs',value:3}]}]);assert.equal(thirds.valueMicros,155667);assert.deepEqual(thirds.exactUnitCost,{numeratorMicros:467000,denominator:3});assert.equal(thirds.rounding,'nearest-micro-half-away-from-zero');
 assert.equal((await o.evaluateBusinessMetric(f.snapshot,{...contract,cohortRef:'different'},ops.metricBatches)).status,'unavailable');
 assert.equal((await o.evaluateBusinessMetric(f.snapshot,contract,[{...batch,complete:false}])).status,'unavailable');
 assert.equal((await o.evaluateBusinessMetric(f.snapshot,contract,[{...batch,values:[]}])).status,'unavailable');
 assert.throws(()=>o.recordMetricBatch(ops,{...batch,values:[{id:'docs',value:20}]}),/Conflicting/);
});
test('CFO report declares budget scope separately and does not add billing to operational costs',async()=>{
 const f=await fixture(),report=await o.createCfoReport(f.book,f.w,f.contract,f.rules,{at:f.contract.window.end});
 assert.equal(report.summary.knownMicros,440000);assert.equal(report.summary.billingCostMicros,467000);assert.equal(report.summary.billingAndLedgerAdded,false);assert.equal(report.scope.operationalBudgetScope,'whole-workspace-current');
 const filtered=o.exportFilteredBilling(f.book,{kind:'credit'});assert.equal(filtered.subtotalMicros,-3000);assert.equal(filtered.records.length,1);assert.equal(filtered.wholeBook,false);
});
test('rule difference conserves every signed micro, freezes inputs and does not imply savings',async()=>{
 const f=await fixture(),alt=structuredClone(f.rules);alt[0].version='2';alt[0].weights[0].weight=3;
 const diff=o.compareRules(f.book,f.rules,alt,{at});
 for(const ref of new Set(diff.deltas.map(x=>x.recordRef)))assert.equal(diff.deltas.filter(x=>x.recordRef===ref).reduce((n,x)=>n+x.deltaMicros,0),0);
 alt[0].version='99';assert.equal(diff.afterRules[0].version,'2');assert.equal(diff.savingsDemonstrated,false);
});
test('savings observations normalize accepted volume, subtract intervention, enforce quality and do not claim causality',async()=>{
 const base=await fixture(),after=await fixture({shiftDays:1,scale:0.5}),settings={interventionMicros:10000,quality:{baseline:0.9,after:0.9,minimum:0.85},comparisonRef:'urn:review',comparable:true};
 const result=await o.evaluateSavings(base.snapshot,after.snapshot,settings);assert.equal(result.netDifferenceMicros,223500);assert.equal(result.causalClaim,false);assert.equal(result.savingsDemonstrated,false);
 const moreAccepted=structuredClone(base.w);moreAccepted.tasks.find(t=>t.id==='task-check').outcome='accepted';const thirds=await b.createPeriodSnapshot(base.book,moreAccepted,base.contract,base.rules,{at:base.contract.window.end});const normalized=await o.evaluateSavings(thirds,after.snapshot,settings);assert.equal(normalized.grossDifferenceMicros,77833);assert.equal(normalized.netDifferenceMicros,67833);assert.deepEqual(normalized.normalizationRational,{numeratorMicrosTimesTasks:'934000',denominator:3});
 assert.equal((await o.evaluateSavings(base.snapshot,after.snapshot,{...settings,quality:{baseline:0.9,after:0.8,minimum:0.85}})).status,'unavailable');
 assert.equal((await o.evaluateSavings(base.snapshot,base.snapshot,settings)).status,'unavailable');
 let ops=o.createInitiative(o.createOperations(base.w,{at}),{id:'i1',title:'Test',owner:'owner',hypothesis:'Reduce cost at fixed quality',scopeRef:'urn:cohort'},{at});
 assert.throws(()=>o.advanceInitiative(ops,'i1',{status:'measured',evidenceRef:'x',measurement:result},{at}),/sequential/);
 for(const status of ['approved','applied','measured'])ops=o.advanceInitiative(ops,'i1',{status,evidenceRef:'urn:'+status,measurement:result},{at});
 assert.equal(ops.initiatives[0].status,'measured');assert.equal(ops.initiatives[0].measurement.savingsDemonstrated,false);
});
test('forecast uses chronological origins, rejects gaps/open days and never changes budget',()=>{
 const points=Array.from({length:14},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,amountMicros:100+i*10,complete:true,sourceRef:'urn:synthetic:'+i}));
 const r=o.forecastSeries(points,{asOf:'2026-10-15',horizon:3});assert.equal(r.forecast[0].date,'2026-10-15');assert.equal(r.budgetChanged,false);
 const naive=r.backtest.candidates.find(x=>x.model==='last-value');assert.equal(naive.errors[0].predictedMicros,200);assert.equal(naive.errors[0].actualMicros,210);
 assert.equal(o.forecastSeries(points.slice(1),{asOf:'2026-10-15'}).status,'forecast');
 assert.equal(o.forecastSeries(points.filter((_,i)=>i!==6),{asOf:'2026-10-15'}).status,'unavailable');
 assert.equal(o.forecastSeries(points,{asOf:'2026-10-14'}).status,'unavailable');
 assert.equal(o.forecastSeries(points.map(p=>({...p,complete:false})),{asOf:'2026-10-15'}).status,'unavailable');
});
test('foreign operations and corrupted histories cannot replace a workspace',()=>{
 const w=workspace(),ops=o.createOperations(w,{at});assert.throws(()=>o.assertOperations(ops,'wrong-workspace'),/different/);
 const bad=o.syncCases(ops,o.deriveCases(w,null,[],{at}),{at});bad.cases[0].history[0].at='invalid';assert.throws(()=>o.assertOperations(bad,w.workspaceId),/history/);
});
test('expired or unmatched rules keep shared records visible as unallocated exceptions',async()=>{
 const f=await fixture(),expired=f.rules.map(r=>({...r,effectiveUntil:'2026-10-20T00:00:00.000Z'}));
 const cases=o.deriveCases(f.w,f.book,expired,{at});assert.ok(cases.some(c=>c.kind==='missing-driver'));
 const explanation=o.explainCost(f.book,f.w,expired,'["synthetic-shared-pool",1]',{at});assert.equal(explanation.allocation.unallocatedMicros,30000);
});
