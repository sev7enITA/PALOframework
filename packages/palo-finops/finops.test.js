import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { parseMoney, formatMoney, priceUsage, createWorkspace, validateWorkspace, assertWorkspace, appendEvent, summarize, evaluateTransition, createTransitionAssessment, buildReport, createCaseAttachment } from './index.js';
import { FinOpsLedger } from './ledger.js';

const demo = JSON.parse(readFileSync(new URL('../../data/finops-demo.json', import.meta.url)));
const request = JSON.parse(readFileSync(new URL('../../data/finops-transition-demo.json', import.meta.url)));
const clone = x => structuredClone(x);
const at = request.requestedAt;
const fresh = () => ({ ...clone(demo), events: [], budgetMicros: 200000, workloads: demo.workloads.map(x => ({ ...x, budgetMicros: 200000 })) });
const reserve = (id = 'r1', amount = 120000) => ({ id, type: 'reserve', at, attemptId: id, taskId: 'task-code', workloadId: 'engineering', routeId: 'efficient', rateCardId: 'efficient-v1', reservedMicros: amount, estimatedMicros: 60000, source: 'manual' });
const settle = (id = 'r1', costMicros = 50000) => ({ id: `${id}-settle`, type: 'settle', at, attemptId: id, costMicros, evidenceRef: 'declared invoice row', source: 'manual' });
const mutate = fn => { const w = clone(demo); fn(w); return w; };

test('money parsing is exact, bounded and rejects ambiguous values', () => {
  assert.equal(parseMoney('0.000001'), 1); assert.equal(parseMoney('123.123456'), 123123456);
  assert.equal(parseMoney('9007199254.740991'), Number.MAX_SAFE_INTEGER);
  for (const x of ['-1','1e3','1,200','01','0.0000001','NaN','Infinity','9007199254.740992','']) assert.throws(() => parseMoney(x));
});
test('money display preserves the last micro at the supported limit and negative subunit values', () => {
  assert.equal(formatMoney(Number.MAX_SAFE_INTEGER, 'USD'), '$9,007,199,254.740991');
  assert.equal(formatMoney(-1, 'USD'), '-$0.000001');
  assert.equal(formatMoney(1000000, 'EUR'), '€1.00');
});
test('token prices round each disjoint category up once with BigInt intermediates', () => {
  const usage = { inputTokens: 1, cacheWrite5mTokens: 1, cacheWrite1hTokens: 1, cacheReadTokens: 1, outputTokens: 1 };
  const priced = priceUsage(demo.rateCards[1], usage);
  assert.equal(priced.totalMicros, 11);
  assert.throws(() => priceUsage(demo.rateCards[1], { ...usage, cachedTokens: 1 }), /Unknown token/);
  assert.throws(() => priceUsage({ rates: Object.fromEntries(Object.keys(demo.rateCards[0].rates).map(x => [x, Number.MAX_SAFE_INTEGER])) }, { ...usage, inputTokens: Number.MAX_SAFE_INTEGER }), /range/);
});
test('empty workspace has no fake completion rate or cost per accepted task', () => {
  const s = summarize(createWorkspace({ at }));
  assert.equal(s.knownMicros, 0); assert.equal(s.completionRate, null); assert.equal(s.costPerAcceptedMicros, null);
});
test('synthetic example accounts for failed attempts, ancillary cost and unknown final cost', () => {
  const s = summarize(demo);
  assert.equal(s.knownMicros, 340000); assert.equal(s.reservedMicros, 180000); assert.equal(s.committedMicros, 520000);
  assert.equal(s.remainingMicros, 980000); assert.equal(s.acceptedTasks, 2); assert.equal(s.attemptedTasks, 4); assert.equal(s.completionRate, .5);
  assert.equal(s.costPerAcceptedMicros, null); assert.equal(s.complete, false);
  assert.equal(s.byCategory.reduce((n, x) => n + x.amountMicros, 0), s.knownMicros);
});
test('unknown settlement retains reservation, reconciliation releases only the difference', () => {
  let w = appendEvent(fresh(), reserve());
  w = appendEvent(w, settle('r1', null));
  assert.equal(summarize(w).reservedMicros, 120000);
  w = appendEvent(w, { ...settle(), id: 'reconciliation', type: 'reconcile' });
  assert.equal(summarize(w).knownMicros, 50000); assert.equal(summarize(w).reservedMicros, 0);
  assert.throws(() => appendEvent(w, { ...settle(), id: 'again', type: 'reconcile' }), /illegal/);
});
test('immutable append rejects duplicate events, orphan settlements and overbooking', () => {
  const original = fresh(); const w = appendEvent(original, reserve());
  assert.equal(original.events.length, 0);
  assert.throws(() => appendEvent(w, reserve()), /duplicate/);
  assert.throws(() => appendEvent(original, settle()), /illegal/);
  assert.throws(() => appendEvent(w, reserve('r2')), /insufficient/);
  assert.throws(() => appendEvent(w, { ...settle(), at: '2026-10-20T09:00:00.000Z' }), /monotonic/);
});
test('actual overruns are retained and valid imported breaches remain reportable', () => {
  const w = appendEvent(appendEvent(fresh(), reserve()), settle('r1', 250000));
  const s = summarize(w); assert.equal(s.remainingMicros, -50000);
  assert.ok(s.findings.some(f => f.code === 'workspace-budget-breach'));
  assert.ok(s.findings.some(f => f.code === 'reservation-overrun'));
  assert.equal(validateWorkspace(w).valid, true);
  assert.throws(() => appendEvent(w, reserve('r2', 60000)), /insufficient/);
});
test('budgets are independently constrained at workload and workspace levels', () => {
  const w = fresh(); w.workloads[0].budgetMicros = 100000;
  assert.throws(() => appendEvent(w, reserve()), /insufficient/);
});
test('validation rejects wrong references, stale rates, mixed currency and overlapping cards', () => {
  for (const w of [
    mutate(w => w.rateCards[0].currency = 'EUR'),
    mutate(w => w.events[0].workloadId = 'research'),
    mutate(w => w.rateCards[0].validUntil = '2026-10-20T00:00:00.000Z'),
    mutate(w => w.rateCards.push({ ...w.rateCards[0], id: 'duplicate-period' })),
    mutate(w => w.routes[0].endpointHost = 'https://user:password@example.com'),
    mutate(w => w.policy.allowedRouteIds.push('unknown-route')),
    mutate(w => w.createdAt = '2026-02-30T00:00:00.000Z')
  ]) assert.equal(validateWorkspace(w).valid, false);
});
test('usage settlement total must match rates and ancillary costs', () => {
  assert.equal(validateWorkspace(mutate(w => w.events[1].costMicros++)).valid, false);
  assert.equal(validateWorkspace(mutate(w => w.events[7].usage = w.events[1].usage)).valid, false);
  const charged = appendEvent(appendEvent(fresh(), reserve()), { ...settle(), charges: [{ category: 'tools', amountMicros: 20000 }] });
  assert.deepEqual(summarize(charged).byCategory, [{ category: 'tools', amountMicros: 20000 }, { category: 'unallocated', amountMicros: 30000 }]);
});
test('invalid imports never mutate original and preserve unknown extension fields', () => {
  const w = fresh(); w.extension = { custom: true };
  const added = appendEvent(w, reserve()); assert.deepEqual(added.extension, w.extension);
  assert.equal(w.events.length, 0); assert.throws(() => assertWorkspace({}));
  assert.equal(validateWorkspace(null).valid, false);
});
test('cost per accepted task counts all attempts and excludes unattempted accepted declarations', () => {
  let w = fresh(); w.tasks.push({ id: 'unattempted', workloadId: 'engineering', label: 'Declared only', outcome: 'accepted' });
  w = appendEvent(w, reserve()); w = appendEvent(w, settle());
  w = appendEvent(w, reserve('retry', 100000)); w = appendEvent(w, settle('retry', 70000));
  const s = summarize(w); assert.equal(s.acceptedTasks, 1); assert.equal(s.attemptedTasks, 1); assert.equal(s.costPerAcceptedMicros, 120000);
});
test('transition passes declared conditions but cannot authorize execution or reserve money', () => {
  const result = evaluateTransition(demo, request, { at });
  assert.equal(result.recommendation, 'would-proceed'); assert.equal(result.deltaMicros, 90000);
  assert.equal(result.executionAuthorized, false); assert.equal(result.enforcementPerformed, false);
  assert.equal(demo.events.length, 8);
});
test('transition evidence snapshots include exact inputs and can be replayed at the recorded instant', () => {
  const evidence = createTransitionAssessment(demo, request, { at });
  assert.deepEqual(evaluateTransition(evidence.workspaceSnapshot, evidence.request, { at: evidence.recordedAt }), evidence.result);
  evidence.workspaceSnapshot.policy.revision = 'changed'; evidence.request.switchMicros = 0;
  assert.equal(demo.policy.revision, '1'); assert.equal(request.switchMicros, 60000);
  assert.equal(evidence.result.executionAuthorized, false);
});
test('transition fails closed for stale identity, tuple, contract, rate, timestamp and budget', () => {
  for (const patch of [{ policyRevision: '2' }, { toRouteId: 'rogue' }, { toolSchemaDigest: `sha256:${'c'.repeat(64)}` }, { disclosureContractRef: 'other' }, { workloadId: 'research' }, { requestedAt: '2026-10-21T08:00:00.000Z' }, { worstCaseMicros: 600000 }, { worstCaseMicros: 30000 }, { switchMicros: NaN }, { unresolvedEffects: undefined }]) {
    assert.equal(evaluateTransition(demo, { ...request, ...patch }, { at }).recommendation, 'would-deny', JSON.stringify(patch));
  }
  assert.equal(evaluateTransition(demo, request, { at: '2027-01-01T00:00:00.000Z' }).recommendation, 'would-deny');
});
test('unknown cache is distinct from unresolved effects and uncertain economic advantage', () => {
  assert.equal(evaluateTransition(demo, { ...request, unresolvedEffects: true }, { at }).recommendation, 'would-hold');
  assert.equal(evaluateTransition(demo, { ...request, qualityEvidenceRef: '' }, { at }).recommendation, 'would-hold');
  assert.equal(evaluateTransition(demo, { ...request, stayMicros: 70000 }, { at }).recommendation, 'would-hold');
  const quality = evaluateTransition(demo, { ...request, stayMicros: 10000, reason: 'quality' }, { at });
  assert.equal(quality.recommendation, 'would-proceed'); assert.equal(quality.economicallyPreferred, false);
});
test('reports and Case File snapshots preserve provenance and do not link injected Markdown', () => {
  const w = mutate(w => w.label = '[payload](https://example.invalid) | <script>');
  const report = buildReport(w, { at }); assert.ok(report.includes('Unknown; reservation retained'));
  assert.ok(!report.includes('[payload](')); assert.ok(!report.includes('<script>'));
  const a = createCaseAttachment(w, { at }); const b = createCaseAttachment(w, { at });
  assert.notEqual(a.assessmentId, b.assessmentId); assert.equal(a.module, 'finops'); assert.equal(a.data.evidenceStatus, 'draft');
  a.data.snapshot.label = 'changed'; assert.notEqual(w.label, 'changed');
});
test('SQLite ledger persists, is append-only through SQL and refuses overwrite or missing path', () => {
  const dir = mkdtempSync(join(tmpdir(), 'palo-finops-test-')); const path = join(dir, 'ledger.sqlite');
  try {
    assert.throws(() => new FinOpsLedger(path)); assert.equal(existsSync(path), false);
    const ledger = new FinOpsLedger(path, { initialize: fresh() }); ledger.append(reserve()); ledger.close();
    assert.throws(() => new FinOpsLedger(path, { initialize: fresh() }), /EEXIST/);
    const reopened = new FinOpsLedger(path); assert.equal(summarize(reopened.snapshot()).reservedMicros, 120000);
    assert.throws(() => reopened.append(reserve('r2')), /insufficient/); reopened.close();
    const db = new DatabaseSync(path); assert.throws(() => db.exec('DELETE FROM journal'), /append-only/); assert.throws(() => db.exec("UPDATE baseline SET payload='{}'"), /immutable/); db.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('SQLite transition reservation binds assessed route and budget inside the transaction', () => {
  const dir = mkdtempSync(join(tmpdir(), 'palo-finops-test-')); const path = join(dir, 'ledger.sqlite');
  const ledger = new FinOpsLedger(path, { initialize: fresh() });
  const boundRequest = { ...request, worstCaseMicros: 120000 };
  try {
    assert.throws(() => ledger.reserveTransition(request, { ...reserve(), routeId: 'frontier' }, { at }), /bound/);
    assert.equal(ledger.snapshot().events.length, 0);
    assert.throws(() => ledger.reserveTransition(request, reserve(), { at }), /bound/);
    const r = ledger.reserveTransition(boundRequest, reserve(), { at });
    assert.equal(r.localBudgetReservationApplied, true); assert.equal(r.executionAuthorized, false);
    assert.throws(() => ledger.reserveTransition(boundRequest, reserve('r2'), { at }), /budget/);
  } finally { ledger.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('concurrent SQLite writers cannot both reserve the same available budget', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'palo-finops-race-')); const path = join(dir, 'ledger.sqlite');
  const ledger = new FinOpsLedger(path, { initialize: fresh() }); ledger.close();
  const modulePath = new URL('./ledger.js', import.meta.url).href;
  const gate = new SharedArrayBuffer(4); const control = new Int32Array(gate);
  const workers = [];
  function writer(id) {
    const worker = new Worker(`const {parentPort,workerData}=require('node:worker_threads'); (async()=>{ const {FinOpsLedger}=await import(workerData.modulePath);const ledger=new FinOpsLedger(workerData.path);parentPort.postMessage('ready');Atomics.wait(new Int32Array(workerData.gate),0,0);try{ledger.append(workerData.event);parentPort.postMessage({ok:true});}catch(e){parentPort.postMessage({ok:false,error:e.message});}finally{ledger.close();}})();`, { eval: true, workerData: { path, modulePath, gate, event: reserve(id) } });
    workers.push(worker);
    let readyResolve; const ready = new Promise(r => readyResolve = r);
    const done = new Promise((resolve, reject) => { worker.on('message', x => x === 'ready' ? readyResolve() : resolve(x)); worker.on('error', reject); });
    return { ready, done };
  }
  try {
    const a = writer('race-a'), b = writer('race-b'); await Promise.all([a.ready, b.ready]);
    Atomics.store(control, 0, 1); Atomics.notify(control, 0, 2);
    const results = await Promise.all([a.done, b.done]); assert.equal(results.filter(x => x.ok).length, 1);
    assert.match(results.find(x => !x.ok).error, /insufficient/);
    const reopened = new FinOpsLedger(path); assert.equal(summarize(reopened.snapshot()).reservedMicros, 120000); reopened.close();
  } finally { await Promise.all(workers.map(w => w.terminate())); rmSync(dir, { recursive: true, force: true }); }
});
