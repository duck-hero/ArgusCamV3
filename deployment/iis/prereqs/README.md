Place offline prerequisite installers in this folder before running:

`deployment\iis\Build-ArgusCamIisBundle.ps1`

Recommended file:

- ASP.NET Core Hosting Bundle installer
  Example naming:
  `dotnet-hosting-9.x.y-win.exe`

Why this is needed:

- IIS needs `AspNetCoreModuleV2` to host the published API
- The install script will auto-run the hosting bundle if the target machine does not already have it

This folder is copied into:

`artifacts\iis-bundle\prereqs`
