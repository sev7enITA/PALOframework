import { createHash } from "node:crypto";
import { defineEnforcementProvider } from "../enforcement-provider.js";

const AGT_DECISIONS = new Set(["allow", "deny", "warn", "escalate", "transform"]);

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : canonicalize(value)).digest("hex")}`;
}

function buildSnapshot({ claim, profile, approval }) {
  return {
    agent: {
      id: claim.agentId,
      role: profile.identity.role,
      profile_version: profile.profileVersion,
      lineage: profile.identity.lineage
    },
    actor: { id: claim.agentId, type: "ai_agent" },
    ...(claim.metadata?.tenantId || claim.effectContract?.resourceSelector?.tenantId
      ? { tenant: { id: claim.metadata?.tenantId || claim.effectContract.resourceSelector.tenantId } }
      : {}),
    tool_call: {
      id: claim.claimId,
      name: claim.action.tool,
      args: claim.action.arguments
    },
    ...(approval ? { approvals: approval } : {}),
    metadata: {
      palo: {
        case_id: claim.caseId,
        claim_id: claim.claimId,
        claim_digest: sha256(claim),
        operation: claim.action.operation,
        resource: claim.action.resource,
        path: claim.action.path,
        requested_scopes: claim.requestedScopes,
        external_network: claim.externalNetwork,
        network_intent: claim.action.networkIntent,
        ...(claim.action.networkHost ? { network_host: claim.action.networkHost } : {}),
        effect_contract_digest: claim.effectContract ? sha256(claim.effectContract) : null
      }
    }
  };
}

function mapVerdict(result, { policyReference }) {
  const verdict = result?.verdict;
  if (!verdict || !AGT_DECISIONS.has(verdict.decision)) {
    return {
      status: "denied",
      reasons: ["Microsoft AGT ACS returned an invalid or undefined verdict"],
      obligations: ["repair_agt_policy_runtime"],
      policyVersion: policyReference
    };
  }
  const reason = typeof verdict.reason === "string" && verdict.reason
    ? verdict.reason
    : `Microsoft AGT ACS verdict: ${verdict.decision}`;
  const common = {
    reasons: [reason],
    obligations: [],
    policyVersion: policyReference,
    ...(typeof result.actionIdentity === "string" && result.actionIdentity ? { decisionReference: result.actionIdentity } : {}),
    ...(verdict.evidence ? { evidenceDigest: sha256(verdict.evidence) } : {})
  };
  if (verdict.decision === "allow") return { ...common, status: "allowed" };
  if (verdict.decision === "warn") return { ...common, status: "allowed", obligations: ["review_agt_warning"] };
  if (verdict.decision === "escalate") return { ...common, status: "pending_approval", obligations: ["obtain_bound_human_approval"] };
  if (verdict.decision === "transform") {
    return {
      ...common,
      status: "denied",
      reasons: ["AGT proposed transformed tool arguments; PALO requires a new digest-bound Action Claim"],
      obligations: ["submit_transformed_action_as_new_claim"]
    };
  }
  return { ...common, status: "denied" };
}

export function createMicrosoftAgtAcsProvider({
  agentControl,
  providerVersion = "0.1.0",
  acsVersion = "0.3.1-beta.0",
  policyReference = `microsoft-agt-acs/${acsVersion}`,
  evaluationMode = "enforce"
} = {}) {
  if (!agentControl || typeof agentControl.evaluateInterventionPoint !== "function") throw new Error("A Microsoft AGT AgentControl-compatible instance is required");
  if (!["enforce", "evaluate_only"].includes(evaluationMode)) throw new Error("AGT evaluationMode must be enforce or evaluate_only");
  return defineEnforcementProvider({
    manifest: {
      format: "palo-agentic-enforcement-provider",
      schemaVersion: "1.0.0",
      providerId: "provider-microsoft-agt-acs",
      providerVersion,
      displayName: "Microsoft Agent Governance Toolkit - Agent Control Specification",
      providerType: "external-policy-runtime",
      capabilities: ["pre_action_decision", "human_escalation", "decision_evidence"],
      policyReference,
      vendor: "Microsoft",
      metadata: {
        upstreamRepository: "https://github.com/microsoft/agent-governance-toolkit",
        upstreamPackage: "agent-control-specification",
        testedVersion: acsVersion,
        interoperabilityStatus: "proposed-community-adapter"
      }
    },
    evaluate: async (policyInput) => {
      try {
        const result = await agentControl.evaluateInterventionPoint(
          "pre_tool_call",
          buildSnapshot(policyInput),
          evaluationMode
        );
        return mapVerdict(result, { policyReference });
      } catch (error) {
        return {
          status: "denied",
          reasons: [`Microsoft AGT ACS evaluation failed closed: ${error instanceof Error ? error.message : String(error)}`],
          obligations: ["restore_agt_policy_runtime"],
          policyVersion: policyReference
        };
      }
    },
    ...(typeof agentControl.close === "function" ? { close: () => agentControl.close() } : {})
  });
}

export { buildSnapshot as buildMicrosoftAgtSnapshot, mapVerdict as mapMicrosoftAgtVerdict };
