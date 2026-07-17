# PALO-AI Community and Market-Entry Plan

Status: staged communication plan for the PALO-AI v2.4.1 developer preview, updated 17 July 2026.

## Positioning

Use this sentence consistently:

> **PALO-AI is an emerging governance control plane for n8n and agentic automation platforms, designed to make authority, policy enforcement, human oversight and cryptographic evidence visible and enforceable.**

Immediately qualify it: v2.4.1 is a developer preview. The current n8n package is an optional visual decision gate, unpublished and unverified. Governed execution, secure one-time approval resume and workflow admission remain target capabilities.

## Sequence

### Stage 1 — architecture discussion

Publish the prepared [n8n community discussion draft](community/n8n-architecture-preview-post.md) in the n8n Community forum as a request for architectural feedback, not verification.

Ask three precise questions:

1. Should the public node be a thin integration to one PALO service while native Switch/Wait nodes retain flow control?
2. Which real but reversible workflow should become the first design-partner test?
3. For self-hosted n8n, where should workflow admission live without competing with native enterprise controls?

Include the architecture page, three-minute demo, alpha evidence, capability matrix and a prominent non-production disclaimer. Do not include tokens, VPS administrative routes or claims of n8n endorsement.

### Stage 2 — design partners

Recruit 3–5 partners from these groups:

- n8n consultants and self-hosted platform operators;
- AI automation teams with a reversible internal workflow;
- security architects working on agent/tool authorization;
- OPA/Rego practitioners;
- Copilot Studio, Dify or LangGraph builders who can compare adapter behavior.

Use the [design-partner intake](community/palo-ai-feedback-design-partner-form.md). Require synthetic or low-risk data, an accountable owner, an explicit bypass review and permission before publishing any result.

### Stage 3 — installable alpha evidence

Before npm publication:

- redesign the node as one-service PALO operations, not a generic router;
- pass `npx @n8n/scan-community-package` and package tests;
- test clean install, upgrade, downgrade and uninstall on supported n8n releases;
- run `n8n audit` before and after installation;
- publish checksum, SBOM, exact compatibility range and known limitations;
- complete a real end-to-end workflow with brokered mock execution and recovery.

### Stage 4 — npm and n8n review

n8n's current submission process requires an npm community package and, for verification submissions after 1 May 2026, publication from GitHub Actions with provenance. Submission is made through the n8n Creator Portal. n8n also states that logic/flow-control nodes are not currently accepted and that a package should integrate exactly one third-party service.

Therefore:

1. publish only after real alpha tests and security gates;
2. use GitHub Actions trusted publishing/provenance, not a local npm publish;
3. submit a thin PALO service integration through the [Creator Portal](https://creators.n8n.io/);
4. state that acceptance is discretionary and must not be promised;
5. keep self-hosted admission/enforcement as a separate optional enterprise/open integration, not hidden inside the public community node.

Official references:

- [n8n verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/)
- [submit community nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/)
- [community-node risks](https://docs.n8n.io/integrations/community-nodes/risks/)
- [n8n security audit](https://docs.n8n.io/hosting/securing/security-audit/)

## Channels and message

| Audience | Channel | Message / asset | Ask |
|---|---|---|---|
| n8n builders | n8n Community | Four-pattern architecture, real canvas screenshot, demo video | Validate node shape and bypass assumptions |
| OPA practitioners | OPA community / GitHub | Rego input, bundle roadmap, decision evidence | Review policy distribution and attestation model |
| Agent security researchers | OWASP GenAI Agentic Security Initiative | Threat model and Action Claim contract | Challenge abuse cases and MCP boundary |
| Microsoft builders | Copilot Studio / Power Platform community | Narrow Streamable HTTP MCP route | Test tool selection, data policy and maker UX |
| Developers | GitHub Discussions, release notes | Contracts, examples, capability matrix | Run conformance fixtures and file issues |
| Broader market | LinkedIn, article, conference lightning talk | “Visible governance is not yet enforcement” narrative | Recruit design partners, not buyers |

Defer Product Hunt, paid campaigns and broad press until there is a stable hosted onboarding flow, documented service levels and at least two independently publishable design-partner results.

## Content package

- Central page: `PALO_AIGovernance.html`
- Four-pattern hero infographic and workflow screens
- Three-minute architecture-preview video with captions
- Three-outcome n8n demo
- Capability matrix with evidence-based statuses
- Technical assessment and cloud/security roadmaps
- A 90-second live demo: Denied -> Approval Required -> Allowed, with the bypass boundary explained

## Success measures

For the first 60 days measure learning, not vanity reach:

- 10 qualified architecture responses;
- 3 design partners with written scope;
- 2 independently reproduced installations;
- 1 external threat-model review;
- 0 unresolved critical secret or authorization findings;
- documented changes made because of community feedback;
- a go/no-go decision for npm publication and Creator Portal submission.

## Claims checklist

Always say:

- developer preview;
- unpublished/unverified n8n alpha;
- isolated test data and reversible actions only;
- current enforcement scope and bypass paths;
- production capabilities remain gated by independent assurance.

Never say:

- n8n certified, verified, partnered or endorsed;
- production-ready or exactly-once;
- cryptographically tamper-proof without the stated key/anchor boundary;
- biometric approval unless a verified biometric identity/signature flow actually exists;
- universal interception across third-party platforms.

## Website modernization note

The legacy homepage currently loads Tailwind through the browser CDN and should be migrated to a compiled, allowlisted local stylesheet before the website itself is presented as a production-hardened delivery surface. This does not affect the standalone PALO-AI page, which uses the local shared PALO stylesheet, but it remains a website supply-chain and performance cleanup item.
