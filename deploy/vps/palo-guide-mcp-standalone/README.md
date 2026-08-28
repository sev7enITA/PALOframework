# PALO Knowledge Reader production deployment profile

This profile deploys the dedicated, stateless PALO Knowledge Reader from a repository checkout. It exposes exactly six informational tools over Streamable HTTP and has no database, local publication workspace, executor, approval, incident, evidence-ledger or write capability.

The image contains only the Reader code, its six runtime dependencies and the seven immutable canonical data files bound by `data/knowledge-reader-release.json`. Its final stage is Node 22 Distroless Debian 13, pinned by digest, with no shell or package manager. It runs as the unprivileged numeric user `65532:65532` on a read-only filesystem with all Linux capabilities dropped.

## Required boundary

- TLS terminates at nginx or another approved edge proxy.
- OIDC access tokens are validated against issuer, one exact audience, expiry, algorithm, signed token type and JWKS.
- The configured OAuth client and tenant claims must match explicit allowlists; no wildcard or `sub` fallback is admitted in production.
- Tokens need both `palo:guide` and `palo:knowledge:read`, or the `palo-knowledge-reader` role.
- The public OAuth resource is the exact Reader URL, for example `https://governance.paloframework.org/mcp-guide`; the token audience is one exact IdP-issued value and may be a distinct API client ID where the IdP requires it.
- Port `18879` remains bound to loopback and must not be opened in the firewall.
- Edge request limits complement the per-client application limit; neither query bodies nor bearer tokens should be written to logs.

The Reader provides framework information. It is not legal advice, certification, case approval, an operating-effectiveness assessment or a production authorization boundary.

## Install from a repository checkout

From this directory:

```sh
cp .env.example .env
```

Set the real public hostname, OIDC issuer, one exact token audience, JWKS URI, access-token type, approved OAuth client IDs and approved tenant IDs. Grant the Reader scopes or role. Keep `PALO_GUIDE_PUBLIC_URL` as the canonical MCP resource even when the IdP emits another exact `aud` value, such as a Microsoft Entra v2 API client ID. `PALO_OIDC_TOKEN_TYPE` must match the IdP's signed JOSE `typ` value (for example `at+jwt` for an RFC 9068 profile); do not copy the example without checking the tokens actually issued by your IdP.

Set `PALO_OIDC_ADVERTISED_SCOPES` when OAuth clients must request fully qualified scope identifiers that differ from the short names emitted in the access-token scope claim. The Reader still authorizes only the internal `palo:guide` and `palo:knowledge:read` values.

`PALO_GUIDE_IMAGE` pins the exact image tag admitted for the deployment. Build and scan that tag before promotion, record its immutable digest, then start with `docker compose up -d --no-build` so Compose cannot replace the qualified image during deployment.

Validate and start:

```sh
docker compose config
docker compose build --pull
docker compose up -d
docker compose ps
curl --fail -H 'Host: governance.paloframework.org' http://127.0.0.1:18879/ready
```

The container refuses startup in production mode if OIDC, HTTPS, the explicit host allowlist, token/client/tenant policy, canonical-only content policy, payload, rate or concurrency limits do not meet its admission rules. It also refuses startup if a released knowledge file differs from its SHA-256 manifest.

## Configure nginx

1. Copy `nginx-http-rate-limit.conf` to `/etc/nginx/conf.d/palo-guide-mcp-rate-limit.conf`.
2. Include `nginx-server-locations.conf` inside the existing HTTPS `server` block.
3. Validate before reloading:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Retain the existing certificate, HSTS and other application routes. Do not add permissive CORS headers.

The fragment publishes both canonical `/mcp-guide` and compatibility `/mcp-guide/mcp` routes. Configure OAuth audience/resource identity only as the canonical `/mcp-guide` URL.

## Protocol smoke

Obtain a short-lived test access token with the two Reader scopes, then run from the repository checkout without placing it in shell history:

```sh
read -r -s PALO_READER_TEST_ACCESS_TOKEN
export PALO_READER_TEST_ACCESS_TOKEN
node deploy/vps/palo-guide-mcp-standalone/smoke-guide.mjs \
  https://governance.paloframework.org/mcp-guide
unset PALO_READER_TEST_ACCESS_TOKEN
```

The smoke test checks health/integrity, anonymous and JSON-RPC batch rejection, the exact six-tool catalog, canonical search, the Italian seed path and an empty unknown-term result. Run it once against `/mcp-guide` and once against the compatibility alias `/mcp-guide/mcp`.

## Production qualification

The code and container profile are production-capable for this narrow informational service. A deployment becomes qualified only after the repository acceptance suite plus the live checks in `docs/palo-knowledge-reader-production.md` pass against the chosen IdP, proxy, monitoring, backup/rollback process and organizational security controls.

Use [OPERATIONS.md](OPERATIONS.md) for the recommended SLO, privacy-preserving monitoring, signed GHCR admission, rollback rehearsal and isolated timeout fault-injection procedure.

Run the tokenless synthetic check at any time with:

```sh
node deploy/vps/palo-guide-mcp-standalone/synthetic-monitor.mjs \
  https://guide-api.paloframework.org/mcp-guide
```
