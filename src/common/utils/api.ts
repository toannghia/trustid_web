import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

console.log('API Base URL:', api.defaults.baseURL);

// bộ chặn yêu cầu (request interceptor): gắn token vào mỗi request [cite: 181-182]
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// bộ chặn phản hồi (response interceptor): xử lý lỗi 401 [cite: 189-190]
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Bỏ qua việc đẩy về trang login nếu đang ở trang login hoặc gọi API đăng nhập
      const isAuthRequest = error.config?.url?.includes('/auth/login');
      const isLoginPage = window.location.pathname === '/login';

      if (!isAuthRequest && !isLoginPage) {
        // token hết hạn hoặc không hợp lệ -> logout & chuyển về login
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;