import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const POLICYWATCHER_ORIGIN = "https://policywatcher.online";
export const POLICYWATCHER_BATCH_ENDPOINT = "/api/v1/integrations/palo/signals";
export const MAX_PAGES = 20;
export const PAGE_LIMIT = 25;
export const MAX_RESPONSE_BYTES = 1024 * 1024;
export const AUTHORITY_BOUNDARY = "Automated transport moves validated public monitoring signals only. PALO remains fully operable without PolicyWatcher, does not infer applicability, risk, control effectiveness or gate decisions, and requires accountable local review before use.";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(packageRoot, "../..");
const REVIEW_STATES = new Set(["pending-human-review", "in-review", "routed-to-case-file", "reviewed-no-action", "rejected"]);

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function registryDigest(registry) {
  const { collectionDigest: _ignored, ...content } = registry;
  return sha256(canonicalJson(content));
}

export function createEmptyRegistry(at = "2026-08-26T00:00:00.000Z") {
  const registry = {
    format: "palo-policywatcher-signal-registry",
    schemaVersion: "1.0.0",
    updatedAt: at,
    source: {
      providerId: "policywatcher",
      origin: POLICYWATCHER_ORIGIN,
      endpoint: POLICYWATCHER_BATCH_ENDPOINT,
      mode: "optional-pull",
      networkOptional: true,
    },
    transport: {
      state: "not-synchronized",
      lastAttemptAt: null,
      lastSuccessfulSyncAt: null,
      completeTraversal: false,
      pageCount: 0,
      stale: false,
      errorCode: null,
    },
    statistics: { active: 0, revoked: 0, received: 0, accepted: 0, rejected: 0, changed: 0 },
    entries: [],
    alerts: [],
    authorityBoundary: AUTHORITY_BOUNDARY,
    collectionDigest: "0".repeat(64),
  };
  registry.collectionDigest = registryDigest(registry);
  return registry;
}

export async function createValidators(root = projectRoot) {
  const [signalSchema, batchSchema, registrySchema] = await Promise.all([
    readFile(path.join(root, "schemas/policywatcher-signal.schema.json"), "utf8"),
    readFile(path.join(root, "schemas/policywatcher-signal-batch.schema.json"), "utf8"),
    readFile(path.join(root, "schemas/palo-policywatcher-signal-registry.schema.json"), "utf8"),
  ]).then((values) => values.map(JSON.parse));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(signalSchema);
  return {
    ajv,
    batch: ajv.compile(batchSchema),
    registry: ajv.compile(registrySchema),
    signal: ajv.getSchema(signalSchema.$id),
  };
}

export function assertRegistry(registry, validators) {
  if (!validators.registry(registry)) throw new TypeError(`PolicyWatcher registry schema rejected: ${validators.ajv.errorsText(validators.registry.errors)}`);
  if (registry.collectionDigest !== registryDigest(registry)) throw new TypeError("PolicyWatcher registry digest mismatch");
  return registry;
}

class TransportError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TransportError";
    this.code = code;
  }
}

async function responseJsonWithLimit(response, maxBytes = MAX_RESPONSE_BYTES) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) throw new TransportError("response-too-large", "PolicyWatcher response exceeds 1 MiB");
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) throw new TransportError("response-too-large", "PolicyWatcher response exceeds 1 MiB");
    return JSON.parse(text);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new TransportError("response-too-large", "PolicyWatcher response exceeds 1 MiB");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8"));
}

async function fetchBatch(fetchImpl, cursor, timeoutMs) {
  const url = new URL(POLICYWATCHER_BATCH_ENDPOINT, POLICYWATCHER_ORIGIN);
  url.searchParams.set("limit", String(PAGE_LIMIT));
  url.searchParams.set("lang", "en");
  if (cursor) url.searchParams.set("cursor", cursor);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new TransportError("network-error", error instanceof Error ? error.message : "PolicyWatcher network request failed");
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new TransportError("http-error", `PolicyWatcher batch returned HTTP ${response.status}`);
  if (!(response.headers.get("cache-control") || "").toLowerCase().includes("no-store")) {
    throw new TransportError("schema-error", "PolicyWatcher batch omitted the no-store revocation boundary");
  }
  if (response.headers.get("access-control-allow-origin") !== "*") {
    throw new TransportError("schema-error", "PolicyWatcher batch omitted the public CORS boundary");
  }
  try {
    return await responseJsonWithLimit(response);
  } catch (error) {
    if (error instanceof TransportError) throw error;
    throw new TransportError("schema-error", error instanceof Error ? error.message : "PolicyWatcher batch is not valid JSON");
  }
}

function changeIdFor(signal) {
  const changeId = signal?.extensions?.policyWatcherRecord?.changeId;
  if (typeof changeId !== "string") throw new TransportError("schema-error", `Signal ${signal?.signalId || "unknown"} omits the PolicyWatcher change identifier`);
  return changeId.toLowerCase();
}

function alert(code, severity, observedAt, message, signalId = null) {
  return { code, severity, signalId, observedAt, message };
}

function completeRegistry(registry) {
  registry.statistics.active = registry.entries.filter((entry) => entry.transportStatus === "active").length;
  registry.statistics.revoked = registry.entries.filter((entry) => entry.transportStatus === "revoked").length;
  registry.collectionDigest = registryDigest(registry);
  return registry;
}

function safeReviewState(value) {
  return REVIEW_STATES.has(value) ? value : "pending-human-review";
}

export async function synchronizePolicyWatcherSignals({
  fetchImpl = globalThis.fetch,
  previous = createEmptyRegistry(),
  validators,
  now = new Date().toISOString(),
  timeoutMs = 6000,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");
  if (!validators) validators = await createValidators();
  assertRegistry(previous, validators);

  const previousById = new Map(previous.entries.map((entry) => [entry.signalId, entry]));
  const observed = new Map();
  const cursors = new Set();
  const currentAlerts = [];
  let cursor = null;
  let pageCount = 0;

  try {
    while (true) {
      if (pageCount >= MAX_PAGES) throw new TransportError("capacity-exceeded", "PolicyWatcher snapshot exceeds the 500-signal transport cap");
      const batch = await fetchBatch(fetchImpl, cursor, timeoutMs);
      pageCount += 1;
      if (!validators.batch(batch)) throw new TransportError("schema-error", `PolicyWatcher batch schema rejected: ${validators.ajv.errorsText(validators.batch.errors)}`);
      if (batch.count !== batch.signals.length) throw new TransportError("schema-error", "PolicyWatcher batch count does not match the signal array");
      for (const signal of batch.signals) {
        if (!validators.signal(signal)) throw new TransportError("schema-error", `PolicyWatcher signal schema rejected: ${validators.ajv.errorsText(validators.signal.errors)}`);
        if (observed.has(signal.signalId)) throw new TransportError("pagination-error", `Duplicate PolicyWatcher signal ${signal.signalId}`);
        observed.set(signal.signalId, { signal, changeId: changeIdFor(signal), signalDigest: sha256(canonicalJson(signal)) });
      }
      if (!batch.hasMore) break;
      if (!batch.nextCursor || cursors.has(batch.nextCursor)) throw new TransportError("pagination-error", "PolicyWatcher pagination cursor did not advance");
      cursors.add(batch.nextCursor);
      cursor = batch.nextCursor;
    }

    const active = [];
    let changed = 0;
    for (const [signalId, item] of observed) {
      const prior = previousById.get(signalId);
      const republished = prior?.transportStatus === "revoked";
      if (!prior || prior.signalDigest !== item.signalDigest || republished) changed += 1;
      if (republished) currentAlerts.push(alert("signal-republished", "info", now, "A previously withdrawn signal is public again and requires a new human review decision.", signalId));
      active.push({
        signalId,
        changeId: item.changeId,
        signalDigest: item.signalDigest,
        transportStatus: "active",
        reviewState: safeReviewState(prior?.reviewState),
        firstAcceptedAt: prior?.firstAcceptedAt || now,
        lastValidatedAt: now,
        revokedAt: null,
        signal: item.signal,
      });
    }

    const revoked = [];
    for (const prior of previous.entries) {
      if (observed.has(prior.signalId)) continue;
      if (prior.transportStatus === "active") {
        changed += 1;
        currentAlerts.push(alert("signal-revoked", "warning", now, "The signal is no longer in the complete public snapshot and was removed from the active queue.", prior.signalId));
        revoked.push({ ...prior, transportStatus: "revoked", lastValidatedAt: now, revokedAt: now, signal: null });
      } else {
        revoked.push(prior);
      }
    }
    const room = Math.max(0, 500 - active.length);
    const retainedRevoked = revoked
      .sort((left, right) => String(right.revokedAt).localeCompare(String(left.revokedAt)))
      .slice(0, room);
    const registry = completeRegistry({
      format: "palo-policywatcher-signal-registry",
      schemaVersion: "1.0.0",
      updatedAt: now,
      source: previous.source,
      transport: { state: "healthy", lastAttemptAt: now, lastSuccessfulSyncAt: now, completeTraversal: true, pageCount, stale: false, errorCode: null },
      statistics: { active: 0, revoked: 0, received: observed.size, accepted: observed.size, rejected: 0, changed },
      entries: [...active, ...retainedRevoked].sort((left, right) => left.signalId.localeCompare(right.signalId)),
      alerts: currentAlerts,
      authorityBoundary: AUTHORITY_BOUNDARY,
      collectionDigest: "0".repeat(64),
    });
    assertRegistry(registry, validators);
    return registry;
  } catch (error) {
    const code = error instanceof TransportError ? error.code : "network-error";
    const registry = completeRegistry({
      ...previous,
      updatedAt: now,
      transport: {
        state: previous.transport.lastSuccessfulSyncAt ? "degraded" : "unavailable",
        lastAttemptAt: now,
        lastSuccessfulSyncAt: previous.transport.lastSuccessfulSyncAt,
        completeTraversal: false,
        pageCount,
        stale: previous.entries.some((entry) => entry.transportStatus === "active"),
        errorCode: code,
      },
      statistics: {
        ...previous.statistics,
        received: observed.size,
        accepted: 0,
        rejected: observed.size,
        changed: 0,
      },
      alerts: [alert(
        code === "capacity-exceeded" ? "capacity-exceeded" : code === "schema-error" ? "contract-rejected" : code === "pagination-error" ? "pagination-incomplete" : "transport-unavailable",
        "critical",
        now,
        error instanceof Error ? error.message.slice(0, 300) : "PolicyWatcher transport failed closed.",
      )],
      collectionDigest: "0".repeat(64),
    });
    assertRegistry(registry, validators);
    return registry;
  }
}
