# homi-ssot-zsh.sh — sourced from ~/.zshrc (not executed).
# One GitHub fast-forward when you start work in this clone (or a worktree),
# then stop. Extra terminals, extra `cd`s, and later tabs that day do not
# fetch again — mid-work pulls would change files under you.
# Next local calendar day, the first landing syncs once more so the folder
# is not yesterday's copy.
#
# Skip: HOMI_SSOT_SKIP=1
# GitHub is the SSOT. Never force, never commit, never push main.

[[ -o interactive ]] || return 0
[[ -n "${HOMI_SSOT_SKIP:-}" ]] && return 0

_homi_ssot_maybe() {
  # Once per shell. First landing in the clone (startup cwd or later cd).
  [[ -n "${_HOMI_SSOT_THIS_SHELL:-}" ]] && return 0
  command git rev-parse --is-inside-work-tree >/dev/null 2>&1 || return 0

  local toplevel url script cache stamp today
  toplevel="$(command git rev-parse --show-toplevel 2>/dev/null)" || return 0
  url="$(command git -C "$toplevel" remote get-url origin 2>/dev/null)" || return 0
  [[ "$url" == *HoMI-Technology/Homi-Tech-Production* ]] || return 0
  script="$toplevel/scripts/homi-ssot.sh"
  [[ -x "$script" ]] || return 0

  cache="${HOME}/Library/Caches/homitechnology"
  command mkdir -p "$cache"
  stamp="$cache/ssot-$(print -n -- "$toplevel" | command shasum -a 256 | command awk '{print $1}').stamp"
  today="$(command date +%Y-%m-%d)"
  if [[ -f "$stamp" ]] && [[ "$(command cat "$stamp" 2>/dev/null)" == "$today" ]]; then
    _HOMI_SSOT_THIS_SHELL=1
    return 0
  fi
  print -n -- "$today" > "$stamp"
  _HOMI_SSOT_THIS_SHELL=1

  print -u2 "homi-ssot: fetching GitHub once (source of truth)…"
  if ! "$script" sync; then
    print -u2 "homi-ssot: sync failed — reconcile with GitHub before editing."
  fi
}

autoload -Uz add-zsh-hook
add-zsh-hook chpwd _homi_ssot_maybe
_homi_ssot_maybe
