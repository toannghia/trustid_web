import api from '@/common/utils/api';

export const regulatorApi = {
  // doanh nghiệp gửi yêu cầu phê duyệt [cite: 154, 438]
  sendRequest: (data: {
    request_type: 'GLN_ISSUANCE' | 'PROCESS_TEMPLATE';
    target_ref_id: string; // id vùng trồng hoặc quy trình
    province_code: string;
    district_code?: string;
  }) => api.post('/regulator/requests', data),

  // cán bộ lấy danh sách hồ sơ thuộc địa bàn quản lý [cite: 157, 439]
  getRequests: (params: { status?: string; province_code?: string }) =>
    api.get('/regulator/requests', { params }),

  // thực hiện phê duyệt/từ chối hồ sơ (chung 1 endpoint backend)
  approve: (id: string, status: 'APPROVED' | 'REJECTED', comment: string) =>
    api.post(`/regulator/requests/${id}/approve`, { status, comment }),

  // dashboard thống kê
  getDashboardStats: () => api.get('/regulator/audit/dashboard')
};