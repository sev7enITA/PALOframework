#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { assertRegistry, createValidators } from "../packages/palo-policywatcher-operations/index.js";

const registryFlag = process.argv.indexOf("--registry");
const registryFile = path.resolve(registryFlag === -1 ? "data/integrations/policywatcher-signal-registry.json" : process.argv[registryFlag + 1]);
const failOnAlert = process.argv.includes("--fail-on-alert");
const registry = JSON.parse(await readFile(registryFile, "utf8"));
assertRegistry(registry, await createValidators());
const actionable = registry.alerts.filter((item) => item.severity === "critical" || item.severity === "warning");
console.log(JSON.stringify({
  operation: "policywatcher-signal-operations-check",
  state: registry.transport.state,
  stale: registry.transport.stale,
  active: registry.statistics.active,
  revoked: registry.statistics.revoked,
  actionableAlerts: actionable.map(({ code, severity, observedAt }) => ({ code, severity, observedAt })),
}, null, 2));
if (failOnAlert && (registry.transport.state !== "healthy" || actionable.length)) process.exitCode = 1;
