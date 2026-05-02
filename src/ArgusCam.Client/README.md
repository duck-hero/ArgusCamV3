# ArgusCam Client

Frontend React cho hệ thống ArgusCam.

## Tổng quan

- Framework: React 19
- Build tool: Vite
- Styling: Tailwind CSS v3 + PostCSS
- Routing: React Router v7
- HTTP client: Axios
- Realtime: SignalR (`@microsoft/signalr`)

## Cấu trúc

- `src/ArgusCam.Client`: mã nguồn frontend React
- `src/ArgusCam.Api/wwwroot`: thư mục output frontend sau khi build

## Biến môi trường

Tạo/cập nhật file `src/ArgusCam.Client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5176
VITE_SIGNALR_HUB_URL=http://localhost:5176/videoDownloadHub
```

Lưu ý:

- JWT settings và Camera settings đang được hard-code ở backend, không cấu hình qua frontend env.
- Frontend chỉ cần cấu hình URL API/SignalR để kết nối đúng backend.

## Chạy local (frontend)

Từ thư mục `src/ArgusCam.Client`:

```bash
npm install
npm run dev
```

Dev server mặc định: `http://localhost:5173`.

## Build frontend vào API wwwroot

Từ thư mục `src/ArgusCam.Client`:

```bash
npm run build
```

Đã được cấu hình trong `vite.config.js`:

- `build.outDir = ../ArgusCam.Api/wwwroot`
- `build.emptyOutDir = true`

Nghĩa là mỗi lần build frontend, file static mới sẽ ghi đè vào `wwwroot` của API.

## Cách API phục vụ frontend

Trong `src/ArgusCam.Api/Program.cs`:

- `app.UseDefaultFiles();`
- `app.UseStaticFiles();`
- `app.MapFallbackToFile("index.html");`

Nghĩa là API sẽ phục vụ SPA từ `wwwroot`.

## Tránh tăng size output .NET

Trong `src/ArgusCam.Api/ArgusCam.Api.csproj` đã có:

```xml
<Content Remove="..\ArgusCam.Client\**" />
<None Remove="..\ArgusCam.Client\**" />
```

Mục đích: source React trong `ArgusCam.Client` không bị copy vào output/publish của .NET.

## Scripts

Từ `src/ArgusCam.Client`:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Lưu ý Tailwind

Dự án đang dùng Tailwind CSS v3.

- `postcss.config.js` phải dùng plugin `tailwindcss` (không dùng `@tailwindcss/postcss`)
- Nếu nâng lên Tailwind v4, cần migrate CSS/config trước khi build

## Quy trình đề nghị khi release

1. Build frontend: `npm run build` tại `src/ArgusCam.Client`
2. Build/publish backend: `dotnet build` hoặc `dotnet publish` tại `src/ArgusCam.Api`

Sau bước 1, frontend đã nằm trong `wwwroot` và được API serve trực tiếp.
