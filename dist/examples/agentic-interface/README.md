# PALO Agentic Interface (PALO-AI) - Full-Cycle Developer Preview

PALO-AI v2.7 publishes governance and data-assurance contracts plus a non-production reference runtime for autonomous agents and agent teams. It demonstrates external context references, purpose-bound Data Fitness Decisions, signed Data Disclosure Contracts and Receipts, AI system registry, continuous invalidation, fail-closed Action Claim 1.4, durable approval and verification tasks, Effect Contract 1.1, one-time capabilities, authoritative outcome attestations and held incidents. Action Claim 1.1/1.2/1.3 remain compatible.

> **Do not use this developer preview to authorize or execute production tools, access sensitive data, or support consequential decisions.** It is not an audited security boundary, compliance certification, exactly-once executor, production identity service, trusted human-approval system, or production evidence platform. Mode A is partially prototyped; Mode B collaborative agent teams remain specified only.

## Demonstrated trust model and missing production controls

- The MCP Streamable HTTP resource can authenticate OIDC/JWKS principals and separate agent, reviewer, auditor, observer and administrator scopes. It does not issue tokens, implement EMA ID-JAG exchange, attest publishers/connectors/workloads, provide proof-of-possession or isolate production tenants. Action Claim 1.3 still requires a host-provided `authorityVerifier`; issuer labels alone fail closed.
- Internal contract signing secrets stay in `PALO_HMAC_KEYS_JSON` or the deployment secret manager. Evidence Envelope 2.0 can use an independently verifiable Ed25519 key, while production KMS/HSM custody remains outside this preview.
- Dify and n8n are thin clients of the authenticated PALO gateway. They do not decide locally or sign evidence.
- OPA outages, malformed claims, missing adapters and failed authoritative reads fail closed. Exactly-once external execution is claimed only where the connector provides reliable idempotency; multi-replica durability remains future work.
- Tool arguments are schema-validated and their canonical digest is verified. Evidence is redacted; secrets must never be admitted by a tool argument schema.
- The default gateway binds to `127.0.0.1`. The included bearer token is a developer control only and does not provide principal identity, role separation, workload identity, reviewer authentication, administrative authorization, rotation, transport-level rate limiting, or TLS termination.
- For remote clients, use the repository's VPS topology and public HTTPS Gateway/MCP endpoints; `127.0.0.1` remains only the local default or a VPS-local administration binding.

## Canonical contracts

| Contract | Purpose |
| --- | --- |
| `schemas/palo-agentic-interface.schema.json` | Trusted identity and authority profile |
| `schemas/palo-agentic-action-claim.schema.json` | Expiring, replay-resistant proposed action |
| `schemas/palo-agentic-effect-contract.schema.json` | Preconditions, intended effects and forbidden effects |
| `schemas/palo-agentic-policy.schema.json` | Trusted versioned OPA policy registration |
| `schemas/palo-agentic-policy-input.schema.json` | Exact fail-closed OPA input envelope |
| `schemas/palo-agentic-enforcement-provider.schema.json` | Vendor-neutral pre-action enforcement-provider manifest |
| `schemas/palo-agentic-policy-decision.schema.json` | Policy decision, obligations and provider evidence reference |
| `schemas/palo-agentic-approval.schema.json` | Human approval bound to an exact claim digest |
| `schemas/palo-agentic-evidence-envelope.schema.json` | Redacted, hash-chained HMAC 1.0 or RFC 8785/Ed25519 2.0 audit event |
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

Use `PALO_MCP_HTTP_TOKEN=... npm run palo:mcp:http` only for isolated shared-token testing, or configure the OIDC variables documented in [`packages/palo-mcp-server/README.md`](../../packages/palo-mcp-server/README.md) for the scoped resource-server path. Use `npm run palo:gateway` with a strong `PALO_GATEWAY_TOKEN` only for local evaluation of Web, Android, Dify and n8n examples. Run `npm run validate:agentic` to validate all thirteen contracts, compile and test Rego, exercise modern and legacy MCP transports, test replay, approval, governed execution, mismatch and incident behavior, and verify the SQLite hash chain. Passing these tests does not establish production readiness.

## Optional Microsoft AGT ACS provider

The [Microsoft AGT integration proposal](https://github.com/sev7enITA/PALOframework/tree/main/examples/agentic-interface/integrations/microsoft-agt) maps an immutable PALO Action Claim and digest-bound approval to ACS `pre_tool_call`, while PALO retains capability issuance, governed execution and authoritative outcome verification. It is optional, version-pinned and maintained by PALO; Microsoft has not endorsed or accepted it at the time of publication.

## MCP tools

The executable catalog is synchronized with `mcp-server-spec.json`:

- `palo_register_agent`
- `palo_explain_framework`
- `palo_infer_governance_route`
- `palo_plan_product_integration`
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
- `palo_get_assurance_task`
- `palo_list_assurance_tasks`
- `palo_process_due_tasks`
- `palo_get_operational_snapshot`
- `palo_submit_evidence`
- `palo_verify_evidence`
- `palo_verify_ledger`
- `palo_list_incidents`
- `palo_get_incident`
- `palo_resolve_incident`

An allowed policy decision remains only permission to attempt the action. Full-cycle assurance is established separately through the capability, trusted receipt and Outcome Attestation. The legacy `palo_submit_evidence` tool is retained for local compatibility, while the REST equivalent is disabled by default because caller-supplied success is not trusted evidence.

## Approval delivery boundary

The reference runtime provides a prototype approval state machine and MCP/gateway resolution endpoints. OIDC-protected MCP resolutions bind the reviewer to the verified token subject/client; the shared-token MCP fallback and REST Gateway do not. No path provides a production approval roster, sufficient human-readable action context, device attestation or hosted push notifications. Web and mobile clients demonstrate the contract only; they must not be used for real authorization decisions.

## Known limitations before production use

- Separate and authenticate administrator, agent, reviewer, auditor, and connector roles.
- Replace the single-instance SQLite/outbox/task preview with PostgreSQL, durable multi-replica leases and explicit connector idempotency contracts.
- Integrate the `authorityVerifier` with authenticated OIDC/workload-attestation material and separate transport roles.
- Attest executor and verifier workloads, protect their credentials and separate their identities from agent callers.
- Move HMAC and Ed25519 private material to organization-owned KMS/HSM custody, rotation, revocation and external anchoring.
- Replace self-attested Vibe Gate metadata with trusted signed gate evidence and an unavoidable tool proxy.
- Preserve the exact immutable claim across connector retries and approval resume.
- Implement the Mode B Team Registry, Shared Task Claim, peer assignment, leases, conflicts, and team evidence model.
- Connect the telemetry sink to OpenTelemetry with redaction, then complete threat modelling, security testing, backup/restore, retention, incident response, and a distributed staging E2E.
