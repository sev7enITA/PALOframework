import test from "node:test";
import assert from "node:assert/strict";
import { PaloCanonicalKnowledgeBase } from "./reader-knowledge-base.js";

test("Reader seed regression maps common Italian governance queries to the English canonical corpus", () => {
  const knowledgeBase = new PaloCanonicalKnowledgeBase();
  const pairs = [
    ["supervisione umana", "human oversight"],
    ["controllo umano", "human oversight"],
    ["gestione del rischio", "risk management"],
    ["cancellazione dati", "data deletion"],
    ["responsabilità", "accountability"],
    ["trasparenza", "transparency"],
    ["governance agentica", "agentic governance"],
    ["monitoraggio continuo", "continuous monitoring"],
    ["classificazione del rischio", "risk classification"],
    ["prova verificabile", "verifiable evidence"],
    ["controllo accessi", "access control"]
  ];
  for (const [italian, english] of pairs) {
    const italianIds = knowledgeBase.search({ query: italian, limit: 5 }).matches.map(({ recordId }) => recordId);
    const englishIds = new Set(knowledgeBase.search({ query: english, limit: 5 }).matches.map(({ recordId }) => recordId));
    assert.ok(italianIds.some((recordId) => englishIds.has(recordId)), `${italian} must overlap the English seed query`);
  }
});

test("Reader lexical matching uses complete terms and fails closed for unknown evidence", () => {
  const knowledgeBase = new PaloCanonicalKnowledgeBase();
  const access = knowledgeBase.search({ query: "controllo accessi", limit: 10 });
  assert.ok(!access.matches.some(({ recordId }) => recordId === "indicator-registry:kpi-accessibility-test-pass-rate"));
  assert.deepEqual(knowledgeBase.search({ query: "termineinventatochenonesiste" }).matches, []);
});

test("Reader snippets retain original offsets after punctuation normalization", () => {
  const knowledgeBase = new PaloCanonicalKnowledgeBase();
  const content = `Prefix ${"!".repeat(900)} boundarysignal remains visible in the source excerpt ${"tail ".repeat(180)}`;
  const record = {
    recordId: "test:snippet-offset",
    sourceId: "test",
    sourcePath: "test/snippet-offset.json",
    recordType: "test-record",
    title: "Offset regression fixture",
    summary: "",
    content,
    language: "en",
    tags: [],
    sourceRefs: [],
    authorityClass: "source-backed-context",
    authorityBoundary: "Test fixture",
    updatedAt: null,
    payload: {}
  };
  knowledgeBase.canonical = [record];
  knowledgeBase.canonicalById = new Map([[record.recordId, record]]);
  const result = knowledgeBase.search({ query: "boundarysignal" });
  assert.equal(result.matches.length, 1);
  assert.match(result.matches[0].snippet, /boundarysignal remains visible/);
});
