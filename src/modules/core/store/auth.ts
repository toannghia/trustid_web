import { defineStore } from 'pinia';
import { authApi } from '../api/auth';
import router from '@/router';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    token: localStorage.getItem('access_token') || '',
    isAuthenticated: !!localStorage.getItem('access_token'),
  }),

  actions: {
    // Hàm chuẩn hóa: Ép dữ liệu viết hoa của Backend vào cấu trúc Frontend
    normalizeUser(userData: any) {
      if (!userData) return null;
      // Xử lý trường hợp role là object (nếu backend trả về relation) hoặc string
      const rawRole = userData.role || userData.ROLE || userData.roles || userData.ROLES;
      let roleName = (typeof rawRole === 'object' && rawRole?.name) ? rawRole.name : (rawRole || userData.NAME || 'GUEST');

      if (typeof roleName === 'string') {
        roleName = roleName.toUpperCase();
        // Fallback map cho role gov -> REGULATOR
        if (roleName === 'GOV' || roleName === 'CƠ QUAN QUẢN LÝ' || roleName === 'REGULATOR_OFFICER') {
          roleName = 'REGULATOR';
        }
        if (roleName === 'TRANSPORTER' || roleName === 'VẬN CHUYỂN' || roleName === 'LÁI XE' || roleName === 'SHIPPER') {
          roleName = 'DRIVER';
        }
        console.log('[AUTH] Normalized role:', roleName, '| Raw:', rawRole);
      }

      return {
        id: userData.ID || userData.id,
        // Role phải là string (VD: "ADMIN") để khớp với Sidebar
        role: roleName,
        // Lấy NAME làm tên hiển thị nếu FULL_NAME trống
        full_name: userData.full_name || userData.fullName || userData.FULL_NAME || userData.NAME || 'Người dùng',
        fullName: userData.full_name || userData.fullName || userData.FULL_NAME || userData.NAME || 'Người dùng', // Add camelCase alias
        username: userData.USERNAME || userData.username || '',
        // Fix Avatar URL: Nếu là đường dẫn tương đối (bắt đầu bằng /) thì nối thêm domain API
        // Fix Avatar URL: Nếu là đường dẫn tương đối (không có http) thì nối thêm domain API
        avatar: (userData.avatar && !userData.avatar.startsWith('http'))
          ? `${import.meta.env.VITE_API_URL}${userData.avatar.startsWith('/') ? '' : '/'}${userData.avatar}`
          : (userData.avatar || ''),
        permissions: userData.PERMISSIONS || userData.permissions || [],
        tenantId: userData.tenantId || userData.tenant_id || userData.TENANT_ID,
        tenant_name: (userData.tenant && userData.tenant.name) 
          ? userData.tenant.name 
          : (roleName === 'ADMIN' ? 'System Administrator' : (roleName === 'REGULATOR' ? 'Cơ quan Quản lý Nhà nước' : 'Unknown Enterprise'))
      };
    },

    async login(credentials: any) {
      const { data } = await authApi.login(credentials);
      this.token = data.access_token;
      // Chuẩn hóa dữ liệu ngay khi đăng nhập thành công
      this.user = this.normalizeUser(data.user);
      this.isAuthenticated = true;
      localStorage.setItem('access_token', data.access_token);

      // Buộc lấy lại profile đầy đủ để đảm bảo có Role chuẩn
      await this.fetchProfile();

      return true;
    },

    async fetchProfile() {
      if (!this.token) return;
      try {
        const { data } = await authApi.getProfile();
        // Chuẩn hóa dữ liệu khi nhấn F5 (Re-hydration)
        this.user = this.normalizeUser(data);
        this.isAuthenticated = true;
      } catch (error) {
        this.logout();
        throw error;
      }
    },

    logout() {
      this.user = null;
      this.token = '';
      this.isAuthenticated = false;
      localStorage.removeItem('access_token');
      router.push('/login');
    }
  }
});