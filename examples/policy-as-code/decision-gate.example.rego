# EDUCATIONAL, NON-PRODUCTION EXAMPLE.
# This policy does not determine compliance, legal status, safety, or deployment approval.
# Validate semantics, input authenticity, fail behavior, exceptions, and decision rights before any use.

package palo.educational.decision_gate

default allow := false

deny contains "required human approval is missing" if {
  input.decisionContext.humanApprovalRequired
  not input.decisionContext.humanApprovalRecorded
}

deny contains "critical test findings remain open" if {
  input.decisionContext.openCriticalFindings > 0
}

deny contains "required evidence is incomplete" if {
  not input.decisionContext.requiredEvidenceComplete
}

allow if {
  count(deny) == 0
}

result := {
  "allow": allow,
  "reasons": deny,
  "status": "educational-non-production"
}
