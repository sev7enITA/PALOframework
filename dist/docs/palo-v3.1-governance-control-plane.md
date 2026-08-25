# PALO v3.1 Governance Control Plane

Status: Released governance specification and evidence contracts, 23 August 2026. PALO-AI remains a developer-preview reference runtime and is not admitted for production use by the bundled production profile check.

PALO v3.1 turns twelve previously incomplete governance areas into canonical, applicability-aware control packs. Each pack connects controls, indicators, lifecycle gates, evidence contracts, completion criteria, stop conditions and a residual boundary. This release makes the governance expectations complete at the control-plane level. It does not assert that any adopting organization has implemented them or that the bundled PALO-AI runtime is production ready.

## What complete means

The word `complete` has four deliberately separate meanings:

| Level | Meaning | Who can establish it |
| --- | --- | --- |
| Governance complete | Every applicable domain has canonical owned controls, schema-valid evidence records, indicators and thresholds, gate integration, stop conditions and an accepted decision. A non-applicable decision is reasoned and accountable. | PALO defines the contract; the case authority accepts the scoped record. |
| Operational complete | The organization has implemented the controls in real people, processes and technology, populated current evidence from the actual system and tested operating effectiveness over an appropriate period. | The adopting organization and its assurance functions. |
| Production complete | Operational controls are non-bypassable in the deployed architecture; identity, tenant, persistence, key, connector and recovery boundaries are demonstrated and independently challenged. | The accountable production authority, supported by independent assurance. |
| Certification complete | An authorized independent body has certified a defined management-system scope against the relevant standard. | An accredited or otherwise authorized certification body, never PALO itself. |

Therefore, PALO v3.1 is governance complete for the twelve domains listed below. It is not automatically operationally complete for an adopter, production complete for a deployment or certification complete for ISO/IEC 42001.

## Canonical implementation

The machine-readable registry is [governance-control-packs.json](../data/governance-control-packs.json). It is validated against [palo-governance-control-packs.schema.json](../schemas/palo-governance-control-packs.schema.json). The v3.1 semantic release binds the registry, its referenced controls, indicators, gates and evidence schemas by digest.

| Domain | v3.1 implementation | Remaining deployment or authority boundary |
| --- | --- | --- |
| Fairness and subgroup testing | Quality-of-service, allocation and representational-harm controls; intersectional group register; approved metrics, sample adequacy and thresholds; disparity and harmful-representation indicators. | PALO cannot select a scientifically or socially valid fairness objective for the adopter. Metric choice, trade-offs and residual disparity need accountable review. |
| System cards and explanations | Version-bound system card plus explanation artifacts and stakeholder comprehension tests for affected people, operators, reviewers and customers. | A passing template does not prove that every affected person understands an outcome or that an explanation is legally sufficient. |
| Notice, appeal, review and remedy | Affected-person case contract with notice delivery, accessible intake, deadline, independence check, reasoned outcome, remedy and verified closure. | Legal rights, deadlines, reviewer independence and available remedies remain jurisdiction and context specific. |
| Article 50 transparency | Provider/deployer role assessment, AI interaction notice, machine-readable marking, deployer label, content identity and provenance verification. | PALO does not prescribe a single watermark standard or decide legal equivalence. Content-path testing and current legal review remain required. |
| Data lifecycle | Lineage for training, evaluation, prompt, retrieval, embedding and operational data; annotation protocol and quality; permission, sensitivity, purpose, lawful-basis record, retention and deletion verification. | Schema validity cannot establish legal basis, ownership, representativeness or actual deletion without operational evidence. |
| GPAI and systemic risk | Provider, modifier and deployer role pack; model and dependency inventory; downstream evidence; systemic-risk scenarios, evaluation, mitigation and residual findings. | PALO does not designate systemic-risk GPAI, verify provider disclosures or establish conformity with the voluntary GPAI Code. |
| Serious incidents and decommissioning | Timestamped reporting-clock record, reportability decision and authority receipt; retirement gate for transition, revocation, data disposition and residual monitoring. | Reportability, authority routing and deadlines require current jurisdiction-specific analysis. |
| Accessibility | Automated and manual testing of critical journeys and generated outcomes, assistive-technology results, representative disabled-user evaluation and remediation. | PALO does not certify WCAG conformance or replace product, sector and jurisdiction-specific accessibility assessment. |
| Environmental performance | Boundary, measurement or estimation method, energy, emissions, water and hardware evidence, alternatives and accountable budget decisions. | Supplier data, lifecycle-accounting method and external environmental claims require independent verification. |
| AI literacy effectiveness | Role-competence matrix, role-specific learning, practical assessment, observed control behavior, refresh triggers and post-training error indicators. | Attendance or a generic quiz is not accepted as proof of competence. The organization owns curriculum and job-specific standards. |
| ISO/IEC 42001 AIMS overlay | Scope, context, leadership, policy, objectives, support, operation, performance evaluation, internal audit, management review, nonconformity and corrective action. | This overlay is not the licensed standard, a clause-by-clause interpretation or certification. |
| PALO-AI production boundary | Strict production profile, OIDC tenant-to-claim binding and fail-closed startup admission covering persistence, tenancy, key custody, connector bypass, observability and independent assurance. | The bundled SQLite, in-process, process-key reference runtime is denied by its own admission check. Production completion requires a different deployment capability attestation and independent evidence. |

## Applicability and lifecycle gates

Not every control applies to every system. Each gate now has unconditional and conditional controls. The conditional list means that the case team must answer the domain applicability questions and then either:

1. bring the controls and minimum evidence into scope; or
2. record a reasoned non-applicability decision with an accountable reviewer and current evidence.

Silence, a blank field or the absence of an artifact is not a non-applicability decision. If a pack stop condition is present, the relevant lifecycle gate cannot pass without a recorded mitigation, condition or accountable exception allowed by organizational policy.

The six gates are Frame, Classify, Assess, Control, Measure and Prove. Their canonical control and indicator projections are generated from the v3.1 registries, which prevents a control pack from existing only in narrative documentation.

## Evidence contracts

PALO v3.1 adds the following schema families, each with one valid and one deliberately invalid fixture:

- `palo-governance-assurance-record`: common control test, result, finding, corrective-action and accountable decision record.
- `palo-system-card`: deployed-system identity, intended use, architecture, data, evaluation, limitations, oversight, monitoring and stakeholder explanations.
- `palo-affected-person-case`: notice, appeal, independent review, outcome, remedy and closure.
- `palo-article50-transparency-record`: actor role, content modality, obligation, exception, marking, label and provenance test.
- `palo-data-lineage-record`: asset origin, transformations, annotations, permissions, quality, lawful-use record, retention and disposition.
- `palo-gpai-systemic-risk-record`: GPAI role, model identity, provider/deployer evidence, scenario evaluation, mitigation, incident and downstream information.
- `palo-serious-incident-record`: discovery, severity, reportability analysis, regulatory clocks, notification and corrective action.
- `palo-decommission-record`: retirement scope, dependencies, stakeholder transition, access revocation, data disposition and residual monitoring.
- `palo-aims-overlay-record`: AIMS scope, context, leadership, objectives, operations, performance evaluation, audit, management review and corrective action.
- `palo-production-profile`: production identity, tenant isolation, persistence, durable work, key custody, execution boundary, observability, independent assurance and admission decision.

Evidence references are claims about artifacts, not proof by themselves. The adopter must make the referenced records retrievable, current, access controlled and independently challengeable.

## PALO-AI production admission

Set `PALO_RUNTIME_MODE=production` and provide `PALO_PRODUCTION_PROFILE_PATH`. Startup validates the profile and compares it with the runtime capability attestation. Missing evidence, expired decisions, non-HTTPS identity metadata or an unmet deployment capability fails closed.

The bundled capability attestation declares SQLite storage, no tenant storage isolation, in-process connectors, process-held signing material, no high availability, no durable distributed queue and no independent deployment assurance. As a result, even the schema-valid production fixture is denied. This is intentional: the repository now distinguishes a complete production-control contract from a production-capable implementation.

OIDC-protected action processing also binds the configured token tenant to `authorityContext.tenantId`, `effectContract.resourceSelector.tenantId` and, when present, claim metadata. Tenant-bound execution requires Action Claim 1.3 or data-governed 1.4. Action Claim 1.4 additionally binds current Data Fitness and signed Disclosure Contract digests. This prevents cross-tenant request substitution at the MCP boundary but does not create database-level isolation.

## PolicyWatcher relationship

PolicyWatcher remains an external change signal. It can identify a source or obligation change and create human-review-required evidence, but it does not silently rewrite PALO controls or decide legal applicability. The source registry now includes current EU AI Act, Article 50, GPAI, GDPR, ISO and WCAG references with review dates. A stale source marked `current` fails validation.

The governance sequence is:

1. PolicyWatcher produces a source-backed signal.
2. An accountable reviewer verifies relevance and applicability.
3. PALO maps the accepted change to affected packs, controls, indicators, gates and evidence contracts.
4. A case decision records implementation, conditions, residual risk and the next review.
5. A semantic release updates only after generated mappings and digests validate.

## Validation

Run:

```bash
npm run validate
npm run validate:agentic
npm run production:admission -- schemas/fixtures/palo-production-profile.valid.json
```

The third command is expected to return a denied runtime compatibility result for the bundled reference runtime. Use `--schema-only` to validate the profile contract without asserting runtime compatibility.

## Primary normative references

- [Regulation (EU) 2024/1689, current consolidated text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [European Commission Article 50 transparency guidance](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations)
- [European Commission GPAI Code of Practice](https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai)
- [European Commission guidelines for GPAI providers](https://digital-strategy.ec.europa.eu/en/policies/guidelines-gpai-providers)
- [ISO/IEC 42001 overview](https://www.iso.org/standard/42001)
- [ISO/IEC 42005 overview](https://www.iso.org/standard/42005)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)

These links support applicability review. They do not make the PALO crosswalk authoritative over the source instruments.
