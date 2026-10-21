# GLM review disposition - 21 October 2026

Reviewer: GLM-5.2 in the authenticated Z.ai chat. Review is static; GLM did not execute the tests. Full conversation is retained in the private review workspace. The review input included all eight new-module source files; a follow-up supplies the missing integration fixtures, canonical controls and original user-provided report.

## Blocker adjudication

- B1, alleged final unmatched brace in the test file: not reproduced. Both `node --check scripts/maturity-assessment.test.mjs` and the executed test suite pass. The extra brace is absent from the file. No speculative syntax edit was made.
- B2, persistent synthetic marker: rejected as a code defect. Removing provenance on rename or partial edits would allow demo evidence to appear operational. The UI now explicitly instructs users to choose Reset for a blank operational assessment. Comparisons between synthetic and operational records are rejected, and synthetic baselines are disclosed.
- B3, pinned source hash rejects changed sources: retained intentionally. A catalog version freezes its source snapshot. Silent replacement under the same version is not supported. The maintenance and migration contract is now explicit in the methodology.
- B4, unescaped catalog provenance in Markdown: accepted as defensive hardening. Title, URL and hash now use the same text escaping as the response register. A negative regression test covers injected markup in catalog metadata. This is not evidence of an exploitable current-page XSS: the installed catalog is fixed and imported source content is not used in report generation.

## Other findings

- M1: documented cumulative/overlapping windows and tested the exact rule. Comparisons are descriptive, not independent samples.
- M2: added UTC labels to period, observation and review-date fields. Kept the documented UTC evaluation rule.
- M3: clarified coverage as the proportion of questions with a supported level and usable evidence beyond declarations. It is not just a count of populated fields.
- M4: added an unsaved-edit navigation warning and a browser regression check for dismissing it without losing work.
- M5: added a dedicated catalog schema with invalid-cap and invalid-domain regression tests. Existing tests already check canonical control IDs and lifecycle gates.
- M6: retained the documented minimum rule and existing item-level register, four pillar profiles and prioritized gaps. Additional summary statistics require pilot evaluation and are not release requirements.
- M7: added the assessment ID to Markdown exports and tested its presence.
- M8: documented tolerated extra fields, normalization and recomputation. Existing imports discard supplied result objects rather than trusting them.
- M9: documented HTTP/HTTPS use and added a clear direct-file error. Browser-local calculation is not a promise that file URLs can load ES modules.
- M10: the initial unavailable Case File API already disables the action. Added an explicit guard for later API disappearance.
- M11: not reproduced as stated: the existing save handler catches storage errors and explicitly suggests exporting JSON. That behavior is retained.
- M12: added browser coverage for importing a synthetic baseline and rejecting an invalid comparison with visible provenance. Pure-function comparison tests remain in place.

Source limits: the report hash identifies the supplied bytes; it does not authenticate authorship, certify accuracy or prove control effectiveness. BCG and author-post statements were checked against the supplied report and public post. GLM's inability to inspect material absent from its first attachment is recorded as a review-scope limitation, not evidence that those source statements are false.
