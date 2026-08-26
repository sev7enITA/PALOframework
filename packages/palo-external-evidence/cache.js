import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateExternalEvidenceCollection } from "./validation.js";

export async function readNormalizedCache(cacheFile, { maximumAgeMs = Number.POSITIVE_INFINITY, now = () => new Date(), expectedProviderId } = {}) {
  const content = await readFile(cacheFile, "utf8");
  let collection;
  try { collection = JSON.parse(content); }
  catch { throw new TypeError("normalized external-evidence cache is not valid JSON"); }
  validateExternalEvidenceCollection(collection, { expectedProviderId });
  const ageMs = Math.max(0, now().getTime() - Date.parse(collection.retrievedAt));
  if (!Number.isFinite(ageMs)) throw new TypeError("cache retrievedAt is invalid");
  if (ageMs > maximumAgeMs) throw new Error(`normalized external-evidence cache exceeds maximum stale age (${ageMs} ms)`);
  return collection;
}

export async function writeNormalizedCache(cacheFile, collection, { expectedProviderId } = {}) {
  validateExternalEvidenceCollection(collection, { expectedProviderId });
  await mkdir(path.dirname(cacheFile), { recursive: true });
  const temporaryFile = `${cacheFile}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(collection, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporaryFile, cacheFile);
  } finally {
    await rm(temporaryFile, { force: true });
  }
}
