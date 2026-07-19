ARG N8N_IMAGE=docker.n8n.io/n8nio/n8n:2.30.7
FROM ${N8N_IMAGE}

USER root

RUN mkdir -p /opt/palo-package \
    && chown node:node /opt/palo-package

COPY --chown=node:node packages/n8n-nodes-palo-ai/n8n-nodes-palo-ai-0.1.0.tgz /opt/palo-package/

USER node
