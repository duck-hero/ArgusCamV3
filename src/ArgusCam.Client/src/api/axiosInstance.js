import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { storage } from '../utils/storage';

// Flag để theo dõi quá trình refresh token
let isRefreshing = false;
// Mảng chứa các request đang chờ token mới
let failedQueue = [];
// Khi interceptor đã quyết định logout + redirect, chặn mọi error từ các request còn lại
let isLoggingOut = false;

// Promise treo vĩnh viễn — caller không bao giờ nhận resolve/reject → không có toast/error nào bắn ra
const PENDING_FOREVER = new Promise(() => {});

const triggerLogoutRedirect = () => {
  if (isLoggingOut) return;
  isLoggingOut = true;
  storage.clearAuth();
  window.location.href = '/login';
};

const triggerLicenseBlock = () => {
  window.location.href = '/license-blocked';
};

// Xử lý queue khi refresh token thành công
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Tạo axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Thêm token vào header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Xử lý refresh token
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Đã quyết định logout → treo request, caller không nhận error → không toast
    if (isLoggingOut) {
      return PENDING_FOREVER;
    }

    // License bị khóa → redirect về trang thông báo
    if (error.response?.status === 402) {
      triggerLicenseBlock();
      return PENDING_FOREVER;
    }

    // Nếu lỗi 401 và chưa thử refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Nếu request đang là refresh token, redirect về login
      if (originalRequest.url === API_ENDPOINTS.REFRESH_TOKEN) {
        triggerLogoutRedirect();
        return PENDING_FOREVER;
      }

      // Nếu đang refresh token, thêm request vào queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Đánh dấu là đang refresh token
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = storage.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Gọi API refresh token
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.REFRESH_TOKEN}`, {
          token: storage.getToken(),
          refreshToken: refreshToken,
        });

        // Check for application level error
        if (response.data.err) {
          throw new Error(response.data.err);
        }

        const { token, refreshToken: newRefreshToken, ...userInfo } = response.data.content;

        // Lưu token mới
        storage.setToken(token);
        if (newRefreshToken) {
          storage.setRefreshToken(newRefreshToken);
        }

        // Cập nhật thông tin user nếu có
        if (userInfo) {
          const user = {
            id: userInfo.userId,
            fullName: userInfo.fullName,
            roles: userInfo.roles,
            role: userInfo.roles && userInfo.roles.length > 0 ? userInfo.roles[0] : null,
            ...userInfo
          };
          storage.setUser(user);
        }

        // Xử lý queue với token mới
        processQueue(null, token);

        // Thực hiện lại request gốc với token mới
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(originalRequest);

      } catch (refreshError) {
        // Treo tất cả request đang chờ trong queue — không reject để tránh toast
        failedQueue = [];

        // Xóa dữ liệu authentication và redirect về login
        triggerLogoutRedirect();

        return PENDING_FOREVER;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
