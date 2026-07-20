# P2 module contracts

Version: `1.0.0`  
Status: interoperability foundation; browser events are local signals, not authenticated messages or remote APIs.

## Envelope

Modules dispatch `CustomEvent` on `window`. Event `detail` uses this additive envelope:

```json
{
  "contractVersion": "1.0.0",
  "eventId": "event-unique-id",
  "occurredAt": "2026-07-12T08:00:00Z",
  "sourceModule": "PALO_AssessmentPath",
  "caseId": "case-example-001",
  "payload": {}
}
```

Consumers must reject unsupported major versions, ignore unknown fields, validate the payload before use, and treat events as untrusted same-page input. Events must not carry secrets, credentials, raw personal data or large evidence binaries.

## Event names

| Event | Payload | Purpose |
| --- | --- | --- |
| `palo:case-file:ready` | Complete `palo-case-file` | A validated case is available to the current module. |
| `palo:case-file:updated` | `{ caseFile, changedSections }` | Local case state changed and may be re-rendered or stored. |
| `palo:evidence:added` | `{ caseId, evidence }` | A module produced one evidence record compatible with the Case File contract. |
| `palo:handoff:requested` | `{ from, to, caseFile, reason }` | A user explicitly requested a cross-module route. |
| `palo:policywatcher:signal` | Complete `palo-policywatcher-signal` | Regulatory Watch surfaced a non-authoritative monitoring signal for human review. |
| `palo:source:review-due` | `{ sourceId, nextReviewAt, affectedCaseIds }` | A source freshness checkpoint is due. |

The existing Explorer event `palo:activate-explorer` remains unchanged and outside this P2 contract. P3 navigation events are intentionally not defined here.

## Storage and handoff

P1 remains authoritative for browser persistence:

- `localStorage["palo.case-file.v1"]`: one local Case File working copy.
- `sessionStorage["palo.handoff.v1"]`: explicit, single-browser handoff consumed by the destination module.
- `sessionStorage["palo-onboarding-route-v2.3.2"]`: existing onboarding route state.

P2 connectors exchange exported artifacts and do not add background synchronization. Unknown Case File fields must survive import, merge and export. Browser storage is neither encrypted nor access-controlled; users remain responsible for exported-file custody.

## PolicyWatcher handoff

Validate signals against `schemas/policywatcher-signal.schema.json`. A receiving module may add the signal as a Case File source with `sourceType: "monitoring-signal"`, but must retain `authority.status: "non-authoritative-monitoring-signal"` until an accountable reviewer checks the primary source. Confidence describes signal detection, not legal significance.

Assessment Path is the v2.4.0 local receiver. It parses the file in the browser, rejects unsupported format/version/authority values before Case File mutation, preserves the complete signal including additive fields, and records a normalized source, open evidence item and material-change review record. The suggested gates are retained and Measure/Prove are always flagged because this handoff enters the monitoring and review loop. The visible status remains `pending-human-review`; import does not call PolicyWatcher or any PALO endpoint.

## Evolution

Minor versions may add optional fields or events. Breaking field semantics, removing required fields, changing storage ownership or changing event trust assumptions requires a new major version and migration guidance. No network endpoint is part of v1.
