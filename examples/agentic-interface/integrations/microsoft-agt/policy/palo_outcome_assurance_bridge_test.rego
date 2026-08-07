package agent_control_specification.palo_outcome_assurance_bridge_test

import rego.v1
import data.agent_control_specification.palo_outcome_assurance_bridge

base_input := {
    "intervention_point": "pre_tool_call",
    "tool": {"name": "catalog_update"},
    "snapshot": {
        "metadata": {"palo": {
            "case_id": "case-demo",
            "claim_id": "claim-demo",
            "claim_digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "resource": "catalog:item",
            "requested_scopes": {"read": [], "write": ["/items/1"]}
        }}
    }
}

test_missing_approval_escalates if {
    result := palo_outcome_assurance_bridge.pre_tool_call_verdict with input as base_input
    result.decision == "escalate"
}

test_exact_digest_approval_allows if {
    approved := object.union(base_input, {"snapshot": object.union(base_input.snapshot, {
        "approvals": {"status": "approved", "claimDigest": base_input.snapshot.metadata.palo.claim_digest}
    })})
    result := palo_outcome_assurance_bridge.pre_tool_call_verdict with input as approved
    result.decision == "allow"
}

test_mismatched_digest_does_not_allow if {
    mismatched := object.union(base_input, {"snapshot": object.union(base_input.snapshot, {
        "approvals": {"status": "approved", "claimDigest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}
    })})
    result := palo_outcome_assurance_bridge.pre_tool_call_verdict with input as mismatched
    result.decision == "escalate"
}
