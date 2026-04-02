<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { assetApi } from '../api/asset.api';
import { ElMessage, ElMessageBox } from 'element-plus';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { View, Share, Calendar, User, Location, Camera } from '@element-plus/icons-vue';
import type { PerennialAsset, AssetCareLog } from '@/types/asset';
import dayjs from 'dayjs';

const assets = ref<PerennialAsset[]>([]);
const loading = ref(false);
const detailLoading = ref(false);
const showDetailModal = ref(false);
const showTransferModal = ref(false);
const selectedAsset = ref<PerennialAsset | null>(null);
const assetLogs = ref<AssetCareLog[]>([]);
const transferHistory = ref<any[]>([]);

const transferForm = reactive({
    toOwnerId: '',
    note: ''
});

const fetchMyAssets = async () => {
    loading.value = true;
    try {
        const { data } = await assetApi.getForOwner();
        console.log('OWNER ASSETS DATA:', data);
        assets.value = data;
    } catch (error) {
        ElMessage.error('Không thể tải danh sách tài sản');
    } finally {
        loading.value = false;
    }
};

const viewDetail = async (asset: PerennialAsset) => {
    selectedAsset.value = asset;
    showDetailModal.value = true;
    detailLoading.value = true;
    try {
        const { data } = await assetApi.getDetail(asset.id);
        assetLogs.value = data.logs;
        transferHistory.value = data.transfers;
    } catch (error) {
        ElMessage.error('Không thể tải chi tiết');
    } finally {
        detailLoading.value = false;
    }
};

const handleTransfer = async () => {
    if (!selectedAsset.value || !transferForm.toOwnerId) return;
    
    try {
        await ElMessageBox.confirm('Hành động này sẽ chuyển quyền sở hữu tài sản sang người khác. Bạn có chắc chắn?', 'Xác nhận chuyển nhượng');
        await assetApi.transfer(selectedAsset.value.id, transferForm);
        ElMessage.success('Chuyển nhượng thành công');
        showTransferModal.value = false;
        showDetailModal.value = false;
        fetchMyAssets();
    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error(error.response?.data?.message || 'Lỗi chuyển nhượng');
        }
    }
};

onMounted(fetchMyAssets);
</script>

<template>
    <div>
        <LTEContentHeader title="Tài sản của tôi" />

        <div v-loading="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="asset in assets" :key="asset.id" class="asset-card cursor-pointer" @click="viewDetail(asset)">
                <LTECard variant="primary" outline no-padding>
                    <template #header>
                        <div class="flex justify-between items-center w-full">
                            <span class="font-bold">#{{ asset.qrCode }}</span>
                            <el-tag size="small" type="success">Sở hữu</el-tag>
                        </div>
                    </template>
                    
                    <!-- Latest Image -->
                    <div class="h-64 w-full bg-gray-100 relative mb-4">
                        <el-image 
                            v-if="asset.latestImage" 
                            :src="asset.latestImage" 
                            fit="cover" 
                            class="w-full h-full"
                        />
                        <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <el-icon size="40"><Camera /></el-icon>
                            <span class="text-xs mt-2">Chưa có ảnh mới nhất</span>
                        </div>
                    </div>
                    
                    <div class="px-4 pb-4">
                        <h4 class="font-bold text-lg mb-2">{{ asset.assetName }}</h4>
                        <p class="text-sm text-gray-600 flex items-center gap-2">
                            <el-icon><Calendar /></el-icon>
                            Ngày trồng: {{ asset.plantedAt ? dayjs(asset.plantedAt).format('DD/MM/YYYY') : 'Chưa trồng' }}
                        </p>
                        <p class="text-sm text-gray-600 flex items-center gap-2">
                            <el-icon><User /></el-icon>
                            Nông dân: {{ asset.caretaker?.fullName || 'N/A' }}
                        </p>
                    </div>

                    <div class="flex justify-between items-center pt-4 border-t">
                        <span class="text-xs text-gray-400">Cập nhật: {{ dayjs(asset.updatedAt).fromNow() }}</span>
                        <el-button type="primary" link :icon="View">Chi tiết</el-button>
                    </div>
                </LTECard>
            </div>

            <div v-if="assets.length === 0 && !loading" class="col-span-full py-20 text-center">
                <el-empty description="Bạn chưa sở hữu tài sản nào trong hệ thống" />
            </div>
        </div>

        <!-- Details & Timeline Modal -->
        <el-dialog 
            v-model="showDetailModal" 
            title="Chi tiết tài sản & Nhật ký" 
            width="90%"
            style="max-width: 800px"
            class="responsive-dialog"
        >
            <template #header>
                <div class="flex justify-between items-center pr-8">
                    <span class="text-lg font-bold">{{ selectedAsset?.assetName }}</span>
                    <el-button type="warning" :icon="Share" @click="showTransferModal = true">Chuyển nhượng</el-button>
                </div>
            </template>

            <div v-loading="detailLoading">
                <el-tabs type="border-card">
                    <el-tab-pane label="Dòng thời gian chăm sóc">
                        <template #label>
                            <span class="flex items-center gap-1"><el-icon><Calendar /></el-icon> Nhật ký</span>
                        </template>
                        
                        <el-timeline v-if="assetLogs.length > 0">
                            <el-timeline-item
                                v-for="log in assetLogs"
                                :key="log.id"
                                :timestamp="dayjs(log.performedAt).format('DD/MM/YYYY HH:mm')"
                                :type="log.logType === 'ROUTINE' ? 'primary' : 'warning'"
                                placement="top"
                            >
                                <LTECard :title="log.description" no-padding>
                                    <template #header v-if="log.locationLat">
                                        <span class="text-xs text-blue-500 flex items-center gap-1">
                                            <el-icon><Location /></el-icon>
                                            {{ log.locationLat.toFixed(6) }}, {{ log.locationLong?.toFixed(6) }}
                                        </span>
                                    </template>
                                    <div class="p-4">
                                        <p class="mb-4">{{ log.description }}</p>
                                        <div v-if="log.images?.length" class="flex flex-wrap gap-2">
                                            <el-image 
                                                v-for="(img, i) in log.images" 
                                                :key="i"
                                                :src="img" 
                                                :preview-src-list="log.images"
                                                class="w-24 h-24 rounded border object-cover"
                                            />
                                        </div>
                                    </div>
                                </LTECard>
                            </el-timeline-item>
                        </el-timeline>
                        <el-empty v-else description="Chưa có dữ liệu nhật ký" />
                    </el-tab-pane>

                    <el-tab-pane label="Lịch sử sở hữu">
                        <template #label>
                            <span class="flex items-center gap-1"><el-icon><User /></el-icon> Lịch sử</span>
                        </template>
                        <el-table :data="transferHistory" stripe border>
                            <el-table-column label="Ngày chuyển" width="180">
                                <template #default="{ row }">
                                    {{ dayjs(row.transferDate).format('DD/MM/YYYY HH:mm') }}
                                </template>
                            </el-table-column>
                            <el-table-column label="Từ" prop="fromOwner.fullName" />
                            <el-table-column label="Đến" prop="toOwner.fullName" />
                            <el-table-column label="Ghi chú" prop="note" />
                        </el-table>
                    </el-tab-pane>
                </el-tabs>
            </div>
        </el-dialog>

        <!-- Transfer Modal -->
        <el-dialog 
            v-model="showTransferModal" 
            title="Chuyển nhượng tài sản" 
            width="90%"
            style="max-width: 400px"
            class="responsive-dialog"
        >
            <el-form label-position="top">
                <el-form-item label="ID Người nhận sở hữu (End User ID)" required>
                    <el-input v-model="transferForm.toOwnerId" placeholder="Nhập UUID hoặc SĐT của người nhận" />
                </el-form-item>
                <el-form-item label="Ghi chú chuyển nhượng">
                    <el-input v-model="transferForm.note" type="textarea" placeholder="Nội dung chuyển nhượng..." />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showTransferModal = false">Hủy</el-button>
                <el-button type="primary" @click="handleTransfer">Xác nhận chuyển đi</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.asset-card {
    transition: all 0.2s;
}
.asset-card:hover {
    transform: scale(1.02);
}
</style>
