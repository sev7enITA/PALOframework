# PALO + Microsoft Agent Governance Toolkit

Status: **PALO-maintained interoperability proposal**, tested against Microsoft Agent Governance Toolkit Agent Control Specification (ACS) `0.3.1-beta.0` at upstream commit `81955d48025c6b11deb3fc9dabf89f74f4145775`.

This adapter is part of PALO. It is not maintained, certified, sponsored or endorsed by Microsoft, and it must not be described as an official Microsoft integration unless Microsoft explicitly accepts and labels it that way.

## What the integration proves

Microsoft AGT ACS acts as a replaceable pre-action enforcement provider. PALO retains its vendor-neutral governance lifecycle and outcome-assurance boundary:

```text
PALO Action Claim + Authority Profile
                 |
                 v
Vendor-neutral EnforcementProvider contract
                 |
                 +--> Microsoft AGT ACS pre_tool_call
                 |       allow / deny / warn / escalate
                 |
                 +--> OPA or another future provider
                 |
                 v
PALO one-time capability -> trusted executor -> signed receipt
                 |
                 v
Authoritative post-state verifier -> verified / mismatch / inconclusive
                 |
                 v
PALO Case File evidence + incident hold
```

The distinction is deliberate: AGT decides whether the action may proceed under its runtime policy; PALO independently checks whether the digest-bound, approved effect actually occurred.

## Implemented mapping

| PALO | Microsoft AGT ACS |
|---|---|
| `claimId` | `snapshot.tool_call.id` |
| `action.tool` | `snapshot.tool_call.name` |
| Immutable `action.arguments` | `snapshot.tool_call.args` / policy target |
| Agent/profile identity | `snapshot.agent` and `snapshot.actor` |
| Tenant, case, resource, scope and Effect Contract digest | `snapshot.metadata.palo` |
| Digest-bound PALO approval | `snapshot.approvals` |
| Provider evaluation | `pre_tool_call` in `enforce` mode |
| AGT `allow` | PALO `allowed` |
| AGT `warn` | PALO `allowed` plus `review_agt_warning` obligation |
| AGT `escalate` | PALO `pending_approval` |
| AGT `deny` or runtime error | PALO `denied` |
| AGT `transform` | Denied; submit transformed arguments as a new PALO Action Claim |
| AGT action identity/evidence | Provider reference in the PALO Policy Decision and evidence ledger |

Transforms are intentionally not applied in place. A PALO Action Claim binds the arguments, requested authority and Effect Contract by digest; changing those arguments behind the existing claim would invalidate approval and evidence correlation.

## Run the real ACS demo

Requirements:

- Node.js 20 or newer;
- the PALO repository dependencies installed with `npm ci`;
- Microsoft AGT ACS Node SDK `0.3.1-beta.0`;
- no production credentials or consequential target systems.

Install the optional upstream package without adding it to the PALO core dependency graph:

```bash
npm install --no-save --package-lock=false agent-control-specification@0.3.1-beta.0
npm run demo:microsoft-agt
```

The demo executes two synthetic catalog changes:

1. AGT escalates, PALO records a digest-bound approval, AGT allows the approved call and PALO verifies the intended price change.
2. AGT allows another approved call, the synthetic executor produces the wrong price, and PALO records an outcome mismatch, opens an incident and holds the resource.

Expected summary:

```json
{
  "allowedThenVerified": { "decision": "allowed", "outcome": "verified" },
  "allowedButWrong": { "decision": "allowed", "outcome": "mismatch", "resourceHold": true }
}
```

## Use AGT with the PALO Gateway or MCP server

The regular PALO entrypoints load providers from configuration. The default remains PALO's OPA evaluator.

```bash
export PALO_ENFORCEMENT_PROVIDER='microsoft-agt-acs'
export PALO_AGT_ACS_MANIFEST="$PWD/examples/agentic-interface/integrations/microsoft-agt/manifest.yaml"
export PALO_AGT_ACS_VERSION='0.3.1-beta.0'
export PALO_AGT_POLICY_REFERENCE='microsoft-agt-acs/palo-outcome-assurance-demo-v1'

# Configure the normal PALO preview secrets and transport settings, then choose one:
npm run palo:gateway
npm run palo:mcp
npm run palo:mcp:http
```

`GET /v1/registry` and `palo_get_registry` expose the active provider manifest so evidence consumers can see which provider and policy reference produced a decision.

## Contract and extension points

The portable surface is implemented in:

- [`palo-agentic-enforcement-provider.schema.json`](../../../../schemas/palo-agentic-enforcement-provider.schema.json): serializable provider manifest;
- [`enforcement-provider.js`](../../../../packages/palo-mcp-server/enforcement-provider.js): fail-closed provider interface and decision normalization;
- [`microsoft-agt-acs.js`](../../../../packages/palo-mcp-server/providers/microsoft-agt-acs.js): optional AGT mapping;
- [`from-environment.js`](../../../../packages/palo-mcp-server/providers/from-environment.js): runtime selection without a mandatory AGT dependency.

A future provider needs a valid manifest and one asynchronous operation:

```js
const provider = defineEnforcementProvider({
  manifest,
  async evaluate(paloPolicyInput) {
    return {
      status: "allowed", // or denied / pending_approval
      reasons: ["policy reason"],
      obligations: [],
      policyVersion: "provider-policy/version"
    };
  }
});
```

Provider exceptions, missing decisions and unknown statuses fail closed to `denied`.

## Current boundaries

- This is a developer-preview reference integration, not a production authorization service.
- Only AGT ACS `pre_tool_call` is mapped. AGT `post_tool_call` transformation/DLP is not represented as PALO outcome verification.
- PALO's authoritative verifier reads business state independently; an AGT tool result alone is never treated as proof of outcome.
- AGT package integrity, ACS manifest distribution, OPA binary provenance and AGT evidence verification remain inside the AGT/operator boundary.
- PALO identity, reviewer authentication, RBAC, KMS/HSM custody, tenant isolation and distributed durability remain production gates documented by PALO.
- The sample manifest covers only the synthetic `catalog_update` tool.
- ACS is beta and may change before general availability. Pin the version and run the contract suite before upgrading.

## Verify

```bash
npm run validate:agentic
.tools/opa/opa test examples/agentic-interface/integrations/microsoft-agt/policy
```

See the [maintainer proposal and fork/PR playbook](../../../../docs/integrations/palo-microsoft-agt-proposal.md) before contacting the upstream project.
