#!/usr/bin/env bash
# Install the Mac terminal hook that fast-forwards this clone from GitHub
# when you start working in a terminal (first cd / first shell in the repo).
#
# GitHub is the SSOT. Daily building is on the work PC; this Mac only needs
# to be current when you sit down. No timer, no login job.
# The job never force-updates, never commits, never pushes main.
#
# Usage: ./scripts/install-mac-ssot-launchagent.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

LABEL="com.homitechnology.repo-ssot"
SUPPORT="${HOME}/Library/Application Support/homitechnology"
HOOK_SRC="${SCRIPT_DIR}/homi-ssot-zsh.sh"
HOOK_DST="${SUPPORT}/homi-ssot-zsh.sh"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
WRAPPER="${SUPPORT}/homi-ssot-launchd.sh"
ZSHRC="${HOME}/.zshrc"
MARKER="homi-ssot-zsh.sh"

if [[ ! -f "${HOOK_SRC}" ]]; then
  echo "error: missing ${HOOK_SRC}" >&2
  exit 1
fi

mkdir -p "${SUPPORT}" "${HOME}/Library/Caches/homitechnology"

# Login/interval LaunchAgent is the wrong trigger — remove it if present.
UID_NUM="$(id -u)"
launchctl bootout "gui/${UID_NUM}/${LABEL}" 2>/dev/null || true
rm -f "${PLIST}" "${WRAPPER}"

cp "${HOOK_SRC}" "${HOOK_DST}"

if [[ -f "${ZSHRC}" ]] && grep -q "${MARKER}" "${ZSHRC}"; then
  echo "zshrc:    already sources ${HOOK_DST}"
else
  {
    echo ""
    echo "# >>> homi-ssot >>>"
    echo "# GitHub SSOT: ff-only pull when a terminal starts work in the Homi clone."
    echo "[[ -f \"\$HOME/Library/Application Support/homitechnology/homi-ssot-zsh.sh\" ]] && source \"\$HOME/Library/Application Support/homitechnology/homi-ssot-zsh.sh\""
    echo "# <<< homi-ssot <<<"
  } >> "${ZSHRC}"
  echo "zshrc:    appended source of ${HOOK_DST}"
fi

echo "installed: terminal hook (first shell / first cd into Homi-Tech-Production)"
echo "repo:      ${REPO_ROOT}"
echo "hook:      ${HOOK_DST}"
echo "when:      you start working in a terminal in this clone (ff-only; never force)"
echo "skip:      HOMI_SSOT_SKIP=1"
echo "status:    ${REPO_ROOT}/scripts/homi-ssot.sh status"
echo "note:      open a new terminal (or: source ~/.zshrc) for the hook to load"
