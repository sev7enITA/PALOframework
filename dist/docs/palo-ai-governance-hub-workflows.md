# PALO-AI Governance Hub — Workflow and Diagram Specification

Status: design specification for a role-based GUI over the PALO-AI v2.5 developer preview.

> **Developer-preview boundary.** This document does not turn the reference runtime into a production authorization boundary. Use synthetic or isolated data and non-consequential tools only. Production use still requires workload and human identity, tenant RBAC, KMS/HSM-backed keys, durable distributed state, high availability, connector isolation, monitoring and independent security assessment.

## Purpose

The proposed **PALO-AI Governance Hub** is one product with two primary lenses over the same versioned contracts and evidence:

- **Executive Cockpit** — communicates exposure, ownership, decisions and verified outcomes without requiring knowledge of JSON, Rego or MCP.
- **Technical Workbench** — configures, tests, publishes and operates the controls behind those outcomes, with progressive access to generated contracts and evidence.

The Hub must not maintain a separate governance truth. It reads and acts through PALO-AI contracts: Action Claim 1.2, Effect Contract 1.0, Policy Decision 1.0, Approval 1.0, Execution Capability 1.0, Execution Receipt 1.0, Outcome Attestation 1.0 and Assurance Incident 1.0.

## Diagram set

| Diagram | Analytical job | Main takeaway |
| --- | --- | --- |
| [Shared architecture](diagrams/palo-ai-governance-hub/shared-architecture.mmd) | Software/system structure | Both lenses share one source of truth; a production Hub needs an authenticated backend-for-frontend rather than browser-held preview tokens. |
| [Executive drill-down](diagrams/palo-ai-governance-hub/executive-drill-down.mmd) | Hierarchy and decision path | Every portfolio indicator must drill down to evidence, while missing data remains visibly unavailable rather than becoming a positive score. |
| [Technical onboarding and publish](diagrams/palo-ai-governance-hub/technical-onboarding-publish.mmd) | Technical workflow | Intent becomes bounded authority, an Effect Contract, tests and an immutable reviewed version. |
| [Approval, execution and verification](diagrams/palo-ai-governance-hub/approval-execution-verification.mmd) | Runtime sequence | Permission is not assurance: execution is capability-bound and the result is verified against authoritative state. |
| [Incident lifecycle](diagrams/palo-ai-governance-hub/incident-lifecycle.mmd) | State machine | Mismatch or uncertainty creates a resource hold; resolution is explicit and compensation is a new governed action. |
| [Role and permission model](diagrams/palo-ai-governance-hub/role-permission-model.mmd) | Authorization model | Human decisions and workload permissions need distinct identities and separation of duties. |

The diagrams are explanatory Mermaid sources. Neutral nodes show context, focal nodes show control points, and failure branches are explicit. They are intentionally schematic and do not imply production readiness.

## Shared architecture

The Hub introduces a role-aware presentation and orchestration layer without replacing the PALO runtime. The browser should call a backend-for-frontend (BFF), which resolves user identity, tenant and permissions, redacts sensitive fields, and calls the runtime using scoped service credentials. Direct browser access with the shared preview bearer token is out of scope for any production design.

### Inputs

- Authenticated human principal, role, tenant/project and selected environment — **required, not implemented in v2.5**.
- Registry records for agents, policies, executors and verifiers.
- Decisions, approvals, executions, receipts, attestations, incidents and ledger status.
- Platform correlation identifiers such as workflow, execution and node IDs.

### Outputs

- Role-appropriate portfolio summaries and technical detail.
- Human-readable explanations linked to canonical evidence.
- Authorized administrative or review commands.
- Exportable, redacted review material — **required API**.

### Failure states

- Identity or tenant context is missing: deny the command and expose no cross-tenant data.
- Runtime or policy service is unavailable: show stale/partial status with last-updated time; new consequential actions remain fail-closed.
- Evidence cannot be correlated: label the record incomplete; do not infer verified assurance.
- Sensitive arguments cannot be safely redacted: suppress detail and require an authorized technical view.

## Executive workflow

The Executive Cockpit answers five questions: what is happening, where exposure exists, which outcomes are not verified, where a human decision is required, and who owns remediation.

### Reading path

1. Portfolio coverage and outcome distribution.
2. Business area and accountable owner.
3. Platform, workflow and agent authority profile.
4. Individual Action Claim and policy decision.
5. Approval, Execution Receipt and Outcome Attestation.
6. Incident, resource hold and resolution evidence when assurance is not verified.

### Recommended executive measures

Keep dimensions separate rather than producing one opaque score:

| Dimension | Suggested measure | Caveat |
| --- | --- | --- |
| Governance coverage | Consequential workflows with a non-bypassable governed path / known consequential workflows | Workflow discovery and admission are not implemented; preview coverage is declared, not independently proven. |
| Authority assurance | Active agents with current, bounded profiles / registered active agents | The registry is a prototype and lacks production publisher authorization. |
| Outcome assurance | `verified`, `mismatch`, `inconclusive`, pending and unavailable counts | `allowed` is never counted as `verified`. |
| Operational health | Open incidents, held resources, recovery events and verification latency | The current runtime is single-instance and not an HA service. |

### Inputs

- Aggregated registry, decision, execution and incident data.
- Business owner and criticality metadata — **required extension**.
- Coverage inventory and bypass assessment — **required workflow-admission capability**.

### Outputs

- Assign owner, request remediation, suspend a preview scope or accept a documented residual risk.
- Evidence-linked report for an IT/security handoff.

### Failure states

- Missing denominator for a coverage measure: show `unavailable`, not 0% or 100%.
- Stale telemetry: retain the last known view with a timestamp and visible stale flag.
- Mixed tenant or environment selection: block aggregation unless explicitly authorized.
- Incident without owner: elevate as an accountability gap.

## Technical onboarding and publish workflow

The Technical Workbench starts from intent rather than raw JSON:

1. Connect an isolated environment and select local, hybrid, cloud or private deployment intent.
2. Discover or register the agent, allowed tools, executor and independent verifier.
3. Declare purpose, owner, tenant, case and environment.
4. Bound authority by operation, resource, path, host, network intent and requested scopes.
5. Build the Effect Contract using the closed JSON-Pointer predicate DSL.
6. Select automatic, human-review or deny behavior.
7. Generate draft contracts and Rego tests.
8. Validate schemas and simulate allowed, denied, approval, replay, stale-state, mismatch and verifier-unavailable cases.
9. Obtain peer and accountable-owner review.
10. Publish an immutable version and bind its digest to the deployment.
11. Monitor decisions, outcomes, incidents and possible bypass paths.

### Inputs

- Platform connection and non-secret metadata.
- Agent/case identity, authority boundary and argument schema.
- Executor and verifier manifests.
- Effect predicates, verification timeout and inconclusive behavior.
- Reviewers, owners and environment promotion target — **required identity and workflow extensions**.

### Outputs

- Validated Agent Profile and Action Claim template.
- Effect Contract, Rego policy, fixtures and test result.
- Versioned registry entries and deployment digest.
- Preview conformance report and unresolved-gap list.

### Failure states

- Schema invalid or authority incomplete: do not allow simulation or publication.
- Verifier cannot read authoritative state: mark the design incomplete or require human review; do not claim outcome assurance.
- Tests do not cover deny, replay and mismatch paths: block promotion.
- Direct target credential remains in the workflow: label integration advisory and block a “governed” claim.
- Published digest differs from evaluated OPA bundle: fail closed — **bundle attestation required**.

## Approval, execution and outcome workflow

The runtime flow is:

```text
Propose -> Authorize -> Approve -> Capability -> Execute -> Receipt -> Observe -> Verify -> Escalate
```

An approval is not a mutable flag. It is bound to the exact claim digest and must be revalidated with the profile, policy and replay material immediately before execution. The trusted runtime consumes a short-lived capability once, persists execution intent, calls the registered executor, signs a receipt, and asks the registered verifier to compare authoritative post-state with the immutable Effect Contract.

### Inputs

- Canonical Action Claim 1.2 with nonce, idempotency key, sequence number and Effect Contract.
- Active agent profile, policy, executor and verifier manifests.
- Exact approval ID when policy requires review.
- Authoritative pre- and post-state observations.

### Outputs

- `denied`: no tool execution.
- `review_required`: approval is pending, pre-state is unavailable, or outcome is mismatched/inconclusive.
- `verified`: signed receipt and attestation show the expected effect with no forbidden effect.
- `execution_failed`: the connector reports failure; subsequent state still requires evidence and review as applicable.

### Failure states

- Malformed or expired claim, missing profile, replay, invalid approval, or unavailable/malformed policy result: deny fail-closed.
- Unsatisfied precondition: deny before execution.
- Executor failure or crash after intent: persist/recover an unknown receipt; classify attribution as inconclusive.
- Verifier unavailable: open an incident and hold the resource.
- Effect mismatch: open a high-severity incident and hold the resource.
- Alternate credential path exists: PALO cannot claim authoritative enforcement.

## Incident workflow

A `mismatch` or `inconclusive` attestation opens an Assurance Incident and a hold for the resource key. The current state vocabulary is `open`, `acknowledged` and `resolved`. Resolution releases the hold. A compensating action or rollback must be a new Action Claim with a new assurance cycle.

### Inputs

- Execution, claim and attestation identifiers.
- Verification checks and reason.
- Authorized human identity and resolution record — caller-supplied labels are preview-only.

### Outputs

- Acknowledged or resolved incident.
- Released resource hold only on resolution.
- New governed compensation claim when remediation changes state.

### Failure states

- Attempted backward transition from resolved: reject.
- Re-verification remains inconclusive or mismatched: keep the incident and hold active.
- Resolution has no authenticated actor or adequate rationale: production design must reject it.
- Automatic rollback requested: reject; create a separately governed compensation.

## Role and permission model

| Role | Primary permissions | Guardrail |
| --- | --- | --- |
| Executive | Read portfolio; assign strategic owner; accept or suspend scoped risk | No raw secrets, policy edits or operational approval by default. |
| Business owner | Own use case; review risk; approve promotion | Cannot be the only policy author and promoter for high-impact scope. |
| Reviewer | Approve or deny one exact Action Claim | Authenticated identity, purpose, expiry and separation of duties required. |
| Policy engineer | Draft and test policy and Effect Contracts | Cannot silently promote own high-impact change. |
| Platform administrator | Register integrations; operate deployment and recovery | Cannot approve business actions solely by infrastructure privilege. |
| Auditor | Read versions, evidence and review packs | Read-only and redacted by tenant/scope. |
| Agent workload | Propose bounded Action Claims | Cannot resolve approvals or submit trusted evidence. |
| Executor workload | Consume a bound one-time capability | Holds target credential; cannot expand the claim. |
| Verifier workload | Read authoritative state and attest the Effect Contract | Separate trust path from the executor wherever practical. |

The v2.5 preview uses shared bearer tokens and caller-supplied human labels. Those controls are insufficient for the role model above. The target requires OIDC for people, workload identity/mTLS for services, tenant/project RBAC, scoped credentials, separation of duties and a complete administrative audit trail.

## Current and required API surface

### Available in the v2.5 reference Gateway

| Workflow | Current endpoint(s) | Notes |
| --- | --- | --- |
| Health | `GET /health` | Unauthenticated preview health only. |
| Registry read | `GET /v1/registry` | Aggregate preview registry; needs pagination, filters and tenant scoping. |
| Registration | `POST /v1/agents/register`, `/v1/policies/register`, `/v1/executors/register`, `/v1/verifiers/register` | Immediate version registration; no draft/review/promotion lifecycle. |
| Decision gate | `POST /v1/actions/verify` | Action Claim 1.1/1.2 compatibility; fail-closed reference behavior. |
| Governed action | `POST /v1/actions/execute` | Full-cycle reference execution using in-process adapters. |
| Execution read/verify | `GET /v1/executions/{id}`, `GET /v1/executions/{id}/outcome`, `POST /v1/executions/{id}/verify` | Suitable for execution drill-down; lacks search/list endpoint. |
| Approvals | `GET /v1/approvals`, `GET /v1/approvals/{id}`, `POST /v1/approvals/resolve` | Caller-supplied reviewer identity; list endpoint must not be public without RBAC. |
| Incidents | `GET /v1/incidents`, `GET /v1/incidents/{id}`, `POST /v1/incidents/resolve` | Supports acknowledge/resolve and resource release. |
| Ledger | `GET /v1/evidence/verify-ledger` | Integrity check, not a query/report API. Caller-submitted evidence is disabled by default. |

The MCP server exposes corresponding preview tools for registry, verification, approval, execution, outcome, incident and ledger operations. The same identity and authorization gaps apply.

### Required for the Governance Hub

| API family | Minimum capability | Why it is needed |
| --- | --- | --- |
| Identity/session | OIDC login, logout, session, tenant/project context and scoped service exchange | Prevent browser-held shared tokens and establish human accountability. |
| Authorization | Role/permission introspection and policy-enforced command authorization | Enforce the role model and separation of duties. |
| Portfolio/query | Paginated agents, workflows, decisions, executions, outcomes and incidents with filters and stable cursors | Build dashboards without downloading the entire registry or ledger. |
| Aggregation | Coverage, outcome and incident series with denominator, freshness and data-quality metadata | Prevent misleading executive measures. |
| Policy lifecycle | Draft, validate, simulate, review, approve, promote, rollback and compare immutable versions | Convert immediate registration into governed change management. |
| Deployment attestation | Bind active runtime, OPA bundle, connector and workflow digests | Prove the evaluated/deployed control matches the reviewed version. |
| Workflow coverage | Inventory and admission assessment, including alternate credential paths | Distinguish advisory routing from non-bypassable governance. |
| Approval delivery | Meaningful action presentation, authenticated reviewer assignment, notifications and one-time resume | Complete the human-review journey securely. |
| Evidence query/export | Correlated evidence timeline, redaction policy and signed review-pack export | Support executive drill-down, audit and incident response. |
| Operations | Connector health, verifier freshness, queue/outbox status, backup/restore and recovery telemetry | Make failure and degraded states visible. |

## GUI explanation levels

Each record should support progressive disclosure:

1. **Plain language** — “Price update denied because the requested change exceeded the agent's authority.”
2. **Structured explanation** — agent, resource, policy version, rule, owner and obligation.
3. **Evidence lineage** — claim, approval, capability, receipt, attestation and incident.
4. **Raw technical view** — canonical JSON, Rego result, digests, signature metadata and logs.

Essential status and reason information must remain visible without hover. Mobile views should preserve the sequence `status -> reason -> owner/action -> evidence`, with tap/focus rather than hover-only disclosure. Status must use text and iconography in addition to color.

## Acceptance criteria for this design

- Executive counts never equate `allowed` with `verified`.
- Every positive assurance indicator drills down to signed or integrity-linked evidence.
- Missing, stale and partial data are visible states.
- A role cannot gain target-system authority merely through the GUI.
- Approval is shown against an immutable, human-meaningful claim summary.
- Publishing is blocked when required negative, replay and outcome tests fail.
- A workflow with a direct credential bypass cannot be labelled non-bypassably governed.
- Mismatch and inconclusive outcomes create visible incidents and resource holds.
- Resolving an incident does not imply automatic rollback or successful compensation.
- Raw contracts remain available to technical and audit roles without becoming the default executive interface.

## Related documents

- [Full-cycle agentic assurance](palo-ai-full-cycle-assurance.md)
- [Governance integration guide](palo-ai-governance-integration-guide.md)
- [Cloud reference architecture](palo-ai-cloud-reference-architecture.md)
- [Security assurance and scale](palo-ai-security-assurance-and-scale.md)
- [Capability matrix](../agentic/capability-matrix.json)
