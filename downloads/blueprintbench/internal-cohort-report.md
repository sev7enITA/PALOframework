# Internal procurement tests and model catalogue

Publication revision 2026-11-11.3; frozen dataset revision 2026-11-11.2. Internal tests; independent qualification pending.

Both the [launch page](https://paloframework.org/PALO_BlueprintBench.html) and [internal test results](https://paloframework.org/PALO_BlueprintBench_Leaderboard.html) use this evidence dataset. The internal view contains **18 distinct model IDs**, with the original ten historical identities preserved in a separate adapter-diagnostics view. A model with two evidence cohorts has two configuration rows; they are not two different models.

## Execution scope

Three short synthetic procurement cases, one maintainer-authored family, 36 source rules, 108 seeded statements, two tasks and three repetitions. Source, prompt and draft expected-label bytes are unchanged across all campaigns. **324 assigned task slots; 306 dispatched requests; 299 complete responses; 7 failed or incomplete responses; 18 unrun assignments**, including 18 compatibility blocks. Failures and missing assignments remain in the fixed denominator.

| Configuration | Complete / assigned calls | Draft-label matches / assigned | Missing classifications | Known inference USD | Unknown charges | Unrun assignments |
|---|---:|---:|---:|---:|---:|---:|
| Anthropic: Claude Opus 5.5 | 18/18 | 322/324 | 0 | 0.3614960 | 0 | 0 |
| Baidu: ERNIE-5.5-Flash-Preview | 17/18 | 321/324 | 0 | 0.0549678 | 1 | 0 |
| Cohere: Command A+ | 17/18 | 324/324 | 0 | 0.1339290 | 0 | 0 |
| DeepSeek: DeepSeek V4.1 Flash 1017 | 18/18 | 288/324 | 36 | 0.0128945 | 0 | 0 |
| Google: Gemini 4 Argon | 17/18 | 288/324 | 36 | 0.3657320 | 1 | 0 |
| Inference.net: Schematron V2 Small | 17/18 | 62/324 | 128 | 0.0049593 | 0 | 0 |
| Inference.net: Schematron V2 Turbo | 18/18 | 47/324 | 175 | 0.0014664 | 0 | 0 |
| Mistral: Mistral Large 4 | 18/18 | 315/324 | 0 | 0.1868504 | 0 | 0 |
| Nex AGI: Nex-N2.6 | 18/18 | 323/324 | 0 | 0.0094544 | 0 | 0 |
| OpenAI: GPT-6.1 Sol | 18/18 | 324/324 | 0 | 0.1033389 | 0 | 0 |
| PrismML: Ternary Bonsai 2 27B | 15/18 | 216/324 | 108 | 0.0215451 | 3 | 0 |
| PrismML: Ternary Bonsai 2 9B | 18/18 | 324/324 | 0 | 0.0098111 | 0 | 0 |
| Qwen: Qwen3.8 Max Prime | 18/18 | 322/324 | 0 | 0.6581760 | 0 | 0 |
| Reflection: Beam 1.0 501B A23B | 18/18 | 324/324 | 0 | 0.0469119 | 0 | 0 |
| Sakana: Fugu Max | 0/18 | 0/324 | 324 | 0.0000000 | 0 | 18 |
| Tencent: Hy4 | 18/18 | 321/324 | 0 | 0.3030277 | 0 | 0 |
| Upstage: Solar Mini 4 | 18/18 | 324/324 | 0 | 0.0125950 | 0 | 0 |
| Z.ai: GLM 5.3 | 18/18 | 324/324 | 0 | 0.0364313 | 0 | 0 |

These counts measure agreement with assistant-draft labels and delivery under each serving configuration. They are not independently adjudicated accuracy or a qualified model ranking. The primary label for invoice P002 remains contested; the optional post-hoc sensitivity excludes it uniformly across every model and repetition. Missing classifications are not assumed wrong semantic judgments.

## Compatibility and configuration

Sakana Fugu Max is catalogued with no supported max_tokens or response_format controls. Under the frozen strict-parameter, bounded-output policy its supplement assignments are blocked before dispatch. Zero request charge is explicitly not_incurred; latency and semantic output are unavailable. Its original historical transport failures remain preserved. This does not establish model incapability.

Schematron Small and Turbo use an advertised 8,192-token output cap and have no reasoning control. Other runnable configurations use 32,768. Supported high reasoning is used where offered, xhigh for Bonsai27B where high is unavailable, and enabled reasoning for endpoints without effort enums. Provider/quantisation/reasoning differences are retained in the metadata. High effort is not equal compute. Temperature is provider default and seed omitted. Endpoint fallback and inference retries are disabled.

The original baseline ran serially. The later extensions use up to four concurrent requests. Observed request duration includes network and provider scheduling; it is not a controlled speed comparison. The extensions were selected after baseline outcomes were known and retain separate campaign identities.

## Source-indexed translations

The original three-model baseline has 27 assistant-reviewed draft exports. The new extensions preserve source-indexed raw outputs as unreviewed model drafts; no prior review, business approval or blueprint-export result is inherited. Exact source-copy counts and source/output inspection are descriptive. A wording change is not automatically an improvement.

## Cost and limits

Known provider-reported charges in the internal dataset total USD 2.3235868. There are 5 unknown-charge records carrying USD 0.4812647 in conservative reservations. Reservations are not charges. The overall user-authorised ceiling remains USD40 including prior work and advisory reviews; this dataset's inference cost is not the full key spend. No paid retrieval, embeddings, tools or search were requested. Engineering, review, electricity and hosting costs are not measured.

One synthetic authoring family, assistant-draft labels, unreviewed new translations and differing serving configurations limit interpretation. No independent custodian, blind domain annotation or independent reproduction is claimed. No PALO Blueprint Index is assigned. Detailed limitations remain in the research interface and method document.

## Reproduce and inspect

Run `python tools/build_leaderboard.py --check` and `python -m unittest discover -s tools -p test_leaderboard_schema.py` after installing evaluator requirements. These are offline checks; they do not make paid model calls. The raw successful responses, exact outputs, frozen inputs and request hashes are in the campaign archives. Public error bodies with account identifiers are explicitly redacted with original/public hashes. Hash consistency is not independent custody.

- [internal-frontier-2026-11-11](https://github.com/sev7enITA/PALO-BlueprintBench/tree/c85624939bde546d67f3869c656cfb8b97b7ae00/internal_tests/2026-11-11-frontier): 3 models, 54 assigned tasks; original baseline.
- [internal-expansion-2026-11-11](https://github.com/sev7enITA/PALO-BlueprintBench/tree/2b054692baea4ca1a892e3d39453a76097a64f74/internal_tests/2026-11-11-expansion): 12 models, 216 assigned tasks; extension after original baseline observations.
- [internal-legacy-extension-2026-11-11](https://github.com/sev7enITA/PALO-BlueprintBench/tree/2b054692baea4ca1a892e3d39453a76097a64f74/internal_tests/2026-11-11-legacy-extension): 3 models, 54 assigned tasks; extension after original baseline observations.
