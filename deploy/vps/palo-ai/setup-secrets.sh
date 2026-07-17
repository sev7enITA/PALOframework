#!/bin/sh
set -eu

umask 077
mkdir -p secrets

for file in secrets/gateway-token secrets/mcp-token secrets/hmac-keys.json; do
  if [ -e "$file" ]; then
    echo "Refusing to overwrite existing secret: $file" >&2
    exit 1
  fi
done

openssl rand -hex 32 > secrets/gateway-token
openssl rand -hex 32 > secrets/mcp-token
hmac_secret="$(openssl rand -hex 32)"
printf '{"key-support-2026":"%s"}\n' "$hmac_secret" > secrets/hmac-keys.json
unset hmac_secret
chmod 600 secrets/gateway-token secrets/mcp-token secrets/hmac-keys.json

echo "Generated three protected secret files. Values were not printed."
