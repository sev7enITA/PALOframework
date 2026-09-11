FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS dependencies

WORKDIR /opt/palo

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY packages/palo-knowledge-copilot-runtime/package.json ./package.json
RUN npm prune --omit=dev --ignore-scripts \
    && npm ls --omit=dev --all \
    && test ! -e node_modules/better-sqlite3 \
    && test ! -e node_modules/@modelcontextprotocol/server \
    && test ! -e node_modules/@modelcontextprotocol/hono \
    && npm cache clean --force

FROM gcr.io/distroless/nodejs22-debian13:nonroot@sha256:4e4fb0ce55fd73901600796ef079a9490369d2515d7da31633a91608c82ca13b

ENV NODE_ENV=production \
    PALO_COPILOT_MODE=production \
    PALO_COPILOT_HOST=0.0.0.0 \
    PALO_COPILOT_PORT=8792 \
    PALO_COPILOT_TRUST_PROXY=true

WORKDIR /opt/palo

COPY --from=dependencies /opt/palo/node_modules ./node_modules
COPY --chown=root:root packages/palo-knowledge-copilot-runtime/package.json ./package.json
COPY --chown=root:root packages/palo-knowledge-copilot/*.js ./packages/palo-knowledge-copilot/
COPY --chown=root:root packages/palo-mcp-server/knowledge-tools.js ./packages/palo-mcp-server/knowledge-tools.js

USER 65532:65532

EXPOSE 8792

CMD ["packages/palo-knowledge-copilot/index.js"]
