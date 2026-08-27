# PALO Governance Hub control plane

This package is the browser-safe backend-for-frontend for the Governance Hub setup builder. It is deliberately separate from the PALO execution gateway: the browser never receives gateway credentials or signing material.

The control plane provides:

- OIDC Authorization Code + PKCE login with opaque, server-side sessions;
- tenant and role binding on every authenticated request;
- exact-origin CORS, CSRF, request-size limits, security headers and rate limits;
- allowlisted server-side platform adapters;
- deterministic server-side boundary simulation;
- PostgreSQL-backed draft, review, publication and append-only audit state;
- remote signing for publication, with no private key in the application process.

`PALO_HUB_MODE=production` fails closed unless OIDC, PostgreSQL, an exact HTTPS public origin, at least one adapter and the remote signer are configured. A successfully started service is still not an independent assurance attestation: deployment admission and evidence remain separately visible through `/health` and `/v1/capabilities`.

See `docs/palo-governance-hub-operations.md` for configuration, migration and release gates.
