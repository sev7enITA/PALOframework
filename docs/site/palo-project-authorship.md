# PALO project attribution

PALO Framework was conceived and created by Fabrizio Degni, who continues to maintain its methodology, software and documentation. Community contributions and review remain welcome.

## Public presentation

- The homepage identifies the creator immediately after the introductory description and before the primary actions.
- The Community page contains the canonical `#creator` profile directly after its opening section, with LinkedIn, repository and publication links.
- Recognition identifies the creator in its introduction and records his doctoral thesis in Computer Science at EIMT under `#doctoral-thesis`. The Community creator profile links directly to that record.
- Every published HTML page includes a project attribution and a working link to that profile. This includes standalone tools, the Italian risk map, nested visual guides, generated documentation and the Governance Hub shell.
- Author metadata use the same name. Source-specific publication credits remain in place.
- The repository README carries the attribution near the top for visitors arriving through GitHub.

## Maintenance

The doctoral thesis record uses the title and submission details supplied by Fabrizio Degni on 14 September 2026: **THE P.A.L.O. FRAMEWORK: Principled AI Lifecycle Orchestration: An Integrated Governance Architecture for Business AI Use Case Evaluation**, submitted to the Research and Development Committee of the European Institute of Management and Technology (EIMT). No thesis date, public repository URL or degree-award status was supplied; keep those fields absent until provided. The existing framework PDFs are separate research artifacts and are not linked as the thesis.

The shared copy and HTML transformation live in `scripts/palo-authorship.mjs`; presentation lives in `assets/palo-authorship.css`. `scripts/build.mjs` applies the transformation after copying source pages, rendering Markdown and bundling Governance Hub. Attribution is emitted as static HTML and does not depend on JavaScript in the visitor's browser.

Edit the shared source, then run `npm run build`. Do not edit generated `dist` pages directly. Preview the generated `dist` directory: raw source HTML has not yet passed through this publication step.

For website-only revisions, record `components.web.updatedAt` in `release-manifest.json` and align sitemap publication dates. Preserve the platform release version and its original release date.


`npm run validate:authorship` checks every public HTML route, relative links from nested directories, the Italian copy, metadata, unique attribution, homepage placement, the Community anchor and repeatable generation. It also runs at the end of `npm run validate:dist`.

Use `npm run build:check` to confirm that `dist` matches the generated output. Review the homepage and profile on desktop and a narrow mobile viewport, including activation of the name link and keyboard focus.
