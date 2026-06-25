#Requires -Version 5.1
<#
.SYNOPSIS
    DevFlow AI CLI - Windows Uninstaller
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step ($msg) { Write-Host "  -> $msg" -ForegroundColor Cyan }
function Write-Ok   ($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "  DevFlow AI CLI - Uninstaller" -ForegroundColor Cyan
Write-Host "  $('-' * 40)" -ForegroundColor DarkGray
Write-Host ""

Write-Step "Removing global npm package..."
& npm uninstall -g devflow-cli
if ($LASTEXITCODE -eq 0) {
    Write-Ok "devflow-cli removed from global npm"
} else {
    Write-Fail "Uninstall failed (may already be removed)"
}

Write-Host ""
Write-Host "  [OK] DevFlow CLI uninstalled." -ForegroundColor Green
Write-Host "  Your .env file and project files were NOT deleted." -ForegroundColor Gray
Write-Host ""
