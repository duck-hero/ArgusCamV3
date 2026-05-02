import axiosInstance from './axiosInstance';

export const dashboardApi = {
  getStatistics: async (params = {}) => {
    const {
      period = 'Week',
      referenceDate = null,
      recentOrdersLimit = 8,
      productivityLimit = 10,
    } = params;

    const queryParams = new URLSearchParams();

    if (period) queryParams.append('Period', period);
    if (referenceDate) queryParams.append('ReferenceDate', referenceDate);
    if (recentOrdersLimit) queryParams.append('RecentOrdersLimit', recentOrdersLimit);
    if (productivityLimit) queryParams.append('ProductivityLimit', productivityLimit);

    const suffix = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await axiosInstance.get(`/dashboard/statistics${suffix}`);
    return response.data;
  },
};
