# PALO-AI Governance Hub - Delivery Status

**Assessment date:** 2026-08-27

**Product status:** v3-aligned static verification console plus an opt-in production-candidate Hub control plane and a separate developer-preview execution runtime
**Production use:** not approved

## Executive summary

PALO-AI now has a coherent product surface for two audiences without splitting the governance model. The Executive lens answers whether agentic operations are governed, appropriately authorized, producing verified outcomes and operationally healthy. The Technical lens turns business intent into a bounded agent capability and exposes the underlying registry, policy, approval, execution, evidence and incident state.

The default GitHub Pages interface supports controlled demonstrations and structured design-partner evaluation. Its illustrative dashboards are not a source of record. Executive and Technical remain workspace lenses, not RBAC roles. The browser console does not embed the preview Gateway bearer token.

The guided setup no longer simulates connection readiness or registry publication with timers. Its connection action validates a local, versioned reference profile and returns `not-configured` because the public GitHub Pages build has no operator BFF. Its assurance suite evaluates seven deterministic scenarios derived from current inputs and emits a digest-bound, expandable receipt. The final action downloads a non-authoritative local bundle and explicitly records that no signing, registry write, promotion or production authorization occurred.

An opt-in operational deployment now adds an OIDC/PKCE BFF, opaque sessions, exact-origin/CSRF controls, tenant and role binding, strict server-side adapters, server simulation, PostgreSQL RLS, atomic audit, separate review and remote signed publication. It is served separately at `/hub/` and `/control-plane/`; production startup fails closed without its external dependencies. This makes the Hub implementation production-candidate, not production-admitted. The SQLite execution Gateway remains a separate developer preview and the current global registry cannot be described as tenant-scoped.

## What is available now

| Area | Status | Evidence |
| --- | --- | --- |
| White responsive Governance Hub | Prototype | Executive/Technical shell, mobile navigation and production Vite build |
| Guided technical setup | Implemented static verifier | Eight steps from reference-profile validation through deterministic simulation and local artifact generation; 3,528 selectable combinations tested |
| Operational Hub BFF | Implemented production candidate; opt-in | OIDC/PKCE session, CSRF/origin controls, tenant/RBAC, step-up, adapter receipts, server simulation, PostgreSQL RLS and signed lifecycle |
| Configuration lifecycle | Implemented production candidate; external signer required | Draft -> in-review -> approved/rejected -> remotely signed -> published with author/reviewer separation and atomic audit |
| Executive cockpit | Prototype | Four independent signals, portfolio, decision queue, assurance and report views |
| Operational workbench | Prototype | Registry, policy, execution, approval, incident and integration views |
| Full-cycle trace | Prototype UI over implemented contracts | Proposed -> authorized -> approved -> capability -> executed -> receipt -> outcome |
| Runtime contracts | Implemented developer-preview schemas | 12 validated agentic contracts |
| MCP interface | Implemented reference server | 19 official-SDK tools; stdio and authenticated Streamable HTTP preview |
| Policy evaluation | Implemented reference policy | Rego v1 compile and policy tests, default deny and fail closed |
| Runtime assurance | Prototype | one-time capability, signed receipt, authoritative verifier and held incident |
| Publication pipeline | Implemented | deterministic root build, validated `dist`, Hostinger full and delta packages |

## Verification-console evidence boundary

| Action | What the public console performs | What it does not claim |
| --- | --- | --- |
| Check connection | Normalizes platform/environment, matches the versioned reference profile and produces a SHA-256-bound receipt | Runtime health, connectivity, identity, registry state or credentials |
| Select inventory | Selects from repository reference records | Runtime discovery or source-of-record inventory |
| Test boundary | Validates compatibility and evaluates seven positive/adverse scenarios from the selected contract | Policy deployment, tool execution, approval or authoritative outcome verification |
| Generate bundle | Downloads an unsigned local JSON artifact with a bundle digest and simulation reference | Registry publication, signing, environment promotion or production authorization |

Any future live adapter must run server-side, return evidence of the remote operation and preserve these distinctions. A missing adapter remains `not-configured`; it must not degrade to an optimistic status.

## Operational-control-plane evidence boundary

| Action | What the opt-in control plane performs | What it still does not claim |
| --- | --- | --- |
| Check connection | One allowlisted capped server request with timestamp, latency, endpoint origin class and response digest | Independent assurance, runtime production admission or protected execution |
| Discover inventory | Strict redacted registry projection; tenant scope only when the adapter attests upstream enforcement | Platform-wide coverage or tenant isolation from the bundled preview Gateway |
| Simulate | Authenticated server-side deterministic evaluation persisted with tenant and audit binding | Protected executor invocation or authoritative post-state |
| Save/review | PostgreSQL RLS state machine, immutable digest, separate reviewer and step-up in production | Agent action approval or execution |
| Publish | Remote signer request after approval, digest matching and atomic published/audit transition | Runtime policy activation, agent action authorization or outcome verification |

## What still blocks production

1. **Deployment identity evidence:** configure and independently test the implemented OIDC, tenant/role mapping, step-up policy, revocation and operator lifecycle.
2. **Tenant adapter assurance:** deploy a tenant-enforcing adapter and pass cross-tenant negative tests; the bundled preview Gateway is insufficient.
3. **Managed key custody:** connect the implemented remote-signing protocol to an owned KMS/HSM lifecycle with rotation, revocation and cryptographic review.
4. **Managed persistence evidence:** deploy the implemented PostgreSQL/RLS store with HA, backup/PITR, monitoring and a successful restore exercise.
5. **Unavoidable execution:** prove that protected credentials and tool paths cannot bypass the governed executor.
6. **Connector assurance:** package and test production adapters against real platform failure modes without claiming universal exactly-once behavior.
7. **Broader human workflow:** assignment, notification, expiry/escalation and mobile parity beyond the implemented browser review lifecycle.
8. **Independent assessment:** threat model, architecture review, penetration test, cryptographic review, supply-chain review and privacy/legal assessment of the deployed Hub.

## Recommended delivery waves

### Wave 0 - Product validation

- Run five executive and five technical usability sessions.
- Confirm that users distinguish `allowed` from `verified` and understand `mismatch` and `inconclusive`.
- Measure time to first governed capability, setup error rate and explanation comprehension.

### Wave 1 - Deployment validation

- Provision OIDC, managed PostgreSQL, remote signer and a tenant-aware adapter.
- Run the migration/RLS, browser, cross-tenant, restore and failure-mode evidence plan.
- Keep the execution runtime and consequential tool paths outside this Hub admission.

### Wave 2 - Governed operations

- Connect exact-claim approval, one-time capability consumption, evidence export and incident holds.
- Add permission tests, audit records, pagination, redaction and negative multi-tenant tests.

### Wave 3 - Cloud reliability and cyber assurance

- Adopt managed database, queue, KMS/HSM, observability, backup, HA and recovery testing.
- Complete external security, cryptographic and supply-chain reviews.

### Wave 4 - Ecosystem publication

- Publish the npm package only after real integration and security gates pass.
- Then request n8n community-node verification and submit governed workflow templates.
- Expand to Copilot Studio, Dify, LangGraph and similar platforms through the same contracts.

## Promotion sequence

1. Lead with one sentence: **'Allowed is not verified.'**
2. Show the two-minute contrast: direct tool execution versus governed execution with authoritative outcome verification.
3. Publish a short Executive explainer and a separate technical deep dive with contracts and traces.
4. Open an n8n community discussion for architecture feedback, not a verification request.
5. Recruit three to five design partners with one disposable workflow and one reversible or mock action.
6. Publish measured findings: comprehension, integration effort, latency by decision path, bypass findings and outcome-verification coverage.

## Current go/no-go decision

- **Go:** public product preview, hands-on demos, UX research, design-partner pilots with synthetic or disposable data.
- **Conditional go:** deploy the Hub control plane to staging after its external dependencies and negative tests are available.
- **No-go until external evidence:** production admission of the Hub deployment, consequential production actions, use of the preview Gateway as a tenant adapter, browser-held Gateway tokens, or claims that the execution runtime is production-ready.
