import test from "node:test";
import assert from "node:assert/strict";
import { createBoundedFetch } from "./http.js";

test("bounded upstream fetch rejects declared and streamed oversize responses", async () => {
  const declared = createBoundedFetch(async () => new Response("small", { headers: { "content-length": "5000" } }), 100, "Test upstream");
  await assert.rejects(() => declared("https://example.test"), (error) => error.status === 502 && error.code === "upstream_response_too_large");

  const streamed = createBoundedFetch(async () => new Response("x".repeat(101)), 100, "Test upstream");
  await assert.rejects(() => streamed("https://example.test"), (error) => error.status === 502 && error.code === "upstream_response_too_large");
});

test("bounded upstream fetch preserves an admitted response contract", async () => {
  const bounded = createBoundedFetch(async () => Response.json({ ok: true }, { status: 201, headers: { "x-test": "preserved" } }), 1000, "Test upstream");
  const response = await bounded("https://example.test");
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-test"), "preserved");
  assert.deepEqual(await response.json(), { ok: true });
});
