# PALO-AI Governance Hub — User and Interaction Guide

Status: interaction guide for the implemented PALO-AI v2.5 Governance Hub prototype, updated 19 July 2026.

> **The Governance Hub is an interactive product prototype, not a production application.** The current React/Vite interface uses illustrative local data and demonstrates the Executive and Technical journeys described here. It is not connected directly to the Gateway. Use the repository’s REST, MCP, n8n, and demonstration instructions only with synthetic or isolated data until an authenticated BFF and the remaining production controls exist.

## 1. Choose your mode

Use one Hub and select the view appropriate to the decision you need to make.

| If you need to... | Start in... | You should leave with... |
| --- | --- | --- |
| Understand current exposure, adverse outcomes, ownership, or decisions | Executive Cockpit | A clear decision, owner, due date, and evidence link |
| Configure authority, policy, approval, or expected effects | Technical Workbench | A validated, versioned draft and test results |
| Investigate why an action was allowed, denied, or produced the wrong result | Technical Workbench / Investigate | A complete evidence timeline and remediation owner |
| Approve one proposed action | Decision Inbox | An exact claim, meaningful impact description, and terminal decision |
| Assess readiness for a pilot | Executive Cockpit, then Technical Workbench | A bounded business decision plus technical acceptance evidence |

The mode switch changes language and depth. It does not create a separate source of truth.

## 2. Concepts in plain language

| PALO-AI term | Plain-language meaning |
| --- | --- |
| Action Claim | A precise statement of who wants to do what, where, with which arguments, and under which replay protections |
| Authority Profile | The registered boundaries of what an agent may propose |
| Policy decision | The deterministic result: allowed, denied, or human review required |
| Approval | A one-time human decision bound to the exact claim; changing the claim requires a new decision |
| Execution Capability | Short-lived, one-time server-side authority to execute one approved claim |
| Execution Receipt | A signed runtime record of the execution attempt |
| Effect Contract | The expected before/after conditions and effects that must never occur |
| Outcome Attestation | The verifier’s signed conclusion: verified, mismatch, or inconclusive |
| Assurance Incident | A review case opened when the result is wrong or cannot be established |
| Resource hold | A safeguard that prevents further governed action on a resource until authorized resolution |

Remember the central rule:

> **Allowed means the action passed authority and policy checks. Verified means authoritative post-state satisfied the Effect Contract. These are different claims.**

## 3. Sign in and confirm context

The target Hub uses organization identity through OIDC and a secure server-side session. The current shared bearer-token gateway is not suitable for a multi-user browser interface.

After sign-in, confirm the global context before reviewing or changing anything:

1. **Organization and tenant** — whose data and policy scope you are viewing.
2. **Environment** — Local, Development, Staging, or Production.
3. **Role** — Executive, Business Owner, Reviewer, Policy Engineer, Platform Administrator, Security Operator, Auditor, or Integration Developer.
4. **Time window** — the period included in dashboards and reports.
5. **Data freshness** — when the last complete runtime and inventory update occurred.
6. **Release boundary** — developer preview, design-partner pilot, or production candidate.

Stop if the tenant or environment is wrong. Do not rely on visual labels alone for production controls; backend tenant and role authorization must be enforced.

## 4. Executive Cockpit guide

### 4.1 Start with Today

The Today page should answer five questions:

1. What changed?
2. Where are we exposed?
3. Which outcomes were wrong or uncertain?
4. What decision is required?
5. Who is accountable and by when?

Review the page in this order:

1. **Critical exceptions** — known bypass paths, mismatches, control unavailable, or unowned high-impact workflows.
2. **Outcome assurance** — verified, mismatch, inconclusive, execution failed, pending, and not instrumented.
3. **Governance coverage** — whether known consequential paths actually require PALO.
4. **Open decisions** — risk acceptance, pilot gate, owner assignment, suspension, or exception.
5. **Trend and freshness** — whether the position is improving and whether the data is current enough to act on.

Do not use a green card as proof of production readiness. Open the definition and evidence before making a consequential decision.

### 4.2 Read the assurance dimensions

The Cockpit deliberately avoids one composite score.

| Dimension | Executive question | Warning signs |
| --- | --- | --- |
| Governance coverage | Can consequential actions bypass the governed path? | Unknown inventory, direct credentials, advisory-only visual gate |
| Authority assurance | Are agents operating within explicit and current authority? | Missing/expired profiles, unusual deny reasons, stale policy |
| Outcome assurance | Did completed actions produce the promised result? | Mismatch, inconclusive verification, no Effect Contract, unavailable verifier |
| Operational health | Are the controls themselves reliable? | Policy outage, recovery events, aged holds, failed ledger check |

For every metric, open **Definition** to see numerator, denominator, window, filters, freshness, and exclusions. “Not measured” must never appear as success.

### 4.3 Use the Exposure Map

1. Select the business domain.
2. Filter by environment, owner, platform, impact class, and assurance state.
3. Expand from business capability to workflow, agent, resource, and execution.
4. Open **Known bypasses** to see any direct tool, network, or credential path around PALO.
5. Select an item to see the accountable owner, current control state, and next recommended action.

Example interpretation:

> “Customer Operations has three high-impact workflows. Two use a governed executor and authoritative verifier. One still exposes a direct platform credential and cannot be described as enforced.”

### 4.4 Make a decision

Executive decisions are distinct from operational Action Claim approvals.

Possible decisions include:

- authorize a bounded pilot;
- assign a business or technical owner;
- suspend or contain an integration;
- accept a time-bound residual risk;
- reject an exception;
- request technical evidence or independent review.

To record a decision:

1. Open the item from **Decisions**.
2. Read the business impact, evidence summary, unknowns, and current technical recommendation.
3. Verify the decision scope, environment, tenant, expiry, and owner.
4. Select the decision and provide a rationale.
5. Set the due date and review condition.
6. Confirm with step-up authentication when required.

The current runtime does not implement this risk-decision workflow. It requires a dedicated backend contract; it must not be represented as an Action Claim approval.

### 4.5 Export an executive report

1. Set the tenant, environment, time window, and filters.
2. Select **Reports > Executive assurance snapshot**.
3. Review included dimensions and redaction policy.
4. Confirm that the report displays the release status and current product boundary.
5. Generate the snapshot.

A valid report includes:

- generation time and timezone;
- principal and authorized scope;
- metric definitions and data freshness;
- material exposures and outcomes;
- owners, decisions, and due dates;
- links or identifiers for underlying evidence;
- limitations, exclusions, and preview disclaimer.

## 5. Reviewer guide

An approval is not a general permission. It is a terminal decision over one exact Action Claim digest.

### Review an approval request

1. Open **Decisions > Operational approvals**.
2. Confirm the request is assigned to you or your authorized role.
3. Review the plain-language proposal:
   - requester and agent;
   - business purpose;
   - tenant, environment, resource, and operation;
   - proposed arguments and redactions;
   - expected effect and forbidden effects;
   - policy reasons and obligations;
   - expiry and impact class.
4. Expand **Structured details** when the summary is insufficient.
5. Open **Evidence** to inspect claim digest, profile, policy version, and verifier.
6. Choose **Approve**, **Deny**, or **Cancel** and enter a meaningful rationale.
7. Complete step-up authentication if required.

Do not approve when:

- the effect is vague or cannot be verified;
- the resource, tenant, or arguments are ambiguous;
- required information is redacted from your role;
- the request is stale or no longer necessary;
- you are the requester and separation-of-duty rules prohibit self-approval;
- the workflow still has an equivalent direct path around PALO.

Changing the tool, arguments, resource, Effect Contract, tenant, or other digest-bound fields invalidates the approval and requires a new claim.

## 6. Technical Workbench guide

### 6.1 Connect an environment

Select one deployment mode:

| Mode | Use | Key boundary |
| --- | --- | --- |
| Local | Laptop development, offline tests, self-hosted n8n | Loopback/private network and synthetic data; SQLite is single-host preview state |
| Hybrid | Central policy/approval with local protected execution | Protected credential and executor stay inside the adopter network |
| Cloud | Managed control plane | Requires identity, tenant isolation, durable state, managed keys, and independent assurance |
| Private | Customer VPC/private cloud | Integrates with customer identity, network, KMS, SIEM, and retention controls |

The connection wizard must show:

- runtime version and release status;
- REST and MCP health;
- tenant and environment identity;
- authentication method;
- registry, policy, database, connector, verifier, and ledger status;
- known missing controls and supported operations.

The current gateway can provide a basic `GET /health` response. Dependency health and historical telemetry require new APIs.

### 6.2 Discover or register inventory

Open **Inventory** and work through:

1. Agents and Authority Profiles.
2. Policies and versions.
3. Executors and protected credential boundaries.
4. Verifiers and authoritative state sources.
5. Tools, operations, resources, and network destinations.
6. Business owners, impact classes, and environments.

For the current preview, the registry can be read through `GET /v1/registry` or `palo_get_registry`. Registration exists for agents, policies, executors, and verifiers, but authenticated publishers, promotion, signed bundles, and conformance health are not yet implemented.

### 6.3 Build governance from intent

Open **Govern > New governed action type**.

#### Step 1 — Purpose and ownership

Define:

- business purpose;
- accountable business and technical owners;
- tenant and environment;
- impact and data classification;
- expiry or review date.

#### Step 2 — Bound authority

Select:

- agent and Authority Profile;
- tool and operation;
- resource type and identifier pattern;
- allowed path and host;
- explicit network intent;
- argument schema, values, and limits.

Unknown tools, missing argument schemas, malformed claims, and missing profiles must fail closed.

#### Step 3 — Choose oversight

Define whether the action is:

- automatically allowed under specified conditions;
- subject to exact-claim human approval;
- always denied.

Specify reviewer role, expiry, separation of duties, and required rationale.

#### Step 4 — Define expected effects

Use the Effect Contract builder:

| Before execution | Expected after execution | Must never occur |
| --- | --- | --- |
| Preconditions over authoritative state | Intended effects | Forbidden effects |

Choose a registered verifier and specify behavior when authoritative state is unavailable. The closed predicate DSL supports JSON Pointer paths and the operators `exists`, `equals`, `unchanged`, `changedTo`, and `deltaWithin`. The builder must not accept arbitrary JavaScript or expressions.

#### Step 5 — Inspect generated artifacts

Switch among:

- plain-language policy;
- structured field view;
- generated canonical JSON;
- generated Rego and test fixtures;
- version diff.

The visual builder proposes artifacts. Schema validation, policy evaluation, review, and environment authorization remain mandatory.

#### Step 6 — Test before publishing

Run at least:

- allowed happy path;
- malformed and missing-profile default deny;
- unknown tool and invalid argument deny;
- approval and exact-claim reuse test;
- replay, stale sequence, and expired claim tests;
- verified intended effect;
- mismatch and forbidden-effect detection;
- unavailable verifier and recovery behavior;
- bypass-path assessment.

#### Step 7 — Review and publish

1. Review the generated artifacts and test results.
2. Assign a semantic version.
3. Submit the change to an authorized reviewer.
4. Review the environment-specific diff.
5. Promote only after validation and separation-of-duty checks.
6. Record publisher identity, digest, time, and rollback target.

The current registry write endpoints do not implement this lifecycle. Treat this as target behavior, not an existing control.

### 6.4 Integrate a platform

#### Code-first or MCP

1. Validate Action Claim 1.2.
2. Register profiles, policy, executor, and verifier.
3. Expose only the required PALO MCP tools.
4. Keep target credentials inside the governed executor.
5. Remove direct paths from the agent to the target.
6. Test `register -> deny -> approval -> execute -> sign -> persist -> verify`.

#### n8n

1. Install the local `n8n-nodes-palo-ai` 0.2 preview package.
2. Use **PALO Governed Action** for the full-cycle route.
3. Route Verified, Review Required, Denied, and Execution Failed separately.
4. Do not place an equivalent direct credential path beside the PALO node.
5. Resume an approved action only with the exact immutable claim and approval identifier.

The package is unpublished and not n8n-verified. A visual node alone is not an unavoidable execution boundary.

#### Comparable platforms

- Copilot Studio: expose only narrow PALO broker tools; disable equivalent direct actions.
- Dify: prefer a PALO-owned strategy or broker before `tool.invoke`.
- LangChain/LangGraph: combine middleware visibility with authoritative server-side enforcement.
- Node-RED: use an administrator-controlled runtime hook and protected-node registry.
- Make/Zapier: use brokered execution because a visual step cannot universally intercept native actions.

Every adapter must publish its `enforcement_scope` and `known_bypass_paths`.

### 6.5 Use the Test Lab

1. Select a draft version and isolated environment.
2. Choose a test scenario.
3. Review the generated claim and expected decision/outcome.
4. Run the test.
5. Compare expected and actual lifecycle states.
6. Open any failed step for reason code and source evidence.
7. Save the result against the draft version.

Simulation mode must never invoke a protected production connector. A synthetic executor/verifier is required for safe demonstrations.

## 7. Investigate an execution

Open **Investigate > Executions** and search by execution ID, case, agent, workflow, resource, tenant, or incident.

The Action Explorer presents:

1. normalized Action Claim and digest;
2. Authority Profile and policy version;
3. policy decision and reasons;
4. approval and authenticated reviewer, when required;
5. one-time capability issue and consumption;
6. execution intent and trusted receipt;
7. authoritative pre-state and post-state observations;
8. Effect Contract checks;
9. Outcome Attestation;
10. Assurance Incident and resource-hold state.

### Interpret terminal states

| State | Meaning | Next action |
| --- | --- | --- |
| Verified | Authoritative post-state satisfied the Effect Contract | Close or monitor according to policy |
| Mismatch | Observed state violated an intended or forbidden effect | Open/maintain incident, contain resource, investigate |
| Inconclusive | The result cannot be established reliably | Keep hold where configured, restore verifier or reconcile manually |
| Execution failed | Trusted executor reported a failed attempt | Investigate connector and verify whether any partial effect occurred |
| Denied | Authority/policy/precondition prevented execution | Review reasons; correct configuration or leave denied |
| Review required | Approval or human assurance action is needed | Assign authorized reviewer; do not bypass |

Do not infer causality from matching final state after an unknown recovered call. The reference implementation explicitly treats that recovery case as inconclusive.

## 8. Resolve an assurance incident

Mismatch and inconclusive outcomes can open an Assurance Incident and resource hold.

1. Open **Decisions > Assurance incidents**.
2. Confirm tenant, resource, impact, and hold status.
3. Review the Action Explorer timeline and verifier evidence.
4. Assign a security or technical owner.
5. **Acknowledge** when investigation starts.
6. Record findings and corrective actions.
7. If compensation is needed, create a new governed Action Claim. Do not edit history or silently roll back.
8. **Resolve** only when evidence supports the resolution and an authorized principal can release the hold.

The current preview supports list, get, acknowledge, and resolve operations, but it uses caller-supplied identity labels under a shared bearer token. Production use requires authenticated principals, authorization, assignment, and stronger hold integration.

## 9. Evidence and audit guide

Open **Evidence** to inspect or verify:

- claim, decision, approval, capability, receipt, attestation, and incident linkage;
- canonical digests and signature metadata;
- append-only ledger sequence and previous-event digest;
- last complete verification time and result;
- environment, release, key identifier, and retention metadata.

Current `GET /v1/evidence/verify-ledger` and `palo_verify_ledger` verify the reference HMAC signatures and local hash chain. A valid result does not establish external immutability, independent timestamping, key non-compromise, or non-repudiation.

Caller-supplied execution evidence is disabled by default. Use governed execution so the runtime generates the receipt and outcome evidence inside the trusted boundary.

## 10. Accessibility and efficient operation

- Use keyboard navigation for all inventory, approval, investigation, and publishing tasks.
- Read status labels; color is supplemental.
- Use the data-table alternative for every chart.
- At 200% zoom, use single-column reading order rather than horizontal scrolling for core actions.
- Toggle reduced motion if animations interfere with investigation.
- Use plain-language definitions before opening structured or raw code views.
- Exact timestamps always include timezone; relative times are supplemental.
- Redacted content is labeled with the reason and required role.

If a task cannot be completed with keyboard or assistive technology, report it as a release-blocking accessibility defect for that core journey.

## 11. Troubleshooting

| Symptom | Likely cause | Safe response |
| --- | --- | --- |
| Metric shows no data | Inventory, telemetry, or scope unavailable | Treat as not measured; verify environment, filters, and freshness |
| Action remains review required | Missing/expired approval or unavailable pre-state | Review exact claim and approval; restore authoritative verifier |
| Approved claim is denied on resume | Claim changed, expired, replayed, or policy/profile changed | Generate a fresh claim and repeat evaluation/approval |
| Outcome is inconclusive | Verifier unavailable, malformed, stale, or recovered execution unknown | Maintain review/hold and re-verify after restoring authority |
| Ledger verification fails | Signature or chain mismatch | Stop assurance exports, preserve state, escalate to security owner |
| n8n appears governed but target still executes directly | Equivalent direct credential/tool path remains | Remove the bypass or describe the integration as advisory |
| User sees the wrong tenant/environment | Context, session, or authorization defect | Stop; do not act; report as a security incident |
| Browser asks for a shared gateway token | Unsupported direct-browser design | Use a backend-for-frontend; never store the token in browser state |

## 12. Acceptance checklist for a guided pilot

### Executive

- [ ] Named business and technical owners exist.
- [ ] Scope, environment, data class, and release boundary are visible.
- [ ] Coverage, authority, outcome, and operations are separate dimensions.
- [ ] At least one mismatch or inconclusive scenario is explained accurately.
- [ ] The executive can identify a decision and owner in under two minutes.
- [ ] The exported report includes denominators, freshness, evidence links, and limitations.

### Technical

- [ ] A direct tool path fails or is explicitly recorded as a known bypass.
- [ ] Malformed, unknown, stale, expired, and replayed claims fail closed.
- [ ] Approval is bound to one immutable claim and resolves once.
- [ ] One synthetic action completes the full verified cycle.
- [ ] One wrong effect creates mismatch, incident, and hold.
- [ ] One verifier failure produces an inconclusive outcome.
- [ ] Generated contracts validate and required tests are attached to the version.
- [ ] No shared service credential is available to browser JavaScript.

### Accessibility

- [ ] Core tasks are keyboard operable.
- [ ] Status does not depend on color.
- [ ] Charts have textual and tabular alternatives.
- [ ] Errors are announced and linked to recovery actions.
- [ ] Core journeys pass manual screen-reader checks.

## 13. What works now and what remains target behavior

| Area | Current developer preview | Required for the proposed Hub |
| --- | --- | --- |
| Full-cycle contracts | Implemented schemas and prototype runtime flow | Schema-driven forms, explanations, version lifecycle |
| Registry | Prototype versioned local records | Authenticated publishers, owners, filters, promotion and signed bundles |
| Approvals | Prototype exact-claim state machine | Principal identity, assignment, step-up auth, notifications and role enforcement |
| Executions/outcomes | Prototype detail and verification endpoints | Search/list, projections, pagination, redaction and durable async operation |
| Incidents | Prototype list/detail/resolve | Assignment, SLA, comments, remediation and stronger hold integration |
| Ledger | Prototype local HMAC/hash-chain verification | KMS/HSM, scoped export, retention and external anchoring where needed |
| Executive metrics | Not implemented | Inventory denominator, KPI service, ownership, trends and snapshots |
| Human identity/RBAC | Not implemented; shared bearer token only | OIDC, sessions, tenant RBAC/ABAC, audit and separation of duties |
| Production data plane | Single-instance SQLite reference | PostgreSQL, queue/outbox, HA, PITR and recovery testing |

## 14. Recommended rollout

1. **Validate the experience** with clickable prototypes and separate executive/technical usability tests.
2. **Release a local Technical Console** over current preview APIs for isolated demonstrations.
3. **Add the guided Workbench** with generated contracts, simulations, change review, and versioning.
4. **Add the Executive Cockpit** only after defensible inventory, ownership, KPI denominators, and drill-down exist.
5. **Run a single-tenant design-partner pilot** after OIDC, RBAC, PostgreSQL, KMS, notifications, backup/restore, and independent security review.
6. **Claim production readiness only after** HA, workload identity, recovery exercises, penetration testing/retest, cryptographic review, and operational ownership.

## 15. Related documentation

- [Governance Hub product specification](palo-ai-governance-hub-product-spec.md)
- [Full-cycle assurance](palo-ai-full-cycle-assurance.md)
- [Adoption paths](palo-ai-adoption-paths.md)
- [Governance integration guide](palo-ai-governance-integration-guide.md)
- [Cloud reference architecture](palo-ai-cloud-reference-architecture.md)
- [Security assurance and scale plan](palo-ai-security-assurance-and-scale.md)
- [Current capability matrix](../agentic/capability-matrix.json)
