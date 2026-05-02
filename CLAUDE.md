# ArgusCam Notes

ArgusCam is a camera-backed order management system.

Current architecture:

- ASP.NET Core API hosted on IIS
- React/Vite frontend hosted from API `wwwroot`
- EF Core with SQLite by default
- Hangfire background jobs for video download/conversion
- Mobile web scanner at `/scan`

The order workflow is now web based. A signed-in user has a desk assigned by admin. Scanning an order code starts that order; scanning the next code closes the previous active order for the same user/desk, queues video download, and starts the new order. Logging in on a new device invalidates the previous session for that account.
