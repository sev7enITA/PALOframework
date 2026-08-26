# PALO external agentic evidence

Version: `1.0.0`
Status: production contract and reference adapter; provider activation remains deployment-owned.

PALO external agentic evidence turns optional third-party observations into reviewable PALO governance prompts without making an external tracker part of the PALO trust boundary. PALO owns the normalized capability IDs, controls, assessment questions, evidence kinds, KPI/KRI references and lifecycle gates. A provider contributes context and provenance only.

## Non-negotiable boundary

- PALO works completely offline. The reviewed local-import provider is the canonical path and no network source is required.
- Provider labels, scores, rubrics and review states remain contextual external fields.
- An external capability score is never a PALO use-case risk score, finding, gate decision, compliance conclusion or deployment authorization.
- A local accountable reviewer must assess applicability, the actual action space, authority, consequence, controls and evidence.
- Provider narrative, article bodies, summaries, details, commentary and justification text are not retained or mirrored.
- PolicyWatcher or another monitoring system may supply a compatible metadata package later, but PALO has no runtime dependency on it.

## Contract set

| Contract | Purpose |
| --- | --- |
| `schemas/palo-external-evidence-provider-registry.schema.json` | Registers optional adapters, data minimization, fetch and cache boundaries. |
| `schemas/palo-external-agentic-evidence.schema.json` | Normalized metadata-only collection, signals, capability observations, provenance, confidence and review state. |
| `schemas/palo-agentic-capability-crosswalk.schema.json` | PALO-owned capability concepts and reviewed external mappings. |
| `data/external-evidence/provider-registry.json` | Ships a local import path and a disabled-by-default Rogue AI Tracker adapter. |
| `data/external-evidence/palo-agentic-capability-crosswalk.json` | Defines 14 PALO capability concepts and their governance response. |

Normalized signal IDs are deterministic SHA-256 identifiers derived from `providerId + externalId`. Observation IDs additionally bind the provider capability and PALO capability. This makes repeated imports idempotent without treating an external label as a PALO ontology identifier.

Every capability observation carries:

- `paloCapabilityId`, owned and versioned by PALO;
- contextual `providerCapabilityId`, `providerLabel`, `providerScore`, `providerScale` and `providerRubricVersion`;
- reviewed `mappingVersion` and `mappingReviewState`;
- mandatory `contextOnly: true` and `notUseCaseRiskScore: true` boundaries.

The signal holds local `reviewState` and `confidence` separately from the provider's review state. A newly imported signal is `unreviewed` and confidence is `not-assessed`; the adapter does not invent confidence from source count or a provider score.

## PALO reviewed local import

The enabled canonical ingestion path accepts any provider-neutral collection that already conforms to the PALO normalized contract. The collection retains its evidence-origin `providerId`; `palo-local-import` identifies the offline ingestion mechanism, not a replacement source identity. The importer:

- requires an explicit regular-file path and performs no network call;
- enforces a 5 MiB default input limit;
- parses JSON without evaluating markup or code;
- validates the complete JSON Schema, including additional-property rejection;
- rejects prohibited narrative fields anywhere in the object graph;
- verifies every signal digest and the collection digest;
- writes the validated collection atomically to an ignored local cache with restrictive file permissions.

Import the synthetic metadata-only example:

```bash
npm run external-evidence:sync -- --provider palo-local-import --input examples/external-evidence/rogue-ai-tracker-metadata.example.json
```

The status output distinguishes `ingestionProvider` from `evidenceProvider`, declares `networkUsed: false`, and reports the input, collection digest, signal count and cache destination.

## Rogue AI Tracker adapter

Rogue AI Tracker is one optional provider among any number of future providers. Its adapter is disabled by default in the registry and consumes only the incident endpoint. The implementation:

- allow-lists `https://rogueaitracker.com/api/incidents` and rejects redirects;
- applies a five-second timeout, a 2 MiB response limit and a 500-record limit by default;
- requires HTTPS source links and bounded fields;
- fails closed when a provider introduces an unmapped capability or an invalid score;
- deduplicates by deterministic normalized ID;
- keeps titles, dates, source names, source links and contextual score metadata only;
- stores an atomic cache of the normalized metadata collection, never the raw response;
- validates schema and prohibited fields, then verifies collection and signal SHA-256 digests before using a cache;
- can use a validated stale normalized cache after a network failure only inside a finite maximum-stale window (seven days by default).

The crosswalk records the provider rubric as `methodology-checked-2026-08-26`. A methodology change requires an explicit mapping review and a new mapping/rubric version; the adapter must not guess.

## Operation

Validate the contracts, cross-references, prohibited fields and example digests:

```bash
npm run external-evidence:validate
```

Run normalization, boundary, deduplication and bounded-fetch tests:

```bash
npm run external-evidence:test
```

An operator may explicitly refresh the optional adapter into the ignored local cache:

```bash
npm run external-evidence:sync -- --provider rogue-ai-tracker
```

Offline use reads an existing normalized cache and performs no network request. It reports `ageMs` and `stale` honestly even when an operator explicitly chooses an older snapshot:

```bash
npm run external-evidence:sync -- --provider rogue-ai-tracker --offline
```

The cache defaults to `.cache/external-evidence/rogue-ai-tracker.normalized.json`, is excluded from source control and contains no provider narrative. Sync failure does not affect PALO's local assessment, controls, runtime or Governance Hub.

## Governance response

The PALO crosswalk links each canonical capability to:

- existing PALO controls and lifecycle gates;
- evidence kinds that can support an accountable conclusion;
- KPI/KRI definitions that can inform monitoring without proving control effectiveness;
- assessment questions;
- explicit evidence that would lower or raise concern.

This crosswalk selects work; it does not make the decision. For example, an external observation mapped to `palo-cap-unapproved-authority-use` selects Authority Profile, approval binding, signed execution, and bypass-resistance evidence. The local assessor still determines whether the system has that action path and how consequential it is.

## Adding another provider

1. Register a new provider with a unique `providerId`, source-registry reference, data policy and explicit default state.
2. Implement a read-only adapter that emits the PALO collection contract and retains no prohibited fields.
3. Add reviewed provider-capability mappings. Never reuse provider IDs as PALO capability IDs.
4. Add synthetic tests for size, timeout, invalid content, unknown mappings, duplicates and prohibited narrative.
5. Require review before enabling network access in a deployment.
6. Preserve PALO local import and offline operation regardless of provider availability.

An optional PolicyWatcher handoff should be an importable metadata package following the same rules. PolicyWatcher can enrich vendor-response context; it does not become PALO's ontology, risk engine, gate authority or required runtime service.

## Source and reuse disclosure

Rogue AI Tracker is registered as a non-authoritative monitoring signal. PALO links to its incident and source pages and preserves minimal metadata for reference. The adapter intentionally excludes full text and narrative fields. Before expanding public reuse beyond metadata and links, confirm the provider's current licensing and terms.
