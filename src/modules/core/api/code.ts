import api from '@/common/utils/api';

export const codeApi = {
  // sinh mã nội bộ
  generate: (data: {
    name: string;
    quantity: number;
    prefix: string;
    includeLink: boolean;
    tenantId?: string;
  }) => api.post('/codes/generate', data),

  // lấy danh sách các lô mã (code pools)
  getPools: (params: any) => api.get('/codes/pools', { params }),

  // lấy chi tiết từng con tem
  getStampItems: (params: any) => api.get('/codes/items', { params }),

  // thống kê tổng quan mã
  getStats: () => api.get('/codes/stats'),

  // xuất file excel cho nhà in
  exportExcel: (poolId: string) =>
    api.get(`/codes/${poolId}/export`, { responseType: 'blob' }),

  // nhập mã từ excel
  importExcel: (formData: FormData) =>
    api.post('/codes/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
};