# PALO Agentic Interface (PALO-AI) — Full-Cycle Developer Preview

PALO-AI v2.5 publishes governance contracts and a non-production reference runtime for autonomous agents and agent teams. It demonstrates registered authority profiles, Action Claim 1.2, digest-bound approval, one-time execution capabilities, trusted receipts, authoritative outcome attestations and held assurance incidents.

> **Do not use this developer preview to authorize or execute production tools, access sensitive data, or support consequential decisions.** It is not an audited security boundary, compliance certification, exactly-once executor, production identity service, trusted human-approval system, or production evidence platform. Mode A is partially prototyped; Mode B collaborative agent teams remain specified only.

## Demonstrated trust model and missing production controls

- The reference API can register versioned agent profiles, executors and verifiers, but v2.5 does not authenticate distinct administrative roles or cryptographically attest publishers and connector binaries.
- Signing secrets stay in `PALO_HMAC_KEYS_JSON` or the deployment secret manager. Public profiles contain only a `keyId`.
- Dify and n8n are thin clients of the authenticated PALO gateway. They do not decide locally or sign evidence.
- OPA outages, malformed claims, missing adapters and failed authoritative reads fail closed. Exactly-once external execution is claimed only where the connector provides reliable idempotency; multi-replica durability remains future work.
- Tool arguments are schema-validated and their canonical digest is verified. Evidence is redacted; secrets must never be admitted by a tool argument schema.
- The default gateway binds to `127.0.0.1`. The included bearer token is a developer control only and does not provide principal identity, role separation, workload identity, reviewer authentication, administrative authorization, rotation, rate limiting, or TLS termination.
- For remote clients, use the repository's VPS topology and public HTTPS Gateway/MCP endpoints; `127.0.0.1` remains only the local default or a VPS-local administration binding.

## Canonical contracts

| Contract | Purpose |
| --- | --- |
| `schemas/palo-agentic-interface.schema.json` | Trusted identity and authority profile |
| `schemas/palo-agentic-action-claim.schema.json` | Expiring, replay-resistant proposed action |
| `schemas/palo-agentic-effect-contract.schema.json` | Preconditions, intended effects and forbidden effects |
| `schemas/palo-agentic-policy.schema.json` | Trusted versioned OPA policy registration |
| `schemas/palo-agentic-policy-input.schema.json` | Exact fail-closed OPA input envelope |
| `schemas/palo-agentic-policy-decision.schema.json` | OPA decision and obligations |
| `schemas/palo-agentic-approval.schema.json` | Human approval bound to an exact claim digest |
| `schemas/palo-agentic-evidence-envelope.schema.json` | Redacted, HMAC-signed, hash-chained audit event |
| `schemas/palo-agentic-execution-capability.schema.json` | Short-lived, one-time execution authority |
| `schemas/palo-agentic-execution-receipt.schema.json` | Trusted record of the actual execution attempt |
| `schemas/palo-agentic-outcome-attestation.schema.json` | Verified, mismatched or inconclusive observed outcome |
| `schemas/palo-agentic-assurance-incident.schema.json` | Human resolution record and resource hold |

## Run and validate

```bash
npm ci
npm run opa:install
.tools/opa/opa run --server examples/policy-as-code/agent-delegation.rego
```

In a second shell:

```bash
export PALO_OPA_URL=http://127.0.0.1:8181
export PALO_HMAC_KEYS_JSON='{"key-support-2026":"replace-with-at-least-32-secret-bytes"}'
npm run palo:mcp
```

Use `PALO_MCP_HTTP_TOKEN=... npm run palo:mcp:http` only for isolated testing of the experimental Streamable HTTP transport. Use `npm run palo:gateway` with a strong `PALO_GATEWAY_TOKEN` only for local evaluation of Web, Android, Dify and n8n examples. Run `npm run validate:agentic` to validate all twelve contracts, compile and test Rego, exercise both MCP transports, test replay, approval, governed execution, mismatch and incident behavior, and verify the SQLite hash chain. Passing these tests does not establish production readiness.

## MCP tools

The executable catalog is synchronized with `mcp-server-spec.json`:

- `palo_register_agent`
- `palo_register_policy`
- `palo_register_executor`
- `palo_register_verifier`
- `palo_get_registry`
- `palo_verify_action_authority`
- `palo_execute_governed_action`
- `palo_get_execution_status`
- `palo_verify_outcome`
- `palo_request_approval`
- `palo_get_approval_status`
- `palo_list_approvals`
- `palo_resolve_approval`
- `palo_submit_evidence`
- `palo_verify_evidence`
- `palo_verify_ledger`
- `palo_list_incidents`
- `palo_get_incident`
- `palo_resolve_incident`

An allowed policy decision remains only permission to attempt the action. Full-cycle assurance is established separately through the capability, trusted receipt and Outcome Attestation. The legacy `palo_submit_evidence` tool is retained for local compatibility, while the REST equivalent is disabled by default because caller-supplied success is not trusted evidence.

## Approval delivery boundary

The reference runtime provides a prototype approval state machine and MCP/gateway resolution endpoints. It does not provide authenticated reviewer identity, a production approval roster, sufficient human-readable action context, device attestation, or hosted push notifications. Web and mobile clients demonstrate the contract only; they must not be used for real authorization decisions.

## Known limitations before production use

- Separate and authenticate administrator, agent, reviewer, auditor, and connector roles.
- Replace the SQLite/outbox preview with PostgreSQL, durable work queues and explicit connector idempotency contracts.
- Revalidate claim expiry, current authority, policy version, and approval on every execution attempt.
- Attest executor and verifier workloads, protect their credentials and separate their identities from agent callers.
- Replace environment-only HMAC secrets with organization-owned key custody, rotation, revocation, and external anchoring.
- Replace self-attested Vibe Gate metadata with trusted signed gate evidence and an unavoidable tool proxy.
- Preserve the exact immutable claim across connector retries and approval resume.
- Implement the Mode B Team Registry, Shared Task Claim, peer assignment, leases, conflicts, and team evidence model.
- Complete threat modelling, security testing, observability, backup/restore, retention, incident response, and a distributed staging E2E.
