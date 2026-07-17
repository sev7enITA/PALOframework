# PALO-AI production-readiness plan

Status: planning document for the v2.4.1 developer preview. The presence of a target control or acceptance criterion below does not mean that it is implemented or production-ready. Refer to `agentic/capability-matrix.json` for the current evidence-based status.

The preview must not be used to authorize consequential tools or access sensitive production data. Production readiness requires closure of the documented correctness, identity, authorization, evidence, approval, connector, operations, security-testing, and collaborative-agent-team gaps.

## Target architecture

1. A single governance core owns schema validation, trusted registries, policy evaluation, replay controls, approvals, signatures and evidence persistence.
2. The official MCP SDK exposes the same tool set over stdio and authenticated Streamable HTTP. The existing REST gateway remains a connector adapter, never a second policy engine.
3. SQLite provides transactional registries, replay state, approvals, decisions and an append-only evidence ledger. Signing keys remain outside profiles and persistent data.
4. Canonical Action Claims include tool, operation, normalized resource/path/host, explicit network intent, validated arguments, nonce, idempotency key and monotonic sequence number.
5. OPA Rego v1 receives a schema-validated input envelope and defaults to deny on missing, malformed or unavailable inputs.
6. Web and mobile use the same approval/profile/policy exchange contract. The runtime remains the authority and every resolution is bound to the exact claim digest.
7. Vibe Coding emits and verifies a governance claim before a coding tool call can execute.

## Delivery sequence

- Contract and storage migration with backward-incompatible schema version increments where needed.
- Runtime refactor and authenticated remote MCP transport.
- PALO-AM profile/decision import-export and approval operations.
- Vibe Coding pre-tool-call gate.
- OPA unit/negative tests and full runtime/MCP E2E test.
- Public capability matrix, changelog, release manifest and CI gates.
- Web build, Android asset synchronization, signed release build and publication package refresh.

## Acceptance criteria

- No execution path bypasses schema validation, trusted profile lookup or OPA.
- Unknown tools, missing argument schemas, malformed claims, stale sequences, duplicate nonces and conflicting idempotency keys fail closed.
- Approval can transition once from pending to a terminal state and remains bound to one immutable claim digest.
- Evidence is HMAC-signed over canonical JSON, hash chained and committed atomically with runtime state.
- Stdio and authenticated Streamable HTTP advertise the same MCP tools.
- The E2E scenario proves register → deny → approval → execute → sign → persist → verify.
- The capability matrix distinguishes specified, prototype, implemented and production-ready without aspirational claims.
