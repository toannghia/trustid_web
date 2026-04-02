import api from '@/common/utils/api';

export const assetApi = {
    // 0. Danh sách cho Admin
    list: (params: any) => api.get('/perennial-assets', { params }),

    // 1. Tenant Admin khởi tạo Cây
    create: (data: any) => api.post('/perennial-assets', data),

    // 2. Danh sách cho Nông dân
    getForCaretaker: () => api.get('/perennial-assets/caretaker'),

    // 3. Danh sách cho Chủ sở hữu
    getForOwner: () => api.get('/perennial-assets/owner'),

    // 4. Chi tiết cây
    getDetail: (id: string) => api.get(`/perennial-assets/${id}`),

    // 5. Kích hoạt ngày trồng
    activate: (data: { qrCode: string; locationLat?: number; locationLong?: number }) => 
        api.post('/perennial-assets/activate', data),

    // 6. Thêm nhật ký
    addLog: (id: string, data: any) => api.post(`/perennial-assets/${id}/logs`, data),

    // 7. Chuyển nhượng
    transfer: (id: string, data: { toOwnerId: string; note?: string }) => 
        api.post(`/perennial-assets/${id}/transfer`, data),

    // 8. Cập nhật thông tin
    update: (id: string, data: any) => api.patch(`/perennial-assets/${id}`, data),

    // 9. Bản đồ: tổng quan vùng trồng + số cây
    getMapOverview: () => api.get('/perennial-assets/map-data'),

    // 10. Bản đồ: danh sách cây theo vùng trồng
    getTreesByLocation: (locationId: string) => api.get('/perennial-assets/map-data', { params: { locationId } }),
};
