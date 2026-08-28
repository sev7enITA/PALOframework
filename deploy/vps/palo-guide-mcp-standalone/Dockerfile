FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS dependencies

WORKDIR /opt/palo

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY packages/palo-knowledge-reader-runtime/package.json ./package.json
RUN npm prune --omit=dev --ignore-scripts \
    && npm ls --omit=dev --all \
    && test ! -e node_modules/better-sqlite3 \
    && test ! -e node_modules/@opentelemetry/api/package.json \
    && npm cache clean --force

FROM gcr.io/distroless/nodejs22-debian13:nonroot@sha256:4e4fb0ce55fd73901600796ef079a9490369d2515d7da31633a91608c82ca13b

ENV NODE_ENV=production \
    PALO_READER_RUNTIME_MODE=production \
    PALO_KNOWLEDGE_WRITE_ENABLED=false \
    PALO_KNOWLEDGE_REVIEW_ENABLED=false \
    PALO_KNOWLEDGE_INCLUDE_CURATED_LOCAL=false

WORKDIR /opt/palo

COPY --from=dependencies /opt/palo/node_modules ./node_modules
COPY --chown=root:root packages/palo-knowledge-reader-runtime/package.json ./package.json
COPY --chown=root:root packages/palo-mcp-server/auth.js ./packages/palo-mcp-server/auth.js
COPY --chown=root:root packages/palo-mcp-server/guide-agent.js ./packages/palo-mcp-server/guide-agent.js
COPY --chown=root:root packages/palo-mcp-server/knowledge-catalog.js ./packages/palo-mcp-server/knowledge-catalog.js
COPY --chown=root:root packages/palo-mcp-server/knowledge-tools.js ./packages/palo-mcp-server/knowledge-tools.js
COPY --chown=root:root packages/palo-mcp-server/reader-http.js ./packages/palo-mcp-server/reader-http.js
COPY --chown=root:root packages/palo-mcp-server/reader-integrity.js ./packages/palo-mcp-server/reader-integrity.js
COPY --chown=root:root packages/palo-mcp-server/reader-knowledge-base.js ./packages/palo-mcp-server/reader-knowledge-base.js
COPY --chown=root:root packages/palo-mcp-server/reader-server.js ./packages/palo-mcp-server/reader-server.js
COPY --chown=root:root data/semantic-spine.json ./data/semantic-spine.json
COPY --chown=root:root data/decision-gates.json ./data/decision-gates.json
COPY --chown=root:root data/control-library.json ./data/control-library.json
COPY --chown=root:root data/kpi-kri-registry.json ./data/kpi-kri-registry.json
COPY --chown=root:root data/source-registry.json ./data/source-registry.json
COPY --chown=root:root data/governance-control-packs.json ./data/governance-control-packs.json
COPY --chown=root:root data/owasp-genai-2026-crosswalk.json ./data/owasp-genai-2026-crosswalk.json
COPY --chown=root:root data/knowledge-reader-release.json ./data/knowledge-reader-release.json

USER 65532:65532

EXPOSE 8789

CMD ["packages/palo-mcp-server/reader-http.js"]
