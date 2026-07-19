#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: sh register-profile.sh CASE_ID /absolute/path/to/profile.json" >&2
  exit 64
fi

case_id="$1"
profile_file="$2"
token_file="secrets/gateway-token"

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

admin_url="${PALO_ADMIN_URL:-http://127.0.0.1:8787}"

if [ ! -f "$profile_file" ]; then
  echo "Profile not found: $profile_file" >&2
  exit 66
fi
if [ ! -f "$token_file" ]; then
  echo "Gateway token not found; run setup-secrets.sh first." >&2
  exit 66
fi

payload="$(mktemp)"
trap 'rm -f "$payload"' EXIT HUP INT TERM

python3 - "$case_id" "$profile_file" > "$payload" <<'PY'
import json
import sys

case_id, profile_path = sys.argv[1], sys.argv[2]
with open(profile_path, "r", encoding="utf-8") as handle:
    profile = json.load(handle)
json.dump({"caseId": case_id, "profile": profile}, sys.stdout, separators=(",", ":"))
PY

token="$(cat "$token_file")"
curl --fail --silent --show-error \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  --data-binary "@$payload" \
  "$admin_url/v1/agents/register"
printf '\n'
unset token
