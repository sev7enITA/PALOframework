# PALO-AI Governance Hub — status, gaps and staged launch plan

Status: evidence-led launch plan prepared 19 July 2026 for the PALO-AI v2.5 developer preview and proposed role-based GUI.

## Executive conclusion

PALO-AI has moved beyond a static architecture proposal: the repository now contains a working full-cycle reference model that can authorize a canonical action, bind exact human approval, issue a one-time capability, execute through a registered in-process adapter, sign a receipt, verify authoritative post-state and open a held incident when the effect is wrong or uncertain.

It has **not** yet reached production-control-plane maturity. The proposed Governance Hub can materially reduce cognitive friction, but a polished dashboard must not be allowed to outrun identity, non-bypassability, key custody, distributed reliability and independent assurance.

The launch should therefore make one promise:

> **PALO-AI helps teams make agent authority explicit and test whether protected actions produced their declared outcomes. The current release is an open developer preview for isolated evaluation—not a production authorization service.**

## Where we are now

### Evidence that can be demonstrated

| Area | Repository evidence | Safe current statement |
| --- | --- | --- |
| Governance contracts | 12 agentic JSON schemas and fixtures | The core contract vocabulary is implemented and testable in the reference repository. |
| Policy | Rego v1 default-deny policy and 13 tests | Reference allow, deny, approval and fail-closed behavior is covered by the included policy tests. |
| MCP | 19 registered tools; stdio and bearer-authenticated Streamable HTTP | The official-SDK reference server is implemented; remote transport remains a prototype without production identity or perimeter controls. |
| Runtime | 23 Node.js tests across core, assurance, MCP, deployment and demo behavior | The documented single-instance reference behavior is exercised by automated tests; this is not independent security assurance. |
| Full-cycle assurance | Effect Contract, capability, receipt, outcome attestation, incident and hold | A working reference path distinguishes permitted actions from verified outcomes. |
| Replay and recovery | Nonce, idempotency, sequence checks, transactional outbox and restart recovery | Reference replay controls and single-instance recovery exist; distributed exactly-once execution does not. |
| n8n | Package 0.2 source, two nodes, local 0.1 alpha evidence and synthetic workflow | The n8n integration is an unpublished, unverified developer preview; 0.2 still needs a fresh clean-install real-canvas validation. |
| Dify and other platforms | Authenticated Python Dify example and portable adapter contract | Cross-platform integration is demonstrated at example/specification level, not as production connectors. |
| Public proof | Architecture, capability matrix, diagrams, screenshots, three-minute video and hands-on demo | There is enough material for architecture review and design-partner recruitment. |
| Governance Hub GUI | Role model and page/workflow copy | Executive Cockpit and Technical Workbench are proposed; no implementation or production claim should be made yet. |

### Core differentiation

The strongest current message is not “we log AI actions.” It is:

1. autonomy does not establish authority;
2. policy permission does not establish correctness;
3. approval must bind the exact immutable claim;
4. execution evidence must be generated inside the governed path;
5. authoritative post-state determines `verified`, `mismatch` or `inconclusive`;
6. wrong or uncertain outcomes become held assurance incidents.

This is more precise and defensible than a broad claim of “complete AI governance.”

## What is missing

### Product and usability gaps

| Gap | Consequence | Next proof required |
| --- | --- | --- |
| No implemented Executive Cockpit | Managers still need narrative documents or raw artifacts | Tested prototype with five executive decisions and evidence drill-down |
| No implemented Technical Workbench | Setup starts from contracts and commands, increasing cognitive load | Wizard prototype generating profiles, claims, Effect Contracts, policy and tests |
| No stable explanation layer | Raw denial reasons may be too technical or inconsistent | Human-readable explanation taxonomy mapped to machine evidence |
| No portfolio telemetry API | Executive metrics would be sample data or expensive client aggregation | Read-only aggregate API with lineage to immutable evidence |
| No visual bypass analysis | A polished gate can conceal direct credential paths | Topology model and explicit coverage/bypass findings |
| No governed policy promotion UX | Draft, review, publish and rollback remain operator work | Versioned lifecycle with reviewer separation and signed bundle evidence |
| No reusable domain packs | Every adopter must design contracts and tests from scratch | Two or three narrow packs, such as catalog update and support ticket action |

### Security and production gaps

1. Principal-level identity, SSO/OIDC, RBAC and separation of duties.
2. Multi-tenant and cross-environment isolation.
3. KMS/HSM-backed signing, rotation, revocation and external anchoring.
4. Signed OPA bundle promotion, provenance, digest attestation and rollback.
5. Credential isolation and a non-bypassable governed executor for each protected target.
6. Workflow admission or equivalent coverage enforcement.
7. Authenticated reviewer presentation, notification and one-time backend-controlled resume.
8. PostgreSQL or equivalent durable storage, queues, multi-replica leasing and recovery.
9. HA, backup/restore, retention, rate limiting, observability and incident response.
10. Connector workload identity, binary/supply-chain attestation and certification criteria.
11. Independent architecture, cryptography, application/cloud and agent/MCP abuse assessment.
12. Performance, failure-mode and recovery evidence under representative load.

### Ecosystem gaps

- npm trusted publishing is configured in workflow source but public package release remains intentionally deferred;
- n8n package 0.2 requires a clean disposable installation and real-canvas validation;
- normal npm community-package discovery must be tested after publication;
- n8n verification eligibility and Creator Portal review remain discretionary and must not be implied;
- workflow template submission should follow real user tests, not lead them;
- Copilot Studio, LangGraph and other adapters need scoped implementation and conformance evidence;
- no formal support, compatibility or vulnerability-response service level exists.

## The product narrative by audience

### 1. Executive and board-level decision makers

**Problem:** agentic automation increases operational authority faster than governance teams can see or review it.

**Message:** understand where protected actions can bypass control, where outcomes are verified and where accountable decisions are required.

**Proof to show:** direct-versus-governed workflow, one mismatch incident, four separate assurance measures and a plain-language executive report.

**Ask:** authorize a six-week isolated pilot and nominate the accountable business, IT and security owners.

### 2. CIO, CTO, CISO and enterprise architects

**Problem:** a visual approval node is not an enforcement boundary, and policy permission does not prove the external result.

**Message:** evaluate PALO as a portable control-plane architecture around existing orchestrators, not as another workflow engine.

**Proof to show:** trust boundaries, credential topology, failure behavior, Effect Contract, capability consumption, recovery and current gaps.

**Ask:** approve technical due diligence, threat modelling and one non-production integration.

### 3. n8n and no-code/low-code builders

**Problem:** governance becomes repeated HTTP/Switch/Wait logic and may remain bypassable.

**Message:** keep the canvas experience while making authority, approval and outcome states explicit through a reusable PALO service integration.

**Proof to show:** importable safe workflow, Denied/Review Required/Verified/Mismatch paths and direct credential warning.

**Ask:** reproduce the demo and report node ergonomics, installation and failure behavior.

### 4. Code-first agent and platform engineers

**Problem:** authority, replay protection, approval and outcome evidence are reimplemented differently in every agent stack.

**Message:** test portable JSON contracts, Rego policy, MCP tools and REST lifecycle against one isolated adapter.

**Proof to show:** schemas, policy tests, E2E test, MCP toolkit and reference runtime.

**Ask:** contribute a conformance fixture, negative test or adapter threat-boundary review.

### 5. Governance, risk, compliance and audit

**Problem:** static assessments and post-hoc logs do not bind the actual action and observed outcome.

**Message:** connect authority, human oversight, execution evidence and outcome assurance to one reviewable lifecycle.

**Proof to show:** exact-claim approval, signed receipt, outcome attestation, incident and evidence lineage.

**Ask:** review decision rights, retention, explanation and reporting requirements.

### 6. Security and assurance reviewers

**Problem:** the governance layer itself becomes a high-value authorization and evidence target.

**Message:** challenge PALO's trust boundaries before it is scaled; do not accept interface polish as security proof.

**Proof to show:** threat model, capability matrix, fail-closed tests, bypass statement, key boundary and unresolved blockers.

**Ask:** perform architecture, cryptographic and adversarial review and publish a sanitized finding summary after remediation.

## Promotion sequence

### Stage 0 — align the public truth

Timing: immediately, before new promotion.

Actions:

- use v2.5 and “full-cycle developer preview” consistently;
- publish the Governance Hub page as a product-direction page, not an availability claim;
- make `agentic/capability-matrix.json` the source of truth for status;
- make the direct-versus-governed demo the primary proof asset;
- place the current boundary next to every CTA;
- update community copy that still centers v2.4.1 before posting it;
- do not publish sample executive metrics without a visible “illustrative data” label.

Exit criteria:

- no public page claims production readiness, n8n verification or universal interception;
- every major capability statement links to evidence or is labelled proposed;
- one executive and one technical narrative use the same lifecycle vocabulary.

### Stage 1 — design review, not launch announcement

Timing: weeks 1–2.

Channels and actions:

**GitHub Discussions**
Open “One Governance Hub, two role-based views” and ask four design questions. Link the full-cycle guide, capability matrix and safe demo.

**n8n Community**
Post an updated architecture discussion, explicitly not a verification request. Ask where native nodes should end and a one-service PALO integration should begin, how builders expose bypass risk and which reversible workflow should become the first partner test.

**OPA community**
Ask for review of input ownership, policy-bundle attestation, default-deny semantics, exception expiry and test coverage. Do not lead with marketing copy.

**OWASP GenAI Agentic Security Initiative and MCP security practitioners**
Share the trust-boundary diagram and “authorized but wrong” case. Ask reviewers to challenge confused-deputy, prompt-injection, replay, verifier trust and evidence-forgery paths.

**LinkedIn**
Publish a short technical narrative around one insight: **Allowed is not verified.** Use a 30–45 second clip of the wrong-effect path and link to GitHub. Invite critique and design partners, not buyers.

Exit criteria:

- 10 qualified architecture responses;
- at least 3 responses from outside the existing network;
- all material feedback classified as contract, enforcement, UX, policy, reliability or documentation;
- public “what changed because of feedback” log started.

### Stage 2 — structured design-partner cohort

Timing: weeks 2–6.

Recruit 3–5 partners across:

- one n8n consultant or self-hosted operator;
- one internal AI automation team;
- one security/authorization specialist;
- one governance or assurance practitioner;
- optionally one cross-platform builder using Dify, Copilot Studio or LangGraph.

Each partner supplies:

- one disposable workflow;
- one synthetic or reversible action;
- a stated “must never execute” condition;
- a named accountable reviewer;
- measurable comprehension, latency and reliability criteria;
- permission before any result is attributed publicly.

Each evaluation must test:

```text
register -> deny -> exact approval -> governed execution -> signed receipt
         -> authoritative verification -> mismatch/inconclusive -> incident -> recovery
```

Measure both controls and friction:

- time to first governed action;
- number of concepts the builder must understand;
- setup steps and manual fields;
- policy and contract errors before first successful run;
- reviewer time and decision comprehension;
- bypass paths detected;
- decision and verification latency;
- recovery success;
- percentage of actions with an authoritative verifier;
- false confidence events, where “allowed” was mistaken for “verified.”

Exit criteria:

- 3 written partner scopes;
- 2 independently reproduced installations;
- 2 complete test reports, including one wrong-effect case;
- top five cognitive-friction points ranked by evidence;
- no unresolved critical security or authorization finding.

### Stage 3 — installable alpha decision

Timing: after Stage 2 evidence, not on a fixed publicity date.

Before npm publication:

- validate package 0.2 on a clean supported n8n instance;
- test install, upgrade, downgrade and uninstall;
- run n8n package scanning and `n8n audit` before and after installation;
- document exact compatibility, checksums, SBOM and known limitations;
- confirm that the public node integrates one PALO service and does not masquerade as generic flow control;
- publish through GitHub Actions trusted publishing with provenance;
- confirm support and security contact readiness;
- record a go/no-go decision.

After publication:

- test the normal n8n community-package installation path;
- verify discovery and removal behavior;
- publish only safe, reversible workflow examples;
- wait for real feedback before proposing templates or Creator Portal review.

Exit criteria:

- repeatable clean installation on the declared compatibility range;
- scan, build, tests and packaging pass from a tagged commit;
- provenance and SBOM public;
- zero open critical/high release-blocking findings;
- rollback and deprecation path documented.

### Stage 4 — external assurance and controlled production candidate

Timing: only after design-partner learning and architecture hardening.

Commission three complementary reviews:

1. architecture and agent/MCP threat-model review;
2. applied cryptography and evidence-boundary review;
3. application, API, cloud and business-logic penetration test with retest.

Shortlist providers through the CREST Marketplace or equivalently qualified independent practitioners. Require demonstrable OAuth/OIDC, multi-tenant SaaS, OPA/Rego, Node.js, MCP/agentic abuse and applied cryptography experience.

Do not use OWASP peer feedback as a substitute for a contracted independent assessment. Publish a sanitized assurance statement only after remediation and retest.

Exit criteria:

- signed threat model and residual-risk register;
- KMS/HSM and identity architecture implemented;
- tenant isolation and cross-tenant tests complete;
- HA and backup/recovery exercise complete;
- independent findings remediated and retested;
- explicit decision on controlled production-pilot scope.

## Proof-asset stack

Use proof assets in this order:

1. **One-sentence problem:** Allowed is not verified.
2. **30-second visual:** direct tool call versus governed full cycle.
3. **Three-minute video:** deny, approve, execute, verify and wrong-effect incident.
4. **Hands-on demo:** synthetic catalog action with exact steps and expected output.
5. **Capability matrix:** specified, prototype, implemented and production-ready status.
6. **Technical guide:** lifecycle, trust boundary and production gaps.
7. **Test evidence:** Rego, runtime, MCP, deployment and recovery cases.
8. **Design-partner report:** independently reproduced result and friction findings.
9. **Security statement:** sanitized external review and remediation evidence.

Avoid leading with a long feature list or a conceptual dashboard. The audience should understand the difference between `allowed`, `verified`, `mismatch` and `inconclusive` before seeing product breadth.

## Editorial calendar for the first six weeks

| Week | Primary asset | Channel | Intended learning |
| --- | --- | --- | --- |
| 1 | “Allowed is not verified” clip and diagram | LinkedIn + GitHub Discussion | Does the problem resonate without framework jargon? |
| 1 | Governance Hub role concept | GitHub Discussion | Which executive decisions and technical tasks matter? |
| 2 | n8n direct-versus-governed workflow | n8n Community | Is the node boundary clear and complementary? |
| 2 | Rego input and bundle-boundary review | OPA community | Are policy ownership and failure semantics credible? |
| 3 | Threat-boundary and wrong-effect case | OWASP/MCP security reviewers | Which abuse cases or trust assumptions are missing? |
| 3–4 | Design-partner office hours | Direct outreach | Which setup steps create the most friction? |
| 4 | “What feedback changed” engineering note | GitHub + LinkedIn | Are we visibly learning rather than advertising? |
| 5 | Reproduced partner demo | GitHub, with permission | Can an external builder reach the expected outcomes? |
| 6 | Evidence-led alpha readiness review | GitHub | Publish, defer or narrow the package? |

## Measurable KPIs

### Learning and comprehension

- at least 70% of five executive test participants can explain “allowed versus verified” after a five-minute walkthrough;
- at least 80% correctly identify an open resource hold and its accountable owner;
- median technical time to first governed synthetic action below 45 minutes by the end of the design-partner cohort;
- median reviewer comprehension score of at least 4/5 for tool, target, effect, expiry and reason;
- top five friction points have owners and measurable remediation criteria.

### Technical proof

- 100% pass rate for documented deny, forged approval, replay, stale-state, wrong-effect, verifier-unavailable and restart-recovery fixtures;
- two independent clean installations on the declared n8n compatibility range;
- 100% of pilot protected actions mapped to an explicit credential path and bypass review;
- at least 90% of pilot actions have a declared authoritative verifier, with the remainder explicitly marked unverifiable;
- zero unresolved critical or high authorization findings at an alpha publication gate;
- reproducible build, provenance, checksum and SBOM for any public package.

### Community and adoption

- 10 qualified architecture responses in 30 days;
- 3–5 design partners with written scopes;
- 2 external reproducible test reports;
- 1 external threat-model review before any production-candidate language;
- at least 3 documented product changes caused by external feedback;
- a written go/no-go decision for npm publication and any n8n Creator Portal submission.

### Metrics to treat as secondary

- video views;
- LinkedIn impressions;
- GitHub stars;
- package downloads before the integration is repeatable;
- unqualified form submissions.

These are reach signals, not assurance or product-market evidence.

## Message and claim guardrails

### Always say

- developer preview;
- isolated or synthetic data and reversible actions only;
- allowed and verified are separate states;
- the GUI is proposed until implementation evidence exists;
- the n8n package is unpublished and not n8n-verified;
- bypass resistance depends on credential isolation and workflow admission;
- production claims remain gated by independent assessment.

### Never say

- production-ready, enterprise-ready or certified;
- n8n partner, n8n approved or n8n verified;
- every agent tool call is intercepted;
- tamper-proof evidence without explaining key custody and external anchoring;
- exactly-once execution across arbitrary external tools;
- authenticated or biometric approval unless the reviewer identity mechanism supports it;
- universal compliance with the EU AI Act, ISO/IEC 42001, NIST AI RMF or another framework.

## Recommended immediate actions

### Next 72 hours

1. Publish a clearly labelled Governance Hub concept page using the copy draft in `docs/site/palo-ai-governance-hub-page-copy.md`.
2. Open one GitHub Discussion for the two-view model; do not open a separate discussion for every feature.
3. Update the existing n8n community draft from v2.4.1 to v2.5 before posting.
4. Record a 45-second “Allowed is not verified” video using the wrong-effect demo.
5. Invite ten named reviewers: two n8n builders, two platform/security engineers, two OPA/authorization specialists, two governance practitioners and two executive/CIO advisers.
6. Create a public “feedback changed” label or project view so learning is visible.

### Next 30 days

1. Prototype the Executive Cockpit with read-only illustrative data and test five decision tasks.
2. Prototype the Technical Workbench wizard through generation of one complete catalog-update assurance pack.
3. Run three design-partner evaluations and publish redacted results with permission.
4. Complete the external threat-model review and scope the cryptographic assessment.
5. Decide whether package 0.2 is ready for a provenance-backed npm alpha or should remain repository-only.

### Next 90 days

1. Implement identity, RBAC and policy-promotion foundations before exposing administrative GUI operations.
2. Move the reference data plane toward durable multi-tenant storage and queue architecture.
3. Isolate protected connector credentials and test workflow-admission controls.
4. Commission application/cloud and cryptographic assessment, remediate and retest.
5. Publish a narrow production-candidate scope only if the evidence supports it.

## Final decision framework

At every stage ask three questions:

1. **Can a protected action bypass PALO?** If yes, call the integration advisory.
2. **Can PALO authenticate who configured, approved, executed and verified the action?** If no, keep it in developer-preview scope.
3. **Can independent evidence show that the system fails safely under attack, outage and recovery?** If no, do not claim production readiness.

The immediate objective is not maximum reach. It is to earn a small body of credible, reproducible evidence that PALO reduces governance ambiguity without imposing unacceptable cognitive or operational friction.
