# Model review and adjudication

Reviewed 10 November 2026. These are design critiques based on the supplied proposal and research summary. The models did not execute, certify or independently reproduce the PALO software. This document contains analyst summaries and decisions, not verbatim transcripts.

## GLM web review

Observed interface: GLM-5.3, Max effort, Z.ai in Vivaldi. Conversation retained in private working evidence.

One initial critique and two responses to the same follow-up were observed. The repeated follow-up was an interface submission duplicate, not an independent reviewer or replication. The initial brief is retained in review-brief.txt; the follow-up supplied the benchmark comparisons and challenged denominator, missingness and publication rules.

GLM's strongest objections were development-data contamination, coupling the score to PALO's own schema, unresolved human gold-standard independence, missingness gaming, and confusion between real confidentiality and public synthetic probes. Its follow-up focused on who controls the reviewer: under-recorded correction work could manufacture a favourable result. It recommended a smaller six-repository/three-domain pilot before the 12-family programme.

Accepted: independent blinded reviewers, instrumented review logs, complete denominators, versioned prompts, smaller feasibility stage, separate model/system attribution, and truthful publication of development defects.

Rejected or narrowed:

* A blanket ban on saying software was tested would be misleading. GLM clarified that observed runs on named cases can be reported; unsupported endorsement language is the concern.
* GLM suggested that the proposed disclosure package could justify a claim to the strictest standard. We reject that superlative: no comparative validation establishes it.
* Reconciled billing is preferred, but estimated costs remain useful when explicitly labelled with uncertainty. Estimates must not masquerade as recorded charges.
* Three repeats and six repositories are feasibility choices, not automatic statistical adequacy.

## Gemini web review

Observed interface: Gemini Argon, Alta mode, in Vivaldi. Conversation retained in private working evidence. This records the displayed mode, not an independently verified immutable model revision.

The first critique challenged reuse of debugged corpora, benchmark/product coupling, unbounded recall claims on large repositories, provider-optimised confounding and unpinned hosted identities. The follow-up found the proposed outcome useful but warned that an empty blueprint can appear cheap to review if missing-fact creation is not counted. It suggested measuring insertion, deletion and modification work symmetrically.

Accepted: fixed gold scope, added-fact work as well as deletions, visibility of failures, identity limitations, recorded workflow time, and executable source-to-blueprint contract checks as proposed future work.

Rejected or narrowed:

* Graph-edit counts are useful diagnostics but cannot replace actual human review time. UI design and reviewer fatigue are part of the system experience and must be controlled or reported, not declared irrelevant.
* Gemini proposed a weighted edit-cost formula. Arbitrary insertion/deletion/modification weights are not validated human costs; abstentions could also be double-counted as false negatives. We retain separate operation counts first and calibrate any later weights empirically.
* A suggested universal inter-rater kappa threshold of 0.80 is not adopted as an unexplained pass rule. Agreement, class prevalence, disagreement types and uncertainty must be reported with an appropriate statistic.
* Do not remove failed configurations from the results. Remove a qualified badge when necessary and retain all evidence.
* A claim that no existing benchmark covers this entire topic is not established by this scoped review. Our claim is a focused differentiation hypothesis.

## Shared design decisions

1. The current three cases are development-only. Their results stay useful and visible.
2. Begin with six new independent families in three domains. Expand towards 12/six after validating annotation effort and measurement reliability.
3. Separate verified-text reasoning, raw-document system performance and deterministic control conformance.
4. Freeze tasks, allowed alternative models, denominators, settings and scoring before sealed runs.
5. Require independent human annotation and actual business-user evidence before corresponding claims.
6. Report quality, coverage, risk, reliability, effort and cost separately. No universal score in the initial release.
7. The benchmark author's conflict of interest and all reproduction states remain explicit.

The completed local LM Studio review and its two earlier delivery failures are recorded in [LOCAL-REVIEW.md](local-review.md), with the final answer in [local-review-public.json](local-review-public.json). It independently emphasised denominator scope and keeping gold annotators blind to PALO outputs. A timeout or reasoning-only response does not count as a completed substantive review.
