# News draft — PALO outcome assurance for Microsoft AGT

Status: editorial draft. The first version may be published after committing a reproducible release. The acceptance version is conditional and must not be used before upstream confirmation.

## Version A — publishable as an evaluation proposal

### PALO publishes a vendor-neutral outcome-assurance adapter for Microsoft Agent Governance Toolkit

PALO has released a community interoperability proposal connecting its full-cycle agentic assurance workflow with the Agent Control Specification in Microsoft Agent Governance Toolkit.

The integration preserves a clear separation of responsibilities. Microsoft AGT ACS evaluates the proposed tool call at `pre_tool_call` and returns an allow, deny, warning or escalation verdict. PALO binds that decision to an immutable Action Claim, a one-time execution capability and a trusted receipt, then reads authoritative post-action state to determine whether the approved effect actually occurred.

This makes a distinction that is easy to lose in agentic automation: an action can be allowed by policy and still produce the wrong, partial or unverifiable business outcome.

The runnable demonstration covers two paths:

- `allowed -> executed -> verified` when the observed catalog state matches the Effect Contract;
- `allowed -> executed -> mismatch -> incident hold` when the tool reports success but produces the wrong price.

PALO remains vendor-neutral. The new Enforcement Provider contract can support OPA, AGT ACS or another policy runtime without changing the PALO outcome-assurance lifecycle. The AGT package is optional and is not introduced as a dependency of the PALO core.

The adapter is currently maintained by the PALO project and tested against ACS `0.3.1-beta.0`. It is not a Microsoft-maintained or Microsoft-endorsed integration. PALO is inviting feedback from AGT maintainers, security engineers, governance practitioners and teams evaluating consequential agent actions.

Technical artifacts:

- vendor-neutral provider schema and fail-closed contract;
- Microsoft AGT ACS mapping and pinned compatibility statement;
- synthetic policy, runnable demo and automated tests;
- trust-boundary and known-limitations documentation;
- proposal for external review or an upstream documentation contribution.

Call to action:

> Run the synthetic demo, inspect the decision and outcome evidence, and tell us whether the boundary is useful for your agent platform. Please do not connect this developer preview to production credentials or consequential systems.

Links to insert before publication:

- Release/commit: `[immutable URL]`
- Integration quickstart: `[immutable URL]`
- Demo output or video: `[URL]`
- Maintainer discussion: `[URL, after opening]`

## Short LinkedIn / community post

Policy can allow an agent action. That does not prove the intended effect occurred.

PALO has published a vendor-neutral interoperability proposal for Microsoft Agent Governance Toolkit ACS. AGT evaluates the action at `pre_tool_call`; PALO binds approval and execution evidence, then independently verifies authoritative post-state.

The demo shows both `allowed -> verified` and `allowed -> wrong outcome -> incident hold`.

This is a PALO-maintained community proposal, not a Microsoft endorsement. We are looking for technical feedback from AGT maintainers and practitioners.

`[integration link]` `[discussion link]`

## Version B — use only after upstream acceptance

### Microsoft AGT maintainers accept PALO outcome-assurance interoperability documentation

The Microsoft Agent Governance Toolkit project has accepted PALO's external outcome-assurance interoperability documentation/example through pull request `#[number]` on `[date]`.

The accepted artifact documents a composable boundary: AGT remains responsible for runtime policy enforcement and native evidence verification, while PALO provides downstream lifecycle accountability and independent verification of the declared business effect.

The contribution does not make PALO a Microsoft product, does not create a commercial partnership and does not add PALO as a required AGT dependency. It gives implementers a reviewed reference for connecting the two open-source projects.

Upstream PR: `[URL]`
PALO release: `[URL]`

Delete this section if the upstream project does not accept a contribution.

## Editorial fact check

Before any publication, verify:

- the tagged PALO release or immutable commit exists;
- the real ACS demo passes from a clean checkout;
- exact tested ACS and AGT versions are current;
- all links resolve without authentication;
- “proposal”, “community” and “not endorsed” language remains visible;
- no Microsoft logo is used without permission;
- no statement says “official Microsoft integration”, “partnership” or “certified” without written evidence;
- any upstream acknowledgement is quoted accurately and linked directly.
