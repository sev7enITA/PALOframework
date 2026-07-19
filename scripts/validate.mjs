import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import { HtmlValidate } from "html-validate";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { PUBLIC_FILES, PUBLIC_HTML } from "./public-files.mjs";

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

async function validateP1Fixtures() {
  const caseSchema = JSON.parse(await readFile(path.join(validationRoot, "schemas/palo-case-file.schema.json"), "utf8"));
  const bundleSchema = JSON.parse(await readFile(path.join(validationRoot, "schemas/palo-evidence-bundle.schema.json"), "utf8"));
  const agenticSchema = JSON.parse(await readFile(path.join(validationRoot, "schemas/palo-agentic-interface.schema.json"), "utf8"));
  ajv.addSchema(caseSchema);
  ajv.addSchema(agenticSchema);
  const validators = {
    "palo-case-file": ajv.getSchema(caseSchema.$id),
    "palo-evidence-bundle": ajv.compile(bundleSchema),
    "palo-agentic-interface": ajv.getSchema(agenticSchema.$id)
  };
  caseFileValidator = validators["palo-case-file"];
  for (const [name, validator] of Object.entries(validators)) {
    for (const expectation of ["valid", "invalid"]) {
      const file = `schemas/fixtures/${name}.${expectation}.json`;
      const fixture = JSON.parse(await readFile(path.join(validationRoot, file), "utf8"));
      const result = validator(fixture);
      if (expectation === "valid" && !result) errors.push(`${file}: expected valid fixture failed schema: ${ajv.errorsText(validator.errors)}`);
      if (expectation === "invalid" && result) errors.push(`${file}: intentionally invalid fixture unexpectedly passed schema`);
    }
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

  const signalValidator = ajv.compile(schemas.signal);
  for (const expectation of ["valid", "invalid"]) {
    const file = `schemas/fixtures/policywatcher-signal.${expectation}.json`;
    const fixture = await loadJson(file);
    const result = signalValidator(fixture);
    if (expectation === "valid" && !result) errors.push(`${file}: expected valid signal failed schema: ${ajv.errorsText(signalValidator.errors)}`);
    if (expectation === "invalid" && result) errors.push(`${file}: intentionally invalid signal unexpectedly passed schema`);
  }

  const p2JsonFiles = [
    ...Object.values(schemaFiles), ...Object.values(dataFiles),
    "schemas/fixtures/policywatcher-signal.valid.json",
    "schemas/fixtures/policywatcher-signal.invalid.json",
    ...data.index.workedCases.map((entry) => entry.path)
  ];
  const indexDocument = await readFile(path.join(validationRoot, "docs/p2-adoption-integration-index.md"), "utf8");
  for (const file of new Set(p2JsonFiles)) if (!indexDocument.includes(`\`${file}\``)) errors.push(`docs/p2-adoption-integration-index.md: missing JSON reference ${file}`);

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

for (const file of PUBLIC_HTML) {
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

const publicSet = new Set(PUBLIC_FILES);
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
if (manifest.sharedAssets?.version !== releaseVersion) errors.push("release-manifest.json: sharedAssets.version must equal release.version");
if (manifest.components?.web?.version !== releaseVersion || manifest.components?.web?.date !== releaseDate) errors.push("release-manifest.json: web component must match the release version and date");
for (const [name, component] of Object.entries(manifest.components || {})) {
  if (!/^\d+\.\d+\.\d+$/.test(component.version || "") || !/^\d{4}-\d{2}-\d{2}$/.test(component.date || "")) errors.push(`release-manifest.json: component ${name} requires SemVer version and ISO date`);
}
for (const [name, module] of Object.entries(manifest.modules || {})) {
  if (!/^\d+\.\d+\.\d+$/.test(module.version || "") || !/^\d{4}-\d{2}-\d{2}$/.test(module.date || "")) errors.push(`release-manifest.json: module ${name} requires SemVer version and ISO date`);
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

let sitemap = {};
try { sitemap = parseXml("sitemap.xml", await readFile(path.join(validationRoot, "sitemap.xml"), "utf8")); }
catch (error) { errors.push(`sitemap.xml: ${error.message}`); }
const sitemapUrls = asArray(sitemap.urlset?.url).map((entry) => entry.loc).filter(Boolean);
const sitemapSet = new Set(sitemapUrls);
if (sitemapSet.size !== sitemapUrls.length) errors.push("sitemap.xml: duplicate URL entries");
for (const value of sitemapUrls) {
  try {
    const url = new URL(value);
    if (url.origin !== origin) errors.push(`sitemap.xml: URL must use ${origin}: ${value}`);
    const target = urlToPublicPath(url);
    if (!publicSet.has(target)) errors.push(`sitemap.xml: URL does not map to a published file: ${value}`);
    const html = htmlByFile.get(target);
    const canonical = html?.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]
      || html?.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1];
    if (canonical !== value) errors.push(`sitemap.xml: canonical mismatch for ${target}; found ${canonical || "none"}, expected ${value}`);
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
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  const p2Summary = p2Counts ? `, P2 ${p2Counts.controls} controls/${p2Counts.indicators} indicators/${p2Counts.gates} gates/${p2Counts.sources} sources/${p2Counts.cases} cases/${p2Counts.templates} templates` : "";
  console.log(`Validation passed: ${PUBLIC_HTML.length} HTML files, P1 schemas and fixtures${p2Summary}, ${sharedReferenceCount} versioned shared assets, ${sitemapUrls.length} sitemap URLs, ${feedItems.length} RSS items.`);
}
