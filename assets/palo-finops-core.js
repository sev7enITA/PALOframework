/** PALO FinOps 1.0.0. Pure, dependency-free accounting and local policy assessment.
 * Monetary values are integer currency micros. No provider calls or execution authority.
 */
export const VERSION = '1.0.0';
export const TOKEN_CATEGORIES = Object.freeze(['input', 'cacheWrite5m', 'cacheWrite1h', 'cacheRead', 'output']);
export const CHARGE_CATEGORIES = Object.freeze(['tools', 'verification', 'governance', 'infrastructure', 'human-review']);
const SOURCES = ['manual', 'synthetic', 'provider'];
const MAX = Number.MAX_SAFE_INTEGER;
const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonempty = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 4096;
const money = v => Number.isSafeInteger(v) && v >= 0;
const stamp = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const uid = () => globalThis.crypto.randomUUID();
function checked(n) { if (n < 0n || n > BigInt(MAX)) throw new Error('Amount exceeds the supported safe-integer range.'); return Number(n); }
function sum(values) { return checked(values.reduce((a, b) => a + BigInt(b), 0n)); }
function requireValue(ok, message) { if (!ok) throw new Error(message); }

export function parseMoney(value) {
  requireValue(typeof value === 'string' && /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value.trim()), 'Enter a non-negative amount with at most six decimal places, without separators.');
  const [whole, fraction = ''] = value.trim().split('.');
  return checked(BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0')));
}

export function formatMoney(micros, currency = 'USD') {
  requireValue(Number.isSafeInteger(micros), 'Money must be an integer number of currency micros.');
  const absolute = BigInt(Math.abs(micros));
  const whole = absolute / 1000000n;
  const fractional = (absolute % 1000000n).toString().padStart(6, '0').replace(/0+$/, '').padEnd(2, '0');
  const signedWhole = micros < 0 ? (whole === 0n ? -0 : -whole) : whole;
  return new Intl.NumberFormat('en', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 6 }).formatToParts(signedWhole).map(part => part.type === 'fraction' ? fractional : part.value).join('');
}

export function priceUsage(rateCard, usage) {
  requireValue(obj(rateCard?.rates) && obj(usage), 'A rate card and disjoint token usage are required.');
  requireValue(Object.keys(usage).every(k => TOKEN_CATEGORIES.some(c => `${c}Tokens` === k)), 'Unknown token category. Use disjoint token counts.');
  const breakdown = TOKEN_CATEGORIES.map(category => {
    const rate = rateCard.rates[category];
    const tokens = usage[`${category}Tokens`];
    requireValue(money(rate) && money(tokens), `${category}: rate and token count must be non-negative safe integers.`);
    return { category, tokens, amountMicros: checked((BigInt(tokens) * BigInt(rate) + 999999n) / 1000000n) };
  });
  return { totalMicros: sum(breakdown.map(x => x.amountMicros)), breakdown };
}

export function createWorkspace({ label = 'Untitled FinOps', currency = 'USD', budgetMicros = 0, at = new Date().toISOString() } = {}) {
  const workspace = {
    format: 'palo-finops-workspace', schemaVersion: VERSION, workspaceId: uid(), label, currency, budgetMicros, createdAt: at, source: 'manual',
    workloads: [], tasks: [], routes: [], rateCards: [],
    policy: { id: 'local-policy', revision: '1', validUntil: at, allowedRouteIds: [], disclosureContractRef: 'not-configured', maxTransitionMicros: 0 }, events: []
  };
  return assertWorkspace(workspace);
}

// Structural validation precedes reference and journal checks; invalid imports never mutate state.
export function validateWorkspace(w) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  if (!obj(w)) return { valid: false, errors: ['Workspace must be an object.'] };
  check(w.format === 'palo-finops-workspace' && w.schemaVersion === VERSION, 'Unsupported workspace format or schema version.');
  for (const k of ['workspaceId', 'label']) check(nonempty(w[k]), `${k} is required.`);
  check(/^[A-Z]{3}$/.test(w.currency ?? ''), 'currency must be a three-letter uppercase code.');
  check(money(w.budgetMicros), 'budgetMicros must be a non-negative safe integer.');
  check(stamp(w.createdAt), 'createdAt must be a canonical UTC ISO timestamp.');
  check(['manual', 'synthetic', 'imported'].includes(w.source), 'Invalid workspace source.');
  for (const name of ['workloads', 'tasks', 'routes', 'rateCards', 'events']) {
    check(Array.isArray(w[name]) && w[name].length <= 10000, `${name} must be an array with at most 10,000 entries.`);
  }
  if (errors.length) return { valid: false, errors };
  const maps = {};
  for (const name of ['workloads', 'tasks', 'routes', 'rateCards', 'events']) {
    maps[name] = new Map();
    for (const item of w[name]) {
      if (!obj(item) || !nonempty(item.id)) { errors.push(`${name}: each entry needs an id.`); continue; }
      check(!maps[name].has(item.id), `${name}: duplicate id ${item.id}.`);
      maps[name].set(item.id, item);
    }
  }
  if (errors.length) return { valid: false, errors };
  for (const x of w.workloads) {
    check(nonempty(x.name) && typeof x.owner === 'string' && typeof x.costCenter === 'string', `Workload ${x.id}: name, owner and costCenter required.`);
    check(money(x.budgetMicros), `Workload ${x.id}: invalid budget.`);
  }
  for (const x of w.tasks) {
    check(maps.workloads.has(x.workloadId) && nonempty(x.label), `Task ${x.id}: unknown workload or missing label.`);
    check(['pending', 'accepted', 'failed', 'refused'].includes(x.outcome), `Task ${x.id}: invalid outcome.`);
  }
  const tuples = new Set();
  for (const x of w.routes) {
    check(['provider', 'model', 'region', 'endpointHost', 'toolSchemaDigest'].every(k => nonempty(x[k])), `Route ${x.id}: incomplete destination tuple.`);
    check(typeof x.endpointHost === 'string' && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d{1,5})?$/.test(x.endpointHost), `Route ${x.id}: endpointHost must be a lowercase host, without credentials or path.`);
    check(/^sha256:[a-f0-9]{64}$/.test(x.toolSchemaDigest ?? ''), `Route ${x.id}: invalid toolSchemaDigest.`);
    const tuple = JSON.stringify([x.provider, x.model, x.region, x.endpointHost, x.toolSchemaDigest]);
    check(!tuples.has(tuple), `Route ${x.id}: duplicate destination tuple.`); tuples.add(tuple);
  }
  for (const x of w.rateCards) {
    check(maps.routes.has(x.routeId), `Rate card ${x.id}: unknown route.`);
    check(x.currency === w.currency, `Rate card ${x.id}: currency mismatch; implicit FX is not supported.`);
    check(stamp(x.validFrom) && stamp(x.validUntil) && x.validFrom < x.validUntil, `Rate card ${x.id}: invalid validity interval.`);
    check(obj(x.source) && SOURCES.includes(x.source.kind) && nonempty(x.source.reference) && stamp(x.source.observedAt), `Rate card ${x.id}: source provenance is required.`);
    check(obj(x.rates) && TOKEN_CATEGORIES.every(k => money(x.rates[k])), `Rate card ${x.id}: five integer rates are required.`);
  }
  // At most one effective rate card for any exact route at a given instant.
  const intervals = new Map();
  for (const x of w.rateCards) { if (!intervals.has(x.routeId)) intervals.set(x.routeId, []); intervals.get(x.routeId).push(x); }
  for (const cards of intervals.values()) {
    cards.sort((a, b) => String(a.validFrom).localeCompare(String(b.validFrom)));
    for (let i = 1; i < cards.length; i++) check(cards[i].validFrom >= cards[i - 1].validUntil, `Rate cards ${cards[i - 1].id} and ${cards[i].id} overlap.`);
  }
  const p = w.policy;
  check(obj(p), 'Policy object required.');
  if (obj(p)) {
    check(['id', 'revision', 'disclosureContractRef'].every(k => nonempty(p[k])) && stamp(p.validUntil) && money(p.maxTransitionMicros), 'Policy identity, revision, validity, disclosure contract and cap required.');
    check(Array.isArray(p.allowedRouteIds) && p.allowedRouteIds.every(id => maps.routes.has(id)) && new Set(p.allowedRouteIds).size === p.allowedRouteIds.length, 'Policy allowedRouteIds must contain unique existing routes.');
  }
  if (errors.length) return { valid: false, errors };
  try { replay(w, maps); } catch (e) { errors.push(e.message); }
  return { valid: errors.length === 0, errors };
}

export function assertWorkspace(w) {
  const result = validateWorkspace(w);
  if (!result.valid) throw new Error(result.errors.join('\n'));
  return w;
}

function replay(w, suppliedMaps) {
  const maps = suppliedMaps ?? Object.fromEntries(['workloads', 'tasks', 'routes', 'rateCards'].map(k => [k, new Map(w[k].map(x => [x.id, x]))]));
  const attempts = new Map();
  let previous = w.createdAt;
  for (const e of w.events) {
    requireValue(['reserve', 'settle', 'reconcile'].includes(e.type), `Event ${e.id}: unknown type.`);
    requireValue(stamp(e.at) && e.at >= previous, `Event ${e.id}: timestamps must be canonical and monotonic.`); previous = e.at;
    requireValue(nonempty(e.attemptId) && SOURCES.includes(e.source), `Event ${e.id}: attemptId and source required.`);
    if (e.type === 'reserve') {
      requireValue(!attempts.has(e.attemptId), `Attempt ${e.attemptId}: already reserved.`);
      const task = maps.tasks.get(e.taskId); const rate = maps.rateCards.get(e.rateCardId);
      requireValue(task && task.workloadId === e.workloadId && maps.workloads.has(e.workloadId), `Attempt ${e.attemptId}: task/workload mismatch.`);
      requireValue(rate && rate.routeId === e.routeId && maps.routes.has(e.routeId), `Attempt ${e.attemptId}: rate card/route mismatch.`);
      requireValue(e.at >= rate.validFrom && e.at < rate.validUntil, `Attempt ${e.attemptId}: rate card is not valid at reservation time.`);
      requireValue(money(e.reservedMicros) && money(e.estimatedMicros) && e.reservedMicros >= e.estimatedMicros, `Attempt ${e.attemptId}: reservation must cover the estimate.`);
      attempts.set(e.attemptId, { attemptId: e.attemptId, taskId: e.taskId, workloadId: e.workloadId, routeId: e.routeId, rateCardId: e.rateCardId, reservedMicros: e.reservedMicros, estimatedMicros: e.estimatedMicros, actualMicros: null, status: 'reserved', source: e.source, reservationSource: e.source, breakdown: [] });
    } else {
      const a = attempts.get(e.attemptId);
      requireValue(a && (e.type === 'settle' ? a.status === 'reserved' : a.status === 'unreconciled'), `Attempt ${e.attemptId}: illegal ${e.type} sequence.`);
      requireValue(nonempty(e.evidenceRef), `Attempt ${e.attemptId}: evidence reference required (a declaration is not independent verification).`);
      requireValue(e.costMicros === null || money(e.costMicros), `Attempt ${e.attemptId}: invalid cost.`);
      requireValue(e.type !== 'reconcile' || e.costMicros !== null, `Attempt ${e.attemptId}: reconciliation needs a known cost.`);
      requireValue(e.costMicros !== null || (!own(e, 'usage') && !own(e, 'charges')), `Attempt ${e.attemptId}: unknown cost cannot carry a complete usage/charge allocation.`);
      const breakdown = [];
      if (own(e, 'usage')) breakdown.push(...priceUsage(maps.rateCards.get(a.rateCardId), e.usage).breakdown);
      if (own(e, 'charges')) {
        requireValue(Array.isArray(e.charges) && e.charges.length <= 100, `Attempt ${e.attemptId}: charges must be an array with at most 100 entries.`);
        for (const c of e.charges) {
          requireValue(obj(c) && CHARGE_CATEGORIES.includes(c.category) && money(c.amountMicros), `Attempt ${e.attemptId}: invalid ancillary charge.`);
          breakdown.push({ category: c.category, amountMicros: c.amountMicros });
        }
      }
      const allocated = sum(breakdown.map(x => x.amountMicros));
      if (own(e, 'usage')) requireValue(allocated === e.costMicros, `Attempt ${e.attemptId}: usage and charges must equal the declared final cost.`);
      else if (e.costMicros !== null) {
        requireValue(allocated <= e.costMicros, `Attempt ${e.attemptId}: ancillary charges exceed final cost.`);
        if (e.costMicros > allocated) breakdown.push({ category: 'unallocated', amountMicros: e.costMicros - allocated });
      }
      Object.assign(a, { actualMicros: e.costMicros, status: e.costMicros === null ? 'unreconciled' : 'settled', source: e.source, evidenceRef: e.evidenceRef, breakdown });
      if (e.usage) a.usage = { ...e.usage };
    }
  }
  const list = [...attempts.values()];
  // Reject overflow even on imports, before any aggregate can lose integer precision.
  sum(list.map(a => a.actualMicros === null ? a.reservedMicros : a.actualMicros));
  return list;
}

export function summarize(workspace) {
  const w = assertWorkspace(workspace); const attempts = replay(w);
  const totals = list => {
    const knownMicros = sum(list.map(a => a.actualMicros ?? 0));
    const reservedMicros = sum(list.filter(a => a.actualMicros === null).map(a => a.reservedMicros));
    return { knownMicros, reservedMicros, committedMicros: sum([knownMicros, reservedMicros]) };
  };
  const overall = totals(attempts);
  const byWorkload = w.workloads.map(x => {
    const t = totals(attempts.filter(a => a.workloadId === x.id));
    return { id: x.id, name: x.name, owner: x.owner, costCenter: x.costCenter, budgetMicros: x.budgetMicros, ...t, remainingMicros: x.budgetMicros - t.committedMicros };
  });
  const categories = new Map();
  for (const a of attempts) for (const x of a.breakdown) categories.set(x.category, sum([categories.get(x.category) ?? 0, x.amountMicros]));
  const attempted = new Set(attempts.map(a => a.taskId));
  const acceptedTasks = w.tasks.filter(t => attempted.has(t.id) && t.outcome === 'accepted').length;
  const unresolvedCount = attempts.filter(a => a.actualMicros === null).length;
  const complete = unresolvedCount === 0;
  const findings = [];
  if (overall.committedMicros > w.budgetMicros) findings.push({ code: 'workspace-budget-breach', severity: 'error', detail: 'Known costs plus outstanding reservations exceed the workspace budget.' });
  for (const x of byWorkload) if (x.remainingMicros < 0) findings.push({ code: 'workload-budget-breach', severity: 'error', detail: `${x.name}: committed cost exceeds its budget.` });
  for (const a of attempts) if (a.actualMicros !== null && a.actualMicros > a.reservedMicros) findings.push({ code: 'reservation-overrun', severity: 'warning', detail: `${a.attemptId}: final cost exceeded the reservation; the full actual cost is retained.` });
  if (!complete) findings.push({ code: 'incomplete-cost', severity: 'warning', detail: `${unresolvedCount} attempt(s) still hold their full reservation. Cost per accepted task is not final.` });
  if (attempts.some(a => a.source === 'synthetic' || a.reservationSource === 'synthetic') || w.source === 'synthetic' || w.rateCards.some(r => r.source.kind === 'synthetic')) findings.push({ code: 'synthetic-data', severity: 'info', detail: 'This workspace contains synthetic inputs; it is not evidence of actual expenditure or savings.' });
  if (attempts.length) findings.push({ code: 'declared-provenance', severity: 'info', detail: 'Source labels, task outcomes and evidence references are declarations. No invoice or provider signature was verified.' });
  return { currency: w.currency, budgetMicros: w.budgetMicros, ...overall, remainingMicros: w.budgetMicros - overall.committedMicros, unresolvedCount, acceptedTasks, attemptedTasks: attempted.size, completionRate: attempted.size ? acceptedTasks / attempted.size : null, costPerAcceptedMicros: complete && acceptedTasks ? overall.knownMicros / acceptedTasks : null, complete, byWorkload, byCategory: [...categories].map(([category, amountMicros]) => ({ category, amountMicros })), attempts, findings };
}

export function appendEvent(workspace, event) {
  assertWorkspace(workspace);
  const candidate = structuredClone(workspace);
  candidate.events.push(structuredClone(event));
  assertWorkspace(candidate);
  if (event.type === 'reserve') {
    const summary = summarize(candidate);
    requireValue(summary.remainingMicros >= 0 && summary.byWorkload.find(x => x.id === event.workloadId).remainingMicros >= 0, 'Reservation rejected: insufficient workspace or workload budget.');
  }
  return candidate;
}

export function evaluateTransition(workspace, request, { at = new Date().toISOString() } = {}) {
  const w = assertWorkspace(workspace); const r = request;
  const deny = []; const hold = []; const p = w.policy;
  const denied = reason => deny.push(reason);
  if (!obj(r)) return { recommendation: 'would-deny', eligible: false, economicallyPreferred: false, deltaMicros: 0, reasons: ['A transition request object is required.'], executionAuthorized: false, enforcementPerformed: false };
  const validAmounts = ['stayMicros', 'switchMicros', 'worstCaseMicros', 'uncertaintyMarginMicros'].every(k => money(r[k]));
  if (!validAmounts) denied('Comparable non-negative integer cost estimates and an uncertainty margin are required.');
  if (!stamp(at) || !stamp(r.requestedAt) || r.requestedAt > at || Date.parse(at) - Date.parse(r.requestedAt) > 300000) denied('Request timestamp is invalid, future-dated or older than five minutes.');
  if (stamp(at) && (at >= p.validUntil || at < w.createdAt)) denied('Policy expired or assessment predates the workspace.');
  if (w.events.some(e => stamp(at) && e.at > at)) denied('Journal contains events later than this assessment.');
  if (r.policyRevision !== p.revision) denied('Policy revision does not match.');
  if (r.disclosureContractRef !== p.disclosureContractRef || p.disclosureContractRef === 'not-configured') denied('Disclosure contract does not match a configured policy reference.');
  const from = w.routes.find(x => x.id === r.fromRouteId); const to = w.routes.find(x => x.id === r.toRouteId);
  if (!from || !to || from.id === to.id) denied('Select two different registered exact destinations.');
  if (!to || !p.allowedRouteIds.includes(to.id)) denied('Destination tuple is not in the declared allowed route set.');
  if (!to || r.toolSchemaDigest !== to.toolSchemaDigest) denied('Destination tool schema digest does not match.');
  if (to && !w.rateCards.some(x => x.routeId === to.id && stamp(at) && at >= x.validFrom && at < x.validUntil)) denied('No current rate card for the destination.');
  const task = w.tasks.find(x => x.id === r.taskId); const workload = w.workloads.find(x => x.id === r.workloadId);
  if (!task || !workload || task.workloadId !== workload.id) denied('Task and workload references do not match.');
  if (typeof r.unresolvedEffects !== 'boolean') denied('Declare whether effects remain unresolved.');
  else if (r.unresolvedEffects) hold.push('Resolve outstanding side effects before changing route.');
  if (!nonempty(r.qualityEvidenceRef)) hold.push('Quality evidence reference is missing.');
  if (!['warm', 'cold', 'unknown'].includes(r.cacheState)) denied('Cache state must be warm, cold or unknown.');
  if (!['cost', 'quality', 'availability'].includes(r.reason)) denied('Transition reason must be cost, quality or availability.');
  const summary = summarize(w);
  if (validAmounts) {
    if (r.worstCaseMicros < r.switchMicros) denied('Worst-case reservation does not cover the switching estimate.');
    if (r.worstCaseMicros > p.maxTransitionMicros) denied('Worst-case reservation exceeds the policy transition cap.');
    if (r.worstCaseMicros > summary.remainingMicros || (workload && r.worstCaseMicros > summary.byWorkload.find(x => x.id === workload.id).remainingMicros)) denied('Insufficient uncommitted workspace or workload budget.');
  }
  const deltaMicros = validAmounts ? r.stayMicros - r.switchMicros : 0;
  const economicallyPreferred = validAmounts && deltaMicros > r.uncertaintyMarginMicros;
  if (r.reason === 'cost' && !economicallyPreferred) hold.push('Estimated savings do not exceed the declared uncertainty margin.');
  const eligible = deny.length === 0 && !r.unresolvedEffects && nonempty(r.qualityEvidenceRef);
  const reasons = [...deny, ...hold];
  if (!reasons.length) reasons.push(r.reason === 'cost' ? 'Declared conditions pass and the estimated cost advantage exceeds the margin.' : 'Declared conditions pass for the stated quality or availability reason. Economic advantage is reported separately.');
  if (r.cacheState === 'unknown') reasons.push('Cache state is unknown. Coverage relies on the declared worst-case estimate, which has not been measured.');
  reasons.push('Local assessment only. No budget was reserved and no provider request was authorized or sent.');
  return { recommendation: deny.length ? 'would-deny' : hold.length ? 'would-hold' : 'would-proceed', eligible, economicallyPreferred, deltaMicros, reasons, executionAuthorized: false, enforcementPerformed: false };
}

export function createTransitionAssessment(workspace, request, { at = new Date().toISOString() } = {}) {
  requireValue(stamp(at), 'Assessment time must be a canonical UTC ISO timestamp.');
  const result = evaluateTransition(workspace, request, { at });
  return { format: 'palo-finops-transition-assessment', schemaVersion: VERSION, assessmentId: `finops-transition-${uid()}`, recordedAt: at, workspaceSnapshot: structuredClone(workspace), request: structuredClone(request), result };
}

const md = v => String(v).replace(/[\r\n|<>]/g, ' ').replace(/([\\`*_\[\]])/g, '\\$1');
export function buildReport(workspace, { at = new Date().toISOString() } = {}) {
  requireValue(stamp(at), 'Report time must be a canonical UTC ISO timestamp.');
  const w = assertWorkspace(workspace); const s = summarize(w);
  const m = v => formatMoney(v, w.currency);
  return [
    '# PALO AI FinOps report', '', `Workspace: ${md(w.label)} (${md(w.workspaceId)})`, `Generated: ${md(at)}`, `Module: ${VERSION} | Source: ${md(w.source)} | Currency: ${w.currency}`, '',
    'Local accounting and declared evidence. No invoice verification, runtime authorization or measured savings claim.', '',
    '| Metric | Value |', '| --- | ---: |', `| Budget | ${m(s.budgetMicros)} |`, `| Known cost | ${m(s.knownMicros)} |`, `| Outstanding reservations | ${m(s.reservedMicros)} |`, `| Committed cost | ${m(s.committedMicros)} |`, `| Remaining | ${m(s.remainingMicros)} |`, `| Open or unreconciled attempts | ${s.unresolvedCount} |`, `| Accepted / attempted tasks | ${s.acceptedTasks} / ${s.attemptedTasks} |`, `| Cost per accepted task | ${s.costPerAcceptedMicros === null ? 'Unavailable: incomplete costs or no accepted task' : m(Math.ceil(s.costPerAcceptedMicros)) + ' (rounded up to a micro)'} |`, '',
    '## Allocation', '', '| Workload | Owner | Cost center | Known | Reserved | Remaining |', '| --- | --- | --- | ---: | ---: | ---: |', ...s.byWorkload.map(x => `| ${md(x.name)} | ${md(x.owner)} | ${md(x.costCenter)} | ${m(x.knownMicros)} | ${m(x.reservedMicros)} | ${m(x.remainingMicros)} |`), '',
    '## Attempts', '', '| Attempt | Task | Route | State | Source | Final cost | Evidence reference |', '| --- | --- | --- | --- | --- | ---: | --- |', ...s.attempts.map(x => `| ${md(x.attemptId)} | ${md(x.taskId)} | ${md(x.routeId)} | ${x.status} | ${x.source} | ${x.actualMicros === null ? 'Unknown; reservation retained' : m(x.actualMicros)} | ${md(x.evidenceRef ?? '')} |`), '',
    '## Cost categories', '', ...s.byCategory.map(x => `- ${x.category}: ${m(x.amountMicros)}`), '',
    '## Findings', '', ...(s.findings.length ? s.findings.map(x => `- ${x.code}: ${md(x.detail)}`) : ['- No accounting findings for the supplied data.']), '',
    'The JSON export preserves rate-card versions, exact route tuples, policy declarations and the event journal. Evidence references and task outcomes are user declarations. Imported files are not signed or tamper-proof. Budget checks are local and require an atomic runtime adapter to govern concurrent provider calls.', ''
  ].join('\n');
}

export function createCaseAttachment(workspace, { at = new Date().toISOString() } = {}) {
  requireValue(stamp(at), 'Attachment time must be a canonical UTC ISO timestamp.');
  assertWorkspace(workspace);
  return { assessmentId: `finops-${uid()}`, module: 'finops', recordedAt: at, data: { moduleVersion: VERSION, snapshot: structuredClone(workspace), summary: summarize(workspace), report: buildReport(workspace, { at }), executionAuthorized: false, enforcementPerformed: false, evidenceStatus: 'draft' } };
}
