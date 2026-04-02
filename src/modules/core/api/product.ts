import api from '@/common/utils/api';

export const productApi = {
  // Lấy danh sách sản phẩm của Tenant hiện tại [cite: 144]
  getList: (params: any) => api.get('/products', { params }),

  // Tạo mới sản phẩm kèm thuộc tính động [cite: 149, 336]
  create: (data: {
    name: string;
    gtin_code: string;
    category_id: string;
    attributes: Record<string, any>; // Lưu trữ dạng JSONB [cite: 336]
  }) => api.post('/products', data),

  // Cập nhật thông tin sản phẩm [cite: 149]
  update: (id: string, data: any) => api.put(`/products/${id}`, data),

  // Xóa sản phẩm
  delete: (id: string) => api.delete(`/products/${id}`),

  // Đồng bộ sản phẩm lên NDA
  syncNda: (id: string) => api.put(`/products/${id}/retry-sync`),

  // Tạo mới và đồng bộ NDA 
  createAndSync: (data: any) => api.post('/products', { ...data, syncNda: true })
};