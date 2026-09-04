<script setup lang="ts">
import { ref, watch, onMounted, reactive } from 'vue';
import { fileApi } from '../api/file';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UploadFilled, Picture, Check, Refresh, Delete, Folder, Plus, Close, Back } from '@element-plus/icons-vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

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
        clearUploadList();
        activeTab.value = 'library';
    }
});

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
    return `${baseUrl}${path}`;
};

const getFileName = (url: string) => {
    if (!url) return '';
    const parts = url.split('/');
    const name = parts[parts.length - 1] || url;
    try {
        return decodeURIComponent(name);
    } catch {
        return name;
    }
};

const filePreviewMap = new Map<File, string>();
const getFilePreviewUrl = (file: File) => {
    if (!filePreviewMap.has(file)) {
        filePreviewMap.set(file, URL.createObjectURL(file));
    }
    return filePreviewMap.get(file) || '';
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

const showDeleteDialog = ref(false);
const fileToDelete = ref<any>(null);
const deleting = ref(false);

const openDeleteConfirm = (file: any, event: Event) => {
    event.stopPropagation(); // Prevent selection when clicking delete
    fileToDelete.value = file;
    showDeleteDialog.value = true;
};

const confirmDelete = async () => {
    if (!fileToDelete.value) return;
    
    deleting.value = true;
    try {
        const file = fileToDelete.value;
        await fileApi.delete(file.url || file.path || file);
        ElMessage.success('Đã xóa file thành công');
        
        // Remove from selection if deleted
        const url = file.url || file.path || file;
        const idx = selectedImages.value.indexOf(url);
        if (idx > -1) {
            selectedImages.value.splice(idx, 1);
        }
        
        showDeleteDialog.value = false;
        fileToDelete.value = null;
        await fetchImages(); // Refresh list
    } catch (e) {
        ElMessage.error('Xóa file thất bại');
    } finally {
        deleting.value = false;
    }
};

// Upload Logic
const compressImage = (file: File, maxWidth = 2560, maxHeight = 2560, quality = 0.9): Promise<File> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Keep aspect ratio under maxWidth/maxHeight
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(file);

                ctx.drawImage(img, 0, 0, width, height);

                // Convert all images to image/jpeg for optimal lossy compression (converts massive PNG screenshots to lightweight JPEGs)
                const outputType = 'image/jpeg';
                let outputName = file.name;
                if (file.type === 'image/png') {
                    outputName = file.name.replace(/\.png$/i, '.jpg');
                }
                
                canvas.toBlob(
                    (blob) => {
                        if (!blob) return resolve(file);
                        
                        const compressedFile = new File([blob], outputName, {
                            type: outputType,
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    outputType,
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const handleFileSelect = async (e: any) => {
    const files = Array.from(e.target.files) as File[];
    
    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            ElMessage.warning(`File "${file.name}" không phải là ảnh hợp lệ.`);
            continue;
        }

        // Validate original file size (Max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            ElMessage.warning(`Ảnh gốc "${file.name}" vượt quá dung lượng tối đa cho phép (10MB). Vui lòng chọn ảnh khác.`);
            continue;
        }

        try {
            const compressedFile = await compressImage(file);
            uploadList.value.push(compressedFile);
        } catch (error) {
            console.error('Lỗi khi nén ảnh:', error);
            // Fallback: use original file since it is < 5MB
            uploadList.value.push(file);
        }
    }
    
    // Reset file input to allow selecting the same file again if removed
    if (uploadInput.value) {
        uploadInput.value.value = '';
    }
};

const removeUploadFile = (index: number) => {
    const file = uploadList.value[index];
    if (file && filePreviewMap.has(file)) {
        URL.revokeObjectURL(filePreviewMap.get(file)!);
        filePreviewMap.delete(file);
    }
    uploadList.value.splice(index, 1);
};

const clearUploadList = () => {
    filePreviewMap.forEach((url) => URL.revokeObjectURL(url));
    filePreviewMap.clear();
    uploadList.value = [];
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
        clearUploadList();
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
        width="880px"
        top="4vh"
        append-to-body
        destroy-on-close
        :show-close="false"
        @update:model-value="handleClose"
        class="branded-media-dialog"
    >
        <!-- HEADER CHUẨN TRUSTID -->
        <template #header>
            <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                <span style="color: #fff; font-size: 16px; font-weight: 600;">
                    Quản lý thư viện hình ảnh
                </span>
                <div 
                    style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" 
                    @click="handleClose"
                    title="Đóng"
                >
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>

        <div class="h-[520px] flex flex-col">
            <!-- TABS ĐIỀU HƯỚNG -->
            <el-tabs v-model="activeTab" class="flex-shrink-0 custom-media-tabs">
                <el-tab-pane name="library">
                    <template #label>
                        <span class="flex items-center gap-1.5 font-medium">
                            <el-icon><Picture /></el-icon>
                            <span>Thư viện ảnh</span>
                            <span v-if="images.length" class="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono font-semibold">
                                {{ images.length }}
                            </span>
                        </span>
                    </template>
                </el-tab-pane>
                <el-tab-pane name="upload">
                    <template #label>
                        <span class="flex items-center gap-1.5 font-medium">
                            <el-icon><UploadFilled /></el-icon>
                            <span>Tải ảnh lên</span>
                            <span v-if="uploadList.length" class="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono font-bold">
                                {{ uploadList.length }}
                            </span>
                        </span>
                    </template>
                </el-tab-pane>
            </el-tabs>

            <div class="flex-1 overflow-y-auto min-h-0 bg-slate-50/70 rounded-xl border border-slate-200 p-4">
                <!-- LIBRARY VIEW -->
                <div v-if="activeTab === 'library'" v-loading="loading" class="h-full flex flex-col">
                    <!-- Navigation & Toolbar -->
                    <div class="flex items-center justify-between gap-3 mb-3.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                        <!-- Left: Breadcrumbs -->
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                            <el-button 
                                v-if="currentPath" 
                                link 
                                :icon="Back" 
                                size="small" 
                                class="text-blue-600 font-medium hover:text-blue-700 flex-shrink-0" 
                                @click="navigateUp"
                            >
                                Quay lại
                            </el-button>
                            <div class="flex items-center text-xs text-slate-600 truncate">
                                <el-icon class="text-amber-500 mr-1.5 text-sm flex-shrink-0"><Folder /></el-icon>
                                <span class="cursor-pointer hover:text-blue-600 font-medium" @click="currentPath = ''; fetchImages();">Thư mục gốc</span>
                                <template v-if="currentPath">
                                    <span class="mx-1.5 text-slate-300">/</span>
                                    <span class="font-semibold text-slate-900 truncate">{{ currentPath }}</span>
                                </template>
                            </div>
                        </div>

                        <!-- Right: Actions -->
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <span v-if="selectedImages.length" class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Đã chọn: {{ selectedImages.length }}
                            </span>
                            <el-tooltip content="Làm mới danh sách" placement="top">
                                <el-button :icon="Refresh" circle size="small" @click="fetchImages" />
                            </el-tooltip>
                        </div>
                    </div>

                    <!-- Images Grid or Empty -->
                    <div v-if="images.length === 0" class="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                        <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                            <el-icon :size="32" class="text-slate-300"><Picture /></el-icon>
                        </div>
                        <p class="text-sm font-medium text-slate-600 mb-1">Thư mục chưa có hình ảnh nào</p>
                        <p class="text-xs text-slate-400 mb-3">Hãy tải ảnh mới từ máy tính của bạn</p>
                        <el-button type="primary" size="small" :icon="UploadFilled" @click="activeTab = 'upload'" style="background: #00875A; border: none;">
                            Tải ảnh lên ngay
                        </el-button>
                    </div>
                    
                    <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                        <div 
                            v-for="(item, idx) in images" 
                            :key="idx"
                            class="relative aspect-square cursor-pointer group rounded-xl overflow-hidden border transition-all duration-200 flex flex-col shadow-sm select-none"
                            :class="[
                                item.type === 'folder' 
                                    ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70 hover:border-amber-300' 
                                    : 'bg-white',
                                isSelected(item.url) 
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-md scale-[0.98]' 
                                    : 'border-slate-200 hover:border-slate-300 hover:shadow'
                            ]"
                            @click="handleItemClick(item)"
                        >
                            <!-- Folder Item -->
                            <template v-if="item.type === 'folder'">
                                <div class="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                                    <el-icon class="text-amber-500 text-4xl mb-1.5 group-hover:scale-110 transition-transform"><Folder /></el-icon>
                                    <span class="text-xs font-semibold text-slate-700 truncate w-full" :title="item.name">{{ item.name }}</span>
                                    <span class="text-[10px] text-slate-400 mt-0.5">Thư mục</span>
                                </div>
                            </template>

                            <!-- Image Item -->
                            <template v-else>
                                <div class="w-full h-full relative overflow-hidden bg-slate-100">
                                    <img 
                                        :src="getImageUrl(item.url)" 
                                        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                        loading="lazy"
                                    />
                                    
                                    <!-- Gradient Overlay Bottom with File Name -->
                                    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-4 pointer-events-none">
                                        <div class="text-[11px] text-white truncate font-medium drop-shadow-sm" :title="getFileName(item.url)">
                                            {{ getFileName(item.url) }}
                                        </div>
                                    </div>

                                    <!-- Delete Button (Top Left on hover) -->
                                    <div class="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <el-tooltip content="Xóa ảnh này" placement="top">
                                              <button 
                                                  class="w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                                  @click="openDeleteConfirm(item, $event)"
                                              >
                                                  <el-icon :size="12"><Delete /></el-icon>
                                              </button>
                                        </el-tooltip>
                                    </div>

                                    <!-- Checkmark Badge (Top Right when selected) -->
                                    <div 
                                        v-if="isSelected(item.url)" 
                                        class="absolute top-1.5 right-1.5 z-10 flex items-center justify-center"
                                    >
                                        <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white ring-1 ring-emerald-600">
                                            <el-icon :size="12"><Check /></el-icon>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- UPLOAD VIEW -->
                <div v-if="activeTab === 'upload'" class="flex flex-col gap-3">
                    <!-- Destination Folder Selector -->
                    <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <label class="block text-xs font-semibold text-slate-700 mb-1.5">Thư mục lưu trữ đích</label>
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
                                <template #prefix><el-icon class="text-amber-500"><Folder /></el-icon></template>
                                <el-option label="Thư mục gốc (Root)" value="" />
                                <el-option v-for="f in folders" :key="f" :label="f" :value="f" />
                            </el-select>
                            
                            <template v-else>
                                <el-input 
                                    v-model="newFolderName"
                                    placeholder="Nhập tên thư mục mới (Ví dụ: SanPham, ChungNhan)..."
                                    class="flex-1"
                                    autofocus
                                    @keyup.enter="confirmCreateFolder"
                                >
                                    <template #prefix><el-icon class="text-amber-500"><Folder /></el-icon></template>
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
                            >
                                Tạo thư mục
                            </el-button>
                        </div>
                        <div class="text-[11px] text-slate-400 mt-1.5">
                            <span v-if="!isCreatingFolder">Ảnh tải lên sẽ được lưu vào thư mục đã chọn để dễ dàng quản lý.</span>
                            <span v-else>Nhập tên thư mục và nhấn phím Enter hoặc nút Xác nhận.</span>
                        </div>
                    </div>

                    <!-- Dropzone (Full size when empty, compact when files selected) -->
                    <div 
                        v-if="uploadList.length === 0"
                        class="border-2 border-dashed border-blue-300 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/70 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                        @click="uploadInput?.click()"
                    >
                        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3 text-blue-600">
                            <el-icon :size="28"><UploadFilled /></el-icon>
                        </div>
                        <div class="text-sm font-semibold text-slate-800 mb-1">Kéo thả hoặc bấm vào đây để chọn ảnh từ máy tính</div>
                        <div class="text-xs text-slate-500 mb-2">Hỗ trợ JPG, JPEG, PNG, WEBP (Dung lượng ảnh gốc tối đa 10MB)</div>
                        <div class="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            <span>💡</span>
                            <span>Hệ thống tự động nén tối ưu dung lượng ảnh trước khi tải lên</span>
                        </div>
                        <input type="file" ref="uploadInput" class="hidden" multiple accept="image/*" @change="handleFileSelect" />
                    </div>

                    <div 
                        v-else
                        class="border-2 border-dashed border-blue-300 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/70 rounded-xl py-2.5 px-4 flex items-center justify-between cursor-pointer transition-colors"
                        @click="uploadInput?.click()"
                    >
                        <div class="flex items-center gap-2.5 text-xs text-slate-700">
                            <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                <el-icon :size="16"><UploadFilled /></el-icon>
                            </div>
                            <span><strong class="text-blue-600 font-semibold">Bấm hoặc kéo thả thêm ảnh</strong> để bổ sung vào danh sách</span>
                        </div>
                        <span class="text-[11px] text-slate-400 font-medium">Tối đa 10MB/ảnh</span>
                        <input type="file" ref="uploadInput" class="hidden" multiple accept="image/*" @change="handleFileSelect" />
                    </div>

                    <!-- Upload List with Previews -->
                    <div v-if="uploadList.length > 0" class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <div class="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                            <div class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <span>Danh sách chờ tải lên</span>
                                <span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold font-mono text-[11px]">
                                    {{ uploadList.length }} ảnh
                                </span>
                            </div>
                            <el-button link type="danger" size="small" @click="clearUploadList">Xóa tất cả</el-button>
                        </div>
                        
                        <!-- Scrollable file queue with guaranteed comfortable height -->
                        <div class="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scroll">
                            <div 
                                v-for="(file, idx) in uploadList" 
                                :key="idx" 
                                class="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100/90 transition-colors"
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <img :src="getFilePreviewUrl(file)" class="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white flex-shrink-0 shadow-xs" />
                                    <div class="min-w-0">
                                        <div class="text-xs font-medium text-slate-800 truncate" :title="file.name">{{ file.name }}</div>
                                        <div class="text-[10px] text-slate-400 font-mono mt-0.5">{{ (file.size / 1024).toFixed(0) }} KB</div>
                                    </div>
                                </div>
                                <el-button type="danger" link size="small" :icon="Delete" @click="removeUploadFile(idx)" title="Xóa ảnh này">Xóa</el-button>
                            </div>
                        </div>

                        <!-- Upload Action Button -->
                        <div class="pt-3 border-t border-slate-100 mt-2.5 flex justify-end">
                            <el-button 
                                type="primary" 
                                :loading="uploading" 
                                :icon="UploadFilled" 
                                @click="startUpload"
                                style="background: #00875A; border: none; border-radius: 8px; padding: 8px 18px;"
                            >
                                Bắt đầu tải lên {{ uploadList.length }} ảnh
                            </el-button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- FOOTER DIALOG -->
        <template #footer>
            <div class="flex justify-between items-center w-full">
                <div class="text-xs text-slate-500">
                    <span v-if="selectedImages.length" class="text-emerald-700 font-semibold flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Đã chọn: {{ selectedImages.length }} ảnh
                    </span>
                    <span v-else class="text-slate-400">Chưa chọn ảnh nào</span>
                </div>
                <div class="flex items-center gap-2">
                    <el-button @click="handleClose" style="border-radius: 8px; padding: 8px 18px;">Hủy bỏ</el-button>
                    <el-button 
                        type="primary" 
                        class="btn-confirm-selection"
                        @click="confirmSelection" 
                        :disabled="selectedImages.length === 0"
                        style="border-radius: 8px; padding: 8px 20px;"
                    >
                        Xác nhận chọn <span v-if="selectedImages.length">({{ selectedImages.length }})</span>
                    </el-button>
                </div>
            </div>
        </template>
    </el-dialog>

    <!-- Modal Xác nhận Xóa hình ảnh chuẩn TrustID -->
    <el-dialog 
        v-model="showDeleteDialog" 
        width="460px" 
        :show-close="false" 
        class="branded-delete-dialog" 
        append-to-body
    >
        <template #header>
            <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                <span style="color: #fff; font-size: 16px; font-weight: 600;">
                    Xác nhận xóa hình ảnh
                </span>
                <div 
                    style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" 
                    @click="showDeleteDialog = false"
                    title="Đóng"
                >
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>

        <div style="padding: 24px 24px 12px;">
            <!-- Warning Box -->
            <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px; background: #FEF3F2; border: 1px solid #FECDCA; border-radius: 10px;">
                <span style="font-size: 22px; margin-top: 1px;">⚠️</span>
                <div>
                    <p style="font-weight: 600; color: #B42318; margin-bottom: 4px; font-size: 14px;">Hành động không thể hoàn tác!</p>
                    <p style="font-size: 13px; color: #475467; line-height: 1.5;">
                        Hình ảnh này sẽ bị xóa vĩnh viễn khỏi hệ thống lưu trữ và không thể phục hồi.
                    </p>
                </div>
            </div>

            <!-- File Preview Card -->
            <div v-if="fileToDelete" style="display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;">
                <img 
                    :src="getImageUrl(fileToDelete.url)" 
                    alt="Preview" 
                    style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid #CBD5E1; background: #fff; flex-shrink: 0;"
                />
                <div style="min-width: 0; flex: 1;">
                    <div style="font-size: 13px; font-weight: 600; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" :title="getFileName(fileToDelete.url)">
                        {{ getFileName(fileToDelete.url) }}
                    </div>
                    <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                        File hình ảnh trong thư viện
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 20px;">
                <el-button @click="showDeleteDialog = false" style="border-radius: 8px; padding: 8px 18px;">Hủy</el-button>
                <el-button
                    type="danger"
                    :loading="deleting"
                    @click="confirmDelete"
                    style="background: #B42318; border-color: #B42318; border-radius: 8px; padding: 8px 20px; color: #fff; font-weight: 500;"
                >
                    Xóa hình ảnh
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style>
.branded-media-dialog,
.branded-delete-dialog {
    border-radius: 12px !important;
    overflow: hidden !important;
    padding: 0 !important;
}
.branded-media-dialog .el-dialog__header,
.branded-delete-dialog .el-dialog__header {
    padding: 0 !important;
    margin: 0 !important;
}
.branded-media-dialog .el-dialog__body {
    padding: 20px 24px !important;
}
.branded-media-dialog .el-dialog__footer {
    padding: 0 24px 20px !important;
}
.branded-delete-dialog .el-dialog__body {
    padding: 0 !important;
}
.branded-delete-dialog .el-dialog__footer {
    padding: 0 !important;
}
</style>

<style scoped>
:deep(.custom-media-tabs .el-tabs__header) {
    margin-bottom: 12px;
}
:deep(.custom-media-tabs .el-tabs__item) {
    font-size: 13px;
}
:deep(.custom-media-tabs .el-tabs__item.is-active) {
    color: #0F2B46;
    font-weight: 600;
}
:deep(.custom-media-tabs .el-tabs__active-bar) {
    background-color: #0F2B46;
}
.custom-scroll::-webkit-scrollbar {
    width: 6px;
}
.custom-scroll::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
}
.custom-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}
.custom-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}
:deep(.btn-confirm-selection:not(.is-disabled)) {
    background-color: #00875A !important;
    border-color: #00875A !important;
    color: #ffffff !important;
}
:deep(.btn-confirm-selection:not(.is-disabled):hover) {
    background-color: #00704a !important;
    border-color: #00704a !important;
}
</style>
