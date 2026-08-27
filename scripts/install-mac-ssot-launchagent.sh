#!/usr/bin/env bash
# Install the Mac LaunchAgent that keeps this clone fast-forward-only with GitHub.
#
# GitHub is the SSOT. This job never force-updates, never commits, never pushes
# main. macOS blocks LaunchAgents from Desktop/Documents/Downloads — the clone
# must live outside those folders (Desktop may be a symlink to ~/Developer/...).
#
# Usage: ./scripts/install-mac-ssot-launchagent.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"

LABEL="com.homitechnology.repo-ssot"
SUPPORT="${HOME}/Library/Application Support/homitechnology"
WRAPPER="${SUPPORT}/homi-ssot-launchd.sh"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
LOG="${HOME}/Library/Logs/homi-ssot-sync.log"

case "${REPO_ROOT}" in
  */Desktop/*|*/Documents/*|*/Downloads/*)
    echo "error: physical repo is under a TCC-protected folder:" >&2
    echo "       ${REPO_ROOT}" >&2
    echo "       LaunchAgents cannot git-fetch Desktop/Documents/Downloads." >&2
    echo "       Keep files at ~/Developer/Homi-Tech-Production (Desktop symlink is ok)." >&2
    exit 1
    ;;
esac

mkdir -p "${SUPPORT}" "${HOME}/Library/LaunchAgents" "${HOME}/Library/Logs"

cat > "${WRAPPER}" <<EOF
#!/bin/bash
set -euo pipefail
export HOME="${HOME}"
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin"
export GH_CONFIG_DIR="${HOME}/.config/gh"
cd -P "${REPO_ROOT}"
exec /bin/bash "${REPO_ROOT}/scripts/homi-ssot.sh" sync
EOF
chmod 755 "${WRAPPER}"

cat > "${PLIST}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>${LABEL}</string>
	<key>WorkingDirectory</key>
	<string>${REPO_ROOT}</string>
	<key>ProgramArguments</key>
	<array>
		<string>/bin/bash</string>
		<string>${WRAPPER}</string>
	</array>
	<key>StartInterval</key>
	<integer>900</integer>
	<key>RunAtLoad</key>
	<true/>
	<key>StandardOutPath</key>
	<string>${LOG}</string>
	<key>StandardErrorPath</key>
	<string>${LOG}</string>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key>
		<string>/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
		<key>HOME</key>
		<string>${HOME}</string>
		<key>GH_CONFIG_DIR</key>
		<string>${HOME}/.config/gh</string>
	</dict>
</dict>
</plist>
EOF

UID_NUM="$(id -u)"
DOMAIN="gui/${UID_NUM}"
launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
launchctl bootstrap "${DOMAIN}" "${PLIST}"
launchctl enable "${DOMAIN}/${LABEL}" 2>/dev/null || true
launchctl kickstart -k "${DOMAIN}/${LABEL}"

echo "installed: ${LABEL}"
echo "repo:      ${REPO_ROOT}"
echo "wrapper:   ${WRAPPER}"
echo "plist:     ${PLIST}"
echo "interval:  900s + RunAtLoad (ff-only; never force; skip if dirty)"
echo "log:       ${LOG}"
echo "status:    ${REPO_ROOT}/scripts/homi-ssot.sh status"
