param(
    [string]$SiteName = "ArgusCam",
    [string]$AppPoolName = "ArgusCam",
    [string]$InstallRoot = "",
    [string]$PublicHostName = "",
    [int]$HttpsPort = 443,
    [int]$LocalCallbackPort = 5176,
    [string]$LicenseKey = "",
    [string]$LicenseApiBaseUrl = "https://admin.arguscam.io.vn",
    [switch]$ConfigureStaticIp,
    [int]$StaticHostOctet = 5,
    [switch]$OpenBrowserAfterInstall = $true,
    [switch]$NoPauseOnExit
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Wait-ForKey {
    if ($NoPauseOnExit) { return }
    Write-Host ""
    Write-Host "Press any key to close this window..." -ForegroundColor Cyan
    try {
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    catch {
        # fallback for non-interactive hosts
        Read-Host "Press Enter to continue" | Out-Null
    }
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

function Test-ArgusCamLicense {
    param(
        [string]$BaseUrl,
        [string]$Key
    )

    if ([string]::IsNullOrWhiteSpace($Key)) {
        return $null
    }

    $normalizedKey = $Key.Trim().ToUpperInvariant()
    Write-Step "Checking ArgusCam license"

    $url = Get-LicenseApiUrl -BaseUrl $BaseUrl -Path "/licenses/check"
    $jsonBody = @{ license_key = $normalizedKey } | ConvertTo-Json -Depth 5

    $check = Invoke-RestMethod `
        -Method Post `
        -Uri $url `
        -ContentType "application/json" `
        -Body $jsonBody `
        -TimeoutSec 60

    if (-not $check.success) {
        throw "License API returned an unsuccessful response."
    }

    if (-not $check.result.valid) {
        throw "License is not active. Current status: $($check.result.status). Message: $($check.result.message)"
    }

    Write-Host "License OK ($($check.result.status))." -ForegroundColor Green

    return [pscustomobject]@{
        NormalizedKey = $normalizedKey
        Customer = $check.result.customer
    }
}

function Register-CloudflareDns {
    param(
        [string]$BaseUrl,
        [string]$Key,
        [string]$Ip
    )

    Write-Step "Registering Cloudflare DNS for this LAN IP"

    $url = Get-LicenseApiUrl -BaseUrl $BaseUrl -Path "/licenses/register-dns"
    $jsonBody = @{ license_key = $Key; ip = $Ip } | ConvertTo-Json -Depth 5

    $response = Invoke-RestMethod `
        -Method Post `
        -Uri $url `
        -ContentType "application/json" `
        -Body $jsonBody `
        -TimeoutSec 60

    if (-not $response.success) {
        throw "register-dns API returned an unsuccessful response."
    }

    $action = if ($response.result.created) { "created" } else { "updated" }
    Write-Host "DNS A record ${action}: $($response.result.fqdn) -> $Ip" -ForegroundColor Green

    return [string]$response.result.fqdn
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

function Get-ArgusCamCertificate {
    param(
        [string]$HostName
    )

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
        Write-Host "Reusing existing self-signed certificate for $HostName (valid until $($existingCertificate.NotAfter))." -ForegroundColor Green
        return $existingCertificate
    }

    Write-Host "Creating self-signed certificate for $HostName." -ForegroundColor Yellow
    Write-Host "Browsers will warn the first time you visit; tap 'Proceed' / 'Accept the risk' once and the warning will not show again on that device." -ForegroundColor Yellow

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

try {
    Assert-Administrator

    if ([string]::IsNullOrWhiteSpace($LicenseKey)) {
        throw "License key is required (-LicenseKey)."
    }

    $licenseInfo = Test-ArgusCamLicense -BaseUrl $LicenseApiBaseUrl -Key $LicenseKey
    $LicenseKey = $licenseInfo.NormalizedKey

    if ($ConfigureStaticIp) {
        Write-Step "Configuring static LAN IP"
        $lanIp = Set-StaticLanIpIfNeeded -HostOctet $StaticHostOctet
    }
    else {
        $lanIp = (Get-PrimaryLanConfiguration).IPv4Address
        Write-Host "Using current LAN IP: $lanIp" -ForegroundColor Green
    }

    $resolvedFqdn = Register-CloudflareDns `
        -BaseUrl $LicenseApiBaseUrl `
        -Key $LicenseKey `
        -Ip $lanIp

    if (-not [string]::IsNullOrWhiteSpace($PublicHostName) -and $PublicHostName -ne $resolvedFqdn) {
        Write-Host "Ignoring -PublicHostName '$PublicHostName'; license DNS resolved to '$resolvedFqdn'." -ForegroundColor Yellow
    }
    $PublicHostName = $resolvedFqdn

    $bundleRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $sourceSitePath = Join-Path $bundleRoot "site"

    if (-not (Test-Path $sourceSitePath)) {
        throw "Cannot find the site payload at $sourceSitePath"
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
    $certificate = Get-ArgusCamCertificate -HostName $PublicHostName
    New-ArgusCamSite `
        -TargetSiteName $SiteName `
        -TargetAppPoolName $AppPoolName `
        -PhysicalPath $targetSitePath `
        -HttpsPort $HttpsPort `
        -LocalCallbackPort $LocalCallbackPort `
        -PublicHostName $PublicHostName `
        -CertificateThumbprint $certificate.Thumbprint

    Write-Step "Opening Windows Firewall port"
    Ensure-FirewallRule -Port $HttpsPort

    Write-Step "Granting write permissions"
    Grant-AppPermissions -TargetPath $InstallRoot -TargetAppPool $AppPoolName

    Start-Website -Name $SiteName

    Write-Host ""
    Write-Host "ArgusCam IIS deployment completed." -ForegroundColor Green
    Write-Host "Install root : $InstallRoot" -ForegroundColor Green
    Write-Host "Server LAN IP: $lanIp" -ForegroundColor Green
    Write-Host "Public host  : $PublicHostName" -ForegroundColor Green
    Write-Host "Site URL     : $url" -ForegroundColor Green
    Write-Host ""
    Write-Host "Cloudflare DNS A record was created/updated automatically (DNS only / grey cloud)." -ForegroundColor Yellow
    Write-Host "LAN devices using public DNS (1.1.1.1, 8.8.8.8) will resolve $PublicHostName to $lanIp." -ForegroundColor Yellow
    Write-Host "First visit shows a self-signed warning; tap 'Accept the risk' once - the device remembers it." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Local site URL          : $localSiteUrl" -ForegroundColor Green
    Write-Host "Local Google callback   : $localCallbackUrl" -ForegroundColor Green

    if ($OpenBrowserAfterInstall) {
        Start-Process $url
    }
}
catch {
    Write-Host ""
    Write-Host "==> Install FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ScriptStackTrace) {
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    }
    Wait-ForKey
    exit 1
}

Wait-ForKey
