# GEMINI.md - Hướng dẫn Phát triển Dự án ArgusCam

Tài liệu này định nghĩa các quy tắc, kiến trúc và hướng dẫn mà AI Agent (Gemini) CẦN tuân thủ khi làm việc với dự án này.

## 1. Kiến trúc Dự án (Architecture)

Dự án tuân theo mô hình **Clean Architecture** với cấu trúc 4 tầng:

*   **ArgusCam.Domain (Core):**
    *   Chứa các Entities, Enums, Interfaces cốt lõi.
    *   Không phụ thuộc vào bất kỳ tầng nào khác.
    *   Các thư mục chính: `Entities` (Identity, VideoStore, Config), `Common`.

*   **ArgusCam.Application (Business Logic):**
    *   Chứa logic nghiệp vụ, sử dụng Pattern **CQRS** (Command Query Responsibility Segregation) với thư viện **MediatR**.
    *   Mỗi Feature (Tính năng) được tổ chức thành các thư mục `Commands` và `Queries`.
    *   Sử dụng **FluentValidation** cho validation và **Mapster** cho mapping.
    *   Định nghĩa các Interface cho Infrastructure (`IApplicationDbContext`, `IVideoService`, ...).

*   **ArgusCam.Infrastructure (Implementation):**
    *   Triển khai các Interface của Application.
    *   Xử lý Database (EF Core), File System, Email, Background Jobs (Hangfire).
    *   Database Context: `ArgusCamDbContext`.

*   **ArgusCam.Api (Presentation):**
    *   ASP.NET Core Web API.
    *   Controllers là entry point, gọi xuống Application layer qua MediatR.

## 2. Công nghệ Chính

*   **Framework:** .NET 9
*   **ORM:** Entity Framework Core (PostgreSQL / SQLite)
*   **Messaging:** MediatR
*   **Validation:** FluentValidation
*   **Mapping:** Mapster
*   **Background Jobs:** Hangfire
*   **Authentication:** JWT Bearer

## 3. Quy tắc Coding (QUAN TRỌNG)

### 3.1. Ngôn ngữ Comment
*   **BẮT BUỘC:** Tất cả các hàm (methods), lớp (classes) và logic phức tạp **PHẢI có comment giải thích bằng Tiếng Việt**.
*   Comment cần rõ ràng, ngắn gọn, giải thích *tại sao* (why) và *làm gì* (what).

**Ví dụ:**

```csharp
/// <summary>
/// Xử lý lệnh tạo đơn hàng mới.
/// Kiểm tra tồn kho và lưu thông tin vào cơ sở dữ liệu.
/// </summary>
/// <param name="command">Thông tin đơn hàng cần tạo</param>
/// <returns>ID của đơn hàng vừa tạo</returns>
public async Task<int> Handle(CreateOrderCommand command, CancellationToken cancellationToken)
{
    // Kiểm tra xem người dùng có tồn tại không
    var user = await _context.Users.FindAsync(command.UserId);
    
    // ... logic tiếp theo
}
```

### 3.2. Quy ước Đặt tên
*   Interface: Bắt đầu bằng `I` (ví dụ: `IVideoService`).
*   Async Methods: Nên kết thúc bằng `Async` (tuy nhiên tuân theo code hiện tại nếu không dùng).
*   CQRS:
    *   Command: `VerbnounCommand` (ví dụ: `CreateOrderCommand`).
    *   Query: `VerbnounQuery` (ví dụ: `GetOrderByIdQuery`).

## 4. Quy trình Làm việc
1.  **Hiểu context:** Trước khi sửa đổi, luôn đọc code xung quanh để nắm bắt style.
2.  **Thực thi:** Tuân thủ Clean Architecture. Không gọi trực tiếp DbContext từ Controller (trừ khi dự án đã làm vậy, nhưng ưu tiên qua MediatR).
3.  **Comment:** Thêm comment Tiếng Việt cho code mới hoặc code được sửa đổi.
