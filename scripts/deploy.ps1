# ============================================================
# scripts/deploy.ps1 — One-command Vercel deploy
#
# Usage:
#   .\scripts\deploy.ps1 -Token "YOUR_VERCEL_TOKEN"
#
# Get token from: https://vercel.com/account/tokens
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ErrorActionPreference = "Stop"
$repo = "d:\VS code\DeliVro"
Set-Location $repo

Write-Host "`n=== DeliVro Deploy ===" -ForegroundColor Cyan

# ── 0. Preflight checks ───────────────────────────────────────
Write-Host "`n[0/5] Running market preflight checks..." -ForegroundColor Yellow
powershell -ExecutionPolicy Bypass -File ".\scripts\market-preflight.ps1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Preflight failed. Fix issues before deploy." -ForegroundColor Red
    exit 1
}
Write-Host "  Preflight passed." -ForegroundColor Green

# ── 1. Verify token ───────────────────────────────────────────
Write-Host "`n[1/5] Verifying token..." -ForegroundColor Yellow
$me = vercel whoami --token $Token 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Invalid token. Get one from https://vercel.com/account/tokens" -ForegroundColor Red
    exit 1
}
Write-Host "  Authenticated as: $me" -ForegroundColor Green

# ── 2. Link project (first time only) ────────────────────────
Write-Host "`n[2/5] Linking project..." -ForegroundColor Yellow
if (-not (Test-Path ".vercel\project.json")) {
    vercel link --token $Token --yes --cwd $repo 2>&1
} else {
    Write-Host "  Already linked." -ForegroundColor DarkGray
}

# ── 3. Push env vars ─────────────────────────────────────────
Write-Host "`n[3/5] Pushing env vars to Vercel production..." -ForegroundColor Yellow

function Add-Env($name, $value) {
    Write-Host "  + $name" -ForegroundColor Cyan
    $value | vercel env add $name production --token $Token --force 2>&1 | Out-Null
    $value | vercel env add $name preview   --token $Token --force 2>&1 | Out-Null
}

# Read vars from apps/web/.env.local
$envFile = "apps\web\.env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^NEXT_PUBLIC_|^NEXT_TELEMETRY" -and $_ -notmatch "^#" } | ForEach-Object {
        $parts = $_ -split "=", 2
        if ($parts.Count -eq 2) {
            Add-Env $parts[0].Trim() $parts[1].Trim()
        }
    }
} else {
    Write-Host "  apps/web/.env.local not found — skipping env push" -ForegroundColor DarkYellow
}

# ── 4. Deploy ─────────────────────────────────────────────────
Write-Host "`n[4/5] Deploying to production..." -ForegroundColor Yellow
$result = vercel --prod --token $Token --yes --cwd $repo 2>&1
Write-Host $result

if ($result -match "https://") {
    $url = ($result | Select-String "https://[^\s]+" | Select-Object -First 1).Matches.Value
    Write-Host "`n✓ Deployed: $url" -ForegroundColor Green
    Start-Process $url
} else {
    Write-Host "`nDeploy output above — check for errors." -ForegroundColor DarkYellow
}

Write-Host "`n[5/5] Done." -ForegroundColor Green
