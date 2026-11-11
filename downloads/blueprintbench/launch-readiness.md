# PALO BlueprintBench research launch

Release **v0.3.0-pilot.1**, 11 November 2026. Explorer 0.3.0; evaluator and executable evidence contract 0.2.0. This release opens public inspection and independent participation in the benchmark. Qualified held-out results remain zero, and no PALO Blueprint Index score is assigned.

## Implemented and verified

- **42 evaluator tests pass**, including the original integrity protections and new adversarial cases for critical-error duplication, contradictory labels, frozen acceptance, raw-output spans, unknown charges, non-execution, backdated locks and distinct declared reviewer/adjudicator roles.
- **26 historical attempts replayed offline**, across ten model configurations: all retained raw-claim and structural-check counts match the recorded audit, with zero differences. This is deterministic checker reproduction, not repeated model generation or semantic validation.
- A single executable JSON Schema defines the scoped evidence records. The scorer applies cross-record hashes, exact claim text binding, complete raw-text span accounting and frozen matching/acceptance constraints.
- Reported completion, calculated task acceptance and independent qualification have separate fields. Critical errors are deduplicated; occurrence counts remain available. Failed and omitted tasks remain in the denominator.
- Timeout, model error, budget censoring and pre-call non-execution are distinct. Non-executed empty tasks need no semantic annotation. Unknown costs and pending reservations remain separate from charges; cost per accepted task is undefined when accounting is incomplete.
- Local locks explicitly report external preregistration as unverified. A rehashed local lock cannot earn a comparable or qualified badge. No independent signer is invented and no submitter-controlled qualification override exists.
- The explorer correction badge is driven by row metadata. CSV exports include the configuration fields previously omitted, and latency displays include completed/attempted call counts.
- Public copies and ZIP contents are generated from source and checked for drift in CI. Historical release tags and original review evidence remain identifiable.

## Release boundaries

The gold references, semantic equivalence and raw-text decomposition still depend on honest, competent human adjudication. Text-span coverage cannot prove that an annotator classified meaning correctly. Hashes cannot prove authorship or trusted prior registration. The broader protocol's human-effort study, independent custody, statistical uncertainty and full eight-dimensional composite remain open work. These limitations are not concealed by a release label.

The 26 historical attempts are development passage diagnostics with differing settings. They are not 26 independent document families, and this update does not add a ranked frontier-model comparison. The three large development repositories remain distinct from the new procurement study. No new Workbench application qualification, installer or end-to-end success is announced by this benchmark release.

## Publication scope and announcement

Announce the **launch of an open benchmark research programme for specification fidelity**, with working evaluation machinery, inspectable historical evidence and an invitation to independent participants. The first proposed study focuses on procurement, critical rule inversions, coverage and human correction effort. PALO remains free. Use [the prepared announcement](announcement.md).

The canonical page remains https://paloframework.org/PALO_BlueprintBench.html. `paloblueprint.org` is a candidate, not an acquired or verified-available domain. PALO BlueprintBench is unrelated to Andon Labs' spatial Blueprint-Bench.

## Verification records

The release includes `toolkit-verification.json`, `offline-replay.json`, a source/package hash manifest, and the GitHub Actions run attached to the tagged source. `tools/build_public.py --check` checks generated copies and both downloadable packages. The publication receipt separately records remote and HTTPS byte verification; a Git commit alone is not evidence that a deployment succeeded.
