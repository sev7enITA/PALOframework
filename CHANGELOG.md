# Changelog

## 12 November 2026: benchmark track terminology

Standardise the Policy Interpretation, Process Interpretation and Specification Generation labels across the research pages and structured data. Study scope, observations and qualification status are unchanged.

## 11 November 2026: research pages and Specification Generation

Presentation revision 2026-11-11.6 separates the introductory overview, Policy Interpretation, Process Interpretation, Specification Generation, corpus register and research method. Shared navigation and a dark PALO palette make the input, task, model configuration, repetitions and execution channel explicit. Historical adapter diagnostics remain separate from synthetic tests.

The new development study assigns 27 calls across three public procurement documents, 200 supplied pages, three model configurations and three repetitions. Completion, failed captures, draft-reference disagreements and unknown charges are reported in the [generation results](PALO_BlueprintBench_Generation.html), with source-linked drafts and filtered CSV/JSON exports. The v1.1 mechanical quote check corrects PDF hyphen-linewrap matching while preserving source text, model answers, draft labels and the original v1.0 evidence. A separate advisory note documents an unresolved FEMA input/key ambiguity. No independent validation, quality ranks or PALO Blueprint Index are assigned.

## 11 November 2026: structured data and qualification protocol

Presentation revision 2026-11-11.5 aligns the overview, dashboard and six-scenario metadata with the immutable internal evidence release. It records 6 fictional scenarios, 48 draft propositions, 60 completed requests and 17 of 18 workflow drafts passing structural checks. The [qualification protocol](PALO_BlueprintBench_NextCycle.html#qualification-plan) sets acceptance gates for real document families, generation, blind human gold, external custody, seeded-defect measurement and replicated comparisons. The gates remain open. Frozen observations, evaluator packages and model results are unchanged; no independent validation or numerical ranks are assigned.


## 11 November 2026: six-scenario engineering feasibility

Separate publication revision 2026-11-11.4 records an internal cycle on six fictional procurement scenarios, 48 draft propositions, six workflow tasks and controlled source variations. Advisory reviews of P002/P013/P036 remain separate from human adjudication. The original cohort and evaluator release are unchanged. Source-linked drafts, failures, provisional-label disagreements and exports are available in the [six-scenario view](PALO_BlueprintBench_NextCycle.html). No numerical ranks or independent validation are assigned.

## 11 November 2026: descriptive results and evaluator 0.3.0

Revision 2026-11-11.3 suspends numerical quality, completion, charge and time ranks. Filters, descriptive charts, comparisons and CSV/JSON exports remain. Reviewer collection diagnostics move to their own page. Internal release v0.3.0-internal.1 packages the corrected evaluator; historical evaluator 0.2 has a known EV-01 flaw and must not be used for qualification. Next-cycle development cases and blinded human annotation templates are published without claiming independent adjudication or statistical sufficiency. Testing badges are withdrawn.

[Internal test results](PALO_BlueprintBench_Leaderboard.html) | [Reviewer diagnostics](PALO_BlueprintBench_Diagnostics.html)


## 11 November 2026: metric ranks and developer-country filters

Metric-specific internal ranks with ties, sourced developer-country filtering and sorting, selectable KPI columns and CSV/JSON exports of the current ordered view. Visibility filters preserve the full eligible cohort ranking. Country does not establish serving location or data residency. Frozen measurements and qualification are unchanged. [Open results](https://paloframework.org/PALO_BlueprintBench_Leaderboard.html#workspace).

## 11 November 2026: temporal model results

Interactive timestamp scatter chart with model, provider, case and metric controls, source-bound timestamps and CSV/SVG exports. Collection order does not measure model improvement. Internal-test scores unchanged. [Open chart](https://paloframework.org/PALO_BlueprintBench_Leaderboard.html#temporal-model-results).

## 11 November 2026: internal cross-model review

Published GLM, Gemini and local Qwen countertests: 96/108 assigned judgments on 36 selected items, three observed disagreements, 12 GLM capacity-blocked judgments, disclosed Qwen format projection. Primary scores unchanged; internal testing, not independent validation. [Inspect evidence](https://paloframework.org/PALO_BlueprintBench_Leaderboard.html#adversarial-review).

## BlueprintBench interactive results dashboard | 2026-11-11

Added verification-only Pareto views, case-specific label agreement, repetition variability, latest test timestamps and an interactive evidence workflow. Results retain fixed denominators, draft-label status and missing-cost boundaries. Result challenges open a prefilled GitHub issue for the visitor to review. Public presentation access is withdrawn; Markdown references open rendered GitHub documents.

[Open the leaderboard](PALO_BlueprintBench_Leaderboard.html)


## BlueprintBench identity and internal cohort | 2026-11-11

The overview and leaderboard share 18 model IDs and 28 cohort/configuration records. Internal procurement tests retain 324 assigned slots, 306 dispatched requests, 299 complete responses, 7 failed or incomplete responses and 18 pre-call blocks. Added the BlueprintBench identity, an evidence-linked Internal testing badge and revised result exploration. Independent qualification and PBI remain open.

[Leaderboard](PALO_BlueprintBench_Leaderboard.html) | [Badge usage](https://github.com/sev7enITA/PALO-BlueprintBench/blob/3effa4c/docs/brand-usage.md)


## PALO BlueprintBench research release v0.3.0-pilot.1 | 2026-11-11

- Published research release v0.3.0-pilot.1, explorer 0.3.0 and evaluator/evidence contract 0.2.0 for specification fidelity; the first planned study focuses on procurement.
- Corrected critical-error equivalence counting, calculated acceptance, raw-output traceability, annotation consistency, termination states and cost accounting. A single executable JSON Schema defines the scoped evidence contract.
- Passed 42 evaluator tests and reproduced all 26 retained historical structural-check counts offline. Published the harness, raw responses and requests, deterministic packages and source hashes.
- Updated the homepage, explorer configuration disclosures, downloadable CSV fields and taxonomy mappings. Qualified held-out results remain zero; no PBI score, independent registration or new Workbench app qualification is claimed.


## PALO BlueprintBench and PALO Blueprint Index | 2026-11-11

- Published the model comparison explorer with ten historical configurations, charts, property filters, four-model comparisons and CSV export.
- Introduced PALO Blueprint Index (PBI) as the proposed aggregate index within BlueprintBench; formula, weights and qualification gates remain under development, with no assigned score.
- Published the dedicated [research repository](https://github.com/sev7enITA/PALO-BlueprintBench) and `v0.2.0-pilot.1`, including the evaluator, protocol, contribution policy and source for fifteen slides with actual application captures.
- Linked BlueprintBench, PBI and Document Workbench in the homepage and Platform Map; added the version 0.1.0 vocabulary, SKOS taxonomy and OWL extension.
- Technical checks for the pilot include 17 evaluator tests, CI on Python 3.10/3.13 and structured-data checks. These do not establish independent benchmark qualification or a new qualified Workbench release.


All notable changes to the PALO Framework are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows Semantic Versioning where practical.

---

## Copilot Studio and Azure private pilot: development evidence - 2026-10-27

- Published an [illustrated pilot report](PALO_CopilotPilot.html), a [configuration and development record](docs/palo-azure-copilot-pilot.html), actual pilot captures, an English 120-second video and a public evidence summary.
- Documented the local workspace redesign, Entra roles and delegated scopes, federated connector authentication without a client secret, HTTPS runtime, MCP request boundary and reviewer access.
- Recorded a real Copilot catalogue read at price 100/version 1, denial of proposal 151, and review-required proposal 120 expiring without execution.
- Repaired expired-request withdrawal and verified one reviewer withdrawal with zero executions and zero target writes. The same 89-test suite passed locally and on Azure Linux.
- Published intended benefits, KPI definitions and open qualification gates. Full approval, execution and replay remain unqualified; the two identities are operated by one person. The private connector is not a Marketplace release or Microsoft-certified product.
- This documentation and media publication does not activate services, renew mandates or change the public Governance Hub's illustrative status. Core framework versions are unchanged.

## 2026-10-22 - PALO AI FinOps 1.3

- Published role-based website entry points, Local learning deep links, a research overview and a standalone reproduction package. The FinOps v1.0 preprint remains a separate artifact.
- Reports now use version 1.0.1 after source-level review and corrective tests; input and plan contracts remain 1.0.0. Regenerate older reports.

- Added a separate local-learning economics workspace comparing external-only, static hybrid and distilled hybrid configurations.
- Added frozen experiment contracts, complete cost coverage, shared-cost conservation, paired quality checks and conditional integer crossover analysis, with seven synthetic falsification scenarios.
- Added replayable JSON reports, CLI commands and a methodology guide. No model training, provider calls, route promotion or measured economic benefits are claimed by this extension.
- Fixed a routing test that reused the dated public billing fixture instead of the test run's usage interval.

## 2026-10-21 - PALO AI FinOps 1.2

- Added the experimental FinOps workspace with twelve operational capabilities, billing revision handling, signed shared-cost allocation and evidence-gated outcome metrics.
- Added role entry views, period exports, exception review, forecasts, local MCP access and bounded provider/gateway/benchmark pilot tools.
- Integrated the module into the homepage, Platform Map, documentation library and sitemap.
- Added the technical preprint and reproducible synthetic examples. Real-provider validation, production identity and measured savings remain pending.

## Two-Lens AI Maturity Assessment 1.0.0 - 2026-10-21

- Added 6 deployment and 16 governance questions across institutional capability, delegated authority, observable behaviour and verifiable evidence, informed by the October 2026 BCG report and Fabrizio Degni's complementary governance perspective.
- Added scoped evidence ceilings, freshness checks, conservative profiles, critical-gap priorities, historical comparison, local JSON/Markdown exchange and draft Case File snapshots. Missing evidence remains unresolved; no national ranking, certification or runtime authorization is produced.
- Connected the module to the homepage, Assessment Path, Platform Map, Documentation Library, release feed and sitemap. The independent PALO rubric remains experimental and requires empirical pilot validation.


## Source review follow-up - 2026-10-12

- Substantively reviewed the six overdue NIST, EU and Rogue AI Tracker references. The dated review record preserves prior entries, source editions, acquisition evidence and revised deadlines; the separate OWASP entry remains unknown.
- Clarified Article 50 control-pack questions and timely, accessible disclosures, and distinguished PALO's competence assessments from the amended Article 4 literacy provision.
- Added a public source-review addendum and refreshed current source, control-pack and integrity records. Earlier catalogue data and PDF remain historical snapshots. This follows the metadata-only reconciliation below and does not change runtime admission or ontology versions.

## Documentation maintenance - 2026-10-12

- Added dedicated taxonomy/dictionary and ontology/verification sections, a searchable 65-schema catalogue and the complete technical PDF.
- Added PolicyWatcher batch, operational registry and browser-local review ledger vocabulary; preserved transport, review and action-authority boundaries.
- Published an explicit correspondence between five historical PALO-AM activities and six canonical phases; separated the CECR meanings and aligned matrix and simulator on "Redesign required".
- Reconciled source-review metadata and both semantic/Knowledge Reader integrity manifests. Review deadlines retain their original verification dates.
- Added a publication inventory and a separate deployment receipt. Core ontology versions, runtime maturity and production admission remain unchanged.



## [Unreleased]


### PALO Mobile 3.0 release candidate

Mobile 3.0.0-rc.2 retains canonical control assignment, guarded gate decisions, Case File exchange and saved assistant drafts from RC1. It adds a scene-based iOS lifecycle, adaptive Observatory/research panes, a guarded iOS 27.1 reserved-region bridge for iPhone Duo, and structured PolicyWatcher research requests with explicit payload confirmation and local provenance. Intake receipts are not running scans: discovery and publication require the existing authenticated operator workflow. Features, changelog and Italian/English store descriptions are updated in `deliverables/palo-mobile-3.0-20260920/duo-policywatcher-rc2/`. The framework remains 3.1.0. The mobile candidate is not published: Xcode 27.1 beta and its iOS 27.1 Duo runtime are now installed. iOS development build 30005 compiles the reserved-region branch and launches on Duo/iOS 27.1 and iPhone/iOS 27.0; posture, visual and device qualification, distribution signing, assistant evaluation and PolicyWatcher end-to-end qualification remain release gates. See `deliverables/palo-mobile-3.0-20260920/duo-sdk-qualification/README.md` for this additional verification.


### Added

- Added a swarm-governance reference implementation with immutable mandates, atomic shared-exposure budgets, signed event chains, revision-bound member admission/removal and five tenant-bound MCP tools. An opt-in dispatcher coordinates remote workers through authenticated leases and single-use starts, with durable cancellation requests, authoritative stop observations and reconciliation. Multi-process tests and demos cover shared budgets, crashes, partitions and late effects. Controller HA and production assurance remain unavailable.

- Added a permanent Observatory index connecting the AI Incident Observatory, Regulatory Watch, 2026 Tech Trends and Human Agency Risk Map through explicit Gold Case, Monitoring Brief and Candidate Under Review publication states.
- Added an AI incident investigation route to Platform Map, plus exact Knowledge Reader and Knowledge Curator maturity boundaries and the disabled-by-default external incident provider state.
- Added a dedicated stateless PALO Knowledge Reader production candidate: exact six-tool server, canonical-only content, fail-closed release digests, strict OIDC/HTTPS admission, request and rate limits, non-root minimal image, volume-free Compose profiles and deployment-specific live qualification gates.
- Added separate six-tool Knowledge Reader and ten-tool Knowledge Curator MCP profiles, provenance-bearing search/get, immutable reviewed local contributions, OIDC roles, canonical and terminal-`/mcp` HTTPS routes, profile instructions, paired configurations for 11 MCP hosts, a machine-readable conformance matrix, host qualification procedure, automated configuration validation and a portable PALO Knowledge Copilot skill.
- Added a public PALO 3.1 and PALO-AI 2.7 release verification record with the baseline source revision, CI run, validation totals, negative-test coverage, tagged artifact checksum and current maturity limits.
- Added a production release commit checklist with isolated Git staging groups, deterministic site-output handling, private-input exclusions and mandatory validation gates.

### Changed

- Migrated Community to the shared PALO 3.1 visual system, removed third-party style and font dependencies, reconciled shared navigation around the Observatory index and corrected public changelog routes to the generated HTML view.
- Remote OIDC MCP listeners now fail closed unless explicit client and tenant allowlists are configured, and every listener must use the exact host validated when its app was created. Loopback evaluation compatibility covers IPv4 127/8 plus canonical and expanded IPv6 loopback forms, while IdP audience identifiers distinct from the public resource URL remain supported.
- Redacted deployment identifiers, account addresses, credential rotation details and billing state from public Knowledge Reader documentation while preserving control design and qualification status.
- Corrected Knowledge Reader snippet offsets so punctuation normalization cannot move the displayed excerpt away from the matching source term.

## [PALO-AI 2.7.0] - 2026-08-25

**Release status: Data-assurance developer preview. The bundled runtime remains denied for production use.**

### Added

- Added the PALO-AI v2.7 data-assurance vertical slice: immutable external context evidence, deterministic purpose-bound Data Fitness Decisions, signed Data Disclosure Contracts and Receipts, AI System & Agent Registry records and continuous-assurance signals.
- Added Action Claim 1.4, binding an identity/tenant/Effect Contract to exact current Data Fitness and Disclosure Contract digests before policy evaluation and one-time capability issuance.
- Added zero-row, aggregated and row-level disclosure checks across source/read fields, row limits, sensitive categories, redaction, recipient, provider, model, region, endpoint, trace retention, export and output schema.
- Added an Actian Context Bridge normalization profile that retains normalized claims and a source-payload digest without retaining sample rows or the source payload.
- Added fail-closed invalidation of prior allowed fitness decisions and revocation of matching unconsumed capabilities after quality, classification, lineage, access, contract, incident, system or policy signals.
- Added 8 JSON Schema contracts, valid fixtures, 12 MCP tools and end-to-end tests for payload minimization, verified disclosure, mismatch incidents and stale-decision denial.

### Changed

- Action Claim 1.4 executor results are digest-only in persistent execution state; row payloads are not retained by the PALO runtime record.
- Execution Receipt 1.1 binds the signed Data Disclosure Receipt, and authoritative outcome verification treats disclosure mismatch as a held high-severity assurance incident.
- Data Fitness now denies conflicting current assertions conservatively, binds evaluated normalized claims into its evidence digest and preserves policy, decision and AI System record versions with database immutability guards.
- Data Fitness freshness now evaluates the oldest current evidence reference and caps each decision at both source validity and `observedAt + maxEvidenceAgeSeconds`, preventing a recent assertion from masking stale evidence.
- OIDC data-assurance operations now have explicit least-privilege scopes and tenant-scoped registry, execution and incident reads; the Rego network-intent check is explicit and disclosure obligations apply only to Action Claim 1.4.
- OIDC deployments can configure the tenant-claim name through `PALO_OIDC_TENANT_CLAIM`; disclosure observations must fall inside both the signed contract window and the governed execution window.
- Advanced the independently versioned PALO-AI developer-preview capability baseline to v2.7.0 while retaining zero production-ready capability claims and strict production-admission denial.
- Authority Context 1.4 now enforces trusted issuers, workload audience, authentication age, delegation continuity, claim-window coverage and non-widening scope instead of falling through the legacy validation path.
- Cached Action Claim 1.4 decisions are re-evaluated against current authority, Data Fitness and Disclosure Contract state, so continuous-assurance invalidation denies the same previously allowed claim.
- Post-effect disclosure-receipt failure now produces an unknown Execution Receipt, an inconclusive held incident and digest-only execution state without persisting executor row payloads.
- Tenant-aware execution and incident lookup now falls back to legacy Effect Contract or metadata bindings, scopes incident lists in one joined query and safely excludes unscoped legacy records from OIDC results.

### Validation

- Added negative Action Claim 1.4 authority tests for untrusted issuers and delegation windows that do not cover the full live claim.
- Added same-claim cache-invalidation, conservative freshness/expiry, OIDC cross-tenant and configurable-tenant-claim MCP, replayed disclosure observation, post-effect disclosure-receipt failure and legacy-incident isolation regressions.

## [3.1.0] - 2026-08-23

**Release status: Governance control plane released. PALO-AI v2.6 remains a non-production developer preview.**

### Added

- Added twelve canonical, applicability-aware governance control packs for fairness, system cards, affected-person notice and remedy, Article 50 transparency, data lifecycle, GPAI and systemic risk, serious incidents and decommissioning, accessibility, environment, AI literacy, ISO/IEC 42001 and PALO-AI production admission.
- Expanded the released registries from 9 to 31 controls and from 10 to 38 KPI/KRI definitions, with every new control mapped into one or more lifecycle gates.
- Added ten schema-validated evidence-contract families with valid and invalid fixtures for assurance results, system cards, affected-person cases, Article 50, data lineage, GPAI, serious incidents, decommissioning, AIMS and production profiles.
- Added explicit definitions of governance-complete, operationally complete, production-complete and certification-complete status, with stop conditions and residual boundaries for every domain.
- Added fail-closed PALO-AI production admission and OIDC tenant-to-Action Claim 1.3 binding. The bundled SQLite and in-process runtime is intentionally denied by its own production profile.
- Added PALO-AI v2.6 identity-bound Action Claim 1.3, durable approval/verification tasks, Effect Contract 1.1, RFC 8785/Ed25519 evidence verification, runtime guardrails and operational telemetry events.
- Added OIDC/JWKS MCP resource-server authentication with issuer/audience/expiry/algorithm validation, RFC 9728 metadata, least-privilege scopes/roles, scope challenges and authenticated reviewer attribution.
- Added an allowlisted OpenTelemetry span bridge and the dated August 2026 state-of-the-art radar covering primary sources, Eastern experimental projects and developer communities.
- Added the version-pinned OWASP Top 10 for LLM Applications 2026 source artifact, schema-validated PALO/PALO-AM/PALO-AI crosswalk and source-backed governance reference.
- Added a documentation-first OWASP 2026 analysis that separates direct, supporting and gap ratings from implementation effectiveness, compliance, certification and production authorization.
- Integrated the OWASP 2026 lens into Guide, Assessment Path, Evidence Bundle, Case File and the read-only MCP Guide Agent without creating a new activation module; applicable profiles keep all ten risks in scope and retain OWASP evidence as draft pending human review.
- Added a role-based repository reading guide that explains release tags, `main`, open pull requests, authoring files, generated `dist`, validation, contribution and authority boundaries.

### Changed

- Replaced categorical output from the public Risk Tiering tool with an explicitly non-authoritative screening hypothesis and corrected the voluntary-code reference from Article 69 to Article 95.
- Updated Regulatory Watch for the final Article 50 guidance, provider/deployer separation, GPAI sources and effectiveness evidence for AI literacy.
- Made source freshness date-driven so a source marked current fails validation when its next review date has passed.
- Advanced the platform and semantic release to v3.1.0 and the separately versioned PALO-AI capability baseline to v2.6.0.
- Added authorized public credit to Arshi Chadha, OWASP LLM09:2026 co-lead, for the focused technical review covering embedding inversion, retrieval-evasion testing and the LLM05/LLM09 ownership boundary; the credit is explicitly a personal contribution and does not imply OWASP review or endorsement.
- Refined the LLM09 crosswalk following an interaction with the dedicated LLM09 group: added explicit embedding-inversion, retrieval-evasion, similarity-collision and threshold-straddling evidence requirements; clarified the LLM05/LLM09 vector-poisoning boundary and accountable owners; retained the existing Supporting/Supporting/Gap rating and non-elimination boundary.
- Migrated the MCP reference server from the monolithic SDK 1.30 to split SDK 2.0 packages, with one dual-era factory for stateless `2026-07-28` and 2025 compatibility plus pinned-modern and header-consistency tests.
- Raised the root Node.js engine baseline from 20 to 22 and patched the Hono Node adapter to a production-audit-clean version.
- Updated the OWASP source registry entry with the 2026 v1.0 artifact boundary, provisional editorial status and a 30-day official-source reverification interval.
- Made Documentation Library text search global across depth levels, so source-backed OWASP guidance is discoverable directly from the default Start view while the active All-depth state remains visible and accessible.
- Reconciled the Platform Map public-web ledger with PALO Web and semantic release v3.1.0 while preserving independently versioned runtime and mobile components.
- Updated the Hostinger deployment runbook and added a verified `package:hostinger` command that produces a root-correct upload ZIP and SHA-256 sidecar.
- Updated `SECURITY.md` for the PALO Web v3.1.x baseline and released non-production PALO-AI v2.6 boundary, and corrected the fork clone path in `CONTRIBUTING.md`.

### Validation

- Added cross-registry validation for the twelve control packs, exact control/indicator/gate references, minimum evidence kinds, conditional gate integration, evidence schemas and invalid-fixture rejection.
- Added production-admission tests for schema validity, placeholder and expiry rejection, runtime incompatibility and cross-tenant Action Claim rejection.
- Added validation assertions that keep the LLM09 inversion, adversarial-query and LLM05 ownership-handoff requirements present in the machine-readable crosswalk and public dossier.
- Added crosswalk schema, source and control reference checks, route-count consistency, union-summary checks and pinned PDF SHA-256 validation.
- Added horizontal browser coverage for the OWASP route across PALO Guide, Evidence Pack, Documentation Library and Platform Map, including mobile layouts and release-facing consistency checks.

## [3.0.1] - 2026-08-12

### Added

- Added the preloaded local Evidence Pack experience, a voluntary SHA-256 validation receipt and three schema-valid gold cases.
- Added `case:contribute`, a one-command generator and validator for Community Casebook contributions and pull request preparation.
- Added the five-day activation runbook, 20-seat founding review protocol and public changed-because-of-feedback log.

### Changed

- Normalized tracked source and generated publication text to plain ASCII punctuation, separators and status labels.
- Added an automated text-style gate for source files, generated `dist` files and current Git metadata.
- Started a 30-day new-module freeze, enabled one canonical GitHub Discussions channel and added the five-day activation and changed-because-of-feedback records.
- Made PALO Evidence Pack the only primary website and README activation route while retaining existing modules as downstream tools.

## [3.0.0] - 2026-08-12

### Added

- Added the canonical PALO semantic spine with stable HTTPS identifiers, definition versions, evidence/authority classes, source references and review dates across 46 public graph entities and their relationships.
- Added lifecycle, Gate Instance and append-only Gate Decision Record contracts with actor authority, rationale, immutable input snapshots and digest chaining.
- Added atomic Evidence Artifact, Evidence Claim, Evidence Evaluation and Evidence Bundle Manifest contracts while retaining P1 Case File and Evidence Bundle v1 compatibility.
- Added a JSON-LD context, RDF ontology, SHACL shapes, valid/invalid Turtle fixtures and executable semantic invariants.
- Added a versioned atomic mapping registry across controls, indicators, gates and sources, plus change-impact and digest-bound semantic release manifests.
- Added a public Semantic Inspector, evidence/authority filters in Platform Map and Documentation Library, and semantic record drawers in the Governance Hub prototype.

### Changed

- The Explorer graph asset is now generated deterministically from the semantic spine instead of being an independently maintained catalog.
- Delivery state is now separate from evidence authority: Canonical definition, Source-backed context, Illustrative local preview and Human review required.
- Executive and Technical in the Governance Hub are explicitly workspace lenses, not access-control roles; all prototype records and exports declare their non-authoritative local-preview boundary.
- P2 registry documentation now reports the canonical 9 controls and 10 indicators.
- Root web/package/release metadata and shared asset cache keys advance to v3.0.0.
- Release metadata now distinguishes the PALO v3.0.0 platform release from independently versioned developer-preview components.
- Documentation Library is the canonical source-backed documentation destination; Documentation Hub remains a backward-compatible transition page.
- README, citation metadata, lifecycle narrative, naming convention and roadmap are reconciled with the v3.0.0 Semantic Foundation release.
- Local assessment outputs and specifically identified private or third-party research inputs are excluded from accidental staging.
- The P0 gate now bootstraps locked Governance Hub dependencies and the verified OPA binary for clean-clone reproducibility.

### Validation

- Added generation-drift checks, JSON Schema validation, RDF parsing, SHACL-subset conformance checks, invalid-fixture assertions, mapping/digest validation and public build coverage to the P0 gate.

## [2.5.0] - 2026-07-18

**Release status: Full-Cycle Developer Preview. Isolated evaluation only.**

### Public surfaces and documentation

- Added the three-entry PALO/PALO-AM/PALO-AI governance map, cognitive front door, canonical Why PALO-AI and Quickstarts pages, browser-local outcome comparison, capability rail and nine-gate Production Readiness route.
- Added the searchable Documentation Library, deterministic Markdown publication pipeline, Governance Hub prototype, product specification, role-based guide, workflows, diagrams and nested Vite publication.
- Added local, hybrid, managed-cloud and private-cloud guidance, cyber-assurance and scale planning, staged community entry and explicit production-readiness boundaries.
- Added n8n governance architecture patterns, presentation assets, launch material, integration-boundary documentation, installable alpha package, local n8n runtime test report and deferred provenance publishing workflow.
- Consolidated primary navigation around Start, Agentic Governance, Governance Hub, Tools, Documentation and Readiness, with progressive disclosure of contracts and evidence.
- Hardened Governance Hub navigation, downloads, boundary tests and accessibility while preserving the explicit developer-preview and non-certification claims.

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
