#!/usr/bin/env bash
# homi-agent.sh — one CLI writer per HōMI working copy.
#
# The problem this solves: grok, claude, and codex are all installed. That is
# not three owners of this tree. Cursor also counts as a writer.
#
# Usage:
#   ./scripts/homi-agent.sh status
#   ./scripts/homi-agent.sh take grok|claude|codex|cursor
#   ./scripts/homi-agent.sh drop
#   ./scripts/homi-agent.sh exec claude -- <args...>   # take, run, drop on exit
#
# `take` fast-forwards from GitHub once (start of this build). `drop` does not
# pull again. Push as you build with ./scripts/homi-ssot.sh push. Skip pull:
# HOMI_SSOT_SKIP=1. Lease lives in .git/homi-agent.lease (not committed).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: not a git repository ($REPO_ROOT)" >&2
  exit 1
fi

GIT_DIR="$(git rev-parse --git-dir)"
LEASE_FILE="$GIT_DIR/homi-agent.lease"
HOST="$(hostname -s 2>/dev/null || hostname)"
NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

valid_lane() {
  case "$1" in
    grok|claude|codex|cursor) return 0 ;;
    *) return 1 ;;
  esac
}

lane_bin() {
  case "$1" in
    grok) command -v grok ;;
    claude) command -v claude ;;
    codex) command -v codex ;;
    cursor) command -v cursor || echo "Cursor.app" ;;
  esac
}

read_lease() {
  if [[ -f "$LEASE_FILE" ]]; then
    cat "$LEASE_FILE"
  fi
}

lease_lane() {
  awk -F= '/^lane=/{print $2}' "$LEASE_FILE" 2>/dev/null || true
}

lease_pid() {
  awk -F= '/^pid=/{print $2}' "$LEASE_FILE" 2>/dev/null || true
}

lease_live() {
  [[ -f "$LEASE_FILE" ]] || return 1
  local pid
  pid="$(lease_pid)"
  # pid=0 means a human session lease (take) — valid until drop.
  if [[ -z "$pid" || "$pid" == "0" ]]; then
    return 0
  fi
  if kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  echo "warning: lease pid $pid is dead — stale lease, run: $0 drop" >&2
  return 1
}

cmd_status() {
  echo "repo:    $REPO_ROOT"
  echo "branch:  $BRANCH"
  echo "host:    $HOST"
  echo "lanes:   grok=$(command -v grok || echo missing)  claude=$(command -v claude || echo missing)  codex=$(command -v codex || echo missing)"
  if [[ -f "$LEASE_FILE" ]]; then
    echo "lease:"
    sed 's/^/         /' "$LEASE_FILE"
    if ! lease_live; then
      echo "         (could not confirm pid)"
    fi
  else
    echo "lease:   none — this tree is free. take a lane before a CLI writes."
  fi
}

ssot_on_take() {
  # One GitHub ff-only pull when a build starts. Nothing else pulls.
  [[ -n "${HOMI_SSOT_SKIP:-}" ]] && return 0
  local ssot="$SCRIPT_DIR/homi-ssot.sh"
  if [[ ! -x "$ssot" ]]; then
    echo "warning: $ssot missing — clone may be behind GitHub" >&2
    return 0
  fi
  echo "ssot:    fetching GitHub once (start of this build)…"
  "$ssot" sync
}

cmd_take() {
  local lane="${1:-}"
  if ! valid_lane "$lane"; then
    echo "error: lane must be grok|claude|codex|cursor" >&2
    exit 2
  fi
  if [[ -f "$LEASE_FILE" ]]; then
    local held
    held="$(lease_lane)"
    if [[ "$held" == "$lane" ]]; then
      echo "lease already held by $lane on $BRANCH (no second GitHub pull)"
      cmd_status
      return 0
    fi
    echo "error: this tree is leased to '$held'." >&2
    echo "       drop it, or use a git worktree under ~/Desktop/homi-worktrees/" >&2
    echo "       held lease:" >&2
    sed 's/^/       /' "$LEASE_FILE" >&2
    exit 1
  fi
  local bin
  bin="$(lane_bin "$lane")"
  if [[ -z "$bin" ]]; then
    echo "error: $lane is not on PATH" >&2
    exit 1
  fi
  write_lease "$lane" "$bin" "${LEASE_PID:-0}"
  echo "lease taken: $lane on $BRANCH (session — drop when done)"
  if ! ssot_on_take; then
    echo "error: GitHub sync failed — dropping lease. Reconcile, then take again." >&2
    rm -f "$LEASE_FILE"
    exit 1
  fi
}

write_lease() {
  local lane="$1" bin="$2" pid="${3:-0}"
  umask 077
  cat >"$LEASE_FILE" <<EOF
lane=$lane
bin=$bin
branch=$BRANCH
host=$HOST
pid=$pid
taken=$NOW
cwd=$REPO_ROOT
EOF
}

cmd_drop() {
  if [[ ! -f "$LEASE_FILE" ]]; then
    echo "no lease on this tree"
    return 0
  fi
  local held
  held="$(lease_lane)"
  rm -f "$LEASE_FILE"
  echo "lease dropped: $held"
}

cmd_exec() {
  local lane="${1:-}"
  shift || true
  if ! valid_lane "$lane"; then
    echo "error: lane must be grok|claude|codex|cursor" >&2
    exit 2
  fi
  local bin
  bin="$(lane_bin "$lane")"
  if [[ -z "$bin" ]]; then
    echo "error: $lane is not on PATH" >&2
    exit 1
  fi
  LEASE_PID="$$"
  cmd_take "$lane"
  set +e
  "$bin" "$@"
  local rc=$?
  set -e
  cmd_drop
  return "$rc"
}

cmd="${1:-status}"
shift || true
case "$cmd" in
  status) cmd_status ;;
  take) cmd_take "${1:-}" ;;
  drop) cmd_drop ;;
  exec)
    lane="${1:-}"
    shift || true
    cmd_exec "$lane" "$@"
    ;;
  -h|--help|help) usage ;;
  *)
    echo "error: unknown command $cmd" >&2
    usage
    ;;
esac
