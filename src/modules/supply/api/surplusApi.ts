import api from '@/common/utils/api';

export const surplusApi = {
    listPools: () => api.get('/supply/surplus'),
    getPoolDetail: (id: string) => api.get(`/supply/surplus/${id}`),
    updateExpiry: (id: string, expiryDays: number) => api.patch(`/supply/surplus/${id}/expiry`, { expiry_days: expiryDays }),
    createOrderFromSurplus: (dto: { pool_id: string; entry_ids: string[]; notes?: string }) => api.post('/supply/surplus/create-order', dto),
    expireOldEntries: () => api.post('/supply/surplus/expire'),
};
