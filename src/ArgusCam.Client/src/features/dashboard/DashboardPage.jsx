import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Package,
  Users,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboardApi';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const PERIOD_OPTIONS = [
  { value: 'Day', label: 'Ngày' },
  { value: 'Week', label: 'Tuần' },
  { value: 'Month', label: 'Tháng' },
  { value: 'Year', label: 'Năm' },
];

const statusConfig = {
  0: { label: 'Đang xử lý', className: 'bg-amber-100 text-amber-800' },
  1: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-800' },
};

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const shiftReferenceDate = (value, period, direction) => {
  const date = parseDateInput(value);

  if (period === 'Day') {
    date.setDate(date.getDate() + direction);
  } else if (period === 'Week') {
    date.setDate(date.getDate() + (direction * 7));
  } else if (period === 'Month') {
    date.setMonth(date.getMonth() + direction);
  } else if (period === 'Year') {
    date.setFullYear(date.getFullYear() + direction);
  }

  return formatDateInput(date);
};

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);

const formatDateRange = (start, end) => {
  if (!start || !end) return '-';

  const startDate = new Date(start);
  const endDate = new Date(end);

  return `${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}`;
};

const formatDateTime = (value) => {
  if (!value) return '-';

  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMinutes = (value) => {
  if (!value || value <= 0) return '0 phút';

  if (value >= 60) {
    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    return `${hours}h ${minutes}p`;
  }

  return `${Math.round(value)} phút`;
};

const SummaryCard = ({ title, value, description, icon: Icon, accentClass, iconClass }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClass}`}>
        <Icon className={`h-5 w-5 ${iconClass}`} />
      </div>
    </div>
  </div>
);

const SummarySkeleton = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-20 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-32 rounded bg-slate-200" />
      </div>
      <div className="h-12 w-12 rounded-2xl bg-slate-200" />
    </div>
  </div>
);

export const DashboardPage = () => {
  const { error: toastError } = useToast();
  const { isAdmin } = useAuth();
  const adminView = isAdmin();

  const [period, setPeriod] = useState('Week');
  const [referenceDate, setReferenceDate] = useState(() => formatDateInput(new Date()));
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');

      const response = await dashboardApi.getStatistics({
        period,
        referenceDate,
        recentOrdersLimit: adminView ? 8 : 12,
        productivityLimit: adminView ? 10 : 1,
      });

      if (response?.content) {
        setStatistics(response.content);
        setLastUpdated(new Date());
      } else {
        setStatistics(null);
        setLoadError('Không nhận được dữ liệu dashboard từ máy chủ.');
      }
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      setLoadError('Không thể tải dữ liệu dashboard.');
      toastError('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, [adminView, period, referenceDate, toastError]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const primaryProductivity = statistics?.productivity?.[0] ?? null;
  const maxChartValue = useMemo(() => {
    if (!statistics?.chart?.length) {
      return 1;
    }

    return Math.max(...statistics.chart.map((point) => point.totalOrders), 1);
  }, [statistics]);

  const hasChartData = statistics?.chart?.some((point) => point.totalOrders > 0);
  const scopeLabel = statistics?.scope === 'all' ? 'Toàn bộ hệ thống' : 'Đơn của bạn';

  const overviewCards = useMemo(() => {
    if (!statistics?.totals) {
      return [];
    }

    const cards = [
      {
        key: 'totalOrders',
        title: 'Tổng đơn hàng',
        value: formatNumber(statistics.totals.totalOrders),
        description: `Phạm vi ${scopeLabel.toLowerCase()}`,
        icon: Package,
        accentClass: 'from-sky-500 to-blue-600',
        iconClass: 'text-white',
      },
      {
        key: 'packingOrders',
        title: 'Đơn đóng hàng',
        value: formatNumber(statistics.totals.packingOrders),
        description: 'Phát sinh ở chế độ đóng hàng',
        icon: Boxes,
        accentClass: 'from-violet-500 to-indigo-600',
        iconClass: 'text-white',
      },
      {
        key: 'unpackingOrders',
        title: 'Đơn bóc hoàn',
        value: formatNumber(statistics.totals.unpackingOrders),
        description: 'Phát sinh ở chế độ bóc hoàn',
        icon: Activity,
        accentClass: 'from-rose-500 to-pink-600',
        iconClass: 'text-white',
      },
    ];

    cards.push(
      adminView
        ? {
          key: 'operators',
          title: 'Nhân sự tham gia',
          value: formatNumber(statistics.totals.operatorsCount),
          description: 'Có phát sinh đơn trong kỳ',
          icon: Users,
          accentClass: 'from-slate-700 to-slate-900',
          iconClass: 'text-white',
        }
        : {
          key: 'completionRate',
          title: 'Tỷ lệ hoàn thành',
          value: `${primaryProductivity?.completionRate ?? 0}%`,
          description: `Xử lý trung bình ${formatMinutes(primaryProductivity?.averageProcessingMinutes ?? 0)}`,
          icon: Users,
          accentClass: 'from-cyan-500 to-blue-600',
          iconClass: 'text-white',
        }
    );

    return cards;
  }, [adminView, primaryProductivity, scopeLabel, statistics]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <BarChart3 className="h-4 w-4" />
              Dashboard thống kê
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Theo dõi đơn hàng theo ngày, tuần, tháng và năm
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {scopeLabel} trong khoảng {statistics ? formatDateRange(statistics.rangeStart, statistics.rangeEnd) : '-'}.
              {adminView
                ? ' Admin có thể theo dõi năng suất toàn bộ nhân sự.'
                : ' Bạn chỉ xem được dữ liệu của chính mình.'}
            </p>
          </div>

        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${period === option.value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>

        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <div className="inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Phạm vi dữ liệu: <span className="font-medium text-slate-700">{scopeLabel}</span>
          </div>

          <div className="inline-flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-slate-400" />
            Cập nhật: <span className="font-medium text-slate-700">{lastUpdated ? lastUpdated.toLocaleTimeString('vi-VN') : '-'}</span>
          </div>
        </div>
      </div>

      {loadError && !loading && !statistics && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading && !statistics
          ? Array.from({ length: 6 }).map((_, index) => <SummarySkeleton key={index} />)
          : overviewCards.map((card) => (
            <SummaryCard
              key={card.key}
              title={card.title}
              value={card.value}
              description={card.description}
              icon={card.icon}
              accentClass={card.accentClass}
              iconClass={card.iconClass}
            />
          ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Biểu đồ đơn hàng</h2>
              <p className="text-sm text-slate-500">
                Tổng đơn và số đơn hoàn thành trong kỳ đang chọn.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                Tổng đơn
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                Hoàn thành
              </div>
            </div>
          </div>

          {!loading && !hasChartData ? (
            <div className="mt-8 flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <BarChart3 className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">Chưa có dữ liệu trong kỳ này</p>
              <p className="mt-1 text-sm text-slate-500">Thử đổi ngày tham chiếu hoặc mở rộng hoạt động trong hệ thống.</p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <div className={`flex items-end gap-3 ${period === 'Month' || period === 'Day' ? 'min-w-[760px]' : 'min-w-full'}`}>
                {(statistics?.chart || []).map((point) => {
                  const totalHeight = `${(point.totalOrders / maxChartValue) * 100}%`;
                  const completedHeight = `${(point.completedOrders / maxChartValue) * 100}%`;

                  return (
                    <div key={point.key} className="flex flex-1 flex-col">
                      <div className="flex h-72 items-end justify-center gap-1 rounded-2xl border border-slate-100 bg-slate-50 px-2 py-4">
                        <div
                          className="w-3 rounded-full rounded-b-md bg-slate-300 transition-all"
                          style={{ height: point.totalOrders > 0 ? totalHeight : '6px' }}
                          title={`${point.label}: ${point.totalOrders} đơn`}
                        />
                        <div
                          className="w-3 rounded-full rounded-b-md bg-emerald-500 transition-all"
                          style={{ height: point.completedOrders > 0 ? completedHeight : '6px' }}
                          title={`${point.label}: ${point.completedOrders} đơn hoàn thành`}
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-xs font-semibold text-slate-600">{point.label}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{point.totalOrders}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {adminView ? 'Năng suất nhân sự' : 'Hiệu suất cá nhân'}
            </h2>
            <p className="text-sm text-slate-500">
              {adminView
                ? 'Xếp hạng theo số đơn phát sinh trong kỳ.'
                : 'Số liệu hiệu suất của riêng bạn trong kỳ đã chọn.'}
            </p>
          </div>

          {!statistics?.productivity?.length ? (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
              <Users className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">Chưa có dữ liệu năng suất</p>
              <p className="mt-1 text-sm text-slate-500">Không có đơn hàng phù hợp trong phạm vi đang chọn.</p>
            </div>
          ) : adminView ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nhân sự</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng đơn</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Hoàn thành</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tỷ lệ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">TB xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {statistics.productivity.map((item) => (
                    <tr key={item.userId || item.userName} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.userName}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatNumber(item.totalOrders)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatNumber(item.completedOrders)}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{item.completionRate}%</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatMinutes(item.averageProcessingMinutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Tổng đơn</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatNumber(primaryProductivity?.totalOrders)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Đơn hoàn thành</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatNumber(primaryProductivity?.completedOrders)}</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-sm text-blue-700">Tỷ lệ hoàn thành</p>
                <p className="mt-2 text-2xl font-semibold text-blue-900">{primaryProductivity?.completionRate ?? 0}%</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm text-amber-700">TB xử lý</p>
                <p className="mt-2 text-2xl font-semibold text-amber-900">{formatMinutes(primaryProductivity?.averageProcessingMinutes)}</p>
              </div>
              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-sm text-violet-700">Đóng hàng</p>
                <p className="mt-2 text-2xl font-semibold text-violet-900">{formatNumber(primaryProductivity?.packingOrders)}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="text-sm text-rose-700">Bóc hoàn</p>
                <p className="mt-2 text-2xl font-semibold text-rose-900">{formatNumber(primaryProductivity?.unpackingOrders)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Đơn hàng gần đây</h2>
            <p className="text-sm text-slate-500">
              {adminView
                ? 'Danh sách đơn mới nhất trong phạm vi thống kê hiện tại.'
                : 'Các đơn gần đây của riêng bạn trong phạm vi thống kê hiện tại.'}
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Tổng hiển thị: <span className="font-medium text-slate-700">{statistics?.recentOrders?.length || 0}</span>
          </div>
        </div>

        {!statistics?.recentOrders?.length ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">Không có đơn hàng nào</p>
            <p className="mt-1 text-sm text-slate-500">Chưa có đơn phù hợp với kỳ thống kê đang chọn.</p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Mã đơn</th>
                  {adminView && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nhân sự</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Loại</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bắt đầu</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kết thúc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {statistics.recentOrders.map((order) => {
                  const status = statusConfig[order.status] || {
                    label: `Trạng thái ${order.status}`,
                    className: 'bg-slate-100 text-slate-700',
                  };

                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{order.code}</td>
                      {adminView && (
                        <td className="px-4 py-3 text-sm text-slate-700">{order.userName || 'Chưa gán'}</td>
                      )}
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${order.isPacking ? 'bg-violet-100 text-violet-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                          {order.isPacking ? 'Đóng hàng' : 'Bóc hoàn'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(order.start)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(order.end)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

