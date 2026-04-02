import api from '@/common/utils/api';

export interface Warehouse {
    id: string;
    name: string;
    address?: string;
    province?: string;
    ward?: string;
    projectedInfo?: {
        province?: string;
        ward?: string;
    };
    managerId?: string;
    manager?: {
        fullName: string;
    };
    coordinate?: {
        type: 'Point';
        coordinates: [number, number]; // [long, lat]
    };
    tenantId: string;
    createdAt?: string;
    isDefault?: boolean;
    type?: string;
    status?: string;
}

export interface TransportVehicle {
    id: string;
    licensePlate: string;
    type: string;
    capacityKg: number;
    status: string;
    driverId?: string;
    defaultDriverId?: string;
    defaultDriver?: {
        fullName: string;
        username: string;
    };
    imageUrl?: string;
}

export const transportApi = {
    // WAREHOUSES
    getWarehouses: () => api.get<Warehouse[]>('/supply/warehouses'),
    createWarehouse: (data: any) => api.post<Warehouse>('/supply/warehouses', data),
    updateWarehouse: (id: string, data: any) => api.patch<Warehouse>(`/supply/warehouses/${id}`, data),
    deleteWarehouse: (id: string) => api.delete(`/supply/warehouses/${id}`),

    // VEHICLES
    getVehicles: () => api.get<TransportVehicle[]>('/supply/vehicles'),
    createVehicle: (data: any) => api.post<TransportVehicle>('/supply/vehicles', data),
    updateVehicle: (id: string, data: any) => api.patch<TransportVehicle>(`/supply/vehicles/${id}`, data),
    deleteVehicle: (id: string) => api.delete(`/supply/vehicles/${id}`),

    // --- INVENTORY ---
    getStock: (warehouseId: string, params?: any) => api.get('/supply/inventory', { params: { warehouseId, ...params } }),
    getInventoryMovements: (warehouseId: string) => api.get('/supply/inventory/movements', { params: { warehouseId } }),
    inboundManual: (data: any) => api.post('/supply/inventory/inbound', data),
    
    // --- LOGISTICS ---
    createShipment: (data: any) => api.post('/supply/logistics/shipments', data),
    getShipments: (params?: any) => api.get<any[]>('/supply/logistics/shipments', { params }),
    getShipmentDetail: (id: string) => api.get<any>(`/supply/logistics/shipments/${id}`),
    updateShipment: (id: string, data: any) => api.patch(`/supply/logistics/shipments/${id}`, data),
    handshake: (data: any) => api.post('/supply/logistics/handshake', data)
};
