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
    updateLocation(id: string, data: Partial<{ name: string; address?: string; area_m2?: number; lat: number; long: number; code?: string; plant_type?: string; manager_name?: string; province?: string; ward?: string }>) {
        return api.patch<Location>(`${baseUrl}/locations/${id}`, data);
    },

    // Templates
    getTemplates() {
        return api.get<ProcessTemplate[]>(`${baseUrl}/templates`);
    },
    createTemplate(data: { name: string; tasks_config: any[] }) {
        return api.post<ProcessTemplate>(`${baseUrl}/templates`, data);
    },
    updateTemplate(id: string, data: Partial<{ name: string; tasks_config: any[] }>) {
        return api.patch<ProcessTemplate>(`${baseUrl}/templates/${id}`, data);
    },

    // Cycles
    getCycles() {
        return api.get<CropCycle[]>(`${baseUrl}/cycles`);
    },
    startCycle(data: { location_id: string; template_id: string; name: string; start_date: string }) {
        return api.post<CropCycle>(`${baseUrl}/cycles`, data);
    },
    updateCycle(id: string, data: Partial<{ location_id: string; template_id: string; name: string; start_date: string }>) {
        return api.patch<CropCycle>(`${baseUrl}/cycles/${id}`, data);
    },

    // Tasks (Logs)
    // Tasks (Logs)
    getDailyTasks(date?: string, status?: string, cycleId?: string, locationId?: string, beforeDate?: string) {
        return api.get<any[]>(`${baseUrl}/logs`, { params: { date, status, cycleId, locationId, beforeDate } });
    },
    updateTaskStatus(id: string, payload: { status: 'COMPLETED' | 'SKIPPED' | 'PENDING'; notes?: string; materialsUsed?: any[] }) {
        return api.patch(`${baseUrl}/logs/${id}`, payload);
    },

    // Materials
    getMaterials(includeInactive = false) {
        return api.get<Material[]>(`${baseUrl}/materials`, { params: { includeInactive } });
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
    createHarvest(data: { crop_cycle_id: string; quantity_kg: number; notes?: string }) {
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
