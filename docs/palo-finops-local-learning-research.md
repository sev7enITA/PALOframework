# PALO FinOps: local learning research and reproducibility

PALO FinOps 1.3 connects AI cost accountability with an experimental question: when could investment in a local model justify its full cost while retaining acceptable quality and latency? This guide explains what is available, who can use it and what the evidence supports. Updated 22 October 2026. Created and maintained by Fabrizio Degni.

[Open Local learning](../PALO_FinOps.html#local-learning) | [Module and role guide](palo-finops.md#who-uses-the-module) | [Detailed method](palo-finops-learning.md) | [Download the reproduction package](../assets/PALO_FinOps_Local_Learning_v1.0.1.zip)

## What the module adds

The existing FinOps workspace records attempts, reconciles billing, allocates shared costs, preserves period snapshots and supports operational review. Local learning adds a separate offline comparison of three configurations on the same frozen task cohort:

| Configuration | Question |
| --- | --- |
| External-only | What does the external baseline cost at its observed acceptance and latency? |
| Static hybrid | What can a local and external workflow achieve without new training? |
| Distilled hybrid | Does a trained checkpoint add enough value to justify the intervention and its ongoing costs? |

The main research comparison is distilled versus static hybrid. An advantage over external-only does not by itself establish that training is worthwhile. The evaluator keeps unsuccessful and inconclusive comparisons visible.

## Who uses it and how

| Role | Starting point | Reviewable output |
| --- | --- | --- |
| End user or workload owner | Explain the task and define what an accepted result means. Review examples before importing an experiment. | Named workload, acceptance rubric and evidence gaps. |
| IT leader or platform engineer | Freeze model and router identities, inspect paired outcomes, latency, capacity and useful life. | Quality and feasibility checks tied to one configuration and cohort. |
| Administrator | Maintain input versions and evidence references; import, export and replay reports. | Reproducible files and an auditable handoff. Browser role views do not create access permissions. |
| CFO, controller or FinOps lead | Check complete spending, explicit unknowns, task-level future costs and investment timing. | Cost per accepted task, accounting reasons and conditional crossover ranges. |
| Researcher or assurance reviewer | Inspect registration, split independence, uncertainty and sensitivity to future assumptions. | A bounded research claim and a plan for prospective validation. |

Start with one of the seven synthetic scenarios. Read the observed experiment before its prospective projection. Inspect accounting gaps, quality and latency gates, then vary the declared future volume and useful life. Export both the experiment and report. A scenario is an invented teaching example, not an observed model benchmark.

## Research method

The experiment fixes task splits, model checkpoints, router identity, acceptance rubric, latency limits and evaluation size before examining results. Accounting covers teacher data, training, evaluation, hardware, energy, human review, operations and local and external inference. Sunk spending, new investment, evaluation expense and future assumptions are separate.

The evaluator uses simultaneous concentration bounds for its prespecified comparisons, paired acceptance checks, and quality and latency floors. Their interpretation requires the sampling assumptions in the [method](palo-finops-learning.md). A numerical pass does not prove that imported tasks are independent or representative. Future economics remain conditional on supplied rates, acceptance, volume, capacity and useful life.

Costs are expressed per complete attempted task, including its model calls, retries and fallbacks. Common sources apply in full to each declared standalone alternative, while observed allocations conserve the original amount. Unknown and nonfinal costs remain visible and can block eligibility. A conditional candidate is an outcome for review, not a deployment or spending authorization.

## Paper, extension and validation are separate

| Artifact | Current scope | Evidence boundary |
| --- | --- | --- |
| [FinOps technical preprint v1.0](../assets/PALO_FinOps_Paper_v1.0.pdf) | Original FinOps model and its original synthetic cases. [LaTeX source](../assets/PALO_FinOps_arXiv_source_v1.0.zip) and [original reproduction package](../assets/PALO_FinOps_reproducibility_v1.0.zip). | This unchanged paper is separate from the Local learning extension. A source package prepared for arXiv is not evidence of an arXiv submission or acceptance. |
| [Local learning method](palo-finops-learning.md) | Experimental three-arm comparison, full-cost accounting and conditional future economics. | Inputs and frozen plans use contract 1.0.0. Reports use 1.0.1; regenerate older reports. |
| [Local learning reproduction package 1.0.1](../assets/PALO_FinOps_Local_Learning_v1.0.1.zip) | Evaluator, CLI, tests and seven synthetic experiment/report pairs. [SHA-256](../assets/PALO_FinOps_Local_Learning_v1.0.1.zip.sha256). | Replay checks software consistency. It does not measure deployed model performance or economic benefit. |
| Model-assisted source critique | GLM-5.3 Max and Gemini 4 Argon Alta reviewed the source dossier. GLM also reviewed the corrective patch. | Argon's corrective-patch follow-up failed with service errors. These reviews are not peer review, and neither model ran the tests. |

Source review led to corrections for numerical boundary cases, strict JSON inputs, explicit accounting reasons and reporting contracts. Automated checks exercise implementation behavior and adversarial cases. They do not validate evidence provenance, workload representativeness, real-provider billing or realized savings.

## How to reproduce

Download and extract the Local learning package. With Node.js 22 or 24 installed, run from the extracted directory:

```sh
node verify-all.mjs
node scripts/finops-learning.mjs demo favourable
```

To run the test suite as well, install its pinned schema-validation dependencies with `npm ci --ignore-scripts`, then run `npm test`. Dependency installation requires access to the npm registry; report replay does not.

The package has no provider credentials and needs no model endpoint. Its manifest records SHA-256 hashes for included files. The seven replay cases cover a conditional advantage, no payback, quality regression, insufficient evidence, unknown costs, a short useful life and an advantage that disappears as volume increases.

## What remains to validate

A real pilot must register its protocol, establish evidence provenance and data rights, collect representative held-out outcomes, reconcile actual costs and test the assumptions behind projected economics. Training pipelines, adaptive MCP sidecars, checkpoint promotion and production enforcement are future integration work. This release evaluates supplied evidence offline; it does not implement continual distillation or automatically reduce reliance on external models.

## Literature and interpretation

[Distilling Step-by-Step!](https://arxiv.org/abs/2305.02301) reports task-specific improvements from rationale-based distillation. It supports investigating local learning, not assuming its economics generalize to a new workload. [Small Models Struggle to Learn from Strong Reasoners](https://arxiv.org/abs/2502.12143) shows that transfer can depend on student capacity and reasoning complexity. Together these motivate measuring both capability and full cost. Neither study validates PALO's implementation or demonstrates savings for its users.
