# homi-ssot.ps1 - keep this Windows clone 1:1 with GitHub (the SSOT).
#
# Windows mirror of scripts/homi-ssot.sh.
# See docs/OPERATORS-MANUAL.md (Section B) and AGENTS.md "Two machines".
#
# Usage:
#   powershell -File scripts/homi-ssot.ps1 status
#   powershell -File scripts/homi-ssot.ps1 pull
#   powershell -File scripts/homi-ssot.ps1 push "wip: message"
#   homi ssot status | pull | push "msg"

param(
    [Parameter(Position = 0)]
    [ValidateSet("status", "pull", "push", "help")]
    [string]$Command = "status",

    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$Rest
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location -LiteralPath $RepoRoot

function Assert-GitRepo {
    git rev-parse --is-inside-work-tree 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "error: not a git repository ($RepoRoot)" -ForegroundColor Red
        exit 1
    }
}

function Get-Branch {
    return (git rev-parse --abbrev-ref HEAD).Trim()
}

function Invoke-Status {
    Assert-GitRepo
    $b = Get-Branch
    Write-Host "repo:    $RepoRoot"
    Write-Host "branch:  $b"

    Write-Host "fetching origin..."
    git fetch --quiet origin 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  (fetch failed - showing local state only)" -ForegroundColor Yellow
    }

    $upstream = $null
    try {
        $ErrorActionPreference = "SilentlyContinue"
        $upstream = (git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -ne 0) { $upstream = $null }
    }
    finally {
        $ErrorActionPreference = "Stop"
    }

    if ($upstream) {
        $counts = (git rev-list --left-right --count "@{u}...HEAD" 2>$null | Out-String).Trim() -split "\s+"
        $behind = 0; $ahead = 0
        if ($counts.Count -ge 2) {
            [int]::TryParse($counts[0], [ref]$behind) | Out-Null
            [int]::TryParse($counts[1], [ref]$ahead) | Out-Null
        }
        Write-Host "sync:    $ahead ahead / $behind behind of $upstream"
        if ($behind -gt 0) { Write-Host "         -> run: homi ssot pull" -ForegroundColor Yellow }
        if ($ahead -gt 0) { Write-Host "         -> run: homi ssot push `"...`"" -ForegroundColor Yellow }
    }
    else {
        Write-Host "sync:    no upstream set (push with: homi ssot push `"...`")"
    }

    $porcelain = git status --porcelain
    if ($porcelain) {
        Write-Host "dirty:   uncommitted changes present" -ForegroundColor Yellow
        git status --short
    }
    else {
        Write-Host "dirty:   clean working tree" -ForegroundColor Green
    }

    if (Test-Path ".env.local") {
        Write-Host "env:     .env.local present" -ForegroundColor Green
    }
    else {
        Write-Host "env:     .env.local MISSING - copy from .env.example (never commit secrets)" -ForegroundColor Red
    }
}

function Invoke-Pull {
    Assert-GitRepo
    $b = Get-Branch
    Write-Host "pulling origin/$b (fast-forward only)..."
    git pull --ff-only origin $b
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ff-only pull failed: local and remote have diverged." -ForegroundColor Red
        Write-Host "Reconcile manually (rebase or merge) - do not force main. See AGENTS.md." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "up to date with origin/$b" -ForegroundColor Green
}

function Invoke-Push {
    Assert-GitRepo
    $b = Get-Branch
    if ($b -eq "main") {
        Write-Host "refusing to push directly to main. Create a feature branch first:" -ForegroundColor Red
        Write-Host "  homi branch <thing>"
        exit 1
    }

    $msg = if ($Rest -and $Rest.Count -gt 0) { ($Rest -join " ").Trim() } else { "wip: sync from $env:COMPUTERNAME" }

    $porcelain = git status --porcelain
    if ($porcelain) {
        git add -A
        git commit -m $msg
        if ($LASTEXITCODE -ne 0) {
            Write-Host "commit failed" -ForegroundColor Red
            exit 1
        }
        Write-Host "committed: $msg" -ForegroundColor Green
    }
    else {
        Write-Host "nothing to commit - pushing existing commits."
    }

    Write-Host "pushing origin/$b..."
    git push -u origin $b
    if ($LASTEXITCODE -ne 0) {
        Write-Host "push failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "pushed. On your other machine: git fetch && git checkout $b" -ForegroundColor Green
}

function Show-Help {
    Write-Host @"
homi-ssot.ps1 - GitHub SSOT sync (Windows)

  homi ssot status
  homi ssot pull
  homi ssot push "wip: message"

Rule: pull before you touch anything; push before you walk away.
Docs: docs/OPERATORS-MANUAL.md (Section B)
"@
}

switch ($Command) {
    "status" { Invoke-Status }
    "pull" { Invoke-Pull }
    "push" { Invoke-Push }
    "help" { Show-Help }
    default { Show-Help; exit 1 }
}
