import api from '@/common/utils/api';

export interface RegionDto {
    id?: string;
    name: string;
    provinces: string[];
    description?: string;
    status: string;
}

export const regionApi = {
    findAll() {
        return api.get<RegionDto[]>('/regions').then(res => res.data);
    },
    findOne(id: string) {
        return api.get<RegionDto>(`/regions/${id}`).then(res => res.data);
    },
    create(data: RegionDto) {
        return api.post('/regions', data).then(res => res.data);
    },
    update(id: string, data: Partial<RegionDto>) {
        return api.put(`/regions/${id}`, data).then(res => res.data);
    },
    delete(id: string) {
        return api.delete(`/regions/${id}`).then(res => res.data);
    }
};
