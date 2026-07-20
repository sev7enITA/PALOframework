package palo.agentic.governance

import rego.v1

# Developer-preview reference policy for the canonical PALO-AI contracts.
# This is not a production authorization policy. The reference MCP server supplies a
# locally registered profile, but production publisher identity and policy attestation
# remain the responsibility of the adopting organization.

policy_version := "palo-agentic-governance/1.2.0"

# Defense-in-depth fallback. The complete rules below already deny malformed
# input explicitly; this default preserves fail-closed behavior if a future
# edit accidentally leaves an input shape unmatched.
default action_decision := {
	"status": "denied",
	"reasons": ["policy input did not match a supported decision path"],
	"obligations": ["stop_action", "repair_policy_input"],
	"policyVersion": "palo-agentic-governance/1.2.0",
}

claim_contract_valid if {
	input.claim.schemaVersion == "1.1.0"
}

claim_contract_valid if {
	input.claim.schemaVersion == "1.2.0"
	is_object(input.claim.effectContract)
	input.claim.effectContract.format == "palo-agentic-effect-contract"
	input.claim.effectContract.schemaVersion == "1.0.0"
	input.claim.effectContract.resourceSelector.resource == input.claim.action.resource
	input.claim.effectContract.resourceSelector.path == input.claim.action.path
}

input_valid if {
	is_object(input)
	is_object(input.claim)
	is_object(input.profile)
	is_object(input.policy)
	is_string(input.claim_digest)
	is_string(input.now)
	input.claim.format == "palo-agentic-action-claim"
	claim_contract_valid
	input.profile.format == "palo-agentic-interface"
	input.policy.status == "active"
	input.policy.entrypoint == "action_decision"
	input.claim.action.networkIntent in {"none", "read", "write", "bidirectional"}
	input.claim.externalNetwork == (input.claim.action.networkIntent != "none")
	is_object(input.claim.action.arguments)
	is_number(input.claim.sequenceNumber)
	is_string(input.claim.idempotencyKey)
}

vibe_gate_valid if {
	gate := input.claim.metadata.vibeGate
	gate.status == "passed"
	is_string(gate.gateId)
	is_string(gate.evidenceDigest)
	startswith(gate.evidenceDigest, "sha256:")
}

violations contains "Vibe Coding gate is required before this coding-agent tool call" if {
	input.profile.authority.requireVibeGate
	not vibe_gate_valid
}

violations contains "agent identity does not match the registered profile" if {
	input.claim.agentId != input.profile.agentId
}

violations contains "agent profile is not active" if {
	object.get(input.profile, "status", "active") != "active"
}

violations contains "tool is outside the registered allowlist" if {
	not value_in(input.claim.action.tool, input.profile.authority.allowedTools)
}

violations contains "operation is outside the registered allowlist" if {
	not value_in(input.claim.action.operation, input.profile.authority.allowedOperations)
}

violations contains "external network access is not authorized" if {
	input.claim.externalNetwork
	not input.profile.authority.externalNetwork
}

violations contains "network host is outside the registered allowlist" if {
	input.claim.externalNetwork
	host := object.get(input.claim.action, "networkHost", "")
	not host_allowed(host, object.get(input.profile.authority, "allowedNetworkHosts", []))
}

violations contains "one or more read scopes are outside registered authority" if {
	some requested in input.claim.requestedScopes.read
	not scope_allowed(requested, input.profile.authority.readScopes)
}

violations contains "one or more write scopes are outside registered authority" if {
	some requested in input.claim.requestedScopes.write
	not scope_allowed(requested, input.profile.authority.writeScopes)
}

violations contains "delegation depth exceeds the registered limit" if {
	input.claim.delegation.depth > input.profile.delegation.maxDepth
}

violations contains "subagent count exceeds the registered limit" if {
	input.claim.delegation.subagentCount > input.profile.delegation.maxSubagents
}

violations contains "subagent role is outside the registered allowlist" if {
	role := object.get(input.claim.delegation, "requestedSubagentRole", "")
	role != ""
	not value_in(role, input.profile.delegation.allowedSubagentRoles)
}

violations contains "approval was denied, cancelled, or expired" if {
	input.profile.delegation.requireHumanValidation
	status := object.get(object.get(input, "approval", {}), "status", "")
	status in {"denied", "cancelled", "expired"}
}

approval_valid if {
	approval := input.approval
	approval.status == "approved"
	approval.claimId == input.claim.claimId
	approval.claimDigest == input.claim_digest
	time.parse_rfc3339_ns(approval.expiresAt) > time.parse_rfc3339_ns(input.now)
}

requires_approval if {
	input.profile.delegation.requireHumanValidation
	not approval_valid
}

action_decision := {
	"status": "denied",
	"reasons": ["policy input is missing or malformed"],
	"obligations": ["stop_action", "repair_policy_input"],
	"policyVersion": policy_version,
} if {
	not input_valid
}

action_decision := {
	"status": "denied",
	"reasons": sort([reason | some reason in violations]),
	"obligations": ["stop_action", "review_agent_authority"],
	"policyVersion": policy_version,
} if {
	input_valid
	count(violations) > 0
}

action_decision := {
	"status": "pending_approval",
	"reasons": ["human validation is required for this exact action claim"],
	"obligations": ["obtain_bound_human_approval"],
	"policyVersion": policy_version,
} if {
	input_valid
	count(violations) == 0
	requires_approval
}

action_decision := {
	"status": "allowed",
	"reasons": ["action is within the registered authority profile"],
	"obligations": ["record_execution_outcome", "verify_declared_effects"],
	"policyVersion": policy_version,
} if {
	input_valid
	count(violations) == 0
	not requires_approval
}

value_in(value, values) if {
	some candidate in values
	candidate == value
}

host_allowed(host, allowed) if {
	host != ""
	value_in("*", allowed)
}

host_allowed(host, allowed) if {
	host != ""
	value_in(host, allowed)
}

scope_allowed(requested, allowed) if {
	value_in(requested, allowed)
}

scope_allowed(requested, allowed) if {
	some candidate in allowed
	endswith(candidate, "/*")
	prefix := trim_suffix(candidate, "*")
	startswith(requested, prefix)
}
