# PALO platform evolution analysis

## P0 - Release reliability

### Delivered scope

P0 establishes a minimal Node 20 toolchain for source validation, deterministic allowlisted publication, built-artifact exactness, and Chromium smoke testing. One `2.4.0` release identifier in `release-manifest.json` governs the shared `palo-v21.css` and `palo-v21.js` cache keys. CI validates source, rebuilds and validates `dist`, checks deterministic exactness, smokes every public HTML page, and uploads only `dist` to GitHub Pages.

The publication boundary is explicit. It retains all linked public modules and runtime assets while excluding working documents, workshop files, raw APK/AAB binaries, non-public screenshots, hidden desktop metadata, and repository/toolchain internals. `_headers` and hosting guidance provide a portable header policy while stating that GitHub Pages does not apply arbitrary custom headers.

### Test evidence

The release gate is `npm run p0`: source validation, clean build, dist validation, deterministic rebuild comparison, and Playwright Chromium smoke. Validation covers HTML document structure, local targets and fragments, same-origin canonicals, sitemap targets/canonical agreement, RSS structure/current-release presence, manifest versions/dates, and exact shared asset queries.

### Residual risk

Browser smoke confirms page loading, local request success, title/body rendering, and uncaught browser errors at one desktop viewport. It is not a complete functional, accessibility, visual-regression, or external-link test. Third-party CDN availability remains outside deterministic build control. GitHub Pages ignores `_headers`, so those controls require a compatible host or an upstream CDN. Existing inline code prevents deploying a strict CSP without a separate compatibility effort.

### UI impact

No layout or interaction is changed in P0. Visible release labels advance to v2.4.0 and release history gains the release-reliability entry. Shared shell assets receive one consistent cache key, reducing stale mixed-version presentation after deployment.

### UX impact

Visitors should see fewer partial or broken releases because missing files, bad fragments, stale assets, malformed publication metadata, and browser-load failures now block deployment. The operational workflows themselves are unchanged.

### Next dependencies

P1 may add schemas, fixtures, local case-file APIs, imports, exports, and simulator behavior. Each new public artifact must be added deliberately to the publication allowlist and to the relevant validation/smoke coverage. P2 and P3 are not implemented by this release.

## P1 - Operational evidence core

### Delivered scope

P1 adds versioned `palo-case-file` and `palo-evidence-bundle` schemas, valid and invalid fixtures, migration guidance, structured source/freshness metadata, and incident/material-change definitions that reopen named lifecycle gates. The shared `PALOCaseFile` browser API creates, validates, imports, exports, merges, stores, and hands off records locally while retaining unknown fields. It also generates a board-review Markdown pack from the same case record.

Stakeholder Onboarding imports supported JSON, resumes an existing onboarding route, and hands the case to Assessment Path. Assessment Path imports or resumes a case, emits evidence-bundle v1 JSON and Markdown, saves its route into the case, creates the board pack, and hands agentic cases to PALO-AM. The embedded PALO-AM Simulator deterministically combines action space, autonomy, reversibility, data sensitivity, and potential impact into a tier; it recommends controls, evidence, and KPI/KRI measures; exports JSON/Markdown; and writes the result back into the case.

### Test evidence

The Node validator compiles both JSON Schemas with draft 2020-12 and asserts that each valid fixture passes and each invalid fixture fails. Browser coverage verifies unknown-field preservation, onboarding case import and route creation, onboarding-to-Assessment handoff, Assessment resume and save, evidence JSON/Markdown download content, board-pack sections, Assessment-to-Simulator handoff, deterministic prohibited/redesign routing, simulator case save and JSON/Markdown content, Simulator-to-Assessment return, and horizontal-overflow checks at 390x844 and 360x800. The normal public-page smoke, source/dist validation, deterministic build comparison, and local-request/error checks remain active.

### Residual risk

The API is a single-browser interoperability layer, not encrypted storage, access control, multi-user collaboration, or a remote case-management service. Browser storage can be cleared by the user or browser and exported files inherit the security of their destination. Merge uses known record identifiers and incoming-value precedence; it does not provide semantic conflict resolution or signatures. Source freshness is user-maintained review metadata and does not prove that a source remains legally current. Trigger mappings support review planning but do not determine legal incident materiality. Simulator recommendations are transparent baseline rules, not a validated production control profile or legal conclusion.

### UI impact

Onboarding gains a compact import control and local-case resume band without changing its three-question core. Assessment Path gains an explicit case workspace status, import/resume controls, board-pack action, and PALO-AM handoff beside its existing exports. PALO-AM gains a dense operational simulator section inside the existing module page, using native selects, stable two-column layout, 44px controls, visible focus, and a single result surface. New controls collapse to one column on narrow screens and introduce no horizontal overflow at the tested mobile widths.

### UX impact

Users can now carry one case from orientation through assessment, agentic routing, evidence export, and board review without re-entering all context or creating an account. Status messages identify when a case is imported, resumed, saved, migrated, or linked. The handoff remains explicit and reversible, while JSON and Markdown keep work portable outside the site. This reduces dead ends between modules, but users still need to manage exported-file custody, source review, evidence quality, and final accountable decisions.

### Next dependencies

P2 can build curated control, KPI/KRI, gate, source, scenario, and connector libraries on these v1 contracts. P3 can expose platform navigation and delivery status without changing the P1 storage contract. Future format changes require a new schema version and an explicit migration rather than silent reinterpretation.

## P2 - Adoption and integration layer

### Delivered scope

P2 adds versioned educational starter libraries for eight controls, eight KPI/KRIs, six lifecycle decision gates and six sources. Stable IDs connect those records to a machine-readable adoption index, six fictional worked Case Files and five Markdown templates for procurement, incident response, board review, red-team evidence and contributions. Every worked case conforms to the P1 Case File schema, identifies its non-production status and source limitations, and carries indexed control, indicator, gate, source and template references.

The integration foundation includes a PolicyWatcher monitoring-signal schema with valid/invalid fixtures, mandatory non-authoritative status and confidence rationale; a versioned browser-event and storage contract; vendor-neutral issue-tracker, GRC and document-system connector patterns; and a deliberately small policy-as-code example with a validated input. Dependency/license inventory, publication-hygiene guidance and a complete P2 index document define the maintenance boundary. No connector is configured, no assessment is transmitted, and no credential or live tenant detail is included.

### Test evidence

`scripts/validate.mjs` compiles the four library schemas, P2 index schema, PolicyWatcher schema and policy-input schema under JSON Schema draft 2020-12. It validates every library and example; asserts that the PolicyWatcher valid fixture passes and invalid fixture fails; checks unique IDs and all control/indicator/gate/source/template references; verifies indexed files and schemas exist; validates all six worked examples against the P1 Case File schema; requires exact agreement between case references and the P2 index; and confirms every P2 JSON path appears in the index document. The P0 release gate then validates source and generated `dist`, compares deterministic build hashes and smokes every public HTML page.

### Platform impact

P2 changes PALO from a portable Case File foundation into a reusable adoption kit. Modules and external adapters now have stable artifact IDs, versioned formats, explicit handoff events and a conservative connector boundary. The P1 local-first ownership model remains authoritative, and the allowlisted build publishes only reviewed P2 artifacts. No P3 Platform Map, navigation graph entities or Explorer navigation mode are added.

### UI impact

P2 adds no new page, navigation item, graph mode or runtime control. Existing P0/P1 interfaces and public HTML remain visually unchanged. The artifacts are directly usable as JSON, Markdown and Rego source files, so this phase avoids presenting documentation infrastructure as a finished product UI.

### UX impact

Adopters can begin with connected examples instead of inventing control names, indicator fields, gate prompts, evidence records and templates independently. Worked cases demonstrate how one Case File can point across the library while retaining explicit gaps and caveats. Integration teams receive predictable event names, data boundaries and failure behavior, reducing ambiguity without implying one-click synchronization or automatic policy interpretation.

### Risk impact

Automated cross-reference and schema checks reduce broken starter content, format drift and publication omissions. Mandatory educational, source-status and non-authoritative language reduces the chance that examples or monitoring signals are mistaken for legal conclusions or production assurance. Vendor-neutral connector guidance reduces credential leakage and silent data-transfer risk by requiring preview, allowlisting, validation, idempotency and explicit user initiation.

### Residual risk

The starter records are not calibrated to an organization, sector, jurisdiction, threat model or risk appetite. Illustrative thresholds may create false confidence if copied without baselines and accountable decision rights. Source freshness dates require ongoing human maintenance and do not prove legal currency or applicability. Browser events are same-page untrusted input, not authenticated messaging. Connector patterns are design guidance, not implemented security controls, and the policy-as-code example does not authenticate facts, test evidence quality or make deployment decisions. Existing externally hosted font and presentation dependencies remain outside deterministic publication control.

### Next dependencies

Future UI work may expose these artifacts through an accessible operational map and filtered navigation, but must preserve the structured-list fallback, stable IDs, local-first Case File ownership and non-authoritative source semantics. That P3 public Platform Map and graph-navigation work remains intentionally unimplemented in P2.

## P3 - Platform and research map

### Delivered scope

P3 adds a public operational Platform Map on the shared PALO shell. It identifies the current release, distinguishes Implemented, Foundation and Research states, records P0-P3 lateral impacts, and routes stakeholder intents through lifecycle phases to named modules and artifacts. The interactive topology and its semantic table contain the same twelve routes and share stakeholder, phase and status filters. Direct links expose schemas, libraries, templates, integration guidance, analyses, onboarding and working modules.

The primary Operationalization Explorer now includes twelve navigation entities and eleven navigation relations alongside the existing weighted entity-relationship model. Each navigation node exposes destination, stakeholder, phase, artifact and status properties. A native Workflow/Navigation mode control swaps the rendered graph subset without changing the original stage, module, artifact or weighted relation records, the guided onboarding activation contract, camera reset, inspector, reduced-motion behavior or 3D fallback.

### Test evidence

The P0 release gate validates the new HTML, fragments, canonical, sitemap, RSS, manifest and exact `dist` publication. Browser coverage verifies the Platform Map title and state labels, homepage and Documentation Hub links, synchronized filter results and table rows, 360px document overflow, Explorer navigation-mode activation by control and query string, navigation inspector properties, restoration of the weighted workflow, graph canvas pixels/readiness, camera reset, semantic search and forced fallback links. Required 1440x900, 390x844 and Explorer navigation screenshots plus the populated PALO-AM Simulator screenshot are retained as public visual evidence.

### Platform impact

P3 makes public platform topology a first-class record rather than leaving architecture implicit across page names and repository folders. Navigation entities use the same graph runtime and phase vocabulary as the operational workflow while remaining a distinct relation mode. The deterministic allowlist publishes the page, assets and evidence screenshots, and release metadata records Platform Map and Explorer component versions.

### UI impact

The Platform Map uses the existing ink, teal, surface, gold and restrained red palette with compact headings, square-edged status markers, 44px controls and no decorative media. A four-column desktop topology becomes two columns on tablet and one column on mobile. The P0-P3 impact ledger and semantic table reflow into labeled records at narrow widths, preventing document-level horizontal overflow. Shared navigation and the Documentation Hub gain one direct Platform Map entry. The Explorer gains a compact two-button graph mode control without displacing motion, camera or semantic-view controls.

### UX impact

Visitors can begin with an accountable intent and expected artifact instead of knowing a module name in advance. Filters provide a short route for a stakeholder or lifecycle phase, while the always-available table gives keyboard, screen-reader and non-spatial users the same destinations. Honest status labels reduce ambiguity between a working interface, reusable starter material and open research. Explorer users can inspect navigation destinations in 3D and return to the weighted workflow without losing its phase model.

### Risk impact

The synchronized map/table filter and automated link checks reduce stale navigation and inaccessible graph-only discovery. Explicit Foundation and Research language reduces the chance that starter content, connector patterns, monitoring signals or exploratory programs are mistaken for implemented assurance. Keeping navigation relations separate from operational relations avoids silently changing the weighted governance model.

### Residual risk

The map is curated release metadata, not an automatically discovered architecture inventory. A valid link does not establish that a module is suitable for a specific organization or jurisdiction. Graph navigation remains an optional visual aid dependent on WebGL and JavaScript; the Platform Map table is the authoritative fallback. Status labels do not certify control effectiveness, legal completeness, source applicability or evidence quality. Research programs still require empirical methods, sector calibration, accountable review and, where relevant, qualified professional assessment.

### Next dependencies

Future releases should update navigation nodes, table routes and release status together and keep browser assertions on their count and required properties. Live connectors, authenticated collaboration, evidence custody, calibrated thresholds or certification claims require separate threat models, schemas, migrations and validation programs rather than a status-label change.

### Evaluator revision

Independent frontend evaluation identified four mobile acceptance gaps after the initial P3 implementation. The navigation query now avoids adding `#frame` on narrow screens, positions the graph after WebGL layout settles, hides the unrelated mobile phase strip in navigation mode, and focuses the visible 44px Navigation control. All Explorer mode, phase, relationship, inspector-command, semantic-summary, search-input and search-result targets now meet the 44px minimum.

PALO-AM result rendering now scrolls to the result with a 96px fixed-navigation offset and retains focus without a second browser scroll. Automated coverage exercises tiers 0 through 4 at both 390x844 and 360x800 and verifies that the focused result remains below both fixed bars. The legacy action-space matrix and KPI/KRI table are now named keyboard-focusable regions with visible mobile instructions to scroll horizontally. Browser smoke measures the landing position, active control, target heights, result offset, scroll-region affordances and document overflow so these evaluator findings become release-blocking regressions.

### PolicyWatcher maintenance integration

The v2.4.0 maintenance integration makes the existing PolicyWatcher boundary operational without creating a connector. Assessment Path accepts a local `palo-policywatcher-signal` JSON file, validates required structure and the non-authoritative authority status, preserves the complete signal and additive fields, and maps the observation to a Case File monitoring source, open evidence record and material-change record. The source retains the original URL, observed and retrieved dates, change summary, confidence with rationale, live companion and local contract. Measure and Prove are flagged for pending human review; confidence is not converted into legal significance, applicability or control effectiveness.

Browser tests prove valid import, additive-field preservation, visible pending-review state, the exact reopened gates, browser-event dispatch and normalized source fields. They then reject the invalid fixture and byte-compare local storage to prove no Case File mutation. Request monitoring confirms import sends no request to PolicyWatcher. Platform Map and Explorer tests require the exact `https://www.policywatcher.online/` destination, local schema, Foundation status and authority-boundary properties. Public references use the canonical `www` host and external UI links retain `_blank` plus `noopener noreferrer`.

The residual boundary is deliberate: PALO does not fetch PolicyWatcher observations, authenticate portal records, verify that a detected change is material, or determine whether a policy applies. An accountable person must inspect the primary policy, establish relevance, update the evidence state and close or retain the reopened gates.
