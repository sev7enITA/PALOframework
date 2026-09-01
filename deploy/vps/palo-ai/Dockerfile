FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PALO_DATA_DIR=/var/lib/palo

WORKDIR /opt/palo

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts=false && npm cache clean --force

COPY --chown=node:node packages/palo-mcp-server ./packages/palo-mcp-server
COPY --chown=node:node packages/palo-governance-control-plane ./packages/palo-governance-control-plane
COPY --chown=node:node governance-hub/src/governanceVerification.js ./governance-hub/src/governanceVerification.js
COPY --chown=node:node data ./data
COPY --chown=node:node schemas ./schemas
COPY --chown=node:node examples/policy-as-code ./examples/policy-as-code
COPY --chown=root:root deploy/vps/palo-ai/docker-entrypoint.sh /usr/local/bin/palo-entrypoint

RUN chmod 0755 /usr/local/bin/palo-entrypoint \
    && mkdir -p /var/lib/palo /var/lib/palo-guide /var/lib/palo-guide-curator /var/lib/palo-knowledge \
    && chown node:node /var/lib/palo /var/lib/palo-guide /var/lib/palo-guide-curator /var/lib/palo-knowledge

EXPOSE 8787 8788 8789 8790

ENTRYPOINT ["/usr/local/bin/palo-entrypoint"]
CMD ["node", "packages/palo-mcp-server/http.js"]
