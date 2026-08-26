# PALO ↔ PolicyWatcher signal operations

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

The scheduled workflow runs every six hours and can be dispatched manually after an urgent PolicyWatcher withdrawal. The post-deploy alert job fails visibly when transport is degraded or a warning/critical alert exists; the safe static deployment and last validated registry remain available.

## Authority boundary

Transport success is not a PALO applicability, risk, control-effectiveness or gate decision. Every active signal begins as `pending-human-review`. Review state is maintained locally by the Governance Hub and can be exported with the signal digest for accountable recordkeeping; browser-local state alone is not organizational approval or independent assurance.
