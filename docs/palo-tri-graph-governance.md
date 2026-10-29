# PALO Tri-Graph Governance 0.1

Fabrizio Degni · 29 October 2026 · Additive reference preview over PALO 3.1

[Interactive explorer and rehearsal](../PALO_TriGraphGovernance.html) · [Registry](../data/tri-graph-governance.json) · [Validation](palo-tri-graph-validation.json)

## Purpose and evidence status

The proposed improvement is a connected decision model: attributed knowledge, a complete decision context within a declared scope, and a permitted procedure all use stable identifiers and pinned versions. PALO's existing distinction between authorization, execution, observed effect and business outcome remains fundamental.

This release implements a versioned semantic extension, generated linked catalogues, a deterministic local evaluator and a reverse dependency query. It does not implement a production execution adapter, a durable bitemporal database, automatic truth assessment, legal conformity assessment or an autonomous learning service. The local evaluator always returns `canExecute: false`. “Candidate” means that the supplied rehearsal inputs satisfy the reference checks, not that the action is authorized.

## Current PALO and the three pillars

The inspected PALO semantic spine contains 46 framework/navigation nodes and 48 relationships. These are not counts of all business concepts. The six canonical phases remain Frame, Classify, Assess, Control, Measure and Prove.

| Pillar | Existing PALO basis | Gap addressed by this extension |
| --- | --- | --- |
| Knowledge Graph | Semantic spine, core OWL/SHACL, source registry, control and indicator registries, draft stack dependency graph | A common typed vocabulary for assertions, sources, dependency closure and semantic version bindings |
| Context Graph | Case File, Authority Context, policy input, data fitness/disclosure and resource preconditions | A first-class decision snapshot with selected facts, explicit exclusions, time bounds and pinned knowledge/procedure/vocabulary |
| Procedural Graph | Lifecycle gates, policy decisions, approvals, capabilities, task transitions, Effect Contracts and verification | An inspectable transition contract whose required evidence cannot be selected away by the proposing model |
| Cross-cutting assurance | Evidence envelopes, receipts, outcome attestations and accountable decisions | Replayable local explanation and an impact query that identifies contexts affected by a corrected dependency |

The extension does not replace existing Action Claim, Approval, Execution Capability or Effect Contract schemas. Its object names are semantic bridge concepts. For example, an `ActionProposal` in this rehearsal is not a schema-valid signed PALO Action Claim. A `DecisionReceipt` is not an execution capability.

## Risk-led architecture

A correct fact can be used outside its valid time, purpose or tenant. A retrieved document can contain instructions masquerading as authority. A model can omit a blocking dependency. A successful policy decision can precede a resource change. A timeout can conceal a completed write. A later semantic revision can make a historical decision impossible to reconstruct.

The three pillars address these failure modes through a shared contract:

1. **Knowledge Graph:** maintain attributed assertions, typed dependencies, a source reference, evidence status, `validFrom`, `validUntil` and `recordedAt`. The reference model distinguishes `curated` from `untrusted-external` and keeps confidence separate. A confidence value of 1 never grants authority. The recorded timestamps support temporal checks; they do not provide a complete bitemporal storage system.
2. **Context Graph:** materialize tenant, case, subject, purpose, selected assertions, explicit exclusions, resource version, authority/policy epochs and release bindings. The required closure starts from the curated transition's required assertions and follows `dependsOn` edges with a visited set. Cycles terminate. There is no arbitrary depth cutoff in the bounded reference graph.
3. **Procedural Graph:** represent states and transitions explicitly. Each transition names an operation, evidence requirements, guards and accountable role. Mandatory guards cannot be removed. An unknown previous effect blocks further write proposals and permits a separately scoped reconciliation proposal.

The three graphs are logical views. The reference uses JSON records and a state machine. It does not require three databases or an RDF execution engine. A relational implementation with recursive queries can provide the same bounded dependency semantics.

### Completeness and trust boundary

The evaluator checks the entire supplied knowledge bundle against caller-owned bindings. It also requires each assertion to be selected or explicitly excluded, and all mandatory transitive dependencies to be selected. This detects omissions within that approved bundle. It cannot establish that the bundle includes every relevant real-world restriction. A false or incomplete bundle curated by an authorized party remains a risk.

The browser supplies synthetic observations. A production service must acquire these observations itself from authenticated, authorized systems. It must not accept a client-supplied `observed` object as evidence of live authority. The release bindings, case identity, current procedure state, pending effect, exact resource, policy and authority epochs, resource version, budget, replay ledger and approval must belong to that trusted boundary. A pending rejection supplied for this case blocks every proposal, including attempts with a new nonce. Clearing it requires an attributable review in the trusted service; a client cannot clear it. Reconciliation is read-only by contract and must never map to a mutating capability. The vocabulary digest is also pinned to the evaluator build, preventing a caller from substituting an arbitrary vocabulary hash.

Global knowledge digests can cause unnecessary invalidation at scale. A future scoped implementation needs a deterministic query contract, completeness watermarks and per-scope version epochs. Merely hashing a retrieved subset is insufficient to detect omitted revocations or contradictions.

## Formal contract and generated semantics

`data/tri-graph-governance.json` is the source for 20 extension concepts, 24 relationships, 15 invariants and the six-phase mapping. `packages/palo-tri-graph/contracts.mjs` defines the bounded runtime record contracts. The generator emits OWL, SHACL, SKOS, JSON-LD, JSON Schema, fixtures and the combined dictionary; `--check` rejects byte drift.

The OWL extension uses a separate namespace and imports the existing core. It reuses PALO semantic classes and aligns selected concepts with PROV-O. OWL inference is not input validation. SHACL validates a deliberately limited RDF profile: identifiers, version strings and the context time interval. The complete JSON contract and runtime checks are separate. A valid RDF record does not establish authority, truth or storage immutability.

The SKOS export contains language-tagged labels and pillar membership. The dictionary joins semantic concepts and relationships with fields extracted from the runtime schemas. Every field carries a semantic concept ID, URI and validation constraints; the explorer navigates from a field to its concept and relationships. The website reads these files at load time and resolves concept relationships interactively. “Dynamic” means generated from versioned sources, linked and queryable. It does not mean self-modifying production policy.

| Contract | Meaning | Important binding |
| --- | --- | --- |
| Knowledge bundle | Curated assertion inventory with dependency edges | Caller-approved knowledge digest |
| Context snapshot | Scoped decision basis and exclusions | Knowledge, procedure and vocabulary digests |
| Procedure graph | Permitted transitions and mandatory guards | Caller-approved procedure digest |
| Rehearsal request | Proposed state transition and exact resource operation | Tenant, case, subject, purpose, nonce and sequence |
| Caller observations | Synthetic reference for authority, resource, policy, budget and approval | Never trust a browser copy as a live observation |
| Decision receipt | Rule outcomes, witnesses and replay digests | Exact bundle and observations used |

The key-sorted JSON serializer is specified by this implementation and tested for these JSON-only records. It is not advertised as a complete RFC 8785 implementation. Cross-language signing would require a standardized canonicalization profile and interoperability tests.

## Admission and external execution

The proposed production workflow is:

`Action Claim → trusted context acquisition → tri-graph evaluation → existing PALO admission → capability binding → target adapter → authoritative observation → effect verification → accountable closure`

A production integration must bind the original Action Claim, Effect Contract, resource selector, payload digest, semantic release and context digest. It must recheck policy/authority epochs, expiry, budget reservations and idempotency at the execution boundary. A local transaction does not make an external API atomic. Where supported, the target must enforce a conditional write or compare-and-swap and an idempotency key. Where unsupported, document the remaining race, narrow the action and require reconciliation when the outcome is uncertain.

Recovery is a new action with its own authority, current context and budget. A reserve budget may be designed, but it must not be an implicit permission. Compensation can be unavailable or partial; an email sent or data disclosed cannot be assumed reversible. A timeout must never be interpreted as proof that nothing happened.

## Explainability and accountability

A decision explanation contains the evaluated rule IDs, pass/fail results, evidence references, version bindings, exclusions and responsible role. It explains the reference policy evaluation. It does not reveal hidden chain-of-thought, certify an LLM's internal reasoning or prove the external effect.

Responsibilities belong to separate roles: a semantic curator maintains definitions; a case owner establishes purpose and context; an authority service verifies mandates; a reviewer approves within scope; an executor performs the admitted operation; an effect observer checks the authoritative target; an assurance reviewer resolves challenges. Separation of duties must be implemented by the adopting organization, not inferred from role labels in a JSON file.

An affected person or reviewer can open a challenge linked to the original receipt. The proposed process records grounds and evidence, assigns an owner and deadline, re-evaluates under the corrected facts, and issues an attributable outcome or reasoned rejection. The original receipt remains available. The current implementation supplies concepts and a local reassessment list, not the durable challenge service or response SLA.

## Controlled learning and semantic change

The feedback path is `trace → candidate correction → impact analysis → independent review → tests → versioned release → explicit migration`. An agent-generated proposal cannot promote itself to policy or alter an active procedure.

The reverse dependency query propagates a changed assertion through its dependants and identifies snapshots that selected or explicitly excluded affected nodes. An exclusion rationale can become invalid after a correction. It does not mutate historical receipts. A production system must persist the resulting reassessment queue, establish notification deadlines and monitor completion. Retroactive corrections trigger a new assessment; they do not retroactively prove that the original decision used information unavailable at its recorded time.

Historical replay must retain the exact evaluator, vocabulary, procedure, knowledge bundle, observations and serialization rules. Continuing a long-running case under a new semantic release requires a recorded compatibility or migration decision. Hashes are useful only if the referenced bytes remain retrievable and their trust provenance is established.

## Comparison with a competent baseline

IAM, policy-as-code, workflow engines and structured decision logs already provide important controls. A graph label adds no protection by itself. PALO's proposed gain is an explicit connection between those controls and dependency-based evidence: which fact supported which decision, which contexts a correction affects, and which semantic release each transition used.

The extension demonstrates a local mechanism for those queries and checks. It has not demonstrated reduced incidents, lower cost, faster review or superior operational decisions. A production comparison should use the same cases and risk policy for the tri-graph profile and a competent IAM/workflow/log baseline, with predeclared measures:

- Unsafe candidate rate: invalid proposals classified as candidates divided by invalid proposals, reported by failure category.
- Unnecessary hold rate: valid proposals held divided by valid proposals, with an adjudicated expected result.
- Evidence reconstruction completeness: decisions with all replay inputs retrievable divided by sampled decisions.
- Correction impact recall: known affected decisions found divided by all affected decisions in a controlled corpus.
- Evaluation latency and storage cost, with graph size and dependency depth recorded.
- Operational incidents and verified effects measured separately from fixture pass rates.

The EMBA Lean Startup approach informs the hypothesis and measurement sequence. It does not turn synthetic tests into market validation or evidence of business outcomes.

## Research and model review

The supplied infographic by Rakesh Gohel is the conceptual starting point, not a technical standard. Its permissive deviation language is replaced with explicit authority and change control. W3C PROV-O supports provenance modeling, SKOS supports concept organization, SHACL provides RDF constraint validation, and JSON-LD supports linked-data export. OPA decision logs and LangGraph persistence provide relevant existing engineering capabilities for baseline comparison.

Gemini 4 (High, displayed as Argon Alta) and GLM 5.3 (Max) reviewed the design through their authenticated interfaces. Their outputs informed the completeness, execution-boundary, recovery and semantic-drift analysis. Model comments are advisory. They do not constitute independent assurance, production qualification or proof of effectiveness. Findings are adjudicated against the actual implementation and tests in the validation record. The later Gemini code-review interaction displayed a quota warning and switched its selector to Flash-Lite; its exact response model cannot be confirmed and is not represented as a Gemini 4 High code review.

Primary sources inspected for this work:

- Rakesh Gohel, [original three-graph post](https://www.linkedin.com/posts/rakeshgohel01_aiagent-agenticai-aigovernance-activity-7511039118546604032-Burs).
- W3C, [PROV-O](https://www.w3.org/TR/prov-o/), [SKOS Reference](https://www.w3.org/TR/skos-reference/), [SHACL](https://www.w3.org/TR/shacl/) and [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/).
- Open Policy Agent, [Decision Logs](https://www.openpolicyagent.org/docs/management-decision-logs).
- LangChain, [LangGraph Persistence](https://docs.langchain.com/oss/python/langgraph/persistence).

EMBA source used privately: Antonio Ghezzi, *Innovation Strategy / Lean Startup*, iFlex course deck: slide 19 (objectives, constraints and SWOT); slides 22–28 (value proposition and business model); slides 31–34 (Build-Measure-Learn and falsifiable hypotheses). The course slides are not republished. STAR structures the five executive slides; the technical supplement contains four slides. The new presentation contains no rhetorical questions.
