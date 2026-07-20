# Changelog

All notable changes to the PALO Framework are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows Semantic Versioning where practical.

---

## [Unreleased]

### Added

- Added a three-entry public governance map that keeps PALO Framework as the umbrella, positions PALO-AM as its agentic governance modality and PALO-AI as its Developer Preview technical enforcement component
- Added canonical public "Why PALO-AI" and "PALO-AI Quickstarts" pages that separate the strategic assurance case from verified code-first, n8n/no-code and Copilot Studio/MCP evaluation routes
- Added a browser-local comparison of direct execution, governed execution and authorized-but-wrong outcome mismatch, plus a persistent v2.5 capability/readiness/security rail across public agentic pages
- Added a cognitive front door that routes by organizational role and objective, with a distinct "Govern agent actions" objective and conditional code-first, no-code/low-code and rapid-prototyping modes
- Added a persistent role, objective, phase, artifact and next-action ribbon across guided onboarding and Agentic Governance orientation
- Added safe Governance Hub deep links for executive/technical roles and known views, with deterministic fallback for malformed parameters
- Added a public, interactive nine-gate Production Readiness route and a responsive evidence-based Capability Matrix; internal technical assessment workpapers are excluded from publication
- Added a deterministic sanitized Markdown-to-HTML publication pipeline, searchable Documentation Library, document navigation, print/share controls and privacy-first local feedback exports
- Added the white PALO-AI Governance Hub prototype with a shared Executive/Technical shell, an eight-step guided governance builder, portfolio and decision views, execution traces, approvals, incidents and integration boundaries
- Added a product specification, role-based user guide, workflow reference, six Mermaid architecture diagrams, site copy, GitHub copy and a design-partner launch plan for the Governance Hub
- Added deterministic nested Vite publication so the Governance Hub ships inside the Hostinger/GitHub Pages `dist` artifact while retaining a local development mode
- Added a web-native PALO-AI governance entry point with task-based routes for code-first developers, no-code/low-code builders, and rapid prototypers using Copilot Studio or similar MCP-capable tools
- Added local, hybrid, managed-cloud and private-cloud deployment guidance with explicit identity, key custody, tenant isolation, availability and evidence gates
- Added an independent cyber-assurance and scale plan covering threat modelling, cryptographic review, penetration testing, supply-chain assessment, recovery and multi-tenant acceptance criteria
- Added a staged n8n and broader community market-entry plan that defers npm and Creator Portal submission until real integration and security gates pass
- Added the PALO-AI governance control-plane architecture for n8n and similar agentic automation platforms, with explicit enforcement classes for the Visual Decision Gate, Governed Executor, Digest-Bound Approval, and Workflow Admission patterns
- Added four presentation-ready PALO-AI/n8n workflow screens illustrating the visual insertion point and enforcement boundary of each architecture pattern
- Added a public presentation and launch playbook with audience-specific positioning, demo guidance, claim discipline, staged promotion, and design-partner outreach material
- Added an n8n integration boundary document separating the current decision-node prototype from the planned installable connector and enforced self-hosted/OEM components
- Added the installable `n8n-nodes-palo-ai` 0.1.0 alpha package, encrypted gateway credentials, three-way decision routing, immutable approval resume, CI and deferred provenance publishing workflow
- Added a real n8n 2.30.7 tarball install/runtime test report, safe workflow template, community discussion draft, and feedback/design-partner issue forms

### Changed

- Reduced primary navigation to Start, Agentic Governance, Governance Hub, Tools, Documentation and Readiness; consolidated the former Documentation Hub into a transition page and made the filtered HTML Library canonical
- Refocused the homepage on PALO-AI full-cycle assurance, the eight-step Governance Hub builder and nine existing guided journeys described by outcome and artifact
- Added Documentation Library depth, audience and task filters plus product, maturity, reading-time, prerequisite and recommended-next-step metadata
- Updated the public Documentation Hub, PALO-AI overview, capability matrix, PALO-AM entry point and adoption/community guides to reflect the v2.5 full-cycle preview and its four n8n outcome paths
- Aligned README, security policy, VPS guidance, Governance Hub copy and release metadata to the v2.5 full-cycle developer-preview boundary
- Added an explicit Rego default-deny fallback and renamed canonical object comparison to avoid implying cryptographic constant-time semantics
- Hardened Governance Hub search, download cleanup, asynchronous boundary testing, keyboard focus and Windows publication validation, with browser smoke coverage
- Reframed PALO-AI complexity through progressive disclosure: business questions and visible outcomes are primary, while Action Claims, Effect Contracts, Rego inputs and raw evidence remain inspectable on demand
- Positioned PALO-AI as an emerging governance control plane while retaining developer-preview disclaimers and avoiding claims of certified, production-ready, biometric, exactly-once, or unavoidable enforcement

## [2.5.0] - 2026-07-18

**Release status: Full-Cycle Developer Preview. Isolated evaluation only.**

### Added

- Added Action Claim 1.2 and immutable Effect Contracts for authoritative preconditions, expected effects, forbidden effects and inconclusive handling
- Added signed one-time Execution Capabilities bound to the exact claim, decision, tenant, resource, executor and verifier
- Added operator-provisioned trusted executor and verifier registries, signed Execution Receipts and signed Outcome Attestations
- Added `verified`, `mismatch` and `inconclusive` outcome semantics so an allowed action is no longer confused with a correct result
- Added held Assurance Incidents with explicit acknowledge/resolve transitions; compensating actions remain separately governed claims
- Expanded the MCP toolkit from eleven to nineteen tools and added full-cycle REST execution, outcome and incident endpoints
- Added `n8n-nodes-palo-ai` 0.2 with the PALO Governed Action node and four visible outputs: Verified, Review Required, Denied and Execution Failed
- Added a synthetic multi-tenant catalog demo covering verified effect, stale-state prevention and authorized-but-wrong mismatch detection
- Added automated tests for capability replay resistance, idempotent retries, signed receipts, outcome verification, incident holds and ledger integrity

### Changed

- Disabled caller-supplied REST execution evidence by default; governed execution now generates receipt and outcome evidence inside the trusted runtime
- Updated the reference Rego policy to accept Action Claim 1.2 only when a bound Effect Contract is present
- Retained Action Claim 1.1 and the original n8n decision-only node for migration compatibility

### Known developer-preview limitations

- SQLite, shared bearer tokens, environment HMAC keys and in-process connector handlers are not production infrastructure
- External tools cannot join the local database transaction; exactly-once behavior depends on connector idempotency and is not universally claimed
- Executor and verifier workloads are not attested, mobile reviewer identity remains a prototype, and multi-replica durable recovery is not implemented
- Production adoption still requires workload identity, scoped RBAC, KMS/HSM, PostgreSQL and durable queues, HA, observability and independent security assessment

## [2.4.1] - 2026-07-17

**Release status: Developer Preview. Not approved for production authorization or consequential tool execution.**

This release publishes contracts and a reference implementation for evaluation. Runtime enforcement, cryptographic evidence hardening, authenticated human approval, production connectors, and collaborative agent-team execution remain under development. The included bearer-token transports, SQLite/HMAC components, Vibe Gate metadata, Web/Android approval clients, and n8n/Dify integrations are prototypes and must not be represented as production security controls.

### Added

- Added an experimental bearer-authenticated MCP Streamable HTTP transport using the official SDK, with protocol parity across eleven stdio/remote tools
- Added a reference SQLite WAL registry and append-only evidence-ledger prototype for agents, authorities, policies, replay state, approvals, decisions and signed events
- Added normalized Action Claims with path, host, network intent, validated arguments, nonce, idempotency key and monotonic sequence number
- Added prototype Web and Android Approval Inbox clients, PALO-AM profile/decision exchange, and a demonstrative Vibe Coding claim-metadata gate
- Added an honest public machine-readable capability matrix and an in-process register, deny, approval, execute, sign, persist and verify acceptance test
- Added the non-production PALO governance MCP reference server, expanded from its initial seven-tool baseline to eleven tools for registry, policy, approval, evidence and ledger operations
- Added canonical, interoperable JSON contracts for agent profiles, action claims, policy decisions, approvals, and HMAC-signed evidence envelopes
- Added an experimental localhost governance gateway for non-production Dify, n8n, and workflow examples; policy and signing secrets remain server-side
- Added a persistent approval state machine with expiry, single terminal resolution, exact claim-digest binding, accountable resolver identity, and rationale
- Added an append-only SQLite evidence-ledger prototype with UUID event IDs, secret-field redaction, HMAC-SHA256 signatures, previous-event hash chaining and immutable update/delete triggers
- Added pinned, checksum-verified OPA installation, Rego v1 compilation and policy tests, MCP protocol smoke tests, runtime security tests, connector tests, and CI enforcement

### Changed

- Replaced legacy Rego syntax and permissive delegation shortcuts with fail-closed checks for registered tools, operations, read/write scopes, network access, hosts, delegation depth, subagent count, roles, and human validation
- Replaced local Dify and n8n allowlists, mock signatures, and second-based evidence IDs with canonical claims evaluated by the trusted PALO gateway
- Changed agent profiles so they reference only a key ID and algorithm; signing secrets can no longer be embedded or derived from public configuration
- Preserved every PALO-AM and Assessment Path run as a unique historical record and calculate source freshness from recorded source state instead of marking every export current
- Made Case File merge linear for identified arrays, reject cross-case merges, require strict RFC 3339 timestamps, and surface save or handoff persistence failures before navigation

### Security

- Added nonce replay detection, immutable claim-ID checks, constant-time signature and gateway-token comparisons, authenticated gateway access, request-size limits, redaction defaults, atomic registry writes, and fail-closed OPA outage behavior
- Prevented raw tool arguments, access tokens, passwords, cookies, API keys, and private keys from entering agentic decision evidence

### Known developer-preview limitations

- A single bearer token does not provide principal identity, role separation, reviewer authentication, administrative authorization, rotation, or production transport security
- The reference executor is not an exactly-once execution engine; cached decisions, action expiry, state/evidence atomicity, and decision provenance require further hardening before real tool use
- Approval clients demonstrate state transitions but do not yet provide sufficient human-readable action context or an enterprise reviewer identity lifecycle
- Vibe Gate metadata is a self-attested demonstration and is not a trusted signed attestation or an unavoidable pre-tool-call proxy
- Collaborative Agent Teams remain specified only; Team Registry, Shared Task Claims, peer coordination, leases, conflict handling, and team-level evidence are not implemented
- n8n and Dify artifacts are non-production examples and do not provide a certified end-to-end approval-resume or execution connector

## [2.4.0] - 2026-07-12

### Added

- Added PALO Spotlight, a local ER-aware platform search across modules, guide decisions, artifacts, actors, controls, sources, stakeholder intents, and weighted relationships
- Added deterministic intent scoring, six-phase route tracing, relation traversal, operational starter questions, keyboard navigation, and reusable `PALO_SPOTLIGHT.open(query)` integration for a future conversational assistant

- Added a pinned Node toolchain for HTML, links, fragments, canonicals, sitemap, RSS, release metadata, and browser smoke validation
- Added an explicit public-file allowlist and deterministic root-to-`dist` build with SHA-256 exactness verification
- Added `release-manifest.json`, portable `_headers`, hosting guidance, and P0 lateral analysis
- Added PALO case-file and evidence-bundle v1 schemas with valid/invalid fixtures, migration guidance, source freshness fields, and incident/material-change gate triggers
- Added a local-only browser API for case create, validate, import, export, merge, board pack, and cross-module handoff while preserving unknown fields
- Added case import/resume and handoff to Stakeholder Onboarding and Assessment Path, including board-review Markdown output
- Added the embedded PALO-AM Simulator MVP with deterministic tiering, control/evidence/KPI recommendations, JSON/Markdown export, and case linkage
- Added critical P1 browser flows and P1 lateral analysis
- Added P2 structured control, KPI/KRI, decision-gate and source starter libraries with cross-reference validation
- Added six educational Case File worked examples, five operational templates, a PolicyWatcher signal contract, vendor-neutral connector patterns, and non-production policy-as-code examples
- Added P2 dependency/license inventory, publication hygiene, module contracts, deterministic publication coverage, and lateral analysis
- Added the public Platform Map with honest Implemented, Foundation, and Research states; P0-P3 lateral impact panels; stakeholder-intent navigation; and a synchronized table fallback
- Added navigation entities and weighted navigation relations to the Operationalization Explorer with a dedicated graph mode, destination properties, fallback coverage, and P3 browser tests
- Added Platform Map links to the homepage, shared navigation, Documentation Hub, sitemap, RSS, release manifest, README, and deterministic publication allowlist
- Added P3 lateral analysis and the required desktop, mobile, navigation-graph, and PALO-AM Simulator screenshots
- Added the v2.4.0 PolicyWatcher maintenance integration: a local Assessment Path signal receiver, pending-human-review Case File mapping, live Platform Map/Explorer destination, and exact import/boundary tests

### Changed

- Updated AJV to 8.20.0 after the final dependency audit, removing the reported moderate ReDoS advisory from the validation toolchain
- Unified all shared `palo-v21.css` and `palo-v21.js` cache keys on release v2.4.0
- Changed GitHub Pages CI to fail on validation errors and deploy only the generated `dist` artifact
- Upgraded Assessment Path exports to evidence-bundle v1 and connected onboarding, assessment, simulator, and board review through one portable local case
- Corrected the mobile Explorer navigation landing so it remains hash-free, opens on the visible graph, and focuses the Navigation mode control
- Raised Explorer mode, phase, relationship, inspector, semantic-search, and result targets to a 44px minimum
- Offset focused PALO-AM results below both fixed navigation bars and added keyboard-focusable, text-labelled mobile scroll affordances to the matrix and KPI/KRI registry
- Standardized PolicyWatcher links on `https://www.policywatcher.online/`, retained the local schema as the contract, and made additive signal fields forward-compatible without changing the `1.0.0` format

## [2.3.2] - 2026-07-11

### Fixed

- Unified the homepage Toolbox, AuditBench, and Poisoning Study entry bands around the shared PALO workspace pattern
- Restored cold-load and direct-file styling for the homepage lifecycle and proof metrics using local CSS
- Rebuilt the Companion App page on the shared shell with valid section navigation and operational lifecycle routes
- Linked the homepage five-phase proof point to the lifecycle and synchronized changed public files with `dist/`
- Restored the PALO-AM `Controls` navigation target and completed a 27-page internal and external link audit

### Added

- **Stakeholder onboarding**
  - Added a three-step, plain-language onboarding for decision, working context, and material signals
  - Added deterministic routing that returns exactly one primary action, one evidence artifact, and no more than two contextual PALO modules
  - Added personalized six-phase routes for executive, governance, product, engineering, public-sector, procurement, audit, assurance, and research perspectives
  - Added local JSON and Markdown route exports without accounts, analytics, or transmission of onboarding answers
  - Added resume, restart, change-answer, and explore-all paths using session-local storage with a graceful storage fallback
  - Connected the result to the weighted ER workflow and 3D knowledge graph with phase, module, camera, inspector, and URL synchronization

### Changed

- Made Stakeholder Onboarding the primary Start here, hero, command-center, and theory-to-practice entry from the homepage
- Updated the public release marker to v2.3.2 on the homepage, Explorer, and Community shell
- Added canonical, Open Graph, Twitter, robots, and WebApplication metadata for the Operationalization Explorer

### Accessibility

- Used native fieldsets, legends, radio buttons, and checkboxes with text progress, 44px controls, visible focus, preserved answers, intentional result focus, reduced motion, and a semantic WebGL fallback
- Verified responsive onboarding and Explorer behavior across desktop, tablet, and mobile layouts

## [2.3.1] - 2026-07-11

### Added

- **Theory to Practice value proposition**
  - Added a dedicated homepage operating loop that explains how PALO moves from a use-case question to classification, impact assessment, controls, KPI/KRI, evidence, and review
  - Connected the operating loop to the available PALO modules: Model Canvas, Human Agency Risk Map, Tech Trends Observatory, Risk Tiering, Framework Comparison, Regulatory Watch, FRIA, PALO-AM, Vibe Coding Governance, AuditBench, Poisoning Boomerang, KPI/KRI Generator, Assessment Path, Documentation Hub, and P.A.L.O. Toolbox
  - Made the practical outputs explicit: decision record, impact and control record, KPI/KRI register, and versioned JSON or Markdown evidence bundle

### Changed

- Pointed the primary Start here navigation to the theory-to-practice value proposition
- Updated the public release marker to v2.3.1 on the homepage and Community shell

## [2.3.0] - 2026-07-11

### Changed

- **Workspace UI refresh**
  - Replaced the crowded homepage toolbar with a compact command bar organized around Start here, Assess, Observe, Docs, Community, and Toolbox
  - Replaced the marketing-first hero with a workspace entry view and three operational routes
  - Added responsive mobile navigation with clear touch targets and no horizontal overflow
  - Simplified the homepage footer to policy, resource, contact, and RSS links
  - Removed the non-essential WCAG target badge and privacy-status card from the primary interface; accessibility and privacy remain available as policy pages
  - Applied the command bar to the Community page and aligned the public shell with the PolicyWatcher workspace language

### Fixed

- Prevented top navigation wrapping and overlapping at desktop widths
- Removed the legacy homepage mobile-menu script that could target missing navigation nodes after the shell refresh

## [2.2.1] - 2026-07-11

### Added

- **PolicyWatcher ecosystem link**
  - Added PolicyWatcher as a separate civic-tech monitoring companion for public privacy-policy and terms-of-service changes
  - Added links to the PolicyWatcher Observatory, timeline, confidence methodology, and Trust & Quality materials
  - Added an explicit integration boundary: PolicyWatcher signals can inform monitoring, but do not replace original sources, official requirements, human review, or legal advice

### Changed

- Added PolicyWatcher references to the homepage, Assessment Path, Regulatory Watch, Documentation Hub, Recognition page, README, and release feed

## [2.2.0] - 2026-07-11

### Added

- **PALO Assessment Path**
  - Added three guided entry points: classify the case, assess impacts, and build the evidence
  - Added routing from Risk Tiering to contextual FRIA, controls, KPI/KRI, PALO-AM, and AI Dev Governance when signals apply
  - Added local JSON and Markdown evidence bundle export with PALO version, route, evidence readiness, official sources, and disclaimer
- **Regulatory Watch 2026**
  - Added dated status cards for Article 4 AI literacy, GPAI milestones, Article 50 transparency, and current high-risk implementation guidance
  - Added official Commission and EUR-Lex source links and an explicit review-date disclaimer
- **Documentation Hub**
  - Added indexable web-native lifecycle documentation, interactive module directory, primary document links, source set, and contribution links
- **Proof and Community media kit**
  - Added public links for the Android and iOS/iPadOS companion apps, GitHub, framework image, PDF, and community page
- **Unified v2.2 shell assets**
  - Added responsive shared CSS and JavaScript for navigation, local downloads, current year labels, and Documentation Hub filtering

### Changed

- Added Start Here, Regulatory Watch, Assessment Path, Documentation Hub, and Proof & Community sections to the homepage
- Updated README, sitemap, RSS feed, and release history for v2.2.0
- Updated the roadmap to place PALO-AM Simulator after the guided evidence workflow

## [2.1.0] - 2026-07-11

### Added

- **Recognition and source notes page**
  - Added `PALO_Recognition.html` with public references, primary sources, link review date, and verification notes

### Changed

- Corrected the Risk Tiering transparency reference from Article 52 to Article 50
- Reframed FRIA copy as Article 27 readiness and pre-screening for in-scope deployers and use cases
- Added current Commission timeline notes for high-risk AI implementation and linked the official guidance
- Updated privacy, security, and accessibility statements with July 2026 review status
- Replaced unverified WCAG/GDPR compliance badges with review status and privacy information labels
- Completed SEO description, canonical, and Open Graph metadata for previously incomplete pages
- Added Recognition to the homepage footer, README module list, sitemap, RSS feed, and release metadata

---

## [2.0.1] - 2026-06-22

### Changed

- Updated README release table to use exact release dates and version numbers
- Reworked the README roadmap into a versioned roadmap from v2.0.1 through v3.0
- Aligned the PALO-AM page roadmap with the repository roadmap numbering
- Aligned homepage changelog entries with `CHANGELOG.md`
- Reordered RSS entries for chronological consistency and synchronized `dist/feed.xml`

---

## [2.0.0] - 2026-06-22

### Added

- **PALO-AM: Agentic Governance Modality v2.0**
  - New PALO extension for AI agents and agentic systems
  - Five operational governance objects: Agent Identity, Agent Authority, Agentic Risk Matrix, Agentic Control Layer, and Agentic Evidence Layer
  - Action-Space vs Autonomy Matrix for routing agentic systems into governance tiers
  - Five-phase PALO lifecycle overlay for delegated-action systems
  - KPI/KRI registry for agentic AI governance
  - Worked enterprise scenarios for procurement, workflow automation, and autonomous support agents
  - Alignment references for IMDA MGF v1.5, EU AI Act, ISO/IEC 42001, ISO/IEC 42005, and NIST AI RMF
- **Public recognition and reference links**
  - Added references to Reuters-distributed coverage, World AI Council mention, Rivista AI coverage, and Rivista Corporate Governance special issue index

### Changed

- Updated README to reflect the current 2026 framework state, mobile ecosystem, new modules, documentation, and roadmap
- Updated sitemap and RSS feed to include newer modules and mobile release information
- Corrected Google Play links to the active package ID: `com.fabriziodegni.paloframework`

---

## [1.8.0] - 2026-05-15

### Added

- **Enterprise Security & Governance for AI-Assisted Software Development Environments**
  - New PALO extension covering AI-assisted software delivery, rapid prototyping, vibe coding, and coding assistants
  - Three-layer governance model: Functional Intent, Controlled Environment, and Evidence & Assurance
  - Six decision gates for AI-assisted software development workflows
  - KPIs/KRIs for traceability, security, review coverage, and evidence quality
  - Dedicated module page: `PALO_VibeCoding.html`

### Changed

- Added AI Dev Governance links to homepage navigation and toolkit shortcuts
- Integrated AI-assisted development governance into the homepage changelog

---

## [1.7.1] - 2026-04-08

### Added

- **P.A.L.O. Companion App - iOS/iPadOS Release**
  - App Store listing added for the P.A.L.O. Framework Toolbox
  - Universal iPhone and iPad support
  - Evidence Vault, biometric protection, PDF report generation, and direct access to PALO web modules
  - App Store link: <https://apps.apple.com/it/app/p-a-l-o-framework-toolbox/id6761771299>

### Changed

- Updated companion app messaging from Android-only to cross-platform availability

---

## [1.7.0] - 2026-03-25

### Added

- **The Poisoning Boomerang**
  - New research module analyzing data poisoning as a cross-cutting AI governance risk
  - Coverage of six poisoning and anti-scraping tools: Miasma, Nepenthes, Nightshade, Glaze, Cloudflare AI Labyrinth, and AttackAI
  - Five detection strategies and lifecycle controls for data integrity governance
  - EU AI Act Article 10 and Article 15 governance notes
  - PALO lifecycle integration for data provenance, robustness, monitoring, and remediation
  - Dedicated module page: `PALO_PoisoningStudy.html`

### Changed

- Added Poisoning Study links to homepage navigation and related research sections
- Expanded the homepage changelog with March 2026 research updates

---

## [1.6.0] - 2026-03-12

### Added

- **P.A.L.O. Companion App - Android Launch on Google Play**
  - Official public release of the P.A.L.O. Framework Toolbox for Android devices
  - Available on the [Google Play Store](https://play.google.com/store/apps/details?id=com.fabriziodegni.paloframework)
  - Offline, privacy-first AI governance pre-screening toolkit
  - Full PALO Framework integration: FRIA, Model Canvas AI, Risk Tiering, KPI Generator, and more
  - Optimized for Android smartphones and tablets
  - Built with Flutter for a native mobile experience

### Changed

- Updated homepage to reflect official Android app availability
- Enhanced Companion App landing page with Google Play Store links

---

## [1.5.0] - 2026-03-03

### Added

- **PALO Companion App v2.0 landing page**
  - Dedicated page for the offline, privacy-first mobile app
  - 8 professional assessment tools presented for mobile use
  - Evidence Vault and mobile-first workflow messaging
- **AuditBench Explorer**
  - Interactive deep-dive into the AuditBench alignment auditing benchmark (Sheshadri et al., 2026)
  - 14 hidden AI behavior cards with PALO analysis
  - Category filtering: Manipulation, Deception, Bias, Safety, and Autonomy
  - Investigator Simulator with five auditing tools: Prefilling, User Persona, Scaffolded Probing, SAE Probe, and Reveal
  - PALO Alignment Self-Assessment with checklist and radar chart visualization
  - Export functionality for reports and assessment results

### Changed

- Updated homepage with Companion App showcase section
- Added Companion App links to hero buttons and toolkit navigation
- Updated homepage with AuditBench Explorer showcase section
- Added AuditBench link to hero buttons and mobile navigation
- Enhanced PALO toolkit with alignment auditing capabilities

---

## [1.4.0] - 2026-01-13

### Added

- **Community & Open Collaboration Page**
  - Dedicated page for open collaboration, contributors, and partners
  - Open collaboration roles for contributors and reviewers
  - Partners and partnerships section for academic, industry, and standards-body collaborations

### Changed

- Updated homepage navigation with Community link
- Enhanced footer with Community page link

---

## [1.3.0] - 2026-01-04

### Added

- **2026 Tech Trends Observatory**
  - Analysis of predictions from McKinsey, BCG, Accenture, PwC, EY, KPMG, and Gartner
  - Theme Coverage Matrix
  - Blind Spots analysis revealing governance gaps
  - PALO Governance Gap Score
  - Cross-firm correlation insights
  - Direct links to public source reports
- Full GitHub repository structure with README, CONTRIBUTING, and documentation

### Changed

- Updated homepage with 2026 Tech Trends CTA button
- Enhanced January 2026 changelog entry

---

## [1.2.0] - 2026-01-02

### Added

- **Human Agency Risk Map**
  - Observatory tracking 18 activities humans are delegating to AI
  - Interactive cards with mitigation strategies
  - Psychological impact analysis
  - Category filtering: Cognitive, Behavioral, Social, and Professional
  - PALO Framework integration CTAs
- **Human Agency Risk Map Italian version**
  - Full Italian translation
  - Language toggle between EN and IT versions

### Changed

- Updated homepage hero section with Human Agency Risk Map button
- Added "2026 Spotlight" badge to homepage changelog

---

## [1.1.0] - 2025-12-17

### Added

- **Risk Tiering Calculator**
  - 3-step wizard for EU AI Act risk classification
  - Minimal, Limited, High, and Unacceptable risk tiers
  - Required documentation guidance per tier
  - Visual risk indicators
- **KPI Generator**
  - AI governance metrics aligned with PALO principles
  - Customizable KPI templates
  - Export functionality

### Changed

- Updated homepage with Risk Calculator and KPI Generator buttons
- Enhanced mobile navigation with Toolkit section
- Improved footer navigation

---

## [1.0.0] - 2025-12-01

### Added

- Initial release of PALO Framework website
- **FRIA Assessment Tool**
  - Fundamental Rights Impact Assessment wizard
- **Model Canvas AI**
  - Visual planning tool for AI projects
- **Comparison Tool**
  - Framework comparison utility
- Complete PALO Framework v1.0 PDF documentation
- Accessibility statement
- Privacy policy and security policy
- SEO optimization: sitemap, robots.txt, and meta tags
- RSS feed for updates

### Security

- Implemented `security.txt` in `.well-known`
- Added HTTPS-only policy

---

## [0.9.0] - 2025-11-15

### Added

- Beta version of PALO Framework tools
- Initial design system and color palette
- Responsive layout foundation
