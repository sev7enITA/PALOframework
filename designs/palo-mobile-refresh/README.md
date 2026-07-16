# PALO Mobile Refresh

Implementation-ready, offline responsive HTML prototype for the next PALO mobile experience. It translates the PALO Web 2.4 operational language into a compact **governance field console** built around cases, decision gates, owners, evidence and the six-phase lifecycle.

## Scope

- **Today:** decision-oriented command center, active case, live decision-gate rail, evidence/ownership attention queue and new-assessment entry.
- **Cases:** searchable/filterable case portfolio with in-progress, review-ready and archived states; detailed workspace for the primary sample case.
- **Case workspace:** current gate, lifecycle rail, decision record, evidence gaps, controls, activity and portable Case File handoff.
- **Evidence:** readiness counts, status filters, realistic versioned artifacts, local integrity signals, add-evidence sheet and portable Evidence Bundle handoff.
- **Library:** phase-based discovery for PALO tools plus privacy, methodology and app information.
- **New assessment:** operable three-step intent/context/recommendation flow with back, cancel and completion states.
- **Desktop review mode:** device-like app pane with an adjacent product overview at widths of 900px and above.

The prototype is deliberately local-first and does not claim a specific native encryption implementation. It supports governance preparation and accountable review; it does not certify compliance or replace accountable owners.

## Interaction map

| Entry | Result |
| --- | --- |
| Four-item bottom navigation | Switches Today, Cases, Evidence and Library using hash state |
| Continue assessment / primary sample case | Opens the Customer Support Copilot workspace |
| Decision-gate action | Opens the Gate 3 requirements sheet |
| Add evidence | Opens capture/import/link/test choices and a local save state |
| Case search and status segments | Filters the case portfolio |
| Evidence segments | Filters needs-review and complete artifacts |
| Library search | Filters modules while preserving phase group context |
| Profile, privacy, methodology, version | Opens accessible bottom sheets |
| Start a new assessment | Runs intent → context → recommended route → completion |
| Escape / overlay click | Dismisses the active sheet or assessment flow |

## View locally

From this directory, serve the files with any static server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`. No build step, external runtime dependency or network-hosted asset is required.

Key review sizes: `390 × 844`, `430 × 932`, `320px` minimum width, and desktop widths above `900px`.
