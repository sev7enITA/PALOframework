# PALO Framework

**Principled AI Lifecycle Orchestration**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![EU AI Act](https://img.shields.io/badge/EU%20AI%20Act-aligned-success)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
[![WCAG 2.2 AA target](https://img.shields.io/badge/WCAG%202.2-AA%20target-yellow)](https://www.w3.org/TR/WCAG22/)
[![Website](https://img.shields.io/badge/Website-paloframework.org-21808D)](https://paloframework.org)
[![GitHub](https://img.shields.io/badge/GitHub-sev7enITA%2FPALOframework-black)](https://github.com/sev7enITA/PALOframework)

## Start here: PALO Evidence Pack

**Allowed is not verified.** Give PALO one AI use case. Leave with a traceable, reviewable evidence dossier and a local validation receipt in less than ten minutes.

### [Run the preloaded Evidence Pack case](https://paloframework.org/PALO_AssessmentPath.html?sample=agentic-invoice#assessment-form)

### [Ask PALO and find an accountable route](https://paloframework.org/PALO_Guide.html)

No account. No mandatory telemetry. Your answers stay in the browser and export is voluntary. The receipt proves local schema checks and digest binding; it is not certification, legal advice, production approval or independent assurance.

From a clone:

```sh
npm run evidence:validate
```

The [starter pack](evidence-pack/README.md) includes three schema-valid gold cases. Use `npm run case:contribute -- --help` to generate a community case, validate it and prepare its pull request body.

PALO is an open-source framework and toolkit for operational AI governance. It helps teams translate principles, laws, and standards into lifecycle decisions, risk assessments, evidence artifacts, KPIs/KRIs, and repeatable governance gates.

**Naming convention:** PALO is the canonical project brand. The punctuated form `P.A.L.O.` is retained only where it is part of an existing publication or mobile-store title.

- Website: [paloframework.org](https://paloframework.org)
- Android: [P.A.L.O. Framework Toolbox on Google Play](https://play.google.com/store/apps/details?id=com.fabriziodegni.paloframework)
- iOS/iPadOS: [P.A.L.O. Framework Toolbox on the App Store](https://apps.apple.com/it/app/p-a-l-o-framework-toolbox/id6761771299)
- Documentation: [PALOFrameworkV2.pdf](PALOFrameworkV2.pdf), [PALO v1 paper](ThePALOFramework_%20A_Paradigm_for_Principled_AI_Lifecycle_OrchestrationInBusiness%20v1%20Feb%202026.pdf), and the interactive modules in this repository

---

## Cite PALO

PALO is both an open-source governance framework and a published research artifact. GitHub citation metadata are maintained in [`CITATION.cff`](CITATION.cff), which provides the preferred academic citation for the framework.

**Preferred research citation**

> Degni, F. (2026). *Il Framework PALO per la Corporate Governance dell'IA: un paradigma per l'orchestrazione del ciclo di vita dell'Intelligenza Artificiale basato su principi in ambito aziendale*. Rivista Corporate Governance, Numero Straordinario 2026. G. Giappichelli Editore. ISSN 2724-1068 / EISSN 2784-8647.

- [Cite this repository](CITATION.cff)
- [Published paper and recognition sources](PALO_Recognition.html)
- [PALO v1 research paper in the repository](ThePALOFramework_%20A_Paradigm_for_Principled_AI_Lifecycle_OrchestrationInBusiness%20v1%20Feb%202026.pdf)

---

## Overview

PALO (Principled AI Lifecycle Orchestration) is designed for organizations that need practical AI governance across system-lifecycle activities such as ideation, risk classification, design, development, deployment, monitoring, incident response, and decommissioning. Across those activities, the canonical v3 governance decision loop uses six repeatable phases: **Frame, Classify, Assess, Control, Measure, and Prove & Review**. The eight system activities and six governance phases are complementary views, not competing lifecycle definitions.

The framework is aligned with major AI governance references including:

- EU AI Act
- ISO/IEC 42001 and ISO/IEC 42005
- NIST AI RMF
- OECD AI Principles
- UNESCO Recommendation on the Ethics of AI
- IMDA Model AI Governance Framework for Generative AI, where relevant to agentic AI

PALO is not a certification body and does not provide legal advice. It is a practical pre-screening, documentation, and governance support toolkit.

> **PALO v3.1.0 governance control plane:** the v3 semantic foundation now binds twelve applicability-aware control packs, 31 controls, 38 indicators, conditional lifecycle gates and ten evidence-contract families. The packs cover fairness, system cards, affected-person rights, Article 50, data lifecycle, GPAI, serious incidents, accessibility, environment, AI literacy, ISO/IEC 42001 and the PALO-AI production boundary. See the [v3.1 governance control-plane guide](docs/palo-v3.1-governance-control-plane.md) and [semantic foundation](docs/palo-v3-semantic-foundation.md).

> **PALO-AI v2.7 developer preview:** Action Claim 1.4 binds agent authority to current Data Fitness Decisions and signed Data Disclosure Contracts. The runtime imports payload-minimized catalog/observability evidence, registers AI systems and agent relationships, verifies rows/fields/provider/region/tracing against signed disclosure receipts, invalidates stale decisions on assurance signals and opens held incidents on mismatch. It retains OIDC/JWKS, one-time capabilities, authoritative outcome verification and the strict production-admission denial because SQLite, storage tenancy, managed keys, distributed durability, non-bypassable connectors and independent assurance remain incomplete.

### PALO-AI for agentic automation platforms

PALO is the umbrella governance system across the AI lifecycle. Its public entry routes now begin with the problem to solve:

1. **Govern the AI lifecycle** with the complete PALO Framework and its guided lifecycle tools.
2. **Govern agentic systems** with PALO-AM, the agentic governance modality inside PALO.
3. **Enforce agent actions** with PALO-AI, the technical control-plane Developer Preview that operationalizes selected PALO-AM controls.

Use the [homepage governance map](index.html#palo-governance-routes) to choose among these connected routes.

> **PALO-AI is an emerging governance control plane for n8n and agentic automation platforms, designed to make authority, policy enforcement, human oversight and cryptographic evidence visible and enforceable.**

Start with [Why PALO-AI](PALO_AIWhy.html) for the high-level full-cycle assurance case, then choose a [code-first, n8n/no-code, or Copilot Studio/MCP quickstart](PALO_AIQuickstarts.html). The [cognitive Stakeholder Onboarding](designs/theory-to-practice-infographic/) chooses an organizational role and objective. The "Govern agent actions" option adds a conditional build-mode question without replacing accountability. Continue in the [guided PALO-AI Governance Hub](governance-hub/) or use the [public Agentic Governance overview](PALO_AIGovernance.html) to connect PALO-AM methodology, PALO-AI runtime contracts, the role-based prototype and capability/readiness evidence.

n8n orchestrates what automation does. PALO governs whether an identified agent or automation is authorized to do it and whether the declared result is later verified. The integration combines four complementary patterns: a visible decision gate, a governed executor, digest-bound human approval, and workflow admission controls. Package 0.2 implements decision-gate and governed-execution prototypes; secure approval resume and instance-level admission remain specified capabilities. The package is unpublished and not n8n-verified.

- [PALO-AI n8n governance control-plane architecture](docs/palo-ai-n8n-governance-control-plane.md)
- [Why PALO-AI: interactive full-cycle comparison](PALO_AIWhy.html)
- [PALO-AI quickstarts: code, n8n and Copilot Studio/MCP](PALO_AIQuickstarts.html)
- [PALO-AI cloud reference architecture](docs/palo-ai-cloud-reference-architecture.md)
- [PALO-AI security assurance and scale plan](docs/palo-ai-security-assurance-and-scale.md)
- [PALO Data Assurance Control Plane and Actian Context Bridge](docs/palo-data-assurance-control-plane.md)
- [PALO-AI community and market-entry plan](docs/palo-ai-community-and-market-entry.md)
- [Governance Hub product specification](docs/palo-ai-governance-hub-product-spec.md)
- [Governance Hub user guide](docs/palo-ai-governance-hub-user-guide.md)
- [Governance Hub workflow and diagram index](docs/palo-ai-governance-hub-workflows.md)
- [Governance Hub current status, production gaps and delivery waves](docs/palo-ai-governance-hub-status.md)
- [Presentation and launch playbook](docs/palo-ai-n8n-launch-playbook.md)
- [Current n8n developer-preview example](examples/agentic-interface/integrations/n8n/)
- [PALO + Microsoft AGT ACS interoperability proposal](examples/agentic-interface/integrations/microsoft-agt/)
- [Installable n8n alpha package](packages/n8n-nodes-palo-ai/)
- [n8n alpha test report](docs/palo-ai-n8n-alpha-test-report.md)
- [Architecture preview publication status and staged release gates](docs/palo-ai-n8n-publication-status.md)
- [Four-pattern hero infographic](assets/palo-ai-n8n-scenarios/palo-ai-n8n-governance-hero.png)
- [Three-minute architecture-preview demo](media/palo-ai-n8n-architecture-preview-3min.mp4)
- [Evidence-based capability matrix](agentic/capability-matrix.json)
- [Public Production Readiness route](PALO_AIProductionReadiness.html)
- [PALO 3.1 and PALO-AI 2.7 release verification record](PALO_VerificationNote.html)
- [PALO v3.1 governance control-plane implementation](docs/palo-v3.1-governance-control-plane.md)

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
| [PALO Evidence Pack](PALO_AssessmentPath.html?sample=agentic-invoice#assessment-form) | Less-than-ten-minute local route from one AI use case to a reviewable dossier and voluntary validation receipt; built on Assessment Path | Live |
| [Regulatory Watch 2026](PALO_RegulatoryWatch.html) | Dated AI Act watchlist with Article 4, Article 50, high-risk milestones, and official sources | Live |
| [Documentation Library](PALO_DocumentationLibrary.html) | Searchable HTML documentation with Start, Guide and Reference depth plus audience, task, product and maturity metadata | Live |
| [Platform Map](PALO_PlatformMap.html) | Operational status, stakeholder-intent routes, modules, artifacts, research boundaries, and accessible table navigation | Live |
| [Release Verification Record](PALO_VerificationNote.html) | Source revision, CI run, automated validation totals, tagged artifact checksum and maturity limits for the PALO 3.1 / PALO-AI 2.7 baseline | Live |
| [Operationalization Explorer / Stakeholder Onboarding](designs/theory-to-practice-infographic/) | Three-step local stakeholder routing into the six-phase weighted workflow and interactive 3D knowledge graph | Live |
| [PALO v3 Semantic Foundation](docs/palo-v3-semantic-foundation.md) | Versioned semantic spine, lifecycle and gate history, atomic evidence contracts, mappings, RDF/SHACL and digest-bound release inventory | Live |
| [PALO v3.1 Governance Control Plane](docs/palo-v3.1-governance-control-plane.md) | Twelve applicability-aware control packs with completion levels, canonical controls, indicators, gates, evidence schemas, stop conditions and residual boundaries | Live |

## Mobile Toolbox

The P.A.L.O. Framework Toolbox brings the core governance tools to mobile:

- Android: [Google Play](https://play.google.com/store/apps/details?id=com.fabriziodegni.paloframework)
- iOS/iPadOS: [App Store](https://apps.apple.com/it/app/p-a-l-o-framework-toolbox/id6761771299)

The app is designed as a privacy-first mobile workspace for contextual AI governance work. Store listings describe offline use, local-first operation, no data collection, and mobile features such as Evidence Vault, biometric protection, PDF report generation, and direct access to PALO web modules.

## Recent Releases

| Date | Release | Highlights |
| --- | --- | --- |
| 2026-08-25 | PALO-AI v2.7.0 - Data Assurance Control Plane | Action Claim 1.4, payload-minimized context evidence, purpose-bound Data Fitness Decisions, signed Disclosure Contracts and Receipts, AI System Registry, tenant-bound MCP operations, continuous invalidation and fail-closed disclosure incidents; non-production developer preview |
| 2026-08-23 | v3.1.0 - Governance Control Plane | Twelve canonical control packs, 31 controls, 38 indicators, ten evidence-contract families, conditional gate integration, current source review and fail-closed PALO-AI production admission |
| 2026-08-12 | v3.0.1 - Evidence Pack Activation | One primary activation route, preloaded local case, voluntary digest-bound validation receipt, three gold cases, `case:contribute` and a 30-day new-module freeze |
| 2026-08-12 | v3.0.0 - Semantic Foundation | Canonical semantic spine, append-only gate decisions, atomic evidence/claim/evaluation contracts, RDF/SHACL invariants, mapping governance, Semantic Inspector and digest-bound releases |
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

## Research, Publication And Public Recognition

PALO's public record is separated below by evidence type so that a journal publication, a public presentation, and independent media or institutional references are not presented as equivalent forms of recognition. The [Recognition & Sources](PALO_Recognition.html) page provides the underlying links and verification notes.

### Research publication

- **Rivista Corporate Governance, Numero Straordinario 2026.** Fabrizio Degni's PALO paper, *"Il Framework PALO per la Corporate Governance dell'IA: un paradigma per l'orchestrazione del ciclo di vita dell'Intelligenza Artificiale basato su principi in ambito aziendale"*, was published on 4 March 2026 by **G. Giappichelli Editore**. The journal carries **ISSN 2724-1068 / EISSN 2784-8647**. This publication is also the repository's [`preferred-citation`](CITATION.cff).

### Public presentation and provenance

- **Human Economic Forum 2025.** The official programme for the 9 December 2025 event at the Italian Chamber of Deputies lists Fabrizio Degni in the panel *Diritto, responsabilità e coesione sociale*. The event forms part of the documented public provenance of PALO and its creator. [Open the programme](https://www.humaneconomicforum.org/documents/programma_9-dic-2025.pdf).

### Independent coverage and public references

- **World AI Council.** A public World AI Council post refers to PALO and notes recognition through Reuters coverage. [Read the public reference](https://www.linkedin.com/posts/world-ai-council_at-the-world-ai-council-we-are-incredibly-activity-7438233663349133312-9akN).
- **Rivista AI.** Independent coverage examined the P.A.L.O. Framework Toolbox 2.0 in the context of AI governance and the Human Economic Forum. [Read the article](https://www.rivista.ai/2026/03/25/p-a-l-o-framework-toolbox-2-0-governance-in-your-pocket-o-lillusione-portatile-del-controllo-algoritmico/).
- **Rivista Corporate Governance.** The publisher's 2026 special-issue materials include the PALO contribution in the issue record. [Open the special issue index](https://images.rivistacorporategovernance.it/f/indici/NumeroStraordinario_2026_tUAZh_RCG.pdf).

These references provide research, provenance, and external context. The repository and framework documentation remain the source of truth for PALO's current implementation, capabilities, release status, and technical boundaries.

## Quick Start

### Use the live website

Open the [PALO Evidence Pack](https://paloframework.org/PALO_AssessmentPath.html?sample=agentic-invoice#assessment-form). The synthetic agentic invoice case is preloaded, runs locally and can produce a reviewable dossier plus a voluntary validation receipt in less than ten minutes. Existing PALO modules remain available as downstream tools after the evidence route identifies what is needed.

### Run locally

The website remains static. The optional, non-production PALO-AI reference runtime uses Node.js 22+ and OPA.

To validate or regenerate the v3 semantic foundation, use `npm run semantic:validate`, `npm run semantic:generate`, and `npm run semantic:release`. The full release gate remains `npm run p0`; it bootstraps the locked Governance Hub dependencies and the verified OPA binary so the gate is reproducible from a clean clone after the root `npm ci`.

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

PALO-AI v2.7 uses the split MCP SDK 2.0 and serves both stateless MCP `2026-07-28` and legacy clients from one tool definition. Remote MCP can validate OIDC/JWKS access tokens with audience-bound scopes, role separation and tenant-to-claim binding; the shared token remains a development fallback and the separate REST Gateway remains a coarse preview boundary. The runtime supports data-governed Action Claim 1.4, Context Bridge evidence, Data Fitness and Disclosure Contracts, AI system registry, continuous invalidation, durable single-instance assurance tasks, optional RFC 8785/Ed25519 evidence, OpenTelemetry and a fail-closed production profile. See the [Data Assurance Control Plane](docs/palo-data-assurance-control-plane.md), [August 2026 technology radar](docs/palo-ai-state-of-the-art-radar-2026-08.md) and [v3.1 control-plane guide](docs/palo-v3.1-governance-control-plane.md).

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

### Operate the Governance Hub control plane

`packages/palo-governance-control-plane/` contains the production-candidate browser BFF for the Setup Builder: OIDC/PKCE sessions, tenant/role binding, CSRF/origin controls, server-side adapters, deterministic simulation, PostgreSQL RLS, atomic audit, separate review and remote signed publication. It is not enabled in the public GitHub Pages build and it does not make the SQLite execution runtime production-ready.

Run its local tests with:

```bash
npm run palo:hub:control-plane:test
```

Deployment is opt-in and fail-closed. Follow the [Governance Hub control-plane operations runbook](docs/palo-governance-hub-operations.md) to provision external OIDC, managed PostgreSQL, a tenant-enforcing adapter and KMS/HSM signer before enabling the Compose profile.

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
|-- PALO_OWASPGenAI2026.html            # OWASP 2026 source-backed security crosswalk
|-- PALO_PoisoningStudy.html           # Data Poisoning Governance module
|-- PALO_VibeCoding.html               # AI-assisted development governance
|-- PALO_AgenticGovernance.html        # PALO-AM Agentic Governance
|-- PALO_CompanionApp.html             # Mobile app landing page
|-- PALO_Community.html                # Community and open collaboration
|-- PALO_Recognition.html              # Public references and source notes
|-- PALO_AssessmentPath.html           # Guided assessment and evidence bundle export
|-- PALO_RegulatoryWatch.html           # Dated regulatory watchlist and sources
|-- PALO_DocumentationLibrary.html      # Canonical searchable documentation index
|-- PALO_DocumentationHub.html          # Backward-compatible transition page
|-- PALO_PlatformMap.html               # Operational platform status and navigation map
|-- PALO_VerificationNote.html          # PALO 3.1 and PALO-AI 2.7 baseline verification record
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

The [Documentation Library](PALO_DocumentationLibrary.html) is the canonical web-native reference for the lifecycle, modules, source set, semantic contracts, and contribution links. The former [Documentation Hub](PALO_DocumentationHub.html) remains as a backward-compatible transition page; the PDF remains the stable primary download record.

Primary framework documents and artifacts:

- [How to read and use the PALO repository](docs/palo-repository-reading-guide.md)
- [PALOFrameworkV2.pdf](PALOFrameworkV2.pdf)
- [The PALO Framework v1 paper, Feb 2026](ThePALOFramework_%20A_Paradigm_for_Principled_AI_Lifecycle_OrchestrationInBusiness%20v1%20Feb%202026.pdf)
- [PALO-AM Agentic Governance page](PALO_AgenticGovernance.html)
- [PALO-AI Governance Integration Guide](docs/palo-ai-governance-integration-guide.md)
- [Why PALO-AI](PALO_AIWhy.html)
- [PALO-AI Quickstarts](PALO_AIQuickstarts.html)
- [PALO-AI Capability Matrix](PALO_AgenticCapabilityMatrix.html)
- [PALO-AI Production Readiness](PALO_AIProductionReadiness.html)
- [PALO 3.1 and PALO-AI 2.7 release verification record](PALO_VerificationNote.html)
- [OWASP GenAI / LLM Top 10 2026 PALO crosswalk](PALO_OWASPGenAI2026.html)
- [OWASP GenAI / LLM Top 10 2026 governance reference](docs/owasp-genai-llm-top-10-2026-security-crosswalk.md)
- [Pinned OWASP 2026 v1.0 source artifact](assets/OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf)
- [Machine-readable OWASP 2026 crosswalk](data/owasp-genai-2026-crosswalk.json)

Generative and agentic routes now carry this source-backed lens through PALO Guide and the existing Evidence Pack. Assessment Path records all ten risks, architecture priorities, the pinned source and open security-testing evidence in the Case File; the OWASP artifact remains draft until accountable human review.
- [PALO Documentation Library](PALO_DocumentationLibrary.html)
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

The fastest contribution path is a synthetic or safely publishable Casebook artifact:

```sh
npm run case:contribute -- \
  --slug retail-returns-assistant \
  --title "Retail returns assistant" \
  --sector retail \
  --scenario "An assistant drafts a recommendation while a named employee approves refunds." \
  --community builders \
  --author "@your-github-handle"
```

The command generates a Case File, validates the public schema and prepares a PR body. It never pushes or opens a pull request automatically.

Please read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md) before opening issues or pull requests.

## Roadmap

Current baseline: v3.1.0 Governance Control Plane, released 2026-08-23. It adds twelve applicability-aware governance domains, 31 controls, 38 indicators, ten evidence-contract families and a fail-closed PALO-AI production-admission boundary on top of the v3 semantic foundation and Evidence Pack activation path.

Activation focus: new non-essential modules are frozen from 2026-08-12 through 2026-09-10. Work is concentrated on Evidence Pack completion, external review, accessibility, negative tests and Community Casebook contributions. See the [activation freeze](docs/activation-freeze-2026-08.md).

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
| v3.1 | Identity, durability and validated connectors | Identity-aware BFF, workload identity, scoped RBAC, managed key custody, durable state/queues and fresh n8n connector validation |
| v3.2 | Evidence and governance board packs | Board templates, decision logs, KPI/KRI registers, review packets and audit-ready summaries built on verified outcomes |
| v4.0 | Production integration layer | Independently assessed deployment patterns and integrations for enterprise workflows, issue trackers, GRC platforms and documentation systems |

Exploratory items:

- HarmonyOS Next feasibility for the mobile toolbox
- Mobile push delivery for remote approval requests; the current runtime supports MCP and authenticated local-gateway approval resolution without claiming a remote notification service
- Lightweight test suites for generated governance reports and evidence exports

## Disclaimer

PALO is an educational, governance-support, and pre-screening toolkit. It does not provide legal advice, does not certify compliance, and does not replace professional legal, technical, security, or conformity-assessment review.

PALO-AI v2.7 is explicitly non-production. `Allowed` records a policy decision; a Data Disclosure Receipt records what a trusted executor asserted about information flow; only a matching authoritative outcome may be labelled `verified`. None of these records certifies that an action was safe or lawful, and the in-process connector is not independently attested. The bundled runtime is denied by its strict production profile. Deployers remain responsible for independent threat modelling, authenticated identities and roles, least privilege, tenant isolation, policy ownership, connector idempotency, trusted approval context, key custody and rotation, observability, incident response, backup, retention and validation against their real tools and environments.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Contact

- Website: [paloframework.org](https://paloframework.org)
- Email: contact@paloframework.org
- GitHub: [sev7enITA/PALOframework](https://github.com/sev7enITA/PALOframework)
