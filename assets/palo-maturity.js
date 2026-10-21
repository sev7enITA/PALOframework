const STORAGE_KEY = 'palo.maturity.v1';
const MAX_IMPORT_BYTES = 1024 * 1024;
const $ = (id) => document.getElementById(id);
const shortDomainNames = { deployment: 'Deployment', institutional: 'Institutional', authority: 'Authority', behaviour: 'Behaviour', evidence: 'Evidence' };
let catalog, core, assessment, result, baseline = null;
let dirty = false, contentEdited = false, synthetic = false, activeDomain = 'deployment', allActions = false, displayedCaseId = null;
const itemOutputs = new Map();

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function message(value) {
  if (typeof value === 'string') return value;
  return value?.message || value?.issue || JSON.stringify(value);
}

function announce(text, error = false) {
  $('draft-status').textContent = text;
  $('draft-status').style.color = error ? '#9b2e23' : '';
}

function levelText(value) {
  if (value === null || value === undefined) return 'Unknown';
  const level = catalog.levels.find((item) => item.value === value);
  return `${value} / ${level?.label || 'Level'}`;
}

function isSynthetic(record) {
  return record.synthetic === true || record.example === true || /^synthetic\b/i.test(record.scope.name);
}

function markEdited() {
  dirty = true;
  contentEdited = true;
  announce('Changes in this browser tab. Save a local draft to keep them.');
  evaluate();
}

function stampEditedAssessment() {
  if (contentEdited) {
    assessment.assessedAt = new Date().toISOString();
    contentEdited = false;
    evaluate();
  }
}

function confirmReplace() {
  return !dirty || window.confirm('Replace the current assessment? Unsaved changes in this tab will be lost. Export or save a draft first if you need to keep them.');
}

function setAssessment(record, notice) {
  assessment = record;
  synthetic = isSynthetic(record);
  dirty = false;
  contentEdited = false;
  $('demo-notice').hidden = !synthetic;
  for (const key of ['name', 'unit', 'boundary', 'owner', 'periodStart', 'periodEnd']) {
    const control = $(`scope-${key}`);
    if (key === 'unit' && ![...control.options].some((option) => option.value === record.scope[key])) {
      control.append(new Option(record.scope[key], record.scope[key]));
    }
    control.value = record.scope[key] || '';
  }
  renderQuestions();
  evaluate();
  announce(notice);
}

function createField(labelText, control, hint = '') {
  const label = node('label', 'maturity-field');
  label.append(document.createTextNode(labelText), control);
  if (hint) label.append(node('small', '', hint));
  return label;
}

function responseControl(question, key, type, options = {}) {
  const control = node(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
  control.id = `${question.id}-${key}`;
  control.name = `${question.id}-${key}`;
  if (type !== 'select' && type !== 'textarea') control.type = type;
  if (type === 'textarea') control.rows = 3;
  if (type === 'text' || type === 'textarea') control.maxLength = key === 'rationale' ? 8000 : 2000;
  if (options.placeholder) control.placeholder = options.placeholder;
  if (options.options) options.options.forEach(([value, label]) => control.append(new Option(label, value)));
  control.value = assessment.responses[question.id]?.[key] ?? '';
  control.addEventListener(type === 'select' || type === 'date' ? 'change' : 'input', () => {
    assessment.responses[question.id][key] = key === 'level' ? (control.value === '' ? null : Number(control.value)) : control.value;
    markEdited();
  });
  return control;
}

function activateDomain(id, focus = false, revealTab = true) {
  activeDomain = id;
  catalog.domains.forEach((domain) => {
    const selected = domain.id === id;
    const tab = $(`tab-${domain.id}`);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(`panel-${domain.id}`).hidden = !selected;
    if (selected && focus) tab.focus();
  });
  if (revealTab) {
    const tab = $(`tab-${id}`);
    const tabs = $('domain-tabs');
    const tabBox = tab.getBoundingClientRect();
    const tabsBox = tabs.getBoundingClientRect();
    if (tabBox.left < tabsBox.left) tabs.scrollLeft -= tabsBox.left - tabBox.left + 8;
    if (tabBox.right > tabsBox.right) tabs.scrollLeft += tabBox.right - tabsBox.right + 8;
  }
}

function renderQuestions() {
  itemOutputs.clear();
  const tabs = $('domain-tabs');
  const panels = $('domain-panels');
  tabs.replaceChildren();
  panels.replaceChildren();
  catalog.domains.forEach((domain, domainIndex) => {
    const tab = node('button');
    tab.type = 'button';
    tab.id = `tab-${domain.id}`;
    tab.dataset.domain = domain.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `panel-${domain.id}`);
    tab.append(document.createTextNode(shortDomainNames[domain.id] || domain.title), node('span', 'maturity-tab-count', ''));
    tab.addEventListener('click', () => activateDomain(domain.id));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (domainIndex + 1) % catalog.domains.length;
      if (event.key === 'ArrowLeft') next = (domainIndex + catalog.domains.length - 1) % catalog.domains.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = catalog.domains.length - 1;
      if (next !== undefined) { event.preventDefault(); activateDomain(catalog.domains[next].id, true); }
    });
    tabs.append(tab);
    const panel = node('div', 'maturity-domain-panel');
    panel.id = `panel-${domain.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    const intro = node('div', 'maturity-domain-intro');
    intro.append(node('h4', '', domain.title), node('p', '', domain.description));
    panel.append(intro);
    catalog.questions.filter((question) => question.domain === domain.id).forEach((question) => {
      const fieldset = node('fieldset', 'maturity-question');
      fieldset.id = `question-${question.id}`;
      const legend = node('legend');
      legend.append(node('span', 'maturity-question-number', question.id), document.createTextNode(question.title));
      if (question.critical) legend.append(node('span', 'maturity-critical', 'Critical'));
      fieldset.append(legend, node('p', 'maturity-question-prompt', question.prompt));
      const row = node('div', 'maturity-question-row');
      const level = responseControl(question, 'level', 'select', { options: [['', 'Unknown / not assessed'], ...catalog.levels.map((item) => [String(item.value), `${item.value} / ${item.label}`])] });
      const evidence = responseControl(question, 'evidenceType', 'select', { options: catalog.evidenceTypes.map((item) => [item.id, item.label]) });
      row.append(createField('Declared capability', level), createField('Evidence available', evidence));
      fieldset.append(row);
      const details = node('details', 'maturity-evidence-details');
      details.append(node('summary', '', 'Evidence record and review dates'));
      details.append(node('p', 'maturity-evidence-hint', `Suggested evidence: ${Array.isArray(question.evidence) ? question.evidence.join(' ') : question.evidence}`));
      const fields = node('div', 'maturity-field-grid');
      const ref = createField('Evidence reference', responseControl(question, 'evidenceRef', 'text', { placeholder: 'Document ID, record path or URL' }), 'A reviewer-supplied reference. This tool does not open or verify it.');
      ref.classList.add('wide');
      const reviewer = createField('Evidence reviewer', responseControl(question, 'reviewer', 'text', { placeholder: 'Name or responsible function' }));
      reviewer.classList.add('wide');
      const rationale = createField('Rationale and limitations', responseControl(question, 'rationale', 'textarea', { placeholder: 'What supports this level? What remains uncertain?' }));
      rationale.classList.add('wide');
      fields.append(ref, reviewer, createField('Observed on', responseControl(question, 'observedAt', 'date')), createField('Review due', responseControl(question, 'reviewDue', 'date')), rationale);
      details.append(fields);
      fieldset.append(details);
      const output = node('p', 'maturity-question-result');
      output.id = `result-${question.id}`;
      level.setAttribute('aria-describedby', output.id);
      evidence.setAttribute('aria-describedby', output.id);
      itemOutputs.set(question.id, output);
      fieldset.append(output);
      panel.append(fieldset);
    });
    if (domainIndex < catalog.domains.length - 1) {
      const nextRow = node('div', 'maturity-domain-next');
      const next = node('button', 'maturity-button', `Next: ${catalog.domains[domainIndex + 1].title} to`);
      next.type = 'button';
      next.addEventListener('click', () => {
        activateDomain(catalog.domains[domainIndex + 1].id, true);
        $('questions-title').scrollIntoView({ block: 'start' });
      });
      nextRow.append(next);
      panel.append(nextRow);
    }
    panels.append(panel);
  });
  activateDomain(activeDomain);
}

function createScale(title, lens, value) {
  const section = node('section', `maturity-scale ${lens}`);
  const heading = node('div', 'maturity-scale-heading');
  heading.append(node('h4', '', title), node('strong', '', value.level === null ? 'Unknown' : `${value.level} / 4`));
  const track = node('div', `maturity-scale-track${value.level === null ? ' is-unknown' : ''}`);
  track.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 5; i++) track.append(node('span', value.level !== null && i <= value.level ? 'is-filled' : ''));
  const labels = node('div', 'maturity-scale-labels');
  labels.setAttribute('aria-hidden', 'true');
  labels.append(node('span', '', '0 / Absent'), node('span', '', '4 / Challenged'));
  section.append(heading, track, labels, node('p', 'maturity-scale-coverage', `${value.answered} / ${value.total} supported | ${value.coverage}% coverage`));
  return section;
}

function evaluate() {
  result = core.evaluateAssessment(assessment, catalog);
  $('result-scales').replaceChildren(createScale('Deployment capacity', 'deployment', result.deployment), createScale('Governance maturity', 'governance', result.governance));
  $('result-position').textContent = result.position;
  const domains = $('domain-results');
  domains.replaceChildren();
  result.domains.forEach((domain) => {
    const count = $(`tab-${domain.id}`).querySelector('.maturity-tab-count');
    count.textContent = `${domain.answered} / ${domain.total} supported`;
    if (domain.lens !== 'governance') return;
    const line = node('div', 'maturity-domain-result');
    const title = node('span', '', domain.title);
    title.append(node('small', '', `${domain.answered} / ${domain.total} supported`));
    line.append(title, node('strong', '', domain.level === null ? 'Unknown' : `${domain.level} / 4`));
    domains.append(line);
  });
  const issues = [...(result.scopeIssues || []).map((issue) => `Scope: ${message(issue)}`)];
  result.items.forEach((item) => {
    const output = itemOutputs.get(item.id);
    const itemIssues = (item.issues || []).map(message);
    const response = assessment.responses[item.id];
    const untouched = response.level === null && response.evidenceType === 'none' && ['evidenceRef', 'reviewer', 'observedAt', 'reviewDue', 'rationale'].every((key) => !response[key]);
    output.textContent = untouched ? 'Unknown / not assessed. Choose a level and complete the evidence record when ready.' : `Supported: ${levelText(item.supportedLevel)}${itemIssues.length ? `. ${itemIssues.join(' ')}` : '.'}`;
    output.classList.toggle('is-supported', item.supportedLevel !== null && itemIssues.length === 0);
    itemIssues.forEach((issue) => issues.push(`${item.id}: ${issue}`));
  });
  $('gap-count').textContent = `(${issues.length})`;
  $('scope-gaps').replaceChildren(...(issues.length ? issues : ['No scope or evidence gaps detected by this rubric. References still require human verification.']).map((issue) => node('li', '', issue)));
  renderActions();
  renderComparison();
}

function renderActions() {
  const target = $('priority-actions');
  target.replaceChildren();
  if (!result.priorities.length) {
    target.append(node('p', 'maturity-actions-empty', 'No gaps were detected by this rubric. Keep evidence current, repeat independent challenge and review after material change. This is not an assurance approval.'));
    return;
  }
  const list = node('ol', 'maturity-action-list');
  const actions = allActions ? result.priorities : result.priorities.slice(0, 6);
  actions.forEach((item, index) => {
    const row = node('li', 'maturity-action-item');
    const content = node('div');
    const title = node('h3', '', item.title);
    if (item.critical) title.append(node('span', 'maturity-critical', 'Critical'));
    content.append(title, node('p', '', item.action));
    const meta = [item.id, item.gate ? `Gate: ${item.gate}` : '', item.controlIds?.length ? `Controls: ${item.controlIds.join(', ')}` : ''].filter(Boolean).join(' | ');
    content.append(node('p', 'maturity-action-meta', meta));
    const button = node('button', 'maturity-button', `Review ${item.id} ↗`);
    button.type = 'button';
    button.addEventListener('click', () => {
      activateDomain(item.domain);
      $(`question-${item.id}`).scrollIntoView({ block: 'center' });
      $(`${item.id}-level`).focus({ preventScroll: true });
    });
    row.append(node('span', 'maturity-action-index', String(index + 1).padStart(2, '0')), content, button);
    list.append(row);
  });
  target.append(list);
  if (result.priorities.length > 6) {
    const more = node('button', 'maturity-button maturity-more-actions', allActions ? 'Show first 6 actions' : `Show all ${result.priorities.length} actions`);
    more.type = 'button';
    more.setAttribute('aria-expanded', String(allActions));
    more.addEventListener('click', () => { allActions = !allActions; renderActions(); });
    target.append(more);
  }
}

function renderComparison() {
  $('clear-baseline').hidden = !baseline;
  if (!baseline) { $('baseline-result').textContent = 'No previous assessment loaded.'; return; }
  const comparison = core.compareAssessments(assessment, baseline, catalog);
  if (!comparison.comparable) {
    $('baseline-result').textContent = `Not comparable. ${comparison.reasons.map(message).join(' ')}`;
    return;
  }
  const delta = (value) => value === null ? 'unknown' : `${value > 0 ? '+' : ''}${value} level${Math.abs(value) === 1 ? '' : 's'}`;
  $('baseline-result').textContent = `Compared with ${baseline.scope.name}: deployment ${delta(comparison.deploymentDelta)}; governance ${delta(comparison.governanceDelta)}. Ordinal change is not a measurement of impact.`;
}

function validationError(record) {
  const check = core.validateAssessment(record, catalog);
  if (!check.valid) throw new Error(check.errors.map(message).join(' '));
}

function normalizedAssessment(record) {
  const clean = core.createAssessment(catalog, record.assessedAt);
  clean.assessmentId = record.assessmentId;
  for (const key of Object.keys(clean.scope)) clean.scope[key] = record.scope[key];
  for (const question of catalog.questions) {
    for (const key of Object.keys(clean.responses[question.id])) clean.responses[question.id][key] = record.responses[question.id][key];
  }
  if (isSynthetic(record)) clean.synthetic = true;
  return clean;
}

async function readAssessment(file) {
  if (!file) return null;
  if (file.size > MAX_IMPORT_BYTES) throw new Error('The file exceeds the 1 MB import limit.');
  let record;
  try { record = JSON.parse(await file.text()); } catch { throw new Error('The file is not valid JSON.'); }
  validationError(record);
  return normalizedAssessment(record);
}

function download(content, type, extension) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = node('a');
  link.href = url;
  link.download = `palo-ai-maturity-${new Date().toISOString().slice(0, 10)}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readCurrentCase() {
  const api = window.PALOCaseFile;
  let raw;
  try { raw = localStorage.getItem(api.storageKeys.caseFile); }
  catch { throw new Error('Browser storage cannot be read. Export this assessment to keep a copy; Case File attachment is unavailable.'); }
  const current = api.load();
  if (raw !== null && !current) throw new Error('An existing Case File could not be read or validated. Attachment is blocked to preserve its stored data. Review the existing file before retrying; no data has been changed.');
  return current;
}

function updateCaseContext() {
  if (!window.PALOCaseFile) {
    $('case-file-context').textContent = 'Case File support is unavailable. Export this assessment to keep a copy.';
    $('attach-case').disabled = true;
    return;
  }
  try {
    const current = readCurrentCase();
    displayedCaseId = current?.caseId || null;
    $('attach-case').disabled = false;
    $('case-file-context').textContent = current ? `Current Case File: ${current.title}` : 'No current Case File. Attaching will create a named assessment case in this browser.';
    $('attach-case').textContent = current ? 'Attach to current Case File' : 'Create Case File and attach';
  } catch (error) {
    displayedCaseId = undefined;
    $('case-file-context').textContent = error.message;
    $('attach-case').disabled = true;
    $('attach-case').textContent = 'Case File attachment unavailable';
  }
}

function attachCase() {
  try {
    stampEditedAssessment();
    validationError(assessment);
    const api = window.PALOCaseFile;
    let current = readCurrentCase();
    if ((current?.caseId || null) !== displayedCaseId) {
      updateCaseContext();
      $('case-file-status').textContent = 'The current Case File changed. Review its title above, then attach again.';
      return;
    }
    const stamp = new Date().toISOString();
    if (!current) current = api.create({ title: `AI maturity: ${assessment.scope.name.trim() || 'Untitled assessment'}`, owner: assessment.scope.owner });
    const unique = `${assessment.assessmentId}-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;
    const snapshot = { assessmentId: unique, module: 'ai-maturity', recordedAt: stamp, data: { assessment: structuredClone(assessment), result: core.evaluateAssessment(assessment, catalog) } };
    const merged = api.merge(current, { assessments: [snapshot], evidence: [{ evidenceId: `evidence-${unique}`, title: `AI maturity review: ${assessment.scope.name || 'Untitled assessment'}`, kind: 'ai-maturity-assessment', status: 'draft', recordedAt: stamp, content: { assessmentId: unique, disclaimer: result.disclaimer } }] });
    const saved = api.save(merged);
    if (!saved.ok) throw new Error((saved.errors || []).map(message).join(' '));
    updateCaseContext();
    $('case-file-status').textContent = 'Draft snapshot attached. Previous snapshots and case context are preserved.';
  } catch (error) {
    $('case-file-status').textContent = `Could not attach the draft: ${error.message}`;
    updateCaseContext();
  }
}

function bindEvents() {
  $('assessment-form').addEventListener('submit', (event) => event.preventDefault());
  for (const key of ['name', 'unit', 'boundary', 'owner', 'periodStart', 'periodEnd']) {
    $(`scope-${key}`).addEventListener(key === 'unit' || key.startsWith('period') ? 'change' : 'input', (event) => {
      assessment.scope[key] = event.target.value;
      markEdited();
    });
  }
  $('save-draft').addEventListener('click', () => {
    try {
      stampEditedAssessment();
      validationError(assessment);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assessment));
      dirty = false;
      $('load-draft').hidden = false;
      announce(`Draft saved locally at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. The Case File is unchanged.`);
    } catch (error) { announce(`Draft could not be saved: ${error.message} Export JSON to keep a copy.`, true); }
  });
  $('load-draft').addEventListener('click', () => {
    try {
      const text = localStorage.getItem(STORAGE_KEY);
      if (!text) throw new Error('No saved draft was found.');
      if (text.length > MAX_IMPORT_BYTES) throw new Error('The saved draft exceeds the size limit.');
      const record = JSON.parse(text);
      validationError(record);
      if (confirmReplace()) setAssessment(normalizedAssessment(record), 'Saved draft restored. The current Case File is unchanged.');
    } catch (error) { announce(`Draft could not be restored: ${error.message}`, true); }
  });
  $('load-demo').addEventListener('click', () => {
    if (!confirmReplace()) return;
    setAssessment(core.createDemo(catalog), 'Synthetic example loaded. No real organization or system is assessed.');
    assessment.synthetic = true;
    synthetic = true;
    $('demo-notice').hidden = false;
    dirty = true;
  });
  $('reset-assessment').addEventListener('click', () => {
    if (!confirmReplace()) return;
    baseline = null;
    allActions = false;
    activeDomain = 'deployment';
    setAssessment(core.createAssessment(catalog), 'New assessment. Your saved local draft and Case File are unchanged.');
  });
  $('import-assessment').addEventListener('change', async (event) => {
    try {
      const record = await readAssessment(event.target.files[0]);
      if (record && confirmReplace()) {
        setAssessment(record, 'Assessment imported and recalculated with the current catalog. Save to keep a local draft.');
        dirty = true;
      }
    } catch (error) { announce(`Import rejected: ${error.message}`, true); }
    finally { event.target.value = ''; }
  });
  $('import-baseline').addEventListener('change', async (event) => {
    try {
      const record = await readAssessment(event.target.files[0]);
      if (record) { baseline = record; renderComparison(); }
    } catch (error) { $('baseline-result').textContent = `Previous assessment rejected: ${error.message}`; }
    finally { event.target.value = ''; }
  });
  $('clear-baseline').addEventListener('click', () => { baseline = null; renderComparison(); });
  $('export-json').addEventListener('click', () => {
    try { stampEditedAssessment(); validationError(assessment); download(`${JSON.stringify(assessment, null, 2)}\n`, 'application/json', 'json'); renderComparison(); }
    catch (error) { announce(`Export failed: ${error.message}`, true); }
  });
  $('export-markdown').addEventListener('click', () => {
    try { stampEditedAssessment(); validationError(assessment); result = core.evaluateAssessment(assessment, catalog); download(core.toMarkdown(assessment, result, catalog), 'text/markdown;charset=utf-8', 'md'); renderComparison(); }
    catch (error) { announce(`Export failed: ${error.message}`, true); }
  });
  $('attach-case').addEventListener('click', attachCase);
  window.addEventListener('storage', (event) => {
    if (event.key === 'palo.case-file.v1') { updateCaseContext(); $('case-file-status').textContent = 'Current Case File updated in another tab. Review its title before attaching.'; }
  });
}

function setupReviewGuidance() {
  const definitions = $('level-definitions');
  const levels = [{ value: null, label: 'Unknown', description: 'Not assessed or not yet supported. Missing evidence is never treated as evidence of absence.' }, ...catalog.levels];
  levels.forEach((level) => {
    const row = node('div');
    row.append(node('dt', '', `${level.value === null ? '' : `${level.value} / `}${level.label}`), node('dd', '', level.description));
    definitions.append(row);
  });
  const profile = $('assessment-profile');
  const updateStickiness = () => profile.classList.toggle('can-stick', window.innerWidth > 780 && profile.scrollHeight <= window.innerHeight - 40);
  if (window.ResizeObserver) new ResizeObserver(updateStickiness).observe(profile);
  window.addEventListener('resize', updateStickiness);
  updateStickiness();
}

async function init() {
  try {
    const [api, response] = await Promise.all([import('./palo-maturity-core.js'), fetch('data/ai-maturity-assessment.json', { credentials: 'same-origin' })]);
    if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
    catalog = await response.json();
    core = api;
    setAssessment(core.createAssessment(catalog), 'New assessment. Not saved locally.');
    bindEvents();
    setupReviewGuidance();
    updateCaseContext();
    try {
      if (localStorage.getItem(STORAGE_KEY)) {
        $('load-draft').hidden = false;
        announce('A local draft is available. Choose Restore saved draft to open it. Your current Case File is unchanged.');
      }
    } catch { announce('Browser storage is unavailable. You can still assess and export JSON.', true); }
    $('maturity-loading').hidden = true;
    $('maturity-app').hidden = false;
  } catch (error) {
    $('maturity-loading').hidden = true;
    const target = $('maturity-error');
    target.hidden = false;
    target.append(document.createTextNode(`The assessment could not load. ${error.message} `));
    const retry = node('button', 'maturity-button', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', () => window.location.reload());
    target.append(retry);
  }
}

init();
