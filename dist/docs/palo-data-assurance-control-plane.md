# PALO Data Assurance Control Plane

Status: PALO-AI v2.7 developer preview. This is an executable reference implementation for isolated testing, not a production authorization boundary, legal determination or compliance certification.

## Outcome

PALO-AI v2.7 implements the first end-to-end form of the product thesis:

> PALO decides what an identified agent may do with current, purpose-fit data and produces signed evidence of the information disclosure and authoritative effect that actually followed.

The new cycle is:

```text
external catalog / observability / source evidence
                       |
                       v
           immutable Context Evidence
                       |
                       v
       purpose-bound Data Fitness Decision
                       |
                       v
       signed Data Disclosure Contract
                       |
                       v
     Action Claim 1.4 + policy + approval
                       |
                       v
 one-time capability + governed executor
                       |
                       v
 Execution Receipt + Disclosure Receipt
                       |
                       v
 authoritative outcome / held incident
                       ^
                       |
       continuous assurance invalidation
```

## Implemented areas

### 1. Context Bridge and external evidence references

`palo-external-evidence-ref` is an immutable, payload-minimized contract. It records:

- external system, object identifier, version and URI;
- subject and tenant;
- normalized quality, freshness, classification, ownership, approval, access, lineage, purpose, lifecycle and incident claims;
- source authority and read-only connector provenance;
- observation/expiry timestamps;
- digest of the source payload.

The source payload is not persisted in the reference. `mapActianContextSnapshot` in `packages/palo-mcp-server/data-assurance.js` is the first normalization profile. It maps an Actian asset snapshot into the generic evidence contract and deliberately discards sample rows. It is not an authenticated Actian API client; credentials, pagination, connector assurance and source-specific API calls remain operator responsibilities.

### 2. Deterministic Data Fitness Gate

`palo-data-fitness-policy` defines minimum evidence types and requirements for one tenant and subject type. The evaluator supports:

- minimum quality score;
- maximum evidence age;
- verified source authority;
- accountable owner and approval;
- lineage completeness;
- source access state;
- open incident denial;
- prohibited classifications;
- policy and source-permitted purposes;
- explicit `deny` or `review` handling for missing evidence.

The resulting `palo-data-fitness-decision` is immutable and binds the exact policy version, purpose, subject, evidence references, normalized-claim digest and expiry. Missing evidence never silently passes. Conflicting current assertions are evaluated conservatively: a lower quality score, denied access, missing approval or incompatible source-purpose constraint causes denial rather than being masked by a more favorable assertion. The maximum evidence-age rule applies to the oldest current reference, and decision expiry is capped at both source validity and each reference's `observedAt + maxEvidenceAgeSeconds` boundary.

### 3. Data Disclosure/Egress Contract

`palo-data-disclosure-contract` is signed and bound to the exact digest of an allowed Data Fitness Decision. It governs:

- source identifiers, fields and maximum rows read;
- zero-row, aggregated or row-level egress;
- egress fields and row limit;
- prohibited sensitive categories and required redactions;
- recipient, provider, model, region and endpoint host;
- tracing mode and maximum retention;
- export and output schema;
- purpose, lawful-basis classification, accountable approver and expiry.

An active contract cannot use `pending-review` as lawful basis, must name an approver, must include its subject in `sourceRefs`, cannot predate or outlive the bound fitness decision and must be current when registered and used. A disclosure observation outside that signed time window, or dated before the governed execution started, is a mismatch.

### 4. Action Claim 1.4 and disclosure verification

Action Claim 1.4 requires:

- identity-bound Authority Context from 1.3;
- Effect Contract;
- exact Data Fitness Decision ID/digest;
- exact Data Disclosure Contract ID/digest;
- subject and purpose.

The runtime validates these bindings before policy evaluation and again before issuing a capability. A continuous-assurance invalidation, expiry, signature failure, digest mismatch, cross-tenant substitution or changed purpose denies execution.

The trusted executor supplies a `palo-data-disclosure-observation` containing metadata only: actual sources, fields and row counts, sensitive categories, redactions, destination, tracing, retention, export and payload/query digests. It must not include row values.

PALO emits a signed `palo-data-disclosure-receipt` and binds its digest into Execution Receipt 1.1. Action Claim 1.4 executor result payloads are not persisted; the runtime stores only a digest, a `payloadStored: false` marker and the disclosure receipt identifier.

If disclosure and contract differ, the authoritative attestation becomes `mismatch`, a high-severity incident opens and the governed resource is held. A missing or malformed trusted observation is `inconclusive`, never verified.

### 5. AI System & Agent Registry

`palo-ai-system-record` versions the minimum AI inventory needed by the assurance layer:

- system, tenant, use case and deployed version;
- lifecycle status, risk class and jurisdictions;
- accountable owners;
- model, agent, tool, data-subject and provider relationships;
- policy-bundle digest and evidence references.

It is intentionally not a general enterprise data catalog. External catalogs remain the metadata source; PALO records the AI/action graph needed for governance and assurance.

### 6. Continuous Assurance Loop

`palo-assurance-signal` represents quality, classification, lineage, access, contract, incident, system-release or policy-release changes. Ingestion:

1. stores the signal immutably;
2. invalidates prior allowed Data Fitness Decisions for the tenant/subject;
3. revokes matching one-time capabilities that have been issued but not consumed;
4. emits bounded telemetry;
5. causes later Action Claim 1.4 evaluation to fail closed until fitness and disclosure are refreshed.

The prototype does not yet reopen a completed historical gate in an enterprise case-management service or deliver ServiceNow/Jira notifications.

## MCP surface

The v2.7 server adds:

```text
palo_import_context_evidence
palo_list_context_evidence
palo_register_data_fitness_policy
palo_evaluate_data_fitness
palo_get_data_fitness_decision
palo_register_disclosure_contract
palo_get_disclosure_contract
palo_register_ai_system
palo_get_ai_system
palo_list_ai_systems
palo_ingest_assurance_signal
palo_list_assurance_signals
```

Existing `palo_verify_action_authority`, `palo_execute_governed_action`, `palo_get_execution_status`, `palo_verify_outcome`, incident, ledger and operational-snapshot tools incorporate the new cycle. OIDC requests bind data-assurance tenant inputs, registries, execution reads and incident operations to the authenticated token tenant. Import, policy, contract, registry and signal mutations require `palo:admin`; fitness evaluation requires `palo:execute`; signal inspection requires `palo:audit`; the remaining reads require `palo:read`.

## Compliance logic

These contracts operationalize evidence relevant to:

- purpose limitation and data minimization;
- lawful-basis classification and accountable review;
- sensitive-data and transfer/region restrictions;
- processor/provider/model and recipient constraints;
- trace and retention limits;
- access state and source authority;
- AI system inventory, ownership and risk class;
- continuous monitoring, incident and change response.

They do not constitute a RoPA, DPIA, DSAR, transfer-impact assessment, DPA, conformity assessment or legal determination. Organization-owned workflows must supply those decisions and bind them as evidence.

## Security and maturity boundary

The reference runtime remains SQLite, single-instance and in-process. HMAC signing material enters the application process. The Actian mapper is not remotely attested and cannot prove that the source API returned complete or truthful metadata. A trusted executor observation proves only what that in-process executor reported and caused PALO to sign; non-bypassability requires a separately isolated, allowlisted or remotely attested connector boundary. Plain SHA-256 payload and query digests provide integrity binding, not anonymity; production designs should assess equality/linkability and use organization-controlled keyed commitments where low-entropy sensitive inputs make offline guessing credible.

The production-admission contract therefore continues to deny the bundled runtime. Multi-tenant storage isolation, PostgreSQL/HA, distributed work, KMS/HSM custody, independently assessed remote connectors, SIEM/retention/legal hold and external ledger anchoring remain required production work.

## Verification

Run:

```bash
npm run validate:agentic
```

The data-assurance test suite covers:

- Actian payload minimization and allowed fitness evaluation;
- conservative denial for conflicting current source assertions;
- conservative evidence freshness and decision-expiry capping;
- Action Claim 1.4 binding and negative authority-context validation;
- signed zero-row disclosure receipt;
- signed disclosure-window enforcement;
- non-persistence of executor row payloads, including receipt-generation failure;
- row, field, provider and region mismatch incidents;
- replayed pre-execution disclosure-observation denial;
- assurance-signal invalidation;
- revocation of unconsumed capabilities;
- same-claim stale-cache denial;
- OIDC cross-tenant MCP denial;
- tenant-safe legacy incident listing.
