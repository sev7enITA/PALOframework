# PALO Governance Hub control-plane operations

Status: production-candidate implementation; production admission remains fail-closed until the deployment-specific evidence in this runbook exists.

The public GitHub Pages Hub remains an autonomous static verifier. The operational product is a separate, opt-in deployment at:

- `https://<PALO_DOMAIN>/hub/`: browser application;
- `https://<PALO_DOMAIN>/control-plane/`: browser-safe backend-for-frontend;
- an operator-selected, tenant-enforcing adapter, never a browser-held Gateway token;
- managed PostgreSQL and a remote KMS/HSM signing service.

Starting containers, returning HTTP 200 or rendering a green pill is not production admission. `/health` deliberately returns `productionUse:false`; the UI says `configured-not-independently-assured` until assurance is completed outside the application.

## Implemented boundary

The control plane implements:

- OIDC Authorization Code + PKCE and opaque HttpOnly sessions;
- session expiry capped by the ID-token expiry;
- exact-origin CORS, CSRF, request-size caps, response-size caps, timeouts, redirect rejection, security headers and a defense-in-depth process rate limit;
- PALO roles, tenant binding, author/reviewer separation and recent step-up authentication for review and publication;
- allowlisted server-side adapters whose secrets never cross into browser data;
- an explicit adapter tenant-isolation declaration. Production startup rejects `tenantIsolation:none`;
- deterministic server-side simulation that calls no protected executor and says so in its receipt;
- digest-bound draft -> in-review -> approved/rejected -> remotely signed -> published lifecycle;
- atomic PostgreSQL state and audit transitions;
- versioned PostgreSQL migration with a repository digest;
- forced Row-Level Security for simulations, bundles and audit events;
- remote signing with response caps and digest matching; no private signing key in the application process;
- an expandable receipt for connection, inventory, simulation and lifecycle actions;
- an automatically expanded, digest-bound persisted-contract view for reviewers;
- structured access logs containing only bounded route metadata, status, request ID and a tenant digest, never query strings, payloads or credentials.

The package does not make the preview SQLite execution runtime, its shared-token Gateway or any protected tool path production-ready. The current preview Gateway does not enforce tenant-scoped inventory and is therefore unsuitable as a production Hub adapter.

## Mandatory external prerequisites

Do not enable the `hub-control-plane` profile until all items have an owner and evidence reference.

| Dependency | Required deployment evidence |
| --- | --- |
| Managed PostgreSQL | HA topology, encrypted connections, backup/PITR policy, completed restore test, monitoring, storage/connection limits |
| Database roles | Separate migrator and application roles; application role is `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, and has no DDL ownership |
| OIDC | Issuer, client, exact callback URI, tenant and role claims, token lifetime, logout/revocation procedure, MFA/step-up ACR, negative authorization tests |
| Tenant-aware adapter | HTTPS endpoint, server-held credential, upstream tenant enforcement, tenant-confusion negative test, allowlisted capabilities, timeout and failure-mode tests |
| Remote signer | KMS/HSM ownership, algorithm/key ID, rotation/revocation runbook, digest-bound signing protocol, audit export and provider attestation |
| Edge | TLS, WAF/rate limit, request caps, bot/abuse monitoring, log redaction and alert routing |
| Assurance | Threat model, application/cloud penetration test, cryptographic review, privacy review, dependency/SBOM scan, zero open critical findings |

## Identity configuration

Register this exact callback with the identity provider:

```text
https://<PALO_DOMAIN>/control-plane/auth/callback
```

Map organization groups to the PALO roles:

| Role | Effective Hub scopes |
| --- | --- |
| `palo-admin` | read, operate, review, publish, audit |
| `palo-operator` | read, operate |
| `palo-reviewer` | read, review |
| `palo-auditor` | read, audit |
| `palo-observer` | read |

The configured tenant claim must be present. Production review and publication require either an accepted `acr` from `PALO_HUB_STEP_UP_ACR_VALUES` or a recognized MFA `amr`, and the authentication age must remain inside `PALO_HUB_STEP_UP_MAX_AGE_SECONDS`.

## PostgreSQL roles

Use provider-specific administration to create two login roles. The following is illustrative and must be adapted to the managed service:

```sql
CREATE ROLE palo_hub_migrator LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
CREATE ROLE palo_hub_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE palo_hub TO palo_hub_migrator, palo_hub_app;
GRANT USAGE, CREATE ON SCHEMA public TO palo_hub_migrator;
GRANT USAGE ON SCHEMA public TO palo_hub_app;
```

The versioned migration owns schema changes and grants only DML/sequence access to `PALO_HUB_DATABASE_APPLICATION_ROLE`. Never use a PostgreSQL superuser or a role with `BYPASSRLS` as the web application credential.

## Secret files

Create the following files with mode `0600` under `deploy/vps/palo-ai/secrets/` through the deployment secret manager. Do not add them to Git and do not print their values:

| File | Content |
| --- | --- |
| `hub-migration-database-url` | TLS PostgreSQL URL for the migrator role |
| `hub-database-url` | TLS PostgreSQL URL for the restricted application role |
| `hub-oidc-client-secret` | OIDC confidential-client secret |
| `hub-adapter-token` | Credential accepted only by the selected tenant-aware adapter |
| `hub-signer-token` | Credential accepted only by the remote signing service |

The existing `setup-secrets.sh` intentionally does not invent these externally issued credentials.

## Adapter contract

`PALO_HUB_ADAPTERS_JSON` is a server configuration, never browser data. A production entry has this shape:

```json
[
  {
    "id": "tenant-adapter",
    "platformId": "n8n-self-hosted",
    "environment": "Isolated pilot",
    "baseUrl": "https://adapter.example.org",
    "healthPath": "/health",
    "inventoryPath": "/v1/registry",
    "tokenEnvironmentVariable": "PALO_HUB_ADAPTER_TOKEN",
    "tenantIsolation": "upstream-enforced",
    "tenantHeader": "x-palo-tenant-id",
    "timeoutMs": 5000,
    "maximumBytes": 1048576
  }
]
```

`upstream-enforced` is an operator attestation, not a cosmetic switch. It is valid only when the adapter authenticates the BFF, binds the supplied tenant to the upstream query and has passed a cross-tenant negative test. The bundled preview Gateway must remain `none`.

## Migration and activation

From `deploy/vps/palo-ai`, first validate configuration without exposing secret values:

```bash
docker compose -f compose.host-nginx.yaml --profile hub-migration config >/dev/null
docker compose -f compose.host-nginx.yaml --profile hub-control-plane config >/dev/null
```

Run the migration as a one-shot container and preserve its JSON receipt:

```bash
docker compose -f compose.host-nginx.yaml --profile hub-migration run --rm palo-hub-migrate
```

Expected fields are `migrated:true`, `migrationVersion:"001_initial"`, `rowLevelSecurity:true` and `applicationRoleGranted:true`.

Start only the Hub services:

```bash
docker compose -f compose.host-nginx.yaml --profile hub-control-plane up -d --build palo-hub-control-plane palo-hub-ui
docker compose -f compose.host-nginx.yaml --profile hub-control-plane ps
```

For the Caddy topology, replace `compose.host-nginx.yaml` with `compose.yaml`. Install/reload the supplied nginx configuration only after both loopback health checks pass:

```bash
curl --fail http://127.0.0.1:18880/health
curl --fail http://127.0.0.1:18881/
sudo nginx -t
sudo systemctl reload nginx
```

Set `PALO_HUB_ENABLED=true` for `smoke-online.sh`, then run it. It validates the UI and BFF but continues to require `productionUse:false` so availability cannot masquerade as independent assurance.

## Release checks

Before promotion:

```bash
npm ci
npm ci --prefix governance-hub
npm run palo:hub:control-plane:test
npm run validate
npm run build
npm run validate:dist
npm run build:check
npm run smoke
```

CI also starts PostgreSQL, applies migration `001_initial`, grants a restricted application role and proves that unbound and cross-tenant reads are denied by RLS.

Verify in a real browser:

1. unauthenticated UI shows no operator state;
2. OIDC login binds the expected tenant and role;
3. the connection receipt shows the adapter origin class, request count, timestamp and response digest without a secret;
4. inventory states whether tenant isolation is upstream-enforced or unscoped;
5. simulation reports seven scenarios and `No protected executor`;
6. a saved draft survives reload by bundle ID;
7. its author cannot approve it;
8. a separate stepped-up reviewer can approve or reject the same digest;
9. only a stepped-up publisher can invoke the remote signer;
10. the published digest equals the signer digest and the audit transition is present.

## Monitoring and incident response

Alert on:

- `/health` non-200, `schemaCurrent:false` or PostgreSQL latency/error rate;
- repeated OIDC callback, CSRF, origin, scope, tenant or step-up rejection;
- adapter timeout, oversize/malformed response or tenant-negative-test regression;
- signer rejection, digest mismatch, unknown key ID or signing latency;
- lifecycle conflict, audit insertion failure or migration digest mismatch;
- WAF/rate-limit anomalies and sustained 4xx/5xx changes.

Application logs must contain request IDs and bounded error classes, never cookies, bearer tokens, OIDC codes, database URLs, signer responses or draft payloads.

## Backup, restore and rollback

- Use managed PostgreSQL backup/PITR; test a restore into an isolated account before admission.
- Preserve migration and application image digests with every release.
- Never roll database state backward by container rollback alone.
- Disable new sessions at the edge, drain requests, and take a consistent recovery point before a schema change.
- A release rollback may restore the prior UI/BFF image only when its declared schema compatibility includes the current migration.
- Revoke adapter/signer/OIDC credentials and invalidate sessions after a material credential or tenant-boundary incident.

## Admission decision

Repository gates can establish that the implementation is production-candidate. They cannot establish that a specific deployment is production-admitted. Admission requires the external prerequisites above, a signed deployment profile with concrete evidence references and an independent review. Until then the correct state is `configured-not-independently-assured`, not `ready`.
