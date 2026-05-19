import api from '@/common/utils/api';

export const traceabilityApi = {
  async auditCode(code: string) {
    const response = await api.get(`/api/traceability/admin/audit/${code}`);
    return response.data;
  }
};
