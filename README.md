# PALO Framework

**Principled AI Lifecycle Orchestration**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![EU AI Act](https://img.shields.io/badge/EU%20AI%20Act-aligned-success)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
[![WCAG 2.1 AA target](https://img.shields.io/badge/WCAG%202.1-AA%20target-yellow)](https://www.w3.org/WAI/WCAG21/quickref/)
[![Website](https://img.shields.io/badge/Website-paloframework.org-21808D)](https://paloframework.org)
[![GitHub](https://img.shields.io/badge/GitHub-sev7enITA%2FPALOframework-black)](https://github.com/sev7enITA/PALOframework)

PALO is an open-source framework and toolkit for operational AI governance. It helps teams translate principles, laws, and standards into lifecycle decisions, risk assessments, evidence artifacts, KPIs/KRIs, and repeatable governance gates.

- Website: [paloframework.org](https://paloframework.org)
- Android: [P.A.L.O. Framework Toolbox on Google Play](https://play.google.com/store/apps/details?id=com.fabriziodegni.paloframework)
- iOS/iPadOS: [P.A.L.O. Framework Toolbox on the App Store](https://apps.apple.com/it/app/p-a-l-o-framework-toolbox/id6761771299)
- Documentation: [PALOFrameworkV2.pdf](PALOFrameworkV2.pdf), [PALO v1 paper](ThePALOFramework_%20A_Paradigm_for_Principled_AI_Lifecycle_OrchestrationInBusiness%20v1%20Feb%202026.pdf), and the interactive modules in this repository

---

## Overview

PALO (Principled AI Lifecycle Orchestration) is designed for organizations that need practical AI governance across the full lifecycle: ideation, risk classification, design, development, deployment, monitoring, incident response, and decommissioning.

The framework is aligned with major AI governance references including:

- EU AI Act
- ISO/IEC 42001 and ISO/IEC 42005
- NIST AI RMF
- OECD AI Principles
- UNESCO Recommendation on the Ethics of AI
- IMDA Model AI Governance Framework for Generative AI, where relevant to agentic AI

PALO is not a certification body and does not provide legal advice. It is a practical pre-screening, documentation, and governance support toolkit.

> **PALO-AI v2.5 full-cycle developer preview:** the reference runtime now separates permission from outcome assurance through Effect Contracts, one-time execution capabilities, signed receipts, authoritative post-state verification, incident holds and single-instance recovery. The Governance Hub is an implemented React/Vite interface prototype using illustrative local data. These components are for isolated evaluation: they are not a production authorization service, an unavoidable execution boundary, a compliance certification, or a replacement for organization-owned identity, access control, key management, monitoring, backup, retention, legal review and independent security assurance.

### PALO-AI for agentic automation platforms

> **PALO-AI is an emerging governance control plane for n8n and agentic automation platforms, designed to make authority, policy enforcement, human oversight and cryptographic evidence visible and enforceable.**

Start in the [guided PALO-AI Governance Hub](governance-hub/) to move from business intent to explicit authority through a white, role-adaptive interface. Use the [public governance overview](PALO_AIGovernance.html) for positioning, then choose the [code-first, no-code/low-code, or rapid-prototyping adoption path](docs/palo-ai-adoption-paths.md). The same contracts can be evaluated locally, through the online developer-preview endpoint, or against the documented hybrid/cloud target architecture.

n8n orchestrates what automation does. PALO governs whether an identified agent or automation is authorized to do it and whether the declared result is later verified. The integration combines four complementary patterns: a visible decision gate, a governed executor, digest-bound human approval, and workflow admission controls. Package 0.2 implements decision-gate and governed-execution prototypes; secure approval resume and instance-level admission remain specified capabilities. The package is unpublished and not n8n-verified.

- [PALO-AI n8n governance control-plane architecture](docs/palo-ai-n8n-governance-control-plane.md)
- [PALO-AI cloud reference architecture](docs/palo-ai-cloud-reference-architecture.md)
- [PALO-AI security assurance and scale plan](docs/palo-ai-security-assurance-and-scale.md)
- [PALO-AI community and market-entry plan](docs/palo-ai-community-and-market-entry.md)
- [Governance Hub product specification](docs/palo-ai-governance-hub-product-spec.md)
- [Governance Hub user guide](docs/palo-ai-governance-hub-user-guide.md)
- [Governance Hub workflow and diagram index](docs/palo-ai-governance-hub-workflows.md)
- [Governance Hub current status, production gaps and delivery waves](docs/palo-ai-governance-hub-status.md)
- [Presentation and launch playbook](docs/palo-ai-n8n-launch-playbook.md)
- [Current n8n developer-preview example](examples/agentic-interface/integrations/n8n/)
- [Installable n8n alpha package](packages/n8n-nodes-palo-ai/)
- [n8n alpha test report](docs/palo-ai-n8n-alpha-test-report.md)
- [Architecture preview publication status and staged release gates](docs/palo-ai-n8n-publication-status.md)
- [Four-pattern hero infographic](assets/palo-ai-n8n-scenarios/palo-ai-n8n-governance-hero.png)
- [Three-minute architecture-preview demo](media/palo-ai-n8n-architecture-preview-3min.mp4)
- [Evidence-based capability matrix](agentic/capability-matrix.json)
- [PALO-AI v2.5 technical and security assessment](docs/palo-ai-v2.5-technical-assessment.md)

## Why PALO?

| Governance challenge | PALO response |
| --- | --- |
| EU AI Act classification uncertainty | Risk Tiering Calculator and FRIA workflow |
| Fundamental rights documentation gaps | Interactive FRIA Assessment and evidence prompts |
| Weak traceability between principles and controls | Lifecycle gates, KPIs/KRIs, and evidence artifacts |
| Human agency erosion | Human Agency Risk Map and mitigation guidance |
| Hidden or deceptive model behavior | AuditBench Explorer and alignment self-assessment |
| Data poisoning and integrity risks | Poisoning Boomerang module and Article 10/15 guidance |
| AI-assisted development risks | AI Dev Governance extension for coding assistants and rapid prototyping |
| Agentic systems and delegated action | PALO-AM Agentic Governance Modality v2.0 |

## Current Modules

| Module | Description | Status |
| --- | --- | --- |
| [FRIA Assessment](PALO_FRIA.html) | Fundamental Rights Impact Assessment wizard for EU AI Act Article 27 preparation | Live |
| [Risk Tiering Calculator](PALO_RiskTiering.html) | EU AI Act risk classification workflow | Live |
| [KPI Generator](PALO_KPIGenerator.html) | AI governance metrics aligned with PALO dimensions | Live |
| [AI Model Canvas](PALO_ModelCanvasAI.html) | Visual planning canvas for responsible AI use cases | Live |
| [Framework Comparison](PALO_ComparisonTool.html) | Compare governance frameworks and standards | Live |
| [Human Agency Risk Map](PALO_HumanAgencyRiskMap.html) | Observatory on 18 activities humans increasingly delegate to AI | Live |
| [Human Agency Risk Map IT](PALO_HumanAgencyRiskMap_IT.html) | Italian version of the Human Agency observatory | Live |
| [2026 Tech Trends Observatory](PALO_TechTrends2026.html) | Analysis of major consulting-firm technology outlooks and governance blind spots | Live |
| [AuditBench Explorer](PALO_AuditBench.html) | Interactive exploration of 14 hidden AI behaviors from AuditBench with PALO mitigations | Live |
| [The Poisoning Boomerang](PALO_PoisoningStudy.html) | Data poisoning governance module with detection strategies and lifecycle controls | Live |
| [AI Dev Governance](PALO_VibeCoding.html) | Security and governance extension for AI-assisted software development environments | Live |
| [PALO-AM Agentic Governance](PALO_AgenticGovernance.html) | PALO extension for AI agents, delegated authority, action-space control, and agentic evidence | Live |
| [Mobile Toolbox](PALO_CompanionApp.html) | Mobile workspace overview for Android and iOS/iPadOS apps | Live |
| [Recognition and Sources](PALO_Recognition.html) | Public references, primary sources, and verification notes | Live |
| [PALO Assessment Path](PALO_AssessmentPath.html) | Guided route from risk tiering to contextual FRIA, controls, KPI/KRI, and a local evidence bundle | Live |
| [Regulatory Watch 2026](PALO_RegulatoryWatch.html) | Dated AI Act watchlist with Article 4, Article 50, high-risk milestones, and official sources | Live |
| [Documentation Hub](PALO_DocumentationHub.html) | Web-native lifecycle documentation, module index, primary documents, and source links | Live |
| [Platform Map](PALO_PlatformMap.html) | Operational status, stakeholder-intent routes, modules, artifacts, research boundaries, and accessible table navigation | Live |
| [Operationalization Explorer / Stakeholder Onboarding](designs/theory-to-practice-infographic/) | Three-step local stakeholder routing into the six-phase weighted workflow and interactive 3D knowledge graph | Live |

## Mobile Toolbox

The P.A.L.O. Framework Toolbox brings the core governance tools to mobile:

- Android: [Google Play](https://play.google.com/store/apps/details?id=com.fabriziodegni.paloframework)
- iOS/iPadOS: [App Store](https://apps.apple.com/it/app/p-a-l-o-framework-toolbox/id6761771299)

The app is designed as a privacy-first mobile workspace for contextual AI governance work. Store listings describe offline use, local-first operation, no data collection, and mobile features such as Evidence Vault, biometric protection, PDF report generation, and direct access to PALO web modules.

## Recent Releases

| Date | Release | Highlights |
| --- | --- | --- |
| 2026-07-18 | v2.5.0 - Full-Cycle Agentic Assurance | Effect Contracts, one-time execution capabilities, trusted receipts, authoritative outcome attestations, held assurance incidents, crash recovery, and the n8n Governed Action preview |
| 2026-07-17 | v2.4.1 - PALO-AI Developer Preview | Versioned agentic contracts, reference MCP transports, draft Rego v1 policies, prototype approval and evidence flows, and non-production n8n/Dify examples |
| 2026-07-12 | v2.4.0 - Reliable Operational Evidence | Deterministic publication, local evidence workflows, P2 adoption foundations, the public Platform Map, and Explorer navigation mode |
| 2026-07-11 | v2.3.2 - Stakeholder Onboarding | Three plain-language questions, deterministic stakeholder routes, local JSON/Markdown export, guided handoff into the weighted workflow and 3D operational graph, plus cross-page module and Companion App coherence fixes |
| 2026-07-11 | v2.3.1 - Theory to Practice | Dedicated operating loop connecting all core PALO modules to concrete decisions, controls, KPI/KRI, evidence, and review outputs |
| 2026-07-11 | v2.3.0 - Workspace UI Refresh | New PolicyWatcher-inspired command bar, workspace hero, mobile navigation, compact footer, shared Community shell, and removal of non-essential compliance badges from the main UI |
| 2026-07-11 | v2.2.1 - PolicyWatcher Ecosystem Link | Added PolicyWatcher as a cited external monitoring companion for public policy changes, source QA, methodology, and post-deployment context |
| 2026-07-11 | v2.2.0 - Guided Assessment and Evidence Hub | Start Here entries, Assessment Path with local JSON/Markdown evidence bundle export, Regulatory Watch 2026, Documentation Hub, unified v2.1 shell, and Proof & Community media kit |
| 2026-07-11 | v2.1.0 - Regulatory Readiness and Trust Foundations | Article 27/50 wording review, accessibility status, privacy/security policy refresh, public recognition page, SEO metadata and sitemap alignment |
| 2026-06-22 | v2.0.1 - Documentation Sync | README roadmap, CHANGELOG, homepage changelog, RSS and release metadata aligned |
| 2026-06-22 | v2.0.0 - PALO-AM | Agentic Governance Modality for AI agents: identity, authority, risk matrix, control layer, evidence layer, action-space/autonomy matrix, KPI/KRI registry |
| 2026-05-15 | v1.8.0 - AI Dev Governance | Governance extension for AI-assisted software development, rapid prototyping, vibe coding, coding assistants, controlled environments, and evidence trails |
| 2026-04-08 | v1.7.1 - iOS/iPadOS App | App Store release for iPhone and iPad with Evidence Vault, biometric protection, PDF reports, and direct access to PALO web modules |
| 2026-03-25 | v1.7.0 - Poisoning Boomerang | Data poisoning module covering Miasma, Nepenthes, Nightshade, Glaze, Cloudflare AI Labyrinth, AttackAI, detection strategies, and EU AI Act Article 10/15 implications |
| 2026-03-12 | v1.6.0 - Android App | Google Play release of the offline, privacy-first P.A.L.O. Framework Toolbox |
| 2026-03-03 | v1.5.0 - AuditBench Explorer | Interactive analysis of 14 hidden behaviors and alignment auditing techniques |

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## Recognition And Public References

PALO has been discussed in public AI governance and responsible innovation contexts, including:

- A Reuters-distributed announcement referenced by the [World AI Council](https://www.linkedin.com/posts/world-ai-council_at-the-world-ai-council-we-are-incredibly-activity-7438233663349133312-9akN)
- Coverage of the P.A.L.O. Framework Toolbox 2.0 and Human Economic Forum context by [Rivista AI](https://www.rivista.ai/2026/03/25/p-a-l-o-framework-toolbox-2-0-governance-in-your-pocket-o-lillusione-portatile-del-controllo-algoritmico/)
- Reference to "The PALO Framework for AI Corporate Governance" in the 2026 special issue index of [Rivista Corporate Governance](https://images.rivistacorporategovernance.it/f/indici/NumeroStraordinario_2026_tUAZh_RCG.pdf)

These references are useful context, but the repository remains the source for the open toolkit and implementation artifacts.

## Quick Start

### Use the live website

Open the [PALO Stakeholder Onboarding](https://paloframework.org/designs/theory-to-practice-infographic/#onboarding). Three questions identify one practical next action, the artifact it produces, and the relevant PALO modules. Experienced users can still open any module directly from [paloframework.org](https://paloframework.org).

### Run locally

The website remains static. The optional, non-production PALO-AI reference runtime uses Node.js 20+ and OPA.

```bash
git clone https://github.com/sev7enITA/PALOframework.git
cd PALOframework
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also open `index.html` directly in a browser, although serving locally is recommended for consistent asset behavior.

### Evaluate the PALO-AI reference runtime

The commands below are for isolated development and testing only. Do not connect this preview to production agents, sensitive data, privileged tools, or consequential decisions.

Remote n8n and MCP clients must use the [PALO-AI Online VPS Deployment](docs/palo-ai-vps-deployment.md), which exposes authenticated HTTPS endpoints while keeping OPA on a private container network. The `127.0.0.1` commands below are only a laptop-development option.

```bash
npm ci
npm run opa:install
export PALO_OPA_URL=http://127.0.0.1:8181
export PALO_HMAC_KEYS_JSON='{"key-support-2026":"replace-with-a-secret-from-your-secret-manager"}'
npm run palo:mcp
```

For the non-production Dify or n8n examples, start the localhost gateway in a separate process. The bearer token is only a coarse developer control: it does not provide principal identity, role separation, administrative authorization, reviewer authentication, or production secret lifecycle. Do not commit these values or expose the gateway publicly.

```bash
export PALO_GATEWAY_TOKEN='replace-with-at-least-24-random-characters'
npm run palo:gateway
```

The canonical contracts are under `schemas/`; executable runtime code is under `packages/palo-mcp-server/`; the synchronized MCP catalog and connector examples are under `examples/agentic-interface/`.

## Repository Structure

```text
PALOframework/
|-- index.html                         # Homepage
|-- PALO_FRIA.html                     # FRIA Assessment
|-- PALO_RiskTiering.html              # EU AI Act Risk Tiering Calculator
|-- PALO_KPIGenerator.html             # KPI Generator
|-- PALO_ModelCanvasAI.html            # AI Model Canvas
|-- PALO_ComparisonTool.html           # Governance framework comparison
|-- PALO_HumanAgencyRiskMap.html       # Human Agency Observatory (EN)
|-- PALO_HumanAgencyRiskMap_IT.html    # Human Agency Observatory (IT)
|-- PALO_TechTrends2026.html           # 2026 Tech Trends Observatory
|-- PALO_AuditBench.html               # AuditBench Explorer
|-- PALO_PoisoningStudy.html           # Data Poisoning Governance module
|-- PALO_VibeCoding.html               # AI-assisted development governance
|-- PALO_AgenticGovernance.html        # PALO-AM Agentic Governance
|-- PALO_CompanionApp.html             # Mobile app landing page
|-- PALO_Community.html                # Community and open collaboration
|-- PALO_Recognition.html              # Public references and source notes
|-- PALO_AssessmentPath.html           # Guided assessment and evidence bundle export
|-- PALO_RegulatoryWatch.html           # Dated regulatory watchlist and sources
|-- PALO_DocumentationHub.html          # Web-native documentation index
|-- PALO_PlatformMap.html               # Operational platform status and navigation map
|-- designs/
|   +-- theory-to-practice-infographic/ # Stakeholder onboarding, weighted workflow, and 3D Explorer
|-- AppStoreListing.md                 # Store listing copy and source notes
|-- PALOFrameworkV2.pdf                # Framework v2 documentation
|-- ThePALOFramework_*.pdf             # PALO v1 paper
|-- assets/                            # Static assets and templates
|-- framework/                         # Framework documentation archive
|-- insights/                          # Research sources and supporting material
|-- json/                              # Canvas/data exports
|-- sitemap.xml                        # Search sitemap
|-- feed.xml                           # RSS feed
|-- accessibility.html                 # Accessibility statement
|-- privacy-policy.html                # Privacy policy
|-- security-policy.html               # Security policy
|-- README.md
|-- CHANGELOG.md
|-- CONTRIBUTING.md
|-- CODE_OF_CONDUCT.md
|-- SECURITY.md
+-- LICENSE
```

## Documentation

The [Documentation Hub](PALO_DocumentationHub.html) is the web-native entry point for the lifecycle, modules, source set, and contribution links. It is designed to be readable and indexable; the PDF remains the stable primary download record.

Primary framework documents and artifacts:

- [PALOFrameworkV2.pdf](PALOFrameworkV2.pdf)
- [The PALO Framework v1 paper, Feb 2026](ThePALOFramework_%20A_Paradigm_for_Principled_AI_Lifecycle_OrchestrationInBusiness%20v1%20Feb%202026.pdf)
- [PALO-AM Agentic Governance page](PALO_AgenticGovernance.html)
- [PALO-AI Governance Integration Guide](docs/palo-ai-governance-integration-guide.md)
- [PALO-AI v2.5 Technical and Security Assessment](docs/palo-ai-v2.5-technical-assessment.md)
- [PALO-AI v2.4.1 Technical Assessment](docs/palo-ai-v2.4.1-technical-assessment.md) — retained as the original preview baseline
- [PALO-AI Online VPS Deployment](docs/palo-ai-vps-deployment.md)
- [PALO-AM standalone document](insights/PALO-AM_Agentic_Governance_Modality_v2_Standalone_Document.docx)
- [FRIA worksheet](assets/FRIA09-12_new.xlsx)
- [PALO Canvas JSON template](json/palo-canvas-2025-12-17.json)
- [PALO Assessment Path](PALO_AssessmentPath.html) for a guided local evidence bundle
- [Regulatory Watch 2026](PALO_RegulatoryWatch.html) for dated official-source checks

## Related Ecosystem

[PolicyWatcher](https://www.policywatcher.online/) is a separate civic-tech portal by Fabrizio Degni for monitoring public privacy policies and terms of service, mapping policy changes, and exposing methodology and source-quality context. It complements the PALO lifecycle at Deployment and Monitoring, but it is not a PALO module, legal certification, or replacement for official sources.

Assessment Path can import a versioned `palo-policywatcher-signal` JSON file locally. The complete observation is preserved as a non-authoritative monitoring source pending human review; no assessment or Case File data is submitted to PolicyWatcher.

- [PolicyWatcher Observatory](https://www.policywatcher.online/observatory)
- [PolicyWatcher Timeline](https://www.policywatcher.online/timeline)
- [PolicyWatcher Confidence Methodology](https://www.policywatcher.online/methodology/confidence)
- [PolicyWatcher Trust and Quality](https://www.policywatcher.online/trust)
- [Local PolicyWatcher signal schema](schemas/policywatcher-signal.schema.json)

## Contributing

Contributions are welcome. Useful areas include:

- Improving regulatory mappings and citations
- Reviewing controls and KPIs/KRIs
- Adding examples and worked case studies
- Translating modules
- Improving accessibility and mobile behavior
- Adding tests/checklists for generated reports

Please read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md) before opening issues or pull requests.

## Roadmap

Current baseline: v2.5 full-cycle developer preview, released 2026-07-18. It adds Effect Contracts, governed execution, trusted receipts, authoritative outcome verification, incident holds and tested single-instance recovery to the v2.4.1 contracts and policy foundation.

Completed in H1 2026:

| Area | Status |
| --- | --- |
| Human Agency Risk Map | Complete |
| 2026 Tech Trends Observatory | Complete |
| Community and open collaboration page | Complete |
| AuditBench Explorer | Complete |
| Android mobile toolbox | Complete |
| iOS/iPadOS mobile toolbox | Complete |
| Poisoning Boomerang module | Complete |
| AI-assisted development governance extension | Complete |
| PALO-AM Agentic Governance Modality v2.0 | Complete |
| Documentation and release hygiene sync | Complete |
| Regulatory readiness and trust foundations | Complete |
| Guided assessment and evidence hub | Complete |
| Workspace UI and navigation refresh | Complete |
| Theory-to-practice operating loop | Complete |
| Stakeholder onboarding and Operationalization Explorer | Complete |
| Release reliability foundation | Complete |
| Operational platform and research map | Complete |
| PALO-AI contracts and reference runtime | Developer preview |
| PALO-AI full-cycle assurance and Governance Hub | Developer preview |

Planned roadmap:

| Target | Focus | Planned scope |
| --- | --- | --- |
| v2.6 | Identity, durability and validated connectors | Identity-aware BFF, workload identity, scoped RBAC, managed key custody, durable state/queues and fresh n8n connector validation |
| v2.7 | Evidence and governance board packs | Board templates, decision logs, KPI/KRI registers, review packets and audit-ready summaries built on verified outcomes |
| v3.0 | Production integration layer | Independently assessed deployment patterns and integrations for enterprise workflows, issue trackers, GRC platforms and documentation systems |

Exploratory items:

- HarmonyOS Next feasibility for the mobile toolbox
- Mobile push delivery for remote approval requests; the current runtime supports MCP and authenticated local-gateway approval resolution without claiming a remote notification service
- Lightweight test suites for generated governance reports and evidence exports

## Disclaimer

PALO is an educational, governance-support, and pre-screening toolkit. It does not provide legal advice, does not certify compliance, and does not replace professional legal, technical, security, or conformity-assessment review.

PALO-AI v2.5 is explicitly non-production. `Allowed` records a policy decision; only a matching authoritative outcome may be labelled `verified`, and even that does not certify that an action was safe or lawful. Deployers remain responsible for independent threat modelling, authenticated identities and roles, least privilege, policy ownership, connector idempotency, trusted approval context, key custody and rotation, observability, incident response, backup, retention and validation against their real tools and environments.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Contact

- Website: [paloframework.org](https://paloframework.org)
- Email: contact@paloframework.org
- GitHub: [sev7enITA/PALOframework](https://github.com/sev7enITA/PALOframework)
