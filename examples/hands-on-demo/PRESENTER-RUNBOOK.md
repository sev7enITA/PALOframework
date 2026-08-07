# PALO-AI live demo presenter runbook

## Purpose

This is a 25–30 minute, no-slides demonstration of the difference between direct agent tool access and a PALO-AI governed execution path.

The scenario uses synthetic files, a mock executor and local demonstration credentials. It does not call a production system or prove that PALO-AI is already a production authorization boundary.

## The message to leave with the audience

> Without PALO-AI, possession of a tool or credential can become permission. With PALO-AI, the agent proposes an action, while authority, policy, human oversight and evidence are handled through an explicit and reviewable control path.

## What will be visible

Keep these windows ready before the audience enters:

1. The PALO-AI comparison infographic, full screen.
2. The n8n workflow `PALO-AI — Without Governance vs Governed Action`.
3. Terminal A running OPA/Rego.
4. Terminal B running the PALO Gateway.
5. Terminal C at the repository root, ready to run the hands-on case.

Use a fresh `PALO_DATA_DIR` for the live run. Increase the terminal font size and hide notifications, unrelated tabs, tokens and shell history.

## One-time preparation

From the repository root:

```bash
npm ci
npm run opa:install
cd packages/n8n-nodes-palo-ai
npm ci
npm run verify
cd ../..
```

Import this workflow into n8n:

```text
examples/hands-on-demo/PALO-AI-before-after-governance-demo.json
```

Configure the n8n `PALO API` credential:

- Gateway URL from Docker: `http://host.docker.internal:8787`
- Bearer token: `palo-demo-only-gateway-token-32-bytes`

Never use production data or a production credential in this demonstration.

## Start the environment

### Terminal A — policy engine

```bash
cd /path/to/PALO
.tools/opa/opa run --server --addr=127.0.0.1:8181 \
  examples/policy-as-code/agent-delegation.rego
```

Expected visible signal: OPA listens on `127.0.0.1:8181` without policy parsing errors.

### Terminal B — PALO Gateway

```bash
cd /path/to/PALO
export PALO_OPA_URL='http://127.0.0.1:8181'
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
export PALO_HMAC_KEYS_JSON='{"key-support-2026":"palo-demo-only-signing-secret-material-32-bytes"}'
export PALO_DATA_DIR="${TMPDIR:-/tmp}/palo-ai-live-demo-$(date +%s)"
npm run palo:gateway
```

Expected visible signal: the gateway starts on `127.0.0.1:8787` and connects to OPA.

### Terminal C — seed the n8n profiles

```bash
cd /path/to/PALO
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
npm run demo:n8n:seed
```

Expected output:

```text
Registered agent-demo-autonomous
Registered agent-demo-supervised
Registered agent-demo-restricted
n8n demo profiles are ready.
```

Do not run the workflow before the live session. If you rehearse, restart Terminal B with a new `PALO_DATA_DIR` and seed the profiles again.

---

# Live presentation

## 0:00–2:30 — Frame the problem with the infographic

### Show

Open the comparison infographic full screen.

### Say

> “This slide compares the same agent action across two fundamentally different control paths. The action could be reading a restricted file, updating a record or calling an external API.”

> “On the left, the agent can reach the operational tool directly. If a credential is available, the tool can execute. There is no independent authority profile, no contextual policy decision, no action-bound approval, no replay protection and no signed evidence chain. Possession can become permission.”

> “On the right, the proposal is converted into an explicit Action Claim. PALO validates its structure, resolves a trusted authority profile, evaluates policy, requests human approval when required, and allows only the exact authorized action to reach the governed executor. The resulting evidence is signed and persisted.”

> “The core difference is not whether the agent is intelligent. The difference is whether its authority is explicit, contextual and independently reviewable.”

### Point to

- The common `Agent Action Proposal` at the top.
- `Possession becomes permission` on the left.
- The three policy outcomes: `Allowed`, `Approval Required`, `Denied`.
- The final signed evidence and ledger stage.

### Transition

> “Now I will run both control paths, starting with the visual workflow.”

## 2:30–6:00 — Compare both paths in n8n

### Show

Open the n8n workflow `PALO-AI — Without Governance vs Governed Action`.

### Say before execution

> “Both branches start from the same workflow trigger. The upper branch connects the proposal directly to a mock tool. The lower branch sends the proposal to the PALO Governance node.”

> “Before I run it, predict the outcomes. Which branch can continue immediately, and which branch should stop for review?”

### Do

1. Click `Execute workflow`.
2. Follow the upper branch first.
3. Open `Direct Mock Tool — Executes Immediately` and show that it ran.
4. Return to the canvas.
5. Follow the lower branch.
6. Open `WITH PALO — Governance Gate`.
7. Show that the supervised profile routes the proposal to `Approval Required — Stop and Review`.

### Say

> “The upper branch executes because nothing asks whether the action is authorized. The lower branch does not treat access as authority. The current profile requires a human decision before execution.”

> “The node has three explicit outputs. An allowed action may continue to a protected executor. A reviewable action stops for approval. A denied action must not reach the tool.”

### Important qualification

> “This visual branch uses mock actions. It demonstrates the integration pattern, not an unavoidable production security boundary.”

## 6:00–9:00 — Inspect the Action Claim

### Do

Open the PALO node output and expand the normalized claim.

### Point to

- `agentId` and `caseId`;
- tool and operation;
- resource and normalized path;
- network intent;
- arguments and schema digests;
- nonce and idempotency key;
- sequence number;
- requested and expiry timestamps;
- workflow and execution metadata.

### Say

> “PALO does not evaluate a vague natural-language intention. It evaluates this exact, structured claim.”

> “The claim describes who is proposing the action, which tool and operation are requested, which resource and path are affected, whether network access is involved, and the validated arguments.”

> “Nonce, idempotency key, sequence number and expiry make the request traceable and help prevent duplicate or replayed execution.”

### Transition

> “The workflow makes the control path visible. The terminal case now demonstrates the same controls end to end.”

## 9:00–12:00 — Prove what happens without PALO

### Do in Terminal C

```bash
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
npm run demo:hands-on
```

The script pauses only when it reaches the human approval step.

### Show

Pause after section `0. WITHOUT PALO — the agent calls the tool directly`.

Point to:

```text
Direct mock tool executed: true
Authority profile checked: no
Policy decision: none
Human approval: none
Signed evidence: none
```

### Say

> “This is a synthetic finance document and a mock read, but the control problem is real. The tool had access, so the action succeeded. Nothing checked whether a support agent was authorized to read that area.”

> “There is no independent decision to review later, and no signed evidence proving why the action was allowed.”

## 12:00–15:00 — Register contextual authority

### Show

Continue to section `1. Register a trusted authority profile`.

Point to:

- the unique agent identifier;
- the profile digest;
- `read_file`;
- operation `read`;
- scope `/workspace/support-docs`;
- `human validation required`.

### Say

> “PALO now registers a versioned authority profile. This support assistant may use `read_file`, but only for read operations inside `/workspace/support-docs`, and the profile requires human validation.”

> “Authority is therefore not a generic property of the agent. It is a relationship between identity, tool, operation, resource, scope and context.”

## 15:00–18:00 — Show default deny for an out-of-scope action

### Show

Pause on section `2. Attempt an action outside the registered scope` and the red PALO decision.

### Say

> “The agent proposes the same finance-area access that succeeded on the direct path. The tool name is valid, but the requested path is outside the registered support scope.”

> “PALO denies the action. The decision is fail closed: an absent profile, malformed input, unavailable policy decision or unauthorized scope must not silently become permission.”

### Emphasize

> “This is the most important before-and-after moment: without PALO, the synthetic access succeeded; with PALO, the same out-of-scope access is denied before execution.”

## 18:00–22:00 — Request and perform human approval

### Show

The next request targets `/workspace/support-docs/refund-policy.txt` and returns `pending_approval`.

Point to:

- the approval ID;
- the immutable claim digest;
- the pending state;
- the bound claim ID and digest.

### Say

> “This action is within the registered scope, but the profile requires human oversight. PALO therefore creates an approval request instead of executing the tool.”

> “The approval is not permission for the agent in general. It is bound to this exact immutable claim digest.”

### Ask a participant

> “Please act as the reviewer. Are you approving `read_file`, for this synthetic support document, with no external network access and no broader scope?”

### Do

Press Enter only after the reviewer answers.

### Show

Point to:

- `Approval state: approved`;
- reviewer identity;
- the recorded rationale.

### Say

> “The reviewer identity and rationale are now part of the decision record. Changing the tool, path or arguments would produce a different claim digest and require a new decision.”

## 22:00–25:00 — Resume, execute and create evidence

### Show

Follow sections `5. Resume the same claim and execute only after allow` and `6. Sign and append execution evidence`.

Point to:

- `PALO decision: allowed`;
- `Mock tool executed`;
- evidence event ID;
- signature prefix;
- `[REDACTED]` customer email;
- append-only ledger record.

### Say

> “The exact approved claim is evaluated again. Only after an authoritative `allowed` decision does the mock executor read the synthetic support document.”

> “PALO then canonicalizes the evidence payload, redacts the fictional email, signs the event with the demonstration HMAC key and appends it to the ledger.”

> “In this preview, HMAC is used for the live demonstration. Production adoption would require protected workload identity, managed keys and an independently assessed execution boundary.”

## 25:00–28:00 — Demonstrate replay protection and ledger verification

### Show

Follow section `7. Demonstrate replay protection and verify the ledger`.

Point to:

- the denied replay attempt;
- `Ledger valid: true`;
- ledger entry count;
- ledger head digest;
- the final completion line.

### Say

> “The script now creates a different claim while reusing the previously approved nonce. PALO identifies the replay and denies it.”

> “Finally, it verifies the ledger chain. We can now reconstruct the profile registration, policy decisions, approval, execution evidence and blocked replay.”

## 28:00–30:00 — Close the demonstration

### Say

> “What changed was not the agent’s intelligence or the tool’s capability. What changed was the control path around the action.”

> “Without PALO-AI, tool access can become authority. With PALO-AI, the agent proposes, policy evaluates, a human reviews when required, the governed executor acts only after authorization, and signed evidence preserves the decision.”

> “PALO-AI is an emerging governance control plane for n8n and agentic automation platforms. This is a Developer Preview for isolated evaluation, not yet a production authorization service or independently assessed security boundary.”

### Final question to the audience

> “Which action in one of your current agentic workflows should never rely on possession of a credential alone?”

---

# Expected final output

The terminal run must finish with:

```text
Demo complete: deny → approval → allow → mock execute → sign → persist → replay deny → verify.
```

# Fast 8-minute version

If time is reduced:

1. Show the infographic and deliver the core message — 1 minute.
2. Execute the n8n comparison and show direct execution versus approval required — 2 minutes.
3. Run `npm run demo:hands-on -- --auto-approve` — 3 minutes.
4. Point to the denied out-of-scope request, allowed execution, signed evidence, denied replay and valid ledger — 1 minute.
5. Deliver the Developer Preview disclaimer and closing question — 1 minute.

# Recovery cues

## n8n is unavailable

Run:

```bash
npm run demo:hands-on
```

The terminal case still demonstrates the direct path, authority profile, policy, approval, execution, evidence, replay protection and ledger verification.

## OPA is unavailable

Say:

> “PALO fails closed when it cannot obtain an authoritative policy decision. That is the expected security behavior.”

Restart Terminal A, restart the gateway with a fresh data directory, and rerun.

## Gateway port 8787 is occupied

```bash
lsof -nP -iTCP:8787 -sTCP:LISTEN
```

Stop the previous demonstration process and restart Terminal B.

## A sequence or replay error appears too early

Restart Terminal B with a new `PALO_DATA_DIR`, then run:

```bash
npm run demo:n8n:seed
```

## The audience cannot see the details

Use the terminal demo as the source of truth. Increase the font size and pause on the five checkpoints:

1. direct access succeeded;
2. governed out-of-scope access denied;
3. valid access requires approval;
4. execution creates signed evidence;
5. replay denied and ledger valid.

# Non-negotiable disclaimer

This demonstration uses a shared local bearer token, a local HMAC key, synthetic files, a mock executor and a manual reviewer. It is a Developer Preview for isolated evaluation. Production adoption requires workload identity, protected credentials, RBAC, tenant isolation, KMS/HSM-backed keys, durable transactional storage, high availability, monitoring, incident response and independent security assessment.
