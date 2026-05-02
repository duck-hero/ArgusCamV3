# ArgusCam IIS Bundle

This folder is the deployment base for the customer IIS installer flow.

## Target Flow

1. Create a customer in the ArgusCam license backoffice and set its subdomain, for example `abc-shop`.
2. Create an active license for that customer.
3. Build the IIS bundle or EXE installer on the dev machine.
4. Run the installer on the customer Windows machine and enter the customer license key.
5. The installer verifies the license, sets or reads the LAN IP, and calls the license API to create/update the Cloudflare DNS A record:

```text
abc-shop.arguscam.top -> 192.168.31.5
```

6. The installer writes license settings into `site\appsettings.json`, creates/reuses a self-signed IIS certificate for the returned hostname, binds IIS, opens the firewall port, and starts the site.
7. Mobile devices on the LAN open `https://abc-shop.arguscam.top`.

The Cloudflare record is created as **DNS only** (grey cloud). No router DNS override is required.

## Build Bundle

Run on the dev machine:

```powershell
powershell -ExecutionPolicy Bypass -File ".\deployment\iis\Build-ArgusCamIisBundle.ps1"
```

Output:

```text
artifacts\iis-bundle
```

The bundle contains:

- `site\` published ASP.NET Core API and built React app
- `prereqs\` offline prerequisite installers if you place them in `deployment\iis\prereqs\`
- `Install-ArgusCamIis.ps1`

## Build Single EXE Installer

Run on the dev machine:

```powershell
powershell -ExecutionPolicy Bypass -File ".\deployment\iis\Build-ArgusCamInstallerExe.ps1"
```

Output:

```text
artifacts\installer-exe\ArgusCam-Installer.exe
```

This EXE is a bootstrapper built with Windows `IExpress`. It extracts the bundle, self-elevates with UAC, asks for the customer license key, and runs `Install-ArgusCamIis.ps1`.

## Install

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

The canonical hostname comes from the customer subdomain in the license backoffice. If `-PublicHostName` is passed manually and does not match the license DNS response, the installer ignores it and uses the license-managed hostname.

## Static LAN IP, DNS, and HTTPS

- If the adapter already uses a static IPv4 address, that IP is kept.
- If the adapter uses DHCP and `-ConfigureStaticIp` is passed, it is changed to a static IP in the same `/24` subnet using host octet `5` by default.
- The installer registers the Cloudflare A record automatically through `/licenses/register-dns`.
- The IIS site listens on the license-managed hostname over HTTPS plus `http://localhost:5176` for the Google OAuth callback configured in `appsettings.json`.
- A Windows Firewall inbound rule is added for the HTTPS site port.
- Existing SQLite database files in `C:\Program Files\ArgusCam\site\SqliteDb` are preserved during reinstall.

LAN devices that use public DNS such as `1.1.1.1` or `8.8.8.8` will resolve the hostname to the LAN IP and connect directly.

The final URL is printed by the installer, for example:

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

## HTTPS Warning

The installer creates a self-signed certificate for the license-managed hostname. The first time a device opens `https://<subdomain>.arguscam.top`, the browser shows a security warning. Tap **Accept the risk and continue** once. The browser stores the exception for that certificate fingerprint.

Re-running the installer reuses the existing self-signed certificate if it is still valid for at least 30 more days, so devices should not need to re-accept after a normal redeploy.

## Important Requirement

The target machine must have `AspNetCoreModuleV2` available for IIS. The install script checks this.

Recommended offline flow:

1. Put the ASP.NET Core Hosting Bundle installer into `deployment\iis\prereqs\`
2. Build the IIS bundle
3. The install script will auto-install that prerequisite if the target machine does not have it

Suggested filename pattern:

- `dotnet-hosting-<version>-win.exe`
