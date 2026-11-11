# PALO Blueprint evaluation cross-review

11 November 2026. Reviewed source: `66c6c5b`. This is an advisory static review and targeted evaluator reproduction, not independent benchmark validation or Workbench application qualification.

## Implementation follow-up

The findings below describe source `66c6c5b` and remain an immutable-in-meaning historical review. The subsequent [launch verification](launch-readiness.md) records evaluator 0.2 fixes, explicit trust boundaries and the raw-output replay archive. Consult that release report for current implementation status.

## Decision

Concentrate the first empirical study on **specification fidelity in procurement**: critical changes to obligations, permissions, negation, ownership and exceptions, alongside required-fact coverage and measured human correction effort. The eight-dimensional programme remains a research roadmap. The [study RFC](specification-fidelity-study.md) does not adopt a score or claim a validated cohort.

A dedicated public home is useful. Prefer **paloblueprint.org**, subject to availability, price and user registration approval. The earlier preference for blueprintbench.org is withdrawn because [Andon Labs already publishes Blueprint-Bench / Blueprint-Bench 2](https://andonlabs.com/evals/blueprint-bench-2) ([paper](https://arxiv.org/abs/2509.25229)). No trademark conclusion is drawn. RDAP returned HTTP 403, so availability is unknown. No domain was purchased or migrated. A separate address does not establish independent governance.

## Review provenance and limits

The web reviewers received an 84,376-byte packet containing README, governance, PBI proposal, protocol, semantic vocabulary, OWL ontology, evaluator and explorer JavaScript, together with explicitly supplied execution/publication facts. The initial packet did not contain the separate SKOS taxonomy or version policy; these omissions were corrected during adjudication. It did not contain the full application implementation, rendered screenshots or a runnable 100 MB corpus. Claims of new app execution or visual qualification would be unsupported.

- **Gemini 4 Argon, High (Alta), web:** completed an extensive first review and a revised review after receiving the missing SKOS/version files. It withdrew the alleged missing taxonomy, incompatible component versions, incorrect faithfulness calculation and unknown-cost defects. It retained genuine annotation consistency, termination-accounting and frontend metadata concerns. Its subsequent request about the user's strategic feedback returned a refusal; no further opinion is attributed to it.
- **GLM-5.3, Max, web:** completed a final text review after its initial file/tool workflow was stopped without a verdict. It confirmed the code-level critical-count asymmetry and annotation/provenance weaknesses, endorsed a narrow procurement study and externally signed scope-bound qualification, and explicitly reported that it had not run tests or inspected the live site. It received a summary of the user feedback and reproduced behaviours, so that part is not a blinded independent discovery.
- **LM Studio, qwen3.8-27b-uncensored, Q6_K, loaded context 8,192:** returned a completed final review through `/v1/completions` in direct-answer mode (explicit closed thinking block), 2,878 input and 1,161 output tokens, finish reason `stop`. Two prior reasoning-enabled chat attempts exhausted 3,500 and 5,200 output tokens without a final answer; neither counts as a completed review. The completed response is a narrower advisory check, not an equivalent high-reasoning review. It supports separating pilot/recruitment from ranking and flags critical-count and evidence limitations.

These are not identical-prompt model measurements. The local reviewer received a smaller method/domain/ontology packet to respect its loaded context. Web model names/settings are UI observations; the local identity is the server-reported model identifier. No independent weight/provenance verification is implied. No OpenRouter calls or new inference spending were used for this cross-review.

## Reproduced behaviours

The [probe script](../reviews/2026-11-11/reproduce_findings.py) and [results](../reviews/2026-11-11/reproduced-findings.json) use synthetic fixtures against the unchanged evaluator at `66c6c5b`.

| Probe | Observed result | Adjudication |
|---|---|---|
| Repeat one unsupported critical proposition four times, retaining its equivalence class | Affected precision stays 0.5; critical count becomes 4 | Confirmed counting inconsistency if the measure is unique semantic errors. Define distinct critical propositions and optionally retain raw occurrence count separately. |
| Mark the two supported propositions in the faithful fixture as critical | Affected precision and recall remain 1; affected row records 2 critical errors | Confirmed annotation inconsistency: `critical` is consumed as an error flag, not merely importance. Reject contradictory annotations. |
| Change the failed fixture to reported pass with no supported/recovered propositions | Reported completion changes from 1/3 to 2/3; affected precision and recall are zero | Confirmed declared-status behaviour. It is not a qualified quality score. Preserve completion, and introduce a separately computed accepted outcome under a preregistered contract. Do not silently redefine the historical metric. |
| Backdate/reclassify a local lock and recompute all relevant hashes | Accepted, but qualified remains false | Confirmed trust boundary. A checksum is not an external timestamp or signature. Current docs already disclose this; trusted preregistration still needs external evidence. |
| One asserted proposition is annotated as matching both gold items | Precision and recall are 1 | Confirmed reliance on supplied atomicity/equivalence judgments. Many-to-many mappings can be legitimate; ID equality alone does not validate raw-output decomposition. Add source/output spans and adjudicated mapping. |
| Set one cost to unknown/null | cost_complete=false; cost_per_success_usd=null | Existing safeguard works. Additional unresolved-reservation reporting is an extension, not evidence that unknown costs become zero. |

The 17 existing evaluator tests passed again in this review. They do not cover the newly reproduced weaknesses. All six probes retained `qualified=false`. No malformed evidence was promoted into an independently qualified score.

## Additional findings and disputed claims

- Budget stops, pre-call blocks and semantic failures need explicit distinct termination reasons. Current `pass/fail/abstain/not_run` accounting is not sufficient for future campaign reporting. Empty not-run attempts should not require fresh semantic double annotation; evidence of non-execution and denominator retention must remain.
- The explorer correction badge is hard-coded to the `mistralai/` prefix. That is correct only for the present row and will mislabel future rows from the same vendor. Move the correction into row metadata. CSV export omits configuration fields shown in the detail view; preserve them in evidence exports.
- Success-only latency is labelled, and unplottable models are disclosed. Nevertheless, sample counts and completion denominators should accompany every timing point. A median of one or three observations is mathematically valid, but not a stable population estimate. Configuration-specific diagnostics cannot support universal model rankings.
- Version numbers intentionally differ by component. `v0.2.0-pilot.1` exists and archives explorer v0.2/evaluator v0.1. The claim that no release tag exists is false for the inspected repository. An older immutable tag need not point to current HEAD, and component numbers must not be forced equal. Publish an explicit release manifest when issuing the next release.
- The eight dimensions and state concepts exist in the separate SKOS file. Hyphenated concept URIs and underscored evaluator codes are not automatically incompatible; an explicit tested mapping would remove ambiguity for consumers.
- `run-record-fields.json` explicitly calls itself a proposed field specification, not an implemented validator. The scoped evaluator still needs a machine-readable executable contract before external submissions. A single JSON Schema will not by itself prove semantic atomicity, independence or custody.
- Historical model aggregates are insufficient for independent reproduction. Publish rights-cleared prompt/schema/adapter/checker versions and raw outputs with hashes. Do not equate the current counts with reproducible held-out accuracy.
- The JSON digest is an internal deterministic Python serialization, not a declared RFC 8785 implementation. Cross-language canonicalization needs a versioned contract and test vectors; changing it requires a migration policy, not rewriting historical commitments. Explicit UTF-8 I/O and CI checks for copied public artifacts are sensible portability controls.

## Reviewer recommendations not adopted automatically

GLM proposed dividing critical errors by emitted propositions, rejecting critical failures from comparability, and requiring one-to-one claim/gold matching. These are not adopted as written. Emitted-output denominators can be diluted with extra supported statements; the study therefore also needs fixed source-rule denominators and coverage. Valid comparisons must retain poor outcomes, while qualification/acceptance is a separate gate. One-to-many matches may legitimately represent equivalent reference granularity; atomicity must be adjudicated rather than enforced by an arbitrary cardinality rule. An older release tag is not itself a defect.

Gemini's initial missing-taxonomy and version findings arose partly from omissions in the packet and were explicitly corrected. Its revised requirement to fix all evaluator gaps before any recruitment is stronger than warranted: transparent recruitment of reviewers is possible while the method is still being built. Neither reviewer's severity labels are accepted solely on authority.

The local model suggested deduplication by content hash, three independent families as a minimum, and three repeats to calculate confidence intervals. Exact text hashes do not establish semantic equivalence; neither family count nor repeats alone establishes statistical adequacy. Those prescriptions are not adopted. Its suggestion to adopt a new canonical domain is also premature: availability and registration are unresolved. Existing tags will remain immutable.

## Strategic adjudication

The competitive context in the supplied feedback is real: [Vals announced a USD 40 million Series A](https://www.vals.ai/blogs/series-a), and [Artificial Analysis publishes GDPval-AA](https://artificialanalysis.ai/evaluations/gdpval-aa). Those facts do not establish that specification fidelity is an unoccupied category. The proposed niche is a hypothesis to test through relevant prior work, the calibration study and five customer-discovery conversations, not a claim of market exclusivity.

150–200 propositions are a feasible planning target, not 150–200 independent observations. Source families are the sampling units for generalisation. Three repeats estimate run variability. Claim-level Wilson intervals on clustered passages must not be advertised as valid model-comparison confidence intervals; bootstrap cannot compensate for insufficient independent families.

Reuse an adjudicated proposition bank only with source, scope, rubric and context binding, retained provenance and reviewed equivalence. New model paraphrases are not automatically identical propositions. The human workload will fall only if reuse is validated, not merely cached.

## Qualification authority

The current evaluator is correct to refuse automatic independent qualification. The proposed next act is a **signed, scoped qualification decision**, not a JSON switch. An appointed external custodian acknowledges the frozen corpus/gold commitment before the run; a domain adjudication authority attests the reference and decisions; an independent reproduction/qualification reviewer checks the recorded run, evidence and conflicts. The decision binds exact versions and hashes, names limitations and offers an appeal path. No such appointment or decision exists now. See the [RFC](specification-fidelity-study.md#qualification-decision).

Recruiting collaborators can proceed with these limits clearly disclosed. A ranked benchmark and a generally business-ready Workbench release remain unsupported by the current evidence. The latest supplied large-repository campaign has no reviewed export; this review did not rerun those repositories.
