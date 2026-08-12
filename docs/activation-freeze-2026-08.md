# PALO activation freeze

Status: active

Window: 2026-08-12 through 2026-09-10, inclusive (30 calendar days)

## Decision

PALO will not add new modules during this window. The active product promise is:

> Give PALO one AI use case. Leave with a traceable, reviewable evidence dossier in less than ten minutes.

The PALO Evidence Pack is the only primary activation route. Existing modules remain available as downstream tools, but they do not compete for top-level acquisition attention during the freeze.

## In scope

- Evidence Pack completion, usability, accessibility and local validation.
- The three gold cases and the Community Casebook contribution path.
- Release packaging, checksums, documentation and reproducibility.
- Defects that prevent a clean-clone run or the ten-minute path.
- Security, privacy, accessibility or data-loss fixes.
- Feedback changes tied to an observed user or reviewer failure.

## Out of scope

- New governance modules, calculators, observatories or framework extensions.
- New platform integrations before the Evidence Pack activation gates pass.
- Visual refreshes unrelated to the primary activation path.
- New claims of compliance, certification, production readiness or independent assurance.

## Exception rule

An exception requires a public issue containing all four items:

1. The activation failure it removes.
2. The smallest proposed change.
3. Evidence that an existing module cannot solve the failure.
4. The owner and rollback condition.

The issue must carry the `activation-freeze-exception` label. Approval is a maintainer decision recorded in the issue; silence is not approval.

## Exit gates

- At least 10 external Evidence Pack attempts are observed voluntarily.
- At least 80 percent reach a downloadable local receipt.
- Median time to first evidence is at most 15 minutes.
- Every high or critical activation-path defect has an owner and resolution.
- The public changed-because-of-feedback log contains evidence-backed decisions.

If the gates do not pass, the freeze can be extended. It must not be ended by shipping another module.
