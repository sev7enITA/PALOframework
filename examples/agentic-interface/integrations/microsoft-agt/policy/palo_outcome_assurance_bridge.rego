package agent_control_specification.palo_outcome_assurance_bridge

import rego.v1

default verdict := {"decision": "deny", "reason": "unsupported_intervention_point"}
default pre_tool_call_verdict := {"decision": "deny", "reason": "unregistered_tool_or_missing_palo_context"}

verdict := pre_tool_call_verdict if {
    input.intervention_point == "pre_tool_call"
}

palo_context_present if {
    is_string(input.snapshot.metadata.palo.case_id)
    is_string(input.snapshot.metadata.palo.claim_id)
    is_string(input.snapshot.metadata.palo.claim_digest)
    is_string(input.snapshot.metadata.palo.resource)
    is_object(input.snapshot.metadata.palo.requested_scopes)
}

bound_approval_present if {
    input.snapshot.approvals.status == "approved"
    is_string(input.snapshot.approvals.claimDigest)
    input.snapshot.approvals.claimDigest == input.snapshot.metadata.palo.claim_digest
}

pre_tool_call_verdict := {
    "decision": "escalate",
    "reason": "palo_bound_human_approval_required"
} if {
    input.intervention_point == "pre_tool_call"
    input.tool.name == "catalog_update"
    palo_context_present
    not bound_approval_present
} else := {
    "decision": "allow",
    "reason": "agt_policy_allowed_bound_palo_claim"
} if {
    input.intervention_point == "pre_tool_call"
    input.tool.name == "catalog_update"
    palo_context_present
    bound_approval_present
}
