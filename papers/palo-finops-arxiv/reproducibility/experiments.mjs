// Deterministic synthetic checks for the PALO FinOps manuscript. No network calls.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as c from '../../../assets/palo-finops-core.js';
import * as b from '../../../assets/palo-finops-billing.js';
import * as o from '../../../assets/palo-finops-operations.js';

const root=new URL('../../../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const at='2026-10-21T12:00:00.000Z';
const initial=read('data/finops-demo.json');
const batch=read('data/finops-billing-demo.json');
let book=b.createBillingBook(initial,{source:batch.source,account:batch.account,at});
book=await b.importBilling(book,batch,{id:'paper-import-1',at});
const inputBook=structuredClone(book);
for(const name of ['code','check','research','open']){
 book=b.linkBilling(book,initial,{recordRef:JSON.stringify(['synthetic-'+name,1]),attemptId:'attempt-'+name,component:'total',amountMicros:batch.records.find(r=>r.sourceRecordId==='synthetic-'+name).amountMicros,measurementBasis:'measured',evidenceRef:'urn:synthetic:paper-match'},{id:'link-'+name,at});
}
const contract={id:'accepted',version:'1',owner:'paper-fixture',partition:'all',acceptanceRule:'declared synthetic outcomes',outcomeSource:'workspace',window:batch.coverage,timezone:'UTC',periodBasis:'usage',numeratorBasis:'billed',workloadIds:initial.workloads.map(w=>w.id),outcomeWindowConfirmed:true};
const rules=[{id:'pool',version:'1',priority:0,effectiveFrom:'2026-01-01T00:00:00.000Z',effectiveUntil:'2027-01-01T00:00:00.000Z',match:{pool:'shared'},weights:initial.workloads.map(w=>({id:w.id,weight:1}))}];
const snapshotOptions={id:'paper-period',at:batch.coverage.end};
const initialSnapshot=await b.createPeriodSnapshot(book,initial,contract,rules,snapshotOptions);
assert.equal(initialSnapshot.result.status,'unavailable');
const initialSummary=c.summarize(initial);
let ops=o.syncCases(o.createOperations(initial,{at}),o.deriveCases(initial,book,rules,{at}),{at});
const unresolved=ops.cases.find(x=>x.kind==='unknown-cost');
assert.ok(unresolved);
ops=o.updateCase(ops,unresolved.id,{owner:'paper-fixture',status:'closed',reason:'Synthetic administrative closure only'},{at});
assert.equal(c.summarize(initial).reservedMicros,180000);
const closed=(await b.settleFromBilling(book,initial,{attemptId:'attempt-open',linkIds:['link-open'],owner:'paper-fixture',policyVersion:'1',evidenceRef:'urn:synthetic:paper-review',sourceReviewed:true,bindingReviewed:true,componentsComplete:true},{id:'paper-reconcile',at})).workspace;
closed.tasks.find(t=>t.id==='task-open').outcome='failed';
const complete=await b.createPeriodSnapshot(book,closed,contract,rules,snapshotOptions);
await b.verifyPeriodSnapshot(complete);
assert.equal(complete.result.status,'complete_declared');
assert.equal(complete.result.numeratorMicros,467000);
assert.equal(complete.result.denominator,2);
assert.equal(complete.result.costPerAcceptedMicros,233500);
assert.equal(c.summarize(closed).knownMicros,440000);
const replay=await b.importBilling(inputBook,batch,{id:'paper-import-2',at});
assert.equal(b.replayBilling(replay).records.reduce((n,r)=>n+r.amountMicros,0),467000);
const revision=structuredClone(batch);revision.records=[{...revision.records[0],revision:2,supersedes:b.recordRef(revision.records[0]),amountMicros:240000}];
const revised=await b.importBilling(book,revision,{id:'paper-revision',at});
const revisedSnapshot=await b.createPeriodSnapshot(revised,closed,contract,rules,{...snapshotOptions,id:'paper-revised'});
assert.equal(revisedSnapshot.result.status,'unavailable');
assert.equal(revisedSnapshot.result.sourceTotalMicros,487000);
await b.verifyPeriodSnapshot(complete);

let allocationConfigurations=0,allocationAssertions=0;
for(let amount=-100;amount<=100;amount++)for(let x=0;x<=3;x++)for(let y=0;y<=3;y++)for(let z=0;z<=3;z++){
 const weights=[{id:'a',weight:x},{id:'b',weight:y},{id:'c',weight:z}];
 const result=b.allocateMicros(amount,weights);
 assert.equal(result.shares.reduce((n,s)=>n+s.amountMicros,0)+result.unallocatedMicros,amount);
 assert.deepEqual(result,b.allocateMicros(amount,[...weights].reverse()));
 assert.ok(result.shares.every(s=>Number.isSafeInteger(s.amountMicros)));
 allocationConfigurations++;allocationAssertions+=3;
}
const metric={...contract,label:'Documents',unit:'document',sourceRef:'urn:synthetic:documents',cohortRef:await o.metricCohortRef(complete),currency:'USD'};
const observations={id:'observations',metricId:metric.id,metricVersion:metric.version,kind:'observed',complete:true,sourceRef:'urn:synthetic:observations',cohortRef:metric.cohortRef,window:metric.window,values:[{id:'documents',value:3}]};
const ratio=await o.evaluateBusinessMetric(complete,metric,[observations]);
assert.equal(ratio.valueMicros,155667);
assert.deepEqual(ratio.exactUnitCost,{numeratorMicros:467000,denominator:3});
const mismatched=await o.evaluateBusinessMetric(complete,{...metric,cohortRef:'different-cohort'},[observations]);
assert.equal(mismatched.status,'unavailable');
const expired=rules.map(r=>({...r,effectiveUntil:'2026-10-20T00:00:00.000Z'}));
const expiredSnapshot=await b.createPeriodSnapshot(book,closed,contract,expired,{...snapshotOptions,id:'paper-expired'});
assert.equal(expiredSnapshot.result.status,'unavailable');

// Deliberately constructed arithmetic sensitivity, not model performance data.
const arithmetic={tasksPerStrategy:100,acceptedPerStrategy:80,stayInferenceMicros:1000000,switchInferenceMicros:700000,stayOtherMicros:200000,switchOverheadGridMicros:Array.from({length:81},(_,i)=>i*12500)};
const sensitivity=arithmetic.switchOverheadGridMicros.map(h=>({switchOtherMicros:h,stayPerAcceptedMicros:(arithmetic.stayInferenceMicros+arithmetic.stayOtherMicros)/80,switchPerAcceptedMicros:(arithmetic.switchInferenceMicros+h)/80}));
assert.equal(sensitivity.find(x=>x.switchOtherMicros===500000).stayPerAcceptedMicros,sensitivity.find(x=>x.switchOtherMicros===500000).switchPerAcceptedMicros);
const sourceFiles=['assets/palo-finops-core.js','assets/palo-finops-billing.js','assets/palo-finops-operations.js','data/finops-demo.json','data/finops-billing-demo.json'];
const report={format:'palo-finops-paper-synthetic-results',schemaVersion:'1.0.0',evaluationDate:'2026-10-21',synthetic:true,providerCalls:0,nodeVersion:process.version,
 initial:{knownMicros:initialSummary.knownMicros,reservedMicros:initialSummary.reservedMicros,committedMicros:initialSummary.committedMicros,remainingMicros:initialSummary.remainingMicros,metric:initialSnapshot.result.status,reasons:initialSnapshot.result.reasons},
 caseClosure:{status:ops.cases.find(x=>x.id===unresolved.id).status,reservedMicros:c.summarize(initial).reservedMicros},
 reconciled:{operationalKnownMicros:c.summarize(closed).knownMicros,reservedMicros:c.summarize(closed).reservedMicros,billingMicros:complete.result.numeratorMicros,acceptedTasks:complete.result.denominator,costPerAcceptedMicros:complete.result.costPerAcceptedMicros,providerVerified:complete.providerVerified,status:complete.result.status},
 repeatedImport:{sourceTotalMicros:b.replayBilling(replay).records.reduce((n,r)=>n+r.amountMicros,0)},
 revised:{sourceTotalMicros:revisedSnapshot.result.sourceTotalMicros,status:revisedSnapshot.result.status,reasons:revisedSnapshot.result.reasons,priorSnapshotStillVerifies:true},
 allocation:{configurations:allocationConfigurations,assertions:allocationAssertions,failures:0,amountRange:[-100,100],weightRange:[0,3],destinations:3,creditExample:b.allocateMicros(-7,[{id:'a',weight:1},{id:'b',weight:1},{id:'c',weight:1}])},
 metric:{numeratorMicros:ratio.exactUnitCost.numeratorMicros,denominator:ratio.exactUnitCost.denominator,valueMicros:ratio.valueMicros,rounding:ratio.rounding,mismatchStatus:mismatched.status},
 expiredRules:{status:expiredSnapshot.result.status,reasons:expiredSnapshot.result.reasons},
 illustrativeRouting:{...arithmetic,breakEvenOtherMicros:500000,sensitivity},
 sourceHashes:sourceFiles.map(path=>({path,sha256:createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex')}))};
writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({allocationConfigurations,allocationAssertions,failures:0,initialMetric:report.initial.metric,reconciledMetric:report.reconciled.status,revisedMetric:report.revised.status,providerCalls:0}));
