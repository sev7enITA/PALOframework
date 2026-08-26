#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  assertRegistry,
  createEmptyRegistry,
  createValidators,
  POLICYWATCHER_ORIGIN,
  synchronizePolicyWatcherSignals,
} from "../packages/palo-policywatcher-operations/index.js";

const allowedFlags = new Set(["--origin", "--state", "--output"]);
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  if (!allowedFlags.has(flag) || !process.argv[index + 1]) throw new Error(`unsupported or incomplete argument ${flag || "<missing>"}`);
}
const valueFor = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
};
const origin = valueFor("--origin") || POLICYWATCHER_ORIGIN;
if (origin !== POLICYWATCHER_ORIGIN) throw new Error(`PolicyWatcher transport origin must be exactly ${POLICYWATCHER_ORIGIN}`);
const stateFile = path.resolve(valueFor("--state") || ".cache/integrations/policywatcher-signal-registry.json");
const outputFile = path.resolve(valueFor("--output") || "data/integrations/policywatcher-signal-registry.json");
const validators = await createValidators();

async function readPrevious() {
  try {
    const registry = JSON.parse(await readFile(stateFile, "utf8"));
    return assertRegistry(registry, validators);
  } catch (error) {
    if (error?.code === "ENOENT") return createEmptyRegistry();
    throw error;
  }
}

async function atomicWrite(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, file);
}

const registry = await synchronizePolicyWatcherSignals({ previous: await readPrevious(), validators });
await atomicWrite(stateFile, registry);
await atomicWrite(outputFile, registry);
console.log(JSON.stringify({
  operation: "policywatcher-signal-sync",
  status: registry.transport.state,
  networkOptional: registry.source.networkOptional,
  completeTraversal: registry.transport.completeTraversal,
  pageCount: registry.transport.pageCount,
  active: registry.statistics.active,
  revoked: registry.statistics.revoked,
  alerts: registry.alerts.map(({ code, severity }) => ({ code, severity })),
  collectionDigest: registry.collectionDigest,
}, null, 2));
