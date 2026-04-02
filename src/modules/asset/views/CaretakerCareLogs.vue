<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useRoute } from 'vue-router';
import { assetApi } from '../api/asset.api';
import { fileApi } from '@/modules/core/api/file';
import { ElMessage } from 'element-plus';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { Camera, Plus, Timer, WarnTriangleFilled, Delete, Search, User, Location, Refresh, Check } from '@element-plus/icons-vue';
import { addWatermark } from '@/common/utils/image';
import { useAuthStore } from '../../core/store/auth';
import type { PerennialAsset } from '@/types/asset';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import QRScannerDialog from '@/components/common/QRScannerDialog.vue';
dayjs.extend(isSameOrBefore);

const authStore = useAuthStore();
const route = useRoute();
const assets = ref<PerennialAsset[]>([]);
const loading = ref(false);
const showLogModal = ref(false);
const currentAsset = ref<PerennialAsset | null>(null);
const submitting = ref(false);
const searchQuery = ref('');
const filterFarmLocationId = ref('');
const filterOwnerId = ref('');
const showQrScanner = ref(false);

const onQrScan = (code: string) => {
    // Sanitize: Extract code from URL if present (e.g. http://trustid.com.vn/?Code=ABC)
    let sanitizedCode = code;
    if (code.includes('?Code=')) {
        sanitizedCode = code.split('?Code=')[1].split('&')[0];
    } else if (code.includes('?code=')) {
        sanitizedCode = code.split('?code=')[1].split('&')[0];
    }
    
    searchQuery.value = sanitizedCode;
    ElMessage.success(`Đã nhận diện mã: ${sanitizedCode}`);
};

const logForm = reactive({
    logType: 'ROUTINE',
    description: '',
    images: [] as string[],
    taskId: null as string | null
});

interface ScheduledTask {
    asset: PerennialAsset;
    taskDef: any;
    scheduledDate: Date;
    statusStr: string;
    type: 'overdue' | 'today' | 'upcoming';
    isDone: boolean;
}

const fetchMyAssets = async () => {
    loading.value = true;
    try {
        const res = await assetApi.getForCaretaker();
        const actualData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        // Chỉ lấy những cây đã kích hoạt (có plantedAt và status != PENDING)
        assets.value = actualData.filter((a: any) => a.status !== 'PENDING' && a.plantedAt);
    } catch (error) {
        ElMessage.error('Không thể tải lịch chăm sóc');
    } finally {
        loading.value = false;
    }
};

const uniqueLocations = computed(() => {
    const map = new Map();
    assets.value.forEach(a => {
        if (a.farmLocation) map.set(a.farmLocation.id, a.farmLocation);
    });
    return Array.from(map.values());
});

const uniqueOwners = computed(() => {
    const map = new Map();
    assets.value.forEach(a => {
        if (a.currentOwner) map.set(a.currentOwner.id, a.currentOwner);
    });
    return Array.from(map.values());
});

const upcomingTasks = computed<ScheduledTask[]>(() => {
    const tasks: ScheduledTask[] = [];
    const today = dayjs().startOf('day');
    
    // Filter assets by search query and dropdowns
    const filteredAssets = assets.value.filter((asset: any) => {
        const q = searchQuery.value.toLowerCase();
        const matchesSearch = !searchQuery.value || 
            asset.assetName?.toLowerCase().includes(q) || 
            asset.qrCode?.toLowerCase().includes(q);
        
        const currentLocId = asset.farmLocationId || asset.farmLocation?.id;
        const matchesLocation = !filterFarmLocationId.value || currentLocId === filterFarmLocationId.value;
        
        const currentOwnId = asset.currentOwnerId || asset.currentOwner?.id;
        const matchesOwner = !filterOwnerId.value || currentOwnId === filterOwnerId.value;
        
        return matchesSearch && matchesLocation && matchesOwner;
    });

    filteredAssets.forEach(asset => {
        if (!asset.careProcess?.tasksConfig) return;
        
        const plantedDate = dayjs(asset.plantedAt).startOf('day');
        
        asset.careProcess.tasksConfig.forEach((task: any) => {
            const scheduledDate = plantedDate.add(task.day_offset, 'day');
            const diffDays = scheduledDate.diff(today, 'day');
            
            // Hiển thị tasks trong khoảng quá hạn 365 ngày (để thấy hết lịch sử) đến tương lai 14 ngày
            if (diffDays >= -365 && diffDays <= 14) {
                let type: 'overdue' | 'today' | 'upcoming' = 'upcoming';
                let statusStr = `Sắp tới (${scheduledDate.format('DD/MM/YYYY')})`;
                
                if (diffDays < 0) {
                    type = 'overdue';
                    statusStr = `Quá hạn ${Math.abs(diffDays)} ngày`;
                } else if (diffDays === 0) {
                    type = 'today';
                    statusStr = 'Hôm nay';
                }

                // Kiểm tra xem đã thực hiện chưa dựa vào logs
                const isDone = asset.logs?.some((log: any) => 
                    log.taskId === task.title && 
                    dayjs(log.performedAt).isSame(scheduledDate, 'day')
                );

                tasks.push({
                    asset,
                    taskDef: task,
                    scheduledDate: scheduledDate.toDate(),
                    statusStr: isDone ? 'Đã thực hiện' : statusStr,
                    type: isDone ? 'upcoming' : type, // If done, style it as regular
                    isDone: !!isDone
                } as any);
            }
        });
    });

    // Sắp xếp: Quá hạn -> Hôm nay -> Chưa làm -> Đã làm
    return tasks.sort((a: any, b: any) => {
        if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
        return a.scheduledDate.getTime() - b.scheduledDate.getTime();
    });
});

const openRoutineLog = (scheduledTask: ScheduledTask) => {
    currentAsset.value = scheduledTask.asset;
    logForm.logType = 'ROUTINE';
    logForm.description = `Thực hiện: ${scheduledTask.taskDef.title}`;
    logForm.taskId = scheduledTask.taskDef.title; 
    logForm.images = [];
    showLogModal.value = true;
};

const openIncidentLog = (asset: PerennialAsset) => {
    currentAsset.value = asset;
    logForm.logType = 'INCIDENT';
    logForm.description = '';
    logForm.taskId = null;
    logForm.images = [];
    showLogModal.value = true;
};

const handleImageCapture = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        let lat, lng;
        if (navigator.geolocation) {
            try {
                const pos: any = await Promise.race([
                    new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { 
                            enableHighAccuracy: true, 
                            timeout: 5000 
                        });
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } catch (geoError) {
                console.warn('Geolocation failed or timed out:', geoError);
                // Continue without GPS if it fails
            }
        }

        const watermarkedBlob = await addWatermark(file, {
            lat,
            lng,
            performerName: authStore.user?.fullName,
            logoUrl: '/logo.png'
        });

        const watermarkedFile = new File([watermarkedBlob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Upload to server immediately
        const uploadRes = await fileApi.upload(watermarkedFile, { folder: 'care-logs' });
        const url = uploadRes.data.url || uploadRes.data;
        
        logForm.images.push(url);
    } catch (error) {
        ElMessage.error('Không thể xử lý và upload ảnh');
        console.error(error);
    }
};

const submitLog = async () => {
    if (!currentAsset.value) return;
    if (!logForm.description) {
        ElMessage.warning('Vui lòng nhập mô tả công việc');
        return;
    }
    
    submitting.value = true;
    try {
        await assetApi.addLog(currentAsset.value.id, {
            logType: logForm.logType,
            description: logForm.description,
            images: logForm.images,
            taskId: logForm.taskId // Pass taskId to backend
        });
        ElMessage.success('Thực hiện thành công');
        showLogModal.value = false;
        fetchMyAssets(); // Refresh to update status
    } catch (error: any) {
        ElMessage.error(error.response?.data?.message || 'Lỗi lưu nhật ký');
    } finally {
        submitting.value = false;
    }
};

onMounted(() => {
    fetchMyAssets();
    // Check for "code" query parameter to auto-filter
    if (route.query.code) {
        searchQuery.value = route.query.code as string;
    }
});
</script>

<template>
    <div>
        <LTEContentHeader title="Bảng nhắc việc chăm sóc" />

        <div class="mb-4">
            <LTECard outline>
                <div class="flex flex-wrap gap-2 items-center">
                    <el-input 
                        v-model="searchQuery" 
                        placeholder="Lọc cây, mã QR..." 
                        clearable
                        class="w-64"
                    >
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>

                    <el-button type="primary" plain @click="showQrScanner = true">
                        <el-icon class="mr-1"><Camera /></el-icon>
                        Quét mã QR
                    </el-button>

                    <el-select v-model="filterFarmLocationId" placeholder="Vùng trồng" clearable class="w-40">
                        <el-option 
                            v-for="loc in uniqueLocations" 
                            :key="loc.id" 
                            :label="loc.name" 
                            :value="loc.id" 
                        />
                    </el-select>

                    <el-select v-model="filterOwnerId" placeholder="Chủ sở hữu" clearable class="w-40">
                        <el-option 
                            v-for="owner in uniqueOwners" 
                            :key="owner.id" 
                            :label="owner.fullName || owner.username" 
                            :value="owner.id" 
                        />
                    </el-select>

                    <el-button :loading="loading" circle @click="fetchMyAssets">
                        <el-icon><Refresh /></el-icon>
                    </el-button>
                </div>
            </LTECard>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left col: Task List -->
            <div class="lg:col-span-2">
                <LTECard title="Công việc cần làm (Dựa theo quy trình)" outline>
                    <div v-if="loading" v-loading="loading" class="h-32"></div>
                    
                    <div v-else-if="upcomingTasks.length === 0" class="py-10 text-center text-gray-400">
                        <el-icon size="40" class="mb-2"><Timer /></el-icon>
                        <p>Không có công việc nào tới hạn.</p>
                    </div>
                    
                    <div v-else class="space-y-4">
                        <div v-for="(task, idx) in upcomingTasks" :key="idx" 
                             class="flex flex-col sm:flex-row gap-4 border rounded-lg p-4 bg-white shadow-sm items-start sm:items-center justify-between"
                             :class="{ 
                                 'border-red-300 bg-red-50': task.type === 'overdue' && !task.isDone, 
                                 'border-green-300 bg-green-50': task.type === 'today' && !task.isDone,
                                 'opacity-60 grayscale-[0.5]': task.isDone 
                             }">
                            
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <el-tag :type="task.isDone ? 'success' : (task.type === 'overdue' ? 'danger' : (task.type === 'today' ? 'success' : 'info'))" size="small">
                                        {{ task.statusStr }}
                                    </el-tag>
                                    <span class="font-bold text-gray-800">{{ task.asset.assetName }} ({{ task.asset.qrCode }})</span>
                                </div>
                                <h4 class="font-bold text-lg text-blue-700" :class="{ 'line-through text-gray-400': task.isDone }">{{ task.taskDef.title }}</h4>
                                <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                                    <span class="flex items-center gap-1">
                                        <el-icon><Location /></el-icon> {{ task.asset.farmLocation?.name || 'Vườn' }}
                                    </span>
                                    <span class="flex items-center gap-1">
                                        <el-icon><User /></el-icon> {{ task.asset.currentOwner?.fullName || 'Chủ sở hữu' }}
                                    </span>
                                    <span class="flex items-center gap-1 text-orange-600" v-if="task.type === 'overdue' && !task.isDone">
                                        <el-icon><WarnTriangleFilled /></el-icon> QUÁ HẠN
                                    </span>
                                </div>
                                <p class="text-sm text-gray-600 mt-2" v-if="task.taskDef.description">{{ task.taskDef.description }}</p>
                            </div>
                            
                            <el-button 
                                v-if="!task.isDone"
                                type="primary" 
                                :icon="Plus" 
                                @click="openRoutineLog(task)"
                            >
                                Thực hiện
                            </el-button>
                            <el-button 
                                v-else 
                                type="success" 
                                plain 
                                disabled
                                :icon="Check"
                            >
                                Đã thực hiện
                            </el-button>
                        </div>
                    </div>
                </LTECard>
            </div>

            <!-- Right col: Quick Actions & Asset List for Incident -->
            <div class="lg:col-span-1 border-l pl-4 hidden lg:block">
                <h3 class="font-bold text-lg mb-4 text-gray-700">Ghi nhận sự cố</h3>
                <p class="text-sm text-gray-500 mb-4">
                    Nếu phát sinh sự cố, sâu bệnh ngoài quy trình, hãy báo cáo ngay cho gốc cây tương ứng.
                </p>
                <div class="space-y-2">
                    <div v-for="asset in assets" :key="asset.id" class="p-3 border rounded flex justify-between items-center bg-gray-50">
                        <div>
                            <span class="font-bold block">{{ asset.assetName }}</span>
                            <span class="text-xs text-gray-500">#{{ asset.qrCode }}</span>
                        </div>
                        <el-button type="danger" plain size="small" :icon="WarnTriangleFilled" @click="openIncidentLog(asset)">Báo cáo</el-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Thêm Nhật Ký -->
        <el-dialog v-model="showLogModal" :title="logForm.logType === 'ROUTINE' ? `Hoàn thành: ${logForm.taskId}` : `Báo cáo sự cố: ${currentAsset?.assetName}`" width="90%"
            style="max-width: 500px"
            class="responsive-dialog">
            <el-form :model="logForm" label-position="top">
                <el-form-item label="Ghi chú chi tiết" required>
                    <el-input 
                        v-model="logForm.description" 
                        type="textarea" 
                        :rows="4" 
                        placeholder="Mô tả công việc đã làm hoặc chi tiết sự cố..." 
                    />
                </el-form-item>

                <el-form-item label="Hình ảnh thực tế tại vườn (Bắt buộc chụp)">
                    <div class="flex flex-wrap gap-2 mb-2">
                        <div v-for="(img, idx) in logForm.images" :key="idx" class="relative w-24 h-24 border rounded overflow-hidden">
                            <img :src="img" class="w-full h-full object-cover" />
                            <div class="absolute top-0 right-0 bg-red-500 text-white p-0.5 cursor-pointer" @click="logForm.images.splice(idx, 1)">
                                <el-icon><Delete /></el-icon>
                            </div>
                        </div>
                        <label class="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:text-blue-500">
                            <el-icon size="24"><Camera /></el-icon>
                            <span class="text-[10px] mt-1 text-center">Chụp ảnh có Tọa độ</span>
                            <input type="file" accept="image/*" capture="environment" class="hidden" @change="handleImageCapture" />
                        </label>
                    </div>
                    <p class="text-[11px] text-gray-500 italic">* Hệ thống sẽ tự động ghép dán tọa độ GPS và Thời gian vào góc ảnh.</p>
                </el-form-item>
            </el-form>
            
            <template #footer>
                <el-button @click="showLogModal = false">Hủy</el-button>
                <el-button type="primary" :loading="submitting" @click="submitLog">Lưu nhật ký</el-button>
            </template>
        </el-dialog>

        <!-- Trình quét mã QR -->
        <QRScannerDialog 
            v-model="showQrScanner" 
            @scan="onQrScan" 
        />
    </div>
</template>
