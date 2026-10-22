# PALO FinOps: economics of local learning

Experimental extension 1.0.0. Created and maintained by Fabrizio Degni. Research implementation dated 22 October 2026.

This workspace asks when investment in a local model can be justified by its full cost and accepted outcomes. It compares external inference, a hybrid workflow without new training, and a hybrid workflow using a distilled checkpoint. It does not train models, send provider requests, change a routing policy or authorise spending.

## Use the workspace

Open [PALO FinOps](../PALO_FinOps.html) and choose **Local learning**. Load a synthetic scenario, inspect the observed experiment, then examine its conditional future economics. Export the experiment and analysis to preserve a reproducible copy. The research draft has separate local storage and is never added to the attempt ledger or billing totals.

Seven invented scenarios demonstrate a conditional advantage, an investment that does not pay back, quality regression, an insufficient sample, an unresolved cost, a useful life shorter than the horizon, and an initial cost advantage that disappears as volume grows. None is a measured model benchmark or evidence of savings.

Finance can inspect complete spending and crossover assumptions. IT can examine quality, latency, capacity and checkpoint identity. The experiment owner freezes the task population, rubric, split manifests and sampling plan before collecting results. Imported evidence and responsibilities remain declarations, not authenticated identity or access control.

## Research design

The primary comparison is distilled versus static hybrid. External-only versus each hybrid provides context; being cheaper than external inference does not establish that training adds value over an untrained hybrid. All three comparisons are prespecified and retained, including unfavourable results.

Each experiment fixes a currency, workload, owner, registration reference and timestamp, training/validation/evaluation manifests, checkpoint and routing-policy digests, binary acceptance rubric, latency limits and sample size. The evaluator rejects exact content reuse, repeated IDs and repeated independence units across splits. It checks that the run follows registration and each outcome matches the frozen checkpoint and router.

Hashes do not detect paraphrases or hidden pretraining contamination. They do not authenticate evidence or prove registration time. Preserve the plan digest in an independent timestamped registry before evaluation. Inspect semantic leakage separately. Hyperparameter search and checkpoint selection belong to training/validation; include all their costs. Evaluation tasks cannot select the checkpoint, tune the router or trigger early stopping.

The initial contract accepts independent task units. Repeated conversations, customer clusters and correlated sampling require a separately designed cluster analysis. Different labels do not prove independence. Missing outcome rows invalidate the paired comparison; difficult cases are never silently deleted. Timeouts and failures retain costs and should appear as unaccepted outcomes. Missing latency remains unknown.

## Accounting contract

The [JSON schema](../schemas/palo-finops-learning-experiment.schema.json) checks structure. The shared browser/Node evaluator additionally enforces semantic rules.

Each cost row identifies one economic source, active revision, evidence reference, phase, covered categories and allocations to arms. Allocations must sum exactly to the source amount. Supply one consolidated row per arm/phase/category, or one all-in row covering several categories. An all-in hosting charge covering hardware and energy cannot also have component rows in the same phase. Repeated economic sources and overlapping category coverage are rejected.

A row allocated to multiple arms denotes a common source required by each listed alternative. Observed totals use the conserved allocation. Prospective alternatives each bear that common source in full, including repeat investment, so changing the accounting split cannot manufacture a future advantage. Reports expose both `knownMicros` (allocated) and `scenarioBasisMicros` (standalone basis). Alternatives are mutually exclusive and their scenario totals must not be added together. For genuinely different causal usage, consolidate distinct, evidenced cost scopes upstream instead of labelling a discretionary allocation as a saving. Economic source identity and attribution still require independent review.

| Phase | Amount meaning | Status | Treatment |
| --- | --- | --- | --- |
| `sunk` | Historical expenditure already incurred at the decision boundary | final, estimated, unknown | Observed total only |
| `investment` | New intervention investment attributable to the evaluated configuration | final, estimated, unknown | Experiment total and hypothetical repeat-investment decision |
| `evaluation` | Full cost of the held-out evaluation cohort | final, estimated, unknown | Observed total; not silently projected |
| `future_fixed` | Fixed charges over the entire declared future horizon | assumed, unknown | Charged in full at every volume |
| `future_per_attempt` | Conditional marginal cost per attempted task | assumed, unknown | Multiplied by future attempt volume |

The decision boundary matters. An investment already paid is sunk for a later operate-versus-switch decision. Reclassify it in a documented experiment version rather than charging it again. The application cannot infer this boundary from an invoice.

Required categories are teacher data, training, evaluation, hardware, energy, human review, operations, local inference and external inference. Explicit zero needs an evidence reference. Unknown is null. Every category needs coverage in every phase, even if inapplicable. Aggregate detailed source lines upstream with traceable references. Version 1 accepts nonnegative expenses; reconcile signed credits in the existing billing module before producing a supported cost basis. Mixed currencies are unsupported.

Include tuning failures, teacher calls, data preparation, human verification and infrastructure opportunity costs where relevant. Document valuations. Open reservations block final unit-cost metrics and candidate eligibility. Estimated amounts are displayed separately from known costs. A complete declared record is not a verified invoice.

Observed cost per accepted task includes all historical, investment and evaluation costs divided by accepted evaluation tasks. A separate evaluation-only ratio is exported. The first ratio describes this experiment, not a stationary inference price or an amortised production cost. Zero accepted outcomes leaves the ratio unavailable.

## Statistical checks

Compute acceptance and latency pass rates for each arm, plus paired acceptance differences for the three prespecified pairs: nine intervals in total. For independent bounded observations with range width R, use the two-sided Hoeffding radius:

```text
epsilon = R * sqrt(log(18 / alpha) / (2 * n))
```

R is 1 for binary rates and 2 for paired differences in [-1, 1]. Each interval has failure probability at most alpha/9; the union bound gives simultaneous coverage of at least 1-alpha under the sampling assumptions. Independence across arms or intervals is unnecessary; independence across task units is required. The bounds are conservative, not a power analysis.

Quality passes only if both arms' lower acceptance and latency bounds meet their floors, and the lower paired difference meets the negative noninferiority margin. It fails when an upper bound is below a requirement; otherwise it is inconclusive. Prespecify application-specific margins. The synthetic margin 0.12 is illustrative, not a recommended tolerance. Missing design declarations prevent candidate status.

Noninferiority permits a declared quality loss; it is not equivalence or superiority. A passing model may still have worse unit economics. Candidate eligibility therefore also requires conservative cost-per-accepted economics: candidate future total divided by its lower acceptance bound must not exceed baseline total divided by its upper acceptance bound, at the same attempted volume. This comparison is conditional on fixed future costs and stable population acceptance probabilities. It does not guarantee future delivered counts or equal accepted volume. Exactly equal accepted production requires a separately specified retry/volume model.

Synthetic records exercise arithmetic and state transitions; their intervals have no empirical interpretation. Reports retain provenance and always deny demonstrated causal savings and execution authority.

## Future scenario and crossover

For the same fixed horizon and attempted-task volume N:

```text
C_arm(N) = new_investment + fixed_horizon_cost + variable_cost_per_attempt * N
deltaF = candidate_fixed - baseline_fixed
s = baseline_variable - candidate_variable
candidate is no more expensive if deltaF - s*N <= 0
```

Integer arithmetic gives the first or last satisfying volume. If s and deltaF are positive, the first is ceil(deltaF/s). Equal slopes, no crossover, immediate advantage and an advantage expiring at higher volumes are handled separately. Equality means no higher cost, not a positive saving.

This is an attempt-volume threshold within a prepaid horizon, not a calendar payback time. Fixed fees stay charged at zero volume. Capacity, useful life, a single investment, stable rates and stable quality must cover the full horizon. If the horizon exceeds useful life, projection is unavailable. Replacement models, GPU capacity steps, retraining cycles, demand shocks, queueing, discounting and uncertain prices require separate scenario versions or a future dynamic model.

The report exports conditional point ratios using observed acceptance rates, while candidate status requires the stronger bound comparison. It does not fit an exponential capability-decay rate or assume flat local costs.

## Reproduction and import

Use Node.js 22 to 24. The evaluator needs no additional runtime package.

```sh
npm run finops:learning:demo
node scripts/finops-learning.mjs demo favourable /tmp/new-learning-experiment.json
node scripts/finops-learning.mjs verify /tmp/new-learning-experiment.json /tmp/new-learning-experiment.report.json
node scripts/finops-learning.mjs freeze /path/plan-spec.json /path/new-frozen-plan.json
node scripts/finops-learning.mjs analyze /path/experiment.json /path/new-report.json
npm run finops:check
```

Output paths must be new. The demo generates invented outcomes directly; it never trains or runs inference. For a real experiment, collect observations externally under the frozen plan, include source evidence and reconciled costs, then import the bundle. All arms must cover the same evaluation cohort. References are identifiers; avoid credentials, private prompts and personal data.

Plan, experiment and report SHA-256 digests bind content. Exact replay verifies internal reproducibility. Retain the original bundle and independently timestamped plan digest. Anyone controlling the input can create a self-consistent replacement, so this is not a signed audit trail.

## Future sidecar

MCP can expose results; enforcement belongs to the service controlling actual dispatch. Current FinOps MCP tools remain read-only. This extension evaluates evidence offline. A future sidecar needs independent qualification of provider identity, data rights, budget concurrency, reconciliation, quality, rollback and expiration. Learning proposals cannot grant themselves training or spending authority.

## Sources and contribution boundary

Sources checked on 22 October 2026:

- [Hsieh et al., Distilling Step-by-Step, Findings of ACL 2023](https://arxiv.org/abs/2305.02301): task-specific capability transfer motivates comparison; it does not establish PALO's economics.
- [Li et al., Small Models Struggle to Learn from Strong Reasoners](https://arxiv.org/abs/2502.12143): transfer can depend on student capacity and signal complexity, motivating quality gates.
- [Hoeffding, Probability Inequalities for Sums of Bounded Random Variables, 1963](https://doi.org/10.1080/01621459.1963.10500830): established concentration inequalities support the bounds; this is not a new statistical method.
- [MCP architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture): interoperability does not supply spending enforcement or training.

The proposed contribution is a reproducible contract connecting learning investment, evidence gaps, accepted outcomes and conditional economics. Real workload benefits, robustness under drift and production sidecar operation are not established by the synthetic fixture.

## Independent model critique and adjudication

GLM-5.3, with Max selected in ZCode, reviewed the supplied design dossier on 22 October 2026. Its completed response was recovered from the local session record, with no tool calls. It did not inspect this implementation or reproduce its tests. Model criticism is an input to review, not independent validation of software or empirical results.

| Criticism | Treatment in this implementation |
| --- | --- |
| Point-estimate savings can create false precision in a crossover. | Accepted. Future rates are explicitly fixed scenario assumptions, not fitted savings. Quality uncertainty gates candidate status. No confidence interval for future prices or calendar payback is claimed. Empirical cost uncertainty needs a subsequent design. |
| Attempted and accepted denominators must stay distinct. | Accepted. The crossover uses attempted tasks. Observed and conditional accepted-outcome ratios are separate, and candidate status also requires a conservative accepted-outcome comparison. |
| Useful life, recurring training and capacity can invalidate a linear model. | Accepted. Useful life and capacity cap eligibility. A declaration of a single investment is required; recurring training and capacity steps remain outside this version. |
| All-in costs and components can double count infrastructure. | Accepted. Overlapping arm/phase/category coverage is rejected. Semantic mislabelling of sources still needs external review. |
| Shared-cost allocations can manufacture a difference. | Accepted and implemented. Observed allocations conserve the source total; mutually exclusive scenarios each bear an applicable common source in full. A regression test changes the accounting allocation without changing the comparison. |
| A small-sample normal interval and uncorrected multiple comparisons are unsafe. | Accepted concern. The implementation uses finite-sample Hoeffding bounds and a single alpha budget over nine prespecified intervals, with an explicit inconclusive state. The suggested McNemar test was not adopted: a usual equality test alone does not establish a prespecified noninferiority margin. |
| Fractions, sunk costs, preregistration and leakage need explicit treatment. | Integer micros, exact integer crossover arithmetic and numerator/denominator reporting are retained. Sunk costs do not affect the future crossover. Exact split collisions are rejected. Registration timestamps and semantic independence remain unverified declarations. |

The proposal to estimate capability decay or demonstrate recurring economic benefits remains future research. This release supplies synthetic falsification cases and a frozen evidence contract, not a completed prospective field study. A second review with Gemini 4 Argon at high effort was requested but no completed response had been captured when this method note was prepared; no Gemini endorsement or review is claimed.
