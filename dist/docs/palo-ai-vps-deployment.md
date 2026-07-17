# PALO-AI Online VPS Deployment

Status: Internet-reachable developer-preview deployment for PALO-AI v2.4.1. This topology provides HTTPS and network isolation, but it does not remove the production-readiness blockers in the technical assessment.

## Live deployment status

The reference developer-preview endpoint was deployed on 17 July 2026:

| Item | Live state |
|---|---|
| Public hostname | `https://governance.paloframework.org` |
| MCP transport | Streamable HTTP at `/mcp`, bearer-authenticated |
| Gateway | HTTPS under `/gateway`, bearer-authenticated and route-limited |
| Policy engine | OPA 1.17.0, Docker-internal only |
| TLS | Let's Encrypt ECDSA certificate with automatic renewal |
| Persistence | Append-only SQLite preview ledger in a Docker volume |
| Release classification | Developer preview; non-production |

The live smoke test verifies HTTPS health, anonymous rejection and authenticated registry access. Public agent/policy registration, approval resolution, approval enumeration and direct evidence submission return `404`. The remote MCP server exposes only six low-privilege governance tools; administrative tools remain unavailable over the Internet.

## Address model

The deployment deliberately uses both private and public addresses:

| Address | Visibility | Purpose |
|---|---|---|
| `http://opa:8181` | Docker network only | PALO-to-OPA policy evaluation |
| `http://palo-gateway:8787` | Docker network only | Gateway behind the TLS proxy |
| `http://127.0.0.1:18877` | Current VPS host only | Administrative profile registration over SSH |
| `http://127.0.0.1:18878` | Current VPS host only | nginx-to-MCP proxy target |
| `http://palo-mcp:8788` | Docker network only | MCP service behind the TLS proxy |
| `https://governance.paloframework.org/gateway` | Internet, authenticated | n8n/Dify adapter base URL |
| `https://governance.paloframework.org/mcp` | Internet, authenticated | Streamable HTTP MCP endpoint |

`8181` is therefore not the public endpoint. It remains private even when the complete stack runs online on the VPS.

## Supplied deployment

The files under `deploy/vps/palo-ai/` provide two reverse-proxy variants:

- `compose.host-nginx.yaml` and `nginx-governance.conf` for the current Hostinger VPS, where nginx already serves other applications;
- `compose.yaml` and `Caddyfile` for a clean VPS where PALO can own ports 80 and 443.

Both variants provide:

- Docker Compose orchestration;
- OPA 1.17.0 on a private internal network;
- PALO Gateway and MCP containers built from this repository;
- HTTPS termination and redirect through existing nginx/Certbot or Caddy 2.11.4;
- separate Docker secret files for Gateway, MCP and HMAC material;
- persistent PALO data and Caddy certificate volumes;
- non-root PALO containers, read-only filesystems, dropped capabilities and health checks;
- an explicit MCP host allowlist;
- public blocking of registry administration, policy registration, approval resolution and direct evidence submission;
- a VPS-local administration port bound only to `127.0.0.1`.

The OPA and Caddy versions were current stable releases when this file was prepared. Pin image digests as well as tags before a consequential deployment.

## Prerequisites

1. A Linux VPS with a public IP and SSH access.
2. A dedicated hostname such as `governance.paloframework.org`.
3. An `A` record, and an `AAAA` record only if IPv6 is correctly configured, pointing that hostname to the VPS.
4. TCP ports 80 and 443 reachable by Caddy; UDP 443 is optional for HTTP/3.
5. Docker Engine with the Compose plugin.
6. No other service occupying ports 80 or 443.

Caddy can obtain and renew a public certificate only after DNS points to the VPS and ports 80/443 are reachable.

## Configure the VPS

Clone or upload the repository, then from its root:

```bash
cd deploy/vps/palo-ai
cp .env.example .env
```

Edit `.env`:

```dotenv
PALO_DOMAIN=governance.paloframework.org
ACME_EMAIL=security@paloframework.org
PALO_ADMIN_URL=http://127.0.0.1:18877
OPA_IMAGE=openpolicyagent/opa:1.17.0-static
CADDY_IMAGE=caddy:2.11.4-alpine
```

Generate protected secrets without printing them:

```bash
sh setup-secrets.sh
```

The generated `.env` and `secrets/` contents are ignored by Git. Back them up through a protected secret-management process; never upload or commit them.

## Firewall

Preserve SSH access before enabling a firewall. A typical UFW policy is:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

Do not open 8181, 8787, 8788, 18877 or 18878 publicly. The Hostinger Compose variant publishes 18877 and 18878 only on the VPS loopback interface; the clean-VPS variant keeps its administration binding on loopback as documented in its Compose file.

## Start the online stack

The supplied VPS currently runs nginx and Certbot for other services. On that host, use `compose.host-nginx.yaml`; it binds PALO only to loopback ports `18877` and `18878`, leaving the existing ports and sites untouched. The generic `compose.yaml` with Caddy is for a clean VPS where ports 80/443 are free.

For the existing Hostinger VPS:

```bash
docker compose -f compose.host-nginx.yaml config
docker compose -f compose.host-nginx.yaml pull
docker compose -f compose.host-nginx.yaml build --pull
docker compose -f compose.host-nginx.yaml up -d
```

Install `nginx-governance.conf` as a new site, validate with `nginx -t`, reload nginx, then obtain the certificate with Certbot only after DNS resolves:

```bash
sudo certbot --nginx \
  -d governance.paloframework.org \
  --non-interactive --agree-tos \
  --email sev7en@gmail.com \
  --redirect
```

For a clean VPS using Caddy instead:

Validate configuration, pull/build and start:

```bash
docker compose config
docker compose pull
docker compose build --pull
docker compose up -d
docker compose ps
```

Follow startup and certificate issuance:

```bash
docker compose logs --tail=100 opa palo-gateway palo-mcp caddy
```

Expected public endpoints:

```text
https://governance.paloframework.org/mcp-health
https://governance.paloframework.org/mcp
https://governance.paloframework.org/gateway/v1/registry
https://governance.paloframework.org/gateway/v1/actions/verify
```

## Register an authority profile

Administrative registration is intentionally not exposed through the public reverse proxy. SSH into the VPS and use the loopback-only gateway. The current Hostinger deployment reads `PALO_ADMIN_URL=http://127.0.0.1:18877` from `.env`:

```bash
sh register-profile.sh \
  case-runtime-example \
  ../../../schemas/fixtures/palo-agentic-interface.valid.json
```

The supplied profile is development data. Before external testing, create a new versioned profile with the correct agent ID, case, tools, hosts, argument schemas, scopes and HMAC key ID.

## Verify the online endpoint

```bash
sh smoke-online.sh
```

This checks:

- the public MCP health endpoint over HTTPS;
- rejection of an anonymous MCP request;
- authenticated access to the public Gateway registry.

Inspect service-local health when troubleshooting:

```bash
docker compose -f compose.host-nginx.yaml ps
curl --fail http://127.0.0.1:18877/health
```

## Connect n8n

For the current n8n alpha node, configure:

```text
Gateway URL: https://governance.paloframework.org/gateway
Bearer Token: contents of secrets/gateway-token
```

Use n8n encrypted credentials; never put the token in workflow JSON or node output.

The online `/mcp` endpoint uses MCP Streamable HTTP. Current n8n documentation describes an SSE endpoint for its MCP Client Tool. Until an SSE adapter or confirmed Streamable HTTP support is tested on the target n8n version, n8n should use the HTTPS Gateway integration rather than being presented as directly compatible with this MCP transport.

## Connect other MCP clients

For clients that support Streamable HTTP:

```text
Endpoint: https://governance.paloframework.org/mcp
Authorization: Bearer <contents of secrets/mcp-token>
```

Expose only the PALO-governed tools to an agent. Do not make equivalent privileged target tools available through a parallel ungoverned MCP server.

## Public-route boundary

The public reverse proxy currently exposes:

- MCP `/mcp` and its health endpoint;
- Gateway registry read;
- Action Claim verification;
- approval status read only when addressed by approval ID;
- ledger verification.

It blocks public agent/policy registration, approval enumeration, approval resolution and direct evidence submission. Those operations currently share a coarse bearer-token identity and are unsafe as Internet-facing administrative APIs. A future authenticated reviewer service can reopen the required approval route after OIDC/RBAC and separation of duties are implemented.

## Next implementation gates

The online endpoint is ready for a controlled design-partner pilot with mock or reversible actions. The next gates are:

1. install the packed `n8n-nodes-palo-ai` alpha in a disposable self-hosted n8n instance;
2. store the Gateway URL and bearer token in n8n encrypted credentials;
3. register a pilot-specific authority profile through SSH, never through the public hostname;
4. demonstrate `deny`, `pending_approval` and `allow` branches with a non-consequential target tool;
5. add authenticated Web/mobile reviewer identity before enabling public approval resolution;
6. make the governed executor unavoidable so a workflow cannot bypass PALO;
7. replace preview identity, key and persistence controls before any production authorization claim.

## Update and rollback

Before an update:

```bash
docker compose ps
docker compose logs --tail=200 > pre-update.log
```

Use an immutable Git tag or commit and pinned image digests. Then:

```bash
docker compose build --pull
docker compose up -d
sh smoke-online.sh
```

Rollback means checking out the previous known-good commit and restoring the compatible data backup before rebuilding. Schema and policy migrations need an explicit compatibility plan; do not assume container rollback alone reverses stored state.

## Backup warning

The current SQLite volume is suitable only for the developer preview. Back it up while PALO services are stopped or through a SQLite-aware backup process. A production system requires a transactional database/outbox, tested restore, retention controls, key rotation and tamper-resistant evidence anchoring.

## Remaining production boundary

Putting the endpoint online does not make it production-ready. The shared-token identity model, optional n8n gate, evidence provenance, policy-bundle attestation, approval identity, cached authorization and effective resource-to-scope binding issues remain. Use mock, reversible or non-consequential actions until those findings are closed.

See the [technical assessment](palo-ai-v2.4.1-technical-assessment.md) and [integration guide](palo-ai-governance-integration-guide.md).
