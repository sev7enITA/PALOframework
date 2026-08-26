import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReviewLedger,
  effectiveReviewState,
  loadReviewMap,
  POLICYWATCHER_REVIEW_STORAGE_KEY,
  saveReviewState,
} from "./policyWatcherReviewLedger.js";

const active = {
  signalId: "signal-policywatcher-11111111-1111-4111-8111-111111111111",
  signalDigest: "a".repeat(64), transportStatus: "active", reviewState: "pending-human-review",
  firstAcceptedAt: "2026-08-26T10:00:00.000Z",
};
const registry = { collectionDigest: "b".repeat(64), entries: [active] };

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), values };
}

test("review state is bound to the exact active signal digest", () => {
  const local = storage();
  const updated = saveReviewState(local, registry, {}, active.signalId, "in-review", "2026-08-26T11:00:00.000Z");
  assert.equal(effectiveReviewState(active, updated), "in-review");
  assert.equal(JSON.parse(local.values.get(POLICYWATCHER_REVIEW_STORAGE_KEY))[active.signalId].signalDigest, active.signalDigest);
  const changedRegistry = { ...registry, entries: [{ ...active, signalDigest: "c".repeat(64) }] };
  assert.deepEqual(loadReviewMap(local, changedRegistry), {});
});

test("revoked signals cannot receive a new local review transition", () => {
  assert.throws(() => saveReviewState(null, { ...registry, entries: [{ ...active, transportStatus: "revoked" }] }, {}, active.signalId, "reviewed-no-action"));
});

test("exported ledger keeps transport and review state separate", () => {
  const reviewMap = { [active.signalId]: { signalDigest: active.signalDigest, reviewState: "routed-to-case-file", updatedAt: "2026-08-26T11:00:00.000Z" } };
  const ledger = buildReviewLedger(registry, reviewMap, "2026-08-26T12:00:00.000Z");
  assert.equal(ledger.sourceRegistryDigest, registry.collectionDigest);
  assert.equal(ledger.reviews[0].transportStatus, "active");
  assert.equal(ledger.reviews[0].reviewState, "routed-to-case-file");
  assert.equal(ledger.localOnly, true);
});
