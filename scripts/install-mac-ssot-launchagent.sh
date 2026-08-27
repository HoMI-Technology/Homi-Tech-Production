#!/usr/bin/env bash
# Install the Mac terminal hook that fast-forwards this clone from GitHub
# once when you start work (first cd / first shell in the repo that day).
#
# GitHub is the SSOT. Daily building is on the work PC; this Mac needs to be
# current before you edit, then left alone. No timer, no login job, no
# second pull the same day. Never force-updates, never commits, never
# pushes main.
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
    echo "# GitHub SSOT: one ff-only pull when you start work in the Homi clone."
    echo "[[ -f \"\$HOME/Library/Application Support/homitechnology/homi-ssot-zsh.sh\" ]] && source \"\$HOME/Library/Application Support/homitechnology/homi-ssot-zsh.sh\""
    echo "# <<< homi-ssot <<<"
  } >> "${ZSHRC}"
  echo "zshrc:    appended source of ${HOOK_DST}"
fi

echo "installed: terminal hook (one GitHub sync the first time you land in this clone that day)"
echo "repo:      ${REPO_ROOT}"
echo "hook:      ${HOOK_DST}"
echo "when:      first terminal / first cd into this clone each local calendar day"
echo "then:      no further auto-pulls that day (do not edit an outdated copy; do not re-sync mid-work)"
echo "skip:      HOMI_SSOT_SKIP=1"
echo "status:    ${REPO_ROOT}/scripts/homi-ssot.sh status"
echo "note:      open a new terminal (or: source ~/.zshrc) for the hook to load"
