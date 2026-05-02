using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ArgusCam.Application.Common.Exceptions;
using ArgusCam.Application.Common.Interfaces;
using ArgusCam.Application.Common.Models;
using ArgusCam.Domain.Entities.Identity;

namespace ArgusCam.Application.Features.Dashboard.Queries.GetDashboardStatistics;

public class GetDashboardStatisticsQueryHandler(
    IApplicationDbContext context,
    ICurrentUserService currentUserService,
    UserManager<User> userManager)
    : IRequestHandler<GetDashboardStatisticsQuery, ResponseData>
{
    public async Task<ResponseData> Handle(GetDashboardStatisticsQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = currentUserService.UserId;
        if (currentUserId is null)
        {
            throw new UnauthorizedException("User is not logged in.");
        }

        var currentUser = await userManager.FindByIdAsync(currentUserId.Value.ToString());
        if (currentUser is null || currentUser.IsDeleted)
        {
            throw new UnauthorizedException("User is not logged in.");
        }

        var roles = await userManager.GetRolesAsync(currentUser);
        var isAdmin = roles.Any(role => role.Equals("Admin", StringComparison.OrdinalIgnoreCase));

        var period = Enum.IsDefined(request.Period) ? request.Period : DashboardPeriodType.Week;
        var referenceDate = (request.ReferenceDate ?? DateTime.Now).Date;
        var (rangeStart, rangeEndExclusive) = GetRange(period, referenceDate);
        var recentOrdersLimit = Math.Clamp(request.RecentOrdersLimit, 1, 50);
        var productivityLimit = Math.Clamp(request.ProductivityLimit, 1, 50);

        var ordersQuery = context.Orders
            .AsNoTracking()
            .Where(order =>
                !order.IsDeleted &&
                order.Start.HasValue &&
                order.Start.Value >= rangeStart &&
                order.Start.Value < rangeEndExclusive);

        if (!isAdmin)
        {
            ordersQuery = ordersQuery.Where(order => order.UserId == currentUserId.Value);
        }

        var usersQuery = context.Users
            .IgnoreQueryFilters()
            .AsNoTracking();

        var orders = await (
            from order in ordersQuery
            join user in usersQuery on order.UserId equals user.Id into userGroup
            from user in userGroup.DefaultIfEmpty()
            select new DashboardOrderSnapshot(
                order.Id,
                order.Code,
                order.Start,
                order.End,
                order.Status,
                order.IsPacking,
                order.UserId,
                user != null
                    ? (!string.IsNullOrWhiteSpace(user.FullName) ? user.FullName : user.UserName)
                    : null))
            .ToListAsync(cancellationToken);

        var chart = BuildChart(period, rangeStart, rangeEndExclusive, orders);

        var productivity = orders
            .GroupBy(order => new
            {
                order.UserId,
                UserName = string.IsNullOrWhiteSpace(order.UserName) ? "Chưa gán" : order.UserName
            })
            .Select(group =>
            {
                var completedOrders = group.Count(order => order.Status == 1);
                var inProgressOrders = group.Count(order => order.Status == 0);
                var durations = group
                    .Where(order => order.Status == 1 && order.Start.HasValue && order.End.HasValue && order.End >= order.Start)
                    .Select(order => (order.End!.Value - order.Start!.Value).TotalMinutes)
                    .ToList();

                return new DashboardProductivityDto
                {
                    UserId = group.Key.UserId,
                    UserName = group.Key.UserName ?? "Chưa gán",
                    TotalOrders = group.Count(),
                    CompletedOrders = completedOrders,
                    InProgressOrders = inProgressOrders,
                    PackingOrders = group.Count(order => order.IsPacking),
                    UnpackingOrders = group.Count(order => !order.IsPacking),
                    AverageProcessingMinutes = durations.Count > 0 ? Math.Round(durations.Average(), 1) : 0,
                    CompletionRate = group.Any()
                        ? Math.Round((double)completedOrders * 100 / group.Count(), 1)
                        : 0
                };
            })
            .OrderByDescending(item => item.TotalOrders)
            .ThenByDescending(item => item.CompletedOrders)
            .ThenBy(item => item.UserName)
            .Take(isAdmin ? productivityLimit : 1)
            .ToList();

        var recentOrders = orders
            .OrderByDescending(order => order.Start)
            .ThenByDescending(order => order.Id)
            .Take(recentOrdersLimit)
            .Select(order => new DashboardRecentOrderDto
            {
                Id = order.Id,
                Code = order.Code,
                Start = order.Start,
                End = order.End,
                Status = order.Status,
                IsPacking = order.IsPacking,
                UserId = order.UserId,
                UserName = order.UserName
            })
            .ToList();

        var response = new DashboardStatisticsDto
        {
            Period = period,
            Scope = isAdmin ? "all" : "self",
            ReferenceDate = referenceDate,
            RangeStart = rangeStart,
            RangeEnd = rangeEndExclusive.AddTicks(-1),
            Totals = new DashboardTotalsDto
            {
                TotalOrders = orders.Count,
                CompletedOrders = orders.Count(order => order.Status == 1),
                InProgressOrders = orders.Count(order => order.Status == 0),
                PackingOrders = orders.Count(order => order.IsPacking),
                UnpackingOrders = orders.Count(order => !order.IsPacking),
                OperatorsCount = orders
                    .Where(order => order.UserId.HasValue)
                    .Select(order => order.UserId!.Value)
                    .Distinct()
                    .Count()
            },
            Chart = chart,
            Productivity = productivity,
            RecentOrders = recentOrders
        };

        return new ResponseData { Content = response };
    }

    private static List<DashboardChartPointDto> BuildChart(
        DashboardPeriodType period,
        DateTime rangeStart,
        DateTime rangeEndExclusive,
        IReadOnlyCollection<DashboardOrderSnapshot> orders)
    {
        var buckets = CreateBuckets(period, rangeStart, rangeEndExclusive);
        var lookup = buckets.ToDictionary(bucket => bucket.Key);

        foreach (var order in orders)
        {
            if (!order.Start.HasValue)
            {
                continue;
            }

            var bucketKey = GetBucketKey(period, order.Start.Value);
            if (!lookup.TryGetValue(bucketKey, out var bucket))
            {
                continue;
            }

            bucket.TotalOrders++;
            if (order.Status == 1)
            {
                bucket.CompletedOrders++;
            }

            if (order.Status == 0)
            {
                bucket.InProgressOrders++;
            }

            if (order.IsPacking)
            {
                bucket.PackingOrders++;
            }
            else
            {
                bucket.UnpackingOrders++;
            }
        }

        return buckets;
    }

    private static List<DashboardChartPointDto> CreateBuckets(
        DashboardPeriodType period,
        DateTime rangeStart,
        DateTime rangeEndExclusive)
    {
        var buckets = new List<DashboardChartPointDto>();

        switch (period)
        {
            case DashboardPeriodType.Day:
                for (var hour = 0; hour < 24; hour++)
                {
                    var start = rangeStart.AddHours(hour);
                    var end = start.AddHours(1);
                    buckets.Add(new DashboardChartPointDto
                    {
                        Key = GetBucketKey(period, start),
                        Label = $"{hour:00}:00",
                        Start = start,
                        End = end.AddTicks(-1)
                    });
                }
                break;

            case DashboardPeriodType.Week:
                for (var dayOffset = 0; dayOffset < 7; dayOffset++)
                {
                    var start = rangeStart.AddDays(dayOffset);
                    var end = start.AddDays(1);
                    buckets.Add(new DashboardChartPointDto
                    {
                        Key = GetBucketKey(period, start),
                        Label = GetWeekdayLabel(start.DayOfWeek),
                        Start = start,
                        End = end.AddTicks(-1)
                    });
                }
                break;

            case DashboardPeriodType.Month:
                var daysInMonth = DateTime.DaysInMonth(rangeStart.Year, rangeStart.Month);
                for (var day = 1; day <= daysInMonth; day++)
                {
                    var start = new DateTime(rangeStart.Year, rangeStart.Month, day);
                    var end = start.AddDays(1);
                    buckets.Add(new DashboardChartPointDto
                    {
                        Key = GetBucketKey(period, start),
                        Label = day.ToString(),
                        Start = start,
                        End = end.AddTicks(-1)
                    });
                }
                break;

            case DashboardPeriodType.Year:
                for (var month = 1; month <= 12; month++)
                {
                    var start = new DateTime(rangeStart.Year, month, 1);
                    var end = start.AddMonths(1);
                    buckets.Add(new DashboardChartPointDto
                    {
                        Key = GetBucketKey(period, start),
                        Label = $"T{month}",
                        Start = start,
                        End = end.AddTicks(-1)
                    });
                }
                break;
        }

        return buckets.Where(bucket => bucket.Start < rangeEndExclusive).ToList();
    }

    private static string GetBucketKey(DashboardPeriodType period, DateTime dateTime)
    {
        return period switch
        {
            DashboardPeriodType.Day => $"{dateTime:yyyyMMddHH}",
            DashboardPeriodType.Week => $"{dateTime:yyyyMMdd}",
            DashboardPeriodType.Month => $"{dateTime:yyyyMMdd}",
            DashboardPeriodType.Year => $"{dateTime:yyyyMM}",
            _ => $"{dateTime:yyyyMMdd}"
        };
    }

    private static (DateTime Start, DateTime EndExclusive) GetRange(DashboardPeriodType period, DateTime referenceDate)
    {
        var normalizedDate = referenceDate.Date;

        return period switch
        {
            DashboardPeriodType.Day => (normalizedDate, normalizedDate.AddDays(1)),
            DashboardPeriodType.Week => (StartOfWeek(normalizedDate), StartOfWeek(normalizedDate).AddDays(7)),
            DashboardPeriodType.Month => (
                new DateTime(normalizedDate.Year, normalizedDate.Month, 1),
                new DateTime(normalizedDate.Year, normalizedDate.Month, 1).AddMonths(1)),
            DashboardPeriodType.Year => (
                new DateTime(normalizedDate.Year, 1, 1),
                new DateTime(normalizedDate.Year, 1, 1).AddYears(1)),
            _ => (normalizedDate, normalizedDate.AddDays(1))
        };
    }

    private static DateTime StartOfWeek(DateTime date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-diff).Date;
    }

    private static string GetWeekdayLabel(DayOfWeek dayOfWeek)
    {
        return dayOfWeek switch
        {
            DayOfWeek.Monday => "T2",
            DayOfWeek.Tuesday => "T3",
            DayOfWeek.Wednesday => "T4",
            DayOfWeek.Thursday => "T5",
            DayOfWeek.Friday => "T6",
            DayOfWeek.Saturday => "T7",
            DayOfWeek.Sunday => "CN",
            _ => string.Empty
        };
    }

    private sealed record DashboardOrderSnapshot(
        Guid Id,
        string Code,
        DateTime? Start,
        DateTime? End,
        int Status,
        bool IsPacking,
        Guid? UserId,
        string? UserName);
}
