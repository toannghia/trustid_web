<template>
  <div class="p-6">
    <div class="mb-4"></div>

    <!-- Filter and Search -->
    <div class="mb-4 flex gap-4">
        <el-input v-model="searchKeyword" placeholder="Tìm theo mã lô, tên vụ..." class="w-80" prefix-icon="Search" clearable />
        <el-select v-model="filterStatus" placeholder="Trạng thái" clearable class="w-48">
             <el-option label="Tất cả" value="" />
             <el-option label="Mới tạo (Tại nông trại)" value="CREATED" />
             <el-option label="Chờ đóng gói" value="READY_FOR_PACKAGING" />
             <el-option label="Đang đóng gói" value="PACKAGING" />
             <el-option label="Hoàn thành" value="COMPLETED" />
        </el-select>
    </div>

    <!-- Table -->
    <el-card shadow="hover">
      <el-table :data="filteredBatches" v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column label="Mã lô (Batch ID)" min-width="180">
             <template #default="{ row }">
                <span 
                    class="font-mono font-bold text-blue-600 cursor-pointer hover:underline"
                    @click="viewBatchDetails(row)"
                >
                    {{ row.batchCode }}
                </span>
             </template>
        </el-table-column>

        <el-table-column label="Vụ mùa" min-width="200">
             <template #default="{ row }">
                {{ row.cropCycle?.name || '---' }}
                <div class="text-xs text-gray-500">{{ row.cropCycle?.location?.name }}</div>
             </template>
        </el-table-column>

        <el-table-column label="Ngày thu hoạch" width="150">
           <template #default="{ row }">
              {{ formatDate(row.harvestDate) }}
           </template>
        </el-table-column>

        <el-table-column prop="quantityKg" label="Sản lượng (kg)" width="150" align="right">
            <template #default="{ row }">
                <span class="font-bold">{{ row.quantityKg }} kg</span>
            </template>
        </el-table-column>

        <el-table-column prop="status" label="Trạng thái" width="160">
           <template #default="{ row }">
             <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
           </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="200" align="right" fixed="right">
            <template #default="{ row }">
                 <el-button 
                    v-if="row.status === 'CREATED'"
                    type="primary" 
                    size="small" 
                    @click="confirmSendToPackaging(row)"
                 >
                    <el-icon class="mr-1"><Box /></el-icon>
                    Chuyển đóng gói
                 </el-button>
                  <el-button 
                    v-if="row.status === 'READY_FOR_PACKAGING'"
                    type="info" 
                    size="small" 
                    disabled
                 >
                    Đã chờ đóng gói
                 </el-button>
            </template>
        </el-table-column>

      </el-table>
    </el-card>

    <!-- Batch Details Drawer -->
    <el-drawer
        v-model="showDetails"
        title="Chi tiết Lô sản xuất"
        direction="rtl"
        size="600px"
    >
        <template v-if="selectedBatch">
            <div class="mb-6 p-4 bg-blue-50 rounded-lg flex justify-between items-start">
                <div>
                   <h3 class="font-bold text-lg text-blue-800">{{ selectedBatch.batchCode }}</h3>
                   <p class="text-gray-600 text-sm mt-1">Vụ: {{ selectedBatch.cropCycle?.name }}</p>
                   <p class="text-gray-600 text-sm">Vùng trồng: {{ selectedBatch.cropCycle?.location?.name }}</p>
                </div>
                <div class="text-right">
                    <el-tag size="large" :type="getStatusType(selectedBatch.status)">{{ getStatusLabel(selectedBatch.status) }}</el-tag>
                    <div class="mt-2 text-sm font-bold">{{ selectedBatch.quantityKg }} kg</div>
                </div>
            </div>

            <h4 class="font-bold text-gray-800 mb-4 flex items-center">
                <el-icon class="mr-2"><Collection /></el-icon>
                Nhật ký canh tác (Truy xuất nguồn gốc)
            </h4>
            
            <div v-loading="loadingDetails">
                <el-timeline v-if="details?.cropCycle?.farmingLogs?.length">
                    <el-timeline-item
                        v-for="(log, index) in details.cropCycle.farmingLogs"
                        :key="index"
                        :timestamp="formatDateTime(log.createdAt)"
                        :type="log.status === 'COMPLETED' ? 'success' : 'info'"
                        placement="top"
                    >
                        <el-card shadow="never" class="!border-gray-200">
                            <h5 class="font-bold text-gray-800">{{ log.title }}</h5>
                            <p class="text-xs text-gray-500 mb-2">{{ log.stage || 'Giai đoạn chung' }}</p>
                            <p class="text-gray-700 text-sm" v-if="log.notes">{{ log.notes }}</p>
                            
                            <!-- Materials Used -->
                            <div v-if="log.materialsUsed && log.materialsUsed.length" class="mt-2 pt-2 border-t border-gray-100">
                                <p class="text-xs font-bold text-gray-500 mb-1">Vật tư sử dụng:</p>
                                <div class="flex flex-wrap gap-2">
                                     <el-tag v-for="mat in log.materialsUsed" :key="mat.id" size="small" type="info">
                                        {{ mat.name }} ({{ mat.quantity }} {{ mat.unit }})
                                     </el-tag>
                                </div>
                            </div>
                        </el-card>
                    </el-timeline-item>
                </el-timeline>
                <el-empty v-else description="Chưa có nhật ký nào được ghi nhận cho vụ này" />
            </div>

        </template>
    </el-drawer>

    <!-- Confirm Send to Packaging Modal -->
    <el-dialog
      v-model="showConfirmModal"
      width="450px"
      class="branded-batch-confirm-dialog"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            Xác nhận chuyển kho
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showConfirmModal = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <div style="padding: 24px 24px 8px; display: flex; align-items: flex-start; gap: 16px;">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: #FFF7EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <el-icon style="font-size: 22px; color: #E6A23C;"><Warning /></el-icon>
        </div>
        <div style="flex: 1; font-size: 14px; color: #303133; line-height: 1.6; padding-top: 2px;">
          Bạn có chắc chắn muốn chuyển lô <strong style="font-family: monospace; color: #0F2B46;">"{{ pendingBatch?.batchCode }}"</strong> sang bộ phận đóng gói?
        </div>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showConfirmModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button type="success" :loading="submittingConfirm" @click="handleConfirmSend" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
            Đồng ý
          </el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { Search, Box, Collection, Warning } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { farmApi, type Harvest } from '../api/farmApi';
import dayjs from 'dayjs';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const batches = ref<Harvest[]>([]);
const loading = ref(false);
const searchKeyword = ref('');
const filterStatus = ref('');

// Details Drawer
const showDetails = ref(false);
const selectedBatch = ref<Harvest | null>(null);
const details = ref<any>(null); // Full details with logs
const loadingDetails = ref(false);

const filteredBatches = computed(() => {
    return batches.value.filter(b => {
        const term = searchKeyword.value.toLowerCase();
        const matchesSearch = 
            b.batchCode.toLowerCase().includes(term) || 
            (b.cropCycle?.name || '').toLowerCase().includes(term);
        
        const matchesStatus = filterStatus.value ? b.status === filterStatus.value : true;

        return matchesSearch && matchesStatus;
    });
});

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('DD/MM/YYYY');
};

const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('HH:mm DD/MM/YYYY');
};

const getStatusType = (status: string) => {
    switch (status) {
        case 'CREATED': return 'info';
        case 'READY_FOR_PACKAGING': return 'warning';
        case 'PACKAGING': return 'primary';
        case 'COMPLETED': return 'success';
        default: return 'info';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'CREATED': return 'Mới (Tại nông trại)';
        case 'READY_FOR_PACKAGING': return 'Chờ đóng gói';
        case 'PACKAGING': return 'Đang đóng gói';
        case 'COMPLETED': return 'Hoàn thành';
        default: return status;
    }
};

const loadData = async () => {
  loading.value = true;
  try {
    const { data } = await farmApi.getHarvests();
    batches.value = data;
  } catch (err) {
    ElMessage.error('Không thể tải danh sách lô sản xuất');
  } finally {
    loading.value = false;
  }
};

const viewBatchDetails = async (row: Harvest) => {
    selectedBatch.value = row;
    showDetails.value = true;
    loadingDetails.value = true;
    details.value = null;
    
    try {
        const { data } = await farmApi.getHarvestDetails(row.id);
        details.value = data;
    } catch (err) {
        ElMessage.error('Không thể tải chi tiết lô');
    } finally {
        loadingDetails.value = false;
    }
}

const showConfirmModal = ref(false);
const pendingBatch = ref<Harvest | null>(null);
const submittingConfirm = ref(false);

const confirmSendToPackaging = (row: Harvest) => {
    pendingBatch.value = row;
    showConfirmModal.value = true;
};

const handleConfirmSend = async () => {
    if (!pendingBatch.value) return;
    submittingConfirm.value = true;
    try {
        await farmApi.updateHarvestStatus(pendingBatch.value.id, 'READY_FOR_PACKAGING');
        ElMessage.success('Đã chuyển lô sang bộ phận đóng gói');
        showConfirmModal.value = false;
        loadData();
    } catch (err) {
        ElMessage.error('Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
        submittingConfirm.value = false;
    }
};

onMounted(loadData);
</script>

<style>
.branded-batch-confirm-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-batch-confirm-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-batch-confirm-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-batch-confirm-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
