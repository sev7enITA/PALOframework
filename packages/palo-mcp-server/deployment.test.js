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
});

test("palo-mcp retains only the capabilities required to drop privileges", async () => {
  const compose = await readFile("deploy/vps/palo-ai/compose.yaml", "utf8");
  const service = composeService(compose, "palo-mcp");
  assert.match(service, /cap_drop:\s*\[ALL\]/);
  assert.match(service, /cap_add:\s*\[SETUID, SETGID\]/);
  assert.match(service, /no-new-privileges:true/);
});
