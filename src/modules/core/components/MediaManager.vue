<script setup lang="ts">
import { ref, watch, onMounted, reactive } from 'vue';
import { fileApi } from '../api/file';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UploadFilled, Picture, Check, Refresh, Delete, Folder, Plus, Close, Back } from '@element-plus/icons-vue';

const props = defineProps<{
    modelValue: boolean; // visibility
    multiple?: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'select']);

const activeTab = ref('library');
const images = ref<any[]>([]);
const loading = ref(false);
const selectedImages = ref<string[]>([]);
const uploadInput = ref<HTMLInputElement | null>(null);
const uploadFolder = ref('');

// Upload state
const uploadList = ref<File[]>([]);
const uploading = ref(false);
const folders = ref<string[]>([]);
const isCreatingFolder = ref(false);
const newFolderName = ref('');

const loadFolders = async (visible: boolean) => {
    if (visible && folders.value.length === 0) {
        try {
            const { data } = await fileApi.listFolders();
            folders.value = data || [];
        } catch (e) {
            console.error('Failed to load folders', e);
        }
    }
};

const startCreateFolder = () => {
    newFolderName.value = '';
    isCreatingFolder.value = true;
};

const cancelCreateFolder = () => {
    isCreatingFolder.value = false;
};

const confirmCreateFolder = () => {
    if (!newFolderName.value.trim()) return;
    const name = newFolderName.value.trim();
    
    // Add to list if unique
    if (!folders.value.includes(name)) {
        folders.value.push(name);
    }
    
    // Select it
    uploadFolder.value = name;
    isCreatingFolder.value = false;
};

onMounted(() => {
    if (activeTab.value === 'upload') {
        loadFolders(true);
    }
});
// Trigger load folders when switching to upload tab
watch(activeTab, (val) => {
    if (val === 'upload') {
        loadFolders(true);
    }
});

const pagination = reactive({
    page: 1,
    limit: 12,
    total: 0
});

watch(() => props.modelValue, (val) => {
    if (val) {
        fetchImages();
        selectedImages.value = [];
        uploadList.value = [];
        activeTab.value = 'library';
    }
});

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
    return `${baseUrl}${path}`;
};

const currentPath = ref('');

const handleItemClick = (item: any) => {
    if (item.type === 'folder') {
        currentPath.value = currentPath.value 
            ? `${currentPath.value}/${item.name}` 
            : item.name;
        pagination.page = 1;
        fetchImages();
    } else {
        toggleSelect(item.url);
    }
};

const navigateUp = () => {
    if (!currentPath.value) return;
    const parts = currentPath.value.split('/');
    parts.pop();
    currentPath.value = parts.join('/');
    fetchImages();
};

const fetchImages = async () => {
    loading.value = true;
    try {
        const { data } = await fileApi.list({
            page: pagination.page,
            limit: pagination.limit,
            folder: currentPath.value // Pass folder to API
        });
        // Assuming backend returns { data: [], total: number } or just []
        const items = data.data || data.items || (Array.isArray(data) ? data : []);
        
        // Mocking structure if backend returns just strings or objects
        // Ensuring we have a list of objects with { url: '...' } or just strings
        images.value = items.map((item: any) => {
            if (typeof item === 'string') return { url: item, type: 'file' };
            // Ensure type is set if backend doesn't send it (backup)
            if (!item.type) item.type = 'file';
            return item;
        });
        
        pagination.total = data.total || images.value.length; // Approximate if no total
    } catch (e) {
        // Fallback/Mock if API fails (since backend might not exist yet)
        console.warn('API list files failed, using empty list');
        images.value = []; 
    } finally {
        loading.value = false;
    }
};

const toggleSelect = (url: string) => {
    if (props.multiple) {
        const index = selectedImages.value.indexOf(url);
        if (index > -1) {
            selectedImages.value.splice(index, 1);
        } else {
            selectedImages.value.push(url);
        }
    } else {
        selectedImages.value = [url];
    }
};

const isSelected = (url: string) => selectedImages.value.includes(url);

const handleDelete = async (file: any, event: Event) => {
    event.stopPropagation(); // Prevent selection when clicking delete
    
    try {
        await ElMessageBox.confirm(
            'Bạn có chắc chắn muốn xóa file này không? Hành động này không thể hoàn tác.',
            'Cảnh báo xóa',
            {
                confirmButtonText: 'Xóa',
                cancelButtonText: 'Hủy',
                type: 'warning',
            }
        );

        loading.value = true;
        await fileApi.delete(file.url || file.path || file);
        ElMessage.success('Đã xóa file thành công');
        await fetchImages(); // Refresh list
        
        // Remove from selection if deleted
        const url = file.url || file.path || file;
        const idx = selectedImages.value.indexOf(url);
        if (idx > -1) {
            selectedImages.value.splice(idx, 1);
        }
        
    } catch (e) {
        if (e !== 'cancel') {
             ElMessage.error('Xóa file thất bại');
        }
    } finally {
        loading.value = false;
    }
};

// Upload Logic
const handleFileSelect = (e: any) => {
    const files = Array.from(e.target.files) as File[];
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            uploadList.value.push(file);
        }
    });
};

const removeUploadFile = (index: number) => {
    uploadList.value.splice(index, 1);
};

const startUpload = async () => {
    if (uploadList.value.length === 0) return;
    
    uploading.value = true;
    const uploadedUrls: string[] = [];
    
    // Upload sequentially or parallel
    try {
        await Promise.all(uploadList.value.map(async (file) => {
            const { data } = await fileApi.upload(file, { folder: uploadFolder.value });
            const url = data.url || data.path || data;
            uploadedUrls.push(url);
        }));
        
        ElMessage.success(`Đã tải lên ${uploadedUrls.length} ảnh`);
        
        // Switch to library
        uploadList.value = [];
        activeTab.value = 'library';
        
        // Refresh and auto-select newly uploaded
        await fetchImages();
        
        // Auto select if multiple or single (if single, select last one)
        if (props.multiple) {
            selectedImages.value.push(...uploadedUrls);
        } else if (uploadedUrls.length > 0) {
            selectedImages.value = [uploadedUrls[uploadedUrls.length - 1]];
        }
        
    } catch (e) {
        ElMessage.error('Có lỗi khi tải ảnh lên');
    } finally {
        uploading.value = false;
    }
};

const confirmSelection = () => {
    if (selectedImages.value.length === 0) {
        ElMessage.warning('Chưa chọn ảnh nào');
        return;
    }
    emit('select', props.multiple ? selectedImages.value : selectedImages.value[0]);
    emit('update:modelValue', false);
};

const handleClose = () => {
    emit('update:modelValue', false);
};
</script>

<template>
    <el-dialog
        :model-value="modelValue"
        title="Quản lý hình ảnh"
        width="800px"
        top="5vh"
        append-to-body
        @update:model-value="handleClose"
        class="media-manager-dialog"
    >
        <div class="h-[500px] flex flex-col">
            <el-tabs v-model="activeTab" class="flex-shrink-0">
                <el-tab-pane label="Thư viện ảnh" name="library">
                     <div class="flex justify-between items-center mb-2 px-1">
                         <span class="text-xs text-gray-500">Đã chọn: {{ selectedImages.length }}</span>
                         <el-button :icon="Refresh" circle size="small" @click="fetchImages" />
                     </div>
                </el-tab-pane>
                <el-tab-pane label="Tải lên" name="upload" />
            </el-tabs>

            <div class="flex-1 overflow-y-auto min-h-0 bg-gray-50 rounded border p-4">
                <!-- Library View -->
                <div v-if="activeTab === 'library'" v-loading="loading">
                    <!-- Navigation Bar -->
                    <div v-if="currentPath" class="flex items-center mb-3 bg-gray-100 p-2 rounded">
                        <el-button link :icon="Back" @click="navigateUp">Quay lại</el-button>
                        <span class="mx-2 text-gray-400">|</span>
                        <el-icon><Folder /></el-icon>
                        <span class="ml-1 font-medium text-gray-700">/ {{ currentPath }}</span>
                    </div>

                    <div v-if="images.length === 0" class="flex flex-col items-center justify-center h-48 text-gray-400">
                        <el-icon :size="48"><Picture /></el-icon>
                        <span class="mt-2">Thư mục trống</span>
                        <el-button type="primary" link @click="activeTab = 'upload'">Tải ảnh lên ngay</el-button>
                    </div>
                    
                    <div v-else class="grid grid-cols-4 md:grid-cols-5 gap-3">
                        <div 
                            v-for="(item, idx) in images" 
                            :key="idx"
                            class="relative aspect-square cursor-pointer group rounded overflow-hidden border-2 transition-all p-2 flex flex-col items-center justify-center text-center"
                            :class="[
                                item.type === 'folder' ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-white',
                                isSelected(item.url) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400'
                            ]"
                            @click="handleItemClick(item)"
                        >
                            <!-- Folder Icon -->
                            <template v-if="item.type === 'folder'">
                                <el-icon class="text-amber-500 text-5xl mb-2"><Folder /></el-icon>
                                <span class="text-xs font-medium truncate w-full px-2" :title="item.name">{{ item.name }}</span>
                            </template>

                            <!-- Image Preview -->
                            <template v-else>
                                <div class="w-full h-full absolute inset-0">
                                    <img :src="getImageUrl(item.url)" class="w-full h-full object-cover" />
                                </div>
                                
                                <!-- Overlay actions -->
                                <div class="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center z-10 transition-opacity">
                                    <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(item, $event)" title="Xóa ảnh" />
                                </div>

                                <!-- Checkmark overlay -->
                                <div v-if="isSelected(item.url)" class="absolute inset-0 bg-blue-500/20 flex items-center justify-center pointer-events-none">
                                    <div class="bg-blue-500 text-white rounded-full p-1 shadow-sm">
                                        <el-icon><Check /></el-icon>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- Upload View -->
                <div v-if="activeTab === 'upload'" class="h-full flex flex-col">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Thư mục lưu trữ</label>
                        <div class="flex gap-2">
                             <el-select 
                                v-if="!isCreatingFolder"
                                v-model="uploadFolder" 
                                placeholder="Chọn thư mục..." 
                                clearable
                                filterable
                                class="flex-1"
                                @visible-change="loadFolders"
                            >
                                <template #prefix><el-icon><Folder /></el-icon></template>
                                <el-option label="Thư mục gốc (Root)" value="" />
                                <el-option v-for="f in folders" :key="f" :label="f" :value="f" />
                            </el-select>
                            
                            <template v-else>
                                <el-input 
                                    v-model="newFolderName"
                                    placeholder="Nhập tên thư mục mới..."
                                    class="flex-1"
                                    autofocus
                                    @keyup.enter="confirmCreateFolder"
                                >
                                    <template #prefix><el-icon><Folder /></el-icon></template>
                                </el-input>
                                <el-button type="success" :icon="Check" plain @click="confirmCreateFolder" title="Xác nhận" />
                                <el-button type="info" :icon="Close" plain @click="cancelCreateFolder" title="Hủy" />
                            </template>

                            <el-button 
                                v-if="!isCreatingFolder"
                                type="primary" 
                                :icon="Plus" 
                                plain
                                @click="startCreateFolder"
                                title="Tạo thư mục mới"
                            />
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                            <span v-if="!isCreatingFolder">Chọn thư mục có sẵn hoặc bấm dấu + để tạo mới.</span>
                            <span v-else>Nhập tên thư mục muốn tạo (Ví dụ: 2024/MuaHe). Bấm dấu tích để xác nhận.</span>
                        </div>
                    </div>

                    <div 
                        class="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition"
                        @click="uploadInput?.click()"
                    >
                        <el-icon class="text-blue-500 text-6xl mb-4"><UploadFilled /></el-icon>
                        <div class="text-lg font-medium text-gray-700">Kéo thả hoặc bấm để chọn ảnh</div>
                        <div class="text-sm text-gray-500 mt-1">Hỗ trợ JPG, PNG, WEBP (Max 5MB)</div>
                        <input type="file" ref="uploadInput" class="hidden" multiple accept="image/*" @change="handleFileSelect" />
                    </div>

                    <div v-if="uploadList.length > 0" class="mt-4 flex-1 overflow-y-auto">
                        <div class="font-bold mb-2">Đã chọn {{ uploadList.length }} file:</div>
                        <div class="space-y-2">
                            <div v-for="(file, idx) in uploadList" :key="idx" class="flex items-center justify-between p-2 bg-white rounded border">
                                <span class="text-sm truncate max-w-[200px]">{{ file.name }}</span>
                                <span class="text-xs text-gray-400">{{ (file.size / 1024).toFixed(0) }} KB</span>
                                <el-button type="danger" link size="small" @click="removeUploadFile(idx)">Xóa</el-button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4 text-right" v-if="uploadList.length > 0">
                         <el-button type="primary" :loading="uploading" @click="startUpload">
                             Tải lên {{ uploadList.length }} ảnh
                         </el-button>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer flex justify-between items-center">
                 <div class="text-sm text-gray-500">
                     <span v-if="multiple">Đã chọn: {{ selectedImages.length }}</span>
                 </div>
                 <div>
                    <el-button @click="handleClose">Hủy bỏ</el-button>
                    <el-button type="primary" @click="confirmSelection" :disabled="selectedImages.length === 0">
                        Xác nhận ({{ selectedImages.length }})
                    </el-button>
                 </div>
            </div>
        </template>
    </el-dialog>
</template>

<style>
.media-manager-dialog .el-dialog__body {
    padding-top: 10px;
    padding-bottom: 10px;
}
</style>
