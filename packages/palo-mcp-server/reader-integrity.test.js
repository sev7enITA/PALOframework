import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PALO_KNOWLEDGE_CANONICAL_FILES } from "./knowledge-catalog.js";
import { verifyKnowledgeReaderRelease } from "./reader-integrity.js";

test("Knowledge Reader release verifies the exact immutable canonical bundle", () => {
  const release = verifyKnowledgeReaderRelease();
  assert.equal(release.verified, true);
  assert.equal(release.serviceVersion, "1.0.0");
  assert.equal(release.frameworkRelease, "3.1.0");
  assert.equal(release.files.length, PALO_KNOWLEDGE_CANONICAL_FILES.length);
  assert.match(release.bundleSha256, /^[a-f0-9]{64}$/);
});

test("Knowledge Reader fails closed when one released byte changes", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "palo-reader-integrity-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await mkdir(path.join(repositoryRoot, "data"), { recursive: true });
  await Promise.all([
    ...PALO_KNOWLEDGE_CANONICAL_FILES.map(async (entry) => {
      const destination = path.join(repositoryRoot, entry.path);
      await cp(entry.path, destination, { recursive: false });
    }),
    cp("data/knowledge-reader-release.json", path.join(repositoryRoot, "data/knowledge-reader-release.json"))
  ]);
  const target = path.join(repositoryRoot, PALO_KNOWLEDGE_CANONICAL_FILES[0].path);
  await writeFile(target, `${await readFile(target, "utf8")} `, "utf8");
  assert.throws(
    () => verifyKnowledgeReaderRelease({ repositoryRoot }),
    /integrity check failed/i
  );
});

test("Knowledge Reader rejects a release manifest for another runtime version", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "palo-reader-version-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await mkdir(path.join(repositoryRoot, "data"), { recursive: true });
  await Promise.all(PALO_KNOWLEDGE_CANONICAL_FILES.map((entry) => cp(entry.path, path.join(repositoryRoot, entry.path))));
  const manifest = JSON.parse(await readFile("data/knowledge-reader-release.json", "utf8"));
  manifest.serviceVersion = "2.0.0";
  await writeFile(path.join(repositoryRoot, "data/knowledge-reader-release.json"), JSON.stringify(manifest), "utf8");
  assert.throws(() => verifyKnowledgeReaderRelease({ repositoryRoot }), /version does not match/i);
});
