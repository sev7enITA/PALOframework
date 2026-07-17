# PALO-AI v2.4.1 Technical Assessment

Assessment date: 17 July 2026
Release status: developer preview
Production authorization: not approved

## Executive assessment

PALO-AI v2.4.1 has moved beyond a paper specification. It includes executable contracts, an official-SDK MCP reference server, default-deny Rego policy, a versioned local registry, replay controls, digest-bound approvals, signed evidence, an append-only local ledger, and locally tested n8n and Dify adapters.

The architecture is coherent and the public capability matrix is generally disciplined. However, the current components do not yet form a trustworthy end-to-end authorization boundary. Seven security blockers affect resource binding, authorization freshness, bypass resistance, identity separation, evidence trust, meaningful approval and policy provenance. No capability should currently be represented as production-ready.

Recommended public positioning:

> PALO-AI v2.4.1 is a developer preview of portable governance contracts and reference runtime components for autonomous agents and agent teams. It is suitable for isolated interoperability evaluation, not production authorization or consequential tool execution.

## Evidence reviewed

- JSON contracts and fixtures under `schemas/`;
- Rego policy and tests under `examples/policy-as-code/`;
- MCP, gateway, registry, approval and ledger implementation under `packages/palo-mcp-server/`;
- n8n alpha package under `packages/n8n-nodes-palo-ai/`;
- Dify connector example under `examples/agentic-interface/integrations/dify/`;
- PALO-AM and Vibe Gate browser prototypes under `assets/`;
- architecture, test report, capability matrix and release manifest.

Validation evidence at the time of assessment:

```text
npm run validate:agentic                         PASS
  7 schema/contract validations                 PASS
  11 MCP tool contract checks                   PASS
  Rego compile and OPA tests                     PASS
  10 runtime/MCP tests                          PASS
  3 Dify connector tests                        PASS

packages/n8n-nodes-palo-ai: npm test            PASS
```

The n8n alpha report also records a successful local tarball install, node registration, credential handling, authenticated gateway call and fail-closed denied route in n8n 2.30.7. These are useful alpha results, not production assurance.

## Capability assessment

### Implemented reference capabilities

These capabilities are executable and tested as reference components:

- versioned canonical Action Claim schema;
- resource, operation, normalized path, network intent, host and argument fields;
- trusted argument-schema digest validation;
- official-SDK MCP stdio server;
- Rego v1 default-deny policy and negative tests;
- fail-closed behavior when OPA is absent or returns an invalid decision.

“Implemented” here means the component exists and its current tests pass. It does not mean the surrounding production control is complete.

### Prototypes

- bearer-authenticated MCP Streamable HTTP transport;
- SQLite-backed versioned agent and policy registry;
- nonce, idempotency key and monotonic sequence checks;
- HMAC-SHA256 evidence and canonicalization;
- SQLite WAL append-only hash-chain ledger;
- digest-bound approval state machine;
- PALO-AM Web profile/decision exchange;
- Vibe Coding pre-tool metadata gate;
- installable n8n visual decision gate;
- authenticated Dify client example;
- in-process governance E2E.

### Specified but not implemented

- registry-bound n8n governed executor;
- one-time authorization/capability consumption;
- authenticated reviewer delivery and secure n8n resume;
- workflow assessment and activation/pre-execution admission;
- collaborative agent-team registry, task leases and conflict handling;
- distributed production E2E and recovery assurance.

## P0 security and enforcement blockers

### P0-1 — Effective resource is not bound to authority scope

The Rego policy checks the claim's declared `requestedScopes`, while the runtime separately validates tool arguments against a trusted JSON Schema. It does not yet prove that `action.path`, `action.resource`, and every path or URI embedded in the arguments are contained within the registered authority scopes.

Impact: a syntactically valid claim may declare an allowed scope while proposing an effective target outside that scope.

Required correction:

- derive the effective resource server-side from a registered executor definition;
- use boundary-aware path/URI containment, not string prefix alone;
- validate all target-bearing arguments against the same authority;
- add negative tests for path traversal, sibling prefixes, encoded paths, symlinks/aliases and URI normalization.

### P0-2 — An allowed decision is reusable without complete freshness checks

The runtime can return a stored decision for an existing claim before rechecking expiry and before loading the current authority profile and policy. The reference `authorizeAndExecute` method can then use that decision.

Impact: an earlier allow may survive claim expiry, profile revocation or policy replacement.

Required correction:

- treat a policy decision as an audit fact, never as a reusable bearer authorization;
- revalidate expiry, current profile digest/status, current policy digest/version and approval immediately before execution;
- issue and atomically consume a short-lived, audience-bound, one-time capability;
- preserve prior decisions immutably rather than replacing them.

### P0-3 — The n8n visual gate is bypassable

The current node routes a decision but does not own target execution. A workflow editor can remove it or connect the agent directly to another tool.

Required correction: implement the governed executor and, for enforced self-hosted profiles, workflow admission/pre-execution checks. Target credentials must not be available outside the PALO execution boundary.

### P0-4 — Shared bearer token collapses security roles

The reference gateway uses one shared token for profile and policy administration, action verification, approval resolution, registry access and evidence submission.

Required correction: introduce OIDC and/or mTLS workload identity, least-privilege RBAC, tenant/environment boundaries, credential rotation, and separation among administrator, agent, connector, reviewer and auditor.

### P0-5 — Client-supplied execution evidence can be signed

The preview evidence API accepts a claim, decision and outcome from an authenticated caller. The runtime validates binding and status but does not establish that the decision was its immutable stored decision or that a trusted executor performed the side effect.

Impact: a token holder can ask the service to sign a false execution outcome.

Required correction: accept outcome evidence only from a registered governed executor; look up the immutable decision and consumed capability server-side; commit execution state and an evidence outbox atomically.

### P0-6 — Approval is cryptographically bound but not yet meaningful

The approval object binds IDs and a digest, but the reference reviewer presentation does not yet provide a complete trusted view of tool, target, arguments, data sensitivity, consequences, reversibility and policy reason. Reviewer identity is also not production-authenticated.

Required correction: create a signed/redacted action presentation, authenticate and authorize the reviewer, enforce separation of duties and expiry, and resume through a one-time backend signal.

### P0-7 — Registered policy provenance is not bound to evaluated OPA code

The registry stores a policy manifest and digest, while the evaluator calls a fixed OPA data endpoint. The response does not prove that the loaded bundle is the registered artifact.

Required correction: use signed and pinned OPA bundles, controlled promotion/rollback, decision provenance, and an evaluator identity/bundle digest that is verified and recorded with each decision.

## P1 correctness and interoperability gaps

- Replay state is namespaced by agent ID rather than case plus agent, allowing cross-case collisions when IDs are reused.
- Replay reservation, decision, approval, execution and evidence are separate transactions; crash and concurrency behavior is not yet safe enough for distributed execution.
- Reusing a claim ID with different content can update stored decision state, weakening immutable provenance.
- Canonicalization is custom across JavaScript and Python. Adopt RFC 8785/JCS or explicitly version the algorithm and publish cross-language Unicode/number test vectors.
- The Dify example creates new claim identity and replay material even when an approval ID is supplied; it therefore does not implement exact-claim approval resume.
- The Dify example does not express the full network-intent vocabulary.
- Android approval source and automated build/test evidence are not present in this repository. Mobile claims should link to independently traceable artifacts or remain scoped to a prototype outside this tree.

## P2 test and operations gaps

- Add Rego tests for host allowlists, every operation, delegation depth/count/roles, approval terminal/expired states and effective path-to-scope binding.
- Add gateway authentication and authorization tests, malformed HTTP tests and rate/size boundary tests.
- Exercise the real node `execute()` path and gateway error modes automatically; current n8n unit tests focus on utilities and package metadata.
- Replace the in-process policy stub E2E with a distributed staging path: gateway/MCP, real OPA HTTP, platform adapter, governed executor, reviewer, evidence and ledger verification.
- Add concurrency, crash/restart, backup/restore, corruption, key rotation, tamper and disaster-recovery tests.
- Generate SBOM, package digest and provenance before external package distribution.

## P3 documentation and release hygiene

This assessment corrected the following visible inconsistencies:

- n8n README HMAC environment variables now match `PALO_HMAC_KEYS_JSON` used by the runtime;
- the README now starts OPA explicitly and sets `PALO_OPA_URL`;
- package, credential and community links now point to `main`;
- publication status now records that source is on `main` and that the local alpha install passed;
- the release manifest distinguishes the passed local alpha from the deferred post-npm community installation.

Remaining claim discipline:

- use “governance-enabled” or “visual governance gate” for opt-in integrations;
- use “brokered execution” only when PALO owns the target credential and execution;
- use “enforced” only when direct paths are removed and server-side enforcement remains mandatory;
- never claim biometric signing, exactly-once execution, n8n verification, certification or production readiness without linked evidence.

## Recommended delivery sequence

1. Fix P0-1 and add exhaustive resource-binding tests.
2. Replace cached allow semantics with fresh authorization plus one-time capability consumption.
3. Move execution evidence into a registry-bound executor and transactional outbox.
4. Introduce principal identity, RBAC, reviewer authentication and meaningful action presentation.
5. Bind policy registry provenance to signed OPA bundles and decisions.
6. Implement the n8n brokered executor, then workflow admission for enforced self-hosted deployments.
7. Standardize canonicalization and correct Dify immutable resume.
8. Run the distributed E2E and recovery suite with at least two isolated design partners.
9. Re-audit security and update the capability matrix with evidence.
10. Only then decide on npm publication, n8n Creator Portal submission and other marketplace packages.

## Release decision

Maintain status **developer preview**. GitHub source, architecture material, mock demos and isolated design-partner evaluation are appropriate with the existing disclaimer. npm publication, verified-connector claims and production use should remain deferred until the P0 blockers and distributed assurance gates are closed.

For implementation patterns and platform-specific setup, use the [PALO-AI Governance Integration Guide](palo-ai-governance-integration-guide.md).
