import api from '@/common/utils/api';

const baseUrl = '/farm';

export interface Location {
    id: string;
    code: string;
    name: string;
    address: string;
    areaM2: number;
    plantType?: string;
    managerName?: string;
    coordinate: any;
    boundary?: any;
    province?: string;
    ward?: string;
    status: string;
    approvalStatus?: string;
    pendingBoundary?: any;
    // EUDR
    eudrStatus?: string;
    violationRate?: number;
    lastCheckDate?: string;
    checkLog?: any;
    masterGrowingAreaId?: string;
    masterGrowingArea?: MasterGrowingArea;
    farmerId?: string;
    farmer?: any;
    leaderId?: string;
    leader?: any;
}

export interface MasterGrowingArea {
    id: string;
    code: string;
    name: string;
    address?: string;
    province?: string;
    ward?: string;
    ownerName?: string;
    managerName?: string;
    plantType?: string;
    maxAreaM2: number;
    tenantId: string;
    status: string;
    locations?: Location[];
    leaders?: any[];
}

export interface ProcessTemplate {
    id: string;
    name: string;
    tasksConfig: any[];
    isActive: boolean;
}

export interface CropCycle {
    id: string;
    name: string;
    locationId: string;
    templateId: string;
    startDate: string;
    status: string;
    location?: Location;
    cycleProducts?: Array<{
        id: string;
        productId: string;
        product?: { id: string; name: string };
        isPrimary: boolean;
    }>;
}

export interface Material {
    id: string;
    code: string;
    name: string;
    type: string;
    unit: string;
    description: string;
    stockQuantity: number;
    isActive: boolean;
}

export interface MaterialInventory {
    id: string;
    materialId: string;
    type: string;
    quantity: number;
    notes: string;
    createdAt: string;
}

export interface Harvest {
    id: string;
    cropCycleId: string;
    batchCode: string;
    harvestDate: string;
    quantityKg: number;
    notes: string;
    status: string; // CREATED, READY_FOR_PACKAGING, COMPLETED
    expiryDate?: string;
    cropCycle?: CropCycle;
    productId?: string;
    product?: { id: string; name: string };
}

export interface KcsInspection {
    id: string;
    locationId: string;
    inspectorId: string;
    status: string; // PASSED, FAILED, PENDING
    notes: string;
    reportFiles: string[];
    inspectionDate: string;
    inspector?: any;
}

export const farmApi = {
    // Locations
    getLocations(params?: any) {
        return api.get<Location[]>(`${baseUrl}/locations`, { params });
    },
    getLocationById(id: string) {
        return api.get<Location>(`${baseUrl}/locations/${id}`);
    },
    createLocation(data: { name: string; address?: string; area_m2?: number; lat: number; long: number; code?: string; plant_type?: string; manager_name?: string; province?: string; ward?: string }) {
        return api.post<Location>(`${baseUrl}/locations`, data);
    },
    updateLocation(id: string, data: Partial<{ name: string; address?: string; area_m2?: number; lat: number; long: number; code?: string; plant_type?: string; manager_name?: string; province?: string; ward?: string; masterGrowingAreaId?: string; farmerId?: string; leaderId?: string; }>) {
        return api.patch<Location>(`${baseUrl}/locations/${id}`, data);
    },
    deleteLocation(id: string) {
        return api.delete(`${baseUrl}/locations/${id}`);
    },
    getLeaderMap() {
        return api.get<Location[]>(`${baseUrl}/locations/leader/map`);
    },

    // Master Growing Areas
    getMasterGrowingAreas(params?: any) {
        return api.get<MasterGrowingArea[]>(`${baseUrl}/master-growing-areas`, { params });
    },
    createMasterGrowingArea(data: { code: string; name: string; address?: string; province?: string; ward?: string; ownerName?: string; managerName?: string; plantType?: string; leaderIds?: string[]; maxAreaM2?: number; }) {
        return api.post<MasterGrowingArea>(`${baseUrl}/master-growing-areas`, data);
    },
    updateMasterGrowingArea(id: string, data: Partial<{ name: string; address: string; province: string; ward: string; ownerName: string; managerName: string; plantType: string; leaderIds: string[]; maxAreaM2: number; }>) {
        return api.patch<MasterGrowingArea>(`${baseUrl}/master-growing-areas/${id}`, data);
    },
    getMasterGrowingAreaLeaders(id: string) {
        return api.get<any[]>(`${baseUrl}/master-growing-areas/${id}/leaders`);
    },
    getMasterGrowingAreaMapDetail(id: string) {
        return api.get<MasterGrowingArea>(`${baseUrl}/master-growing-areas/${id}/map`);
    },

    // Templates
    getTemplates(params?: any) {
        return api.get<any>(`${baseUrl}/templates`, { params });
    },
    createTemplate(data: { name: string; tasks_config: any[] }) {
        return api.post<ProcessTemplate>(`${baseUrl}/templates`, data);
    },
    updateTemplate(id: string, data: Partial<{ name: string; tasks_config: any[] }>) {
        return api.patch<ProcessTemplate>(`${baseUrl}/templates/${id}`, data);
    },

    // Cycles
    getCycles(params?: any) {
        return api.get<any>(`${baseUrl}/cycles`, { params });
    },
    startCycle(data: { location_id: string; template_id: string; name: string; start_date: string; product_ids?: string[] }) {
        return api.post<CropCycle>(`${baseUrl}/cycles`, data);
    },
    updateCycle(id: string, data: Partial<{ location_id: string; template_id: string; name: string; start_date: string }>) {
        return api.patch<CropCycle>(`${baseUrl}/cycles/${id}`, data);
    },
    addCycleProducts(cycleId: string, productIds: string[]) {
        return api.post(`${baseUrl}/cycles/${cycleId}/products`, { product_ids: productIds });
    },
    removeCycleProduct(cycleId: string, productId: string) {
        return api.delete(`${baseUrl}/cycles/${cycleId}/products/${productId}`);
    },
    getCycleProducts(cycleId: string) {
        return api.get<any[]>(`${baseUrl}/cycles/${cycleId}/products`);
    },

    // Tasks (Logs)
    getDailyTasks(params: {
        date?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
        cycleId?: string;
        locationId?: string;
        beforeDate?: string;
        page?: number;
        limit?: number;
    }) {
        return api.get<any>(`${baseUrl}/logs`, { params });
    },
    getTaskDetail(id: string) {
        return api.get<any>(`${baseUrl}/logs/${id}`);
    },
    updateTaskStatus(id: string, payload: { status: 'COMPLETED' | 'SKIPPED' | 'PENDING'; notes?: string; materialsUsed?: any[]; evidencePhotos?: string[] }) {
        return api.patch(`${baseUrl}/logs/${id}`, payload);
    },

    // Materials
    getMaterials(params?: any) {
        return api.get<any>(`${baseUrl}/materials`, { params: typeof params === 'boolean' ? { includeInactive: params } : params });
    },
    suggestMaterialCode(type: string) {
        return api.get<{ code: string }>(`${baseUrl}/materials/suggest-code`, { params: { type } });
    },
    createMaterial(data: { code?: string; name: string; type: string; unit: string; description?: string; isActive?: boolean }) {
        return api.post<Material>(`${baseUrl}/materials`, data);
    },
    updateMaterial(id: string, data: Partial<{ code: string; name: string; type: string; unit: string; description?: string; isActive?: boolean }>) {
        return api.patch<Material>(`${baseUrl}/materials/${id}`, data);
    },
    toggleMaterialStatus(id: string) {
        return api.patch<Material>(`${baseUrl}/materials/${id}/toggle-status`);
    },
    manageInventory(data: { material_id: string; type: 'IMPORT' | 'ALLOCATE'; quantity: number; notes?: string }) {
        return api.post<MaterialInventory>(`${baseUrl}/materials/inventory`, data);
    },

    // Harvest
    createHarvest(data: { crop_cycle_id: string; product_id: string; quantity_kg: number; notes?: string }) {
        return api.post<{ id: string; batchCode: string }>(`${baseUrl}/harvests`, data);
    },
    getHarvests(params?: { status?: string }) {
        return api.get<Harvest[]>(`${baseUrl}/harvests`, { params });
    },
    getHarvestDetails(id: string) {
        return api.get<Harvest>(`${baseUrl}/harvests/${id}`);
    },
    updateHarvestStatus(id: string, status: string) {
        return api.patch(`${baseUrl}/harvests/${id}/status`, { status });
    },

    // EUDR Compliance
    requestEudrCheck(locationId: string) {
        return api.post(`${baseUrl}/locations/${locationId}/eudr-check`);
    },
    getEudrStatus(locationId: string) {
        return api.get<{ eudrStatus: string; violationRate: number; lastCheckDate: string; checkLog: any }>(`${baseUrl}/locations/${locationId}/eudr-status`);
    },
    resetEudrStatus(locationId: string) {
        return api.post(`${baseUrl}/locations/${locationId}/eudr-reset`);
    },
    downloadEudrReport(locationId: string) {
        return api.get<{ url: string; filename: string }>(`${baseUrl}/locations/${locationId}/eudr-report`);
    },

    // GFW Admin Config
    getGfwConfig() {
        return api.get('/admin/gfw-config');
    },
    saveGfwConfig(data: { email: string; password: string; domains?: string[] }) {
        return api.put('/admin/gfw-config', data);
    },
    testGfwConnection() {
        return api.post('/admin/gfw-config/test');
    },
    renewGfwKey() {
        return api.post('/admin/gfw-config/renew');
    },
    // Admin Farm Config & Approvals
    getFarmConfig() {
        return api.get<{ autoApproveBoundary: boolean }>('/admin/farm-config');
    },
    saveFarmConfig(data: { autoApproveBoundary: boolean }) {
        return api.put<{ autoApproveBoundary: boolean }>('/admin/farm-config', data);
    },
    getPendingApprovals() {
        return api.get<Location[]>('/farm/locations/admin/pending-approvals');
    },
    approveLocationBoundary: (id: string, action: 'APPROVE' | 'REJECT') => api.post(`${baseUrl}/locations/${id}/approve-boundary`, { action }),

    // KCS Inspections
    getKcsInspections: (locationId: string) => api.get(`${baseUrl}/inspections/location/${locationId}`),

    approveBoundary(id: string) {
        return api.post(`/farm/locations/admin/${id}/approve-boundary`);
    },
    rejectBoundary(id: string) {
        return api.post(`/farm/locations/admin/${id}/reject-boundary`);
    },

    // Public Verification
    verifyEudr(id: string) {
        return api.get<Location>(`/public/eudr-verify/${id}`);
    },
};
