import api from '@/common/utils/api';

const baseUrl = '/supply/inventory';

export const inventoryApi = {
    getStockSummary(filters?: any) {
        return api.get<any[]>(`${baseUrl}/summary`, { params: filters });
    },
    getStockDetails(warehouseId: string, filters?: any) {
        return api.get<any[]>(`${baseUrl}`, { params: { warehouseId, ...filters } });
    },
    getMovements(warehouseId: string, filters?: any) {
        return api.get<any[]>(`${baseUrl}/movements`, { params: { warehouseId, ...filters } });
    },
    getBalanceReport(warehouse_id: string, date_from: string, date_to: string) {
        return api.get<any>(`${baseUrl}/balance-report`, { params: { warehouse_id, date_from, date_to } });
    }
};
