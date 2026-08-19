#!/usr/bin/env bash
#
# Cursor Cloud Agent start hook.
#
# Install (snapshot) is `npm ci` + Playwright Chromium.
# Start only reconciles .env.local — it does not install packages,
# start the Next server, or apply migrations.
#
# Modes (see scripts/cloud-agent-env.mjs):
#   BUILD-SAFE     — inert local Supabase URL, no service-role key
#   FULL-STACK DEV — complete dedicated DEV credential trio
#
# Production is never a silent fallback. Partial DEV sets fail closed.
set -euo pipefail

cd "$(dirname "$0")/.."

# Schema mutation is an operator action, never a Cloud boot side-effect.
if [[ "${HOMI_CLOUD_ALLOW_MIGRATIONS:-}" == "1" ]]; then
  echo "cloud-agent-env: refusing to honor HOMI_CLOUD_ALLOW_MIGRATIONS on start" >&2
  exit 1
fi

exec node scripts/cloud-agent-env.mjs
