import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { verifyCollectionDigests } from "./core.js";

export const PROHIBITED_NARRATIVE_FIELDS = Object.freeze([
  "fullText",
  "sourceBody",
  "details",
  "summary",
  "whyItMatters",
  "justification",
  "justificationText",
]);

const schema = JSON.parse(await readFile(new URL("../../schemas/palo-external-agentic-evidence.schema.json", import.meta.url), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
const prohibited = new Set(PROHIBITED_NARRATIVE_FIELDS);

function findProhibitedField(value, location = "$") {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findProhibitedField(item, `${location}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (value === null || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    if (prohibited.has(key)) return `${location}.${key}`;
    const found = findProhibitedField(child, `${location}.${key}`);
    if (found) return found;
  }
  return null;
}

export function validateExternalEvidenceCollection(collection, { expectedProviderId } = {}) {
  const prohibitedField = findProhibitedField(collection);
  if (prohibitedField) throw new TypeError(`external-evidence collection contains prohibited narrative field ${prohibitedField}`);
  if (!validateSchema(collection)) throw new TypeError(`external-evidence collection failed JSON Schema validation: ${ajv.errorsText(validateSchema.errors)}`);
  if (expectedProviderId && collection.providerId !== expectedProviderId) {
    throw new TypeError(`external-evidence collection provider ${collection.providerId} does not match expected provider ${expectedProviderId}`);
  }
  verifyCollectionDigests(collection);
  return collection;
}
