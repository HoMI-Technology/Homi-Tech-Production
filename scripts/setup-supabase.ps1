# Homi Tech - Supabase setup helper
# Run from repo root:
#   powershell -File .\scripts\setup-supabase.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$PROJECT_REF = "giyycykxkzfbowiapxpd"

Write-Host ""
Write-Host "Homi Supabase setup" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_REF"
Write-Host ""

# 1) Env
if (-not (Test-Path ".env.local")) {
    Write-Host "ERROR: .env.local missing" -ForegroundColor Red
    Write-Host "Copy .env.example and fill NEXT_PUBLIC_SUPABASE_* + SUPABASE_SERVICE_ROLE_KEY"
    exit 1
}
Write-Host "[1/4] .env.local present" -ForegroundColor Green

# 2) Live API check
Write-Host "[2/4] Connectivity..." -ForegroundColor Cyan
node scripts\verify-supabase-connectivity.mjs
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

# 3) CLI login
Write-Host ""
Write-Host "[3/4] Supabase CLI login" -ForegroundColor Cyan
$projects = supabase projects list 2>&1 | Out-String
if ($LASTEXITCODE -ne 0 -or $projects -match "Access token not provided|not logged") {
    Write-Host "Not logged in. Run this in your terminal (opens browser):" -ForegroundColor Yellow
    Write-Host "  supabase login" -ForegroundColor White
    Write-Host "Then re-run:  powershell -File .\scripts\setup-supabase.ps1"
    exit 2
}
Write-Host "CLI logged in" -ForegroundColor Green

# 4) Link project
Write-Host ""
Write-Host "[4/4] Link project $PROJECT_REF" -ForegroundColor Cyan
$projectRefPath = "supabase\.temp\project-ref"
if (Test-Path $projectRefPath) {
    $linked = (Get-Content $projectRefPath -Raw).Trim()
    if ($linked -eq $PROJECT_REF) {
        Write-Host "Already linked to $PROJECT_REF" -ForegroundColor Green
    }
    else {
        Write-Host "Linked to different ref: $linked - re-link needed" -ForegroundColor Yellow
        supabase link --project-ref $PROJECT_REF
    }
}
else {
    Write-Host "Linking... (may ask for database password from Dashboard > Settings > Database)" -ForegroundColor Yellow
    supabase link --project-ref $PROJECT_REF
}

Write-Host ""
Write-Host "Done. Next optional steps:" -ForegroundColor Cyan
Write-Host "  1. Dashboard > Auth > URL Configuration"
Write-Host "     Site URL: http://localhost:3000"
Write-Host "     Redirect: http://localhost:3000/**"
Write-Host "  2. npm run create-admin          # bootstrap admin user"
Write-Host "  3. npm run dev                   # start app"
Write-Host ""
Write-Host "Do NOT run 'supabase db push' until migration history repair is done"
Write-Host "(see docs/MIGRATION-REPAIR.md). Production schema is already live."
Write-Host ""
