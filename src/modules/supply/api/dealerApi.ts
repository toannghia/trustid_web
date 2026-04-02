import api from '@/common/utils/api';

const baseUrl = '/dealers';

export interface DealerDto {
    id?: string;
    name: string;
    taxCode?: string;
    address?: string;
    phone?: string;
    email?: string;
    contactPerson?: string;
    provinces?: string[];
    dealerTenantId?: string;
    createAccount?: boolean;
    accountInfo?: {
        username?: string;
        password?: string;
    };
}

export const dealerApi = {
    create(data: DealerDto) {
        return api.post(baseUrl, data);
    },
    getList() {
        return api.get<DealerDto[]>(baseUrl);
    },
    getOne(id: string) {
        return api.get<DealerDto>(`${baseUrl}/${id}`);
    },
    update(id: string, data: Partial<DealerDto>) {
        return api.put(`${baseUrl}/${id}`, data);
    },
    delete(id: string) {
        return api.delete(`${baseUrl}/${id}`);
    }
};
