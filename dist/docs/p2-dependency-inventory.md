# Dependency and license inventory

Inventory date: 2026-07-12  
Scope: PALO web publication and P0-P2 build/test tooling. This is an inventory aid, not legal advice or a complete software composition analysis.

## Node development dependencies

| Package | Pinned version | Purpose | Declared license |
| --- | --- | --- | --- |
| `ajv` | 8.20.0 | JSON Schema validation | MIT |
| `ajv-formats` | 3.0.1 | Standard format validation | MIT |
| `fast-xml-parser` | 5.10.0 | Sitemap and RSS parsing | MIT |
| `html-validate` | 11.5.5 | Static HTML validation | MIT |
| `playwright` | 1.61.1 | Chromium smoke testing | Apache-2.0 |

Exact transitive versions are locked in `package-lock.json`. They are build/test dependencies and are excluded from `dist`.

## Published local third-party runtime

| Component | Version record | Purpose | License artifact |
| --- | --- | --- | --- |
| 3d-force-graph bundle and recorded transitive runtime | `designs/theory-to-practice-infographic/assets/vendor/3d-force-graph/versions.json` | Existing Operationalization Explorer graph | Adjacent `LICENSE` and `THIRD_PARTY_NOTICES.txt` |

P2 adds no runtime package and does not alter the graph runtime.

## Externally hosted presentation dependencies

Some existing pages request Google Fonts, Font Awesome 6.4.0, and the Tailwind browser CDN. These are not vendored or governed by `package-lock.json`; availability, privacy, integrity and upstream version behavior remain external risks. P2 JSON, templates, schemas and documentation do not require them.

## Review procedure

- Run `npm install` from the committed lockfile; review lockfile changes before release.
- Confirm declared package licenses against the actual installed package metadata and retain required notices.
- Review advisories, provenance, maintainer changes and transitive additions before upgrades.
- Pin published runtime assets locally when deterministic availability or integrity is required.
- Update this inventory, third-party notices, allowlist and residual-risk notes together.
