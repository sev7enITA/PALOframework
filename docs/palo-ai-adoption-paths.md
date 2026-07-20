# PALO-AI Adoption Paths

Status: audience guide for the PALO-AI v2.5 full-cycle developer preview, updated 18 July 2026.

> Do not use this preview as a production authorization boundary. Use isolated data, mock or reversible actions, short-lived preview credentials, and an accountable test owner.

PALO-AI gives code-first teams, visual workflow builders, and rapid prototypers one shared governance lifecycle:

```text
propose -> normalize -> evaluate -> approve -> capability
        -> execute -> receipt -> observe -> verify effect -> escalate
```

The integration surface changes by audience. The security invariant does not: a workflow is not enforced when the protected tool or credential remains reachable around PALO.

## Choose a path

| Path | Best starting surface | First safe outcome | Current release status |
|---|---|---|---|
| Code-first developer | JSON Schema, MCP, gateway, OPA/Rego | One mock tool call is normalized, denied by default, then allowed by a pinned profile and policy | Contracts implemented; runtime components remain preview/prototype |
| No-code / low-code builder | n8n package 0.2 | One synthetic action visibly routes Verified, Review Required, Denied or Execution Failed | Local full-cycle preview; unpublished and unverified |
| Rapid prototyper / business maker | Copilot Studio or a comparable MCP-capable platform | One reversible action is exposed through a deliberately narrow PALO tool set | Integration guidance; no certified connector |

## Path 1: code-first developer

### What you are trying to prove

You can force an identified agent's proposed action through a deterministic contract before any side effect occurs.

### Start here

1. Validate an Action Claim with `schemas/palo-agentic-action-claim.schema.json`.
2. Register a development agent and Authority Profile.
3. Run the Rego v1 tests and confirm malformed input, unknown agents, unregistered tools and missing profiles deny.
4. Connect a mock executor to the gateway or official-SDK MCP server.
5. Remove every direct path from the agent to the mock tool.
6. Run the sequence `register -> deny -> approve -> execute -> sign -> persist -> verify`.

Primary resources:

- [Governance integration guide](palo-ai-governance-integration-guide.md)
- [Canonical schemas](../schemas/)
- [Reference MCP server](../packages/palo-mcp-server/README.md)
- [Rego policies and tests](../examples/policy-as-code/README.md)
- [Capability matrix](../PALO_AgenticCapabilityMatrix.html)

### Local or cloud

- Use stdio or a local gateway for application development and offline evaluation.
- Use the authenticated HTTPS preview only for non-production interoperability testing.
- Keep target credentials in a brokered executor, never in the model context or Action Claim.
- Treat the current bearer token as a coarse preview control, not workload identity or tenant RBAC.

### Completion gate

The path is complete only when a direct tool call fails, a malformed claim denies, an approved claim cannot be changed, the authorization is consumed once, and evidence is linked to the actual executor outcome.

## Path 2: no-code / low-code builder

### What you are trying to prove

People can see why an action is allowed, denied or paused, while the workflow retains an explicit upgrade path from advisory governance to brokered execution.

### n8n preview route

1. Start the disposable local n8n stack in `deploy/n8n-macos-pilot/`.
2. Install the exact local `n8n-nodes-palo-ai` alpha package through the supplied image.
3. Configure a PALO API credential with either the local gateway or the online preview URL.
4. Import `examples/n8n-demo/PALO-AI-full-cycle-assurance-demo.json` and configure the PALO Governed Action node with a mock or reversible target.
5. Test Verified, Review Required, Denied and Execution Failed with fresh nonces and monotonic sequence numbers.
6. Compare the same proposal with the compatibility `PALO-AI-three-outcomes-demo.json` to show why an advisory allow decision is not an outcome guarantee.
7. Confirm that no alternate node or credential can reach the protected target around the governed path.
8. Run `n8n audit` before and after installing a community node.

### What the canvas must show

```text
Trigger or agent proposal
  -> normalize Action Claim
  -> PALO Governed Action
       verified -> continue with signed receipt and outcome attestation
       review_required -> stop, approve or investigate exact claim/outcome
       denied -> Stop And Error
       execution_failed -> retry only under the documented idempotency boundary
```

An n8n Wait/resume URL coordinates the workflow; it is not itself cryptographic approval or replay protection. PALO must validate the exact claim digest, reviewer authority, state, expiry, nonce and one-time grant before execution.

Primary resources:

- [n8n control-plane architecture](palo-ai-n8n-governance-control-plane.md)
- [n8n alpha test report](palo-ai-n8n-alpha-test-report.md)
- [macOS local pilot](../deploy/n8n-macos-pilot/README.md)
- [full-cycle assurance demo](../examples/hands-on-demo/README.md)
- [decision-only compatibility demo](../examples/n8n-demo/README.md)
- [alpha package](../packages/n8n-nodes-palo-ai/README.md)

### Submission boundary

The package is not published to npm and is not an n8n verified community node. n8n currently does not accept generic logic/flow-control nodes for verification and expects one third-party service per package. The public node should therefore evolve into a thin PALO-service integration with operations such as Authorize Action, Register Approval, Verify Grant, Record Execution and Verify Receipt. Native n8n nodes should own routing and waiting.

## Path 3: rapid prototyper / business maker

### What you are trying to prove

An accountable owner can prototype an agent with an explicit authority profile, a narrow set of tools, a meaningful approval point and reviewable evidence without writing Rego first.

### Copilot Studio route

Microsoft documents Streamable HTTP MCP connectivity in Copilot Studio. For a preview:

1. Create one PALO development Authority Profile for one reversible use case.
2. Add the PALO MCP endpoint through the Copilot Studio MCP onboarding flow.
3. Turn off **Allow all** and enable only the required low-privilege PALO tools.
4. Do not expose an equivalent direct connector action to the same agent.
5. Use Power Platform data policies to restrict the connector where available.
6. Test deny and approval-required outcomes before the allowed path.
7. Export the evidence packet and have a second person review what was actually authorized.

Official Microsoft references:

- [Connect an existing MCP server](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent)
- [Add MCP tools and resources](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-components-to-agent)
- [Available tool types](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/tools-available)

### Similar platforms

- Dify: prefer a PALO-owned Agent Strategy or brokered tool over a decision tool placed beside direct tools.
- LangChain/LangGraph: wrap tool calls in middleware and durable interrupts, while retaining server-side enforcement.
- Node-RED: pair visible nodes with an administrator-controlled runtime hook for protected flows.
- Make and Zapier: use brokered execution because a custom visual step cannot universally intercept native actions.

### Completion gate

The prototype is ready for a design-partner demonstration when the owner can answer: What is the agent trying to do? Where is it in the lifecycle? Which authority permits it? Who reviews it? What evidence is retained? Which direct bypasses remain?

## Common exit criteria before production work

- A named business owner and security owner accept the test scope.
- Every platform adapter publishes `enforcement_scope` and `known_bypass_paths`.
- Workload and reviewer identity replace the shared bearer-token model.
- The real executor owns protected credentials and consumes one-time grants atomically.
- Signing keys move to KMS/HSM with rotation and separation of duties.
- PostgreSQL or an equivalent transactional service replaces single-host preview state for distributed deployments.
- Threat modelling, code review, penetration testing, recovery testing and cryptographic review are independently completed.
- The [public capability matrix](../agentic/capability-matrix.json) is updated from evidence, not roadmap intent.
