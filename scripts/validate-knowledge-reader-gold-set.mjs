import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PaloCanonicalKnowledgeBase } from "../packages/palo-mcp-server/reader-knowledge-base.js";

const file = new URL("../examples/agentic-interface/knowledge-copilot/reader-gold-set.v1.json", import.meta.url);
const gold = JSON.parse(readFileSync(file, "utf8"));
const knowledgeBase = new PaloCanonicalKnowledgeBase();
const topByCase = new Map();

assert.equal(gold.schemaVersion, "1.0.0");
assert.equal(gold.frameworkRelease, "3.1.0");
assert.ok(gold.cases.length >= 30, "gold set must contain at least 30 positive questions");
assert.ok(gold.unknownCases.length >= 4, "gold set must contain at least four unknown questions");
assert.equal(new Set(gold.cases.map(({ id }) => id)).size, gold.cases.length, "case ids must be unique");

let expectedHits = 0;
let provenanceComplete = 0;
for (const testCase of gold.cases) {
  assert.ok(["it", "en"].includes(testCase.language), `${testCase.id}: unsupported language`);
  assert.ok(testCase.expectedRecordIds.length, `${testCase.id}: expectedRecordIds is empty`);
  const matches = knowledgeBase.search({ query: testCase.query, limit: 5 }).matches;
  const ids = matches.map(({ recordId }) => recordId);
  topByCase.set(testCase.id, new Set(ids));
  if (testCase.expectedRecordIds.some((recordId) => ids.includes(recordId))) expectedHits += 1;
  if (matches.length && matches.every(({ recordId, sourceId, sourcePath, authorityBoundary }) => recordId && sourceId && sourcePath?.startsWith("data/") && authorityBoundary)) {
    provenanceComplete += 1;
  }
}

const pairs = new Map();
for (const testCase of gold.cases) {
  const pair = pairs.get(testCase.pairId) || {};
  pair[testCase.language] = testCase;
  pairs.set(testCase.pairId, pair);
}
let overlapHits = 0;
for (const [pairId, pair] of pairs) {
  assert.ok(pair.it && pair.en, `${pairId}: bilingual pair is incomplete`);
  const italian = topByCase.get(pair.it.id);
  const english = topByCase.get(pair.en.id);
  if ([...italian].some((recordId) => english.has(recordId))) overlapHits += 1;
}

let unknownEmpty = 0;
for (const testCase of gold.unknownCases) {
  if (knowledgeBase.search({ query: testCase.query, limit: 5 }).matches.length === 0) unknownEmpty += 1;
}

const metrics = {
  top5ExpectedRecordHitRate: expectedHits / gold.cases.length,
  bilingualTop5OverlapRate: overlapHits / pairs.size,
  unknownQueryEmptyRate: unknownEmpty / gold.unknownCases.length,
  provenanceCompletenessRate: provenanceComplete / gold.cases.length
};

for (const [metric, threshold] of Object.entries(gold.acceptance)) {
  assert.ok(metrics[metric] >= threshold, `${metric} ${metrics[metric].toFixed(3)} is below ${threshold.toFixed(3)}`);
}

process.stdout.write(`${JSON.stringify({ goldSetId: gold.goldSetId, status: gold.status, positiveCases: gold.cases.length, bilingualPairs: pairs.size, unknownCases: gold.unknownCases.length, metrics }, null, 2)}\n`);
