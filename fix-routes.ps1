# fix-routes.ps1
# ============================================================
# FIX 6 (file structure): Removes ghost files and fixes route paths
# Run from: C:\coding\project\scorexi\
# ============================================================

Write-Host "Fixing route file locations..." -ForegroundColor Cyan

# ── FIX A: Remove ghost player/route.tsx ─────────────────
# This file is at src/app/player/route.tsx but should not exist.
# The correct location is src/app/player/[id]/route.ts (already there).
# This ghost file causes Next.js routing confusion.
$ghost1 = "src\app\player\route.tsx"
if (Test-Path $ghost1) {
    Remove-Item $ghost1 -Force
    Write-Host "  Deleted ghost file: $ghost1" -ForegroundColor Green
} else {
    Write-Host "  $ghost1 not found (already clean)" -ForegroundColor Gray
}

# ── FIX B: rename-player at wrong path ───────────────────
# Wrong:  src/app/api/match/rename-player/route.tsx
# Correct: src/app/api/match/[id]/rename-player/route.ts
$wrongDir   = "src\app\api\match\rename-player"
$correctDir = "src\app\api\match\[id]\rename-player"

if (Test-Path "$wrongDir\route.tsx") {
    # Create correct folder if needed
    if (!(Test-Path $correctDir)) {
        New-Item -ItemType Directory -Path $correctDir -Force | Out-Null
    }
    
    # Only move if the correct one doesn't already exist
    if (!(Test-Path "$correctDir\route.ts")) {
        # Rename .tsx → .ts and move to correct location
        Copy-Item "$wrongDir\route.tsx" "$correctDir\route.ts" -Force
        Write-Host "  Moved rename-player route to: $correctDir\route.ts" -ForegroundColor Green
    } else {
        Write-Host "  Correct rename-player route already exists, skipping copy" -ForegroundColor Gray
    }
    
    # Delete wrong directory
    Remove-Item $wrongDir -Recurse -Force
    Write-Host "  Deleted wrong directory: $wrongDir" -ForegroundColor Green
} else {
    Write-Host "  rename-player: no wrong file found (may already be fixed)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done. Run 'npm run build' to verify no routing errors." -ForegroundColor Green