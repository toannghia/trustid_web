import api from '@/common/utils/api';
import { useAuthStore } from '@/modules/core/store/auth';

const baseUrl = '/supply/b2b-partners';

const getOwnerTenantId = () => {
    const authStore = useAuthStore();
    return authStore.user?.tenantId || '';
};

export const b2bPartnerApi = {
    getList() {
        const ownerTenantId = getOwnerTenantId();
        return api.get<any[]>(baseUrl, { params: ownerTenantId ? { ownerTenantId } : {} });
    },
    create(data: { partnerTenantId: string; alias?: string; notes?: string }) {
        const ownerTenantId = getOwnerTenantId();
        return api.post(baseUrl, { ...data, ownerTenantId: ownerTenantId || undefined });
    },
    remove(id: string) {
        const ownerTenantId = getOwnerTenantId();
        return api.delete(`${baseUrl}/${id}`, { params: ownerTenantId ? { ownerTenantId } : {} });
    },
};
