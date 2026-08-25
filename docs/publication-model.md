# Publication model

Root files are the authoring source. `dist/` is generated output and must not be edited by hand.

PALO uses a platform release plus independently versioned components. `release-manifest.json` is the authority for this inventory: v3.1.0 identifies the platform/web and semantic governance-control-plane release, while PALO-AI runtime, MCP, n8n and mobile components retain their own versions and maturity boundaries. Health metadata exposes `frameworkRelease` separately from the component `version`; PALO-AI v2.7 remains a non-production developer preview.

The publication boundary is the explicit `PUBLIC_FILES` list in `scripts/public-files.mjs`. `npm run build` deletes and recreates `dist/`, copying only those files without transforming their bytes. Working documents, workshop material, raw Android binaries, screenshots not required by a public page, hidden files other than `.well-known/security.txt`, repository metadata, and toolchain files are excluded.

Local assessments and private or third-party research inputs must remain outside `PUBLIC_FILES` and are protected by explicit `.gitignore` entries. Built-artifact validation also rejects the known private-input paths if they appear in `dist`; this guard does not replace license review or remediation of material already present in Git history. Public analysis should retain attribution links to official sources without republishing local research inputs.

Run the P0 release sequence with:

```sh
npm ci
npx playwright install chromium
npm run p0
```

After the root `npm ci`, `npm run p0` installs the locked Governance Hub dependencies and the checksum-verified OPA binary. This makes the release gate independent from pre-existing local caches or nested `node_modules` directories.

Before the public build, v3 semantic assets follow deterministic projection and conformance checks:

```sh
npm run semantic:check
npm run semantic:validate
npm run semantic:release:check
```

Use `npm run semantic:generate` after an approved semantic-spine change and `npm run semantic:release` only after mapped contracts are final. Generated graph, lifecycle, mapping and digest inventory drift blocks validation.

`npm run validate` checks semantic projections and invariants, source HTML structure, internal links and fragments, shared asset versions, canonical URLs, sitemap, RSS, and release metadata. `npm run validate:dist` repeats those checks against the publication artifact and detects common repository-file leaks. `npm run build:check` independently rebuilds to a temporary directory and compares the SHA-256 inventory with `dist`. `npm run smoke` serves `dist` on an ephemeral loopback port, visits every allowlisted public HTML page in Chromium, and closes both browser and server before exiting.

CI uploads only `dist/`. A new public file is not deployable until it is deliberately added to the allowlist and passes source, built-artifact, and browser validation.
