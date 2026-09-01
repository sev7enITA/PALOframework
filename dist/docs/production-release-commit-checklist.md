# Production release commit checklist

Status: maintainer runbook for the synchronized Observatory, Knowledge Copilot and MCP hardening release. This checklist does not qualify PALO-AI as a production authorization service.

## Safety rule

Never use `git add -A` for this release. Stage only the explicit paths in the relevant commit group, inspect the staged diff, and stop if the branch is not synchronized with `origin/main`.

Private research inputs, local browser data, unpublished papers, personal application records, deployment secrets and superseded evidence do not belong in the release. The supplied Hugging Face incident PDF is a private research input and must not be staged or copied into `dist`.

## Required branch state

Run these read-only checks before staging:

```sh
git fetch origin main
git status --short
git rev-list --left-right --count HEAD...origin/main
```

The final command must report `0 0` before the first release commit. If the branch diverges, create a clean worktree from the current `origin/main`, transfer only the reviewed changes and rerun every validation gate. Do not rebase a dirty worktree and do not force-push a release branch.

## Commit group 1: Knowledge services, host profiles and MCP hardening

Purpose: extend the existing Knowledge Reader candidate with the bounded Curator and 11-host integration set, require explicit remote OIDC client and tenant binding, prevent listener-host substitution, preserve real loopback development, correct snippet offsets and keep public deployment evidence free of private identifiers.

Stage only:

```text
.dockerignore
audit/knowledge-reader-production-candidate-2026-08-27/README.md
audit/knowledge-reader-production-candidate-2026-08-27/copilot-studio-staging-2026-08-28.json
audit/knowledge-reader-production-candidate-2026-08-27/entra-qualification-2026-08-28.json
audit/knowledge-reader-production-candidate-2026-08-27/reader-v1.0.0.spdx.json
audit/knowledge-reader-production-candidate-2026-08-27/student-funding-route-2026-08-28.json
deploy/vps/palo-ai/.env.example
deploy/vps/palo-ai/Caddyfile
deploy/vps/palo-ai/Containerfile.identity
deploy/vps/palo-ai/Dockerfile
deploy/vps/palo-ai/Dockerfile.reader
deploy/vps/palo-ai/compose.host-nginx.yaml
deploy/vps/palo-ai/compose.yaml
deploy/vps/palo-ai/identity/palo-realm.json
deploy/vps/palo-ai/nginx-governance.conf
deploy/vps/palo-ai/nginx-reader-edge.conf
deploy/vps/palo-ai/setup-identity-secrets.sh
deploy/vps/palo-ai/setup-secrets.sh
deploy/vps/palo-ai/smoke-online.sh
docs/palo-ai-governance-integration-guide.md
docs/palo-ai-n8n-launch-playbook.md
docs/palo-ai-vps-deployment.md
docs/palo-guide-agent-and-mcp.md
docs/palo-knowledge-copilot-integrations.md
docs/palo-knowledge-reader-production.md
docs/palo-microsoft-startup-student-credits.md
examples/agentic-interface/README.md
examples/agentic-interface/knowledge-copilot/
examples/agentic-interface/mcp-server-spec.json
governance-hub/AGENTS.md
package.json
packages/palo-mcp-server/README.md
packages/palo-mcp-server/auth.js
packages/palo-mcp-server/auth.test.js
packages/palo-mcp-server/core.js
packages/palo-mcp-server/deployment.test.js
packages/palo-mcp-server/http.js
packages/palo-mcp-server/mcp.test.js
packages/palo-mcp-server/network.js
packages/palo-mcp-server/reader-http.js
packages/palo-mcp-server/reader-http.test.js
packages/palo-mcp-server/reader-knowledge-base.js
packages/palo-mcp-server/reader-knowledge-base.test.js
packages/palo-mcp-server/server.js
scripts/validate-knowledge-copilot-integrations.mjs
skills/palo-knowledge-copilot/
```

Do not stage a deployment `.env`, secret directory, token, certificate, private tenant inventory, personal account address, unredacted qualification record or superseded local-image SBOM.

Suggested subject: `feat(knowledge): harden Reader and Curator integrations`

## Commit group 2: Observatory and website source

Purpose: publish the Observatory index and AI incident case, migrate Community to the shared visual system, add the incident route to Platform Map and synchronize navigation across the affected public pages.

Stage only:

```text
index.html
PALO_AIGovernance.html
PALO_AIIncidentObservatory.html
PALO_AIQuickstarts.html
PALO_AgenticCapabilityMatrix.html
PALO_AgenticGovernance.html
PALO_Community.html
PALO_DocumentationLibrary.html
PALO_Guide.html
PALO_HumanAgencyRiskMap.html
PALO_Observatories.html
PALO_PlatformMap.html
PALO_RegulatoryWatch.html
PALO_TechTrends2026.html
assets/palo-ai-incident-observatory.css
assets/palo-ai-incident-observatory.js
assets/palo-community.css
assets/palo-observatories.css
assets/palo-v21.css
media/social/hugging-face-incident-palo/
```

The public case may publish source-bounded analysis and original PALO graphics only. It must label report facts, PALO counterfactuals and PolicyWatcher correlations separately and must not imply causation from correlation.

Suggested subject: `feat(web): publish the PALO Observatory system`

## Commit group 3: Release metadata, validation and generated site

Purpose: synchronize repository guidance, release metadata, publication allowlists, validation rules and deterministic output after groups 1 and 2 are present.

Stage source files first:

```text
.gitignore
CHANGELOG.md
README.md
feed.xml
release-manifest.json
sitemap.xml
docs/production-release-commit-checklist.md
scripts/browser-smoke.mjs
scripts/public-files.mjs
scripts/render-public-docs.mjs
scripts/validate-agentic.mjs
scripts/validate-external-evidence.mjs
scripts/validate-text-style.mjs
scripts/validate.mjs
```

After a clean build, stage the deterministic public output. `dist` is tracked as the published static release, so include updated and newly generated files explicitly:

```sh
git add -u -- dist
git add -f -- dist
```

Suggested subject: `docs(release): synchronize the production web package`

## Mandatory validation gates

Run from the repository root:

```sh
npm ci
npm ci --prefix governance-hub --ignore-scripts
npm run opa:install
npm run validate:agentic
npm run validate:knowledge-reader
npm run validate:knowledge-gold
npm run validate:knowledge-copilot
npm run validate
npm run build
npm run validate:dist
npm run build:check
npm run smoke
npm run governance-hub:operational-smoke
docker compose --env-file deploy/vps/palo-ai/.env.example -f deploy/vps/palo-ai/compose.host-nginx.yaml config --quiet
docker compose --env-file deploy/vps/palo-ai/.env.example -f deploy/vps/palo-ai/compose.yaml config --quiet
npm run package:hostinger
```

Then inspect each staged group:

```sh
git diff --cached --check
git diff --cached --stat
git diff --cached --name-status
git status --short
```

The staged set and generated site must contain no U+2014 character, secret value, private key, bearer token, personal account address, private tenant identifier or third-party research PDF. A passing repository test suite proves conformance to the checked assertions, not independent production qualification.

## Production handoff record

Record the following outside the source commits and attach it to the release review:

- source commit and tree digest;
- build and package checksums;
- test command, timestamp and result;
- container digest and SBOM reference where applicable;
- accountable release owner and independent reviewer;
- target hostname and rollback reference;
- unresolved gates and exact maturity label.

Only a synchronized, reviewed and reproducible commit may be promoted to the production branch or deployment workflow.
