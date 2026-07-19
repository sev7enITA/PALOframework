# PALO-AI v2.5 hands-on demo — permission is not correctness

This no-slides demonstration compares a direct agent tool call with full-cycle assurance over a synthetic multi-tenant catalog. It uses no production system, personal data or consequential action.

## What the audience sees

1. **Without PALO:** the agent has a tool, so the update executes. There is no authority decision and nobody verifies whether the catalog now reflects the intended result.
2. **With PALO:** the same intent becomes Action Claim 1.2 plus an Effect Contract.
3. Policy requests human approval for the exact immutable claim.
4. PALO issues and consumes a one-time capability, then invokes its trusted synthetic executor.
5. A separate verifier reads authoritative post-state.
6. The outcome is `verified`, `mismatch` or `inconclusive`—not merely `allowed`.
7. Mismatch and uncertainty open an Assurance Incident and hold the affected resource.

## Start the environment

Terminal A:

```bash
cd /path/to/PALO
npm ci
npm run opa:install
.tools/opa/opa run --server --addr=127.0.0.1:8181 \
  examples/policy-as-code/agent-delegation.rego
```

Terminal B:

```bash
cd /path/to/PALO
export PALO_OPA_URL='http://127.0.0.1:8181'
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
export PALO_HMAC_KEYS_JSON='{"key-catalog-demo":"palo-demo-only-signing-secret-material-32-bytes"}'
export PALO_ENABLE_DEMO_CATALOG='true'
export PALO_DATA_DIR="${TMPDIR:-/tmp}/palo-assurance-demo-$(date +%s)"
npm run palo:gateway
```

Terminal C:

```bash
cd /path/to/PALO
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
npm run demo:hands-on
```

Use `--auto-approve` for rehearsal. Use a fresh Gateway data directory for every complete run because replay sequence state is persistent.

## Three practical runs

### Verified outcome

```bash
npm run demo:hands-on -- --auto-approve
```

Expected ending: signed receipt, `verified` attestation, valid ledger and no incident.

### Authorized, but wrong

Restart Terminal B with a fresh `PALO_DATA_DIR`, then run:

```bash
npm run demo:hands-on -- --auto-approve --wrong-effect
```

The executor intentionally writes price `130` although the Effect Contract requires `120`. Policy authorization succeeds, but the verifier emits `mismatch`, creates an incident and applies a resource hold.

### Stale state before execution

Restart the Gateway again, then run:

```bash
npm run demo:hands-on -- --auto-approve --stale-state
```

The authoritative catalog version no longer matches the proposal. PALO revokes the capability and prevents the tool call before execution.

## n8n visual demonstration

Build package 0.2:

```bash
cd packages/n8n-nodes-palo-ai
npm ci
npm run verify
npm pack
```

Install the generated tarball in a disposable self-hosted n8n instance and import:

```text
examples/n8n-demo/PALO-AI-full-cycle-assurance-demo.json
```

Configure `PALO API` with:

- Gateway URL from n8n Docker: `http://host.docker.internal:8787`
- Bearer token: `palo-demo-only-gateway-token-32-bytes`

The first run routes to Review Required. Resolve its approval through the demo API or PALO review surface, then change the node operation to **Resume Approved Action** and paste the exact claim and approval ID. Never regenerate the claim after approval.

## Presenter close

> Authorization answers whether an action may be attempted. PALO full-cycle assurance adds a different question: did the protected action actually produce the declared effect? The answer is independently observable as verified, mismatched or inconclusive.

## Safety boundary

The shared token, SQLite database, environment HMAC key and in-memory catalog are demonstration mechanisms. Do not expose them to production traffic or real data. Production use requires workload identity, scoped RBAC, protected connectors, KMS/HSM, durable distributed processing, HA, monitoring and independent security review.
