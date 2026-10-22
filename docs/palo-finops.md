# PALO AI FinOps

Module version 1.3.0, 22 October 2026. Created and maintained by Fabrizio Degni. The operational workspace format remains 1.0.0; billing uses a separate 1.0.0 interchange contract.

[Open AI FinOps](../PALO_FinOps.html) to allocate AI spending, reserve budget for model attempts, reconcile unknown costs and assess route transitions. This is an experimental local module within PALO. The browser works without a provider account and does not send model requests, verify invoices or grant execution authority. Version 1.2 adds an Operations area and separate opt-in Node.js pilot tools. See the [Operations and runtime guide](palo-finops-operations.md) for roles, exceptions, business metrics, CFO packs, rule comparison, forecast, read-only billing capture, isolated MCP, routing benchmarks and the controlled gateway.

Version 1.3 adds the separate [Local learning research workspace](palo-finops-learning.md), comparing external-only, static hybrid and distilled hybrid configurations. It evaluates declared experiments and conditional economics with seven synthetic scenarios. It does not run training or establish measured savings.

## Start with a workspace

1. Open the page through a local HTTP server or the built site. The initial workspace is empty. Choose **Load synthetic example** for a worked example, or create a workspace with a currency and budget.
2. Allocate budgets to workloads with an owner and cost center. Create tasks and record their declared outcome. An accepted task means that a person or imported system declared acceptance; it is not independent outcome verification.
3. Import a workspace containing your exact routes, policy and versioned rate cards. The [synthetic JSON](../data/finops-demo.json) is an editable starting structure; all its model names, endpoints, prices and results are fictional. Replace these inputs and their provenance before using the file for real analysis. Never put credentials, prompts, personal records or confidential evidence bodies in a workspace. References are sufficient.
4. Reserve the worst-case cost of each attempt before recording its use. Settle with a known final amount and evidence reference, or mark the cost unknown. Reconcile later when that amount becomes known.
5. Export JSON for a complete reusable snapshot or Markdown for review. Save and restore a browser draft explicitly. A Case File attachment is a new draft assessment/evidence record and preserves earlier snapshots.

The browser only writes a saved draft when requested. Data in an open tab is lost on reload unless saved or exported. Local storage is origin-specific and not a secure vault. Imports are capped at 2 MiB and validated before replacing the current workspace. Rate-card editing is available through the JSON format in this version.

## What is accounted for

The common accounting core runs in both the browser and Node.js, with no network or package dependencies. One workspace uses one currency. Operational attempt amounts are non-negative safe integers in **currency micros**, where 1 USD = 1,000,000 micros. The separate billing domain supports signed credits. There is no implicit exchange conversion. Rate cards express micros per one million tokens. Arithmetic uses BigInt intermediates, rounding each category up to one micro once; aggregate overflow is rejected.

Five token categories are disjoint: ordinary input, five-minute cache writes, one-hour cache writes, cache reads and output. An adapter must map provider counters correctly. In particular, a provider's inclusive input count must not be billed again alongside its cached subset. These cache durations are supported categories, not a claim that all providers use them.

Ancillary charges include tools, verification, governance, infrastructure and human review. A known settlement without usage detail is preserved as unallocated cost. With usage supplied, the versioned rates plus ancillary charges must equal the declared final total exactly. Invoice differences, discounts, taxes and rounding not modeled by these categories should be imported as a documented final total, without a misleading computed usage allocation.

| Metric | Definition |
| --- | --- |
| Known cost | Sum of all known final attempt costs, including failed attempts and retries |
| Outstanding reservation | Full reserved amount for every open or unknown-cost attempt |
| Committed cost | Known cost plus outstanding reservations |
| Remaining budget | Budget minus committed cost, at workspace and workload level |
| Completion rate | Distinct accepted tasks with attempts divided by distinct tasks with attempts |
| Cost per accepted task | All known costs divided by accepted attempted tasks, only when every attempt is reconciled and at least one task was accepted |

Workload allocations are independent spending ceilings. Their sum may exceed the shared workspace ceiling, which remains binding. Budget periods are scoped by workspace rather than automatically reset at month end. Outstanding liabilities must be carried into any new period explicitly. The operational summary uses all supplied attempts; it does not infer savings or treat refusals as successful delivery. A separate version 1.2 forecast compares chronological baselines over explicitly supplied complete daily costs. Outcome labels are mutable declarations outside the append-only cost journal.

## Reservation and reconciliation

The journal has three events: `reserve`, `settle`, `reconcile`. IDs are unique and timestamps are canonical UTC ISO strings with milliseconds, in non-decreasing order. A reservation binds a task, workload, exact route and effective rate-card version. A second reservation for the same attempt is rejected. A known settlement closes an attempt; an unknown settlement retains the full reservation and requires one later known reconciliation. Corrections to a known invoice require a separately reviewed replacement workspace in version 1, not an invisible edit to a historical event.

New reservations cannot exceed either budget. Actual costs can exceed a reservation or budget: the module retains the full amount and reports the breach. An imported over-budget history is reportable rather than silently discarded. An unknown cost is never converted to zero. Failed provider calls with uncertain billing must keep their reservation until the cost is resolved, including a confirmed zero where appropriate.

Source labels `manual`, `synthetic` and `provider` describe supplied provenance. A `provider` label alone does not verify a provider response. The module does not authenticate JSON files or evidence references; source labels, policy versions and historical prices can be edited outside the tool. Preserve the exported snapshot and use PALO's separate evidence/governance processes where authenticated records are needed.

## Route transition assessment

The evaluator compares declared **remaining** costs for staying and switching. The switching estimate should include destination inference, cache rebuilds, replay, tool-schema/context transfer, revalidation, verification, retries and relevant human effort. Use the same task scope and remaining horizon for both estimates. Do not count sunk cost only on one side. Record matched quality evidence and an uncertainty margin. The economic rule is `stayMicros - switchMicros > uncertaintyMarginMicros`.

Eligibility uses an exact registered tuple: provider, model, region, endpoint host and tool-schema digest. The evaluator checks policy revision/expiry, disclosure reference, current destination rate card, matching task/workload, budget coverage and maximum transition amount. Unresolved effects or absent quality evidence hold a transition. Stale requests older than five minutes, inconsistent references or insufficient budget deny it. Unknown cache state is permitted when the declared worst-case reservation covers the estimate, but the module does not verify that the estimate is conservative.

A quality or availability transition can be economically unfavorable and still satisfy the declared conditions. Results distinguish `would-proceed`, `would-hold` and `would-deny`, with `executionAuthorized:false` and `enforcementPerformed:false` in every case. Browser assessment alone never reserves money or sends a request. It neither replaces a signed Disclosure Contract nor verifies that the executor actually used the declared destination. Policy declarations imported with a workspace are not a trust root.

**Export assessment JSON** preserves the current comparison, exact request, evaluation time, result and complete workspace snapshot. Any edit to the request or workspace invalidates the current result and disables this export until reassessment. The artifact is a local review record, not a signed authorization. `createTransitionAssessment(workspace, request, {at})` produces the same format for programmatic use. Replay against the included snapshot and recorded timestamp to reproduce the declared recommendation; use fresh data and timestamps for a new assessment.

## Reuse from code and CLI

Requires Node.js 22 or 24, matching the repository's supported range. The pure module is `packages/palo-finops/index.js`, re-exporting `assets/palo-finops-core.js`. Structural interchange schema: [palo-finops-workspace.schema.json](../schemas/palo-finops-workspace.schema.json). Cross-field references, dates, ordering and arithmetic also require `validateWorkspace` or `assertWorkspace`; JSON Schema alone is insufficient.

```sh
npm run finops:check
node scripts/finops.mjs validate data/finops-demo.json
node scripts/finops.mjs summary data/finops-demo.json
node scripts/finops.mjs report data/finops-demo.json
node scripts/finops.mjs transition data/finops-demo.json data/finops-transition-demo.json 2026-10-21T09:00:00.000Z
```

The example transition is evaluated at its historical timestamp deliberately. With the current clock, an old request must fail freshness checks. Use new requests with a current timestamp for current assessments. CLI exit codes: 0 for success, 1 for invalid input/operation failure, 2 for a held or denied transition. `append WORKSPACE EVENT NEW_WORKSPACE` writes a new snapshot with exclusive creation. It is suitable for offline use and is not an atomic shared budget service.

## Local transactional ledger

`packages/palo-finops/ledger.js` adds an experimental Node built-in SQLite adapter. It uses `BEGIN IMMEDIATE`, WAL and full synchronous commits to serialize budget checks and journal inserts. The initialized baseline is immutable through the adapter; SQL triggers reject update/delete of baseline and journal records. Duplicate event IDs fail. Opening a missing ledger or overwriting an existing ledger is rejected. Each snapshot reads the baseline and events in one transaction.

```sh
node scripts/finops.mjs ledger-init /tmp/palo-finops-demo.sqlite data/finops-demo.json
node scripts/finops.mjs ledger-export /tmp/palo-finops-demo.sqlite
node scripts/finops.mjs ledger-append /tmp/palo-finops-demo.sqlite /path/to/event.json
```

In JavaScript, `ledger.reserveTransition(request, reserveEvent, {at})` assesses current state and reserves inside the same transaction, requiring matching destination, task, workload, timestamp and cost estimate. `ledger.append(event)` performs accounting only and does not assess route eligibility. Neither API executes a provider call. A successful result explicitly marks `localBudgetReservationApplied` separately from execution authority.

For an eventual PALO-AI integration, bind the task and immutable policy to an authenticated caller, validate the signed disclosure contract, obtain an execution capability, reserve atomically, enforce the destination before sending, and reconcile usage after execution. Bind request IDs and handle interrupted or retried calls idempotently. When execution status or billing is unknown, keep the reservation. Supply a managed authoritative price source and a trusted outcome verifier. Version 1.2 provides a separate local-secret-authenticated gateway pilot with durable reservations and receipts. Enterprise identity, signed authorization, trusted outcomes and distributed production qualification remain integration work; see the Operations guide.

SQLite here is a local development boundary. Database-owner access can alter the database or its triggers. There is no multi-tenant authorization, distributed ledger or tamper-proof attestation. The separate version 1.2 read-only OpenAI Costs adapter imports aggregate estimates; it does not automatically establish final per-attempt billing. Node 22 emits an experimental SQLite API warning. Configuration changes require a new reviewed baseline/ledger; preserve liabilities and history across migrations. The browser and SQLite stores are separate until explicitly exchanged as JSON snapshots.

## Billing and showback

Version 1.1 adds the **Billing & showback** tab, a shared browser/Node billing engine and CLI commands. This is a local file adapter for the documented [canonical export schema](../schemas/palo-finops-billing-export.schema.json), with a [synthetic example](../data/finops-billing-demo.json). It is not an authenticated Apptio or provider connector and does not claim FOCUS conformance.

1. Load or create the attempts workspace. For a worked example, load the synthetic workspace from the main toolbar, then **Load synthetic billing** in the new tab.
2. Import the canonical billing JSON. A book has one source, account, currency and cost basis. The import declares a source contract version, partition, stable row IDs, delta or snapshot mode, and a half-open UTC usage coverage interval. Amounts are signed integer micros; a credit is a separate negative record. `allocationScope: "shared"` routes a shared credit through allocation.
3. Link usage records to real attempts using an amount, component and evidence reference. The example records `synthetic-code`, `synthetic-check`, `synthetic-research` and `synthetic-open` correspond to the four matching attempts. Their totals are 0.22, 0.05, 0.07 and 0.10 USD. Shared pool and shared credit records are allocated, not fabricated as attempts.
4. Release an unresolved reserve only through **Apply reviewed settlement**, with an identified reviewer, versioned policy, evidence and explicit review of source, binding and component completeness. All active links for that attempt must be measured and final. This records a local manual decision and downloads a self-contained review artifact whose digest is referenced by the ledger event. It does not authenticate an invoice or provider signature. Only the `billed` basis can settle an operational reserve.
5. Schedule review dates for open liabilities. A due review escalates; expiry does not free capacity. Inspect residuals and import quarantine separately from the operational budget.
6. Create versioned allocation rules matching record dimensions. Priority ascending and stable rule ID determine first match; rule validity is evaluated at the preview/snapshot time. **Draft equal workload weights** is an explicit scenario for rows tagged `pool=shared`; review those weights before use. Preview shows every source, share and residual. Largest remainder with ID tie-breaking conserves signed micros. Missing/zero weights leave the entire amount unallocated. The sensitivity export compares current weights to equal weights on the same inputs; it is not a savings claim.
7. Export a period snapshot with the owner, UTC window, partition and explicit outcome-cohort confirmation. The snapshot embeds costs, attempts, outcome declarations, rules and results. A later edit to accepted outcomes cannot change the saved artifact. `billing-verify` checks its digest and recomputes its result from the embedded inputs.

**Preserving work.** Use **Export finance workspace** or **Save finance draft** to preserve attempts, billing, rules and Operations review state together. Import/restore of a finance workspace replaces this combined state after validation and confirmation. The original toolbar still saves/exports the operational attempts workspace only. Period snapshots and settlement review artifacts are separate downloads. Keep those files with the finance export. Local storage and exported JSON are editable; integrity hashes do not establish signer identity or resistance to an administrator rewriting both data and hash.

The allocation comparison embeds the billing book, both rule sets and a single evaluation timestamp, so each projection can be replayed with `allocateBilling`. Search and cost-kind filters change only the displayed rows and filtered subtotal. Finance exports retain the full book; period exports apply the explicit metric scope, independently of those display filters.

### Import and correction rules

Parsing/validation failure preserves the previous book. Structurally valid partial, foreign-scope or ambiguous-overlap imports are recorded as quarantined operations without committing their rows. A later accepted covering import can name the quarantined run IDs it resolves. Resolution is a supplied review decision; it does not silently repair a foreign-currency export.

An identical parsed export is reused. The SHA-256 is over canonical parsed JSON, not the original file bytes. Row identity is independent of file order. Equal amount/time under distinct stable IDs is preserved when supported by the source contract. New IDs in already covered periods are quarantined unless a delta includes `overlapResolution` with `decision: "distinct-events"`, reviewer and evidence. Temporal overlap alone does not prove duplication. Cross-source imports require a separate book; they are not silently consolidated.

Each row begins at revision 1. A changed active row needs a higher revision and `supersedes` containing the previous `recordRef`, the JSON string of `[sourceRecordId, revision]`. Reusing an identity/revision with different content fails. Exact-coverage snapshots replace the active rows in that partition/window, preserving historical revisions. Overlapping snapshots with different coverage boundaries are quarantined. Removed revisions cannot be resurrected implicitly; use a new reviewed source identity. A replaced revision makes its old links inactive.

All links across attempts/components share one source ceiling and must have the source sign. A bill of 100 cannot cover 100 on A and 100 on B. Links of 60 and 30 with a residual of 10 conserve the bill, but do not close every liability. Unlink is a new journal operation with a reason. Final billed corrections after an operational settlement remain visible as billing/ledger differences; version 1.1 does not silently rewrite the non-negative operational journal or automatically reopen a settled attempt. Preserve the prior evidence when preparing a reviewed replacement operational workspace.

### Metric scope and limitations

The billing metric uses source costs or allocated shares exactly once; it never adds the operational ledger on top. The denominator is the frozen set of declared accepted tasks with a reservation in the selected UTC window and workload scope. The API supports selected workloads; the browser selects all current workloads. The owner must confirm that this reservation cohort matches the outcome period. This is not an independent outcome attestation or a causal ROI measurement.

The final unit metric remains unavailable for an open time window, missing usage coverage, quarantine, estimated records/links, unallocated shared costs, unlinked usage/credits, pending outcomes, unresolved attempts, billing/ledger differences, boundary-spanning costs or zero accepted tasks. No reservation is substituted as actual cost. Boundary-spanning rows require an explicit external periodization; the module does not invent prorating. Invoice-period views remain marked incomplete because the adapter establishes usage coverage, not invoice completeness. Components and reasons remain inspectable instead of manufacturing statistical confidence intervals.

### Billing API and CLI

Import from `packages/palo-finops/billing.js`. Main functions are `createBillingBook`, `importBilling`, `assertBillingBook`, `linkBilling`, `unlinkBilling`, `reviewLiability`, `settleFromBilling`, `allocateBilling`, `allocationSensitivity`, `createPeriodSnapshot` and `verifyPeriodSnapshot`. Mutations return new values and preserve prior inputs. Async digest checks require Web Crypto, available in a secure browser context (HTTPS or localhost) and supported Node versions.

```sh
node scripts/finops.mjs billing-init data/finops-demo.json config.json new-book.json
node scripts/finops.mjs billing-import new-book.json data/finops-billing-demo.json imported-book.json
node scripts/finops.mjs billing-summary imported-book.json
node scripts/finops.mjs billing-link imported-book.json data/finops-demo.json link.json linked-book.json
node scripts/finops.mjs billing-reconcile linked-book.json data/finops-demo.json decision.json reviewed-result.json
node scripts/finops.mjs billing-snapshot linked-book.json reconciled-workspace.json metric-spec.json period.json
node scripts/finops.mjs billing-verify period.json
```

`config.json` supplies source/account (for the example, `synthetic-billing-demo` / `example-only`) and optionally costBasis/at. Link, review and decision objects follow the API fields in the public module. An operation may wrap its payload as `{ "link": {...}, "options": {"at": "..."} }` (or `review`/`decision`). Metric specs contain `contract`, `rules` and optional `options`. Billing import accepts a raw batch or `{ "batch": {...}, "options": {"resolves": ["run-id"]} }`. New output paths use exclusive creation. Exit 2 after billing import means the new book was written with a quarantined run; it does not mean the rows were accepted. Reconciliation outputs both `workspace` and `review`; preserve the review and use its `workspace` for later calculations.

## Loopback gateway integration probe

`packages/palo-finops/gateway-probe.js` executes a deliberately bounded integration experiment against an explicit `http://127.0.0.1:PORT/path` endpoint and a synthetic workspace only. It pins a policy digest, registered host/port and model, and an injected test principal. It claims the request ID durably, calls the existing atomic transition reservation, then sends one request with redirects disabled. Final synthetic billing settles the actual amount even above reserve; malformed responses/timeouts retain the reserve. Repeated request IDs cannot resend, including recovery from a durable claimed/reserved state. A changed payload under the same ID is rejected.

The principal is a test fixture, not authenticated user identity. The probe is not a production gateway, provider connector or signed PALO-AI execution capability. It reports `loopbackPreSendGuardApplied` separately and keeps general execution authority false. Claims made before a crash can require manual review even if no request was sent: the conservative recovery rule trades availability for avoiding duplicate execution. It neither guarantees remote exactly-once effects nor implements a distributed budget service.

The probe's network and recovery tests run under `npm run finops:check`. Production identity, signed disclosure/capability integration, provider-specific idempotency/billing and end-to-end qualification remain separate work. No empirical savings, FX consolidation, statistical forecast, enterprise chargeback or Apptio integration is included in 1.1.

## Research and contribution

This module operationalizes questions raised by the [Towards Data Science article on hidden routing costs](https://towardsdatascience.com/the-hidden-cost-of-llm-routing-why-switching-models-costs-more/). The preceding PALO research dossier separately records source analysis and GLM review. The module does not reproduce the article's empirical claims and its demo provides no empirical validation of PALO savings.

Useful contributions are provider counter adapters, reproducible paired routing benchmarks, calibrated transition estimates, and integration of this ledger with PALO's signed policy/capability checks. Measure quality, end-to-end latency, all attempts, cache misses and governance overhead against a competent baseline before claiming economic advantage. No external contributor or provider endorsement is implied.

## Research paper

The [PALO FinOps technical preprint](../assets/PALO_FinOps_Paper_v1.0.pdf) formalizes the accounting and evidence model. [LaTeX sources](../assets/PALO_FinOps_arXiv_source_v1.0.zip) and a [self-contained synthetic reproduction package](../assets/PALO_FinOps_reproducibility_v1.0.zip) accompany it. The manuscript has not been submitted to arXiv or peer reviewed; local tests do not establish provider billing accuracy or measured production savings.

## Who uses the module

| Role | Route | What to inspect |
| --- | --- | --- |
| End user / workload owner | Overview, Attempts ledger and Operations | Scope, accepted outcomes, retry evidence and exceptions. |
| IT leader / platform engineer | Route assessment and [Local learning](../PALO_FinOps.html#local-learning) | Frozen configurations, quality, latency, capacity and useful life. |
| Administrator | Setup, JSON import/export and Operations | Versioned inputs, local drafts, evidence references and repeatable handoff. |
| CFO / controller / FinOps lead | Billing & showback, Operations and Local learning | Cost completeness, allocation, period snapshots, investment and conditional crossover. |

Role entry views guide navigation; they are not authentication or role-based access control. Browser drafts remain on the current device unless exported. Local-learning experiments use separate storage and are not added to the billing ledger. Review synthetic examples before importing organizational records.

[Read the Local learning research overview](palo-finops-local-learning-research.md) for the difference between the original FinOps preprint, the new experimental method and the validation still needed. [Download the standalone Local learning reproduction package](../assets/PALO_FinOps_Local_Learning_v1.0.1.zip) to replay its seven synthetic examples.
