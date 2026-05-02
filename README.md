# ArgusCam

ArgusCam is a local-first camera and order management system hosted by ASP.NET Core on IIS.

The current workflow uses the web app on desktop or mobile devices. Mobile users sign in, open `/scan`, scan order codes with the phone camera, and the API records order start/end times. Scanning a new order automatically closes the previous active order for that same user and starts the next one.

## Projects

- `src/ArgusCam.Client`: React + Vite frontend
- `src/ArgusCam.Api`: ASP.NET Core API and static web host
- `src/ArgusCam.Application`: CQRS use cases and business logic
- `src/ArgusCam.Domain`: entities and domain contracts
- `src/ArgusCam.Infrastructure`: EF Core, auth, storage, camera/video services

## Mobile Order Workflow

1. Admin assigns a desk to each user.
2. User signs in on one device.
3. User opens `/scan`.
4. Scanning an order code creates an active order with `Start = server now`.
5. Scanning the next order code closes the current active order, queues video download, and starts the new order.
6. The final order can be closed with the `Ket thuc don` button.

Only one login session per account is valid. Logging in on a new device invalidates the previous session.

## Development

Build frontend into API `wwwroot`:

```powershell
Set-Location .\src\ArgusCam.Client
npm install
npm run build
```

Run API:

```powershell
dotnet run --project .\src\ArgusCam.Api\ArgusCam.Api.csproj
```

Default local URLs:

- App: `http://localhost:5176`
- Swagger: `http://localhost:5176/swagger`

Build solution:

```powershell
dotnet build .\ArgusCam.slnx
```

## Mobile Camera Access

Phone camera scanning requires a secure browser context. For LAN testing, use HTTPS on IIS or a trusted local certificate. The frontend uses the current browser origin for API calls when hosted by IIS, so phones can access the app through the machine IP/host name exposed on the network.

## IIS Bundle

Build the IIS bundle:

```powershell
powershell -ExecutionPolicy Bypass -File ".\deployment\iis\Build-ArgusCamIisBundle.ps1" -Configuration Release -Runtime win-x64 -DownloadHostingBundleIfMissing
```

Build the installer exe:

```powershell
powershell -ExecutionPolicy Bypass -File ".\deployment\iis\Build-ArgusCamInstallerExe.ps1" -Configuration Release -Runtime win-x64 -DownloadHostingBundleIfMissing
```

The installer enables IIS, installs the ASP.NET Core Hosting Bundle if needed, deploys the API/web app, creates the IIS site, and opens the web URL.
