# Homi Tech — connection health check (safe: never prints secret values)
# Usage (from repo root or any dir):
#   powershell -File scripts/check-connections.ps1

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Ok($msg)   { Write-Host "  OK  $msg" -ForegroundColor Green }
function Bad($msg)  { Write-Host "  NO  $msg" -ForegroundColor Red }
function Info($msg) { Write-Host "  ..  $msg" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "Homi Tech connections" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host ""

# --- GitHub ---
Write-Host "GitHub"
$remote = git remote get-url origin 2>$null
if ($remote -match 'HoMI-Technology/Homi-Tech-Production') {
  Ok "remote = $remote"
} else {
  Bad "unexpected remote: $remote"
}
$head = git ls-remote origin HEAD 2>$null
if ($LASTEXITCODE -eq 0 -and $head) { Ok "git pull/push auth works (ls-remote OK)" }
else { Bad "git cannot reach origin — fix credentials" }

Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
$gh = gh auth status 2>&1 | Out-String
if ($gh -match 'Logged in to github.com') { Ok "gh CLI logged in" }
else {
  Bad "gh CLI not logged in"
  Info "Fix: gh auth login -h github.com -p https -w"
}

# --- Vercel ---
Write-Host ""
Write-Host "Vercel"
Remove-Item Env:VERCEL_TOKEN -ErrorAction SilentlyContinue
if (Test-Path ".vercel\project.json") {
  $pj = Get-Content ".vercel\project.json" -Raw | ConvertFrom-Json
  Ok "linked project = $($pj.projectName) ($($pj.projectId))"
  Info "team/org = $($pj.orgId)"
} else {
  Bad "not linked (.vercel/project.json missing)"
  Info "Fix: vercel link --project homi-platform --yes --scope homi-tech"
}
$who = vercel whoami 2>&1 | Out-String
if ($LASTEXITCODE -eq 0 -and $who -match '\S' -and $who -notmatch 'Error|not valid|No existing') {
  Ok "vercel CLI = $($who.Trim())"
} else {
  Bad "vercel CLI not logged in"
  Info "Fix: vercel login"
}

# --- Supabase ---
Write-Host ""
Write-Host "Supabase"
if (Test-Path ".env.local") {
  $envText = Get-Content ".env.local" -Raw
  $hasUrl = $envText -match 'NEXT_PUBLIC_SUPABASE_URL=https://\S+\.supabase\.co'
  $hasAnon = $envText -match 'NEXT_PUBLIC_SUPABASE_ANON_KEY=\S{20,}'
  $hasSvc  = $envText -match 'SUPABASE_SERVICE_ROLE_KEY=\S{20,}'
  if ($hasUrl) { Ok ".env.local has NEXT_PUBLIC_SUPABASE_URL" } else { Bad "missing NEXT_PUBLIC_SUPABASE_URL" }
  if ($hasAnon) { Ok ".env.local has NEXT_PUBLIC_SUPABASE_ANON_KEY" } else { Bad "missing NEXT_PUBLIC_SUPABASE_ANON_KEY" }
  if ($hasSvc)  { Ok ".env.local has SUPABASE_SERVICE_ROLE_KEY" } else { Bad "missing SUPABASE_SERVICE_ROLE_KEY" }

  if (Test-Path "node_modules\@supabase\supabase-js") {
    Write-Host "  Running live connectivity check..."
    node scripts/verify-supabase-connectivity.mjs 2>&1 | ForEach-Object { Info $_ }
  } else {
    Info "skip live check (run npm install first)"
  }
} else {
  Bad ".env.local missing — copy from .env.example and fill Supabase keys"
  Info "Dashboard: https://supabase.com/dashboard/project/giyycykxkzfbowiapxpd/settings/api"
}

Write-Host ""
Write-Host "Grok session tip: start with  grok homi" -ForegroundColor DarkGray
Write-Host ""
