namespace ArgusCam.Application.Common.Interfaces;

public interface IFileSettingsProvider
{
    string UploadPath { get; }
    string FfmpegPath { get; }
}
