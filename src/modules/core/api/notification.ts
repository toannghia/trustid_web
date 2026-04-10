import api from '@/common/utils/api';

export const notificationApi = {
  send: (data: {
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, any>;
    targetRoles?: string[];
    targetUserIds?: string[];
  }) => api.post('/notifications/send', data),

  getAdminList: (params: { page: number; limit: number }) => 
    api.get('/notifications/admin/list', { params }),

  getWelcomeConfig: () =>
    api.get('/notifications/welcome-config'),

  updateWelcomeConfig: (data: any) =>
    api.put('/notifications/welcome-config', data),
};
