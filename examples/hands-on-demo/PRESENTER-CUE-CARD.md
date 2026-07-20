# PALO-AI live demo cue card

## Core line

> Without PALO-AI, possession of a tool or credential can become permission. With PALO-AI, authority is explicit, contextual and verifiable.

## Before the audience arrives

- Infographic open full screen.
- n8n comparison workflow imported but not executed.
- OPA running on `127.0.0.1:8181`.
- Gateway running on `127.0.0.1:8787` with a fresh `PALO_DATA_DIR`.
- n8n profiles seeded.
- Terminal C ready at the repository root.
- Notifications and unrelated windows hidden.

## 0–3 min — infographic

Say: “The action is the same. What changes is the control path.”

Show:

- direct tool execution on the left;
- Action Claim and contextual policy on the right;
- allow, approval required and deny;
- signed evidence and ledger.

## 3–6 min — n8n comparison

Do: click `Execute workflow`.

Show:

- upper branch executes immediately;
- lower branch stops at `Approval Required`;
- three governed outputs remain visible.

Say: “The direct branch treats access as authority. The governed branch asks whether this exact action is authorized here and now.”

## 6–9 min — Action Claim

Show:

- agent and case;
- tool, operation, resource and path;
- network intent and arguments;
- nonce, idempotency key, sequence and expiry.

Say: “PALO evaluates an exact structured claim, not a vague intention.”

## 9–12 min — direct execution

Run:

```bash
export PALO_GATEWAY_TOKEN='palo-demo-only-gateway-token-32-bytes'
npm run demo:hands-on
```

Pause on:

```text
Direct mock tool executed: true
Authority profile checked: no
Policy decision: none
Human approval: none
Signed evidence: none
```

## 12–18 min — authority and deny

Show:

- versioned support authority profile;
- `/workspace/support-docs` scope;
- human validation required;
- `/finance/private` request denied.

Say: “The same out-of-scope access succeeded without PALO and is denied with PALO.”

## 18–22 min — approval

Show:

- `pending_approval`;
- approval ID;
- immutable claim digest;
- bound claim and digest.

Ask: “Do you approve this exact synthetic read, with no external network access?”

Do: press Enter after the reviewer answers.

Say: “Approval is bound to one action, not granted to the agent in general.”

## 22–25 min — execute and evidence

Show:

- `allowed`;
- mock tool execution;
- evidence event ID;
- HMAC signature prefix;
- `[REDACTED]` email.

Say: “Execution occurs only after allow; the result becomes signed evidence.”

## 25–28 min — replay and ledger

Show:

- replay denied;
- `Ledger valid: true`;
- ledger head digest.

Say: “PALO can reconstruct what was proposed, decided, approved, executed and blocked.”

## Close

> PALO-AI is an emerging governance control plane for n8n and agentic automation platforms. This Developer Preview is for isolated evaluation and is not yet a production authorization or independently assessed security boundary.

Ask: “Which action in your current agentic workflows should never rely on possession of a credential alone?”

## Final success line

```text
Demo complete: deny → approval → allow → mock execute → sign → persist → replay deny → verify.
```
