<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { assetApi } from '../api/asset.api';
import { userApi } from '../../core/api/user';
import { fileApi } from '@/modules/core/api/file';
import { ElMessage } from 'element-plus';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { Search, Camera, Check, Location, Plus, User, Delete, Refresh, Grid, List } from '@element-plus/icons-vue';
import { addWatermark } from '@/common/utils/image';
import { useAuthStore } from '../../core/store/auth';
import type { PerennialAsset } from '@/types/asset';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const authStore = useAuthStore();
const router = useRouter();
const assets = ref<PerennialAsset[]>([]);
const loading = ref(false);
const scanInput = ref('');
const showLogModal = ref(false);
const currentAsset = ref<PerennialAsset | null>(null);
const submitting = ref(false);
const searchQuery = ref('');
const filterFarmLocationId = ref('');
const filterOwnerId = ref('');
const viewMode = ref<'card' | 'table'>('card');
const currentPage = ref(1);
const pageSize = ref(10);
const filterCaretakerId = ref('');
const caretakers = ref<any[]>([]);
const detailVisible = ref(false);
const selectedAssetDetail = ref<any>(null);
const loadingDetail = ref(false);
const detailMap = ref<any>(null);

const isAdmin = computed(() => {
    const role = authStore.user?.role;
    return role === 'ADMIN' || role === 'TENANT_ADMIN';
});

const logForm = reactive({
    logType: 'ROUTINE',
    description: '',
    images: [] as string[]
});

const fetchMyAssets = async () => {
    loading.value = true;
    try {
        let res;
        if (isAdmin.value) {
            // Admin can see all with filtering
            res = await assetApi.list({ 
                search: searchQuery.value, 
                caretakerId: filterCaretakerId.value 
            });
        } else {
            // Caretaker sees their own
            res = await assetApi.getForCaretaker();
        }
        
        const actualData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        console.log('ASSETS DATA:', actualData);
        assets.value = actualData;
    } catch (error) {
        ElMessage.error('Không thể tải danh sách tài sản');
    } finally {
        loading.value = false;
    }
};

const fetchInitialData = async () => {
    if (!isAdmin.value) return;
    try {
        const { data: userData } = await userApi.getList({ page: 1, limit: 100, roleName: 'FARMER' });
        caretakers.value = userData.data;
    } catch (error) {
        console.error('Fetch caretakers failed:', error);
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

const filteredAssets = computed(() => {
    return assets.value.filter(asset => {
        const q = searchQuery.value.toLowerCase();
        const matchesSearch = !searchQuery.value || 
            asset.assetName?.toLowerCase().includes(q) || 
            asset.qrCode?.toLowerCase().includes(q) || 
            asset.farmLocation?.name?.toLowerCase().includes(q);
        
        const currentLocId = asset.farmLocationId || asset.farmLocation?.id;
        const matchesLocation = !filterFarmLocationId.value || currentLocId === filterFarmLocationId.value;
        
        const currentOwnId = asset.currentOwnerId || asset.currentOwner?.id;
        const matchesOwner = !filterOwnerId.value || currentOwnId === filterOwnerId.value;
        
        return matchesSearch && matchesLocation && matchesOwner;
    });
});

const paginatedAssets = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredAssets.value.slice(start, end);
});

const handlePageChange = (page: number) => {
    currentPage.value = page;
};

const handleScan = async () => {
    if (!scanInput.value) return;
    try {
        await assetApi.activate({ qrCode: scanInput.value });
        ElMessage.success('Kích hoạt thành công!');
        scanInput.value = '';
        fetchMyAssets();
    } catch (error: any) {
        ElMessage.error(error.response?.data?.message || 'Lỗi kích hoạt');
    }
};

const activateAsset = async (asset: PerennialAsset) => {
    try {
        await assetApi.activate({ qrCode: asset.qrCode });
        ElMessage.success('Kích hoạt thành công!');
        fetchMyAssets();
    } catch (error: any) {
        ElMessage.error(error.response?.data?.message || 'Lỗi kích hoạt');
    }
};

const openCareLog = (asset: PerennialAsset) => {
    router.push({
        name: 'caretaker-logs',
        query: { code: asset.qrCode }
    });
};

const viewDetail = async (assetId: string) => {
    loadingDetail.value = true;
    try {
        const { data } = await assetApi.getDetail(assetId);
        selectedAssetDetail.value = data;
        detailVisible.value = true;
    } catch (error) {
        ElMessage.error('Không thể tải chi tiết tài sản');
    } finally {
        loadingDetail.value = false;
    }
};

const initDetailMap = () => {
    if (!selectedAssetDetail.value?.asset) return;
    const asset = selectedAssetDetail.value.asset;
    
    // Đợi DOM render xong
    setTimeout(() => {
        if (detailMap.value) {
            detailMap.value.remove();
        }

        const lat = Number(asset.locationLat) || 21.0285;
        const lng = Number(asset.locationLong) || 105.8542;

        detailMap.value = L.map('detail-asset-map').setView([lat, lng], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(detailMap.value);

        L.marker([lat, lng]).addTo(detailMap.value)
            .bindPopup(asset.assetName || asset.qrCode)
            .openPopup();
            
        // Fix resize issue in modal
        setTimeout(() => {
            detailMap.value.invalidateSize();
        }, 100);
    }, 200);
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
            }
        }

        const watermarkedBlob = await addWatermark(file, {
            lat,
            lng,
            performerName: authStore.user?.fullName || authStore.user?.username,
            logoUrl: '/logo.png'
        });

        const watermarkedFile = new File([watermarkedBlob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Upload to server immediately
        const uploadRes = await fileApi.upload(watermarkedFile, { folder: 'care-logs' });
        const url = uploadRes.data.url || uploadRes.data;

        logForm.images.push(url);
    } catch (error) {
        ElMessage.error('Không thể xử lý ảnh');
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
            images: logForm.images
        });
        ElMessage.success('Thêm nhật ký thành công');
        showLogModal.value = false;
    } catch (error: any) {
        ElMessage.error(error.response?.data?.message || 'Lỗi lưu nhật ký');
    } finally {
        submitting.value = false;
    }
};

onMounted(() => {
    fetchMyAssets();
    fetchInitialData();
});
</script>

<template>
    <div>
        <LTEContentHeader title="Danh sách cây được giao" />

        <div class="mb-4">
            <LTECard title="Bộ lọc & Kích hoạt" outline>
                <div class="flex flex-wrap gap-2 items-center">
                    <el-input 
                        v-model="searchQuery" 
                        placeholder="Tìm theo tên, mã..." 
                        clearable
                        class="flex-1 min-w-[200px]"
                    >
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>

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

                    <el-select v-if="isAdmin" v-model="filterCaretakerId" placeholder="Lọc Nông dân" clearable class="w-40" @change="fetchMyAssets">
                        <template #prefix>
                            <el-icon><User /></el-icon>
                        </template>
                        <el-option 
                            v-for="ct in caretakers" 
                            :key="ct.id" 
                            :label="ct.fullName" 
                            :value="ct.id" 
                        />
                    </el-select>
                    
                    <div class="border-l h-6 mx-1 border-gray-200 hidden xl:block"></div>

                    <el-input 
                        v-model="scanInput" 
                        placeholder="Mã QR kích hoạt" 
                        @keyup.enter="handleScan"
                        class="w-40"
                    >
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>
                    <el-button type="success" :icon="Check" @click="handleScan">Kích hoạt</el-button>
                    
                    <el-button :loading="loading" circle @click="fetchMyAssets">
                        <el-icon><Refresh /></el-icon>
                    </el-button>
                </div>
            </LTECard>
        </div>

        <LTECard outline>
            <template #title>
                <div class="flex justify-between items-center w-full">
                    <span>Danh sách cây đang chăm sóc</span>
                    <el-radio-group v-model="viewMode" size="small" v-if="assets.length > 0">
                        <el-radio-button label="card">
                            <el-icon><Grid /></el-icon> Thẻ
                        </el-radio-button>
                        <el-radio-button label="table">
                            <el-icon><List /></el-icon> Lưới
                        </el-radio-button>
                    </el-radio-group>
                </div>
            </template>

            <div v-loading="loading">
                <!-- Chế độ Thẻ (Grid of large cards) -->
                <div v-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div 
                        v-for="asset in paginatedAssets" 
                        :key="asset.id" 
                        class="asset-card border rounded-lg p-0 bg-white shadow-sm flex flex-col justify-between overflow-hidden cursor-pointer"
                        @click="viewDetail(asset.id)"
                    >
                        <!-- Latest Image Preview -->
                        <div class="h-64 w-full bg-gray-100 relative">
                            <el-image 
                                v-if="asset.latestImage" 
                                :src="asset.latestImage" 
                                fit="cover" 
                                class="w-full h-full"
                            />
                            <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <el-icon size="32"><Camera /></el-icon>
                                <span class="text-xs mt-1">Chưa có ảnh mới nhất</span>
                            </div>
                        </div>

                        <div class="p-4 flex-1">
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-xs font-bold text-gray-400">#{{ asset.qrCode }}</span>
                                <el-tag :type="asset.status === 'PENDING' ? 'info' : 'success'" size="small">
                                    {{ asset.status === 'PENDING' ? 'Chưa kích hoạt' : 'Đang chăm sóc' }}
                                </el-tag>
                            </div>
                            <h4 class="font-bold text-lg mb-1">{{ asset.assetName }}</h4>
                            <p class="text-sm text-gray-500 mb-2">Loại: {{ asset.assetType?.name || 'Cây lâu năm' }}</p>
                            
                            <div class="flex items-center gap-1 text-xs text-blue-600 mb-1">
                                <el-icon><Location /></el-icon>
                                <span>{{ asset.farmLocation?.name || 'Chưa rõ vị trí' }}</span>
                                <span v-if="asset.locationLat" class="ml-1">({{ Number(asset.locationLat).toFixed(4) }}, {{ Number(asset.locationLong).toFixed(4) }})</span>
                            </div>

                            <div class="flex items-center gap-1 text-xs text-orange-600 mb-1">
                                <el-icon><User /></el-icon>
                                <span>Chủ: {{ asset.currentOwner?.fullName || asset.currentOwner?.username || 'Chưa gán' }}</span>
                            </div>

                            <div v-if="isAdmin && asset.caretaker" class="flex items-center gap-1 text-xs text-green-600 mb-3">
                                <el-icon><User /></el-icon>
                                <span>Phụ trách: {{ asset.caretaker.fullName }}</span>
                            </div>
                        </div>

                        <div class="flex gap-2 p-4 pt-0">
                            <el-button 
                                v-if="asset.status === 'PENDING'"
                                type="success" 
                                class="flex-1" 
                                :icon="Check" 
                                @click.stop="activateAsset(asset)"
                            >
                                Kích hoạt
                            </el-button>
                            <el-button 
                                v-else 
                                type="primary" 
                                class="flex-1" 
                                :icon="Plus"
                                @click.stop="openCareLog(asset)"
                            >
                                Chăm sóc
                            </el-button>
                        </div>
                    </div>
                </div>

                <!-- Chế độ Lưới (Compact Table) -->
                <div v-else-if="viewMode === 'table'">
                    <el-table :data="paginatedAssets" border stripe style="width: 100%">
                        <el-table-column prop="qrCode" label="Mã QR" width="150" />
                        <el-table-column prop="assetName" label="Tên cây" min-width="150" />
                        <el-table-column label="Vùng trồng">
                            <template #default="{ row }">
                                <div class="flex items-center gap-1 text-xs text-blue-600">
                                    <el-icon><Location /></el-icon>
                                    <span>{{ row.farmLocation?.name }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="Chủ sở hữu">
                            <template #default="{ row }">
                                <div class="flex items-center gap-1 text-xs text-orange-600">
                                    <el-icon><User /></el-icon>
                                    <span>{{ row.currentOwner?.fullName || row.currentOwner?.username }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="status" label="Trạng thái" width="130">
                            <template #default="{ row }">
                                <el-tag :type="row.status === 'PENDING' ? 'info' : 'success'" size="small">
                                    {{ row.status === 'PENDING' ? 'Chưa kích hoạt' : 'Đang chăm sóc' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="Thao tác" width="180">
                            <template #default="{ row }">
                                <el-button 
                                    v-if="row.status === 'PENDING'"
                                    type="success" 
                                    size="small"
                                    :icon="Check" 
                                    @click="activateAsset(row)"
                                >
                                    Kích hoạt
                                </el-button>
                                <el-button 
                                    v-else 
                                    type="primary" 
                                    size="small"
                                    :icon="Plus"
                                    @click="openCareLog(row)"
                                >
                                    Chăm sóc
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
                
                <div v-if="assets.length === 0" class="py-10 text-center text-gray-400">
                    <p>Chưa có cây nào được gán cho bạn. Hãy quét mã QR để bắt đầu.</p>
                    <p class="text-[10px] mt-2 opacity-30">UID: {{ authStore.user?.id || 'Unknown' }}</p>
                </div>

                <!-- Phân trang -->
                <div v-if="filteredAssets.length > pageSize" class="mt-6 flex justify-center">
                    <el-pagination
                        background
                        layout="prev, pager, next"
                        :total="filteredAssets.length"
                        :page-size="pageSize"
                        v-model:current-page="currentPage"
                        @current-change="handlePageChange"
                    />
                </div>
            </div>
        </LTECard>

        <!-- Modal Thêm Nhật Ký Chăm Sóc -->
        <el-dialog 
            v-model="showLogModal" 
            :title="`Ghi nhật ký: ${currentAsset?.assetName}`" 
            width="90%"
            style="max-width: 500px"
            class="responsive-dialog"
        >
            <el-form :model="logForm" label-position="top">
                <el-form-item label="Nội dung công việc" required>
                    <el-input 
                        v-model="logForm.description" 
                        type="textarea" 
                        :rows="4" 
                        placeholder="Mô tả chi tiết những gì bạn đã làm cho cây..." 
                    />
                </el-form-item>

                <el-form-item label="Hình ảnh thực tế (Chụp tại vườn)">
                    <div class="flex flex-wrap gap-2 mb-2">
                        <div v-for="(img, idx) in logForm.images" :key="idx" class="relative w-24 h-24 border rounded overflow-hidden">
                            <img :src="img" class="w-full h-full object-cover" />
                            <div class="absolute top-0 right-0 bg-red-500 text-white p-0.5 cursor-pointer" @click="logForm.images.splice(idx, 1)">
                                <el-icon><Delete /></el-icon>
                            </div>
                        </div>
                        <label class="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:text-blue-500">
                            <el-icon size="24"><Camera /></el-icon>
                            <span class="text-[10px] mt-1 text-center">Chụp ảnh GPS</span>
                            <input type="file" accept="image/*" capture="environment" class="hidden" @change="handleImageCapture" />
                        </label>
                    </div>
                    <p class="text-[11px] text-gray-500 italic">* Ảnh sẽ được tự động đóng dấu Tọa độ & Thời gian.</p>
                </el-form-item>
            </el-form>
            
            <template #footer>
                <el-button @click="showLogModal = false">Hủy</el-button>
                <el-button type="primary" :loading="submitting" @click="submitLog">Lưu nhật ký</el-button>
            </template>
        </el-dialog>

        <el-dialog 
            v-model="detailVisible" 
            title="Chi tiết tài sản & Nhật ký chăm sóc" 
            width="95%" 
            style="max-width: 900px"
            @opened="initDetailMap"
        >
            <div v-if="selectedAssetDetail?.asset" v-loading="loadingDetail">
                <el-row :gutter="20">
                    <el-col :md="12">
                        <div class="mb-4">
                            <h6 class="text-xs font-bold text-gray-500 uppercase mb-2">Ảnh sản phẩm / Cây</h6>
                            <el-image 
                                v-if="selectedAssetDetail.asset.product?.images?.[0] || selectedAssetDetail.asset.latestImage" 
                                :src="selectedAssetDetail.asset.product?.images?.[0] || selectedAssetDetail.asset.latestImage" 
                                class="w-full h-64 rounded shadow-sm object-cover"
                                :preview-src-list="[selectedAssetDetail.asset.product?.images?.[0] || selectedAssetDetail.asset.latestImage]"
                                preview-teleported
                            />
                            <div v-else class="w-full h-64 bg-gray-100 rounded flex flex-col items-center justify-center text-gray-400">
                                <el-icon size="48"><Camera /></el-icon>
                                <span class="text-sm mt-2">Chưa có ảnh</span>
                            </div>
                        </div>
                        <div>
                            <h6 class="text-xs font-bold text-gray-500 uppercase mb-2">Vị trí thực tế</h6>
                            <div id="detail-asset-map" class="h-64 w-full rounded shadow-sm border"></div>
                        </div>
                    </el-col>
                    <el-col :md="12">
                        <table class="w-full text-sm">
                            <tr class="border-b"><td class="py-2 text-gray-500 w-32">Mã định danh:</td><td class="py-2 font-bold">{{ selectedAssetDetail.asset.qrCode }}</td></tr>
                            <tr class="border-b"><td class="py-2 text-gray-500">Tên tài sản:</td><td class="py-2 font-bold">{{ selectedAssetDetail.asset.assetName }}</td></tr>
                            <tr class="border-b"><td class="py-2 text-gray-500">Loại:</td><td class="py-2">{{ selectedAssetDetail.asset.assetType?.name }}</td></tr>
                            <tr class="border-b"><td class="py-2 text-gray-500">Phụ trách:</td><td class="py-2 text-green-600 font-medium">{{ selectedAssetDetail.asset.caretaker?.fullName }}</td></tr>
                            <tr class="border-b"><td class="py-2 text-gray-500">Chủ sở hữu:</td><td class="py-2 text-orange-600 font-medium">{{ selectedAssetDetail.asset.currentOwner?.fullName }}</td></tr>
                            <tr class="border-b"><td class="py-2 text-gray-500">Vùng trồng:</td><td class="py-2">{{ selectedAssetDetail.asset.farmLocation?.name }}</td></tr>
                            <tr><td class="py-2 text-gray-500">Vị trí:</td><td class="py-2 text-xs italic">{{ selectedAssetDetail.asset.province }} {{ selectedAssetDetail.asset.ward ? ' - ' + selectedAssetDetail.asset.ward : '' }}</td></tr>
                        </table>
                    </el-col>
                </el-row>

                <div class="mt-6">
                    <h5 class="font-bold border-l-4 border-blue-500 pl-2 mb-4">Lịch sử chăm sóc</h5>
                    <el-table :data="selectedAssetDetail.logs" border stripe size="small" max-height="350">
                        <el-table-column label="Thời gian" width="160">
                            <template #default="{ row }">
                                {{ new Date(row.performedAt).toLocaleString('vi-VN') }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="description" label="Nội dung" min-width="250" />
                        <el-table-column label="Ảnh" width="120">
                            <template #default="{ row }">
                                <div class="flex gap-1 overflow-x-auto p-1">
                                    <el-image 
                                        v-for="(img, idx) in row.images" 
                                        :key="idx" 
                                        :src="img" 
                                        :preview-src-list="row.images"
                                        preview-teleported
                                        hide-on-click-modal
                                        fit="cover"
                                        class="w-10 h-10 rounded cursor-pointer"
                                        style="min-width: 40px"
                                    />
                                </div>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<style scoped>
.asset-card {
    transition: all 0.3s;
}
.asset-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>
