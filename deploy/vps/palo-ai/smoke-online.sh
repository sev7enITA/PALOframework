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
guide_mcp_token="$(cat secrets/guide-mcp-token)"

curl --fail --silent --show-error "https://${PALO_DOMAIN}/mcp-health"
printf '\n'

anonymous_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  "https://${PALO_DOMAIN}/mcp")"
test "$anonymous_status" = "401"

curl --fail --silent --show-error "https://${PALO_DOMAIN}/mcp-guide-health"
printf '\n'

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

curl --fail --silent --show-error \
  -H "Authorization: Bearer $gateway_token" \
  "https://${PALO_DOMAIN}/gateway/v1/registry"
printf '\nOnline operational and guide MCP health, authentication, and gateway checks passed.\n'
unset gateway_token guide_mcp_token guide_initialize
