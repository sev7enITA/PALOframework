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
});

test("guide MCP has a separate authenticated route and least-privilege service", async () => {
  const [caddy, compose, hostCompose, nginx, dockerfile, setupSecrets, smoke] = await Promise.all([
    readFile("deploy/vps/palo-ai/Caddyfile", "utf8"),
    readFile("deploy/vps/palo-ai/compose.yaml", "utf8"),
    readFile("deploy/vps/palo-ai/compose.host-nginx.yaml", "utf8"),
    readFile("deploy/vps/palo-ai/nginx-governance.conf", "utf8"),
    readFile("deploy/vps/palo-ai/Dockerfile", "utf8"),
    readFile("deploy/vps/palo-ai/setup-secrets.sh", "utf8"),
    readFile("deploy/vps/palo-ai/smoke-online.sh", "utf8")
  ]);
  const expectedTools = "palo_explain_framework,palo_infer_governance_route,palo_plan_product_integration";
  for (const source of [compose, hostCompose]) {
    const service = composeService(source, "palo-guide-mcp");
    assert.match(service, new RegExp(`PALO_MCP_EXPOSED_TOOLS: ${expectedTools}`));
    assert.match(service, /PALO_MCP_HTTP_TOKEN_FILE: \/run\/secrets\/palo_guide_mcp_token/);
    assert.match(service, /cap_drop:\s*\[ALL\]/);
    assert.match(service, /no-new-privileges:true/);
    assert.doesNotMatch(service, /palo_verify_action_authority|palo_execute_governed_action|palo_request_approval/);
  }
  assert.match(caddy, /handle \/mcp-guide[\s\S]*?rewrite \* \/mcp[\s\S]*?reverse_proxy palo-guide-mcp:8789/);
  assert.match(nginx, /location = \/mcp-guide[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:18879\/mcp/);
  assert.match(dockerfile, /COPY --chown=node:node data \.\/data/);
  assert.match(setupSecrets, /secrets\/guide-mcp-token/);
  assert.match(smoke, /mcp-guide-health/);
  assert.match(smoke, /Authorization: Bearer \$guide_mcp_token/);
});

test("palo-mcp retains only the capabilities required to drop privileges", async () => {
  const compose = await readFile("deploy/vps/palo-ai/compose.yaml", "utf8");
  const service = composeService(compose, "palo-mcp");
  assert.match(service, /cap_drop:\s*\[ALL\]/);
  assert.match(service, /cap_add:\s*\[SETUID, SETGID\]/);
  assert.match(service, /no-new-privileges:true/);
});
