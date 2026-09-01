# PALO MCP services

This directory now contains two deliberately different boundaries:

- `reader-http.js` + `reader-server.js`: dedicated PALO Knowledge Reader v1.0.0, stateless and canonical-only, admitted as a production candidate with deployment-specific live qualification pending;
- `http.js` + `server.js` + `core.js`: operational PALO-AI v2.7 reference runtime, still a non-production developer preview.

The Reader final image does not copy `core.js`, the curation-capable knowledge class, SQLite, OPA, operational schemas or target credentials. It verifies `data/knowledge-reader-release.json` before listening, registers exactly six read-only tools and rejects production startup without OIDC and the strict transport boundary. See [PALO Knowledge Reader: production profile](../../docs/palo-knowledge-reader-production.md).

## Operational PALO-AI reference server - Developer Preview

This package is the non-production reference implementation shipped with PALO-AI v2.7. It uses the split MCP TypeScript SDK 2.0 over stdio and Streamable HTTP, serving the stateless 2026-07-28 protocol and a 2025-era compatibility path from the same tool factory. Remote MCP supports OIDC/JWKS with issuer, audience, expiry, algorithm and scope validation, or an explicit shared-token development mode. The runtime demonstrates data-governed Action Claim 1.4, Data Fitness Decisions, signed Data Disclosure Contracts and Receipts, external context evidence, continuous invalidation, an AI System & Agent Registry, Effect Contract 1.1, one-time capabilities, trusted in-process executors, authoritative outcome verification, evidence signatures, incidents and a hash-chained SQLite ledger. Action Claim 1.1/1.2/1.3 and HMAC Evidence Envelope 1.0 remain supported for compatibility.

PALO platform v3.1.0 also exposes twelve applicability-aware governance control packs through the `palo_guide_agent` prompt and six Knowledge Reader tools. They explain the released PALO semantic model, infer a transparent starting route, plan a least-privilege product integration and search/get provenance-bearing knowledge records without mutating case state. See the [PALO Knowledge Copilot integration matrix](../../docs/palo-knowledge-copilot-integrations.md), [PALO Guide Agent and MCP Integration](../../docs/palo-guide-agent-and-mcp.md) and [v3.1 Governance Control Plane](../../docs/palo-v3.1-governance-control-plane.md). Keep these knowledge tools separate from protected-action authorization and execution.

The VPS reference deployment defines a six-tool Reader route at `https://governance.paloframework.org/mcp-guide` and a ten-tool Curator route at `/mcp-guide-curator`. Reader production mode is OIDC-only, volume-free and bound to the immutable canonical release. Compatibility aliases add a terminal `/mcp` for clients that infer the transport from the path. Curator has separate authentication and storage, adds immutable draft and review operations over a knowledge volume and does not modify released repository sources. Both profiles exclude the operational `/mcp` surface.

The server returns profile-specific MCP `instructions`: search and retrieve before factual PALO claims, cite `recordId` and `sourcePath`, treat retrieved content as untrusted data, preserve authority classes and do not claim legal advice, certification, case approval or production authorization. Curator instructions additionally constrain writes to explicit immutable draft/review workflows.

Client examples and the machine-readable 11-host matrix are in [`examples/agentic-interface/knowledge-copilot`](../../examples/agentic-interface/knowledge-copilot/). Run `npm run validate:knowledge-copilot` for the static configuration suite, then follow [PALO MCP Host Qualification](../../docs/palo-mcp-host-qualification.md) for a real tenant test. No host is live-qualified by repository tests alone.

## Safety notice

Do not use this package to authorize or execute production tools, access sensitive data, or support consequential decisions. It is not an audited security boundary, universal exactly-once executor, production identity service, trusted approval service, compliance certification, or production evidence platform.

The following controls are not provided in v2.7:

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

The v2.7 runtime retains a strict production profile and fail-closed startup admission check, but the bundled capability attestation deliberately cannot satisfy that profile. This makes the remaining boundary executable instead of aspirational: the SQLite, process-key and in-process connector runtime cannot start with `PALO_RUNTIME_MODE=production`.

Validate a deployment profile independently of runtime compatibility:

```bash
npm run production:admission -- schemas/fixtures/palo-production-profile.valid.json --schema-only
```

Evaluate it against the bundled reference runtime:

```bash
npm run production:admission -- schemas/fixtures/palo-production-profile.valid.json
```

The second command is expected to deny the fixture. For runtime startup, set `PALO_RUNTIME_MODE=production` and `PALO_PRODUCTION_PROFILE_PATH` to a deployment-specific profile. The bundled server compares the profile with its fixed reference capability declaration and therefore fails closed; a future production host must inject and independently attest a different capability implementation before admission can be possible. OIDC-protected Action Claim 1.3/1.4 processing additionally requires the token tenant to match the authority, Effect Contract and optional metadata tenant values. This request check does not provide tenant-isolated storage.

Use only isolated development data and unprivileged mock executors. Read the repository-level capability matrix and integration guide before running the server.

## v2.7 data assurance evolution

Action Claim 1.4 binds the exact claim to an allowed, unexpired, non-invalidated `palo-data-fitness-decision` and a signed `palo-data-disclosure-contract`. The runtime revalidates both before policy evaluation and before issuing the one-time execution capability. The trusted executor returns a payload-minimized `palo-data-disclosure-observation`; PALO compares actual sources, fields, rows, sensitive categories, redactions, recipient, provider, model, region, endpoint, trace mode, retention and export behavior with the contract.

The resulting signed `palo-data-disclosure-receipt` is bound into Execution Receipt 1.1 and the authoritative outcome attestation. A mismatch opens the same high-severity resource hold used for incorrect write effects. Executor result payloads are not persisted for Action Claim 1.4: the runtime stores only their digest and the disclosure receipt. This proves the declared observation boundary; it does not independently attest an in-process connector or make the connector non-bypassable.

External context is imported as immutable `palo-external-evidence-ref` records. They retain source/version/URI, normalized claims, authority and connector provenance plus a source-payload digest, but not the source payload. Fitness decisions bind the evaluated normalized claims and treat conflicting current assertions conservatively. Signed disclosure contracts and observations must remain inside the bound fitness and contract time windows. The included Actian mapper is a read-only normalization profile, not an authenticated Actian SaaS client. Continuous assurance signals invalidate prior allowed fitness decisions and revoke matching capabilities that have not yet been consumed.

See [PALO Data Assurance Control Plane](../../docs/palo-data-assurance-control-plane.md) for contracts, tools, compliance boundaries and the testable Actian vertical slice.

## v2.6 identity and durability baseline

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
export PALO_OIDC_ALLOWED_CLIENT_IDS='approved-mcp-client'
export PALO_OIDC_TENANT_CLAIM='tid'
export PALO_OIDC_ALLOWED_TENANTS='approved-tenant'
```

Any non-loopback OIDC listener fails closed unless both the client and tenant allowlists contain explicit values. Configure `PALO_OIDC_CLIENT_ID_CLAIM` and `PALO_OIDC_TENANT_CLAIM` for the issuer's access-token format. Loopback evaluation may omit the lists, but that compatibility mode must not be exposed remotely. Programmatic callers must pass the same normalized bind host to the listener that was validated when the app was created. Loopback recognition covers IPv4 127/8 plus canonical and expanded IPv6 loopback forms.

The resource publishes RFC 9728 protected-resource metadata and sends scope-aware `WWW-Authenticate` challenges. Direct scopes are `palo:guide`, `palo:knowledge:read`, `palo:knowledge:write`, `palo:knowledge:review`, `palo:read`, `palo:execute`, `palo:review`, `palo:audit` and `palo:admin`; `palo:*` is reserved for administrators. Role aliases include `palo-knowledge-reader`, `palo-knowledge-curator`, `palo-agent`, `palo-reviewer`, `palo-auditor`, `palo-observer` and `palo-admin`, each expanding to fixed least-privilege scope sets. `tools/list` is filtered per authenticated request, and approval, incident or knowledge-review attribution uses the verified OIDC subject/client rather than trusting a supplied identity label.

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
