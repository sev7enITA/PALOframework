import test from "node:test";
import assert from "node:assert/strict";
import { OpenAIResponsesGrounder, validateCitationMarkers } from "./model.js";

const records = [
  { recordId: "source:one", sourcePath: "data/one.json", title: "One", summary: "First canonical fact", content: "First canonical fact", authorityBoundary: "Human validation required" },
  { recordId: "source:two", sourcePath: "data/two.json", title: "Two", summary: "Second canonical fact", content: "Second canonical fact", authorityBoundary: "Human validation required" }
];

test("citation validation rejects missing and out-of-range model markers", () => {
  assert.deepEqual(validateCitationMarkers("Grounded [2] and repeated [2].", 2), [2]);
  assert.throws(() => validateCitationMarkers("No citation", 2), /valid canonical citations/);
  assert.throws(() => validateCitationMarkers("Unknown [3]", 2), /valid canonical citations/);
});

test("OpenAI Responses adapter disables storage and validates the returned citations", async () => {
  let observed;
  const fetchImpl = async (url, init) => {
    observed = { url, init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ output_text: "Use the first control [1] and the second boundary [2]." }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const grounder = new OpenAIResponsesGrounder({ baseUrl: "https://api.openai.test/v1", apiKey: "server-secret", model: "explicit-model", maximumOutputTokens: 800 }, { fetchImpl });
  const result = await grounder.synthesize({ question: "Question", records, language: "en", audience: "owner", principalHash: "opaque-principal", timeoutMs: 5000 });
  assert.equal(observed.url, "https://api.openai.test/v1/responses");
  assert.equal(observed.body.store, false);
  assert.equal(observed.body.model, "explicit-model");
  assert.equal(observed.body.previous_response_id, undefined);
  assert.ok(!observed.init.body.includes("server-secret"));
  assert.deepEqual(result.citedIndexes, [1, 2]);
});
