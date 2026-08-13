# PALO MCP reference server - Developer Preview

This package is the non-production reference implementation shipped with PALO-AI v2.5. It demonstrates the official MCP SDK over stdio and experimental bearer-authenticated Streamable HTTP, Action Claim 1.2, Effect Contracts, one-time capabilities, trusted in-process executors, authoritative verifiers, signed receipts, outcome attestations, assurance incidents and a hash-chained SQLite ledger.

PALO platform v3.0.1 also adds three read-only guide tools and the `palo_guide_agent` prompt. They explain the released PALO semantic model, infer a transparent starting route and plan a least-privilege product integration without mutating case state. See the [PALO Guide Agent and MCP Integration](../../docs/palo-guide-agent-and-mcp.md) guide. Keep these orientation tools separate from protected-action authorization and execution.

The VPS reference deployment defines a separately authenticated guide-only route at `https://governance.paloframework.org/mcp-guide`. It uses its own secret and sets `PALO_MCP_EXPOSED_TOOLS` to the three read-only guide tools, keeping framework orientation separate from the operational `/mcp` surface.

## Safety notice

Do not use this package to authorize or execute production tools, access sensitive data, or support consequential decisions. It is not an audited security boundary, universal exactly-once executor, production identity service, trusted approval service, compliance certification, or production evidence platform.

The following controls are not provided in v2.5:

- principal-level authentication and RBAC for administrators, agents, reviewers, auditors, and connectors;
- TLS termination, workload identity, token rotation, rate limiting, or network perimeter controls;
- production policy-bundle signing, distribution, attestation, rollback, or availability;
- a distributed transaction spanning external tools; exactly-once claims remain limited to connectors with reliable idempotency semantics;
- durable job leasing and crash recovery across multiple runtime replicas;
- production attestation of executor and verifier binaries, workloads or supply chains;
- KMS/HSM key custody, rotation, revocation, separation of duties, or external ledger anchoring;
- complete action context and authenticated reviewer identity for meaningful approval;
- trusted Vibe Gate attestation or an unavoidable pre-tool-call execution proxy;
- Mode B Team Registry, Shared Task Claims, peer coordination, leases, conflict handling, or team-level evidence;
- monitoring, backup/restore, retention, incident response, penetration testing, or distributed staging validation.

Use only isolated development data and unprivileged mock executors. Read the repository-level capability matrix and integration guide before running the server.

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
