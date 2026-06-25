#Requires -Version 5.1
<#
.SYNOPSIS
    DevFlow AI CLI - Standalone EXE Installer (no Node.js required)
.DESCRIPTION
    Copies devflow.exe to a permanent folder and adds it to the user's PATH.
    The .exe includes a bundled Node.js runtime - no installation prerequisites.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step ($msg) { Write-Host "  -> $msg" -ForegroundColor Cyan }
function Write-Ok   ($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }
function Write-Warn ($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "   DevFlow AI CLI - EXE Installer      " -ForegroundColor Cyan
Write-Host "   Standalone - No Node.js required    " -ForegroundColor Cyan
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$exeSource  = Join-Path $scriptDir "devflow.exe"
$installDir = "$env:LOCALAPPDATA\devflow-cli"
$exeDest    = Join-Path $installDir "devflow.exe"

# --- Verify source exe --------------------------------------------------------

if (-not (Test-Path $exeSource)) {
    Write-Fail "devflow.exe not found in $scriptDir. Run 'npm run build:exe' first."
}
Write-Ok "devflow.exe found ($([math]::Round((Get-Item $exeSource).Length/1MB, 1)) MB)"

# --- Create install directory -------------------------------------------------

Write-Step "Installing to: $installDir"
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}
Copy-Item $exeSource $exeDest -Force
Write-Ok "Copied devflow.exe"

# --- Add to PATH (User scope, no admin required) ------------------------------

Write-Step "Adding to PATH..."
$userPath = [Environment]::GetEnvironmentVariable('PATH', 'User')

if ($userPath -notlike "*$installDir*") {
    $newPath = "$userPath;$installDir"
    [Environment]::SetEnvironmentVariable('PATH', $newPath, 'User')
    Write-Ok "Added to user PATH"
    Write-Warn "Restart your terminal for PATH changes to take effect."
} else {
    Write-Ok "Already in PATH"
}

# Update current session PATH immediately
$env:PATH = "$env:PATH;$installDir"

# --- .env Setup ---------------------------------------------------------------

Write-Host ""
Write-Host "  Environment setup" -ForegroundColor Cyan
Write-Host "  $('-' * 40)" -ForegroundColor DarkGray

$envDest = Join-Path $installDir ".env"
if (-not (Test-Path $envDest)) {
    $envExample = Join-Path $scriptDir ".env.example"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envDest
        Write-Ok ".env created at $envDest"
    } else {
        Write-Warn "Create a .env file at: $envDest"
        Write-Warn "See .env.example for required variables."
    }
    Write-Warn "Edit the .env file and add your LLM API keys."
} else {
    Write-Ok ".env already exists"
}

# --- Verify -------------------------------------------------------------------

Write-Host ""
Write-Host "  Verifying installation" -ForegroundColor Cyan
Write-Host "  $('-' * 40)" -ForegroundColor DarkGray

try {
    $ver = & $exeDest --version 2>&1
    Write-Ok "devflow $($ver.ToString().Trim()) installed at $exeDest"
} catch {
    Write-Warn "Verification failed. Try: $exeDest --version"
}

# --- Done ---------------------------------------------------------------------

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Green
Write-Host "       Installation Complete!          " -ForegroundColor Green
Write-Host "  =====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Usage (after restarting terminal):" -ForegroundColor White
Write-Host "    devflow status" -ForegroundColor Gray
Write-Host "    devflow commit" -ForegroundColor Gray
Write-Host "    devflow flow" -ForegroundColor Gray
Write-Host ""
Write-Host "  Edit your API keys:" -ForegroundColor Yellow
Write-Host "    $envDest" -ForegroundColor Gray
Write-Host ""
Write-Host "  To uninstall:" -ForegroundColor White
Write-Host "    Remove-Item -Recurse $installDir" -ForegroundColor Gray
Write-Host "    Then remove $installDir from your user PATH" -ForegroundColor Gray
Write-Host ""
