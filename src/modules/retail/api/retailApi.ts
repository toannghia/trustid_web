import api from '@/common/utils/api';

export const retailApi = {
    getSales: (params?: any) => api.get<any[]>('/retail/sales', { params }),
    createSale: (data: any) => api.post('/retail/sales', data),
    scanItem: (serial: string) => api.get<any>(`/retail/scan/${serial}`),
};
