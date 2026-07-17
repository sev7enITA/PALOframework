# PALO policy as code — Developer Preview

`agent-delegation.rego` is a draft v2.4.1 reference policy for canonical PALO-AI claims. It uses Rego v1 syntax and demonstrates checks for agent identity, profile state, tool and operation allowlists, read and write scopes, external-network authority, target host, delegation depth, subagent count, requested role, and exact human approval binding. `agent-delegation_test.rego` covers allowed, pending, forged-approval, scope, network, and tool cases.

This policy is not a production authorization policy, legal determination, security certification, or substitute for organization-specific policy ownership and testing. Passing the included tests establishes only the behavior of the included examples.

The MCP runtime calls:

```text
POST /v1/data/palo/agentic/governance/action_decision
```

The reference server constructs the OPA input with the requested claim, a locally registered profile, the server-computed claim digest, any stored approval, and server time. The preview does not provide signed policy-bundle distribution, publisher attestation, administrative RBAC, or proof that the active OPA bundle matches the registered manifest. Do not expose this policy endpoint as a production authorization service.

Run the pinned and checksum-verified toolchain:

```bash
npm run opa:install
.tools/opa/opa check examples/policy-as-code
.tools/opa/opa test examples/policy-as-code -v
```

`decision-gate.example.rego` remains an educational, non-production lifecycle-gate example over `decision-gate-input.example.json`. It does not establish evidence authenticity, legal compliance, safety, or deployment approval.

Before adapting either policy, define authenticated input ownership, exception expiry, policy-bundle signing and distribution, rollback, availability objectives, decision rights, audit retention, and monitoring. Never place credentials, personal data, or signing secrets in policy source or fixtures.
