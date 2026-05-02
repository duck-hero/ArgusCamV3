param(
    [string]$SiteName = "ArgusCam",
    [string]$AppPoolName = "ArgusCam",
    [string]$InstallRoot = "",
    [string]$PublicHostName = "app.arguscam.io.vn",
    [int]$HttpsPort = 443,
    [int]$LocalCallbackPort = 5176,
    [string]$LicenseKey = "",
    [string]$LicenseApiBaseUrl = "https://admin.arguscam.io.vn",
    [string]$CertificatePfxPath = "",
    [string]$CertificatePfxPassword = "",
    [switch]$ConfigureStaticIp,
    [int]$StaticHostOctet = 5,
    [switch]$OpenBrowserAfterInstall = $true
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)

    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
        throw "Please run Install-ArgusCamIis.ps1 as Administrator."
    }
}

function Enable-IisFeatures {
    $features = @(
        "IIS-WebServerRole",
        "IIS-WebServer",
        "IIS-CommonHttpFeatures",
        "IIS-StaticContent",
        "IIS-DefaultDocument",
        "IIS-HttpErrors",
        "IIS-HttpRedirect",
        "IIS-HealthAndDiagnostics",
        "IIS-HttpLogging",
        "IIS-Performance",
        "IIS-Security",
        "IIS-RequestFiltering",
        "IIS-ApplicationDevelopment",
        "IIS-NetFxExtensibility45",
        "IIS-ASPNET45",
        "IIS-ISAPIExtensions",
        "IIS-ISAPIFilter",
        "IIS-WebSockets",
        "IIS-ManagementConsole"
    )

    foreach ($feature in $features) {
        $state = (Get-WindowsOptionalFeature -Online -FeatureName $feature).State
        if ($state -ne "Enabled") {
            Write-Host "Enabling Windows feature: $feature"
            Enable-WindowsOptionalFeature -Online -FeatureName $feature -All -NoRestart | Out-Null
        }
    }
}

function Assert-AspNetCoreModule {
    Import-Module WebAdministration

    $module = Get-WebGlobalModule | Where-Object Name -eq "AspNetCoreModuleV2"
    return $null -ne $module
}

function Install-AspNetCoreHostingBundle {
    param([string]$BundleRootPath)

    $prereqRoot = Join-Path $BundleRootPath "prereqs"
    if (-not (Test-Path $prereqRoot)) {
        throw "AspNetCoreModuleV2 is missing and no prereqs folder was found in the installer bundle."
    }

    $installer = Get-ChildItem -Path $prereqRoot -Filter "dotnet-hosting-*.exe" -File | Sort-Object Name -Descending | Select-Object -First 1
    if ($null -eq $installer) {
        $installer = Get-ChildItem -Path $prereqRoot -Filter "dotnet-hosting*.exe" -File | Sort-Object Name -Descending | Select-Object -First 1
    }

    if ($null -eq $installer) {
        throw "AspNetCoreModuleV2 is missing and no ASP.NET Core Hosting Bundle installer was found in $prereqRoot."
    }

    Write-Host "Installing ASP.NET Core Hosting Bundle: $($installer.Name)"
    $process = Start-Process -FilePath $installer.FullName -ArgumentList "/install", "/quiet", "/norestart" -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "ASP.NET Core Hosting Bundle installer failed with exit code $($process.ExitCode)."
    }

    & iisreset | Out-Null
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

function Copy-ExistingSqliteDatabases {
    param(
        [string]$ExistingInstallRoot,
        [string]$BackupRoot
    )

    $existingDbRoot = Join-Path $ExistingInstallRoot "site\SqliteDb"
    if (-not (Test-Path $existingDbRoot)) {
        return $false
    }

    $databaseFiles = @(Get-ChildItem -Path $existingDbRoot -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "*.db" -or $_.Name -like "*.db-wal" -or $_.Name -like "*.db-shm" })
    if ($databaseFiles.Count -eq 0) {
        return $false
    }

    $backupDbRoot = Join-Path $BackupRoot "SqliteDb"
    New-Item -ItemType Directory -Path $backupDbRoot -Force | Out-Null

    foreach ($file in $databaseFiles) {
        Copy-Item -Path $file.FullName -Destination (Join-Path $backupDbRoot $file.Name) -Force
    }

    Write-Host "Preserved existing SQLite database files from $existingDbRoot" -ForegroundColor Green
    return $true
}

function Restore-SqliteDatabases {
    param(
        [string]$BackupRoot,
        [string]$TargetSitePath
    )

    $backupDbRoot = Join-Path $BackupRoot "SqliteDb"
    if (-not (Test-Path $backupDbRoot)) {
        return
    }

    $targetDbRoot = Join-Path $TargetSitePath "SqliteDb"
    New-Item -ItemType Directory -Path $targetDbRoot -Force | Out-Null

    Get-ChildItem -Path $backupDbRoot -File | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination (Join-Path $targetDbRoot $_.Name) -Force
    }

    Write-Host "Restored existing SQLite database files to $targetDbRoot" -ForegroundColor Green
}

function Remove-ExistingSite {
    param(
        [string]$ExistingSiteName,
        [string]$ExistingAppPoolName
    )

    Import-Module WebAdministration

    if (Test-Path "IIS:\Sites\$ExistingSiteName") {
        Stop-Website -Name $ExistingSiteName -ErrorAction SilentlyContinue
        Remove-Website -Name $ExistingSiteName
    }

    if (Test-Path "IIS:\AppPools\$ExistingAppPoolName") {
        Stop-WebAppPool -Name $ExistingAppPoolName -ErrorAction SilentlyContinue
        Remove-WebAppPool -Name $ExistingAppPoolName
    }
}

function Grant-AppPermissions {
    param(
        [string]$TargetPath,
        [string]$TargetAppPool
    )

    $identity = "IIS AppPool\$TargetAppPool"
    & icacls $TargetPath /grant "${identity}:(OI)(CI)M" /T /C | Out-Null

    if ($LASTEXITCODE -gt 0) {
        throw "Failed to grant folder permissions to $identity."
    }
}

function Get-PrimaryLanConfiguration {
    $configs = Get-NetIPConfiguration |
        Where-Object {
            $_.NetAdapter.Status -eq "Up" -and
            $_.IPv4Address -and
            $_.IPv4DefaultGateway
        }

    $config = $configs |
        Sort-Object {
            try {
                (Get-NetIPInterface -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4).InterfaceMetric
            }
            catch {
                9999
            }
        } |
        Select-Object -First 1

    if ($null -eq $config) {
        throw "Could not find an active LAN adapter with IPv4 address and default gateway."
    }

    $ipInterface = Get-NetIPInterface -InterfaceIndex $config.InterfaceIndex -AddressFamily IPv4
    $dnsServers = (Get-DnsClientServerAddress -InterfaceIndex $config.InterfaceIndex -AddressFamily IPv4).ServerAddresses

    return [pscustomobject]@{
        InterfaceAlias = $config.InterfaceAlias
        InterfaceIndex = $config.InterfaceIndex
        IPv4Address = $config.IPv4Address[0].IPAddress
        PrefixLength = $config.IPv4Address[0].PrefixLength
        Gateway = $config.IPv4DefaultGateway[0].NextHop
        DhcpEnabled = ($ipInterface.Dhcp -eq "Enabled")
        DnsServers = @($dnsServers)
    }
}

function Get-StaticIpForCurrentSubnet {
    param(
        [string]$CurrentIp,
        [int]$HostOctet
    )

    $parts = $CurrentIp.Split(".")
    if ($parts.Count -ne 4) {
        throw "Unsupported IPv4 address format: $CurrentIp"
    }

    if ($HostOctet -lt 2 -or $HostOctet -gt 254) {
        throw "StaticHostOctet must be between 2 and 254."
    }

    return "$($parts[0]).$($parts[1]).$($parts[2]).$HostOctet"
}

function Test-IpAddressInUse {
    param(
        [string]$IpAddress,
        [string]$CurrentIp
    )

    if ($IpAddress -eq $CurrentIp) {
        return $false
    }

    $pingReply = Test-Connection -ComputerName $IpAddress -Count 1 -Quiet -ErrorAction SilentlyContinue
    if ($pingReply) {
        return $true
    }

    $arpOutput = (& arp -a $IpAddress 2>$null) -join "`n"
    return $arpOutput -match [regex]::Escape($IpAddress)
}

function Set-StaticLanIpIfNeeded {
    param(
        [int]$HostOctet
    )

    $lan = Get-PrimaryLanConfiguration

    if (-not $lan.DhcpEnabled) {
        Write-Host "Primary LAN adapter already uses a static IPv4 address: $($lan.IPv4Address) ($($lan.InterfaceAlias))" -ForegroundColor Green
        return $lan.IPv4Address
    }

    $targetIp = Get-StaticIpForCurrentSubnet -CurrentIp $lan.IPv4Address -HostOctet $HostOctet

    if (Test-IpAddressInUse -IpAddress $targetIp -CurrentIp $lan.IPv4Address) {
        throw "Target static IP $targetIp appears to be in use. Choose another -StaticHostOctet or reserve the IP in the router."
    }

    Write-Host "Primary LAN adapter is DHCP: $($lan.IPv4Address) ($($lan.InterfaceAlias))" -ForegroundColor Yellow
    Write-Host "Changing it to static IP: $targetIp/$($lan.PrefixLength), gateway $($lan.Gateway)" -ForegroundColor Yellow

    Set-NetIPInterface -InterfaceIndex $lan.InterfaceIndex -AddressFamily IPv4 -Dhcp Disabled

    if ($targetIp -ne $lan.IPv4Address) {
        Get-NetIPAddress -InterfaceIndex $lan.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -ne $targetIp } |
            Remove-NetIPAddress -Confirm:$false -ErrorAction SilentlyContinue

        Get-NetRoute -InterfaceIndex $lan.InterfaceIndex -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
            Remove-NetRoute -Confirm:$false -ErrorAction SilentlyContinue

        New-NetIPAddress `
            -InterfaceIndex $lan.InterfaceIndex `
            -IPAddress $targetIp `
            -PrefixLength $lan.PrefixLength `
            -DefaultGateway $lan.Gateway | Out-Null
    }

    if ($lan.DnsServers.Count -gt 0) {
        Set-DnsClientServerAddress -InterfaceIndex $lan.InterfaceIndex -ServerAddresses $lan.DnsServers
    }
    else {
        Set-DnsClientServerAddress -InterfaceIndex $lan.InterfaceIndex -ServerAddresses @($lan.Gateway, "8.8.8.8")
    }

    return $targetIp
}

function Get-LicenseApiUrl {
    param(
        [string]$BaseUrl,
        [string]$Path
    )

    return "$($BaseUrl.TrimEnd([char]'/'))/$($Path.TrimStart([char]'/'))"
}

function Invoke-LicenseApiJson {
    param(
        [string]$BaseUrl,
        [string]$Path,
        [object]$Body
    )

    $url = Get-LicenseApiUrl -BaseUrl $BaseUrl -Path $Path
    $jsonBody = $Body | ConvertTo-Json -Depth 10

    return Invoke-RestMethod `
        -Method Post `
        -Uri $url `
        -ContentType "application/json" `
        -Body $jsonBody `
        -TimeoutSec 60
}

function Resolve-LicenseDeployment {
    param(
        [string]$BaseUrl,
        [string]$Key
    )

    if ([string]::IsNullOrWhiteSpace($Key)) {
        return $null
    }

    $normalizedKey = $Key.Trim().ToUpperInvariant()

    Write-Step "Checking ArgusCam license"
    $check = Invoke-LicenseApiJson `
        -BaseUrl $BaseUrl `
        -Path "/licenses/check" `
        -Body @{ license_key = $normalizedKey }

    if (-not $check.success) {
        throw "License API returned an unsuccessful response."
    }

    if (-not $check.result.valid) {
        throw "License is not active. Current status: $($check.result.status). Message: $($check.result.message)"
    }

    Write-Step "Resolving HTTPS certificate from license"
    $certInfo = Invoke-LicenseApiJson `
        -BaseUrl $BaseUrl `
        -Path "/licenses/cert/info" `
        -Body @{ license_key = $normalizedKey }

    if (-not $certInfo.success -or -not $certInfo.result.available -or [string]::IsNullOrWhiteSpace($certInfo.result.fqdn)) {
        throw "No active certificate is available for this license yet. Issue or renew the customer certificate in the backoffice, then run the installer again."
    }

    return [pscustomobject]@{
        LicenseKey = $normalizedKey
        PublicHostName = $certInfo.result.fqdn
        CertificateVersion = $certInfo.result.version
        CertificateFingerprint = $certInfo.result.fingerprint_sha256
        CertificateNotAfter = $certInfo.result.not_after
    }
}

function Save-LicenseCertificatePfx {
    param(
        [string]$BaseUrl,
        [string]$Key,
        [string]$DestinationPath
    )

    $url = Get-LicenseApiUrl -BaseUrl $BaseUrl -Path "/licenses/cert/download"
    $jsonBody = @{ license_key = $Key } | ConvertTo-Json -Depth 10

    New-Item -ItemType Directory -Path (Split-Path -Parent $DestinationPath) -Force | Out-Null

    $response = Invoke-WebRequest `
        -Method Post `
        -Uri $url `
        -ContentType "application/json" `
        -Body $jsonBody `
        -OutFile $DestinationPath `
        -PassThru `
        -TimeoutSec 180

    $password = $response.Headers["X-Cert-Password"]
    if ($password -is [array]) {
        $password = $password[0]
    }

    if ([string]::IsNullOrWhiteSpace($password)) {
        throw "License certificate download did not include the X-Cert-Password header."
    }

    return [pscustomobject]@{
        Path = $DestinationPath
        Password = [string]$password
        Version = $response.Headers["X-Cert-Version"]
        Fingerprint = $response.Headers["X-Cert-Fingerprint"]
    }
}

function Update-ArgusCamLicenseSettings {
    param(
        [string]$TargetSitePath,
        [string]$Key,
        [string]$BaseUrl
    )

    if ([string]::IsNullOrWhiteSpace($Key)) {
        return
    }

    $appsettingsPath = Join-Path $TargetSitePath "appsettings.json"
    if (-not (Test-Path $appsettingsPath)) {
        throw "Cannot find appsettings.json at $appsettingsPath"
    }

    $config = Get-Content -Path $appsettingsPath -Raw | ConvertFrom-Json
    if ($null -eq $config.License) {
        $config | Add-Member -MemberType NoteProperty -Name License -Value ([pscustomobject]@{})
    }

    if ($config.License.PSObject.Properties.Name -contains "Key") {
        $config.License.Key = $Key
    }
    else {
        $config.License | Add-Member -MemberType NoteProperty -Name Key -Value $Key
    }

    if ($config.License.PSObject.Properties.Name -contains "ApiBaseUrl") {
        $config.License.ApiBaseUrl = $BaseUrl.TrimEnd([char]'/')
    }
    else {
        $config.License | Add-Member -MemberType NoteProperty -Name ApiBaseUrl -Value $BaseUrl.TrimEnd([char]'/')
    }

    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($appsettingsPath, ($config | ConvertTo-Json -Depth 100), $encoding)
    Write-Host "Saved license settings to $appsettingsPath" -ForegroundColor Green
}

function Install-CertificateRenewalTask {
    param(
        [string]$TaskName,
        [string]$InstallRootPath,
        [string]$TargetSiteName,
        [string]$HostName,
        [int]$Port,
        [string]$BaseUrl,
        [string]$Key,
        [object]$InitialCertificate
    )

    if ([string]::IsNullOrWhiteSpace($Key)) {
        return
    }

    $scriptPath = Join-Path $InstallRootPath "Update-ArgusCamCertificate.ps1"
    $statePath = Join-Path $InstallRootPath "cert-renewal-state.json"
    $pfxPath = Join-Path $InstallRootPath "cert-renewal.pfx"

    $renewScript = @'
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$LicenseApiBaseUrl = "__LICENSE_API_BASE_URL__"
$LicenseKey = "__LICENSE_KEY__"
$SiteName = "__SITE_NAME__"
$HostName = "__HOST_NAME__"
$HttpsPort = __HTTPS_PORT__
$StatePath = "__STATE_PATH__"
$PfxPath = "__PFX_PATH__"

function Get-LicenseApiUrl {
    param([string]$BaseUrl, [string]$Path)
    return "$($BaseUrl.TrimEnd([char]'/'))/$($Path.TrimStart([char]'/'))"
}

function Invoke-LicenseApiJson {
    param([string]$Path, [object]$Body)
    $jsonBody = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method Post -Uri (Get-LicenseApiUrl -BaseUrl $LicenseApiBaseUrl -Path $Path) -ContentType "application/json" -Body $jsonBody -TimeoutSec 60
}

function Get-CurrentVersion {
    if (-not (Test-Path $StatePath)) {
        return 0
    }

    try {
        $state = Get-Content -Path $StatePath -Raw | ConvertFrom-Json
        if ($null -eq $state.version) {
            return 0
        }
        return [int]$state.version
    }
    catch {
        return 0
    }
}

$info = Invoke-LicenseApiJson -Path "/licenses/cert/info" -Body @{ license_key = $LicenseKey }
if (-not $info.success -or -not $info.result.available) {
    throw "No active certificate is available for this license."
}

if ($info.result.fqdn -ne $HostName) {
    throw "Certificate hostname changed from $HostName to $($info.result.fqdn). Re-run the installer to update IIS bindings and DNS guidance."
}

$currentVersion = Get-CurrentVersion
if ([int]$info.result.version -le $currentVersion) {
    return
}

$downloadUrl = Get-LicenseApiUrl -BaseUrl $LicenseApiBaseUrl -Path "/licenses/cert/download"
$downloadBody = @{ license_key = $LicenseKey; current_version = $currentVersion } | ConvertTo-Json -Depth 10
$response = Invoke-WebRequest -Method Post -Uri $downloadUrl -ContentType "application/json" -Body $downloadBody -OutFile $PfxPath -PassThru -TimeoutSec 180

$password = $response.Headers["X-Cert-Password"]
if ($password -is [array]) {
    $password = $password[0]
}

if ([string]::IsNullOrWhiteSpace($password)) {
    throw "Certificate download did not include the X-Cert-Password header."
}

$securePassword = ConvertTo-SecureString ([string]$password) -AsPlainText -Force
$certificate = Import-PfxCertificate -FilePath $PfxPath -CertStoreLocation "Cert:\LocalMachine\My" -Password $securePassword

Import-Module WebAdministration
$binding = Get-WebBinding -Name $SiteName -Protocol "https" |
    Where-Object { $_.bindingInformation -eq "*:${HttpsPort}:$HostName" } |
    Select-Object -First 1

if ($null -eq $binding) {
    throw "Could not find HTTPS binding for $SiteName on port $HttpsPort and host $HostName."
}

$binding.AddSslCertificate($certificate.Thumbprint, "my")

$state = [pscustomobject]@{
    version = [int]$response.Headers["X-Cert-Version"]
    fqdn = $response.Headers["X-Cert-Fqdn"]
    fingerprint = $response.Headers["X-Cert-Fingerprint"]
    notAfter = $response.Headers["X-Cert-Not-After"]
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$encoding = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($StatePath, ($state | ConvertTo-Json -Depth 10), $encoding)
Remove-Item -Path $PfxPath -Force -ErrorAction SilentlyContinue
'@

    $renewScript = $renewScript.Replace("__LICENSE_API_BASE_URL__", $BaseUrl.TrimEnd([char]'/'))
    $renewScript = $renewScript.Replace("__LICENSE_KEY__", $Key)
    $renewScript = $renewScript.Replace("__SITE_NAME__", $TargetSiteName)
    $renewScript = $renewScript.Replace("__HOST_NAME__", $HostName)
    $renewScript = $renewScript.Replace("__HTTPS_PORT__", [string]$Port)
    $renewScript = $renewScript.Replace("__STATE_PATH__", $statePath)
    $renewScript = $renewScript.Replace("__PFX_PATH__", $pfxPath)

    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($scriptPath, $renewScript, $encoding)

    if ($null -ne $InitialCertificate) {
        $state = [pscustomobject]@{
            version = [int]$InitialCertificate.CertificateVersion
            fqdn = $HostName
            fingerprint = $InitialCertificate.CertificateFingerprint
            notAfter = $InitialCertificate.CertificateNotAfter
            updatedAt = (Get-Date).ToUniversalTime().ToString("o")
        }
        [System.IO.File]::WriteAllText($statePath, ($state | ConvertTo-Json -Depth 10), $encoding)
    }

    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 3am
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Principal $principal `
        -Settings $settings `
        -Force | Out-Null

    Write-Host "Registered certificate renewal task: $TaskName" -ForegroundColor Green
}

function Get-ArgusCamCertificate {
    param(
        [string]$HostName,
        [string]$PfxPath,
        [string]$PfxPassword
    )

    if (-not [string]::IsNullOrWhiteSpace($PfxPath) -and (Test-Path $PfxPath)) {
        Write-Host "Importing HTTPS certificate from $PfxPath" -ForegroundColor Green
        $securePassword = ConvertTo-SecureString $PfxPassword -AsPlainText -Force
        return Import-PfxCertificate `
            -FilePath $PfxPath `
            -CertStoreLocation "Cert:\LocalMachine\My" `
            -Password $securePassword
    }

    $friendlyName = "ArgusCam IIS $HostName"
    $existingCertificate = Get-ChildItem -Path Cert:\LocalMachine\My |
        Where-Object {
            $dnsNames = @($_.DnsNameList | ForEach-Object { $_.Unicode })
            ($_.FriendlyName -eq $friendlyName -or $_.Subject -eq "CN=$HostName" -or $dnsNames -contains $HostName) -and
            $_.NotAfter -gt (Get-Date).AddDays(30) -and
            $_.HasPrivateKey
        } |
        Sort-Object NotAfter -Descending |
        Select-Object -First 1

    if ($null -ne $existingCertificate) {
        return $existingCertificate
    }

    Write-Host "No trusted PFX certificate found. Creating a self-signed fallback certificate for $HostName." -ForegroundColor Yellow
    Write-Host "Browsers will warn unless clients trust this certificate." -ForegroundColor Yellow

    $certificate = New-SelfSignedCertificate `
        -DnsName $HostName `
        -CertStoreLocation "Cert:\LocalMachine\My" `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -NotAfter (Get-Date).AddYears(5)

    $certificate.FriendlyName = $friendlyName
    return $certificate
}

function New-ArgusCamSite {
    param(
        [string]$TargetSiteName,
        [string]$TargetAppPoolName,
        [string]$PhysicalPath,
        [int]$HttpsPort,
        [int]$LocalCallbackPort,
        [string]$PublicHostName,
        [string]$CertificateThumbprint
    )

    Import-Module WebAdministration

    New-WebAppPool -Name $TargetAppPoolName | Out-Null
    Set-ItemProperty "IIS:\AppPools\$TargetAppPoolName" -Name managedRuntimeVersion -Value ""
    Set-ItemProperty "IIS:\AppPools\$TargetAppPoolName" -Name managedPipelineMode -Value "Integrated"
    Set-ItemProperty "IIS:\AppPools\$TargetAppPoolName" -Name processModel.identityType -Value "ApplicationPoolIdentity"

    New-Website `
        -Name $TargetSiteName `
        -PhysicalPath $PhysicalPath `
        -Port $LocalCallbackPort `
        -ApplicationPool $TargetAppPoolName | Out-Null

    New-WebBinding `
        -Name $TargetSiteName `
        -Protocol "https" `
        -Port $HttpsPort `
        -HostHeader $PublicHostName `
        -SslFlags 1 | Out-Null

    $httpsBinding = Get-WebBinding -Name $TargetSiteName -Protocol "https" |
        Where-Object { $_.bindingInformation -eq "*:${HttpsPort}:$PublicHostName" } |
        Select-Object -First 1

    if ($null -eq $httpsBinding) {
        throw "Could not find HTTPS binding for $TargetSiteName on port $HttpsPort."
    }

    $httpsBinding.AddSslCertificate($CertificateThumbprint, "my")
}

function Ensure-FirewallRule {
    param(
        [int]$Port
    )

    $ruleName = "ArgusCam Site $Port"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($null -ne $existingRule) {
        return
    }

    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $Port | Out-Null
}

Assert-Administrator

if ($ConfigureStaticIp) {
    Write-Step "Configuring static LAN IP"
    $lanIp = Set-StaticLanIpIfNeeded -HostOctet $StaticHostOctet
}
else {
    $lanIp = (Get-PrimaryLanConfiguration).IPv4Address
}

$bundleRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceSitePath = Join-Path $bundleRoot "site"

if (-not (Test-Path $sourceSitePath)) {
    throw "Cannot find the site payload at $sourceSitePath"
}

$licenseDeployment = Resolve-LicenseDeployment `
    -BaseUrl $LicenseApiBaseUrl `
    -Key $LicenseKey

if ($null -ne $licenseDeployment) {
    $LicenseKey = $licenseDeployment.LicenseKey
    $PublicHostName = $licenseDeployment.PublicHostName
    $downloadedPfxPath = Join-Path ([System.IO.Path]::GetTempPath()) ("ArgusCamCert_" + [guid]::NewGuid().ToString("N") + ".pfx")
    $downloadedPfx = Save-LicenseCertificatePfx `
        -BaseUrl $LicenseApiBaseUrl `
        -Key $licenseDeployment.LicenseKey `
        -DestinationPath $downloadedPfxPath

    $CertificatePfxPath = $downloadedPfx.Path
    $CertificatePfxPassword = $downloadedPfx.Password

    Write-Host "License certificate: $PublicHostName v$($licenseDeployment.CertificateVersion), expires $($licenseDeployment.CertificateNotAfter)" -ForegroundColor Green
}

if ([string]::IsNullOrWhiteSpace($CertificatePfxPath)) {
    $defaultCertificatePath = Join-Path $bundleRoot "certs\$PublicHostName.pfx"
    if (Test-Path $defaultCertificatePath) {
        $CertificatePfxPath = $defaultCertificatePath
    }
}

if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
    $InstallRoot = Join-Path $env:ProgramFiles "ArgusCam"
}

$targetSitePath = Join-Path $InstallRoot "site"
$preserveRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ArgusCamPreserve_" + [guid]::NewGuid().ToString("N"))
$preservedDatabase = $false

Write-Step "Enabling IIS"
Enable-IisFeatures

Write-Step "Checking ASP.NET Core IIS module"
if (-not (Assert-AspNetCoreModule)) {
    Write-Step "Installing ASP.NET Core Hosting Bundle"
    Install-AspNetCoreHostingBundle -BundleRootPath $bundleRoot

    if (-not (Assert-AspNetCoreModule)) {
        throw "AspNetCoreModuleV2 is still missing after installing the hosting bundle."
    }
}

Write-Step "Removing old IIS site if it exists"
Remove-ExistingSite -ExistingSiteName $SiteName -ExistingAppPoolName $AppPoolName

Write-Step "Preserving existing SQLite database if present"
$preservedDatabase = Copy-ExistingSqliteDatabases -ExistingInstallRoot $InstallRoot -BackupRoot $preserveRoot

Write-Step "Replacing old install files"
if (Test-Path $InstallRoot) {
    try {
        Remove-Item -Path $InstallRoot -Recurse -Force
    }
    catch {
        throw "Could not replace files in $InstallRoot. Close any explorer window opened in that folder, then run the installer again. Details: $($_.Exception.Message)"
    }
}

New-Item -ItemType Directory -Path $targetSitePath -Force | Out-Null
Invoke-Robocopy -Source $sourceSitePath -Destination $targetSitePath
if ($preservedDatabase) {
    Restore-SqliteDatabases -BackupRoot $preserveRoot -TargetSitePath $targetSitePath
}
Remove-Item -Path $preserveRoot -Recurse -Force -ErrorAction SilentlyContinue

Update-ArgusCamLicenseSettings `
    -TargetSitePath $targetSitePath `
    -Key $LicenseKey `
    -BaseUrl $LicenseApiBaseUrl

$url = if ($HttpsPort -eq 443) { "https://$PublicHostName" } else { "https://${PublicHostName}:$HttpsPort" }
$localSiteUrl = "http://localhost:$LocalCallbackPort"
$localCallbackUrl = "http://localhost:$LocalCallbackPort/api/google-drive/callback"

Write-Step "Creating IIS app pool and site"
$certificate = Get-ArgusCamCertificate `
    -HostName $PublicHostName `
    -PfxPath $CertificatePfxPath `
    -PfxPassword $CertificatePfxPassword
New-ArgusCamSite `
    -TargetSiteName $SiteName `
    -TargetAppPoolName $AppPoolName `
    -PhysicalPath $targetSitePath `
    -HttpsPort $HttpsPort `
    -LocalCallbackPort $LocalCallbackPort `
    -PublicHostName $PublicHostName `
    -CertificateThumbprint $certificate.Thumbprint

if ($null -ne $licenseDeployment -and (Test-Path $CertificatePfxPath)) {
    Remove-Item -Path $CertificatePfxPath -Force -ErrorAction SilentlyContinue
}

Install-CertificateRenewalTask `
    -TaskName "$SiteName Certificate Renewal" `
    -InstallRootPath $InstallRoot `
    -TargetSiteName $SiteName `
    -HostName $PublicHostName `
    -Port $HttpsPort `
    -BaseUrl $LicenseApiBaseUrl `
    -Key $LicenseKey `
    -InitialCertificate $licenseDeployment

Write-Step "Opening Windows Firewall port"
Ensure-FirewallRule -Port $HttpsPort

Write-Step "Granting write permissions"
Grant-AppPermissions -TargetPath $InstallRoot -TargetAppPool $AppPoolName

Start-Website -Name $SiteName

Write-Host ""
Write-Host "ArgusCam IIS deployment completed." -ForegroundColor Green
Write-Host "Install root: $InstallRoot" -ForegroundColor Green
Write-Host "LAN site URL: $url" -ForegroundColor Green
Write-Host "Router DNS mapping: $PublicHostName -> $lanIp" -ForegroundColor Green
Write-Host "Local site URL: $localSiteUrl" -ForegroundColor Green
Write-Host "Local Google callback URL: $localCallbackUrl" -ForegroundColor Green

if ($OpenBrowserAfterInstall) {
    Start-Process $url
}
