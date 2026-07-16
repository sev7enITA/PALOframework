# Publication model

Root files are the authoring source. `dist/` is generated output and must not be edited by hand.

The publication boundary is the explicit `PUBLIC_FILES` list in `scripts/public-files.mjs`. `npm run build` deletes and recreates `dist/`, copying only those files without transforming their bytes. Working documents, workshop material, raw Android binaries, screenshots not required by a public page, hidden files other than `.well-known/security.txt`, repository metadata, and toolchain files are excluded.

Run the P0 release sequence with:

```sh
npm ci
npx playwright install chromium
npm run p0
```

`npm run validate` checks source HTML structure, internal links and fragments, shared asset versions, canonical URLs, sitemap, RSS, and release metadata. `npm run validate:dist` repeats those checks against the publication artifact and detects common repository-file leaks. `npm run build:check` independently rebuilds to a temporary directory and compares the SHA-256 inventory with `dist`. `npm run smoke` serves `dist` on an ephemeral loopback port, visits every allowlisted public HTML page in Chromium, and closes both browser and server before exiting.

CI uploads only `dist/`. A new public file is not deployable until it is deliberately added to the allowlist and passes source, built-artifact, and browser validation.
