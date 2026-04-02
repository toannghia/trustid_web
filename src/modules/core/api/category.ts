import api from '@/common/utils/api';

export const categoryApi = {
  // lấy toàn bộ cây danh mục (hợp nhất chung + riêng) 
  getTree: () => api.get('/categories/tree'),

  // tạo danh mục mới [cite: 134, 434]
  create: (data: {
    name: string;
    parentId: string | null;
    code?: string;
  }) => api.post('/categories', data),

  // xóa danh mục (chỉ khi không có danh mục con) [cite: 135]
  delete: (id: string) => api.delete(`/categories/${id}`),

  // cập nhật danh mục 
  update: (id: string, data: { name: string; parentId?: string | null }) => api.put(`/categories/${id}`, data)
};