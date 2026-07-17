#!/usr/bin/env node
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { GovernanceRuntime } from "./core.js";

const host = process.env.PALO_GATEWAY_HOST || "127.0.0.1";
const port = Number(process.env.PALO_GATEWAY_PORT || 8787);
const token = process.env.PALO_GATEWAY_TOKEN;
if (!token || token.length < 24) throw new Error("PALO_GATEWAY_TOKEN must contain at least 24 characters");
const runtime = new GovernanceRuntime();

function authorized(request) {
  const actual = Buffer.from(request.headers.authorization || "");
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function send(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(payload), "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(payload);
}

async function body(request) {
  if (!(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) throw Object.assign(new Error("Content-Type must be application/json"), { status: 415 });
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) throw Object.assign(new Error("Request body exceeds 1 MiB"), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); }
}

const gateway = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (request.method === "GET" && url.pathname === "/health") return send(response, 200, { status: "ok", service: "palo-governance-gateway", version: "2.4.1", releaseStatus: "developer-preview", productionUse: false });
    if (!authorized(request)) return send(response, 401, { error: "unauthorized" });
    if (request.method === "POST" && url.pathname === "/v1/agents/register") {
      const input = await body(request);
      return send(response, 200, await runtime.registerAgent(input.caseId, input.profile));
    }
    if (request.method === "POST" && url.pathname === "/v1/policies/register") {
      const input = await body(request);
      return send(response, 200, runtime.registerPolicy(input.policy));
    }
    if (request.method === "GET" && url.pathname === "/v1/registry") return send(response, 200, await runtime.getRegistry());
    if (request.method === "POST" && url.pathname === "/v1/actions/verify") {
      const input = await body(request);
      return send(response, 200, await runtime.verifyAction(input.claim, input.approvalId));
    }
    if (request.method === "GET" && url.pathname.startsWith("/v1/approvals/")) {
      return send(response, 200, await runtime.getApproval(decodeURIComponent(url.pathname.split("/").at(-1))));
    }
    if (request.method === "GET" && url.pathname === "/v1/approvals") return send(response, 200, await runtime.listApprovals(url.searchParams.get("status") || "pending"));
    if (request.method === "POST" && url.pathname === "/v1/approvals/resolve") {
      const input = await body(request);
      return send(response, 200, await runtime.resolveApproval(input.approvalId, input.status, input.resolvedBy, input.rationale));
    }
    if (request.method === "POST" && url.pathname === "/v1/evidence") {
      const input = await body(request);
      return send(response, 200, await runtime.recordEvidence(input));
    }
    if (request.method === "GET" && url.pathname === "/v1/evidence/verify-ledger") return send(response, 200, await runtime.verifyLedger());
    return send(response, 404, { error: "not_found" });
  } catch (error) {
    const status = error.status || 400;
    return send(response, status, { error: status >= 500 ? "internal_error" : "request_rejected", message: error.message });
  }
});

gateway.listen(port, host, () => process.stderr.write(`PALO-AI DEVELOPER PREVIEW gateway listening on http://${host}:${port} — isolated testing only; shared bearer token is not production identity or RBAC.\n`));
