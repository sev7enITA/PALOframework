# PALO MCP reference server — Developer Preview

This package is the non-production reference implementation shipped with PALO-AI v2.5. It demonstrates the official MCP SDK over stdio and experimental bearer-authenticated Streamable HTTP, Action Claim 1.2, Effect Contracts, one-time capabilities, trusted in-process executors, authoritative verifiers, signed receipts, outcome attestations, assurance incidents and a hash-chained SQLite ledger.

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

## Local validation

```bash
npm ci
npm run opa:install
npm run validate:agentic
```

Passing the included tests confirms the documented reference behavior only; it does not establish production readiness.
