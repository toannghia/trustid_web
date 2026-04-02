import api from '@/common/utils/api';

const baseUrl = '/codes';

export const codeApi = {
    getPools() {
        return api.get<any[]>(`${baseUrl}/pools`);
    },
    validate(code: string, location?: { lat: number; lng: number; address?: string }) {
        // Use new dedicated Scan API for speed and reliability
        const params: any = { code };
        if (location) {
            params.lat = location.lat;
            params.lng = location.lng;
            if (location.address) params.address = location.address;
        }
        return api.get(`/scan/check`, { params });
    },
    getItems(params: any) {
        return api.get(`${baseUrl}/items`, { params });
    }
};
