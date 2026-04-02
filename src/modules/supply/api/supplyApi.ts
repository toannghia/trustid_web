import api from '@/common/utils/api';

const baseUrl = '/supply';

export interface CreateBatchDto {
    farm_batch_code: string;
    product_id: string; // Changed from gtin
}

export interface ActivateItemDto {
    batch_id: string;
    serial_number: string;
    quantity: number;
}

export interface SerialRangeDto {
    start: string;
    end: string;
}

export interface AddItemsDto {
    batch_id: string;
    codes?: string[];
    ranges?: SerialRangeDto[];
    parent_code?: string;
    pool_id?: string;
}

export interface CreateShipmentDto {
    receiver_id: string;
    driver_id: string;
    vehicle_plate: string;
    items: { batch_id: string; quantity: number }[];
}

export const supplyApi = {
    // Packaging
    createBatch(data: CreateBatchDto) {
        return api.post(`${baseUrl}/batches`, data);
    },
    getHarvestStats(harvestCode: string) {
        return api.get(`${baseUrl}/packaging/harvest-stats`, { params: { harvestCode } });
    },
    getBatches() {
        return api.get<any[]>(`${baseUrl}/batches`);
    },
    getBatch(id: string) {
        return api.get<any>(`${baseUrl}/batches/${id}`);
    },
    getBatchItems(batchId: string) {
        return api.get<any[]>(`${baseUrl}/batches/${batchId}/items`);
    },
    getAllItems(params?: any) {
        return api.get<any[]>(`${baseUrl}/packaging/items`, { params });
    },
    // Old single activation (keep for backward compat if needed, or remove)
    activateItem(data: ActivateItemDto) {
        return api.post(`${baseUrl}/packaging/activate`, data);
    },
    // NEW Bulk Add
    addItems(data: AddItemsDto) {
        return api.post(`${baseUrl}/packaging/add-items`, data);
    },

    // Logistics
    createShipment(data: CreateShipmentDto) {
        return api.post(`${baseUrl}/logistics/shipments`, data);
    },
    handshake(data: any) {
        return api.post(`${baseUrl}/logistics/handshake`, data);
    }
};
