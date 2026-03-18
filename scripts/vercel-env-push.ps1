# ============================================================
# scripts/vercel-env-push.ps1
#
# Pushes selected environment variables to Vercel.
#
# SAFE-BY-DEFAULT:
# - No real secrets are hardcoded in this script.
# - Script will fail if any value still contains REPLACE_ME.
#
# Usage:
#   1) Fill the variables below
#   2) Run from repo root: .\scripts\vercel-env-push.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# ── Helper ────────────────────────────────────────────────────
function Add-VercelEnv {
    param (
        [string]$Name,
        [string]$Value,
        [string]$Env = "production"   # "production" | "preview" | "development"
    )
    Write-Host "  Adding $Name ..." -ForegroundColor Cyan
    $Value | vercel env add $Name $Env --force 2>&1 | Out-Null
}

Write-Host "=== DeliVro — Vercel env push ===" -ForegroundColor Yellow

$VarsToPush = @(
    @{ Name = "NEXT_PUBLIC_API_URL"; Value = "REPLACE_ME" }
    @{ Name = "NEXT_PUBLIC_WS_URL"; Value = "REPLACE_ME" }
    @{ Name = "NEXT_PUBLIC_SSE_URL"; Value = "REPLACE_ME" }
    @{ Name = "NEXT_PUBLIC_SITE_URL"; Value = "REPLACE_ME" }

    @{ Name = "NEXT_PUBLIC_FIREBASE_API_KEY"; Value = "REPLACE_ME" }
    @{ Name = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"; Value = "REPLACE_ME" }
    @{ Name = "NEXT_PUBLIC_FIREBASE_DATABASE_URL"; Value = "REPLACE_ME" }
    @{ Name = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"; Value = "REPLACE_ME" }

    @{ Name = "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"; Value = "REPLACE_ME" }
    @{ Name = "NEXT_TELEMETRY_DISABLED"; Value = "1" }
)

foreach ($item in $VarsToPush) {
    if ($item.Value -match "REPLACE_ME") {
        Write-Host "ERROR: $($item.Name) is still REPLACE_ME. Update the script first." -ForegroundColor Red
        exit 1
    }
    Add-VercelEnv $item.Name $item.Value "production"
    Add-VercelEnv $item.Name $item.Value "preview"
}

Write-Host ""
Write-Host "✓ Done! To verify, run:  vercel env ls --prod" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: Private backend secrets (DATABASE_URL, JWT_*, STRIPE_*, SMTP_*, CLOUDINARY_API_*)" -ForegroundColor DarkYellow
Write-Host "      should be set on the backend host / runtime, not exposed to the browser." -ForegroundColor DarkYellow
