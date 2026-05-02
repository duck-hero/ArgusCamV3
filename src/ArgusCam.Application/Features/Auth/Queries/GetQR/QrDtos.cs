namespace ArgusCam.Application.Features.Auth.Queries.GetQR;

public record CameraQrDto(Guid Id, string Code, string Name, string? CameraIP, string? CameraChannel, int? SDKPort = null);

public record UserSessionQrContent(
    Guid UserId,
    Guid? DeskId,
    string Command, // STARTSESSION, STARTRETURNSESSION, ENDORDER
    List<CameraQrDto> Cameras
);
