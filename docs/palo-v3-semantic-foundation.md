# PALO v3.0.0 Semantic Foundation

PALO v3.0.0 introduces a versioned semantic foundation for definitions, lifecycle decisions, evidence, mappings and public exploration. It is a major contract release: machine-readable identity and authority boundaries are now first-class, while existing P1 Case File and Evidence Bundle consumers remain supported.

## Outcome

The release establishes one deterministic path from canonical framework meaning to public interfaces:

`semantic-spine.json` -> generated lifecycle and Explorer projection -> semantic validation -> digest-bound semantic release manifest -> allowlisted public build.

The foundation does not claim that formal consistency proves legal applicability, control effectiveness, source freshness or approval. Those remain accountable human decisions.

## Six delivery waves

### Wave 1 - Canonical semantic spine

- Stable HTTPS semantic identifiers for phases, modules, artifacts, controls, indicators, sources, actors and navigation routes.
- Definition version, evidence class, authority boundary, source references and review date on every node.
- Versioned mapping basis on every relationship.
- Deterministic generation of the Explorer graph; the browser asset is a projection, not an independent registry.

### Wave 2 - Lifecycle and gate decisions

- A generated six-phase lifecycle definition aligned to the canonical Decision Gate registry.
- Gate Instance records for the state of a gate in a specific case.
- Append-only Gate Decision Records with actor, authority, rationale, input snapshot and digest chain.

### Wave 3 - Atomic evidence contracts

- Evidence Artifact for immutable item identity, provenance and digest.
- Evidence Claim for a falsifiable assertion and its subject.
- Evidence Evaluation for method, reviewer, result and rationale.
- Evidence Bundle Manifest for versioned composition without replacing the P1 Evidence Bundle.

### Wave 4 - Executable formal model

- JSON-LD context for portable identifiers.
- RDF/Turtle ontology for the public semantic vocabulary.
- SHACL shapes and executable valid/invalid fixtures.
- Named invariants checked in the release pipeline.

### Wave 5 - Mapping and release governance

- Atomic source-to-target mappings across controls, indicators, gates and sources.
- Independent source and target versions, mapping basis, coverage, provenance and approval state.
- Change-impact register and migration gates for breaking semantic changes.
- Digest-bound semantic release inventory.

### Wave 6 - Human-readable boundaries

- Explorer Semantic Inspector exposes ID, version, evidence class, authority boundary, sources and relationship basis.
- Platform Map separates delivery status from evidence/authority class.
- Documentation Library filters by evidence class and workspace.
- Governance Hub labels Executive and Technical as workspace lenses, not access control, and labels all demonstration records as local illustrative previews.

## Evidence and authority classes

| Class | Meaning | Can approve or change governance state? |
|---|---|---|
| `canonical-definition` | Versioned PALO framework definition | No; it defines the framework contract |
| `source-backed-context` | Context traceable to registered sources | No; applicability requires review |
| `illustrative-local-preview` | Demonstration or browser-local working data | No |
| `human-review-required` | Non-authoritative signal requiring accountable review | No |

Delivery status such as Implemented or Foundation is independent of these classes.

## Workspace boundaries

- **Public semantic catalog** - read-only orientation across definitions, relations and sources.
- **Case workspace** - applies released definitions to a local governance case without amending them.
- **Assurance review** - reviews evidence, conditions, incidents and decision history without implying legal or technical authority.

Executive and Technical are presentation lenses inside the Governance Hub. They are not identities, permissions or RBAC roles.

## Release and component versions

`3.0.0` identifies the PALO platform release and its semantic contracts. Runtime, mobile and integration components retain independent semantic versions so their maturity and compatibility are not overstated. Public health and release metadata should therefore expose the platform release separately from the component version; a component version such as PALO-AI `2.5.0` does not imply that the v3 semantic foundation is stale.

The authoritative version inventory is `release-manifest.json`. Component status remains independent of version: a runtime can be versioned and tested while still carrying a developer-preview or prototype boundary.

## Public contracts

| Contract | Canonical asset |
|---|---|
| Semantic spine | `data/semantic-spine.json` |
| Lifecycle definition | `data/lifecycle-core.json` |
| Semantic mappings | `data/semantic-mappings.json` |
| Change impact | `data/semantic-change-impact-v3.json` |
| Semantic release manifest | `data/semantic-release-manifest.json` |
| JSON-LD context | `data/palo-semantic-context.jsonld` |
| RDF ontology | `formal/palo-ontology-v3.ttl` |
| SHACL shapes | `formal/palo-ontology-v3.shacl.ttl` |

JSON Schemas under `schemas/` are the validation contracts. Valid and invalid fixtures under `schemas/fixtures/` make failure behavior testable.

## Generation and validation

```bash
npm run semantic:generate
npm run semantic:validate
npm run semantic:release
npm run validate
```

Use `semantic:check` and `semantic:release:check` in CI to detect generated-asset drift. `npm run p0` validates contracts, semantic invariants, publication allowlists, the deterministic build and browser behavior.

## Change policy

- Patch: clarifications that preserve identifiers and meaning.
- Minor: additive nodes, mappings or optional properties.
- Major: identifier removal, meaning change, cardinality change, authority-boundary change or incompatible mapping semantics.

Every major semantic change requires a change-impact record, migration gate, regenerated release manifest and updated public documentation.
