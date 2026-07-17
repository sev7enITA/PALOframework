#!/bin/sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
env_file="$script_dir/.env"

if [ -f "$env_file" ]; then
  echo "Existing protected .env retained."
  exit 0
fi

umask 077
key="$(openssl rand -hex 32)"
printf 'N8N_ENCRYPTION_KEY=%s\n' "$key" > "$env_file"
unset key
chmod 0600 "$env_file"
echo "Protected local n8n encryption key created."
