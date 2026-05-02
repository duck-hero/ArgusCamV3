Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

$scriptPath = $MyInvocation.MyCommand.Path
$scriptDir = Split-Path -Parent $scriptPath
$payloadZip = Join-Path $scriptDir "ArgusCamPayload.zip"

if (-not (Test-Path $payloadZip)) {
    throw "Cannot find installer payload: $payloadZip"
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
finally {
    Remove-Item -Path $workDir -Recurse -Force -ErrorAction SilentlyContinue
}
