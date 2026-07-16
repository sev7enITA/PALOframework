# P2 publication hygiene

Version: `1.0.0`

PALO publishes only paths in `scripts/public-files.mjs`. `npm run build` recreates `dist` from that allowlist; do not edit `dist` manually. P2 artifacts are public educational material and must remain free of assessment data, credentials, private tenant details and internal working notes.

## Before publication

- Validate every JSON file against its declared schema and resolve all indexed IDs.
- Confirm worked cases are fictional or safely de-identified and conform to the P1 Case File schema.
- Keep `educational-non-production`, source authority and freshness language visible.
- Use primary-source links where practical; record checked and next-review dates without claiming continuing legal validity.
- Remove secrets, access tokens, signed URLs, personal data, confidential evidence, proprietary source text and local absolute paths.
- Review file names, metadata, comments, archives and document properties for accidental disclosure.
- Confirm dependency provenance, licenses and required notices.
- Add only intended public paths to the allowlist and inspect `dist` for repository/tooling leakage.
- Run `npm run p0`; publish only the resulting `dist`.

## Contribution and review

Use `templates/contribution-starter.md`. At least one reviewer should check schema compatibility, cross-reference integrity, source status, licensing, security/privacy and wording that could be mistaken for certification or legal advice. Changes to required fields or semantics need a new major schema version and migration notes.

## Removal and correction

If an artifact is unsafe, stale or incorrectly licensed, remove it from the source allowlist, rebuild, and issue a correction note. Do not replace an ID with new semantics; deprecate or supersede it while preserving traceability for exported Case Files.

