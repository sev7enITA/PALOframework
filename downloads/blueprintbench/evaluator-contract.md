# Evidence contract and metrics v0.2

The executable contract is `evaluator/evidence.schema.json` (JSON Schema Draft 2020-12). The evaluator validates each record against its named definition and applies cross-record invariants. `docs/run-record-fields.json` remains a broader research roadmap, not a competing executable schema. Install the pinned evaluator requirements before use.

## Three separate outcomes

1. `reported_completion_rate`: reported `pass` states / all assigned task-repetitions. This preserves reported execution outcomes, including incorrectly declared passes.
2. `accepted_task_rate`: tasks satisfying the campaign's frozen `success_policy` / all assigned task-repetitions. An answerable task needs reported pass, completed termination, assessed output, precision and recall meeting the registered thresholds, and zero critical errors. A declared unanswerable task accepts a completed empty abstention. Missing tasks and unfinished attempts remain in the denominator. Demo thresholds are synthetic examples, not a scientifically validated standard.
3. `qualified`: always false in this release. A separate independently reviewed decision is required. Accepted synthetic or self-reported evidence is not independent qualification.

`cost_per_accepted_task_usd` includes known charges of all recorded attempts, including failures, divided by accepted tasks. It is null if there are no accepted tasks, missing attempts or unknown costs. `cost_per_reported_completion_usd` is a separate diagnostic. Unresolved reservations are not settled charges. Human effort is explicitly `not_measured`.

## Semantic accounting

Precision is supported unique propositions / all assessed unique propositions within the registered scope. Recall is recovered gold items / all required gold items. Empty output has undefined precision and zero recall on answerable tasks. Precision is faithfulness within scope, not a universal relevance score.

`critical_errors` counts unique adjudicated equivalence classes marked as errors. `critical_error_occurrences` retains repeated occurrences separately. Equivalent annotations must agree on verdict, gold mapping, critical status and violated source rules. A supported proposition cannot simultaneously be a critical error. Critical annotations require a rationale. Source-rule inversions reference predeclared `critical_rule_ids`; unsupported critical additions can have no source-rule match and still fail acceptance.

`critical_inversions_per_100_rules` counts distinct inverted critical source rules over the fixed critical-rule denominator. It is null when no such rules are assigned. Always read it with coverage, the distinct critical-error count and acceptance: empty output can have zero inversions and zero coverage. The code checks internal consistency; it cannot establish whether a human semantic judgment is correct.

Gold records include meanings, answerability, critical rule IDs, allowed alternatives, forbidden inferences and any allowed multi-item matching groups. These are source-backed adjudication inputs, not model-generated truth. Many-to-many reference granularity is permitted only through preregistered groups and an explicit mapping rationale. Automatically approving all gold through one arbitrary claim is rejected.

## Raw-output provenance

Each receipt binds the UTF-8 raw-output artifact and emitted-claim artifact by SHA-256. Claim spans are half-open Unicode code-point offsets into the decoded raw text; their text must match exactly. Non-claim spans carry a reason. The two sets must cover the entire raw text without gaps or overlaps. Each annotation binds the receipt, exact claim-text hash and a declaration that atomicity was reviewed.

For structured output, punctuation and metadata may be non-claim segments; a reviewer must verify that substantive material has not been wrongly classified as non-claim. Complete span coverage and a review declaration do not prove valid semantic decomposition or honest annotation. IDs, hashes and JSON Schema cannot replace that review.

## Termination and non-execution

Receipt `termination_reason` is one of `completed`, `model_error`, `timeout`, `budget_censored` or `precall_blocked`. A `not_run` state requires `precall_blocked` and empty raw/emitted output. It needs no semantic annotation. Other attempts with no emitted output may also omit annotation except a reported pass. Empty or non-executed tasks retain their assigned denominator. Gold independence is still checked separately.

## Registration and qualification

`freeze` creates a **local integrity lock**, using the named Python serialization contract, not RFC 8785. Numbers such as 1 and 1.0 can have different digests. Preserve original bytes and version the serialization before introducing another implementation.

A local digest and timestamp cannot prove external preregistration, authorship or absence of prior testing. Therefore output explicitly sets `registration_provenance=self_declared`, `external_registration_verified=false` and a blocking reason. Rehashing/backdating a lock never yields a comparable or qualified badge. This tool has no switch for a submitter to self-assert verified registration.

An external qualification decision must bind the exact record, corpus/gold commitment, protocol, evaluator, configuration and evidence digests. Appointed custodians and independent domain/reproduction reviewers must establish timing, custody, conflicts and scope with verifiable records and signatures. No such appointment or qualified decision is claimed by the release. Governance and appeal responsibilities are described in the Specification Fidelity Study RFC.

## Migration and corrections

v0.2 rejects v0.1 records. Do not alter a historical lock, gold or receipt in place. Preserve old evidence and scorer identity; prepare a new explicitly labelled migration or campaign with the required fields. A retrospective conversion is not preregistration. The v0.1 tag and old review evidence remain immutable.

Critical counts and acceptance semantics have changed. Rerun affected records under the new contract before making new claims; do not silently substitute the new outputs into old scorecards. Historical model diagnostics on the website are retained unchanged and are not rescored semantic evidence.
