#!/bin/sh
set -eu

if [ -n "${PALO_GATEWAY_TOKEN_FILE:-}" ]; then
  PALO_GATEWAY_TOKEN="$(cat "$PALO_GATEWAY_TOKEN_FILE")"
  export PALO_GATEWAY_TOKEN
fi

if [ -n "${PALO_MCP_HTTP_TOKEN_FILE:-}" ]; then
  PALO_MCP_HTTP_TOKEN="$(cat "$PALO_MCP_HTTP_TOKEN_FILE")"
  export PALO_MCP_HTTP_TOKEN
fi

if [ -n "${PALO_HMAC_KEYS_JSON_FILE:-}" ]; then
  PALO_HMAC_KEYS_JSON="$(cat "$PALO_HMAC_KEYS_JSON_FILE")"
  export PALO_HMAC_KEYS_JSON
fi

if [ "$(id -u)" = "0" ]; then
  exec setpriv --reuid=1000 --regid=1000 --init-groups "$@"
fi

exec "$@"
