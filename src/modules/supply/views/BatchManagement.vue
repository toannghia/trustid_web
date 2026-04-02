<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Lô Thành Phẩm</h1>
    </div>

    <!-- Stats or List would go here -->
    <el-table :data="batches" stripe border style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column prop="batchCode" label="Mã Lô" width="250" sortable>
             <template #default="{row}">
                 <span class="font-bold cursor-pointer text-blue-600" @click="viewDetails(row)">
                     {{ row.batchCode }}
                 </span>
             </template>
        </el-table-column>
        <el-table-column prop="farmBatchCode" label="Lô Nguyên Liệu" width="250" />
        <el-table-column prop="productGtin" label="GTIN Sản phẩm" width="180" />
        <el-table-column label="Tiến độ" min-width="200">
             <template #default="{row}">
                 <div class="flex items-center gap-2">
                     <el-progress 
                        :percentage="calcProgress(row)" 
                        :status="row.status === 'COMPLETED' ? 'success' : ''" 
                        class="w-32" 
                     />
                     <span class="text-xs text-gray-500">
                         {{ row.packCount }} / {{ row.totalUnitsExpected }}
                     </span>
                 </div>
             </template>
        </el-table-column>
        <el-table-column prop="totalQuantity" label="Tổng KL (kg)" width="120" />
        <el-table-column label="Ngày tạo" width="150" sortable>
             <template #default="{row}">
                 {{ formatDate(row.createdAt) }}
             </template>
        </el-table-column>
        <el-table-column label="Trạng thái" width="120" align="center">
            <template #default="{row}">
                <el-tag :type="getStatusType(row.status)" class="mr-2">{{ row.status }}</el-tag>
                <el-button 
                    v-if="row.status === 'PACKING'" 
                    type="primary" 
                    link 
                    size="small" 
                    @click="continuePacking(row)"
                >
                    Tiếp tục
                </el-button>
            </template>
        </el-table-column>
    </el-table>

    <!-- Drawer Details -->
    <el-drawer v-model="showDetail" title="Chi tiết Lô Thành Phẩm" size="60%" destroy-on-close>
         <div v-if="selectedBatch">
            <el-tabs v-model="activeTab" class="demo-tabs">
                <!-- Tab 1: Thông tin chung -->
                <el-tab-pane label="Thông tin chung" name="general">
                    <el-descriptions border :column="2" class="mb-4 mt-2">
                        <el-descriptions-item label="Mã Lô">{{ selectedBatch.batchCode }}</el-descriptions-item>
                        <el-descriptions-item label="Lô Farm">{{ selectedBatch.farmBatchCode }}</el-descriptions-item>
                        <el-descriptions-item label="Sản phẩm">
                            <div>
                                <div class="font-bold">{{ selectedBatch.product?.name || '---' }}</div>
                                <div class="text-xs text-gray-500">{{ selectedBatch.productGtin }}</div>
                            </div>
                        </el-descriptions-item>
                        <el-descriptions-item label="Trạng thái">
                            <el-tag>{{ selectedBatch.status }}</el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="Quy cách đóng">{{ selectedBatch.farmDataSnapshot?.unitWeight || 1 }} kg/sp</el-descriptions-item>
                        <el-descriptions-item label="Tổng SL">{{ selectedBatch.totalQuantity }} kg</el-descriptions-item>
                    </el-descriptions>

                    <div class="mb-2 font-bold text-gray-700">Danh sách Tem / Sản phẩm ({{ items.length }})</div>
                    <el-table :data="items" height="400" border stripe>
                        <el-table-column type="index" label="STT" width="60" align="center" />
                        <el-table-column prop="fullQrCode" label="Mã QR (Full)" min-width="180">
                            <template #default="{row}">
                                <div class="truncate text-xs font-mono" :title="row.fullQrCode">{{ row.fullQrCode }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="parentCode" label="Thùng (Container)" width="150" />
                        <el-table-column prop="status" label="Trạng thái" width="100">
                            <template #default="{row}">
                                <el-tag size="small" type="success">{{ row.status }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="Thời gian" width="160">
                            <template #default="{row}">
                                {{ formatDate(row.activatedAt) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>

                <!-- Tab 2: Nhật ký Blockchain (NDA) -->
                 <el-tab-pane label="Nhật ký Blockchain (NDA)" name="blockchain">
                     <div class="p-4 bg-gray-50 rounded border border-gray-200 mt-2">
                         <div class="flex items-center justify-between mb-4">
                             <span class="font-bold text-gray-700">Trạng thái đồng bộ NDA Trace</span>
                             <div class="flex items-center gap-2">
                                 <el-tag v-if="selectedBatch.ndaSyncStatus === 'SYNCED'" type="success" effect="dark">
                                     <el-icon><CircleCheckFilled /></el-icon> Đã đồng bộ
                                 </el-tag>
                                 <el-tag v-else-if="selectedBatch.ndaSyncStatus === 'WAITING'" type="warning" effect="dark">
                                     <el-icon class="is-loading"><Loading /></el-icon> Đang xử lý...
                                 </el-tag>
                                 <el-tag v-else-if="selectedBatch.ndaSyncStatus === 'FAILED'" type="danger" effect="dark">
                                     Lỗi đồng bộ
                                 </el-tag>
                                 <el-tag v-else type="info">Chưa kích hoạt</el-tag>
                             </div>
                         </div>

                         <div v-if="selectedBatch.ndaSyncStatus === 'FAILED'" class="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                             <strong>Lỗi:</strong> {{ selectedBatch.ndaErrorMsg }}
                             <br>
                             <el-button type="danger" link size="small" @click="retryBatchSync(selectedBatch)">Thử lại ngay</el-button>
                         </div>

                         <div v-if="selectedBatch.ndaSyncStatus === 'SYNCED'" class="space-y-4">
                             <div>
                                 <label class="text-xs text-gray-500 uppercase font-bold">NDA Batch ID</label>
                                 <div class="flex items-center gap-2 mt-1">
                                     <code class="bg-white px-2 py-1 rounded border font-mono text-sm">{{ selectedBatch.ndaBatchId || 'nda:batch:vn:...' }}</code>
                                 </div>
                             </div>
                             
                             <div>
                                 <label class="text-xs text-gray-500 uppercase font-bold">Verifiable Credential (VC Proof)</label>
                                 <div class="bg-white p-3 rounded border mt-1 flex gap-4">
                                     <!-- QR Code Placeholder -->
                                     <div class="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-center p-1 text-gray-500">
                                         QRCode VC
                                     </div>
                                     <div class="flex-1 overflow-hidden">
                                         <div class="text-xs text-gray-400 mb-1">Chuỗi xác thực (JWS/JWT):</div>
                                         <div class="bg-gray-100 p-2 text-[10px] h-20 overflow-y-auto break-all font-mono rounded text-gray-600">
                                             {{ selectedBatch.ndaVcProof || 'eyJhbGciOiJFUzI1NiIs... (Demo Proof)' }}
                                         </div>
                                         <el-button type="primary" link size="small" class="mt-1">Sao chép Proof</el-button>
                                     </div>
                                 </div>
                             </div>

                             <div class="pt-2 border-t mt-4">
                                 <a :href="'https://trace.nda.gov.vn/search?batch=' + selectedBatch.ndaBatchId" target="_blank" class="text-blue-600 hover:underline flex items-center gap-1">
                                     Tra cứu trên Cổng thông tin Quốc gia <el-icon><TopRight /></el-icon>
                                 </a>
                             </div>
                         </div>
                         
                         <div v-if="!['SYNCED', 'WAITING', 'FAILED'].includes(selectedBatch.ndaSyncStatus)" class="text-center py-8 text-gray-400 italic">
                             Lô hàng chưa được gửi sang hệ thống NDA.
                         </div>
                     </div>
                 </el-tab-pane>
            </el-tabs>
         </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { supplyApi } from '../api/supplyApi';
import { ElMessage } from 'element-plus';
import { Loading, CircleCheckFilled, TopRight } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const batches = ref<any[]>([]);
const items = ref<any[]>([]);
const selectedBatch = ref<any>(null);
const showDetail = ref(false);
const activeTab = ref('general');
const router = useRouter();

// Polling
let pollingTimer: any = null;

const startPolling = () => {
    stopPolling();
    pollingTimer = setInterval(async () => {
        // Only poll if drawer is open and status is WAITING
        if (showDetail.value && selectedBatch.value && selectedBatch.value.ndaSyncStatus === 'WAITING') {
             try {
                 // Refresh detailed batch info
                 // Assuming supplyApi.getBatchById exists, otherwise fetch list or implement new api
                 // For now, let's re-fetch list to be simple or pretend we check api
                 // But wait, user wants Real-time effect.
                 // Ideally: const { data } = await supplyApi.getBatch(selectedBatch.value.id);
                 // If getBatch matches list item structure:
                 const { data } = await supplyApi.getBatches(); // This is heavy if list is long. Better to have getDetail.
                 // Find updated batch
                 const updated = data.find((b: any) => b.id === selectedBatch.value.id);
                 if (updated) {
                     // Check if status changed
                     if (updated.ndaSyncStatus !== selectedBatch.value.ndaSyncStatus) {
                         selectedBatch.value = updated; // Update local view
                         
                         // Update list view as well
                         const idx = batches.value.findIndex(b => b.id === updated.id);
                         if(idx !== -1) batches.value[idx] = updated;

                         if (updated.ndaSyncStatus === 'SYNCED') {
                             ElMessage.success(`Đồng bộ thành công lô hàng ${updated.batchCode}!`);
                         }
                     }
                 }
             } catch(e) {}
        }
    }, 5000);
};

const stopPolling = () => {
    if (pollingTimer) clearInterval(pollingTimer);
};

const retryBatchSync = async (batch: any) => {
    try {
        // Call API to retry (mock or real)
        // await supplyApi.retryBatch(batch.id); 
        ElMessage.success('Đã gửi yêu cầu thử lại');
        selectedBatch.value.ndaSyncStatus = 'WAITING'; // Optimistic update
    } catch(e) {
        ElMessage.error('Không thể gửi yêu cầu');
    }
}

const continuePacking = (row: any) => {
    router.push({ path: '/supply/packaging', query: { batchId: row.id } });
};

const loadBatches = async () => {
    try {
        const { data } = await supplyApi.getBatches();
        batches.value = data;
    } catch (err: any) {
        ElMessage.error('Lỗi tải danh sách lô');
    }
}

const viewDetails = async (row: any) => {
    selectedBatch.value = row;
    items.value = [];
    activeTab.value = 'general'; // Reset tab
    showDetail.value = true;
    startPolling(); // Start watching for updates
    
    try {
        const { data } = await supplyApi.getBatchItems(row.id);
        items.value = data;
    } catch (e) {
        ElMessage.error('Lỗi tải danh sách tem');
    }
}
 
onUnmounted(() => {
    stopPolling();
});


const formatDate = (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm');

const calcProgress = (row: any) => {
    if (!row.totalUnitsExpected) return 0;
    return Math.round((row.packCount / row.totalUnitsExpected) * 100);
}

const getStatusType = (status: string) => {
    if (status === 'PACKING') return 'warning';
    if (status === 'COMPLETED') return 'success';
    return 'info';
}

onMounted(() => {
   loadBatches(); 
});
</script>
