# n8n-nodes-palo-ai

Developer-preview PALO-AI decision gate and full-cycle outcome assurance for n8n agentic workflows.

> **Not for production authorization.** Package 0.2 adds a full-cycle node backed by operator-provisioned executors and verifiers, but it is not an audited security boundary, verified n8n community node, production identity service or certified connector. Use isolated development data and mock tools only.

The compatibility node routes policy to **Allowed**, **Approval Required** or **Denied**. The new PALO Governed Action node continues through a one-time capability, trusted receipt and authoritative effect verification, then routes to **Verified**, **Review Required**, **Denied** or **Execution Failed**.

## What this alpha implements

- encrypted n8n credentials for the gateway URL and bearer token;
- normalized PALO Action Claims (`schemaVersion: 1.1.0`);
- tool, operation, resource, normalized path, host, network intent, arguments and schema digests;
- nonce, idempotency key, sequence number and expiry material;
- n8n workflow, execution, node and item correlation metadata;
- explicit allow, approval-required and deny outputs;
- immutable-claim resume after approval;
- fail-closed behavior for malformed decisions and connector failures.
- Action Claim 1.2 with a closed Effect Contract predicate DSL;
- runtime-owned protected execution instead of a downstream direct-tool branch;
- signed Execution Receipt and Outcome Attestation;
- held Assurance Incident for mismatched or inconclusive outcomes;
- explicit separation between an `allowed` policy decision and a `verified` outcome.

The original node is visible and removable on the canvas and remains decision-only. The Governed Action node calls the PALO-owned execution endpoint; the workflow must not retain another direct credential path to the protected target.

## Installation for local evaluation

Build and package from the PALO repository:

```bash
cd packages/n8n-nodes-palo-ai
npm ci
npm run verify
npm pack
```

Install the generated `.tgz` in a disposable self-hosted n8n instance using the community-node installation flow, or run the official node development environment:

```bash
npm run dev
```

The package is intentionally not published to npm until the local install and runtime test gates are complete.

## PALO Gateway prerequisite

For n8n Cloud or remote integrations, deploy the reference stack on a VPS and use the authenticated HTTPS Gateway URL described in the [online VPS deployment guide](https://github.com/sev7enITA/PALOframework/blob/main/docs/palo-ai-vps-deployment.md). The commands below are only for isolated local package evaluation.

From the PALO repository root:

```bash
npm ci
npm run opa:install
```

Start OPA in a first terminal:

```bash
.tools/opa/opa run --server --addr 127.0.0.1:8181 \
  examples/policy-as-code/agent-delegation.rego
```

Start the gateway in a second terminal:

```bash
export PALO_OPA_URL='http://127.0.0.1:8181'
export PALO_GATEWAY_TOKEN='replace-with-at-least-24-random-characters'
export PALO_HMAC_KEYS_JSON='{"key-support-2026":"replace-with-at-least-32-bytes-of-secret-material"}'
npm run palo:gateway
```

The reference gateway and its SQLite ledger are developer-preview components. They are not a production security boundary.

## Credentials

Create an **PALO API** credential in n8n:

- **Gateway URL:** for example `https://governance.paloframework.org/gateway` online, or `http://127.0.0.1:8787` only in an isolated local setup;
- **Bearer Token:** the same `PALO_GATEWAY_TOKEN` used by the gateway.

The credential test calls the authenticated `/v1/registry` endpoint. Raw secrets are never placed in node output.

## Operations

### Propose Action

Builds a new Action Claim and posts it to `/v1/actions/verify`. Configure the registered agent ID, case ID, tool, operation, resource, path, network intent, arguments, schema, scopes and caller-maintained sequence number.

### Resume Approved Action

Submits the exact Action Claim returned by the pending-approval output together with its approval ID. Do not reconstruct or alter the claim: PALO binds approval to its canonical digest.

### Execute Governed Action

Builds Action Claim 1.2, binds an Effect Contract and posts it to `/v1/actions/execute`. The selected executor and verifier must already be registered and provisioned by the runtime operator. An allowed policy result is not emitted as success: the Verified output is used only after authoritative post-state satisfies the declared effect.

## Outputs

1. **Allowed** — policy returned `allowed`; execution is still a separate explicit workflow step.
2. **Approval Required** — policy returned `pending_approval`; persist the exact claim and follow the PALO approval flow.
3. **Denied** — policy returned `denied`, or a connector error is routed here when n8n's Continue On Fail option is enabled.

The PALO Governed Action outputs are:

1. **Verified** — trusted receipt exists and authoritative post-state satisfies the Effect Contract.
2. **Review Required** — approval is pending, the effect is mismatched, or verification is inconclusive.
3. **Denied** — authority, policy, replay, precondition or resource-hold checks stopped execution.
4. **Execution Failed** — the trusted connector reported failure or the PALO connector itself failed when Continue On Fail is enabled.

Without Continue On Fail, network, authentication, parsing and malformed-response errors stop the workflow. This is deliberate fail-closed behavior.

## Compatibility

- built with `@n8n/node-cli` 0.39.3;
- local development and canvas-load target: n8n 2.30.7;
- Node.js 20 or newer recommended for the development toolchain.

Compatibility is evidence from the documented test run, not a support guarantee.

## Public architecture

- [PALO-AI integration guide](https://github.com/sev7enITA/PALOframework/blob/main/docs/palo-ai-governance-integration-guide.md)
- [PALO-AI full-cycle assurance](https://github.com/sev7enITA/PALOframework/blob/main/docs/palo-ai-full-cycle-assurance.md)
- [PALO-AI governance control plane for n8n](https://github.com/sev7enITA/PALOframework/blob/main/docs/palo-ai-n8n-governance-control-plane.md)
- [Capability matrix](https://github.com/sev7enITA/PALOframework/blob/main/agentic/capability-matrix.json)
- [Launch and design-partner playbook](https://github.com/sev7enITA/PALOframework/blob/main/docs/palo-ai-n8n-launch-playbook.md)

## Feedback

Please use the repository issue templates for architecture feedback or a safe, non-production design-partner proposal. Never attach credentials, personal data, proprietary workflow exports or production payloads.

## License

MIT for this package. n8n itself is distributed under its own licensing terms.
