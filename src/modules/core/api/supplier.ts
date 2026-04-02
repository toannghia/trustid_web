import api from '@/common/utils/api';

export const supplierApi = {
    getAll: () => api.get('/suppliers'),
    create: (data: any) => api.post('/suppliers', data),
    update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
    delete: (id: string) => api.delete(`/suppliers/${id}`),
};
