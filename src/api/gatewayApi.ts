import axios from 'axios';

// Sử dụng proxy path để tránh CORS (Vite sẽ chuyển tiếp đến localhost:3003)
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_API_URL || '/gateway-api';

// Key mặc định cho môi trường dev (như trong tài liệu)
const ADMIN_KEY = import.meta.env.VITE_GATEWAY_ADMIN_KEY || 'admin_secret_key_change_me_in_production';

const gatewayApi = axios.create({
    baseURL: GATEWAY_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'x-admin-secret-key': ADMIN_KEY
    }
});

// Response interceptor để xử lý lỗi chung
gatewayApi.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('Gateway API Error:', error);
        return Promise.reject(error);
    }
);

export default gatewayApi;
