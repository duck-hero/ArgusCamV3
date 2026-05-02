using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Api.Controllers.VideoStore;

[Route("api/live-stream")]
public class LiveStreamController(
    IGo2RtcService go2RtcService,
    IApplicationDbContext context,
    ICameraProviderFactory cameraProviderFactory) : ApiController
{
    [HttpGet("{cameraId}")]
    public async Task<ActionResult<ResponseData>> GetStreamUrl(Guid cameraId, [FromQuery] int streamType = 2)
    {
        var camera = await context.Cameras.AsNoTracking().FirstOrDefaultAsync(x => x.Id == cameraId);
        if (camera == null)
        {
            throw new NotFoundException("Camera not found");
        }

        if (string.IsNullOrWhiteSpace(camera.CameraIP))
        {
            throw new BadRequestException("Camera does not have IP configured.");
        }

        int type = streamType is 1 or 2 ? streamType : 2;
        var provider = cameraProviderFactory.Resolve(camera);
        string rtspUrl = provider.BuildRtspUrl(camera, type);
        string streamKey = $"{cameraId}_{type}";

        var streamUrl = await go2RtcService.GetStreamUrlAsync(streamKey, rtspUrl);
        return Ok(new ResponseData { Content = streamUrl });
    }

    [HttpPost("{cameraId}/heartbeat")]
    public ActionResult Heartbeat(Guid cameraId, [FromQuery] int streamType = 2)
    {
        string streamKey = $"{cameraId}_{streamType}";
        go2RtcService.SendHeartbeat(streamKey);
        return Ok();
    }
}
