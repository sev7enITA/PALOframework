# PALO-AI hands-on demo — no slides

This runbook is designed for a **30–35 minute live session**. The audience first sees what happens when an agent calls a tool **without PALO**, then compares it with the same proposal through a real n8n governance gate, an authenticated PALO Gateway, an OPA/Rego decision, a human approval, a mock execution, signed evidence, replay protection and ledger verification.

The scenario is deliberately safe: a fictional support assistant asks to read a synthetic refund-policy document. No payment, customer system or production tool is called.

## The story in one sentence

> An agent may propose an action, but PALO decides whether the exact tool, scope and arguments are within authority, whether a human must approve, and what evidence must be retained before execution is allowed.

## What the audience should learn

1. Without a governance gate, possession of a tool or credential is enough for the mock action to execute.
2. With PALO, the agent does not decide its own authority.
3. The Action Claim makes intent inspectable: tool, operation, resource, path, network intent, arguments, nonce and sequence.
4. Policy has three visible outcomes: allowed, approval required or denied.
5. Approval binds to the digest of one immutable claim, not to a vague task.
6. Execution occurs only after an allowed decision.
7. Evidence is redacted, signed and appended to a verifiable ledger.

## Tonight: one-time preparation

From the repository root:

```bash
npm ci
npm run opa:install
cd packages/n8n-nodes-palo-ai
npm ci
npm run verify
cd ../..
```

Confirm Docker Desktop and the local n8n instance are running. The comparison workflow for the live session is:

```text
examples/hands-on-demo/PALO-AI-before-after-governance-demo.json
```

The original three-outcome workflow remains available at `examples/n8n-demo/PALO-AI-three-outcomes-demo.json`.

In n8n, configure the `PALO API` credential with:

- Gateway URL from Docker: `http://host.docker.internal:8787`
- Bearer token: the same local-only token used below

Do not use a production token or production data during the session.

## Tomorrow: start the live environment

Use three terminal tabs.

### Terminal A — OPA/Rego

```bash
cd /path/to/PALO
.tools/opa/opa run --server --addr=127.0.0.1:8181 \
  examples/policy-as-code/agent-delegation.rego
```

### Terminal B — PALO Gateway

Use these values only for the isolated demonstration:

```bash
cd /path/to/PALO
export PALO_OPA_URL='http://127.0.0.1:8181'
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
export PALO_HMAC_KEYS_JSON='{"key-support-2026":"palo-demo-only-signing-secret-material-32-bytes"}'
export PALO_DATA_DIR="${TMPDIR:-/tmp}/palo-ai-demo-$(date +%s)"
npm run palo:gateway
```

### Terminal C — pre-seed n8n and rehearse

```bash
cd /path/to/PALO
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
npm run demo:n8n:seed
npm run demo:hands-on -- --auto-approve
```

The rehearsal must end with:

```text
Demo complete: deny → approval → allow → mock execute → sign → persist → replay deny → verify.
```

Restart Terminal B with a new `PALO_DATA_DIR` after rehearsal. Seed the n8n profiles once more, then do not execute the workflow until the live session.

## Live session choreography

### 0:00–5:00 — Begin with “without PALO” versus “with PALO”

Open `PALO-AI — Without Governance vs Governed Action`. Do not begin with the website or a diagram.

Say:

> “Both branches begin with the same agent intention. On the upper branch the tool is connected directly, so possession becomes permission. On the lower branch PALO asks whether this exact action is authorized here and now.”

Ask someone in the audience to predict both outcomes. Execute the workflow once. Show:

- upper branch: the mock tool executes immediately, with no authority decision;
- lower branch: the supervised profile stops at `Approval Required`;
- the three PALO outputs remain visibly available for allow, approval or deny.

Do not describe the node as an unavoidable production boundary. State that this is a developer preview using mock actions.

### 5:00–9:00 — Inspect one Action Claim

Open the output of the amber PALO node. Point to:

- `agentId` and `caseId`;
- tool, operation, resource and normalized path;
- network intent;
- canonical argument and schema digests;
- nonce, idempotency key, sequence number and expiry;
- workflow and execution metadata.

Say:

> “The governance decision is made over this exact claim, not over the natural-language intention alone.”

### 9:00–13:00 — Move to the practical support case

In Terminal C run:

```bash
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
npm run demo:hands-on
```

The script first performs a direct mock read of a synthetic finance document. Point out the five lines showing what is absent: no profile check, no policy decision, no approval and no signed evidence. It then registers a versioned authority profile. Let the audience read the authority line: `read_file`, `read`, `/workspace/support-docs`, human validation required.

### 13:00–17:00 — Show default deny

The governed request asks for the same synthetic finance area, `/finance/private`, which is outside the registered scope. Pause on the red decision.

Say:

> “Without PALO the direct mock tool just read this area. With PALO the tool is valid, but authority is contextual: the same access is outside the support agent’s registered scope and is denied.”

### 17:00–23:00 — Human approval of the immutable claim

The second request is within scope and returns `pending_approval`. Read the claim ID and digest aloud. Before pressing Enter, ask a participant to act as reviewer and confirm:

- exact tool: `read_file`;
- exact scope: `/workspace/support-docs`;
- no external network;
- synthetic document only.

Press Enter. The script records reviewer identity and rationale, then resubmits the same claim and approval ID.

Say:

> “Approval is not permission for the agent in general. It is permission for this immutable action claim.”

### 23:00–28:00 — Execute, sign and persist

The mock executor reads `refund-policy.txt` only after PALO returns `allowed`. Show:

- execution result;
- evidence event ID;
- HMAC signature prefix;
- fictional customer email replaced by `[REDACTED]`;
- append-only ledger head.

### 28:00–32:00 — Replay attack and verification

The script creates a different claim reusing the approved nonce. PALO denies it as a replay, then verifies the ledger chain.

Close with:

> “PALO separates proposal, authority, approval, execution and evidence. The visible node is the user experience; the trusted profile, policy engine and protected execution path are the control plane.”

## Audience hands-on prompts

If time allows, ask participants to change one thing at a time and predict the result before running:

1. Change the requested scope to `/legal/private` — expected: denied.
2. Change the profile to `requireHumanValidation: false` — expected: allowed when all other authority checks pass.
3. Change `networkIntent` to `write` without an allowed host — expected: denied.
4. Reuse a nonce with a new claim ID — expected: denied as replay.
5. Remove OPA or use a malformed input — expected: fail closed.

Use a new `PALO_DATA_DIR` for each complete rehearsal so the n8n sequence numbers start from one.

## Recovery plan if a live component fails

- **n8n unavailable:** run `npm run demo:hands-on`; it still demonstrates the authenticated gateway, policy, approval, evidence and ledger path.
- **OPA unavailable:** show the fail-closed decision, explain why it is correct, restart Terminal A, and rerun with a fresh demo process.
- **Gateway port occupied:** run `lsof -nP -iTCP:8787 -sTCP:LISTEN`, stop the old demo process, then restart.
- **Replay/sequence error during rehearsal:** restart the gateway with a new `PALO_DATA_DIR` and reseed profiles.
- **Network unavailable:** the entire demo is local and needs no external API.

## Non-negotiable disclaimer

This is a developer preview for isolated evaluation. The shared bearer-token gateway, local HMAC key, mock executor and manual reviewer are not a production identity, key-management, authorization or approval boundary. Production adoption still requires workload identity, RBAC, protected credentials, tenant isolation, KMS/HSM, high availability and independent security assessment.

## n8n operational references

- [Export and import workflows](https://docs.n8n.io/workflows/export-import/)
- [Install community nodes through the n8n GUI](https://docs.n8n.io/integrations/community-nodes/installation/gui-install/)
- [Run n8n with Docker](https://docs.n8n.io/hosting/installation/docker/)
- [Run the n8n security audit](https://docs.n8n.io/hosting/securing/security-audit/)
