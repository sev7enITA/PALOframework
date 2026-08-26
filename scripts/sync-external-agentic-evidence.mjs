import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { writeNormalizedCache } from "../packages/palo-external-evidence/cache.js";
import { importLocalCollection } from "../packages/palo-external-evidence/providers/palo-local-import.js";
import { synchronizeRogueAiTracker } from "../packages/palo-external-evidence/providers/rogue-ai-tracker.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argumentsList = process.argv.slice(2);
const hasFlag = (flag) => argumentsList.includes(flag);
const valueFor = (flag) => {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : undefined;
};

const allowedFlags = new Set(["--provider", "--input", "--cache", "--offline", "--no-stale-fallback"]);
for (let index = 0; index < argumentsList.length; index += 1) {
  const argument = argumentsList[index];
  if (!argument.startsWith("--")) continue;
  if (!allowedFlags.has(argument)) throw new Error(`unknown option ${argument}`);
  if (["--provider", "--input", "--cache"].includes(argument)) index += 1;
}
for (const flag of ["--provider", "--input", "--cache"]) {
  const index = argumentsList.indexOf(flag);
  if (index >= 0 && (!argumentsList[index + 1] || argumentsList[index + 1].startsWith("--"))) throw new Error(`${flag} requires a value`);
}

const provider = valueFor("--provider") ?? "rogue-ai-tracker";
if (!["palo-local-import", "rogue-ai-tracker"].includes(provider)) throw new Error(`unsupported provider ${provider}; install or implement an explicit adapter before use`);

function resolveCache(requestedCache) {
  const cacheFile = path.resolve(projectRoot, requestedCache);
  const relative = path.relative(projectRoot, cacheFile);
  if (cacheFile === projectRoot || !relative || relative.startsWith("..")) throw new Error("cache path must resolve to a file inside the PALO workspace");
  return cacheFile;
}

if (provider === "palo-local-import") {
  const requestedInput = valueFor("--input");
  if (!requestedInput || requestedInput.startsWith("--")) throw new Error("--input <file> is required for palo-local-import");
  if (hasFlag("--offline") || hasFlag("--no-stale-fallback")) throw new Error("network fallback flags do not apply to palo-local-import");
  const inputFile = path.resolve(projectRoot, requestedInput);
  const collection = await importLocalCollection({ inputFile });
  const cacheFile = resolveCache(valueFor("--cache") ?? `.cache/external-evidence/imports/${collection.providerId}.normalized.json`);
  await writeNormalizedCache(cacheFile, collection);
  console.log(JSON.stringify({
    operation: "local-import",
    ingestionProvider: provider,
    evidenceProvider: collection.providerId,
    source: "local-file",
    status: "validated-and-cached",
    networkUsed: false,
    inputFile,
    retrievedAt: collection.retrievedAt,
    signals: collection.signals.length,
    collectionDigest: collection.collectionDigest,
    cacheFile: path.relative(projectRoot, cacheFile),
    boundary: collection.boundary,
  }, null, 2));
} else {
  if (valueFor("--input")) throw new Error("--input is only supported by palo-local-import");
  const cacheFile = resolveCache(valueFor("--cache") ?? ".cache/external-evidence/rogue-ai-tracker.normalized.json");
  const crosswalk = JSON.parse(await readFile(path.join(projectRoot, "data/external-evidence/palo-agentic-capability-crosswalk.json"), "utf8"));
  const result = await synchronizeRogueAiTracker({
    crosswalk,
    cacheFile,
    offline: hasFlag("--offline"),
    staleIfError: !hasFlag("--no-stale-fallback"),
  });

  console.log(JSON.stringify({
    operation: "provider-sync",
    provider,
    source: result.source,
    stale: result.stale,
    ageMs: result.ageMs,
    retrievedAt: result.collection.retrievedAt,
    signals: result.collection.signals.length,
    collectionDigest: result.collection.collectionDigest,
    cacheFile: path.relative(projectRoot, cacheFile),
    boundary: result.collection.boundary,
    ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {}),
  }, null, 2));
}
