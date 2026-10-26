# Bharat Chat - Local Development Runner Script
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   🇮🇳 STARTING BHARAT CHAT (SERVER & CLIENT)" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

# Ensure .env exists in server
if (-not (Test-Path "server/.env")) {
    Copy-Item "server/.env.example" "server/.env"
    Write-Host "[i] Created server/.env from template." -ForegroundColor Yellow
}

Write-Host "`n[1/2] Starting Backend API & WebSocket on http://localhost:5000..." -ForegroundColor Cyan
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm.cmd run dev --prefix server
}

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Frontend Vite App on http://localhost:3000..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all servers.`n" -ForegroundColor Yellow

try {
    npm.cmd run dev --prefix client
} finally {
    Write-Host "`nStopping backend server..." -ForegroundColor Yellow
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    Write-Host "Bharat Chat processes stopped." -ForegroundColor Green
}
