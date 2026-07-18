import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const PROFILE_FORMAT = "palo-agentic-interface";
const POLICY_ID = "policy-agentic-governance";
const POLICY_VERSION = "1.2.0";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaNames = [
  "palo-agentic-interface", "palo-agentic-effect-contract", "palo-agentic-action-claim", "palo-agentic-policy", "palo-agentic-policy-input",
  "palo-agentic-policy-decision", "palo-agentic-approval", "palo-agentic-evidence-envelope", "palo-agentic-execution-capability",
  "palo-agentic-execution-receipt", "palo-agentic-outcome-attestation", "palo-agentic-assurance-incident"
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

function safeEqual(left, right) {
  return canonicalize(left) === canonicalize(right);
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
    case "equals": {
      const observed = category === "precondition" ? before : after;
      passed = observed.found && safeEqual(observed.value, predicate.value);
      break;
    }
    case "unchanged": passed = before.found && after.found && safeEqual(before.value, after.value); break;
    case "changedTo": passed = after.found && safeEqual(after.value, predicate.value) && (!before.found || !safeEqual(before.value, after.value)); break;
    case "deltaWithin": {
      if (!before.found || !after.found || typeof before.value !== "number" || typeof after.value !== "number") known = false;
      else { const delta = after.value - before.value; passed = delta >= predicate.minimumDelta && delta <= predicate.maximumDelta; }
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

export function evaluateEffectContract(effectContract, preState, postState, { includePreconditions = true } = {}) {
  assertSchema("palo-agentic-effect-contract", effectContract);
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
  if (claim.schemaVersion === "1.2.0") {
    const selector = claim.effectContract.resourceSelector;
    if (selector.resource !== claim.action.resource || path.posix.normalize(selector.path) !== claim.action.path) throw new Error("Effect Contract resourceSelector must bind to the normalized action resource and path");
    if (selector.tenantId && claim.metadata?.tenantId && selector.tenantId !== claim.metadata.tenantId) throw new Error("Effect Contract tenant does not match Action Claim metadata");
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
  constructor({ dataDir = process.env.PALO_DATA_DIR || path.resolve(".palo-agentic"), keys, policyEvaluator, executors = {}, verifiers = {} } = {}) {
    this.dataDir = dataDir;
    this.keys = keys || loadKeysFromEnvironment();
    this.policyEvaluator = policyEvaluator || createOpaEvaluator();
    this.executorHandlers = new Map(Object.entries(executors));
    this.verifierHandlers = new Map(Object.entries(verifiers));
    this.db = openDatabase(dataDir);
    this.bootstrapPolicy();
  }

  close() { if (this.db?.open) this.db.close(); }

  bootstrapPolicy() {
    const policy = {
      format: "palo-agentic-policy", schemaVersion: "1.0.0", policyId: POLICY_ID, policyVersion: POLICY_VERSION, status: "active",
      regoPackage: "palo.agentic.governance", entrypoint: "action_decision",
      bundleDigest: sha256(readFileSync(path.join(repositoryRoot, "examples/policy-as-code/agent-delegation.rego"), "utf8")),
      metadata: { inputSchemaVersion: "1.0.0", source: "bundled-reference-policy" }
    };
    if (!this.db.prepare("SELECT 1 FROM policies WHERE policy_id = ? AND is_current = 1").get(POLICY_ID)) this.registerPolicy(policy);
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
      profiles: this.db.prepare("SELECT case_id AS caseId, agent_id AS agentId, profile_version AS profileVersion, profile_digest AS profileDigest, status, registered_at AS registeredAt, updated_at AS updatedAt FROM profiles ORDER BY agent_id, profile_version").all(),
      policies: this.db.prepare("SELECT policy_id AS policyId, policy_version AS policyVersion, bundle_digest AS bundleDigest, status, registered_at AS registeredAt FROM policies ORDER BY policy_id, policy_version").all(),
      executors: this.db.prepare("SELECT executor_id AS executorId, executor_version AS version, status, registered_at AS registeredAt FROM executors ORDER BY executor_id, executor_version").all(),
      verifiers: this.db.prepare("SELECT verifier_id AS verifierId, verifier_version AS version, status, registered_at AS registeredAt FROM verifiers ORDER BY verifier_id, verifier_version").all()
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
    if (existingRow) {
      if (existingRow.claim_digest !== digest) return this.persistDecision(claim, digest, { status: "denied", reasons: ["claimId replayed with different content"], obligations: ["rotate_claim_id"] });
      const existing = parse(existingRow.decision_json);
      if (!revalidate && (!approvalId || existing.status !== "pending_approval")) return existing;
    }
    if (Date.parse(claim.expiresAt) <= Date.now() || Date.parse(claim.requestedAt) > Date.now() + 30000) return this.persistDecision(claim, digest, { status: "denied", reasons: ["Claim is expired or not yet valid"], obligations: [] });
    let profile; let policy;
    try { profile = await this.getProfile(claim.caseId, claim.agentId); policy = this.getPolicy(); this.validateArguments(claim, profile); }
    catch (error) { return this.persistDecision(claim, digest, { status: "denied", reasons: [error.message], obligations: ["register_trusted_authority"] }); }
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
    const result = await this.policyEvaluator(policyInput);
    if (result.status === "pending_approval" && !approval) { approval = await this.requestApproval(claim, digest, "palo-policy-engine"); result.approvalId = approval.approvalId; }
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
    assertSchema("palo-agentic-policy-decision", decision);
    this.db.prepare("INSERT INTO decisions VALUES (?, ?, ?, ?) ON CONFLICT(claim_id) DO UPDATE SET claim_digest=excluded.claim_digest, decision_json=excluded.decision_json, updated_at=excluded.updated_at").run(claim.claimId, claimDigest, JSON.stringify(decision), nowIso());
    if (profile) this.recordEvidence({ claim, decision, outcome: decision.status, payload: { action: claim.action, requestedScopes: claim.requestedScopes } });
    return decision;
  }

  async requestApproval(inputClaim, claimDigest, requestedBy, ttlSeconds = 900) {
    const claim = normalizeActionClaim(inputClaim); const digest = claimDigest || sha256(claim);
    const existing = this.db.prepare("SELECT approval_json FROM approvals WHERE claim_digest = ? AND status = 'pending'").get(digest);
    if (existing) return parse(existing.approval_json);
    const resolvedRequestedBy = requestedBy ?? claim.agentId;
    const approval = { format: "palo-agentic-approval", schemaVersion: "1.0.0", approvalId: id("approval"), claimId: claim.claimId, claimDigest: digest, caseId: claim.caseId, agentId: claim.agentId, status: "pending", requestedBy: resolvedRequestedBy, requestedAt: nowIso(), expiresAt: new Date(Date.now() + Math.max(30, Math.min(ttlSeconds, 86400)) * 1000).toISOString() };
    assertSchema("palo-agentic-approval", approval);
    this.db.prepare("INSERT INTO approvals VALUES (?, ?, ?, ?, ?, ?)").run(approval.approvalId, approval.claimId, approval.claimDigest, approval.status, JSON.stringify(approval), nowIso());
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
    return this.db.transaction(() => {
      const row = this.db.prepare("SELECT approval_json FROM approvals WHERE approval_id = ?").get(approvalId);
      if (!row) throw new Error("Approval not found");
      const approval = parse(row.approval_json);
      if (approval.status !== "pending") { if (approval.status === status) return approval; throw new Error("Approval is already in a terminal state"); }
      approval.status = status; approval.resolvedBy = resolvedBy; approval.resolvedAt = nowIso(); approval.rationale = rationale;
      assertSchema("palo-agentic-approval", approval);
      this.db.prepare("UPDATE approvals SET status = ?, approval_json = ?, updated_at = ? WHERE approval_id = ?").run(status, JSON.stringify(approval), nowIso(), approvalId);
      return clone(approval);
    })();
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
    if (claim.schemaVersion !== "1.2.0" || !claim.effectContract) throw new Error("Governed execution requires Action Claim schemaVersion 1.2.0 with an Effect Contract");
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
    if (claim.schemaVersion !== "1.2.0") throw new Error("Full-cycle governed execution requires Action Claim schemaVersion 1.2.0");
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
    const verified = await this.verifyOutcome(execution.executionId);
    if (receiptStatus === "failed") return { ...verified, status: "execution_failed", executed: false };
    return verified;
  }

  async verifyOutcome(executionId, { force = false } = {}) {
    const row = this.db.prepare("SELECT execution_json FROM executions WHERE execution_id = ?").get(executionId);
    if (!row) throw new Error("Execution not found");
    const execution = parse(row.execution_json);
    if (execution.attestation && !force) return this.presentExecution(execution);
    if (!execution.receipt || !this.verifySignedContract("palo-agentic-execution-receipt", execution.receipt)) throw new Error("A trusted signed Execution Receipt is required before outcome verification");
    const verifierId = execution.capability.verifierId; const verifier = this.verifierHandlers.get(verifierId);
    let postState = {}; let verification;
    try {
      const observed = await verifier({ phase: "post", claim: clone(execution.claim), execution: clone(execution), receipt: clone(execution.receipt) });
      if (!observed || typeof observed.state !== "object" || observed.state === null) throw new Error("Verifier returned no authoritative state");
      postState = observed.state;
      verification = evaluateEffectContract(execution.claim.effectContract, execution.preState, postState, { includePreconditions: false });
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
    return this.presentExecution(execution, incident);
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
      reason: `${assuranceStatus}: ${failed}`, resourceHold: true, createdAt: stamp, updatedAt: stamp
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

  recordEvidence({ claim: inputClaim, decision, profileVersion, outcome, payload = {}, executionId, attestationId, incidentId }) {
    const claim = normalizeActionClaim(inputClaim); assertSchema("palo-agentic-policy-decision", decision);
    if (decision.claimId !== claim.claimId || decision.claimDigest !== sha256(claim)) throw new Error("Decision does not bind to this Action Claim");
    if (outcome === "executed" && decision.status !== "allowed") throw new Error("Execution evidence requires an allowed decision");
    const row = profileVersion
      ? this.db.prepare("SELECT profile_json FROM profiles WHERE case_id = ? AND agent_id = ? AND profile_version = ?").get(claim.caseId, claim.agentId, profileVersion)
      : this.db.prepare("SELECT profile_json FROM profiles WHERE case_id = ? AND agent_id = ? AND is_current = 1").get(claim.caseId, claim.agentId);
    if (!row) throw new Error("No trusted profile is available for evidence signing");
    const profile = parse(row.profile_json); const secret = this.keys[profile.evidence.keyId];
    if (!secret || Buffer.byteLength(secret) < 32) throw new Error(`A signing secret of at least 32 bytes is required for ${profile.evidence.keyId}`);
    return this.db.transaction(() => {
      const previous = this.db.prepare("SELECT event_digest FROM evidence ORDER BY ledger_sequence DESC LIMIT 1").get()?.event_digest || null;
      const envelope = { format: "palo-agentic-evidence-envelope", schemaVersion: "1.0.0", eventId: id("event"), caseId: claim.caseId, agentId: claim.agentId, claimId: claim.claimId, decisionId: decision.decisionId, outcome, recordedAt: nowIso(), redactedPayload: redact(payload, profile.evidence.redactFields), payloadDigest: sha256(payload), previousEventDigest: previous, keyId: profile.evidence.keyId, algorithm: "HMAC-SHA256", ...(executionId ? { executionId } : {}), ...(attestationId ? { attestationId } : {}), ...(incidentId ? { incidentId } : {}) };
      if (decision.approvalId) envelope.approvalId = decision.approvalId;
      envelope.signature = signHmac(envelope, secret);
      assertSchema("palo-agentic-evidence-envelope", envelope);
      const eventDigest = sha256(envelope);
      this.db.prepare("INSERT INTO evidence(event_id,event_digest,previous_event_digest,envelope_json,recorded_at) VALUES(?,?,?,?,?)").run(envelope.eventId, eventDigest, previous, JSON.stringify(envelope), envelope.recordedAt);
      return envelope;
    })();
  }

  verifyEvidence(envelope) {
    try { assertSchema("palo-agentic-evidence-envelope", envelope); } catch { return false; }
    const secret = this.keys[envelope.keyId]; if (!secret) return false;
    const unsigned = clone(envelope); delete unsigned.signature;
    const expected = `hmac-sha256:${createHmac("sha256", secret).update(canonicalize(unsigned)).digest("hex")}`;
    const actualBuffer = Buffer.from(envelope.signature); const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
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
