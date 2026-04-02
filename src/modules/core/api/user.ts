import api from '@/common/utils/api';

export const userApi = {
  // Lấy danh sách user kèm bộ lọc: search, tenantId, roleName 
  getList: (params: {
    page: number;
    limit: number;
    search?: string;
    tenantId?: string;
    roleName?: string;
    regulatorId?: string;
    excludeRole?: string;
  }) => api.get('/users', { params }),

  // Tạo mới/Cập nhật thông tin user 
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`)
};