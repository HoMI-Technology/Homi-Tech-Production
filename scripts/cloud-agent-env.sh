#!/usr/bin/env bash
#
# Cloud Agent per-boot env reconciliation.
#
# `.env.local` is gitignored (never checked out) and does not survive a fresh
# Cloud VM, yet Next.js always loads it and the Supabase client needs its vars
# to boot. This script (re)creates `.env.local` on every start so the dev
# server can always find them.
#
# Precedence: real secrets injected as VM env vars win; otherwise fall back to
# the browser-safe CI placeholder Supabase project (the same values used in
# .github/workflows/ci.yml), which is enough for typecheck/test/build, the dev
# server, and the anonymous assessment/scoring core flow. Every other
# integration (Stripe, Plaid, Anthropic, Resend, Sentry, Upstash, web-push)
# degrades gracefully when unset.
#
# Idempotent: safe to run on every boot. It only rewrites the four managed keys
# and leaves any hand-added `.env.local` lines untouched only when the file was
# authored by this script (identified by the marker on line 1). If a human
# created `.env.local` themselves, this script leaves it alone.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
MARKER="# managed-by: scripts/cloud-agent-env.sh"

# Respect a hand-authored .env.local (no marker) — never clobber real local work.
if [ -f "$ENV_FILE" ] && ! head -n 1 "$ENV_FILE" | grep -qF "$MARKER"; then
  echo "cloud-agent-env: existing hand-authored $ENV_FILE detected — leaving it untouched."
  exit 0
fi

# Browser-safe CI placeholder Supabase project (publishable values, mirror ci.yml).
CI_SUPABASE_URL="https://giyycykxkzfbowiapxpd.supabase.co"
CI_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpeXljeWt4a3pmYm93aWFweHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODM0NzAsImV4cCI6MjA5NDM1OTQ3MH0.e6bHDRPWZ4aXTkebkG9AmfniE5payNHGul4d8himOj0"

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-$CI_SUPABASE_URL}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$CI_SUPABASE_ANON_KEY}"
# A non-empty service-role value is enough for build/dev; keep a clearly-fake
# placeholder unless a real one is injected (real DB persistence needs the real key).
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-placeholder-service-role-key-not-a-real-secret}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}"

{
  echo "$MARKER"
  echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
  echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
  echo "NEXT_PUBLIC_SITE_URL=$SITE_URL"
} > "$ENV_FILE"

if [ "$SUPABASE_URL" = "$CI_SUPABASE_URL" ]; then
  echo "cloud-agent-env: wrote $ENV_FILE using CI placeholder Supabase values."
else
  echo "cloud-agent-env: wrote $ENV_FILE using injected Supabase secrets."
fi
