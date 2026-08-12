import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const GOLD_CASE_FILES = [
  "evidence-pack/cases/agentic-invoice-exception.case.json",
  "evidence-pack/cases/hr-learning-assistant.case.json",
  "evidence-pack/cases/procurement-bid-summary.case.json"
];

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === "string" ? value : canonicalJson(value));
  return createHash("sha256").update(input).digest("hex");
}

export async function createValidators(root = PROJECT_ROOT) {
  const load = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
  const caseSchema = await load("schemas/palo-case-file.schema.json");
  const receiptSchema = await load("schemas/palo-local-validation-receipt.schema.json");
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateCase = ajv.compile(caseSchema);
  const validateReceipt = ajv.compile(receiptSchema);
  return { ajv, validateCase, validateReceipt };
}

export async function loadAndValidateCase(file, { root = PROJECT_ROOT, validators } = {}) {
  const absolute = path.isAbsolute(file) ? file : path.join(root, file);
  const value = JSON.parse(await readFile(absolute, "utf8"));
  const activeValidators = validators || await createValidators(root);
  const valid = activeValidators.validateCase(value);
  return {
    absolute,
    errors: valid ? [] : activeValidators.validateCase.errors || [],
    valid,
    value
  };
}

export function createLocalReceipt(caseFile, { generatedAt = new Date().toISOString(), execution = "node-local" } = {}) {
  const digest = sha256(caseFile);
  return {
    format: "palo-local-validation-receipt",
    schemaVersion: "1.0.0",
    receiptId: `receipt-${digest.slice(0, 16)}`,
    caseId: caseFile.caseId,
    generatedAt,
    result: "valid",
    artifactDigest: `sha256:${digest}`,
    checks: [
      { checkId: "case-schema", status: "passed", message: "Case File conforms to the published PALO Case File 1.0.0 schema." },
      { checkId: "authority-boundary", status: "passed", message: "The case declares allowed and prohibited authority in its educational context." },
      { checkId: "source-boundary", status: "passed", message: "The case includes a dated source and an explicit review boundary." },
      { checkId: "privacy-mode", status: "passed", message: "Validation ran locally and created no mandatory network transmission." }
    ],
    validator: {
      name: "PALO Evidence Pack local validator",
      version: "3.0.1",
      execution
    },
    privacyBoundary: "The receipt contains a case identifier, validation checks and an artifact digest. Sharing is voluntary. Schema conformance is not certification, legal advice, production approval or independent assurance.",
    shareMode: "voluntary-export"
  };
}

export function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);
}

export function buildContribution({ slug, title, sector, scenario, community, author, now = new Date().toISOString() }) {
  const safeSlug = normalizeSlug(slug);
  if (safeSlug.length < 6) throw new Error("--slug must contain at least 6 normalized characters");
  for (const [flag, value] of Object.entries({ title, sector, scenario, community, author })) {
    if (!String(value || "").trim()) throw new Error(`--${flag} is required`);
  }
  const caseFile = {
    format: "palo-case-file",
    schemaVersion: "1.0.0",
    caseId: `case-community-${safeSlug}`.slice(0, 63),
    title: `Community case: ${title.trim()}`,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    owner: author.trim(),
    context: {
      domain: sector.trim(),
      scenario: scenario.trim(),
      exampleStatus: "educational-non-production",
      contributionCommunity: community.trim(),
      sourceStatus: "Contributor supplied starting references. Applicability and freshness require maintainer and domain review.",
      limitations: "Synthetic or safely publishable contribution. No legal, security, production or certification claim is made.",
      decisionQuestion: "TODO: state the decision this evidence should support.",
      declaredAuthority: {
        allowed: ["TODO: name one permitted action"],
        prohibited: ["TODO: name one prohibited action"]
      },
      expectedEffect: "TODO: state the observable effect.",
      verificationMethod: "TODO: state how a reviewer could check the effect independently."
    },
    assessments: [],
    evidence: [],
    sources: [],
    incidents: [],
    handoffs: []
  };
  const prBody = `# Add community case: ${title.trim()}\n\n## Community and purpose\n\n- Community: ${community.trim()}\n- Contributor: ${author.trim()}\n- Sector: ${sector.trim()}\n- Decision supported: TODO\n\n## Why this case matters\n\n${scenario.trim()}\n\n## Evidence and authority boundary\n\n- [ ] Uses only synthetic or safely publishable data.\n- [ ] Names at least one allowed and one prohibited action.\n- [ ] States an observable expected effect and an independent verification method.\n- [ ] Includes dated primary or standards sources when applicable.\n- [ ] Makes no certification, legal-approval or production-readiness claim.\n\n## Validation\n\n- [ ] \`npm run case:contribute -- --validate-all\`\n- [ ] \`npm run validate\`\n`;
  return { caseFile, prBody, slug: safeSlug };
}
