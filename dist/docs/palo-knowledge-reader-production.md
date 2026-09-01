# PALO Knowledge Reader: production profile

Status: production-capable candidate for the narrow informational, canonical-only service as of 28 August 2026. Repository tests pass, a signed multi-architecture registry digest is deployed on Hostinger, and public edge checks pass. Production qualification remains deployment-specific and requires the remaining live acceptance gates below.

Publication boundary: this public document records control design, verification status and non-sensitive endpoints. Tenant IDs, application and object IDs, account addresses, credential labels, rotation dates, billing records and private environment identifiers remain in the deployment-owned secret and asset inventory, not in the public repository.

## Decision

The read-only Reader can use a materially smaller production boundary than the operational PALO-AI runtime. It does not need PostgreSQL/RLS, a distributed queue, KMS signing or an executor because it stores no tenant state, performs no background work, signs no evidence and has no target-system authority.

This conclusion is valid only while all of these remain true:

- the service exposes exactly the six Reader tools;
- content is the immutable canonical PALO release only;
- there is no local/private knowledge ingestion, conversation storage or query logging;
- every request is informational and has no side effect;
- the container has no operational PALO-AI code, database or target credential.

Adding private knowledge, per-tenant corpora, usage history, feedback, curation, writes or protected actions reopens the architecture and security assessment.

## Implemented boundary

| Control | Implementation |
| --- | --- |
| Runtime isolation | `reader-http.js` and `reader-server.js` do not import `GovernanceRuntime`, SQLite, OPA, executor, approvals, incidents or evidence code |
| Fixed catalog | Six tools are registered directly; there is no configurable allowlist or write-tool registration path |
| Immutable content | Seven canonical JSON files are bound by `data/knowledge-reader-release.json`; SHA-256 verification fails startup on any mismatch |
| Local content exclusion | `includeCuratedLocal:false`; no knowledge workspace or volume is mounted |
| Stateless transport | Streamable HTTP stateless mode; no MCP session store or application persistence; top-level JSON-RPC batches are rejected before MCP dispatch |
| Read index | Canonical JSON is parsed once at startup into an immutable in-memory index shared by stateless request handlers |
| Identity | Production mode requires OIDC/JWKS, HTTPS resource URL, one exact audience, access-token `typ`, approved OAuth clients, approved tenants, issuer, expiry, allowed algorithms and both Reader scopes |
| Network input | Explicit Host/Origin allowlist, 64 KiB application and proxy body limit, 5 second connect and 30 second response/read/write proxy timeouts; Reader egress is separated from operational PALO-AI and exists only for IdP/JWKS reachability |
| Abuse control | Pre-authentication nginx IP limit, per-principal application rate limit, global/per-OAuth-client concurrency limits and HTTP 429 with `Retry-After` |
| Container | Dedicated Node 22 Distroless Debian 13 image pinned by digest, restricted build context, numeric nonroot user, no shell/package manager, read-only root filesystem, CPU/memory/PID limits, `cap_drop: [ALL]`, no secrets or writable volumes |
| Disclosure | Health reports service version, content digest, integrity state, catalog size, no persistence and no mutations; it exposes no credentials or query data |

## Exact API boundary

Canonical resource:

```text
https://<host>/mcp-guide
```

OAuth protected-resource metadata:

```text
https://<host>/.well-known/oauth-protected-resource/mcp-guide
```

Required scopes:

```text
palo:guide
palo:knowledge:read
```

The fixed role `palo-knowledge-reader` expands to those two scopes. A token lacking either scope is rejected before MCP dispatch. Shared-token mode exists only for local evaluation and production admission rejects it.

Production also binds authorization to the configured `PALO_OIDC_CLIENT_ID_CLAIM` and `PALO_OIDC_TENANT_CLAIM`. In allowlist mode neither `sub` nor a different client claim is accepted as a fallback. The canonical OAuth resource remains `/mcp-guide`; the token audience is one exact value and may be a distinct IdP API identifier. `/mcp-guide/mcp` is a transport compatibility alias only.

## Production configuration

Required environment:

```sh
PALO_READER_RUNTIME_MODE=production
PALO_AUTH_MODE=oidc
PALO_MCP_HTTP_HOST=0.0.0.0
PALO_MCP_HTTP_PORT=8789
PALO_MCP_ALLOWED_HOSTS=reader.example.org,127.0.0.1,localhost
PALO_MCP_PUBLIC_URL=https://reader.example.org/mcp-guide
PALO_OIDC_ISSUER=https://reader.example.org/identity/realms/palo
PALO_OIDC_AUDIENCE=<one-exact-token-audience>
PALO_OIDC_JWKS_URI=https://reader.example.org/identity/realms/palo/protocol/openid-connect/certs
PALO_OIDC_ALGORITHMS=RS256
PALO_OIDC_ROLE_CLAIM=roles
PALO_OIDC_SCOPE_CLAIM=scope
PALO_OIDC_CLIENT_ID_CLAIM=azp
PALO_OIDC_TENANT_CLAIM=tid
PALO_OIDC_TOKEN_TYPE=JWT
PALO_OIDC_ALLOWED_CLIENT_IDS=<approved-client-id>[,<approved-client-id>...]
PALO_OIDC_ALLOWED_TENANTS=<approved-tenant-id>[,<approved-tenant-id>...]
PALO_READER_MAX_BODY_BYTES=65536
PALO_READER_RATE_LIMIT_PER_MINUTE=120
PALO_READER_MAX_CONCURRENCY=32
PALO_READER_MAX_CONCURRENCY_PER_CLIENT=4
PALO_KNOWLEDGE_WRITE_ENABLED=false
PALO_KNOWLEDGE_REVIEW_ENABLED=false
PALO_KNOWLEDGE_INCLUDE_CURATED_LOCAL=false
```

Use [the dedicated deployment profile](../deploy/vps/palo-guide-mcp-standalone/README.md) or the `palo-guide-mcp` service in `deploy/vps/palo-ai`. The Curator and operational PALO-AI services remain separate and retain their own maturity status.

### Signed release deployed on 28 August 2026

`reader-v1.0.0` was built from `main` commit `68153b957df919f0b4481930a3b1d068933d7539` as a public Linux amd64/arm64 OCI index at `ghcr.io/sev7enita/palo-knowledge-reader@sha256:950a3625148c47587741f4b10a126acbba19f1429e2ade6bdcd6b2aa70b15915`. The GitHub workflow validated the Reader, published the immutable tag, found zero High/Critical Trivy findings on that digest, generated an SPDX JSON SBOM, paused on the `knowledge-reader-production` environment and then keyless-signed and attested the admitted digest with Sigstore.

The Hostinger standalone service now runs that exact digest as UID/GID `65532:65532`, with a read-only root filesystem, all capabilities dropped, `no-new-privileges` and PID limit 128. Post-deploy public checks passed health, OAuth metadata, anonymous 401 challenge, Host/Origin 403, 64 KiB edge rejection, pre-authentication 429, HSTS and TLS-chain verification. See [release admission evidence](../audit/knowledge-reader-production-candidate-2026-08-27/reader-v1.0.0-release-evidence.json), [live deployment evidence](../audit/knowledge-reader-production-candidate-2026-08-27/reader-v1.0.0-live-deployment-2026-08-28.json), [exact-digest SBOM](../audit/knowledge-reader-production-candidate-2026-08-27/reader-v1.0.0.spdx.json) and [exact-digest vulnerability report](../audit/knowledge-reader-production-candidate-2026-08-27/reader-v1.0.0-trivy-high-critical.json).

The environment approval was intentionally performed by the repository owner with self-review enabled to demonstrate the complete release loop. It is not independent security acceptance. The service therefore remains `production-candidate` until independent review and the other live gates are complete.

### Microsoft Entra ID profile deployed on 27 August 2026

The current Hostinger production candidate uses the following public-safe profile:

```text
Public OAuth resource: https://guide-api.paloframework.org/mcp-guide
Token audience: deployment-owned resource application identifier
Tenant: deployment-owned single-tenant directory
Resource application: PALO Knowledge Reader API
Delegated scopes: palo:guide, palo:knowledge:read
Application role: palo-knowledge-reader
Issuer pattern: https://login.microsoftonline.com/<tenant-id>/v2.0
JWKS pattern: https://login.microsoftonline.com/<tenant-id>/discovery/v2.0/keys
Scope claim: scp
Client claim: azp
Tenant claim: tid
JOSE typ: JWT
Algorithm: RS256
Advertised scopes: https://guide-api.paloframework.org/mcp-guide/palo:guide and https://guide-api.paloframework.org/mcp-guide/palo:knowledge:read
```

`paloframework.org` is a verified custom domain in the deployment tenant. Both delegated scopes are enabled with admin-only consent. The application role is enabled for users/groups and applications. The resource application has no redirect URI or credential.

The Reader uses a dedicated, single-tenant Copilot Studio client in `PALO_OIDC_ALLOWED_CLIENT_IDS`, with only the two Reader scopes and tenant-wide admin consent. Microsoft Graph `User.Read` was removed. Anonymous requests remain rejected with HTTP 401. The exact client, tenant and object identifiers are intentionally retained only in the private deployment inventory. Allowlisting is not equivalent to host qualification: Copilot Studio remains `PARTIAL` until its generated OAuth callback is registered and an authenticated end-to-end session earns `PASS-LIVE`.

The profile uses Entra v2 access-token semantics: Microsoft emits the resource application's client ID as `aud` and `azp` as the calling client claim. The Reader keeps the public HTTPS MCP resource separate, validates the GUID audience exactly and advertises the fully qualified Entra scope identifiers clients must request. The resource app manifest now sets `api.requestedAccessTokenVersion` to `2`; a certificate-authenticated qualification token confirmed the expected issuer, audience, version, client, tenant and `palo-knowledge-reader` role on 28 August 2026.

The temporary qualification client passed the complete smoke against both `/mcp-guide` and `/mcp-guide/mcp`. Live configuration-negative tests returned 401 for wrong audience, issuer, token type, client and tenant, and 403 for a missing permission. The temporary certificate was then revoked, its private key and token were removed, and the deployed client allowlist returned to deny-all. See [the redacted Entra qualification evidence](../audit/knowledge-reader-production-candidate-2026-08-27/entra-qualification-2026-08-28.json).

### Copilot Studio client staged on 28 August 2026

The dedicated confidential client is recorded in the private deployment inventory. Its credential value, label, rotation schedule, application ID and object ID are not published. The OAuth redirect URI is intentionally still empty because the current Copilot Studio MCP wizard generates the callback only after server creation.

The attempted live qualification is `PARTIAL`. The available tenant environment does not provide the Dataverse and licensing capacity needed to create the agent and reach the MCP onboarding wizard. Private environment identifiers and tenant billing state are intentionally omitted.

The proposed production environment uses a managed production boundary, an EU and EFTA data location, Dataverse, no Dynamics 365 sample applications and access restricted to a dedicated Entra security group. Group identifiers, membership and account addresses remain private deployment records.

Environment creation remains blocked by insufficient Dataverse capacity and the absence of an approved Copilot Studio capacity route. No purchase status, address, payment information or private billing detail belongs in this repository. After an accountable owner approves capacity, recreate the environment, assign capacity, register the exact wizard callback, create the OAuth connection and execute the six-tool bilingual smoke.

Commercial Copilot Studio qualification remains blocked until a valid capacity route is approved. Individual program applications, eligibility evidence and account histories are handled outside the public repository. Technical Reader qualification continues independently. See [Microsoft funding routes for PALO](palo-microsoft-startup-student-credits.md).

## Repository acceptance

Run:

```sh
npm run validate:knowledge-reader
npm run validate:knowledge-gold
npm run validate:knowledge-copilot
npm run validate:agentic
```

The Reader-specific suite proves:

- the manifest matches every canonical byte and tampering fails closed;
- the in-process MCP catalog is exactly six read-only/non-destructive tools;
- a populated local publication directory is invisible;
- unknown searches can return no evidence instead of irrelevant canonical records;
- production configuration rejects shared tokens, HTTP resource URLs, host mismatch, non-exact audiences, missing token/client/tenant policy and write/curation flags;
- JSON-RPC batches are rejected while single-message legacy compatibility remains available;
- health, anonymous rejection, payload limiting, rate limiting and global/per-OAuth-client concurrency limiting work without opening a test port;
- a small deterministic Italian/English governance seed regression overlaps the equivalent English retrieval, complete-term matching avoids `access`/`accessibility` collisions and unknown evidence remains empty.

The versioned gold-set candidate is [`reader-gold-set.v1.json`](../examples/agentic-interface/knowledge-copilot/reader-gold-set.v1.json). It contains 32 Italian/English positive questions in 16 equivalent pairs and four deliberately unknown queries. Automated evaluation currently passes a 100% top-five expected-record hit rate, bilingual top-five overlap rate, unknown-query empty rate and provenance-completeness rate. Its `independentReviewer` and `reviewedAt` fields remain empty: an accountable person who did not prepare the set must review the labels, and a host-model grounded-answer evaluation is still required before claiming a supported-language SLA.

The GitHub environment `knowledge-reader-production` is configured for the pipeline demonstration with repository owner `sev7enITA` as required reviewer, `prevent_self_review=false` and a custom deployment branch policy allowing only `main`. This is deliberately classified as a demo gate: it proves that the separate admission job can pause for approval, but it is not independent security review. Production qualification requires replacing that reviewer and enabling self-review prevention. The workflow itself is not active until its isolated changes are committed to the default branch.

## Live qualification gates

All gates are mandatory for a production-qualified deployment:

1. `docker compose config` and image build succeed from a clean checkout and pinned lockfile.
2. Image inventory confirms no `better-sqlite3`, OPA policy, schema bundle, operational runtime or shell entrypoint in the final stage.
3. Container runs as non-root with read-only filesystem, all capabilities dropped, no writable volume and no Reader secret file.
4. TLS certificate, HSTS, DNS, Host/Origin rejection, 64 KiB limit, timeout and pre-authentication edge rate limit pass at the public URL.
5. Valid OIDC tokens discover exactly six tools; anonymous, expired, wrong-issuer, wrong-audience, wrong/missing token type, unapproved client, wrong tenant and one-scope-only tokens fail.
6. Representative `search` and `get` calls cite only manifest-bound `data/*` sources; an unknown term returns an empty match set.
7. A versioned Q&A gold set, including the supported languages, meets organization-approved retrieval precision/recall and grounded-answer thresholds; empty/insufficient evidence is handled without fabrication. The repository candidate passes its automated retrieval/provenance thresholds, but independent label review and host-model answer scoring remain pending.
8. Logs, traces, APM and proxy records are inspected to confirm that bearer tokens and MCP request bodies are absent.
9. Dependency/SBOM and container vulnerability scans meet the organization's severity policy.
10. Monitoring covers availability, latency, 401/403/413/429/5xx rates and integrity/startup failure without recording prompts.
11. Rollback to the preceding image and knowledge digest is rehearsed; availability design and regional failover match the business SLO.
12. Each target host completes `PASS-LIVE` using `docs/palo-mcp-host-qualification.md`.
13. The accountable service owner and security reviewer record production acceptance for the exact image digest, IdP client and public hostname.

Until these deployment-specific checks pass, report the service as `production-candidate`, not `production-qualified` or live.


## What it does not do

- It does not answer from SharePoint, Drive, private files or arbitrary websites.
- It does not learn from conversations or update PALO content.
- It uses bounded deterministic lexical retrieval, not embeddings, a vector database or an integrated LLM; synonyms and complex multilingual phrasing can reduce recall.
- It does not store user profiles, prompts, answers, feedback or tenant data.
- It does not provide an authorization server, login, consent or dynamic client registration.
- It does not approve cases, decide legal applicability, certify compliance or prove operating effectiveness.
- It does not execute target actions or make another agent's tools non-bypassable.
- It does not make the Curator or operational PALO-AI runtime production-ready.
