# PALO-AI Online VPS Deployment

Status: Internet-reachable developer-preview deployment topology documented for PALO-AI v2.7. Deployments created from the v2.5 baseline must be upgraded and revalidated separately; this document does not assert that a live endpoint has already been upgraded. HTTPS and network isolation do not remove the blockers tracked in the public [Production Readiness plan](../PALO_AIProductionReadiness.html).

## Live deployment status

The reference developer-preview endpoint was deployed on 17 July 2026:

| Item | Live state |
|---|---|
| Public hostname | `https://governance.paloframework.org` |
| MCP transport | Dual-era Streamable HTTP at `/mcp`; current Compose uses shared bearer, while the runtime also supports OIDC/JWKS resource-server mode |
| Knowledge MCP transport | Dedicated OIDC-only Reader at `/mcp-guide` and separate ten-tool Curator at `/mcp-guide-curator`, backed by the self-hosted PALO identity realm; each release still requires live qualification |
| Identity | Keycloak 26.7.2 and PostgreSQL, self-hosted on the PALO VPS; public realm/OIDC routes only, with administration excluded from nginx/Caddy |
| Gateway | HTTPS under `/gateway`, bearer-authenticated and route-limited |
| Policy engine | OPA 1.17.0, Docker-internal only |
| TLS | Let's Encrypt ECDSA certificate with automatic renewal |
| Persistence | SQLite WAL reference state, transactional outbox and append-only evidence chain in a Docker volume |
| Release classification | Developer preview; non-production |

The live smoke test verifies HTTPS health, anonymous rejection and authenticated registry access. Public agent/policy/executor/verifier registration, approval resolution, approval enumeration, incident enumeration/resolution and direct evidence submission return `404`. The remote MCP server exposes only six low-privilege governance tools; administrative and governed-execution MCP tools remain unavailable over the Internet.

## Address model

The deployment deliberately uses both private and public addresses:

| Address | Visibility | Purpose |
|---|---|---|
| `http://opa:8181` | Docker network only | PALO-to-OPA policy evaluation |
| `http://palo-gateway:8787` | Docker network only | Gateway behind the TLS proxy |
| `http://127.0.0.1:18877` | Current VPS host only | Administrative profile registration over SSH |
| `http://127.0.0.1:18878` | Current VPS host only | nginx-to-MCP proxy target |
| `http://127.0.0.1:18879` | Current VPS host only | nginx-to-guide-MCP proxy target |
| `http://127.0.0.1:18880` | Current VPS host only | nginx-to-Hub-control-plane target when the opt-in profile is enabled |
| `http://127.0.0.1:18881` | Current VPS host only | nginx-to-Hub-UI target when the opt-in profile is enabled |
| `http://127.0.0.1:18882` | Current VPS host only | nginx-to-Knowledge-Curator MCP proxy target |
| `http://127.0.0.1:18883` | Current VPS host only | nginx-to-PALO-identity proxy target; the admin route is not published |
| `http://127.0.0.1:19000` | Current VPS host only | Keycloak management health target |
| `http://palo-mcp:8788` | Docker network only | MCP service behind the TLS proxy |
| `http://palo-guide-mcp:8789` | Docker network only | Six-tool PALO Knowledge Reader behind the TLS proxy |
| `http://palo-guide-curator-mcp:8790` | Docker network only | Ten-tool PALO Knowledge Curator behind the TLS proxy |
| `http://palo-identity:8080` | Docker network or VPS loopback only | PALO-owned OIDC authorization server |
| `https://governance.paloframework.org/gateway` | Internet, authenticated | n8n/Dify adapter base URL |
| `https://governance.paloframework.org/mcp` | Internet, authenticated | Streamable HTTP MCP endpoint |
| `https://governance.paloframework.org/mcp-guide` | Internet, separately authenticated | Six read-only PALO Knowledge tools after this release is deployed |
| `https://governance.paloframework.org/mcp-guide/mcp` | Internet, separately authenticated | Reader compatibility alias for clients that infer Streamable HTTP from the final path segment |
| `https://governance.paloframework.org/mcp-guide-curator` | Internet, separately authenticated | Four curation operations plus Reader after this release is deployed |
| `https://governance.paloframework.org/mcp-guide-curator/mcp` | Internet, separately authenticated | Curator compatibility alias; canonical OAuth audience remains the non-alias endpoint |
| `https://governance.paloframework.org/hub/` | Internet, organization-authenticated | Operational Governance Builder after external prerequisites and profile activation |
| `https://governance.paloframework.org/control-plane/` | Internet, browser BFF only | OIDC session, adapter, simulation and configuration lifecycle APIs |

`8181` is therefore not the public endpoint. It remains private even when the complete stack runs online on the VPS.

Private does not mean production-authenticated. The reference PALO services call OPA over HTTP inside the isolated Docker network. Before consequential deployment, threat-model sibling-container and host compromise, add authenticated policy distribution and evaluated-bundle provenance, and use mTLS or an equivalent workload-identity control when the deployment boundary requires it.

## Supplied deployment

The files under `deploy/vps/palo-ai/` provide two reverse-proxy variants:

- `compose.host-nginx.yaml` and `nginx-governance.conf` for the current Hostinger VPS, where nginx already serves other applications;
- `compose.yaml` and `Caddyfile` for a clean VPS where PALO can own ports 80 and 443.

Both variants provide:

- Docker Compose orchestration;
- PALO-owned Keycloak 26.7.2 identity service with a separate PostgreSQL volume, five-minute access tokens, brute-force protection and audience-bound Reader/Curator clients;
- OPA 1.17.0 on a private internal network;
- PALO Gateway and MCP containers built from this repository;
- HTTPS termination and redirect through existing nginx/Certbot or Caddy 2.11.4;
- separate Docker secret files for Gateway, MCP, HMAC, identity database/admin and deployment-smoke clients;
- a dedicated volume-free Reader image with exact six-tool catalog, immutable release digest, strict OIDC audience and no PALO-AI runtime; Curator uses a different OIDC client allowlist, audience, storage boundary and exact ten-tool catalog;
- persistent PALO data and Caddy certificate volumes;
- non-root PALO containers, read-only filesystems, dropped capabilities and health checks;
- an explicit MCP host allowlist;
- public blocking of registry administration, policy registration, approval resolution and direct evidence submission;
- a VPS-local administration port bound only to `127.0.0.1`.

They also contain opt-in `hub-migration` and `hub-control-plane` profiles. These profiles are inactive by default and require externally provisioned OIDC, managed PostgreSQL, a tenant-enforcing adapter and remote signer. Follow the [Governance Hub control-plane operations runbook](palo-governance-hub-operations.md); do not activate them with the bundled unscoped preview Gateway presented as a production tenant adapter.

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
PALO_OIDC_ALGORITHMS=RS256
PALO_OIDC_TOKEN_TYPE=JWT
PALO_READER_OIDC_ALLOWED_CLIENT_IDS=palo-reader-smoke
PALO_CURATOR_OIDC_ALLOWED_CLIENT_IDS=palo-curator-smoke
PALO_OIDC_ALLOWED_TENANTS=palo
PALO_READER_RATE_LIMIT_PER_MINUTE=120
OPA_IMAGE=openpolicyagent/opa:1.17.0-static
CADDY_IMAGE=caddy:2.11.4-alpine
```

Generate protected secrets without printing them:

```bash
sh setup-secrets.sh
sh setup-identity-secrets.sh
```

The generated `.env` and `secrets/` contents are ignored by Git. Back them up through a protected secret-management process; never upload or commit them.

When upgrading an existing deployment, preserve the existing core secrets and create only the four missing identity secrets:

```bash
sh setup-identity-secrets.sh
```

Neither setup script overwrites an existing secret. Back up the new PostgreSQL volume and identity secrets through the protected VPS process before onboarding users or clients.

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

Do not open 8181, 8787, 8788, 8789, 18877, 18878, 18879, 18882, 18883 or 19000 publicly. The Hostinger Compose variant publishes these service ports only on the VPS loopback interface; the clean-VPS variant keeps its administration binding on loopback as documented in its Compose file.

When the Hub profile is enabled, do not open 18880 or 18881 publicly either. nginx or Caddy is the only Internet-facing path.

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
https://governance.paloframework.org/mcp-guide-health
https://governance.paloframework.org/mcp-guide
https://governance.paloframework.org/mcp-guide/mcp
https://governance.paloframework.org/mcp-guide-curator-health
https://governance.paloframework.org/mcp-guide-curator
https://governance.paloframework.org/mcp-guide-curator/mcp
https://governance.paloframework.org/identity-health
https://governance.paloframework.org/identity/realms/palo/.well-known/openid-configuration
https://governance.paloframework.org/gateway/v1/registry
https://governance.paloframework.org/gateway/v1/actions/verify
```

After the separate Hub admission prerequisites, migration and opt-in profile are complete, the additional endpoints are:

```text
https://governance.paloframework.org/hub/
https://governance.paloframework.org/control-plane/health
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

- the operational, Reader and Curator MCP health endpoints over HTTPS;
- rejection of anonymous operational, Reader and Curator MCP requests;
- short-lived service tokens issued by the PALO identity realm with different client IDs, scopes and exact Reader/Curator audiences;
- authenticated Reader/Curator initialization and exact 6/10-tool catalogs without operational tools;
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

For knowledge Q&A, the current n8n MCP Client Tool v1.4 supports Streamable HTTP and can connect directly to Reader or Curator. Use the supplied node examples, force `serverTransport` to `=httpStreamable`, keep credentials in n8n's encrypted credential store and qualify the exact n8n build before go-live. The HTTPS Gateway remains a separate path for the operational PALO control-plane preview; it is not required for Reader Q&A and does not turn an AI Agent into an enforced execution boundary.

## Connect other MCP clients

Reader and Curator run only in OIDC/JWKS mode. Their RFC 9728 documents advertise `https://governance.paloframework.org/identity/realms/palo`, and each runtime validates issuer, exact audience, signed token type, approved client ID, PALO tenant and least-privilege scopes. The REST Gateway retains its separate preview token until an identity-aware BFF is implemented. PALO does not implement the EMA ID-JAG exchange.

For clients that support Streamable HTTP:

```text
Endpoint: https://governance.paloframework.org/mcp
Authorization: Bearer <contents of secrets/mcp-token>
```

Expose only the PALO-governed tools to an agent. Do not make equivalent privileged target tools available through a parallel ungoverned MCP server.

For PALO explanation, deterministic route inference and knowledge Q&A, use the Reader endpoint with a short-lived OIDC access token carrying `palo:guide` and `palo:knowledge:read`:

```text
Endpoint: https://governance.paloframework.org/mcp-guide
Authorization: Bearer <OIDC access token for the exact /mcp-guide audience>
Tools: 3 guide tools + palo_list_knowledge_sources, palo_search_knowledge, palo_get_knowledge_record
```

Clients that infer the transport from the last path segment may use `/mcp-guide/mcp`; the audience remains the canonical `/mcp-guide` URL. Use `/mcp-guide-curator` (or its `/mcp` alias) only with a separately registered, explicitly allowlisted Curator OAuth client. It adds submit/list/get/review draft operations; it does not expose operational PALO-AI tools. Complete the [Reader production gates](palo-knowledge-reader-production.md) and [host qualification](palo-mcp-host-qualification.md) before marking any client live.

Register a distinct OAuth client per deployment boundary and keep confidential-client secrets outside public browser JavaScript. Public clients must use authorization code with PKCE and an exact registered redirect URI.

## Public-route boundary

The public reverse proxy currently exposes:

- MCP `/mcp`, its health endpoint and the OIDC protected-resource metadata path; the configured remote tool allowlist remains decision/status oriented and excludes administrative and execution tools;
- Knowledge Reader `/mcp-guide` and Curator `/mcp-guide-curator`, plus their terminal-`/mcp` compatibility aliases, each separately authenticated and limited to its exact 6/10-tool catalog;
- Gateway health and authenticated registry read;
- authenticated Action Claim verification and full-cycle governed execution;
- authenticated execution detail, outcome read and explicit re-verification addressed by execution ID;
- authenticated approval status read only when addressed by approval ID;
- authenticated incident detail read only when addressed by incident ID;
- authenticated ledger verification.

It blocks public agent/policy/executor/verifier registration, approval enumeration, approval resolution, incident enumeration, incident resolution and direct evidence submission. Every non-health Gateway route still relies on one coarse preview bearer token. The execution routes are provided only for isolated n8n/Dify evaluation with mock or reversible actions; they are not a browser API or a multi-tenant authorization boundary.

The opt-in Governance Hub now calls a separate BFF that implements OIDC, tenant context, RBAC, redaction, CSRF and author/reviewer separation without placing this bearer token in browser code or storage. The BFF accepts a production adapter only when its deployment configuration attests upstream tenant enforcement. The bundled Gateway does not meet that condition, so this implementation does not upgrade the Gateway or execution runtime to production.

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

Putting the operational `/mcp` or Gateway endpoint online does not make PALO-AI production-ready. Its shared-token compatibility path, optional n8n gate, evidence provenance, policy-bundle attestation, approval identity, cached authorization and effective resource-to-scope binding issues remain. Use mock, reversible or non-consequential actions until those findings are closed. The separate canonical-only Reader follows its narrower [production profile and live gates](palo-knowledge-reader-production.md); that status does not transfer to the operational runtime or Curator.

See the [public Production Readiness route](../PALO_AIProductionReadiness.html), [Capability Matrix](../PALO_AgenticCapabilityMatrix.html), and [integration guide](palo-ai-governance-integration-guide.md). Internal assessment workpapers are not published.
