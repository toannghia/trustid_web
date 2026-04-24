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

export interface CreateExternalBatchDto {
    batch_type: string;
    product_id: string;
    quantity: number;
    qr_code_serial?: string;
    target_tenant_id?: string;
    source_info?: any;
    images?: string[];
}

export interface ExportBatchDto {
    sourceBatchId: string;
    quantity: number;
    targetTenantId: string;
    qrCodeSerial?: string;
}

export interface AssignCodesToBatchDto {
    start_serial: string;
    end_serial: string;
    excluded_serials?: string[];
}

export const supplyApi = {
    // Packaging
    createBatch(data: CreateBatchDto) {
        return api.post(`${baseUrl}/batches`, data);
    },
    createExternalBatch(data: CreateExternalBatchDto) {
        return api.post(`${baseUrl}/batches/external`, data);
    },
    getExternalBatches() {
        return api.get<any[]>(`${baseUrl}/batches/external`);
    },
    updateExternalBatch(id: string, data: Partial<CreateExternalBatchDto>) {
        return api.patch(`${baseUrl}/batches/external/${id}`, data);
    },
    deleteExternalBatch(id: string) {
        return api.delete(`${baseUrl}/batches/external/${id}`);
    },
    assignCodesToBatch(batchId: string, data: AssignCodesToBatchDto) {
        return api.post(`${baseUrl}/batches/${batchId}/assign-codes`, data);
    },
    exportBatch(data: ExportBatchDto) {
        return api.post(`${baseUrl}/batches/export`, data);
    },
    transferBatch(id: string, targetTenantId: string) {
        return api.post(`${baseUrl}/batches/${id}/transfer`, { targetTenantId });
    },
    lookupBatchByQr(code: string) {
        return api.get(`${baseUrl}/batches/lookup-qr`, { params: { code } });
    },
    receiveBatch(qrCode: string) {
        return api.post(`${baseUrl}/batches/receive`, { qrCode });
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
    finishBatch(id: string) {
        return api.post<any>(`${baseUrl}/batches/${id}/finish`);
    },
    cancelBatch(id: string) {
        return api.post<any>(`${baseUrl}/batches/${id}/cancel`);
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
