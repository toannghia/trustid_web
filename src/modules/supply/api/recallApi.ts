import api from '@/common/utils/api';

export const recallApi = {
  getOrders(params?: { status?: string; page?: number; limit?: number }) {
    return api.get('/supply/recalls', { params });
  },

  getOrderDetail(id: string) {
    return api.get(`/supply/recalls/${id}`);
  },

  createOrder(payload: {
    productId: string;
    batchIds: string[];
    reason: string;
    severity?: string;
    initiatedBy?: string;
    notes?: string;
  }) {
    return api.post('/supply/recalls', payload);
  },

  issueOrder(id: string) {
    return api.post(`/supply/recalls/${id}/issue`);
  },

  dealerConfirm(id: string) {
    return api.post(`/supply/recalls/${id}/dealer-confirm`);
  },

  createReturnShipment(id: string, payload: {
    destinationWarehouseId: string;
    vehiclePlate?: string;
    itemIds: string[];
  }) {
    return api.post(`/supply/recalls/${id}/return-shipment`, payload);
  },

  receiveReturn(id: string, payload: { itemIds: string[]; warehouseId: string }) {
    return api.post(`/supply/recalls/${id}/receive`, payload);
  },

  inspectItem(itemId: string, payload: { result: string; notes?: string }) {
    return api.post(`/supply/recalls/items/${itemId}/inspect`, payload);
  },

  disposeItems(payload: {
    recallOrderId: string;
    itemIds: string[];
    warehouseId: string;
    notes?: string;
  }) {
    return api.post('/supply/recalls/items/dispose', payload);
  },

  restockItems(payload: {
    recallOrderId: string;
    itemIds: string[];
    warehouseId: string;
  }) {
    return api.post('/supply/recalls/items/restock', payload);
  },

  completeOrder(id: string) {
    return api.post(`/supply/recalls/${id}/complete`);
  },

  getReport(params?: { fromDate?: string; toDate?: string }) {
    return api.get('/supply/recalls/report', { params });
  },
};
