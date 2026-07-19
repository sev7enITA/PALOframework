# PALO-AI Security Assurance and Scale Plan

Status: external-assurance plan for the PALO-AI v2.4.1 developer preview, updated 17 July 2026.

## Recommendation

Use three independent review tracks. A penetration test alone is insufficient for an agentic governance control plane.

1. **Architecture and threat-model review** — an application/security architect with agentic AI, MCP, authorization systems and cloud identity experience.
2. **Cryptography and evidence review** — an applied cryptography specialist reviewing canonicalization, key custody, signature domains, rotation, replay controls and ledger claims.
3. **Adversarial implementation assessment** — an independent CREST-accredited or equivalently qualified application/cloud penetration-testing provider, plus focused agent/MCP abuse testing.

Open-source peer review through the [OWASP GenAI Agentic Security Initiative](https://genai.owasp.org/initiatives/agentic-security-initiative/) is valuable for research feedback, but it is not a substitute for a contracted independent assurance report.

## Who to shortlist

Select organizations or named practitioners that can demonstrate all of the following:

- recent API, OAuth/OIDC, multi-tenant SaaS and cloud control-plane assessments;
- MCP or agentic tool-use threat modelling, including confused deputy and indirect prompt-injection paths;
- authorization and policy-engine experience, preferably OPA/Rego;
- applied cryptography capability beyond automated TLS scanning;
- Node.js/TypeScript secure code review and container/supply-chain assessment;
- evidence handling suitable for remediation and later customer diligence;
- independence from the implementation team.

Use the [CREST Marketplace](https://www.crest-approved.org/) to identify accredited providers in Europe, then issue the same written scope to at least three candidates. Ask for named testers, sample redacted reports, retest terms, data handling, professional indemnity and explicit coverage of business-logic authorization flaws.

## Required scope

### Threat model

Model at least these trust boundaries and attackers:

- malicious or prompt-injected agent;
- compromised workflow author or low-code builder;
- unauthorized reviewer or approval-link recipient;
- tenant administrator abusing registry or policy privileges;
- direct client bypassing the visual PALO node;
- compromised MCP client/server, tool description or tool result;
- replaying, reordering or racing requests;
- compromised package, container, policy bundle or CI publisher;
- database, queue, backup and observability operators;
- cross-tenant and cross-environment confusion.

### Code and protocol review

- Action Claim normalization, schema validation and scope containment;
- default-deny and fail-closed behavior across every error path;
- OPA bundle provenance, digest pinning, rollback and decision-log handling;
- MCP authentication, authorization, session isolation, rate limits and tool minimization;
- approval state transitions, reviewer authority, edit semantics and one-time grants;
- idempotency, nonce, monotonic sequence and atomic execution consumption;
- evidence source authenticity, canonicalization, signatures and verification;
- SSRF, path traversal, injection, deserialization and resource exhaustion;
- npm/GitHub Actions provenance, SBOM, dependency and container security.

### Adversarial end-to-end tests

Run the required path:

```text
register -> deny -> approval -> execute -> sign -> persist -> verify
```

Then attack every transition: malformed claims, expired claims, changed arguments, stale policies, duplicate callbacks, concurrent consumption, direct executor calls, forged outcomes, key rotation, database recovery, network partitions and tenant identifier substitution.

## Reference frameworks

Use these as test catalogs, not as claims of certification:

- OWASP Top 10 for Agentic Applications and MCP security guidance;
- OWASP ASVS for the gateway, administration and approval applications;
- OWASP API Security Top 10 for all HTTP surfaces;
- NIST SP 800-53 / 800-63 principles for access, identity and audit design where relevant;
- MITRE ATLAS for AI attack scenarios;
- CIS Benchmarks for host, container and Kubernetes hardening;
- SLSA and signed provenance for build/release integrity;
- ISO/IEC 27001 and ISO/IEC 42001 as later management-system alignment, not immediate product certification.

## Evidence requested from the assessor

- system-specific threat model with data-flow diagrams and abuse cases;
- severity-ranked findings with reproducible proof and affected trust boundary;
- explicit statement of excluded components and environmental assumptions;
- cryptographic design memo and test vectors;
- multi-tenant isolation and authorization test report;
- remediation validation and retest letter;
- residual-risk register signed by the accountable owner;
- executive summary suitable for design partners without disclosing exploit detail.

## Security gates before scale

| Gate | Minimum evidence |
|---|---|
| Public developer preview | No secrets in repository; safe defaults; disclaimer; dependency and secret scans; abuse-reporting channel |
| External design partner | Threat model; tenant isolation; OIDC; per-environment keys; logging; backup restore; scoped DPA/test agreement |
| Production candidate | Independent code/architecture review; pen test and retest; KMS/HSM; HA/recovery exercise; incident runbooks |
| Multi-tenant GA | Cross-tenant test suite; SLOs/on-call; immutable audit export; supply-chain provenance; privacy/retention controls |
| Enterprise assurance | Recurring pen tests; vulnerability disclosure/SLA; customer evidence pack; management-system audits as demanded by market |

## Scaling ownership

Before the first production design partner, assign named owners for:

- product security and vulnerability triage;
- identity/RBAC and tenant architecture;
- policy registry and bundle promotion;
- cryptographic keys and evidence verification;
- reliability, backup/recovery and on-call;
- privacy, data residency and retention;
- connector conformance and platform-specific bypass analysis.

Do not open a public bug bounty while basic identity, tenant isolation and remediation capacity are immature. Start with a private, invitation-only disclosure program after the independent assessment and documented security contact/process are operational.

## Immediate next actions

1. Freeze a tagged assessment candidate and produce an SBOM plus architecture/data-flow pack.
2. Complete the seven blockers in the technical assessment.
3. Ask the OWASP Agentic Security community for a design review of the threat model, without representing it as certification.
4. Issue an RFP to three independent qualified providers for architecture/code/pen-test coverage.
5. Remediate, retest and publish a sanitized assurance statement before any production claim.
