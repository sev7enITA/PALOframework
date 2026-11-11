# Evaluator 0.3 draft: November audit repair

Status: review candidate, not a qualified scoring release. [Review the patch](https://github.com/sev7enITA/PALO-BlueprintBench/pull/1); code changes remain on that branch. Contract `0.3.0-dev.1` deliberately rejects 0.2 records. Immutable release tags and the original historical archive remain unchanged.

## Exclusion and annotation boundary

Non-claim spans may contain only ASCII space, tab, CR or LF, verified against the actual output. Arbitrary formatting, preambles, JSON wrapper keys and prose cannot be excluded by the submitter. This is stricter than moving the same untrusted label into another JSON file. The two EV-01 attacks are regression tests. A warning marks more than 50% excluded whitespace; it is a diagnostic threshold, not an evidence-quality score.

This draft does not yet provide a general structured-output converter. A JSON object cannot be decomposed by silently discarding its keys or uncertainty fields. Real procurement-output ingestion and an annotated neutral second-system example remain open (EV-04, GV-02). Scope remains complete bounded annotation, not probability-sampled precision (EV-18). Atomicity and semantic judgements remain human assertions pending external verification.

Raw bytes are decoded as strict UTF-8, without newline conversion or Unicode normalisation. Offsets count Unicode code points in that exact decoded string. BOM-prefixed output is rejected; a source-preserving conversion would require a separate recorded artifact. No NFC transformation is implied.

## Gold mappings and errors

Forbidden inferences now have stable IDs, text and predeclared violated critical rules. Every annotation declares `matches_forbidden` and `matches_alternatives`. A declared forbidden match forces a critical error and adds its registered rule violations, regardless of a downgraded critical flag. Alternatives have IDs bound to a particular gold proposition; they cannot credit another proposition.

The evaluator does not infer semantic matches. A dishonest or mistaken annotator can still omit a forbidden match, give a false supported verdict or assert bad equivalence. This is why independent human evidence remains mandatory and `qualified` remains false. An ID contract is not a semantic oracle.

Critical source-rule inversions require `violated_gold`. Critical unsupported additions have their own explicit category and count. Unique critical propositions and raw critical occurrences remain distinct.

## Identity, time and repeats

Configuration records require model revision, provider/runtime revision, quantisation, reasoning, output cap, prompt/schema digests and pipeline/environment versions. Unknowns use explicit unavailable values with reasons. A local declaration is not provider attestation.

Run records identify the submitter and declare serial or parallel execution with a concurrency limit. Future dates, invalid timestamp forms and elapsed durations incompatible with that window are rejected. Clock skew allowance is five seconds; duration rounding allowance is one second. These checks detect inconsistencies, not trusted timestamps.

Receipts contain a provider request ID and request digest, or an explicit unavailability reason. Reused provider request IDs are rejected; identical output across repetitions produces a warning, because deterministic repetition is possible. Equivalence verdicts and gold mappings must agree across repetitions of the same task. Different tasks retain separate equivalence namespaces.

Declared gold/output panels may not overlap or include the submitter. Even distinct names never remove the independent-identity or independent-human-evidence block. No external identity registry, trusted preregistration verification or qualification-authority workflow is implemented.

## Descriptive aggregation

Output includes run, family, domain and per-repetition totals. Assigned tasks remain in the denominator. Inversion-rate aggregates are unavailable when any assigned attempt lacks nonempty assessment; missing evidence is not a zero error. These summaries are diagnostic only. They do not implement family bootstrap intervals, statistical power, calibration or a validated PALO Blueprint Index.

Zero-threshold policies are explicitly flagged as trivial and block comparability. Zero reported or reconciled charges require reasons. No measured human repair effort is inferred from error counts.

## Historical contract and costs

The unchanged historical checker accepts a relationship with its two explicit endpoint entities, using three candidates, below the 16-candidate limit. A second fixture demonstrates that the same checker can accept an inverted relation description. Contract satisfiability does not establish semantic validity; the 0/43 historical relationship result remains an adapter diagnostic.

The sanitised historical ledger supplement preserves recorded integer micro-USD charges and provider request IDs without credentials, endpoint URLs or local case IDs. It reconstructs former explorer totals, including charges missing from truncated-output records. Per-attempt upward rounding to whole micro-USD explains small differences from decimal provider reports. These remain local provider-reported accounting records, not invoices or independently attested receipts.

## Validation and release gate

Run `python -m unittest discover -s evaluator -p 'test_*.py'` with the evaluator and historical replay requirements. New tests cover exclusion attacks, forbidden mappings, panel overlap, configuration identity, impossible times, duplicate requests, equivalence across repeats, trivial policy, CRLF, zero costs, critical categories and CLI failure paths. Acquisition tests use mocked HTTPS responses, not a live network server. Adapter tests run the unchanged historical checker.

A second human reviewer has not reviewed this patch. No merge or scoring release is represented as independently approved. The remaining audit findings are tracked separately, including real-output ingestion, source rights, calibration, external custody, reviewers, signed anchors and reproduction.
