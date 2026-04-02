import api from '@/common/utils/api';

const baseUrl = '/shipments-v2';

export interface CreateInternalTransferDto {
    source_warehouse_id: string;
    destination_warehouse_id: string;
    batch_id?: string;
    notes?: string;
    driver_id?: string;
    vehicle_plate?: string;
    vehicle_id?: string;
    expected_delivery_time?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    items?: any[];
}

export interface CreateDealerExportDto {
    dealer_id: string;
    batch_id?: string;
    quantity: number;
    source_warehouse_id: string;
    notes?: string;
    driver_id?: string;
    vehicle_id?: string;
    expected_delivery_time?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    items?: any[];
}

export const shipmentV2Api = {
    createInternal(data: CreateInternalTransferDto) {
        return api.post(`${baseUrl}/internal`, data);
    },
    createDealerExport(data: CreateDealerExportDto) {
        return api.post(`${baseUrl}/dealer-export`, data);
    },
    scanItem(id: string, qrCode: string) {
        return api.post(`${baseUrl}/${id}/scan`, { qr_code: qrCode });
    },
    confirmReceive(id: string) {
        return api.post(`${baseUrl}/${id}/confirm-receive`);
    },
    getShipments(params?: any) {
        return api.get<any[]>(baseUrl, { params });
    },
    getDetail(id: string) {
        return api.get<any>(`${baseUrl}/${id}`);
    },
    getPendingExport() {
        return api.get<any[]>(`${baseUrl}/pending-export`);
    },
    getPendingReceive() {
        return api.get<any[]>(`${baseUrl}/pending-receive`);
    },
    confirmExport(id: string) {
        return api.post(`${baseUrl}/${id}/confirm-export`);
    }
};
