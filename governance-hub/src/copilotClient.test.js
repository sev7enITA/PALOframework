import test from "node:test";
import assert from "node:assert/strict";
import { CopilotClientError, createCopilotClient, parseAskResponse, parseSessionResponse, resolveCopilotBaseUrl, safeRelativeReturnPath } from "./copilotClient.js";

const validAnswer = {
  requestId: "req_demo_1",
  answer: "PALO separates guidance from protected execution [1].",
  language: "en",
  sufficiency: "adequate",
  citations: [{ recordId: "palo.boundary.execution", sourcePath: "data/knowledge/execution.json", title: "Execution boundary", excerpt: "Guidance does not grant runtime authority.", authorityBoundary: "Canonical framework guidance; not legal advice." }],
  evidence: { retrievalMethod: "lexical-plus-record-filter", matchCount: 4, retrievedRecordCount: 1, toolTrace: [
    { stage: "search", status: "passed", summary: "Found four candidate records.", durationMs: 4 },
    { stage: "retrieve", status: "passed", summary: "Retrieved one canonical record.", durationMs: 3 },
    { stage: "synthesize", status: "passed", summary: "Produced a bounded answer.", durationMs: 9 },
    { stage: "validate", status: "passed", summary: "Every claim retained a citation.", durationMs: 2 },
  ] },
  boundaries: ["Not legal advice", "No action was executed"],
  durationMs: 18,
};

test("BFF URL accepts HTTPS origins and loopback HTTP only", () => {
  assert.equal(resolveCopilotBaseUrl("https://copilot.paloframework.org"), "https://copilot.paloframework.org/api/copilot");
  assert.equal(resolveCopilotBaseUrl("http://127.0.0.1:8787"), "http://127.0.0.1:8787/api/copilot");
  assert.throws(() => resolveCopilotBaseUrl("http://copilot.example.com"), /HTTPS/);
  assert.throws(() => resolveCopilotBaseUrl("https://example.com/path"), /only an origin/);
});

test("safe return paths keep only non-sensitive routing state", () => {
  assert.equal(safeRelativeReturnPath("/hub?role=technical&view=ask&token=secret#fragment"), "/hub?role=technical&view=ask");
  assert.equal(safeRelativeReturnPath("//evil.example/steal"), "/?role=technical&view=ask");
  assert.equal(safeRelativeReturnPath("https://evil.example"), "/?role=technical&view=ask");
});

test("session parsing exposes status facts without tenant or token fields", () => {
  const parsed = parseSessionResponse({ authenticated: true, displayName: "Sam Kim", reader: { integrity: "checked", serviceVersion: "1.0.0", toolCount: 6, catalogState: "checked" }, release: { label: "reader-v1.0.0", qualification: "production-candidate" }, tenantId: "must-not-pass" });
  assert.equal(parsed.reader.toolCount, 6);
  assert.equal(parsed.release.qualification, "production-candidate");
  assert.equal("tenantId" in parsed, false);
});

test("ask response rejects an adequate answer without canonical citations", () => {
  assert.throws(() => parseAskResponse({ ...validAnswer, citations: [] }), (error) => error instanceof CopilotClientError && error.code === "MALFORMED");
  assert.equal(parseAskResponse(validAnswer).citations[0].sourcePath, "data/knowledge/execution.json");
});

test("client maps status codes without displaying an upstream body", async () => {
  const fetchImpl = async (url) => url.endsWith("/session")
    ? Response.json({ authenticated: true, displayName: "Test", csrfToken: "csrf-test-token", reader: {}, release: {} })
    : new Response("internal stack and token", { status: 429, headers: { "content-type": "text/plain" } });
  const client = createCopilotClient({ configuredUrl: "https://copilot.example.com", fetchImpl, timeoutMs: 100 });
  await client.session();
  await assert.rejects(() => client.ask({ question: "Which controls?", language: "en" }), (error) => error.code === "RATE_LIMITED" && !error.message.includes("internal stack"));
});

test("client times out with a bounded error and never retries a question", async () => {
  let calls = 0;
  const fetchImpl = async (url, { signal }) => {
    if (url.endsWith("/session")) return Response.json({ authenticated: true, displayName: "Test", csrfToken: "csrf-test-token", reader: {}, release: {} });
    calls += 1;
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  };
  const client = createCopilotClient({ configuredUrl: "https://copilot.example.com", fetchImpl, timeoutMs: 5 });
  await client.session();
  await assert.rejects(() => client.ask({ question: "How does PALO work?", language: "en" }), (error) => error.code === "TIMEOUT");
  assert.equal(calls, 1);
  assert.equal(client.diagnostics().askCalls, 1);
});

test("client keeps CSRF in memory and sends it exactly once with a question", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith("/session")) return Response.json({ authenticated: true, displayName: "Test", csrfToken: "csrf-memory-only", reader: {}, release: {} });
    return Response.json(validAnswer);
  };
  const client = createCopilotClient({ configuredUrl: "https://copilot.example.com", fetchImpl });
  const session = await client.session();
  assert.equal("csrfToken" in session, false);
  await client.ask({ question: "How does PALO work?", language: "en" });
  assert.equal(calls[1].init.headers["X-PALO-CSRF"], "csrf-memory-only");
  assert.equal(calls.length, 2);
});

test("an Ask 401 clears the in-memory CSRF and blocks a stale follow-up request", async () => {
  let askRequests = 0;
  const fetchImpl = async (url) => {
    if (url.endsWith("/session")) return Response.json({ authenticated: true, displayName: "Test", csrfToken: "csrf-expiring", reader: {}, release: {} });
    askRequests += 1;
    return new Response("expired session", { status: 401 });
  };
  const client = createCopilotClient({ configuredUrl: "https://copilot.example.com", fetchImpl });
  await client.session();
  await assert.rejects(() => client.ask({ question: "First request", language: "en" }), (error) => error.code === "AUTH_REQUIRED");
  await assert.rejects(() => client.ask({ question: "Stale follow-up", language: "en" }), (error) => error.code === "AUTH_REQUIRED");
  assert.equal(askRequests, 1);
});

test("malformed content types are rejected", async () => {
  const fetchImpl = async () => new Response("<html>not json</html>", { status: 200, headers: { "content-type": "text/html" } });
  const client = createCopilotClient({ configuredUrl: "https://copilot.example.com", fetchImpl });
  await assert.rejects(() => client.session(), (error) => error.code === "MALFORMED");
});
