import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { createAssessment, createDemo, evaluateAssessment, validateAssessment, compareAssessments, toMarkdown } from '../assets/palo-maturity-core.js';
const read = p => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const catalog = read('data/ai-maturity-assessment.json');
const now = '2026-10-21T12:00:00Z';
function complete(level = 3, time = now) {
  const record = createDemo(catalog, time);
  for (const q of catalog.questions) Object.assign(record.responses[q.id], { level, evidenceType: 'independent', evidenceRef: `synthetic://test/${q.id}` });
  return record;
}
test('catalog maps all questions to existing controls and canonical lifecycle gates', () => {
  const controls = new Set(read('data/control-library.json').controls.map(c => c.controlId));
  assert.equal(catalog.questions.length, 22);
  assert.equal(new Set(catalog.questions.map(q => q.id)).size, 22);
  assert.equal(catalog.questions.filter(q => q.domain === 'deployment').length, 6);
  for (const q of catalog.questions) {
    assert.ok(catalog.domains.some(d => d.id === q.domain));
    assert.ok(['frame','classify','assess','control','measure','prove'].includes(q.gate));
    assert.ok(q.controlIds.length && q.controlIds.every(id => controls.has(id)));
    assert.ok(q.evidence && q.action);
  }
});
test('blank assessment remains unresolved, never a zero or a pass', () => {
  const r = evaluateAssessment(createAssessment(catalog, now), catalog, now);
  assert.equal(r.status, 'incomplete'); assert.equal(r.governance.level, null);
  assert.equal(r.deployment.coverage, 0); assert.equal(r.priorities.length, 22);
});
test('higher declared levels are bounded by evidence type', () => {
  const a = complete(4); a.responses.A3.evidenceType = 'documented';
  const r = evaluateAssessment(a, catalog, now);
  assert.equal(r.deployment.level, 4); assert.equal(r.governance.level, 1);
  assert.equal(r.items.find(q => q.id === 'A3').status, 'capped');
  assert.match(r.position, /exceeds/); assert.equal(r.priorities[0].id, 'A3');
});
test('high capability cannot compensate for a critical absence', () => {
  const a = complete(4); a.responses.A3.level = 0;
  const r = evaluateAssessment(a,catalog,now);
  assert.equal(r.governance.level,0); assert.equal(r.deployment.level,4);
});
for (const [title, change] of [
  ['declared-only', a => a.evidenceType = 'declared'],
  ['missing reference', a => a.evidenceRef = ' '],
  ['missing reviewer', a => a.reviewer = ''],
  ['missing rationale', a => a.rationale = ''],
  ['expired', a => a.reviewDue = '2026-10-20'],
  ['future observation', a => a.observedAt = '2026-10-22'],
  ['outside window', a => a.observedAt = '2026-10-19'],
  ['unknown level', a => a.level = null]
]) test(`${title} evidence withholds governance level without hiding deployment`, () => {
  const a=complete(); change(a.responses.E1); const r=evaluateAssessment(a,catalog,now);
  assert.equal(r.governance.level,null); assert.equal(r.deployment.level,3);
  assert.equal(r.governance.answered,15); assert.ok(r.priorities.some(i=>i.id==='E1'));
});
test('inclusive review deadline is current through that UTC date', () => {
  const a=complete(); a.responses.I1.reviewDue='2026-10-21';
  assert.equal(evaluateAssessment(a,catalog,now).governance.level,3);
  assert.equal(evaluateAssessment(a,catalog,'2026-10-22T00:00:00Z').governance.level,null);
});
test('incomplete or reversed scope withholds both lenses', () => {
  const a=complete(); a.scope.owner=''; a.scope.periodStart='2026-10-22';
  const r=evaluateAssessment(a,catalog,now); assert.equal(r.deployment.level,null); assert.equal(r.governance.level,null); assert.ok(r.scopeIssues.length>=2);
});
test('forged computed results do not influence the evaluator', () => {
  const a=createAssessment(catalog,now); a.result={status:'complete',governance:{level:4}};
  assert.equal(evaluateAssessment(a,catalog,now).governance.level,null);
});
test('malformed, unknown and incompatible responses are rejected', () => {
  for (const mutate of [a=>a.responses.A1.level='4',a=>a.responses.A1.level=5,a=>delete a.responses.A1,a=>a.responses.EXTRA={},a=>a.catalogVersion='2.0.0',a=>a.responses.A1.observedAt='2026-02-30',a=>a.scope.unit='nation',a=>a.sources=[]]) {
    const a=complete(); mutate(a); assert.equal(validateAssessment(a,catalog).valid,false);
    assert.throws(()=>evaluateAssessment(a,catalog,now));
  }
});
test('numeric timestamps are compared by time, not serialization',()=>{
  const a=complete(); a.assessedAt='2026-10-21T12:00:00.000Z';
  assert.equal(evaluateAssessment(a,catalog,now).scopeIssues.length,0);
});
test('historical comparison preserves its original evidence freshness', () => {
  const before=complete(2,'2026-09-01T12:00:00Z'); const after=complete(3);
  for (const a of Object.values(before.responses)) a.reviewDue='2026-09-15';
  const r=compareAssessments(after,before,catalog,now);
  assert.equal(r.comparable,true); assert.equal(r.governanceDelta,1);
});
test('different scope, incomplete baseline and reverse chronology cannot claim progress', () => {
  const current=complete(); const before=complete(2,'2026-09-01T12:00:00Z');
  before.scope.boundary='Another business unit'; assert.equal(compareAssessments(current,before,catalog,now).comparable,false);
  before.scope.boundary=current.scope.boundary; before.responses.E1.level=null;
  assert.equal(compareAssessments(current,before,catalog,now).comparable,false);
  assert.equal(compareAssessments(before,current,catalog,now).comparable,false);
});
test('JSON round trip and Markdown retain uncertainty, provenance and inert text', () => {
  const a=createDemo(catalog,now); a.scope.name='<img src=x onerror=alert(1)> [click](javascript:alert(1))';
  assert.equal(a.synthetic,true);
  const round=JSON.parse(JSON.stringify(a)); assert.deepEqual(evaluateAssessment(round,catalog,now),evaluateAssessment(a,catalog,now));
  const report=toMarkdown(a,evaluateAssessment(a,catalog,now),catalog);
  assert.match(report,/Synthetic example/);
  assert.match(report,/Unresolved/); assert.match(report,/9d5164f926ef10/); assert.doesNotMatch(report,/<img/); assert.doesNotMatch(report,/\[click\]\(javascript:/);
});
test('schema accepts exported draft and sample, rejects out-of-range fixture', () => {
  const ajv=new Ajv2020({allErrors:true,strict:true}); addFormats(ajv);
  const validate=ajv.compile(read('schemas/palo-maturity-assessment.schema.json'));
  for(const value of [createAssessment(catalog,now),read('schemas/fixtures/palo-maturity-assessment.valid.json')]) assert.ok(validate(value),JSON.stringify(validate.errors));
  assert.equal(validate(read('schemas/fixtures/palo-maturity-assessment.invalid.json')),false);
});
test('Case File merge preserves unrelated work and adds only draft maturity evidence', () => {
  const context={window:{},URL,Date,Math,Uint32Array}; vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('../assets/palo-case-file.js',import.meta.url),'utf8'),context);
  const api=context.window.PALOCaseFile;
  const a=complete(); const original=api.create({title:'Existing case',context:{purpose:'Keep me'},assessments:[{assessmentId:'old',module:'assessment-path',recordedAt:now,data:{original:true}}]});
  const merged=api.merge(original,{caseId:original.caseId,assessments:[{assessmentId:'new',module:'ai-maturity',recordedAt:now,data:{assessment:a,result:evaluateAssessment(a,catalog,now)}}],evidence:[{evidenceId:'maturity-new',title:'Maturity',kind:'ai-maturity',status:'draft',recordedAt:now}]});
  assert.equal(merged.context.purpose,'Keep me'); assert.equal(merged.assessments.length,2); assert.equal(merged.evidence[0].status,'draft'); assert.ok(api.validate(merged).valid);
});

test('catalog schema rejects invalid evidence caps and domain assignments', () => {
  const ajv = new Ajv2020({ allErrors: true }); addFormats(ajv);
  const validate = ajv.compile(read('schemas/palo-maturity-catalog.schema.json'));
  assert.ok(validate(catalog), JSON.stringify(validate.errors));
  const badCap = structuredClone(catalog); badCap.evidenceTypes.find(e => e.id === 'documented').cap = 4;
  assert.equal(validate(badCap), false);
  const badDomain = structuredClone(catalog); badDomain.questions[0].domain = 'not-a-domain';
  assert.equal(validate(badDomain), false);
});
test('Markdown escapes catalog provenance and includes the assessment identity', () => {
  const c = structuredClone(catalog); c.sources[0].title = '<img src=x onerror=alert(1)>';
  c.sources[0].url = 'https://example.org/[click](javascript:alert(1))';
  const a = createDemo(c, now);
  const report = toMarkdown(a, evaluateAssessment(a,c,now), c);
  assert.doesNotMatch(report, /<img|\[click\]\(javascript:/);
  assert.ok(report.includes(a.assessmentId.replace(/-/g, '\\-')));
});
test('cumulative windows are descriptive and synthetic profiles cannot become operational baselines', () => {
  const previous = complete(2, '2026-10-20T12:00:00Z');
  const current = complete(3); current.scope.periodStart = previous.scope.periodStart;
  assert.equal(compareAssessments(current,previous,catalog,now).comparable,true);
  current.synthetic = false;
  assert.equal(compareAssessments(current,previous,catalog,now).comparable,false);
  assert.match(compareAssessments(current,previous,catalog,now).reasons.join(' '), /Synthetic and operational/);
});
