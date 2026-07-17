# PALO-AI Cloud Reference Architecture

Status: target architecture and deployment decision record for the PALO-AI v2.4.1 developer preview, updated 17 July 2026.

> The live Hostinger VPS is an Internet-reachable developer preview. HTTPS and private container networking do not make the current runtime a production authorization boundary.

## Recommendation

Do not replace local PALO with a single mandatory cloud service. Productize four deployment modes behind the same versioned contracts:

1. **PALO Local** — Docker Compose or process-local sidecar for developers, offline evaluation and self-hosted n8n.
2. **PALO Hybrid** — a local governed executor calls a remote policy/control plane while protected credentials and sensitive side effects remain inside the organization.
3. **PALO Cloud** — a managed, multi-tenant control plane for registry, policy distribution, approvals, evidence and administration.
4. **PALO Private** — the same service deployed into a customer VPC/private cloud with customer identity, network, keys and retention.

The recommended order is Local -> single-tenant Hybrid staging -> managed single-region pilot -> multi-tenant managed service -> private-cloud distribution.

## Current versus target

| Concern | Current VPS preview | Production target |
|---|---|---|
| Identity | Shared bearer token | OIDC workload identity, mTLS for service paths, authenticated human principals |
| Authorization | Coarse route restriction | Tenant/project RBAC, policy administration roles, approval separation of duties |
| Policy | Local Rego file / preview registry | Signed versioned bundles, controlled promotion, rollback, digest attestation and status telemetry |
| State | Single-host SQLite WAL | Managed PostgreSQL with tenant isolation, migrations, PITR, transactional outbox and tested restore |
| Replay | Local nonce/idempotency/sequence checks | Atomic distributed consumption, scoped replay namespaces and recovery-safe exactly-once effects |
| Signing | Environment-supplied HMAC | KMS/HSM-backed Ed25519 or HMAC keys, rotation, audit and envelope signing |
| Approval | Preview state machine | Authenticated reviewer context, claim-bound one-time grants, durable callbacks and escalation |
| Availability | One VPS | Multi-zone services, health-based routing, queues, back-pressure and tested disaster recovery |
| Evidence | Local append-only hash chain | Transactional event store, immutable archive/WORM target, external anchoring and retention controls |
| Operations | Manual Docker deployment | Infrastructure as code, signed images, SBOM, provenance, SLOs, tracing, alerts and runbooks |

## Logical architecture

```text
Clients and platform adapters
  n8n | Copilot Studio | Dify | LangGraph | Node-RED | Make | Zapier
            |
     API gateway / WAF / rate limits
            |
  workload identity and tenant resolver
            |
  +---------+-----------+----------------+
  |                     |                |
Claim service      Approval service   Evidence verifier
  |                     |                |
  +---------- transactional command bus--+
            |
   Governed executor / capability broker
            |
   target-specific credentials and tools

Policy plane: signed registry -> signed OPA bundles -> decision logs/status
Data plane: PostgreSQL -> outbox/queue -> immutable object archive
Security plane: KMS/HSM, secrets manager, SIEM/OpenTelemetry, audit administration
```

For authoritative enforcement, the governed executor must hold the target credential and be the only network path to the protected action. A remote policy decision returned to an optional visual node remains advisory.

## Deployment modes

### 1. PALO Local

Use for laptop development, offline tests and a self-hosted automation instance on one trusted machine.

- Bind gateways to loopback or a private container network.
- Pin exact images and package versions.
- Keep mock credentials separate from personal/production credentials.
- Preserve the same Action Claim and evidence formats used by cloud modes.
- Treat SQLite as single-host preview persistence, not distributed evidence infrastructure.

### 2. PALO Hybrid

Use when policy and approval coordination can be centralized but execution must remain inside the adopter network.

- Send the minimum normalized claim; avoid raw payloads and secrets.
- Run the executor and target credential locally.
- Bind a signed one-time grant to tenant, workload, audience, action digest and expiry.
- Re-evaluate policy immediately before local consumption.
- Queue evidence through a durable outbox when the cloud control plane is unavailable.
- Fail closed for new consequential actions; define an explicit, risk-owned break-glass path.

### 3. PALO Cloud

Use for design partners only after the identity, state, key and recovery gates are complete.

- Separate tenant control data at the database, cache, queue, object-storage and key layers.
- Use per-environment and preferably per-tenant signing keys.
- Isolate administrative APIs from runtime APIs.
- Run stateless gateways and evaluators across availability zones.
- Use managed PostgreSQL, managed key custody, a durable queue and immutable evidence archive.
- Publish SLOs for decision latency, availability, approval delivery, evidence durability and recovery.

### 4. PALO Private

Use for regulated organizations and customers requiring data-residency or network control.

- Deliver signed OCI images, Helm charts or equivalent reproducible deployment artifacts.
- Integrate with the customer's OIDC, secrets manager, SIEM, KMS/HSM and backup services.
- Support offline signed policy bundles and controlled egress.
- Produce a conformance report without exporting sensitive Action Claims.
- Define a supported-version and security-update policy before commercial distribution.

## Platform placement

| Platform | Local option | Cloud option | Strongest practical enforcement |
|---|---|---|---|
| n8n | Local node/native nodes plus local executor | n8n calls PALO Cloud; private executor recommended | Governed executor plus self-hosted workflow admission |
| Copilot Studio | Not normally local | Streamable HTTP MCP / connector to PALO Cloud or Private | Expose only narrow PALO broker tools; disable equivalent direct tools |
| Dify | Self-hosted strategy/plugin | Hosted Dify calls PALO Cloud | PALO-owned Agent Strategy before `tool.invoke` |
| LangChain/LangGraph | Local middleware and sidecar | Cloud service plus server-side broker | Client middleware plus authoritative server enforcement |
| Node-RED | Local node and runtime hook | Remote policy with local executor | Administrator-controlled runtime hook and protected-node registry |
| Make/Zapier | Local is not the primary model | Hosted platform calls PALO Cloud | Brokered action; direct native actions removed |

## Cloud-provider decision

Keep the product architecture cloud-neutral. For the first managed pilot, Azure is strategically coherent with Copilot Studio because Entra ID, Key Vault, managed PostgreSQL, queues, container services and Power Platform governance can be combined without changing PALO contracts. AWS or GCP are equally viable when a design partner already operates there. The selection gate should be operational ownership, customer identity, data residency and managed key requirements, not branding.

The existing Hostinger VPS can continue as a disposable single-tenant interoperability environment. Do not make it the production source of truth until automated backup/restore, least-privilege administration, managed key custody, monitoring, incident response and independent security testing are in place.

## Scale gates

1. **10 design workflows:** single-tenant staging, synthetic data, daily backup verification, manual support.
2. **First external design partner:** isolated tenant, OIDC, per-environment keys, signed policy bundles, audit export and contractual preview scope.
3. **Production candidate:** multi-zone services, PostgreSQL PITR, durable outbox, KMS/HSM, SLOs, on-call, recovery exercises and external pen test.
4. **Multi-tenant service:** formal tenant threat model, isolation tests, per-tenant quotas/keys, privacy controls, regional deployment and independent assurance.
5. **Enterprise/private distribution:** signed supply chain, SBOM/VEX, support lifecycle, upgrade/rollback conformance and customer-operated key option.

## Production acceptance tests

- Policy outage, stale bundle and malformed decision all fail closed.
- A direct tool path is denied at network or credential level.
- Duplicate, reordered and replayed claims cannot cause a second side effect.
- Approval modification generates a new claim and new evaluation.
- A one-time grant is consumed atomically with the execution intent.
- Evidence is generated by the trusted executor, not accepted as caller-supplied truth.
- Database, queue and region recovery preserve decision/approval/execution lineage.
- Tenant A cannot observe, authorize, replay or verify private data from tenant B.

See also the [security assurance and scale plan](palo-ai-security-assurance-and-scale.md) and [production-readiness plan](palo-ai-production-readiness-plan.md).
