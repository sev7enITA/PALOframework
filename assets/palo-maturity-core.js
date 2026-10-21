// Pure, shared assessment logic. Evidence references are assertions, never fetched or verified here.
export const VERSION = '1.0.0';
export const DISCLAIMER = 'Experimental PALO self-assessment. Evidence references and reviewer identities are user assertions, not independently verified by this tool. No certification, national ranking, legal conclusion or authority to deploy or execute.';
const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const stamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/.test(value) && day(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
const text = value => typeof value === 'string' && value.trim().length > 0;

export function createAssessment(catalog, now = new Date().toISOString()) {
  if (!stamp(now)) throw new Error('Invalid assessment time');
  const today = now.slice(0, 10);
  return {
    format: 'palo-maturity-assessment', schemaVersion: VERSION, catalogVersion: catalog.version,
    assessmentId: `maturity-${globalThis.crypto?.randomUUID?.() || `${Date.parse(now)}-${Math.random().toString(36).slice(2)}`}`,
    assessedAt: now,
    scope: { name: '', unit: 'organization', boundary: '', owner: '', periodStart: today, periodEnd: today },
    responses: Object.fromEntries(catalog.questions.map(q => [q.id, {
      level: null, evidenceType: 'none', evidenceRef: '', reviewer: '', observedAt: '', reviewDue: '', rationale: ''
    }])),
    sources: copy(catalog.sources)
  };
}

export function validateAssessment(record, catalog) {
  const errors = [];
  if (!object(record)) return { valid: false, errors: ['Assessment must be an object.'] };
  if (record.format !== 'palo-maturity-assessment' || record.schemaVersion !== VERSION || record.catalogVersion !== catalog.version) errors.push('Unsupported assessment format, schema or catalog version.');
  if (!text(record.assessmentId) || record.assessmentId.length > 200) errors.push('Invalid assessment identifier.');
  if (!stamp(record.assessedAt)) errors.push('Invalid assessment timestamp.');
  if (record.synthetic !== undefined && typeof record.synthetic !== 'boolean') errors.push('Synthetic marker must be boolean.');
  if (!Array.isArray(record.sources) || !catalog.sources.every(s => record.sources.some(r => object(r) && r.sourceId === s.sourceId && r.url === s.url && r.sha256 === s.sha256))) errors.push('Missing or mismatched methodology source references.');
  if (!object(record.scope)) errors.push('Scope must be an object.');
  else {
    for (const key of ['name', 'unit', 'boundary', 'owner', 'periodStart', 'periodEnd']) {
      if (typeof record.scope[key] !== 'string' || record.scope[key].length > 4000) errors.push(`Invalid scope.${key}.`);
    }
    if (!['organization', 'institution', 'system'].includes(record.scope.unit)) errors.push('Scope unit must be organization, institution or system; national rankings are out of scope.');
    for (const key of ['periodStart', 'periodEnd']) if (record.scope[key] && !day(record.scope[key])) errors.push(`Invalid scope.${key} date.`);
  }
  if (!object(record.responses)) errors.push('Responses must be an object.');
  else {
    const ids = new Set(catalog.questions.map(q => q.id));
    for (const id of Object.keys(record.responses)) if (!ids.has(id)) errors.push(`Unknown question: ${id}.`);
    for (const q of catalog.questions) {
      const answer = record.responses[q.id];
      if (!object(answer)) { errors.push(`Missing response: ${q.id}.`); continue; }
      if (answer.level !== null && (!Number.isInteger(answer.level) || answer.level < 0 || answer.level > 4)) errors.push(`Invalid level: ${q.id}.`);
      if (!catalog.evidenceTypes.some(e => e.id === answer.evidenceType)) errors.push(`Invalid evidence type: ${q.id}.`);
      for (const key of ['evidenceRef', 'reviewer', 'observedAt', 'reviewDue', 'rationale']) {
        if (typeof answer[key] !== 'string' || answer[key].length > 8000) errors.push(`Invalid ${q.id}.${key}.`);
      }
      for (const key of ['observedAt', 'reviewDue']) if (answer[key] && !day(answer[key])) errors.push(`Invalid ${q.id}.${key} date.`);
    }
  }
  // Imported results, HTML and unknown fields are never used to calculate findings.
  return { valid: errors.length === 0, errors };
}

export function evaluateAssessment(record, catalog, now = new Date().toISOString()) {
  const validation = validateAssessment(record, catalog);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  if (!stamp(now)) throw new Error('Invalid evaluation timestamp.');
  const today = now.slice(0, 10);
  const scopeIssues = [];
  for (const key of ['name', 'boundary', 'owner', 'periodStart', 'periodEnd']) if (!text(record.scope[key])) scopeIssues.push(`Define scope ${key}.`);
  if (Date.parse(record.assessedAt) > Date.parse(now)) scopeIssues.push('Assessment timestamp is in the future.');
  if (record.scope.periodStart > record.scope.periodEnd) scopeIssues.push('Observation period ends before it starts.');
  if (record.scope.periodEnd > today) scopeIssues.push('Observation period ends in the future.');
  const items = catalog.questions.map(q => {
    const a = record.responses[q.id];
    const domain = catalog.domains.find(d => d.id === q.domain);
    const cap = catalog.evidenceTypes.find(e => e.id === a.evidenceType).cap;
    const issues = [];
    if (a.level === null) issues.push('No level assessed.');
    if (cap === null) issues.push('No supporting evidence beyond a declaration.');
    if (!text(a.evidenceRef)) issues.push('Missing retrievable evidence reference.');
    if (!text(a.reviewer)) issues.push('Missing accountable evidence reviewer.');
    if (!text(a.rationale)) issues.push('Explain the evidence, test scope and limitations.');
    if (!day(a.observedAt)) issues.push('Missing observation date.');
    if (!day(a.reviewDue)) issues.push('Missing review deadline.');
    if (a.observedAt > today) issues.push('Observation is in the future.');
    if (a.reviewDue && a.reviewDue < today) issues.push('Evidence review is overdue.');
    if (a.reviewDue && a.observedAt && a.reviewDue < a.observedAt) issues.push('Review deadline precedes observation.');
    if (a.observedAt && (a.observedAt < record.scope.periodStart || a.observedAt > record.scope.periodEnd)) issues.push('Observation is outside the assessed period.');
    let supportedLevel = issues.length || a.level === null ? null : Math.min(a.level, cap);
    const capped = supportedLevel !== null && supportedLevel < a.level;
    if (capped) issues.push(`Evidence type supports at most level ${cap}.`);
    return { id: q.id, title: q.title, domain: q.domain, lens: domain.lens, declaredLevel: a.level,
      supportedLevel, status: supportedLevel === null ? 'unresolved' : capped ? 'capped' : 'evidence-referenced',
      issues, critical: q.critical, action: q.action, gate: q.gate, controlIds: [...q.controlIds] };
  });
  function summarize(selected) {
    const answered = selected.filter(i => i.supportedLevel !== null).length;
    return { level: !scopeIssues.length && answered === selected.length && answered > 0 ? Math.min(...selected.map(i => i.supportedLevel)) : null,
      coverage: selected.length ? Math.round(answered * 100 / selected.length) : 0, answered, total: selected.length };
  }
  const domains = catalog.domains.map(d => ({ id: d.id, title: d.title, lens: d.lens, ...summarize(items.filter(i => i.domain === d.id)) }));
  const deployment = summarize(items.filter(i => i.lens === 'deployment'));
  const governance = summarize(items.filter(i => i.lens === 'governance'));
  const complete = deployment.level !== null && governance.level !== null;
  let position = 'Incomplete evidence: resolve gaps before comparing the two lenses.';
  if (complete) {
    if (deployment.level > governance.level) position = 'Deployment capability exceeds supported governance: prioritize governance gaps.';
    else if (governance.level > deployment.level) position = 'Governance evidence is ahead of deployment capability: build operational capability within the assessed controls.';
    else position = deployment.level >= 2 ? 'Both lenses have the same supported level. This is a scoped self-assessment, not approval to scale.' : 'Both lenses remain foundational: strengthen capability and governance together.';
  }
  const priorities = items.filter(i => i.supportedLevel === null || i.supportedLevel < 2 || i.status === 'capped')
    .sort((a, b) => Number(b.critical) - Number(a.critical) || (a.supportedLevel ?? -1) - (b.supportedLevel ?? -1));
  return { evaluatedAt: now, status: complete ? 'complete' : 'incomplete', scopeIssues, deployment, governance, domains, items, priorities, position, disclaimer: DISCLAIMER };
}

export function compareAssessments(current, previous, catalog, now = new Date().toISOString()) {
  const reasons = [];
  for (const [name, record] of [['Current', current], ['Previous', previous]]) {
    const v = validateAssessment(record, catalog);
    if (!v.valid) reasons.push(`${name}: ${v.errors.join(' ')}`);
  }
  if (!reasons.length) {
    if (Boolean(current.synthetic) !== Boolean(previous.synthetic)) reasons.push('Synthetic and operational profiles cannot be compared.');
    for (const key of ['name', 'unit', 'boundary']) if (current.scope[key].trim() !== previous.scope[key].trim()) reasons.push(`Scope ${key} differs.`);
    if (Date.parse(current.assessedAt) <= Date.parse(previous.assessedAt)) reasons.push('Current assessment must be later than the previous assessment.');
    if (current.scope.periodStart < previous.scope.periodStart || current.scope.periodEnd <= previous.scope.periodEnd) reasons.push('Current observation window must move forward.');
  }
  if (reasons.length) return { comparable: false, reasons, deploymentDelta: null, governanceDelta: null };
  const a = evaluateAssessment(current, catalog, now);
  const b = evaluateAssessment(previous, catalog, previous.assessedAt);
  if (a.status !== 'complete' || b.status !== 'complete') reasons.push('Both profiles need complete scoped evidence. Historical evidence is evaluated as of its assessment date.');
  return { comparable: !reasons.length, reasons, deploymentDelta: reasons.length ? null : a.deployment.level - b.deployment.level,
    governanceDelta: reasons.length ? null : a.governance.level - b.governance.level };
}

// Plain text escaping keeps imported/user content inert in Markdown renderers.
const md = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_{}\[\]()#+.!|~-]/g, '\\$&').replace(/[\r\n]+/g, ' ');
export function toMarkdown(record, result, catalog) {
  const lines = ['# PALO Two-Lens AI Maturity Assessment', '', `Catalog: ${md(catalog.version)} | Assessed: ${md(record.assessedAt)} | Evaluated: ${md(result.evaluatedAt)}`,
    '', `Assessment ID: ${md(record.assessmentId)}`, `Scope: ${md(record.scope.name)} (${md(record.scope.unit)})`, `Boundary: ${md(record.scope.boundary)}`, `Owner: ${md(record.scope.owner)}`,
    `Period: ${md(record.scope.periodStart)} to ${md(record.scope.periodEnd)}`, '', ...(record.synthetic ? ['**Synthetic example. This is fictional data, not operational evidence.**', ''] : []), DISCLAIMER, '', `**${md(result.position)}**`, '',
    ...result.scopeIssues.map(i => `- ${md(i)}`), '', '| Lens / domain | Supported level (0-4) | Evidence coverage |', '| --- | --- | --- |',
    ...[{ title: 'Deployment', ...result.deployment }, { title: 'Governance', ...result.governance }, ...result.domains.filter(d => d.lens === 'governance')]
      .map(d => `| ${md(d.title)} | ${d.level ?? 'Unresolved'} | ${d.answered}/${d.total} |`), '',
    'Levels are ordinal minima across all items in scope. No averaging, weighting, missing-data imputation or deployment permission. Evidence is referenced by the assessor, not authenticated by this tool.', '', '## Review priorities', '',
    ...result.priorities.map(i => `- ${i.id} ${md(i.title)}${i.critical ? ' (critical)' : ''}: ${md(i.action)} Gate: ${md(i.gate)}. Controls: ${i.controlIds.map(md).join(', ')}.`), '', '## Response and evidence register', ''];
  for (const item of result.items) {
    const a = record.responses[item.id];
    lines.push(`### ${item.id}: ${md(item.title)}`, '', `Declared: ${a.level ?? 'Unknown'} | Supported: ${item.supportedLevel ?? 'Unresolved'} | Evidence type: ${md(a.evidenceType)}`,
      `Reference: ${md(a.evidenceRef)}`, `Reviewer: ${md(a.reviewer)} | Observed: ${md(a.observedAt)} | Review due: ${md(a.reviewDue)}`,
      `Rationale and limits: ${md(a.rationale)}`, ...item.issues.map(i => `- ${md(i)}`), '');
  }
  lines.push('## Methodology provenance', '', ...catalog.sources.map(s => `- ${md(s.title)}: ${md(s.url)}${s.sha256 ? ` | Source PDF SHA-256: ${md(s.sha256)}` : ''}`));
  return lines.join('\n') + '\n';
}

export function createDemo(catalog, now = new Date().toISOString()) {
  const record = createAssessment(catalog, now);
  record.synthetic = true;
  record.scope = { ...record.scope, name: 'Synthetic procurement assistant', boundary: 'Fictional internal procurement workflow, no live transactions', owner: 'Synthetic review team' };
  const due = new Date(Date.parse(now) + 30 * 86400000).toISOString().slice(0, 10);
  for (const q of catalog.questions) record.responses[q.id] = {
    level: q.domain === 'deployment' ? 3 : 2, evidenceType: q.domain === 'deployment' ? 'monitored' : 'tested',
    evidenceRef: `synthetic://maturity/${q.id}`, reviewer: 'Synthetic reviewer', observedAt: now.slice(0, 10), reviewDue: due,
    rationale: 'Fictional demonstration of the scoring rule. This record is not real operational evidence.'
  };
  record.responses.A3.level = 1;
  record.responses.A3.evidenceType = 'documented';
  record.responses.E3 = { ...record.responses.E3, level: null, evidenceType: 'none', evidenceRef: '' };
  return record;
}
