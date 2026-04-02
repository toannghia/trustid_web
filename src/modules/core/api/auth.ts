import api from '@/common/utils/api';

export const authApi = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  
  // Thêm hàm lấy thông tin Profile từ Token
  getProfile: () => api.get('/auth/profile'),
};