import { access, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import { HtmlValidate } from "html-validate";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { PUBLIC_FILES, PUBLIC_GENERATED_HTML, PUBLIC_HTML, PUBLIC_SOURCE_HTML } from "./public-files.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootArgument = process.argv[process.argv.indexOf("--root") + 1] || ".";
const validationRoot = path.resolve(projectRoot, rootArgument);
const built = process.argv.includes("--built");
const errors = [];
const htmlByFile = new Map();
const idsByFile = new Map();
const origin = "https://paloframework.org";
const xmlParser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });
const htmlValidator = new HtmlValidate({
  rules: {
    "missing-doctype": "error",
    "no-dup-attr": "error"
  }
});
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
let caseFileValidator;
let p2Counts = null;
const privatePublicationPaths = [
  "docs/ASSESSMENT-v3.0.md",
  "insights/WEBUILD.docx",
  "insights/2026TrendOutlookReports.pdf",
  "insights/Accenture-Strategy-Macro-Foresight-Brief-2026-Top-10-Trends.pdf",
  "insights/GIRST - bias-3.pdf",
  "insights/gartner-2026-top-tech-trends.pdf",
  "insights/mckinsey-technology-trends-outlook-2025.pdf",
  "insights/geopolitical-forces-shaping-business-in-2026.pdf",
  "insights/pwdreport.txt",
  "insights/toptrends2026.txt"
];

const asArray = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const normalizePath = (value) => value.split(path.sep).join("/");
const decode = (value) => {
  try { return decodeURIComponent(value); } catch { return value; }
};
const lineFor = (content, index) => content.slice(0, index).split("\n").length;
const report = (file, message, index = 0) => errors.push(`${file}:${lineFor(htmlByFile.get(file) || "", index)} ${message}`);

function urlToPublicPath(url) {
  let pathname = decode(url.pathname);
  if (pathname === "/") return "index.html";
  pathname = pathname.replace(/^\//, "");
  if (pathname.endsWith("/")) pathname += "index.html";
  return pathname;
}

function resolveLocalReference(fromFile, reference) {
  const cleanReference = reference.replace(/&amp;/g, "&");
  if (/^(?:[a-z]+:|\/\/)/i.test(cleanReference)) return null;
  const [pathnamePart, fragment = ""] = cleanReference.split("#", 2);
  const pathnameWithoutQuery = pathnamePart.split("?", 1)[0];
  let target;
  if (!pathnameWithoutQuery) target = fromFile;
  else if (pathnameWithoutQuery.startsWith("/")) target = decode(pathnameWithoutQuery.slice(1));
  else target = normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), decode(pathnameWithoutQuery))));
  if (target.endsWith("/")) target += "index.html";
  return { fragment: decode(fragment), target };
}

function parseXml(file, content) {
  try { return xmlParser.parse(content); }
  catch (error) {
    report(file, `invalid XML: ${error.message}`);
    return {};
  }
}

for (const relativePath of PUBLIC_FILES) {
  try { await access(path.join(validationRoot, relativePath)); }
  catch { errors.push(`${relativePath}: allowlisted public file is missing`); }
}
for (const relativePath of privatePublicationPaths) {
  if (PUBLIC_FILES.includes(relativePath)) errors.push(`${relativePath}: private or third-party research input must not be allowlisted`);
}

async function validateP1Fixtures() {
  const caseSchema = JSON.parse(await readFile(path.join(validationRoot, "schemas/palo-case-file.schema.json"), "utf8"));
  const bundleSchema = JSON.parse(await readFile(path.join(validationRoot, "schemas/palo-evidence-bundle.schema.json"), "utf8"));
  const localReceiptSchema = JSON.parse(await readFile(path.join(validationRoot, "schemas/palo-local-validation-receipt.schema.json"), "utf8"));
  const agenticSchema = JSON.parse(await readFile(path.join(validationRoot, "schemas/palo-agentic-interface.schema.json"), "utf8"));
  ajv.addSchema(caseSchema);
  ajv.addSchema(agenticSchema);
  const validators = {
    "palo-case-file": ajv.getSchema(caseSchema.$id),
    "palo-evidence-bundle": ajv.compile(bundleSchema),
    "palo-agentic-interface": ajv.getSchema(agenticSchema.$id)
  };
  caseFileValidator = validators["palo-case-file"];
  ajv.compile(localReceiptSchema);
  for (const [name, validator] of Object.entries(validators)) {
    for (const expectation of ["valid", "invalid"]) {
      const file = `schemas/fixtures/${name}.${expectation}.json`;
      const fixture = JSON.parse(await readFile(path.join(validationRoot, file), "utf8"));
      const result = validator(fixture);
      if (expectation === "valid" && !result) errors.push(`${file}: expected valid fixture failed schema: ${ajv.errorsText(validator.errors)}`);
      if (expectation === "invalid" && result) errors.push(`${file}: intentionally invalid fixture unexpectedly passed schema`);
    }
  }
  const goldCases = [
    "evidence-pack/cases/agentic-invoice-exception.case.json",
    "evidence-pack/cases/hr-learning-assistant.case.json",
    "evidence-pack/cases/procurement-bid-summary.case.json"
  ];
  for (const file of goldCases) {
    const fixture = JSON.parse(await readFile(path.join(validationRoot, file), "utf8"));
    if (!caseFileValidator(fixture)) errors.push(`${file}: gold case failed PALO Case File schema: ${ajv.errorsText(caseFileValidator.errors)}`);
    if (fixture.context?.goldCase !== true || !Number.isInteger(fixture.context?.completionMinutes) || fixture.context.completionMinutes >= 10) errors.push(`${file}: gold case must declare goldCase=true and completionMinutes below 10`);
    if (!fixture.context?.declaredAuthority?.allowed?.length || !fixture.context?.declaredAuthority?.prohibited?.length || !fixture.context?.verificationMethod) errors.push(`${file}: gold case must declare allowed/prohibited authority and an independent verification method`);
  }
  const definitions = JSON.parse(await readFile(path.join(validationRoot, "data/p1-governance-definitions.json"), "utf8"));
  if (definitions.schemaVersion !== "1.0.0" || !Array.isArray(definitions.triggers) || !definitions.triggers.length) errors.push("data/p1-governance-definitions.json: requires v1 definitions and at least one trigger");
  const triggerIds = new Set();
  for (const trigger of definitions.triggers || []) {
    if (!trigger.triggerId || triggerIds.has(trigger.triggerId) || !Array.isArray(trigger.reopenGates) || !trigger.reopenGates.length) errors.push("data/p1-governance-definitions.json: trigger ids must be unique and reopen at least one gate");
    triggerIds.add(trigger.triggerId);
  }
}

try { await validateP1Fixtures(); }
catch (error) { errors.push(`P1 schema validation failed: ${error.message}`); }

async function validateP2Artifacts() {
  const loadJson = async (file) => JSON.parse(await readFile(path.join(validationRoot, file), "utf8"));
  const schemaFiles = {
    controls: "schemas/palo-control-library.schema.json",
    indicators: "schemas/palo-kpi-kri-registry.schema.json",
    gates: "schemas/palo-decision-gates.schema.json",
    sources: "schemas/palo-source-registry.schema.json",
    index: "schemas/palo-p2-index.schema.json",
    signal: "schemas/policywatcher-signal.schema.json",
    policyInput: "schemas/palo-policy-input.schema.json"
  };
  const dataFiles = {
    controls: "data/control-library.json",
    indicators: "data/kpi-kri-registry.json",
    gates: "data/decision-gates.json",
    sources: "data/source-registry.json",
    index: "data/p2-adoption-index.json",
    policyInput: "examples/policy-as-code/decision-gate-input.example.json"
  };
  const schemas = {};
  const data = {};
  for (const [name, file] of Object.entries(schemaFiles)) schemas[name] = await loadJson(file);
  for (const [name, file] of Object.entries(dataFiles)) data[name] = await loadJson(file);

  const schemaForData = { controls: "controls", indicators: "indicators", gates: "gates", sources: "sources", index: "index", policyInput: "policyInput" };
  for (const [name, schemaName] of Object.entries(schemaForData)) {
    const validator = ajv.compile(schemas[schemaName]);
    if (!validator(data[name])) errors.push(`${dataFiles[name]}: schema validation failed: ${ajv.errorsText(validator.errors)}`);
  }

  const uniqueIds = (file, records, key) => {
    const ids = new Set();
    for (const record of records) {
      if (ids.has(record[key])) errors.push(`${file}: duplicate ${key} ${record[key]}`);
      ids.add(record[key]);
    }
    return ids;
  };
  const controlIds = uniqueIds(dataFiles.controls, data.controls.controls, "controlId");
  const indicatorIds = uniqueIds(dataFiles.indicators, data.indicators.indicators, "indicatorId");
  const gateIds = uniqueIds(dataFiles.gates, data.gates.gates, "gateId");
  const sourceIds = uniqueIds(dataFiles.sources, data.sources.sources, "sourceId");
  const templateIds = uniqueIds(dataFiles.index, data.index.templates, "templateId");
  uniqueIds(dataFiles.index, data.index.artifacts, "artifactId");
  uniqueIds(dataFiles.index, data.index.workedCases, "caseId");

  const checkRefs = (file, ownerId, values, available, kind) => {
    for (const value of values || []) if (!available.has(value)) errors.push(`${file}: ${ownerId} references missing ${kind} ${value}`);
  };
  for (const control of data.controls.controls) {
    checkRefs(dataFiles.controls, control.controlId, control.lifecycleGates, gateIds, "gate");
    checkRefs(dataFiles.controls, control.controlId, control.indicatorIds, indicatorIds, "indicator");
    checkRefs(dataFiles.controls, control.controlId, control.sourceIds, sourceIds, "source");
    checkRefs(dataFiles.controls, control.controlId, control.templateIds, templateIds, "template");
  }
  for (const indicator of data.indicators.indicators) {
    checkRefs(dataFiles.indicators, indicator.indicatorId, indicator.controlIds, controlIds, "control");
    checkRefs(dataFiles.indicators, indicator.indicatorId, indicator.gateIds, gateIds, "gate");
    checkRefs(dataFiles.indicators, indicator.indicatorId, indicator.sourceIds, sourceIds, "source");
  }
  for (const gate of data.gates.gates) {
    checkRefs(dataFiles.gates, gate.gateId, gate.requiredControlIds, controlIds, "control");
    checkRefs(dataFiles.gates, gate.gateId, gate.conditionalControlIds, controlIds, "conditional control");
    checkRefs(dataFiles.gates, gate.gateId, gate.indicatorIds, indicatorIds, "indicator");
    checkRefs(dataFiles.gates, gate.gateId, gate.sourceIds, sourceIds, "source");
    checkRefs(dataFiles.gates, gate.gateId, gate.templateIds, templateIds, "template");
  }

  const sorted = (values) => [...values].sort().join("|");
  for (const entry of data.index.templates) {
    await access(path.join(validationRoot, entry.path));
    checkRefs(dataFiles.index, entry.templateId, entry.gateIds, gateIds, "gate");
  }
  for (const entry of data.index.artifacts) {
    await access(path.join(validationRoot, entry.path));
    await access(path.join(validationRoot, entry.schemaPath));
  }
  for (const entry of data.index.workedCases) {
    const fixture = await loadJson(entry.path);
    if (!caseFileValidator?.(fixture)) errors.push(`${entry.path}: worked case failed P1 Case File schema: ${ajv.errorsText(caseFileValidator?.errors)}`);
    if (fixture.caseId !== entry.caseId) errors.push(`${entry.path}: caseId does not match P2 index`);
    if (fixture.context?.exampleStatus !== "educational-non-production" || !fixture.context?.sourceStatus) errors.push(`${entry.path}: worked case requires educational status and source-status note`);
    const refs = fixture.context?.p2References || {};
    for (const [field, available, kind] of [["controlIds", controlIds, "control"], ["indicatorIds", indicatorIds, "indicator"], ["gateIds", gateIds, "gate"], ["sourceIds", sourceIds, "source"], ["templateIds", templateIds, "template"]]) {
      checkRefs(entry.path, entry.caseId, refs[field], available, kind);
      if (sorted(refs[field] || []) !== sorted(entry[field] || [])) errors.push(`${entry.path}: ${field} does not match P2 index`);
    }
  }

  const owaspSchemaFile = "schemas/palo-owasp-genai-2026-crosswalk.schema.json";
  const owaspDataFile = "data/owasp-genai-2026-crosswalk.json";
  const owaspCrosswalk = await loadJson(owaspDataFile);
  const owaspValidator = ajv.compile(await loadJson(owaspSchemaFile));
  if (!owaspValidator(owaspCrosswalk)) errors.push(`${owaspDataFile}: schema validation failed: ${ajv.errorsText(owaspValidator.errors)}`);
  checkRefs(owaspDataFile, "source", [owaspCrosswalk.source?.sourceId], sourceIds, "source");
  const owaspRiskIds = uniqueIds(owaspDataFile, owaspCrosswalk.risks || [], "riskId");
  const expectedOwaspRiskIds = new Set(Array.from({ length: 10 }, (_, index) => `LLM${String(index + 1).padStart(2, "0")}:2026`));
  if (sorted(owaspRiskIds) !== sorted(expectedOwaspRiskIds)) errors.push(`${owaspDataFile}: risks must contain each LLM01:2026 through LLM10:2026 exactly once`);
  for (const risk of owaspCrosswalk.risks || []) checkRefs(owaspDataFile, risk.riskId, risk.controlIds, controlIds, "control");
  const llm05 = (owaspCrosswalk.risks || []).find((risk) => risk.riskId === "LLM05:2026");
  const llm09 = (owaspCrosswalk.risks || []).find((risk) => risk.riskId === "LLM09:2026");
  const llm05Boundary = `${llm05?.paloResponse || ""} ${(llm05?.minimumEvidence || []).join(" ")}`;
  const llm09Evidence = `${llm09?.paloResponse || ""} ${(llm09?.externalSafeguards || []).join(" ")} ${(llm09?.minimumEvidence || []).join(" ")}`;
  if (!/LLM05 owns persistent corruption/i.test(llm05Boundary) || !/persistent corpus poisoning/i.test(llm05Boundary)) errors.push(`${owaspDataFile}: LLM05 must retain the persistent vector-poisoning ownership boundary and evidence`);
  for (const [label, pattern] of [["embedding inversion", /embedding[- ]inversion|Vec2Text/i], ["zero-shot inversion", /ZSInvert|Zero2Text/i], ["adversarial-query retrieval evasion", /adversarial-query.*retrieval-evasion/i], ["similarity collision", /similarity-collision/i], ["LLM05 handoff", /LLM05.*persistent corpus corruption/i]]) {
    if (!pattern.test(llm09Evidence)) errors.push(`${owaspDataFile}: LLM09 must retain ${label} evidence and ownership language`);
  }
  const owaspReview = owaspCrosswalk.technicalReview || {};
  if (owaspReview.reviewer !== "Arshi Chadha" || !/LLM09:2026 co-lead/i.test(owaspReview.publicRole || "")) errors.push(`${owaspDataFile}: authorized LLM09 reviewer credit is missing or inaccurate`);
  if (!/personal technical contribution/i.test(owaspReview.independenceBoundary || "") || !/does not imply OWASP review or endorsement/i.test(owaspReview.independenceBoundary || "")) errors.push(`${owaspDataFile}: reviewer credit must retain the personal-contribution and no-endorsement boundary`);
  const routeKeys = { palo: "palo", "palo-am": "paloAm", "palo-ai": "paloAi" };
  for (const route of owaspCrosswalk.routes || []) {
    const observed = { direct: 0, supporting: 0, gap: 0 };
    const key = routeKeys[route.routeId];
    for (const risk of owaspCrosswalk.risks || []) observed[risk.routeFit?.[key]] += 1;
    if (JSON.stringify(observed) !== JSON.stringify(route.counts)) errors.push(`${owaspDataFile}: ${route.routeId} counts do not match risk ratings`);
  }
  const union = { direct: 0, supporting: 0 };
  for (const risk of owaspCrosswalk.risks || []) {
    const ratings = Object.values(risk.routeFit || {});
    if (ratings.includes("direct")) union.direct += 1;
    else if (ratings.includes("supporting")) union.supporting += 1;
  }
  if (union.direct !== owaspCrosswalk.summary?.unionDirect || union.supporting !== owaspCrosswalk.summary?.unionSupporting) errors.push(`${owaspDataFile}: union summary does not match risk ratings`);
  const sourceArtifact = owaspCrosswalk.source?.artifact;
  if (sourceArtifact) {
    const sourceContent = await readFile(path.join(validationRoot, sourceArtifact));
    const sourceDigest = createHash("sha256").update(sourceContent).digest("hex");
    if (sourceDigest !== owaspCrosswalk.source.sha256) errors.push(`${owaspDataFile}: source artifact SHA-256 does not match ${sourceArtifact}`);
  }

  const signalValidator = ajv.compile(schemas.signal);
  for (const [file, expectation] of [
    ["schemas/fixtures/policywatcher-signal.valid.json", "valid"],
    ["schemas/fixtures/policywatcher-signal.policywatcher.valid.json", "valid"],
    ["schemas/fixtures/policywatcher-signal.invalid.json", "invalid"],
  ]) {
    const fixture = await loadJson(file);
    const result = signalValidator(fixture);
    if (expectation === "valid" && !result) errors.push(`${file}: expected valid signal failed schema: ${ajv.errorsText(signalValidator.errors)}`);
    if (expectation === "invalid" && result) errors.push(`${file}: intentionally invalid signal unexpectedly passed schema`);
  }

  const p2JsonFiles = [
    ...Object.values(schemaFiles), ...Object.values(dataFiles),
    "schemas/fixtures/policywatcher-signal.valid.json",
    "schemas/fixtures/policywatcher-signal.policywatcher.valid.json",
    "schemas/fixtures/policywatcher-signal.invalid.json",
    ...data.index.workedCases.map((entry) => entry.path)
  ];
  const indexDocument = await readFile(path.join(validationRoot, "docs/p2-adoption-integration-index.md"), "utf8");
  for (const file of new Set(p2JsonFiles)) if (!indexDocument.includes(`\`${file}\``)) errors.push(`docs/p2-adoption-integration-index.md: missing JSON reference ${file}`);
  if (!indexDocument.includes(`| ${controlIds.size} controls |`)) errors.push(`docs/p2-adoption-integration-index.md: control count must be generated from registry (${controlIds.size})`);
  if (!indexDocument.includes(`| ${indicatorIds.size} indicators |`)) errors.push(`docs/p2-adoption-integration-index.md: indicator count must be generated from registry (${indicatorIds.size})`);

  p2Counts = {
    controls: controlIds.size,
    indicators: indicatorIds.size,
    gates: gateIds.size,
    sources: sourceIds.size,
    cases: data.index.workedCases.length,
    templates: templateIds.size
  };
}

try { await validateP2Artifacts(); }
catch (error) { errors.push(`P2 artifact validation failed: ${error.message}`); }

async function validateGovernanceControlPlane() {
  const loadJson = async (file) => JSON.parse(await readFile(path.join(validationRoot, file), "utf8"));
  const controls = await loadJson("data/control-library.json");
  const indicators = await loadJson("data/kpi-kri-registry.json");
  const gates = await loadJson("data/decision-gates.json");
  const sources = await loadJson("data/source-registry.json");
  const packs = await loadJson("data/governance-control-packs.json");
  const packSchema = await loadJson("schemas/palo-governance-control-packs.schema.json");
  const governanceAjv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(governanceAjv);
  const packValidator = governanceAjv.compile(packSchema);
  if (!packValidator(packs)) errors.push(`data/governance-control-packs.json: schema validation failed: ${governanceAjv.errorsText(packValidator.errors)}`);

  const controlById = new Map(controls.controls.map((item) => [item.controlId, item]));
  const indicatorIds = new Set(indicators.indicators.map((item) => item.indicatorId));
  const gateIds = new Set(gates.gates.map((item) => item.gateId));
  const expectedDomains = new Set([
    "domain-fairness-subgroups", "domain-system-card-explanations", "domain-notice-appeal-remedy", "domain-article50-transparency",
    "domain-data-lifecycle", "domain-gpai-systemic-risk", "domain-serious-incident-decommissioning", "domain-accessibility",
    "domain-environment", "domain-ai-literacy", "domain-iso42001-aims", "domain-palo-ai-production"
  ]);
  const observedDomains = new Set();
  const domainControlIds = new Set();
  for (const domain of packs.domains || []) {
    if (observedDomains.has(domain.domainId)) errors.push(`data/governance-control-packs.json: duplicate domain ${domain.domainId}`);
    observedDomains.add(domain.domainId);
    const evidenceKinds = new Set();
    for (const controlId of domain.controlIds || []) {
      const control = controlById.get(controlId);
      if (!control) errors.push(`data/governance-control-packs.json: ${domain.domainId} references missing control ${controlId}`);
      for (const kind of control?.evidenceKinds || []) evidenceKinds.add(kind);
      domainControlIds.add(controlId);
    }
    for (const indicatorId of domain.indicatorIds || []) if (!indicatorIds.has(indicatorId)) errors.push(`data/governance-control-packs.json: ${domain.domainId} references missing indicator ${indicatorId}`);
    for (const gateId of domain.gateIds || []) if (!gateIds.has(gateId)) errors.push(`data/governance-control-packs.json: ${domain.domainId} references missing gate ${gateId}`);
    for (const kind of domain.minimumEvidenceKinds || []) if (!evidenceKinds.has(kind)) errors.push(`data/governance-control-packs.json: ${domain.domainId} minimum evidence kind ${kind} is not declared by a referenced control`);
    for (const schemaRef of domain.evidenceContractRefs || []) await access(path.join(validationRoot, schemaRef));
  }
  if ([...expectedDomains].some((id) => !observedDomains.has(id)) || [...observedDomains].some((id) => !expectedDomains.has(id))) errors.push("data/governance-control-packs.json: domains must contain the 12 canonical v3.1 domains exactly once");

  const conditionalGateControls = new Set(gates.gates.flatMap((gate) => gate.conditionalControlIds || []));
  for (const controlId of domainControlIds) if (!conditionalGateControls.has(controlId) && !gates.gates.some((gate) => gate.requiredControlIds.includes(controlId))) errors.push(`data/decision-gates.json: governance-pack control ${controlId} is not integrated into any gate`);

  const evidenceContracts = [
    "palo-governance-assurance-record", "palo-system-card", "palo-affected-person-case", "palo-article50-transparency-record",
    "palo-data-lineage-record", "palo-gpai-systemic-risk-record", "palo-serious-incident-record", "palo-decommission-record",
    "palo-aims-overlay-record", "palo-production-profile"
  ];
  for (const name of evidenceContracts) {
    const schema = await loadJson(`schemas/${name}.schema.json`);
    const validator = governanceAjv.compile(schema);
    for (const expectation of ["valid", "invalid"]) {
      const fixtureFile = `schemas/fixtures/${name}.${expectation}.json`;
      const result = validator(await loadJson(fixtureFile));
      if (expectation === "valid" && !result) errors.push(`${fixtureFile}: expected valid governance fixture failed schema: ${governanceAjv.errorsText(validator.errors)}`);
      if (expectation === "invalid" && result) errors.push(`${fixtureFile}: intentionally invalid governance fixture unexpectedly passed schema`);
    }
  }

  const validationInstant = Date.now();
  for (const source of sources.sources || []) {
    const reviewAt = Date.parse(source.freshness?.nextReviewAt || "");
    if (source.freshness?.status === "current" && Number.isFinite(reviewAt) && reviewAt < validationInstant) errors.push(`data/source-registry.json: ${source.sourceId} is marked current after nextReviewAt ${source.freshness.nextReviewAt}`);
  }
}

try { await validateGovernanceControlPlane(); }
catch (error) { errors.push(`v3.1 governance control-plane validation failed: ${error.message}`); }

async function validateV3SemanticContracts() {
  const loadJson = async (file) => JSON.parse(await readFile(path.join(validationRoot, file), "utf8"));
  const contracts = [
    ["schemas/palo-semantic-spine.schema.json", "data/semantic-spine.json"],
    ["schemas/palo-lifecycle-definition.schema.json", "data/lifecycle-core.json"],
    ["schemas/palo-semantic-mapping-registry.schema.json", "data/semantic-mappings.json"],
    ["schemas/palo-semantic-release-manifest.schema.json", "data/semantic-release-manifest.json"],
    ["schemas/palo-semantic-change-impact.schema.json", "data/semantic-change-impact-v3.json"]
  ];
  const fixtureContracts = [
    ["schemas/palo-gate-instance.schema.json", "palo-gate-instance"],
    ["schemas/palo-gate-decision-record.schema.json", "palo-gate-decision-record"],
    ["schemas/palo-evidence-artifact.schema.json", "palo-evidence-artifact"],
    ["schemas/palo-evidence-claim.schema.json", "palo-evidence-claim"],
    ["schemas/palo-evidence-evaluation.schema.json", "palo-evidence-evaluation"],
    ["schemas/palo-evidence-bundle-manifest.schema.json", "palo-evidence-bundle-manifest"]
  ];
  const semanticAjv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(semanticAjv);
  for (const [schemaFile, dataFile] of contracts) {
    const validator = semanticAjv.compile(await loadJson(schemaFile));
    if (!validator(await loadJson(dataFile))) errors.push(`${dataFile}: v3 semantic schema validation failed: ${semanticAjv.errorsText(validator.errors)}`);
  }
  for (const [schemaFile, fixtureName] of fixtureContracts) {
    const validator = semanticAjv.compile(await loadJson(schemaFile));
    for (const expectation of ["valid", "invalid"]) {
      const file = `schemas/fixtures/${fixtureName}.${expectation}.json`;
      const result = validator(await loadJson(file));
      if (expectation === "valid" && !result) errors.push(`${file}: expected valid v3 fixture failed schema: ${semanticAjv.errorsText(validator.errors)}`);
      if (expectation === "invalid" && result) errors.push(`${file}: intentionally invalid v3 fixture unexpectedly passed schema`);
    }
  }
  const release = await loadJson("data/semantic-release-manifest.json");
  const hash = (content) => createHash("sha256").update(content).digest("hex");
  for (const item of release.items || []) {
    const content = await readFile(path.join(validationRoot, item.path));
    if (hash(content) !== item.sha256) errors.push(`data/semantic-release-manifest.json: digest mismatch for ${item.path}`);
  }
  const { manifestDigest, ...unsigned } = release;
  if (manifestDigest !== `sha256:${hash(JSON.stringify(unsigned))}`) errors.push("data/semantic-release-manifest.json: manifestDigest does not bind the unsigned release inventory");
}

try { await validateV3SemanticContracts(); }
catch (error) { errors.push(`v3 semantic contract validation failed: ${error.message}`); }

const htmlFilesToValidate = [...(built ? PUBLIC_HTML : PUBLIC_SOURCE_HTML), "governance-hub/index.html"];
for (const file of htmlFilesToValidate) {
  let html;
  try { html = await readFile(path.join(validationRoot, file), "utf8"); }
  catch { continue; }
  htmlByFile.set(file, html);
  const staticHtml = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (block) => " ".repeat(block.length));

  const validation = await htmlValidator.validateString(html, file);
  for (const result of validation.results) {
    for (const message of result.messages) {
      errors.push(`${file}:${message.line}:${message.column} HTML ${message.ruleId || "parse"}: ${message.message}`);
    }
  }

  const ids = new Set();
  const idPattern = /\sid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  for (const match of staticHtml.matchAll(idPattern)) {
    const id = match[1] || match[2] || match[3];
    if (ids.has(id)) report(file, `duplicate id/name "${id}"`, match.index);
    ids.add(id);
  }
  idsByFile.set(file, ids);
  htmlByFile.set(`${file}:static`, staticHtml);
}

const publicSet = new Set([...PUBLIC_FILES, ...PUBLIC_GENERATED_HTML, "governance-hub/index.html"]);
if (built) {
  const addBuiltFiles = async (directory, prefix) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await addBuiltFiles(absolute, relative);
      else if (entry.isFile()) publicSet.add(normalizePath(relative));
    }
  };
  try { await addBuiltFiles(path.join(validationRoot, "governance-hub"), "governance-hub"); }
  catch { /* The explicit entry-point check below reports a missing Hub build. */ }
}
try { await access(path.join(validationRoot, "governance-hub/index.html")); }
catch { errors.push("governance-hub/index.html: generated Governance Hub entry is missing"); }
for (const [file, html] of htmlByFile) {
  if (file.endsWith(":static")) continue;
  const staticHtml = htmlByFile.get(`${file}:static`);
  const referencePattern = /\s(?:href|src|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of staticHtml.matchAll(referencePattern)) {
    const reference = match[1] ?? match[2] ?? match[3];
    if (!reference || reference.startsWith("data:") || reference.startsWith("mailto:") || reference.startsWith("tel:") || reference.startsWith("javascript:")) continue;
    const resolved = resolveLocalReference(file, reference);
    if (!resolved) continue;
    if (!publicSet.has(resolved.target)) {
      report(file, `local reference is missing or not published: ${reference} -> ${resolved.target}`, match.index);
      continue;
    }
    if (resolved.fragment && resolved.target.endsWith(".html")) {
      if (!idsByFile.get(resolved.target)?.has(resolved.fragment)) report(file, `fragment does not exist: ${reference}`, match.index);
    }
  }
}

let manifest = {};
try { manifest = JSON.parse(await readFile(path.join(validationRoot, "release-manifest.json"), "utf8")); }
catch (error) { errors.push(`release-manifest.json: invalid JSON: ${error.message}`); }

const releaseVersion = manifest.release?.version;
const releaseDate = manifest.release?.date;
if (!/^\d+\.\d+\.\d+$/.test(releaseVersion || "")) errors.push("release-manifest.json: release.version must be SemVer");
if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate || "")) errors.push("release-manifest.json: release.date must be YYYY-MM-DD");
if (manifest.release?.versioningModel !== "platform-release-with-independent-components") errors.push("release-manifest.json: release.versioningModel must distinguish the platform release from independently versioned components");
if (manifest.sharedAssets?.version !== releaseVersion) errors.push("release-manifest.json: sharedAssets.version must equal release.version");
if (manifest.components?.web?.version !== releaseVersion || manifest.components?.web?.date !== releaseDate) errors.push("release-manifest.json: web component must match the release version and date");
for (const [name, component] of Object.entries(manifest.components || {})) {
  if (!/^\d+\.\d+\.\d+$/.test(component.version || "") || !/^\d{4}-\d{2}-\d{2}$/.test(component.date || "")) errors.push(`release-manifest.json: component ${name} requires SemVer version and ISO date`);
}
for (const [name, module] of Object.entries(manifest.modules || {})) {
  if (!/^\d+\.\d+\.\d+$/.test(module.version || "") || !/^\d{4}-\d{2}-\d{2}$/.test(module.date || "")) errors.push(`release-manifest.json: module ${name} requires SemVer version and ISO date`);
}
if (manifest.modules?.agenticMethodology?.name !== "PALO-AM" || manifest.modules?.agenticGovernance?.name !== "PALO-AI" || manifest.modules?.agenticGovernance?.methodologyRef !== "agenticMethodology") errors.push("release-manifest.json: PALO-AM methodology and PALO-AI implementation relationship is incomplete");
const semanticModule = manifest.modules?.semanticFoundation;
const semanticReleaseMajor = String(semanticModule?.version || "").split(".")[0];
const platformReleaseMajor = String(releaseVersion || "").split(".")[0];
if (semanticReleaseMajor !== platformReleaseMajor || semanticModule?.date > releaseDate) errors.push("release-manifest.json: semanticFoundation must remain in the platform release major and cannot postdate it");
if (semanticModule?.semanticSpine !== "data/semantic-spine.json" || semanticModule?.semanticRelease !== "data/semantic-release-manifest.json") errors.push("release-manifest.json: semanticFoundation canonical paths are incomplete");
if (new Set(semanticModule?.evidenceBoundaryModel || []).size !== 4 || new Set(semanticModule?.workspaces || []).size !== 3) errors.push("release-manifest.json: semanticFoundation requires four authority classes and three workspaces");
const platformMapReleaseHtml = htmlByFile.get("PALO_PlatformMap.html") || "";
const [releaseYear, releaseMonth, releaseDay] = String(releaseDate || "").split("-").map(Number);
const releaseMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const releaseDisplayDate = releaseMonthNames[releaseMonth - 1] ? `${releaseDay} ${releaseMonthNames[releaseMonth - 1]} ${releaseYear}` : "";
if (!platformMapReleaseHtml.includes(`<dt>Web release</dt><dd>v${releaseVersion} | ${releaseDisplayDate}</dd>`)) errors.push("PALO_PlatformMap.html: Web release ledger must match the top-level release manifest version and date");
if (!platformMapReleaseHtml.includes(`<dt>Semantic core</dt><dd>v${semanticModule?.version} | digest-bound release</dd>`)) errors.push("PALO_PlatformMap.html: Semantic core ledger must match the independently versioned semantic foundation");
const agenticGovernanceModule = manifest.modules?.agenticGovernance;
const [agenticYear, agenticMonth, agenticDay] = String(agenticGovernanceModule?.date || "").split("-").map(Number);
const agenticDisplayDate = releaseMonthNames[agenticMonth - 1] ? `${agenticDay} ${releaseMonthNames[agenticMonth - 1]} ${agenticYear}` : "";
if (!platformMapReleaseHtml.includes(`<dt>PALO-AI</dt><dd>v${agenticGovernanceModule?.version} | ${agenticDisplayDate} | Developer Preview</dd>`)) errors.push("PALO_PlatformMap.html: PALO-AI ledger must match the independently versioned agentic-governance module");
if (!platformMapReleaseHtml.includes(`<dt>Android / iOS</dt><dd>v${manifest.components?.mobileAndroid?.version} / v${manifest.components?.mobileIos?.version}</dd>`)) errors.push("PALO_PlatformMap.html: mobile ledger must match the release manifest");
const hubModule = manifest.modules?.agenticGovernanceHub;
if (hubModule?.evidenceBoundaryModel !== "illustrative-local-preview" || hubModule?.runtime !== "illustrative-local-data" || !String(hubModule?.authorityBoundary || "").includes("No live authority")) errors.push("release-manifest.json: Governance Hub illustrative authority boundary is incomplete");
if (!built) {
  try {
    const packageManifest = JSON.parse(await readFile(path.join(validationRoot, "package.json"), "utf8"));
    if (packageManifest.version !== releaseVersion) errors.push("package.json: version must equal release-manifest release.version");
  } catch (error) { errors.push(`package.json: cannot verify root release version: ${error.message}`); }
}

let sharedReferenceCount = 0;
for (const [file, html] of htmlByFile) {
  if (file.endsWith(":static")) continue;
  const sharedPattern = /(?:\.\.\/)*assets\/palo-v21\.(css|js)(?:\?([^"'\s<>]*))?/g;
  for (const match of html.matchAll(sharedPattern)) {
    sharedReferenceCount += 1;
    const expected = `v=${releaseVersion}`;
    const fingerprint = match[2]?.startsWith(`${expected}-`) ? match[2].slice(expected.length + 1) : "";
    const isVersioned = match[2] === expected || /^[0-9a-f]{8,64}$/.test(fingerprint);
    if (!isVersioned) report(file, `stale shared asset version on ${match[0]}; expected ?${expected} or ?${expected}-<content-hash>`, match.index);
  }
}
if (sharedReferenceCount === 0) errors.push("shared assets: no palo-v21.css/js references found");

const guideHtml = htmlByFile.get("PALO_Guide.html") || "";
for (const field of ["role", "objective", "systemType", "canAct", "impact", "product"]) {
  if (!new RegExp(`name=["']${field}["']`).test(guideHtml)) errors.push(`PALO_Guide.html: deterministic guide input ${field} is missing`);
}
for (const tool of ["palo_explain_framework", "palo_infer_governance_route", "palo_plan_product_integration"]) {
  if (!guideHtml.includes(tool)) errors.push(`PALO_Guide.html: MCP guide tool ${tool} is missing`);
}
for (const label of ["Frame", "Classify", "Assess", "Control", "Measure", "Prove &amp; Review"]) {
  if (!guideHtml.includes(`<strong>${label}</strong>`)) errors.push(`PALO_Guide.html: canonical phase ${label} is missing`);
}
if (!/docs\/palo-guide-agent-and-mcp\.html/.test(guideHtml) || !/Browser-local and source-grounded/.test(guideHtml) || !/not a production authorization boundary/i.test(guideHtml)) errors.push("PALO_Guide.html: agent manual, local trust line or production authority boundary is incomplete");

const homeOrientationHtml = htmlByFile.get("index.html") || "";
if (!/data-palo-progressive-background/.test(homeOrientationHtml) || !/Explore framework background and specialist modules/.test(homeOrientationHtml)) errors.push("index.html: legacy background disclosure is missing");
if (/data-palo-progressive-background[^>]*\sopen(?:\s|=|>)/i.test(homeOrientationHtml)) errors.push("index.html: legacy background disclosure must be collapsed by default");
if (!/PALO_Guide\.html[^>]*>[\s\S]*?(?:Ask PALO|Find my route)/.test(homeOrientationHtml)) errors.push("index.html: first-class PALO Guide route is missing");
if (!/Complementary system-lifecycle view[\s\S]*canonical six-phase PALO governance loop/.test(homeOrientationHtml)) errors.push("index.html: five-activity system lifecycle is not explicitly separated from the canonical six-phase loop");

const assessmentOrientationHtml = htmlByFile.get("PALO_AssessmentPath.html") || "";
const assessmentFormIndex = assessmentOrientationHtml.indexOf('id="palo-assessment-form"');
const assessmentResultsIndex = assessmentOrientationHtml.indexOf('id="assessment-results"');
const policyWatcherIndex = assessmentOrientationHtml.indexOf('class="palo-signal-details"');
if (assessmentFormIndex < 0 || assessmentResultsIndex < assessmentFormIndex || policyWatcherIndex < assessmentResultsIndex || !/<details class="palo-signal-details">/.test(assessmentOrientationHtml)) errors.push("PALO_AssessmentPath.html: optional PolicyWatcher receiver must follow the form and nearby results in a collapsed disclosure");

let sitemap = {};
try { sitemap = parseXml("sitemap.xml", await readFile(path.join(validationRoot, "sitemap.xml"), "utf8")); }
catch (error) { errors.push(`sitemap.xml: ${error.message}`); }
const sitemapEntries = asArray(sitemap.urlset?.url);
const sitemapUrls = sitemapEntries.map((entry) => entry.loc).filter(Boolean);
const sitemapSet = new Set(sitemapUrls);
if (sitemapSet.size !== sitemapUrls.length) errors.push("sitemap.xml: duplicate URL entries");
const publicationDate = [releaseDate, ...Object.values(manifest.components || {}).map((component) => component.date), ...Object.values(manifest.modules || {}).map((module) => module.date)].filter(Boolean).sort().at(-1);
for (const entry of sitemapEntries) if (entry.lastmod !== publicationDate) errors.push(`sitemap.xml: ${entry.loc || "entry"} lastmod must match current publication date ${publicationDate}`);
for (const value of sitemapUrls) {
  try {
    const url = new URL(value);
    if (url.origin !== origin) errors.push(`sitemap.xml: URL must use ${origin}: ${value}`);
    const target = urlToPublicPath(url);
    if (!publicSet.has(target)) errors.push(`sitemap.xml: URL does not map to a published file: ${value}`);
    const html = htmlByFile.get(target);
    const canonical = html?.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]
      || html?.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1];
    if (html && canonical !== value) errors.push(`sitemap.xml: canonical mismatch for ${target}; found ${canonical || "none"}, expected ${value}`);
  } catch { errors.push(`sitemap.xml: invalid URL ${value}`); }
}

for (const [file, html] of htmlByFile) {
  for (const match of html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    try {
      const url = new URL(match[1]);
      if (url.origin !== origin || !publicSet.has(urlToPublicPath(url))) report(file, `canonical does not map to a published ${origin} URL: ${match[1]}`, match.index);
    } catch { report(file, `invalid canonical URL: ${match[1]}`, match.index); }
  }
}

let feed = {};
try { feed = parseXml("feed.xml", await readFile(path.join(validationRoot, "feed.xml"), "utf8")); }
catch (error) { errors.push(`feed.xml: ${error.message}`); }
const channel = feed.rss?.channel || {};
if (feed.rss?.["@_version"] !== "2.0") errors.push("feed.xml: RSS version must be 2.0");
if (channel["atom:link"]?.["@_href"] !== `${origin}/feed.xml`) errors.push("feed.xml: atom self link is missing or incorrect");
const feedItems = asArray(channel.item);
if (!feedItems.some((item) => String(item.title || "").includes(`v${releaseVersion}`))) errors.push(`feed.xml: no item identifies current release v${releaseVersion}`);
for (const item of feedItems) {
  for (const field of ["link", "guid"]) {
    const value = typeof item[field] === "object" ? item[field]?.["#text"] : item[field];
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.origin === origin && !publicSet.has(urlToPublicPath(url))) errors.push(`feed.xml: ${field} does not map to a published file: ${value}`);
    } catch { errors.push(`feed.xml: invalid ${field} URL: ${value}`); }
  }
}

if (built) {
  const unexpectedRootFiles = ["package.json", "package-lock.json", "README.md", "scripts/build.mjs"];
  for (const relativePath of unexpectedRootFiles) {
    try {
      await access(path.join(validationRoot, relativePath));
      errors.push(`${relativePath}: internal build/repository file leaked into dist`);
    } catch { /* Expected. */ }
  }
  for (const relativePath of privatePublicationPaths) {
    try { await access(path.join(validationRoot, relativePath)); errors.push(`${relativePath}: private or third-party research input leaked into dist`); }
    catch { /* Expected. */ }
  }
  const internalAssessments = ["docs/palo-ai-v2.4.1-technical-assessment.md", "docs/palo-ai-v2.5-technical-assessment.md", "docs/palo-ai-v2.4.1-technical-assessment.html", "docs/palo-ai-v2.5-technical-assessment.html"];
  for (const relativePath of internalAssessments) {
    try { await access(path.join(validationRoot, relativePath)); errors.push(`${relativePath}: internal assessment leaked into dist`); }
    catch { /* Expected. */ }
  }
  for (const [file, html] of htmlByFile) {
    if (!file.endsWith(":static") && /palo-ai-v2\.(?:4\.1|5)-technical-assessment\.(?:md|html)/i.test(html)) report(file, "public HTML references an internal technical assessment");
  }
  const readinessHtml = htmlByFile.get("PALO_AIProductionReadiness.html") || "";
  if ((readinessHtml.match(/data-gate-id=/g) || []).length !== 9) errors.push("PALO_AIProductionReadiness.html: must expose exactly nine readiness gates");
  if (!/PALO-AM v2\.0[\s\S]*current governance modality/i.test(htmlByFile.get("PALO_AgenticGovernance.html") || "")) errors.push("PALO_AgenticGovernance.html: PALO-AM/PALO-AI version relationship is missing");
  const assurancePages = ["PALO_AIWhy.html", "PALO_AIQuickstarts.html", "PALO_AIGovernance.html", "PALO_AgenticCapabilityMatrix.html", "PALO_AIProductionReadiness.html", "PALO_VerificationNote.html"];
  for (const file of assurancePages) {
    const html = htmlByFile.get(file) || "";
    if (!/palo-ai-status-rail/.test(html) || !/PALO_AgenticCapabilityMatrix\.html/.test(html) || !/PALO_AIProductionReadiness\.html/.test(html) || !/PALO_VerificationNote\.html/.test(html) || !/security-policy\.html/.test(html)) errors.push(`${file}: persistent assurance status rail is incomplete`);
  }
  const verificationHtml = htmlByFile.get("PALO_VerificationNote.html") || "";
  if (!/a8673d2a472108c7b1d8a056c3a6af9962687bee/.test(verificationHtml) || !/actions\/runs\/32828014857/.test(verificationHtml) || !/pull\/29/.test(verificationHtml)) errors.push("PALO_VerificationNote.html: baseline commit, pull request or CI run reference is incomplete");
  if (!/f33b272414a6df25eb0b7a6933eb32ab155ee6e546b1de66e8ed17b22ca6aa2b/.test(verificationHtml) || !/40 (?:tracked )?capabilities/i.test(verificationHtml) || !/0 production-ready/i.test(verificationHtml)) errors.push("PALO_VerificationNote.html: tagged artifact digest or maturity totals are incomplete");
  if (!/AI-assisted engineering and documentation tools under human direction and review/.test(verificationHtml) || !/does not demonstrate that every task was performed without assistance/.test(verificationHtml)) errors.push("PALO_VerificationNote.html: development-method disclosure is incomplete");
  if (!/no analysis found/i.test(verificationHtml) || /CodeQL[^<\n]{0,80}(?:0|zero) (?:alert|finding)/i.test(verificationHtml)) errors.push("PALO_VerificationNote.html: code-scanning status must distinguish no analysis from zero findings");
  const whyHtml = htmlByFile.get("PALO_AIWhy.html") || "";
  if ((whyHtml.match(/data-scenario=/g) || []).length !== 3 || !/Authorized but wrong/.test(whyHtml) || !/browser-local/i.test(whyHtml)) errors.push("PALO_AIWhy.html: comparison must expose three clearly bounded local scenarios");
  const quickstartHtml = htmlByFile.get("PALO_AIQuickstarts.html") || "";
  for (const anchor of ["code-first", "n8n", "copilot", "compare"]) if (!new RegExp(`id=[\"']${anchor}[\"']`).test(quickstartHtml)) errors.push(`PALO_AIQuickstarts.html: missing deep-link route #${anchor}`);
  const legacyDocsHtml = htmlByFile.get("PALO_DocumentationHub.html") || "";
  if (!/name=["']robots["'][^>]+content=["']noindex,follow["']/i.test(legacyDocsHtml) || !/rel=["']canonical["'][^>]+PALO_DocumentationLibrary\.html/i.test(legacyDocsHtml)) errors.push("PALO_DocumentationHub.html: transition page must be noindex and canonicalize to Documentation Library");
  const homeHtml = htmlByFile.get("index.html") || "";
  if ((homeHtml.match(/href=["']PALO_VerificationNote\.html["']/g) || []).length < 3) errors.push("index.html: release verification record must be linked from content, release controls and footer");
  const governanceRoutes = homeHtml.match(/<section[^>]+id=["']palo-governance-routes["'][\s\S]*?<\/section>/i)?.[0] || "";
  for (const title of ["Govern the AI lifecycle", "Govern agentic systems", "Enforce agent actions"]) if (!governanceRoutes.includes(title)) errors.push(`index.html: umbrella governance route is missing exact title "${title}"`);
  for (const destination of ["designs/theory-to-practice-infographic/#onboarding", "#guided-journeys", "PALO_AgenticGovernance.html", "PALO_AgenticGovernance.html#simulator", "PALO_AIGovernance.html", "governance-hub/", "PALO_AIQuickstarts.html"]) if (!governanceRoutes.includes(`href="${destination}"`)) errors.push(`index.html: umbrella governance route is missing destination ${destination}`);
  if (!/PALO provides the governance system[\s\S]*PALO-AM defines agentic authority[\s\S]*PALO-AI makes selected controls executable and verifiable/.test(governanceRoutes)) errors.push("index.html: PALO to PALO-AM to PALO-AI lineage statement is missing");
  const paloAiHtml = htmlByFile.get("PALO_AIGovernance.html") || "";
  if (!/PALO Framework[\s\S]*PALO-AM methodology[\s\S]*PALO-AI enforcement/.test(paloAiHtml)) errors.push("PALO_AIGovernance.html: parent component lineage cue is missing");
  const paloRouteRibbon = paloAiHtml.match(/<nav[^>]*class=["'][^"']*palo-route-ribbon[^"']*["'][^>]*>[\s\S]*?<\/nav>/i)?.[0] || "";
  if ((paloRouteRibbon.match(/class=["']palo-route-separator["']/g) || []).length !== 3 || /<i\b/.test(paloRouteRibbon)) errors.push("PALO_AIGovernance.html: route separators must use dedicated semantic spans");
  const fullCycle = homeHtml.match(/<div[^>]*class=["'][^"']*palo-full-cycle[^"']*["'][^>]*>[\s\S]*?<\/div>/i)?.[0] || "";
  if ((fullCycle.match(/class=["']palo-cycle-separator["']/g) || []).length !== 6 || /<i\b/.test(fullCycle)) errors.push("index.html: full-cycle separators must use dedicated semantic spans");
  const paloAmHtml = htmlByFile.get("PALO_AgenticGovernance.html") || "";
  if (!/PALO-AM is the agentic governance modality inside the PALO Framework\. It is distinct from the PALO-AI runtime/.test(paloAmHtml)) errors.push("PALO_AgenticGovernance.html: PALO-AM parent/modality distinction is missing");
  if (!/class=["']am-version-callout["']/.test(paloAmHtml) || !/class=["']am-hero-actions["']/.test(paloAmHtml) || (paloAmHtml.match(/class=["'][^"']*am-action/g) || []).length !== 2) errors.push("PALO_AgenticGovernance.html: specialist version callout or hero actions are missing");
  if (!/href=["']docs\/palo-ai-adoption-paths\.html["']/.test(paloAmHtml) || /href=["']docs\/palo-ai-adoption-paths\.md["']/.test(paloAmHtml)) errors.push("PALO_AgenticGovernance.html: adoption path must target generated HTML documentation");
  const onboardingHtml = htmlByFile.get("designs/theory-to-practice-infographic/index.html") || "";
  const onboardingRibbon = onboardingHtml.match(/<nav[^>]*class=["'][^"']*route-ribbon[^"']*["'][^>]*>[\s\S]*?<\/nav>/i)?.[0] || "";
  if ((onboardingRibbon.match(/class=["']route-separator["']/g) || []).length !== 4 || /<i\b/.test(onboardingRibbon)) errors.push("Stakeholder Onboarding: route separators must use dedicated semantic spans");
  if (!/Public semantic catalog/.test(onboardingHtml) || !/Search the semantic catalog/.test(onboardingHtml)) errors.push("Operationalization Explorer: public Semantic Inspector boundary is missing");
  const platformMapHtml = htmlByFile.get("PALO_PlatformMap.html") || "";
  if (!/id=["']map-evidence-class["']/.test(platformMapHtml) || (platformMapHtml.match(/data-evidence-class=/g) || []).length !== 26 || !/Evidence \/ authority/.test(platformMapHtml)) errors.push("PALO_PlatformMap.html: evidence/authority filtering must align all 13 visual and table routes");
  if (!/route-monitor[^>]+data-evidence-class=["']human-review-required["']/.test(platformMapHtml)) errors.push("PALO_PlatformMap.html: monitoring route must require human review");
  if (!/route-palo-ai-data[^>]+data-evidence-class=["']canonical-definition["']/.test(platformMapHtml) || !/PALO-AI v2\.7[\s\S]*Data Fitness Decision[\s\S]*not a production authorization service/.test(platformMapHtml)) errors.push("PALO_PlatformMap.html: current PALO-AI data-assurance route and production boundary are missing");
  if ((platformMapHtml.match(/href=["']CHANGELOG\.html["']/g) || []).length < 3 || (platformMapHtml.match(/href=["']feed\.xml["']/g) || []).length < 3) errors.push("PALO_PlatformMap.html: changelog and release-feed references must be available in the atlas, evidence section and footer");
  if (!/Platform evidence[\s\S]*PALO_VerificationNote\.html/.test(platformMapHtml)) errors.push("PALO_PlatformMap.html: release verification record is missing from Platform evidence");
  const libraryHtml = htmlByFile.get("PALO_DocumentationLibrary.html") || "";
  if (!/data-library-evidence/.test(libraryHtml) || !/data-library-workspace/.test(libraryHtml) || !/data-library-lifecycle/.test(libraryHtml) || !/data-evidence-class=["']canonical-definition["']/.test(libraryHtml) || !/data-lifecycle=["']current["']/.test(libraryHtml) || !/data-lifecycle=["']historical["']/.test(libraryHtml) || !/data-lifecycle=["']superseded["']/.test(libraryHtml) || !/data-lifecycle=["']compatibility["']/.test(libraryHtml)) errors.push("PALO_DocumentationLibrary.html: evidence, workspace or lifecycle taxonomy is incomplete");
  if ((libraryHtml.match(/href=["']CHANGELOG\.html["']/g) || []).length < 2 || (libraryHtml.match(/href=["']release-manifest\.json["']/g) || []).length < 2) errors.push("PALO_DocumentationLibrary.html: release-history and version-inventory references are incomplete");
  if ((libraryHtml.match(/href=["']PALO_VerificationNote\.html["']/g) || []).length < 2 || !/PALO_VerificationNote\.html/.test(legacyDocsHtml) || !/PALO_VerificationNote\.html/.test(htmlByFile.get("PALO_Recognition.html") || "")) errors.push("public documentation and recognition surfaces must link the release verification record");
  for (const file of ["docs/palo-ai-community-and-market-entry.html", "docs/community/n8n-architecture-preview-post.html", "docs/palo-ai-n8n-alpha-test-report.html", "docs/palo-ai-governance-hub-github-copy.html", "docs/palo-ai-governance-hub-launch-plan.html", "docs/site/palo-ai-governance-hub-page-copy.html"]) {
    if (!/name=["']robots["'][^>]+content=["']noindex,follow["']/i.test(htmlByFile.get(file) || "")) errors.push(`${file}: historical or superseded documentation must be noindex,follow`);
  }
  if (!/name=["']robots["'][^>]+content=["']index,follow["']/i.test(htmlByFile.get("docs/palo-ai-adoption-paths.html") || "")) errors.push("docs/palo-ai-adoption-paths.html: current guidance must remain indexable");
  let hubBundle = htmlByFile.get("governance-hub/index.html") || "";
  try {
    for (const entry of await readdir(path.join(validationRoot, "governance-hub/assets"), { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".js")) hubBundle += await readFile(path.join(validationRoot, "governance-hub/assets", entry.name), "utf8");
    }
  } catch { /* The missing generated Hub entry is reported above. */ }
  if (!/Illustrative local preview/.test(hubBundle) || !/Workspace lens/.test(hubBundle) || !/Semantic record/.test(hubBundle) || !/illustrative-local-preview/.test(hubBundle)) errors.push("governance-hub/index.html: v3 local-preview boundary or Semantic Record inspector is missing");
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  const p2Summary = p2Counts ? `, P2 ${p2Counts.controls} controls/${p2Counts.indicators} indicators/${p2Counts.gates} gates/${p2Counts.sources} sources/${p2Counts.cases} cases/${p2Counts.templates} templates` : "";
  console.log(`Validation passed: ${htmlFilesToValidate.length} HTML files, P1 schemas and fixtures${p2Summary}, v3 semantic contracts and digests, ${sharedReferenceCount} versioned shared assets, ${sitemapUrls.length} sitemap URLs, ${feedItems.length} RSS items.`);
}
