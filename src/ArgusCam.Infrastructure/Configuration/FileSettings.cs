using ArgusCam.Application.Common.Interfaces;

namespace ArgusCam.Infrastructure.Configuration;

public class FileSettings : IFileSettingsProvider
{
    public const string SectionName = "FileSettings";
    public string UploadPath { get; init; } = "C:\\ArgusCam\\videos";
    public string FfmpegPath { get; init; } = "tools/ffmpeg/ffmpeg.exe";
}
