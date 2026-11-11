# November audit finding register

[Evaluator repair pull request](https://github.com/sev7enITA/PALO-BlueprintBench/pull/1). Evidence paths in the JSON register refer to that review branch.

All 63 findings are retained. Status describes maintainer action, not independent closure. The public correction is commit `0aafacc`; evaluator repairs are an unreleased review candidate.

| ID | Severity | Status | Evidence / remaining gate |
|---|---|---|---|
| EV-01 | critical | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-02 | high | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-03 | high | partial | Descriptive run/family/domain/repetition totals implemented. Family-level uncertainty and a real procurement run remain open. |
| EV-04 | high | open | No closure is claimed. See the supplied audit criterion. |
| EV-05 | high | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-06 | medium | partial | Output explicitly states external verification is not implemented; no trusted timestamp or signature verification has been added. |
| EV-07 | medium | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-08 | medium | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-09 | medium | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-10 | medium | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-11 | medium | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-12 | low | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-13 | low | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-14 | low | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-15 | low | repair_candidate | Draft 0.3 contract and regression checks implemented; independent human review and merge remain pending. Semantic annotations and identities are not externally verified. |
| EV-16 | low | open | No closure is claimed. See the supplied audit criterion. |
| EV-17 | low | partial | Adversarial and CLI tests added. Acquisition uses mocked HTTPS responses; a local-server integration test, systematic fuzzing and independent review remain open. |
| EV-18 | low | documented_limit | Full bounded annotation only; probability-sampled scoring not implemented. |
| MS-01 | critical | partial | Removed model scatter/ranking; pooled type/cause charts published. Frozen relationship contract satisfiable in a synthetic three-candidate test, which also exposes semantic blindness. No model-quality measure validated. |
| MS-02 | high | partial | Public material now says adapter smoke tests, not model quality. Fixed independent gold, repetitions and comparable procurement campaigns remain open. |
| MS-03 | high | partial | Public material now says adapter smoke tests, not model quality. Fixed independent gold, repetitions and comparable procurement campaigns remain open. |
| MS-04 | high | partial | Public material now says adapter smoke tests, not model quality. Fixed independent gold, repetitions and comparable procurement campaigns remain open. |
| MS-05 | high | open | No closure is claimed. See the supplied audit criterion. |
| MS-06 | high | open | No closure is claimed. See the supplied audit criterion. |
| MS-07 | medium | open | No closure is claimed. See the supplied audit criterion. |
| MS-08 | medium | open | No closure is claimed. See the supplied audit criterion. |
| MS-09 | medium | open | No closure is claimed. See the supplied audit criterion. |
| MS-10 | low | repair_candidate | Both unique errors and occurrences retained in descriptive summaries; measured human repair time remains unavailable. |
| DT-01 | high | partial | Sanitised local ledger reconstructs former explorer totals; independently attested invoices and original response bytes remain unavailable. Costs remain withdrawn from ranking. |
| DT-02 | high | published_correction | Correction published on main at 0aafacc. Independent re-audit remains pending; original archives and release tags are preserved. |
| DT-03 | high | open | No closure is claimed. See the supplied audit criterion. |
| DT-04 | medium | published_correction | Correction published on main at 0aafacc. Independent re-audit remains pending; original archives and release tags are preserved. |
| DT-05 | medium | documented_limit | Determinism is distinguished from provenance. Missing original response bytes have not been reconstructed or invented. |
| DT-06 | medium | partial | Candidate sources are labelled feasibility materials, not a qualified held-out set. External custodian must choose new families. |
| DT-07 | medium | partial | Optional expected SHA-256 checked; failed downloads retained as failures. Source rights and current live acquisition remain unresolved. |
| DT-08 | low | published_correction | Correction published on main at 0aafacc. Independent re-audit remains pending; original archives and release tags are preserved. |
| DT-09 | low | repair_candidate | Unpublished reference-item count removed from the current protocol; historical archives preserved. |
| DT-10 | low | open | No closure is claimed. See the supplied audit criterion. |
| GV-01 | critical | external_or_method_gate | No independent custodian, gold, reviewers, validated study, separate organisation/domain or DOI is claimed. These gates require actual decisions, people or evidence. |
| GV-02 | high | external_or_method_gate | No independent custodian, gold, reviewers, validated study, separate organisation/domain or DOI is claimed. These gates require actual decisions, people or evidence. |
| GV-03 | high | external_or_method_gate | No independent custodian, gold, reviewers, validated study, separate organisation/domain or DOI is claimed. These gates require actual decisions, people or evidence. |
| GV-04 | high | partial | Scoring repair kept on a review branch; no new scoring release or independent approval claimed. Signed identities/tags and required external review not established. |
| GV-05 | medium | external_or_method_gate | No independent custodian, gold, reviewers, validated study, separate organisation/domain or DOI is claimed. These gates require actual decisions, people or evidence. |
| GV-06 | medium | partial | Private maintainer email documented; no independent arbiter, response SLA or installable package implemented. |
| GV-07 | medium | external_or_method_gate | No independent custodian, gold, reviewers, validated study, separate organisation/domain or DOI is claimed. These gates require actual decisions, people or evidence. |
| GV-08 | low | external_or_method_gate | No independent custodian, gold, reviewers, validated study, separate organisation/domain or DOI is claimed. These gates require actual decisions, people or evidence. |
| GV-09 | low | external_or_method_gate | No independent custodian, gold, reviewers, validated study, separate organisation/domain or DOI is claimed. These gates require actual decisions, people or evidence. |
| WB-01 | high | published_correction | Correction published on main at 0aafacc. Independent re-audit remains pending; original archives and release tags are preserved. |
| WB-02 | high | partial | Eleven deployed files verified by cache-busted HTTPS with response headers from publishing environment. Independent external-network check remains open. |
| WB-03 | medium | published_correction | Correction published on main at 0aafacc. Independent re-audit remains pending; original archives and release tags are preserved. |
| WB-04 | medium | published_correction | Correction published on main at 0aafacc. Independent re-audit remains pending; original archives and release tags are preserved. |
| WB-05 | medium | open | No closure is claimed. See the supplied audit criterion. |
| WB-06 | low | previous_correction | Dependency wording and CI badge were added after audited commit in 8cd2b8f. This does not establish independent review or a scoring release. |
| WB-07 | low | partial | Proposal is now a pointer to the protocol. Related-work sources retain their separate historical and comparison roles. |
| WB-08 | low | open | No closure is claimed. See the supplied audit criterion. |
| RP-01 | medium | previous_correction | Dependency wording and CI badge were added after audited commit in 8cd2b8f. This does not establish independent review or a scoring release. |
| RP-02 | medium | open | No closure is claimed. See the supplied audit criterion. |
| RP-03 | medium | repair_candidate | CI matrix extended to Linux, macOS and Windows; run outcomes must be inspected before support is claimed. |
| RP-04 | low | partial | Private maintainer email documented; no independent arbiter, response SLA or installable package implemented. |
| RP-05 | low | open | No closure is claimed. See the supplied audit criterion. |
| RP-06 | low | documented_limit | Manifest scope now explicitly lists exclusions; it is not represented as a whole-repository attestation. |
| RP-07 | low | repair_candidate | Verification claim narrowed to the three provenance codes; complete schema-enumeration mapping remains open. |
| RP-08 | low | repair_candidate | Internal branch reference and repeated end-of-loop write removed; acquisition receipt is written once after processing. |
