# PALO Blueprint Index (PBI)

Status: **design proposal, 11 November 2026**. No validated formula, score, threshold or ranked model entry exists.

## Naming

**PALO BlueprintBench** is the evaluation programme, protocol, corpus and tooling. **PALO Blueprint Index** is the proposed future summary of an eligible, versioned evaluation. A name does not establish scientific validation or institutional accreditation.

The unit of evaluation is a complete configuration and corpus cohort: model revision, provider/runtime, quantisation, reasoning, context, pipeline, adapter, prompts, retrieval and recovery settings. A bare model name must never receive an apparently universal score.

## Publish a profile before a composite

The eight dimensions remain visible: document fidelity; semantic faithfulness; coverage and uncertainty; ER/dictionary/ontology consistency; process fidelity; governance controls; reliability/recovery; human effort and FinOps.

An eventual 0–100 display is a candidate presentation choice, not an implemented scale. Normalisation, weights and thresholds must be preregistered, justified with domain reviewers, sensitivity-tested and frozen before the scored evaluation cohort. Raw numerators, denominators, uncertainty and per-family results must remain downloadable alongside any composite.

Cheap or fast answers must not compensate for an inverted permission, invented authority, unsupported ownership, data-disclosure violation or missing required output. Required control and critical-error gates need an explicit non-compensatory rule. Costs and human effort should remain companion measures; whether any efficiency term belongs in the headline index is an open methodological question.

## Eligibility before scoring

1. Rights-cleared document families, split by related source family rather than arbitrary files.
2. Reference answers independently annotated without viewing system outputs, with adjudication and documented disagreement.
3. Frozen configurations, corpus commitments and scoring protocol with independently verifiable registration time.
4. Comparable repeated runs, retained failures, timeouts, recoveries and full attempt accounting.
5. Enough independent families for justified uncertainty estimates and stability analysis. The sample-size rule is not yet set.
6. Versioned evidence and reproduction status, plus declared maintainer or provider conflicts.

If eligibility is missing, display **Not qualified / PBI unavailable**, never a zero or a fabricated score. Missing costs remain unknown. Existing development diagnostics are excluded from qualification. The current evaluator always emits `qualified: false`.

## Change control

Publish an RFC and retain dissent before adopting a scoring rule. Changes to corpus membership, weights, gates, prompts or adjudication policy create a new protocol version and a separate comparison cohort. Do not rerank historical scores silently. Publish correction history, withdrawn submissions and the reason for every status change.

## Domain proposal

`paloblueprint.org` is the preferred candidate for a dedicated public home; `paloblueprintindex.org` is a longer alternative. Availability and price remain unverified: the 11 November 2026 RDAP checks returned HTTP 403. No domain has been purchased. The canonical URL remains the live PALO page until a registered domain and migration are explicitly established.

The earlier preference for `blueprintbench.org` is withdrawn. Andon Labs already publishes [Blueprint-Bench / Blueprint-Bench 2](https://andonlabs.com/evals/blueprint-bench-2), a spatial floor-plan benchmark ([paper](https://arxiv.org/abs/2509.25229)). This is a discoverability and attribution concern, not a legal finding. PALO's business-document evaluation is unrelated to that work. Use the full PALO name in public references; existing repository paths and semantic identifiers remain stable pending a separately reviewed naming decision.

A separate domain improves discoverability and gives the evaluation programme its own home. Independence requires actual external custody, review and decision authority, not a domain name. PALO Blueprint Index continues to mean the proposed summary metric; it is not evidence of accreditation or an available score.
