# PALO taxonomy and controlled dictionaries for agentic governance

## BlueprintBench taxonomy and dictionary · 11 November 2026

PALO BlueprintBench is the evaluation programme. PALO Blueprint Index (PBI) is its proposed aggregate index. Document Workbench is an application evaluated by the programme. These are separate concepts and are not additional PALO governance modules.

| Term | Definition |
| --- | --- |
| Evaluation programme | Protocol, tasks, governance and publication rules. |
| Model configuration | Model revision, provider/runtime, quantisation, reasoning, context and pipeline settings. |
| Evaluation cohort | Declared source families, tasks, split and revision. |
| Evaluation run | Recorded execution including failures, retries and resource conditions. |
| Metric result | Observation with scope, unit, denominator and missing-value rule. |
| PALO Blueprint Index | Proposed aggregate specification; formula and weights remain to be defined and validated. |

### Evaluation dimensions

| Dimension | Scope |
| --- | --- |
| Document fidelity | Faithfulness of extracted text, tables, formulas and layout to source documents. |
| Semantic faithfulness | Preservation of meaning, ownership, negation, conditions and obligations. |
| Coverage and uncertainty | Coverage of required facts and appropriate abstention where evidence is insufficient. |
| ER, dictionary and ontology | Correct entities, attributes, definitions, types and relationships. |
| Process fidelity | Preservation of actors, branches, permissions and exceptions. |
| Governance controls | Review states, permitted actions and evidence of boundary enforcement. |
| Reliability | Completion, failures, recovery and repeatability under declared conditions. |
| Human effort and FinOps | Review and correction effort, resource use, charges and cost coverage. |

### Evidence classification

Evidence provenance uses `self-reported`, `maintainer-reproduced` and `independently-reproduced`. Qualification uses `development`, `pending-review` and `qualified`. Index availability uses `unavailable` and `available`. These axes remain separate from call completion, transport errors and blueprint review state. A missing value is not zero, and independent reproduction alone does not establish qualification.

The current explorer contains development diagnostics. PBI has no assigned score. The [versioned dictionary](../data/blueprintbench-vocabulary.json) and [SKOS taxonomy](../formal/palo-blueprintbench-taxonomy.ttl) define this additive vocabulary. See the [model comparison](../PALO_BlueprintBench.html#explorer) and [index proposal](../downloads/blueprintbench/palo-blueprint-index.md).


## Tri-Graph update · 29 October 2026

[Explore the connected ontology, taxonomy and dictionary](../PALO_TriGraphGovernance.html#explorer) and [read the additive reference specification](palo-tri-graph-governance.md). The versioned extension links knowledge, decision context and guarded procedures. It is a local reference preview and does not grant execution authority. The earlier catalogue below remains a historical snapshot.

Subsequent source maintenance: the [six-source review of 12 October 2026](source-review-2026-10-12.md) updates the live source registry and clarifies two control packs. The catalogue and PDF remain the inspected earlier snapshot.

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




### 1.1 What PALO classifies and why

For this deep dive, **taxonomy** means the organised classification of governance concepts; a **controlled dictionary** specifies the permitted terms, identifiers, values and intended meanings; an **ontology** states formal classes and relationships; a **schema** constrains a record’s structure; and an **executable policy** evaluates an action against current rules and inputs. These are complementary mechanisms. An `allowed` value has a defined lexical meaning, but only a valid decision process can give that value authority for a particular action.

PALO’s taxonomy is best described as a set of connected facets. The lifecycle answers when governance work occurs. The agentic modality asks who acts, under whose authority, on which resources and with what autonomy. The evidence model asks which assertion is being made, what supports it and how it was evaluated. The stack extension adds technical dependency and policy-change context. No single tree captures all these dimensions without collapsing material distinctions. [P01], [P02], [P10], [P11]

The present implementation distributes its dictionaries across JSON registries, JSON Schema enumerations, RDF terms, JSON-LD contexts, source records and UI labels. It does not contain a single reviewed SKOS concept scheme unifying all these terms. A SKOS export is therefore an interoperability proposal, not a description of an existing PALO deliverable. [P01], [P07], [P08], [W01]

### 1.2 Framework layers and their authority

The December 2025 founding document supplies the conceptual roots: fairness/non-discrimination; transparency/explainability; accountability/responsibility; privacy/data governance; safety/robustness; human agency/oversight; and societal/environmental well-being. It evaluates use cases across ethical integrity, technical robustness/safety, business value/feasibility, legal/regulatory conformity and socio-environmental impact. These are normative evaluation dimensions and objectives, not assertions that a system has achieved them. The later semantic spine and agentic contracts turn parts of this conceptual structure into versioned identifiers and evidence requirements. [H01]

| Layer | Governance subject | Concrete representation | Boundary |
| --- | --- | --- | --- |
| PALO | Lifecycle, ownership, assessment, controls, measurement and proof | Spine, gates, control packs, evidence schemas | Framework definitions do not authorise a deployment. |
| PALO-AM | Delegated action and human agency | Five operational object cards, authority/action-space matrix, simulator | A routing model is not a legal risk classification. |
| PALO-AI | Selected checks at the action boundary | Profiles, Action Claims, policy evaluation, approval, capabilities and receipts | Developer preview; deployment admission remains separate. |
| Stack governance extension | Dependencies from providers and services to systems, controls and cases | Typed dependency graph, RDF vocabulary and impact query | Draft extension; graph impact produces review work. |
| PolicyWatcher input | Observed changes in external public policies | Source-bound signals and applicability review | A change signal cannot independently decide applicability. |

This distinction is part of the semantic design, not just product naming. The core ontology explicitly separates `RegimeDefinition`, `GovernanceFrameworkDefinition` and `EnforcementAdapterDefinition`, with pairwise disjointness axioms. However, declaring classes does not automatically classify every UI label or component as an instance of them. [P07], [P10], [P11], [P12]

The spine has four evidence/authority classes: `canonical-definition`, `source-backed-context`, `illustrative-local-preview` and `human-review-required`. The first is authoritative **as a PALO definition**. None of the four, merely by classification, grants legal authority or changes the state of a case. The `authoritative: true` flag on canonical definitions must always be read within this scope. [P01], [P02]

The public semantic catalog, case workspace and assurance review are three workspaces. “Executive” and “Technical” are presentation lenses, not authenticated identities or access-control roles. Delivery maturity is another axis: the capability matrix distinguishes `specified`, `prototype`, `implemented` and `production-ready`. These values must not be merged with evidence authority or legal status. [P01], [P02], [P13]

### 1.3 The lifecycle taxonomy

| Canonical phase and gate | Main question | Typical output | Agentic interpretation |
| --- | --- | --- | --- |
| Frame | What problem, purpose, population and accountable owner define the case? | Use-case brief | Justify delegated action and identify alternatives with less authority. |
| Classify | Which route and scrutiny apply? | Risk route | Classify action space, autonomy, data sensitivity and relevant obligations. |
| Assess | Which impacts and failure modes matter? | Impact assessment | Evaluate authority misuse, tool errors, delegation, human oversight and downstream effects. |
| Control | Which owned safeguards address the findings? | Control plan | Define allow-lists, policy checks, approval conditions, effect contracts and safe states. |
| Measure | How will performance and exposure be observed? | KPI/KRI register | Measure errors, interventions, drift, disclosure, unresolved outcomes and control performance. |
| Prove | What evidence supports the decision and next review? | Evidence bundle and gate decision | Reconstruct authority, execution, observation, exceptions and accountable acceptance. |

Gate definitions list `proceed`, `proceed-with-conditions`, `hold`, `redesign` and `stop`. The Gate Decision Record additionally permits `unresolved`, preserving the difference between a concluded routing choice and a recorded undecided state. A conditional decision requires conditions; decisions after sequence 1 require the preceding decision identifier and digest. [P03], [P14]

The PALO-AM page also retains a five-phase historical presentation: ideation and screening; assessment and planning; development and validation; ethical deployment and monitoring; continuous improvement and decommissioning. This is not the same list as the canonical six-phase lifecycle. The editorial glossary and agentic page publish the following explanatory correspondence: historical phase 1 mainly informs Frame/Classify; phase 2 informs Classify/Assess/Control; phase 3 informs Control/Measure; phase 4 informs Measure/Prove; phase 5 informs Prove and the next cycle. That correspondence is a versioned interpretation for readers, not a one-to-one migration mapping or an executable gate rule. [P35] Canonical identifiers should remain the six current phases. [P03], [P11]

### 1.4 The five PALO-AM operational objects

**Agent Identity Profile** describes the agent and its provenance, owner and operating context. The narrative includes credential lifecycle, topology, clearance and revocation. The concrete Agent Profile schema represents `agentId`, `profileVersion`, role, lineage, base model and `systemPromptHash`, with optional temperature. Status can be `active`, `suspended` or `retired`. A prompt hash binds bytes; it does not prove that the model followed the prompt or retained all conversational requirements. [P11], [P15]

**Agent Authority Profile** describes permitted activity. The schema supplies tool allow-lists, operation types, read/write scopes, external-network permission, optional host constraints, argument schemas and a Vibe Gate requirement. Identity and authority coexist in the Agent Profile but remain conceptually distinct. A recognised agent is not automatically authorised to use every tool. [P15]

**Agentic Risk Matrix** routes a configuration using action-space impact and autonomy, modified by reversibility, sensitivity and potential impact. Narrative considerations additionally include third-party dependency, speed/volume and multi-agent complexity. Those additional considerations are not independent inputs to the inspected five-field simulator. [P11], [P16]

**Agentic Control Layer** describes the technical and organisational controls surrounding model proposals: policy evaluation, tool schemas, scoped credentials, approval checkpoints, observability, circuit breakers and change management. The presence of a control in this taxonomy is a governance expectation. Whether it is implemented and non-bypassable must be established for the actual connector and deployment. [P11], [P12]

**Agentic Evidence Layer** records proposals, tool calls, structured inputs/outputs, policy decisions, approvals, incidents, measures and retirement evidence. It does not require disclosure of a model’s private chain of thought. The object cards are useful operational domains; they are not five correspondingly named OWL classes in the core vocabulary. [P07], [P11]

### 1.5 Action space, autonomy and the exact routing matrix

| Facet | Controlled values in the simulator | Meaning |
| --- | --- | --- |
| Action space | `read`, `internal`, `cross-system`, `critical` | Read only; internal write; cross-system action; financial, safety, legal or physical action. |
| Autonomy | `supervised`, `low`, `medium`, `high` | Human executes; agent proposes and human approves; agent acts within bounded rules; agent selects and executes independently. |
| Reversibility | `reversible`, `partial`, `irreversible` | Fully reversible; partially reversible; irreversible or hard to remedy. |
| Data sensitivity | `public`, `internal`, `sensitive`, `restricted` | Public/synthetic; internal; personal/commercially sensitive; special-category, secret or highly restricted. |
| Potential impact | `low`, `moderate`, `high`, `severe` | Localised through consequential rights, safety, livelihood or systemic impact. |

The implemented base matrix is reproduced below. Lower numbered positive tiers demand stronger controls. `0` means redesign required in the simulator. [P16]

| Autonomy | Read | Internal write | Cross-system | Critical |
| --- | --- | --- | --- | --- |
| Supervised | 4 | 4 | 3 | 3 |
| Low | 3 | 3 | 2 | 2 |
| Medium | 3 | 2 | 1 | 1 |
| High | 2 | 1 | 1 | 0 |

Tier 1 is “Maximum controls”; Tier 2 “Controlled”; Tier 3 “Supervised”; Tier 4 “Monitored”. If at least one of irreversible action, restricted data or severe impact is present, a positive base tier is escalated by **one tier only**, with a floor of Tier 1. The three escalation triggers do not accumulate into three tier changes. High autonomy plus critical action remains `0`. Partial reversibility changes recommended controls/evidence but does not itself trigger the tier escalation. These details matter if a third party reimplements the taxonomy. [P16]

The reconciled static matrix and simulator both label the high-autonomy/critical combination “Redesign required”. The former static label “PROHIBITED” is retained only as a deprecated display alias in the editorial glossary. This is a PALO design rule and must not be equated with a prohibited practice under the EU AI Act. [P35] A legal classification would require a separate source-specific analysis. “Supervised” also appears both as an autonomy input and a tier label; these are different fields and should be qualified when exported. [P11], [P16]

### 1.6 Identity, authority and delegation dictionaries

The Agent Profile permits six operation values: `read`, `create`, `update`, `delete`, `execute`, `delegate`. Action Claims use the same operation vocabulary, while network intent is separately classified as `none`, `read`, `write` or `bidirectional`. An operation token is intentionally broad. The exact tool, resource, canonical path and argument schema determine what the action actually means. [P15], [P17]

Delegation uses a maximum depth, maximum subagent count, permitted subagent roles and a human-validation requirement. The profile schema allows a depth from 0 to 20 and a maximum subagent count from 0 to 1,000. These are schema bounds, not recommended safe operating settings. An adopting organisation must choose substantially narrower limits where appropriate and test enforcement. [P15]

Action Claim authority context distinguishes the human principal, agent identity, workload identity, delegation chain and tenant. Workload proof types include `mtls`, `dpop`, `http-message-signature` and `spiffe-svid`; the enumeration lists accepted representation categories and does not establish universal interoperability with every implementation of those technologies. ANS integration is upstream identity/status evidence and does not itself establish permission, data fitness or successful effect. [P17], [P18]

The swarm mandate extends the scope to a named owner, objective, coordinator, members, tenant/case, validity interval, budget and concurrency limit. Budget rules bind tool, operation, resource and path; the prototype’s narrative requires one unambiguous matching rule, a non-negative integer charge and a per-action maximum. Membership changes carry an expected membership digest and reason. A natural-language objective records an accountable intention; it is not a machine proof of goal alignment. [P19]

This yields a useful delegation taxonomy: principal versus agent versus workload; profile versus one-action authority; parent versus descendant; individual limit versus shared exposure; permission revocation versus confirmed interruption. Revoking future authority must not be described as undoing an action already executed or proving cancellation of an in-flight external effect. [P18], [P19]

### 1.7 The action and assurance dictionary

| Term | Concrete meaning and key binding | Common misinterpretation to avoid |
| --- | --- | --- |
| Agent Profile | Versioned identity, authority, delegation and evidence configuration | A profile is not a permit for a particular action. |
| Action Claim | A specific proposed action bound to agent, case, arguments, scopes, time, replay controls and, for newer versions, authority/effect/data contracts | A proposal does not establish permission. |
| Policy Decision | `allowed`, `denied` or `pending_approval`, with reasons, versions and claim digest | `allowed` does not mean executed or compliant. |
| Approval | Human decision concerning the exact claim digest and an expiry | Approval of changed arguments is a different decision. |
| Execution Capability | Short-lived, single-use reference authority bound to claim, decision, executor, verifier and target | It is distinct from an architectural capability in the stack graph. |
| Effect Contract | Resource selector, preconditions, expected and forbidden effects, verification and recovery policy | It verifies declared predicates, not every unstated expectation. |
| Execution Receipt | Signed reference record of execution status and request/result/pre-state digests | `succeeded` does not prove the intended business outcome. |
| Outcome Attestation | Verifier result against the effect contract and observed state | `verified` is scoped to these predicates and evidence. |
| Assurance Incident | Record connecting an adverse or unresolved assurance result to response/review | It is not automatically a legally reportable serious incident. |
| Compensating action | A new action proposed to address a previous effect | It needs its own authority cycle and is not a magical rollback. |

The reference sequence is **Propose → Authorize → Approve when required → Capability → Execute → Receipt → Observe → Verify → Escalate when required**. This is a governance/assurance sequence, not a replacement for the six lifecycle phases. Approval is conditional; it should not be depicted as necessarily occurring in every action. [P12], [P17], [P20]

Action Claim versions 1.1.0 through 1.4.0 are represented in the schema. Version-specific conditions matter: 1.3 introduces the identity-bound authority context; 1.4 additionally binds the Data Fitness Decision and Disclosure Contract by identifier and digest, subject and purpose. An integration must evaluate the actual schema branch rather than treating `schemaVersion` as decorative metadata. [P17], [P21]

### 1.8 State vocabularies must remain separate

| Record or field | Exact values in the inspected contracts |
| --- | --- |
| Profile status | `active`, `suspended`, `retired` |
| Policy decision status | `allowed`, `denied`, `pending_approval` |
| Approval status | `pending`, `approved`, `denied`, `expired`, `cancelled` |
| Execution capability status | `issued`, `consumed`, `expired`, `revoked` |
| Execution receipt status | `succeeded`, `failed`, `unknown` |
| Outcome attestation status | `verified`, `mismatch`, `inconclusive` |
| Predicate check | `pass`, `fail`, `unknown` |
| Data fitness decision | `allowed`, `denied`, `review_required` |
| Disclosure contract | `active`, `revoked` |
| Disclosure receipt | `verified`, `mismatch`, `inconclusive` |
| Evidence claim | `asserted`, `under-review`, `accepted`, `rejected`, `superseded` |
| Evidence evaluation | `sufficient`, `partial`, `insufficient`, `unverified` |
| Mapping approval | `draft`, `in-review`, `approved`, `rejected`, `superseded` |
| Mapping coverage | `total`, `partial`, `conditional`, `supporting` |
| Gate decision outcome | `proceed`, `proceed-with-conditions`, `hold`, `redesign`, `stop`, `unresolved` |

These values are not interchangeable booleans. An approved mapping is a publication/review assertion; an approved action is a particular human approval; an accepted evidence claim has still a distinct evaluation record. Likewise, `unknown`, `unverified`, `inconclusive` and `unresolved` preserve different kinds of missing knowledge. The catalogue keeps each enum attached to its schema and field path instead of deduplicating words that only look similar. [P14], [P17], [P20], [P21], [P22], [P23], [C01]

A notable implementation detail is the effect evaluator’s aggregate precedence: a check with `unknown` makes the aggregate `inconclusive` before the code considers failing checks. Therefore a record may contain both a failed predicate and an inconclusive aggregate. Consumers must retain and inspect per-predicate results rather than hiding an observed failure behind the aggregate label. This is an observation of the inspected reference code, not a proposed alteration. [P24]

### 1.9 Data and information disclosure taxonomy

The data-assurance contracts classify the governed subject as `dataset`, `data-product`, `model`, `ai-system`, `agent`, `tool`, `access-entitlement` or `other`. They connect the subject and tenant to a purpose, source references, quality and lineage assertions, access state, source authority, approval, freshness and incident context. External metadata is evidence to be evaluated; importing it does not independently attest its truth. [P21], [P25]

**Data fitness** means suitability for a stated use under a particular policy and current evidence. The reference evaluator supports quality thresholds, age limits, source authority, ownership/approval, lineage, access, incidents, prohibited classifications and permitted purposes. Missing evidence has explicit deny/review handling. Conflicting current evidence is evaluated conservatively rather than selecting the most favourable assertion. This remains a rule-based fitness decision, not a universal numerical quality score. [P21]

**Disclosure** is separately governed because appropriate access does not imply appropriate transmission. The Disclosure Contract classifies egress as `zero-row`, `aggregated` or `row-level`; trace modes as `disabled`, `metadata-only` or `redacted-payload`; and binds fields, row limits, redactions, destinations, provider/model/region/host, retention, export and output schema. Aggregation does not automatically establish anonymity. [P21], [P25]

The lawful-basis field permits `consent`, `contract`, `legal-obligation`, `vital-interests`, `public-task`, `legitimate-interests`, `not-applicable` and `pending-review`. These tokens record a classification supplied to the governance process. They do not determine whether a basis is legally available. The documented active-contract rule excludes `pending-review` and requires an approver; that runtime condition is stronger than simply observing that the string exists in a schema enum. [P21], [P25]

An observation records actual fields/rows read and disclosed, sensitive categories, redactions, destination, trace behaviour and digests. The Disclosure Receipt compares that observation with the contract. Missing trustworthy observation remains inconclusive. Because the reference executor and signing material share an in-process boundary, its signed observation is not independent proof that all external network activity was observed. [P21]

### 1.10 Controls, indicators and applicability dictionaries

The 12 governance-control domains are fairness and subgroup testing; system cards and explanations; notice, appeal, review and remedy; Article 50 transparency; data lifecycle; GPAI and systemic risk; serious incidents and decommissioning; accessibility; environmental performance; AI-literacy effectiveness; ISO/IEC 42001 AIMS overlay; and PALO-AI production boundary. Each domain names its objective, applicability questions, controls, indicators, gates, evidence contracts, completion criteria, stop conditions and residual boundary. [P04]

The control library classifies controls as `directive`, `preventive`, `detective` or `corrective`. It includes purpose boundaries, provenance, meaningful review, supplier due diligence, adversarial testing, incident response, material change gates, decision traceability and agentic authority, alongside the domain-specific additions. “Not applicable” must be supported by a reasoned accountable decision; omission is not an applicability outcome. [P04], [P05]

The 38 registered KPI/KRI definitions carry formula, cadence, direction, thresholds, linked controls/gates/sources and caveats. Their source explicitly labels thresholds as illustrative. A metric can indicate documentation coverage while saying little about substantive correctness. For example, provenance coverage does not establish permission or fitness, and completed reviews do not establish that reviewers had enough time or independence. [P06]

The agentic page adds 11 named indicators: HOR, RTD, ABI, TCER, AISI, MACR, MTTI, CECR, AIRT, TDS and PVR. These are not 11 automatically additional canonical registry entries: some overlap with registry concepts, and others remain narrative definitions. ABI and TDS lack a fully specified numerical protocol in that page. The earlier CECR collision is resolved in the editorial glossary: `palo-am:cascading-error-containment-rate` retains CECR, while `palo-am:simulator-control-effectiveness-coverage` names the separate simulator recommendation without that abbreviation. The latter still needs a numerical protocol before it can be treated as an operational metric. The glossary does not add either concept to the canonical KPI/KRI registry. [P35] [P11], [P16]

Oversight and bias crosswalks in the briefing are separate research artefacts. Their relationship to the core should be expressed as versioned, source-scoped mappings, retaining draft-source status, clause interpretation and reviewer responsibility. They should not be counted among the 409 core mappings merely because they also use the word crosswalk. Private draft source documents are not required for the public dictionary export. [P26]

### 1.11 Evidence, mappings and versioned meaning

The atomic evidence model distinguishes an **artifact**, an **evidence claim**, an **evaluation** and a **bundle manifest**. The artifact identifies content and provenance. The claim states a falsifiable assertion about one target in one case scope. The evaluation records the reviewer, assessment-run context, outcome, rationale and quality dimensions. The bundle composes digest-bound records. This prevents a document’s presence from being mistaken for successful evaluation of the proposition it is meant to support. [P22], [P23], [P27]

Evidence Evaluation quality values separately cover relevance, integrity, recency and independence, each in the range 0–1. The schema bounds the values but does not supply a universally valid scoring method. A consumer should preserve the method and rationale and avoid treating a mean of four values as proof of assurance. [P23]

Each core mapping is atomic: one source version, one target version, mapping type, coverage, conditions, rationale, basis, approval and provenance. The 409 records comprise 101 control-to-gate, 55 control-to-indicator, 72 control-to-source, 11 gate-to-source, 106 indicator-to-gate and 64 indicator-to-source relationships. Every control-to-gate record is conditional; all other current records are supporting. Although the schema permits `total` and `partial`, those values do not occur in this inspected registry. [P09]

These mapping counts measure authored relationships, not coverage of 409 legal obligations. The mapped source version is a PALO registry reference, not a statement that every clause of an external standard is represented. A mapping’s `approved` publication state must not be transformed into a conformity assertion. [P09], [P28]

### 1.12 A reviewable dictionary entry and maintenance process

For an interoperable exchange, a dictionary entry should contain a stable concept IRI, preferred label, definition, scope note, aliases/acronyms, broader/related concepts, schema and field paths, allowed values, version, status, owner/reviewer, provenance and change history. Language labels should use explicit tags. Semantic identity should remain stable across translation; an English label and its Italian translation are not different control concepts.

PALO already supplies substantial ingredients, especially identifiers, versions, source references, authority boundaries, schemas and mappings. The accompanying extraction preserves these machine-level facts. Additional bilingual definitions, ownership and synonym resolution are a **proposed curated layer**, not fields assumed to be populated in every existing artifact. [P01], [P02], [C01]

The maintenance sequence should be: propose term; identify existing meanings; choose reuse or a new identifier; attach source and scope; review consequences for schemas, policies and user interfaces; test representative and adversarial records; approve a version; publish a digest-bound release; preserve old identifiers or explicit migration. Major meaning or cardinality changes require the existing change-impact and migration process. A wording clarification should not silently change what actions a policy permits. [P28], [P29]

### 1.13 PolicyWatcher transport and review dictionaries

Three additional JSON contracts make external-policy signals more precise. They complement the individual PolicyWatcher signal contract and the draft dependency graph; none grants policy applicability or action authority. [P34]

| Contract | Exact controlled vocabulary and bindings | Governance interpretation |
| --- | --- | --- |
| Signal Batch | `mode = complete-active-snapshot`; `locale = en` or `it`; count and limit up to 25; `hasMore`, nullable `nextCursor`, individual signal schema reference | A page is one part of a snapshot. Completeness cannot be inferred from the first page or a successful HTTP response. |
| Operational Signal Registry | Transport state: `not-synchronized`, `healthy`, `degraded`, `unavailable`; complete-traversal and stale flags; last attempted and successful sync; collection and signal digests; active and revoked entries | Transport health, freshness and signal status remain separate. A valid or accepted import is not an accepted governance finding. |
| Browser-local Review Ledger | `localOnly = true`; source-registry and signal digests; transport status `active` or `revoked`; review state `pending-human-review`, `in-review`, `routed-to-case-file`, `reviewed-no-action`, `rejected` | A local review state records triage. Routing to a Case File is not a signed gate decision or a production approval. |

The registry separately names error codes `network-error`, `http-error`, `schema-error`, `response-too-large`, `pagination-error` and `capacity-exceeded`. Those classifications preserve the reason a snapshot cannot be relied on as complete. Registry statistics count received, accepted, rejected, changed, active and revoked signals; the schema fields must accompany the number, because “accepted” here describes the import process.

The review ledger binds an assessment to the imported signal digest and source-registry digest. If the transport later reports revocation or a different digest, the prior local review must remain attributable to the version actually seen. The JSON contract supplies those bindings; an adopting implementation must enforce reconciliation, reviewer identity and persistence. Browser-local data must not be represented as an organisation-wide authoritative review log.

The complete schema catalogue now includes the union of the inspected agentic and semantic contracts, these three transport/review schemas, and three explicitly draft or local extension schemas. Equal counts in two repositories do not imply identical memberships. The published field dictionary therefore includes the schema filename, path and constraints for every entry rather than presenting an undifferentiated list of terms.


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
