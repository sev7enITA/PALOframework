import * as core from './palo-finops-core.js';
import {mountBilling} from './palo-finops-billing-ui.js';
import {mountOperations} from './palo-finops-operations-ui.js';

const STORAGE_KEY = 'palo.finops.workspace.v1';
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const $ = id => document.getElementById(id);
const now = () => new Date().toISOString();
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const value = id => $(id).value.trim();
const amount = id => core.parseMoney(value(id));
const moneyInput = micros => {
  const exact = BigInt(micros);
  const whole = exact / 1000000n;
  const fraction = (exact % 1000000n).toString().padStart(6, '0').replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''}`;
};
const categoryNames = { input: 'Uncached input', cacheWrite5m: 'Cache write | 5m', cacheWrite1h: 'Cache write | 1h', cacheRead: 'Cache read', output: 'Output', tools: 'Tools', verification: 'Verification', governance: 'Governance', infrastructure: 'Infrastructure', 'human-review': 'Human review', unallocated: 'Unallocated declared cost' };
let workspace = core.createWorkspace();
let summary;
let dirty = false;
let origin = 'new';
let displayedCaseId;
let busy = false;
let transitionArtifact = null;
let billingView;
let operationsView;
let replacementReview = null;

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function status(id, message, error = false) {
  $(id).textContent = message;
  $(id).classList.toggle('error', error);
}
function fmt(micros) { return core.formatMoney(Math.ceil(micros), workspace.currency); }
function nonempty() { return workspace.workloads.length || workspace.routes.length || workspace.events.length || workspace.budgetMicros > 0 || workspace.label !== 'Untitled FinOps'; }
function replacementFingerprint() { return JSON.stringify([workspace,billingView?.getStateToken(),operationsView?.exportState()]); }
function confirmReplacement(detail) {
  if(replacementReview)return Promise.resolve(false);
  return new Promise(resolve=>{replacementReview={resolve,returnFocus:document.activeElement};$('workspace-replacement-detail').textContent=detail;$('workspace-replacement-review').hidden=false;$('workspace-replacement-confirm').focus();$('workspace-replacement-review').scrollIntoView({block:'nearest'});});
}
function finishReplacementReview(accepted) { const review=replacementReview;if(!review)return;replacementReview=null;$('workspace-replacement-review').hidden=true;review.returnFocus?.focus({preventScroll:true});review.resolve(accepted); }
async function mayReplace() { if(!(dirty && nonempty()) && !billingView?.isDirty() && !operationsView?.isDirty())return true;const before=replacementFingerprint(),accepted=await confirmReplacement('The selected copy will replace the current attempts, billing and operations. Export the finance workspace or save the relevant drafts first to preserve unsaved records.');if(!accepted)return false;if(replacementFingerprint()!==before){status('workspace-status','The workspace changed while the replacement was under review. Current records are preserved; choose the replacement again.',true);return false;}return true; }
function source() { return workspace.source === 'synthetic' ? 'synthetic' : 'manual'; }
function invalidateTransition(message = 'The workspace or request changed. Assess the current values again.') {
  transitionArtifact = null;
  $('export-assessment').disabled = true;
  if (!$('transition-result').hasAttribute('data-verdict')) return;
  $('transition-result').removeAttribute('data-verdict');
  $('transition-verdict').textContent = 'Reassessment needed';
  $('transition-summary').textContent = message;
  $('transition-reasons').replaceChildren();
  status('transition-status', 'Previous assessment is no longer current.');
}
function validated(candidate) {
  const result = core.validateWorkspace(candidate);
  if (!result.valid) throw new Error(result.errors.slice(0, 8).join(' ') + (result.errors.length > 8 ? ` ${result.errors.length - 8} more validation errors.` : ''));
  return candidate;
}
function mutate(fn) {
  const candidate = structuredClone(workspace);
  fn(candidate);
  billingView?.assertCurrency(candidate.currency);
  workspace = validated(candidate);
  dirty = true;
  invalidateTransition();
  render();
}
function replace(candidate, nextOrigin, isDirty = true) {
  validated(candidate);
  invalidateTransition();
  workspace = structuredClone(candidate);
  operationsView?.reset();
  billingView?.reset();
  origin = nextOrigin;
  dirty = isDirty;
  document.querySelectorAll('.fo-form-status').forEach(node => { node.textContent = ''; });
  $('case-file-status').textContent = '';
  $('transition-result').removeAttribute('data-verdict');
  $('transition-verdict').textContent = 'Ready to compare';
  $('transition-summary').textContent = 'Choose a destination and enter comparable cost estimates to review budget, route eligibility and economic preference.';
  $('transition-reasons').replaceChildren();
  render(true);
}
function eventTime() {
  const at = now();
  if (workspace.createdAt > at || (workspace.events.at(-1)?.at ?? '') > at) throw new Error('This workspace contains future-dated records. The journal cannot be appended until that time has passed.');
  return at;
}
function append(event) {
  workspace = core.appendEvent(workspace, event);
  dirty = true;
  invalidateTransition();
  render();
}
function onForm(id, target, handler) {
  $(id).addEventListener('submit', event => {
    event.preventDefault();
    try { handler(); } catch (error) { status(target, error.message, true); }
  });
}
function selectOptions(id, entries, placeholder) {
  const select = $(id);
  const selected = select.value;
  const nodes = entries.map(([v, label]) => {
    const option = el('option', label); option.value = v; return option;
  });
  if (!nodes.length) { const option = el('option', placeholder); option.value = ''; nodes.push(option); }
  select.replaceChildren(...nodes);
  if (entries.some(([v]) => v === selected)) select.value = selected;
  select.disabled = entries.length === 0;
}
function routeName(id) {
  const r = workspace.routes.find(route => route.id === id);
  return r ? `${r.provider} / ${r.model}` : id;
}
function taskName(id) { return workspace.tasks.find(task => task.id === id)?.label ?? id; }
function tuple(route) { return `${route.provider} / ${route.model} | ${route.region} | ${route.endpointHost} | ${route.toolSchemaDigest}`; }
function emptyRow(body, columns, text) { const row = el('tr'); const cell = el('td', text, 'fo-table-empty'); cell.colSpan = columns; row.append(cell); body.append(row); }
function renderBudget() {
  $('empty-state').hidden = workspace.events.length > 0;
  $('budget-total').textContent = fmt(summary.budgetMicros);
  $('budget-remaining').textContent = fmt(summary.remainingMicros);
  $('budget-caption').textContent = summary.budgetMicros === 0 ? 'No budget configured' : summary.remainingMicros < 0 ? 'Budget exceeded' : 'Known cost + open reservations';
  document.querySelector('.fo-budget').classList.toggle('is-breached', summary.remainingMicros < 0);
  const denominator = Math.max(summary.budgetMicros, summary.committedMicros, 1);
  $('budget-bar-known').style.width = `${summary.knownMicros / denominator * 100}%`;
  $('budget-bar-reserved').style.width = `${summary.reservedMicros / denominator * 100}%`;
  $('budget-bar-available').style.width = `${Math.max(0, summary.remainingMicros) / denominator * 100}%`;
  $('budget-bar').setAttribute('aria-label', `Budget ${fmt(summary.budgetMicros)}. Known cost ${fmt(summary.knownMicros)}. Open reservations ${fmt(summary.reservedMicros)}. Remaining allowance ${fmt(summary.remainingMicros)}.`);
  $('legend-known').textContent = fmt(summary.knownMicros);
  $('legend-reserved').textContent = fmt(summary.reservedMicros);
  $('legend-available').textContent = fmt(Math.max(0, summary.remainingMicros));
  $('metric-committed').textContent = fmt(summary.committedMicros);
  $('metric-unresolved').textContent = String(summary.unresolvedCount);
  const knownCount = summary.attempts.filter(a => a.status === 'settled').length;
  $('metric-coverage').textContent = summary.attempts.length ? `${knownCount} of ${summary.attempts.length} attempts have a known cost` : 'No attempts recorded';
  const hasUnit = summary.costPerAcceptedMicros !== null;
  $('metric-unit-cost').textContent = hasUnit ? fmt(summary.costPerAcceptedMicros) : 'Not available';
  $('metric-unit-cost').classList.toggle('is-small', !hasUnit);
  $('metric-unit-note').textContent = hasUnit ? (summary.complete ? 'All recorded attempts included; rounded up to 1 micro' : 'Provisional known cost; unresolved costs excluded') : summary.acceptedTasks ? 'Awaiting complete cost reconciliation' : 'No accepted tasks yet';
  $('metric-completion').textContent = `${summary.acceptedTasks} / ${summary.attemptedTasks}`;
  $('metric-completion-note').textContent = summary.completionRate === null ? 'No attempted tasks yet' : `${(summary.completionRate * 100).toFixed(1)}% accepted among attempted tasks`;
  const findings = $('findings'); findings.replaceChildren();
  for (const finding of summary.findings) {
    const node = el('p', finding.detail, `fo-finding ${finding.severity === 'error' || finding.severity === 'critical' ? 'error' : ''}`);
    findings.append(node);
  }
  $('allocation-count').textContent = `${workspace.workloads.length} ${workspace.workloads.length === 1 ? 'workload' : 'workloads'}`;
  const body = $('workload-body'); body.replaceChildren();
  for (const workload of summary.byWorkload) {
    const declared = workspace.workloads.find(w => w.id === workload.id);
    const row = el('tr'); const title = el('td'); title.append(el('strong', workload.name), el('small', `${declared.owner || 'Owner not specified'} | ${declared.costCenter || 'No cost centre'}`));
    row.append(title, el('td', fmt(workload.knownMicros), 'num'), el('td', fmt(workload.reservedMicros), 'num'), el('td', fmt(workload.remainingMicros), `num ${workload.remainingMicros < 0 ? 'negative' : ''}`)); body.append(row);
  }
  if (!summary.byWorkload.length) emptyRow(body, 4, 'No workloads yet. Add one in Setup.');
  const categories = $('category-list'); categories.replaceChildren();
  for (const category of summary.byCategory) {
    const row = el('div', null, 'fo-category-row'); row.append(el('span', categoryNames[category.category] ?? category.category), el('strong', fmt(category.amountMicros)));
    const progress = el('progress'); progress.max = Math.max(1, summary.knownMicros); progress.value = category.amountMicros; progress.setAttribute('aria-label', `${categoryNames[category.category] ?? category.category}: ${fmt(category.amountMicros)}`); row.append(progress); categories.append(row);
  }
  if (!summary.byCategory.length) categories.append(el('p', 'No known costs recorded yet.', 'fo-help'));
}
function renderLedger() {
  $('ledger-count').textContent = String(summary.attempts.length);
  const body = $('attempts-body'); body.replaceChildren();
  for (const attempt of [...summary.attempts].reverse()) {
    const row = el('tr');
    const task = workspace.tasks.find(t => t.id === attempt.taskId);
    const name = el('td'); name.append(el('strong', taskName(attempt.taskId)), el('small', attempt.attemptId), el('small', `Outcome: ${task?.outcome ?? 'unknown'}`));
    const route = el('td', routeName(attempt.routeId)); route.append(el('small', workspace.routes.find(r => r.id === attempt.routeId)?.region));
    const state = el('td'); state.append(el('span', { reserved: 'Reserved', unreconciled: 'Awaiting cost', settled: 'Settled' }[attempt.status], `fo-pill ${attempt.status}`));
    const provenance = el('td', attempt.source); provenance.append(el('small', attempt.evidenceRef ?? 'Reservation estimate; no final evidence'));
    row.append(name, route, el('td', fmt(attempt.reservedMicros), 'num'), el('td', attempt.actualMicros === null ? 'Unknown' : fmt(attempt.actualMicros), 'num'), state, provenance); body.append(row);
  }
  if (!summary.attempts.length) emptyRow(body, 6, 'No attempts recorded. Reserve a budget in Record & reconcile.');
  $('event-journal').textContent = workspace.events.length ? JSON.stringify(workspace.events, null, 2) : 'The event journal is empty.';
}
function syncSettleForm() {
  const attempt = summary.attempts.find(a => a.attemptId === value('settle-attempt'));
  const isReconciliation = attempt?.status === 'unreconciled';
  $('settle-kind').disabled = isReconciliation || !attempt;
  if (isReconciliation) $('settle-kind').value = 'known';
  const isUnknown = value('settle-kind') === 'unknown';
  $('settle-amount-field').hidden = isUnknown;
  $('settle-amount').required = !isUnknown;
  $('settle-submit').textContent = isReconciliation ? 'Record reconciliation' : 'Record settlement';
  $('settle-submit').disabled = !attempt;
}
function syncTransitionRoute() {
  const route = workspace.routes.find(r => r.id === value('transition-to'));
  $('transition-tuple').textContent = route ? `Destination tuple: ${tuple(route)}` : 'Register exact route destinations in Setup.';
}
function syncOutcome() { const task = workspace.tasks.find(t => t.id === value('outcome-task')); if (task) $('outcome-value').value = task.outcome; }
function renderForms(reset = false) {
  const tasks = workspace.tasks.map(t => [t.id, `${t.label} | ${workspace.workloads.find(w => w.id === t.workloadId)?.name}`]);
  for (const id of ['reserve-task', 'outcome-task', 'transition-task']) selectOptions(id, tasks, 'Create a task in Setup');
  selectOptions('task-workload', workspace.workloads.map(w => [w.id, w.name]), 'Create a workload first');
  selectOptions('reserve-rate', workspace.rateCards.map(r => [r.id, `${routeName(r.routeId)} | ${r.id}`]), 'Register a route and rate card');
  selectOptions('settle-attempt', summary.attempts.filter(a => a.status !== 'settled').map(a => [a.attemptId, `${taskName(a.taskId)} | ${a.status === 'unreconciled' ? 'awaiting cost' : 'reserved'} | ${a.attemptId}`]), 'No open attempts');
  for (const id of ['transition-from', 'transition-to']) selectOptions(id, workspace.routes.map(r => [r.id, `${r.provider} / ${r.model} | ${r.region}`]), 'Register a route in Setup');
  $('reserve-submit').disabled = !tasks.length || !workspace.rateCards.length;
  $('task-submit').disabled = !workspace.workloads.length;
  const selectedTask = workspace.tasks.find(t => t.id === value('reserve-task'));
  const work = summary.byWorkload.find(w => w.id === selectedTask?.workloadId);
  $('reserve-context').textContent = work ? `${workspace.currency} | ${work.name}: ${fmt(work.remainingMicros)} remaining. Workspace: ${fmt(summary.remainingMicros)} remaining.` : 'Create a workload, a task and a rate card in Setup.';
  if (reset || document.activeElement?.closest('#workspace-form') === null) {
    $('config-label').value = workspace.label; $('config-currency').value = workspace.currency; $('config-budget').value = moneyInput(workspace.budgetMicros);
  }
  $('config-currency').disabled = workspace.rateCards.length > 0 || workspace.events.length > 0;
  $('workspace-currency').textContent = workspace.currency;
  if (reset || !value('transition-policy')) $('transition-policy').value = workspace.policy.revision;
  if (reset || !value('transition-disclosure')) $('transition-disclosure').value = workspace.policy.disclosureContractRef;
  if (reset || document.activeElement?.closest('#policy-form') === null) {
    $('policy-revision').value = workspace.policy.revision;
    $('policy-disclosure').value = workspace.policy.disclosureContractRef;
    $('policy-max').value = moneyInput(workspace.policy.maxTransitionMicros);
    const localDate = new Date(workspace.policy.validUntil); localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    $('policy-until').value = localDate.toISOString().slice(0, 16);
  }
  const permissions = $('policy-routes'); permissions.replaceChildren();
  for (const route of workspace.routes) {
    const label = el('label', null, 'fo-check'); const input = el('input'); input.type = 'checkbox'; input.value = route.id; input.checked = workspace.policy.allowedRouteIds.includes(route.id); label.append(input, el('span', tuple(route))); permissions.append(label);
  }
  if (!workspace.routes.length) permissions.append(el('p', 'No routes registered.', 'fo-help'));
  syncSettleForm(); syncTransitionRoute(); syncOutcome();
}
function renderRates() {
  const container = $('rate-cards'); container.replaceChildren();
  for (const rate of workspace.rateCards) {
    const route = workspace.routes.find(r => r.id === rate.routeId);
    const card = el('article', null, 'fo-rate-card');
    card.append(el('h4', routeName(rate.routeId)), el('span', rate.source.kind, `fo-badge ${rate.source.kind === 'synthetic' ? 'synthetic' : ''}`), el('p', tuple(route), 'fo-route-tuple'));
    card.append(el('p', `Version ${rate.id} | valid ${rate.validFrom} to ${rate.validUntil} (exclusive)`, 'fo-rate-meta'), el('p', `Source: ${rate.source.reference} | observed ${rate.source.observedAt}`, 'fo-rate-meta'));
    const list = el('dl', null, 'fo-rate-prices');
    for (const [category, cost] of Object.entries(rate.rates)) { const group = el('div'); group.append(el('dt', `${categoryNames[category] ?? category} / million`), el('dd', fmt(cost))); list.append(group); }
    card.append(list); container.append(card);
  }
  if (!workspace.rateCards.length) container.append(el('p', 'No rate cards registered. Add a route above, or import a workspace with versioned rates.', 'fo-help'));
}
function render(reset = false) {
  summary = core.summarize(workspace);
  $('workspace-title').textContent = workspace.label;
  const synthetic = workspace.source === 'synthetic' || workspace.rateCards.some(r => r.source.kind === 'synthetic') || workspace.events.some(e => e.source === 'synthetic');
  $('source-badge').textContent = `${origin === 'imported' ? 'Imported | ' : ''}${synthetic ? 'Synthetic records' : nonempty() ? 'Declared records' : 'Empty workspace'}`;
  $('source-badge').classList.toggle('synthetic', synthetic);
  $('source-notice').hidden = !synthetic;
  $('source-notice').textContent = 'Synthetic data. These amounts, models and evidence references demonstrate the workflow. They do not represent real expenditure, provider prices or measured savings.';
  $('draft-state').textContent = dirty ? 'Unsaved changes' : origin === 'restored' || origin === 'saved' ? 'Draft saved locally' : 'Not saved locally';
  renderBudget(); renderLedger(); renderForms(reset); renderRates(); updateCaseContext(); billingView?.render();
}
function openPanel(name, focus = false) {
  for (const tab of document.querySelectorAll('.fo-tabs [role=tab]')) {
    const active = tab.dataset.panel === name;
    tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    $(`panel-${tab.dataset.panel}`).hidden = !active;
    if (active && focus) tab.focus();
  }
}
function download(content, extension, type, prefix = 'palo-finops') {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = el('a'); link.href = url; link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.${extension}`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function readCurrentCase() {
  const api = window.PALOCaseFile;
  let raw;
  try { raw = localStorage.getItem(api.storageKeys.caseFile); } catch { throw new Error('Browser storage cannot be read. Export your workspace to keep a copy.'); }
  const current = api.load();
  if (raw !== null && !current) throw new Error('The existing Case File could not be validated. Attachment is blocked to preserve its stored data. Review the existing Case File first.');
  return current;
}
function updateCaseContext() {
  if (!window.PALOCaseFile) { $('case-file-context').textContent = 'Case File support is unavailable. Export JSON to keep this workspace.'; $('attach-case').disabled = true; return; }
  try {
    const current = readCurrentCase(); displayedCaseId = current?.caseId ?? null;
    $('case-file-context').textContent = current ? `Current Case File: ${current.title}. Attachment adds a draft snapshot and preserves earlier records.` : 'No current Case File. Attaching creates a named FinOps case in this browser.';
    $('attach-case').disabled = false;
  } catch (error) { displayedCaseId = undefined; $('case-file-context').textContent = error.message; $('attach-case').disabled = true; }
}
function attachCase() {
  try {
    const api = window.PALOCaseFile;
    if (!api) throw new Error('Case File support is unavailable. Export JSON instead.');
    let current = readCurrentCase();
    if ((current?.caseId ?? null) !== displayedCaseId) { updateCaseContext(); status('case-file-status', 'The current Case File changed. Review its title above and attach again.'); return; }
    if (!current) current = api.create({ title: `FinOps: ${workspace.label}`, owner: '' });
    const snapshot = core.createCaseAttachment(workspace, { at: now() });
    const merged = api.merge(current, { assessments: [snapshot], evidence: [{ evidenceId: `evidence-${snapshot.assessmentId}`, title: `FinOps review: ${workspace.label}`, kind: 'finops-assessment', status: 'draft', recordedAt: snapshot.recordedAt, content: { assessmentId: snapshot.assessmentId, workspaceId: workspace.workspaceId, source: workspace.source, executionAuthorized: false, enforcementPerformed: false } }] });
    const result = api.save(merged);
    if (!result.ok) throw new Error((result.errors ?? []).map(e => typeof e === 'string' ? e : e.message ?? JSON.stringify(e)).join(' ') || 'Case File save failed.');
    updateCaseContext(); status('case-file-status', 'Draft FinOps snapshot attached. Previous snapshots and case context are preserved.');
  } catch (error) { status('case-file-status', error.message, true); }
}

document.querySelectorAll('.fo-tabs [role=tab]').forEach(tab => {
  tab.addEventListener('click', () => openPanel(tab.dataset.panel));
  tab.addEventListener('keydown', event => {
    const tabs = [...document.querySelectorAll('.fo-tabs [role=tab]')]; const i = tabs.indexOf(tab);
    const index = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (index >= 0) { event.preventDefault(); openPanel(tabs[index].dataset.panel, true); }
  });
});
document.querySelectorAll('[data-open-panel]').forEach(button => button.addEventListener('click', () => openPanel(button.dataset.openPanel, true)));
$('workspace-replacement-confirm').addEventListener('click',()=>finishReplacementReview(true));
$('workspace-replacement-cancel').addEventListener('click',()=>finishReplacementReview(false));
$('workspace-replacement-review').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();finishReplacementReview(false);}});
$('new-workspace').addEventListener('click', async () => { if (await mayReplace()) { replace(core.createWorkspace(), 'new', false); openPanel('setup'); status('workspace-status', 'New empty workspace. Set the budget and scope below.'); } });
$('load-example').addEventListener('click', async () => {
  if (busy || !await mayReplace() || busy) return;
  const beforeLoad = replacementFingerprint();
  busy = true; $('load-example').disabled = true; $('load-example').textContent = 'Loading example...';
  status('workspace-status', 'Loading and validating the synthetic example...');
  try {
    const response = await fetch('data/finops-demo.json', { credentials: 'omit' });
    if (!response.ok) throw new Error(`The example could not be loaded (HTTP ${response.status}).`);
    const candidate = await response.json(); validated(candidate);
    if (replacementFingerprint() !== beforeLoad) { status('workspace-status', 'Workspace changed during example loading. Current records preserved; load the example again.'); return; }
    replace(candidate, 'example'); openPanel('overview'); status('workspace-status', 'Synthetic example loaded. All amounts and routes are illustrative.');
  } catch (error) { status('workspace-status', `Could not load example: ${error.message} Current workspace preserved.`, true); }
  finally { busy = false; $('load-example').disabled = false; $('load-example').textContent = 'Load synthetic example'; }
});
$('import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (busy) throw new Error('Wait for the current workspace load to finish, then import again.');
    if (file.size > MAX_IMPORT_BYTES) throw new Error('File exceeds the 2 MiB import limit.');
    const candidate = validated(JSON.parse(await file.text()));
    if (!await mayReplace()) return;
    replace(candidate, 'imported'); status('workspace-status', `Imported ${file.name}. Source provenance is preserved; no record has been independently verified.`);
  } catch (error) { status('workspace-status', `Import rejected: ${error.message} Current workspace preserved.`, true); }
  finally { event.target.value = ''; }
});
$('save-draft').addEventListener('click', () => {
  try { validated(workspace); localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace)); dirty = false; origin = 'saved'; render(); status('workspace-status', 'Draft saved in this browser. Export JSON for a portable copy.'); }
  catch (error) { status('workspace-status', `Could not save draft: ${error.message} Export JSON to keep your work.`, true); }
});
$('restore-draft').addEventListener('click', async () => {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw === null) throw new Error('No saved FinOps draft was found in this browser.'); const candidate = validated(JSON.parse(raw)); if (!await mayReplace()) return; replace(candidate, 'restored', false); status('workspace-status', 'Saved local draft restored.'); }
  catch (error) { status('workspace-status', `Restore failed: ${error.message} Current workspace and saved draft preserved.`, true); }
});
$('export-json').addEventListener('click', () => { try { validated(workspace); download(JSON.stringify(workspace, null, 2), 'json', 'application/json'); status('workspace-status', 'JSON export prepared. Unsaved changes remain until you save the local draft.'); } catch (error) { status('workspace-status', error.message, true); } });
$('export-report').addEventListener('click', () => { try { download(core.buildReport(workspace, { at: now() }), 'md', 'text/markdown'); status('workspace-status', 'Markdown report export prepared with accounting boundaries and source provenance.'); } catch (error) { status('workspace-status', error.message, true); } });
$('export-assessment').addEventListener('click', () => {
  if (!transitionArtifact) return;
  try {
    download(JSON.stringify(transitionArtifact, null, 2), 'json', 'application/json', 'palo-finops-transition');
    status('transition-status', 'Assessment JSON export prepared with its declared request and workspace snapshot. No data was saved automatically.');
  } catch (error) { status('transition-status', `Assessment export failed: ${error.message}`, true); }
});
$('attach-case').addEventListener('click', attachCase);
window.addEventListener('storage', event => { if (event.key === window.PALOCaseFile?.storageKeys.caseFile) updateCaseContext(); });
window.addEventListener('beforeunload', event => { if ((dirty && nonempty()) || billingView?.isDirty() || operationsView?.isDirty()) { event.preventDefault(); event.returnValue = ''; } });

onForm('workspace-form', 'config-status', () => {
  mutate(candidate => { candidate.label = value('config-label'); candidate.currency = value('config-currency'); candidate.budgetMicros = amount('config-budget'); });
  status('config-status', 'Workspace scope updated. Any budget breaches remain visible.');
});
onForm('workload-form', 'workload-status', () => {
  const workload = { id: uid('workload'), name: value('workload-name'), owner: value('workload-owner'), costCenter: value('workload-center'), budgetMicros: amount('workload-budget') };
  mutate(candidate => candidate.workloads.push(workload)); $('workload-form').reset(); status('workload-status', `Workload "${workload.name}" added.`);
});
onForm('task-form', 'task-status', () => {
  const task = { id: uid('task'), workloadId: value('task-workload'), label: value('task-label'), outcome: 'pending' };
  mutate(candidate => candidate.tasks.push(task)); $('task-label').value = ''; status('task-status', `Task "${task.label}" added with a pending outcome.`);
});
onForm('route-form', 'route-status', () => {
  const at = now();
  const route = { id: uid('route'), provider: value('route-provider'), model: value('route-model'), region: value('route-region'), endpointHost: value('route-host'), toolSchemaDigest: value('route-digest') };
  const rate = { id: uid('rate'), routeId: route.id, currency: workspace.currency, validFrom: new Date(`${value('rate-from')}T00:00:00.000Z`).toISOString(), validUntil: new Date(`${value('rate-until')}T00:00:00.000Z`).toISOString(), source: { kind: source(), reference: value('rate-reference'), observedAt: at }, rates: { input: amount('rate-input'), cacheWrite5m: amount('rate-write5m'), cacheWrite1h: amount('rate-write1h'), cacheRead: amount('rate-read'), output: amount('rate-output') } };
  mutate(candidate => { candidate.routes.push(route); candidate.rateCards.push(rate); if ($('route-allow').checked) candidate.policy.allowedRouteIds.push(route.id); });
  $('route-form').reset(); status('route-status', `Registered ${route.provider} / ${route.model}. Rates are declared inputs in ${workspace.currency}; validity begins and ends at 00:00 UTC.`);
});
onForm('policy-form', 'policy-status', () => {
  const allowed = [...$('policy-routes').querySelectorAll('input:checked')].map(input => input.value);
  const policy = { ...workspace.policy, revision: value('policy-revision'), validUntil: new Date(value('policy-until')).toISOString(), disclosureContractRef: value('policy-disclosure'), maxTransitionMicros: amount('policy-max'), allowedRouteIds: allowed };
  mutate(candidate => { candidate.policy = policy; });
  $('transition-policy').value = policy.revision; $('transition-disclosure').value = policy.disclosureContractRef;
  status('policy-status', 'Local policy updated. Reassess any prior transition against this revision.');
});
onForm('reserve-form', 'reserve-status', () => {
  const task = workspace.tasks.find(t => t.id === value('reserve-task')); const rate = workspace.rateCards.find(r => r.id === value('reserve-rate'));
  if (!task || !rate) throw new Error('Select a registered task and rate card.');
  const event = { id: uid('event'), type: 'reserve', at: eventTime(), attemptId: uid('attempt'), taskId: task.id, workloadId: task.workloadId, routeId: rate.routeId, rateCardId: rate.id, reservedMicros: amount('reserve-amount'), estimatedMicros: amount('reserve-estimate'), source: source() };
  append(event); status('reserve-status', `Reserved ${fmt(event.reservedMicros)} for "${task.label}". No API call was made.`);
});
$('reserve-task').addEventListener('change', () => { const t = workspace.tasks.find(task => task.id === value('reserve-task')); const w = summary.byWorkload.find(work => work.id === t?.workloadId); $('reserve-context').textContent = w ? `${workspace.currency} | ${w.name}: ${fmt(w.remainingMicros)} remaining. Workspace: ${fmt(summary.remainingMicros)} remaining.` : 'Choose a task.'; });
onForm('settle-form', 'settle-status', () => {
  const attempt = summary.attempts.find(a => a.attemptId === value('settle-attempt'));
  if (!attempt) throw new Error('Choose an open attempt.');
  const unknown = value('settle-kind') === 'unknown';
  const event = { id: uid('event'), type: attempt.status === 'unreconciled' ? 'reconcile' : 'settle', at: eventTime(), attemptId: attempt.attemptId, costMicros: unknown ? null : amount('settle-amount'), evidenceRef: value('settle-evidence'), source: source() };
  append(event); $('settle-amount').value = ''; $('settle-evidence').value = '';
  status('settle-status', unknown ? 'Cost remains unknown. The full reservation is retained until reconciliation.' : `Known total ${fmt(event.costMicros)} recorded. Evidence is a declaration and has not been independently verified.`);
});
$('settle-attempt').addEventListener('change', syncSettleForm);
$('settle-kind').addEventListener('change', syncSettleForm);
onForm('outcome-form', 'outcome-status', () => {
  const id = value('outcome-task'); const outcome = value('outcome-value');
  if (!id) throw new Error('Create a task before setting an outcome.');
  mutate(candidate => { candidate.tasks.find(task => task.id === id).outcome = outcome; }); status('outcome-status', `Declared task outcome updated to ${outcome}.`);
});
$('outcome-task').addEventListener('change', syncOutcome);
$('transition-to').addEventListener('change', syncTransitionRoute);
$('transition-form').addEventListener('input', () => invalidateTransition());
$('transition-form').addEventListener('change', () => invalidateTransition());
onForm('transition-form', 'transition-status', () => {
  invalidateTransition();
  const at = now(); const task = workspace.tasks.find(t => t.id === value('transition-task')); const route = workspace.routes.find(r => r.id === value('transition-to'));
  if (!task || !route) throw new Error('Choose a registered task and destination route.');
  const request = { fromRouteId: value('transition-from'), toRouteId: route.id, workloadId: task.workloadId, taskId: task.id, requestedAt: at, policyRevision: value('transition-policy'), disclosureContractRef: value('transition-disclosure'), toolSchemaDigest: route.toolSchemaDigest, unresolvedEffects: $('transition-unresolved').checked, qualityEvidenceRef: value('transition-quality'), reason: value('transition-reason'), stayMicros: amount('transition-stay'), switchMicros: amount('transition-switch'), worstCaseMicros: amount('transition-worst'), uncertaintyMarginMicros: amount('transition-margin'), cacheState: value('transition-cache') };
  const artifact = core.createTransitionAssessment(workspace, request, { at });
  const result = artifact.result;
  $('transition-result').dataset.verdict = result.recommendation;
  $('transition-verdict').textContent = { 'would-proceed': 'Would proceed', 'would-hold': 'Would hold', 'would-deny': 'Would deny' }[result.recommendation];
  $('transition-summary').textContent = `Estimated remaining-cost difference: ${fmt(result.deltaMicros)} (stay minus switch). Economic preference: ${result.economicallyPreferred ? 'switch' : 'not established'}. This is a hypothetical comparison, not realised savings.`;
  $('transition-reasons').replaceChildren(...result.reasons.map(reason => el('li', reason)));
  transitionArtifact = artifact;
  $('export-assessment').disabled = false;
  status('transition-status', `Assessment completed at ${at}. No reservation or execution was performed.`);
});

try {
  billingView=mountBilling({getWorkspace:()=>workspace,download,confirmReplacement,onChange:()=>operationsView?.render(),getOperations:()=>operationsView?.exportState()??null,validateOperations:(candidate,workspaceId)=>operationsView.validate(candidate,workspaceId),restoreOperations:candidate=>operationsView?.restore(candidate),savedOperations:()=>operationsView?.markSaved(),commitWorkspace(candidate){workspace=structuredClone(validated(candidate));dirty=true;invalidateTransition();render();}});
  operationsView=mountOperations({getWorkspace:()=>workspace,getBilling:()=>billingView,download,openPanel});
  render(true);
}
catch (error) { status('workspace-status', `The workspace could not initialise: ${error.message}`, true); }
