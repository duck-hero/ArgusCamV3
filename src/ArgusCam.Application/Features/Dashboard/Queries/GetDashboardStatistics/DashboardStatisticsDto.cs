namespace ArgusCam.Application.Features.Dashboard.Queries.GetDashboardStatistics;

public class DashboardStatisticsDto
{
    public DashboardPeriodType Period { get; set; }
    public string Scope { get; set; } = "self";
    public DateTime ReferenceDate { get; set; }
    public DateTime RangeStart { get; set; }
    public DateTime RangeEnd { get; set; }
    public DashboardTotalsDto Totals { get; set; } = new();
    public List<DashboardChartPointDto> Chart { get; set; } = [];
    public List<DashboardProductivityDto> Productivity { get; set; } = [];
    public List<DashboardRecentOrderDto> RecentOrders { get; set; } = [];
}

public class DashboardTotalsDto
{
    public int TotalOrders { get; set; }
    public int CompletedOrders { get; set; }
    public int InProgressOrders { get; set; }
    public int PackingOrders { get; set; }
    public int UnpackingOrders { get; set; }
    public int OperatorsCount { get; set; }
}

public class DashboardChartPointDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
    public int TotalOrders { get; set; }
    public int CompletedOrders { get; set; }
    public int InProgressOrders { get; set; }
    public int PackingOrders { get; set; }
    public int UnpackingOrders { get; set; }
}

public class DashboardProductivityDto
{
    public Guid? UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public int CompletedOrders { get; set; }
    public int InProgressOrders { get; set; }
    public int PackingOrders { get; set; }
    public int UnpackingOrders { get; set; }
    public double AverageProcessingMinutes { get; set; }
    public double CompletionRate { get; set; }
}

public class DashboardRecentOrderDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateTime? Start { get; set; }
    public DateTime? End { get; set; }
    public int Status { get; set; }
    public bool IsPacking { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
}
