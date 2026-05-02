import axiosInstance from './axiosInstance';

export const mobileOrdersApi = {
  getActive: async () => {
    const response = await axiosInstance.get('/mobile-orders/active');
    return response.data;
  },

  scanOrder: async (orderCode) => {
    const response = await axiosInstance.post('/mobile-orders/scan', { orderCode });
    return response.data;
  },

  endActive: async () => {
    const response = await axiosInstance.post('/mobile-orders/end-active');
    return response.data;
  },
};
