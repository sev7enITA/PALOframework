# OWASP GenAI / LLM Top 10 2026: PALO Security Crosswalk and Governance

This source-backed reference evaluates how the PALO Framework, PALO-AM and PALO-AI relate to the ten risks in the OWASP Top 10 for LLM Applications 2026. It separates governance fit from technical implementation and identifies where PALO needs external safeguards or a targeted extension.

> **Decision summary:** PALO has a strong governance fit and incomplete technical resolution. Across the three connected routes, eight risks have a direct PALO route somewhere in the stack. LLM09 Vector and Embedding Weaknesses and LLM10 Improper Output Handling remain supporting-only areas that need targeted controls.

Use the [interactive crosswalk](../PALO_OWASPGenAI2026.html) for the complete risk dossiers. The [pinned source PDF](../assets/OWASP-GenAI-LLM-Top-10-2026-v1.0.pdf) and [machine-readable crosswalk](../data/owasp-genai-2026-crosswalk.json) are published with this reference.

## Source and authority boundary

- Source: OWASP Top 10 for LLM Applications 2026, repository artifact `2026-v1.0`.
- Artifact date: 4 August 2026.
- Source review date: 13 August 2026.
- Crosswalk technical review date: 20 August 2026.
- SHA-256: `ef87993a4e50ae9d83b41ff7a3d3e6320a82dfa8d4ec6bf98d0ce264b2e6108e`.
- Evidence class: source-backed context.
- Authority status: informative security source, not a law, standard, certification or deployment authorization.

The PDF revision history retains the text `[2026 release date]`, and the official project page did not expose a separately indexed 2026 download when reviewed. PALO therefore preserves this exact artifact as a provisional, version-pinned source and requires official-source reverification before external assurance or formal reliance.

This mapping does not establish equivalence, implementation effectiveness, OWASP endorsement, compliance or certification.

## How to read the ratings

- **Direct:** a first-class PALO artifact or control materially addresses the risk within the stated route.
- **Supporting:** PALO contributes governance or containment, but OWASP-specific technical safeguards remain necessary.
- **Gap:** the current route has no specific coverage for the risk's main mechanism.

The ratings describe design fit. They do not show whether a safeguard is implemented correctly or operating effectively in a deployed system.

## Overall fit across the three PALO routes

| Route | Direct | Supporting | Gap | Role and boundary |
| --- | ---: | ---: | ---: | --- |
| PALO Framework | 6 | 4 | 0 | Lifecycle ownership, controls, evidence, monitoring and review. It governs the security work but is not a runtime security product. |
| PALO-AM | 5 | 5 | 0 | Agent identity, authority, autonomy, tool boundaries, oversight and circuit breakers. It is the current methodology baseline for delegated action. |
| PALO-AI | 4 | 4 | 2 | Exact claims, policy, approval, one-time capability, receipt and outcome verification. It remains a full-cycle Developer Preview, not a production security boundary. |

## Coverage matrix

| OWASP risk | PALO Framework | PALO-AM | PALO-AI | PALO response |
| --- | --- | --- | --- | --- |
| LLM01 Prompt Injection | Direct | Direct | Direct | Contain the consequence through untrusted-model assumptions, deterministic mediation, least privilege, approval and adaptive testing. Do not promise complete prevention. |
| LLM02 Sensitive Information Disclosure | Direct | Supporting | Supporting | Govern the data surface, provenance, incidents and evidence. Add retrieval-time authorization, DLP, tenant isolation and trace redaction. |
| LLM03 Excessive Agency | Direct | Direct | Direct | Strongest fit: bind identity, authority, minimum tools, user context, approval, one-time execution and outcome evidence. The production path must be unavoidable. |
| LLM04 Supply Chain | Direct | Supporting | Supporting | Use supplier due diligence and change gates. Add AIBOM or ML-BOM, immutable pins, signatures, vulnerability management and connector attestation. |
| LLM05 Data and Model Poisoning | Direct | Supporting | Gap | Govern lineage, change, tests, incidents and rollback. Add pipeline integrity, persistent source, chunk and embedding-model poisoning detection, signed artifacts and controlled feedback loops. |
| LLM06 Unbounded Consumption | Supporting | Direct | Supporting | Apply PALO-AM circuit breakers and bounded action space. Add token, action, time and cost caps, queue limits, loop detection, rate limiting and infrastructure hardening. |
| LLM07 Misinformation | Direct | Direct | Direct | Use source-backed decisions, claim-check-act, human review and post-state verification. A verified effect does not prove that a claim is true. |
| LLM08 Hidden Context Exposure | Supporting | Direct | Direct | Keep secrets and authorization outside the model context. Use deterministic controls and test context extraction. |
| LLM09 Vector and Embedding Weaknesses | Supporting | Supporting | Gap | Targeted extension area: add pre-retrieval chunk authorization, trust-zone-separated indexes, embedding provenance, inversion testing, retrieval-evasion and similarity-collision testing, deletion reconciliation and anomaly detection. |
| LLM10 Improper Output Handling | Supporting | Supporting | Supporting | Add a sink-safety extension for context-aware encoding, prepared queries, CSP, terminal sanitization, outbound-fetch restrictions and generated-code security gates. |

### LLM05 / LLM09 boundary and ownership

Vector-store poisoning is routed by the mechanism that makes the attack succeed, not merely by the component name:

- **LLM05 owns persistent integrity corruption:** malicious or contaminated source documents, chunks, training data or embedding-model inputs introduced through ingestion, retraining or promotion. The accountable roles are the Data or Model Owner and MLOps Owner.
- **LLM09 owns embedding-geometry exploitation:** crafted content or queries that manipulate similarity ranking, retrieval thresholds, semantic-cache collisions, cross-tenant inference, membership inference or embedding inversion. The accountable roles are the Vector Store Owner and Product Security.
- **Joint cases require both records:** if a poisoned chunk is persistently admitted and then geometrically optimized to dominate retrieval, LLM05 owns admission, provenance, removal and rollback while LLM09 owns ranking behavior, retrieval testing and vector-layer containment. Neither owner may close the other record by reference alone.

For LLM09, a static chunk-ACL test is necessary but insufficient. Minimum technical evidence must also include a quantified embedding-inversion exercise using Vec2Text, ZSInvert, Zero2Text or a threat-model-equivalent technique; adversarial-query retrieval-evasion, similarity-collision and threshold-straddling tests; and a vector-layer poisoning or ranking-manipulation test. Exported vectors and vector backups are handled at the same sensitivity tier as their source data unless a reviewed threat model and test evidence support a narrower treatment.

## What PALO can and cannot resolve

PALO can make each risk accountable by assigning ownership, routing it through lifecycle gates, connecting controls to tests and evidence, recording residual risk and reopening the case when material conditions change. PALO-AM materially strengthens the architecture when an LLM selects tools, carries memory or acts across systems. PALO-AI can make selected action-path controls executable and can distinguish an allowed action from a verified post-state.

PALO cannot make an LLM immune to prompt injection, prove factual truth, secure a vector database without vector-specific controls, demonstrate resistance to embedding inversion or retrieval evasion without adversarial test evidence, sanitize every downstream output sink, attest an entire AI supply chain, or make the current PALO-AI Developer Preview production-ready. Those responsibilities remain with the system owner and the relevant security, data, platform and supplier-control functions.

## Applicability fork

Use this OWASP LLM Top 10 when the model is an application component. Pair it with the OWASP Top 10 for Agentic Applications and apply the PALO-AM and PALO-AI route when any of the following is present:

- tool selection or tool invocation;
- persistent memory or a shared RAG corpus;
- multi-step planning or delegation;
- state change, external communication or autonomous action.

Neither list covers the combined model-and-agent risk alone.

## Governance operating model

The accountable source owner should be Product Security or AI Governance. Individual risk ownership remains with the system roles that can change the relevant control: Data Owner, Product Owner, IAM, AppSec, MLOps, SRE, FinOps, supplier risk or vector-platform owner.

Apply the following loop:

1. **Register:** preserve publisher, version, date, local artifact hash, license, authority class and source status.
2. **Scope:** decide which risks apply to the actual architecture and whether the Agentic Top 10 must also be used.
3. **Assign:** name one accountable owner and one evidence-producing control owner for each applicable risk.
4. **Control:** select preventive, detective and corrective safeguards. Record which are PALO controls and which are external technical controls.
5. **Test:** define the abuse case, method, threshold, environment, result, limitation and independent review need.
6. **Decide:** record residual risk, conditions, approval authority, rejected alternatives and readiness decision.
7. **Reopen:** reassess on a source revision, material architecture or data-scope change, incident, or failed critical test.

Review the crosswalk at least every 90 days. Reopen it immediately when OWASP revises the source; when tools, memory, autonomy, model, corpus, vector index, output sink or supplier changes; when a material incident occurs; or when a critical adversarial test fails.

Every applicable risk record should contain:

- applicability and rationale;
- accountable owner and control owner;
- implemented control and current maturity;
- test method, environment and result;
- evidence link and source status;
- residual risk and acceptance authority;
- decision, conditions and expiry;
- reopen trigger.

## Operational integration

The crosswalk runs through the existing PALO evidence loop; it is not a new module or activation route.

1. **Guide:** a generative or agentic system receives a `Scope OWASP GenAI 2026` handoff alongside the primary Evidence Pack route. The web Guide and read-only MCP Guide Agent use the same applicability boundary.
2. **Assessment Path:** the assessor records whether an LLM is present, whether retrieval or memory is used, and whether generated output reaches a downstream execution sink. All ten risks remain in scope; the architecture signals only select a priority subset.
3. **Evidence Bundle and Case File:** an applicable assessment retains the source pin, version, hash, priority list, LLM09 or LLM10 extension flags, testing readiness and human-review boundary in the existing `assessment-path` record. A separate OWASP artifact remains `draft` until accountable technical and assurance review is complete.
4. **Review and reopen:** Product Security or AI Governance confirms owners, external safeguards, test evidence, residual risk and the decision boundary. Reopen the case when the source, model, corpus, vector index, memory, tools, authority, output sink or supplier changes, or when an incident or critical test failure occurs.

The route is a governance and evidence aid. It is not a scanner, certification scheme, OWASP endorsement or proof that the listed safeguards operate effectively.

## Integration status

PALO publishes four connected artifacts for this update:

- the original source PDF as a version-pinned informative artifact;
- the updated PALO Source Registry entry;
- a schema-validated machine-readable crosswalk;
- the web and documentation analysis.

The crosswalk is intentionally source-backed context. It has not been silently promoted into the canonical PALO semantic release or treated as proof of control effectiveness. That boundary preserves the active activation freeze and requires an explicit, reviewed release decision before any future canonical control-library extension.

## Attribution and license

The source report is published by the OWASP GenAI Security Project under Creative Commons Attribution-ShareAlike 4.0. Risk names and source-derived summaries are attributed to OWASP, and this crosswalk is shared under the same CC BY-SA 4.0 license. The PALO crosswalk is an independent analysis and does not imply OWASP endorsement. Consult the pinned report and the [official OWASP project page](https://genai.owasp.org/initiative/owasp-top-10-for-llm-and-genai/) for the source material and current status.
