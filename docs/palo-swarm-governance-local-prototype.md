# PALO swarm governance: local prototype

Publication note, 17 September 2026: this guide describes a separately evaluated, unreleased swarm source snapshot. The published PALO-AI server and ANS branch do not yet include this extension. Reproduction requires the matching maintainer snapshot; the commands below are not available in the published baseline. See the [dated status and evidence](palo-status-2026-09-17.md).

Status: unreleased implementation on top of the PALO-AI v2.7 reference runtime. The original transaction boundary is extended by [distributed workers, dynamic membership and verified cancellation](palo-swarm-distributed-execution.md). SQLite still belongs to one central authority; production readiness is not established.

## Four observable outcomes

1. Register an immutable mandate with an accountable owner, objective, tenant, case, coordinator, parent-child membership, exact profile digests, validity period, shared budget and concurrency limit.
2. Reserve exposure against the whole swarm in the same transaction that consumes the execution capability and records execution intent. Parallel agents cannot each spend the same remaining allowance.
3. Revoke a coordinator or subtree. New starts for affected identities are denied, issued capabilities are revoked, and already-started work remains visible until its outcome is observed.
4. Reproduce a case where three individually permitted actions would exceed a collective limit. Only two reach the synthetic executor.

```sh
npm run test:swarm
npm run demo:swarm
npm run demo:swarm -- --output output/swarm-governance/verification.json
```

The demo uses synthetic identity assertions and a deterministic refund connector. It proposes three actions of 4,000 units against a shared 10,000-unit mandate. All three obtain an individual policy permit before the execution race. Two execute, committing 8,000 units; one is denied before its connector runs. The second scenario revokes the coordinator while one action is in flight, rejects a fresh descendant action and reports the original action's eventual completion without claiming it was forcibly stopped.

## Contract and integration

The contract is [`palo-swarm-mandate.schema.json`](../schemas/palo-swarm-mandate.schema.json). Register every member profile first, then register the mandate before any member submits an action. In this prototype an agent identity belongs to one immutable mandate globally; it cannot switch cases, tenants or swarms to reset its budget. New members use audited membership revisions. Mandate amendments and identity reassignment still require a future governed migration workflow. Re-registering identical content is idempotent and does not restore revoked authority.

`mandateVersion` identifies the immutable approved content. The owner names the human subject and issuer from which all member delegation chains must originate. Each chain must follow the registered ancestry and still pass the existing scope, time-window and cryptographic-authority checks. Profile changes invalidate the member and its descendants until a future explicit migration is implemented. The objective is an accountable statement, not a machine-verified guarantee of goal alignment.

Use identity-bound Action Claim 1.3 or 1.4 and attach:

```json
{
  "metadata": {
    "swarm": {
      "swarmId": "swarm-refund-demo",
      "mandateDigest": "sha256:<digest returned at registration>"
    }
  }
}
```

This binding is covered by the existing claim digest, approval and execution capability. Membership comes from the server registry: omitting the binding, changing the case or using a legacy claim fails closed. A caller cannot supply an alternative cost in the binding.

Three foundation MCP tools expose this workflow; the distributed extension adds member admission and cancellation:

| Tool | OIDC scope | Purpose |
| --- | --- | --- |
| `palo_register_swarm_mandate` | `palo:admin` | Register the mandate, binding the actor to the authenticated subject |
| `palo_get_swarm_status` | `palo:read` | Read tenant-bound budget, members, outstanding work and local evidence |
| `palo_revoke_swarm_authority` | `palo:admin` | Revoke one member and its descendants with a recorded rationale |

These tools are excluded from the dedicated Knowledge Reader. Stdio and shared-token development mode assume a trusted local operator; supplied actor labels are not authentication. The existing governed execution tool automatically applies swarm checks. The REST Gateway's execution path uses the same core, but it does not add swarm administration routes.

## Budget and concurrency semantics

Every governed action by an enrolled identity must match exactly one rule by tool, operation, resource and canonical path prefix. A rule either extracts a non-negative integer from the exact action arguments through a JSON Pointer or applies a fixed charge. Each rule also sets a per-action maximum. Ambiguous rules, missing values, fractions, negative values and actions without a rule are rejected. Zero-cost reads require an explicit zero-cost rule.

The budget measures **committed exposure**, not settled spend. The operator must verify that the charge rule correctly bounds the connector's possible effect. There is no exchange-rate conversion, automatic refund, periodic reset or claim that a malicious connector cannot overspend. The Effect Contract remains responsible for observing the actual effect.

Once execution intent is committed, the charge stays committed even if the connector fails, its result is unknown or the process crashes. Uncertainty cannot manufacture new budget. Idempotent retries do not charge or execute again. Capability consumption, the charge and signed swarm evidence commit or roll back together. The concurrency limit counts started work awaiting an outcome across all members; a queued approval does not reserve capacity.

An unverified outcome or failed execution places the swarm on hold, except a confirmed cancellation with no effects. Later successful verification does not automatically resume the swarm or release exposure. This conservative prototype deliberately has no automatic recovery or budget-release command.

## Revocation and evidence

The capability-consumption transaction is the local start boundary. Revocation before this boundary prevents the start, including when it occurs during policy evaluation or pre-state observation. After that boundary, an external effect may already be in progress. Revocation blocks subsequent starts and reports in-flight execution identifiers; it does not itself establish cancellation, rollback or absence of harm. The optional dispatcher propagates cancellation and records separate authoritative confirmation.

Revocation is durable and applies to registered descendants. A sibling remains eligible when only another subtree is revoked. Revoking the coordinator blocks the complete registered swarm. The original mandate and events remain available for review.

Mandate registration, committed charges, revocations and observed outcomes produce a dedicated append-only, HMAC-signed event chain. Snapshots verify signatures, sequence, digest links and the committed-charge total. Execution receipts and outcome attestations continue through the existing PALO evidence ledger. Keys remain in the reference process; there is no external anchoring, managed key custody or protection against a privileged host altering the database and signing material.

## Remaining gates

- Authenticate and attest agent processes, spawning, connectors and all paths to protected credentials.
- Extend the new membership revisions and worker leases to cross-organization delegation, task assignment and conflict resolution.
- Design shared invariants over data disclosure, derived memory and multiple resources; the current budget covers one explicitly defined unit.
- Prove behavior across independent database replicas, network partitions, remote effects and controller failure. The local tests do not establish those properties.
- Establish forceful remote cancellation where supported and authoritative confirmation of containment.
- Complete independent evaluation, production identity, key custody, storage isolation and operational recovery requirements. Existing production admission remains denied.

PALO-AM's MACR and CECR remain methodological indicators. This implementation does not provide a general detector for collusion, emergent intentions or objective drift.
