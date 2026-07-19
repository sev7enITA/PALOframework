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

curl --fail --silent --show-error "https://${PALO_DOMAIN}/mcp-health"
printf '\n'

anonymous_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  "https://${PALO_DOMAIN}/mcp")"
test "$anonymous_status" = "401"

curl --fail --silent --show-error \
  -H "Authorization: Bearer $gateway_token" \
  "https://${PALO_DOMAIN}/gateway/v1/registry"
printf '\nOnline health, anonymous MCP rejection, and authenticated gateway checks passed.\n'
unset gateway_token
