# PALO Two-Lens AI Maturity Assessment

Status: experimental browser-local assessment, methodology 1.0.0, 21 October 2026. Functional tests do not establish empirical validation or operational assurance.

The [interactive module](../PALO_AIMaturity.html) adds a repeatable evidence review to PALO: can a scoped organization deploy AI, and can it govern the consequences? The output keeps deployment capability, four governance pillars, evidence coverage and review priorities separate. It does not produce a national ranking or a combined trust score.

## Origin and source boundary

Fabrizio Degni's [AI Maturity 2026 post](https://www.linkedin.com/posts/fdegni_aigovernance-responsibleai-agenticai-share-7518491645940682752-nEQI/) proposes an operational perspective connecting institutional capability, delegated decisions, observable behaviour and verifiable evidence. This module operationalizes that proposal through a new PALO rubric. Its questions, levels and conservative aggregation are design choices for pilot evaluation, not BCG indicators or an empirically validated scale.

The [BCG report](https://www.bcg.com/publications/2026/countries-most-ready-for-ai) compares more than 75 economies through exposure and readiness. Its 33 readiness indicators are organized under ASPIRE: Ambition, Skills, Policy and regulation, Investment, Research and innovation, and Ecosystem. Exposure describes economic structure and potential disruption; it is not an organization's runtime risk classification. The module's deployment questions are an organizational capability lens, not an ASPIRE calculation or a proxy national score.

The supplied 28-page October 2026 PDF was examined, including the methodology table on page 24. Its SHA-256 is `9d5164f926ef10b822fc3baf0b9b71d43d365c74dbf0816be1c004b9c4ecb343`. It remains a research input outside the publication allowlist. The public module links to BCG, and does not redistribute the PDF or reproduce its rankings. The infographic is author-supplied conceptual material; quantitative statements are checked against the report, not inferred from its artwork.

### What the report does and does not establish

| Source location | Observation | Consequence for this module |
| --- | --- | --- |
| Pages 5 and 24-25 | Readiness has 33 indicators; the 2026 additions concern compute, domestic model development and AI regulation. | Preserve the distinction between a national benchmark and an operational assessment. |
| Page 24 | The policy and regulation pillar totals 10%; its national AI legislation indicator carries 2.5% and is binary. | The existence of law or policy is useful context but does not directly demonstrate a particular system's oversight, intervention or remedy. |
| Page 12 | The report explicitly discusses transparency, redress and human oversight as conditions for sustained adoption. | Do not claim BCG ignores responsible AI. The proposed extension concerns observable evidence in the measurement architecture. |
| Pages 21-22 | Dependency choices, societal effects, systemic risks and unequal gains are acknowledged. | Add dependency exercises, affected-person outcomes and cumulative-impact questions to the operational review. |
| Pages 23-25 | Data vintages differ; national scores use normalization, weighting and bounded peer-group imputation. | Do not compare PALO ordinal levels with BCG scores. Missing operational evidence remains missing; no peer imputation. |

The infographic's statement about doubled enterprise investment needs the report's page 4 qualification: investment is measured as a percentage of firm revenue. It is not evidence that every organization doubled absolute spending. That statistic is unnecessary to the scoring and is not used in the module.

## Established and new perspectives

The existing [Assessment Path](../PALO_AssessmentPath.html) already covers risk and impact routing, controls, evidence readiness, source observations and Case File export. It is not a deployment-only or governance-free predecessor. The new module complements it by testing the strength and currency of evidence for capability claims over a declared period.

| Established question | Additional question | Practical effect |
| --- | --- | --- |
| Do we have an AI strategy, policy and owner? | Can that owner supervise, challenge and change an outcome? | Require competence and intervention evidence. |
| Can we build and deploy? | Can we revoke authority, contain effects and recover? | Review negative tests and stop observations. |
| Was a request permitted and executed? | Was the promised effect observed, or was the result inconclusive? | Keep permission, execution and outcome evidence distinct. |
| Did the supplier provide commitments? | What happens when those commitments, dependencies or data practices change? | Assign change review, continuity and exit work. |
| Is an evidence document available? | Is it current, in scope, reproducible and open to independent challenge? | Show unresolved evidence and a review deadline. |
| Did we improve a readiness score? | Did we improve the weakest supported capability without concealing harm? | Retain both lenses, four pillars and explicit limitations. |

BCG's 2026 model also evolves from its earlier edition. The comparison is between different questions and units of analysis, not a claim that an earlier framework has become invalid. Existing PALO assessments are retained unchanged; no historical score is invented or automatically migrated to this new rubric.

## Scope and workflow

1. Name an organization, institution or system. Specify its boundary, accountable owner and observation window. A public institution can be assessed; a national population cannot be ranked with this instrument.
2. Use six deployment questions to inspect purpose, skills, data/infrastructure, operating resources, evaluation and dependency resilience.
3. Use sixteen governance questions across the four pillars below. For each answer record the declared level, evidence type, retrievable reference, reviewer, observation date, review deadline and rationale with limitations.
4. Review unresolved items and critical gaps before comparing the two lenses. Export the JSON and Markdown register or explicitly attach a draft snapshot to the current Case File.
5. Reassess after a meaningful observation period or material change. Compare only matching scope and methodology versions.

All questions are part of the minimum profile. There is no exclusion switch that can remove a weak critical control. For advisory systems, assess boundaries on advice, escalation and downstream decisions. For non-physical systems, explain the lack of a physical actuation path and assess cumulative, social and resource effects in B4. If a question cannot be responsibly interpreted for a scope, leave it unresolved and tailor the methodology in a separately versioned pilot; do not represent an unassessed item as a pass.

| Pillar | Questions | Existing PALO connections |
| --- | --- | --- |
| Institutional capability | Accountable oversight; independent challenge; affected people and remedy; dependency/policy accountability | Human review, AIMS audit and corrective action, appeal/remedy, accessibility, supplier review |
| Delegated authority | Decision boundaries; specific approval and separation of duties; revocation; continuity through changes/delegation | Purpose boundaries, agentic authority, change gates and runtime boundary controls |
| Observable behaviour | Authoritative effects; harms/disparities; incident recovery; cumulative and physical consequences | Decision trace, fairness, incident response, systemic risk and environmental performance |
| Verifiable evidence | Decision chain; data lineage/permitted use; currency/change triggers; reproducible challenge | Traceability, data lifecycle, change control and internal audit |

Every question in the [catalog](../data/ai-maturity-assessment.json) names existing control IDs, a lifecycle gate, a suggested evidence artifact and a next action. These are interpretive PALO mappings; they do not amend the canonical control registry, ontology or runtime admission rules.

## Evidence and scoring rules

The scale is ordinal and cumulative: 0 absent; 1 documented; 2 tested; 3 monitored; 4 independently challenged and improved. A level 4 answer assumes the underlying lower-level capabilities have also been demonstrated. The assessor must explain that claim in the rationale and evidence. Level differences are not percentages or equal quantities of capability.

| Evidence type | Maximum supported level |
| --- | --- |
| None or declaration alone | Unresolved |
| Documented record | 1 |
| Test record | 2 |
| Repeated observation | 3 |
| Independent review and improvement | 4 |

The supported item level is the lesser of the declared level and evidence-type ceiling, provided the evidence metadata is complete, the observation falls within the assessment window, and review is not overdue. Even a level 0 assertion requires a dated record explaining the observed absence. Missing values, future observations, invalid periods and expired review dates never become zero or success by default. Review deadlines are inclusive through the stated UTC calendar date.

A domain level is the minimum supported level across all of its questions, and is unresolved until all questions have supporting metadata and the scope is complete. Deployment is the minimum of six items. Governance is the minimum of sixteen items; its four pillar profiles remain visible. Coverage is the proportion of items with a supported level: a declared level and complete, current, in-scope metadata for evidence beyond a declaration. It is not the probability of safety, completeness of real-world assurance or independent verification. Critical items with unresolved evidence or levels below 2 are prioritized, and cannot be compensated by high deployment capability.

The minimum rule is intentionally conservative and can be dominated by one item. It is a transparent triage convention for this pilot, not a statistically calibrated index. Do not use it to rank unrelated entities, claim compliance, allocate delegated authority or automatically approve deployment. Preserve the item register alongside every summary.

The browser checks structure and date relationships only. It does not retrieve evidence URLs, authenticate reviewers, establish independence, verify the contents of a test, discover bypass paths or prove absence of harm. A complete profile means the submitted evidence metadata meets this rubric; it does not mean that PALO has independently verified the capability. An external review should sample references, challenge scope and test contrary evidence.

## Improvement and new perspectives

Immediate priorities are generated from unresolved, low-level and evidence-capped items. Each points to an existing PALO control and gate. An accountable improvement plan should add an owner, deadline, required artifact and closure test to the Case File. Completion of the assessment does not automatically close a finding.

The new perspectives emphasize power and consequences: who may decide, who can contest, whether revocation works, whether effects are observed, and whether evidence survives supplier or model change. They also address data permissions, affected groups, cognitive or skill dependencies through practical competence, accessible remedy, physical effects and environmental/resource costs. A broad rubric cannot establish causality or exhaust every sector-specific hazard; use dedicated FRIA, security, safety and data assessments where the scope demands them.

Before formal organizational use, pilot the rubric on varied systems; have independent reviewers assess the same evidence; measure disagreements, missing-data rates and sensitivity to the minimum rule; test whether recommended actions reduce observed control gaps. Publish the sample, limits and any revised question anchors under a new catalog version. This repository implementation has functional tests, not that empirical validation.

## Case File, history and PolicyWatcher

The module can append an `ai-maturity` assessment and draft evidence snapshot to the existing PALO Case File through its established merge API. Existing assessments, sources and context are retained. The saved snapshot includes the assessment input, evaluated result, evaluation time and versioned source references. JSON export/import uses the [assessment schema](../schemas/palo-maturity-assessment.schema.json). Extra top-level input fields are tolerated for exchange compatibility, but imported scores are not trusted: the browser normalizes accepted fields and recomputes results from responses and the installed catalog. Other consumers must do the same. The question catalog has its own structural schema, with separate tests for canonical control and gate mappings.

The module does not automatically convert Assessment Path's readiness answers into maturity levels. A prior assessment may be imported as an explicit baseline. Cumulative or overlapping windows are allowed when the start does not move backwards and the end is later; these comparisons are descriptive and are not independent samples. Synthetic and operational profiles cannot be compared; two synthetic profiles remain labelled as a synthetic comparison. Comparison requires the same name, unit, boundary and catalog, a later assessment and an observation window that moves forward. Historical evidence is evaluated at its original assessment time; current evidence is evaluated now. Both profiles must be complete. Deltas describe ordinal movement, not measured causal improvement; a personnel or architecture change may still make comparison inappropriate and must be reviewed.

PolicyWatcher remains an external observation source. A changed policy or supplier term can be referenced in I4/E3 and routed through the existing [source review workflow](palo-policywatcher-signal-operations.md). A reviewer checks acquisition completeness, relevance, source version and applicability, then reopens affected gates. A failed acquisition is not an unchanged policy. This new module neither connects to PolicyWatcher nor grants a monitoring signal decision authority. There is no background transmission of assessment data.

## Local validation and release boundary

Run `npm run maturity:check` for scoring, adverse inputs, schema fixtures, catalog/control mapping and local export checks. Browser verification covers desktop/mobile use, persistence, import/export and preservation of a pre-existing Case File. The normal publication allowlist includes the page, assets, catalog, schema and guide; it excludes the attached BCG PDF and user assessments.

The module is a local implementation until the site release is separately published and verified. The Governance Hub link is navigation to the existing preview, not authenticated telemetry integration. This work does not change PALO-AI production readiness, legal applicability decisions or runtime authorization.

## Source pinning and browser use

Catalog versions freeze their source references, including the supplied PDF hash. A changed source snapshot requires a new catalog version; maintainers must not replace pinned content under version 1.0.0. Existing JSON remains historical evidence, but a different catalog requires explicit, separately documented migration before comparison. A hash identifies bytes and is not a certificate of authorship, accuracy or independent verification.

Use the hosted web page or serve a local checkout over HTTP. Browser-local calculation means answers are processed in the browser; it does not imply support for opening the HTML with a file URL. All date inputs and expiry boundaries use UTC calendar dates. The synthetic example remains synthetic after edits; use Reset to create a blank operational assessment. Unsaved edits trigger the browser's navigation warning where supported.

The synthetic marker is an honest UI provenance cue, not an authenticated seal. Someone who deliberately edits an exported JSON file can remove or falsify it, just as they can falsify evidence references or reviewer names. Imported records require accountable source review; this local tool cannot establish their truth or history.
