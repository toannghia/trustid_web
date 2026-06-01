import api from '@/common/utils/api';

const baseUrl = '/supply';

export interface CreateProductionOrderDto {
    product_id: string;
    source_type: 'FARM' | 'EXTERNAL' | 'CROSS_TENANT';
    source_batch_id?: string;
    farm_batch_code?: string;
    planned_weight_kg: number;
    unit_weight_kg?: number;
    weight_tolerance_pct?: number;
    planned_date?: string;
    notes?: string;
    operator_id?: string;
    serial_prefix?: string;
    serial_range_start?: number;
    serial_range_end?: number;
    excluded_serials?: string[];
}

export interface CreateBagOrderDto extends CreateProductionOrderDto {
    packaging_spec: number;
    spare_packet_quantity?: number;
    spare_bag_quantity?: number;
    generate_codes_immediately?: boolean;
}

export interface ApproveProductionOrderDto {
    approved: boolean;
    rejection_reason?: string;
}

export interface CreateProductionTicketDto {
    order_id: string;
    ticket_type: 'PACKAGING' | 'BAGGING' | 'PALLET';
    planned_weight_kg?: number;
    serial_prefix?: string;
    serial_range_start?: number;
    serial_range_end?: number;
    excluded_serials?: string[];
    pallet_code?: string;
    pallet_is_reusable?: boolean;
    items_per_pallet?: number;
    operator_id?: string;
}

export interface CompleteProductionTicketDto {
    actual_weight_kg: number;
    serials?: string[];
    child_serials?: string[];
}

export interface RejectProductionTicketDto {
    reason: string;
}

export const productionOrderApi = {
    // Orders
    getOrders(params?: { status?: string; page?: number; limit?: number }) {
        return api.get(`${baseUrl}/production-orders`, { params });
    },
    createOrder(data: CreateProductionOrderDto) {
        return api.post(`${baseUrl}/production-orders`, data);
    },
    getOrderDetail(id: string) {
        return api.get(`${baseUrl}/production-orders/${id}`);
    },
    approveOrder(id: string, data: ApproveProductionOrderDto) {
        return api.post(`${baseUrl}/production-orders/${id}/approve`, data);
    },
    cancelOrder(id: string) {
        return api.post(`${baseUrl}/production-orders/${id}/cancel`);
    },

    // Tickets
    createTicket(data: CreateProductionTicketDto) {
        return api.post(`${baseUrl}/production-tickets`, data);
    },
    getTicketDetail(id: string) {
        return api.get(`${baseUrl}/production-tickets/${id}`);
    },
    startTicket(id: string) {
        return api.post(`${baseUrl}/production-tickets/${id}/start`);
    },
    completeTicket(id: string, data: CompleteProductionTicketDto) {
        return api.post(`${baseUrl}/production-tickets/${id}/complete`, data);
    },
    rejectTicket(id: string, data: RejectProductionTicketDto) {
        return api.post(`${baseUrl}/production-tickets/${id}/reject`, data);
    },
    releasePalletCode(id: string) {
        return api.post(`${baseUrl}/production-tickets/${id}/release-pallet`);
    },

    // Bag Packaging Workflows
    createBagOrder(data: CreateBagOrderDto) {
        return api.post(`${baseUrl}/production-orders/bag-packaging`, data);
    },
    exportPacketCodesExcel(id: string) {
        return api.get(`${baseUrl}/production-orders/${id}/export-packet-codes`, { responseType: 'blob' });
    },
    exportBagCodesExcel(id: string) {
        return api.get(`${baseUrl}/production-orders/${id}/export-bag-codes`, { responseType: 'blob' });
    },
    getLotMappings(id: string) {
        return api.get(`${baseUrl}/production-orders/${id}/lot-mappings`);
    },
    linkBag(id: string, data: any) {
        return api.post(`${baseUrl}/production-orders/${id}/link-bag`, data);
    },
    replacePacket(id: string, data: any) {
        return api.post(`${baseUrl}/production-orders/${id}/replace-packet`, data);
    },
    completeBagOrder(id: string) {
        return api.post(`${baseUrl}/production-orders/${id}/complete`);
    },
    updateOrder(id: string, data: any) {
        return api.post(`${baseUrl}/production-orders/${id}/update`, data);
    }
};
