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
    }
};
