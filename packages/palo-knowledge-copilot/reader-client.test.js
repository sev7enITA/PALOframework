import test from "node:test";
import assert from "node:assert/strict";
import { createKnowledgeReaderApp, listenKnowledgeReaderApp } from "../palo-mcp-server/reader-http.js";
import { PaloReaderClient, deriveReaderHealthUrl } from "./reader-client.js";
import { StaticReaderTokenProvider } from "./token-provider.js";

test("Reader health URL follows canonical and compatibility MCP paths", () => {
  assert.equal(deriveReaderHealthUrl("https://reader.example/mcp-guide"), "https://reader.example/mcp-guide-health");
  assert.equal(deriveReaderHealthUrl("https://reader.example/mcp-guide/mcp"), "https://reader.example/mcp-guide-health");
  assert.equal(deriveReaderHealthUrl("http://127.0.0.1:8789/mcp"), "http://127.0.0.1:8789/health");
});

test("Copilot client negotiates the exact Reader catalog and retrieves canonical evidence", async (t) => {
  const token = "reader-client-test-token-at-least-32-bytes";
  const app = createKnowledgeReaderApp({ token, host: "127.0.0.1" });
  const { listener, port } = await new Promise((resolve) => {
    const listener = listenKnowledgeReaderApp(app, { host: "127.0.0.1", port: 0 }, (info) => resolve({ listener, port: info.port }));
  });
  t.after(async () => { await app.closeMcp(); await new Promise((resolve) => listener.close(resolve)); });
  const reader = new PaloReaderClient({ url: `http://127.0.0.1:${port}/mcp`, timeoutMs: 10000 }, new StaticReaderTokenProvider(token));
  const evidence = await reader.collectEvidence("human oversight control", 2);
  assert.equal(evidence.toolCount, 6);
  assert.equal(evidence.records.length, 2);
  assert.ok(evidence.records.every((record) => record.sourcePath.startsWith("data/")));
  assert.deepEqual(evidence.trace.map((item) => item.stage), ["identity", "connect", "search", "retrieve"]);
});
