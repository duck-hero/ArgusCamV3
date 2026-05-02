using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Infrastructure.Configuration;

namespace ArgusCam.Infrastructure.Services;

public class FileService(IOptions<FileSettings> fileOptions) : IFileService
{
    private readonly FileSettings _fileSettings = fileOptions.Value;

    public async Task<string> SaveFileAsync(string targetFolder, byte[] buffer, string fileName)
    {
        string uploadPath = Path.Combine(_fileSettings.UploadPath, targetFolder);

        if (!Directory.Exists(uploadPath))
        {
            Directory.CreateDirectory(uploadPath);
        }

        fileName = $"{Path.GetRandomFileName()}-{fileName}";
        var fullPath = Path.Combine(uploadPath, fileName);
        var relativePath = Path.Combine(targetFolder, fileName);

        await File.WriteAllBytesAsync(fullPath, buffer);

        return relativePath;
    }

    public async Task<string> SaveFileAsync(string targetFolder, IFormFile file)
    {
        string uploadPath = Path.Combine(_fileSettings.UploadPath, targetFolder);

        if (!Directory.Exists(uploadPath))
        {
            Directory.CreateDirectory(uploadPath);
        }

        var fileName = $"{Path.GetRandomFileName()}-{file.FileName}";
        var fullPath = Path.Combine(uploadPath, fileName);
        var relativePath = Path.Combine(targetFolder, fileName);

        await using var fileStream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(fileStream);

        return relativePath;
    }

    public async Task<string> SaveFileAsyncCurrentName(string targetFolder, IFormFile file)
    {
        string uploadPath = Path.Combine(_fileSettings.UploadPath, targetFolder);

        if (!Directory.Exists(uploadPath))
        {
            Directory.CreateDirectory(uploadPath);
        }

        var fileName = file.FileName;
        var fullPath = Path.Combine(uploadPath, fileName);
        var relativePath = Path.Combine(targetFolder, fileName);

        await using var fileStream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(fileStream);

        return relativePath;
    }

    public void RemoveFile(string urlFile)
    {
        var fullPath = Path.Combine(_fileSettings.UploadPath, urlFile);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }

    public string CreateFolder(string targetFolder, string folderName)
    {
        var rootPath = Path.Combine(_fileSettings.UploadPath, targetFolder, folderName);
        if (!Directory.Exists(rootPath))
        {
            Directory.CreateDirectory(rootPath);
        }
        return Path.Combine(targetFolder, folderName);
    }

    public bool DeleteFolder(string path)
    {
        var rootPath = Path.Combine(_fileSettings.UploadPath, path);
        if (!Directory.Exists(rootPath)) return false;
        Directory.Delete(rootPath, true);
        return true;
    }

    public string? ConvertToBase64(string path)
    {
        var fullPath = Path.Combine(_fileSettings.UploadPath, path);
        return File.Exists(fullPath) ? Convert.ToBase64String(File.ReadAllBytes(fullPath)) : null;
    }
}
