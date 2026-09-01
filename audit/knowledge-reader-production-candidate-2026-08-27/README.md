# PALO Knowledge Reader local production-candidate evidence

Date: 2026-08-28

Scope: dedicated informational, canonical-only, read-only MCP Reader. This evidence does not qualify the Curator or operational PALO-AI runtime.

## Result

Local code, configuration, proxy and container gates passed. Hostinger DNS, TLS, Microsoft Entra resource configuration and exact signed registry digest `sha256:950a3625148c47587741f4b10a126acbba19f1429e2ade6bdcd6b2aa70b15915` are deployed. Positive and negative authenticated Entra qualification passed with a temporary certificate client, which was then revoked. A real least-privilege Copilot Studio client is registered and allowlisted, but its live host qualification is blocked before callback generation because the tenant has no Copilot Studio environment with Dataverse. The release remains `production-candidate` because host qualification and independent accountable security approval are still pending.

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
- The action-SHA-pinned GHCR admission workflow is active on `main` for immutable tags, multi-architecture builds, exact-digest Trivy gating, SPDX SBOM generation and a separate `knowledge-reader-production` environment approval before Sigstore keyless signing/attestation. The GitHub environment permits only `main` and temporarily uses repository owner `sev7enITA` with self-review allowed to demonstrate the gate. This is not independent security approval.
- Local image: `sha256:86fe3731757cb3e602331909c56119edb075c08b1a017f29c4ed3005ad2ba776`, `linux/arm64`, configured user `node`.
- The image started in strict production mode with no secret file, all capabilities dropped and a read-only root filesystem.
- Runtime health reported immutable bundle integrity, six tools, no mutation, no persistence, OIDC, rejected JSON-RPC batching and `productionQualified:false`.
- A filesystem write probe failed and the runtime inventory excluded `better-sqlite3`, `core.js`, schemas and policy-as-code.
- The Caddy plus internal nginx edge plus Reader Compose path reached healthy state and returned the Reader health record.
- The pre-fix batch amplification trigger now returns HTTP 400 / JSON-RPC `-32600` and no longer dispatches batch members. Single-message legacy MCP remains functional.
- `npm run build` and `npm run build:check` passed; `dist` exactly matches the 440 allowlisted build outputs. Direct source and built-artifact structural validation also passed.

Superseded local-image SBOMs are intentionally excluded from the release branch. The admission workflow regenerates the SBOM and vulnerability evidence against the exact new registry digest.

## Verified on the Hostinger production candidate

- Dedicated DNS `guide-api.paloframework.org` resolves to the existing PALO VPS with TTL 300.
- Let's Encrypt issued an ECDSA certificate valid through 25 November 2026; Certbot renewal is scheduled, HTTP redirects to HTTPS and HSTS is emitted.
- nginx uses a separate virtual host, a 64 KiB body limit, bounded proxy timeouts and a pre-authentication rate-limit zone. It proxies only to loopback port `18882`.
- The release runtime uses the signed upstream Node 22 Distroless Debian 13 nonroot base pinned at `sha256:4e4fb0ce55fd73901600796ef079a9490369d2515d7da31633a91608c82ca13b`.
- Superseded deployment image IDs are `sha256:1cee3f0555d480cf55c386fccae92a8668ae6e9bea12cb7504e4d38b052b975b` and `sha256:c12628d7abecca56965f74215ee71a44702ed8b9bb687ea4c43882ae1d0daf86`. The current registry release is the exact digest `sha256:950a3625148c47587741f4b10a126acbba19f1429e2ade6bdcd6b2aa70b15915`; configured user `65532:65532`; read-only root filesystem; all capabilities dropped; `no-new-privileges`; no shell.
- A live write probe failed with `EROFS`; the health record reported the expected six-tool, immutable, non-persistent, OIDC-only boundary.
- Trivy 0.73.0 scanned Debian 13.6 and the Node dependency tree using the 27 August 2026 vulnerability database: zero Critical and zero High findings.
- Current Entra-v2 exact-image evidence: [SPDX SBOM](reader-image-entra-v2.spdx.json) and [High/Critical vulnerability report](reader-image-entra-v2-trivy-high-critical.json). Trivy 0.73.0 reported zero High and zero Critical findings against the current image.
- `paloframework.org` is verified as a custom domain in the deployment-owned Microsoft Entra tenant. The tenant identifier remains in the private deployment inventory.
- Single-tenant resource application `PALO Knowledge Reader API` has an exact HTTPS Application ID URI, two admin-only delegated Reader scopes and the `palo-knowledge-reader` role for users/groups and applications. It has no redirect URI or credential. Its application identifier is redacted from public evidence.
- The Reader container is healthy on loopback port `18882` and runs exact registry digest `sha256:950a3625148c47587741f4b10a126acbba19f1429e2ade6bdcd6b2aa70b15915` with read-only root, UID/GID `65532:65532`, all capabilities dropped, `no-new-privileges` and PID limit 128.
- OAuth protected-resource metadata now advertises the tenant-specific Entra v2 authorization server and the two fully qualified scope identifiers, while token validation binds the exact API client-ID audience and `azp` caller claim separately from the public MCP resource URL.
- The resource manifest now requests v2 access tokens and both applications have a deployment-owned accountable owner whose account address is not published.
- The certificate-authenticated token contained the exact v2 issuer, API audience, qualification-client `azp`, tenant and only the `palo-knowledge-reader` role. Both public MCP paths passed the exact six-tool/canonical/bilingual smoke.
- Live negative tests returned 401 for wrong audience, issuer, JOSE token type, client and tenant, and 403 for missing permission. A deterministic trusted-JWKS test covers expiration rejection.
- The temporary qualification credential was revoked after testing; the private key and access token were removed locally; the server rejects the former client with 401. Its credential identifier is redacted.
- Redacted machine-readable evidence: [Entra qualification on 28 August 2026](entra-qualification-2026-08-28.json).
- Dedicated Copilot Studio client `PALO Reader - Copilot Studio` has exactly the delegated scopes `palo:guide` and `palo:knowledge:read`, tenant-wide admin consent and no Microsoft Graph permission. Client, owner and credential-rotation identifiers remain in the private deployment inventory; no secret value or token is retained in evidence.
- The deployed client allowlist now contains only the dedicated Copilot Studio client. The same exact distroless image was recreated healthy; public health returned 200 and an anonymous MCP initialize remained 401.
- Copilot Studio host qualification is `PARTIAL`: the available environment has no Dataverse capacity, so agent creation and the MCP wizard are unavailable. Private environment and billing identifiers are omitted.
- Assigned Entra security group `PALO Copilot Makers` was created for the future production environment boundary. Its object identifier, owner account and membership remain private deployment records.
- The prepared environment profile is Production, Managed, `European Union & EFTA`, Dataverse with Italian locale and EUR, no sample/Dynamics applications, custom URL `palo-copilot-prod`, and access restricted to the dedicated security group. Microsoft rejected creation because the tenant lacks the required 1 GB of available database capacity.
- No capacity purchase was submitted. Private billing state, legal addresses and payment information are excluded from repository evidence.
- Commercial and student program routes supplied no current Dataverse or Copilot Studio capacity. Individual application histories and eligibility documents remain outside the repository. See [the funding decision note](../../docs/palo-microsoft-startup-student-credits.md) and [the redacted student-route evidence](student-funding-route-2026-08-28.json).
- GitHub admission-gate configuration is recorded in [the demo environment evidence](github-production-environment-demo-2026-08-28.json). `sev7enITA` is the temporary required reviewer, self-review is enabled and only `main` may deploy. Replace this configuration with independent review before production qualification.
- PR #36 merged the isolated Reader into `main` after Linux and Windows checks passed. Workflow run [33141000528](https://github.com/sev7enITA/PALOframework/actions/runs/33141000528) published `reader-v1.0.0`, scanned the exact multi-architecture digest with zero High/Critical findings, generated an SPDX SBOM, paused on the demo environment gate, and keyless-signed plus attested the admitted digest. Durable evidence: [candidate](reader-v1.0.0-candidate-evidence.json), [release](reader-v1.0.0-release-evidence.json), [SBOM](reader-v1.0.0.spdx.json) and [Trivy report](reader-v1.0.0-trivy-high-critical.json).
- The repository SBOM copy normalizes one typographic punctuation character in an upstream package description to satisfy the public text policy. Package coordinates, relationships, image identity and the signed registry digest are unchanged; the workflow artifact remains the authoritative raw generator output.
- Hostinger now runs the exact signed digest as UID/GID `65532:65532`, read-only root, capabilities dropped, `no-new-privileges` and PID limit 128. The post-deploy synthetic monitor passed at 219/101/48 ms for health/metadata/anonymous challenge; Host and Origin denial returned 403, oversize input returned 413, and a 25-request burst produced 14 pre-authentication 429 responses. See [live deployment evidence](reader-v1.0.0-live-deployment-2026-08-28.json).
- Redacted machine-readable evidence: [Copilot Studio staging on 28 August 2026](copilot-studio-staging-2026-08-28.json).
- Public health and OAuth protected-resource metadata return 200; anonymous calls return 401; HTTP redirects to HTTPS; the certificate chain verifies; HSTS is present; a 70,000-byte body returns 413 before authentication.
- Live unapproved Host and Origin requests both return HTTP 403 before authentication with a controlled JSON-RPC error. Redacted evidence: [edge Host/Origin denial on 28 August 2026](edge-host-origin-denial-2026-08-28.json).
- nginx now returns the required 429 status for pre-authentication rate limiting; a 25-request burst produced both admitted 401 challenges and 11 edge 429 responses.
- Sample nginx and container logs contain request method/path/status and startup state only; they do not contain Authorization headers or MCP bodies.
- The tokenless synthetic monitor passed public health invariants, OAuth metadata and anonymous denial with 132/109/43 ms probe latencies. Redacted evidence: [synthetic monitor on 28 August 2026](synthetic-monitor-2026-08-28.json). The 15-minute GitHub Actions canary is active on the default branch, and manual run [33141882612](https://github.com/sev7enITA/PALOframework/actions/runs/33141882612) passed against the deployed service on commit `18ab62306b3811b8b3861299a63b24ae6d2c6892`; central one-minute alerting remains an operations gate.

## Known local blockers

- Docker Scout still requires a Docker account login on this workstation. The equivalent blocking policy was completed with Trivy against the exact Hostinger image; Docker Scout remains optional corroboration.
- The signed amd64/arm64 registry digest is deployed. Release artifacts and the previous local image are retained for rollback; a full rollback rehearsal and independent approval remain pending.

## Mandatory live gates still pending

1. Select a commercial capacity route: either form an eligible legal entity and obtain an accepted startup benefit that demonstrably supplies Dataverse capacity, or complete the tenant billing profile and purchase/provision the required Dataverse and Copilot Studio capacity. The evaluated student routes are closed for now.
2. Recreate the prepared non-default production environment with Dataverse, assign Copilot Studio capacity, then resume the staged OAuth wizard and register its generated callback URI.
3. Complete a controlled upstream-timeout fault injection. Live Host/Origin denial, DNS, certificate chain, HTTPS redirect, HSTS, body-limit and pre-authentication 429 already pass.
4. Confirm the log result in the organization's central traces/APM, if enabled; deployed nginx and container samples already contain neither Authorization headers nor MCP bodies.
5. Obtain an independent reviewer for the versioned bilingual Q&A labels and run host-model grounded-answer scoring. Automated retrieval/provenance thresholds already pass.
6. Rehearse monitoring, rollback and the required availability/failover behavior.
7. Execute the standalone smoke on canonical and compatibility URLs with a short-lived token.
8. Complete `PASS-LIVE` for each approved MCP host and retain tenant/build/transcript evidence.
9. Replace the temporary self-reviewing GitHub gate with an independent security reviewer, assign accountable application/service ownership and record both approvals for the exact hostname, IdP client/tenant policy and signed image digest.
