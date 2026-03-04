# ============================================================
# scripts/vercel-env-push.ps1
#
# Pushes all environment variables to Vercel (production).
# Prerequisites:
#   1. Run  vercel login  first (or authenticate via dashboard)
#   2. Fill in every REPLACE_ME value below before running
#   3. Run from the repo root:  .\scripts\vercel-env-push.ps1
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

# ── JWT ───────────────────────────────────────────────────────
Add-VercelEnv "JWT_ACCESS_SECRET"  "a595de925ca625d340483a3a30a8183ae4d3230af2558dd7505b352f2a653abf4e3b53ef97cddbd6d099f863d5c6d646"
Add-VercelEnv "JWT_REFRESH_SECRET" "98137ad7194e4d832b27ea551afdb61ca234c0da24478b8b87a08bf877b1583766ece67497fcb7529a69cda6427c6e1c"

# ── API URL (point to your deployed gateway, e.g. Railway/Render) ─
Add-VercelEnv "NEXT_PUBLIC_API_URL"  "https://api.delivro.com"
Add-VercelEnv "NEXT_PUBLIC_WS_URL"   "wss://api.delivro.com/track"
Add-VercelEnv "NEXT_PUBLIC_SSE_URL"  "https://api.delivro.com/track-sse"

# ── Firebase public ───────────────────────────────────────────
Add-VercelEnv "NEXT_PUBLIC_FIREBASE_API_KEY"        "REPLACE_ME"
Add-VercelEnv "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"    "your-project-id.firebaseapp.com"
Add-VercelEnv "NEXT_PUBLIC_FIREBASE_DATABASE_URL"   "https://your-project-id-default-rtdb.firebaseio.com"
Add-VercelEnv "NEXT_PUBLIC_FIREBASE_PROJECT_ID"     "your-project-id"

# ── Misc ─────────────────────────────────────────────────────
Add-VercelEnv "NEXT_TELEMETRY_DISABLED" "1"

Write-Host ""
Write-Host "✓ Done! To verify, run:  vercel env ls --prod" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: Backend secrets (DATABASE_URL, STRIPE_*, SMTP_*, etc.)" -ForegroundColor DarkYellow
Write-Host "      belong on your backend host (Railway / Render / Fly.io)," -ForegroundColor DarkYellow
Write-Host "      NOT on Vercel. Add them via those platforms' dashboards." -ForegroundColor DarkYellow
