# ArgusCam IIS Bundle

This folder is the deployment base for the customer IIS installer flow.

## Target Flow

1. Create a customer in the ArgusCam license backoffice and assign a unique `subdomain`.
2. Create an active license for that customer.
3. The license API issues a customer certificate for `<subdomain>.arguscam.top`.
4. Build the IIS bundle on the dev machine.
5. Copy the bundle to the customer machine.
6. Run `Install-ArgusCamIis.ps1` as Administrator with the customer license key.
7. The installer verifies the license, downloads the customer PFX, writes the license settings, binds IIS to the customer hostname, and starts the site.
8. Mobile devices on the LAN open `https://<subdomain>.arguscam.top` and use `/scan`.

## Build Bundle

Run on the dev machine:

```powershell
powershell -ExecutionPolicy Bypass -File ".\deployment\iis\Build-ArgusCamIisBundle.ps1"
```

Output:

`artifacts\iis-bundle`

The bundle contains:

- `site\` published ASP.NET Core API and built React app
- `prereqs\` offline prerequisite installers if you place them in `deployment\iis\prereqs\`
- `certs\` optional manual HTTPS certificate files if you place them in `deployment\iis\certs\`
- `Install-ArgusCamIis.ps1`

## Build Single EXE Installer

Run on the dev machine:

```powershell
powershell -ExecutionPolicy Bypass -File ".\deployment\iis\Build-ArgusCamInstallerExe.ps1"
```

Output:

`artifacts\installer-exe\ArgusCam-Installer.exe`

This EXE is a bootstrapper built with Windows `IExpress`. It extracts the bundle, self-elevates with UAC, asks for the customer license key, and runs `Install-ArgusCamIis.ps1`.

## Install With License-Managed Domain and Certificate

Run as Administrator on the customer machine:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Install-ArgusCamIis.ps1" `
  -LicenseKey "CUSTOMER_LICENSE_KEY" `
  -ConfigureStaticIp `
  -StaticHostOctet 5 `
  -HttpsPort 443 `
  -LocalCallbackPort 5176
```

Defaults:

- License API: `https://admin.arguscam.io.vn`
- LAN HTTPS port: `443`
- Local callback HTTP port: `5176`

Override the license API if needed:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Install-ArgusCamIis.ps1" `
  -LicenseKey "CUSTOMER_LICENSE_KEY" `
  -LicenseApiBaseUrl "https://admin.arguscam.io.vn"
```

When `-LicenseKey` is provided, the installer:

- Calls `/licenses/check` and stops if the license is not active.
- Calls `/licenses/cert/info` and uses the returned `fqdn` as the IIS HTTPS host name.
- Calls `/licenses/cert/download`, imports the returned PFX into `Cert:\LocalMachine\My`, and binds IIS to that certificate.
- Writes `License.Key` and `License.ApiBaseUrl` into the installed `site\appsettings.json`.
- Registers a weekly Windows scheduled task named `ArgusCam Certificate Renewal` to download and bind newer certificate versions automatically.

If the customer certificate is not available yet, issue or renew it in the backoffice, then run the installer again.

## Static LAN IP, DNS, and HTTPS

The installer can check the primary LAN adapter and expose the site as `https://<subdomain>.arguscam.top`:

- If the adapter already uses a static IPv4 address, that IP is kept.
- If the adapter uses DHCP, it is changed to a static IP in the same `/24` subnet using host octet `5` by default.
- HTTP and HTTPS bindings are created on separate ports.
- `http://localhost:5176` remains available on the IIS machine for the Google OAuth callback configured in `appsettings.json`.
- The customer router/internal DNS must map `<subdomain>.arguscam.top` to the static LAN IP printed by the installer.
- A Windows Firewall inbound rule is added for the HTTPS site port.
- Existing SQLite database files in `C:\Program Files\ArgusCam\site\SqliteDb` are preserved during reinstall.
- Certificate renewal state is stored in `C:\Program Files\ArgusCam\cert-renewal-state.json`.

The installer prints the DNS mapping to configure on the customer router/internal DNS, for example:

```text
abc-shop.arguscam.top -> 192.168.31.5
```

The final URL is:

```text
https://abc-shop.arguscam.top
```

On the IIS machine itself, the local URL is:

```text
http://localhost:5176
```

The Google Drive callback remains:

```text
http://localhost:5176/api/google-drive/callback
```

## Manual Fallback

If you do not pass `-LicenseKey`, the installer keeps the legacy behavior and uses `-PublicHostName` plus either a local PFX from `certs\` or a self-signed fallback certificate.

```powershell
powershell -ExecutionPolicy Bypass -File ".\Install-ArgusCamIis.ps1" `
  -PublicHostName "app.arguscam.io.vn" `
  -HttpsPort 443 `
  -LocalCallbackPort 5176
```

Manual fallback is useful for local testing, but customer installs should use the license-managed flow.

## Important Requirement

The target machine must have `AspNetCoreModuleV2` available for IIS. The install script checks this.

Recommended offline flow:

1. Put the ASP.NET Core Hosting Bundle installer into `deployment\iis\prereqs\`
2. Build the IIS bundle
3. The install script will auto-install that prerequisite if the target machine does not have it

Suggested filename pattern:

- `dotnet-hosting-<version>-win.exe`
