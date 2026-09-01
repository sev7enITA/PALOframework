#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Missing .env" >&2
  exit 66
fi

set -a
. ./.env
set +a

gateway_token="$(cat secrets/gateway-token)"
reader_client_secret="$(cat secrets/reader-smoke-client-secret)"
curator_client_secret="$(cat secrets/curator-smoke-client-secret)"

client_credentials_token() {
  client_id="$1"
  client_secret="$2"
  encoded_scope="$3"
  encoded_resource="$4"
  token_response="$(printf 'grant_type=client_credentials&client_id=%s&client_secret=%s&scope=%s&resource=%s' \
    "$client_id" "$client_secret" "$encoded_scope" "$encoded_resource" | \
    curl --fail --silent --show-error \
      -H 'Content-Type: application/x-www-form-urlencoded' \
      --data-binary @- \
      "https://${PALO_DOMAIN}/identity/realms/palo/protocol/openid-connect/token")"
  printf '%s' "$token_response" | node -e '
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => {
      const parsed = JSON.parse(body);
      if (typeof parsed.access_token !== "string" || parsed.access_token.length < 100) process.exit(1);
      process.stdout.write(parsed.access_token);
    });
  '
  unset client_id client_secret encoded_scope encoded_resource token_response
}

guide_mcp_token="$(client_credentials_token \
  palo-reader-smoke \
  "$reader_client_secret" \
  'palo%3Aguide%20palo%3Aknowledge%3Aread' \
  "https%3A%2F%2F${PALO_DOMAIN}%2Fmcp-guide")"
guide_curator_mcp_token="$(client_credentials_token \
  palo-curator-smoke \
  "$curator_client_secret" \
  'palo%3Aguide%20palo%3Aknowledge%3Aread%20palo%3Aknowledge%3Awrite%20palo%3Aknowledge%3Areview' \
  "https%3A%2F%2F${PALO_DOMAIN}%2Fmcp-guide-curator")"

assert_tool_catalog() {
  endpoint="$1"
  token="$2"
  expected_count="$3"
  expected_tools="$4"
  catalog="$(curl --fail --silent --show-error \
    -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -H "Authorization: Bearer $token" \
    --data '{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}' \
    "https://${PALO_DOMAIN}${endpoint}")"
  printf '%s' "$catalog" | EXPECTED_COUNT="$expected_count" EXPECTED_TOOLS="$expected_tools" ENDPOINT="$endpoint" node -e '
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => {
      const dataLine = body.split(/\r?\n/).find((line) => line.startsWith("data: "));
      const payload = JSON.parse(dataLine ? dataLine.slice(6) : body);
      const names = (payload.result?.tools || []).map((tool) => tool.name);
      const expected = process.env.EXPECTED_TOOLS.split(/\s+/).filter(Boolean);
      if (names.length !== Number(process.env.EXPECTED_COUNT)) throw new Error(`${process.env.ENDPOINT}: expected ${process.env.EXPECTED_COUNT} tools, received ${names.length}`);
      for (const name of expected) if (!names.includes(name)) throw new Error(`${process.env.ENDPOINT}: missing ${name}`);
      for (const forbidden of ["palo_execute_governed_action", "palo_request_approval", "palo_resolve_incident"]) {
        if (names.includes(forbidden)) throw new Error(`${process.env.ENDPOINT}: operational tool leaked: ${forbidden}`);
      }
      process.stdout.write(`${process.env.ENDPOINT}: PASS (${names.length} tools)\n`);
    });
  '
  unset endpoint token expected_count expected_tools catalog
}

assert_browser_probe() {
  endpoint="$1"
  headers="$(curl --fail --silent --show-error --dump-header - --output /dev/null \
    -H 'Origin: https://sev7enita.github.io' \
    "https://${PALO_DOMAIN}${endpoint}")"
  printf '%s' "$headers" | grep -i -F 'access-control-allow-origin: https://sev7enita.github.io' > /dev/null
  printf '%s\n' "$endpoint: PASS (browser probe allowed)"
  unset endpoint headers
}

curl --fail --silent --show-error "https://${PALO_DOMAIN}/mcp-health"
printf '\n'

anonymous_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  "https://${PALO_DOMAIN}/mcp")"
test "$anonymous_status" = "401"

curl --fail --silent --show-error "https://${PALO_DOMAIN}/mcp-guide-health"
printf '\n'
assert_browser_probe "/mcp-guide-health"

curl --fail --silent --show-error "https://${PALO_DOMAIN}/.well-known/oauth-protected-resource/mcp-guide" | \
  grep -F "https://${PALO_DOMAIN}/identity/realms/palo" > /dev/null
assert_browser_probe "/.well-known/oauth-protected-resource/mcp-guide"

guide_anonymous_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  "https://${PALO_DOMAIN}/mcp-guide")"
test "$guide_anonymous_status" = "401"

guide_initialize="$(curl --fail --silent --show-error \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $guide_mcp_token" \
  --data '{"jsonrpc":"2.0","id":2,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"palo-online-smoke","version":"1.0.0"}}}' \
  "https://${PALO_DOMAIN}/mcp-guide")"
printf '%s' "$guide_initialize" | grep -F 'serverInfo' > /dev/null
assert_tool_catalog "/mcp-guide" "$guide_mcp_token" 6 "palo_explain_framework palo_infer_governance_route palo_plan_product_integration palo_list_knowledge_sources palo_search_knowledge palo_get_knowledge_record"
assert_tool_catalog "/mcp-guide/mcp" "$guide_mcp_token" 6 "palo_explain_framework palo_infer_governance_route palo_plan_product_integration palo_list_knowledge_sources palo_search_knowledge palo_get_knowledge_record"

curl --fail --silent --show-error "https://${PALO_DOMAIN}/mcp-guide-curator-health"
printf '\n'
assert_browser_probe "/mcp-guide-curator-health"

curl --fail --silent --show-error "https://${PALO_DOMAIN}/.well-known/oauth-protected-resource/mcp-guide-curator" | \
  grep -F "https://${PALO_DOMAIN}/identity/realms/palo" > /dev/null
assert_browser_probe "/.well-known/oauth-protected-resource/mcp-guide-curator"

curator_anonymous_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  "https://${PALO_DOMAIN}/mcp-guide-curator")"
test "$curator_anonymous_status" = "401"

curator_initialize="$(curl --fail --silent --show-error \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $guide_curator_mcp_token" \
  --data '{"jsonrpc":"2.0","id":4,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"palo-online-smoke","version":"1.0.0"}}}' \
  "https://${PALO_DOMAIN}/mcp-guide-curator")"
printf '%s' "$curator_initialize" | grep -F 'serverInfo' > /dev/null
assert_tool_catalog "/mcp-guide-curator" "$guide_curator_mcp_token" 10 "palo_explain_framework palo_infer_governance_route palo_plan_product_integration palo_list_knowledge_sources palo_search_knowledge palo_get_knowledge_record palo_submit_knowledge_draft palo_list_knowledge_drafts palo_get_knowledge_draft palo_review_knowledge_draft"
assert_tool_catalog "/mcp-guide-curator/mcp" "$guide_curator_mcp_token" 10 "palo_explain_framework palo_infer_governance_route palo_plan_product_integration palo_list_knowledge_sources palo_search_knowledge palo_get_knowledge_record palo_submit_knowledge_draft palo_list_knowledge_drafts palo_get_knowledge_draft palo_review_knowledge_draft"

curl --fail --silent --show-error \
  -H "Authorization: Bearer $gateway_token" \
  "https://${PALO_DOMAIN}/gateway/v1/registry"

if [ "${PALO_HUB_ENABLED:-false}" = "true" ]; then
  hub_health="$(curl --fail --silent --show-error "https://${PALO_DOMAIN}/control-plane/health")"
  printf '%s' "$hub_health" | grep -F '"service":"palo-governance-hub-control-plane"' > /dev/null
  printf '%s' "$hub_health" | grep -F '"schemaCurrent":true' > /dev/null
  printf '%s' "$hub_health" | grep -F '"productionUse":false' > /dev/null
  curl --fail --silent --show-error "https://${PALO_DOMAIN}/hub/" | grep -F '<div id="root"></div>' > /dev/null
  printf '\nGovernance Hub UI and control-plane health passed; independent production assurance was not inferred.\n'
  unset hub_health
fi
printf '\nOnline operational, Reader MCP, Curator MCP, authentication, catalog, and gateway checks passed.\n'
unset gateway_token reader_client_secret curator_client_secret guide_mcp_token guide_curator_mcp_token guide_initialize curator_initialize curator_anonymous_status guide_anonymous_status anonymous_status
