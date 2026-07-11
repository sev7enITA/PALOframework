# Changelog

All notable changes to the PALO Framework are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows Semantic Versioning where practical.

---

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
