import test from "node:test";
import assert from "node:assert/strict";
import { PaloKnowledgeCopilotService } from "./service.js";

const config = { questionMaximumCharacters: 4000, maximumRetrievedRecords: 4, modelTimeoutMs: 1000, mode: "development" };
const principal = { subject: "user", tenantId: "tenant", displayName: "User" };

test("zero matches fail closed without calling the model", async () => {
  let modelCalls = 0;
  const reader = { collectEvidence: async () => ({ search: { retrievalMethod: "lexical", matches: [] }, records: [], toolCount: 6, trace: [] }) };
  const grounder = { provider: "test", synthesize: async () => { modelCalls += 1; } };
  const service = new PaloKnowledgeCopilotService({ config, reader, grounder, now: () => new Date("2026-09-11T00:00:00Z") });
  const answer = await service.ask(principal, { question: "unknown evidence", language: "en" }, "request-1");
  assert.equal(answer.sufficiency, "insufficient");
  assert.deepEqual(answer.citations, []);
  assert.equal(modelCalls, 0);
  assert.equal(answer.question, undefined);
});

test("grounded synthesis returns only validated canonical citations and no raw question", async () => {
  const record = (id) => ({ recordId: `source:${id}`, sourcePath: `data/${id}.json`, title: `Title ${id}`, summary: `Summary ${id}`, content: `Content ${id}`, authorityBoundary: "Human validation required" });
  const records = [record("one"), record("two")];
  const reader = { collectEvidence: async () => ({ search: { retrievalMethod: "lexical", matches: records.map((item) => ({ ...item, snippet: item.summary })) }, records, toolCount: 6, trace: [] }) };
  const grounder = { provider: "test", synthesize: async () => ({ answer: "Grounded [1] and [2].", citedIndexes: [1, 2], provider: "test" }) };
  const service = new PaloKnowledgeCopilotService({ config, reader, grounder });
  const answer = await service.ask(principal, { question: "sensitive internal scenario", language: "en" }, "request-2");
  assert.equal(answer.sufficiency, "adequate");
  assert.equal(answer.citations.length, 2);
  assert.equal(answer.question, undefined);
  assert.match(answer.questionDigest, /^[a-f0-9]{64}$/);
});

test("returned citation markers are compacted when the model cites a non-contiguous subset", async () => {
  const records = ["one", "two", "three"].map((id) => ({ recordId: `source:${id}`, sourcePath: `data/${id}.json`, title: id, summary: id, content: id }));
  const reader = { collectEvidence: async () => ({ search: { retrievalMethod: "lexical", matches: records }, records, toolCount: 6, trace: [] }) };
  const grounder = { provider: "test", synthesize: async () => ({ answer: "Third source [3], then first [1].", citedIndexes: [3, 1], provider: "test" }) };
  const service = new PaloKnowledgeCopilotService({ config, reader, grounder });
  const result = await service.ask(principal, { question: "Explain the selected records", language: "en" }, "request-3");
  assert.equal(result.answer, "Third source [1], then first [2].");
  assert.deepEqual(result.citations.map((item) => item.recordId), ["source:three", "source:one"]);
});
