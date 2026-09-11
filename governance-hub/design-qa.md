# PALO-AI Governance Hub - Design QA

## Comparison basis

- Source of truth: selected `Guided Governance Builder` reference in `reference/guided-governance-builder.png`
- Implementation checked locally on 9 September 2026
- Desktop viewport: 1440 x 1024
- Mobile viewport: 390 x 844
- Primary state: Technical lens -> Setup -> Step 1

The iteration preserves the white enterprise control-room direction, persistent navigation, Executive/Technical lenses, eight-step setup journey, plain-language authority controls and enforcement explanation. The previous global boundary banner and setup verification strip are replaced by one compact `Current operating context` region.

## Target states and resolution

| Priority | Target | Resolution |
| --- | --- | --- |
| P1 | Fail-closed wizard progression | Only confirmed/current/next steps are available. A future-step attempt does not navigate and exposes the blocking prerequisite and required next action. Continue is disabled while the current requirement is missing. |
| P1 | Unambiguous evidence language | Added distinct `Draft input`, `Locally valid`, `Checked with evidence` and `Host/runtime accepted` levels. Static non-setup views explicitly report `Illustrative local preview / no runtime evidence` at Draft input level. Local validation is never inferred or presented as host acceptance. |
| P1 | Accessible overlays | Mobile navigation and semantic-record dialogs receive focus, trap Tab, close on Escape and restore focus to their trigger. Navigation exposes `aria-expanded`, `aria-controls` and dialog state. |
| P1 | Mobile operational actions | Registry, policy, execution, approval and incident rows become labelled card-like records below 680px; their status and action remain visible without widening the document. |
| P1 | Achievable next action | Static views offer a visible `Open Guided Setup` action and state that authenticated operations require an operator deployment instead of directing visitors to an absent sign-in control. |
| P1 | Visible control labels | Menu, drawer/dialog Close, Approve and Deny retain accessible names and now expose visible text at every applicable viewport. |
| P2 | Wizard orientation | Narrow viewports show the current step count and a horizontal-scroll cue; the current step scrolls into view automatically. |
| P2 | Integration scanability | Maturity and connection state are grouped below the description on narrow screens. |
| P2 | Search feedback | Data and capability searches expose live result counts and actionable no-results states. |
| P2 | Explicit feedback | Downloads and local approval, incident and decision transitions produce a concise visible live-region notification. |
| P2 | Reduced motion | Smooth scrolling, pulses and transitions are reduced through `prefers-reduced-motion`. |
| P2 | Legibility | Routine controls and body copy use 13-16px text; 10-11px is retained only for compact metadata, digests and trace internals. |

## Checks actually run

- `npm run build`: passed with Vite 6.4.3.
- `npm run test:governance`: passed, 18 tests including four progression tests.
- Desktop 1440 x 1024 visual inspection: passed; no overflow or visible mobile-navigation trigger.
- Mobile 390 x 844 approval view: passed; rows render as grid cards and approval actions remain visible.
- Mobile 375 x 1024 Registry view: passed; document and viewport widths both measured 375px, records render as grids and `Inspect record` remains visible.
- Mobile 375 x 1024 Integrations view: passed; the document width measured 375px and grouped status badges occupy a separate row.
- Executive static context: passed; it reports illustrative/no-runtime evidence at Draft input level and the visible Guided Setup action opens Technical Setup.
- Desktop approval actions: passed; Approve and Deny labels are visible.
- Mobile wizard orientation: passed; step count and horizontal-scroll cue are visible and blocked progression remains fail-closed.
- Future-step attempt: passed; navigation remained on the current step and displayed prerequisite guidance.
- Empty approval search: passed; `0 of 2 results` and recovery action were visible.
- Mobile drawer focus/Escape/restore: passed.
- Semantic-record dialog focus/Escape/restore: passed.
- Reduced-motion emulation: passed; media query matched and sidebar transition was reduced to `0.01ms`.
- Browser console errors during the inspected desktop and mobile states: none.

## Deliberate boundaries

- The operating-context panel reports evidence already present in the current session; it does not invent remote runtime, publication or vendor-host acceptance.
- Raw contracts, receipts and signatures remain behind explicit disclosure controls.
- Browser-local decisions and downloads produce local feedback only and do not claim backend persistence.

final result: passed

## Ask PALO evaluation revision 1 - 11 September 2026

- An Ask `401` now invalidates the visible session immediately, clears the in-memory CSRF token, exposes the BFF sign-in action and blocks both button and keyboard resubmission.
- A missing/unavailable BFF disables sign-in and presents service retry as the recoverable action.
- The composer now discloses that the configured external model provider may process the question and retains the separate credentials/personal-data warning.
- Essential Ask PALO trust, privacy, control, citation, source-path, authority-boundary and trace text is at least 12px; body details use 13-16px where appropriate.
- Rate-limit and server recovery copy no longer refers to a cooldown or request context absent from the UI.
- Clipboard success and failure use an independent polite live region.
- Starter questions now use natural bilingual concepts covered by the canonical gold vocabulary: meaningful human oversight, AI risk management, agentic governance/authority and deletion verification.
- Browser smoke covered authenticated to Ask 401 to disabled resubmission, unavailable BFF to disabled login, 429 recovery, successful answer/copy announcement, at least 12px essential text, and 1440/768/390px overflow checks.

## Ask PALO Live v1 - 11 September 2026

- First-class `Ask PALO` destination is available in Technical and Executive lenses at `?role=technical&view=ask` and `?role=executive&view=ask`.
- Session, Reader integrity/version, six-tool catalog and knowledge-release qualification are rendered as independent BFF-reported facts.
- The composer fails closed for blank, oversized, unauthenticated, unavailable and in-flight states; it supports Ctrl/Command + Enter and never places the question in URL or browser storage.
- Answers remain plain text and expose sufficiency consequence, canonical citations, authority boundaries, evidence trace and a closed-by-default raw receipt.
- PASS-LIVE is shown only for a validated server-side qualification receipt; an ordinary answer explicitly says qualification was not established by that request.
- Focused client coverage passed: safe BFF URL rules, safe return path, response validation, fixed status errors, timeout, malformed response and exactly-one request/no retry.
- `npm run test:governance`: passed, 27 tests after the expired-session regression coverage.
- `npm run build`: passed with Vite 6.4.3.
- Fresh Playwright smoke passed at 1440 x 1000, 768 x 1024 and 390 x 844; measured no horizontal overflow, confirmed keyboard submission made one request, verified authenticated/unauthenticated states, and observed no browser console errors.
- Desktop and mobile screenshots were visually inspected; answer-first hierarchy, evidence-spine ordering and mobile navigation remained legible.
