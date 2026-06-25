#Requires -Version 5.1
<#
.SYNOPSIS
    DevFlow AI CLI - Windows Installer
.DESCRIPTION
    Installs DevFlow CLI globally via npm so you can run `devflow` from any terminal.
    Requires Node.js >= 18 and npm.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step ($msg) { Write-Host "  -> $msg" -ForegroundColor Cyan }
function Write-Ok   ($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail ($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Warn ($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Write-Header ($msg) {
    Write-Host ""
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "  $('-' * 50)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host "       DevFlow AI CLI Installer        " -ForegroundColor Cyan
Write-Host "   AI-powered Git + Azure DevOps CLI   " -ForegroundColor Cyan
Write-Host "  =====================================" -ForegroundColor Cyan
Write-Host ""

# --- Prerequisites ------------------------------------------------------------

Write-Header "Checking prerequisites"

# Node.js
$nodeOk = $false
try {
    $nodeRaw = & node --version 2>&1
    $nodeVersion = $nodeRaw.ToString().TrimStart('v')
    $major = [int]($nodeVersion.Split('.')[0])
    if ($major -lt 18) {
        Write-Fail "Node.js >= 18 required. Found: v$nodeVersion"
        Write-Warn "Download from: https://nodejs.org"
        exit 1
    }
    Write-Ok "Node.js v$nodeVersion"
    $nodeOk = $true
} catch {
    Write-Fail "Node.js not found. Install from: https://nodejs.org"
    exit 1
}

# npm
try {
    $npmRaw = & npm --version 2>&1
    Write-Ok "npm v$($npmRaw.ToString().Trim())"
} catch {
    Write-Fail "npm not found. It should come with Node.js."
    exit 1
}

# git
try {
    $gitRaw = & git --version 2>&1
    Write-Ok $gitRaw.ToString().Trim()
} catch {
    Write-Warn "git not found. DevFlow requires git to work."
    Write-Warn "Download from: https://git-scm.com/download/win"
}

# --- Build & Install ----------------------------------------------------------

Write-Header "Building & installing"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Step "Installing npm dependencies..."
& npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Fail "npm install failed"
    exit 1
}
Write-Ok "Dependencies installed"

Write-Step "Building TypeScript..."
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Build failed"
    exit 1
}
Write-Ok "Build complete"

Write-Step "Installing globally (npm install -g .)..."
& npm install -g .
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Global install failed. Try running as Administrator."
    exit 1
}
Write-Ok "DevFlow installed globally"

# --- .env Setup ---------------------------------------------------------------

Write-Header "Environment setup"

$envFile = Join-Path $scriptDir ".env"
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $scriptDir ".env.example") $envFile
    Write-Ok ".env created from .env.example"
    Write-Warn "Edit .env and add your API keys:"
    Write-Warn "  $envFile"
} else {
    Write-Ok ".env already exists - skipping"
}

# --- Verify -------------------------------------------------------------------

Write-Header "Verifying installation"

try {
    $ver = & devflow --version 2>&1
    Write-Ok "devflow $($ver.ToString().Trim()) is installed and working"
} catch {
    Write-Warn "Could not verify. Restart your terminal and try: devflow --version"
}

# --- Done ---------------------------------------------------------------------

Write-Host ""
Write-Host "  =====================================" -ForegroundColor Green
Write-Host "       Installation Complete!          " -ForegroundColor Green
Write-Host "  =====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Usage:" -ForegroundColor White
Write-Host "    devflow status    # check repo + integrations" -ForegroundColor Gray
Write-Host "    devflow commit    # analyze + propose + approve" -ForegroundColor Gray
Write-Host "    devflow pr        # generate Pull Request" -ForegroundColor Gray
Write-Host "    devflow flow      # full pipeline" -ForegroundColor Gray
Write-Host ""
Write-Host "  Next: edit .env with your API keys" -ForegroundColor Yellow
Write-Host "    $envFile" -ForegroundColor Gray
Write-Host ""
