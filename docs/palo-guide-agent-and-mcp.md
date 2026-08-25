# PALO Guide Agent and MCP Integration

Status: PALO platform v3.1.0 guide-agent contract. The guide tools are implemented as deterministic, read-only inference over released PALO registries and the twelve governance control packs. The protected-action and data-assurance runtime remains a separate PALO-AI v2.7 developer preview.

## Purpose

The PALO Guide Agent lets a person or product ask three practical questions without first knowing PALO module names:

1. How does PALO address this governance question?
2. Which PALO phases, controls and artifacts should this case start with?
3. How should another product consume this guidance through MCP, and when must guidance be separated from protected-action enforcement?

The agent is deliberately split into two layers:

```text
host assistant or product UI
  -> PALO guide prompt
  -> read-only guide tools
  -> released semantic spine, gates, controls, indicators and sources
  -> applicability-aware governance control packs and evidence contracts

protected action, only when needed
  -> Action Claim
  -> policy decision / approval
  -> one-time capability
  -> PALO-owned executor
  -> receipt and outcome verification
```

The first layer explains and recommends. It cannot approve a case, determine legal applicability, certify compliance or authorize deployment. The second layer demonstrates a protected-action lifecycle, but remains non-production in the current release.

## What is implemented

The reference MCP server exposes one prompt and three guide tools:

| MCP capability | Purpose | State change |
| --- | --- | --- |
| `palo_guide_agent` prompt | Grounds a host assistant in PALO terminology, sources and authority boundaries | None |
| `palo_explain_framework` | Searches released semantic records and explains relevant phases, modules and artifacts | None |
| `palo_infer_governance_route` | Maps explicit use-case signals to an explainable 2-4 step starting route | None |
| `palo_plan_product_integration` | Selects a transport and integration class, with trust boundaries and a least-privilege tool set | None |

The inference code is in `packages/palo-mcp-server/guide-agent.js`. It reads:

- `data/semantic-spine.json`;
- `data/decision-gates.json`;
- `data/control-library.json`;
- `data/kpi-kri-registry.json`;
- `data/source-registry.json`;
- `data/governance-control-packs.json`.

It does not call a model, send telemetry, fetch external content or mutate a Case File. A host assistant can reason over the structured result, but must preserve its sources, input signals, "because" statements, applicability questions, stop conditions, residual boundaries and authority boundary.

## Inference contract

### Explain PALO

Call `palo_explain_framework` with a plain-language question:

```json
{
  "query": "How should I govern an agent that can update supplier records?",
  "audience": "procurement product owner",
  "limit": 6
}
```

The result includes the canonical six-phase loop, relevant semantic records, evidence class, expected artifacts and the authority boundary of each record.

### Infer a starting route

Call `palo_infer_governance_route` with the use case and only the signals that are known:

```json
{
  "useCase": "An agent reads invoice evidence and can submit an exception resolution.",
  "role": "finance product owner",
  "objectives": ["bound delegated action", "prepare review evidence"],
  "systemType": "agentic workflow",
  "currentState": "pilot",
  "signals": {
    "systemCanAct": true,
    "highImpact": true,
    "needsEvidence": true,
    "humanReviewDefined": false,
    "actionImpact": "reversible-write"
  }
}
```

The result contains an ordered route, the rules that selected each step, linked modules, expected artifacts, starter controls, indicators and unanswered governance questions. It is a starting hypothesis. The host must let an accountable person confirm or correct it before treating the route as case state.

### Plan a product integration

Call `palo_plan_product_integration` before configuring a product:

```json
{
  "product": "Procurement workflow",
  "productCategory": "workflow",
  "deployment": "remote",
  "transport": "auto",
  "systemCanAct": true,
  "actionImpact": "consequential-write"
}
```

The result chooses one of four explicit integration classes:

| Class | Use | Important limit |
| --- | --- | --- |
| Guidance only | Explain PALO and recommend a route | No target-system authority |
| Advisory gate | Display a pre-action decision | Bypassable if the target tool remains directly available |
| Governed executor | Keep the target credential behind a PALO-owned broker | Current implementation is a developer preview |
| Workflow admission + governed executor | Reject uncovered workflows and broker protected actions | Requires production identity, RBAC, attestation, HA and connector assurance not supplied here |

## Local MCP stdio

Install and validate from the repository root:

```sh
npm ci
npm run validate:agentic
```

Use a private runtime directory and expose only the three read-only guide tools when the product needs guidance:

```json
{
  "mcpServers": {
    "palo-guide": {
      "command": "node",
      "args": ["/absolute/path/to/PALO/packages/palo-mcp-server/index.js"],
      "env": {
        "PALO_DATA_DIR": "/private/path/palo-guide-runtime",
        "PALO_MCP_EXPOSED_TOOLS": "palo_explain_framework,palo_infer_governance_route,palo_plan_product_integration"
      }
    }
  }
}
```

Use absolute paths. Do not place target-system credentials, production records or sensitive case data in this configuration or in guide-tool arguments.

## Authenticated Streamable HTTP

For a remote MCP client, terminate TLS at a controlled reverse proxy and configure a strong bearer secret through the deployment secret manager:

```sh
export PALO_MCP_HTTP_HOST='127.0.0.1'
export PALO_MCP_HTTP_PORT='8788'
export PALO_MCP_HTTP_TOKEN='replace-with-at-least-24-random-bytes'
export PALO_MCP_EXPOSED_TOOLS='palo_explain_framework,palo_infer_governance_route,palo_plan_product_integration'
npm run palo:mcp:http
```

Client shape:

```json
{
  "url": "https://governance.example.org/mcp",
  "headers": {
    "Authorization": "Bearer <secret-from-your-secret-manager>"
  }
}
```

The shared preview token authenticates transport access only. It is not a principal identity, role, reviewer signature, case approval or authorization to operate a production system.

The supplied VPS deployment provides a separately authenticated guide-only route:

```text
https://governance.paloframework.org/mcp-guide
```

It uses `secrets/guide-mcp-token` and exposes only `palo_explain_framework`, `palo_infer_governance_route` and `palo_plan_product_integration`. Deploy the matching repository release before treating the route as live.

## Host-agent behavior

MCP clients that support prompts can load `palo_guide_agent`. Otherwise use the same behavior as a host system instruction:

1. Call `palo_explain_framework` before explaining a PALO concept.
2. Call `palo_infer_governance_route` before recommending a route.
3. Show the signals used, concise reasons, expected artifact and unresolved questions.
4. Let the user correct the context before creating or changing downstream state.
5. Call `palo_plan_product_integration` before proposing a connector or MCP configuration.
6. Keep guide output separate from Action Claims, approval and protected execution.
7. Never describe a developer-preview control as production-ready or a PALO route as legal advice, certification or deployment approval.

## Web, desktop and mobile product UX

Use the same reasoning contract on every surface, but adapt the interaction:

- **Web desktop:** keep inputs and the inferred route visible together; show "because" reasons beside each phase and artifact.
- **Mobile:** ask only the minimum signals in one vertical flow, then move focus to a concise result; keep configuration code behind disclosure controls.
- **Desktop products:** prefer local stdio for read-only guidance when the MCP client and PALO run on the same trusted machine.
- **Cloud products:** use authenticated Streamable HTTP with a narrow tool allowlist and a backend-for-frontend; never put the bearer token in browser code or browser storage.
- **Products that execute actions:** do not let the guide tool call the privileged target. Introduce the protected-action path as a distinct architecture and preserve the user-visible authority boundary.

## Verification

Run the guide and MCP contract tests:

```sh
node --test packages/palo-mcp-server/guide-agent.test.js packages/palo-mcp-server/mcp.test.js
```

Run the complete agentic validation before publishing changes:

```sh
npm run validate:agentic
```

Passing tests confirms the documented reference behavior only. It does not establish production readiness, control effectiveness, legal applicability or independent assurance.
