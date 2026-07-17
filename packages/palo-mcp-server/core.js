import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const PROFILE_FORMAT = "palo-agentic-interface";
const POLICY_ID = "policy-agentic-governance";
const POLICY_VERSION = "1.1.0";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaNames = ["palo-agentic-interface", "palo-agentic-action-claim", "palo-agentic-policy", "palo-agentic-policy-input", "palo-agentic-policy-decision", "palo-agentic-approval", "palo-agentic-evidence-envelope"];
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
  constructor({ dataDir = process.env.PALO_DATA_DIR || path.resolve(".palo-agentic"), keys, policyEvaluator } = {}) {
    this.dataDir = dataDir;
    this.keys = keys || loadKeysFromEnvironment();
    this.policyEvaluator = policyEvaluator || createOpaEvaluator();
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

  getPolicy() {
    const row = this.db.prepare("SELECT policy_json FROM policies WHERE policy_id = ? AND is_current = 1 AND status = 'active'").get(POLICY_ID);
    if (!row) throw new Error("No active trusted policy is registered");
    return parse(row.policy_json);
  }

  async getRegistry() {
    return {
      profiles: this.db.prepare("SELECT case_id AS caseId, agent_id AS agentId, profile_version AS profileVersion, profile_digest AS profileDigest, status, registered_at AS registeredAt, updated_at AS updatedAt FROM profiles ORDER BY agent_id, profile_version").all(),
      policies: this.db.prepare("SELECT policy_id AS policyId, policy_version AS policyVersion, bundle_digest AS bundleDigest, status, registered_at AS registeredAt FROM policies ORDER BY policy_id, policy_version").all()
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

  async verifyAction(inputClaim, approvalId) {
    let claim;
    try { claim = normalizeActionClaim(inputClaim); }
    catch (error) { return this.persistDeniedMalformed(inputClaim, error.message); }
    const digest = sha256(claim);
    const existingRow = this.db.prepare("SELECT claim_digest, decision_json FROM decisions WHERE claim_id = ?").get(claim.claimId);
    if (existingRow) {
      if (existingRow.claim_digest !== digest) return this.persistDecision(claim, digest, { status: "denied", reasons: ["claimId replayed with different content"], obligations: ["rotate_claim_id"] });
      const existing = parse(existingRow.decision_json);
      if (!approvalId || existing.status !== "pending_approval") return existing;
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

  recordEvidence({ claim: inputClaim, decision, outcome, payload = {} }) {
    const claim = normalizeActionClaim(inputClaim); assertSchema("palo-agentic-policy-decision", decision);
    if (decision.claimId !== claim.claimId || decision.claimDigest !== sha256(claim)) throw new Error("Decision does not bind to this Action Claim");
    if (outcome === "executed" && decision.status !== "allowed") throw new Error("Execution evidence requires an allowed decision");
    const row = this.db.prepare("SELECT profile_json FROM profiles WHERE case_id = ? AND agent_id = ? AND is_current = 1").get(claim.caseId, claim.agentId);
    if (!row) throw new Error("No trusted profile is available for evidence signing");
    const profile = parse(row.profile_json); const secret = this.keys[profile.evidence.keyId];
    if (!secret || Buffer.byteLength(secret) < 32) throw new Error(`A signing secret of at least 32 bytes is required for ${profile.evidence.keyId}`);
    return this.db.transaction(() => {
      const previous = this.db.prepare("SELECT event_digest FROM evidence ORDER BY ledger_sequence DESC LIMIT 1").get()?.event_digest || null;
      const envelope = { format: "palo-agentic-evidence-envelope", schemaVersion: "1.0.0", eventId: id("event"), caseId: claim.caseId, agentId: claim.agentId, claimId: claim.claimId, decisionId: decision.decisionId, outcome, recordedAt: nowIso(), redactedPayload: redact(payload, profile.evidence.redactFields), payloadDigest: sha256(payload), previousEventDigest: previous, keyId: profile.evidence.keyId, algorithm: "HMAC-SHA256" };
      if (decision.approvalId) envelope.approvalId = decision.approvalId;
      envelope.signature = `hmac-sha256:${createHmac("sha256", secret).update(canonicalize(envelope)).digest("hex")}`;
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
