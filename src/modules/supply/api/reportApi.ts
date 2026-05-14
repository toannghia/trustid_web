import api from '@/common/utils/api';

export const reportApi = {
  getInventorySummary(params: { fromDate?: string; toDate?: string; warehouseId?: string }) {
    return api.get('/supply/reports/inventory-summary', { params });
  },

  getInventoryLedger(params: { warehouseId: string; batchId: string; fromDate?: string; toDate?: string }) {
    return api.get('/supply/reports/inventory-ledger', { params });
  }
};
