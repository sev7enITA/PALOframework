# PALO and PolicyWatcher signal operations

Status: optional production pull transport. PALO remains autonomous and PolicyWatcher remains an external public-evidence source.

## Transport

`npm run policywatcher-signals:sync` traverses the complete no-store PolicyWatcher batch endpoint in bounded pages of 25. Every batch and embedded signal is validated against PALO-owned schemas before the operational registry is replaced. The command accepts only the canonical `https://policywatcher.online` origin, rejects redirects, limits every response to 1 MiB, stops after 20 pages and writes state atomically.

The committed registry is an offline-safe `not-synchronized` baseline. A scheduled GitHub Actions workflow restores the last validated private workflow cache, performs the pull, builds the static site with the resulting registry and deploys only the allowlisted `dist` artifact. If PolicyWatcher is unavailable or returns an invalid contract, PALO preserves the last validated active entries, marks them stale and publishes a critical operational alert. Core PALO pages, schemas, controls and Case Files do not require the transport.

## Revocation boundary

PolicyWatcher returns both the single-signal and complete snapshot endpoints with `Cache-Control: no-store`. PALO classifies an accepted signal as revoked only after a complete snapshot traversal succeeds and the signal is absent. Partial pagination, capacity limits, timeouts, rate limits, invalid JSON and schema failures never create a revocation. A revoked registry entry retains identifiers and its last validated digest but removes the signal payload from the active queue.

## Operator commands

```bash
npm run policywatcher-signals:sync
npm run policywatcher-signals:check
npm run policywatcher-signals:check -- --fail-on-alert
```

The workflow is configured for minute 17 of each UTC hour and supports manual dispatch after an urgent PolicyWatcher withdrawal. Read the actual run timestamps and the published registry rather than assuming a scheduled time proves delivery. The source endpoints are no-store, so the source withdrawal has no cache grace window; the static PALO registry reflects it on the next complete scheduled or manual traversal. The post-deploy alert job fails visibly when transport is degraded, a signal is revoked, or another warning/critical alert exists; the safe static deployment and last validated registry remain available.

## Source review deadlines

The framework's `data/source-registry.json` and the operational `data/integrations/policywatcher-signal-registry.json` serve different purposes. A successful PolicyWatcher pull does not review the AI Act, standards or other framework references.

Before source validation and publication, the workflow runs `npm run sources:age`. It marks expired `current` sources as `review-due` without changing `checkedAt`, `nextReviewAt`, source content or authority. It first verifies the semantic and Knowledge Reader releases, then updates only the affected source and bundle digests. Existing schema and integrity failures still stop the build. No signed Reader image is published by this operation.

Due reviews appear as workflow warnings and in the run summary. They require accountable review before a source may be marked `current` again, but do not prevent publication of a registry that states the overdue status honestly. See [contribution instructions](../CONTRIBUTING.md#source-review-deadlines).

## Deployment and troubleshooting

| Observation | Meaning | Operator action |
| --- | --- | --- |
| `sync-build` fails; `deploy` is skipped | Validation or build failed before publication | Open the failed step and resolve the reported error; a successful pull alone is insufficient |
| `deploy` succeeds; `alert` fails | The safe artifact was published with degraded transport or an actionable signal alert | Inspect transport state and the alert codes in the published operational registry |
| `review-due` warnings with successful jobs | Framework source reviews are overdue and explicitly labelled | Perform the substantive review; do not extend verification dates just to remove warnings |
| A run is cancelled | The publication workflows share a concurrency group and newer work can replace it | Check the superseding run; wait for it before manually dispatching another publication |
| A pull-request deploy is skipped | Pull-request checks validate the candidate but do not publish it | Verify the separate push-to-main deployment after merge |

Inspect or manually start the workflow with GitHub CLI:

```sh
gh run list -R sev7enITA/PALOframework --workflow sync-policywatcher-signals.yml --limit 5
gh workflow run sync-policywatcher-signals.yml -R sev7enITA/PALOframework --ref main
```

Wait for any active main-branch publication before manual dispatch. Confirm the selected run's `sync-build` and `deploy` jobs, then read the published [operational registry](https://sev7enita.github.io/PALOframework/data/integrations/policywatcher-signal-registry.json) and [framework source registry](https://sev7enita.github.io/PALOframework/data/source-registry.json).

The two Pages workflows publish to `https://sev7enita.github.io/PALOframework/`. They do not deploy the separately hosted `paloframework.org` website or the signed Knowledge Reader service. A normal push build starts from the committed offline-safe signal baseline; the next successful signal sync publishes the refreshed snapshot. For final delivery verification after a source release, complete the main build first and then run and verify the signal sync.

## Authority boundary

Transport success is not a PALO applicability, risk, control-effectiveness or gate decision. Every active signal begins as `pending-human-review`. Review state is maintained locally by the Governance Hub and can be exported with the signal digest for accountable recordkeeping; browser-local state alone is not organizational approval or independent assurance.
