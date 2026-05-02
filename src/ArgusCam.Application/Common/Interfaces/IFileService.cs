using Microsoft.AspNetCore.Http;

namespace ArgusCam.Application.Common.Interfaces;

public interface IFileService
{
    Task<string> SaveFileAsync(string targetFolder, IFormFile file);
    Task<string> SaveFileAsync(string targetFolder, byte[] buffer, string fileName);
    Task<string> SaveFileAsyncCurrentName(string targetFolder, IFormFile file);
    void RemoveFile(string urlFile);
    string CreateFolder(string targetFolder, string folderName);
    bool DeleteFolder(string path);
    string? ConvertToBase64(string path);
}
