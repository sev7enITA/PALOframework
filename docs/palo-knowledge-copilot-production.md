# PALO Knowledge Copilot production profile

## Qualification claim

Ask PALO is designed as a narrow informational service: an authenticated user asks a question, the BFF retrieves records from the immutable PALO Knowledge Reader, and a server-side model produces a citation-bound answer. It is not an agent execution gateway and cannot approve, write, publish, sign or execute anything.

The repository profile is **production-capable**, not automatically production-qualified. Qualification applies to one exact image digest, hostname, identity configuration, Reader release, model configuration and operations environment. `/health` therefore never converts service availability into a compliance claim.

## Production admission controls

The process refuses `PALO_COPILOT_MODE=production` unless all of these are present:

- HTTPS public URL and exact HTTPS browser-origin allowlist;
- PostgreSQL-backed session storage;
- OIDC issuer, authorization endpoint, token endpoint, JWKS URI, confidential client and exact allowed tenant list;
- Reader OAuth client credentials and requested scope;
- OpenAI adapter with an explicit model and server-side API key;
- explicit proxy trust for the loopback-only reverse-proxy topology.

Production uses OIDC Authorization Code + PKCE and validates signature, issuer, audience, JOSE `typ`, expiry, nonce, subject and the configured tenant claim. Configure the token type actually observed from the tenant; Microsoft Entra ID tokens normally use `JWT`. An optional exact group allowlist narrows admission further. The Reader service identity uses the client-credentials flow, is cached only in process memory and must receive the Reader's `palo-knowledge-reader` application role or the two read scopes supported by the IdP.

## Data and privacy boundary

PostgreSQL contains only:

- one-time OIDC login transactions with a hashed state, nonce, PKCE verifier, exact return URL and expiry;
- opaque browser-session hashes, CSRF token, minimal principal, tenant/subject digests and expiry.

Questions and answers are never written to PostgreSQL or application logs. The question and selected canonical evidence are sent to the configured model provider for one stateless response with `store: false`; no prior conversation is sent. `store: false` is an application request control, not a substitute for the provider agreement, data residency choice and organizational privacy review.

## Entra reference setup

Use two distinct confidential app registrations in the same authorized tenant:

1. **PALO Knowledge Copilot Web**: web redirect URI `https://copilot-api.paloframework.org/api/copilot/auth/callback`; ID tokens enabled; one short-lived client secret or, when the runtime supports it, a workload identity/certificate. The ID token audience must be this app's exact client ID.
2. **PALO Knowledge Copilot Reader Client**: no browser redirect. Grant application permission to the existing Reader API app role `palo-knowledge-reader`, then grant admin consent. Request `api://<reader-api-client-id>/.default` at the tenant-specific v2 token endpoint.

Use the tenant-specific issuer and endpoints, never `common` or `organizations`. Start with the exact tenant ID allowlist. For a company rollout, emit a stable group claim and configure an allowed PALO user group rather than admitting every account in the tenant.

The browser app never receives the Reader client secret, model key or Reader access token.

## Reverse proxy and topology

Recommended hostname: `copilot-api.paloframework.org`, with DNS managed at Hostinger and an A/AAAA record pointing to the approved VPS. The container port binds only to `127.0.0.1:18792`; nginx is the sole public listener and owns TLS, HSTS, request size and pre-authentication rate limits.

The production frontend origin is `https://paloframework.org`. Credentialed CORS reflects only origins in the exact allowlist. Do not add wildcard CORS in nginx. The nginx access format must log `$uri`, not `$request` or `$request_uri`, so the OIDC callback authorization code is never copied into access logs.

Keep the Reader on its own hostname and OAuth resource, for example `https://guide-api.paloframework.org/mcp-guide`. The BFF must call the Reader through TLS using a separately allowlisted OAuth client.

## Live qualification checklist

Record evidence for the following against the exact registry digest to be approved:

- unit and integration suite, Governance Hub suite, production build and `npm audit` all pass;
- container runs as UID/GID `65532`, root filesystem read-only, all Linux capabilities dropped, loopback-only port and bounded CPU/memory/PIDs;
- Software Bill of Materials, image scan and signature/attestation satisfy `deploy/vps/palo-knowledge-copilot/CVE-POLICY.md` and any stricter organization policy;
- DNS, certificate chain, TLS policy, HSTS, CSP, `nosniff`, frame denial and no-store headers are public and correct;
- anonymous Ask returns 401; wrong Origin/CSRF returns 403; oversized body returns 413; pre-auth flood returns 429;
- expired or wrong OIDC issuer/audience/nonce/tenant/group is rejected;
- expired or wrong Reader issuer/audience/type/client/tenant/scope/role is rejected;
- Reader unavailable, catalog drift, malformed provenance, model timeout/rate limit and invalid citations all fail closed without a fabricated answer;
- Italian and English gold questions return relevant canonical citations; unknown questions produce `insufficient` and no model call;
- browser desktop/mobile tests pass with keyboard navigation, visible focus, live loading/error status and no horizontal overflow;
- logs, PostgreSQL rows, browser storage, URLs and error bodies contain no raw question, answer, credential or model key;
- PostgreSQL backup/restore and expiry cleanup are rehearsed; rollback to the prior signed digest is timed and documented;
- owner and security reviewer sign the evidence bundle for the exact digest, configuration fingerprint, Reader release and model identifier.

The resulting approval is for an informational knowledge service only. It does not qualify PALO's operational runtime or prove that a downstream organization is legally compliant.
