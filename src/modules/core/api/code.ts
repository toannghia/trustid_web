import api from '@/common/utils/api';

export const codeApi = {
  // sinh mã nội bộ [cite: 106]
  generate: (data: {
    name: string;
    quantity: number;
    prefix: string;
    includeLink: boolean;
    tenantId?: string; // chỉ dành cho system admin [cite: 104]
  }) => api.post('/codes/generate', data),

  // lấy danh sách các lô mã (code pools) [cite: 356-357]
  getPools: (params: any) => api.get('/codes/pools', { params }),

  // lấy chi tiết từng con tem (xử lý dữ liệu lớn) [cite: 111-112]
  getStampItems: (params: any) => api.get('/codes/items', { params }),

  // xuất file excel cho nhà in [cite: 123]
  exportExcel: (poolId: string) =>
    api.get(`/codes/${poolId}/export`, { responseType: 'blob' }),

  // nhập mã từ excel [cite: 62]
  importExcel: (formData: FormData) =>
    api.post('/codes/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
};