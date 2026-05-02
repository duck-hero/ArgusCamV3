using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Api.Infrastructure;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var responseError = new ResponseErrorData();
        int statusCode;

        switch (exception)
        {
            case OperationCanceledException when httpContext.RequestAborted.IsCancellationRequested:
                if (!httpContext.Response.HasStarted)
                {
                    httpContext.Response.StatusCode = 499;
                }

                _logger.LogInformation(
                    "Request was cancelled by the client. Path: {Path}",
                    httpContext.Request.Path);
                return true;

            case ValidationException validationEx:
                statusCode = StatusCodes.Status400BadRequest;
                responseError.ErrorType = "ValidationFailure";
                // Aggregate validation errors
                var errors = validationEx.Errors
                    .GroupBy(e => e.PropertyName, e => e.ErrorMessage)
                    .ToDictionary(failureGroup => failureGroup.Key, failureGroup => failureGroup.ToArray());
                
                // For simplicity in ResponseErrorData, we might join them or just pick the first one
                // Or you can extend ResponseErrorData to hold validation details.
                // Here I'll join the first messages of each property for the message.
                responseError.ErrorMessage = string.Join("; ", validationEx.Errors.Select(e => e.ErrorMessage));
                break;

            case NotFoundException notFoundEx:
                statusCode = StatusCodes.Status404NotFound;
                responseError.ErrorType = "NotFound";
                responseError.ErrorMessage = notFoundEx.Message;
                break;

            case UnauthorizedException unauthorizedEx:
                statusCode = StatusCodes.Status401Unauthorized;
                responseError.ErrorType = "Unauthorized";
                responseError.ErrorMessage = unauthorizedEx.Message;
                break;

            case ForbiddenException forbiddenEx:
                statusCode = StatusCodes.Status403Forbidden;
                responseError.ErrorType = "Forbidden";
                responseError.ErrorMessage = forbiddenEx.Message;
                break;

            case BadRequestException badRequestEx:
                statusCode = StatusCodes.Status400BadRequest;
                responseError.ErrorType = "BadRequest";
                responseError.ErrorMessage = badRequestEx.Message;
                break;

            default:
                statusCode = StatusCodes.Status500InternalServerError;
                responseError.ErrorType = "InternalServerError";
                responseError.ErrorMessage = "Da xay ra loi he thong. Vui long thu lai sau.";
                _logger.LogError(exception, "Unhandled Exception: {Message}", exception.Message);
                break;
        }

        httpContext.Response.StatusCode = statusCode;

        // If you want to return the standard ResponseData wrapper even for errors:
        /*
        var response = new ResponseData 
        { 
             Err = responseError.ErrorMessage // Mapping to legacy Err if needed
        };
        */
        
        // Or returning just the ErrorData structure as seen in your Controller catches:
        // return BadRequest(new ResponseErrorData { ... });
        // So I will write ResponseErrorData directly.

        await httpContext.Response.WriteAsJsonAsync(responseError, cancellationToken);

        return true;
    }
}
