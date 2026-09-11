# PALO Knowledge Copilot BFF

`palo-knowledge-copilot` is the authenticated browser boundary for Ask PALO. It accepts a user question only after an OIDC login, retrieves evidence through the production PALO Knowledge Reader MCP service, and asks an approved server-side model to synthesize an answer with validated canonical citations.

The service is intentionally separate from the operational PALO runtime. It has no SQLite database, executor, approval workflow, evidence signer, incident API, knowledge writer or target-system credential. Its only durable records are short-lived OIDC login transactions and browser sessions in PostgreSQL. Questions and answers are not persisted.

## Trust boundary

```text
Governance Hub browser
  -> opaque HttpOnly session + CSRF
PALO Knowledge Copilot BFF
  -> OAuth client credentials held server-side
PALO Knowledge Reader (six read-only MCP tools)
  -> immutable canonical PALO release
PALO Knowledge Copilot BFF
  -> approved model API with store=false
Governance Hub browser
  <- answer receipt + canonical citations + evidence trace
```

The BFF fails closed when the Reader is unavailable, its MCP catalog is not the exact six-tool read-only profile, canonical provenance is malformed, the model omits valid citation markers, or evidence is absent. Absence of evidence produces an explicit `insufficient` result without calling the model.

## HTTP surface

- `GET /health`: dependency and boundary status. `productionQualified` deliberately remains `false`; live qualification is an external evidence decision, not an availability flag.
- `GET /api/copilot/auth/login?returnTo=...`: OIDC Authorization Code + PKCE start. Return targets must match an exact configured frontend origin.
- `GET /api/copilot/auth/callback`: OIDC callback and session creation.
- `GET /api/copilot/session`: current browser session plus non-secret service status.
- `POST /api/copilot/ask`: authenticated, CSRF-protected question endpoint.
- `POST /api/copilot/auth/logout`: authenticated, CSRF-protected session revocation.
- `POST /api/copilot/auth/development`: loopback-only development login when an explicit development principal is configured.

Every response disables caching. Security headers, exact-origin credentialed CORS, a bounded request body and a pre-authentication rate limiter are applied before business logic. Request logs include a request ID, route path, result, timing and truncated tenant digest only; they do not include query strings, request bodies, answers, cookies or bearer tokens.

## Local integration test

Use one random secret of at least 24 bytes for the local Reader and BFF only:

```sh
export PALO_LOCAL_READER_TOKEN='replace-with-a-random-local-secret-at-least-24-bytes'
PALO_AUTH_MODE=shared-token \
PALO_MCP_HTTP_TOKEN="$PALO_LOCAL_READER_TOKEN" \
PALO_READER_RUNTIME_MODE=evaluation \
PALO_MCP_HTTP_HOST=127.0.0.1 \
PALO_MCP_HTTP_PORT=8789 \
npm run palo:reader:http
```

In another terminal:

```sh
PALO_COPILOT_MODE=development \
PALO_COPILOT_PUBLIC_URL=http://127.0.0.1:8792 \
PALO_COPILOT_ALLOWED_ORIGINS=http://127.0.0.1:4178 \
PALO_COPILOT_READER_URL=http://127.0.0.1:8789/mcp \
PALO_COPILOT_READER_TOKEN="$PALO_LOCAL_READER_TOKEN" \
PALO_COPILOT_MODEL_PROVIDER=extractive \
PALO_COPILOT_DEV_PRINCIPAL_JSON='{"subject":"local-user","tenantId":"local-tenant","displayName":"Local reviewer"}' \
npm run palo:copilot
```

The extractive provider exists for deterministic local development only. Production admission requires PostgreSQL, OIDC with an exact tenant allowlist, Reader client credentials, proxy trust and the OpenAI model adapter with an explicit model.

## Verification

```sh
npm run validate:knowledge-copilot-live
npm audit
```

Deployment and live qualification are documented in `deploy/vps/palo-knowledge-copilot/README.md` and `docs/palo-knowledge-copilot-production.md`.
