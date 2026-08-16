# PALO MCP reference server - Developer Preview

This package is the non-production reference implementation shipped with PALO-AI v2.6. It uses the split MCP TypeScript SDK 2.0 over stdio and Streamable HTTP, serving the stateless 2026-07-28 protocol and a 2025-era compatibility path from the same tool factory. Remote MCP supports OIDC/JWKS with issuer, audience, expiry, algorithm and scope validation, or an explicit shared-token development mode. The runtime demonstrates identity-bound Action Claim 1.3, Effect Contract 1.1, durable approval and verification tasks, runtime guardrails, one-time capabilities, trusted in-process executors, authoritative verifiers, signed receipts, optional RFC 8785/Ed25519 evidence envelopes, outcome attestations, assurance incidents and a hash-chained SQLite ledger. Action Claim 1.1/1.2 and HMAC Evidence Envelope 1.0 remain supported for compatibility.

PALO platform v3.0.1 also adds three read-only guide tools and the `palo_guide_agent` prompt. They explain the released PALO semantic model, infer a transparent starting route and plan a least-privilege product integration without mutating case state. See the [PALO Guide Agent and MCP Integration](../../docs/palo-guide-agent-and-mcp.md) guide. Keep these orientation tools separate from protected-action authorization and execution.

The VPS reference deployment defines a separately authenticated guide-only route at `https://governance.paloframework.org/mcp-guide`. It uses its own secret and sets `PALO_MCP_EXPOSED_TOOLS` to the three read-only guide tools, keeping framework orientation separate from the operational `/mcp` surface.

## Safety notice

Do not use this package to authorize or execute production tools, access sensitive data, or support consequential decisions. It is not an audited security boundary, universal exactly-once executor, production identity service, trusted approval service, compliance certification, or production evidence platform.

The following controls are not provided in v2.6:

- an authorization server, interactive OAuth login, EMA ID-JAG exchange, proof-of-possession, workload attestation, token issuance or rotation; OIDC mode is the MCP resource-server side of that architecture;
- TLS termination, device/session assurance, rate limiting, tenant data isolation, or network perimeter controls;
- production policy-bundle signing, distribution, attestation, rollback, or availability;
- a distributed transaction spanning external tools; exactly-once claims remain limited to connectors with reliable idempotency semantics;
- durable approval and verification tasks are single-instance; job leasing and crash recovery across multiple runtime replicas are not provided;
- production attestation of executor and verifier binaries, workloads or supply chains;
- KMS/HSM key custody, rotation, revocation, separation of duties, or external ledger anchoring;
- complete action context and authenticated reviewer identity outside the OIDC-protected MCP surface; the Gateway and demo routes retain their separately documented preview authentication;
- trusted Vibe Gate attestation or an unavoidable pre-tool-call execution proxy;
- Mode B Team Registry, Shared Task Claims, peer coordination, leases, conflict handling, or team-level evidence;
- monitoring, backup/restore, retention, incident response, penetration testing, or distributed staging validation.

Use only isolated development data and unprivileged mock executors. Read the repository-level capability matrix and integration guide before running the server.

## v2.6 assurance evolution

Action Claim 1.3 adds a human principal, workload identity, credential digests, agent instance and contiguous delegation chain. The runtime validates issuer/audience constraints, delegation time windows, non-widening scopes, tenant binding and terminal agent identity before policy evaluation. Configure trust constraints with `PALO_IDENTITY_POLICY_JSON` and provision an `authorityVerifier` callback in the runtime host to validate the bound credential digests against authenticated or attested material obtained out of band. Claim 1.3 fails closed when that verifier is absent; declared issuer strings alone never authorize an action.

Effect Contract 1.1 adds `notExists`, `numberWithin`, `containsAll` and `typeIs`, delayed verification, retry metadata and an explicit compensation proposal. Compensation is never executed implicitly: it always requires a new governed Action Claim.

Approval and delayed outcome verification are persisted as `palo-assurance-task` records. Use the task MCP tools or `/v1/tasks` Gateway endpoints to inspect and process due work. The Gateway polls due work every `PALO_TASK_POLL_INTERVAL_MS` and prevents overlapping polls inside one process. The MCP transport now supports 2026-07-28 and legacy clients, but these domain records are not yet implemented through the standard MCP Tasks extension or MRTR elicitation, and they have no multi-replica lease.

Set `PALO_EVIDENCE_ED25519_JSON` to an object containing `keyId`, `verificationMethod`, `privateKey` and `publicKey` to emit Evidence Envelope 2.0. The envelope uses RFC 8785 canonicalization and Ed25519; verifiers must obtain the public key through a trusted channel. Retain rotated verification keys through `PALO_EVIDENCE_PUBLIC_KEYS_JSON`. Internal execution capabilities, receipts and attestations continue to use the profile HMAC key in this increment.

Verify an exported envelope without opening the runtime database:

```bash
npm run palo:evidence:verify -- evidence-envelope.json trusted-public-key.pem
```

The runtime emits redacted lifecycle events through an optional telemetry sink and exposes an operational snapshot. Set `PALO_OTEL_ENABLED=true` to translate those events into bounded OpenTelemetry spans correlated by the PALO trace ID. Only allowlisted identifiers and lifecycle fields are emitted. The package installs the OpenTelemetry API, not an SDK, sampler or exporter; the host must register those components.

## MCP 2026 and OIDC resource-server mode

The TypeScript SDK defaults clients to the legacy handshake, so conformance tests explicitly cover both a pinned `2026-07-28` client and legacy 2025 clients. Modern HTTP requests are stateless and the SDK validates the protocol, method and tool-name headers against the body metadata.

Shared-token mode remains available for isolated development with `PALO_MCP_HTTP_TOKEN`. For an externally reachable MCP resource, configure OIDC instead:

```bash
export PALO_AUTH_MODE='oidc'
export PALO_MCP_PUBLIC_URL='https://governance.example.org/mcp'
export PALO_OIDC_ISSUER='https://identity.example.org'
export PALO_OIDC_AUDIENCE='https://governance.example.org/mcp'
export PALO_OIDC_JWKS_URI='https://identity.example.org/.well-known/jwks.json'
export PALO_OIDC_ALGORITHMS='RS256 PS256 ES256 EdDSA'
```

The resource publishes RFC 9728 protected-resource metadata and sends scope-aware `WWW-Authenticate` challenges. Direct scopes are `palo:guide`, `palo:read`, `palo:execute`, `palo:review`, `palo:audit` and `palo:admin`; `palo:*` is reserved for administrators. Role aliases `palo-agent`, `palo-reviewer`, `palo-auditor`, `palo-observer` and `palo-admin` expand to fixed least-privilege scope sets. `tools/list` is filtered per authenticated request, and approval or incident resolution records the verified OIDC subject/client rather than trusting the supplied identity label.

This is compatible with access tokens issued by an EMA-capable authorization server, but PALO does not implement the Enterprise-Managed Authorization ID-JAG exchanges itself.

## Full-cycle reference demo

Start OPA, then run the Gateway with the synthetic catalog adapter:

```bash
export PALO_OPA_URL='http://127.0.0.1:8181'
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
export PALO_HMAC_KEYS_JSON='{"key-catalog-demo":"palo-demo-only-signing-secret-material-32-bytes"}'
export PALO_ENABLE_DEMO_CATALOG='true'
npm run palo:gateway
```

In another terminal run `npm run demo:hands-on -- --auto-approve`. Add `--wrong-effect` to demonstrate an authorized action that produces a mismatched outcome and a held Assurance Incident.

On Gateway startup, `executing/pending` outbox rows older than `PALO_EXECUTION_RECOVERY_AGE_MS` (30 seconds by default) are recovered fail-closed. The runtime creates a signed `unknown` receipt, an inconclusive attestation, and a held incident. Rows with a recorded receipt but no attestation resume outcome verification. This protects the reference single-instance lifecycle after interruption; it is not multi-replica leasing or a universal exactly-once guarantee.

## Vendor-neutral enforcement providers

OPA remains the default policy evaluator. The runtime now accepts a versioned `palo-agentic-enforcement-provider` implementation and records its provider, version, policy reference and optional decision/evidence references in each Policy Decision.

The first optional provider maps PALO Action Claims to Microsoft Agent Governance Toolkit ACS `pre_tool_call`. It is a PALO-maintained interoperability proposal, not a Microsoft-maintained or endorsed integration. The upstream package is loaded only when selected and is not a mandatory PALO dependency.

```bash
npm install --no-save --package-lock=false agent-control-specification@0.3.1-beta.0
npm run demo:microsoft-agt
```

See the [PALO + Microsoft AGT quickstart](https://github.com/sev7enITA/PALOframework/tree/main/examples/agentic-interface/integrations/microsoft-agt) for the environment configuration, trust boundaries and upgrade policy.

## Local validation

```bash
npm ci
npm run opa:install
npm run validate:agentic
```

Passing the included tests confirms the documented reference behavior only; it does not establish production readiness.
