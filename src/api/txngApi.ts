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

    syncCatalogByKey: (key: string) =>
        api.post(`/txng/sync/catalogs/${key}`),

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

    getProductByGtin: (gtin: string) =>
        api.get(`/txng/product/${gtin}`),

    linkProduct: (gtin: string, tenantId: string) =>
        api.post('/txng/link/product', { gtin, tenantId }),

    verifyLot: (batchId: string) =>
        api.post(`/txng/verify/lot/${batchId}`),

    getCatalogs: () =>
        api.get('/txng/catalogs'),

    getCatalogByKey: (key: string) =>
        api.get(`/txng/catalogs/${key}`),

    // Enterprise
    getEnterpriseList: () =>
        api.get('/txng/enterprise'),

    getEnterpriseById: (id: string) =>
        api.get(`/txng/enterprise/${id}`),

    // Locations
    getLocationList: (page = 1, pageSize = 50) =>
        api.get('/txng/locations', { params: { page, pageSize } }),

    // Certifications
    getCertifications: (params?: { idChuoiSanXuat?: string; page?: number; pageSize?: number }) =>
        api.get('/txng/certifications', { params }),

    addCertification: (data: any) =>
        api.post('/txng/certifications', data),

    updateCertification: (id: string, data: any) =>
        api.put(`/txng/certifications/${id}`, data),

    confirmCertification: (id: string, data: any) =>
        api.put(`/txng/certifications/${id}/confirm`, data),

    deleteCertification: (id: string, tenantId: string) =>
        api.delete(`/txng/certifications/${id}`, { params: { tenantId } }),

    // Common
    getGroupCategories: () =>
        api.get('/txng/common/group-categories'),

    // Stage Simulator
    stageGetTemplates: (ctx: any) =>
        api.post('/txng/stage/templates', ctx),

    stageCreateLenhSX: (body: { sessionId?: string; data: any; gtin?: string }) =>
        api.post('/txng/stage/lenh-san-xuat', body),

    stageConfirmLenhSX: (id: string, body: { sessionId: string; data: any }) =>
        api.put(`/txng/stage/lenh-san-xuat/${id}`, body),

    stageCreateEvent: (body: { sessionId: string; stageKey: string; stepOrder: number; data: any; gtin?: string; traceCode?: string }) =>
        api.post('/txng/stage/event', body),

    stageConfirmEvent: (id: string, body: { sessionId: string; stageKey: string; stepOrder: number; data: any }) =>
        api.put(`/txng/stage/event/${id}`, body),

    stageDeleteEvent: (id: string, body: { sessionId: string; stageKey: string; stepOrder: number }) =>
        api.delete(`/txng/stage/event/${id}`, { data: body }),

    stageUploadImage: (eventId: string, file: File, sessionId: string, stepOrder: number) => {
        const form = new FormData();
        form.append('file', file);
        form.append('sessionId', sessionId);
        form.append('stepOrder', String(stepOrder));
        return api.post(`/txng/stage/event/${eventId}/image`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    stageCreateLocation: (body: { sessionId: string; stepOrder: number; data: any }) =>
        api.post('/txng/stage/location', body),

    stageGetChain: (traceCode: string) =>
        api.get(`/txng/stage/chain/${traceCode}`),

    stageListSessions: (limit = 20) =>
        api.get('/txng/stage/sessions', { params: { limit } }),

    stageGetSession: (sessionId: string) =>
        api.get(`/txng/stage/sessions/${sessionId}`),
};

export { txngApi };
export default txngApi;
