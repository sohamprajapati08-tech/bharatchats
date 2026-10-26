# Bharat Chat - Production Build Automation Script
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   🇮🇳 BUILDING BHARAT CHAT PRODUCTION ARTIFACTS" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

# 1. Build Backend Server
Write-Host "`n[1/3] Building Server TypeScript to dist/..." -ForegroundColor Yellow
npm.cmd run build --prefix server
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Server build failed." -ForegroundColor Red
    exit 1
}
Write-Host "[✓] Server build succeeded." -ForegroundColor Green

# 2. Build Frontend Web App
Write-Host "`n[2/3] Building Client Vite Bundle to dist/..." -ForegroundColor Yellow
npm.cmd run build --prefix client
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Client build failed." -ForegroundColor Red
    exit 1
}
Write-Host "[✓] Client build succeeded." -ForegroundColor Green

# 3. Sync to Android
Write-Host "`n[3/3] Synchronizing assets into Capacitor Android..." -ForegroundColor Yellow
npx.cmd --prefix client cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] Capacitor sync failed." -ForegroundColor Red
    exit 1
}

# 4. Attempt Gradle APK Build if Android SDK is available
if ($env:ANDROID_HOME -or $env:ANDROID_SDK_ROOT -or (Test-Path "client/android/local.properties")) {
    Write-Host "`nAttempting local Gradle APK build..." -ForegroundColor Yellow
    Set-Location client/android
    .\gradlew.bat assembleDebug
    Set-Location ../..
    
    $apkPath = "client/android/app/build/outputs/apk/debug/app-debug.apk"
    if (Test-Path $apkPath) {
        Write-Host "`n[✓] Android Debug APK generated at: $apkPath" -ForegroundColor Green
    }
} else {
    Write-Host "`n[i] Android SDK is not detected on this machine." -ForegroundColor Cyan
    Write-Host "    A cloud build workflow is prepared at '.github/workflows/android-build.yml' to compile the APK for free with GitHub Actions!" -ForegroundColor Yellow
}

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "   [✓] PRODUCTION BUILD COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
