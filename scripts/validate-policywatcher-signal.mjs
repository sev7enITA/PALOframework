#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv[2];
if (!input || process.argv.length !== 3) throw new Error("usage: npm run policywatcher-signal:validate -- <signal.json>");

const inputFile = path.resolve(process.cwd(), input);
const metadata = await stat(inputFile);
if (!metadata.isFile()) throw new TypeError("PolicyWatcher signal input must be a regular file");
if (metadata.size > 1024 * 1024) throw new RangeError("PolicyWatcher signal input exceeds 1 MiB");

const schema = JSON.parse(await readFile(path.join(projectRoot, "schemas/policywatcher-signal.schema.json"), "utf8"));
const signal = JSON.parse(await readFile(inputFile, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(signal)) throw new TypeError(`PolicyWatcher signal failed PALO schema validation: ${ajv.errorsText(validate.errors)}`);

console.log(JSON.stringify({
  operation: "policywatcher-signal-validation",
  status: "valid",
  networkUsed: false,
  format: signal.format,
  schemaVersion: signal.schemaVersion,
  signalId: signal.signalId,
  authorityStatus: signal.authority.status,
  reviewGateIds: signal.suggestedHandoff.reviewGateIds,
}, null, 2));
