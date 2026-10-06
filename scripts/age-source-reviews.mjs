import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { verifyKnowledgeReaderRelease } from "../packages/palo-mcp-server/reader-integrity.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const schema = JSON.parse(await readFile(path.join(projectRoot, "schemas/palo-source-registry.schema.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export function ageSourceReviews(registry, now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid source-review evaluation time");
  if (!validate(registry)) throw new Error(`Invalid source registry: ${ajv.errorsText(validate.errors)}`);
  const aged = structuredClone(registry);
  const changed = [];
  for (const source of aged.sources) {
    if (source.freshness.status === "current" && Date.parse(source.freshness.nextReviewAt) <= now.getTime()) {
      source.freshness.status = "review-due";
      changed.push(source.sourceId);
    }
  }
  // This records a metadata transition, never a new verification of a source.
  if (changed.length) aged.updatedAt = now.toISOString().slice(0, 10);
  return { registry: aged, changed };
}

export async function prepareSourceReviews({ root = projectRoot, now = new Date() } = {}) {
  const registryFile = path.join(root, "data/source-registry.json");
  const original = await readFile(registryFile, "utf8");
  const result = ageSourceReviews(JSON.parse(original), now);
  const generator = path.join(root, "scripts/generate-semantic-release.mjs");
  const readerManifestFile = path.join(root, "data/knowledge-reader-release.json");

  // Never conceal unrelated drift: the entire pinned release must match first.
  await execFileAsync(process.execPath, [generator, "--check"], { cwd: root });
  verifyKnowledgeReaderRelease({ repositoryRoot: root });
  if (result.changed.length) {
    const content = `${JSON.stringify(result.registry, null, 2)}\n`;
    const readerRelease = JSON.parse(await readFile(readerManifestFile, "utf8"));
    readerRelease.files.find((entry) => entry.path === "data/source-registry.json").sha256 = createHash("sha256").update(content).digest("hex");
    readerRelease.bundleSha256 = createHash("sha256").update(JSON.stringify(readerRelease.files.map(({ path, sha256 }) => ({ path, sha256 })))).digest("hex");
    await writeFile(registryFile, content);
    await writeFile(readerManifestFile, `${JSON.stringify(readerRelease, null, 2)}\n`);
    await execFileAsync(process.execPath, [generator], { cwd: root });
    await execFileAsync(process.execPath, [generator, "--check"], { cwd: root });
    verifyKnowledgeReaderRelease({ repositoryRoot: root });
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { registry, changed } = await prepareSourceReviews();
  const due = registry.sources.filter((source) => source.freshness.status === "review-due");
  console.log(`Source reviews: ${changed.length} transitioned to review-due; ${due.length} awaiting review. Verification dates are unchanged.`);
  for (const source of due) {
    const message = `${source.sourceId}: review due since ${source.freshness.nextReviewAt}; last checked ${source.checkedAt}.`;
    console.log(process.env.GITHUB_ACTIONS === "true" ? `::warning file=data/source-registry.json::${message}` : message);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Source reviews\n\n${due.length} sources await review. No source was reverified or marked current by this operation.\n\n${due.map((source) => `- ${source.sourceId}: due ${source.freshness.nextReviewAt}`).join("\n")}\n`);
  }
}
