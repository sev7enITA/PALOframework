export const POLICYWATCHER_REVIEW_STORAGE_KEY = "palo-policywatcher-review-ledger-v1";
export const POLICYWATCHER_REVIEW_STATES = Object.freeze([
  "pending-human-review",
  "in-review",
  "routed-to-case-file",
  "reviewed-no-action",
  "rejected",
]);

const reviewStateSet = new Set(POLICYWATCHER_REVIEW_STATES);

export function normalizedReviewMap(raw, registry) {
  const entries = new Map(registry.entries.map((entry) => [entry.signalId, entry]));
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const normalized = {};
  for (const [signalId, review] of Object.entries(source)) {
    const entry = entries.get(signalId);
    if (!entry || !review || typeof review !== "object") continue;
    if (review.signalDigest !== entry.signalDigest || !reviewStateSet.has(review.reviewState)) continue;
    if (typeof review.updatedAt !== "string" || Number.isNaN(Date.parse(review.updatedAt))) continue;
    normalized[signalId] = {
      signalDigest: review.signalDigest,
      reviewState: review.reviewState,
      updatedAt: new Date(review.updatedAt).toISOString(),
    };
  }
  return normalized;
}

export function loadReviewMap(storage, registry) {
  if (!storage) return {};
  try { return normalizedReviewMap(JSON.parse(storage.getItem(POLICYWATCHER_REVIEW_STORAGE_KEY) || "{}"), registry); }
  catch { return {}; }
}

export function saveReviewState(storage, registry, current, signalId, reviewState, updatedAt = new Date().toISOString()) {
  if (!reviewStateSet.has(reviewState)) throw new TypeError("Unsupported PolicyWatcher review state");
  const entry = registry.entries.find((item) => item.signalId === signalId);
  if (!entry || entry.transportStatus !== "active") throw new TypeError("Only active PolicyWatcher signals can change local review state");
  const next = {
    ...normalizedReviewMap(current, registry),
    [signalId]: { signalDigest: entry.signalDigest, reviewState, updatedAt: new Date(updatedAt).toISOString() },
  };
  if (storage) storage.setItem(POLICYWATCHER_REVIEW_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function effectiveReviewState(entry, reviewMap) {
  return reviewMap[entry.signalId]?.signalDigest === entry.signalDigest
    ? reviewMap[entry.signalId].reviewState
    : entry.reviewState;
}

export function buildReviewLedger(registry, reviewMap, exportedAt = new Date().toISOString()) {
  return {
    format: "palo-policywatcher-review-ledger",
    schemaVersion: "1.0.0",
    exportedAt: new Date(exportedAt).toISOString(),
    sourceRegistryDigest: registry.collectionDigest,
    reviews: registry.entries.map((entry) => ({
      signalId: entry.signalId,
      signalDigest: entry.signalDigest,
      transportStatus: entry.transportStatus,
      reviewState: effectiveReviewState(entry, reviewMap),
      updatedAt: reviewMap[entry.signalId]?.updatedAt || entry.firstAcceptedAt,
    })),
    localOnly: true,
    authorityBoundary: "This browser-local ledger records review workflow state against immutable signal digests. It is not identity-backed approval, legal advice, a compliance conclusion, independent assurance or proof that an organizational governance decision occurred.",
  };
}
