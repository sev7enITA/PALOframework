# PALO-AI Governance Integration Guide

Status: full-cycle developer-preview integration guide for PALO-AI v2.5, updated 18 July 2026.

> **Do not use this release as a production authorization boundary.** The current implementation is intended for isolated evaluation with mock or non-consequential tools. It does not yet provide production workload identity, reviewer authentication, unavoidable execution, distributed exactly-once semantics, KMS/HSM-backed keys, high availability, or connector certification.

## Purpose

This guide explains how to connect PALO-AI to n8n and analogous agentic automation platforms while preserving one portable governance lifecycle:

```text
identify -> normalize -> evaluate -> approve -> capability -> execute -> receipt -> observe -> verify effect -> escalate
```

The orchestration platform remains responsible for workflow coordination. For protected actions, PALO-AI owns the governed call to a registered executor and asks a separately registered verifier whether authoritative state satisfies the immutable Effect Contract.

Choose the audience-specific starting point in the [PALO-AI adoption paths](palo-ai-adoption-paths.md). Deployment decisions are covered by the [cloud reference architecture](palo-ai-cloud-reference-architecture.md); external review and scale gates are covered by the [security assurance plan](palo-ai-security-assurance-and-scale.md).

## Current release assessment

PALO-AI v2.5 contains a working full-cycle reference core, but not yet a production control plane.

| Capability | Current evidence | Status | What is still required |
|---|---|---|---|
| Canonical Action Claim and Effect Contract | Action Claim 1.1 compatibility, Action Claim 1.2, closed predicate DSL and resource binding | Implemented | Domain predicate packs and interoperability validation |
| Rego enforcement | Rego v1 policy, input schema, default deny, OPA tests | Implemented | Signed bundles, controlled promotion, provenance and rollback |
| MCP | Official-SDK stdio server and authenticated Streamable HTTP prototype | Implemented / prototype | Workload identity, TLS boundary, RBAC, rotation and rate limiting |
| Trusted registry | Versioned agent profiles and policies in SQLite | Prototype | Administrative authorization, publisher signatures, backup and recovery |
| Replay controls | Nonce, idempotency key and monotonic sequence checks | Prototype | Distributed atomic consumption and exactly-once execution semantics |
| Governed execution | One-time capability, registered in-process executor, signed receipt and idempotent retry behavior | Prototype | Workload identity, attestation, distributed durable jobs and connector certification |
| Outcome assurance | Authoritative pre/post reads, verified/mismatch/inconclusive attestation, incident and resource hold | Prototype | Production verifier ecosystem, HA, retry schedules and enterprise incident integration |
| Evidence | Runtime-generated HMAC receipts/attestations, canonicalization, SQLite WAL and append-only hash chain | Prototype | KMS/HSM, key rotation, durable distributed outbox, retention and external anchoring |
| Human approval | Digest-bound state machine and exact-claim re-evaluation | Prototype | Authenticated reviewers, secure notification, one-time resume and separation of duties |
| n8n integration | Package 0.2 with decision-only and full-cycle governed-action nodes | Prototype | Real 0.2 sideload test, workflow admission, npm provenance and n8n verification |
| Dify integration | Authenticated Python example | Prototype | Packaged adapter or Agent Strategy, lifecycle tests and production credentials |
| Other platforms | Portable adapter contract | Specified | Platform-specific implementations and tests |

The authoritative status is the [public capability matrix](../agentic/capability-matrix.json). A feature is production-ready only when that matrix explicitly says `production-ready`. The [v2.5 technical and security assessment](palo-ai-v2.5-technical-assessment.md) is the current release assessment; the v2.4.1 assessment is retained as the original preview baseline.

### Security blockers identified in this assessment

The following are release blockers for consequential or production use, even where an underlying primitive is marked implemented:

1. The reference policy checks declared scopes but does not yet prove that every effective resource/path in the action and its arguments is contained by those scopes.
2. The reference capability and executor are local/in-process; multi-replica leasing, connector workload identity and binary attestation are not implemented.
3. The original visual n8n gate remains optional. Package 0.2 provides a governed-action client, but workflow admission and elimination of every alternate credential path remain adopter responsibilities.
4. One shared bearer token currently spans registry administration, agent verification, approval resolution and evidence submission. Production requires principal identity, RBAC and separation of duties.
5. Caller-supplied REST evidence is disabled by default, but the deprecated local MCP compatibility tool remains and must not be exposed as a production ingestion path.
6. The approval record is digest-bound but does not yet provide a complete, meaningful, signed action presentation and authenticated reviewer journey.
7. The registry records a policy digest, but the preview runtime does not attest that the OPA bundle actually evaluated is that registered bundle.

Additional engineering work is required for atomic state transitions, cross-case replay namespaces, immutable decision history, standardized cross-language canonicalization, complete negative-policy tests, and distributed recovery tests. Until these are closed, limit evaluation to mock or non-consequential actions.

## The non-bypassable design rule

A visible PALO decision node is useful, but it is not an enforcement boundary if a workflow author or agent can call the target tool directly.

Use one of these integration classes deliberately:

1. **Advisory gate** — the workflow calls PALO and visibly routes `allowed`, `pending_approval`, and `denied`. Suitable for learning and design-partner pilots only.
2. **Governed executor** — the agent can call only a PALO-owned broker or tool wrapper. PALO evaluates and consumes authorization before the broker uses isolated target credentials.
3. **Workflow admission** — an instance-level hook rejects workflows or executions that do not have the required PALO coverage and registered digest.

For consequential actions, use classes 2 and 3 together. Credentials for the real tool must remain behind the governed executor; otherwise a direct path remains.

## Portable integration contract

Every adapter must perform the same steps:

1. Identify the platform instance, workflow, execution, node, agent and case.
2. Map the proposed tool call to a canonical PALO Action Claim.
3. Submit the claim to `POST /v1/actions/verify` before execution.
4. Stop on errors, missing data, unavailable policy, malformed responses or `denied`.
5. For `pending_approval`, retain the exact immutable claim and approval ID.
6. Resolve approval through PALO, not by trusting an agent-provided approval flag.
7. Re-submit the same claim and approval ID immediately before execution.
8. Execute only through an allowlisted, registry-bound executor.
9. Record actual outcome evidence separately from the authorization decision.
10. Preserve platform correlation identifiers for audit and incident response.

### Minimum Action Claim mapping

| PALO field | Platform source |
|---|---|
| `agentId` | Registered agent, bot, service account or automation identity |
| `caseId` | PALO Case File, business process or governed use-case identifier |
| `action.tool` | Stable registered tool or executor ID; never an arbitrary user label |
| `action.operation` | `read`, `create`, `update`, `delete`, `execute` or `delegate` |
| `action.resource` | Business or technical object being acted upon |
| `action.path` | Normalized object, filesystem or API path |
| `action.networkIntent` | `none`, `read`, `write` or `bidirectional` |
| `action.networkHost` | Lowercase destination host when network intent is not `none` |
| `action.arguments` | Schema-valid proposed arguments with no raw credentials |
| `requestedScopes` | Explicit read and write boundaries |
| `nonce` | Cryptographically random value per new claim |
| `idempotencyKey` | Stable key for a logical attempt and its safe retries |
| `sequenceNumber` | Caller-maintained monotonic sequence for the registered agent |
| `requestedAt` / `expiresAt` | Short validity window generated at runtime |

Do not copy timestamps, nonce, idempotency keys or sequence numbers from repository fixtures into a live evaluation. Fixtures are deterministic test data and expire.

## Online versus local addresses

For n8n Cloud, remote agent platforms and external MCP clients, PALO-AI must be deployed behind a public HTTPS hostname. The repository now includes a [VPS deployment](palo-ai-vps-deployment.md) with this address model:

```text
Internet client -> https://governance.example.org/gateway or /mcp
                         |
                    Caddy TLS proxy
                         |
              PALO Gateway / MCP containers
                         |
                 http://opa:8181
                 private Docker network
```

`127.0.0.1` and port `8181` are used only for laptop evaluation or private communication on the VPS. They are not the URL configured in a cloud workflow.

For an online n8n deployment, configure the PALO credential with a URL such as:

```text
https://governance.paloframework.org/gateway
```

For a Streamable HTTP MCP client, use:

```text
https://governance.paloframework.org/mcp
```

### Local-only evaluation stack

The following localhost commands are optional and intended only for development on one machine. Use the VPS topology for remote integrations.

### Prerequisites

- Node.js 20 or newer;
- a disposable working copy of this repository;
- `curl` for the examples;
- no production credentials, sensitive records or consequential target tools.

Install dependencies and verify the contracts and policy suite:

```bash
npm ci
npm run opa:install
npm run validate:agentic
```

### 1. Start OPA

In terminal 1:

```bash
.tools/opa/opa run --server --addr 127.0.0.1:8181 \
  examples/policy-as-code/agent-delegation.rego
```

The reference runtime fails closed when `PALO_OPA_URL` is missing or OPA cannot return a valid decision.

### 2. Start the PALO Gateway

In terminal 2, generate secrets through your local secret manager or a cryptographically secure generator. The example key ID matches the supplied development profile; the secret must contain at least 32 bytes.

```bash
export PALO_OPA_URL='http://127.0.0.1:8181'
export PALO_DATA_DIR="$PWD/.palo-agentic-evaluation"
export PALO_GATEWAY_TOKEN='replace-with-at-least-24-random-characters'
export PALO_HMAC_KEYS_JSON='{"key-support-2026":"replace-with-at-least-32-bytes-of-secret-material"}'
npm run palo:gateway
```

Keep the gateway bound to `127.0.0.1`. Its shared bearer token is a coarse preview control, not user identity or RBAC.

Check the unauthenticated health endpoint:

```bash
curl --fail --silent http://127.0.0.1:8787/health
```

### 3. Register a development authority profile

From terminal 3 at the repository root:

```bash
export PALO_GATEWAY_TOKEN='use-the-same-token-configured-for-the-gateway'

node -e 'const p=require("./schemas/fixtures/palo-agentic-interface.valid.json"); process.stdout.write(JSON.stringify({caseId:"case-runtime-example",profile:p}))' \
  > /tmp/palo-agent-registration.json

curl --fail --silent \
  -H "Authorization: Bearer $PALO_GATEWAY_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/palo-agent-registration.json \
  http://127.0.0.1:8787/v1/agents/register
```

The registry can then be inspected without exposing the bearer token in workflow output:

```bash
curl --fail --silent \
  -H "Authorization: Bearer $PALO_GATEWAY_TOKEN" \
  http://127.0.0.1:8787/v1/registry
```

For meaningful evaluation, create your own profile version, authority scopes and argument schemas. A profile update with different content must use a strictly newer semantic version.

## n8n

Choose among three integration paths. They do not provide the same assurance:

| Path | Uses | Current status |
|---|---|---|
| Native HTTP/Switch/Wait | Built-in n8n nodes calling the PALO Gateway | Available for preview; still advisory without brokered execution |
| PALO community package | Visual PALO decision node | Installable local alpha; unpublished and unverified |
| MCP Client Tool | Agent calls a PALO MCP server | Transport gap: the documented n8n client expects SSE, while this preview exposes stdio and Streamable HTTP |

### Native-node workflow

The quickest package-free evaluation uses n8n's built-in nodes:

```text
Trigger or agent proposal
  -> build canonical Action Claim
  -> HTTP Request: POST /v1/actions/verify
  -> Switch on status
       |-> denied: Stop And Error
       |-> pending_approval: register callback -> Wait -> verify exact claim
       `-> allowed: mock or brokered execution -> record outcome
```

The [Wait node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/) can resume through the runtime-specific `$execution.resumeUrl` and supports authenticated callbacks. Set authentication, timeout and restricted methods/IPs. A resume URL is workflow coordination, not cryptographic approval or replay protection: PALO must still verify claim digest, state, expiry and reviewer authority before the action continues. A partial execution can create a different resume URL, so generate and register it in the same execution as the Wait node.

Do not place a native privileged action after a merely optional check and call that enforced governance. For an enforceable target, the allowed branch must call a PALO broker that owns the target credential.

### Developer-preview package installation

The current `n8n-nodes-palo-ai` package implements the advisory visual gate. It has been locally tested with n8n 2.30.7, but is not published to npm and is not an n8n verified community node.

#### 1. Build the package

```bash
cd packages/n8n-nodes-palo-ai
npm ci
npm run verify
npm pack
```

Install the resulting `.tgz` only in a disposable self-hosted n8n instance. n8n documents both the [community-node installation flow](https://docs.n8n.io/integrations/community-nodes/installation/gui-install/) and the [risks of unverified community nodes](https://docs.n8n.io/integrations/community-nodes/risks/).

#### 2. Configure the credential

Create a **PALO API** credential:

- Gateway URL: `https://governance.paloframework.org/gateway` for the online VPS deployment;
- Gateway URL: `http://127.0.0.1:8787` only for an isolated n8n instance running on the same development host;
- Bearer Token: the same value as `PALO_GATEWAY_TOKEN`;
- when n8n runs in a container, use a private container-network address rather than publishing the preview gateway to the internet.

The credential check calls `GET /v1/registry`. Never place tokens or target-system credentials in Action Claims or node output.

#### 3. Import and run the reference workflow

Import:

```text
examples/agentic-interface/integrations/n8n/templates/palo-visual-governance-gate.json
```

Replace fixture values with a currently registered profile and generate fresh claim material. Test in this order:

1. malformed claim -> denied;
2. unregistered agent or tool -> denied;
3. OPA unavailable -> denied;
4. valid low-authority action -> expected policy decision;
5. approval-required action -> pending approval;
6. changed claim after approval -> denied;
7. exact approved claim -> re-evaluated decision.

The three node outputs mean:

- **Allowed** — the policy permits the claim, but the current node has not executed the target action;
- **Approval Required** — persist the exact claim and approval ID outside transient UI state;
- **Denied** — stop and alert. Connector errors also deny or stop the workflow.

#### 4. Human review

n8n provides [human review for AI tool calls](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/). Use it to manage the workflow lifecycle, but keep the PALO security invariant: approval must be bound to the canonical claim digest and the same claim must be evaluated again before execution.

The mobile or Web reviewer must resolve an approval through an authenticated PALO backend. A client must not be given a public n8n resume URL as execution authority.

### n8n AI Agent and MCP

n8n's official [MCP Client Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/) can expose selected MCP tools to an AI Agent. Select an explicit allowlist and do not connect equivalent target tools directly to the same agent.

Client compatibility depends on the MCP transport and product version. PALO v2.5 provides stdio and authenticated Streamable HTTP; do not claim plug-and-play compatibility with clients that require SSE or another transport until that exact combination has been tested and documented.

### Production path for n8n

Before requesting npm publication or n8n verification:

- redesign the public node as a focused PALO service integration, not a generic logic/router node or a proxy for arbitrary third-party APIs;
- implement a registry-bound governed executor and one-time authorization consumption;
- add workflow assessment and admission for self-hosted enforced deployments;
- add workload and reviewer identity, RBAC, TLS, rate limiting and audit administration;
- run a distributed staging E2E with real n8n lifecycle, OPA, approval, execution, evidence and recovery;
- publish with the current n8n submission process, package linting, tests and npm provenance.

n8n's official references are the [node verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/), [community-node submission guide](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/), and [external hooks configuration](https://docs.n8n.io/hosting/configuration/external-hooks/). External hooks are a self-hosted enforcement option and are not provided by the current PALO package.

## Microsoft Copilot Studio

Microsoft currently documents Streamable HTTP MCP connectivity through the Copilot Studio onboarding wizard. The PALO preview endpoint can therefore be evaluated as an external MCP server, subject to the preview limitations in this guide.

Use this minimum-safe configuration:

1. register one development Authority Profile for one reversible use case;
2. connect `https://governance.paloframework.org/mcp` through the MCP onboarding flow;
3. turn off **Allow all** and select only the required low-privilege PALO tools;
4. do not expose equivalent direct connector actions to the same agent;
5. apply Power Platform connector data policies where available;
6. test deny and approval-required outcomes before an allowed path;
7. keep production identities, target credentials and consequential data out of the preview.

Copilot Studio connectivity is not evidence that PALO universally intercepts every connector or workflow action. When the agent can reach a direct action beside PALO, the integration is opt-in and must not be described as enforced.

Official references:

- [Connect an existing MCP server](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)
- [Add MCP tools and resources](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-components-to-agent)
- [Available tool types](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/tools-available)

## Dify

The repository example at `examples/agentic-interface/integrations/dify/palo_dify_tool.py` demonstrates authenticated claim submission and fail-closed response handling.

Two integration levels are possible:

1. **Decision tool** — a workflow or agent calls PALO before a separate tool. This remains advisory if the agent can call that tool directly.
2. **PALO-owned Agent Strategy or brokered tool** — PALO owns the tool-selection/execution loop or the only available action credential. This is the preferred enforcement model.

Dify's official extension points include [plugin types](https://docs.dify.ai/en/develop-plugin/getting-started/choose-plugin-type), [tool plugins](https://docs.dify.ai/en/develop-plugin/dev-guides-and-walkthroughs/tool-plugin), and [Agent Strategy plugins](https://docs.dify.ai/en/develop-plugin/dev-guides-and-walkthroughs/agent-strategy-plugin). Package and test a PALO plugin only after the generic connector contract is stable.

## LangChain and LangGraph

LangChain middleware can intercept model and tool activity, and LangGraph supports durable interrupts. This makes the ecosystem a strong candidate for a PALO tool-call enforcement adapter.

Recommended shape:

```text
agent -> before_tool middleware -> PALO verify
                               |-> deny: tool exception
                               |-> pending: durable interrupt
                               `-> allow: governed executor -> evidence
```

The middleware must be installed by the trusted runtime owner, not selected by the agent. Resume must restore the exact claim and verify approval again. See the official [LangChain custom middleware documentation](https://docs.langchain.com/oss/python/langchain/middleware/custom), [human-in-the-loop middleware](https://docs.langchain.com/oss/python/langchain/human-in-the-loop), and [LangGraph interrupts documentation](https://docs.langchain.com/oss/python/langgraph/interrupts).

## Node-RED

A PALO node or subflow is only an opt-in visual gate. For enforced self-hosted use, pair a custom node with a runtime-owned hook or broker so that protected messages cannot reach target nodes directly.

Map `_msgid`, flow, node, deployment version and target endpoint to PALO correlation metadata; retain the exact claim while waiting; stop the message on any PALO error. Relevant official extension points are [creating nodes](https://nodered.org/docs/creating-nodes/) and [messaging hooks](https://nodered.org/docs/api/hooks/messaging/).

## Make and Zapier

These SaaS platforms do not expose a universal instance-level interceptor for every action. Treat a PALO integration as enforceable only when protected actions are exposed exclusively through a PALO-controlled API, custom app action or brokered webhook and direct vendor credentials are unavailable to the automation.

- Make: use a [custom app](https://developers.make.com/custom-apps-documentation) or HTTP/webhook call to a PALO broker.
- Zapier: use a [private or public integration](https://docs.zapier.com/platform/home) whose action calls the PALO broker.

A standalone “check policy” step followed by a native vendor action is advisory and can suffer time-of-check/time-of-use drift.

## MCP-based platforms

For MCP clients, expose only PALO-governed tools to the agent. Do not expose the same privileged target tools alongside their PALO wrappers. The v2.5 stdio server can remain local to a trusted host; the authenticated Streamable HTTP transport remains a shared-token prototype and requires an explicit host allowlist for every non-loopback binding.

n8n also documents an [instance-level MCP server](https://docs.n8n.io/advanced-ai/mcp/accessing-n8n-mcp-server/). That server exposes selected n8n workflows to clients; it does not by itself enforce PALO authority over actions inside those workflows.

## Approval lifecycle

```text
proposed -> denied
        |-> allowed
        `-> pending -> approved -> exact-claim re-evaluation -> allowed or denied
                    |-> denied
                    |-> cancelled
                    `-> expired
```

Required invariants:

- terminal approval states are immutable;
- resolver identity and rationale are required;
- approval ID, claim ID and canonical digest must all match;
- expired claims or approvals deny;
- approval does not imply execution success;
- reviewer and workflow administrator roles must be separated for high-risk actions.

## Evidence and observability

Record separate events for proposal, policy decision, approval transition, execution attempt and outcome. Correlate them by case, claim, decision, approval, workflow and execution IDs.

The current ledger is a local SQLite hash chain signed with server-side HMAC. It detects some local modification but is not immutable storage against a privileged host operator. A production design needs transactional state/outbox semantics, centrally managed keys, rotation, backup, retention, export, monitoring and external anchoring appropriate to the risk.

Verify the preview ledger with:

```bash
export PALO_GATEWAY_BASE_URL='https://governance.paloframework.org/gateway'
curl --fail --silent \
  -H "Authorization: Bearer $PALO_GATEWAY_TOKEN" \
  "$PALO_GATEWAY_BASE_URL/v1/evidence/verify-ledger"
```

## Failure and retry rules

- **Fail closed:** timeout, invalid JSON, missing profile, schema failure, OPA failure, unrecognized status and expired material all stop the protected action.
- **Retry safely:** reuse the same idempotency key only for the exact same logical claim; never reuse a nonce or sequence number for different content.
- **No approval mutation:** do not rebuild arguments after approval. A changed action requires a new claim and approval.
- **No raw secrets:** store credentials in the platform vault or governed executor; claims contain references and redacted business arguments.
- **No direct path:** remove target credentials and native action nodes from agent reach when asserting enforcement.
- **No decision/execution confusion:** an `allowed` decision is not proof that an action ran.

## Adoption checklist

### Developer preview

- [ ] Isolated network and disposable data
- [ ] Mock or reversible target tools only
- [ ] OPA fail-closed test completed
- [ ] Registered profile and trusted argument schemas
- [ ] Fresh nonce, idempotency key, sequence and expiry
- [ ] Deny and malformed-input tests completed
- [ ] No production claims in communications

### Controlled design-partner pilot

- [ ] Mock, reversible or otherwise non-consequential target actions only until the security blockers are closed
- [ ] Named owner, threat model and data classification
- [ ] Complete inventory of direct and brokered tool paths
- [ ] Platform correlation and audit export
- [ ] Authenticated users and workload identities outside the preview gateway
- [ ] Tested approval expiry, cancellation and reviewer separation
- [ ] Backup, restore, incident response and kill switch
- [ ] Explicit acceptance that the connector is not production-ready

### Production-readiness gate

- [ ] Unavoidable governed executor and workflow admission
- [ ] OIDC/mTLS identity and least-privilege RBAC
- [ ] KMS/HSM-backed signing and rotation
- [ ] Transactional distributed state, outbox and one-time capability consumption
- [ ] High availability, rate limiting, metrics, alerting and recovery objectives
- [ ] Security review, dependency and supply-chain controls
- [ ] Distributed E2E: register -> deny -> approve -> execute -> sign -> persist -> verify
- [ ] Platform-specific publishing, provenance and verification requirements passed
- [ ] Capability matrix updated to `production-ready` only with linked evidence

## Repository references

- [PALO-AI v2.5 technical and security assessment](palo-ai-v2.5-technical-assessment.md)
- [PALO-AI v2.4.1 technical assessment](palo-ai-v2.4.1-technical-assessment.md) — original preview baseline
- [PALO-AI n8n architecture](palo-ai-n8n-governance-control-plane.md)
- [Production-readiness plan](palo-ai-production-readiness-plan.md)
- [n8n alpha test report](palo-ai-n8n-alpha-test-report.md)
- [Agentic contracts and examples](../examples/agentic-interface/README.md)
- [Rego policy and tests](../examples/policy-as-code/README.md)
- [Capability matrix](../agentic/capability-matrix.json)
