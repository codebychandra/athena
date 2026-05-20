# ============================================================
#  CTI Group Command Center — Online Launcher
#  Starts the Node.js server + ngrok public tunnel
#
#  Usage:  Right-click → Run with PowerShell
#          OR in terminal: .\start-online.ps1
# ============================================================

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$NgrokExe = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"
$ServerLog = "$Root\server_out.txt"
$ServerErr = "$Root\server_err.txt"

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host "   CTI Group Command Center — Online Mode" -ForegroundColor Cyan
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Kill any existing instances ──────────────────────────
Write-Host "  Stopping existing processes..." -ForegroundColor DarkGray
Get-Process -Name node  -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

# ── 2. Start Node.js server ──────────────────────────────────
Write-Host "  Starting Node.js server..." -ForegroundColor Yellow
$server = Start-Process node -ArgumentList "server.js" -WorkingDirectory $Root `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $ServerLog -RedirectStandardError $ServerErr
Start-Sleep -Seconds 3

$serverOk = (Get-Content $ServerLog -ErrorAction SilentlyContinue) -match "Command Center"
if ($serverOk) {
  Write-Host "  ✅ Server running on port 3000" -ForegroundColor Green
} else {
  Write-Host "  ⚠️  Server may have an issue — check server_out.txt" -ForegroundColor Red
}

# ── 3. Start ngrok tunnel ────────────────────────────────────
Write-Host "  Starting ngrok tunnel..." -ForegroundColor Yellow

if (-not (Test-Path $NgrokExe)) {
  Write-Host "  ❌ ngrok not found at: $NgrokExe" -ForegroundColor Red
  Write-Host "     Install with: winget install ngrok.ngrok" -ForegroundColor DarkGray
  Read-Host "Press Enter to exit"
  exit 1
}

$ngrok = Start-Process -FilePath $NgrokExe -ArgumentList @("http", "3000") `
  -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 7

# ── 4. Get public URL ────────────────────────────────────────
$url = $null
try {
  $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 5 -ErrorAction Stop
  $url = ($tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1).public_url
  if (-not $url) { $url = ($tunnels.tunnels | Select-Object -First 1).public_url }
} catch {
  Write-Host "  ⚠️  Could not reach ngrok API — check http://localhost:4040 manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Green
if ($url) {
  Write-Host "  🌐 SHARE THIS LINK:" -ForegroundColor Green
  Write-Host ""
  Write-Host "     $url" -ForegroundColor White
  Write-Host ""
  Write-Host "  🔐 Login credentials:" -ForegroundColor Cyan
  Write-Host "     Username : cti" -ForegroundColor White
  Write-Host "     Password : athena2026" -ForegroundColor White
  Write-Host "     (change in .env — BASIC_AUTH_USER / BASIC_AUTH_PASS)" -ForegroundColor DarkGray
} else {
  Write-Host "  ⚠️  URL not detected — visit http://localhost:4040" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  💡 Local access : http://localhost:3000" -ForegroundColor DarkGray
Write-Host "  🔄 Data refreshes every 10 minutes automatically" -ForegroundColor DarkGray
Write-Host "  ❌ Close this window to stop everything" -ForegroundColor DarkGray
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host ""

# Keep the tunnel alive — stop server+ngrok on exit
try {
  while ($true) {
    Start-Sleep -Seconds 30
    # Restart ngrok if it dies
    if (-not (Get-Process -Id $ngrok.Id -ErrorAction SilentlyContinue)) {
      Write-Host "  ⚠️  ngrok stopped — restarting..." -ForegroundColor Yellow
      $ngrok = Start-Process -FilePath $NgrokExe -ArgumentList @("http","3000") -WindowStyle Hidden -PassThru
      Start-Sleep -Seconds 6
      try {
        $t2 = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 5 -ErrorAction Stop
        $newUrl = ($t2.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1).public_url
        Write-Host "  ✅ ngrok restarted: $newUrl" -ForegroundColor Green
      } catch {}
    }
  }
} finally {
  Write-Host "`n  Shutting down..." -ForegroundColor DarkGray
  Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
  Stop-Process -Id $ngrok.Id  -ErrorAction SilentlyContinue
}
