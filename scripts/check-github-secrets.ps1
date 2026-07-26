# check-github-secrets.ps1 - report presence of E2E/LHCI GitHub Actions secrets
# Never prints secret values. See docs/OPERATORS-MANUAL.md (Section A).
#
# Usage:
#   powershell -File scripts/check-github-secrets.ps1
#   homi secrets

param(
    [string]$Repo = "HoMI-Technology/Homi-Tech-Production"
)

$ErrorActionPreference = "Continue"

$requiredE2E = @(
    "E2E_SUPABASE_URL",
    "E2E_SUPABASE_SERVICE_ROLE_KEY",
    "E2E_STRIPE_SECRET_KEY",
    "E2E_STRIPE_WEBHOOK_SECRET",
    "E2E_STRIPE_PRICE_PLUS"
)
$requiredLhci = @(
    "LHCI_TEST_EMAIL",
    "LHCI_TEST_PASSWORD"
)

function Write-Ok($m) { Write-Host "  OK   $m" -ForegroundColor Green }
function Write-Bad($m) { Write-Host "  MISS $m" -ForegroundColor Red }
function Write-Warn($m) { Write-Host "  WARN $m" -ForegroundColor Yellow }
function Write-Info($m) { Write-Host "  ..   $m" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "GitHub Actions secrets checklist" -ForegroundColor Cyan
Write-Host "Repo: $Repo"
Write-Host ""

# Clear bad process tokens that break gh
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue

$ghOk = $false
$ghOut = gh auth status 2>&1 | Out-String
if ($LASTEXITCODE -eq 0 -or $ghOut -match "Logged in") {
    Write-Ok "gh authenticated"
    $ghOk = $true
}
else {
    Write-Bad "gh not logged in - run: gh auth login"
    Write-Host ""
    exit 2
}

$listOut = gh secret list --repo $Repo 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    Write-Bad "cannot list secrets for $Repo"
    Write-Info $listOut.Trim()
    exit 2
}

$present = @{}
foreach ($line in ($listOut -split "`n")) {
    $line = $line.Trim()
    if (-not $line) { continue }
    # format: NAME  Updated DATE
    $name = ($line -split "\s+")[0]
    if ($name -and $name -ne "name") { $present[$name] = $true }
}

Write-Host "E2E live specs" -ForegroundColor White
$e2eMissing = 0
foreach ($s in $requiredE2E) {
    if ($present.ContainsKey($s)) { Write-Ok $s }
    else { Write-Bad $s; $e2eMissing++ }
}

Write-Host ""
Write-Host "Lighthouse authenticated dashboard" -ForegroundColor White
$lhciMissing = 0
foreach ($s in $requiredLhci) {
    if ($present.ContainsKey($s)) { Write-Ok $s }
    else { Write-Bad $s; $lhciMissing++ }
}

Write-Host ""
if ($e2eMissing -eq 0 -and $lhciMissing -eq 0) {
    Write-Ok "All operator secrets present (values not shown)."
    Write-Info "Trigger: gh workflow run E2E --ref main"
    Write-Info "Trigger: gh workflow run Lighthouse --ref main"
    exit 0
}

if ($e2eMissing -gt 0) {
    Write-Warn "E2E will skip live specs until $e2eMissing secret(s) are set."
    Write-Info "Prefer a dedicated Supabase TEST project (not production)."
}
if ($lhciMissing -gt 0) {
    Write-Warn "LHCI dashboard step will skip until LHCI_TEST_* are set."
}

Write-Host ""
Write-Host "How to set (example):" -ForegroundColor Yellow
Write-Host "  gh secret set E2E_SUPABASE_URL --repo $Repo"
Write-Host "  gh secret set E2E_SUPABASE_SERVICE_ROLE_KEY --repo $Repo"
Write-Host "  ... (see docs/OPERATORS-MANUAL.md Section A, How to set secrets)"
Write-Host "  Web: https://github.com/$Repo/settings/secrets/actions"
Write-Host ""
exit 1
