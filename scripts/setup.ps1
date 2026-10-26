# Bharat Chat - Setup Automation Script
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   🇮🇳 BHARAT CHAT - SYSTEM SETUP & INITIALIZATION" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

# 1. Check Node.js
try {
    $nodeVer = node -v
    Write-Host "[✓] Node.js is installed: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[✗] Node.js is not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Install Server Dependencies
Write-Host "`n[1/4] Installing backend server dependencies..." -ForegroundColor Yellow
npm.cmd install --prefix server
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Server dependencies installation failed." -ForegroundColor Red
    exit 1
}

# 3. Install Client Dependencies
Write-Host "`n[2/4] Installing frontend client dependencies..." -ForegroundColor Yellow
npm.cmd install --prefix client
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Client dependencies installation failed." -ForegroundColor Red
    exit 1
}

# 4. Initialize Database
Write-Host "`n[3/4] Running database migrations..." -ForegroundColor Yellow
npx.cmd --prefix server tsx src/db/migrate.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Database migration failed." -ForegroundColor Red
    exit 1
}

# 5. Sync Capacitor Android
Write-Host "`n[4/4] Syncing Capacitor Android assets..." -ForegroundColor Yellow
npm.cmd run build --prefix client
npx.cmd --prefix client cap sync android

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "   [✓] BHARAT CHAT SETUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "   Run './scripts/dev.ps1' to start the application." -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
