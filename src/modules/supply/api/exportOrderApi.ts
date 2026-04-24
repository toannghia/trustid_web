import api from '@/common/utils/api';

const baseUrl = '/supply/export-orders';

export const exportOrderApi = {
    getNextCode() {
        return api.get<{code: string}>(`${baseUrl}/next-code`);
    },
    create(data: any) {
        return api.post<any>(baseUrl, data);
    },
    getOrders(filters?: any) {
        return api.get<any[]>(baseUrl, { params: filters });
    },
    getDetail(id: string) {
        return api.get<any>(`${baseUrl}/${id}`);
    },
    getScanLogs(id: string) {
        return api.get<any>(`${baseUrl}/${id}/scan-logs`);
    },
    confirm(id: string) {
        return api.post<any>(`${baseUrl}/${id}/confirm`);
    },
    assignWarehouse(id: string, warehouseId: string) {
        return api.post<any>(`${baseUrl}/${id}/assign-warehouse`, { warehouseId });
    },
    scanItem(id: string, qrCode: string) {
        return api.post<any>(`${baseUrl}/${id}/scan`, { qrCode });
    },
    unscanItem(id: string, serial: string) {
        return api.delete<any>(`${baseUrl}/${id}/scan/items/${serial}`);
    },
    unscanBox(id: string, parentCode: string) {
        return api.delete<any>(`${baseUrl}/${id}/scan/boxes/${parentCode}`);
    },
    finishPicking(id: string, data?: { vehicleId?: string }) {
        return api.post<any>(`${baseUrl}/${id}/finish-picking`, data || {});
    },
    cancel(id: string) {
        return api.post<any>(`${baseUrl}/${id}/cancel`);
    },
    createDelivery(id: string, data: { vehicleId: string }) {
        return api.post<any>(`${baseUrl}/${id}/create-delivery`, data);
    }
};
