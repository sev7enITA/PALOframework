import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertRegistry,
  createEmptyRegistry,
  createValidators,
  registryDigest,
  synchronizePolicyWatcherSignals,
} from "./index.js";

const fixture = JSON.parse(await readFile(new URL("../../schemas/fixtures/policywatcher-signal.policywatcher.valid.json", import.meta.url), "utf8"));
const validators = await createValidators();

function signal(id, company) {
  const value = structuredClone(fixture);
  const oldId = value.extensions.policyWatcherRecord.changeId;
  value.signalId = `signal-policywatcher-${id}`;
  value.source.sourceId = `policywatcher-change-${id}`;
  value.source.title = `${company}: AI Policy`;
  value.source.url = value.source.url.replace(oldId, id);
  value.extensions.policyWatcherRecord.changeId = id;
  value.extensions.policyWatcherRecord.company.name = company;
  for (const key of Object.keys(value.extensions.policyWatcherRecord.links)) {
    value.extensions.policyWatcherRecord.links[key] = value.extensions.policyWatcherRecord.links[key].replace(oldId, id);
  }
  return value;
}

function batch(signals, { hasMore = false, nextCursor = null } = {}) {
  return {
    format: "palo-policywatcher-signal-batch",
    schemaVersion: "1.0.0",
    mode: "complete-active-snapshot",
    locale: "en",
    count: signals.length,
    limit: 25,
    hasMore,
    nextCursor,
    signals,
    boundary: "This complete forward page contains only currently public, evidence-gated PolicyWatcher changes. Consumers must traverse every page before treating an absent signal as withdrawn, validate each PALO-owned signal and retain the non-authoritative human-review boundary.",
  };
}

function response(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  });
}

test("healthy synchronization traverses every page and validates the operational registry", async () => {
  const alpha = signal("11111111-1111-4111-8111-111111111111", "Alpha");
  const beta = signal("22222222-2222-4222-8222-222222222222", "Beta");
  let call = 0;
  const registry = await synchronizePolicyWatcherSignals({
    previous: createEmptyRegistry(), validators, now: "2026-08-26T12:00:00.000Z",
    fetchImpl: async () => response(call++ === 0 ? batch([alpha], { hasMore: true, nextCursor: "cursor-one" }) : batch([beta])),
  });
  assert.equal(registry.transport.state, "healthy");
  assert.equal(registry.transport.completeTraversal, true);
  assert.equal(registry.transport.pageCount, 2);
  assert.equal(registry.statistics.active, 2);
  assert.equal(registry.statistics.changed, 2);
  assert.equal(registry.alerts.length, 0);
  assert.equal(registry.collectionDigest, registryDigest(registry));
  assertRegistry(registry, validators);
});

test("a complete later traversal revokes missing signals and removes their payload", async () => {
  const alpha = signal("11111111-1111-4111-8111-111111111111", "Alpha");
  const beta = signal("22222222-2222-4222-8222-222222222222", "Beta");
  const previous = await synchronizePolicyWatcherSignals({
    previous: createEmptyRegistry(), validators, now: "2026-08-26T12:00:00.000Z",
    fetchImpl: async () => response(batch([alpha, beta])),
  });
  const registry = await synchronizePolicyWatcherSignals({
    previous, validators, now: "2026-08-26T13:00:00.000Z",
    fetchImpl: async () => response(batch([alpha])),
  });
  assert.equal(registry.statistics.active, 1);
  assert.equal(registry.statistics.revoked, 1);
  const revoked = registry.entries.find((entry) => entry.signalId === beta.signalId);
  assert.equal(revoked.transportStatus, "revoked");
  assert.equal(revoked.signal, null);
  assert.equal(revoked.revokedAt, "2026-08-26T13:00:00.000Z");
  assert.deepEqual(registry.alerts.map((item) => item.code), ["signal-revoked"]);
});

test("transport failure preserves the last validated active registry and alerts fail-closed", async () => {
  const alpha = signal("11111111-1111-4111-8111-111111111111", "Alpha");
  const previous = await synchronizePolicyWatcherSignals({
    previous: createEmptyRegistry(), validators, now: "2026-08-26T12:00:00.000Z",
    fetchImpl: async () => response(batch([alpha])),
  });
  const registry = await synchronizePolicyWatcherSignals({
    previous, validators, now: "2026-08-26T13:00:00.000Z",
    fetchImpl: async () => response({ error: "unavailable" }, 503),
  });
  assert.equal(registry.transport.state, "degraded");
  assert.equal(registry.transport.stale, true);
  assert.equal(registry.statistics.active, 1);
  assert.equal(registry.entries[0].signalId, alpha.signalId);
  assert.equal(registry.alerts[0].code, "transport-unavailable");
  assert.equal(registry.alerts[0].severity, "critical");
});

test("invalid payload and non-advancing pagination never create false revocations", async () => {
  const alpha = signal("11111111-1111-4111-8111-111111111111", "Alpha");
  const previous = await synchronizePolicyWatcherSignals({
    previous: createEmptyRegistry(), validators, now: "2026-08-26T12:00:00.000Z",
    fetchImpl: async () => response(batch([alpha])),
  });
  let call = 0;
  const registry = await synchronizePolicyWatcherSignals({
    previous, validators, now: "2026-08-26T13:00:00.000Z",
    fetchImpl: async () => response(call++ === 0
      ? batch([], { hasMore: true, nextCursor: "cursor-repeat" })
      : batch([], { hasMore: true, nextCursor: "cursor-repeat" })),
  });
  assert.equal(registry.transport.state, "degraded");
  assert.equal(registry.statistics.active, 1);
  assert.equal(registry.statistics.revoked, 0);
  assert.equal(registry.alerts[0].code, "pagination-incomplete");
});
