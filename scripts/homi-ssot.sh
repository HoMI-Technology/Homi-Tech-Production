#!/usr/bin/env bash
# homi-ssot.sh — keep this MacBook clone 1:1 with GitHub (the SSOT).
#
# macOS mirror of homi-ssot.ps1. GitHub is the only bridge between machines;
# never copy the folder/zip from another machine. See AGENTS.md → "Two machines".
#
# Usage:
#   ./scripts/homi-ssot.sh status                 # branch, sync vs origin, dirty files, .env.local check
#   ./scripts/homi-ssot.sh pull                   # fast-forward-only pull of the current branch
#   ./scripts/homi-ssot.sh push ["commit message"]  # commit everything + push, set upstream
#   ./scripts/homi-ssot.sh sync                   # fetch GitHub; ff-only local main + current branch
#
# GitHub is the SSOT. `sync` never force-updates and never commits.
# Called once from `homi-agent.sh take` when a build starts. Push as you
# build. No timer, no login job, no terminal hook.

set -euo pipefail

# Always operate from the physical repo root (pwd -P). A Desktop symlink is
# fine for humans; keep the real files off Desktop (TCC / iCloud).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
cd "$REPO_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: not a git repository ($REPO_ROOT)" >&2
  exit 1
fi

branch() { git rev-parse --abbrev-ref HEAD; }

cmd_status() {
  local b; b="$(branch)"
  echo "repo:    $REPO_ROOT"
  echo "branch:  $b"

  echo "fetching origin..."
  git fetch --quiet origin || echo "  (fetch failed — showing local state only)"

  # Ahead/behind vs the branch's upstream, if one is set.
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    local counts ahead behind
    counts="$(git rev-list --left-right --count '@{u}...HEAD')"
    behind="$(echo "$counts" | awk '{print $1}')"
    ahead="$(echo "$counts" | awk '{print $2}')"
    echo "sync:    $ahead ahead / $behind behind of $(git rev-parse --abbrev-ref '@{u}')"
    [ "$behind" -gt 0 ] && echo "         -> run: ./scripts/homi-ssot.sh pull"
    [ "$ahead"  -gt 0 ] && echo "         -> run: ./scripts/homi-ssot.sh push \"...\""
  else
    echo "sync:    no upstream set (push with: ./scripts/homi-ssot.sh push \"...\")"
  fi

  # Working-tree cleanliness.
  if [ -n "$(git status --porcelain)" ]; then
    echo "dirty:   uncommitted changes present"
    git status --short
  else
    echo "dirty:   clean working tree"
  fi

  # .env.local lives outside git and must be set up per-machine.
  if [ -f .env.local ]; then
    echo "env:     .env.local present"
  else
    echo "env:     .env.local MISSING — copy from .env.example (secrets are gitignored, never synced)"
  fi

  # Local main can rot if you live on a feature branch — GitHub main is the SSOT.
  if git show-ref --verify --quiet refs/remotes/origin/main && git show-ref --verify --quiet refs/heads/main; then
    local main_behind
    main_behind="$(git rev-list --count main..origin/main 2>/dev/null || echo 0)"
    if [ "${main_behind:-0}" -gt 0 ]; then
      echo "main:    local main is $main_behind commit(s) behind origin/main — run: ./scripts/homi-ssot.sh sync"
    else
      echo "main:    local main matches origin/main"
    fi
  fi
}

cmd_pull() {
  local b; b="$(branch)"
  echo "pulling origin/$b (fast-forward only)..."
  if ! git pull --ff-only origin "$b"; then
    echo "" >&2
    echo "ff-only pull failed: local and remote have diverged." >&2
    echo "You likely have commits here that aren't on GitHub, or vice versa." >&2
    echo "Reconcile manually (rebase or merge) — do not force. See AGENTS.md." >&2
    exit 1
  fi
  echo "up to date with origin/$b"
}

cmd_push() {
  local msg="${1:-wip: sync from $(hostname -s 2>/dev/null || echo mac)}"
  local b; b="$(branch)"

  if [ "$b" = "main" ]; then
    echo "refusing to push directly to main. Create a feature branch first:" >&2
    echo "  git checkout -b feat/<thing>" >&2
    exit 1
  fi

  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "$msg"
    echo "committed: $msg"
  else
    echo "nothing to commit — pushing existing commits."
  fi

  echo "pushing origin/$b..."
  git push -u origin "$b"
  echo "pushed. On your other machine: git fetch && git checkout $b"
}

# Fast-forward local `main` to origin/main without checking it out.
# `git fetch origin main:main` is ff-only into a non-checked-out branch.
ff_local_main() {
  if [ "$(branch)" = "main" ]; then
    git merge --ff-only origin/main
    return
  fi
  if ! git fetch origin main:main; then
    echo "warning: could not fast-forward local main (diverged or checked out elsewhere)." >&2
    echo "         reconcile locally — never force. GitHub origin/main stays the SSOT." >&2
    return 1
  fi
  echo "main:    local main fast-forwarded to origin/main ($(git rev-parse --short refs/heads/main))"
}

cmd_sync() {
  echo "sync:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "repo:    $REPO_ROOT"
  echo "branch:  $(branch)"
  echo "fetching origin..."
  git fetch --prune origin

  ff_local_main || true

  local b; b="$(branch)"
  if ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    echo "current: $b has no upstream — it is NOT on GitHub yet."
    echo "         run: ./scripts/homi-ssot.sh push \"wip: <thing>\""
    return 0
  fi

  if [ -n "$(git status --porcelain)" ]; then
    echo "current: dirty working tree — skip pull so local work is not overwritten."
    echo "         commit/push or stash, then sync again."
    git status --short
    return 0
  fi

  echo "pulling origin/$b (fast-forward only)..."
  if ! git pull --ff-only; then
    echo "ff-only pull failed on $b — local and GitHub diverged. Reconcile; do not force." >&2
    exit 1
  fi
  echo "ok:      $b is 1:1 with GitHub (ff-only)"
}

case "${1:-status}" in
  status) cmd_status ;;
  pull)   cmd_pull ;;
  push)   shift || true; cmd_push "${1:-}" ;;
  sync)   cmd_sync ;;
  *)
    echo "usage: ./scripts/homi-ssot.sh {status|pull|push [\"message\"]|sync}" >&2
    exit 2
    ;;
esac
