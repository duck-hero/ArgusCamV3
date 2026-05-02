Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

function Wait-ForKey {
    Write-Host ""
    Write-Host "Press any key to close this window..." -ForegroundColor Cyan
    try {
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    catch {
        Read-Host "Press Enter to continue" | Out-Null
    }
}

$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath
$payloadZip = Join-Path $scriptDir "ArgusCamPayload.zip"

if (-not (Test-Path $payloadZip)) {
    Write-Host "Cannot find installer payload: $payloadZip" -ForegroundColor Red
    Wait-ForKey
    exit 1
}

if (-not (Test-Administrator)) {
    $arguments = @(
        "-NoProfile"
        "-ExecutionPolicy", "Bypass"
        "-File", "`"$scriptPath`""
    )

    $process = Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -Verb RunAs -Wait -PassThru
    exit $process.ExitCode
}

$workDir = Join-Path $env:TEMP ("ArgusCamInstaller_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workDir -Force | Out-Null

try {
    Expand-Archive -Path $payloadZip -DestinationPath $workDir -Force

    $installScript = Join-Path $workDir "Install-ArgusCamIis.ps1"
    if (-not (Test-Path $installScript)) {
        throw "Cannot find extracted installer script: $installScript"
    }

    $licenseKey = Read-Host "Enter ArgusCam license key"
    if ([string]::IsNullOrWhiteSpace($licenseKey)) {
        throw "License key is required for the customer installer."
    }

    & powershell.exe `
        -NoProfile `
        -ExecutionPolicy Bypass `
        -File $installScript `
        -LicenseKey $licenseKey.Trim() `
        -ConfigureStaticIp `
        -StaticHostOctet 5
    exit $LASTEXITCODE
}
catch {
    Write-Host ""
    Write-Host "Installer launcher failed: $($_.Exception.Message)" -ForegroundColor Red
    Wait-ForKey
    exit 1
}
finally {
    Remove-Item -Path $workDir -Recurse -Force -ErrorAction SilentlyContinue
}
