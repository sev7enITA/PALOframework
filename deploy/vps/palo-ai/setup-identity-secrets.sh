#!/bin/sh
set -eu

umask 077
mkdir -p secrets

identity_secrets="
secrets/identity-admin-password
secrets/identity-db-password
secrets/reader-smoke-client-secret
secrets/curator-smoke-client-secret
"

for file in $identity_secrets; do
  if [ -e "$file" ]; then
    echo "Refusing to overwrite existing identity secret: $file" >&2
    exit 1
  fi
done

for file in $identity_secrets; do
  openssl rand -hex 32 > "$file"
  # File-backed Compose secrets retain host ownership. Keycloak runs as uid
  # 1000 in the root group, so group-read is required without making secrets
  # world-readable.
  chmod 640 "$file"
done

echo "Generated four protected identity secret files. Values were not printed."
