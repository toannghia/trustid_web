import api from '@/common/utils/api';

const txngApi = {
    // Dashboard
    getSummary: (tenantId?: string) =>
        api.get('/txng/dashboard/summary', { params: { tenantId } }),

    getTimeline: (range: string = '24h') =>
        api.get('/txng/dashboard/timeline', { params: { range } }),

    getChainStatus: (tenantId?: string) =>
        api.get('/txng/dashboard/chain-status', { params: { tenantId } }),

    // Logs
    getLogs: (params: {
        page?: number;
        limit?: number;
        entityType?: string;
        syncStatus?: string;
        tenantId?: string;
        dateFrom?: string;
        dateTo?: string;
    }) => api.get('/txng/logs', { params }),

    getLogDetail: (id: string) =>
        api.get(`/txng/logs/${id}`),

    // Mappings
    getMappings: (params: { entityType?: string; tenantId?: string }) =>
        api.get('/txng/mappings', { params }),

    // Manual Actions
    triggerManualSync: (body: { entityType: string; internalId: string }) =>
        api.post('/txng/sync/manual', body),

    triggerFullChainSync: (tenantId: string) =>
        api.post('/txng/sync/full-chain', { tenantId }),

    retryFailed: (logId: string) =>
        api.post(`/txng/sync/retry/${logId}`),

    retryAllFailed: (tenantId?: string) =>
        api.post('/txng/sync/retry-all-failed', null, { params: { tenantId } }),

    syncCatalogs: () =>
        api.post('/txng/sync/catalogs'),

    // Health
    getTokenHealth: () =>
        api.get('/txng/health/token'),

    refreshToken: () =>
        api.post('/txng/health/token/refresh'),

    pingApi: () =>
        api.post('/txng/health/ping'),

    // Products & Catalogs
    getProductSyncStatus: (tenantId?: string) =>
        api.get('/txng/products/sync-status', { params: { tenantId } }),

    linkProduct: (gtin: string, tenantId: string) =>
        api.post('/txng/link/product', { gtin, tenantId }),

    verifyLot: (batchId: string) =>
        api.post(`/txng/verify/lot/${batchId}`),

    getCatalogs: () =>
        api.get('/txng/catalogs'),
};

export { txngApi };
export default txngApi;

