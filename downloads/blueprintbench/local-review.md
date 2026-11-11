# Local LM Studio review

Observed model identifier: **qwen3.8-27b-uncensored**, served at localhost:1234. The identifier is self-reported by the local server; this review did not independently verify weights, licence or lineage.

The completed response took **160.58 seconds**, with `finish_reason=stop`, an 8,192-token output allowance and the server reasoning preset unchanged. Two earlier attempts did not deliver a final answer: a 300-second timeout, then an 1,800-token limit consumed by reasoning. They are retained as delivery failures. No OpenRouter call was used for this review; local resource cost was not measured and is not claimed to be zero.

The final response is preserved without intermediate reasoning in [local-review-public.json](local-review-public.json).

## Findings incorporated

* Fix the gold-unit scope and denominator for entities, edges and rules.
* Keep annotators blind to PALO outputs while creating gold references.
* Include negative examples, adjudication evidence and contamination checks.
* Separate model and system evaluations, and keep recovery failures visible.
* Compare the purpose and methodology of existing benchmarks, not incomparable scores.

## Findings narrowed

* N/A for a genuinely absent gold type can apply to that type's recall, but unsupported emitted items still count as false positives. N/A cannot excuse a missing mandatory capability.
* Cost and time per completed run or accepted correction are supplementary. All assigned and failed tasks must remain in the primary outcome and expenditure accounting.
* The suggested two-to-three-family release is suitable for evaluator debugging, not a credible broad ranking. The proposal uses six new families for initial feasibility, followed by a larger design informed by observed variance.
* Agreement thresholds must be justified by the annotation task; an unexplained universal threshold is not sufficient.

This is an adversarial design consultation, not human validation, independent reproduction or certification.
