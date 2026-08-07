# P2 adoption and integration index

Version: `1.0.0`  
Status: educational starter library; not production controls, legal advice, certification, regulatory completeness or authorization to deploy.

This is the index document for every P2 JSON artifact. The machine-readable cross-reference index is `data/p2-adoption-index.json`, validated by `schemas/palo-p2-index.schema.json` and semantic checks in `scripts/validate.mjs`.

## Structured libraries

| JSON artifact | Schema | Records | Purpose |
| --- | --- | ---: | --- |
| `data/control-library.json` | `schemas/palo-control-library.schema.json` | 8 controls | Tailorable purpose, data, review, supplier, testing, incident, change and trace controls. |
| `data/kpi-kri-registry.json` | `schemas/palo-kpi-kri-registry.schema.json` | 8 indicators | Illustrative formulas, cadences, thresholds and caveats linked to controls and gates. |
| `data/decision-gates.json` | `schemas/palo-decision-gates.schema.json` | 6 gates | Frame through Prove and Review decision prompts with controls, indicators, sources and templates. |
| `data/source-registry.json` | `schemas/palo-source-registry.schema.json` | 6 sources | Authority status, usage limits and freshness checkpoints. |
| `data/p2-adoption-index.json` | `schemas/palo-p2-index.schema.json` | 6 artifacts, 6 cases, 5 templates | Canonical P2 paths and case-to-library connections. |

Schemas are JSON documents and are published at the paths above. IDs are stable interoperability keys, not equivalence claims to external frameworks.

## PolicyWatcher signal

- Schema: `schemas/policywatcher-signal.schema.json`
- Valid educational example: `schemas/fixtures/policywatcher-signal.valid.json`
- Intentionally invalid validator fixture: `schemas/fixtures/policywatcher-signal.invalid.json`
- Browser event: `palo:policywatcher:signal`
- Contract: `docs/p2-module-contracts.md`

Every signal is required to state `non-authoritative-monitoring-signal`. Detection confidence describes the observation, not policy significance, applicability or legal effect.

PALO v2.4.0 adds a local receiver in Assessment Path. Additive fields are allowed and retained as a minor-version compatibility rule. A valid observation is stored as a `monitoring-signal` source with the original URL, observed/retrieved dates, change summary, confidence rationale and full imported document. It creates an open evidence record, marks the Case File reopened, and flags Measure and Prove for human review. Invalid signals do not mutate the Case File, and no network submission is part of import.

## Worked Case File fixtures

All six JSON files validate against `schemas/palo-case-file.schema.json`. Each has `context.exampleStatus`, source-status limitations and `context.p2References` that match the machine-readable index.

| Domain | Case File JSON | Primary templates |
| --- | --- | --- |
| Procurement | `examples/worked-cases/procurement.case.json` | Procurement, board review |
| Human resources | `examples/worked-cases/hr.case.json` | Board review, incident response |
| Public service | `examples/worked-cases/public-service.case.json` | Incident response, board review |
| Software delivery | `examples/worked-cases/software-delivery.case.json` | Red-team evidence, incident response |
| Generative AI | `examples/worked-cases/generative-ai.case.json` | Red-team evidence, incident response, board review |
| Agentic workflows | `examples/worked-cases/agentic-workflow.case.json` | Incident response, board review, red-team evidence |

These are fictional teaching records with incomplete evidence. A gate decision in a fixture is not a recommendation for a real system.

## Markdown templates

- `templates/procurement.md` (`tpl-procurement`)
- `templates/incident-response.md` (`tpl-incident-response`)
- `templates/board-review.md` (`tpl-board-review`)
- `templates/red-team-evidence.md` (`tpl-red-team-evidence`)
- `templates/contribution-starter.md` (`tpl-contribution-starter`)

## Integration and publication

- Module and browser-event contracts: `docs/p2-module-contracts.md`
- Vendor-neutral connector patterns: `docs/p2-connector-patterns.md`
- Dependency and license inventory: `docs/p2-dependency-inventory.md`
- Publication hygiene: `docs/p2-publication-hygiene.md`
- Policy-as-code guidance: `examples/policy-as-code/README.md`
- Policy-as-code example: `examples/policy-as-code/decision-gate.example.rego`
- Policy input JSON: `examples/policy-as-code/decision-gate-input.example.json`
- Policy input schema: `schemas/palo-policy-input.schema.json`

No connector is configured, no credential is provided, and no policy example executes in the public site.

## Versioning and migration stance

All P2 formats begin at `1.0.0`. Minor versions may add optional fields and records while preserving existing ID meaning. Removing required fields, changing field semantics, changing event trust assumptions or repurposing an ID requires a new major version, explicit migration guidance and compatibility fixtures. Consumers must reject unsupported major versions and preserve unknown Case File fields.

The P1 Case File remains at `1.0.0`; P2 references are additive content under its open `context` and assessment/evidence records, so no P1 migration is required. PolicyWatcher signals are handoff observations, not silently promoted to authoritative sources.
