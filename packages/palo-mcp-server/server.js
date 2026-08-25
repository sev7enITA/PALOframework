import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { GovernanceRuntime } from "./core.js";
import { paloGuideAgent } from "./guide-agent.js";
import { assertRequestTenant } from "./production-admission.js";

const jsonObject = z.record(z.string(), z.unknown());
const result = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value });
const fail = (error) => ({ isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }] });
const guarded = (handler) => async (input) => { try { return result(await handler(input)); } catch (error) { return fail(error); } };

export function parseExposedTools(value) {
  return [...new Set(String(value || "").split(",").map((name) => name.trim()).filter(Boolean))];
}

export function createPaloMcpServer(runtime = new GovernanceRuntime(), { exposedTools, requestContext } = {}) {
  const server = new McpServer({ name: "palo-governance-server", version: "2.7.0", websiteUrl: "https://paloframework.org/PALO_AgenticGovernance.html" });
  const allowed = exposedTools ? new Set(exposedTools) : null;
  const verifiedActor = requestContext?.authInfo?.extra?.authMode === "oidc"
    ? String(requestContext.authInfo.extra.subject || requestContext.authInfo.clientId)
    : undefined;
  const tenantBoundClaim = (claim) => requestContext?.authInfo?.extra?.authMode === "oidc"
    ? assertRequestTenant(requestContext.authInfo, claim)
    : claim;
  const tenantBound = (tenantId) => {
    if (requestContext?.authInfo?.extra?.authMode !== "oidc") return tenantId;
    const tokenTenant = requestContext.authInfo.extra.tenantId;
    if (!tokenTenant || tokenTenant !== tenantId) throw new Error("OIDC tenant does not match the requested data-assurance tenant");
    return tenantId;
  };
  const guideToolNames = ["palo_explain_framework", "palo_infer_governance_route", "palo_plan_product_integration"];
  const registerTool = (name, definition, handler) => { if (!allowed || allowed.has(name)) server.registerTool(name, definition, handler); };
  registerTool("palo_explain_framework", {
    description: "Explain how PALO works using the released semantic spine, decision gates and authority boundaries. Read-only orientation; no legal conclusion, certification or approval.",
    inputSchema: {
      query: z.string().min(1).max(4000),
      audience: z.string().min(1).max(200).optional(),
      limit: z.number().int().min(1).max(12).optional()
    }
  }, guarded((input) => paloGuideAgent.explainFramework(input)));
  registerTool("palo_infer_governance_route", {
    description: "Infer an explainable PALO starting route from explicit use-case signals. The result is a deterministic hypothesis that requires accountable human validation.",
    inputSchema: {
      useCase: z.string().min(3).max(12000),
      role: z.string().min(1).max(200).optional(),
      objectives: z.array(z.string().min(1).max(300)).max(12).optional(),
      systemType: z.string().min(1).max(200).optional(),
      currentState: z.enum(["idea", "pilot", "production", "incident", "review"]).optional(),
      signals: z.object({
        systemCanAct: z.boolean().optional(),
        usesLlm: z.boolean().optional(),
        retrievalOrMemory: z.boolean().optional(),
        outputToDownstream: z.boolean().optional(),
        adversarialTestingEstablished: z.boolean().optional(),
        architectureSecurityTestingEstablished: z.boolean().optional(),
        regulatedOrPublic: z.boolean().optional(),
        highImpact: z.boolean().optional(),
        aiAssistedDevelopment: z.boolean().optional(),
        needsMetrics: z.boolean().optional(),
        needsEvidence: z.boolean().optional(),
        uncertainScope: z.boolean().optional(),
        accountableOwner: z.boolean().optional(),
        humanReviewDefined: z.boolean().optional(),
        officialSourcesReviewed: z.boolean().optional(),
        evidenceLocationDefined: z.boolean().optional(),
        actionImpact: z.enum(["guidance-only", "read-only", "reversible-write", "consequential-write"]).optional()
      }).optional()
    }
  }, guarded((input) => paloGuideAgent.inferRoute(input)));
  registerTool("palo_plan_product_integration", {
    description: "Plan how a product should consume PALO guide tools over MCP and, where relevant, separate guidance from protected-action enforcement.",
    inputSchema: {
      product: z.string().min(1).max(500),
      productCategory: z.enum(["agent", "workflow", "developer-tool", "business-app", "chat-assistant", "other"]).optional(),
      deployment: z.enum(["local", "same-network", "remote", "production"]).optional(),
      transport: z.enum(["auto", "stdio", "streamable-http"]).optional(),
      systemCanAct: z.boolean().optional(),
      actionImpact: z.enum(["guidance-only", "read-only", "reversible-write", "consequential-write"]).optional()
    }
  }, guarded((input) => paloGuideAgent.planIntegration(input)));
  registerTool("palo_register_agent", { description: "Developer preview: register or version a local PALO agent authority profile; publisher identity is not authenticated.", inputSchema: { caseId: z.string().min(1), profile: jsonObject } }, guarded(({ caseId, profile }) => runtime.registerAgent(caseId, profile)));
  registerTool("palo_register_policy", { description: "Developer preview: register a local OPA policy manifest; bundle attestation is not provided.", inputSchema: { policy: jsonObject } }, guarded(({ policy }) => runtime.registerPolicy(policy)));
  registerTool("palo_get_registry", { description: "List locally registered profile and policy versions without secret material; OIDC callers receive only tenant-bound data-assurance records.", inputSchema: {} }, guarded(() => runtime.getRegistry(requestContext?.authInfo?.extra?.authMode === "oidc" ? { tenantId: tenantBound(requestContext.authInfo.extra.tenantId) } : {})));
  registerTool("palo_import_context_evidence", { description: "Import one immutable, payload-minimized external evidence reference from a read-only catalog, observability, identity or source connector.", inputSchema: { evidence: jsonObject } }, guarded(({ evidence }) => { tenantBound(evidence.tenantId); return runtime.registerExternalEvidence(evidence); }));
  registerTool("palo_list_context_evidence", { description: "List current external evidence references for one tenant-bound subject without returning source payloads.", inputSchema: { tenantId: z.string().min(1), subjectType: z.enum(["dataset", "data-product", "model", "ai-system", "agent", "tool", "access-entitlement", "other"]), subjectId: z.string().min(1), evidenceType: z.enum(["metadata", "lineage", "quality", "classification", "ownership", "access", "data-contract", "audit", "incident", "other", "all"]).optional(), includeExpired: z.boolean().optional(), limit: z.number().int().min(1).max(500).optional() } }, guarded((input) => runtime.listExternalEvidence({ ...input, tenantId: tenantBound(input.tenantId) })));
  registerTool("palo_register_data_fitness_policy", { description: "Register a versioned deterministic Data Fitness Policy. Policy registration is a privileged preview operation.", inputSchema: { policy: jsonObject } }, guarded(({ policy }) => { tenantBound(policy.tenantId); return runtime.registerDataFitnessPolicy(policy); }));
  registerTool("palo_evaluate_data_fitness", { description: "Evaluate current external evidence for one subject and purpose; returns immutable allowed, denied or review-required decision evidence.", inputSchema: { tenantId: z.string().min(1), subject: jsonObject, purpose: z.string().min(1).max(300), policyId: z.string().min(1).max(200) } }, guarded((input) => runtime.evaluateDataFitness({ ...input, tenantId: tenantBound(input.tenantId) })));
  registerTool("palo_get_data_fitness_decision", { description: "Read one immutable Data Fitness Decision and any continuous-assurance invalidation marker.", inputSchema: { decisionId: z.string().min(1) } }, guarded(async ({ decisionId }) => { const decision = await runtime.getDataFitnessDecision(decisionId); tenantBound(decision.tenantId); return decision; }));
  registerTool("palo_register_disclosure_contract", { description: "Register a signed purpose-bound Data Disclosure Contract tied to an exact allowed Data Fitness Decision.", inputSchema: { contract: jsonObject } }, guarded(({ contract }) => { tenantBound(contract.tenantId); return runtime.registerDisclosureContract(contract); }));
  registerTool("palo_get_disclosure_contract", { description: "Read one signed Data Disclosure Contract without secret key material.", inputSchema: { disclosureContractId: z.string().min(1) } }, guarded(async ({ disclosureContractId }) => { const contract = await runtime.getDisclosureContract(disclosureContractId); tenantBound(contract.tenantId); return contract; }));
  registerTool("palo_register_ai_system", { description: "Register or version an AI system/agent inventory record linking models, agents, tools, data, providers, owners, policy and evidence.", inputSchema: { record: jsonObject } }, guarded(({ record }) => { tenantBound(record.tenantId); return runtime.registerAiSystem(record); }));
  registerTool("palo_get_ai_system", { description: "Read the current version of one AI System & Agent Registry record.", inputSchema: { systemId: z.string().min(1) } }, guarded(async ({ systemId }) => { const record = await runtime.getAiSystem(systemId); tenantBound(record.tenantId); return record; }));
  registerTool("palo_list_ai_systems", { description: "List current AI System & Agent Registry records for one tenant.", inputSchema: { tenantId: z.string().min(1), status: z.enum(["design", "pilot", "production", "suspended", "decommissioned", "all"]).optional(), limit: z.number().int().min(1).max(500).optional() } }, guarded((input) => runtime.listAiSystems({ ...input, tenantId: tenantBound(input.tenantId) })));
  registerTool("palo_ingest_assurance_signal", { description: "Ingest an immutable catalog/observability/source change signal, invalidate prior allowed Data Fitness Decisions and revoke matching unconsumed capabilities.", inputSchema: { signal: jsonObject } }, guarded(({ signal }) => { tenantBound(signal.tenantId); return runtime.ingestAssuranceSignal(signal); }));
  registerTool("palo_list_assurance_signals", { description: "List continuous-assurance signals for a tenant and optional subject.", inputSchema: { tenantId: z.string().min(1), subjectType: z.enum(["dataset", "data-product", "model", "ai-system", "agent", "tool", "access-entitlement", "other"]).optional(), subjectId: z.string().min(1).optional(), limit: z.number().int().min(1).max(500).optional() } }, guarded((input) => runtime.listAssuranceSignals({ ...input, tenantId: tenantBound(input.tenantId) })));
  registerTool("palo_register_executor", { description: "Register a versioned trusted-executor manifest. Executable handlers must be provisioned by the runtime operator.", inputSchema: { manifest: jsonObject } }, guarded(({ manifest }) => runtime.registerExecutor(manifest)));
  registerTool("palo_register_verifier", { description: "Register a versioned authoritative-verifier manifest. Verifier handlers must be provisioned by the runtime operator.", inputSchema: { manifest: jsonObject } }, guarded(({ manifest }) => runtime.registerVerifier(manifest)));
  registerTool("palo_verify_action_authority", { description: "Developer preview: normalize and evaluate an Action Claim through local profile, data-governance bindings and draft OPA policy; OIDC requests bind the token tenant to Action Claim 1.3/1.4.", inputSchema: { claim: jsonObject, approvalId: z.string().optional() } }, guarded(({ claim, approvalId }) => runtime.verifyAction(tenantBoundClaim(claim), approvalId)));
  registerTool("palo_execute_governed_action", { description: "Execute a governed identity-bound Action Claim through a one-time capability, trusted executor and authoritative outcome verifier; OIDC tenant mismatch fails before policy evaluation.", inputSchema: { claim: jsonObject, approvalId: z.string().optional(), executorId: z.string().min(1), verifierId: z.string().min(1), capabilityTtlSeconds: z.number().int().min(5).max(300).optional() } }, guarded(({ claim, approvalId, executorId, verifierId, capabilityTtlSeconds }) => runtime.executeGovernedAction(tenantBoundClaim(claim), { approvalId, executorId, verifierId, capabilityTtlSeconds })));
  registerTool("palo_get_execution_status", { description: "Read the receipt, outcome attestation and incident state for one governed execution.", inputSchema: { executionId: z.string().min(1) } }, guarded(async ({ executionId }) => { if (requestContext?.authInfo?.extra?.authMode === "oidc") tenantBound(await runtime.getExecutionTenant(executionId)); return runtime.getExecution(executionId); }));
  registerTool("palo_verify_outcome", { description: "Re-run authoritative outcome verification for an execution, normally after an inconclusive result.", inputSchema: { executionId: z.string().min(1), force: z.boolean().optional() } }, guarded(async ({ executionId, force }) => { if (requestContext?.authInfo?.extra?.authMode === "oidc") tenantBound(await runtime.getExecutionTenant(executionId)); return runtime.verifyOutcome(executionId, { force: Boolean(force) }); }));
  registerTool("palo_request_approval", { description: "Create an expiring human approval bound to the exact tenant-bound Action Claim digest. On OIDC transports the verified subject replaces the caller-supplied label.", inputSchema: { claim: jsonObject, requestedBy: z.string().min(1), ttlSeconds: z.number().int().min(30).max(86400).optional() } }, guarded(({ claim, requestedBy, ttlSeconds }) => runtime.requestApproval(tenantBoundClaim(claim), undefined, verifiedActor || requestedBy, ttlSeconds)));
  registerTool("palo_get_approval_status", { description: "Read one approval state, including automatic expiry.", inputSchema: { approvalId: z.string().min(1) } }, guarded(({ approvalId }) => runtime.getApproval(approvalId)));
  registerTool("palo_list_approvals", { description: "List approval work items for Web and mobile review surfaces.", inputSchema: { status: z.enum(["pending", "approved", "denied", "cancelled", "expired", "all"]).optional() } }, guarded(({ status }) => runtime.listApprovals(status || "pending")));
  registerTool("palo_resolve_approval", { description: "Resolve a pending approval once with rationale. OIDC deployments bind the decision to the verified reviewer subject.", inputSchema: { approvalId: z.string().min(1), status: z.enum(["approved", "denied", "cancelled"]), resolvedBy: z.string().min(1), rationale: z.string().min(1).max(4000) } }, guarded(({ approvalId, status, resolvedBy, rationale }) => runtime.resolveApproval(approvalId, status, verifiedActor || resolvedBy, rationale)));
  registerTool("palo_get_assurance_task", { description: "Read one durable approval or outcome-verification task.", inputSchema: { taskId: z.string().min(1) } }, guarded(({ taskId }) => runtime.getTask(taskId)));
  registerTool("palo_list_assurance_tasks", { description: "List durable assurance tasks by lifecycle state and type.", inputSchema: { status: z.enum(["queued", "input_required", "running", "completed", "failed", "cancelled", "expired", "all"]).optional(), taskType: z.enum(["approval", "verification", "all"]).optional(), limit: z.number().int().min(1).max(500).optional() } }, guarded(({ status, taskType, limit }) => runtime.listTasks({ status: status || "all", taskType: taskType || "all", limit: limit || 100 })));
  registerTool("palo_process_due_tasks", { description: "Privileged runtime operation: expire approval work and process due authoritative verification tasks.", inputSchema: { limit: z.number().int().min(1).max(100).optional() } }, guarded(({ limit }) => runtime.processDueTasks({ limit: limit || 25 })));
  registerTool("palo_get_operational_snapshot", { description: "Read a redacted operational snapshot of approvals, tasks, executions, incidents, guardrails and ledger integrity.", inputSchema: {} }, guarded(() => runtime.getOperationalSnapshot()));
  registerTool("palo_submit_evidence", { description: "Deprecated compatibility tool for explicitly trusted local callers. Governed execution generates receipt and outcome evidence internally.", inputSchema: { claim: jsonObject, decision: jsonObject, outcome: z.enum(["executed", "failed"]), payload: jsonObject.optional() } }, guarded(({ claim, decision, outcome, payload }) => runtime.recordEvidence({ claim: tenantBoundClaim(claim), decision, outcome, payload })));
  registerTool("palo_verify_evidence", { description: "Verify a legacy HMAC or RFC 8785/Ed25519 evidence envelope against configured trust material.", inputSchema: { envelope: jsonObject } }, guarded(({ envelope }) => ({ valid: runtime.verifyEvidence(envelope), eventId: envelope.eventId })));
  registerTool("palo_verify_ledger", { description: "Verify signatures and the complete append-only evidence hash chain.", inputSchema: {} }, guarded(() => runtime.verifyLedger()));
  registerTool("palo_list_incidents", { description: "List assurance incidents opened after mismatched or inconclusive outcomes; OIDC results are tenant-scoped.", inputSchema: { status: z.enum(["open", "acknowledged", "resolved", "all"]).optional() } }, guarded(({ status }) => runtime.listIncidents(status || "open", requestContext?.authInfo?.extra?.authMode === "oidc" ? { tenantId: tenantBound(requestContext.authInfo.extra.tenantId) } : {})));
  registerTool("palo_get_incident", { description: "Read one assurance incident.", inputSchema: { incidentId: z.string().min(1) } }, guarded(async ({ incidentId }) => { if (requestContext?.authInfo?.extra?.authMode === "oidc") tenantBound(await runtime.getIncidentTenant(incidentId)); return runtime.getIncident(incidentId); }));
  registerTool("palo_resolve_incident", { description: "Acknowledge or resolve an assurance incident; compensation remains a separately governed Action Claim. OIDC deployments bind the tenant and resolution to the verified reviewer subject.", inputSchema: { incidentId: z.string().min(1), status: z.enum(["acknowledged", "resolved"]), resolvedBy: z.string().min(1), resolution: z.string().min(1).max(4000) } }, guarded(async ({ incidentId, status, resolvedBy, resolution }) => { if (requestContext?.authInfo?.extra?.authMode === "oidc") tenantBound(await runtime.getIncidentTenant(incidentId)); return runtime.resolveIncident(incidentId, status, verifiedActor || resolvedBy, resolution); }));
  if (!allowed || guideToolNames.every((name) => allowed.has(name))) server.registerPrompt("palo_guide_agent", {
    title: "PALO governance guide agent",
    description: "Ground an assistant in PALO v3.1.0 and make route inference, evidence and product-integration boundaries explicit.",
    argsSchema: {
      audience: z.string().min(1).max(200).optional(),
      product: z.string().min(1).max(500).optional()
    }
  }, ({ audience = "general", product = "the user's product" }) => ({
    description: "PALO source-grounded guide agent instructions",
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: [
          "Act as the PALO governance guide for " + audience + ".",
          "Use palo_explain_framework before explaining PALO concepts, palo_infer_governance_route before recommending a route, and palo_plan_product_integration before proposing how " + product + " should connect.",
          "Treat tool results as released framework orientation, not legal conclusions, certification, case approval or deployment authorization.",
          "Show the input signals, concise because-statements, expected artifact, evidence class, authority boundary and unresolved questions.",
          "Ask the user to confirm or correct inferred context before any downstream product changes.",
          "For systems that can act, keep read-only guidance separate from Action Claims, policy decisions, governed execution and outcome verification.",
          "For LLM, generative or agentic systems, show the OWASP GenAI 2026 profile, all ten in-scope risks, architecture priorities, open technical-control evidence and its human-review boundary.",
          "Never imply that an advisory gate is non-bypassable or that the developer-preview PALO-AI runtime is production-ready."
        ].join("\n")
      }
    }]
  }));
  return server;
}
