# PALO Knowledge Reader local production-candidate evidence

Date: 2026-08-27

Scope: dedicated informational, canonical-only, read-only MCP Reader. This evidence does not qualify the Curator or operational PALO-AI runtime.

## Result

Local code, configuration, proxy and container gates passed. Hostinger DNS, TLS, Microsoft Entra resource configuration and the dedicated distroless image are deployed. Positive and negative authenticated Entra qualification passed with a temporary certificate client, which was then revoked. A real least-privilege Copilot Studio client is now registered and allowlisted, but its live host qualification is blocked before callback generation because the tenant has no Copilot Studio environment with Dataverse. The release remains `production-candidate` because host qualification, a signed registry digest and accountable security approval are still pending.

## Verified locally

- `npm run validate:knowledge-reader`: 17/17 tests passed.
- `npm run validate:knowledge-gold`: 32 Italian/English positive cases in 16 pairs and four unknown cases passed 100% top-five expected-record hit, bilingual overlap, unknown-empty and provenance-completeness thresholds. Independent human label review remains pending.
- `npm run validate:knowledge-copilot`: 11 named hosts plus qualification template passed static validation.
- `npm run validate:agentic`: 91 Node test results plus 3 Dify tests passed.
- `npm audit --omit=dev --audit-level=high`: zero reported npm vulnerabilities.
- All three Docker Compose profiles rendered with `config --quiet`.
- `caddy:2.11.4-alpine` accepted the checked-in Caddyfile.
- `nginx:1.29.1-alpine` accepted `nginx-reader-edge.conf` as UID 101 with a read-only root filesystem and `/tmp` tmpfs.
- Both integrated and standalone dedicated Reader images built successfully from the pinned lockfile; `docker buildx build --check` reported no Dockerfile warnings for either profile.
- The updated standalone image also pins the Node 22 builder index at `sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5`. A fresh 28 August build produced local arm64 manifest-list digest `sha256:830344895b4094beda92624b79c01725bc3ec0d45b11bb68a64106a3edd91abe` with no Dockerfile warnings. Strict production startup passed as UID/GID `65532:65532`, read-only root, all capabilities dropped and PID limit 128; health/integrity passed and anonymous initialize returned 401. The isolated test container and network were removed after the probe.
- Trivy 0.73.0 rescanned that fresh local digest against the 28 August 2026 database and found zero High/Critical Debian 13.6 or Node-package vulnerabilities. Docker Scout remains unavailable without a Docker ID, so the prepared GHCR workflow repeats the mandatory Trivy gate against the exact published digest before signing it.
- A manually dispatched, action-SHA-pinned GHCR workflow is prepared for main-branch-only immutable tags, multi-architecture build, exact-digest Trivy gate, SPDX SBOM, candidate evidence and a separate `knowledge-reader-production` environment approval before Sigstore keyless signing/attestation. The GitHub environment now exists, permits only `main` and temporarily uses repository owner `sev7enITA` with self-review allowed to demonstrate the gate. This is not independent security approval. The workflow still cannot execute until its changes are safely isolated and committed to `main`.
- Local image: `sha256:86fe3731757cb3e602331909c56119edb075c08b1a017f29c4ed3005ad2ba776`, `linux/arm64`, configured user `node`.
- The image started in strict production mode with no secret file, all capabilities dropped and a read-only root filesystem.
- Runtime health reported immutable bundle integrity, six tools, no mutation, no persistence, OIDC, rejected JSON-RPC batching and `productionQualified:false`.
- A filesystem write probe failed and the runtime inventory excluded `better-sqlite3`, `core.js`, schemas and policy-as-code.
- The Caddy plus internal nginx edge plus Reader Compose path reached healthy state and returned the Reader health record.
- The pre-fix batch amplification trigger now returns HTTP 400 / JSON-RPC `-32600` and no longer dispatches batch members. Single-message legacy MCP remains functional.
- `npm run build` and `npm run build:check` passed; `dist` exactly matches the 440 allowlisted build outputs. Direct source and built-artifact structural validation also passed.

The earlier local-image SPDX SBOM is [reader-image.spdx.json](reader-image.spdx.json). Docker Scout indexed 322 OS, Node-distribution and application packages for that superseded build.

## Verified on the Hostinger production candidate

- Dedicated DNS `guide-api.paloframework.org` resolves to the existing PALO VPS with TTL 300.
- Let's Encrypt issued an ECDSA certificate valid through 25 November 2026; Certbot renewal is scheduled, HTTP redirects to HTTPS and HSTS is emitted.
- nginx uses a separate virtual host, a 64 KiB body limit, bounded proxy timeouts and a pre-authentication rate-limit zone. It proxies only to loopback port `18882`.
- The replacement runtime uses the signed upstream Node 22 Distroless Debian 13 nonroot base pinned at `sha256:4e4fb0ce55fd73901600796ef079a9490369d2515d7da31633a91608c82ca13b`.
- Superseded first distroless image ID: `sha256:1cee3f0555d480cf55c386fccae92a8668ae6e9bea12cb7504e4d38b052b975b`. Current Entra-v2-capable candidate image ID: `sha256:c12628d7abecca56965f74215ee71a44702ed8b9bb687ea4c43882ae1d0daf86`; configured user `65532:65532`; read-only root filesystem; all capabilities dropped; `no-new-privileges`; no shell.
- A live write probe failed with `EROFS`; the health record reported the expected six-tool, immutable, non-persistent, OIDC-only boundary.
- Trivy 0.73.0 scanned Debian 13.6 and the Node dependency tree using the 27 August 2026 vulnerability database: zero Critical and zero High findings.
- Exact-image evidence: [distroless SPDX SBOM](reader-image-distroless.spdx.json) and [High/Critical vulnerability report](reader-image-distroless-trivy-high-critical.json).
- Current Entra-v2 exact-image evidence: [SPDX SBOM](reader-image-entra-v2.spdx.json) and [High/Critical vulnerability report](reader-image-entra-v2-trivy-high-critical.json). Trivy 0.73.0 reported zero High and zero Critical findings against the current image.
- `paloframework.org` is verified as a custom domain in Microsoft Entra tenant `4c32824e-a9c2-4f83-be20-c0d6bb24faae`.
- Single-tenant resource application `PALO Knowledge Reader API` has client ID `9e5bc7d7-df74-47ff-8864-ea4b4c5cefd3`, the exact HTTPS Application ID URI, two admin-only delegated Reader scopes and the `palo-knowledge-reader` role for users/groups and applications. It has no redirect URI or credential.
- The Reader container is healthy on loopback port `18882` and runs exact image ID `sha256:c12628d7abecca56965f74215ee71a44702ed8b9bb687ea4c43882ae1d0daf86` with read-only root, UID/GID `65532:65532`, all capabilities dropped, `no-new-privileges` and PID limit 128.
- OAuth protected-resource metadata now advertises the tenant-specific Entra v2 authorization server and the two fully qualified scope identifiers, while token validation binds the exact API client-ID audience and `azp` caller claim separately from the public MCP resource URL.
- The resource manifest now requests v2 access tokens and both resource and qualification applications have `sev7en@yvvrh.onmicrosoft.com` as owner.
- The certificate-authenticated token contained the exact v2 issuer, API audience, qualification-client `azp`, tenant and only the `palo-knowledge-reader` role. Both public MCP paths passed the exact six-tool/canonical/bilingual smoke.
- Live negative tests returned 401 for wrong audience, issuer, JOSE token type, client and tenant, and 403 for missing permission. A deterministic trusted-JWKS test covers expiration rejection.
- Qualification credential `320f6ffe-1e3d-4b36-b28c-04edf03d3cd0` was revoked after testing; the private key and access token were removed locally; the server rejects the former client with 401.
- Redacted machine-readable evidence: [Entra qualification on 28 August 2026](entra-qualification-2026-08-28.json).
- Dedicated Copilot Studio client `PALO Reader - Copilot Studio` has client ID `2c9f6938-de0d-424b-892a-13dea146557f`, owner `sev7en@yvvrh.onmicrosoft.com`, exactly the delegated scopes `palo:guide` and `palo:knowledge:read`, tenant-wide admin consent and no Microsoft Graph permission. Its client secret expires on 26 November 2026; neither its value nor any token is retained in evidence.
- The deployed client allowlist now contains only the dedicated Copilot Studio client. The same exact distroless image was recreated healthy; public health returned 200 and an anonymous MCP initialize remained 401.
- Copilot Studio host qualification is `PARTIAL`: environment `94ba1b2c-dc17-425b-b5de-972fe6cb78a7` reports that Dataverse is not configured, and the environment switcher reports no alternative environment. The licensing view reports zero billing plans and zero purchased or assigned Copilot Credits. Agent creation and the MCP wizard are consequently unavailable, so no callback URI or live transcript exists yet.
- Assigned Entra security group `PALO Copilot Makers` (`efabfb60-e255-41c4-a6ed-9bf0d5d2edc2`) was created with `sev7en@yvvrh.onmicrosoft.com` as owner and sole member for the future production environment boundary.
- The prepared environment profile is Production, Managed, `European Union & EFTA`, Dataverse with Italian locale and EUR, no sample/Dynamics applications, custom URL `palo-copilot-prod`, and access restricted to the dedicated security group. Microsoft rejected creation because the tenant lacks the required 1 GB of available database capacity.
- The tenant Marketplace exposes the minimum one-unit Dataverse Database Capacity add-on at USD 40/month with a USD 480 annual commitment, billed monthly. Checkout was opened but no order was placed and no charge occurred because legal billing address and payment method are missing. Power Platform also exposes no Azure subscription/resource group for pay-as-you-go.
- Payment remains paused. PALO is not a registered legal entity, so Microsoft for Startups business verification and Investor Network benefits are unavailable. The supplied institutional account could not be used for Azure for Students; no subscription or credit was obtained. GitHub Education reapplication was not submitted because the available records do not visibly prove current enrollment strongly enough. Student routes supplied no Dataverse or Copilot Studio capacity. See [the funding decision note](../../docs/palo-microsoft-startup-student-credits.md).
- GitHub Education account readiness was checked without retaining personal addresses or documents: the academic email is verified and the profile and billing names match. The 17 April 2025 application was rejected for insufficient dated affiliation evidence. The available Politecnico evidence describes a completed program, and the active doctorate card lacks a visible current-validity or expected-completion date and belongs to another institution. Reapplication is paused until a current official doctorate letter is available. See [the student-route evidence](student-funding-route-2026-08-28.json).
- GitHub admission-gate configuration is recorded in [the demo environment evidence](github-production-environment-demo-2026-08-28.json). `sev7enITA` is the temporary required reviewer, self-review is enabled and only `main` may deploy. Replace this configuration with independent review before production qualification.
- Redacted machine-readable evidence: [Copilot Studio staging on 28 August 2026](copilot-studio-staging-2026-08-28.json).
- Public health and OAuth protected-resource metadata return 200; anonymous calls return 401; HTTP redirects to HTTPS; the certificate chain verifies; HSTS is present; a 70,000-byte body returns 413 before authentication.
- Live unapproved Host and Origin requests both return HTTP 403 before authentication with a controlled JSON-RPC error. Redacted evidence: [edge Host/Origin denial on 28 August 2026](edge-host-origin-denial-2026-08-28.json).
- nginx now returns the required 429 status for pre-authentication rate limiting; a 25-request burst produced both admitted 401 challenges and 11 edge 429 responses.
- Sample nginx and container logs contain request method/path/status and startup state only; they do not contain Authorization headers or MCP bodies.
- The tokenless synthetic monitor passed public health invariants, OAuth metadata and anonymous denial with 132/109/43 ms probe latencies. Redacted evidence: [synthetic monitor on 28 August 2026](synthetic-monitor-2026-08-28.json). A 15-minute GitHub Actions canary is prepared but becomes active only after the workflow reaches the default branch; central one-minute alerting remains an operations gate.

## Known local blockers

- Docker Scout still requires a Docker account login on this workstation. The equivalent blocking policy was completed with Trivy against the exact Hostinger image; Docker Scout remains optional corroboration.
- The repository-wide `npm run validate` text-style stage is blocked by 19 forbidden typographic characters in pre-existing dirty changes under `governance-hub/AGENTS.md`, `governance-hub/src/App.jsx` and `scripts/browser-smoke.mjs`.
- `npm run validate:dist` is consequently blocked by 39 generated occurrences in the Governance Hub bundle. Reader/agentic validators and build exactness pass.
- The Hostinger candidate is a local amd64 image ID, not yet a signed registry digest or multi-architecture artifact.

## Mandatory live gates still pending

1. Select a commercial capacity route: either form an eligible legal entity and obtain an accepted startup benefit that demonstrably supplies Dataverse capacity, or complete the tenant billing profile and purchase/provision the required Dataverse and Copilot Studio capacity. The evaluated student routes are closed for now.
2. Recreate the prepared non-default production environment with Dataverse, assign Copilot Studio capacity, then resume the staged OAuth wizard and register its generated callback URI.
3. Complete a controlled upstream-timeout fault injection. Live Host/Origin denial, DNS, certificate chain, HTTPS redirect, HSTS, body-limit and pre-authentication 429 already pass.
4. Confirm the log result in the organization's central traces/APM, if enabled; deployed nginx and container samples already contain neither Authorization headers nor MCP bodies.
5. Publish and sign the image, then repeat the scanner policy against the exact registry digest; the exact Hostinger image already passes the zero High/Critical gate.
6. Obtain an independent reviewer for the versioned bilingual Q&A labels and run host-model grounded-answer scoring. Automated retrieval/provenance thresholds already pass.
7. Rehearse monitoring, rollback and the required availability/failover behavior.
8. Execute the standalone smoke on canonical and compatibility URLs with a short-lived token.
9. Complete `PASS-LIVE` for each approved MCP host and retain tenant/build/transcript evidence.
10. Replace the temporary self-reviewing GitHub gate with an independent security reviewer, assign accountable application/service ownership and record both approvals for the exact hostname, IdP client/tenant policy and signed image digest.
