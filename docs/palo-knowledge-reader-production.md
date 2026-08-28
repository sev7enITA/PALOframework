# PALO Knowledge Reader: production profile

Status: production-capable candidate for the narrow informational, canonical-only service as of 28 August 2026. Repository tests pass, a signed multi-architecture registry digest is deployed on Hostinger, and public edge checks pass. Production qualification remains deployment-specific and requires the remaining live acceptance gates below.

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

The current Hostinger production candidate uses:

```text
Public OAuth resource: https://guide-api.paloframework.org/mcp-guide
Token audience: 9e5bc7d7-df74-47ff-8864-ea4b4c5cefd3
Tenant: 4c32824e-a9c2-4f83-be20-c0d6bb24faae
Resource application: PALO Knowledge Reader API
Application/client ID: 9e5bc7d7-df74-47ff-8864-ea4b4c5cefd3
Delegated scopes: palo:guide, palo:knowledge:read
Application role: palo-knowledge-reader
Issuer: https://login.microsoftonline.com/4c32824e-a9c2-4f83-be20-c0d6bb24faae/v2.0
JWKS: https://login.microsoftonline.com/4c32824e-a9c2-4f83-be20-c0d6bb24faae/discovery/v2.0/keys
Scope claim: scp
Client claim: azp
Tenant claim: tid
JOSE typ: JWT
Algorithm: RS256
Advertised scopes: https://guide-api.paloframework.org/mcp-guide/palo:guide and https://guide-api.paloframework.org/mcp-guide/palo:knowledge:read
```

`paloframework.org` is a verified custom domain in this tenant. Both delegated scopes are enabled with admin-only consent. The application role is enabled for users/groups and applications. The resource application has no redirect URI or credential.

The Reader is currently started with the dedicated Copilot Studio client `2c9f6938-de0d-424b-892a-13dea146557f` in `PALO_OIDC_ALLOWED_CLIENT_IDS`. The client is single-tenant, is owned by `sev7en@yvvrh.onmicrosoft.com`, has only the two delegated Reader scopes and has tenant-wide admin consent. Microsoft Graph `User.Read` was removed. Anonymous requests remain rejected with HTTP 401. Allowlisting is not equivalent to host qualification: Copilot Studio remains `PARTIAL` until its generated OAuth callback is registered and an authenticated end-to-end session earns `PASS-LIVE`.

The profile uses Entra v2 access-token semantics: Microsoft emits the resource application's client ID as `aud` and `azp` as the calling client claim. The Reader keeps the public HTTPS MCP resource separate, validates the GUID audience exactly and advertises the fully qualified Entra scope identifiers clients must request. The resource app manifest now sets `api.requestedAccessTokenVersion` to `2`; a certificate-authenticated qualification token confirmed the expected issuer, audience, version, client, tenant and `palo-knowledge-reader` role on 28 August 2026.

The temporary qualification client passed the complete smoke against both `/mcp-guide` and `/mcp-guide/mcp`. Live configuration-negative tests returned 401 for wrong audience, issuer, token type, client and tenant, and 403 for a missing permission. The temporary certificate was then revoked, its private key and token were removed, and the deployed client allowlist returned to deny-all. See [the redacted Entra qualification evidence](../audit/knowledge-reader-production-candidate-2026-08-27/entra-qualification-2026-08-28.json).

### Copilot Studio client staged on 28 August 2026

The dedicated confidential client is `PALO Reader - Copilot Studio` (`2c9f6938-de0d-424b-892a-13dea146557f`, object `962d0163-ee13-4c6d-9fde-88aa288434d2`). Its one client secret is labelled `PALO Copilot Studio - rotate by 2026-11-26` and expires on 26 November 2026; the secret value is neither documented nor stored in repository evidence. The OAuth redirect URI is intentionally still empty because the current Copilot Studio MCP wizard generates the callback only after server creation.

The attempted live qualification is `PARTIAL`. Copilot Studio is reachable in tenant environment `94ba1b2c-dc17-425b-b5de-972fe6cb78a7`, but that default environment has no Dataverse data store and the environment switcher reports no other available environments. Copilot Studio therefore refuses agent creation before the MCP onboarding wizard can generate the callback. The Power Platform licensing view also reports zero billing plans, zero purchased/assigned Copilot Credits and explicitly recommends creating a billing plan.

The production environment was prepared with the following least-privilege settings: `PALO Copilot Production`, Production type, `European Union & EFTA` data boundary, Managed Environment, Dataverse, `italiano (Italia)`, `EUR`, no Dynamics 365 sample applications, and the custom Dataverse URL `palo-copilot-prod`. Access is restricted to the assigned Entra security group `PALO Copilot Makers` (`efabfb60-e255-41c4-a6ed-9bf0d5d2edc2`), with `sev7en@yvvrh.onmicrosoft.com` as its owner and sole member.

Microsoft rejected environment creation because the tenant has less than the required 1 GB of available Dataverse database capacity. The minimum direct-purchase SKU shown in the tenant Marketplace is one `Dataverse Database Capacity add-on`: USD 40 per month with a USD 480 annual commitment, billed monthly. Checkout is staged but not submitted because the tenant billing profile lacks a valid organization address and payment method. No order or charge was created. A Copilot Studio billing plan is also still required; pay-as-you-go cannot be configured because the tenant exposes no Azure subscription or resource group. After billing is completed, recreate the prepared environment, assign Copilot capacity, register the exact wizard callback, create the OAuth connection and execute the six-tool bilingual smoke.

The purchase remains intentionally paused. PALO is not a registered legal entity, so Microsoft for Startups business verification and Investor Network benefits are unavailable. Azure for Students could not be activated with the supplied institutional account, and GitHub Education reapplication was not submitted because the available documents do not visibly prove current enrollment strongly enough. Neither route supplied Dataverse or Copilot Studio capacity. Technical Reader qualification continues independently; commercial Copilot Studio qualification remains blocked until a valid capacity route is chosen. See [Microsoft funding routes for PALO](palo-microsoft-startup-student-credits.md).

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
