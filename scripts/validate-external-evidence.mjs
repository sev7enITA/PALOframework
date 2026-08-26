import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { verifyCollectionDigests } from "../packages/palo-external-evidence/core.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const loadJson = async (relativePath) => JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const errors = [];
const files = {
  providerSchema: "schemas/palo-external-evidence-provider-registry.schema.json",
  evidenceSchema: "schemas/palo-external-agentic-evidence.schema.json",
  crosswalkSchema: "schemas/palo-agentic-capability-crosswalk.schema.json",
  providerRegistry: "data/external-evidence/provider-registry.json",
  crosswalk: "data/external-evidence/palo-agentic-capability-crosswalk.json",
  example: "examples/external-evidence/rogue-ai-tracker-metadata.example.json",
};
const loaded = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, value]) => [key, await loadJson(value)])));

for (const [schemaKey, dataKey] of [["providerSchema", "providerRegistry"], ["crosswalkSchema", "crosswalk"], ["evidenceSchema", "example"]]) {
  const validator = ajv.compile(loaded[schemaKey]);
  if (!validator(loaded[dataKey])) errors.push(`${files[dataKey]}: ${ajv.errorsText(validator.errors)}`);
}

const unique = (records, field, file) => {
  const values = new Set();
  for (const record of records) {
    if (values.has(record[field])) errors.push(`${file}: duplicate ${field} ${record[field]}`);
    values.add(record[field]);
  }
  return values;
};
const [controls, indicators, gates, sources] = await Promise.all([
  loadJson("data/control-library.json"),
  loadJson("data/kpi-kri-registry.json"),
  loadJson("data/decision-gates.json"),
  loadJson("data/source-registry.json"),
]);
const controlIds = new Set(controls.controls.map((item) => item.controlId));
const indicatorIds = new Set(indicators.indicators.map((item) => item.indicatorId));
const gateIds = new Set(gates.gates.map((item) => item.gateId));
const sourceIds = new Set(sources.sources.map((item) => item.sourceId));
const providerIds = unique(loaded.providerRegistry.providers, "providerId", files.providerRegistry);
unique(loaded.providerRegistry.providers.map((item) => item.adapter), "adapterId", files.providerRegistry);
for (const provider of loaded.providerRegistry.providers) {
  if (!sourceIds.has(provider.sourceId)) errors.push(`${files.providerRegistry}: ${provider.providerId} references missing source ${provider.sourceId}`);
  if (provider.networkOptional !== true || provider.dataPolicy?.metadataOnly !== true) errors.push(`${files.providerRegistry}: ${provider.providerId} must remain network-optional and metadata-only`);
}
const capabilityIds = unique(loaded.crosswalk.capabilities, "capabilityId", files.crosswalk);
for (const capability of loaded.crosswalk.capabilities) {
  for (const id of capability.controlIds) if (!controlIds.has(id)) errors.push(`${files.crosswalk}: ${capability.capabilityId} references missing control ${id}`);
  for (const id of capability.indicatorIds) if (!indicatorIds.has(id)) errors.push(`${files.crosswalk}: ${capability.capabilityId} references missing indicator ${id}`);
  for (const id of capability.gateIds) if (!gateIds.has(id)) errors.push(`${files.crosswalk}: ${capability.capabilityId} references missing gate ${id}`);
}
const mappingKeys = new Set();
for (const mapping of loaded.crosswalk.providerMappings) {
  const key = `${mapping.providerId}\u0000${mapping.providerCapabilityId}`;
  if (mappingKeys.has(key)) errors.push(`${files.crosswalk}: duplicate provider mapping ${mapping.providerId}/${mapping.providerCapabilityId}`);
  mappingKeys.add(key);
  if (!providerIds.has(mapping.providerId)) errors.push(`${files.crosswalk}: mapping references missing provider ${mapping.providerId}`);
  for (const id of mapping.paloCapabilityIds) if (!capabilityIds.has(id)) errors.push(`${files.crosswalk}: mapping references missing capability ${id}`);
  if (mapping.notUseCaseRiskScore !== true) errors.push(`${files.crosswalk}: ${key} must retain the use-case risk score boundary`);
}

const forbiddenKeys = new Set(["fullText", "sourceBody", "details", "summary", "whyItMatters", "justification", "justificationText"]);
function scanForbidden(value, location = "$") {
  if (Array.isArray(value)) return value.forEach((item, index) => scanForbidden(item, `${location}[${index}]`));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) errors.push(`${files.example}: prohibited mirrored field ${location}.${key}`);
    scanForbidden(child, `${location}.${key}`);
  }
}
scanForbidden(loaded.example);
try { verifyCollectionDigests(loaded.example); }
catch (error) { errors.push(`${files.example}: ${error.message}`); }

if (errors.length) {
  console.error(`External agentic evidence validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exit(1);
}
console.log(`External agentic evidence validation passed (${providerIds.size} providers, ${capabilityIds.size} PALO capabilities, ${mappingKeys.size} reviewed mappings, ${loaded.example.signals.length} metadata-only example signal).`);
