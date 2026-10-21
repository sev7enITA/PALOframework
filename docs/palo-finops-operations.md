# PALO FinOps operations 1.2

This release adds operational workflows to the local FinOps module and a separate Node.js pilot runtime. The browser does not hold provider credentials or send model requests. Role selection changes the starting view; it is not authentication or access control.

## Using the workspace

Open `PALO_FinOps.html`, then choose **Operations**. The existing Overview, Attempts ledger, Record & reconcile, Billing & showback, Route assessment and Setup remain available.

| User | Starting point | Typical action |
| --- | --- | --- |
| CFO / finance | Period reporting | Inspect known costs, open reservations, selected-period billing and completeness before exporting |
| IT lead | Exceptions and opportunities | Assign a review and evaluate cost changes with quality constraints |
| FinOps administrator | Cost evidence and rules | Trace a source revision, inspect residuals and compare allocation versions |
| AI service owner | Business metrics | Declare an acceptance rule and supply a denominator for the exact cost cohort |

Use the existing **Load synthetic example** and **Billing & showback > Load synthetic billing** to explore. Synthetic amounts are not current prices. Some metrics deliberately remain unavailable until missing costs and outcomes are resolved.

### Exceptions

The queue derives cases from missing billing, quarantined imports, unlinked source amounts, missing allocation drivers, estimated source rows, billing/ledger differences and pending outcomes. Repeated findings retain their identity. Changes in their source evidence reopen the case while preserving previous reviews.

Set an owner, a future review date if needed, a status and a reason. A case can be marked closed while its condition is still detected; the interface keeps that distinction visible. Closing a review or reaching its due date does not settle a cost or release a reservation. A cleared condition remains in the history.

### Cost evidence

Select an active billing revision to follow source amount, evidence reference, usage interval, allocation rule/version and driver, shares, linked attempts and declared outcomes. Shared allocation and direct attempt links are separate representations of the same cost; do not add them. Residuals remain visible. Conservation of currency micros proves arithmetic consistency, not that a driver is economically correct.

### Business metrics

Business metrics use the most recently frozen in-session snapshot from a Billing period export or a CFO pack. The active snapshot ID, origin and scope are shown; existing metric versions remain bound to their registered cohort. Register a metric with immutable ID/version, label, unit, owner, source, acceptance rule, currency, period, cost basis and workload IDs. The interface binds the contract to a digest of the snapshot cohort.

Import one **observed** batch for that metric version, with unique observation IDs and nonnegative integer quantities. The batch must explicitly declare completeness and the same cohort/window. Forecast observations do not enter an observed denominator. Combining disjoint batches is an explicit upstream operation; the module does not guess whether two observations overlap. A new correction requires a new metric version or an explicitly reconstructed batch rather than silently replacing history.

The current general metric evaluator deliberately retains all completeness checks of the accepted-task snapshot. It does not bypass missing billing, pending outcomes or boundary-spanning cost rows to produce a ratio. Therefore it is conservative for metrics that might otherwise be computable independently of accepted outcomes. Zero or mismatched denominators produce an unavailable result. Unit values carry the exact numerator and denominator, plus a nearest-micro display value (half ties away from zero). Savings normalization uses BigInt rational arithmetic and rounds the difference once, preserving the exact normalization terms. These ratios are not additional ledger charges.

### Opportunities and measurements

An initiative moves through proposed, approved, applied and measured. Every transition requires evidence. Measurement compares two verified frozen snapshots, a declared comparability review, quality constraints and intervention costs. It normalizes the baseline unit cost to the follow-up accepted volume.

The result is an **observed comparison of declared periods**, not a causal savings certification. Allocation changes, a smaller workload or invoice credits can change the apparent result. The artifact retains `savingsDemonstrated: false` and `causalClaim: false`; a positive difference alone is not an experimentally established saving. Failed quality constraints or incomplete accounting block measurement.

### CFO package and selected exports

The CFO report contains two explicitly separate scopes:

- Whole-workspace current budget, known operational cost, open reservations and remaining allowance.
- Selected period/workloads billing numerator, source totals, frozen outcomes and completeness reasons.

These totals are never added. A complete-declared report is still based on local declarations, not independently authenticated invoices or reviewer identity. UTC is used; there is no implicit currency conversion. Invoice-period completeness is not inferred from usage coverage.

**Filtered billing export** contains only current revisions matching the query/kind and labels itself as a selected export, not a restorable archive. **Finance workspace export** preserves the whole book, rules, operational workspace and optional operations state. Operations JSON can also be saved/restored explicitly for the same workspace ID. Imports are validated before replacement. Old finance exports without operations remain accepted.

### Rule comparison

Supply an alternative version of allocation rules to preview destination deltas at one frozen instant. Original costs and existing snapshots stay unchanged. Both projections conserve signed micros, including credits. The difference is allocation sensitivity, not measured savings.

### Forecast

Supply consecutive complete daily observations ending on the last closed UTC day. Each point needs date, nonnegative integer currency micros and source reference. Negative-net credit days must be modeled upstream with an explicit series definition; this pilot does not silently clip them.

The evaluator compares last-value and trailing-seven-observation mean baselines using rolling one-step origins. It reports absolute errors and the selected model. The same holdout selects the model, so its score is not an independent final test. Multi-day predictions hold the selected final estimate constant. No calibrated interval, seasonal model, business-growth assumption or LLM forecast is claimed. Insufficient history, gaps or open-day data block the result. Forecasts never change an authorized budget. This version requires nonnegative daily costs and rejects net-negative days containing credits; use an explicitly reviewed nonnegative series with separate credit treatment rather than dropping those days.

## Node.js runtime

Run from the repository with the supported Node version and installed repository dependencies:

```sh
npm run finops:check
npm run finops:operations -- --help
```

New output files use exclusive creation and private permissions. Gateway and benchmark commands reserve an output artifact before making a provider call. A running/failed marker after interruption requires inspection of the durable ledger; creating another request ID is not a safe automatic retry.

All configuration and accounting outputs for real activity should stay outside the public site's file allowlist. Secrets are supplied through process environment, never through browser storage, JSON examples, CLI arguments or exported receipts. No credentials are bundled in the repository.

<a id="billing-connector"></a>
## Read-only billing connector

The initial adapter targets the OpenAI organization Costs endpoint. This is an implementation choice for the prepared pilot; it does not assert the user's organization has selected or connected OpenAI. The implementation performs only bounded GET requests to a fixed HTTPS endpoint with redirects disabled, explicit organization/project scope, cursor validation and complete daily coverage checks.

Configure a local file:

```json
{
  "provider": "openai",
  "organizationId": "org-REPLACE",
  "projectIds": ["proj-REPLACE"],
  "currency": "USD",
  "partition": "project-pilot",
  "window": {
    "start": "2026-10-01T00:00:00.000Z",
    "end": "2026-10-02T00:00:00.000Z"
  }
}
```

Provide an authorized organization admin credential as `PALO_FINOPS_OPENAI_ADMIN_KEY` through your local secret mechanism. The code uses it only for the Costs GET endpoint; that does not imply the credential itself has only read permissions. Run:

```sh
node scripts/finops-operations.mjs connector /private/config.json /private/new-capture.json
```

The output contains `batch`, `receipt` and `capture`. Import **the `batch` object** through the existing billing importer, or extract it to a separate JSON file. A later capture can pass a previous billing book as the fourth command argument to construct explicit revisions. Missing pages, currencies or project mismatches fail before producing an accepted batch.

The API reports aggregated daily/project/line-item costs. It does not provide an invoice for every attempt. Rows enter as shared, estimated costs; they do not automatically settle attempts. Decimal amounts are rounded to the nearest micro with original decimal text and rounding policy retained. The invoice interval field mirrors usage only as a schema placeholder; invoice-period completeness is not established. There is no FOCUS conformance claim.

Every requested day must have an explicit bucket, including an empty `results` array for a zero day. A missing bucket fails coverage instead of being invented as zero. Whether a configured provider account omits empty days must be verified during its live pilot.

Finality requires external evidence. Once a reviewer has authoritative final costs and attribution, import a canonical revision with a higher revision number, `supersedes`, `finality: "final"` and its evidence reference. Use reviewed classification/links for attempt costs and keep genuinely shared costs under allocation. Then apply the existing reviewed settlement and freeze a new period snapshot. Aggregate API figures alone do not justify this promotion. The suite exercises estimated rows, explicit final revisions, measured links and a complete declared benchmark; it does not supply real invoices.

The adapter preserves a stable economic identity and supports corrections of active revisions. A removed row that later reappears is blocked for explicit lineage review. Exact-scope snapshots should be repeated for corrections; overlapping different coverage windows remain subject to existing billing quarantine rules.

Source contract checked on 21 October 2026: [OpenAI Costs reference](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs), [official usage/cost example](https://developers.openai.com/cookbook/examples/completions_usage_api).

<a id="controlled-gateway"></a>
## Controlled gateway pilot

This is a separate implementation from the existing loopback-only probe. It accepts bounded text input, a configured route and explicit local reservation. No tools, arbitrary endpoints, provider-supplied executable instructions or dynamic model-selected scopes are accepted.

Prepare a workspace with real reviewed routes, current rate cards, workload budgets, task IDs and policy. Initialize an exclusive SQLite ledger using the existing `ledger-init` command. The gateway configuration contains:

```json
{
  "provider": "openai",
  "organizationId": "org-REPLACE",
  "projectId": "proj-REPLACE",
  "principalId": "pilot-owner",
  "tokenSha256": "REPLACE_WITH_SHA256_OF_LOCAL_SECRET",
  "policyDigest": "REPLACE_WITH_CANONICAL_POLICY_SHA256",
  "workloadIds": ["engineering"],
  "routeIds": ["reviewed-route"],
  "maxRequestMicros": 100000,
  "maxInputBytes": 1000,
  "maxOutputTokens": 100,
  "framingTokenAllowance": 2048,
  "validUntil": "2026-10-22T00:00:00.000Z",
  "timeoutMs": 30000
}
```

The Responses output allowance must be at least 16 tokens, matching the provider API minimum checked on 21 October 2026. These limits are illustrative configuration, not a recommendation about current provider prices. Generate the local secret outside the repository; provide it as `PALO_FINOPS_PRINCIPAL_TOKEN`. Compute hashes with the exported `sha` helper from `packages/palo-finops/provider.js`; the policy digest is over the canonical policy object. Configure `PALO_FINOPS_OPENAI_API_KEY` separately. Credentials and config should be accessible only to the operator. This pilot authenticates possession of a local secret; it is not enterprise OIDC, delegated end-user identity or production RBAC.

Request shape:

```json
{
  "requestId": "unique-reviewed-request",
  "taskId": "configured-task",
  "routeId": "reviewed-route",
  "rateCardId": "reviewed-rate-version",
  "input": "Approved task text",
  "maxOutputTokens": 100,
  "reservedMicros": 100000
}
```

```sh
node scripts/finops-operations.mjs gateway /private/ledger.sqlite /private/gateway.json /private/request.json /private/new-result.json
```

This command can incur provider charges once configured. The local principal, workload, route, policy digest, expiration, request bounds and funds are checked before dispatch. A conservative estimate uses input UTF-8 bytes plus a configured framing allowance and the versioned rates. This is an estimate with declared assumptions, not a proof of the tokenizer's upper bound or a provider-enforced dollar ceiling. Provider-side limits should be configured independently.

The request claim and reservation commit together in one SQLite transaction before sending. A crash before commit leaves neither; after commit the visible ledger attempt retains its reservation and the claim prevents resend. A duplicate ID does not resend; changed request or configuration (including expiration renewal) with the same ID fails and requires review. Responses are bounded, `store` is false, and raw prompt text is excluded from receipts. The local result file can contain model output and must be protected as task data.

Even a successful response reports token usage, not final billing. The reservation remains committed until explicit billing reconciliation. Receipts preserve response ID, provider request ID, route, rate version, policy digest, measured elapsed time and usage. This local guard has not been qualified as a distributed production enforcement service.

Source contract: [OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create). No model price is hardcoded.

<a id="read-only-mcp"></a>
## Read-only MCP setup

The isolated stdio server exposes four tools: `finops_summary`, `finops_exceptions`, `finops_explain_cost`, `finops_period`. It does not extend every existing PALO server profile with financial data.

Provide a finance bundle and a local grant:

```json
{
  "principalId": "finance-reader",
  "tokenSha256": "REPLACE_WITH_SHA256_OF_LOCAL_SECRET",
  "scopes": ["finops:read"],
  "workspaceIds": ["EXACT_WORKSPACE_ID"],
  "validUntil": "2026-10-22T00:00:00.000Z"
}
```

```sh
node scripts/finops-mcp.mjs /private/finance-bundle.json /private/reader-grant.json
```

The host supplies `PALO_FINOPS_PRINCIPAL_TOKEN`; authentication occurs before the server exposes data, and grant expiration is checked on queries. The host binds the bundle path and workspace scope at startup. The model cannot choose a file, tenant, credential or wider scope. The frozen bundle's costs and source content are untrusted data, not instructions. Results cite workspace, digest, as-of time and policy revision; period queries also cite snapshot scope/time/digest.

A finance bundle may contain an optional verified `snapshot`. Without it, the period tool returns a clear error. Updating a bundle requires a new server instance. There is no settlement, approval, reserve-release or execution tool. Stdio depends on the operator's local process boundary; a network deployment requires a separate transport authentication review.

<a id="routing-benchmark"></a>
## Routing benchmark protocol

The runner implements a deliberately narrow two-stage experiment. The stay strategy uses one model for both stages; the switch strategy uses the same first-stage model and a different second-stage model. Each task supplies a first prompt, a follow-up template containing `{{previous}}`, and an exact expected final string. The dataset, acceptance rule, cache conditions, routes, rate versions and per-attempt reservation are frozen in a digest-bound plan before execution. Task order alternates strategy order to reduce a simple order bias; it does not establish cache isolation or causal inference.

Plan specification:

```json
{
  "id": "routing-pilot-1",
  "owner": "experiment-owner",
  "datasetRef": "urn:reviewed:frozen-dataset",
  "qualityRuleRef": "urn:reviewed:exact-answer",
  "cacheControlRef": "urn:reviewed:cache-and-load-conditions",
  "maxOutputTokens": 100,
  "tasks": [{"taskId":"fresh-task-id","prompt":"Approved prompt","followup":"Review {{previous}} and return the final answer","expectedText":"Frozen answer"}],
  "strategies": [
    {"id":"stay","routeIds":["model-a","model-a"],"rateCardIds":["rate-a","rate-a"],"reservedMicros":100000},
    {"id":"switch","routeIds":["model-a","model-b"],"rateCardIds":["rate-a","rate-b"],"reservedMicros":100000}
  ]
}
```

```sh
node scripts/finops-operations.mjs plan /private/spec.json /private/new-plan.json
node scripts/finops-operations.mjs benchmark-run /private/new-plan.json /private/ledger.sqlite /private/gateway.json /private/new-run.json
node scripts/finops-operations.mjs benchmark-analyze /private/new-run.json /private/reconciled-finance.json /private/ancillary.json /private/new-analysis.json
```

Use fresh task IDs. The run retains every attempted stage, failure, usage receipt and latency; there are no automatic retries. Failed or interrupted runs do not become zero-cost successes. Exact-match acceptance is unsuitable for open-ended tasks without redesigning the quality protocol.

The analyzer requires final reconciled billing and a single ancillary-cost declaration for each task/strategy: `{taskId,strategyId,amountMicros,complete:true,includedInLedger:false,evidenceRef}`. Explicit zero is allowed only as an accountable declaration. It rejects unassigned attempts and relevant source residuals. Additional costs must cover context work, verification, infrastructure and human effort not already in the ledger. Latency is reported separately; monetization requires an explicit business rule upstream.

An incomplete run reports known costs and reasons but withholds final cost per accepted task. Even a complete declared comparison does not prove general savings, causal improvement or performance on other tasks/providers. Real pilot results are not bundled with this release.

## Verification and current boundaries

The test suite covers original accounting plus operations, provider mapping, authentication/scope rejection, reservation before dispatch, concurrency/idempotency, process crash and no-resend, frozen benchmark execution, incomplete-cost withholding, CLI exclusive files and MCP read-only behavior. Provider transport tests use injected synthetic responses; they are not a live account test. The previous loopback probe remains separate.

The browser workflows and Node modules implement the twelve-item backlog. Actual provider connection, a real paid benchmark, final invoice attribution, enterprise identity and production deployment require configured access and separate evidence. The code does not claim that generating configuration completes those steps. GLM review, when available, is tracked separately from code/test evidence.
