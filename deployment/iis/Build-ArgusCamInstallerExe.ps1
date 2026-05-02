param(
    [string]$Configuration = "Release",
    [string]$Runtime = "win-x64",
    [string]$OutputName = "ArgusCam-Installer.exe",
    [switch]$DownloadHostingBundleIfMissing = $true
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-IExpressPath {
    $candidates = @(
        (Join-Path $env:SystemRoot "System32\iexpress.exe"),
        (Join-Path $env:SystemRoot "SysWOW64\iexpress.exe")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw "IExpress was not found on this machine."
}

function New-SedFile {
    param(
        [string]$SedPath,
        [string]$StageRoot,
        [string]$TargetExe
    )

    $fileMap = [ordered]@{
        FILE0 = "ArgusCamPayload.zip"
        FILE1 = "Run-ArgusCamInstaller.cmd"
        FILE2 = "Start-ArgusCamInstaller.ps1"
    }

    $strings = foreach ($key in $fileMap.Keys) {
        "$key=""$($fileMap[$key])"""
    }

    $sourceFiles = foreach ($key in $fileMap.Keys) {
        "%$key%="
    }

    $content = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=1
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=ArgusCam installer has finished extracting and started setup.
TargetName=$TargetExe
FriendlyName=ArgusCam Installer
AppLaunched=Run-ArgusCamInstaller.cmd
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$StageRoot
[SourceFiles0]
$($sourceFiles -join [Environment]::NewLine)
[Strings]
$($strings -join [Environment]::NewLine)
"@

    $encoding = [System.Text.Encoding]::Default
    [System.IO.File]::WriteAllText($SedPath, $content, $encoding)
}

function Invoke-NativeCommand {
    param(
        [scriptblock]$Command,
        [string]$FailureMessage
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage Exit code: $LASTEXITCODE"
    }
}

function Resolve-TargetExePath {
    param(
        [string]$OutputDirectory,
        [string]$PreferredName
    )

    $preferredPath = Join-Path $OutputDirectory $PreferredName
    if (-not (Test-Path $preferredPath)) {
        return $preferredPath
    }

    try {
        Remove-Item -Path $preferredPath -Force -ErrorAction Stop
        return $preferredPath
    }
    catch {
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($PreferredName)
        $extension = [System.IO.Path]::GetExtension($PreferredName)
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        return Join-Path $OutputDirectory "$baseName-$timestamp$extension"
    }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptRoot)

$bundleScript = Join-Path $scriptRoot "Build-ArgusCamIisBundle.ps1"
$installerTemplateRoot = Join-Path $scriptRoot "installer"
$bundleRoot = Join-Path $repoRoot "artifacts/iis-bundle"
$outputRoot = Join-Path $repoRoot "artifacts/installer-exe"
$iexpressPath = Get-IExpressPath
$bundleArguments = @(
    "-NoProfile"
    "-ExecutionPolicy", "Bypass"
    "-File", $bundleScript
    "-Configuration", $Configuration
    "-Runtime", $Runtime
)

if ($DownloadHostingBundleIfMissing) {
    $bundleArguments += "-DownloadHostingBundleIfMissing"
}

Write-Step "Building IIS deployment bundle"
Invoke-NativeCommand -FailureMessage "Build-ArgusCamIisBundle.ps1 failed." -Command {
    powershell.exe @bundleArguments
}

if (-not (Test-Path $bundleRoot)) {
    throw "Bundle root was not created: $bundleRoot"
}

Write-Step "Preparing installer staging area"
$buildStamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$iexpressWorkRoot = Join-Path ([System.IO.Path]::GetTempPath()) "ArgusCamIExpress-$buildStamp"
$stageRoot = Join-Path $iexpressWorkRoot "stage"
$payloadZip = Join-Path $stageRoot "ArgusCamPayload.zip"
$targetExe = Resolve-TargetExePath -OutputDirectory $outputRoot -PreferredName $OutputName
$iexpressTargetExe = Join-Path $iexpressWorkRoot $OutputName
$sedPath = Join-Path $iexpressWorkRoot "ArgusCamInstaller.sed"
$diagnosticSedPath = Join-Path $outputRoot "ArgusCamInstaller-$buildStamp.sed"

if (Test-Path $iexpressWorkRoot) {
    Remove-Item -Path $iexpressWorkRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $iexpressWorkRoot -Force | Out-Null
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

Write-Step "Creating compressed payload"
Compress-Archive -Path (Join-Path $bundleRoot "*") -DestinationPath $payloadZip -CompressionLevel Optimal

Copy-Item (Join-Path $installerTemplateRoot "Run-ArgusCamInstaller.cmd") (Join-Path $stageRoot "Run-ArgusCamInstaller.cmd") -Force
Copy-Item (Join-Path $installerTemplateRoot "Start-ArgusCamInstaller.ps1") (Join-Path $stageRoot "Start-ArgusCamInstaller.ps1") -Force

Write-Step "Generating IExpress definition"
New-SedFile -SedPath $sedPath -StageRoot $stageRoot -TargetExe $iexpressTargetExe
Copy-Item $sedPath $diagnosticSedPath -Force

Write-Step "Building installer EXE"
Write-Host "IExpress can take several minutes because it repacks the deployment payload." -ForegroundColor DarkGray
Invoke-NativeCommand -FailureMessage "IExpress failed to build the installer EXE." -Command {
    & $iexpressPath /N $sedPath | Out-Null
}

if (-not (Test-Path $iexpressTargetExe)) {
    throw "Installer EXE was not created: $iexpressTargetExe"
}

Move-Item -Path $iexpressTargetExe -Destination $targetExe -Force

Write-Host ""
Write-Host "Installer created at: $targetExe" -ForegroundColor Green
