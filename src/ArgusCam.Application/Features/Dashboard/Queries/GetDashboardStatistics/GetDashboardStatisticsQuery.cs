using MediatR;
using ArgusCam.Application.Common.Models;

namespace ArgusCam.Application.Features.Dashboard.Queries.GetDashboardStatistics;

public enum DashboardPeriodType
{
    Day,
    Week,
    Month,
    Year
}

public class GetDashboardStatisticsQuery : IRequest<ResponseData>
{
    public DashboardPeriodType Period { get; set; } = DashboardPeriodType.Week;
    public DateTime? ReferenceDate { get; set; }
    public int RecentOrdersLimit { get; set; } = 8;
    public int ProductivityLimit { get; set; } = 10;
}
