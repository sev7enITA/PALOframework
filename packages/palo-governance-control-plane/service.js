import { randomUUID } from "node:crypto";
import { buildDraftContract, platformFor, runBoundarySimulation, sha256 as browserSha256, validateAuthorityConfiguration } from "../../governance-hub/src/governanceVerification.js";
import { sha256 } from "./crypto.js";
import { principalHasScope } from "./oidc.js";

function error(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function requireScope(principal, scope) {
  if (!principalHasScope(principal, scope)) throw error(`This operation requires the ${scope} scope`, 403);
}

function stepUpSatisfied(principal, config, now = new Date()) {
  if (config.mode !== "production") return true;
  const methodSatisfied = principal?.authenticationMethods?.some((method) => ["mfa", "otp", "hwk", "swk"].includes(method));
  const acrSatisfied = config.stepUpAcrValues.includes(principal?.authenticationContext);
  const ageMs = principal?.authenticatedAt ? now.getTime() - Date.parse(principal.authenticatedAt) : Number.POSITIVE_INFINITY;
  return Boolean((methodSatisfied || acrSatisfied) && ageMs >= 0 && ageMs <= config.stepUpMaximumAgeSeconds * 1000);
}

function requireRecord(record, label = "Record") {
  if (!record) throw error(`${label} was not found in this tenant`, 404);
  return record;
}

function text(value, label, { minimum = 1, maximum = 2000 } = {}) {
  const normalized = String(value || "").trim();
  if (normalized.length < minimum || normalized.length > maximum) throw error(`${label} must contain ${minimum}-${maximum} characters`);
  return normalized;
}

function exactObject(value, label, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw error(`${label} must be an object`);
  const allowed = new Set(keys);
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  if (extras.length) throw error(`${label} contains unsupported fields: ${extras.join(", ")}`);
  return value;
}

function validatedConnection(value) {
  const connection = exactObject(value, "Connection", ["platform", "environment"]);
  return { platform: text(connection.platform, "Platform", { maximum: 100 }), environment: text(connection.environment, "Environment", { maximum: 80 }) };
}

function validatedSetupInput(value) {
  const input = exactObject(value, "Setup input", ["connection", "authority", "oversight", "purpose", "effect"]);
  const authority = exactObject(input.authority, "Authority", ["agent", "environment", "tool", "operation", "resource", "limit", "network"]);
  const purpose = exactObject(input.purpose, "Purpose", ["objective", "owner", "impact"]);
  const effect = exactObject(input.effect, "Effect", ["precondition", "expected", "forbidden"]);
  return {
    connection: validatedConnection(input.connection),
    authority: Object.fromEntries(Object.entries(authority).map(([key, item]) => [key, text(item, `Authority ${key}`, { maximum: 500 })])),
    oversight: text(input.oversight, "Oversight", { maximum: 40 }),
    purpose: { objective: text(purpose.objective, "Purpose objective", { maximum: 2000 }), owner: text(purpose.owner, "Purpose owner", { maximum: 300 }), impact: text(purpose.impact, "Purpose impact", { maximum: 200 }) },
    effect: { precondition: text(effect.precondition, "Effect precondition", { maximum: 2000 }), expected: text(effect.expected, "Effect expected", { maximum: 2000 }), forbidden: text(effect.forbidden, "Effect forbidden", { maximum: 2000 }) }
  };
}

function publicBundle(record) {
  const { tenantId, ...safe } = record;
  return safe;
}

function operationReceipt({ action, inputDigest, requestId, status, summary, steps, boundaries, whatDidNotHappen, result = {}, durationMs = 0, network = { attempted: false, requests: 0, credentialsUsed: false } }) {
  const completedAt = new Date().toISOString();
  return {
    format: "palo-governance-action-receipt", schemaVersion: "1.0.0", actionId: `${action}:${randomUUID()}`, action,
    authoritative: true, evidenceClass: "server-operation-receipt", startedAt: completedAt, completedAt, durationMs, inputDigest, requestId,
    adapter: "palo-governance-control-plane@1.0.0", network, steps,
    result: { status, summary, ...result }, boundaries, whatDidNotHappen
  };
}

export class GovernanceControlPlaneService {
  constructor({ config, store, adapters, signer, now = () => new Date() }) {
    this.config = config;
    this.store = store;
    this.adapters = adapters;
    this.signer = signer;
    this.now = now;
  }

  capabilities(principal) {
    const persistence = this.config.databaseUrl ? "postgresql" : "memory-development-only";
    return {
      format: "palo-governance-control-plane-capabilities",
      schemaVersion: "1.0.0",
      mode: this.config.mode,
      authenticated: Boolean(principal),
      principal: principal ? { subject: principal.subject, displayName: principal.displayName, tenantId: principal.tenantId, roles: principal.roles, scopes: principal.scopes } : undefined,
      controls: {
        oidc: Boolean(this.config.oidc),
        serverSideSession: true,
        persistence,
        tenantBinding: true,
        roleAuthorization: true,
        csrf: true,
        exactOrigin: true,
        remoteSigning: this.signer.available(),
        browserHeldGatewayCredential: false,
        stepUpForReviewAndPublish: this.config.mode === "production",
        stepUpSatisfied: principal ? stepUpSatisfied(principal, this.config, this.now()) : false
      },
      adapters: this.adapters.descriptors().map(({ timeoutMs, maximumBytes, ...adapter }) => adapter),
      lifecycle: { draft: true, review: true, separationOfDuties: true, publication: this.signer.available() },
      admission: {
        status: this.config.mode === "production" ? "configured-not-independently-assured" : "non-production",
        productionUseClaimed: false,
        boundary: "Runtime configuration is observable here; independent deployment assurance is not inferred from service availability."
      }
    };
  }

  auditRecord(principal, action, targetId, requestId, details = {}) {
    return {
      eventId: randomUUID(), tenantId: principal.tenantId, actorId: principal.subject, action, targetId,
      requestId, details, createdAt: this.now().toISOString()
    };
  }

  async audit(principal, action, targetId, requestId, details = {}) {
    return this.store.appendAudit(this.auditRecord(principal, action, targetId, requestId, details));
  }

  async checkConnection(principal, input, requestId) {
    requireScope(principal, "operate");
    input = validatedConnection(input);
    const profile = platformFor(input.platform);
    if (!profile) throw error("Unknown platform profile");
    const environment = text(input.environment, "Environment", { maximum: 80 });
    const inputDigest = await browserSha256(input);
    const checked = await this.adapters.check(profile.id, environment, principal.tenantId);
    const now = this.now().toISOString();
    const common = {
      format: "palo-governance-action-receipt", schemaVersion: "1.0.0", actionId: `check-connection:${randomUUID()}`,
      action: "check-connection", authoritative: true, evidenceClass: "server-observed-adapter-check", startedAt: now, completedAt: now,
      durationMs: checked.durationMs || 0, inputDigest, adapter: checked.adapter?.id || "unconfigured", requestId
    };
    const receipt = checked.configured ? {
      ...common,
      network: { attempted: true, requests: 1, credentialsUsed: Boolean(checked.adapter.token), endpointOrigin: new URL(checked.adapter.baseUrl).origin, responseDigest: checked.responseDigest },
      steps: [
        { id: "resolve-adapter", status: "passed", detail: `Resolved allowlisted adapter ${checked.adapter.id}.` },
        { id: "probe-health", status: checked.healthy ? "passed" : "failed", detail: `HTTP ${checked.statusCode}; service ${checked.service || "not declared"}.` },
        { id: "classify-runtime", status: "passed", detail: checked.productionUse ? "Adapter reports productionUse=true; independent assurance remains separate." : "Adapter does not report production use." }
      ],
      result: { status: checked.healthy ? "checked" : "unhealthy", summary: checked.healthy ? "The configured server-side adapter returned a valid health response." : "The configured adapter did not return a healthy response.", service: checked.service, version: checked.version, observedAt: checked.observedAt, productionUse: checked.productionUse },
      boundaries: ["Server-side allowlisted request", "Tenant-scoped browser session", checked.adapter.tenantIsolation === "upstream-enforced" ? "Upstream tenant header enforced by adapter contract" : "Upstream health endpoint is not tenant-scoped", "Health does not establish production admission"],
      whatDidNotHappen: ["No gateway credential was returned to the browser", "No protected action was executed", "No production assurance was inferred"]
    } : {
      ...common,
      network: { attempted: false, requests: 0, credentialsUsed: false },
      steps: [
        { id: "resolve-adapter", status: "failed", detail: "No server-side adapter matches this platform and environment." },
        { id: "probe-health", status: "not-run", detail: "No network request was attempted." }
      ],
      result: { status: "not-configured", summary: "No server-side adapter is configured for this platform and environment." },
      boundaries: ["No matching operator adapter", "Remote status remains unknown"],
      whatDidNotHappen: ["No network request", "No credential access", "No runtime state inferred"]
    };
    await this.audit(principal, "connection.check", checked.adapter?.id, requestId, { inputDigest, status: receipt.result.status, responseDigest: checked.responseDigest });
    return receipt;
  }

  async inventory(principal, input, requestId) {
    requireScope(principal, "read");
    input = validatedConnection(input);
    const profile = platformFor(input.platform);
    if (!profile) throw error("Unknown platform profile");
    const result = await this.adapters.inventory(profile.id, text(input.environment, "Environment", { maximum: 80 }), principal.tenantId);
    const counts = Object.fromEntries(Object.entries(result.inventory).map(([key, records]) => [key, records.length]));
    await this.audit(principal, "inventory.read", result.adapter.id, requestId, { responseDigest: result.responseDigest, counts });
    const inputDigest = await browserSha256(input);
    return {
      format: "palo-governance-inventory-projection", schemaVersion: "1.0.0", adapterId: result.adapter.id,
      observedAt: result.observedAt, responseDigest: result.responseDigest, durationMs: result.durationMs, counts, inventory: result.inventory,
      tenantIsolation: result.adapter.tenantIsolation,
      authorityBoundary: result.adapter.tenantIsolation === "upstream-enforced" ? "This is a redacted tenant-scoped projection from an adapter that attests upstream tenant enforcement; it is not a platform-wide discovery claim." : "This is a redacted projection of a configured registry that does not attest upstream tenant isolation. It must not be represented as tenant-scoped.",
      operationReceipt: operationReceipt({
        action: "discover-inventory", inputDigest, requestId, status: "discovered", summary: `Discovered ${counts.profiles} profile(s), ${counts.policies} policy bundle(s), ${counts.executors} executor(s) and ${counts.verifiers} verifier(s).`,
        durationMs: result.durationMs,
        network: { attempted: true, requests: 1, credentialsUsed: Boolean(result.adapter.token), endpointOrigin: new URL(result.adapter.baseUrl).origin, responseDigest: result.responseDigest },
        steps: [{ id: "resolve-adapter", status: "passed", detail: `Resolved ${result.adapter.id}.` }, { id: "read-registry", status: "passed", detail: `HTTP ${result.response.status}; response digest ${result.responseDigest}.` }, { id: "redact-project", status: "passed", detail: "Projected allowlisted scalar registry fields and discarded upstream narrative." }],
        boundaries: [result.adapter.tenantIsolation === "upstream-enforced" ? "Upstream-enforced tenant read" : "Upstream registry is unscoped", "Authenticated browser session", "Allowlisted fields only", "Maximum 500 records per registry class"],
        whatDidNotHappen: ["No registry write", "No upstream narrative was returned", "No platform-wide coverage was inferred"]
      })
    };
  }

  async simulate(principal, input, requestId) {
    requireScope(principal, "operate");
    input = validatedSetupInput(input);
    const validation = validateAuthorityConfiguration(input);
    if (!validation.valid) throw error(`Simulation input is invalid: ${validation.findings.filter((item) => item.severity === "error").map((item) => item.code).join(", ")}`, 422);
    const local = await runBoundarySimulation(input);
    const receiptId = `simulation-${randomUUID()}`;
    const receipt = {
      ...local,
      actionId: receiptId,
      authoritative: true,
      evidenceClass: "server-deterministic-simulation",
      adapter: "palo-governance-control-plane@1.0.0",
      requestId,
      boundaries: ["Deterministic server-side evaluation", "Authenticated tenant context", "Synthetic inputs only", "No protected executor", "No authoritative post-state"],
      steps: [{ id: "bind-principal", status: "passed", detail: `Bound simulation to tenant ${principal.tenantId} and authenticated operator.` }, ...local.steps]
    };
    const simulationRecord = { receiptId, tenantId: principal.tenantId, actorId: principal.subject, inputDigest: receipt.inputDigest, input, receipt, createdAt: this.now().toISOString() };
    await this.store.putSimulationWithAudit(simulationRecord, this.auditRecord(principal, "simulation.run", receiptId, requestId, { inputDigest: receipt.inputDigest, status: receipt.result.status, scenarioCount: receipt.result.scenarioCount }));
    return receipt;
  }

  async createDraft(principal, { input, simulationReceiptId }, requestId) {
    requireScope(principal, "operate");
    input = validatedSetupInput(input);
    simulationReceiptId = text(simulationReceiptId, "Simulation receipt identifier", { maximum: 200 });
    const validation = validateAuthorityConfiguration(input);
    if (!validation.valid) throw error("Draft input does not satisfy the guided contract", 422);
    const inputDigest = await browserSha256(input);
    const simulation = requireRecord(await this.store.getSimulation(simulationReceiptId, principal.tenantId), "Simulation receipt");
    if (simulation.inputDigest !== inputDigest || simulation.receipt.result.status !== "passed") throw error("A passed server simulation for the current input digest is required", 409);
    const bundleId = `bundle-${randomUUID()}`;
    const createdAt = this.now().toISOString();
    const unsignedBundle = {
      format: "palo-governance-configuration-bundle", schemaVersion: "1.0.0", bundleId, version: `draft-${inputDigest.slice(0, 12)}`,
      authoritative: false, publication: { performed: false, target: null }, inputDigest, draft: buildDraftContract(input),
      assurance: { receiptId: simulationReceiptId, receiptDigest: sha256(simulation.receipt), scenarioCount: simulation.receipt.result.scenarioCount, status: simulation.receipt.result.status },
      createdAt
    };
    const record = {
      bundleId, tenantId: principal.tenantId, inputDigest, status: "draft", authorId: principal.subject, reviewerId: null,
      bundle: { ...unsignedBundle, bundleDigest: sha256(unsignedBundle) }, signature: null, createdAt, updatedAt: createdAt
    };
    const { record: stored } = await this.store.createBundleWithAudit(record, this.auditRecord(principal, "bundle.create", bundleId, requestId, { inputDigest, bundleDigest: record.bundle.bundleDigest, simulationReceiptId }));
    return { ...publicBundle(stored), operationReceipt: operationReceipt({
      action: "save-governance-draft", inputDigest, requestId, status: "draft", summary: "A digest-bound draft was persisted in the tenant registry.",
      steps: [{ id: "bind-simulation", status: "passed", detail: `Matched passed receipt ${simulationReceiptId}.` }, { id: "persist-draft", status: "passed", detail: `Stored ${bundleId} with bundle digest ${stored.bundle.bundleDigest}.` }],
      boundaries: ["Tenant-scoped PostgreSQL record", "Non-authoritative draft", "Immutable simulation digest binding"],
      whatDidNotHappen: ["No review decision", "No signature request", "No publication"]
    }) };
  }

  async submitReview(principal, bundleId, requestId) {
    requireScope(principal, "operate");
    const current = requireRecord(await this.store.getBundle(bundleId, principal.tenantId), "Bundle");
    if (current.authorId !== principal.subject && !principalHasScope(principal, "publish")) throw error("Only the author or an administrator can submit this draft", 403);
    const transition = await this.store.transitionBundleWithAudit(bundleId, principal.tenantId, "draft", { status: "in-review", submittedAt: this.now().toISOString() }, this.auditRecord(principal, "bundle.submit-review", bundleId, requestId, { inputDigest: current.inputDigest }));
    const updated = requireRecord(transition?.record, "Bundle");
    return { ...publicBundle(updated), operationReceipt: operationReceipt({
      action: "submit-governance-review", inputDigest: updated.inputDigest, requestId, status: "in-review", summary: "The draft entered review and can no longer be edited in place.",
      steps: [{ id: "authorize-author", status: "passed", detail: "Authenticated author or administrator matched." }, { id: "transition", status: "passed", detail: "Atomic draft to in-review transition persisted." }],
      boundaries: ["Tenant-scoped lifecycle", "Optimistic state guard", "Reviewer must differ from author"],
      whatDidNotHappen: ["No approval was inferred", "No signing request", "No publication"]
    }) };
  }

  async review(principal, bundleId, { decision, rationale }, requestId) {
    requireScope(principal, "review");
    if (!stepUpSatisfied(principal, this.config, this.now())) throw Object.assign(error("Recent step-up authentication is required for review", 401), { code: "step_up_required" });
    if (!new Set(["approved", "rejected"]).has(decision)) throw error("Review decision must be approved or rejected");
    const current = requireRecord(await this.store.getBundle(bundleId, principal.tenantId), "Bundle");
    if (current.authorId === principal.subject) throw error("Separation of duties prevents an author from reviewing their own bundle", 403);
    const reviewRationale = text(rationale, "Review rationale", { minimum: 12, maximum: 2000 });
    const transition = await this.store.transitionBundleWithAudit(bundleId, principal.tenantId, "in-review", { status: decision, reviewerId: principal.subject, reviewRationale, reviewedAt: this.now().toISOString() }, this.auditRecord(principal, `bundle.${decision}`, bundleId, requestId, { inputDigest: current.inputDigest, reviewerId: principal.subject, rationaleDigest: sha256(reviewRationale) }));
    const updated = requireRecord(transition?.record, "Bundle");
    return { ...publicBundle(updated), operationReceipt: operationReceipt({
      action: "review-governance-bundle", inputDigest: updated.inputDigest, requestId, status: decision, summary: `An authenticated separate reviewer recorded ${decision}.`,
      steps: [{ id: "authorize-reviewer", status: "passed", detail: "Reviewer scope and tenant matched." }, { id: "separation-of-duties", status: "passed", detail: "Reviewer is not the bundle author." }, { id: "transition", status: "passed", detail: `Atomic in-review to ${decision} transition persisted.` }],
      boundaries: ["Identity-bound review", "Rationale required", "Digest-bound decision"],
      whatDidNotHappen: decision === "approved" ? ["No signature request", "No publication", "Approval did not execute an agent action"] : ["No publication", "No authority granted", "The rejected digest cannot be promoted"]
    }) };
  }

  async publish(principal, bundleId, requestId) {
    requireScope(principal, "publish");
    if (!stepUpSatisfied(principal, this.config, this.now())) throw Object.assign(error("Recent step-up authentication is required for publication", 401), { code: "step_up_required" });
    const current = requireRecord(await this.store.getBundle(bundleId, principal.tenantId), "Bundle");
    const publishedAt = this.now().toISOString();
    const { bundleDigest: draftBundleDigest, signature: previousSignature, ...draftContent } = current.bundle;
    const unsignedPublishedBundle = { ...draftContent, authoritative: true, version: `published-${current.inputDigest.slice(0, 12)}`, publication: { performed: true, target: "palo-governance-configuration-registry", publishedAt, publisherId: principal.subject }, draftBundleDigest };
    const signature = await this.signer.sign(unsignedPublishedBundle, { tenantId: principal.tenantId, bundleId, inputDigest: current.inputDigest, reviewerId: current.reviewerId, publisherId: principal.subject });
    const publishedBundle = { ...unsignedPublishedBundle, bundleDigest: signature.digest, signature };
    const transition = await this.store.transitionBundleWithAudit(bundleId, principal.tenantId, "approved", { status: "published", publisherId: principal.subject, publishedAt, signature, bundle: publishedBundle }, this.auditRecord(principal, "bundle.publish", bundleId, requestId, { inputDigest: current.inputDigest, bundleDigest: publishedBundle.bundleDigest, signatureDigest: signature.digest, keyId: signature.keyId }));
    const updated = requireRecord(transition?.record, "Bundle");
    return { ...publicBundle(updated), operationReceipt: operationReceipt({
      action: "publish-governance-bundle", inputDigest: updated.inputDigest, requestId, status: "published", summary: "The approved configuration bundle was signed remotely and published to the tenant registry.",
      network: { attempted: true, requests: 1, credentialsUsed: true, ...(this.config.signer?.url ? { endpointOrigin: new URL(this.config.signer.url).origin } : {}), responseDigest: signature.digest },
      steps: [{ id: "authorize-publisher", status: "passed", detail: "Publisher scope and tenant matched." }, { id: "verify-lifecycle", status: "passed", detail: "Bundle was in approved state." }, { id: "remote-sign", status: "passed", detail: `Remote key ${signature.keyId} signed digest ${signature.digest}.` }, { id: "publish", status: "passed", detail: "Atomic approved to published transition persisted." }],
      boundaries: ["Private key remains outside application process", "Tenant configuration registry", "Publication is not action execution"],
      whatDidNotHappen: ["No protected executor was called", "No outcome was marked verified", "No independent deployment assurance was inferred"],
      result: { bundleDigest: signature.digest, keyId: signature.keyId }
    }) };
  }

  async getBundle(principal, bundleId, requestId) {
    requireScope(principal, "read");
    const record = requireRecord(await this.store.getBundle(bundleId, principal.tenantId), "Bundle");
    await this.audit(principal, "bundle.read", bundleId, requestId, { status: record.status });
    return publicBundle(record);
  }

  async listBundles(principal, { status = "all", limit = 50, before } = {}, requestId) {
    requireScope(principal, "read");
    if (!new Set(["all", "draft", "in-review", "approved", "rejected", "published"]).has(status)) throw error("Unknown bundle status filter");
    const boundedLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
    if (before && !Number.isFinite(Date.parse(before))) throw error("Bundle cursor must be an ISO date-time");
    const records = await this.store.listBundles(principal.tenantId, { status, limit: boundedLimit, before });
    const items = records.map((record) => ({ bundleId: record.bundleId, inputDigest: record.inputDigest, status: record.status, authorId: record.authorId, reviewerId: record.reviewerId, publisherId: record.publisherId, createdAt: record.createdAt, updatedAt: record.updatedAt }));
    await this.audit(principal, "bundle.list", null, requestId, { status, returned: items.length });
    return { items, count: items.length, nextBefore: records.length === boundedLimit ? records.at(-1).createdAt : null };
  }

  async auditEvents(principal, limit, requestId) {
    requireScope(principal, "audit");
    const events = await this.store.listAudit(principal.tenantId, limit);
    await this.audit(principal, "audit.read", null, requestId, { returned: events.length });
    return { events, count: events.length };
  }
}
