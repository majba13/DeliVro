# ============================================================
# scripts/market-preflight.ps1
#
# Release gate checks before market publish.
# Usage:
#   .\scripts\market-preflight.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$repo = "d:\VS code\DeliVro"
Set-Location $repo

Write-Host "`n=== DeliVro Market Preflight ===" -ForegroundColor Cyan

$requiredEnv = @(
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
)

$envCandidates = @(".env", "apps\web\.env.local")
$loaded = @{}

foreach ($candidate in $envCandidates) {
    if (Test-Path $candidate) {
        Get-Content $candidate |
            Where-Object { $_ -match "=" -and $_ -notmatch "^\s*#" } |
            ForEach-Object {
                $parts = $_ -split "=", 2
                if ($parts.Count -eq 2) {
                    $key = $parts[0].Trim()
                    $val = $parts[1].Trim().Trim('"')
                    if (-not $loaded.ContainsKey($key)) {
                        $loaded[$key] = $val
                    }
                }
            }
    }
}

Write-Host "`n[1/4] Environment checks" -ForegroundColor Yellow
$missing = @()
$placeholder = @()
foreach ($key in $requiredEnv) {
    if (-not $loaded.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($loaded[$key])) {
        $missing += $key
    } elseif ($loaded[$key] -match "REPLACE_ME|<db_password>|example|your-project-id") {
        $placeholder += $key
    }
}

if ($missing.Count -gt 0) {
    Write-Host "Missing required env keys:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
if ($placeholder.Count -gt 0) {
    Write-Host "Placeholder values detected:" -ForegroundColor Red
    $placeholder | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
Write-Host "  Env validation passed" -ForegroundColor Green

Write-Host "`n[2/4] Typecheck" -ForegroundColor Yellow
npm run typecheck --workspace=@delivro/web | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Typecheck failed" -ForegroundColor Red
    exit 1
}
Write-Host "  Typecheck passed" -ForegroundColor Green

Write-Host "`n[3/4] Build web app" -ForegroundColor Yellow
npm run build --workspace=@delivro/web | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  Build passed" -ForegroundColor Green

Write-Host "`n[4/4] PWA assets check" -ForegroundColor Yellow
$pwaFiles = @(
    "apps\web\public\manifest.json",
    "apps\web\public\sw.js",
    "apps\web\public\icon-192.svg",
    "apps\web\public\icon-512.svg"
)
foreach ($f in $pwaFiles) {
    if (-not (Test-Path $f)) {
        Write-Host "  Missing PWA file: $f" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  PWA asset check passed" -ForegroundColor Green

Write-Host "`nMarket preflight passed. Build is ready for publish pipeline." -ForegroundColor Green
