package palo.agentic.governance_test

import data.palo.agentic.governance
import rego.v1

base_profile := {
	"format": "palo-agentic-interface",
	"agentId": "agent-support-copilot-sub-1",
	"status": "active",
	"authority": {
		"allowedTools": ["read_file"],
		"allowedOperations": ["read"],
		"externalNetwork": false,
		"allowedNetworkHosts": [],
		"readScopes": ["/workspace/support-docs/*"],
		"writeScopes": [],
		"requireVibeGate": false,
	},
	"delegation": {
		"maxDepth": 0,
		"maxSubagents": 0,
		"allowedSubagentRoles": [],
		"requireHumanValidation": true,
	},
}

base_claim := {
	"format": "palo-agentic-action-claim",
	"schemaVersion": "1.1.0",
	"claimId": "claim-11111111-1111-4111-8111-111111111111",
	"agentId": "agent-support-copilot-sub-1",
	"action": {"tool": "read_file", "operation": "read", "resource": "/workspace/support-docs/runbook.md", "path": "/workspace/support-docs/runbook.md", "networkIntent": "none", "arguments": {"path": "/workspace/support-docs/runbook.md"}},
	"requestedScopes": {"read": ["/workspace/support-docs/runbook.md"], "write": []},
	"externalNetwork": false,
	"delegation": {"depth": 0, "subagentCount": 0},
	"sequenceNumber": 1,
	"idempotencyKey": "idem-policy-test-0001",
}

base_input := {
	"profile": base_profile,
	"claim": base_claim,
	"claim_digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	"policy": {"status": "active", "entrypoint": "action_decision"},
	"approval": null,
	"now": "2026-07-17T10:00:00Z",
}

test_valid_claim_waits_for_human if {
	governance.action_decision with input as base_input == {
		"status": "pending_approval",
		"reasons": ["human validation is required for this exact action claim"],
		"obligations": ["obtain_bound_human_approval"],
		"policyVersion": "palo-agentic-governance/1.1.0",
	}
}

test_exact_approved_claim_is_allowed if {
	approval := {
		"status": "approved",
		"claimId": base_input.claim.claimId,
		"claimDigest": base_input.claim_digest,
		"expiresAt": "2026-07-17T10:15:00Z",
	}
	decision := governance.action_decision with input as object.union(base_input, {"approval": approval})
	decision.status == "allowed"
}

test_forged_approval_digest_does_not_authorize if {
	approval := {
		"status": "approved",
		"claimId": base_input.claim.claimId,
		"claimDigest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		"expiresAt": "2026-07-17T10:15:00Z",
	}
	decision := governance.action_decision with input as object.union(base_input, {"approval": approval})
	decision.status == "pending_approval"
}

test_out_of_scope_read_is_denied if {
	claim := object.union(base_claim, {"requestedScopes": {"read": ["/workspace/payroll.csv"], "write": []}})
	decision := governance.action_decision with input as object.union(base_input, {"claim": claim})
	decision.status == "denied"
}

test_external_network_is_denied if {
	claim := object.union(base_claim, {"externalNetwork": true, "action": object.union(base_claim.action, {"networkHost": "example.com"})})
	decision := governance.action_decision with input as object.union(base_input, {"claim": claim})
	decision.status == "denied"
}

test_unregistered_tool_is_denied if {
	claim := object.union(base_claim, {"action": object.union(base_claim.action, {"tool": "shell"})})
	decision := governance.action_decision with input as object.union(base_input, {"claim": claim})
	decision.status == "denied"
}

test_missing_input_defaults_to_deny if {
	decision := governance.action_decision with input as {}
	decision.status == "denied"
	decision.reasons == ["policy input is missing or malformed"]
}

test_network_intent_mismatch_is_denied if {
	claim := object.union(base_claim, {"externalNetwork": true})
	decision := governance.action_decision with input as object.union(base_input, {"claim": claim})
	decision.status == "denied"
	decision.reasons == ["policy input is missing or malformed"]
}

test_inverse_network_intent_mismatch_is_denied if {
	action := object.union(base_claim.action, {"networkIntent": "read", "networkHost": "example.com"})
	claim := object.union(base_claim, {"externalNetwork": false, "action": action})
	decision := governance.action_decision with input as object.union(base_input, {"claim": claim})
	decision.status == "denied"
	decision.reasons == ["policy input is missing or malformed"]
}

test_vibe_gate_required_for_coding_agent if {
	authority := object.union(base_profile.authority, {"requireVibeGate": true})
	profile := object.union(base_profile, {"authority": authority})
	decision := governance.action_decision with input as object.union(base_input, {"profile": profile})
	decision.status == "denied"
}

test_valid_vibe_gate_allows_policy_progress if {
	authority := object.union(base_profile.authority, {"requireVibeGate": true})
	profile := object.union(base_profile, {"authority": authority})
	metadata := {"vibeGate": {"status": "passed", "gateId": "vibe-gate-1", "evidenceDigest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}
	claim := object.union(base_claim, {"metadata": metadata})
	decision := governance.action_decision with input as object.union(base_input, {"profile": profile, "claim": claim})
	decision.status == "pending_approval"
}
