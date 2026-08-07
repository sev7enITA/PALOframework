# PALO + Microsoft AGT interoperability proposal

Status: outreach-ready draft. Updated 7 August 2026.

## Recommendation

Contact the GitHub maintainers before approaching Microsoft commercially and before opening a large pull request. The smallest useful request is technical validation of the interoperability boundary, not adoption of PALO as an AGT dependency.

The proposed relationship is:

- Microsoft AGT remains the runtime policy and enforcement system.
- PALO consumes the AGT pre-action verdict through a vendor-neutral provider contract.
- PALO adds a downstream accountability record and independent outcome verification.
- Neither project replaces the other's native evidence-verification mechanism.
- The AGT repository does not need to depend on PALO.

This aligns with AGT's existing documentation pattern for external operation-accountability profiles, which explicitly treats external adapters as outside the AGT runtime trust boundary and welcomes a reference implementation.

## What has been built

- A vendor-neutral `palo-agentic-enforcement-provider` manifest.
- A fail-closed JavaScript provider interface with no Microsoft dependency in the PALO core.
- An optional adapter for `agent-control-specification@0.3.1-beta.0`.
- Mapping from PALO Action Claim, agent identity, tenant, scope, resource and approval to the ACS `pre_tool_call` snapshot.
- Preservation of AGT action identity and evidence digest in PALO decision evidence.
- A policy and runnable synthetic demonstration covering escalation, approval, allowed execution, verified effect and allowed-but-mismatched effect.
- Contract, negative and full PALO runtime tests.

The adapter deliberately rejects an ACS `transform` verdict and asks for a new PALO Action Claim. This prevents transformed arguments from bypassing the digest that binds authority, approval and the Effect Contract.

## Recommended contact sequence

1. Search current AGT issues and discussions for PALO, operation-accountability and outcome assurance.
2. Open one focused [GitHub Discussion](https://github.com/microsoft/agent-governance-toolkit/discussions). The upstream issue configuration explicitly routes questions and ideas there.
3. Ask whether maintainers prefer:
   - an external reference link only;
   - a small documentation PR;
   - a runnable example under the AGT `examples/` tree;
   - no upstream artifact, with the integration maintained solely by PALO.
4. Wait for maintainer routing before preparing a broad PR. If they want a new framework integration or public API/security-boundary change, use AGT's `RFC: Major Feature Proposal` template; its checklist explicitly requires an RFC for framework integrations. A small documentation-only update does not require an RFC under the same upstream guidance.
5. If invited, fork AGT, create a branch from current `main`, read the nearest `AGENTS.md`, add tests/docs, sign the Microsoft CLA and use DCO-signed commits.
6. Publish the evaluation news immediately only as a PALO proposal. Publish acceptance language only after a maintainer explicitly accepts or merges the contribution.

## Draft initial message to maintainers

**Title:** Proposal: PALO outcome-assurance adapter for AGT ACS `pre_tool_call`

**Body:**

> We have implemented a PALO-maintained, MIT-licensed interoperability adapter for the Agent Control Specification Node SDK (`0.3.1-beta.0`). The adapter keeps AGT as the runtime policy decision system and maps a digest-bound PALO Action Claim to ACS `pre_tool_call`. PALO then uses its own one-time execution capability, trusted executor receipt and authoritative post-state verifier to distinguish an allowed action from a verified outcome.
>
> The integration introduces no AGT dependency on PALO. AGT deny/runtime failures fail closed; escalate becomes a PALO digest-bound approval; and transform is rejected until the caller submits a new Action Claim, avoiding mutation behind an approved digest. AGT action identity and evidence references are retained in the downstream PALO decision record.
>
> We have a runnable synthetic demonstration showing both `allowed -> verified` and `allowed -> outcome mismatch -> incident hold`, plus contract tests and a documented trust-boundary matrix. The current implementation is explicitly described as a community interoperability proposal, not a Microsoft-endorsed integration.
>
> Would the maintainers prefer this to remain an external reference implementation, a small addition to the external operation-accountability profile documentation, or a runnable example proposed through a fork/PR? We are happy to follow the repository's routing, CLA, DCO and testing requirements.
>
> PALO implementation: [insert immutable PALO commit URL]
> Demo and boundary document: [insert immutable file URL]

Do not send the message until the implementation is committed and the placeholders can be replaced with immutable GitHub URLs.

## Commit hygiene in the current PALO checkout

The working tree used to build this proposal already contains unrelated local work. Do not use `git add -A` or commit the whole generated `dist/` tree. Review and stage the integration paths explicitly:

```text
README.md
package.json
package-lock.json
packages/palo-mcp-server/README.md
packages/palo-mcp-server/core.js
packages/palo-mcp-server/core.test.js
packages/palo-mcp-server/enforcement-provider.js
packages/palo-mcp-server/enforcement-provider.test.js
packages/palo-mcp-server/providers/
packages/palo-mcp-server/gateway.js
packages/palo-mcp-server/http.js
packages/palo-mcp-server/index.js
schemas/palo-agentic-enforcement-provider.schema.json
schemas/fixtures/palo-agentic-enforcement-provider.valid.json
schemas/palo-agentic-policy-decision.schema.json
scripts/public-files.mjs
scripts/validate-agentic.mjs
examples/agentic-interface/README.md
examples/agentic-interface/integrations/microsoft-agt/
docs/integrations/palo-microsoft-agt-proposal.md
docs/community/palo-microsoft-agt-integration-news-draft.md
```

Generate and review publication artifacts separately. Some existing `dist/` files reflect unrelated documentation work, so a clean release branch or a selective generated-artifact commit is safer than mixing them into the adapter commit.

## If maintainers request a pull request

Use a fork as the normal GitHub contribution mechanism, not as a permanent competing distribution.

Suggested branch:

```text
docs/palo-outcome-assurance-interoperability
```

Suggested minimal upstream change:

1. Add `docs/integrations/palo-outcome-assurance.md` describing the external boundary.
2. Update AGT's external operation-accountability profile page with a neutral reference to the PALO implementation.
3. Link to an immutable PALO release or commit.
4. Add no PALO runtime dependency to AGT.

Only add a runnable AGT-side example if maintainers explicitly prefer it. If requested, keep the example small: construct `AgentControl`, call the PALO mapping adapter, and demonstrate one allow and one deny/escalate case. Outcome verification should remain a call to a separately deployed PALO service or a clearly labelled mock.

AGT contribution requirements observed from the upstream repository:

- fork and branch from `main`;
- read the nearest `AGENTS.md` before editing;
- Microsoft Contributor License Agreement;
- DCO `Signed-off-by` trailer on every commit;
- relevant tests and public API documentation;
- clear disclosure of AI-assisted contributions where requested by project policy.

## Draft pull-request description

**Title:** docs: document PALO external outcome-assurance interoperability

**Summary:**

> Documents a third-party interoperability pattern in which AGT ACS remains the pre-action policy runtime and PALO consumes the verdict for downstream lifecycle accountability and authoritative outcome verification. The change does not add a runtime dependency, modify AGT enforcement, replace AGT evidence verification or imply Microsoft endorsement.

**Validation:**

- ACS `pre_tool_call` mapping tested with `agent-control-specification@0.3.1-beta.0`.
- Allow, deny, warn, escalate, transform and runtime-error mappings covered.
- Digest mismatch and transformed-argument paths fail closed.
- PALO demonstration covers verified and mismatched authoritative outcomes.

**Trust boundary:**

- AGT: ACS evaluation, manifest/policy runtime and AGT evidence integrity.
- Adapter: mapping and correlation; third-party, outside AGT's trust boundary.
- PALO: capability, execution receipt, authoritative state verification and incident workflow.

## Fork decision

| Option | Use it when | Recommendation |
|---|---|---|
| Maintain only in PALO | Maintainers prefer external integrations or API changes quickly | Safe default |
| Fork for a contribution branch | Maintainers invite a documentation/example PR | Preferred contribution workflow |
| Maintain a long-lived AGT fork | PALO needs changes AGT rejects and cannot support through public APIs | Avoid unless technically unavoidable |
| Contact Microsoft sales/partnership | A validated design partner and production business case already exist | Later, after technical maintainer feedback |

The current adapter uses a public ACS surface and therefore does not require a long-lived AGT fork.

## Acceptance criteria for calling it an integration

- Real ACS package is exercised, not only a fake test double.
- The ACS version and upstream commit are pinned in the evidence.
- Missing ACS, manifest errors and evaluation failures deny.
- Claim ID, agent ID, case ID, scopes, resource and approval digest remain correlated.
- AGT transformations cannot silently change an approved PALO claim.
- PALO outcome status comes from an authoritative state reader, not from the AGT/tool response.
- Compatibility and known bypass paths are published.
- No text implies Microsoft certification, sponsorship or endorsement.

## Publication language

Before upstream feedback, use:

> PALO has published a proposed community interoperability adapter for Microsoft Agent Governance Toolkit ACS and is seeking maintainer and practitioner evaluation.

After a maintainer acknowledges the design but before merge, use:

> PALO and AGT maintainers are evaluating a proposed interoperability pattern.

Only after merge or explicit written approval use precise language such as:

> The PALO interoperability documentation/example was accepted into the Microsoft Agent Governance Toolkit repository in PR #…

Never shorten that to “Microsoft partnered with PALO” unless a separate partnership has actually been announced by Microsoft.
