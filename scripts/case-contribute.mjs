#!/usr/bin/env node
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { buildContribution, createValidators, GOLD_CASE_FILES, loadAndValidateCase, PROJECT_ROOT } from "./evidence-pack-core.mjs";

const { values } = parseArgs({
  options: {
    author: { type: "string" },
    community: { type: "string" },
    help: { type: "boolean", short: "h" },
    "output-root": { type: "string" },
    scenario: { type: "string" },
    sector: { type: "string" },
    slug: { type: "string" },
    title: { type: "string" },
    "validate-all": { type: "boolean" }
  }
});

const usage = `Usage:\n  npm run case:contribute -- --slug <slug> --title <title> --sector <sector> --scenario <scenario> --community <community> --author <handle>\n  npm run case:contribute -- --validate-all\n\nThe command writes a Case File and PR body under contributions/cases/. It never pushes or opens a PR.`;
if (values.help) {
  console.log(usage);
  process.exit(0);
}

const validators = await createValidators();
async function validateFiles(files) {
  let failed = false;
  for (const file of files) {
    const result = await loadAndValidateCase(file, { validators });
    if (!result.valid) {
      failed = true;
      console.error(`${file}: ${validators.ajv.errorsText(result.errors)}`);
    } else {
      console.log(`Valid case: ${path.relative(PROJECT_ROOT, result.absolute)}`);
    }
  }
  if (failed) process.exit(1);
}

if (values["validate-all"]) {
  const communityRoot = path.join(PROJECT_ROOT, "contributions/cases");
  const { readdir } = await import("node:fs/promises");
  const communityFiles = (await readdir(communityRoot)).filter((name) => name.endsWith(".case.json")).map((name) => path.join(communityRoot, name));
  await validateFiles([...GOLD_CASE_FILES, ...communityFiles]);
  console.log(`Validated ${GOLD_CASE_FILES.length + communityFiles.length} Evidence Pack case(s).`);
  process.exit(0);
}

let contribution;
try {
  contribution = buildContribution({
    author: values.author,
    community: values.community,
    scenario: values.scenario,
    sector: values.sector,
    slug: values.slug,
    title: values.title
  });
} catch (error) {
  console.error(error.message);
  console.error(usage);
  process.exit(1);
}

if (!validators.validateCase(contribution.caseFile)) {
  console.error(`Generated case is invalid: ${validators.ajv.errorsText(validators.validateCase.errors)}`);
  process.exit(1);
}

const outputRoot = values["output-root"]
  ? path.resolve(values["output-root"])
  : path.join(PROJECT_ROOT, "contributions/cases");
const casePath = path.join(outputRoot, `${contribution.slug}.case.json`);
const prPath = path.join(outputRoot, `${contribution.slug}.pr.md`);
for (const target of [casePath, prPath]) {
  try {
    await access(target);
    throw new Error(`Refusing to overwrite existing file: ${target}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
await mkdir(outputRoot, { recursive: true });
await writeFile(casePath, `${JSON.stringify(contribution.caseFile, null, 2)}\n`, { flag: "wx" });
await writeFile(prPath, contribution.prBody, { flag: "wx" });

console.log(`Generated schema-valid case: ${path.relative(PROJECT_ROOT, casePath)}`);
console.log(`Prepared pull request body: ${path.relative(PROJECT_ROOT, prPath)}`);
console.log("Complete the TODO fields, then run npm run case:contribute -- --validate-all.");
console.log(`Next: git add ${path.relative(PROJECT_ROOT, casePath)} ${path.relative(PROJECT_ROOT, prPath)}`);
