param(
    [string]$Configuration = "Release",
    [string]$Runtime = "win-x64",
    [switch]$DownloadHostingBundleIfMissing = $true
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Robocopy {
    param(
        [string]$Source,
        [string]$Destination
    )

    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    & robocopy $Source $Destination /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS /NP | Out-Null

    if ($LASTEXITCODE -ge 8) {
        throw "robocopy failed with exit code $LASTEXITCODE."
    }
}

function Invoke-NativeCommand {
    param(
        [scriptblock]$Command,
        [string]$FailureMessage
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

function Get-HostingBundleDownloadInfo {
    return @{
        FileName = "dotnet-hosting-9.0.13-win.exe"
        DownloadUrl = "https://builds.dotnet.microsoft.com/dotnet/aspnetcore/Runtime/9.0.13/dotnet-hosting-9.0.13-win.exe"
        SourcePage = "https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/runtime-aspnetcore-9.0.13-windows-hosting-bundle-installer"
        VerifiedOn = "2026-03-08"
    }
}

function Ensure-HostingBundlePrereq {
    param([string]$TargetPrereqRoot)

    $existingInstaller = Get-ChildItem -Path $TargetPrereqRoot -Filter "dotnet-hosting*.exe" -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $existingInstaller) {
        return
    }

    if (-not $DownloadHostingBundleIfMissing) {
        Write-Host "No hosting bundle found in prereqs and auto-download is disabled." -ForegroundColor Yellow
        return
    }

    $downloadInfo = Get-HostingBundleDownloadInfo
    $targetFile = Join-Path $TargetPrereqRoot $downloadInfo.FileName

    Write-Host "Downloading ASP.NET Core Hosting Bundle $($downloadInfo.FileName)" -ForegroundColor Yellow
    Write-Host "Official source: $($downloadInfo.SourcePage) (verified $($downloadInfo.VerifiedOn))" -ForegroundColor Yellow

    try {
        Invoke-WebRequest -Uri $downloadInfo.DownloadUrl -OutFile $targetFile -UseBasicParsing
    }
    catch {
        Write-Host "Auto-download failed. You can place the hosting bundle manually into $TargetPrereqRoot." -ForegroundColor Yellow
        throw
    }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptRoot)

$clientRoot = Join-Path $repoRoot "src/ArgusCam.Client"
$apiProject = Join-Path $repoRoot "src/ArgusCam.Api/ArgusCam.Api.csproj"

$bundleRoot = Join-Path $repoRoot "artifacts/iis-bundle"
$siteRoot = Join-Path $bundleRoot "site"
$prereqRoot = Join-Path $bundleRoot "prereqs"
$publishTemp = Join-Path $bundleRoot "_publish-api"
${sourcePrereqRoot} = Join-Path $scriptRoot "prereqs"

Write-Step "Cleaning old bundle"
if (Test-Path $bundleRoot) {
    Remove-Item -Path $bundleRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $bundleRoot -Force | Out-Null

Write-Step "Building React client"
Push-Location $clientRoot
try {
    $vitePath = Join-Path $clientRoot "node_modules\vite\bin\vite.js"
    if (-not (Test-Path $vitePath)) {
        Write-Step "Restoring frontend dependencies"
        Invoke-NativeCommand -Command { npm install } -FailureMessage "npm install failed."
    }

    Invoke-NativeCommand -Command { npm run build } -FailureMessage "npm run build failed."
}
finally {
    Pop-Location
}

Write-Step "Publishing API"
Invoke-NativeCommand -FailureMessage "dotnet publish for API failed." -Command {
    dotnet publish $apiProject `
        -c $Configuration `
        -r $Runtime `
        --self-contained true `
        /p:PublishSingleFile=false `
        /p:UseAppHost=true `
        -o $publishTemp
}

Write-Step "Assembling IIS bundle"
Invoke-Robocopy -Source $publishTemp -Destination $siteRoot

Write-Step "Copying offline prerequisites"
New-Item -ItemType Directory -Path $prereqRoot -Force | Out-Null

if (Test-Path $sourcePrereqRoot) {
    Invoke-Robocopy -Source $sourcePrereqRoot -Destination $prereqRoot
}
else {
    Write-Host "No local prereqs folder found at $sourcePrereqRoot. Bundle will be created without offline installers." -ForegroundColor Yellow
}

Ensure-HostingBundlePrereq -TargetPrereqRoot $prereqRoot

Copy-Item (Join-Path $scriptRoot "Install-ArgusCamIis.ps1") (Join-Path $bundleRoot "Install-ArgusCamIis.ps1") -Force
Copy-Item (Join-Path $scriptRoot "README.md") (Join-Path $bundleRoot "README.md") -Force

if (Test-Path $publishTemp) {
    Remove-Item -Path $publishTemp -Recurse -Force
}

Write-Host ""
Write-Host "Bundle created at: $bundleRoot" -ForegroundColor Green
Write-Host "Run Install-ArgusCamIis.ps1 as Administrator on the target machine." -ForegroundColor Green
