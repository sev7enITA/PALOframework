# PALO Tri-Graph review and adjudication

29 October 2026. Internal review of an additive local reference profile. Model review is advisory and does not constitute independent assurance.

## Review provenance

Gemini 4, shown as Argon with Alta reasoning, and GLM 5.3 with Max effort reviewed the design through their authenticated interfaces. GLM 5.3 also reviewed the code twice. Gemini's later code-review interaction displayed a quota notice and changed the selector to Flash-Lite. The exact model of that later response is uncertain; it is not claimed as a Gemini 4 High code review. Private interface captures are retained locally and are not published because they include unrelated account navigation.

## Design findings

| Finding | Disposition |
| --- | --- |
| A hash of a selected subset cannot prove completeness | Required closure starts at a curated transition and covers a caller-approved inventory; real-world completeness remains a curation responsibility. |
| A local transaction cannot make an external operation atomic | Target conditional writes, idempotency and authoritative reconciliation are explicit production requirements. |
| Semantic changes can invalidate historical replay | Retain exact evaluator, vocabulary, procedure, inputs and observations; record migration decisions. |
| Three pillars do not require three graph databases | Use logical views; the reference runs on JSON records and a state machine. |
| Superiority over IAM, workflow and logging is not demonstrated | Publish a competent baseline and falsifiable evaluation metrics; do not claim production improvement from synthetic tests. |

## Code findings and verified dispositions

| Origin | Finding | Disposition and evidence |
| --- | --- | --- |
| GLM R1 | An explicit rejection could be ignored on an optional-approval transition | A pending rejection in the trusted case scope denies every proposal. Tests cover optional approval and a retry with rotated request ID, nonce and sequence. |
| GLM final | Exact decision-digest matching allowed a rotated retry to evade a rejection | Adopted the stronger case-scoped pending-rejection rule. Only the trusted service may clear the pending record through an attributable review. |
| GLM R2 | An update could have an empty evidence closure | Mutating update transitions require at least one mandatory evidence root. |
| GLM R3 | Vocabulary binding was only caller-asserted | The generator pins the vocabulary digest to the evaluator build; arbitrary matching caller hashes fail. This is version binding, not authentication of the software. |
| GLM R4 | Corrections to excluded facts did not trigger reassessment | Reverse dependency queries cover both selected and excluded assertions and report them separately. |
| GLM R5 | Repeated rule IDs made check results ambiguous | Receipts use unique check IDs and a separate rule-family identifier. |
| Gemini code response, model uncertain | Approval guard and approval requirement could disagree | Exact guard/flag agreement is required. |
| Gemini code response, model uncertain | Object key order defeated duplicate detection | Stable structural duplicate keys are used; AJV independently rejects the same fixture. |
| Gemini code response, model uncertain | Excluded evidence could carry an inverted interval | All assertion intervals must be ordered, including excluded records. Future-valid evidence recorded earlier remains valid in principle and is not incorrectly prohibited. |
| Gemini code response, model uncertain | Hold/deny and recovery wording could imply authority | Unknown or contested evidence holds; revoked or untrusted authority denies. The next step does not grant recovery authority. |
| Internal | A fabricated initial state or hidden pending effect could pass | Trusted observations bind case, current state, pending effect and exact resource. |
| Internal | Negative tests could pass through an unrelated failed check | An isolated nine-case matrix asserts the exact status and exact failing check set. |
| Internal | Rapid scenario changes could expose an older asynchronous receipt | The UI publishes only the result of the latest evaluation sequence. |

GLM's final static review confirmed the original five fixes and identified the retry issue above; that issue was then corrected and exercised locally. GLM did not execute tests. Its suggestion that a software fork is necessarily detectable from the receipt alone is not adopted: the trusted evaluator and release provenance still require external verification.

The final report links exact source hashes, 52 automated tests, two full SHACL fixture outcomes and nine browser scenarios. These checks are limited to this extension. They are not a full repository regression, cloud test, independent audit or production qualification.
