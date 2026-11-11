# Internal procurement baseline tests: OpenAI, Claude and Gemini

Status: **internal tests**, 11 November 2026. **Zero independently qualified results.**

This campaign exercises real model calls against short, original synthetic policies. It adds recognisable OpenAI, Anthropic and Google baselines to the research programme, separately from the historical challenger adapter diagnostics. It does not validate the benchmark as an independent measure.

## What was measured

Three synthetic procurement cases: purchase approval, supplier onboarding and invoice matching. Each has 12 numbered source rules and 36 seeded statements. All cases belong to one maintainer-authored family. Three repetitions, two tracks, three API models: **54 assigned calls**, 27 source-indexed translations and 27 verification calls. Verification has 324 assigned classifications per model. Expected labels and source propositions are assistant drafts.

Frozen input commits: `cd128a2` and `bca269c`, published before inference. Providers were pinned with fallback disabled, reasoning set to supported `high`, total output cap 32,768 tokens, no tools. Temperature and seed use provider defaults. High effort is not equal compute. No inference retries. This is not a 100 MB test or a Workbench application qualification.

## Recorded outcomes

54 requests recorded; 53 complete responses; 1 failed; 0 not run. Failures remain in the assigned denominator.

| API configuration | Complete calls | Agreement with frozen labels / assigned | Classified statements | Known provider charges, USD | Unknown-charge calls | Median request time |
|---|---:|---:|---:|---:|---:|---:|
| Anthropic: Claude Opus 5.5 | 18/18 | 322/324 | 324/324 | 0.3614960 | 0 | 6.46 s |
| Google: Gemini 4 Argon | 17/18 | 288/324 | 288/324 | 0.3657320 | 1 | 21.95 s |
| OpenAI: GPT-6.1 Sol | 18/18 | 324/324 | 324/324 | 0.1033389 | 0 | 6.66 s |

These are descriptive counts in alphabetical order, not a leaderboard. Agreement with draft labels is not independently adjudicated semantic accuracy. Model latency includes network and service time, with serial calls and no cache controls. It mixes translation and verification tasks; it is not a matched throughput comparison.

## A useful failure in our labels

On invoice matching, candidate P002 says: “The tolerance is increased by 5 percent for overseas suppliers.” Its frozen label is `not_established`. Source R03 categorically blocks automatic payment above EUR 10. Claude classified this statement as `contradicted` in repetitions 2 and 3. That interpretation is defensible: increasing the tolerance can contradict the explicit threshold. This is an ambiguity in the control design, not an adjudicated model mistake.

We preserve all original labels and primary counts. An explicitly **post-hoc sensitivity check**, excluding this one candidate from every model and repetition, gives:

| Model | Agreement / remaining assigned | Classified / remaining assigned |
|---|---:|---:|
| anthropic/claude-opus-5.5 | 321/321 | 321/321 |
| google/gemini-4-argon | 285/321 | 285/321 |
| openai/gpt-6.1-sol | 321/321 | 321/321 |

The remaining controls are near the ceiling for these configurations. The suite is too small and easy to support a comparative quality claim. We need harder independent cases, an explicit contradiction/absence rubric and independent label adjudication before ranking models. Repetitions of one authored family are not independent companies; no confidence interval is offered.

## Translation, review and draft export

Every distinct emitted line is read beside its numbered source rule by the coding assistant. Repeated identical text reuses that internal assessment. Model identity was visible; this review is not blind or independent. It is not a human correction-time study. A close restatement or verbatim copy is permitted by this track, which is therefore much easier than unconstrained document interpretation.

| Model | Emitted lines / source opportunities | Internally reviewed lines | Exact source copies |
|---|---:|---:|---:|
| anthropic/claude-opus-5.5 | 108/108 | 108 | 2 |
| google/gemini-4-argon | 108/108 | 108 | 54 |
| openai/gpt-6.1-sol | 108/108 | 108 | 79 |

The `contract-replay/` directory carries original outputs through draft evaluator **0.3.0-dev.1** and exports 27 source-linked draft blueprints requiring business approval. This is a **post-hoc scoring replay**: its formal campaign lock was created after inference and before replay. It is not retroactive preregistration. Run timing is local replay bookkeeping; original inference timing remains in the linked original records. Replay accounting carries original charges without making new calls. All results remain unqualified. The draft evaluator is still under review; the released evaluator is not silently replaced.

## Cost and failure accounting

Known provider-reported inference charges total **USD 0.8305669**, plus **1 unresolved charge(s)**. The unresolved reservations total **USD 0.3821642** and remain carried against the budget. They are conservative reservations, not proven charges. The overall user-authorised key cap is USD 40 including prior tests; this campaign has a USD 30 allowance. Budget is a ceiling, not a spending target.

Google AI Studio returned HTTP 503 for purchase-approval verification, repetition 2. The original runner stopped when the charge was unknown. The accounting amendment was published before continuation: the complete reservation remained encumbered and the failed assignment was not retried. Zero is never substituted for an unknown charge.

Costs include provider-reported input and completion usage, with reasoning included in completion billing. Token detail is in the machine-readable results. There were no RAG, embedding, paid search, storage-service or tool calls in this cohort. Local engineering, review labour, hosting and electricity are not measured in this inference charge total; this is not a total-cost-of-ownership estimate.

## Reproduce and inspect

The evidence archive includes frozen corpus, prompts, model metadata, manifest, request bodies, response bodies, exact output text, assistant review bank, analysis scripts and post-hoc evaluator replay. One error response contains an account identifier: the public copy removes only `/user_id`, with original and public hashes in a redaction sidecar. The original body is retained privately. Successful response bodies and all model output text remain original. The original hash of that private error body cannot be independently verified from the public copy.

From a checkout of `codex/internal-frontier-tests-20261111`, install `evaluator/requirements.txt`, then run:

```sh
python -m unittest discover -s internal_tests/2026-11-11-frontier -p 'test_*.py'
python internal_tests/2026-11-11-frontier/analyse.py
python internal_tests/2026-11-11-frontier/replay_translation.py /tmp/palo-new-replay
python tools/build_internal_tests.py
```

The replay requires a new destination and does not call a provider. API reruns require explicit credentials and budget; hosted models may change. Do not use `runner.py` to bypass unresolved-charge safeguards. `resume.py` is the documented accounting amendment.

Frozen design: `internal_tests/2026-11-11-frontier/README.md`. Primary counts: `analysis.json`. Label challenge: `label-challenge.json`. Review bank: `translation-assessments.json`. Formal replay: `contract-replay/`. Exact source and response hashes establish byte consistency, not independent authorship, truthful timestamps or custody.

[Research page](https://paloframework.org/PALO_BlueprintBench.html#internal-tests) · [Versioned evidence](https://github.com/sev7enITA/PALO-BlueprintBench/tree/codex/internal-frontier-tests-20261111/internal_tests/2026-11-11-frontier)
