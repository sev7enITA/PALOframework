# PALO-AI production-readiness plan

Status: remaining production-readiness plan for the v2.5 full-cycle developer preview, updated 19 July 2026. The presence of a target control or acceptance criterion below does not mean that it is implemented or production-ready. Refer to `agentic/capability-matrix.json`, `PALO_AgenticCapabilityMatrix.html` and `PALO_AIProductionReadiness.html` for the public evidence-based status. Internal assessment workpapers are not published.

The preview must not be used to authorize consequential tools or access sensitive production data. Production readiness requires closure of the documented correctness, identity, authorization, evidence, approval, connector, operations, security-testing, and collaborative-agent-team gaps.

## Target architecture

1. A single governance core owns schema validation, trusted registries, policy evaluation, replay controls, approvals, execution capabilities, outcome verification, incidents, signatures and evidence persistence.
2. The official MCP SDK exposes the same tool set over stdio and authenticated Streamable HTTP. The existing REST gateway remains a connector adapter, never a second policy engine.
3. The reference SQLite runtime demonstrates registries, replay state, approvals, decisions, a transactional outbox and an append-only evidence chain. The production target uses durable multi-instance state and managed key custody.
4. Canonical Action Claims include tool, operation, normalized resource/path/host, explicit network intent, validated arguments, nonce, idempotency key, monotonic sequence number and a resource-bound Effect Contract for full-cycle execution.
5. OPA Rego v1 receives a schema-validated input envelope and defaults to deny on missing, malformed or unavailable inputs.
6. Web and mobile use the same approval/profile/policy exchange contract. The runtime remains the authority and every resolution is bound to the exact claim digest.
7. Vibe Coding emits and verifies a governance claim before a coding tool call can execute.

## Remaining delivery sequence

- Add a same-origin Governance Hub BFF with OIDC, tenant context, scoped RBAC/ABAC and server-side Gateway credentials.
- Replace shared bearer identity, environment HMAC keys and SQLite with workload identity, KMS/HSM custody, PostgreSQL, durable queues/outbox and tested restore.
- Isolate and attest executor/verifier workloads and prove protected credentials cannot bypass the governed path.
- Authenticate policy distribution and record evaluated-bundle provenance; use mTLS where the deployment threat model requires it.
- Complete secure reviewer assignment/resume and mobile/web parity with meaningful, digest-bound context.
- Validate n8n package 0.2 on fresh supported canvases and reversible connectors before npm or template submission.
- Complete independent threat modelling, code/API penetration testing, cryptographic review and container/supply-chain assessment.

## Acceptance criteria

- No execution path bypasses schema validation, trusted profile lookup or OPA.
- Unknown tools, missing argument schemas, malformed claims, stale sequences, duplicate nonces and conflicting idempotency keys fail closed.
- Approval can transition once from pending to a terminal state and remains bound to one immutable claim digest.
- Evidence signatures and chain verification remain valid across restart, backup and restore; production keys remain outside the application host and support rotation and revocation.
- Stdio and authenticated Streamable HTTP advertise the same MCP tools.
- The E2E scenario proves register → deny → approval → capability → execute → receipt → persist → verify outcome → incident or release.
- The capability matrix distinguishes specified, prototype, implemented and production-ready without aspirational claims.
