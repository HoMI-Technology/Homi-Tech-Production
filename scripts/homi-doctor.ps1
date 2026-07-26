# homi-doctor.ps1 - full operator health check
# See docs/OPERATORS-MANUAL.md (Section B - Doctor)
#
# Usage:
#   powershell -File scripts/homi-doctor.ps1
#   powershell -File scripts/homi-doctor.ps1 -Full
#   powershell -File scripts/homi-doctor.ps1 -SecretsOnly
#   homi doctor | doctor -Full | doctor -SecretsOnly

param(
    [switch]$Full,
    [switch]$SecretsOnly,
    [string]$Repo = "HoMI-Technology/Homi-Tech-Production"
)

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location -LiteralPath $RepoRoot

Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:VERCEL_TOKEN -ErrorAction SilentlyContinue

$script:fail = 0
$script:warn = 0

function Ok($m) { Write-Host "  OK   $m" -ForegroundColor Green }
function Bad($m) { Write-Host "  FAIL $m" -ForegroundColor Red; $script:fail++ }
function Warn($m) { Write-Host "  WARN $m" -ForegroundColor Yellow; $script:warn++ }
function Info($m) { Write-Host "  ..   $m" -ForegroundColor DarkGray }
function Section($m) {
    Write-Host ""
    Write-Host $m -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Homi doctor" -ForegroundColor Cyan
Write-Host "SSOT: $RepoRoot"
Write-Host "Time: $(Get-Date -Format o)"
Write-Host "Manual: docs/OPERATORS-MANUAL.md"

if ($SecretsOnly) {
    & "$RepoRoot\scripts\check-github-secrets.ps1" -Repo $Repo
    exit $LASTEXITCODE
}

# 1) Repo
Section "1. Repository"
git rev-parse --is-inside-work-tree 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Bad "Not a git repository"
}
else {
    Ok "git repository"
    $branch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
    Info "branch: $branch"
    $remote = (git remote get-url origin 2>$null).Trim()
    if ($remote -match "Homi-Tech-Production") { Ok "origin = $remote" }
    else { Warn "unexpected origin: $remote" }
    $dirty = git status --porcelain
    if ($dirty) { Warn "working tree dirty ($(($dirty | Measure-Object).Count) paths)" }
    else { Ok "working tree clean" }
}

# 2) Tooling
Section "2. Tooling on PATH"
$tools = @(
    @{ n = "node"; test = { node --version } },
    @{ n = "npm"; test = { npm --version } },
    @{ n = "git"; test = { git --version } },
    @{ n = "gh"; test = { gh --version 2>&1 | Select-Object -First 1 } },
    @{ n = "vercel"; test = { vercel --version 2>&1 | Select-Object -First 1 } },
    @{ n = "supabase"; test = { supabase --version 2>&1 | Select-Object -First 1 } }
)
foreach ($t in $tools) {
    $cmd = Get-Command $t.n -ErrorAction SilentlyContinue
    if (-not $cmd) {
        if ($t.n -in @("node", "npm", "git")) { Bad "$($t.n) missing" }
        else { Warn "$($t.n) missing" }
        continue
    }
    try {
        $v = & $t.test
        Ok "$($t.n)  $v"
    }
    catch {
        Warn "$($t.n) found but version failed"
    }
}

# 3) Auth
Section "3. Cloud auth"
$gh = gh auth status 2>&1 | Out-String
if ($gh -match "Logged in") { Ok "gh logged in" }
else { Bad "gh not logged in (gh auth login)" }

$vw = vercel whoami 2>&1 | Out-String
if ($LASTEXITCODE -eq 0 -and $vw -match "\S" -and $vw -notmatch "Error|not valid|No existing") {
    Ok "vercel = $($vw.Trim())"
}
else {
    Warn "vercel not logged in (vercel login)"
}

if (Test-Path "supabase\.temp\project-ref") {
    $ref = (Get-Content "supabase\.temp\project-ref" -Raw).Trim()
    Ok "supabase linked project-ref = $ref"
}
else {
    Warn "supabase not linked in this repo (supabase link --project-ref giyycykxkzfbowiapxpd)"
}

if (Test-Path ".vercel\project.json") {
    try {
        $vj = Get-Content ".vercel\project.json" -Raw | ConvertFrom-Json
        Ok "vercel project = $($vj.projectName) ($($vj.projectId))"
    }
    catch { Warn ".vercel/project.json unreadable" }
}
else {
    Warn "no .vercel/project.json (vercel link)"
}

# 4) Local env
Section "4. Local .env.local"
if (-not (Test-Path ".env.local")) {
    Bad ".env.local missing"
}
else {
    Ok ".env.local present"
    $envText = Get-Content ".env.local" -Raw
    foreach ($k in @("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL")) {
        if ($envText -match "(?m)^$k=\S+") { Ok "$k set" }
        else { Warn "$k missing or empty" }
    }
}

# 5) Supabase connectivity
Section "5. Supabase connectivity"
if (Test-Path "node_modules\@supabase\supabase-js") {
    $out = node scripts\verify-supabase-connectivity.mjs 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $out -match "OK:") {
        Ok "verify-supabase passed"
        ($out -split "`n") | Where-Object { $_ -match "OK:|project:|Tier" } | ForEach-Object { Info $_.Trim() }
    }
    else {
        Warn "verify-supabase failed or incomplete"
        Info ($out.Trim() -replace "`r", "")
    }
}
else {
    Warn "node_modules missing - run npm ci (skipping verify-supabase)"
}

# 6) GitHub secrets
Section "6. GitHub Actions secrets (E2E / LHCI)"
& "$RepoRoot\scripts\check-github-secrets.ps1" -Repo $Repo
$secExit = $LASTEXITCODE
if ($secExit -ne 0) { $script:warn++ }

# 7) PR noise
Section "7. Open PR noise"
$prCount = 0
try {
    $prJson = gh pr list --repo $Repo --state open --limit 50 --json number 2>$null
    if ($LASTEXITCODE -eq 0) {
        $prCount = @($prJson | ConvertFrom-Json).Count
        if ($prCount -gt 15) { Warn "$prCount open PRs - run: homi hygiene" }
        elseif ($prCount -gt 0) { Ok "$prCount open PRs (run homi hygiene weekly)" }
        else { Ok "no open PRs" }
    }
    else { Warn "could not list PRs" }
}
catch { Warn "could not list PRs" }

# 8) Optional full quality matrix
if ($Full) {
    Section "8. Quality matrix (Full)"
    if (-not (Test-Path "node_modules")) {
        Bad "cannot run full matrix without node_modules"
    }
    else {
        foreach ($pair in @(
                @{ n = "brand-check"; c = "npm run brand-check" },
                @{ n = "architecture:check"; c = "npm run architecture:check" },
                @{ n = "typecheck"; c = "npm run typecheck" },
                @{ n = "unit tests"; c = "npm test" }
            )) {
            Write-Host "  running $($pair.n)..." -ForegroundColor DarkGray
            cmd /c "$($pair.c) >nul 2>&1"
            if ($LASTEXITCODE -eq 0) { Ok $pair.n }
            else { Bad "$($pair.n) failed - run: $($pair.c)" }
        }
        Info "production build not run automatically (slow). Before ship: npm run build"
    }
}
else {
    Section "8. Quality matrix"
    Info "skipped (pass -Full to run brand-check, architecture:check, typecheck, tests)"
    Info "CI verify job runs those + next build on every PR to main"
}

# Summary
Section "Summary"
if ($script:fail -eq 0 -and $script:warn -eq 0) {
    Write-Host "  ALL CLEAR - ready to operate." -ForegroundColor Green
}
elseif ($script:fail -eq 0) {
    Write-Host "  READY WITH WARNINGS ($($script:warn)) - you can code; fix WARNs for full CI coverage." -ForegroundColor Yellow
}
else {
    Write-Host "  NOT READY - $script:fail FAIL, $script:warn WARN. Fix FAILs first." -ForegroundColor Red
}

Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  docs/OPERATORS-MANUAL.md"
Write-Host "  homi ssot status | homi hygiene | homi start"
Write-Host ""

if ($script:fail -gt 0) { exit 1 }
if ($script:warn -gt 0) { exit 0 }
exit 0
