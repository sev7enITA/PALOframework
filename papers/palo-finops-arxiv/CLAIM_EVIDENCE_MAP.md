# Claim-to-evidence map

This map is an internal authoring audit, not independent peer review. Source hashes in the final manifest identify the implementation assessed by this manuscript.

| Claim | Evidence | Interpretation limit |
| --- | --- | --- |
| Lower inference cost need not imply lower cost per accepted outcome | Remaining-cost model and constructed 81-point sensitivity in `reproducibility/results.json` | Arithmetic counterexample only; no estimated prevalence or real savings |
| Unknown attempt cost retains local capacity | `assets/palo-finops-core.js`, `summarize` and event replay; synthetic initial state and case closure | A reservation is not final expenditure |
| Concurrent admission checks do not reuse the same capacity | SQLite ledger transaction and existing concurrent-writer tests in implementation `tests.tap` | Same intact trusted database and cooperating clients; not distributed/global enforcement |
| Claim and reservation persist atomically | `packages/palo-finops/ledger.js`, `reserveDispatch`; claim-insert rollback regression | SQLite/host assumptions; no end-to-end exactly-once guarantee |
| Repeated request identifier does not resend | Gateway binding and concurrency/crash regressions | New identifiers, lost databases and external calls are outside the property |
| Signed allocation conserves source amount | `allocateMicros`; conditional proof; 12,864 finite configurations and 38,592 assertions | Limited input enumeration; not validation of driver economics or all numeric limits |
| Billing revisions invalidate stale attribution | Synthetic revision from USD 0.22 to 0.24; new total USD 0.487 and unavailable metric | No automatic repair of already settled charges is claimed |
| Historical snapshots remain replayable | `verifyPeriodSnapshot` on the prior USD 0.467 snapshot after the revision | Hash/replay integrity is not issuer authenticity |
| Outcome denominator must match cost cohort | Frozen contract, business-metric cohort-mismatch result | Accepted outcomes and completeness remain declarations |
| 63 implementation tests passed | `deliverables/finops-implementation-12-2026-10-21/tests.tap`, verified source manifest | Dated local regression receipt; not a reliability confidence estimate |
| 20 interface checks passed | Same package's `ui-checks.json` and source hashes | Minimal DOM harness, not a user study; browser receipt is separate |
| Read-only MCP protocol works locally | Actual stdio initialize/list/call/deny test in the 63-test receipt | No enterprise authentication, network deployment or adversarial-host guarantee |
| GLM identified two implementation issues | Actual response and adjudication in implementation evidence | GLM did not execute tests or approve the paper; post-fix approval not received |
| Real savings, provider accuracy and production readiness | No supporting result | Explicitly withheld throughout the manuscript |

The earlier paper supplies typography and author metadata only. Its incident claims are not imported as empirical evidence for FinOps. Public descriptions of Cloudability supply product context, not authenticated product measurements. The current FOCUS version was checked at its official source; the implementation claims no FOCUS conformance.

The pure reproduction script and input sources will be included in the companion archive. The full runtime/UI suite remains repository-dependent. No public immutable archive identifier is asserted until an actual deposit occurs.
