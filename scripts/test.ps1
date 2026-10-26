# Bharat Chat - Test Automation Script
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   🇮🇳 RUNNING BHARAT CHAT AUTOMATED TESTS" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Running Backend Integration & Security Tests..." -ForegroundColor Yellow
npm.cmd test --prefix server
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Server tests failed." -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/2] Running Client TypeScript & Component Checks..." -ForegroundColor Yellow
npm.cmd run build --prefix client
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Client checks failed." -ForegroundColor Red
    exit 1
}

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "   [✓] ALL AUTOMATED TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
