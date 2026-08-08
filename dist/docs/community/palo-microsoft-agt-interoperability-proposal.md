# PALO publishes a vendor-neutral outcome-assurance adapter for Microsoft AGT

Published: 7 August 2026

Updated: 8 August 2026

Status: community interoperability proposal for evaluation

PALO has published a community interoperability proposal connecting its full-cycle agentic assurance workflow with the Agent Control Specification (ACS) in Microsoft Agent Governance Toolkit.

The integration preserves a clear separation of responsibilities. Microsoft AGT ACS evaluates a proposed tool call at `pre_tool_call`. PALO binds the resulting decision to an immutable Action Claim, digest-bound approval and one-time execution capability, records a trusted receipt, and then reads authoritative post-action state to determine whether the approved effect actually occurred.

This addresses a distinction that matters in agentic automation: an action can be allowed by policy and still produce the wrong, partial or unverifiable business outcome.

## Architecture workflow

[Open the full-resolution PALO and Microsoft AGT interoperability workflow](../../assets/palo-ai-integrations/microsoft-agt/palo-microsoft-agt-interoperability-workflow.png).

The workflow shows where AGT ACS owns the pre-action policy decision, where the vendor-neutral verdict handoff occurs, and where PALO resumes control for digest-bound approval, one-time capability, trusted execution evidence, authoritative post-state verification and incident handling.

## What the evaluation demonstrates

The synthetic demonstration covers two paths:

- `allowed -> executed -> verified` when observed state matches the Effect Contract;
- `allowed -> executed -> mismatch -> incident hold` when a tool reports success but produces the wrong result.

The new PALO Enforcement Provider contract remains vendor-neutral. It can support OPA, AGT ACS or another compatible policy runtime without changing PALO's outcome-assurance lifecycle. The AGT package is optional and is not a dependency of the PALO core.

The adapter is maintained by the PALO project and tested against `agent-control-specification@0.3.1-beta.0`. It is not maintained, endorsed or certified by Microsoft.

## Review the proposal

- [Integration commit](https://github.com/sev7enITA/PALOframework/commit/c373825)
- [Version-pinned quickstart](https://github.com/sev7enITA/PALOframework/tree/c373825/examples/agentic-interface/integrations/microsoft-agt)
- [Merged PALO integration pull request](https://github.com/sev7enITA/PALOframework/pull/6)
- [Verified architecture infographic](https://github.com/sev7enITA/PALOframework/blob/6f806bf8557c3fadbdb9676f93a894853ea102d3/assets/palo-ai-integrations/microsoft-agt/palo-microsoft-agt-interoperability-workflow.png)
- [Technical proposal](https://github.com/sev7enITA/PALOframework/blob/c373825/docs/integrations/palo-microsoft-agt-proposal.md)
- [Microsoft AGT maintainer discussion #3647](https://github.com/microsoft/agent-governance-toolkit/discussions/3647)

PALO is inviting feedback from AGT maintainers, security engineers, governance practitioners and teams evaluating consequential agent actions. Run the synthetic demo, inspect the decision and outcome evidence, and join the upstream Microsoft AGT Discussion #3647. Do not connect this developer preview to production credentials, sensitive data or consequential systems.
