# PALO-AI Governance Hub — GitHub copy draft

Status: ready-to-adapt English repository copy for the v2.5 developer preview, prepared 19 July 2026.

This file does not modify `README.md`, `CHANGELOG.md` or the existing issue templates. It supplies reviewed copy blocks for a later, intentional repository update.

## Proposed README section

### PALO-AI Governance Hub

> **From permitted actions to verified outcomes.**

PALO-AI is an emerging governance control plane for n8n and agentic automation platforms. It makes agent authority, policy decisions, human oversight, governed execution and outcome evidence visible through one portable lifecycle:

```text
Propose -> Authorize -> Approve -> Capability -> Execute -> Receipt -> Observe -> Verify -> Escalate
```

The **PALO-AI Governance Hub prototype** adds two role-based views over the same contracts and evidence:

- **Executive Cockpit** — portfolio exposure, governance coverage, outcome assurance, open holds, accountable decisions and board reporting in plain language.
- **Technical Workbench** — agent and authority setup, policy and Effect Contract builders, topology and bypass review, simulation, execution timelines and raw evidence.

The repository contains a tested React/Vite GUI using illustrative local data. It demonstrates the product direction but is not yet connected to live runtime data, human identity, tenant authorization or production key infrastructure. A live multi-user Hub requires a BFF with OIDC and server-enforced authorization.

#### What is available in v2.5

- 12 agentic JSON contracts, including Action Claim 1.2, Effect Contract, Execution Capability, Receipt, Outcome Attestation and Assurance Incident;
- a Rego v1 default-deny reference policy with 13 policy tests;
- 19 official-SDK MCP reference tools over stdio and an authenticated Streamable HTTP prototype;
- one-time capability consumption, registered in-process executors and authoritative verifiers;
- signed receipts, outcome attestations and a hash-chained SQLite reference ledger;
- mismatch and inconclusive incidents with resource holds and single-instance restart recovery;
- an unpublished `n8n-nodes-palo-ai` 0.2 developer-preview package with decision-only and full-cycle nodes;
- a synthetic hands-on demonstration for the direct path, denied path, approval path, verified effect and wrong-effect incident.

#### Start here

| Goal | Start with |
| --- | --- |
| Understand the full assurance model | [`docs/palo-ai-full-cycle-assurance.md`](docs/palo-ai-full-cycle-assurance.md) |
| Integrate n8n or another adapter | [`docs/palo-ai-governance-integration-guide.md`](docs/palo-ai-governance-integration-guide.md) |
| Review what is specified, prototyped or implemented | [`agentic/capability-matrix.json`](agentic/capability-matrix.json) |
| Run the safe direct-vs-governed demonstration | [`examples/hands-on-demo/`](examples/hands-on-demo/) |
| Review n8n architecture and bypass boundaries | [`docs/palo-ai-n8n-governance-control-plane.md`](docs/palo-ai-n8n-governance-control-plane.md) |
| Inspect the MCP reference runtime | [`packages/palo-mcp-server/`](packages/palo-mcp-server/) |
| Build the local n8n alpha package | [`packages/n8n-nodes-palo-ai/`](packages/n8n-nodes-palo-ai/) |
| Propose an isolated design-partner evaluation | [PALO-AI design-partner issue](../../issues/new?template=palo-ai-design-partner.yml) |
| Challenge a contract or integration pattern | [PALO-AI feedback issue](../../issues/new?template=palo-ai-feedback.yml) |

#### Safe local check

```bash
npm ci
npm run opa:install
npm run validate:agentic
npm run demo:hands-on -- --auto-approve
```

Use synthetic data and unprivileged mock tools only. To demonstrate an action that is authorized but produces the wrong effect, restart the reference Gateway with a fresh preview data directory and run:

```bash
npm run demo:hands-on -- --auto-approve --wrong-effect
```

The expected result is a `mismatch` Outcome Attestation, an open Assurance Incident and a held resource—not a verified action.

#### Developer-preview boundary

PALO-AI v2.5 is not a production authorization service, an independently assessed security boundary, a compliance certification, an n8n-verified connector, a production identity or approval service, or a universal exactly-once executor. Shared bearer tokens, environment-provided HMAC keys, SQLite and in-process adapters are reference mechanisms. Use only isolated test data and non-consequential tools. Production adoption requires identity and RBAC, KMS/HSM custody, tenant isolation, durable distributed state, HA, backup and retention, connector attestation, observability and independent security and cryptographic assessment.

## Proposed repository navigation block

### Repository map for PALO-AI contributors

```text
schemas/                              Canonical governance contracts and fixtures
examples/policy-as-code/              Rego v1 reference policy and tests
packages/palo-mcp-server/             MCP, REST Gateway and reference assurance runtime
packages/n8n-nodes-palo-ai/           Unpublished n8n 0.2 developer-preview package
examples/hands-on-demo/               Direct-versus-governed assurance demonstration
examples/n8n-demo/                     Importable n8n developer-preview workflows
examples/agentic-interface/            MCP catalog and Dify/n8n adapter examples
agentic/capability-matrix.json         Evidence-based capability status
docs/palo-ai-full-cycle-assurance.md   Full lifecycle and production boundary
docs/palo-ai-governance-integration-guide.md
                                      Cross-platform integration and deployment guidance
docs/palo-ai-security-assurance-and-scale.md
                                      External assessment and scaling gates
docs/community/                        Community discussion and safe intake material
```

### Contribution routes

| Contribution | Expected evidence | Public route |
| --- | --- | --- |
| Contract feedback | Minimal redacted fixture and expected validation result | PALO-AI feedback issue |
| Policy improvement | Rego change, positive test and negative/fail-closed test | Pull request |
| Connector adapter | Threat boundary, credential path, retry model and disposable demo | Design discussion before PR |
| UX research | Role, task, prototype observation and cognitive-friction evidence | PALO-AI feedback issue |
| Security finding | Reproduction and impact shared privately | Repository security contact |
| Design-partner pilot | One non-production workflow, reversible action and success criteria | Design-partner issue |

## Proposed GitHub Discussion copy

### Title

Design review: one PALO-AI Governance Hub, two role-based views

### Body

We are exploring a role-based interaction layer for the PALO-AI v2.5 full-cycle developer preview.

The design premise is that executives and technical teams should not receive separate versions of governance truth. They should see the same Action Claims, policy decisions, approvals, receipts, outcome attestations and incidents at different levels of detail:

- an **Executive Cockpit** for exposure, assurance, accountable decisions and trends;
- a **Technical Workbench** for authority configuration, policy and Effect Contract design, topology review, simulation and evidence inspection.

The underlying v2.5 reference flow distinguishes **allowed** from **verified**. An action is verified only when a registered verifier observes authoritative post-state that satisfies the immutable Effect Contract. A mismatch or inconclusive result creates an incident and resource hold.

We would value concrete feedback on four questions:

1. Which five decisions must an executive view support without exposing technical implementation detail?
2. Which generated artifacts should a technical wizard create, and which should always require direct code review?
3. How should the interface show bypass paths and incomplete verification without creating a misleading single score?
4. Which safe, reversible workflow would best test comprehension and operational friction?

This is a design discussion, not a production release, certification or n8n verification request. The GUI is proposed. The current contracts and reference runtime are available for isolated evaluation with synthetic data and non-consequential tools.

Relevant starting points:

- `docs/palo-ai-full-cycle-assurance.md`
- `docs/palo-ai-governance-integration-guide.md`
- `agentic/capability-matrix.json`
- `examples/hands-on-demo/`

Please do not post credentials, production payloads, client names or confidential workflow exports. Report suspected security issues through the private security contact.

## Proposed issue template: Governance Hub UX feedback

Suggested path: `.github/ISSUE_TEMPLATE/palo-ai-governance-hub-ux.yml`

```yaml
name: PALO-AI Governance Hub UX feedback
description: Review the proposed Executive Cockpit or Technical Workbench using a safe scenario.
title: "[PALO-AI Hub UX] "
labels: ["palo-ai", "ux-feedback"]
body:
  - type: markdown
    attributes:
      value: |
        This interface is a proposal over a developer-preview runtime. Do not include credentials, personal data, client names, production payloads or confidential workflow exports.
  - type: dropdown
    id: view
    attributes:
      label: View reviewed
      options:
        - Executive Cockpit
        - Technical Workbench
        - Cross-view handoff
    validations:
      required: true
  - type: dropdown
    id: role
    attributes:
      label: Your working perspective
      options:
        - Executive or board advisor
        - Business or risk owner
        - Platform or automation engineer
        - Security engineer
        - Policy or governance specialist
        - Auditor or assurance reviewer
    validations:
      required: true
  - type: textarea
    id: task
    attributes:
      label: Decision or task attempted
      description: Describe the one decision you expected the interface to help you make.
    validations:
      required: true
  - type: textarea
    id: friction
    attributes:
      label: Cognitive or operational friction
      description: What was unclear, hidden, overly technical or unnecessarily slow?
    validations:
      required: true
  - type: textarea
    id: evidence
    attributes:
      label: Evidence you needed
      description: Which explanation, comparison, source state or raw artifact was missing?
  - type: textarea
    id: recommendation
    attributes:
      label: Smallest useful improvement
  - type: checkboxes
    id: safety
    attributes:
      label: Safety confirmation
      options:
        - label: I have not included secrets, personal data or production payloads.
          required: true
```

## Proposed issue template: Reproducible connector evaluation

Suggested path: `.github/ISSUE_TEMPLATE/palo-ai-connector-evaluation.yml`

```yaml
name: PALO-AI connector evaluation
description: Report a disposable n8n, Dify, MCP or custom-adapter evaluation.
title: "[PALO-AI connector] "
labels: ["palo-ai", "connector-evaluation"]
body:
  - type: markdown
    attributes:
      value: |
        Use synthetic data, a disposable environment and a mock or reversible action. Never include tokens, private URLs, personal data or production workflow exports.
  - type: dropdown
    id: platform
    attributes:
      label: Platform or client
      options:
        - n8n
        - Dify
        - MCP client
        - Custom REST adapter
        - Other
    validations:
      required: true
  - type: input
    id: versions
    attributes:
      label: Versions
      placeholder: PALO commit/package, platform version, deployment mode
    validations:
      required: true
  - type: textarea
    id: path
    attributes:
      label: Governance path tested
      placeholder: propose -> deny -> approval -> execute mock -> verify or mismatch
    validations:
      required: true
  - type: textarea
    id: bypass
    attributes:
      label: Credential and bypass review
      description: State whether any direct target credential or alternate execution path remained.
    validations:
      required: true
  - type: textarea
    id: result
    attributes:
      label: Result and redacted evidence
    validations:
      required: true
  - type: textarea
    id: failure
    attributes:
      label: Failure behavior tested
      description: Include unavailable policy, replay, stale state, wrong effect or recovery where possible.
  - type: checkboxes
    id: boundaries
    attributes:
      label: Evaluation boundaries
      options:
        - label: This test used no sensitive data or production credentials.
          required: true
        - label: I understand this developer preview is not a production authorization boundary.
          required: true
```

## Design-partner invitation copy

### Short repository callout

**Design partners wanted:** help evaluate one governed agentic action end to end. Bring a disposable workflow, a mock or reversible target and an accountable reviewer. We will test authority mapping, deny behavior, exact-claim approval, execution evidence, authoritative outcome verification and operator comprehension. No production credentials, personal data or consequential actions.

### Direct outreach version

Subject: Design review invitation — PALO-AI full-cycle governance for one safe workflow

PALO-AI v2.5 is an open developer preview exploring a governance control plane for agentic automation. We are inviting a small number of n8n builders, platform teams, security architects, OPA practitioners and governance specialists to evaluate one disposable workflow and one mock or reversible tool action.

The test distinguishes authorization from outcome assurance: the action becomes verified only when authoritative post-state satisfies its immutable Effect Contract. We also want to measure the friction this adds for builders, reviewers and executive risk owners.

This is not a production pilot, connector verification request or commercial endorsement. Participants should use synthetic data and no production credentials. In return, they receive a structured architecture session, a reproducible test plan and direct influence on the proposed Executive Cockpit and Technical Workbench.

If this fits your work, please open the PALO-AI design-partner issue with a redacted scenario and measurable success criteria.

## Maintainer response snippets

### Useful architecture feedback

Thank you. We have mapped this observation to the relevant trust boundary and capability status. Before treating the proposal as implemented, we will add a reproducible fixture, a negative or failure-path test and an explicit update to the capability matrix. Please keep the scenario synthetic and remove any environment-specific identifiers.

### Feature request that implies a production claim

This is a valuable target capability, but it is not supported by the current developer-preview evidence. We are recording it as specified until identity, enforcement, recovery and independent-assurance criteria are defined and tested. We will not describe it as production-ready based on interface behavior alone.

### Security-sensitive report

Thank you for flagging this. Please do not add exploit details, credentials or production data to this public thread. Use the repository's private security reporting channel so the maintainers can reproduce, assess and coordinate remediation safely.

## Repository claim checklist

Before merging public copy:

- use **developer preview**, not production platform;
- distinguish **allowed** from **verified**;
- distinguish an advisory node from an unavoidable execution boundary;
- say `n8n-nodes-palo-ai` is unpublished and not n8n-verified;
- identify the Governance Hub as an implemented mock-data prototype, not a connected or production control plane;
- do not call HMAC evidence tamper-proof outside the stated key boundary;
- do not imply biometric approval, exactly-once execution, tenant isolation or connector certification;
- link material status claims to `agentic/capability-matrix.json`;
- require synthetic data, reversible actions and private reporting of security issues.
