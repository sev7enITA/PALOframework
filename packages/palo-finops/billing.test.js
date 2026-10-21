import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as b from './billing.js';
import {summarize} from './index.js';

const workspace=()=>JSON.parse(readFileSync(new URL('../../data/finops-demo.json',import.meta.url)));
const at='2026-10-21T10:00:00.000Z', later='2026-10-21T11:00:00.000Z';
const day={start:'2026-10-21T00:00:00.000Z',end:'2026-10-22T00:00:00.000Z'};
const row=(sourceRecordId,amountMicros,extra={})=>({sourceRecordId,revision:1,amountMicros,chargeKind:'usage',finality:'final',usage:day,invoice:day,evidenceRef:'urn:synthetic:bill',...extra});
const batch=(records=[row('r1',100000)],extra={})=>({format:'palo-billing-export',schemaVersion:'1.0.0',source:'synthetic-export',account:'demo',contractVersion:'1',partition:'all',identity:'stable-id',mode:'delta',completeness:'complete',currency:'USD',costBasis:'billed',coverage:day,records,...extra});
const book=()=>b.createBillingBook(workspace(),{source:'synthetic-export',account:'demo',at});
const imported=async(records,extra)=>b.importBilling(book(),batch(records,extra),{id:'i1',at});
const link=(recordRef,attemptId='attempt-open',amountMicros=100000,extra={})=>({recordRef,attemptId,component:'total',amountMicros,measurementBasis:'measured',evidenceRef:'urn:synthetic:binding',...extra});

test('atomic import, repeat and reordering preserve one economic cost',async()=>{
 let x=await imported([row('a',60),row('b',40)]);
 x=await b.importBilling(x,batch([row('a',60),row('b',40)]),{id:'i2',at});
 assert.equal(b.replayBilling(x).runs[1].status,'reused');
 x=await b.importBilling(x,batch([row('b',40),row('a',60)]),{id:'i3',at});
 assert.equal(b.replayBilling(x).totalMicros,100);
 const frozen=JSON.stringify(x);
 await assert.rejects(()=>b.importBilling(x,batch([row('a',60),row('b',-9)]),{at}),/signs/);
 assert.equal(JSON.stringify(x),frozen);
});
test('partial, foreign currency and changed account are quarantined without erasing prior data',async()=>{
 for(const extra of [{completeness:'partial'},{currency:'EUR'},{account:'other'},{costBasis:'effective'}]){
  const x=await b.importBilling(await imported(),batch([row('new',77)],extra),{id:'i2',at});
  assert.equal(b.replayBilling(x).totalMicros,100000);assert.equal(b.replayBilling(x).unresolvedImports.length,1);
 }
});
test('overlap with new IDs is held; explicit distinct-event review preserves legitimate duplicates',async()=>{
 let x=await b.importBilling(await imported(),batch([row('new',100000)]),{id:'i2',at});
 assert.equal(b.replayBilling(x).records.length,1);assert.equal(b.replayBilling(x).unresolvedImports.length,1);
 x=await b.importBilling(x,batch([row('new',100000)],{overlapResolution:{decision:'distinct-events',reviewer:'owner',evidenceRef:'urn:two-real-events'}}),{id:'i3',at,resolves:['i2']});
 assert.equal(b.replayBilling(x).totalMicros,200000);assert.equal(b.replayBilling(x).unresolvedImports.length,0);
});
test('revision replaces, extra credit subtracts, links become inactive and history survives',async()=>{
 let x=await imported();x=b.linkBilling(x,workspace(),link('["r1",1]'),{id:'l1',at});
 x=await b.importBilling(x,batch([row('r1',80000,{revision:2,supersedes:'["r1",1]'})]),{id:'i2',at});
 assert.equal(b.replayBilling(x).totalMicros,80000);assert.equal(b.replayBilling(x).links.length,0);assert.equal(b.replayBilling(x).inactiveLinks.length,1);
 x=await b.importBilling(x,batch([row('credit',-1000,{chargeKind:'credit'})],{overlapResolution:{decision:'distinct-events',reviewer:'owner',evidenceRef:'credit-note'}}),{id:'i3',at});
 assert.equal(b.replayBilling(x).totalMicros,79000);assert.equal(b.replayBilling(x).history.length,3);
 await assert.rejects(()=>b.importBilling(x,batch([row('r1',75000,{revision:3})]),{id:'i4',at}),/supersede/);
});
test('exact-scope snapshots remove missing rows without deleting historical evidence',async()=>{
 let x=await imported([row('a',10),row('b',20)]);
 x=await b.importBilling(x,batch([row('a',10)],{mode:'snapshot'}),{id:'i2',at});
 assert.equal(b.replayBilling(x).totalMicros,10);assert.equal(b.replayBilling(x).history.length,2);
 await assert.rejects(()=>b.importBilling(x,batch([row('b',20)],{mode:'snapshot'}),{id:'i3',at}),/resurrect/);
});
test('all links share a single source ceiling; residual and reserve closure are distinct',async()=>{
 let x=await imported([row('r1',100)]);x=b.linkBilling(x,workspace(),link('["r1",1]','attempt-open',60),{id:'l1',at});
 x=b.linkBilling(x,workspace(),link('["r1",1]','attempt-code',30),{id:'l2',at});
 assert.equal(b.replayBilling(x).records[0].residualMicros,10);
 assert.throws(()=>b.linkBilling(x,workspace(),link('["r1",1]','attempt-check',100),{id:'l3',at}),/exceed/);
 assert.throws(()=>b.linkBilling(x,workspace(),link('["r1",1]','attempt-open',1),{id:'l4',at}),/Duplicate/);
 assert.equal(summarize(workspace()).unresolvedCount,1);
 x=b.unlinkBilling(x,'l1','review correction',{id:'u1',at});assert.equal(b.replayBilling(x).records[0].residualMicros,70);
});
test('shared pool cannot be invented as a request; signed deterministic allocation conserves every micro',async()=>{
 const x=await imported([row('pool',100000000,{chargeKind:'shared'})]);
 assert.throws(()=>b.linkBilling(x,workspace(),link('["pool",1]'),{at}),/Shared/);
 const weights=[{id:'C',weight:1},{id:'B',weight:1},{id:'A',weight:1}];
 assert.deepEqual(b.allocateMicros(100000000,weights).shares.map(x=>x.amountMicros),[33333334,33333333,33333333]);
 assert.deepEqual(b.allocateMicros(-1000000,weights).shares.map(x=>x.amountMicros),[-333334,-333333,-333333]);
 assert.equal(b.allocateMicros(100,[]).unallocatedMicros,100);
 assert.throws(()=>b.allocateMicros(10,[{id:'a',weight:1},{id:'a',weight:1}]),/Duplicate/);
});
test('settlement requires evidence review, measured final links and complete import state',async()=>{
 let x=await imported();x=b.linkBilling(x,workspace(),link('["r1",1]'),{id:'l1',at});
 const decision={attemptId:'attempt-open',linkIds:['l1'],owner:'reviewer',policyVersion:'1',evidenceRef:'urn:review',bindingReviewed:true,sourceReviewed:true,componentsComplete:true};
 await assert.rejects(()=>b.settleFromBilling(x,workspace(),{...decision,sourceReviewed:false},{at:later}),/Explicit/);
 const settled=await b.settleFromBilling(x,workspace(),decision,{at:later});
 assert.equal(summarize(settled.workspace).knownMicros,440000);assert.equal(summarize(settled.workspace).reservedMicros,0);
 assert.equal(settled.review.providerVerified,false);assert.equal(summarize(workspace()).reservedMicros,180000);
 const estimated=b.linkBilling(await imported([row('r1',100000,{finality:'estimated'})]),workspace(),link('["r1",1]'),{id:'l1',at});
 await assert.rejects(()=>b.settleFromBilling(estimated,workspace(),decision,{at:later}),/Estimated/);
});
test('allocation comparison freezes input revisions, drivers and one evaluation instant',async()=>{
 const x=await imported([row('pool',101,{chargeKind:'shared'})]);
 const rules=[{id:'pool',version:'1',priority:0,effectiveFrom:at,effectiveUntil:later,match:{},weights:[{id:'A',weight:3},{id:'B',weight:1}]}];
 const alternative=structuredClone(rules);alternative[0].weights.forEach(w=>w.weight=1);
 const comparison=b.allocationSensitivity(x,rules,alternative,{at});
 assert.deepEqual(comparison.baseline[0].shares.map(s=>s.amountMicros),[76,25]);
 assert.deepEqual(comparison.alternative[0].shares.map(s=>s.amountMicros),[51,50]);
 rules[0].weights[0].weight=0;x.operations.length=0;
 assert.deepEqual(b.allocateBilling(comparison.book,comparison.baselineRules,{at:comparison.at}),comparison.baseline);
 assert.equal(comparison.savingsDemonstrated,false);
});
test('liability aging escalates without releasing capacity',async()=>{
 let x=await imported();x=b.reviewLiability(x,workspace(),{attemptId:'attempt-open',owner:'reviewer',reason:'await billing',nextReviewAt:later},{at});
 const state=b.liabilityStatus(x,workspace(),{at:later});assert.equal(state[0].status,'escalation-due');assert.equal(state[0].reservationReleased,false);assert.equal(state[0].reservedMicros,180000);
});
test('frozen metric snapshots preserve accepted set, whole costs and old results after edits',async()=>{
 const w=workspace();let x=await imported([row('code',220000),row('check',50000),row('research',70000),row('open',100000),row('pool',30000,{chargeKind:'shared',dimensions:{pool:'shared'}}),row('credit',-3000,{chargeKind:'credit',allocationScope:'shared',dimensions:{pool:'shared'}})]);
 for(const [name,amount] of [['code',220000],['check',50000],['research',70000],['open',100000]]) x=b.linkBilling(x,w,link(JSON.stringify([name,1]),`attempt-${name}`,amount),{id:`l-${name}`,at});
 const {workspace:closed}=await b.settleFromBilling(x,w,{attemptId:'attempt-open',linkIds:['l-open'],owner:'reviewer',policyVersion:'1',evidenceRef:'review',sourceReviewed:true,bindingReviewed:true,componentsComplete:true},{at:later});
 closed.tasks.find(t=>t.id==='task-open').outcome='failed';
 const contract={id:'metric',version:'1',owner:'reviewer',partition:'all',acceptanceRule:'declared',outcomeSource:'workspace',window:day,timezone:'UTC',periodBasis:'usage',numeratorBasis:'billed',workloadIds:['engineering','research'],outcomeWindowConfirmed:true};
 const rules=[{id:'shared',version:'1',priority:0,effectiveFrom:at,effectiveUntil:'2027-01-01T00:00:00.000Z',match:{pool:'shared'},weights:[{id:'engineering',weight:1},{id:'research',weight:1}]}];
 const snap=await b.createPeriodSnapshot(x,closed,contract,rules,{id:'snap1',at:day.end});
 assert.deepEqual(snap.result.reasons,[]);assert.equal(snap.result.costPerAcceptedMicros,233500);assert.equal(snap.result.numeratorMicros,467000);assert.equal(await b.verifyPeriodSnapshot(snap),true);
 closed.tasks.find(t=>t.id==='task-code').outcome='failed';
 const changed=await b.createPeriodSnapshot(x,closed,contract,rules,{id:'snap2',at:day.end});assert.equal(changed.result.costPerAcceptedMicros,467000);assert.equal(snap.result.denominator,2);
 snap.outcomes[0].outcome='failed';await assert.rejects(()=>b.verifyPeriodSnapshot(snap),/digest/);
 const unknown=await b.createPeriodSnapshot(x,w,contract,rules,{at:day.end});assert.equal(unknown.result.costPerAcceptedMicros,null);
 const invoice=await b.createPeriodSnapshot(x,closed,{...contract,periodBasis:'invoice'},rules,{at:day.end});assert.equal(invoice.result.costPerAcceptedMicros,null);
});
test('digest edits and amount overflow fail closed',async()=>{
 const x=await imported();x.operations[0].batch.records[0].amountMicros=42;await assert.rejects(()=>b.assertBillingBook(x),/digest/);
 await assert.rejects(()=>imported([row('a',Number.MAX_SAFE_INTEGER),row('b',1)]),/overflow/);
});
