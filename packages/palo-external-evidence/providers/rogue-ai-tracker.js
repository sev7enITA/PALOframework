import {
  digest,
  normalizeRogueAiTrackerPayload,
  ROGUE_AI_TRACKER_PROVIDER_ID,
} from "../core.js";
import { readNormalizedCache, writeNormalizedCache } from "../cache.js";

export { readNormalizedCache, writeNormalizedCache } from "../cache.js";

export const ROGUE_AI_TRACKER_ENDPOINT = "https://rogueaitracker.com/api/incidents";
export const DEFAULT_FETCH_POLICY = Object.freeze({
  timeoutMs: 5000,
  maxResponseBytes: 2 * 1024 * 1024,
  maximumRecords: 500,
});

function assertEndpoint(endpoint) {
  const parsed = new URL(endpoint);
  if (parsed.protocol !== "https:" || parsed.hostname !== "rogueaitracker.com" || parsed.pathname !== "/api/incidents" || parsed.username || parsed.password) {
    throw new TypeError("Rogue AI Tracker endpoint must be the allow-listed HTTPS incident API");
  }
  return parsed.toString();
}

export async function readBoundedJsonResponse(response, maximumBytes) {
  if (!response?.ok) throw new Error(`provider request failed with HTTP ${response?.status ?? "unknown"}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) throw new TypeError(`provider response has unsupported content type ${contentType || "missing"}`);
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) throw new RangeError(`provider response exceeds ${maximumBytes} bytes`);
  if (!response.body) throw new TypeError("provider response body is missing");
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximumBytes) throw new RangeError(`provider response exceeds ${maximumBytes} bytes`);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  let payload;
  try { payload = JSON.parse(bytes.toString("utf8")); }
  catch { throw new TypeError("provider response is not valid JSON"); }
  return { payload, payloadDigest: digest(bytes) };
}

export async function fetchRogueAiTrackerMetadata({
  crosswalk,
  endpoint = ROGUE_AI_TRACKER_ENDPOINT,
  timeoutMs = DEFAULT_FETCH_POLICY.timeoutMs,
  maxResponseBytes = DEFAULT_FETCH_POLICY.maxResponseBytes,
  maximumRecords = DEFAULT_FETCH_POLICY.maximumRecords,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("a fetch implementation is required");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 500 || timeoutMs > 30000) throw new RangeError("timeoutMs must be between 500 and 30000");
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes < 1024 || maxResponseBytes > 5 * 1024 * 1024) throw new RangeError("maxResponseBytes is outside the supported boundary");
  const signal = AbortSignal.timeout(timeoutMs);
  const response = await fetchImpl(assertEndpoint(endpoint), {
    method: "GET",
    redirect: "error",
    signal,
    headers: {
      accept: "application/json",
      "user-agent": "PALO-External-Evidence/1.0 (+https://paloframework.org)",
    },
  });
  const { payload, payloadDigest } = await readBoundedJsonResponse(response, maxResponseBytes);
  return normalizeRogueAiTrackerPayload(payload, {
    crosswalk,
    maximumRecords,
    payloadDigest,
    retrievedAt: now().toISOString(),
  });
}

export async function synchronizeRogueAiTracker({
  crosswalk,
  cacheFile,
  offline = false,
  cacheTtlMs = 24 * 60 * 60 * 1000,
  maxStaleMs = 7 * 24 * 60 * 60 * 1000,
  staleIfError = true,
  ...fetchOptions
} = {}) {
  if (!cacheFile) throw new TypeError("cacheFile is required");
  if (!Number.isFinite(cacheTtlMs) || cacheTtlMs < 0) throw new RangeError("cacheTtlMs must be a non-negative finite number");
  if (!Number.isFinite(maxStaleMs) || maxStaleMs < cacheTtlMs) throw new RangeError("maxStaleMs must be finite and at least cacheTtlMs");
  const now = fetchOptions.now ?? (() => new Date());
  const ageFor = (collection) => Math.max(0, now().getTime() - Date.parse(collection.retrievedAt));
  if (offline) {
    const collection = await readNormalizedCache(cacheFile, { maximumAgeMs: Number.POSITIVE_INFINITY, now, expectedProviderId: ROGUE_AI_TRACKER_PROVIDER_ID });
    const ageMs = ageFor(collection);
    return { collection, source: "cache-offline", stale: ageMs > cacheTtlMs, ageMs };
  }
  try {
    const collection = await fetchRogueAiTrackerMetadata({ crosswalk, ...fetchOptions });
    await writeNormalizedCache(cacheFile, collection, { expectedProviderId: ROGUE_AI_TRACKER_PROVIDER_ID });
    return { collection, source: "network", stale: false, ageMs: 0 };
  } catch (error) {
    if (!staleIfError) throw error;
    try {
      const collection = await readNormalizedCache(cacheFile, { maximumAgeMs: maxStaleMs, now, expectedProviderId: ROGUE_AI_TRACKER_PROVIDER_ID });
      const ageMs = ageFor(collection);
      return { collection, source: "cache-fallback", stale: ageMs > cacheTtlMs, ageMs, fallbackReason: error.message };
    } catch {
      throw error;
    }
  }
}
