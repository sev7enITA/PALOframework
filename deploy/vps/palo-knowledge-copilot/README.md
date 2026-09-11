# PALO Knowledge Copilot standalone deployment

This profile deploys the Ask PALO browser BFF as a non-root, read-only container. It connects to an already qualified PALO Knowledge Reader, a PostgreSQL session database, Microsoft Entra and an approved OpenAI model. It never embeds credentials in the Governance Hub bundle.

Recommended public topology:

```text
https://paloframework.org/governance-hub/?view=ask
  -> https://copilot-api.paloframework.org/api/copilot/*
     -> https://guide-api.paloframework.org/mcp-guide
     -> tenant-specific Microsoft Entra endpoints
     -> https://api.openai.com/v1/responses
```

The tracked `governance-hub/.env.production` contains only the public BFF origin and points the static production bundle at `https://copilot-api.paloframework.org`. It must never contain credentials.

## Prerequisites

- DNS A/AAAA for `copilot-api.paloframework.org` pointed from Hostinger to the approved VPS;
- TLS certificate and nginx;
- the two Entra app registrations described in `docs/palo-knowledge-copilot-production.md`;
- PostgreSQL with TLS, backup and least-privilege credentials;
- a project-scoped OpenAI API key and an explicitly approved model;
- an already qualified Reader URL and Reader API application role.

## Prepare configuration

```sh
cp .env.example .env
mkdir -m 700 secrets
umask 077
printf '%s' 'postgresql://...' > secrets/database_url
printf '%s' '...' > secrets/oidc_client_secret
printf '%s' '...' > secrets/reader_client_secret
printf '%s' '...' > secrets/openai_api_key
```

Replace every placeholder in `.env`. The four secret files and `.env` are ignored by Git. On an enterprise host, materialize them from the approved secret manager at deploy time; do not treat local files as the long-term source of truth.

Apply the database migration as an explicit one-off step before starting a new image:

```sh
docker compose run --rm -e PALO_COPILOT_RUN_MIGRATIONS=true palo-knowledge-copilot \
  packages/palo-knowledge-copilot/migrate.js
```

## Build and admit the image

```sh
docker compose config
docker compose build --pull
docker image inspect palo-knowledge-copilot:local
npm audit
```

Generate an SBOM, scan the image with Docker Scout or the approved enterprise scanner, sign the registry digest and put that immutable reference in `PALO_COPILOT_IMAGE`. Start from the admitted image without rebuilding:

Apply the admission rules and retain the evidence described in `CVE-POLICY.md`. The automatic gate requires zero Critical and zero High findings; Medium findings are never silently suppressed and require the documented disposition defined there.

```sh
docker compose up -d --no-build
docker compose ps
```

The process refuses production startup if durable sessions, OIDC tenant admission, Reader client credentials, an approved model configuration or proxy trust are absent.

## Configure nginx

Copy `nginx-http-rate-limit.conf` to `/etc/nginx/conf.d/palo-copilot-rate-limit.conf`, install the approved TLS certificate, and adapt `nginx-server.conf.example` as a complete virtual host. Then:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Do not add CORS headers at nginx; the application emits credentialed CORS only for the exact configured frontend origins. Keep container port `18792` bound to loopback and closed at the firewall.

## Smoke and live qualification

Run the tokenless boundary smoke first:

```sh
node deploy/vps/palo-knowledge-copilot/smoke-copilot.mjs \
  https://copilot-api.paloframework.org \
  https://paloframework.org
```

Then complete an interactive browser login and execute at least one Italian, one English and one deliberately unknown question. Capture the returned request ID, canonical citations and evidence trace without copying the raw question into operational logs.

Complete every item in `docs/palo-knowledge-copilot-production.md`, including negative identity tests, model/Reader fault injection, desktop/mobile accessibility, backup/restore, signed digest and owner/security approval. Availability alone is not production qualification.
