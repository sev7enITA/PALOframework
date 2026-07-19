FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PALO_DATA_DIR=/var/lib/palo

WORKDIR /opt/palo

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts=false && npm cache clean --force

COPY --chown=node:node packages/palo-mcp-server ./packages/palo-mcp-server
COPY --chown=node:node schemas ./schemas
COPY --chown=node:node examples/policy-as-code ./examples/policy-as-code
COPY --chown=root:root deploy/vps/palo-ai/docker-entrypoint.sh /usr/local/bin/palo-entrypoint

RUN chmod 0755 /usr/local/bin/palo-entrypoint \
    && mkdir -p /var/lib/palo \
    && chown node:node /var/lib/palo

EXPOSE 8787 8788

ENTRYPOINT ["/usr/local/bin/palo-entrypoint"]
CMD ["node", "packages/palo-mcp-server/http.js"]
