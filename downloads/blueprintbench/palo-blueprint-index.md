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

`blueprintbench.org` is the preferred proposed domain because it names the evaluation programme without tying the identity to a single composite. `paloblueprint.org` is an alternative. Neither is purchased or claimed to be available. The 11 November RDAP checks returned HTTP 403 and did not establish availability or price. Until a domain is selected and registered, the canonical URL remains the live PALO page.
