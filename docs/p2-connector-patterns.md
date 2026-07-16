# Vendor-neutral connector patterns

Version: `1.0.0`  
Status: architectural patterns, not configured integrations.

P2 connectors move deliberately exported PALO artifacts across an organizational boundary. They must not silently transmit assessment data. Examples contain no secrets, tenant URLs, tokens or live credentials.

## Common boundary

1. A user selects a Case File, evidence bundle or Markdown pack and previews the fields leaving the browser.
2. The adapter validates the artifact schema and applies an organization-owned field allowlist.
3. The adapter maps stable PALO IDs to external object IDs without rewriting the PALO source artifact.
4. The destination acknowledges an idempotency key and returns only a reference, status and timestamp.
5. The adapter records a handoff entry locally, excluding credentials and destination response bodies that may contain sensitive data.

Use least-privilege, short-lived credentials supplied by the deployment environment. Keep secrets in an approved secret store, never in browser JavaScript, JSON fixtures, templates, logs or source control. Redact logs and define retention, deletion and incident handling before activation.

## Issue tracker pattern

Map `caseId` to an external issue key, decision-gate conditions to tasks, evidence gaps to checklist items, and P1 incident triggers to a controlled reopen transition. Use idempotency key `caseId + artifact version + operation`. Preserve links to exported evidence rather than copying sensitive content into issue descriptions by default.

Recommended adapter operations: validate export, preview mapping, create/update issue, attach approved Markdown, reconcile status, and record external reference. Avoid assuming any vendor-specific workflow, label, webhook or query language.

## GRC pattern

Map PALO control IDs to organization-owned control identifiers, indicator IDs to metric definitions, gate decisions to assessment records, and evidence IDs to evidence references. The GRC system remains authoritative for its own control ownership and testing schedule; the PALO starter library remains educational content.

Require an explicit mapping table with owner, effective date and review date. Reject unmapped mandatory controls rather than guessing. Never equate a successful transfer with control effectiveness, assurance or compliance.

## Document-system pattern

Render a board pack, procurement record, incident record or evidence index to an approved document format, then upload it to a user-selected location. Store document ID, version, classification and link as a Case File handoff. Do not embed access tokens in links or export hidden browser-storage content.

Use immutable versions for approved decisions, mutable drafts for collaboration, and source-system retention/classification rules. Preserve a content hash when policy permits so a reviewer can identify what was approved.

## Inbound pattern

Inbound data is untrusted. Verify content type and size, parse with a structured parser, validate the declared schema/version, scan attachments where applicable, show a merge preview, preserve unknown fields and require user confirmation. Do not execute embedded markup, formulas, scripts, policy code or macros.

## Failure and audit behavior

Use bounded retries with idempotency, explicit partial-failure states and a local export fallback. Record who initiated the transfer, what schema/version was sent, selected field names, destination reference, result and time. Do not log full assessments or credentials. A connector outage must not block local export or erase pending work.

