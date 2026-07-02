import api from '@/common/utils/api';

export const supplierApi = {
    getAll: (params?: any) => api.get('/suppliers', { params }),
    create: (data: any) => api.post('/suppliers', data),
    update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
    delete: (id: string) => api.delete(`/suppliers/${id}`),
};
