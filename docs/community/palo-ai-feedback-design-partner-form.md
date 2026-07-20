# PALO-AI developer-preview feedback and design-partner intake

This document is the canonical, safe intake for the PALO-AI v2.5 full-cycle architecture preview. It can be used as a GitHub issue, a private form, or a facilitated interview. It is not a support or security-incident channel.

## Safety and scope

Please use only a disposable, non-production n8n instance and mock, synthetic or reversible tool actions. Do not submit credentials, API tokens, private keys, personal data, client names, proprietary workflow exports, production URLs or confidential policy. Redact screenshots and execution IDs before sharing them. Report a suspected security issue privately through the repository security contact instead of opening a public issue.

The preview is not a production authorization service, an unavoidable interception boundary, an n8n-verified connector or a compliance certification. The visual decision gate is advisory, and package 0.2's governed-action prototype is bypassable if direct credentials or tool routes remain. Production identity, authenticated approval delivery, non-bypassable connector isolation, distributed state, KMS/HSM key custody and certified connectors remain under development.

## Part A — Architecture feedback

1. **Perspective**
   n8n builder · AI/platform engineer · security engineer · governance/risk/compliance · researcher/policy author · other

2. **Pattern reviewed**
   Visual Governance Decision Gate · Governed Executor · Digest-Bound Human Approval · Workflow Admission · cross-cutting contracts/MCP

3. **Environment**
   n8n version and deployment mode (self-hosted/Docker/Desktop/other), PALO commit or package version, operating system, and whether the test used the local reference gateway. Never include secrets.

4. **Scenario**
   Describe the synthetic agent, the proposed operation, the mock or reversible target, and the expected policy outcome. Include a minimal redacted Action Claim if useful.

5. **Observation or gap**
   What was unclear, unsafe, difficult to integrate, surprising or missing? Please distinguish a contract issue, a node UX issue, a policy issue and a documentation issue.

6. **Evidence**
   Paste redacted logs, policy decision output, test steps or a screenshot. Remove tokens, personal data, hostnames and production identifiers.

7. **Recommendation**
   What change, test or n8n-native integration point would improve the result? What compatibility or failure-mode requirement should be added?

8. **Impact**
   Blocking · high · medium · low · unclear. Explain the consequence and who is affected.

## Part B — Design-partner proposal

1. **Role and team type**
   For example: platform engineer, internal automation team, security research group, consultancy, or policy team.

2. **Safe evaluation use case**
   One non-production agent workflow and one mock/reversible tool action. State what must never execute.

3. **Patterns and capabilities to evaluate**
   Authority profile and Action Claim mapping; OPA/Rego allow/deny behavior; approval-required flow; replay/idempotency handling; Effect Contract and outcome verification; evidence/ledger shape; n8n node ergonomics; MCP interoperability; workflow-admission analysis.

4. **Evaluation plan and success criteria**
   List the smallest reproducible test (for example: register → deny → approval → capability → execute mock action → verify authoritative outcome) and measurable outcomes such as decision correctness, effect-verification coverage, error handling, latency or operator comprehension.

5. **Integration constraints**
   n8n version, deployment topology, identity provider (if any), network restrictions, preferred transport and retention requirements. Do not provide credentials or sensitive topology details.

6. **Availability and collaboration**
   Preferred contact channel, time zone, approximate evaluation window and whether you can contribute a redacted fixture, policy test or node UX feedback. Participation is voluntary and can stop at any time.

7. **Boundaries confirmation**
   Confirm that the evaluation is non-production, uses no sensitive data or production credentials, and that PALO-AI remains advisory unless an independently reviewed enforcement boundary is deployed.

## What happens next

The maintainers acknowledge submissions, clarify reproduction steps, label the relevant contract or integration area, and publish aggregate learnings without identifying participants. A design-partner conversation starts with a short threat-model and test-plan review; it does not grant access to production systems or imply an n8n partnership, endorsement or verification.

For a public submission, use the repository templates:

- `/.github/ISSUE_TEMPLATE/palo-ai-feedback.yml`
- `/.github/ISSUE_TEMPLATE/palo-ai-design-partner.yml`
