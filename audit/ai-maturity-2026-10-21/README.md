# AI maturity module release verification

The new browser-local module uses an experimental PALO rubric with 22 questions. Functional validation does not establish empirical validity, certification or operating effectiveness.

## Local evidence

- 25 focused assessment tests pass, including scope, evidence ceilings, expiry, comparison, synthetic provenance and Case File preservation.
- Source validation, built HTML/schema/link validation and authorship validation pass.
- The deterministic distribution check passes with 496 files.
- Browser smoke passes across 113 public HTML pages, including the new module's local save/restore and synthetic-provenance behavior, mobile overflow checks and 15 synchronized Atlas routes.
- Governance Hub operational smoke passes across seven scenarios.
- Agentic validation reports 97 passed and 21 skipped Node tests, plus three passing Dify tests. Skips are not successful live qualification.
- Knowledge Reader tests and the frozen knowledge gold set pass.

## Publication boundaries

The repository baseline differs from the separately hosted canonical website. The Git change is applied to the current main branch without overwriting unrelated local work. The Hostinger package applies a scoped delta to captured public website files, preserving its existing content, source-review state, headers, runtime services and other subdirectories.

The source-age check transitions the repository's two overdue NIST entries to review-due and updates both pinned manifests. It preserves review dates and does not claim a substantive source review. The canonical website's newer source registry is not part of the Hostinger delta.

GLM review, final source revision, remote CI and live publication evidence are recorded in the final release disposition. This local record alone does not establish those states.
