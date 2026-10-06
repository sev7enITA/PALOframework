import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { ageSourceReviews, prepareSourceReviews } from "./age-source-reviews.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(await readFile(path.join(root, "data/source-registry.json"), "utf8"));
const deadline = "2026-10-10T08:00:00Z";
function fixture(status = "current") {
  const value = structuredClone(registry);
  value.sources = [structuredClone(registry.sources[0])];
  value.sources[0].freshness = { status, reviewIntervalDays: 90, nextReviewAt: deadline };
  return value;
}

test("a source becomes review-due at its deadline without inventing verification evidence", () => {
  const input = fixture();
  const before = structuredClone(input);
  const { registry: aged, changed } = ageSourceReviews(input, new Date(deadline));
  assert.deepEqual(changed, [input.sources[0].sourceId]);
  assert.equal(aged.sources[0].freshness.status, "review-due");
  assert.equal(aged.updatedAt, "2026-10-10");
  const expected = structuredClone(before);
  expected.updatedAt = "2026-10-10";
  expected.sources[0].freshness.status = "review-due";
  assert.deepEqual(aged, expected);
  assert.deepEqual(input, before);
});

test("future checkpoints remain current and repeated ageing is idempotent", () => {
  const input = fixture();
  assert.deepEqual(ageSourceReviews(input, new Date("2026-10-10T07:59:59.999Z")).registry, input);
  const first = ageSourceReviews(input, new Date(deadline));
  const second = ageSourceReviews(first.registry, new Date("2027-01-01T00:00:00Z"));
  assert.deepEqual(second.registry, first.registry);
  assert.deepEqual(second.changed, []);
});

test("unknown, stale, superseded and already due sources are never promoted", () => {
  for (const status of ["unknown", "stale", "superseded", "review-due"]) {
    const input = fixture(status);
    assert.deepEqual(ageSourceReviews(input, new Date("2027-01-01T00:00:00Z")), { registry: input, changed: [] });
  }
});

test("invalid freshness records and evaluation dates fail closed", () => {
  for (const value of ["not-a-date", ""]) {
    const input = fixture();
    input.sources[0].freshness.nextReviewAt = value;
    assert.throws(() => ageSourceReviews(input), /Invalid source registry/);
  }
  const input = fixture("unsupported");
  assert.throws(() => ageSourceReviews(input), /Invalid source registry/);
  assert.throws(() => ageSourceReviews(fixture(), new Date("invalid")), /Invalid source-review evaluation time/);
});

async function releaseFixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "palo-source-reviews-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const manifest = JSON.parse(await readFile(path.join(root, "data/semantic-release-manifest.json"), "utf8"));
  for (const file of new Set([...manifest.items.map((item) => item.path), "data/semantic-release-manifest.json", "scripts/generate-semantic-release.mjs"])) {
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await cp(path.join(root, file), path.join(directory, file));
  }
  return directory;
}

test("a future release ages all remaining current sources and retains exact manifest integrity", async (t) => {
  const directory = await releaseFixture(t);
  const before = JSON.parse(await readFile(path.join(directory, "data/source-registry.json"), "utf8"));
  const manifestBefore = JSON.parse(await readFile(path.join(directory, "data/semantic-release-manifest.json"), "utf8"));
  const result = await prepareSourceReviews({ root: directory, now: new Date("2030-01-01T00:00:00Z") });
  assert.deepEqual(result.changed, before.sources.filter((source) => source.freshness.status === "current").map((source) => source.sourceId));
  assert.ok(result.changed.length > 0);
  const manifestAfter = JSON.parse(await readFile(path.join(directory, "data/semantic-release-manifest.json"), "utf8"));
  assert.deepEqual(manifestAfter.items.filter((item) => item.path !== "data/source-registry.json"), manifestBefore.items.filter((item) => item.path !== "data/source-registry.json"));
  const repeated = await prepareSourceReviews({ root: directory, now: new Date("2030-01-02T00:00:00Z") });
  assert.deepEqual(repeated.changed, []);
  assert.deepEqual(repeated.registry, result.registry);
});

test("ageing cannot conceal a modified source registry or another pinned artifact", async (t) => {
  for (const file of ["data/source-registry.json", "data/control-library.json"]) {
    const directory = await releaseFixture(t);
    const target = path.join(directory, file);
    const altered = `${await readFile(target, "utf8")}\n`;
    await writeFile(target, altered);
    const before = await readFile(path.join(directory, "data/source-registry.json"), "utf8");
    const manifestBefore = await readFile(path.join(directory, "data/semantic-release-manifest.json"), "utf8");
    await assert.rejects(prepareSourceReviews({ root: directory, now: new Date("2030-01-01T00:00:00Z") }), /Semantic release manifest is stale/);
    assert.equal(await readFile(path.join(directory, "data/source-registry.json"), "utf8"), before);
    assert.equal(await readFile(path.join(directory, "data/semantic-release-manifest.json"), "utf8"), manifestBefore);
  }
});
