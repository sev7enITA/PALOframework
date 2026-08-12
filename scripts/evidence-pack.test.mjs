import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import { buildContribution, createLocalReceipt, createValidators, GOLD_CASE_FILES, loadAndValidateCase, PROJECT_ROOT } from "./evidence-pack-core.mjs";

const execFileAsync = promisify(execFile);

test("three gold cases conform to the published Case File schema", async () => {
  const validators = await createValidators();
  for (const file of GOLD_CASE_FILES) {
    const result = await loadAndValidateCase(file, { validators });
    assert.equal(result.valid, true, `${file}: ${validators.ajv.errorsText(result.errors)}`);
    assert.equal(result.value.context.goldCase, true);
    assert.ok(result.value.context.completionMinutes < 10);
  }
});

test("a local receipt is digest-bound and schema-valid", async () => {
  const validators = await createValidators();
  const { value } = await loadAndValidateCase(GOLD_CASE_FILES[0], { validators });
  const first = createLocalReceipt(value, { generatedAt: "2026-08-12T10:00:00Z" });
  const second = createLocalReceipt(value, { generatedAt: "2026-08-12T10:05:00Z" });
  assert.equal(first.artifactDigest, second.artifactDigest);
  assert.equal(first.receiptId, second.receiptId);
  assert.equal(validators.validateReceipt(first), true, validators.ajv.errorsText(validators.validateReceipt.errors));
  assert.match(first.privacyBoundary, /Sharing is voluntary/);
});

test("case contribution command generates a valid case and PR body", async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), "palo-case-contribution-"));
  try {
    await execFileAsync(process.execPath, [
      path.join(PROJECT_ROOT, "scripts/case-contribute.mjs"),
      "--slug", "retail-returns-assistant",
      "--title", "Retail returns assistant",
      "--sector", "retail",
      "--scenario", "An assistant drafts a return recommendation while a named employee approves refunds.",
      "--community", "builders",
      "--author", "@example",
      "--output-root", temporary
    ]);
    const generated = JSON.parse(await readFile(path.join(temporary, "retail-returns-assistant.case.json"), "utf8"));
    const validators = await createValidators();
    assert.equal(validators.validateCase(generated), true, validators.ajv.errorsText(validators.validateCase.errors));
    const prBody = await readFile(path.join(temporary, "retail-returns-assistant.pr.md"), "utf8");
    assert.match(prBody, /Evidence and authority boundary/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("contribution template rejects incomplete metadata", () => {
  assert.throws(() => buildContribution({ slug: "short", title: "", sector: "x", scenario: "x", community: "x", author: "x" }));
});
