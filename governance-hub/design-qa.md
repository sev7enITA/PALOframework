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
