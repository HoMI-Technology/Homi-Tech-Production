# branch-hygiene.ps1 - open PR / branch noise report + policy hints
# See docs/OPERATORS-MANUAL.md (Section C).
#
# Usage:
#   powershell -File scripts/branch-hygiene.ps1
#   homi hygiene

param(
    [string]$Repo = "HoMI-Technology/Homi-Tech-Production",
    [switch]$Json
)

$ErrorActionPreference = "Continue"
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue

$policy = @{
    dependabot_major_default = "HOLD or CLOSE - manual upgrade project"
    dependabot_minor_default = "MERGE if verify green"
    human_stale_days         = 14
    agent_stale_days         = 7
}

function Get-Suggestion($title, $author, $isDraft) {
    $a = "$author".ToLower()
    $t = "$title".ToLower()
    if ($a -match "dependabot") {
        if ($t -match "typescript.*to 7|vitest.*to 4|zod.*to 4|@types/node.*to 26|jest-dom.*to 7|major") {
            return "HOLD/CLOSE (major - do not auto-merge)"
        }
        return "REVIEW (merge only if CI verify green)"
    }
    if ($a -match "cursor|claude|bot") {
        return "CLAIM this week or CLOSE (agent branch)"
    }
    if ($isDraft) { return "DRAFT - finish or close" }
    return "REVIEW / MERGE when verify green"
}

Write-Host ""
Write-Host "Homi branch hygiene" -ForegroundColor Cyan
Write-Host "Repo: $Repo"
Write-Host "Policy: docs/OPERATORS-MANUAL.md (Section C)"
Write-Host ""

$prsJson = gh pr list --repo $Repo --state open --limit 50 --json number,title,author,createdAt,updatedAt,isDraft,headRefName,url 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to list PRs. Is gh authenticated?" -ForegroundColor Red
    Write-Host $prsJson
    exit 2
}

$prs = $prsJson | ConvertFrom-Json
if (-not $prs) {
    Write-Host "No open PRs." -ForegroundColor Green
    exit 0
}

$rows = @()
foreach ($pr in $prs) {
    $author = $pr.author.login
    $sug = Get-Suggestion $pr.title $author $pr.isDraft
    $rows += [pscustomobject]@{
        number    = $pr.number
        title     = $pr.title
        author    = $author
        branch    = $pr.headRefName
        updatedAt = $pr.updatedAt
        isDraft   = $pr.isDraft
        suggest   = $sug
        url       = $pr.url
    }
}

$dependabot = @($rows | Where-Object { $_.author -match "dependabot" })
$agents = @($rows | Where-Object { $_.author -match "cursor|claude|bot" -and $_.author -notmatch "dependabot" })
$humans = @($rows | Where-Object { $_.author -notmatch "dependabot|cursor|claude|\[bot\]" })

if ($Json) {
    $rows | ConvertTo-Json -Depth 5
    exit 0
}

Write-Host ("Open PRs: {0}  (dependabot {1} | agent-like {2} | other {3})" -f $rows.Count, $dependabot.Count, $agents.Count, $humans.Count) -ForegroundColor White
Write-Host ""

function Show-Group($name, $items, $color) {
    Write-Host $name -ForegroundColor $color
    if (-not $items -or $items.Count -eq 0) {
        Write-Host "  (none)"
        Write-Host ""
        return
    }
    foreach ($r in $items) {
        Write-Host ("  #{0,-4} {1}" -f $r.number, $r.title)
        Write-Host ("         @{0}  branch={1}" -f $r.author, $r.branch) -ForegroundColor DarkGray
        Write-Host ("         -> {0}" -f $r.suggest) -ForegroundColor Yellow
    }
    Write-Host ""
}

Show-Group "DEPENDABOT" $dependabot "Magenta"
Show-Group "AGENT / BOT-LIKE" $agents "Cyan"
Show-Group "HUMAN / OTHER" $humans "Green"

Write-Host "Suggested weekly actions" -ForegroundColor White
Write-Host "  1. Close or hold all Dependabot majors with red CI"
Write-Host "  2. Merge green minor/patch Dependabot if verify green"
Write-Host "  3. Claim or close agent branches older than 7 days"
Write-Host "  4. Keep <= 2 active human feature PRs"
Write-Host ""
Write-Host "Examples:" -ForegroundColor DarkGray
Write-Host '  gh pr close 96 --comment "Holding TS 7 upgrade."'
Write-Host "  gh pr checks 93"
Write-Host "  gh pr merge 93 --squash"
Write-Host "  git fetch --prune"
Write-Host ""
