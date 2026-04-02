import api from '@/common/utils/api';
import type { Tenant } from '@/types/core';

export const tenantApi = {
  // Lấy danh sách doanh nghiệp [cite: 77]
  getAll: (params: any) => api.get('/tenants', { params }),
  getById: (id: string) => api.get(`/tenants/${id}`),

  // Tạo mới hoặc cập nhật doanh nghiệp [cite: 79]
  create: (data: Partial<Tenant>) => api.post('/tenants', data),
  update: (id: string, data: Partial<Tenant>) => api.put(`/tenants/${id}`, data),

  // Cấu hình bật/tắt module (IoT, Farm, Retail...) [cite: 83]
  updateModules: (id: string, moduleName: string, enable: boolean) =>
    api.patch(`/tenants/${id}/modules`, { moduleName, enable }),

  // Cấp thêm hạn mức mã tem (Quota) [cite: 86]
  grantQuota: (id: string, amount: number) =>
    api.post(`/tenants/${id}/grant-quota`, { amount })
};