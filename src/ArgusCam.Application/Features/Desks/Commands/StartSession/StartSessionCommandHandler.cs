using MediatR;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Domain.Entities.VideoStore;

namespace ArgusCam.Application.Features.Desks.Commands.StartSession;

public class StartSessionCommandHandler(IApplicationDbContext context) : IRequestHandler<StartSessionCommand, bool>
{
    /// <summary>
    /// Xử lý nghiệp vụ bắt đầu phiên làm việc tại bàn.
    /// Luồng xử lý gồm các bước:
    /// 1) Tìm Desk theo DeskId từ request.
    /// 2) Nếu không tồn tại thì ném lỗi NotFound để API trả lỗi rõ ràng.
    /// 3) Cập nhật các trường phiên hiện tại của bàn: CurrentUserId, CurrentScannerCode, IsPacking.
    /// 4) Lưu thay đổi xuống database và trả về true khi thành công.
    /// </summary>
    /// <param name="command">Dữ liệu bắt đầu phiên làm việc gửi từ API.</param>
    /// <param name="cancellationToken">Token hủy tác vụ bất đồng bộ.</param>
    /// <returns>True nếu cập nhật thành công; ngược lại sẽ phát sinh exception.</returns>
    public async Task<bool> Handle(StartSessionCommand command, CancellationToken cancellationToken)
    {
        var desk = await context.Desks
            .FirstOrDefaultAsync(x => x.Id == command.DeskId, cancellationToken);

        if (desk == null)
        {
            throw new NotFoundException(nameof(Desk), command.DeskId);
        }

        desk.CurrentUserId = command.UserId;
        desk.CurrentScannerCode = command.ScannerCode;
        desk.IsPacking = command.IsPacking;
        // LastModified handled by Interceptor

        await context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
