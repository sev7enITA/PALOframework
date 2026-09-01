import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

function namedBlock(content, name) {
  const start = content.indexOf(name);
  assert.notEqual(start, -1, `${name} block must exist`);
  const open = content.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < content.length; index += 1) {
    if (content[index] === "{") depth += 1;
    if (content[index] === "}") depth -= 1;
    if (depth === 0) return content.slice(open + 1, index);
  }
  assert.fail(`${name} block must be balanced`);
}

function composeService(content, serviceName) {
  const match = content.match(new RegExp(`^  ${serviceName}:\\n([\\s\\S]*?)(?=^  [a-z][a-z0-9-]*:|^secrets:)`, "m"));
  assert.ok(match, `${serviceName} service must exist`);
  return match[1];
}

test("public Caddy routes do not expose approval enumeration", async () => {
  const caddy = await readFile("deploy/vps/palo-ai/Caddyfile", "utf8");
  const publicGateway = namedBlock(caddy, "@publicGateway");
  const blockedGateway = namedBlock(caddy, "@blockedGateway");
  const publicPaths = publicGateway.match(/\/gateway\/[^\s]+/g) || [];
  const blockedPaths = blockedGateway.match(/\/gateway\/[^\s]+/g) || [];
  assert.ok(publicPaths.includes("/gateway/v1/approvals/*"), "individual approval status reads remain reachable");
  assert.ok(!publicPaths.includes("/gateway/v1/approvals"), "approval enumeration must not be public");
  assert.ok(blockedPaths.includes("/gateway/v1/approvals"), "approval enumeration is explicitly rejected");
  assert.ok(publicPaths.includes("/gateway/v1/actions/execute"), "governed execution remains reachable through the authenticated gateway");
  assert.ok(publicPaths.includes("/gateway/v1/executions/*"), "individual execution status remains reachable");
  assert.ok(!publicPaths.includes("/gateway/v1/incidents"), "incident enumeration must not be public");
  assert.ok(blockedPaths.includes("/gateway/v1/incidents"), "incident enumeration is explicitly rejected");
  assert.ok(blockedPaths.includes("/gateway/v1/incidents/resolve"), "incident mutation is not exposed by the public reverse proxy");
  assert.ok(blockedPaths.includes("/gateway/v1/tasks"), "task enumeration is not exposed by the public reverse proxy");
  assert.ok(blockedPaths.includes("/gateway/v1/tasks/*"), "task inspection and processing are not exposed by the public reverse proxy");
  assert.ok(blockedPaths.includes("/gateway/v1/operations/*"), "operational snapshots are not exposed by the public reverse proxy");
});

test("knowledge Reader and Curator MCP profiles have separate authenticated least-privilege routes", async () => {
  const [
    caddy,
    compose,
    hostCompose,
    nginx,
    readerEdgeNginx,
    standaloneNginx,
    standaloneNginxExample,
    dockerfile,
    readerDockerfile,
    identityContainerfile,
    identityRealm,
    setupSecrets,
    setupIdentitySecrets,
    smoke
  ] = await Promise.all([
    readFile("deploy/vps/palo-ai/Caddyfile", "utf8"),
    readFile("deploy/vps/palo-ai/compose.yaml", "utf8"),
    readFile("deploy/vps/palo-ai/compose.host-nginx.yaml", "utf8"),
    readFile("deploy/vps/palo-ai/nginx-governance.conf", "utf8"),
    readFile("deploy/vps/palo-ai/nginx-reader-edge.conf", "utf8"),
    readFile("deploy/vps/palo-guide-mcp-standalone/nginx-server-locations.conf", "utf8"),
    readFile("deploy/vps/palo-guide-mcp-standalone/nginx-new-subdomain.conf.example", "utf8"),
    readFile("deploy/vps/palo-ai/Dockerfile", "utf8"),
    readFile("deploy/vps/palo-ai/Dockerfile.reader", "utf8"),
    readFile("deploy/vps/palo-ai/Containerfile.identity", "utf8"),
    readFile("deploy/vps/palo-ai/identity/palo-realm.json", "utf8"),
    readFile("deploy/vps/palo-ai/setup-secrets.sh", "utf8"),
    readFile("deploy/vps/palo-ai/setup-identity-secrets.sh", "utf8"),
    readFile("deploy/vps/palo-ai/smoke-online.sh", "utf8")
  ]);
  const readerTools = "palo_explain_framework,palo_infer_governance_route,palo_plan_product_integration,palo_list_knowledge_sources,palo_search_knowledge,palo_get_knowledge_record";
  const curatorTools = `${readerTools},palo_submit_knowledge_draft,palo_list_knowledge_drafts,palo_get_knowledge_draft,palo_review_knowledge_draft`;
  for (const source of [compose, hostCompose]) {
    const reader = composeService(source, "palo-guide-mcp");
    const curator = composeService(source, "palo-guide-curator-mcp");
    assert.match(reader, /dockerfile: deploy\/vps\/palo-ai\/Dockerfile\.reader/);
    assert.match(reader, /packages\/palo-mcp-server\/reader-http\.js/);
    assert.match(reader, /PALO_READER_RUNTIME_MODE: production/);
    assert.match(reader, /PALO_MCP_ALLOWED_ORIGINS:/);
    assert.match(reader, /PALO_AUTH_MODE: oidc/);
    assert.match(reader, /PALO_KNOWLEDGE_WRITE_ENABLED: "false"/);
    assert.match(reader, /PALO_KNOWLEDGE_REVIEW_ENABLED: "false"/);
    assert.match(reader, /PALO_KNOWLEDGE_INCLUDE_CURATED_LOCAL: "false"/);
    assert.match(reader, /PALO_READER_MAX_BODY_BYTES: 65536/);
    assert.match(reader, /PALO_READER_MAX_CONCURRENCY:/);
    assert.match(reader, /PALO_READER_MAX_CONCURRENCY_PER_CLIENT:/);
    assert.match(reader, /mem_limit: 384m/);
    assert.match(reader, /cpus: 1\.0/);
    assert.match(reader, /pids_limit: 128/);
    assert.match(reader, /PALO_MCP_PUBLIC_URL: https:\/\/\$\{PALO_DOMAIN\}\/mcp-guide/);
    assert.match(reader, /PALO_OIDC_AUDIENCE: https:\/\/\$\{PALO_DOMAIN\}\/mcp-guide/);
    assert.match(reader, /PALO_OIDC_TOKEN_TYPE:/);
    assert.match(reader, /PALO_OIDC_ALLOWED_CLIENT_IDS:/);
    assert.match(reader, /PALO_OIDC_ALLOWED_TENANTS:/);
    assert.match(reader, /PALO_OIDC_ISSUER: https:\/\/\$\{PALO_DOMAIN\}\/identity\/realms\/palo/);
    assert.match(reader, /PALO_OIDC_JWKS_URI: https:\/\/\$\{PALO_DOMAIN\}\/identity\/realms\/palo\/protocol\/openid-connect\/certs/);
    assert.doesNotMatch(reader, /PALO_MCP_EXPOSED_TOOLS|PALO_MCP_HTTP_TOKEN_FILE|secrets:|volumes:|PALO_DATA_DIR|PALO_KNOWLEDGE_DIR|cap_add/);
    assert.match(curator, new RegExp(`PALO_MCP_EXPOSED_TOOLS: ${curatorTools}`));
    assert.match(curator, /PALO_KNOWLEDGE_WRITE_ENABLED: "true"/);
    assert.match(curator, /PALO_KNOWLEDGE_REVIEW_ENABLED: "true"/);
    assert.match(curator, /PALO_KNOWLEDGE_REQUIRE_REVIEWER_SEPARATION: "true"/);
    assert.match(curator, /PALO_AUTH_MODE: oidc/);
    assert.match(curator, /PALO_MCP_ALLOWED_ORIGINS:/);
    assert.match(curator, /PALO_MCP_PUBLIC_URL: https:\/\/\$\{PALO_DOMAIN\}\/mcp-guide-curator/);
    assert.match(curator, /PALO_OIDC_AUDIENCE: https:\/\/\$\{PALO_DOMAIN\}\/mcp-guide-curator/);
    assert.match(curator, /PALO_OIDC_ISSUER: https:\/\/\$\{PALO_DOMAIN\}\/identity\/realms\/palo/);
    assert.match(curator, /PALO_OIDC_ALLOWED_CLIENT_IDS: \$\{PALO_CURATOR_OIDC_ALLOWED_CLIENT_IDS:-palo-curator-smoke\}/);
    assert.match(curator, /PALO_OIDC_ALLOWED_TENANTS: \$\{PALO_OIDC_ALLOWED_TENANTS:-palo\}/);
    assert.doesNotMatch(curator, /PALO_MCP_HTTP_TOKEN_FILE|palo_guide_curator_mcp_token/);
    for (const service of [reader, curator]) {
      assert.match(service, /cap_drop:\s*\[ALL\]/);
      assert.match(service, /no-new-privileges:true/);
      assert.doesNotMatch(service, /palo_verify_action_authority|palo_execute_governed_action|palo_request_approval/);
    }
  }
  assert.match(caddy, /handle \/mcp-guide[\s\S]*?rewrite \* \/mcp[\s\S]*?reverse_proxy palo-guide-edge:8080/);
  assert.match(caddy, /handle \/mcp-guide\/mcp[\s\S]*?rewrite \* \/mcp[\s\S]*?reverse_proxy palo-guide-edge:8080/);
  assert.match(caddy, /handle \/\.well-known\/oauth-protected-resource\/mcp[\s\S]*?reverse_proxy palo-mcp:8788/);
  assert.match(caddy, /handle \/\.well-known\/oauth-protected-resource\/mcp-guide[\s\S]*?reverse_proxy palo-guide-edge:8080/);
  assert.match(caddy, /reverse_proxy palo-guide-edge:8080[\s\S]*?dial_timeout 5s[\s\S]*?response_header_timeout 30s[\s\S]*?read_timeout 30s[\s\S]*?write_timeout 30s/);
  assert.match(caddy, /handle \/mcp-guide-curator[\s\S]*?rewrite \* \/mcp[\s\S]*?reverse_proxy palo-guide-curator-mcp:8790/);
  assert.match(caddy, /handle \/mcp-guide-curator\/mcp[\s\S]*?rewrite \* \/mcp[\s\S]*?reverse_proxy palo-guide-curator-mcp:8790/);
  assert.match(caddy, /handle \/\.well-known\/oauth-protected-resource\/mcp-guide-curator[\s\S]*?reverse_proxy palo-guide-curator-mcp:8790/);
  assert.match(caddy, /handle \/identity\/realms\/palo\/\*[\s\S]*?reverse_proxy palo-identity:8080/);
  assert.match(caddy, /handle \/identity\/admin\/\*[\s\S]*?respond "Not found" 404/);
  assert.match(nginx, /location = \/mcp-guide[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18879\/mcp/);
  assert.match(nginx, /location = \/mcp-guide\/mcp[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18879\/mcp/);
  assert.match(nginx, /location = \/\.well-known\/oauth-protected-resource\/mcp[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18878/);
  assert.match(nginx, /location = \/\.well-known\/oauth-protected-resource\/mcp-guide[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18879/);
  assert.match(nginx, /location = \/mcp-guide-curator[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18882\/mcp/);
  assert.match(nginx, /location = \/mcp-guide-curator\/mcp[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18882\/mcp/);
  assert.match(nginx, /location = \/\.well-known\/oauth-protected-resource\/mcp-guide-curator[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18882/);
  assert.match(nginx, /location \^~ \/identity\/realms\/palo\/[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18883/);
  assert.match(nginx, /location \^~ \/identity\/admin\/[\s\S]*?return 404/);
  assert.match(nginx, /location = \/mcp-guide-health[\s\S]*?Access-Control-Allow-Origin "https:\/\/sev7enita\.github\.io"/);
  assert.match(nginx, /location = \/mcp-guide-curator-health[\s\S]*?Access-Control-Allow-Origin "https:\/\/sev7enita\.github\.io"/);
  assert.match(nginx, /listen 443 ssl/);
  assert.match(nginx, /ssl_certificate \/etc\/letsencrypt\/live\/governance\.paloframework\.org\/fullchain\.pem/);
  assert.match(nginx, /listen 80[\s\S]*?return 301 https:\/\/\$host\$request_uri/);
  assert.match(nginx, /limit_req_zone \$binary_remote_addr zone=palo_reader_mcp:10m rate=60r\/m/);
  assert.match(nginx, /location = \/mcp-guide[\s\S]*?client_max_body_size 64k[\s\S]*?proxy_read_timeout 30s/);
  assert.match(readerEdgeNginx, /limit_req_zone \$binary_remote_addr zone=palo_reader_edge:1m rate=60r\/m/);
  assert.match(readerEdgeNginx, /limit_req zone=palo_reader_edge burst=20 nodelay/);
  assert.match(readerEdgeNginx, /client_max_body_size 64k/);
  assert.match(readerEdgeNginx, /proxy_connect_timeout 5s/);
  assert.match(readerEdgeNginx, /proxy_read_timeout 30s/);
  assert.match(readerEdgeNginx, /proxy_send_timeout 30s/);
  for (const source of [standaloneNginx, standaloneNginxExample]) {
    assert.match(source, /location = \/mcp-guide\/mcp[\s\S]*?limit_req zone=palo_guide_mcp[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18879\/mcp/);
  }
  const readerEdge = composeService(compose, "palo-guide-edge");
  assert.match(readerEdge, /user: "101:101"/);
  assert.match(readerEdge, /read_only: true/);
  assert.match(readerEdge, /cap_drop: \[ALL\]/);
  assert.match(readerEdge, /no-new-privileges:true/);
  assert.match(readerEdge, /nginx-reader-edge\.conf:\/etc\/nginx\/nginx\.conf:ro/);
  const caddyReader = composeService(compose, "palo-guide-mcp");
  assert.match(caddyReader, /networks: \[reader_edge, reader_egress\]/);
  assert.doesNotMatch(caddyReader, /networks: \[[^\]]*backend/);
  const hostReader = composeService(hostCompose, "palo-guide-mcp");
  assert.match(hostReader, /networks: \[reader_egress\]/);
  assert.doesNotMatch(hostReader, /networks: \[[^\]]*(?:backend|host_access)/);
  const identity = composeService(compose, "palo-identity");
  const hostIdentity = composeService(hostCompose, "palo-identity");
  assert.match(identity, /GET \/identity\/health\/ready/);
  assert.match(hostIdentity, /networks: \[identity_db, host_access\]/);
  assert.match(hostIdentity, /GET \/identity\/health\/ready/);
  assert.match(nginx, /location = \/identity-health[\s\S]*?19000\/identity\/health\/ready/);
  assert.match(caddy, /handle \/identity-health[\s\S]*?rewrite \* \/identity\/health\/ready/);
  assert.match(dockerfile, /COPY --chown=node:node data \.\/data/);
  assert.match(dockerfile, /mkdir -p[^\n]*\/var\/lib\/palo-guide-curator[^\n]*\/var\/lib\/palo-knowledge/);
  assert.match(dockerfile, /chown node:node[^\n]*\/var\/lib\/palo-guide-curator[^\n]*\/var\/lib\/palo-knowledge/);
  assert.match(readerDockerfile, /FROM gcr\.io\/distroless\/nodejs22-debian13:nonroot@sha256:[a-f0-9]{64}/);
  assert.match(readerDockerfile, /USER 65532:65532/);
  assert.match(readerDockerfile, /CMD \["packages\/palo-mcp-server\/reader-http\.js"\]/);
  assert.match(readerDockerfile, /packages\/palo-mcp-server\/reader-http\.js/);
  assert.match(readerDockerfile, /data\/knowledge-reader-release\.json/);
  assert.match(readerDockerfile, /test ! -e node_modules\/better-sqlite3/);
  assert.doesNotMatch(readerDockerfile, /core\.js|schemas|policy-as-code|docker-entrypoint/);
  assert.doesNotMatch(readerDockerfile, /palo-mcp-server\/knowledge-base\.js/);
  assert.doesNotMatch(setupSecrets, /secrets\/guide-(?:mcp|curator-mcp)-token/);
  for (const secretName of ["identity-admin-password", "identity-db-password", "reader-smoke-client-secret", "curator-smoke-client-secret"]) {
    assert.match(setupIdentitySecrets, new RegExp(`secrets/${secretName}`));
  }
  assert.match(identityContainerfile, /quay\.io\/keycloak\/keycloak:26\.7\.2/);
  assert.match(identityContainerfile, /KC_HEALTH_ENABLED=true/);
  assert.match(identityContainerfile, /KC_FEATURES=cimd/);
  const realm = JSON.parse(identityRealm);
  assert.equal(realm.realm, "palo");
  assert.equal(realm.sslRequired, "external");
  assert.equal(realm.bruteForceProtected, true);
  assert.deepEqual(realm.clientScopes.map((scope) => scope.name), [
    "palo:guide",
    "palo:knowledge:read",
    "palo:knowledge:write",
    "palo:knowledge:review"
  ]);
  const readerSmoke = realm.clients.find((client) => client.clientId === "palo-reader-smoke");
  const curatorSmoke = realm.clients.find((client) => client.clientId === "palo-curator-smoke");
  assert.deepEqual(readerSmoke.defaultClientScopes, ["palo:guide", "palo:knowledge:read"]);
  assert.deepEqual(curatorSmoke.defaultClientScopes, ["palo:guide", "palo:knowledge:read", "palo:knowledge:write", "palo:knowledge:review"]);
  assert.match(JSON.stringify(readerSmoke.protocolMappers), /https:\/\/\$\{PALO_DOMAIN\}\/mcp-guide/);
  assert.match(JSON.stringify(curatorSmoke.protocolMappers), /https:\/\/\$\{PALO_DOMAIN\}\/mcp-guide-curator/);
  assert.match(smoke, /mcp-guide-health/);
  assert.match(smoke, /mcp-guide-curator-health/);
  assert.match(smoke, /client_credentials_token/);
  assert.match(smoke, /palo-reader-smoke/);
  assert.match(smoke, /palo-curator-smoke/);
  assert.doesNotMatch(smoke, /PALO_READER_TEST_ACCESS_TOKEN/);
  assert.match(smoke, /Authorization: Bearer \$guide_curator_mcp_token/);
  assert.match(smoke, /assert_tool_catalog "\/mcp-guide"[^\n]* 6/);
  assert.match(smoke, /assert_tool_catalog "\/mcp-guide\/mcp"[^\n]* 6/);
  assert.match(smoke, /assert_tool_catalog "\/mcp-guide-curator"[^\n]* 10/);
  assert.match(smoke, /assert_tool_catalog "\/mcp-guide-curator\/mcp"[^\n]* 10/);
});

test("palo-mcp retains only the capabilities required to drop privileges", async () => {
  const compose = await readFile("deploy/vps/palo-ai/compose.yaml", "utf8");
  const service = composeService(compose, "palo-mcp");
  assert.match(service, /cap_drop:\s*\[ALL\]/);
  assert.match(service, /cap_add:\s*\[SETUID, SETGID\]/);
  assert.match(service, /no-new-privileges:true/);
});
