/** PALO FinOps billing 1.1.0. Local declarations, never provider authority. */
import { assertWorkspace, summarize, appendEvent } from './palo-finops-core.js';

export const BILLING_VERSION = '1.0.0';
const check = (ok, message) => { if (!ok) throw new Error(message); };
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const text = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 4096;
const stamp = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x;
const integer = x => Number.isSafeInteger(x);
const copy = x => structuredClone(x);
const sum = values => {
  const n = values.reduce((a, b) => a + BigInt(b), 0n);
  check(n <= BigInt(Number.MAX_SAFE_INTEGER) && n >= -BigInt(Number.MAX_SAFE_INTEGER), 'Amount overflow.');
  return Number(n);
};
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (object(value)) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  check(value !== undefined && (typeof value !== 'number' || Number.isFinite(value)), 'Non-JSON value.');
  return JSON.stringify(value);
}
export async function digest(value) {
  const bytes = new TextEncoder().encode(canonical(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
}
function interval(x) { check(object(x) && stamp(x.start) && stamp(x.end) && x.start < x.end, 'Invalid half-open UTC interval.'); }
const contains = (outer, inner) => outer.start <= inner.start && outer.end >= inner.end;
const overlaps = (a, b) => a.start < b.end && b.start < a.end;
const shared = row => row.chargeKind === 'shared' || (row.chargeKind === 'credit' && row.allocationScope === 'shared');
export const recordRef = row => JSON.stringify([row.sourceRecordId, row.revision]);

export function createBillingBook(workspace, { source, account, costBasis = 'billed', at = new Date().toISOString() }) {
  assertWorkspace(workspace);
  const book = { format: 'palo-finops-billing', schemaVersion: BILLING_VERSION, workspaceId: workspace.workspaceId, currency: workspace.currency, source, account, costBasis, createdAt: at, operations: [] };
  replayBilling(book);
  return book;
}

function validateBatch(batch) {
  check(object(batch) && batch.format === 'palo-billing-export' && batch.schemaVersion === BILLING_VERSION, 'Unsupported billing export.');
  for (const field of ['source', 'account', 'contractVersion', 'partition']) check(text(batch[field]), `Missing ${field}.`);
  check(batch.identity === 'stable-id' && ['delta', 'snapshot'].includes(batch.mode), 'Declare stable IDs and delta or snapshot mode.');
  check(['complete', 'partial'].includes(batch.completeness), 'Declare coverage completeness.');
  check(/^[A-Z]{3}$/.test(batch.currency) && ['billed', 'effective'].includes(batch.costBasis), 'Invalid currency or cost basis.');
  interval(batch.coverage);
  check(Array.isArray(batch.records) && batch.records.length <= 10000, 'Records must be an array with at most 10000 rows.');
  const ids = new Set();
  for (const row of batch.records) {
    check(object(row) && text(row.sourceRecordId) && integer(row.revision) && row.revision > 0, 'Invalid record identity.');
    check(!ids.has(row.sourceRecordId), 'Duplicate source ID within export.'); ids.add(row.sourceRecordId);
    check(integer(row.amountMicros) && ['usage', 'shared', 'credit'].includes(row.chargeKind), 'Invalid signed amount or charge kind.');
    check(row.chargeKind === 'credit' ? row.amountMicros <= 0 : row.amountMicros >= 0, 'Credit and expense signs disagree.');
    check(row.allocationScope === undefined || ['attempt','shared'].includes(row.allocationScope), 'Invalid allocation scope.');
    check(['final', 'estimated'].includes(row.finality) && text(row.evidenceRef), 'Finality and evidence reference are required.');
    interval(row.usage); interval(row.invoice);
    check(contains(batch.coverage, row.usage), 'Record usage is outside the import coverage.');
    check(row.supersedes === undefined || text(row.supersedes), 'Invalid revision reference.');
    check(row.dimensions === undefined || (object(row.dimensions) && Object.keys(row.dimensions).length <= 20 && Object.entries(row.dimensions).every(([k,v]) => text(k) && text(v))), 'Invalid dimensions.');
  }
  if (batch.overlapResolution !== undefined) {
    check(batch.overlapResolution?.decision === 'distinct-events' && text(batch.overlapResolution.reviewer) && text(batch.overlapResolution.evidenceRef), 'Overlap resolution requires a reviewer and evidence.');
  }
}

/** Replay validates structure, revisions, conservation and operation order, without trusting labels. */
export function replayBilling(book) {
  check(object(book) && book.format === 'palo-finops-billing' && book.schemaVersion === BILLING_VERSION, 'Unsupported billing book.');
  for (const field of ['workspaceId','source','account']) check(text(book[field]), `Missing book ${field}.`);
  check(/^[A-Z]{3}$/.test(book.currency) && ['billed','effective'].includes(book.costBasis) && stamp(book.createdAt), 'Invalid book scope.');
  check(Array.isArray(book.operations) && book.operations.length <= 2000, 'Too many billing operations.');
  const history = new Map(), active = new Map(), links = new Map(), reviews = new Map(), runs = [], ids = new Set();
  let previousAt = book.createdAt;
  for (const op of book.operations) {
    check(object(op) && text(op.id) && !ids.has(op.id) && stamp(op.at) && op.at >= previousAt, 'Invalid operation ID or timestamp order.');
    ids.add(op.id); previousAt = op.at;
    if (op.type === 'import') {
      validateBatch(op.batch);
      check(typeof op.digest === 'string' && /^[a-f0-9]{64}$/.test(op.digest), 'Missing import digest.');
      const b = op.batch;
      const run = { id: op.id, at: op.at, digest: op.digest, coverage: b.coverage, partition: b.partition, status: 'accepted', reason: '', rowCount: b.records.length, resolvedBy: null };
      const accepted = runs.filter(x => x.status === 'accepted');
      const previous = accepted.filter(x => x.partition === b.partition && overlaps(x.coverage, b.coverage));
      const scopeMismatch = b.source !== book.source || b.account !== book.account || b.currency !== book.currency || b.costBasis !== book.costBasis;
      if (scopeMismatch || b.completeness !== 'complete') {
        run.status = 'quarantined'; run.reason = scopeMismatch ? 'Source, account, currency or cost basis differs from this book.' : 'Partial import; previous valid records preserved.';
      } else if (runs.some(x => ['accepted','reused'].includes(x.status) && x.digest === op.digest)) {
        run.status = 'reused'; run.reason = 'Identical parsed export already imported.';
      } else {
        const ambiguous = previous.some(p => b.records.some(r => !history.has(recordRef(r)) && !active.has(r.sourceRecordId) && overlaps(r.usage, p.coverage)));
        const snapshotOverlap = b.mode === 'snapshot' && previous.some(p => canonical(p.coverage) !== canonical(b.coverage));
        if (snapshotOverlap || (ambiguous && b.mode === 'delta' && !b.overlapResolution)) {
          run.status = 'quarantined'; run.reason = 'Ambiguous overlap. Use exact-scope snapshot or documented distinct-event resolution.';
        } else {
          // Stage every revision before updating any active record.
          const staged = [];
          for (const row of b.records) {
            const ref = recordRef(row), prior = active.get(row.sourceRecordId), historical = history.get(ref);
            const enriched = { ...copy(row), ref, partition: b.partition, contractVersion: b.contractVersion };
            if (historical) {
              check(canonical(historical) === canonical(enriched), 'Conflicting bytes for the same economic revision.');
              check(prior?.ref === ref, 'Cannot roll back or resurrect a removed revision.');
            } else if (prior) {
              check(row.revision > prior.revision && row.supersedes === prior.ref && b.partition === prior.partition, 'Revision must explicitly supersede the active record in its partition.');
            } else {
              check(![...history.values()].some(x => x.sourceRecordId === row.sourceRecordId), 'Removed record needs a new source ID, not resurrection.');
              check(row.revision === 1 && row.supersedes === undefined, 'First record revision must be 1.');
            }
            staged.push(enriched);
          }
          if (b.mode === 'snapshot') {
            for (const [id, row] of active) if (row.partition === b.partition && contains(b.coverage,row.usage)) active.delete(id);
          }
          for (const row of staged) { history.set(row.ref,row); active.set(row.sourceRecordId,row); }
        }
      }
      check(op.resolves === undefined || (Array.isArray(op.resolves) && new Set(op.resolves).size === op.resolves.length), 'Invalid resolved imports.');
      for (const id of op.resolves ?? []) {
        const prior = runs.find(x => x.id === id);
        check(['accepted','reused'].includes(run.status) && prior?.status === 'quarantined' && !prior.resolvedBy && b.partition === prior.partition && contains(b.coverage,prior.coverage), 'Resolution needs an accepted covering import in the same partition.');
        prior.resolvedBy = op.id;
      }
      runs.push(run);
    } else if (op.type === 'link') {
      const l = op.link, row = [...active.values()].find(x => x.ref === l?.recordRef);
      check(row && text(l.attemptId) && text(l.component) && text(l.evidenceRef), 'Link must reference an active record, attempt, component and evidence.');
      check(!shared(row), 'Shared costs are allocated to workloads, not invented as attempts.');
      check(integer(l.amountMicros) && Math.sign(l.amountMicros) === Math.sign(row.amountMicros), 'Link sign must match the record.');
      check(['measured','estimated'].includes(l.measurementBasis), 'Declare the link measurement basis.');
      const key = canonical([l.recordRef,l.attemptId,l.component]);
      check(!links.has(key), 'Duplicate active link. Remove it before replacement.');
      const used = sum([...links.values()].filter(x => x.recordRef === row.ref).map(x => x.amountMicros));
      check(BigInt(Math.abs(used)) + BigInt(Math.abs(l.amountMicros)) <= BigInt(Math.abs(row.amountMicros)), 'Links exceed the source amount.');
      links.set(key,{...copy(l),id:op.id});
    } else if (op.type === 'unlink') {
      check(text(op.linkId) && text(op.reason), 'Unlink requires a reason.');
      const pair = [...links].find(([,x]) => x.id === op.linkId); check(pair, 'Unknown active link.'); links.delete(pair[0]);
    } else if (op.type === 'review') {
      const r = op.review;
      check(object(r) && text(r.attemptId) && text(r.owner) && text(r.reason) && stamp(r.nextReviewAt) && r.nextReviewAt > op.at, 'Review needs owner, reason and a future review date.');
      reviews.set(r.attemptId,{...copy(r),at:op.at});
    } else { throw new Error('Unknown billing operation.'); }
  }
  const records = [...active.values()];
  const activeRefs = new Set(records.map(x => x.ref));
  const activeLinks = [...links.values()].filter(l => activeRefs.has(l.recordRef));
  const coverage = records.map(row => {
    const linkedMicros = sum(activeLinks.filter(l => l.recordRef === row.ref).map(l => l.amountMicros));
    return {...row,linkedMicros,residualMicros:sum([row.amountMicros,-linkedMicros])};
  });
  return {records:coverage,history:[...history.values()],links:activeLinks,linkedMicros:sum(activeLinks.map(x=>x.amountMicros)),inactiveLinks:[...links.values()].filter(l => !activeRefs.has(l.recordRef)),reviews:[...reviews.values()],runs,totalMicros:sum(records.map(x => x.amountMicros)),unresolvedImports:runs.filter(x => x.status === 'quarantined' && !x.resolvedBy)};
}

export async function assertBillingBook(book) {
  replayBilling(book);
  for (const op of book.operations) if (op.type === 'import') check(await digest(op.batch) === op.digest, 'Import content digest mismatch.');
  return book;
}
function append(book, op) {
  replayBilling(book);
  const candidate = copy(book); candidate.operations.push(copy(op)); replayBilling(candidate); return candidate;
}
export async function importBilling(book, batch, { id = crypto.randomUUID(), at = new Date().toISOString(), resolves = [] } = {}) {
  await assertBillingBook(book); validateBatch(batch);
  return append(book,{id,at,type:'import',batch:copy(batch),digest:await digest(batch),resolves});
}
export function linkBilling(book, workspace, link, { id = crypto.randomUUID(), at = new Date().toISOString() } = {}) {
  bindWorkspace(book,workspace);
  check(summarize(workspace).attempts.some(a => a.attemptId === link.attemptId), 'Unknown attempt in bound workspace.');
  const row=replayBilling(book).records.find(r=>r.ref===link.recordRef);
  const reservedAt=workspace.events.find(e=>e.type==='reserve'&&e.attemptId===link.attemptId).at;
  check(row && reservedAt>=row.usage.start && reservedAt<row.usage.end, 'Attempt is outside the source usage interval.');
  return append(book,{id,at,type:'link',link});
}
export function unlinkBilling(book, linkId, reason, { id = crypto.randomUUID(), at = new Date().toISOString() } = {}) { return append(book,{id,at,type:'unlink',linkId,reason}); }
export function reviewLiability(book, workspace, review, { id = crypto.randomUUID(), at = new Date().toISOString() } = {}) {
  bindWorkspace(book,workspace);
  check(summarize(workspace).attempts.some(a => a.attemptId === review.attemptId && a.actualMicros === null), 'Only unresolved attempts can be reviewed.');
  return append(book,{id,at,type:'review',review});
}
function bindWorkspace(book,workspace) {
  assertWorkspace(workspace); replayBilling(book);
  check(book.workspaceId === workspace.workspaceId && book.currency === workspace.currency, 'Billing book and workspace scope mismatch.');
}
export function liabilityStatus(book,workspace,{at = new Date().toISOString()} = {}) {
  bindWorkspace(book,workspace); check(stamp(at),'Invalid as-of.');
  const {reviews} = replayBilling(book);
  return summarize(workspace).attempts.filter(a => a.actualMicros === null).map(a => {
    const review = reviews.find(r => r.attemptId === a.attemptId);
    const openedAt = workspace.events.find(e => e.type === 'reserve' && e.attemptId === a.attemptId).at;
    return {attemptId:a.attemptId,reservedMicros:a.reservedMicros,openedAt,ageMs:Math.max(0,Date.parse(at)-Date.parse(openedAt)),review:review??null,status:!review?'needs-owner':at>=review.nextReviewAt?'escalation-due':'scheduled',reservationReleased:false};
  });
}

/** Explicit local review; no signature/provider authentication is implied by this decision. */
export async function settleFromBilling(book,workspace,decision,{at = new Date().toISOString(),id = crypto.randomUUID()} = {}) {
  await assertBillingBook(book); bindWorkspace(book,workspace); check(stamp(at),'Invalid settlement time.');
  check(book.createdAt<=at&&book.operations.every(op=>op.at<=at),'Settlement cannot use future billing evidence.');
  check(book.costBasis==='billed','Only billed amounts can settle operational reservations.');
  const state = replayBilling(book), attempt = summarize(workspace).attempts.find(a => a.attemptId === decision?.attemptId);
  check(attempt?.actualMicros === null,'Attempt must be unresolved.');
  check(text(decision.owner) && text(decision.evidenceRef) && text(decision.policyVersion) && decision.bindingReviewed === true && decision.sourceReviewed === true && decision.componentsComplete === true, 'Explicit source, binding and component review is required.');
  check(Array.isArray(decision.linkIds) && decision.linkIds.length > 0 && new Set(decision.linkIds).size === decision.linkIds.length,'Select distinct reconciliation links.');
  const links = decision.linkIds.map(id => state.links.find(l => l.id === id));
  check(links.every(l => l && l.attemptId === attempt.attemptId && l.measurementBasis === 'measured'),'Every selected link must be active, measured and bound to this attempt.');
  check(state.links.filter(l=>l.attemptId===attempt.attemptId).every(l=>decision.linkIds.includes(l.id)),'Review all active components of the attempt.');
  check(links.every(l => state.records.find(r=>r.ref===l.recordRef).finality === 'final'),'Estimated records cannot release reserves.');
  check(state.unresolvedImports.length === 0,'Unresolved imports prevent settlement from this book.');
  const amountMicros = sum(links.map(l=>l.amountMicros)); check(amountMicros>=0,'Net negative cost cannot settle the nonnegative operational ledger.');
  const proof = {format:'palo-finops-settlement-review',book:copy(book),workspace:copy(workspace),decision:copy(decision),at,amountMicros,providerVerified:false};
  const proofDigest = await digest(proof);
  const event = {id,type:attempt.status==='reserved'?'settle':'reconcile',at,attemptId:attempt.attemptId,costMicros:amountMicros,evidenceRef:`sha256:${proofDigest}`,source:'manual'};
  return {workspace:appendEvent(workspace,event),review:{...proof,digest:proofDigest},executionAuthorized:false,enforcementPerformed:false};
}

export function allocateMicros(amountMicros,weights) {
  check(integer(amountMicros) && Array.isArray(weights) && weights.every(x=>text(x.id)&&integer(x.weight)&&x.weight>=0),'Invalid allocation weights.');
  check(new Set(weights.map(x=>x.id)).size===weights.length,'Duplicate allocation destination.');
  const total = weights.reduce((n,x)=>n+BigInt(x.weight),0n);
  if (!total) return {shares:[],unallocatedMicros:amountMicros};
  const absolute=BigInt(Math.abs(amountMicros)), sign=amountMicros<0?-1:1;
  const parts=weights.map(x=>({id:x.id,units:absolute*BigInt(x.weight)/total,remainder:absolute*BigInt(x.weight)%total}));
  let rest=absolute-parts.reduce((n,x)=>n+x.units,0n);
  parts.sort((a,b)=>a.remainder===b.remainder?(a.id<b.id?-1:a.id>b.id?1:0):a.remainder>b.remainder?-1:1);
  for(const part of parts) if(rest>0n){part.units++;rest--;}
  return {shares:parts.sort((a,b)=>a.id<b.id?-1:1).map(x=>({destination:x.id,amountMicros:Number(x.units)*sign})),unallocatedMicros:0};
}
export function allocateBilling(book,rules,{at = new Date().toISOString()} = {}) {
  const state=replayBilling(book); check(stamp(at)&&Array.isArray(rules)&&rules.length<=100,'Invalid allocation rules.');
  const ids=new Set();
  for(const r of rules){
    check(text(r.id)&&text(r.version)&&!ids.has(r.id)&&integer(r.priority)&&stamp(r.effectiveFrom)&&stamp(r.effectiveUntil)&&r.effectiveFrom<r.effectiveUntil,'Invalid rule identity or effective dates.'); ids.add(r.id);
    check(object(r.match)&&Object.keys(r.match).length<=20&&Object.entries(r.match).every(([k,v])=>text(k)&&text(v)),'Rules require exact dimension predicates.');
    allocateMicros(0,r.weights);
  }
  const ordered=[...rules].sort((a,b)=>a.priority-b.priority||(a.id<b.id?-1:1));
  return state.records.map(row=>{
    const rule=ordered.find(r=>r.effectiveFrom<=at&&at<r.effectiveUntil&&Object.entries(r.match).every(([k,v])=>row.dimensions?.[k]===v));
    const allocation=allocateMicros(row.amountMicros,rule?.weights??[]);
    return {recordRef:row.ref,amountMicros:row.amountMicros,ruleId:rule?.id??null,ruleVersion:rule?.version??null,...allocation};
  });
}
export function allocationSensitivity(book,rules,alternative,{at=new Date().toISOString()}={}) {
  // Both projections use the same instant and retain their inputs for later replay.
  const frozenBook=copy(book), baselineRules=copy(rules), alternativeRules=copy(alternative);
  return {
    format:'palo-finops-allocation-sensitivity',schemaVersion:BILLING_VERSION,at,
    book:frozenBook,baselineRules,alternativeRules,
    baseline:allocateBilling(frozenBook,baselineRules,{at}),
    alternative:allocateBilling(frozenBook,alternativeRules,{at}),
    savingsDemonstrated:false
  };
}

function coverageComplete(runs,window,partition){
  const intervals=runs.filter(r=>r.status==='accepted'&&r.partition===partition).map(r=>r.coverage).sort((a,b)=>a.start<b.start?-1:1);
  let cursor=window.start;
  for(const i of intervals){if(i.start>cursor)break;if(i.end>cursor)cursor=i.end;}
  return cursor>=window.end;
}
export async function createPeriodSnapshot(book,workspace,contract,rules=[],{id=crypto.randomUUID(),at=new Date().toISOString()}={}) {
  await assertBillingBook(book); bindWorkspace(book,workspace); check(stamp(at)&&text(id),'Invalid snapshot identity.');
  check(object(contract)&&text(contract.id)&&text(contract.version)&&text(contract.owner)&&text(contract.partition)&&text(contract.acceptanceRule)&&text(contract.outcomeSource),'Incomplete metric contract.');
  interval(contract.window);
  check(contract.timezone==='UTC'&&['usage','invoice'].includes(contract.periodBasis)&&contract.numeratorBasis===book.costBasis,'Unsupported metric basis.');
  check(Array.isArray(contract.workloadIds)&&contract.workloadIds.length>0&&new Set(contract.workloadIds).size===contract.workloadIds.length&&contract.workloadIds.every(id=>workspace.workloads.some(w=>w.id===id)),'Select existing, distinct workload IDs.');
  check(contract.outcomeWindowConfirmed===true,'Confirm that outcome scope and time window match the cost cohort.');
  check(book.createdAt<=at&&book.operations.every(op=>op.at<=at)&&workspace.events.every(e=>e.at<=at)&&workspace.createdAt<=at,'Snapshot cannot include records from after its as-of time.');
  const state=replayBilling(book), summary=summarize(workspace), allocated=allocateBilling(book,rules,{at});
  const reasons=[];
  if(contract.window.end>at)reasons.push('Metric window is still open at snapshot time.');
  // Billing invoice completeness cannot be inferred from a usage-coverage declaration.
  if(contract.periodBasis==='invoice')reasons.push('Import coverage is by usage; invoice-period completeness is not independently established.');
  if(!coverageComplete(state.runs,contract.window,contract.partition))reasons.push('Import coverage does not cover the entire metric window.');
  if(state.unresolvedImports.length)reasons.push('Quarantined imports remain unresolved.');
  const selected=[];
  for(const row of state.records.filter(r=>r.partition===contract.partition&&overlaps(r[contract.periodBasis],contract.window))){
    if(!contains(contract.window,row[contract.periodBasis]))reasons.push(`Boundary-spanning row ${row.sourceRecordId} needs an explicit periodization.`);
    if(row.finality!=='final')reasons.push(`Estimated row ${row.sourceRecordId}.`);
    selected.push(row);
  }
  const cohort=summary.attempts.filter(a=>{
    const reservedAt=workspace.events.find(e=>e.type==='reserve'&&e.attemptId===a.attemptId).at;
    return contract.workloadIds.includes(a.workloadId)&&reservedAt>=contract.window.start&&reservedAt<contract.window.end;
  });
  const taskIds=new Set(cohort.map(a=>a.taskId));
  const outcomes=workspace.tasks.filter(t=>taskIds.has(t.id)).map(t=>copy(t));
  const accepted=outcomes.filter(t=>t.outcome==='accepted').map(t=>t.id);
  const pending=outcomes.filter(t=>t.outcome==='pending');
  if(pending.length)reasons.push('Pending task outcomes in this cohort.');
  let numerator=0;
  for(const row of selected){
    if(shared(row)){
      const allocation=allocated.find(a=>a.recordRef===row.ref);
      if(allocation.unallocatedMicros!==0)reasons.push(`Unallocated shared row ${row.sourceRecordId}.`);
      check(allocation.shares.every(s=>workspace.workloads.some(w=>w.id===s.destination)),'Allocation refers to an unknown workload.');
      numerator=sum([numerator,...allocation.shares.filter(s=>contract.workloadIds.includes(s.destination)).map(s=>s.amountMicros)]);
    }else{
      if(row.residualMicros!==0)reasons.push(`Unlinked residual on ${row.sourceRecordId}.`);
      const links=state.links.filter(l=>l.recordRef===row.ref);
      for(const l of links){
        const attempt=summary.attempts.find(a=>a.attemptId===l.attemptId);
        if(!attempt)reasons.push(`Missing attempt ${l.attemptId}.`);
        else if(contract.workloadIds.includes(attempt.workloadId)){
          if(!cohort.some(a=>a.attemptId===l.attemptId))reasons.push(`Cost/outcome window mismatch for ${l.attemptId}.`);
          numerator=sum([numerator,l.amountMicros]);
          if(l.measurementBasis!=='measured')reasons.push(`Estimated link ${l.id}.`);
        }
      }
    }
  }
  for(const a of cohort){
    const links=state.links.filter(l=>l.attemptId===a.attemptId&&selected.some(r=>r.ref===l.recordRef));
    if(a.actualMicros===null||links.length===0)reasons.push(`Incomplete attempt ${a.attemptId}.`);
    else if(sum(links.map(l=>l.amountMicros))!==a.actualMicros)reasons.push(`Billing/ledger difference for ${a.attemptId}.`);
  }
  if(accepted.length===0)reasons.push('No accepted attempted tasks in scope.');
  const result={currency:book.currency,numeratorMicros:numerator,acceptedTaskIds:accepted,denominator:accepted.length,costPerAcceptedMicros:reasons.length?null:numerator/accepted.length,status:reasons.length?'unavailable':'complete_declared',reasons:[...new Set(reasons)],sourceTotalMicros:sum(selected.map(r=>r.amountMicros)),reservationsIncludedInCost:false,realizedSavingsDemonstrated:false};
  const payload={format:'palo-finops-period-snapshot',schemaVersion:BILLING_VERSION,id,at,contract:copy(contract),book:copy(book),workspace:copy(workspace),rules:copy(rules),allocations:allocated,outcomes,result,providerVerified:false,executionAuthorized:false};
  return {...payload,digest:await digest(payload)};
}
export async function verifyPeriodSnapshot(snapshot){
  check(object(snapshot)&&snapshot.format==='palo-finops-period-snapshot','Invalid period snapshot.');
  const {digest:expected,...payload}=snapshot; check(await digest(payload)===expected,'Snapshot digest mismatch.');
  const replay=await createPeriodSnapshot(snapshot.book,snapshot.workspace,snapshot.contract,snapshot.rules,{id:snapshot.id,at:snapshot.at});
  check(canonical(replay)===canonical(snapshot),'Snapshot computation mismatch.'); return true;
}
