import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readNormalizedCache, writeNormalizedCache } from "./cache.js";
import { digest, normalizeRogueAiTrackerPayload, stableSignalId, verifyCollectionDigests } from "./core.js";
import { importLocalCollection } from "./providers/palo-local-import.js";
import { fetchRogueAiTrackerMetadata, readBoundedJsonResponse, synchronizeRogueAiTracker } from "./providers/rogue-ai-tracker.js";

const crosswalk = JSON.parse(await readFile(new URL("../../data/external-evidence/palo-agentic-capability-crosswalk.json", import.meta.url), "utf8"));
const incident = {
  id: "synthetic-incident-2026-08-26",
  slug: "synthetic-incident",
  title: "Synthetic agent crossed a test boundary",
  summary: "This narrative must never be copied.",
  details: "This full narrative must never be copied.",
  whyItMatters: "This commentary must never be copied.",
  occurredAt: "2026-08-25T10:00:00Z",
  publishedAt: "2026-08-26T09:00:00Z",
  sourceName: "Synthetic primary source",
  sourceUrl: "https://example.test/research/synthetic-incident",
  additionalSources: [{ name: "Synthetic corroboration", url: "https://example.org/corroboration", publishedAt: "2026-08-26T10:00:00Z", note: "must not copy" }],
  evidenceAttribution: "agent-initiated",
  attributionReview: { status: "proposed", rationale: "must not copy" },
  tags: ["Task overreach", "Field evidence"],
  gateImpacts: [{ gateId: "scope-breach", score: 5, justification: { evidence: "must not copy", whatWouldChangeThis: "must not copy" } }],
};

function normalize(payload = { incidents: [incident] }) {
  return normalizeRogueAiTrackerPayload(payload, {
    crosswalk,
    retrievedAt: "2026-08-26T12:00:00Z",
    payloadDigest: digest(JSON.stringify(payload)),
  });
}

function resign(collection) {
  const copy = structuredClone(collection);
  copy.signals = copy.signals.map((signal) => {
    const { signalDigest: _discarded, ...unsignedSignal } = signal;
    return { ...unsignedSignal, signalDigest: digest(unsignedSignal) };
  });
  const { collectionDigest: _discarded, ...unsignedCollection } = copy;
  return { ...unsignedCollection, collectionDigest: digest(unsignedCollection) };
}

test("normalizes only metadata and preserves the explicit score boundary", () => {
  const collection = normalize();
  assert.equal(collection.signals.length, 1);
  const [signal] = collection.signals;
  assert.equal(signal.signalId, stableSignalId("rogue-ai-tracker", incident.id));
  assert.equal(signal.capabilityObservations[0].providerScore, 5);
  assert.equal(signal.capabilityObservations[0].notUseCaseRiskScore, true);
  assert.equal(signal.boundary.requiresLocalAssessment, true);
  assert.equal(signal.review.reviewState, "unreviewed");
  const serialized = JSON.stringify(collection);
  for (const forbidden of [incident.summary, incident.details, incident.whyItMatters, "must not copy"]) assert.equal(serialized.includes(forbidden), false);
  assert.equal(verifyCollectionDigests(collection), true);
});

test("deduplicates stable provider and external IDs deterministically", () => {
  const earlier = { ...incident, title: "Earlier title", publishedAt: "2026-08-25T09:00:00Z" };
  const collection = normalize({ incidents: [incident, earlier, incident] });
  assert.equal(collection.ingestion.received, 3);
  assert.equal(collection.ingestion.accepted, 1);
  assert.equal(collection.ingestion.deduplicated, 2);
  assert.equal(collection.signals[0].title, incident.title);
});

test("fails closed when the provider introduces an unmapped capability", () => {
  assert.throws(() => normalize({ incidents: [{ ...incident, gateImpacts: [{ gateId: "new-provider-capability", score: 4 }] }] }), /unmapped provider capability/);
});

test("rejects invalid provider scores and unsafe source URLs", () => {
  assert.throws(() => normalize({ incidents: [{ ...incident, gateImpacts: [{ gateId: "scope-breach", score: 11 }] }] }), /between 1 and 10/);
  assert.throws(() => normalize({ incidents: [{ ...incident, sourceUrl: "http://example.test/not-secure" }] }), /must use HTTPS/);
});

test("bounded response reader rejects oversized and non-JSON responses", async () => {
  await assert.rejects(() => readBoundedJsonResponse(new Response("{}", { headers: { "content-type": "text/plain" } }), 1024), /content type/);
  await assert.rejects(() => readBoundedJsonResponse(new Response("{\"incidents\":[]}", { headers: { "content-type": "application/json", "content-length": "5000" } }), 1024), /exceeds/);
});

test("fetch adapter rejects redirects and normalizes a bounded response", async () => {
  let requestOptions;
  const payload = { incidents: [incident] };
  const collection = await fetchRogueAiTrackerMetadata({
    crosswalk,
    now: () => new Date("2026-08-26T12:00:00Z"),
    fetchImpl: async (_url, options) => {
      requestOptions = options;
      return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(requestOptions.redirect, "error");
  assert.equal(collection.signals.length, 1);
  await assert.rejects(() => fetchRogueAiTrackerMetadata({ crosswalk, endpoint: "https://example.test/api/incidents", fetchImpl: async () => new Response("{}") }), /allow-listed/);
});

test("offline cache reports age while network fallback enforces finite maximum stale age", async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "palo-external-evidence-test-"));
  const cacheFile = path.join(temporaryDirectory, "normalized.json");
  try {
    const collection = normalize();
    await writeNormalizedCache(cacheFile, collection);
    const now = () => new Date("2026-08-28T12:00:00Z");
    const offline = await synchronizeRogueAiTracker({ crosswalk, cacheFile, offline: true, cacheTtlMs: 24 * 60 * 60 * 1000, now });
    assert.equal(offline.source, "cache-offline");
    assert.equal(offline.stale, true);
    assert.equal(offline.ageMs, 2 * 24 * 60 * 60 * 1000);

    const fallback = await synchronizeRogueAiTracker({
      crosswalk,
      cacheFile,
      cacheTtlMs: 24 * 60 * 60 * 1000,
      maxStaleMs: 3 * 24 * 60 * 60 * 1000,
      now,
      fetchImpl: async () => { throw new Error("synthetic network outage"); },
    });
    assert.equal(fallback.source, "cache-fallback");
    assert.equal(fallback.stale, true);
    assert.equal(fallback.ageMs, 2 * 24 * 60 * 60 * 1000);
    await assert.rejects(() => synchronizeRogueAiTracker({
      crosswalk,
      cacheFile,
      cacheTtlMs: 12 * 60 * 60 * 1000,
      maxStaleMs: 24 * 60 * 60 * 1000,
      now,
      fetchImpl: async () => { throw new Error("synthetic network outage"); },
    }), /synthetic network outage/);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("provider-neutral local import validates a PALO collection without network access", async () => {
  const inputFile = fileURLToPath(new URL("../../examples/external-evidence/rogue-ai-tracker-metadata.example.json", import.meta.url));
  const collection = await importLocalCollection({ inputFile });
  assert.equal(collection.format, "palo-external-agentic-evidence-collection");
  assert.equal(collection.providerId, "rogue-ai-tracker");
  assert.equal(collection.boundary.networkOptional, true);
  assert.equal(verifyCollectionDigests(collection), true);
});

test("cache and local import reject prohibited narrative and schema-invalid collections even with valid digests", async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "palo-external-evidence-invalid-"));
  const cacheFile = path.join(temporaryDirectory, "normalized.json");
  try {
    const narrative = structuredClone(normalize());
    narrative.signals[0].details = "narrative content must not enter a normalized cache";
    await writeFile(cacheFile, `${JSON.stringify(resign(narrative))}\n`);
    await assert.rejects(() => readNormalizedCache(cacheFile), /prohibited narrative field/);
    await assert.rejects(() => importLocalCollection({ inputFile: cacheFile }), /prohibited narrative field/);

    const schemaInvalid = structuredClone(normalize());
    schemaInvalid.signals[0].unknownField = true;
    await writeFile(cacheFile, `${JSON.stringify(resign(schemaInvalid))}\n`);
    await assert.rejects(() => readNormalizedCache(cacheFile), /JSON Schema validation/);
    await assert.rejects(() => importLocalCollection({ inputFile: cacheFile }), /JSON Schema validation/);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
