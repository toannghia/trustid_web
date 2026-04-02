import api from '@/common/utils/api';

export const fileApi = {
    // Upload file with optional folder
    upload: (file: File, options?: { folder?: string }) => {
        const formData = new FormData();
        formData.append('file', file);
        const params: any = {};
        if (options?.folder) {
            params.folder = options.folder;
        }
        return api.post('/files/upload', formData, { params });
    },

    // Get list of uploaded files
    list: (params?: any) => api.get('/files', { params }),

    // Get list of folders
    listFolders: (params?: any) => api.get('/files/folders', { params }),

    // Delete file by path or id
    delete: (path: string) => api.delete('/files', { params: { path } })
};
