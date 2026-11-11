# PALO ontologies and their operational grounding for agentic governance

## BlueprintBench ontology · 11 November 2026

The [BlueprintBench ontology](../formal/palo-blueprintbench-ontology.ttl), version 0.1.0, extends the PALO vocabulary in its own namespace. The core 3.1 ontology and digest-bound release remain unchanged.

| Class | PALO parent | Meaning |
| --- | --- | --- |
| `EvaluationProgramme` | `CanonicalDefinition` | A versioned programme that defines evaluation tasks, protocols and publication rules. |
| `IndexDefinition` | `CanonicalDefinition` | A proposed or adopted specification for an aggregate index, including eligibility, formula and version. |
| `EvaluationCohort` | `CanonicalDefinition` | A declared set of source families and tasks with a split, revision and reuse conditions. |
| `SourceRepository` | `EvidenceArtifact` | A coherent source collection identified by provenance, size and content fingerprints. |
| `ModelConfiguration` | `CanonicalDefinition` | Model revision, provider/runtime, quantisation, reasoning, context and pipeline settings bound to a run. |
| `EvaluationRun` | `AssessmentRun` | A recorded execution under one declared configuration and cohort; failures remain in the record. |
| `MetricDefinition` | `CanonicalDefinition` | Versioned metric semantics with scope, unit, denominator and missing-value rules. |
| `MetricResult` | `MetricObservation` | An observation for one metric and run; an unavailable value is not a zero. |
| `BusinessBlueprint` | `EvidenceArtifact` | A versioned data and process representation with source references and review state. |
| `ReviewRecord` | `EvidenceEvaluation` | A scoped review with reviewer role, provenance, decisions and unresolved disagreements. |
| `IndexResult` | `MetricObservation` | An aggregate result bound to an index definition and an eligible run; no current PBI result is asserted. |

### Evaluation relationships

| Relation | Domain | Range |
| --- | --- | --- |
| `runProgramme` | `EvaluationRun` | `EvaluationProgramme` |
| `runConfiguration` | `EvaluationRun` | `ModelConfiguration` |
| `runCohort` | `EvaluationRun` | `EvaluationCohort` |
| `hasSourceRepository` | `EvaluationCohort` | `SourceRepository` |
| `runOutput` | `EvaluationRun` | `BusinessBlueprint` |
| `hasMeasurement` | `EvaluationRun` | `MetricResult` |
| `metricDefinition` | `MetricResult` | `MetricDefinition` |
| `reviewedRun` | `ReviewRecord` | `EvaluationRun` |
| `definesIndex` | `EvaluationProgramme` | `IndexDefinition` |
| `indexDefinition` | `IndexResult` | `IndexDefinition` |
| `indexForRun` | `IndexResult` | `EvaluationRun` |

`BlueprintBench` is an `EvaluationProgramme` linked through `definesIndex` to the proposed `PALOBlueprintIndex` definition. No `IndexResult` is asserted. A future result must retain the exact definition and evaluated run alongside its qualification evidence.

OWL domain and range statements describe meaning; they are not runtime validation or qualification gates. Evidence provenance, qualification and index availability are defined separately in the [SKOS taxonomy](../formal/palo-blueprintbench-taxonomy.ttl). The [dictionary](../data/blueprintbench-vocabulary.json) provides the machine-readable cross-reference. Existing historical counts below refer to their original snapshot.


## Tri-Graph update · 29 October 2026

[Explore the connected ontology, taxonomy and dictionary](../PALO_TriGraphGovernance.html#explorer) and [read the additive reference specification](palo-tri-graph-governance.md). The versioned extension links knowledge, decision context and guarded procedures. It is a local reference preview and does not grant execution authority. The earlier catalogue below remains a historical snapshot.

[Taxonomy and dictionaries](palo-agentic-taxonomy-and-dictionaries.md) · [Ontologies and operational grounding](palo-agentic-ontologies.md) · [Searchable technical catalogues](../semantic-catalogues/index.html) · [Complete PDF](../assets/PALO_Agentic_Governance_Semantic_Deep_Dive_EN.pdf)


Technical deep dive for the follow-up discussion with the European Commission

Fabrizio Degni · PALO Framework · Evidence snapshot 12 October 2026

PALO provides a versioned vocabulary for connecting lifecycle governance, delegated authority, controls, evidence and accountable decisions. Its semantic implementation comprises a released foundation, structured agentic contracts and a draft extension for dependencies and policy impact. These layers have different purposes and maturity. The central contribution is the explicit separation of what a system is, what an agent is authorised to attempt, what actually happened, what evidence supports that account and who accepts the resulting decision.

The two sections below explain **taxonomy and controlled dictionaries**, followed by **ontologies and their operational grounding**. The accompanying catalogues expose every schema entry and enumeration in the inspected schema set, together with the actual RDF classes, properties and shapes. They make the analysis inspectable beyond the narrative.

The scope is semantic design and evidence contracts. PALO-AI remains a developer-preview reference runtime. A coherent vocabulary, a valid record or a passing fixture does not establish legal conformity, deployment admission or operating effectiveness in an adopting organisation. The positive meeting response reported by the author is not used as evidence of institutional endorsement.

### Sintesi italiana

PALO dispone di una base semantica concreta: un registro di concetti e relazioni, definizioni versionate del ciclo di vita, schemi per le evidenze e le decisioni, un’ontologia RDF/OWL e vincoli SHACL. La governance agentica aggiunge contratti operativi per identità, autorità delegata, richieste di azione, approvazioni, capacità esecutive, effetti attesi, ricevute, verifica degli esiti, idoneità dei dati e divulgazione delle informazioni.

Il punto da presentare alla Commissione è la continuità tra significato, decisione e prova: una regola di governance è collegata al caso concreto, alla versione applicabile, alle evidenze e all’autorità che decide. Occorre però distinguere ciò che è già rappresentato in OWL da ciò che oggi è formalizzato soprattutto in JSON Schema e nel runtime. L’estensione del grafo dello stack è dichiarata draft e non va presentata come una seconda ontologia già stabilizzata.

Le verifiche su questo snapshot hanno confermato 65 schemi leggibili, 61 fixture JSON con esito atteso, 40 corrispondenze su 40 tra file e digest del manifest, una fixture RDF valida e una invalida correttamente respinta. Sono controlli dei contratti acquisiti, non una nuova qualificazione dell’intero runtime. La riconciliazione aggiunge una corrispondenza esplicita fra le cinque attività storiche e le sei fasi canoniche, distingue i due significati precedentemente associati a CECR e uniforma l’esito di routing a “Redesign required”. Tre ulteriori schemi PolicyWatcher completano il corpus. Le proposte di estensione ontologica restano separate dalle modifiche editoriali effettive.

### Reading the implementation status

| Status used here | Meaning |
| --- | --- |
| Released foundation | Artifact present in the PALO 3.1 semantic release and, where listed, bound by its manifest. |
| Executable reference contract | JSON Schema and associated reference code or fixtures exist; deployment effectiveness requires separate evidence. |
| Draft extension | The artifact explicitly identifies itself as an additive draft or preview. |
| Documented design | A narrative or UI definition exists, without assuming a corresponding OWL class or runtime guarantee. |
| Proposed next step | Analysis in this dossier; it has not amended the canonical PALO model. |
| TBFV | To Be Verified: an assertion requiring additional evidence before stronger use. |

### Verified inventory

| Artifact family | Snapshot result | Interpretation |
| --- | --- | --- |
| Semantic spine 3.1.0 | 46 nodes, 48 links, 8 node types | A framework and navigation graph, not a count of all domain concepts. |
| Lifecycle | 6 phase definitions, 6 gate definitions | Frame, Classify, Assess, Control, Measure, Prove. |
| Control plane | 12 domains, 31 controls, 38 indicators | Tailoring contracts; thresholds and control effectiveness remain contextual. |
| Mapping registry | 409 atomic mappings | 101 conditional and 308 supporting; no current mapping asserts total coverage. |
| Core OWL vocabulary | 27 classes, 18 object properties, 18 datatype properties, 163 triples | Lightweight formal vocabulary. |
| Core SHACL | 12 node shapes, 231 triples | Constraints on selected records and inherited semantic categories. |
| Stack model 0.1.0 | 25 entity types, 31 relationship types | Draft model reusing 7 foundation entity types. |
| Stack RDF and SHACL | 18 declared classes, 25 object properties; 4 shapes | New declarations, not 25 additional classes or 31 additional properties. |
| JSON Schema corpus | 65 schema files; 2,408 schema entries; 204 enum declarations | Entries include objects, branches and definitions; counts are not distinct business concepts. |
| Verification | 61/61 JSON fixture expectations; 40/40 release item digests | Scoped checks described in Section 2.11. |

Sources: [P01], [P02], [P03], [P04], [P05], [P06], [P07], [P08], [P09], [P10], [V01].




### 2.1 Architecture from concepts to action records

PALO’s semantic architecture has four cooperating layers. The semantic spine and lifecycle registries organise framework meaning. The core ontology supplies a vocabulary for definitions, runtime records, immutable records, decisions, evidence, mappings and release identity. JSON Schema supplies richer record contracts, including many agentic objects not declared in the core OWL file. Reference code then evaluates temporal, cryptographic, policy and state-transition conditions that a static ontology alone cannot enforce. [P01], [P07], [P08], [P17], [P24]

The draft stack ontology extends the vocabulary to agents, tools, models, providers, services, policy versions and applicability assessments. Its JSON graph model supplies typed edge rules and operational query context. RDF and JSON contracts must therefore be described together. Saying “PALO has an ontology” is supported; saying “all agentic governance is already represented and enforced by OWL reasoning” is not. [P10], [P30]

### 2.2 The complete core class taxonomy

All 27 classes declared in the core file are listed below. The grouping follows actual subclass relations, with three additional canonical-definition subclasses declared near the end of the file. [P07], [C02]

| Class or family | Declared classes | Intended role |
| --- | --- | --- |
| Root | `SemanticEntity` | Shared semantic category. |
| Canonical definitions | `CanonicalDefinition`; `LifecycleDefinition`, `PhaseDefinition`, `GateDefinition`, `AuthorityClass`, `WorkspaceDefinition`, `RegimeDefinition`, `GovernanceFrameworkDefinition`, `EnforcementAdapterDefinition` | Versioned framework meaning and authority separation. |
| Runtime records | `RuntimeRecord`; `GateInstance`, `EvidenceArtifact`, `ControlImplementation`, `GovernanceCase` | Case-scoped occurrences or operational records. |
| Immutable records | `ImmutableRecord`; `EvidenceClaim`, `EvidenceEvaluation`, `EvidenceBundleManifest`, `EvidenceBundleItem`, `MappingRecord`, `SemanticReleaseManifest`, `SemanticReleaseItem`, `MetricObservation`, `AssessmentRun` | Records whose historical identity should be preserved. |
| Decisions | `DecisionRecord` under `ImmutableRecord`; `GateDecisionRecord` under `DecisionRecord` | Attributable decisions tied to input snapshots. |

This is intentionally a lightweight hierarchy. For example, `EvidenceArtifact` is a subclass of `RuntimeRecord`, not `ImmutableRecord`, even though its documentation emphasises immutable content identity. The description of immutable evidence and the precise OWL inheritance must not be conflated. Likewise, only the three regime/framework/adapter classes have the explicit pairwise disjointness described above; the file does not make every conceptual separation an OWL disjointness axiom. [P07]

### 2.3 Core relationships and cardinalities

The core declares 18 object properties. The complete set is `hasPhaseDefinition`, `hasGateDefinition`, `instantiatesGate`, `gateInstanceCase`, `decisionForGate`, `decisionActor`, `usesArtifact`, `supportsTarget`, `claimScope`, `evaluatesClaim`, `containsBundleItem`, `bundleItemReferences`, `mapsSourceVersion`, `mapsTargetVersion`, `pinnedToReleaseManifest`, `containsReleaseItem`, `releaseItemReferences` and `supersedes`. [P07]

| Relationship | Declared domain and range where present | SHACL or operational qualification |
| --- | --- | --- |
| Lifecycle → phase/gate definitions | LifecycleDefinition → PhaseDefinition/GateDefinition | At least one of each in the generic SHACL shape; the released registry has six. |
| Gate instance → definition and case | GateInstance → GateDefinition/GovernanceCase | Exactly one definition and one case, plus one string `caseId`. |
| Gate decision → gate | GateDecisionRecord → GateInstance | Exactly one gate; actor, authority basis, rationale and input snapshot required. |
| Claim → artifact/target/case | EvidenceClaim → EvidenceArtifact/SemanticEntity/GovernanceCase | Exactly one of each, statement and integrity reference. |
| Evaluation → claim | EvidenceEvaluation → EvidenceClaim | Exactly one claim and one allowed evaluation outcome. |
| Bundle → items/release | EvidenceBundleManifest → EvidenceBundleItem; release link range SemanticReleaseManifest | At least one item and exactly one pinned release. |
| Mapping → source and target versions | MappingRecord → CanonicalDefinition | Exactly one source and one target, coverage, rationale and approval state. |
| Record → superseded record | ImmutableRecord → ImmutableRecord | Directional historical link; storage immutability is a separate concern. |

OWL domain and range declarations support logical inference; they are not equivalent to rejecting malformed records. If a triple uses a property whose domain is `EvidenceClaim`, a reasoner can infer that type. A validation engine must separately check the intended input constraints. This distinction is essential when discussing “enforcement” with ontology specialists. [P07], [W02], [W03]

The core’s 18 datatype properties are `stableId`, `definitionVersion`, `caseId`, `recordedAt`, `appendOnly`, `contentDigest`, `recordDigest`, `inputSnapshotHash`, `authorityBasis`, `rationale`, `claimStatement`, `integrityReference`, `evaluationOutcome`, `coverageType`, `approvalStatus`, `manifestDigest`, `bundleDigest` and `ordinal`. Some other terms used in contexts or shapes are not explicitly declared as datatype properties in the ontology. RDF permits vocabulary use without declaration; it still warrants documentation in a curated export. [P07], [P08], [C02]

### 2.4 What the core SHACL profile actually checks

The 12 shapes cover `SemanticEntity`, `CanonicalDefinition`, `ImmutableRecord`, `LifecycleDefinition`, `GateInstance`, `GateDecisionRecord`, `EvidenceArtifact`, `EvidenceClaim`, `EvidenceEvaluation`, `EvidenceBundleManifest`, `MappingRecord` and `SemanticReleaseManifest`. They use property cardinality, datatype, pattern, class, minimum length, fixed value and enumeration constraints. [P08]

Every targeted semantic entity needs exactly one non-empty `stableId`; every canonical definition one dotted three-part version. An immutable record needs a date-time, a SHA-256-shaped record digest and `appendOnly true`. Digests are checked for lexical format here; a string matching the pattern is not proof that it was computed from the correct payload. The release verifier’s byte-hash comparison is a distinct check. [P08], [P28]

Superclass shapes matter. In the supplementary test, a `GateDefinition` with no stable ID or version produces two violations when the ontology is supplied, even without enabling an additional inference regime. A consumer that omits the class hierarchy or uses a validator with different target handling can obtain weaker results. Validation configuration belongs in the exchange profile. [V01], [W03]

The profile does not declare every node closed, does not provide a bespoke shape for every class and does not enforce all operational invariants. For example, naming something `ImmutableRecord` or requiring `appendOnly true` cannot stop a database administrator rewriting history. Schema and shape checks need persistence controls, version governance and audit procedures to realise that intention. [P07], [P08]

The published JavaScript semantic validator uses N3 parsing and an in-repository implementation of the constraint subset used by the profile. It checks required class presence, namespace agreement, the invariant registry and valid/invalid fixtures. It is not evidence of conformance to the complete SHACL specification. This review adds independent pySHACL checks of the existing fixture pair, with the ontology supplied, no remote imports and meta-SHACL enabled. Those checks strengthen evidence for these fixtures, not for all possible graphs or the whole runtime. [P31], [V01]

### 2.5 Definition, case, evidence and decision as different objects

The distinction between `GateDefinition`, `GateInstance` and `GateDecisionRecord` separates three questions: what the gate means; how it is instantiated for this case; and which decision was made against which evidence at a particular time. Changing a definition should not retroactively rewrite earlier case decisions. A later decision can supersede a prior one while preserving both. [P03], [P07], [P14]

Similarly, the evidence chain is **artifact → claim → evaluation → decision**, not “file uploaded → approved”. A security-test report can support a claim that one connector rejected a particular unauthorised operation. Its scope is that connector, test, version, method and case. It does not automatically support a claim that all connectors are non-bypassable, nor that the deployment is legally compliant. [P22], [P23], [P27]

A Semantic Release Manifest binds the exact definition and schema bytes supporting the exchange. A bundle manifest pins the release and constituent records. This makes reconstruction possible: a reviewer can identify the vocabulary and record contracts that applied when a decision was produced. The manifest does not contain the truth of the world; it establishes the identity of the files being used. [P28]

### 2.6 The draft stack ontology and the 31 typed relations

The stack model reuses seven core classes: `GovernanceCase`, `ControlImplementation`, `EvidenceArtifact`, `EvidenceClaim`, `EvidenceEvaluation`, `GateInstance` and `GateDecisionRecord`. It declares 18 additional classes: `Layer`, `Capability`, `GovernancePlane`, `ComponentVersion`, `AISystemVersion`, `Agent`, `ModelVersion`, `Tool`, `DataAsset`, `Provider`, `Service`, `PublicPolicy`, `PolicyVersion`, `ChangeSignal`, `ApplicabilityAssessment`, `RequirementVersion`, `ControlDefinition` and `Actor`. Together these form the model’s 25 entity types. [P10], [P30]

| Relationship family | Exact graph relationship types | Question supported |
| --- | --- | --- |
| Architectural capability | `PROVIDES_CAPABILITY`, `BELONGS_TO_LAYER`, `GOVERNS_LAYER`, `INFORMS` | Which components and governance planes provide or govern capabilities? |
| Provider and technical dependency | `OFFERS`, `USES_SERVICE`, `DEPENDS_ON`, `USES_MODEL`, `CALLS_TOOL`, `READS` | Which systems depend on a changed service, model, tool or data asset? |
| Public-policy versioning | `HAS_VERSION`, `FROM_VERSION`, `TO_VERSION`, `AFFECTS_SERVICE` | Which two policy versions are compared and which service mapping is accepted? |
| Case and applicability | `GOVERNS_VERSION`, `ASSESSES_SIGNAL`, `ASSESSES_SYSTEM`, `IN_CASE`, `CONSIDERS_REQUIREMENT`, `REVIEWED_BY` | Which case, system, requirement and reviewer contextualise the change? |
| Control implementation | `IMPLEMENTS`, `ADDRESSES_REQUIREMENT`, `APPLIES_TO_SYSTEM` | Which deployed implementation addresses which control/requirement for which system? |
| Evidence | `USES_ARTIFACT`, `SUPPORTS_TARGET`, `EVALUATES_CLAIM` | What assertion and evaluation support the review? |
| Gate and decision history | `REVIEWS_SYSTEM`, `DECISION_FOR_GATE`, `DECIDED_BY`, `BASED_ON_ASSESSMENT`, `SUPERSEDES` | What decision was made, by whom, on what assessment, replacing which earlier decision? |

The JSON model constrains source and target types for each edge. The RDF extension declares 25 new object properties and reuses six from the core. Its new property declarations principally contain explanatory comments; they do not reproduce all JSON endpoint rules as OWL domain/range axioms. Therefore “31 typed relations” describes the graph model, not 31 fully axiomatized new OWL properties. [P10], [P30], [C02]

The architecture view has layers L0 infrastructure/deployment, L1 evaluation/observability, L2 models/inference, L3 orchestration/tools, L4 knowledge/storage, L5 representation/retrieval, L6 acquisition/provenance, L7 context/memory and L8 runtime security/controls, plus applications and human interaction. This is a capability map, not a compulsory sequential execution pipeline. Governance and evaluation cross layers; components and capabilities can participate in more than one layer. [P10]

The four stack shapes cover policy version, change signal, applicability assessment and requirement. Requirement kind is `law`, `standard`, `internal-rule` or `contractual-term`. `PublicPolicy` and `RequirementVersion` are explicitly disjoint: a provider statement and a legally or organisationally applicable requirement are different objects. The applicability assessment connects the signal to the specific system and case, with rationale and purpose. [P30]

### 2.7 Time, knowledge and policy-impact queries

The graph distinguishes **valid time**, the period for which an assertion applies, from **recorded time**, when it became known. `validFrom` and optional `validTo` use a half-open interval. Query parameters `asOf` and `knownAt` allow a reviewer to ask both “what applied then?” and “what could have been known then?”. Historical analysis should not import later evidence without making that change visible. [P10]

The impact query starts from accepted current service mappings and follows reverse dependencies through `DEPENDS_ON`, `USES_SERVICE`, `USES_MODEL`, `CALLS_TOOL` and `READS`. It returns witness paths and relevant cases, controls, gates, decisions and evidence. Provisional mappings are excluded from accepted traversal and reported as incomplete coverage. A missing path does not prove that a system is unaffected. [P10]

The statuses `review-required`, `unmapped`, `source-versions-unavailable`, `signal-unavailable-at-query-time`, `baseline-established` and `no-mapped-system-in-scope` describe different epistemic conditions. None is a legal approval or a guarantee of no impact. The documented query profile limits graph size and traversal depth; a depth-limit warning is evidence of incomplete traversal, not a safe result. [P10]

This graph query must also be distinguished from the reference runtime’s **continuous-assurance signal**. The latter can invalidate purpose-bound Data Fitness Decisions and revoke unconsumed capabilities for the matching tenant/subject. The public-policy impact query itself does not automatically rewrite controls, reopen gates or revoke capabilities. These are separate mechanisms and authority paths. [P10], [P21]

### 2.8 Where agentic semantics are operational today

The core OWL vocabulary does not declare `ActionClaim`, `ExecutionCapability`, `EffectContract`, `ExecutionReceipt`, `OutcomeAttestation`, `DataFitnessDecision`, `DisclosureContract` or `SwarmMandate` as classes. These are nevertheless substantial PALO semantic contracts: their meanings are operationalised through JSON schemas, exact bindings and reference runtime code. Treating absence from OWL as absence from the project would be as inaccurate as claiming complete RDF coverage. [P07], [P17], [P20], [P21], [P24]

An Effect Contract groups predicates as preconditions, expected effects and forbidden effects. The schema’s operator set includes `exists`, `notExists`, `equals`, `unchanged`, `changedTo`, `deltaWithin`, `numberWithin`, `containsAll` and `typeIs`, with version-specific legacy restrictions. Resource selectors bind the target and can bind tenant context. Verification specifies timing and inconclusive handling; recovery specifies hold/review or a proposed compensating action. [P20]

At the action boundary, the inspected code checks schema semantics, identity and tenant consistency, policy, current data governance, claim digests and approval binding. Capabilities tie together the exact claim, decision, executor, verifier and target. Receipts and attestations preserve separate execution and verification outcomes. These checks support reference demonstrations; they do not establish that external connectors cannot be bypassed in an arbitrary deployed architecture. [P12], [P21], [P24]

Several action-assurance contracts use the reference HMAC-SHA256 mechanism; the runtime also contains a separate Ed25519 evidence-envelope path. These mechanisms must not be described as interchangeable. A valid HMAC establishes integrity/authenticity relative to possession of the shared secret; it does not provide public-key non-repudiation between mutually untrusted parties. Neither a signature nor an unkeyed digest proves that an input observation was truthful. Key custody, observer trust, external anchoring and independent validation require explicit deployment evidence. [P15], [P21], [P24]

### 2.9 Worked example connecting taxonomy, ontology and execution

Consider a **synthetic** refund agent for a support case. A human owner authorises refunds within a defined resource, tenant, per-action limit and shared budget. This example illustrates the contracts and makes no claim about an actual financial deployment. [P12], [P19]

1. **Frame and classify.** Record the business purpose, affected customer, accountable owner and whether an agent is necessary. Classify the action as financially consequential; classify autonomy separately. A simulator tier informs scrutiny but does not authorise the refund.
2. **Define authority.** Register the agent profile and delegated scopes. If several agents share exposure, bind them to the same mandate and budget. A permission for each agent must not multiply the total approved budget.
3. **Establish data fitness.** Identify the order/customer-data subject, purpose and current evidence. A fitness decision for another tenant or purpose cannot be reused.
4. **Bound disclosure.** Permit only the needed fields and destinations. A refund may succeed while still violating the disclosure contract, so the two outcomes remain separately observable.
5. **Construct the Action Claim.** Bind tool, operation, arguments, target, nonce, sequence, idempotency key, expiry, authority context and effect/data contracts. The proposed amount is part of the content being authorised.
6. **Evaluate and approve.** Evaluate current policy and obtain an exact-claim approval when required. Editing the amount or beneficiary after approval changes the claim and requires a new evaluation/approval path.
7. **Issue and consume the capability.** Bind executor and verifier, reserve exposure and execute through the governed connector. A lost response must not by itself justify an ungoverned duplicate refund.
8. **Record execution and observe effect.** Preserve receipt digests; obtain the authoritative post-state needed to evaluate the contract. A transport success is not enough.
9. **Evaluate outcome and disclosure.** Expected predicates might include the intended refund amount and account change; forbidden predicates might include an unintended beneficiary or disallowed data transmission. Missing observation remains inconclusive.
10. **Build the evidence chain.** An artifact contains the bounded execution evidence; a claim states exactly what it supports; an evaluation judges it; a gate decision records accountable acceptance, conditions or hold. Pin the semantic release and preserve later supersession.

| Adverse variant | Required semantic distinction | Evidence the reviewer should request |
| --- | --- | --- |
| Data permission withdrawn after initial approval | Historical permission versus current fitness/capability validity | Signal, invalidation time, revocation and attempted execution record. |
| Budget available to two agents but insufficient for a third | Individual permit versus aggregate exposure | Reservation/commit history and proof the denied connector did not run. |
| Refund API reports success but ledger cannot be read | Execution succeeded versus outcome inconclusive | Receipt, failed/missing observation and held incident. |
| Wrong field disclosed while refund effect is correct | Business effect versus disclosure conformity | Disclosure observation, mismatch checks and response record. |
| Coordinator revoked while an action is in flight | Future authority revoked versus confirmed external cancellation | Lease/cancellation acknowledgement and eventual effect observation. |
| New evidence contradicts the previous evaluation | Original decision versus superseding decision | Both records, input hashes, rationale and time/knowledge context. |

### 2.10 Competency questions and interoperability

An ontology’s usefulness can be assessed through **competency questions**: specific questions its representation should answer with evidence. The following questions distinguish existing representation from additional work.

| Question | Existing support | Remaining boundary |
| --- | --- | --- |
| Which definition/version governed this gate? | Gate Instance, lifecycle definition and release manifest | Consumer must resolve the pinned artifacts. |
| Which artifact supports this claim and how was it evaluated? | Artifact/claim/evaluation relations and schemas | Truth, method quality and independence require review. |
| Who decided and what inputs were considered? | Gate Decision Record actor, authority basis, rationale and snapshot hash | Strings do not independently authenticate authority. |
| Which systems depend on a changed provider service? | Draft graph, accepted mappings and witness-path query | Inventory/mapping completeness and currentness. |
| Was a proposed action approved exactly as executed? | Claim digest, approval, capability and receipt contracts | End-to-end connector evidence and deployment controls. |
| Was authority still current at execution? | Runtime revalidation, expiries and revocation mechanisms | Race conditions and distributed boundary qualification. |
| Which data could leave and which did leave? | Disclosure contract, observation and receipt | Trustworthiness and completeness of the observer. |
| What was known at an earlier decision time? | Valid/recorded time and snapshot query | Availability of complete historical snapshots. |
| Can another organisation reconstruct the same graph and validation result? | Public vocabulary and schemas | Complete JSON-to-RDF mapping and conformance profile remain to be established. |
| Can every agentic contract be queried in RDF? | Partial vocabulary and rich JSON contracts | A complete agentic RDF module and conversion are proposed work. |

Interoperability should preserve semantic boundaries rather than maximise the number of vocabulary links. The following are candidate alignment directions; no implemented PALO mapping is asserted solely from conceptual similarity.

| Vocabulary | Useful alignment target | Required care |
| --- | --- | --- |
| SKOS | Concept schemes, preferred/alternative labels, broader/narrower relations, mapping annotations | Distinguish related or close meanings from exact equivalence; preserve local scope. |
| PROV-O | Entities, activities, agents and derivation/association of evidence | A business “agent” and `prov:Agent` do not establish authorised delegation by themselves. |
| ODRL | Permissions, prohibitions, duties, parties and constraints | PALO action approval and effect verification need explicit operational semantics beyond a policy description. |
| DPV | Data processing purposes, personal-data concepts, actors, risks and measures | Preserve jurisdiction, evidence and reviewer decisions; vocabulary reuse does not establish a lawful basis. |
| DCAT | External datasets, distributions, data services and catalog metadata | PALO’s evidence reference and AI-system inventory need not become a duplicate data catalog. |
| JSON-LD | Stable IRIs and typed links for exchange | A context alone is not a complete serializer for an arbitrary graph envelope. |
| OWL and SHACL | Conceptual axioms and record validation | Keep inference, validation, authorisation and effect observation separate. |

Primary specifications: [W01], [W02], [W03], [W04], [W05], [W06], [W07], [W08]. These alignments require term-by-term mappings, counterexamples, directionality, versions, scope and round-trip tests. In particular, avoid blanket `owl:equivalentClass`, `owl:sameAs` or `skos:exactMatch` assertions for concepts whose authority, time or case scope differs.

### 2.11 Reproducible verification and what it establishes

The source snapshot combines resident working-tree files, identified Git objects where accessible and exact public artifacts recovered for cloud-only files. Provenance and SHA-256 values are retained in the research manifests. The 40 core release items all match the inspected semantic manifest, establishing integrity of the selected foundation snapshot. Other working-tree and draft-extension material has separate version history; a matching digest does not prove current deployment or current source review. [V01]

The reproducible review script parsed all four Turtle files, enumerated classes/properties/shapes, checked 65 JSON schemas structurally, extracted 2,408 schema entries and 204 enum declarations, and validated 61 named valid/invalid JSON fixtures against their matched contracts with format checking enabled. All 61 produced the expected valid/invalid classification. This is not a claim that every schema has a complete negative-test suite. [V01]

The independent RDF run used the supplied core ontology and shapes: the valid fixture conformed; the deliberately invalid fixture produced 10 SHACL results. An incomplete GateDefinition probe was rejected for missing stable identity and version. Meta-SHACL validation was enabled. The stack vocabulary and shapes were parsed and inventoried; no stack-instance SHACL conformance suite was run in this review. [V01]

The 14 named invariants provide a useful control map: stable identity; canonical versions; preservation of released definitions; definition/instance separation; gate definition/case binding; attributable immutable decisions; atomic claim scope; separate evaluation; manifest-based bundles; version-specific mappings; release pinning; distinct delivery/authority classifications; no creation of legal or deployment authority by framework guidance; and accountable review of non-authoritative signals. Their stated enforcement mechanisms range from schemas and generators to documentation and module contracts. They must not be presented as 14 universally machine-proven properties. [P32]

### 2.12 Gaps, ambiguity and a bounded next extension

| Finding | Current interpretation | Recommended disposition |
| --- | --- | --- |
| Five historical activities and six canonical phases | Editorial correspondence 1.0 is now explicit | Retain six-phase canonical IDs; treat the teaching correspondence as many-to-many. |
| CECR acronym previously had two meanings | Separate editorial concept IDs and simulator wording now distinguish them | Define a numerical protocol for control effectiveness and coverage before operational use. |
| Routing and legal prohibition | Both UI views now use “Redesign required”; old display alias is deprecated | Preserve independent legal classification. |
| Agentic objects primarily in JSON | Operational contracts are richer than the OWL vocabulary | Add a focused agentic ontology module tied to existing contract IDs. |
| JSON-LD contexts do not fully map all envelopes/fields | Vocabulary portability is partial | Define explicit transforms and round-trip loss tests. |
| Some classes have no dedicated shape; some terms lack declarations | Lightweight profile, not exhaustive closed validation | Publish shape coverage and intended open/closed boundaries. |
| 14 invariants mix automated and procedural controls | A registry entry does not prove enforcement | Attach each invariant to code/tests/operational evidence and residual limits. |
| Signatures and append-only flags have limited scope | Integrity and storage assertions are not truth or independent assurance | Add deployment-specific key, observer, persistence and audit evidence. |
| Bilingual labels and synonym governance are distributed | No unified reviewed dictionary release | Curate a bilingual concept registry and acronym policy. |
| Draft-source oversight/bias mappings have a separate lifecycle | Research alignment is not adopted-standard conformity | Preserve exact source edition, interpretation, reviewer and revision status. |

The smallest useful next semantic release would cover one complete chain: **Agent → delegated mandate/authority → Action Claim → policy decision → optional approval → execution capability → execution → receipt → outcome attestation → evidence claim/evaluation → gate decision**. Data-fitness and disclosure links should be included because Action Claim 1.4 already depends on them. It should reuse existing identifiers and contracts instead of renaming the runtime around a new ontology. This is a proposed extension, not an implementation delivered by this dossier.

A bounded acceptance package would include: a bilingual concept register; explicit proposed OWL classes and properties; JSON-to-RDF transformations; SHACL coverage tied to schemas; positive and negative synthetic examples; competency queries; temporal/revocation/case/tenant counterexamples; lossless round-trip checks for the agreed profile; and an immutable release manifest. Test missing observations, expired approvals, changed arguments, stale fitness, conflicting evidence, shared budgets and a revocation during execution. Keep broader legal applicability and production admission outside the semantic pass/fail criterion.

The useful question for the Commission is therefore concrete: **which minimal vocabulary and evidence-exchange profile would allow independent parties to reconstruct and challenge a delegated-action decision consistently?** PALO already supplies a substantial foundation for that exercise. The next step is to agree the bounded profile, evidence and acceptance criteria, then demonstrate interchange and failure behaviour against it.

### 2.13 Additional insights from GLM and their evidence review

A GLM-5.3-Flash consultation on 12 October 2026 challenged the public artifact summary. Its response is an analytical contribution based on that supplied summary, not an independent audit of the repository. The following insights were retained after comparison with PALO artifacts and primary specifications.

**Authority of statements and authority to act are separate.** The four spine classes describe the status of framework information; an agent's authority depends on its principal, profile, delegation, policy and exact action context. A unified dictionary should give these axes different property names and scope notes. It should not infer an execution permit from a canonical-definition label.

**Verification obligations deserve explicit closure.** GLM proposed tracking executions whose required attestation has not arrived by a declared deadline. PALO already implements verification tasks, expiry windows, retries and `input_required` states; these mechanisms must be recognised before calling the capability missing. A useful extension is a documented completeness query and metric: executions requiring verification with neither a recorded attestation nor an explicitly assigned unresolved incident by the agreed deadline. This proposed measure needs a defined clock, denominator, exclusions, retry semantics and recovery protocol. An inconclusive attestation closes the obligation to record an assessment but does not resolve the underlying business uncertainty. [P24]

**Evidence disagreement should remain visible.** A future conflict record could identify the claims/evaluations in conflict, their scope and time, resolution authority and decision. This should complement the existing conservative data-fitness evaluator, not replace it with a rule that always prefers newer or signed evidence. Integrity, independence, relevance and truth are separate dimensions. PALO's current Evidence Evaluation already keeps four quality dimensions separate. [P21], [P23]

**Cross-format integrity requires an explicit algorithm profile.** The inspected core runtime recursively sorts JSON object keys for one canonicalisation function; arrays retain order. The separate evidence-envelope version 2 explicitly declares `RFC8785`, and `assurance-foundation.js` implements a JCS-labelled canonicaliser with finite-number and Unicode-surrogate checks for Ed25519 signing/verification. The release manifest instead hashes exact file bytes. These procedures have different scopes. Independent RFC conformance is not established by this review, and no RDF Dataset Canonicalization claim follows from deterministic JSON output. An exchange profile should name the precise path and test vectors, including number handling, Unicode and graph serialisation. [P24], [P28], [P33]

Several GLM suggestions were deliberately not adopted as facts: a linear ladder that places cryptographic anchoring above independent evaluation; an assumption that all 409 mappings are direct regulatory crosswalks; identity binding or temporal handling described as wholly absent; and categorical claims that SHACL cannot express policy-relevant constraints. The precise boundary is that validation constraints can support a policy process, while a shape evaluation alone does not grant operational authority or enforce external effects. GLM's older DPV/DCAT references were replaced with the primary publications checked for this dossier. [P09], [P17], [P24], [W03], [W06], [W07]

### 2.14 Publication provenance and maintenance

The semantic model, the editorial dossier, the runtime source and a hosted website are different release surfaces. This dossier retains the exact source inventory and verification results; the website exposes a separate publication inventory for the two detailed sections, technical catalogue, glossary and PDF. Updating the editorial material does not raise the maturity of the runtime or the draft stack ontology.

The source-registry reconciliation marks overdue entries `review-due` while retaining their original `checkedAt` and `nextReviewAt`. Six entries required substantive review at the original snapshot time. The subsequent [six-source review addendum](source-review-2026-10-12.md) records their review and current deadlines; the earlier snapshot and its tests remain historically attributable. The semantic release manifest and Knowledge Reader manifest are updated together so that the metadata transition cannot silently break their integrity pins. This is a review-status transition, not a new validation of the referenced regulations or standards.

The publication process records source identity, artifact hashes, target and verification time. GitHub Pages and the separately hosted canonical domain require distinct deployment evidence. A sitemap date comes from the editorial modification record, while component release dates and source verification dates retain their own meaning. A `noindex` briefing page is deliberately excluded from the search sitemap; that does not exempt its content from release tracking. [P36]


## Sources and accompanying catalogues


PALO artifact links resolve to public source locations where available. The research snapshot and validation records preserve the inspected bytes. Linked living pages may subsequently change.

- [P01] [PALO semantic foundation](https://paloframework.org/docs/palo-v3-semantic-foundation.md).
- [H01] Fabrizio Degni, *The PALO Framework A Paradigm for Principled AI Lifecycle Orchestration in Business*, December 2025, 67-page local founding document under `framework/`. Core principles: pp. 13–15; five-phase lifecycle: pp. 18–22; evaluation dimensions: pp. 22–23. Page numbers refer to the PDF page sequence. Extract retained in the research record.
- [P02] [Semantic spine](https://paloframework.org/data/semantic-spine.json).
- [P03] [Lifecycle definitions](https://paloframework.org/data/lifecycle-core.json).
- [P04] [Governance control packs](https://paloframework.org/data/governance-control-packs.json).
- [P05] [Control library](https://paloframework.org/data/control-library.json).
- [P06] [KPI and KRI registry](https://paloframework.org/data/kpi-kri-registry.json).
- [P07] [Core ontology](https://paloframework.org/formal/palo-ontology-v3.ttl).
- [P08] [Core SHACL profile](https://paloframework.org/formal/palo-ontology-v3.shacl.ttl).
- [P09] [Semantic mappings](https://paloframework.org/data/semantic-mappings.json).
- [P10] [Stack and policy impact graph](https://paloframework.org/docs/palo-stack-policywatcher-graph.md) and [stack model](https://paloframework.org/data/stack-governance-model.json).
- [P11] [PALO-AM operational model](https://paloframework.org/PALO_AgenticGovernance.html).
- [P12] [Full-cycle assurance](https://paloframework.org/docs/palo-ai-full-cycle-assurance.md).
- [P13] [Agentic capability matrix](https://paloframework.org/agentic/capability-matrix.json).
- [P14] [Gate Decision Record schema](https://paloframework.org/schemas/palo-gate-decision-record.schema.json).
- [P15] [Agent Profile schema](https://paloframework.org/schemas/palo-agentic-interface.schema.json).
- [P16] [PALO-AM simulator source](https://paloframework.org/assets/palo-am-simulator.js).
- [P17] [Action Claim schema](https://paloframework.org/schemas/palo-agentic-action-claim.schema.json).
- [P18] [ANS integration](https://paloframework.org/docs/palo-ai-ans-integration.md).
- [P19] [Swarm prototype](https://paloframework.org/docs/palo-swarm-governance-local-prototype.md), [distributed extension](https://paloframework.org/docs/palo-swarm-distributed-execution.md) and [mandate schema](https://paloframework.org/schemas/palo-swarm-mandate.schema.json).
- [P20] [Effect Contract](https://paloframework.org/schemas/palo-agentic-effect-contract.schema.json), [Execution Capability](https://paloframework.org/schemas/palo-agentic-execution-capability.schema.json), [Execution Receipt](https://paloframework.org/schemas/palo-agentic-execution-receipt.schema.json), [Outcome Attestation](https://paloframework.org/schemas/palo-agentic-outcome-attestation.schema.json), [Policy Decision](https://paloframework.org/schemas/palo-agentic-policy-decision.schema.json), [Approval](https://paloframework.org/schemas/palo-agentic-approval.schema.json).
- [P21] [Data assurance control plane](https://paloframework.org/docs/palo-data-assurance-control-plane.md).
- [P22] [Evidence Claim schema](https://paloframework.org/schemas/palo-evidence-claim.schema.json).
- [P23] [Evidence Evaluation schema](https://paloframework.org/schemas/palo-evidence-evaluation.schema.json).
- [P24] Inspected local source `packages/palo-mcp-server/core.js`, preserved with digest in the research snapshot; public project [PALOframework](https://github.com/sev7enITA/PALOframework). Local working-tree code is not assumed to equal the published Git HEAD.
- [P25] [Disclosure Contract](https://paloframework.org/schemas/palo-data-disclosure-contract.schema.json), [Disclosure Observation](https://paloframework.org/schemas/palo-data-disclosure-observation.schema.json), [Disclosure Receipt](https://paloframework.org/schemas/palo-data-disclosure-receipt.schema.json), [Data Fitness Decision](https://paloframework.org/schemas/palo-data-fitness-decision.schema.json).
- [P26] [Oversight crosswalk](https://paloframework.org/briefing/presentation/future-ready/oversight-crosswalk.json) and [bias crosswalk](https://paloframework.org/briefing/presentation/future-ready/bias-crosswalk.json).
- [P27] [Evidence Artifact](https://paloframework.org/schemas/palo-evidence-artifact.schema.json) and [Evidence Bundle Manifest](https://paloframework.org/schemas/palo-evidence-bundle-manifest.schema.json).
- [P28] [Semantic Release Manifest](https://paloframework.org/data/semantic-release-manifest.json) and [pinned public release generator](https://github.com/sev7enITA/PALOframework/blob/42d17508ddc836ae37076d9320cbbc672ea268cc/scripts/generate-semantic-release.mjs).
- [P29] [Semantic change-impact register](https://paloframework.org/data/semantic-change-impact-v3.json).
- [P30] [Stack ontology](https://paloframework.org/formal/palo-stack-governance.ttl), [stack SHACL](https://paloframework.org/formal/palo-stack-governance.shacl.ttl), [stack JSON-LD context](https://paloframework.org/data/palo-stack-context.jsonld) and [core JSON-LD context](https://paloframework.org/data/palo-semantic-context.jsonld).
- [P31] [Pinned public semantic validator](https://github.com/sev7enITA/PALOframework/blob/42d17508ddc836ae37076d9320cbbc672ea268cc/scripts/validate-semantic.mjs).
- [P32] [Semantic invariants](https://paloframework.org/data/semantic-invariants.json).
- [P33] [Evidence-envelope schema](https://paloframework.org/schemas/palo-agentic-evidence-envelope.schema.json) and [pinned assurance foundation implementation](https://github.com/sev7enITA/PALOframework/blob/42d17508ddc836ae37076d9320cbbc672ea268cc/packages/palo-mcp-server/assurance-foundation.js).
- [P34] [PolicyWatcher Signal Batch](https://paloframework.org/schemas/policywatcher-signal-batch.schema.json), [Operational Signal Registry](https://paloframework.org/schemas/palo-policywatcher-signal-registry.schema.json) and [Browser-local Review Ledger](https://paloframework.org/schemas/palo-policywatcher-review-ledger.schema.json). Acquired from Git commit `42d17508ddc836ae37076d9320cbbc672ea268cc`.
- [P35] [Agentic editorial glossary and historical lifecycle correspondence](https://paloframework.org/data/agentic-semantic-glossary.json), version 1.0.0. Separate from the canonical ontology and KPI/KRI registry.
- [P36] [Semantic publication inventory](https://paloframework.org/data/semantic-publication-2026-10-12.json). This records the editorial release; deployment evidence is a separate receipt.
- [W01] [W3C SKOS vocabulary](https://www.w3.org/2009/08/skos-reference/skos.html).
- [W02] [W3C OWL 2 Primer](https://www.w3.org/TR/owl2-primer/).
- [W03] [W3C SHACL Recommendation](https://www.w3.org/TR/shacl/).
- [W04] [W3C PROV-O](https://www.w3.org/TR/prov-o/).
- [W05] [W3C ODRL Information Model](https://www.w3.org/TR/odrl-model/).
- [W06] [Data Privacy Vocabulary](https://w3id.org/dpv/). DPV 2.3 identifies itself as a Final Community Group Report and explicitly states that it is not a W3C Standard or on the W3C Standards Track.
- [W07] [W3C DCAT 3](https://www.w3.org/TR/vocab-dcat-3/).
- [W08] [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/).
- [C01] [Schema index](../semantic-catalogues/schema-index.json), [field dictionary JSON](../semantic-catalogues/field-dictionary.json), [field dictionary CSV](../semantic-catalogues/field-dictionary.csv) and [controlled values](../semantic-catalogues/controlled-vocabularies.json).
- [C02] [RDF inventory](../semantic-catalogues/rdf-inventory.json) and [searchable catalogue](../semantic-catalogues/index.html).
- [V01] [Snapshot verification results](../semantic-catalogues/validation-results.json) and [source inventory](../semantic-catalogues/source-inventory.json). The reproducible audit script and complete acquired source snapshot are retained in the local review package. Verification date: 12 October 2026.
