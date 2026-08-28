# PALO Knowledge Reader operations

This runbook applies only to the standalone, informational, canonical-only Reader. It does not qualify the Curator or operational PALO-AI runtime.

## Recommended service objectives

- Monthly HTTPS availability: 99.5%, excluding announced maintenance.
- Public health latency: p95 below 500 ms; authenticated MCP read latency: p95 below 2 seconds.
- Error budget: approximately 3 hours 39 minutes in a 30-day month.
- Recovery time objective: 60 minutes. Recovery point objective: not applicable to service data because the Reader is stateless; deployment configuration and audit evidence must remain versioned and recoverable.

The accountable owner must approve different targets if business impact requires stronger availability or regional failover. A single Hostinger VPS does not provide regional failover and cannot claim an HA objective.

## Privacy-preserving monitoring

Probe `GET /mcp-guide-health` every minute from at least one external location. Alert on:

- two consecutive failures as warning and five as critical;
- certificate expiry below 30 days;
- health fields different from `integrityVerified:true`, `toolCount:6`, `mutationCapabilities:false` or `persistence:none`;
- p95 health latency above 500 ms for 15 minutes;
- authenticated MCP p95 above 2 seconds for 15 minutes;
- any sustained 5xx rate above 1% for five minutes;
- unusual changes in 401, 403, 413 or 429 rates;
- container restart, unhealthy state or integrity/startup refusal.

Store timestamp, route class, status, latency, client identifier hash and correlation ID only. Do not store Authorization headers, tokens, MCP bodies, queries, retrieved records or model answers. Validate the central logging/APM pipeline separately because nginx and container samples cannot prove upstream collector redaction.

The repository includes `synthetic-monitor.mjs` and a 15-minute GitHub Actions schedule that verifies public health invariants, OAuth metadata and anonymous denial without a bearer token or knowledge query. It is a supplemental external canary, not a substitute for the one-minute production monitor or central alerting required by the SLO.

## Deployment admission

Use the manually dispatched `Publish signed PALO Knowledge Reader` workflow. Configure the GitHub environment `knowledge-reader-production` with the accountable owner and security reviewer as required reviewers. The workflow validates the Reader and gold set, builds amd64/arm64, publishes to GHCR, scans the exact digest and generates an SPDX SBOM. It then exposes that digest and evidence before the environment-protected admission job can be approved; only after that approval does it keyless-sign and attest the digest. Both candidate and final evidence are retained.

Promote only the exact `ghcr.io/sev7enita/palo-knowledge-reader@sha256:...` digest. A tag alone is not an admission identity. Copy the workflow evidence into the release audit record and configure `PALO_GUIDE_IMAGE` with the digest before `docker compose up -d --no-build`.

## Rollback rehearsal

Before promotion, record:

- candidate registry digest and knowledge `bundleSha256`;
- preceding admitted registry digest and knowledge `bundleSha256`;
- Entra resource/client IDs, allowlists and public hostname;
- health result and authenticated smoke transcript for both public paths.

Rehearse rollback during an approved window:

1. Set `PALO_GUIDE_IMAGE` to the preceding admitted digest without changing identity configuration.
2. Run `docker compose pull palo-guide-mcp` and `docker compose up -d --no-build palo-guide-mcp`.
3. Wait for healthy state and verify public health, anonymous 401, exact six-tool catalog, canonical search/get and the compatibility alias.
4. Confirm that logs contain no token or request body.
5. Restore the candidate digest only if the rollback rehearsal is explicitly closed as successful.

Do not prune the preceding image until the new digest has remained inside SLO for the owner-approved observation period.

## Controlled timeout test

Do not point the public route at a delayed or dead upstream during ordinary traffic. Use an isolated qualification virtual host or maintenance window with a disposable upstream that accepts the connection but delays its response beyond `proxy_read_timeout`. The expected result is a bounded nginx 504, no request retry loop, no body/token logging and immediate recovery after the test route is removed. Preserve nginx config/test output and timestamps. Static timeout directives alone do not complete this live gate.
