import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { createFunctionEnforcementProvider, evaluateEnforcementProvider, validateEnforcementProviderManifest } from "./enforcement-provider.js";
import { emitTelemetry, resolveTraceId, signEd25519Envelope, validateAuthorityContext, verifyEvidenceEnvelope } from "./assurance-foundation.js";
import { telemetryFromEnvironment } from "./telemetry-otel.js";

const PROFILE_FORMAT = "palo-agentic-interface";
const POLICY_ID = "policy-agentic-governance";
const POLICY_VERSION = "1.3.0";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaNames = [
  "palo-agentic-interface", "palo-agentic-effect-contract", "palo-agentic-action-claim", "palo-agentic-policy", "palo-agentic-policy-input",
  "palo-agentic-policy-decision", "palo-agentic-approval", "palo-agentic-evidence-envelope", "palo-agentic-execution-capability",
  "palo-agentic-execution-receipt", "palo-agentic-outcome-attestation", "palo-agentic-assurance-incident", "palo-agentic-enforcement-provider"
];
const schemas = Object.fromEntries(schemaNames.map((name) => [name, JSON.parse(readFileSync(path.join(repositoryRoot, "schemas", `${name}.schema.json`), "utf8"))]));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
Object.values(schemas).forEach((schema) => ajv.addSchema(schema));
const validators = Object.fromEntries(schemaNames.map((name) => [name, ajv.getSchema(schemas[name].$id)]));

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function nowIso() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}-${randomUUID()}`; }
function parse(value) { return typeof value === "string" ? JSON.parse(value) : value; }

export function assertSchema(name, value) {
  const validator = validators[name];
  if (!validator(value)) throw new Error(`${name} validation failed: ${ajv.errorsText(validator.errors)}`);
}

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function sha256(value) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : canonicalize(value)).digest("hex")}`;
}

function semver(version) { return version.split(".").map(Number); }
function isNewer(next, current) {
  const a = semver(next); const b = semver(current);
  for (let index = 0; index < 3; index += 1) { if (a[index] !== b[index]) return a[index] > b[index]; }
  return false;
}

function redact(value, fields = []) {
  const extraFields = Array.isArray(fields) ? fields : [];
  const sensitive = new Set(["authorization", "cookie", "password", "secret", "token", "apiKey", "privateKey", ...extraFields].map((key) => key.toLowerCase()));
  if (Array.isArray(value)) return value.map((item) => redact(item, fields));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitive.has(key.toLowerCase()) ? "[REDACTED]" : redact(item, fields)]));
}

function signHmac(value, secret) {
  return `hmac-sha256:${createHmac("sha256", secret).update(canonicalize(value)).digest("hex")}`;
}

function canonicalEqual(left, right) {
  return canonicalize(left) === canonicalize(right);
}

function jsonType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function jsonPointer(value, pointer) {
  if (pointer === "") return { found: true, value };
  if (typeof pointer !== "string" || !pointer.startsWith("/")) return { found: false };
  let current = value;
  for (const token of pointer.slice(1).split("/").map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (current === null || typeof current !== "object" || !(token in current)) return { found: false };
    current = current[token];
  }
  return { found: true, value: current };
}

function evaluatePredicate(predicate, preState, postState, category) {
  const before = jsonPointer(preState, predicate.path);
  const after = jsonPointer(postState, predicate.path);
  let passed = false;
  let known = true;
  switch (predicate.operator) {
    case "exists": passed = category === "precondition" ? before.found : after.found; break;
    case "notExists": passed = !(category === "precondition" ? before.found : after.found); break;
    case "equals": {
      const observed = category === "precondition" ? before : after;
      passed = observed.found && canonicalEqual(observed.value, predicate.value);
      break;
    }
    case "unchanged": passed = before.found && after.found && canonicalEqual(before.value, after.value); break;
    case "changedTo": passed = after.found && canonicalEqual(after.value, predicate.value) && (!before.found || !canonicalEqual(before.value, after.value)); break;
    case "deltaWithin": {
      if (!before.found || !after.found || typeof before.value !== "number" || typeof after.value !== "number") known = false;
      else { const delta = after.value - before.value; passed = delta >= predicate.minimumDelta && delta <= predicate.maximumDelta; }
      break;
    }
    case "numberWithin": {
      const observed = category === "precondition" ? before : after;
      if (!observed.found || typeof observed.value !== "number") known = false;
      else passed = observed.value >= predicate.minimum && observed.value <= predicate.maximum;
      break;
    }
    case "containsAll": {
      const observed = category === "precondition" ? before : after;
      if (!observed.found || !Array.isArray(observed.value)) known = false;
      else passed = predicate.values.every((expected) => observed.value.some((item) => canonicalEqual(item, expected)));
      break;
    }
    case "typeIs": {
      const observed = category === "precondition" ? before : after;
      passed = observed.found && jsonType(observed.value) === predicate.expectedType;
      break;
    }
    default: known = false;
  }
  const predicateTrue = known && passed;
  const status = !known ? "unknown" : category === "forbidden" ? (predicateTrue ? "fail" : "pass") : (predicateTrue ? "pass" : "fail");
  return {
    predicateId: predicate.predicateId,
    category,
    status,
    reason: !known ? "Required authoritative values were unavailable" : category === "forbidden" ? (predicateTrue ? "Forbidden effect was observed" : "Forbidden effect was not observed") : (passed ? "Predicate satisfied" : "Predicate not satisfied")
  };
}

function validateEffectContractSemantics(effectContract) {
  const predicates = [...effectContract.preconditions, ...effectContract.expectedEffects, ...effectContract.forbiddenEffects];
  const predicateIds = new Set();
  for (const predicate of predicates) {
    if (predicateIds.has(predicate.predicateId)) throw new Error(`Duplicate Effect Contract predicateId ${predicate.predicateId}`);
    predicateIds.add(predicate.predicateId);
    if (predicate.operator === "deltaWithin" && predicate.minimumDelta > predicate.maximumDelta) throw new Error(`${predicate.predicateId} minimumDelta exceeds maximumDelta`);
    if (predicate.operator === "numberWithin" && predicate.minimum > predicate.maximum) throw new Error(`${predicate.predicateId} minimum exceeds maximum`);
  }
  const initialDelay = effectContract.verification.initialDelaySeconds || 0;
  if (initialDelay >= effectContract.verification.windowSeconds) throw new Error("Effect Contract initialDelaySeconds must be smaller than windowSeconds");
}

export function evaluateEffectContract(effectContract, preState, postState, { includePreconditions = true } = {}) {
  assertSchema("palo-agentic-effect-contract", effectContract);
  validateEffectContractSemantics(effectContract);
  const checks = [];
  if (includePreconditions) for (const predicate of effectContract.preconditions) checks.push(evaluatePredicate(predicate, preState, preState, "precondition"));
  for (const predicate of effectContract.expectedEffects) checks.push(evaluatePredicate(predicate, preState, postState, "expected"));
  for (const predicate of effectContract.forbiddenEffects) checks.push(evaluatePredicate(predicate, preState, postState, "forbidden"));
  const status = checks.some((check) => check.status === "unknown") ? "inconclusive" : checks.some((check) => check.status === "fail") ? "mismatch" : "verified";
  return { status, checks };
}

export function normalizeActionClaim(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Action Claim must be an object");
  const claim = clone(input);
  if (!claim?.action) throw new Error("Action Claim is missing action");
  claim.action.resource = String(claim.action.resource || "").trim();
  const rawPath = String(claim.action.path || "").trim();
  claim.action.path = path.posix.normalize(rawPath.startsWith("/") ? rawPath : `/${rawPath}`);
  if (claim.action.networkHost) claim.action.networkHost = claim.action.networkHost.trim().toLowerCase().replace(/\.$/, "");
  claim.requestedScopes = {
    read: [...new Set((claim.requestedScopes?.read || []).map((scope) => path.posix.normalize(scope)))].sort(),
    write: [...new Set((claim.requestedScopes?.write || []).map((scope) => path.posix.normalize(scope)))].sort()
  };
  assertSchema("palo-agentic-action-claim", claim);
  const hasNetworkIntent = claim.action.networkIntent !== "none";
  if (hasNetworkIntent !== claim.externalNetwork) throw new Error("externalNetwork must match action.networkIntent");
  if (hasNetworkIntent && !claim.action.networkHost) throw new Error("networkHost is required for external network intent");
  if (!hasNetworkIntent && claim.action.networkHost) throw new Error("networkHost is forbidden when networkIntent is none");
  if (sha256(claim.action.arguments) !== claim.action.argumentsDigest) throw new Error("argumentsDigest does not match canonical arguments");
  if (["1.2.0", "1.3.0"].includes(claim.schemaVersion)) {
    const selector = claim.effectContract.resourceSelector;
    validateEffectContractSemantics(claim.effectContract);
    if (selector.resource !== claim.action.resource || path.posix.normalize(selector.path) !== claim.action.path) throw new Error("Effect Contract resourceSelector must bind to the normalized action resource and path");
    if (selector.tenantId && claim.metadata?.tenantId && selector.tenantId !== claim.metadata.tenantId) throw new Error("Effect Contract tenant does not match Action Claim metadata");
  }
  if (claim.schemaVersion === "1.3.0") {
    if (claim.authorityContext.agentIdentity.agentId !== claim.agentId) throw new Error("authorityContext.agentIdentity.agentId must match claim.agentId");
    if (claim.authorityContext.tenantId && claim.effectContract.resourceSelector.tenantId && claim.authorityContext.tenantId !== claim.effectContract.resourceSelector.tenantId) throw new Error("Authority Context tenant does not match Effect Contract tenant");
  }
  return claim;
}

function openDatabase(dataDir) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new Database(path.join(dataDir, "palo-agentic.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = FULL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (case_id TEXT NOT NULL, agent_id TEXT NOT NULL, profile_version TEXT NOT NULL, profile_digest TEXT NOT NULL, profile_json TEXT NOT NULL, status TEXT NOT NULL, is_current INTEGER NOT NULL, registered_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(case_id, agent_id, profile_version));
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_current ON profiles(case_id, agent_id) WHERE is_current = 1;
    CREATE TABLE IF NOT EXISTS policies (policy_id TEXT NOT NULL, policy_version TEXT NOT NULL, bundle_digest TEXT NOT NULL, policy_json TEXT NOT NULL, status TEXT NOT NULL, is_current INTEGER NOT NULL, registered_at TEXT NOT NULL, PRIMARY KEY(policy_id, policy_version));
    CREATE UNIQUE INDEX IF NOT EXISTS policies_current ON policies(policy_id) WHERE is_current = 1;
    CREATE TABLE IF NOT EXISTS decisions (claim_id TEXT PRIMARY KEY, claim_digest TEXT NOT NULL, decision_json TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS approvals (approval_id TEXT PRIMARY KEY, claim_id TEXT NOT NULL, claim_digest TEXT NOT NULL, status TEXT NOT NULL, approval_json TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS pending_approval_digest ON approvals(claim_digest) WHERE status = 'pending';
    CREATE TABLE IF NOT EXISTS replay_claims (agent_id TEXT NOT NULL, nonce TEXT NOT NULL, idempotency_key TEXT NOT NULL, sequence_number INTEGER NOT NULL, claim_id TEXT NOT NULL, claim_digest TEXT NOT NULL, reserved_at TEXT NOT NULL, PRIMARY KEY(agent_id, nonce), UNIQUE(agent_id, idempotency_key), UNIQUE(agent_id, sequence_number));
    CREATE TABLE IF NOT EXISTS agent_sequences (agent_id TEXT PRIMARY KEY, last_sequence INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS executors (executor_id TEXT NOT NULL, executor_version TEXT NOT NULL, manifest_json TEXT NOT NULL, status TEXT NOT NULL, is_current INTEGER NOT NULL, registered_at TEXT NOT NULL, PRIMARY KEY(executor_id, executor_version));
    CREATE UNIQUE INDEX IF NOT EXISTS executors_current ON executors(executor_id) WHERE is_current = 1;
    CREATE TABLE IF NOT EXISTS verifiers (verifier_id TEXT NOT NULL, verifier_version TEXT NOT NULL, manifest_json TEXT NOT NULL, status TEXT NOT NULL, is_current INTEGER NOT NULL, registered_at TEXT NOT NULL, PRIMARY KEY(verifier_id, verifier_version));
    CREATE UNIQUE INDEX IF NOT EXISTS verifiers_current ON verifiers(verifier_id) WHERE is_current = 1;
    CREATE TABLE IF NOT EXISTS execution_capabilities (capability_id TEXT PRIMARY KEY, claim_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL, capability_json TEXT NOT NULL, consumed_at TEXT, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS executions (execution_id TEXT PRIMARY KEY, claim_id TEXT NOT NULL UNIQUE, capability_id TEXT NOT NULL UNIQUE, status TEXT NOT NULL, execution_json TEXT NOT NULL, outbox_state TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS assurance_tasks (task_id TEXT PRIMARY KEY, task_type TEXT NOT NULL, subject_id TEXT NOT NULL, status TEXT NOT NULL, task_json TEXT NOT NULL, available_at TEXT NOT NULL, expires_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(task_type, subject_id));
    CREATE INDEX IF NOT EXISTS assurance_tasks_due ON assurance_tasks(status, available_at);
    CREATE TABLE IF NOT EXISTS incidents (incident_id TEXT PRIMARY KEY, execution_id TEXT NOT NULL UNIQUE, claim_id TEXT NOT NULL, status TEXT NOT NULL, incident_json TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS resource_holds (resource_key TEXT PRIMARY KEY, incident_id TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, released_at TEXT);
    CREATE TABLE IF NOT EXISTS evidence (ledger_sequence INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL UNIQUE, event_digest TEXT NOT NULL, previous_event_digest TEXT, envelope_json TEXT NOT NULL, recorded_at TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS evidence_no_update BEFORE UPDATE ON evidence BEGIN SELECT RAISE(ABORT, 'evidence ledger is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS evidence_no_delete BEFORE DELETE ON evidence BEGIN SELECT RAISE(ABORT, 'evidence ledger is append-only'); END;
  `);
  return db;
}

export function createOpaEvaluator({ url = process.env.PALO_OPA_URL, timeoutMs = 3000 } = {}) {
  if (!url) return async () => ({ status: "denied", reasons: ["OPA endpoint is not configured"], obligations: ["restore_policy_service"] });
  const endpoint = `${url.replace(/\/$/, "")}/v1/data/palo/agentic/governance/action_decision`;
  return async (input) => {
    try { assertSchema("palo-agentic-policy-input", input); }
    catch (error) { return { status: "denied", reasons: [`Malformed policy input: ${error.message}`], obligations: ["repair_policy_input"] }; }
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input }), signal: controller.signal });
      if (!response.ok) throw new Error(`OPA returned HTTP ${response.status}`);
      const body = await response.json();
      if (!body.result || !["allowed", "denied", "pending_approval"].includes(body.result.status)) throw new Error("OPA returned an invalid or undefined decision");
      return body.result;
    } catch (error) {
      return { status: "denied", reasons: [`Policy evaluation unavailable: ${error.message}`], obligations: ["restore_policy_service"] };
    } finally { clearTimeout(timer); }
  };
}

export class GovernanceRuntime {
  constructor({
    dataDir = process.env.PALO_DATA_DIR || path.resolve(".palo-agentic"),
    keys,
    evidenceSigning = loadEvidenceSigningFromEnvironment(),
    evidencePublicKeys = loadJsonObjectFromEnvironment("PALO_EVIDENCE_PUBLIC_KEYS_JSON"),
    identityPolicy = loadJsonObjectFromEnvironment("PALO_IDENTITY_POLICY_JSON"),
    authorityVerifier,
    telemetry = telemetryFromEnvironment(),
    guardrails = loadJsonObjectFromEnvironment("PALO_RUNTIME_GUARDRAILS_JSON"),
    policyEvaluator,
    enforcementProvider,
    executors = {},
    verifiers = {}
  } = {}) {
    if (policyEvaluator && enforcementProvider) throw new Error("Configure policyEvaluator or enforcementProvider, not both");
    this.dataDir = dataDir;
    this.keys = keys || loadKeysFromEnvironment();
    this.evidenceSigning = evidenceSigning;
    if (evidenceSigning && (!evidenceSigning.keyId || !evidenceSigning.verificationMethod || !evidenceSigning.publicKey || !evidenceSigning.privateKey)) throw new Error("Ed25519 evidence signing requires keyId, verificationMethod, privateKey and publicKey");
    this.evidencePublicKeys = { ...evidencePublicKeys, ...(evidenceSigning ? { [evidenceSigning.keyId]: evidenceSigning.publicKey, [evidenceSigning.verificationMethod]: evidenceSigning.publicKey } : {}) };
    this.identityPolicy = clone(identityPolicy);
    if (authorityVerifier !== undefined && typeof authorityVerifier !== "function") throw new Error("authorityVerifier must be a function");
    this.authorityVerifier = authorityVerifier;
    this.authorityVerifications = new Map();
    this.telemetry = telemetry;
    this.guardrails = {
      maxDelegationDepth: Number.isInteger(guardrails.maxDelegationDepth) ? guardrails.maxDelegationDepth : 8,
      maxActionsPerMinute: Number.isInteger(guardrails.maxActionsPerMinute) ? guardrails.maxActionsPerMinute : 120,
      maxConcurrentExecutionsPerAgent: Number.isInteger(guardrails.maxConcurrentExecutionsPerAgent) ? guardrails.maxConcurrentExecutionsPerAgent : 5
    };
    const evaluator = policyEvaluator || createOpaEvaluator();
    this.enforcementProvider = enforcementProvider || createFunctionEnforcementProvider(evaluator, policyEvaluator ? {
      providerId: "provider-palo-custom-evaluator",
      displayName: "PALO custom policy evaluator",
      providerType: "embedded-policy-evaluator"
    } : {
      providerId: "provider-palo-opa",
      displayName: "PALO OPA policy evaluator",
      providerType: "opa-policy-runtime"
    });
    validateEnforcementProviderManifest(this.enforcementProvider.manifest);
    assertSchema("palo-agentic-enforcement-provider", this.enforcementProvider.manifest);
    this.executorHandlers = new Map(Object.entries(executors));
    this.verifierHandlers = new Map(Object.entries(verifiers));
    this.db = openDatabase(dataDir);
    this.bootstrapPolicy();
  }

  close() {
    try { this.enforcementProvider?.close?.(); }
    finally { if (this.db?.open) this.db.close(); }
  }

  bootstrapPolicy() {
    const policy = {
      format: "palo-agentic-policy", schemaVersion: "1.0.0", policyId: POLICY_ID, policyVersion: POLICY_VERSION, status: "active",
      regoPackage: "palo.agentic.governance", entrypoint: "action_decision",
      bundleDigest: sha256(readFileSync(path.join(repositoryRoot, "examples/policy-as-code/agent-delegation.rego"), "utf8")),
      metadata: { inputSchemaVersion: "1.0.0", source: "bundled-reference-policy" }
    };
    const current = this.db.prepare("SELECT policy_version, bundle_digest FROM policies WHERE policy_id = ? AND is_current = 1").get(POLICY_ID);
    if (!current || (isNewer(policy.policyVersion, current.policy_version) && current.bundle_digest !== policy.bundleDigest)) this.registerPolicy(policy);
  }

  registerPolicy(policy) {
    assertSchema("palo-agentic-policy", policy);
    const tx = this.db.transaction(() => {
      const current = this.db.prepare("SELECT policy_version, bundle_digest FROM policies WHERE policy_id = ? AND is_current = 1").get(policy.policyId);
      if (current && current.bundle_digest !== policy.bundleDigest && !isNewer(policy.policyVersion, current.policy_version)) throw new Error("Policy replacement requires a strictly newer policyVersion");
      this.db.prepare("UPDATE policies SET is_current = 0 WHERE policy_id = ?").run(policy.policyId);
      this.db.prepare("INSERT OR REPLACE INTO policies VALUES (?, ?, ?, ?, ?, 1, ?)").run(policy.policyId, policy.policyVersion, policy.bundleDigest, JSON.stringify(policy), policy.status, nowIso());
    });
    tx(); return clone(policy);
  }

  async registerAgent(caseId, profile) {
    if (!caseId || profile?.format !== PROFILE_FORMAT) throw new Error("A caseId and canonical PALO agent profile are required");
    assertSchema("palo-agentic-interface", profile);
    if ((profile.status || "active") !== "active") throw new Error("Only active profiles may be registered");
    for (const tool of profile.authority.allowedTools) {
      const schema = profile.authority.argumentSchemas[tool];
      if (!schema) throw new Error(`Missing argument schema for allowed tool ${tool}`);
      try { new Ajv2020({ strict: false }).compile(schema); } catch (error) { throw new Error(`Invalid argument schema for ${tool}: ${error.message}`); }
    }
    const digest = sha256(profile); const stamp = nowIso();
    this.db.transaction(() => {
      const current = this.db.prepare("SELECT profile_version, profile_digest, registered_at FROM profiles WHERE case_id = ? AND agent_id = ? AND is_current = 1").get(caseId, profile.agentId);
      if (current && current.profile_digest !== digest && !isNewer(profile.profileVersion, current.profile_version)) throw new Error("Profile replacement requires a strictly newer profileVersion");
      this.db.prepare("UPDATE profiles SET is_current = 0 WHERE case_id = ? AND agent_id = ?").run(caseId, profile.agentId);
      this.db.prepare("INSERT OR REPLACE INTO profiles VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)").run(caseId, profile.agentId, profile.profileVersion, digest, JSON.stringify(profile), profile.status || "active", current?.registered_at || stamp, stamp);
    })();
    return { profile: clone(profile), caseId, profileDigest: digest, registeredAt: stamp };
  }

  async getProfile(caseId, agentId) {
    const row = this.db.prepare("SELECT profile_json FROM profiles WHERE case_id = ? AND agent_id = ? AND is_current = 1").get(caseId, agentId);
    if (!row) throw new Error("No trusted profile is registered for this agent and case");
    const profile = parse(row.profile_json);
    if ((profile.status || "active") !== "active") throw new Error("Agent profile is not active");
    return profile;
  }

  registerExecutor(manifest, handler) {
    this.validateAdapterManifest(manifest, "executor");
    if (handler !== undefined && typeof handler !== "function") throw new Error("Executor handler must be a function");
    const tx = this.db.transaction(() => {
      const current = this.db.prepare("SELECT executor_version, manifest_json FROM executors WHERE executor_id = ? AND is_current = 1").get(manifest.executorId);
      if (current && !isNewer(manifest.version, current.executor_version) && sha256(parse(current.manifest_json)) !== sha256(manifest)) throw new Error("Executor replacement requires a strictly newer version");
      this.db.prepare("UPDATE executors SET is_current = 0 WHERE executor_id = ?").run(manifest.executorId);
      this.db.prepare("INSERT OR REPLACE INTO executors VALUES (?, ?, ?, ?, 1, ?)").run(manifest.executorId, manifest.version, JSON.stringify(manifest), manifest.status, nowIso());
    });
    tx();
    if (handler) this.executorHandlers.set(manifest.executorId, handler);
    return clone(manifest);
  }

  registerVerifier(manifest, handler) {
    this.validateAdapterManifest(manifest, "verifier");
    if (handler !== undefined && typeof handler !== "function") throw new Error("Verifier handler must be a function");
    const tx = this.db.transaction(() => {
      const current = this.db.prepare("SELECT verifier_version, manifest_json FROM verifiers WHERE verifier_id = ? AND is_current = 1").get(manifest.verifierId);
      if (current && !isNewer(manifest.version, current.verifier_version) && sha256(parse(current.manifest_json)) !== sha256(manifest)) throw new Error("Verifier replacement requires a strictly newer version");
      this.db.prepare("UPDATE verifiers SET is_current = 0 WHERE verifier_id = ?").run(manifest.verifierId);
      this.db.prepare("INSERT OR REPLACE INTO verifiers VALUES (?, ?, ?, ?, 1, ?)").run(manifest.verifierId, manifest.version, JSON.stringify(manifest), manifest.status, nowIso());
    });
    tx();
    if (handler) this.verifierHandlers.set(manifest.verifierId, handler);
    return clone(manifest);
  }

  validateAdapterManifest(manifest, type) {
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error(`${type} manifest must be an object`);
    const idField = `${type}Id`; const expectedFormat = `palo-agentic-${type}`;
    if (manifest.format !== expectedFormat || manifest.schemaVersion !== "1.0.0" || !new RegExp(`^${type}-[a-zA-Z0-9][a-zA-Z0-9._-]{2,100}$`).test(manifest[idField] || "")) throw new Error(`Invalid ${type} manifest identity`);
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version || "") || manifest.status !== "active") throw new Error(`${type} manifest requires an active semantic version`);
    const capabilityField = type === "executor" ? "supportedTools" : "supportedResources";
    if (!Array.isArray(manifest[capabilityField]) || !manifest[capabilityField].length || manifest[capabilityField].some((item) => typeof item !== "string" || !item)) throw new Error(`${type} manifest requires ${capabilityField}`);
    if (type === "executor" && typeof manifest.supportsIdempotency !== "boolean") throw new Error("Executor manifest must declare supportsIdempotency");
  }

  getAdapterManifest(type, adapterId) {
    const table = type === "executor" ? "executors" : "verifiers";
    const idColumn = type === "executor" ? "executor_id" : "verifier_id";
    const row = this.db.prepare(`SELECT manifest_json FROM ${table} WHERE ${idColumn} = ? AND is_current = 1 AND status = 'active'`).get(adapterId);
    if (!row) throw new Error(`No active trusted ${type} is registered for ${adapterId}`);
    return parse(row.manifest_json);
  }

  getSigningMaterial(claim, profileVersion) {
    const row = profileVersion
      ? this.db.prepare("SELECT profile_json FROM profiles WHERE case_id = ? AND agent_id = ? AND profile_version = ?").get(claim.caseId, claim.agentId, profileVersion)
      : this.db.prepare("SELECT profile_json FROM profiles WHERE case_id = ? AND agent_id = ? AND is_current = 1").get(claim.caseId, claim.agentId);
    if (!row) throw new Error("No trusted profile is available for signing");
    const profile = parse(row.profile_json); const secret = this.keys[profile.evidence.keyId];
    if (!secret || Buffer.byteLength(secret) < 32) throw new Error(`A signing secret of at least 32 bytes is required for ${profile.evidence.keyId}`);
    return { profile, keyId: profile.evidence.keyId, secret };
  }

  signContract(name, contract, secret) {
    const unsigned = clone(contract); delete unsigned.signature;
    unsigned.signature = signHmac(unsigned, secret);
    assertSchema(name, unsigned);
    return unsigned;
  }

  getPolicy() {
    const row = this.db.prepare("SELECT policy_json FROM policies WHERE policy_id = ? AND is_current = 1 AND status = 'active'").get(POLICY_ID);
    if (!row) throw new Error("No active trusted policy is registered");
    return parse(row.policy_json);
  }

  async getRegistry() {
    return {
      enforcementProvider: clone(this.enforcementProvider.manifest),
      profiles: this.db.prepare("SELECT case_id AS caseId, agent_id AS agentId, profile_version AS profileVersion, profile_digest AS profileDigest, status, registered_at AS registeredAt, updated_at AS updatedAt FROM profiles ORDER BY agent_id, profile_version").all(),
      policies: this.db.prepare("SELECT policy_id AS policyId, policy_version AS policyVersion, bundle_digest AS bundleDigest, status, registered_at AS registeredAt FROM policies ORDER BY policy_id, policy_version").all(),
      executors: this.db.prepare("SELECT executor_id AS executorId, executor_version AS version, status, registered_at AS registeredAt FROM executors ORDER BY executor_id, executor_version").all(),
      verifiers: this.db.prepare("SELECT verifier_id AS verifierId, verifier_version AS version, status, registered_at AS registeredAt FROM verifiers ORDER BY verifier_id, verifier_version").all()
    };
  }

  emit(name, claim, attributes = {}) {
    const traceId = attributes.traceId || resolveTraceId(claim);
    return emitTelemetry(this.telemetry, name, {
      traceId,
      ...(claim?.caseId ? { caseId: claim.caseId } : {}),
      ...(claim?.claimId ? { claimId: claim.claimId } : {}),
      ...(claim?.agentId ? { agentId: claim.agentId } : {}),
      ...attributes
    });
  }

  evaluateRuntimeGuardrails(claim) {
    const authority = validateAuthorityContext(claim, { ...this.identityPolicy, maxDelegationDepth: this.guardrails.maxDelegationDepth });
    const violations = [...authority.violations];
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const recentActions = this.db.prepare("SELECT COUNT(*) AS total FROM replay_claims WHERE agent_id = ? AND reserved_at >= ?").get(claim.agentId, oneMinuteAgo).total;
    if (recentActions >= this.guardrails.maxActionsPerMinute) violations.push(`Action rate exceeds ${this.guardrails.maxActionsPerMinute} claims per minute`);
    const activeExecutions = this.db.prepare("SELECT execution_json FROM executions WHERE status IN ('executing','executed','execution_unknown')").all()
      .map((row) => parse(row.execution_json))
      .filter((execution) => execution.claim.agentId === claim.agentId).length;
    if (activeExecutions >= this.guardrails.maxConcurrentExecutionsPerAgent) violations.push(`Concurrent execution limit ${this.guardrails.maxConcurrentExecutionsPerAgent} reached`);
    return { allowed: violations.length === 0, authorityMode: authority.mode, recentActions, activeExecutions, violations };
  }

  async verifyCryptographicAuthority(claim) {
    if (claim.schemaVersion !== "1.3.0") return { valid: true, verifierId: "legacy-contract", verifiedAt: nowIso() };
    if (!this.authorityVerifier) return { valid: false, reasons: ["Action Claim 1.3 requires a configured cryptographic authority verifier"] };
    try {
      const result = await this.authorityVerifier(clone(claim.authorityContext), clone(claim));
      if (!result || result.valid !== true) return { valid: false, reasons: result?.reasons?.length ? result.reasons.map(String) : ["Authority credentials or proof could not be verified"] };
      const verification = {
        valid: true,
        verifierId: String(result.verifierId || "configured-authority-verifier"),
        verifiedAt: nowIso(),
        humanCredentialDigest: claim.authorityContext.humanPrincipal.credentialDigest,
        workloadCredentialDigest: claim.authorityContext.workloadIdentity.credentialDigest,
        ...(result.evidenceDigest ? { evidenceDigest: String(result.evidenceDigest) } : {})
      };
      this.authorityVerifications.set(claim.claimId, verification);
      return verification;
    } catch (error) {
      return { valid: false, reasons: [`Authority verification unavailable: ${error.message}`] };
    }
  }

  createTask({ taskType, subjectId, status = "queued", availableAt = nowIso(), expiresAt, claim, payload = {}, maxAttempts = 1 }) {
    if (!["approval", "verification"].includes(taskType)) throw new Error("Unsupported assurance task type");
    if (!["queued", "input_required"].includes(status)) throw new Error("New assurance task must be queued or input_required");
    const existing = this.db.prepare("SELECT task_json FROM assurance_tasks WHERE task_type = ? AND subject_id = ?").get(taskType, subjectId);
    if (existing) return parse(existing.task_json);
    const createdAt = nowIso();
    const task = {
      format: "palo-assurance-task",
      schemaVersion: "1.0.0",
      taskId: id("task"),
      taskType,
      subjectId,
      status,
      availableAt,
      ...(expiresAt ? { expiresAt } : {}),
      attempts: 0,
      maxAttempts: Math.max(1, Math.min(Number(maxAttempts) || 1, 10)),
      createdAt,
      updatedAt: createdAt,
      ...(claim ? { caseId: claim.caseId, claimId: claim.claimId, agentId: claim.agentId, traceId: resolveTraceId(claim) } : {}),
      payload: clone(payload)
    };
    this.db.prepare("INSERT INTO assurance_tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(task.taskId, task.taskType, task.subjectId, task.status, JSON.stringify(task), task.availableAt, task.expiresAt || null, task.createdAt, task.updatedAt);
    this.emit("palo.task.created", claim, { traceId: task.traceId, taskId: task.taskId, taskType, status });
    return clone(task);
  }

  transitionTask(taskId, nextStatus, { result, error, availableAt, incrementAttempts = false } = {}) {
    const allowedStatuses = ["queued", "input_required", "running", "completed", "failed", "cancelled", "expired"];
    if (!allowedStatuses.includes(nextStatus)) throw new Error("Invalid assurance task status");
    return this.db.transaction(() => {
      const row = this.db.prepare("SELECT task_json FROM assurance_tasks WHERE task_id = ?").get(taskId);
      if (!row) throw new Error("Assurance task not found");
      const task = parse(row.task_json);
      const previousStatus = task.status;
      const terminal = ["completed", "failed", "cancelled", "expired"];
      if (terminal.includes(task.status)) {
        if (task.status === nextStatus) return task;
        throw new Error("Assurance task is already terminal");
      }
      task.status = nextStatus;
      task.updatedAt = nowIso();
      if (availableAt) task.availableAt = availableAt;
      if (incrementAttempts) task.attempts += 1;
      if (result !== undefined) task.result = clone(result);
      if (error !== undefined) task.error = String(error);
      const updated = this.db.prepare("UPDATE assurance_tasks SET status = ?, task_json = ?, available_at = ?, updated_at = ? WHERE task_id = ? AND status = ?").run(task.status, JSON.stringify(task), task.availableAt, task.updatedAt, task.taskId, previousStatus);
      if (updated.changes !== 1) throw new Error("Assurance task was transitioned concurrently");
      return clone(task);
    })();
  }

  transitionTaskBySubject(taskType, subjectId, nextStatus, options = {}) {
    const row = this.db.prepare("SELECT task_id FROM assurance_tasks WHERE task_type = ? AND subject_id = ?").get(taskType, subjectId);
    return row ? this.transitionTask(row.task_id, nextStatus, options) : null;
  }

  async getTask(taskId) {
    const row = this.db.prepare("SELECT task_json FROM assurance_tasks WHERE task_id = ?").get(taskId);
    if (!row) throw new Error("Assurance task not found");
    return parse(row.task_json);
  }

  async listTasks({ status = "all", taskType = "all", limit = 100 } = {}) {
    const statuses = ["queued", "input_required", "running", "completed", "failed", "cancelled", "expired", "all"];
    if (!statuses.includes(status) || !["approval", "verification", "all"].includes(taskType)) throw new Error("Invalid assurance task filter");
    return this.db.prepare("SELECT task_json FROM assurance_tasks WHERE (? = 'all' OR status = ?) AND (? = 'all' OR task_type = ?) ORDER BY updated_at DESC LIMIT ?")
      .all(status, status, taskType, taskType, Math.max(1, Math.min(limit, 500))).map((row) => parse(row.task_json));
  }

  async processDueTasks({ limit = 25 } = {}) {
    const stamp = nowIso();
    const due = this.db.prepare("SELECT task_json FROM assurance_tasks WHERE ((status = 'queued' AND available_at <= ?) OR (task_type = 'approval' AND status = 'input_required' AND expires_at IS NOT NULL AND expires_at <= ?)) ORDER BY available_at LIMIT ?")
      .all(stamp, stamp, Math.max(1, Math.min(limit, 100))).map((row) => parse(row.task_json));
    const processed = [];
    for (const task of due) {
      if (task.taskType === "approval") {
        await this.resolveApproval(task.subjectId, "expired", "palo-task-processor", "Approval task expired before resolution");
        processed.push(await this.getTask(task.taskId));
        continue;
      }
      if (task.taskType === "verification") {
        this.transitionTask(task.taskId, "running", { incrementAttempts: true });
        try {
          const result = await this.verifyOutcome(task.subjectId, { force: true });
          const currentTask = await this.getTask(task.taskId);
          const executionRow = this.db.prepare("SELECT execution_json FROM executions WHERE execution_id = ?").get(task.subjectId);
          const execution = executionRow ? parse(executionRow.execution_json) : null;
          const retryable = result.attestation?.status === "inconclusive"
            && execution?.claim.effectContract.verification.onInconclusive === "retry_then_review"
            && currentTask.attempts < currentTask.maxAttempts
            && (!currentTask.expiresAt || Date.parse(currentTask.expiresAt) > Date.now());
          const status = result.status === "verified" ? "completed" : retryable ? "queued" : "input_required";
          const retryBackoff = execution?.claim.effectContract.verification.retryBackoffSeconds || 5;
          const updated = this.transitionTask(task.taskId, status, { result, ...(retryable ? { availableAt: new Date(Date.now() + retryBackoff * 1000).toISOString() } : {}) });
          processed.push(updated);
        } catch (error) {
          processed.push(this.transitionTask(task.taskId, "failed", { error: error.message }));
        }
      }
    }
    return { processed: processed.length, tasks: processed };
  }

  async getOperationalSnapshot() {
    const count = (table, where = "") => this.db.prepare(`SELECT COUNT(*) AS total FROM ${table} ${where}`).get().total;
    const ledger = await this.verifyLedger();
    return {
      recordedAt: nowIso(),
      approvals: { pending: count("approvals", "WHERE status = 'pending'") },
      tasks: {
        queued: count("assurance_tasks", "WHERE status = 'queued'"),
        inputRequired: count("assurance_tasks", "WHERE status = 'input_required'"),
        failed: count("assurance_tasks", "WHERE status = 'failed'")
      },
      executions: {
        active: count("executions", "WHERE status IN ('executing','executed','execution_unknown')"),
        verified: count("executions", "WHERE status = 'verified'"),
        reviewRequired: count("executions", "WHERE status IN ('mismatch','inconclusive')")
      },
      incidents: { open: count("incidents", "WHERE status != 'resolved'") },
      evidenceLedger: ledger,
      guardrails: clone(this.guardrails)
    };
  }

  validateArguments(claim, profile) {
    const schema = profile.authority.argumentSchemas[claim.action.tool];
    if (!schema) throw new Error(`No trusted argument schema is registered for ${claim.action.tool}`);
    if (sha256(schema) !== claim.action.argumentSchemaDigest) throw new Error("argumentSchemaDigest does not match the trusted tool schema");
    const validator = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
    if (!validator(claim.action.arguments)) throw new Error(`Tool arguments rejected: ${new Ajv2020().errorsText(validator.errors)}`);
  }

  reserveReplay(claim, digest) {
    return this.db.transaction(() => {
      const byIdem = this.db.prepare("SELECT claim_id, claim_digest FROM replay_claims WHERE agent_id = ? AND idempotency_key = ?").get(claim.agentId, claim.idempotencyKey);
      if (byIdem) {
        if (byIdem.claim_id === claim.claimId && byIdem.claim_digest === digest) return "idempotent";
        throw new Error("Idempotency key replayed with different claim content");
      }
      if (this.db.prepare("SELECT 1 FROM replay_claims WHERE agent_id = ? AND nonce = ?").get(claim.agentId, claim.nonce)) throw new Error("Nonce replay detected");
      const sequence = this.db.prepare("SELECT last_sequence FROM agent_sequences WHERE agent_id = ?").get(claim.agentId)?.last_sequence || 0;
      if (claim.sequenceNumber !== sequence + 1) throw new Error(`Sequence number must be ${sequence + 1}`);
      this.db.prepare("INSERT INTO replay_claims VALUES (?, ?, ?, ?, ?, ?, ?)").run(claim.agentId, claim.nonce, claim.idempotencyKey, claim.sequenceNumber, claim.claimId, digest, nowIso());
      this.db.prepare("INSERT INTO agent_sequences(agent_id,last_sequence) VALUES(?,?) ON CONFLICT(agent_id) DO UPDATE SET last_sequence=excluded.last_sequence").run(claim.agentId, claim.sequenceNumber);
      return "reserved";
    })();
  }

  async verifyAction(inputClaim, approvalId, { revalidate = false } = {}) {
    let claim;
    try { claim = normalizeActionClaim(inputClaim); }
    catch (error) { return this.persistDeniedMalformed(inputClaim, error.message); }
    const digest = sha256(claim);
    const existingRow = this.db.prepare("SELECT claim_digest, decision_json FROM decisions WHERE claim_id = ?").get(claim.claimId);
    if (Date.parse(claim.expiresAt) <= Date.now() || Date.parse(claim.requestedAt) > Date.now() + 30000) return this.persistDecision(claim, digest, { status: "denied", reasons: ["Claim is expired or not yet valid"], obligations: [] });
    if (existingRow) {
      if (existingRow.claim_digest !== digest) return this.persistDecision(claim, digest, { status: "denied", reasons: ["claimId replayed with different content"], obligations: ["rotate_claim_id"] });
      const existing = parse(existingRow.decision_json);
      if (!revalidate && (!approvalId || existing.status !== "pending_approval")) return existing;
    }
    let profile; let policy;
    try { profile = await this.getProfile(claim.caseId, claim.agentId); policy = this.getPolicy(); this.validateArguments(claim, profile); }
    catch (error) { return this.persistDecision(claim, digest, { status: "denied", reasons: [error.message], obligations: ["register_trusted_authority"] }); }
    const authorityContext = validateAuthorityContext(claim, { ...this.identityPolicy, maxDelegationDepth: this.guardrails.maxDelegationDepth });
    if (!authorityContext.valid) return this.persistDecision(claim, digest, { status: "denied", reasons: authorityContext.violations, obligations: ["repair_authority_context"] }, profile);
    const authorityVerification = await this.verifyCryptographicAuthority(claim);
    if (!authorityVerification.valid) return this.persistDecision(claim, digest, { status: "denied", reasons: authorityVerification.reasons, obligations: ["configure_or_repair_authority_verifier"] }, profile);
    if (!existingRow) {
      const guardrailDecision = this.evaluateRuntimeGuardrails(claim);
      if (!guardrailDecision.allowed) return this.persistDecision(claim, digest, { status: "denied", reasons: guardrailDecision.violations, obligations: ["repair_authority_or_wait_for_runtime_budget"] }, profile);
      this.emit("palo.action.accepted_for_policy", claim, { authorityMode: guardrailDecision.authorityMode, authorityVerifierId: authorityVerification.verifierId, recentActions: guardrailDecision.recentActions, activeExecutions: guardrailDecision.activeExecutions });
    }
    if (!existingRow) {
      try { this.reserveReplay(claim, digest); }
      catch (error) { return this.persistDecision(claim, digest, { status: "denied", reasons: [error.message], obligations: ["rotate_replay_material"] }, profile); }
    }
    let approval = null;
    if (approvalId) {
      try {
        approval = await this.getApproval(approvalId);
        if (approval.claimDigest !== digest || approval.claimId !== claim.claimId) throw new Error("Approval does not bind to this exact action claim");
      } catch (error) { return this.persistDecision(claim, digest, { status: "denied", reasons: [error.message], obligations: ["obtain_bound_human_approval"] }, profile); }
    }
    const policyInput = { claim, claim_digest: digest, profile, policy, approval, now: nowIso() };
    const result = await evaluateEnforcementProvider(this.enforcementProvider, policyInput);
    if (result.status === "pending_approval") {
      const pendingApproval = approval?.status === "pending" ? approval : await this.requestApproval(claim, digest, "palo-policy-engine");
      result.approvalId = pendingApproval.approvalId;
    }
    return this.persistDecision(claim, digest, result, profile);
  }

  persistDeniedMalformed(input, reason) {
    const claimId = typeof input?.claimId === "string" ? input.claimId : `claim-${randomUUID()}`;
    const decision = { format: "palo-agentic-policy-decision", schemaVersion: "1.0.0", decisionId: id("decision"), claimId, agentId: typeof input?.agentId === "string" ? input.agentId : "agent-invalid-claim", status: "denied", reasons: [`Malformed Action Claim: ${reason}`], policyVersion: `${POLICY_ID}/${POLICY_VERSION}`, profileVersion: "unknown", claimDigest: sha256(input || {}), decidedAt: nowIso(), obligations: ["repair_action_claim"] };
    assertSchema("palo-agentic-policy-decision", decision);
    return decision;
  }

  persistDecision(claim, claimDigest, result, profile) {
    const decision = {
      format: "palo-agentic-policy-decision", schemaVersion: "1.0.0", decisionId: id("decision"), claimId: claim.claimId, agentId: claim.agentId,
      status: result.status === "allowed" ? "allowed" : result.status === "pending_approval" ? "pending_approval" : "denied",
      reasons: result.reasons?.length ? result.reasons : ["Policy returned no explanatory reason"], policyVersion: result.policyVersion || `${POLICY_ID}/${POLICY_VERSION}`,
      profileVersion: profile?.profileVersion || "unknown", claimDigest, decidedAt: nowIso(), obligations: result.obligations || []
    };
    if (result.approvalId) decision.approvalId = result.approvalId;
    if (result.enforcementProvider) decision.enforcementProvider = result.enforcementProvider;
    assertSchema("palo-agentic-policy-decision", decision);
    this.db.prepare("INSERT INTO decisions VALUES (?, ?, ?, ?) ON CONFLICT(claim_id) DO UPDATE SET claim_digest=excluded.claim_digest, decision_json=excluded.decision_json, updated_at=excluded.updated_at").run(claim.claimId, claimDigest, JSON.stringify(decision), nowIso());
    if (profile) this.recordEvidence({ claim, decision, outcome: decision.status, payload: { action: claim.action, requestedScopes: claim.requestedScopes, ...(this.authorityVerifications.has(claim.claimId) ? { authorityVerification: this.authorityVerifications.get(claim.claimId) } : {}), ...(decision.enforcementProvider ? { enforcementProvider: decision.enforcementProvider } : {}) } });
    this.emit("palo.policy.decision", claim, { decisionId: decision.decisionId, status: decision.status, policyVersion: decision.policyVersion });
    return decision;
  }

  async requestApproval(inputClaim, claimDigest, requestedBy, ttlSeconds = 900) {
    const claim = normalizeActionClaim(inputClaim); const digest = claimDigest || sha256(claim);
    const existing = this.db.prepare("SELECT approval_json FROM approvals WHERE claim_digest = ? AND status = 'pending'").get(digest);
    if (existing) {
      const approval = parse(existing.approval_json);
      this.createTask({ taskType: "approval", subjectId: approval.approvalId, status: "input_required", availableAt: approval.requestedAt, expiresAt: approval.expiresAt, claim, payload: { approvalId: approval.approvalId, claimDigest: approval.claimDigest } });
      return approval;
    }
    const resolvedRequestedBy = requestedBy ?? claim.agentId;
    const approval = { format: "palo-agentic-approval", schemaVersion: "1.0.0", approvalId: id("approval"), claimId: claim.claimId, claimDigest: digest, caseId: claim.caseId, agentId: claim.agentId, status: "pending", requestedBy: resolvedRequestedBy, requestedAt: nowIso(), expiresAt: new Date(Date.now() + Math.max(30, Math.min(ttlSeconds, 86400)) * 1000).toISOString() };
    assertSchema("palo-agentic-approval", approval);
    this.db.prepare("INSERT INTO approvals VALUES (?, ?, ?, ?, ?, ?)").run(approval.approvalId, approval.claimId, approval.claimDigest, approval.status, JSON.stringify(approval), nowIso());
    this.createTask({ taskType: "approval", subjectId: approval.approvalId, status: "input_required", availableAt: approval.requestedAt, expiresAt: approval.expiresAt, claim, payload: { approvalId: approval.approvalId, claimDigest: approval.claimDigest } });
    this.emit("palo.approval.requested", claim, { approvalId: approval.approvalId, expiresAt: approval.expiresAt });
    return approval;
  }

  async getApproval(approvalId) {
    const row = this.db.prepare("SELECT approval_json FROM approvals WHERE approval_id = ?").get(approvalId);
    if (!row) throw new Error("Approval not found");
    const approval = parse(row.approval_json);
    if (approval.status === "pending" && Date.parse(approval.expiresAt) <= Date.now()) return this.resolveApproval(approvalId, "expired", "palo-policy-engine", "Approval expired before resolution");
    return approval;
  }

  async listApprovals(status = "pending") {
    return this.db.prepare("SELECT approval_json FROM approvals WHERE (? = 'all' OR status = ?) ORDER BY updated_at DESC").all(status, status).map((row) => parse(row.approval_json));
  }

  async resolveApproval(approvalId, status, resolvedBy, rationale) {
    if (!["approved", "denied", "cancelled", "expired"].includes(status)) throw new Error("Invalid terminal approval status");
    if (!resolvedBy || !rationale) throw new Error("Resolver identity and rationale are required");
    const approval = this.db.transaction(() => {
      const row = this.db.prepare("SELECT approval_json FROM approvals WHERE approval_id = ?").get(approvalId);
      if (!row) throw new Error("Approval not found");
      const approval = parse(row.approval_json);
      if (approval.status !== "pending") { if (approval.status === status) return approval; throw new Error("Approval is already in a terminal state"); }
      approval.status = status; approval.resolvedBy = resolvedBy; approval.resolvedAt = nowIso(); approval.rationale = rationale;
      assertSchema("palo-agentic-approval", approval);
      this.db.prepare("UPDATE approvals SET status = ?, approval_json = ?, updated_at = ? WHERE approval_id = ?").run(status, JSON.stringify(approval), nowIso(), approvalId);
      return clone(approval);
    })();
    const taskStatus = status === "expired" ? "expired" : status === "cancelled" ? "cancelled" : "completed";
    this.transitionTaskBySubject("approval", approvalId, taskStatus, { result: approval });
    this.emit("palo.approval.resolved", null, { approvalId, status, resolvedBy });
    return approval;
  }

  verifySignedContract(name, contract, keyId) {
    try { assertSchema(name, contract); } catch { return false; }
    const secret = this.keys[keyId || contract.keyId]; if (!secret) return false;
    const unsigned = clone(contract); delete unsigned.signature;
    const expected = signHmac(unsigned, secret);
    const actualBuffer = Buffer.from(contract.signature); const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  }

  resourceKey(claim) {
    const tenant = claim.effectContract?.resourceSelector?.tenantId || claim.metadata?.tenantId || claim.caseId;
    return `${tenant}:${claim.action.resource}:${claim.action.path}`;
  }

  issueExecutionCapability(claim, decision, executorId, verifierId, ttlSeconds = 60) {
    if (!["1.2.0", "1.3.0"].includes(claim.schemaVersion) || !claim.effectContract) throw new Error("Governed execution requires Action Claim schemaVersion 1.2.0 or 1.3.0 with an Effect Contract");
    if (decision.status !== "allowed" || decision.claimId !== claim.claimId || decision.claimDigest !== sha256(claim)) throw new Error("Execution capability requires the current allowed decision for the exact Action Claim");
    const executor = this.getAdapterManifest("executor", executorId); const verifier = this.getAdapterManifest("verifier", verifierId);
    if (!executor.supportedTools.includes(claim.action.tool)) throw new Error(`Executor ${executorId} is not trusted for ${claim.action.tool}`);
    if (!verifier.supportedResources.includes(claim.action.resource) && !verifier.supportedResources.includes("*")) throw new Error(`Verifier ${verifierId} is not trusted for ${claim.action.resource}`);
    const hold = this.db.prepare("SELECT incident_id FROM resource_holds WHERE resource_key = ? AND released_at IS NULL").get(this.resourceKey(claim));
    if (hold) throw new Error(`Resource is held by assurance incident ${hold.incident_id}`);
    const existing = this.db.prepare("SELECT capability_json FROM execution_capabilities WHERE claim_id = ?").get(claim.claimId);
    if (existing) {
      const capability = parse(existing.capability_json);
      if (capability.claimDigest !== sha256(claim) || capability.executorId !== executorId || capability.verifierId !== verifierId) throw new Error("Claim already has a differently bound execution capability");
      return capability;
    }
    const { keyId, secret } = this.getSigningMaterial(claim); const issuedAt = nowIso();
    const capability = this.signContract("palo-agentic-execution-capability", {
      format: "palo-agentic-execution-capability", schemaVersion: "1.0.0", capabilityId: id("capability"), claimId: claim.claimId,
      claimDigest: sha256(claim), decisionId: decision.decisionId, caseId: claim.caseId, agentId: claim.agentId, executorId, verifierId,
      resource: claim.action.resource, path: claim.action.path, ...(claim.effectContract.resourceSelector.tenantId ? { tenantId: claim.effectContract.resourceSelector.tenantId } : {}),
      issuedAt, expiresAt: new Date(Date.now() + Math.max(5, Math.min(ttlSeconds, 300)) * 1000).toISOString(), singleUse: true, status: "issued", keyId, algorithm: "HMAC-SHA256"
    }, secret);
    this.db.prepare("INSERT INTO execution_capabilities VALUES (?, ?, ?, ?, NULL, ?)").run(capability.capabilityId, capability.claimId, capability.status, JSON.stringify(capability), issuedAt);
    return capability;
  }

  revokeExecutionCapability(capabilityId) {
    return this.db.transaction(() => {
      const row = this.db.prepare("SELECT capability_json FROM execution_capabilities WHERE capability_id = ?").get(capabilityId);
      if (!row) throw new Error("Execution capability not found");
      const capability = parse(row.capability_json);
      if (capability.status === "consumed") throw new Error("Consumed capability cannot be revoked");
      if (capability.status === "revoked") return capability;
      const secret = this.keys[capability.keyId]; capability.status = "revoked";
      const signed = this.signContract("palo-agentic-execution-capability", capability, secret);
      this.db.prepare("UPDATE execution_capabilities SET status = 'revoked', capability_json = ?, updated_at = ? WHERE capability_id = ?").run(JSON.stringify(signed), nowIso(), capabilityId);
      return signed;
    })();
  }

  consumeCapabilityAndCreateExecution(capability, claim, decision, preState, resourceVersion) {
    const result = this.db.transaction(() => {
      const existing = this.db.prepare("SELECT execution_json FROM executions WHERE claim_id = ?").get(claim.claimId);
      if (existing) return { execution: parse(existing.execution_json) };
      const row = this.db.prepare("SELECT capability_json, status FROM execution_capabilities WHERE capability_id = ?").get(capability.capabilityId);
      if (!row) throw new Error("Execution capability not found");
      const current = parse(row.capability_json);
      if (row.status !== "issued" || current.status !== "issued") throw new Error("Execution capability is not available for consumption");
      if (Date.parse(current.expiresAt) <= Date.now()) {
        current.status = "expired";
        const signedExpired = this.signContract("palo-agentic-execution-capability", current, this.keys[current.keyId]);
        this.db.prepare("UPDATE execution_capabilities SET status = 'expired', capability_json = ?, updated_at = ? WHERE capability_id = ?").run(JSON.stringify(signedExpired), nowIso(), current.capabilityId);
        return { expired: true };
      }
      if (!this.verifySignedContract("palo-agentic-execution-capability", current)) throw new Error("Execution capability signature is invalid");
      if (current.claimDigest !== sha256(claim) || current.decisionId !== decision.decisionId || current.resource !== claim.action.resource || current.path !== claim.action.path) throw new Error("Execution capability binding mismatch");
      current.status = "consumed";
      const consumed = this.signContract("palo-agentic-execution-capability", current, this.keys[current.keyId]); const consumedAt = nowIso();
      const consumedUpdate = this.db.prepare("UPDATE execution_capabilities SET status = 'consumed', capability_json = ?, consumed_at = ?, updated_at = ? WHERE capability_id = ? AND status = 'issued'").run(JSON.stringify(consumed), consumedAt, consumedAt, current.capabilityId);
      if (consumedUpdate.changes !== 1) throw new Error("Execution capability was consumed concurrently");
      const execution = {
        executionId: id("execution"), claim, decision, capability: consumed, status: "executing", preState: clone(preState), preStateDigest: sha256(preState),
        ...(resourceVersion !== undefined && resourceVersion !== null ? { resourceVersion: String(resourceVersion) } : {}), startedAt: consumedAt
      };
      this.db.prepare("INSERT INTO executions VALUES (?, ?, ?, ?, ?, 'pending', ?)").run(execution.executionId, claim.claimId, consumed.capabilityId, execution.status, JSON.stringify(execution), consumedAt);
      return { execution };
    })();
    if (result.expired) throw new Error("Execution capability expired before consumption");
    return result.execution;
  }

  async executeGovernedAction(inputClaim, { approvalId, executorId, verifierId, capabilityTtlSeconds = 60 } = {}) {
    const claim = normalizeActionClaim(inputClaim);
    if (!["1.2.0", "1.3.0"].includes(claim.schemaVersion)) throw new Error("Full-cycle governed execution requires Action Claim schemaVersion 1.2.0 or 1.3.0");
    const existing = this.db.prepare("SELECT execution_id FROM executions WHERE claim_id = ?").get(claim.claimId);
    if (existing) return this.getExecution(existing.execution_id);
    const decision = await this.verifyAction(claim, approvalId, { revalidate: true });
    if (decision.status !== "allowed") return { status: decision.status === "pending_approval" ? "review_required" : "denied", executed: false, decision };
    const capability = this.issueExecutionCapability(claim, decision, executorId, verifierId, capabilityTtlSeconds);
    const verifier = this.verifierHandlers.get(verifierId); const executor = this.executorHandlers.get(executorId);
    if (!verifier) { this.revokeExecutionCapability(capability.capabilityId); throw new Error(`Trusted verifier handler ${verifierId} is unavailable`); }
    if (!executor) { this.revokeExecutionCapability(capability.capabilityId); throw new Error(`Trusted executor handler ${executorId} is unavailable`); }
    let observed;
    try { observed = await verifier({ phase: "pre", claim: clone(claim), capability: clone(capability) }); }
    catch (error) { this.revokeExecutionCapability(capability.capabilityId); return { status: "review_required", executed: false, decision, reason: `Authoritative pre-state unavailable: ${error.message}` }; }
    if (!observed || typeof observed.state !== "object" || observed.state === null) { this.revokeExecutionCapability(capability.capabilityId); return { status: "review_required", executed: false, decision, reason: "Authoritative pre-state is unavailable" }; }
    const preconditionChecks = claim.effectContract.preconditions.map((predicate) => evaluatePredicate(predicate, observed.state, observed.state, "precondition"));
    if (preconditionChecks.some((check) => check.status !== "pass")) {
      this.revokeExecutionCapability(capability.capabilityId);
      return { status: "denied", executed: false, decision, reason: "Effect Contract preconditions are not satisfied", preconditionChecks };
    }
    const execution = this.consumeCapabilityAndCreateExecution(capability, claim, decision, observed.state, observed.resourceVersion);
    this.emit("palo.execution.started", claim, { executionId: execution.executionId, executorId, verifierId });
    const adapterManifest = this.getAdapterManifest("executor", executorId);
    let result = {}; let receiptStatus = "succeeded"; let executionError;
    try {
      result = await executor({ claim: clone(claim), arguments: clone(claim.action.arguments), idempotencyKey: claim.idempotencyKey, preState: clone(observed.state), resourceVersion: observed.resourceVersion, supportsIdempotency: adapterManifest.supportsIdempotency });
    } catch (error) {
      executionError = error instanceof Error ? error.message : String(error);
      receiptStatus = error?.unknownOutcome ? "unknown" : "failed";
      result = { error: executionError };
    }
    const { keyId, secret, profile } = this.getSigningMaterial(claim, decision.profileVersion); const completedAt = nowIso();
    const receipt = this.signContract("palo-agentic-execution-receipt", {
      format: "palo-agentic-execution-receipt", schemaVersion: "1.0.0", executionId: execution.executionId, capabilityId: execution.capability.capabilityId,
      claimId: claim.claimId, claimDigest: sha256(claim), executorId, status: receiptStatus, startedAt: execution.startedAt, completedAt,
      preStateDigest: execution.preStateDigest, ...(execution.resourceVersion ? { resourceVersion: execution.resourceVersion } : {}), requestDigest: sha256(claim.action.arguments),
      resultDigest: sha256(result), ...(executionError ? { error: executionError } : {}), keyId, algorithm: "HMAC-SHA256"
    }, secret);
    execution.status = receiptStatus === "succeeded" ? "executed" : receiptStatus === "failed" ? "execution_failed" : "execution_unknown";
    execution.completedAt = completedAt; execution.receipt = receipt; execution.result = redact(result, profile.evidence.redactFields);
    this.db.transaction(() => {
      this.db.prepare("UPDATE executions SET status = ?, execution_json = ?, outbox_state = 'recorded', updated_at = ? WHERE execution_id = ?").run(execution.status, JSON.stringify(execution), completedAt, execution.executionId);
      this.recordEvidence({ claim, decision, profileVersion: decision.profileVersion, outcome: receiptStatus === "succeeded" ? "execution_succeeded" : receiptStatus === "failed" ? "execution_failed" : "execution_unknown", payload: { receipt }, executionId: execution.executionId });
    })();
    this.emit("palo.execution.completed", claim, { executionId: execution.executionId, executorId, status: receiptStatus });
    const initialDelaySeconds = claim.effectContract.verification.initialDelaySeconds || 0;
    if (receiptStatus === "succeeded" && initialDelaySeconds > 0) {
      const availableAt = new Date(Date.now() + initialDelaySeconds * 1000).toISOString();
      const task = this.createTask({
        taskType: "verification",
        subjectId: execution.executionId,
        status: "queued",
        availableAt,
        expiresAt: new Date(Date.now() + claim.effectContract.verification.windowSeconds * 1000).toISOString(),
        claim,
        payload: { executionId: execution.executionId, verifierId },
        maxAttempts: claim.effectContract.verification.maxAttempts || 1
      });
      return { status: "verification_pending", executed: true, executionId: execution.executionId, decision, receipt, task };
    }
    const verified = await this.verifyOutcome(execution.executionId);
    if (receiptStatus === "failed") return { ...verified, status: "execution_failed", executed: false };
    return verified;
  }

  async verifyOutcome(executionId, { force = false } = {}) {
    const row = this.db.prepare("SELECT execution_json FROM executions WHERE execution_id = ?").get(executionId);
    if (!row) throw new Error("Execution not found");
    const execution = parse(row.execution_json);
    const taskRow = this.db.prepare("SELECT task_json FROM assurance_tasks WHERE task_type = 'verification' AND subject_id = ?").get(executionId);
    const verificationTask = taskRow ? parse(taskRow.task_json) : null;
    if (verificationTask?.status === "queued" && Date.parse(verificationTask.availableAt) > Date.now() && !force) return { status: "verification_pending", executed: true, executionId, decision: execution.decision, receipt: execution.receipt, task: verificationTask };
    if (verificationTask?.status === "queued") this.transitionTask(verificationTask.taskId, "running", { incrementAttempts: true });
    if (execution.attestation && !force) return this.presentExecution(execution);
    if (!execution.receipt || !this.verifySignedContract("palo-agentic-execution-receipt", execution.receipt)) throw new Error("A trusted signed Execution Receipt is required before outcome verification");
    const verifierId = execution.capability.verifierId; const verifier = this.verifierHandlers.get(verifierId);
    let postState = {}; let verification;
    try {
      const observed = await verifier({ phase: "post", claim: clone(execution.claim), execution: clone(execution), receipt: clone(execution.receipt) });
      if (!observed || typeof observed.state !== "object" || observed.state === null) throw new Error("Verifier returned no authoritative state");
      postState = observed.state;
      verification = evaluateEffectContract(execution.claim.effectContract, execution.preState, postState, { includePreconditions: false });
      if (verificationTask?.expiresAt && Date.parse(verificationTask.expiresAt) <= Date.now()) {
        verification = {
          status: "inconclusive",
          checks: [...verification.checks, { predicateId: "predicate-verification-window", category: "expected", status: "unknown", reason: "Authoritative verification completed after the Effect Contract window" }]
        };
      }
      if (execution.receipt.status === "unknown") {
        verification = {
          status: "inconclusive",
          checks: [...verification.checks, { predicateId: "predicate-execution-attribution", category: "expected", status: "unknown", reason: "The recovered execution has no conclusive trusted completion receipt" }]
        };
      }
    } catch (error) {
      verification = { status: "inconclusive", checks: execution.claim.effectContract.expectedEffects.map((predicate) => ({ predicateId: predicate.predicateId, category: "expected", status: "unknown", reason: `Authoritative post-state unavailable: ${error.message}` })) };
    }
    const { keyId, secret, profile } = this.getSigningMaterial(execution.claim, execution.decision.profileVersion);
    let incident = null;
    if (verification.status !== "verified") incident = this.openIncident(execution, verification.status, verification.checks);
    else if (execution.incidentId) {
      const existingIncident = await this.getIncident(execution.incidentId);
      if (existingIncident.status !== "resolved") incident = await this.resolveIncident(execution.incidentId, "resolved", "palo-authoritative-verifier", "A subsequent authoritative verification satisfied the bound Effect Contract");
    }
    const attestation = this.signContract("palo-agentic-outcome-attestation", {
      format: "palo-agentic-outcome-attestation", schemaVersion: "1.0.0", attestationId: id("attestation"), executionId, claimId: execution.claim.claimId,
      verifierId, status: verification.status, checkedAt: nowIso(), postStateDigest: sha256(postState), checks: verification.checks,
      ...(incident ? { incidentId: incident.incidentId } : {}), keyId, algorithm: "HMAC-SHA256"
    }, secret);
    execution.postState = redact(postState, profile.evidence.redactFields); execution.postStateDigest = sha256(postState);
    execution.attestation = attestation; execution.status = verification.status; if (incident) execution.incidentId = incident.incidentId;
    this.db.transaction(() => {
      this.db.prepare("UPDATE executions SET status = ?, execution_json = ?, updated_at = ? WHERE execution_id = ?").run(execution.status, JSON.stringify(execution), nowIso(), executionId);
      this.recordEvidence({ claim: execution.claim, decision: execution.decision, profileVersion: execution.decision.profileVersion, outcome: `outcome_${verification.status}`, payload: { attestation }, executionId, attestationId: attestation.attestationId, ...(incident ? { incidentId: incident.incidentId } : {}) });
    })();
    const presented = this.presentExecution(execution, incident);
    if (verificationTask) this.transitionTask(verificationTask.taskId, verification.status === "verified" ? "completed" : "input_required", { result: presented });
    this.emit("palo.outcome.verified", execution.claim, { executionId, verifierId, status: verification.status, ...(incident ? { incidentId: incident.incidentId } : {}) });
    return presented;
  }

  async recoverPendingExecutions({ olderThanMs = 30000 } = {}) {
    if (!Number.isFinite(olderThanMs) || olderThanMs < 0) throw new Error("olderThanMs must be a non-negative number");
    const cutoff = Date.now() - olderThanMs;
    const pending = this.db.prepare("SELECT execution_json FROM executions WHERE outbox_state = 'pending' AND status = 'executing' ORDER BY updated_at").all();
    const recovered = [];
    for (const row of pending) {
      const execution = parse(row.execution_json);
      if (Date.parse(execution.startedAt) > cutoff) continue;
      const { keyId, secret } = this.getSigningMaterial(execution.claim, execution.decision.profileVersion);
      const completedAt = nowIso();
      const error = "Runtime recovered an unfinished execution; the external outcome is unknown";
      const receipt = this.signContract("palo-agentic-execution-receipt", {
        format: "palo-agentic-execution-receipt", schemaVersion: "1.0.0", executionId: execution.executionId,
        capabilityId: execution.capability.capabilityId, claimId: execution.claim.claimId, claimDigest: sha256(execution.claim),
        executorId: execution.capability.executorId, status: "unknown", startedAt: execution.startedAt, completedAt,
        preStateDigest: execution.preStateDigest, ...(execution.resourceVersion ? { resourceVersion: execution.resourceVersion } : {}),
        requestDigest: sha256(execution.claim.action.arguments), resultDigest: sha256({ error }), error, keyId, algorithm: "HMAC-SHA256"
      }, secret);
      execution.status = "execution_unknown"; execution.completedAt = completedAt; execution.receipt = receipt;
      this.db.transaction(() => {
        this.db.prepare("UPDATE executions SET status = 'execution_unknown', execution_json = ?, outbox_state = 'recovered', updated_at = ? WHERE execution_id = ? AND outbox_state = 'pending'").run(JSON.stringify(execution), completedAt, execution.executionId);
        this.recordEvidence({ claim: execution.claim, decision: execution.decision, profileVersion: execution.decision.profileVersion, outcome: "execution_unknown", payload: { receipt }, executionId: execution.executionId });
      })();
      recovered.push(await this.verifyOutcome(execution.executionId));
    }
    const awaitingVerification = this.db.prepare("SELECT execution_json FROM executions WHERE outbox_state = 'recorded' ORDER BY updated_at").all();
    for (const row of awaitingVerification) {
      const execution = parse(row.execution_json);
      if (execution.receipt && !execution.attestation) recovered.push(await this.verifyOutcome(execution.executionId));
    }
    return { recovered: recovered.length, executions: recovered };
  }

  openIncident(execution, assuranceStatus, checks) {
    const existing = this.db.prepare("SELECT incident_json FROM incidents WHERE execution_id = ?").get(execution.executionId);
    if (existing) return parse(existing.incident_json);
    const stamp = nowIso(); const failed = checks.filter((check) => check.status !== "pass").map((check) => check.predicateId).join(", ") || "verification unavailable";
    const incident = {
      format: "palo-agentic-assurance-incident", schemaVersion: "1.0.0", incidentId: id("incident"), executionId: execution.executionId,
      claimId: execution.claim.claimId, caseId: execution.claim.caseId, status: "open", severity: assuranceStatus === "mismatch" ? "high" : "medium",
      reason: `${assuranceStatus}: ${failed}`, resourceHold: true, createdAt: stamp, updatedAt: stamp,
      ...(execution.claim.effectContract.recovery?.onMismatch === "propose_compensation" ? { recommendedCompensation: { requiresNewActionClaim: true, action: clone(execution.claim.effectContract.recovery.compensationAction) } } : {})
    };
    assertSchema("palo-agentic-assurance-incident", incident);
    this.db.transaction(() => {
      this.db.prepare("INSERT INTO incidents VALUES (?, ?, ?, ?, ?, ?)").run(incident.incidentId, incident.executionId, incident.claimId, incident.status, JSON.stringify(incident), stamp);
      this.db.prepare("INSERT OR REPLACE INTO resource_holds(resource_key,incident_id,reason,created_at,released_at) VALUES(?,?,?,?,NULL)").run(this.resourceKey(execution.claim), incident.incidentId, incident.reason, stamp);
    })();
    return incident;
  }

  presentExecution(execution, incident) {
    const resolvedIncident = incident || (execution.incidentId ? this.db.prepare("SELECT incident_json FROM incidents WHERE incident_id = ?").get(execution.incidentId) : null);
    return {
      status: execution.status === "verified" ? "verified" : execution.status === "mismatch" || execution.status === "inconclusive" ? "review_required" : execution.status,
      executed: Boolean(execution.receipt), executionId: execution.executionId, decision: execution.decision, receipt: execution.receipt,
      attestation: execution.attestation, ...(resolvedIncident ? { incident: parse(resolvedIncident.incident_json || resolvedIncident) } : {})
    };
  }

  async getExecution(executionId) {
    const row = this.db.prepare("SELECT execution_json FROM executions WHERE execution_id = ?").get(executionId);
    if (!row) throw new Error("Execution not found");
    return this.presentExecution(parse(row.execution_json));
  }

  async getIncident(incidentId) {
    const row = this.db.prepare("SELECT incident_json FROM incidents WHERE incident_id = ?").get(incidentId);
    if (!row) throw new Error("Assurance incident not found");
    return parse(row.incident_json);
  }

  async listIncidents(status = "open") {
    if (!["open", "acknowledged", "resolved", "all"].includes(status)) throw new Error("Invalid incident status filter");
    return this.db.prepare("SELECT incident_json FROM incidents WHERE (? = 'all' OR status = ?) ORDER BY updated_at DESC").all(status, status).map((row) => parse(row.incident_json));
  }

  async resolveIncident(incidentId, status, resolvedBy, resolution) {
    if (!["acknowledged", "resolved"].includes(status) || !resolvedBy || !resolution) throw new Error("Incident status, resolver identity and resolution are required");
    return this.db.transaction(() => {
      const row = this.db.prepare("SELECT incident_json FROM incidents WHERE incident_id = ?").get(incidentId);
      if (!row) throw new Error("Assurance incident not found");
      const incident = parse(row.incident_json);
      if (incident.status === "resolved") { if (status === "resolved") return incident; throw new Error("Resolved incident cannot transition backwards"); }
      incident.status = status; incident.updatedAt = nowIso();
      if (status === "resolved") { incident.resolvedBy = resolvedBy; incident.resolution = resolution; incident.resolvedAt = incident.updatedAt; incident.resourceHold = false; this.db.prepare("UPDATE resource_holds SET released_at = ? WHERE incident_id = ? AND released_at IS NULL").run(incident.updatedAt, incidentId); }
      assertSchema("palo-agentic-assurance-incident", incident);
      this.db.prepare("UPDATE incidents SET status = ?, incident_json = ?, updated_at = ? WHERE incident_id = ?").run(status, JSON.stringify(incident), incident.updatedAt, incidentId);
      return clone(incident);
    })();
  }

  recordEvidence({ claim: inputClaim, decision, profileVersion, outcome, payload = {}, executionId, attestationId, incidentId, taskId }) {
    const claim = normalizeActionClaim(inputClaim); assertSchema("palo-agentic-policy-decision", decision);
    if (decision.claimId !== claim.claimId || decision.claimDigest !== sha256(claim)) throw new Error("Decision does not bind to this Action Claim");
    if (outcome === "executed" && decision.status !== "allowed") throw new Error("Execution evidence requires an allowed decision");
    const row = profileVersion
      ? this.db.prepare("SELECT profile_json FROM profiles WHERE case_id = ? AND agent_id = ? AND profile_version = ?").get(claim.caseId, claim.agentId, profileVersion)
      : this.db.prepare("SELECT profile_json FROM profiles WHERE case_id = ? AND agent_id = ? AND is_current = 1").get(claim.caseId, claim.agentId);
    if (!row) throw new Error("No trusted profile is available for evidence signing");
    const profile = parse(row.profile_json); const secret = this.keys[profile.evidence.keyId];
    if (!this.evidenceSigning && (!secret || Buffer.byteLength(secret) < 32)) throw new Error(`A signing secret of at least 32 bytes is required for ${profile.evidence.keyId}`);
    return this.db.transaction(() => {
      const previous = this.db.prepare("SELECT event_digest FROM evidence ORDER BY ledger_sequence DESC LIMIT 1").get()?.event_digest || null;
      const unsigned = { format: "palo-agentic-evidence-envelope", schemaVersion: this.evidenceSigning ? "2.0.0" : "1.0.0", eventId: id("event"), caseId: claim.caseId, agentId: claim.agentId, claimId: claim.claimId, decisionId: decision.decisionId, outcome, recordedAt: nowIso(), redactedPayload: redact(payload, profile.evidence.redactFields), payloadDigest: sha256(payload), previousEventDigest: previous, traceId: resolveTraceId(claim), ...(executionId ? { executionId } : {}), ...(attestationId ? { attestationId } : {}), ...(incidentId ? { incidentId } : {}), ...(taskId ? { taskId } : {}) };
      if (decision.approvalId) unsigned.approvalId = decision.approvalId;
      const envelope = this.evidenceSigning
        ? signEd25519Envelope(unsigned, this.evidenceSigning)
        : { ...unsigned, keyId: profile.evidence.keyId, algorithm: "HMAC-SHA256" };
      if (!this.evidenceSigning) envelope.signature = signHmac(envelope, secret);
      assertSchema("palo-agentic-evidence-envelope", envelope);
      const eventDigest = sha256(envelope);
      this.db.prepare("INSERT INTO evidence(event_id,event_digest,previous_event_digest,envelope_json,recorded_at) VALUES(?,?,?,?,?)").run(envelope.eventId, eventDigest, previous, JSON.stringify(envelope), envelope.recordedAt);
      return envelope;
    })();
  }

  verifyEvidence(envelope) {
    try { assertSchema("palo-agentic-evidence-envelope", envelope); } catch { return false; }
    return verifyEvidenceEnvelope(envelope, { hmacKeys: this.keys, publicKeys: this.evidencePublicKeys });
  }

  async verifyLedger() {
    const rows = this.db.prepare("SELECT ledger_sequence, event_digest, previous_event_digest, envelope_json FROM evidence ORDER BY ledger_sequence").all();
    let previous = null;
    for (const row of rows) {
      const envelope = parse(row.envelope_json);
      if (row.previous_event_digest !== previous || envelope.previousEventDigest !== previous || sha256(envelope) !== row.event_digest || !this.verifyEvidence(envelope)) return { valid: false, sequence: row.ledger_sequence };
      previous = row.event_digest;
    }
    return { valid: true, entries: rows.length, headDigest: previous };
  }

  async authorizeAndExecute(claim, approvalId, executor) {
    const decision = await this.verifyAction(claim, approvalId);
    if (decision.status !== "allowed") return { decision, executed: false };
    try {
      const result = await executor(normalizeActionClaim(claim));
      const evidence = this.recordEvidence({ claim, decision, outcome: "executed", payload: { result } });
      return { decision, executed: true, result, evidence };
    } catch (error) {
      const evidence = this.recordEvidence({ claim, decision, outcome: "failed", payload: { error: error.message } });
      return { decision, executed: false, error: error.message, evidence };
    }
  }
}

export function loadKeysFromEnvironment() {
  if (!process.env.PALO_HMAC_KEYS_JSON) return {};
  const parsed = JSON.parse(process.env.PALO_HMAC_KEYS_JSON);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("PALO_HMAC_KEYS_JSON must be a keyId-to-secret object");
  for (const [keyId, secret] of Object.entries(parsed)) if (typeof secret !== "string" || Buffer.byteLength(secret) < 32) throw new Error(`${keyId} must contain at least 32 bytes of secret material`);
  return parsed;
}

export function loadEvidenceSigningFromEnvironment() {
  const signing = loadJsonObjectFromEnvironment("PALO_EVIDENCE_ED25519_JSON");
  return Object.keys(signing).length ? signing : undefined;
}

export function loadJsonObjectFromEnvironment(name) {
  if (!process.env[name]) return {};
  const parsed = JSON.parse(process.env[name]);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error(`${name} must contain a JSON object`);
  return parsed;
}
