# PALO Tri-Graph Governance 0.1

An additive reference profile over the PALO 3.1 semantic foundation. Knowledge assertions, decision context and guarded procedures share stable identifiers, versioned definitions and explicit evidence boundaries.

From the repository root, run `npm ci --prefix packages/palo-tri-graph --ignore-scripts` to install the pinned test-only dependencies, then `npm test --prefix packages/palo-tri-graph`. Run `node scripts/generate-tri-graph.mjs --check` for export drift. The evaluator itself has no external runtime dependencies. Open `PALO_TriGraphGovernance.html` through a local HTTP server to explore the same registry and evaluator.

The evaluator is a deterministic, side-effect-free local rehearsal. Its result always contains `canExecute: false`. The trusted observations argument is a caller-supplied fixture, not an authenticated live observation. Production integration requires server-owned inputs, a capability bound to the complete decision, execution-boundary fencing, target-side conditional writes where supported, revocation checks and authoritative effect observation. These are not implemented by this package.

Generated OWL, SHACL, SKOS, JSON-LD and dictionary exports derive from `data/tri-graph-governance.json`. `node scripts/generate-tri-graph.mjs` regenerates them; `--check` rejects drift. Runtime record shape is authored in `packages/palo-tri-graph/contracts.mjs` and exported to JSON Schema; the field dictionary derives from those contracts. No release silently changes the PALO 3.1 core ontology or existing agentic contracts.
