# PALO v3.0.1 UI/UX: detailed analysis and three-wave delivery plan

Date: 13 August 2026
Scope: public web platform at `paloframework.org`, desktop at 1440x900 and mobile at 390x844, with focused review of the homepage and Evidence Pack route.
Target: clearer orientation, responsive task continuity, WCAG 2.1 AA-oriented implementation, and a source-grounded PALO Guide Agent that products can consume through MCP.

## Overall verdict

PALO v3.0.1 has a credible and visually disciplined first screen. The Evidence Pack gives the platform a concrete entry outcome, the privacy boundary is unusually clear, and the generated mobile route is readable. The principal issue is no longer missing capability; it is excess simultaneous explanation.

The experience currently asks a new visitor to understand the product hierarchy, choose among multiple public tools, reconcile the six-phase canonical governance loop with older five-phase lifecycle content, and scan a very long homepage. On mobile, an optional monitoring import interrupts the core Evidence Pack task before the form. These are information-architecture and task-priority problems, not a need for a visual rebrand.

## Captured flow

### Step 1  -  Homepage, desktop  -  generally healthy, overloaded after entry

Evidence: `audit/ui-ux-3-wave-2026-08-13/current/01-home-desktop.png`.

The hero has a single strong proposition, a visible primary action, a useful dossier preview and appropriate reassurance. The command bar, however, presents search plus six destinations before the user has selected a governance goal. Below the v3 sections, legacy content remains fully expanded, duplicating product explanations and modules.

### Step 2  -  Homepage, mobile  -  strong reflow, excessive vertical commitment

Evidence: `audit/ui-ux-3-wave-2026-08-13/current/02-home-mobile.png`.

The 390px layout preserves hierarchy, makes the primary action full-width, maintains readable type and reduces navigation to two 44px controls. The dossier preview follows logically. The rest of the page remains exceptionally long, and the older content is not progressively disclosed.

### Step 3  -  Evidence Pack workspace, mobile  -  task is interrupted

Evidence: `audit/ui-ux-3-wave-2026-08-13/current/03-assessment-mobile.png`.

The preloaded case state, local-first explanation and import/resume controls are clear. The optional PolicyWatcher receiver occupies a large block before the core fields. This gives a secondary post-deployment monitoring capability more visual priority than the primary "build the route" task.

### Step 4  -  Generated route, mobile  -  healthy and actionable

Evidence: `audit/ui-ux-3-wave-2026-08-13/current/04-assessment-result-mobile.png`.

The result lands close to the submit action, has a clear title, explains why four modules were selected and exposes follow-on artifacts. The main opportunity is to make the same visible reasoning available before the user reaches the full Evidence Pack, so first-time orientation and product integration do not depend on knowing a module name.

## Confirmed strengths

- The primary proposition is outcome-led: one use case becomes a reviewable dossier.
- Privacy and authority boundaries are visible before interaction: no account, no mandatory telemetry, voluntary export, no certification.
- Ink, teal, surface neutrals and restrained gold create a serious product language without imitating a generic compliance dashboard.
- Mobile hero typography, primary target sizing and single-column reflow work well.
- The generated Evidence Pack route uses plain language and connects recommendations to real modules.
- The platform already has a strong machine-readable foundation: semantic identities, six canonical phases, gate definitions, control/indicator registries and evidence classes.

## Highest-impact UX risks

### P1  -  Top-level choice overload

Search plus six command-bar routes competes with the Evidence Pack activation goal. "Agentic Governance", "Governance Hub", "Tools" and "Readiness" are meaningful after orientation, but not all need equivalent first-screen weight.

**Required change:** make a PALO Guide/route finder the secondary top-level path, keep Evidence Pack primary, and move specialist destinations into contextually relevant sections and search.

### P1  -  Canonical model drift

The homepage first presents the canonical six-phase loop, then later describes "five phases" as "The PALO Lifecycle". Even if one is intended as system activities and the other as governance phases, the interface does not preserve that distinction.

**Required change:** use Frame, Classify, Assess, Control, Measure and Prove & Review as the only canonical governance loop. Label any older five-activity model as a complementary system-lifecycle view or demote it behind background disclosure.

### P1  -  Optional mobile content interrupts the primary task

PolicyWatcher is useful after deployment or during Measure/Prove review, but its receiver appears before the core Evidence Pack form and consumes most of a mobile viewport.

**Required change:** keep it functional but collapsed or repositioned after the route builder, with a plain "Optional monitoring signal" label.

### P2  -  Homepage length and repeated calls to action

The page repeats framework explanation, lifecycle, module promotion and multiple routes to the same tools. This makes completeness visible but reduces confidence about what to do now.

**Required change:** preserve background and specialist content behind one accessible disclosure control. Do not delete deep links or module routes.

### P2  -  Orientation logic is present but fragmented

Stakeholder Onboarding, search, Platform Map and Assessment Path all contain pieces of "where should I start?" logic. The user must discover the correct surface first.

**Required change:** add one transparent guide workbench that maps explicit signals to phases, reasons, artifacts and a handoff. Reuse the released registries rather than creating another independent taxonomy.

## Accessibility risks and evidence limits

- Visible mobile targets appear appropriately sized, but keyboard order, focus restoration and screen-reader announcements require implementation testing; screenshots cannot establish full conformance.
- The new guide must announce result changes through a status/live region and move focus deliberately only after an explicit submit.
- Progressive disclosure must use native `details/summary` or equivalent semantics, preserve deep-link targets and remain operable by keyboard.
- Code/configuration blocks must wrap or scroll inside a named region without causing document-level horizontal overflow at 360px.
- Color must not be the only signal for integration class, warning, selected state or evidence authority.
- The existing YouTube iframe and third-party content were visible but were not tested for complete assistive-technology behavior.
- No claim of full WCAG conformance is made from this audit. Automated checks and manual keyboard/screen-reader testing remain separate acceptance work.

## Three delivery waves

### Wave 1  -  Find the route

Goal: reduce time from landing to a confident first action.

- Add "Ask PALO" / "Find my route" as the secondary hero action.
- Reduce command-bar competition.
- Keep Evidence Pack primary.
- Collapse legacy/background homepage material by default.
- Remove the visible five-versus-six-phase contradiction.

Acceptance:

- A new visitor can state the primary action and secondary orientation path without scrolling.
- All existing deep links remain valid.
- Only one canonical six-phase governance loop is presented as PALO's decision model.

### Wave 2  -  Keep the task continuous on every screen

Goal: make the main task visually dominant from desktop through 360px mobile.

- Use a two-pane workbench on wide screens and one vertical path on mobile.
- Keep results adjacent to the action that creates them.
- Demote optional monitoring/import features until they are contextually relevant.
- Preserve 44px targets, focus visibility, semantic headings and zero document overflow.

Acceptance:

- Desktop and mobile users can complete a route without navigating elsewhere.
- The mobile Evidence Pack reaches core fields before optional PolicyWatcher detail.
- Keyboard and reduced-motion flows remain complete.

### Wave 3  -  Explain, infer and integrate

Goal: make PALO usable inside another product without turning guidance into hidden authority.

- Publish a browser-local `PALO_Guide.html` workbench.
- Expose the same source-grounded inference through `palo_explain_framework`, `palo_infer_governance_route` and `palo_plan_product_integration`.
- Publish the `palo_guide_agent` MCP prompt for host assistants.
- Make the integration class explicit: guidance only, advisory gate, governed executor, or workflow admission + governed executor.
- Keep target credentials, protected execution and outcome verification separate from the guide.

Acceptance:

- Every recommendation shows input signals, concise reasons, expected artifact, evidence/authority boundary and open questions.
- A guidance-only product can expose only the three read-only tools through `PALO_MCP_EXPOSED_TOOLS`.
- An acting system is never told that an advisory gate is non-bypassable.
- The interface and MCP result use the same six phases and integration vocabulary.

## Measurement plan

Measure locally or with explicitly consented, privacy-preserving analytics only:

- median time from home load to first route result;
- Evidence Pack start and completion rate by viewport class;
- percentage of inferred routes corrected by the user before handoff;
- most common unresolved questions at handoff, without retaining sensitive case text;
- mobile abandonment before the first core field;
- guide-to-Evidence-Pack, guide-to-PALO-AM and guide-to-integration-guide handoff rate;
- MCP schema/input error rate by tool;
- share of product integrations using a three-tool guidance-only allowlist versus the complete developer-preview toolkit.

These metrics indicate usability and adoption. They do not establish governance quality, control effectiveness, legal compliance or assurance.
