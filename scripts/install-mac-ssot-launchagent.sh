#!/usr/bin/env bash
# Strip leftover Mac auto-sync (login LaunchAgent, zsh cd hook, daily stamp).
# GitHub updates only when a build starts (`homi-agent.sh take` → one sync)
# and when you push. Nothing else.
#
# Usage: ./scripts/install-mac-ssot-launchagent.sh

set -euo pipefail

LABEL="com.homitechnology.repo-ssot"
SUPPORT="${HOME}/Library/Application Support/homitechnology"
HOOK_DST="${SUPPORT}/homi-ssot-zsh.sh"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
WRAPPER="${SUPPORT}/homi-ssot-launchd.sh"
ZSHRC="${HOME}/.zshrc"
CACHE="${HOME}/Library/Caches/homitechnology"

UID_NUM="$(id -u)"
launchctl bootout "gui/${UID_NUM}/${LABEL}" 2>/dev/null || true
rm -f "${PLIST}" "${WRAPPER}" "${HOOK_DST}"
rm -f "${CACHE}"/ssot-*.stamp 2>/dev/null || true

if [[ -f "${ZSHRC}" ]] && grep -q 'homi-ssot' "${ZSHRC}"; then
  python3 - <<'PY'
from pathlib import Path
p = Path.home() / ".zshrc"
text = p.read_text()
start = text.find("# >>> homi-ssot >>>")
end = text.find("# <<< homi-ssot <<<")
if start != -1 and end != -1:
    end = end + len("# <<< homi-ssot <<<")
    block = text[start:end]
    # drop surrounding extra blank line
    before = text[:start].rstrip("\n")
    after = text[end:].lstrip("\n")
    new = (before + ("\n\n" if after else "\n") + after) if after else before + "\n"
    p.write_text(new)
    print("zshrc:    removed homi-ssot hook block")
else:
    print("zshrc:    homi-ssot marker present but block not found — edit ~/.zshrc by hand")
PY
else
  echo "zshrc:    no homi-ssot hook"
fi

echo "removed:  leftover auto-sync (LaunchAgent + terminal hook + daily stamp)"
echo "updates:  GitHub ff-only pull once on ./scripts/homi-agent.sh take"
echo "          GitHub push as you build: ./scripts/homi-ssot.sh push \"wip: …\""
echo "nothing:  no timer, no login job, no cd/terminal fetch"
echo "skip:     HOMI_SSOT_SKIP=1"
