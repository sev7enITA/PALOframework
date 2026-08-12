#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { createLocalReceipt, createValidators, loadAndValidateCase, PROJECT_ROOT } from "./evidence-pack-core.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    receipt: { type: "string", short: "r" }
  }
});

if (values.help) {
  console.log("Usage: npm run evidence:validate -- [case-file] [--receipt path]");
  console.log("Default case: evidence-pack/cases/agentic-invoice-exception.case.json");
  process.exit(0);
}

const target = positionals[0] || "evidence-pack/cases/agentic-invoice-exception.case.json";
const validators = await createValidators();
const result = await loadAndValidateCase(target, { validators });
if (!result.valid) {
  console.error(`Evidence case is invalid: ${validators.ajv.errorsText(result.errors)}`);
  process.exit(1);
}

const receipt = createLocalReceipt(result.value);
if (!validators.validateReceipt(receipt)) {
  console.error(`Generated receipt is invalid: ${validators.ajv.errorsText(validators.validateReceipt.errors)}`);
  process.exit(1);
}

const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
if (values.receipt) {
  const destination = path.isAbsolute(values.receipt) ? values.receipt : path.join(PROJECT_ROOT, values.receipt);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, serialized, { flag: "wx" });
  console.log(`Valid PALO case: ${result.value.caseId}`);
  console.log(`Local receipt written: ${path.relative(PROJECT_ROOT, destination)}`);
} else {
  console.log(serialized.trimEnd());
}
