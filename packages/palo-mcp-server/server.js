import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { GovernanceRuntime } from "./core.js";

const jsonObject = z.record(z.string(), z.unknown());
const result = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value });
const fail = (error) => ({ isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }] });
const guarded = (handler) => async (input) => { try { return result(await handler(input)); } catch (error) { return fail(error); } };

export function createPaloMcpServer(runtime = new GovernanceRuntime()) {
  const server = new McpServer({ name: "palo-governance-server", version: "2.4.1", websiteUrl: "https://paloframework.org/PALO_AgenticGovernance.html" });
  server.registerTool("palo_register_agent", { description: "Developer preview: register or version a local PALO agent authority profile; publisher identity is not authenticated.", inputSchema: { caseId: z.string().min(1), profile: jsonObject } }, guarded(({ caseId, profile }) => runtime.registerAgent(caseId, profile)));
  server.registerTool("palo_register_policy", { description: "Developer preview: register a local OPA policy manifest; bundle attestation is not provided.", inputSchema: { policy: jsonObject } }, guarded(({ policy }) => runtime.registerPolicy(policy)));
  server.registerTool("palo_get_registry", { description: "List locally registered profile and policy versions without secret material.", inputSchema: {} }, guarded(() => runtime.getRegistry()));
  server.registerTool("palo_verify_action_authority", { description: "Developer preview: normalize and evaluate an Action Claim through local profile data and draft OPA policy; not a production authorization decision.", inputSchema: { claim: jsonObject, approvalId: z.string().optional() } }, guarded(({ claim, approvalId }) => runtime.verifyAction(claim, approvalId)));
  server.registerTool("palo_request_approval", { description: "Create an expiring human approval bound to the exact Action Claim digest.", inputSchema: { claim: jsonObject, requestedBy: z.string().min(1), ttlSeconds: z.number().int().min(30).max(86400).optional() } }, guarded(({ claim, requestedBy, ttlSeconds }) => runtime.requestApproval(claim, undefined, requestedBy, ttlSeconds)));
  server.registerTool("palo_get_approval_status", { description: "Read one approval state, including automatic expiry.", inputSchema: { approvalId: z.string().min(1) } }, guarded(({ approvalId }) => runtime.getApproval(approvalId)));
  server.registerTool("palo_list_approvals", { description: "List approval work items for Web and mobile review surfaces.", inputSchema: { status: z.enum(["pending", "approved", "denied", "cancelled", "expired", "all"]).optional() } }, guarded(({ status }) => runtime.listApprovals(status || "pending")));
  server.registerTool("palo_resolve_approval", { description: "Prototype: resolve a pending approval once with a caller-supplied identity label and rationale; reviewer identity is not authenticated.", inputSchema: { approvalId: z.string().min(1), status: z.enum(["approved", "denied", "cancelled"]), resolvedBy: z.string().min(1), rationale: z.string().min(1).max(4000) } }, guarded(({ approvalId, status, resolvedBy, rationale }) => runtime.resolveApproval(approvalId, status, resolvedBy, rationale)));
  server.registerTool("palo_submit_evidence", { description: "Prototype: append HMAC-signed evidence to the SQLite hash chain; assumes a trusted caller and is not a production evidence service.", inputSchema: { claim: jsonObject, decision: jsonObject, outcome: z.enum(["executed", "failed"]), payload: jsonObject.optional() } }, guarded(({ claim, decision, outcome, payload }) => runtime.recordEvidence({ claim, decision, outcome, payload })));
  server.registerTool("palo_verify_evidence", { description: "Verify an evidence envelope HMAC using protected server-side key material.", inputSchema: { envelope: jsonObject } }, guarded(({ envelope }) => ({ valid: runtime.verifyEvidence(envelope), eventId: envelope.eventId })));
  server.registerTool("palo_verify_ledger", { description: "Verify signatures and the complete append-only evidence hash chain.", inputSchema: {} }, guarded(() => runtime.verifyLedger()));
  return server;
}
