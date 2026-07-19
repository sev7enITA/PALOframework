# PALO n8n macOS Pilot

Local, self-hosted n8n 2.30.7 environment with the PALO-AI 0.1.0 private package embedded in the image and installed into n8n's persistent node registry before startup.

This environment is bound to `127.0.0.1:5678`; it is not Internet-accessible. It connects outbound to the authenticated PALO-AI developer-preview Gateway. Use mock, reversible and non-consequential target actions only.

## Start

From this directory:

```bash
sh setup-local.sh
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

The one-shot `palo-node-installer` service must finish with exit code `0`; n8n starts only after that installation succeeds.

Open `http://localhost:5678` and create the local owner account. Search the node picker for `PALO Governance`.

## PALO credential

Create an n8n credential named `PALO API`:

```text
Gateway URL: https://governance.paloframework.org/gateway
Bearer Token: the protected Gateway token retrieved from the VPS
```

Never paste the token into a workflow field, workflow export, Git commit, screenshot or support message.

## Operations

```bash
docker compose logs -f n8n
docker compose stop
docker compose start
docker compose down
```

`docker compose down` keeps the named data volume. Do not use `docker compose down -v` unless the pilot data and encrypted credentials may be permanently deleted.

## Refresh the PALO node

After rebuilding `packages/n8n-nodes-palo-ai/dist`, rebuild this image and recreate the service:

```bash
docker compose build --no-cache
docker compose up -d --force-recreate
```
