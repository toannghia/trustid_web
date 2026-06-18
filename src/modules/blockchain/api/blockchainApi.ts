import api from '@/common/utils/api';

export const blockchainApi = {
  getStamps: (params?: any) => api.get('/blockchain/stamps', { params }),
  verifyStamp: (batchId: string) => api.get(`/blockchain/stamps/${batchId}/verify`),
  getGroups: (params?: any) => api.get('/blockchain/groups', { params }),
  getGroupDetail: (groupId: string) => api.get(`/blockchain/groups/${groupId}`),
  getStats: (params?: any) => api.get('/blockchain/stats', { params }),
  getWalletInfo: () => api.get('/blockchain/wallet'),
  triggerStampNow: () => api.post('/blockchain/stamp-now'),
  stampSingleBatch: (batchId: string) => api.post(`/blockchain/stamps/${batchId}/stamp-now`),
  getMetadata: (groupCode: string) => api.get(`/blockchain/metadata/${groupCode}`),
  exportStamps: (params?: any) => api.get('/blockchain/export', { params }),
};
