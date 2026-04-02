import api from '@/common/utils/api';

export const gatewayApi = {
    getConnections: () => api.get('/gateway/dashboard/connections'),
    getStats: () => api.get('/gateway/dashboard/stats'),
    getLogs: (limit: number = 50) => api.get('/gateway/dashboard/logs', { params: { limit } }),
    getJobs: () => api.get('/gateway/dashboard/jobs')
};
