using ArgusCam.Application;
using ArgusCam.Infrastructure.Hubs;
using ArgusCam.Infrastructure;
using ArgusCam.Infrastructure.Database;
using ArgusCam.Api.License;
using Hangfire;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Ensure Database Directory Exists BEFORE configuring services (Hangfire needs it)
var dbFolder = Path.Combine(builder.Environment.ContentRootPath, "SqliteDb");
if (!Directory.Exists(dbFolder))
{
    Directory.CreateDirectory(dbFolder);
}

// Cho phép upload file lớn (video)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = null; // unlimited
});

// Add services to the container.
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Add Global Exception Handler
builder.Services.AddExceptionHandler<ArgusCam.Api.Infrastructure.GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddSingleton<LicenseCheckService>(sp =>
    new LicenseCheckService(
        sp.GetRequiredService<IConfiguration>(),
        sp.GetRequiredService<ILogger<LicenseCheckService>>()));
builder.Services.AddSignalR();

builder.Services.AddControllers();

// Configure Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ArgusCam API", Version = "v1" });
    
    // JWT Authentication for Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Add CORS (AllowCredentials required for SignalR, cannot use AllowAnyOrigin)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder
            .SetIsOriginAllowed(_ => true)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

var app = builder.Build();

// Kiểm tra license khi khởi động
var licenseService = app.Services.GetRequiredService<LicenseCheckService>();
await licenseService.CheckAsync();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    await app.InitialiseDatabaseAsync(); // Auto Migration & Seeding
}
else
{
    await app.InitialiseDatabaseAsync();
}

// Enable Swagger UI
app.UseSwagger();
app.UseSwaggerUI(c => 
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ArgusCam API v1");
    // c.RoutePrefix = string.Empty; // Uncomment to open Swagger at root URL
});

// Phục vụ các file tĩnh (HTML, CSS, JS) từ thư mục wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// Enable CORS
app.UseCors("AllowAll");

app.UseExceptionHandler();

// License middleware — chặn API nếu license không active
app.UseMiddleware<LicenseMiddleware>();

// app.UseHttpsRedirection(); // Comment out to avoid SSL issues on Localhost

app.UseAuthentication();
app.UseAuthorization();

// Hangfire Dashboard
app.UseHangfireDashboard();

app.MapHub<VideoProcessingHub>("/videoProcessingHub");

app.MapControllers();

// Đảm bảo các route không phải API sẽ trả về file index.html của React
app.MapFallbackToFile("index.html");

app.Run();
