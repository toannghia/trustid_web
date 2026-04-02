import api from '../../../common/utils/api';

export const backupApi = {
    list: (params: { page: number, limit: number }) => api.get('/admin/backups', { params }),
    getConfig: () => api.get('/admin/backups/config'),
    updateConfig: (data: { cronTime: string, keepDays: number, isAutoEnabled: boolean }) => api.put('/admin/backups/config', data),
    runBackup: () => api.post('/admin/backups/run'),
};
