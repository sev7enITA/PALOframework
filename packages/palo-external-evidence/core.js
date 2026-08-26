import { createHash } from "node:crypto";

export const EXTERNAL_EVIDENCE_CONTRACT_VERSION = "1.0.0";
export const ROGUE_AI_TRACKER_PROVIDER_ID = "rogue-ai-tracker";
export const ROGUE_AI_TRACKER_ADAPTER_VERSION = "1.0.0";
export const ROGUE_AI_TRACKER_BASE_URL = "https://rogueaitracker.com";

const BOUNDARY = Object.freeze({
  externalCapabilityEvidence: true,
  notUseCaseRiskScore: true,
  requiresLocalAssessment: true,
  networkOptional: true,
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, label) {
  if (!isRecord(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function requireString(value, label, maximum = 500) {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label} must be a non-empty string`);
  const normalized = value.trim();
  if (normalized.length > maximum) throw new RangeError(`${label} exceeds ${maximum} characters`);
  return normalized;
}

function optionalTimestamp(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  const timestamp = requireString(value, label, 80);
  if (!Number.isFinite(Date.parse(timestamp))) throw new TypeError(`${label} must be an ISO-compatible timestamp`);
  return new Date(timestamp).toISOString();
}

function requireHttpsUrl(value, label) {
  const normalized = requireString(value, label, 2000);
  let parsed;
  try { parsed = new URL(normalized); }
  catch { throw new TypeError(`${label} must be a valid URL`); }
  if (parsed.protocol !== "https:") throw new TypeError(`${label} must use HTTPS`);
  parsed.hash = "";
  return parsed.toString();
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value;
}

export function digest(value) {
  const bytes = typeof value === "string" || Buffer.isBuffer(value)
    ? value
    : JSON.stringify(canonicalize(value));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function stableSignalId(providerId, externalId) {
  return `eas-${createHash("sha256").update(`${providerId}\u0000${externalId}`).digest("hex")}`;
}

function stableObservationId(providerId, externalId, providerCapabilityId, paloCapabilityId) {
  return `eao-${createHash("sha256").update(`${providerId}\u0000${externalId}\u0000${providerCapabilityId}\u0000${paloCapabilityId}`).digest("hex")}`;
}

function settingFromTags(tags) {
  const lowered = tags.map((tag) => String(tag).toLowerCase());
  const field = lowered.some((tag) => tag.includes("field evidence"));
  const laboratory = lowered.some((tag) => tag.includes("lab evidence") || tag.includes("laboratory"));
  if (field && laboratory) return "mixed";
  if (field) return "field";
  if (laboratory) return "laboratory";
  return "unknown";
}

function normalizeAgency(value) {
  if (value === "human-directed" || value === "agent-initiated" || value === "mixed") return value;
  return "unknown";
}

function sourceFrom(value, role, label) {
  const source = requireRecord(value, label);
  const publishedAt = optionalTimestamp(source.publishedAt, `${label}.publishedAt`);
  return {
    name: requireString(source.name ?? source.sourceName, `${label}.name`, 200),
    url: requireHttpsUrl(source.url ?? source.sourceUrl, `${label}.url`),
    role,
    ...(publishedAt ? { publishedAt } : {}),
  };
}

export function buildProviderMappingIndex(crosswalk, providerId = ROGUE_AI_TRACKER_PROVIDER_ID) {
  requireRecord(crosswalk, "crosswalk");
  if (crosswalk.format !== "palo-agentic-capability-crosswalk" || crosswalk.schemaVersion !== EXTERNAL_EVIDENCE_CONTRACT_VERSION) {
    throw new TypeError("crosswalk must use the supported PALO capability crosswalk contract");
  }
  const capabilityIds = new Set((crosswalk.capabilities ?? []).map((item) => item.capabilityId));
  const index = new Map();
  for (const mapping of crosswalk.providerMappings ?? []) {
    if (mapping.providerId !== providerId || mapping.reviewState !== "approved") continue;
    if (index.has(mapping.providerCapabilityId)) throw new TypeError(`duplicate provider mapping ${providerId}/${mapping.providerCapabilityId}`);
    for (const capabilityId of mapping.paloCapabilityIds ?? []) {
      if (!capabilityIds.has(capabilityId)) throw new TypeError(`mapping references unknown PALO capability ${capabilityId}`);
    }
    index.set(mapping.providerCapabilityId, mapping);
  }
  if (index.size === 0) throw new TypeError(`crosswalk has no approved mappings for ${providerId}`);
  return index;
}

function normalizeCapabilityObservations(incident, mappingIndex, externalId) {
  if (!Array.isArray(incident.gateImpacts)) throw new TypeError(`incident ${externalId} gateImpacts must be an array`);
  if (incident.gateImpacts.length > 32) throw new RangeError(`incident ${externalId} has too many capability observations`);
  const observations = [];
  const seen = new Set();
  for (const [index, value] of incident.gateImpacts.entries()) {
    const impact = requireRecord(value, `incident ${externalId} gateImpacts[${index}]`);
    const providerCapabilityId = requireString(impact.gateId, `incident ${externalId} gateId`, 120);
    if (seen.has(providerCapabilityId)) continue;
    seen.add(providerCapabilityId);
    const mapping = mappingIndex.get(providerCapabilityId);
    if (!mapping) throw new TypeError(`incident ${externalId} contains unmapped provider capability ${providerCapabilityId}`);
    const providerScore = Number(impact.score);
    if (!Number.isFinite(providerScore) || providerScore < 1 || providerScore > 10) {
      throw new RangeError(`incident ${externalId} capability ${providerCapabilityId} score must be between 1 and 10`);
    }
    for (const paloCapabilityId of mapping.paloCapabilityIds) {
      observations.push({
        observationId: stableObservationId(ROGUE_AI_TRACKER_PROVIDER_ID, externalId, providerCapabilityId, paloCapabilityId),
        paloCapabilityId,
        providerCapabilityId,
        providerLabel: requireString(mapping.providerLabel, `mapping ${providerCapabilityId} providerLabel`, 160),
        providerScore,
        providerScale: { minimum: 1, maximum: 10 },
        providerRubricVersion: requireString(mapping.providerRubricVersion, `mapping ${providerCapabilityId} providerRubricVersion`, 100),
        mappingVersion: requireString(mapping.mappingVersion, `mapping ${providerCapabilityId} mappingVersion`, 40),
        mappingReviewState: mapping.reviewState,
        contextOnly: true,
        notUseCaseRiskScore: true,
      });
    }
  }
  observations.sort((left, right) => left.observationId.localeCompare(right.observationId));
  return observations;
}

export function normalizeRogueAiTrackerIncident(value, options) {
  const incident = requireRecord(value, "incident");
  const externalId = requireString(incident.id, "incident.id", 500);
  const slug = requireString(incident.slug, `incident ${externalId} slug`, 300);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new TypeError(`incident ${externalId} slug has unsupported characters`);
  const retrievedAt = optionalTimestamp(options.retrievedAt, "retrievedAt");
  if (!retrievedAt) throw new TypeError("retrievedAt is required");
  const retrievalDigest = requireString(options.payloadDigest, "payloadDigest", 80);
  if (!/^sha256:[a-f0-9]{64}$/.test(retrievalDigest)) throw new TypeError("payloadDigest must be a SHA-256 digest");
  const capabilityObservations = normalizeCapabilityObservations(incident, options.mappingIndex, externalId);
  if (capabilityObservations.length === 0) return null;

  const sources = [sourceFrom({ name: incident.sourceName, url: incident.sourceUrl, publishedAt: incident.publishedAt }, "primary", `incident ${externalId} primary source`)];
  const sourceUrls = new Set(sources.map((source) => source.url));
  if (incident.additionalSources !== undefined && !Array.isArray(incident.additionalSources)) {
    throw new TypeError(`incident ${externalId} additionalSources must be an array`);
  }
  if ((incident.additionalSources ?? []).length > 19) throw new RangeError(`incident ${externalId} has too many additional sources`);
  for (const [index, additionalSource] of (incident.additionalSources ?? []).entries()) {
    const source = sourceFrom(additionalSource, "supporting", `incident ${externalId} additionalSources[${index}]`);
    if (!sourceUrls.has(source.url)) {
      sourceUrls.add(source.url);
      sources.push(source);
    }
  }

  const eventAt = optionalTimestamp(incident.occurredAt, `incident ${externalId} occurredAt`);
  const publishedAt = optionalTimestamp(incident.publishedAt, `incident ${externalId} publishedAt`);
  const providerReviewState = typeof incident.attributionReview?.status === "string"
    ? requireString(incident.attributionReview.status, `incident ${externalId} attributionReview.status`, 80)
    : "not-declared";
  const signalWithoutDigest = {
    signalId: stableSignalId(ROGUE_AI_TRACKER_PROVIDER_ID, externalId),
    externalId,
    provider: {
      providerId: ROGUE_AI_TRACKER_PROVIDER_ID,
      adapterVersion: ROGUE_AI_TRACKER_ADAPTER_VERSION,
      contractVersion: EXTERNAL_EVIDENCE_CONTRACT_VERSION,
    },
    title: requireString(incident.title, `incident ${externalId} title`, 300),
    canonicalUrl: `${ROGUE_AI_TRACKER_BASE_URL}/incidents/${slug}`,
    observedContext: {
      ...(eventAt ? { eventAt } : {}),
      ...(publishedAt ? { publishedAt } : {}),
      setting: settingFromTags(Array.isArray(incident.tags) ? incident.tags : []),
      agency: normalizeAgency(incident.evidenceAttribution),
    },
    capabilityObservations,
    provenance: { retrievalDigest, sources },
    review: { reviewState: "unreviewed", providerReviewState },
    confidence: {
      state: "not-assessed",
      basis: "PALO preserves provider metadata and source links but does not infer confidence before accountable local review.",
    },
    retrievedAt,
    boundary: { ...BOUNDARY },
  };
  return { ...signalWithoutDigest, signalDigest: digest(signalWithoutDigest) };
}

export function normalizeRogueAiTrackerPayload(payload, options) {
  const envelope = requireRecord(payload, "Rogue AI Tracker payload");
  if (!Array.isArray(envelope.incidents)) throw new TypeError("Rogue AI Tracker payload.incidents must be an array");
  const maximumRecords = options.maximumRecords ?? 500;
  if (!Number.isInteger(maximumRecords) || maximumRecords < 1 || maximumRecords > 1000) throw new RangeError("maximumRecords must be between 1 and 1000");
  if (envelope.incidents.length > maximumRecords) throw new RangeError(`Rogue AI Tracker payload exceeds ${maximumRecords} incidents`);
  const mappingIndex = buildProviderMappingIndex(options.crosswalk);
  const bySignalId = new Map();
  let skipped = 0;
  let deduplicated = 0;
  for (const value of envelope.incidents) {
    const signal = normalizeRogueAiTrackerIncident(value, { ...options, mappingIndex });
    if (!signal) {
      skipped += 1;
      continue;
    }
    const existing = bySignalId.get(signal.signalId);
    if (!existing) {
      bySignalId.set(signal.signalId, signal);
      continue;
    }
    deduplicated += 1;
    const existingPublished = Date.parse(existing.observedContext.publishedAt ?? 0);
    const nextPublished = Date.parse(signal.observedContext.publishedAt ?? 0);
    if (nextPublished > existingPublished || (nextPublished === existingPublished && signal.signalDigest.localeCompare(existing.signalDigest) > 0)) {
      bySignalId.set(signal.signalId, signal);
    }
  }
  const signals = [...bySignalId.values()].sort((left, right) => left.signalId.localeCompare(right.signalId));
  const collectionWithoutDigest = {
    format: "palo-external-agentic-evidence-collection",
    schemaVersion: EXTERNAL_EVIDENCE_CONTRACT_VERSION,
    providerId: ROGUE_AI_TRACKER_PROVIDER_ID,
    retrievedAt: new Date(options.retrievedAt).toISOString(),
    sourcePayloadDigest: options.payloadDigest,
    signals,
    ingestion: {
      received: envelope.incidents.length,
      accepted: signals.length,
      deduplicated,
      skipped,
    },
    boundary: { ...BOUNDARY },
  };
  return { ...collectionWithoutDigest, collectionDigest: digest(collectionWithoutDigest) };
}

export function verifyCollectionDigests(collection) {
  requireRecord(collection, "collection");
  for (const signal of collection.signals ?? []) {
    const { signalDigest, ...unsignedSignal } = signal;
    if (digest(unsignedSignal) !== signalDigest) throw new TypeError(`signal digest mismatch for ${signal.signalId ?? "unknown signal"}`);
  }
  const { collectionDigest, ...unsignedCollection } = collection;
  if (digest(unsignedCollection) !== collectionDigest) throw new TypeError("collection digest mismatch");
  return true;
}
