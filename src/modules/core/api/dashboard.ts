import api from '@/common/utils/api';

export const dashboardApi = {
  // Lấy số liệu thống kê cho Regulator (Tỉnh/Huyện) [cite: 165]
  getRegulatorStats: (params?: { province_code?: string }) =>
    api.get('/regulator/audit/dashboard', { params }),

  // Lấy số liệu tổng quát cho System Admin
  getSystemStats: () => api.get('/admin/stats/summary'),

  // Lấy dữ liệu sử dụng Quota của các Tenant lớn
  getQuotaAnalytics: () => api.get('/admin/stats/quota-usage'),

  // [NEW] Tenant Dashboard
  getTenantStats: () => api.get('/tenant/dashboard/summary'),
  getTenantActivity: () => api.get('/tenant/dashboard/activity'),
  getTenantMaps: () => api.get('/tenant/dashboard/maps'),

  // Admin Map: all locations cross-tenant
  getAdminLocationsMap: (tenantId?: string) =>
    api.get('/admin/stats/locations-map', { params: tenantId ? { tenantId } : {} }),

  // Tenant list for filter dropdown
  getTenantsList: () => api.get('/admin/stats/tenants/latest'),

  // Boundary Approval
  getPendingApprovals: () => api.get('/farm/locations/admin/pending-approvals'),
  approveBoundary: (id: string) => api.post(`/farm/locations/admin/${id}/approve-boundary`),
  rejectBoundary: (id: string) => api.post(`/farm/locations/admin/${id}/reject-boundary`),
};