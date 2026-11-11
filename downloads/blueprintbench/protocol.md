# PALO BlueprintBench

**Research proposal v0.1, 10 November 2026. Not a validated benchmark or a published ranking.**

## The decision this benchmark should support

Which model and system configuration can turn a business document collection into a faithful, traceable development blueprint, with an acceptable amount of human correction, time and expenditure?

The proposed contribution is to measure this complete outcome: **documents → business interpretation → reviewed blueprint → executable contract checks**. Multi-dimensional evaluation, document understanding and process-model evaluation already have substantial prior work. PALO must acknowledge that work and earn credibility through its evaluation design and independent reproduction. It cannot yet claim to outperform existing benchmarks in methodological quality.

The three existing repositories remain valuable regression tests. They are now development data, because their failures have guided changes to PALO. Their 27 reference items are a small diagnostic set, not exhaustive ground truth and not evidence of unseen-domain generalisation. None of the ten-model passage probes is currently eligible for an unseen-task leaderboard.

See [RESEARCH.md](research.md) for the primary-source comparison, and [REVIEW-DECISIONS.md](review-decisions.md) for the model reviewers' challenges and our adjudication.

## What is ranked

A result belongs to a **configuration**, not just a model name:

`model revision × serving provider/runtime × quantisation × inference settings × harness version × dataset version × run date`.

Record advertised context, configured context, observed input size, maximum output, actual output and reasoning tokens separately. Record requested reasoning and what the endpoint actually supports; an unavailable measurement stays unknown. A catalogue date is not necessarily a release date. A hosted alias with no immutable revision must say so. Country, licence, base-model lineage and openness are useful filters, not quality scores. An orchestrator is labelled as a system, not treated as an independent base model.

Three views are necessary:

1. **Interpretation track:** identical, human-verified extracted source units and task contract. This isolates business reasoning from OCR and parsing. Compatible wire schemas are disclosed and validated against the same semantic contract. A provider rejection is a compatibility result, not proof of zero semantic ability.
2. **Document-to-blueprint track:** original PDF/XLSX files, with parsing, retrieval, inference, reconciliation and export measured together. A fixed PALO harness and an open, independently implemented system track are reported separately. Any answer-aware tuning is restricted to development data.
3. **Control conformance suite:** fault injection, permissions, review state, budget enforcement and export integrity. These are system-control results; they are not added to an LLM intelligence score.

Business-user studies are an additional evidence layer on the second track. Assistant review cannot substitute for measured human effort. Local and cloud configurations may be compared on the same semantic tasks, but latency, resource and cost comparisons must retain their hardware/serving boundaries. A local deployment is not automatically private: test its actual network behaviour.

## New cases and contamination control

### Proposed first feasibility release

Keep the current three repositories in a public development suite. The target is **12 new repository families across six business domains**, with two independently sourced families per domain. Start with **six new families across three domains** to validate the measurement process before expanding. Both counts are design targets, not statistically established sample sizes. Start by authoring and auditing a small number of complete tasks per repository rather than promising exhaustive annotation of hundreds of megabytes.

Candidate domain mix:

| Domain | Business outcome | Difficult distinctions |
|---|---|---|
| Procurement and supplier management | Tender, evaluation, award and contract blueprint | Bidder versus supplier; proposed versus awarded; thresholds and exceptions |
| Food supply-chain traceability | Lot, shipment, receipt and transformation model | Physical possession, distinct event roles, optional versus mandatory fields |
| Transit operations and reporting | Service, asset, reporting and approval model | Reporting year, units, multiple entity owners, superseded definitions |
| Grants and project administration | Application, eligibility, milestone and reimbursement process | Conditional obligations, evidence requirements, approval authority |
| Manufacturing quality | Inspection, nonconformity and corrective-action process | Defect versus observation; responsibility versus ownership; rework branches |
| Energy and facilities operations | Work request, measurement, authorisation and reporting process | Units, time windows, exceptions, contractual versus recommended actions |

Three verified public discovery pools are World Bank procurement guidance and workbook templates, FDA traceability documentation and its illustrative spreadsheet, and FTA NTD manuals, dictionaries and Excel data. These are **candidate sources**, not yet rights-cleared, assembled, size-qualified or held-out cases. The remaining domains require source acquisition and rights review. See RESEARCH.md for links.

Target at least six naturally substantial repositories of **100 MB or more** for the scale stratum. Do not pad files, duplicate appendices or mix unrelated documents merely to reach a byte threshold. Report bytes, pages, extracted characters/tokens, workbook cells/formulas, OCR share, relevant evidence density, cross-file dependencies and process branching. A 100 MB image-heavy PDF can impose less language-model work than a small dense workbook.

Keep all documents, revisions, translations and derived tasks from a source family in one split. Near-duplicate text, tables and template provenance need checks beyond SHA-256. Reserve a separate unseen organisation or workflow family where possible. Hold-out construction and labels should be controlled by someone outside the PALO tuning loop. The agent maintaining PALO should not inspect sealed answer keys. Public documents may already be in model training data; call this *held out from PALO development*, not proven contamination-free.

Publish source manifests, licences/permissions, downloader versions, hashes and expired-link handling. Redistribute files only when permitted. Use public calibration tasks, sealed evaluation tasks with submission limits, and a later retired-test release for reproducibility. Once a test is used to tune the product, move that family to development and version the benchmark. Use new time-based cohorts and carefully audited counterfactual variants to test reliance on supplied evidence; never present synthetic variants as real business records.

## What the scores mean

Freeze each task's required output scope before testing. The gold specification is a set of source-backed propositions, allowed alternative models and forbidden inferences, not one preferred ER diagram. Preserve unresolved ambiguities. Include entity aliases, relation direction, actor, owner, temporal scope, negation, modality, units, conditions and exceptions in the rubric.

| Dimension | Primary measurement and denominator | Evidence |
|---|---|---|
| Document fidelity | Correct required cells/spans/layout elements over all annotated required elements; formula and value preservation separately | Source coordinates, extraction diffs, annotated page/sheet slices |
| Semantic faithfulness | Supported propositions over all emitted assessable propositions in the declared audit scope; critical contradiction count separately | Two independent blinded annotations and adjudication |
| Coverage and uncertainty | Recovered gold propositions over all required gold propositions in the annotated scope; answerable/unanswerable decisions separately | Fixed gold scope; abstention and omission counts |
| ER, dictionary and ontology | Correct nodes, attributes and directed relations against allowed mappings; unsupported cardinality/uniqueness/type counts; endpoint closure | Graph diff, accepted equivalents, deterministic constraint logs |
| Process fidelity | Correct required branches, actors, conditions and exceptions over all required gold process elements; forbidden behaviours separately | Positive and negative process traces, source-linked rules |
| Governance controls | Required scenarios passed over all assigned scenarios; count actual unauthorised effects, leakage and false blocks separately | Instrumented network/export/state receipts, not model assurances |
| Reliability | End-to-end tasks reaching the predefined valid outcome over all assigned tasks; recovery equivalence and duplication failures | Stage timings, checkpoints, retry tree and final export hashes |
| Human effort and FinOps | Active correction time and actions per task; reviewed outcome rate; total cost per assigned task and per successful blueprint | Actual business-user sessions, change logs, reconciled ledger |

Atomic proposition scoring must not reward verbosity or duplicate synonymous claims. Match a gold item at most once for recall. Unsupported added claims remain precision errors. Include claims lost during validation in stage-loss reporting; measuring only accepted claims would hide pipeline rejection. If full precision annotation is unaffordable, publish a probability-sampled estimate with inclusion probabilities, sampling seed, scope and uncertainty; do not label a convenience sample as full-corpus precision. Stratified recall on annotated slices is **not** whole-repository recall.

An empty answer has zero task coverage. Its precision is undefined, not 100%. Appropriate abstention on unanswerable tasks earns its own score; unjustified abstention on answerable tasks reduces task success. PASS, FAIL, ABSTAIN, NOT-RUN and NOT-APPLICABLE remain distinct. Mandatory capabilities cannot become N/A just because a model lacks them. A configuration that skips assigned tasks receives no complete-track ranking, and its missingness remains visible.

For review effort, count time correcting, adding missing facts, investigating evidence and resolving disagreements, including abandoned tasks. Record inactive time separately. Use counterbalanced task order, blinded model identity, comparable business experience and a manual baseline. Scripted assistant review seconds are not a proxy for business usability. Cost per accepted entity is supplementary because it is easy to game by emitting many trivial entities.

For FinOps, record input, output, reasoning where separately reported, cache reads/writes, OCR, embeddings, reranking, retrieval services, storage, network/egress and failed/retried calls where applicable. Avoid charging context twice when it is already billed as input, and avoid double-counting reasoning included in output. Report provider-reconciled totals and estimation uncertainty. Local electricity, hardware allocation and human labour require explicit assumptions and sensitivity ranges; unmeasured local costs are not zero. Zero successful blueprints means cost per successful blueprint is undefined, with total wasted expenditure still shown.

## Executable outcome checks

The blueprint contract should contain independently testable examples: which actor may approve, whether an exception permits skipping a step, which entity owns a field, and which state transitions are allowed. A small deterministic reference interpreter can run these checks against the exported representation. It must not infer missing rules or let the same LLM write and grade the expected tests.

Use equivalent-model acceptance and independent human adjudication for valid alternative structures. A structurally valid graph may encode the wrong rule; a source citation can be genuine while the interpretation is false. Neither schema validity nor graph closure is sufficient for semantic success. The interpreter and gold tests are proposed work, not existing verified Workbench capabilities.

## Fairness, statistics and ranking

Configure every model using documented supported settings validated on development tasks. There is no universal equivalence between providers' `low`, `high` or token budgets. Publish a **quality-first profile** with declared resource bounds, and optionally a separate budget-constrained profile. Do not silently reduce reasoning to make a cheaper configuration look comparable. In a fixed-harness track, adaptation may translate transport syntax but must not inject answer-specific hints. Publish all prompt and adapter differences.

Register the model cohort, tasks, repeats, retry policy, time limits, cost ceilings and exclusion rules before the sealed run. Report attempts aborted by the global campaign budget as censored/unfinished, not semantic failures and not free omissions. Infrastructure, adapter, parser, model and unresolved failures have distinct attribution. Re-run corrected harness versions on the same full cohort before making new comparative claims.

Three repeats per configuration are a reasonable initial variability check, not sufficient proof of a stable rank. Compare configurations on the same cases. Aggregate within repository, then give domains predefined weights; do not let a large PDF dominate by generating more claims. Estimate paired differences with repository/family-level resampling and report confidence intervals and small-sample limitations. More repeated calls to the same three documents do not create more independent domains. Determine additional sample size from pilot variance and a practically meaningful difference; do not reverse-engineer it to obtain a preferred winner. Predeclare primary comparisons or control multiplicity.

Start with profiles and comparable quality/cost trade-off views, not a weighted universal score. Critical authority bypass, export leakage or materially inverted business rules prevent a **qualified** badge, but the failed configuration stays in the result table. A zero observed critical-error count is not proof of zero risk. Confidence, task counts and evidence completeness should be visible beside any order. Never infer significance from ordinal position alone.

## Leaderboard interface

The site should have three clearly separated areas:

* **Model catalogue:** every censused model, version/identity limits, provider, lineage, country, licence, release/catalogue dates and advertised capabilities. Being listed is not qualification.
* **Development evidence:** existing three cases, all failures, incompatible endpoints, raw outputs, costs and repairs. Explicitly non-rankable for generalisation.
* **Held-out results:** only comparable, manifest-complete submissions. Show incomplete and failed submissions alongside qualified outcomes with clear states; never silently drop them.

Each result opens a run card: source hashes and rights; benchmark and PALO versions; prompt/schema/adapter hashes; settings; actual context; hardware or endpoint; date; repetitions; all stage denominators; error taxonomy; timing and cost accounting; reviewer identities/roles; adjudication; export receipt; reproduction status. Separate **self-reported**, **maintainer-reproduced** and **independently reproduced** labels. Anonymous downloadable evidence must be scrubbed of credentials and any real private data.

The first release should show **no eligible held-out rankings yet**, rather than fill a chart with development scores. The accompanying RUN-RECORD-FIELDS.json is a proposed field contract, not an implemented submission validator.

## PALO's role and independence

PALO supplies lifecycle, ownership and evidence obligations; PALO-AM supplies the agentic authority/review concepts; the separate PALO-AI technical control-plane preview can contribute control contracts where actually implemented and tested. This proposal does not imply production enforcement or complete integration of PALO-AI into Workbench.

Because PALO authors both the product and benchmark, disclose the conflict prominently. Use a vendor-neutral blueprint interchange contract, publish converters, accept competing pipelines and appoint independent domain annotators and a reviewer for scoring changes. Permit appeals with versioned corrections, retain old scorecards, and disclose funding or provider assistance. LLM reviews help challenge the design; they are not independent human validation or certification.

## Delivery sequence and claims

**Now / v0.1:** this comparative research, protocol proposal, field contract and reviewer adjudication. Existing diagnostics can be published with their actual limitations. The app's engineering qualification continues separately.

**Next feasibility milestone:** rights-cleared new corpora, adjudicated gold slices and process tests, a reproducible scorer and reference implementation, then matched runs on a small declared model cohort. Use the proposed 12-family design to estimate annotation burden and variance. Expand only after those estimates, not to fill a promised ranking.

**Credible public leaderboard:** sealed tasks, registered settings, complete failure accounting, repeated runs, independent human annotation, and at least one independent reproduction. Business-usability claims additionally require actual business-user sessions. The current authorised USD 10 cloud campaign does not fund a broad independently annotated benchmark; a new programme budget would have to be estimated from measured pilot costs, without spending beyond the existing authorisation.

The defensible public proposition is: **“PALO BlueprintBench measures whether AI preserves business meaning when documents become development blueprints, and the correction effort and cost required to get there.”**

To demonstrate higher quality on a specific evaluation dimension, compare scoring methods on an independently labelled set of known semantic defects. Measure detection and false-alarm rates, inter-rater agreement, stability under equivalent representations, and independent reproducibility. The standard must catch an inverted exception or a wrong owner while accepting equivalent valid graphs. Until that evidence exists, describe the benchmark as a proposed specialised complement to established evaluations, not a superior replacement.
