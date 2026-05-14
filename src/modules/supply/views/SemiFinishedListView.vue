<template>
  <div class="p-4 space-y-4">
    <el-card shadow="never">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="font-semibold text-lg">Danh sách Lô Bán thành phẩm</div>
          <div class="flex gap-2">
            <el-button type="warning" plain :icon="Upload" @click="handleBatchExport">
              Xuất B2B {{ selectedBatches.length > 0 ? `(${selectedBatches.length})` : '' }}
            </el-button>
            <el-button type="success" plain :icon="Download" @click="router.push('/supply/semi-finished/import')">
              Nhập B2B
            </el-button>
            <el-button type="primary" :icon="Plus" @click="goToCreate">
              Đóng gói mới
            </el-button>
          </div>
        </div>
      </template>

      <el-table 
          v-loading="loading" 
          :data="semiFinishedBatches" 
          border 
          stripe 
          class="modern-table"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" align="center" :selectable="canSelectRow" />
          <el-table-column label="STT" type="index" width="60" align="center" />
        
        <el-table-column label="Mã lô" width="160">
          <template #default="{ row }">
            <el-link type="primary" class="font-bold" @click="viewDetail(row)">
              {{ row.batchCode }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column label="Sản phẩm" min-width="150">
          <template #default="{ row }">
            <div class="font-medium">{{ row.product?.name || 'N/A' }}</div>
            <div class="text-[10px] text-gray-400">{{ row.productGtin }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Khối lượng (kg)" width="180">
          <template #default="{ row }">
            <div class="flex flex-col text-xs">
               <span title="Tổng đóng gói"><el-icon><Calendar /></el-icon> {{ row.outputWeight ?? 0 }} kg</span>
               <span title="Hiện còn" class="text-blue-600 font-bold">
                 <el-icon><Bottom /></el-icon> Tồn: {{ row.availableQuantity ?? 0 }} kg
               </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Hao hụt" width="90" align="right">
          <template #default="{ row }">
            <span class="text-orange-600 font-bold">{{ row.lossPercentage?.toFixed(2) ?? 0 }}%</span>
          </template>
        </el-table-column>

        <el-table-column label="Lô nguồn" width="160">
          <template #default="{ row }">
             <el-tag size="small" type="info" effect="plain" class="!text-[10px]">
               {{ row.parentBatch?.batchCode || row.farmBatchCode || '-' }}
             </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Thông tin SX" width="200">
           <template #default="{ row }">
              <div class="flex flex-col text-[11px] gap-1">
                 <span v-if="row.sourceInfo?.packaging_date"><el-icon><Calendar /></el-icon> {{ formatDate(row.sourceInfo.packaging_date) }}</span>
                 <span v-if="row.sourceInfo?.packer"><el-icon><User /></el-icon> {{ row.sourceInfo.packer }}</span>
              </div>
           </template>
        </el-table-column>

        <el-table-column prop="status" label="Trạng thái" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="getStatusType(row.status)" effect="light">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="180" fixed="right" align="center">
           <template #default="{ row }">
              <div class="flex gap-2 justify-center">
                <el-button v-if="row.availableQuantity > 0.001" type="primary" size="small" link :icon="ShoppingCart" @click="handleSell(row)">
                   Xuất
                </el-button>
                <el-tag v-else type="info" size="small" plain>Hết hàng</el-tag>
                <el-popconfirm title="Bạn có chắc chắn muốn xóa lô này?" @confirm="handleDelete(row)">
                  <template #reference>
                    <el-button type="danger" size="small" link :icon="Delete">
                       Xóa
                    </el-button>
                  </template>
                </el-popconfirm>
              </div>
           </template>
        </el-table-column>
      </el-table>

      <!-- Dialog chi tiết lô (giả định hoặc bổ sung sau) -->
      <el-dialog v-model="detailVisible" title="Chi tiết lô bán thành phẩm" width="600px">
        <div v-if="selectedBatch" class="space-y-4">
           <!-- Content here -->
            <el-descriptions :column="2" border>
              <el-descriptions-item label="Mã lô">{{ selectedBatch.batchCode }}</el-descriptions-item>
              <el-descriptions-item label="Trạng thái">{{ selectedBatch.status }}</el-descriptions-item>
              <el-descriptions-item label="Sản phẩm">{{ selectedBatch.product?.name }}</el-descriptions-item>
              <el-descriptions-item label="Lô nguồn">{{ selectedBatch.parentBatch?.batchCode || '-' }}</el-descriptions-item>
              <el-descriptions-item label="Khối lượng nạp">{{ selectedBatch.inputWeight }} kg</el-descriptions-item>
              <el-descriptions-item label="Khối lượng ra">{{ selectedBatch.outputWeight }} kg</el-descriptions-item>
              <el-descriptions-item label="Nhân viên đóng gói">{{ selectedBatch.sourceInfo?.packer || '-' }}</el-descriptions-item>
              <el-descriptions-item label="Địa điểm">{{ getDisplayLocation(selectedBatch) }}</el-descriptions-item>
            </el-descriptions>

            <div class="mt-4">
              <div class="font-bold text-gray-700 mb-2 flex justify-between items-center">
                <span>Danh sách Serial ({{ batchItems.length }} mã)</span>
              </div>
              <el-table :data="batchItems" border size="small" height="300px">
                <el-table-column type="index" label="#" width="50" align="center" />
                <el-table-column prop="serialNumber" label="Serial Number" width="160" />
                <el-table-column prop="fullQrCode" label="QR Code Content" min-width="200" show-overflow-tooltip />
                <el-table-column prop="status" label="Status" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
        </div>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supplyApi } from '../api/supplyApi';
import { Bottom, Calendar, Delete, Upload, Download, Plus, Search, Refresh, ShoppingCart, User } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { ElMessageBox, ElMessage } from 'element-plus';
import { VIETNAM_PROVINCES } from '@/common/data/provinces';

const router = useRouter();
const batches = ref<any[]>([]);
const loading = ref(false);
const detailVisible = ref(false);
const selectedBatch = ref<any>(null);
const batchItems = ref<any[]>([]);
const selectedBatches = ref<any[]>([]);

const semiFinishedBatches = computed(() => {
  return batches.value.filter(b => b.batchType === 'SEMI_FINISHED' && b.status !== 'CANCELLED');
});

const canSelectRow = (row: any) => row.availableQuantity > 0.001;

const getDisplayLocation = (batch: any) => {
  if (!batch || !batch.sourceInfo) return '-';
  if (batch.sourceInfo.location_name) return batch.sourceInfo.location_name;
  
  const code = batch.sourceInfo.production_address;
  if (code) {
    const province = VIETNAM_PROVINCES.find(p => p.code === code);
    return province ? province.name : code;
  }
  return '-';
};

const loadData = async () => {
  loading.value = true;
  try {
    const { data } = await supplyApi.getBatches();
    batches.value = data || [];
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const goToCreate = () => {
  router.push('/supply/semi-finished/refine');
};

const viewDetail = async (row: any) => {
  selectedBatch.value = row;
  detailVisible.value = true;
  batchItems.value = [];
  try {
    const { data } = await supplyApi.getBatchItems(row.id);
    batchItems.value = data || [];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách item:', error);
  }
};

const handleSelectionChange = (val: any[]) => {
  selectedBatches.value = val;
};

const handleBatchExport = () => {
  const ids = selectedBatches.value.map(b => b.id).join(',');
  router.push({
    path: '/supply/semi-finished/export',
    query: ids ? { batchIds: ids } : {}
  });
};

const handleSell = (row: any) => {
  router.push({
    path: '/supply/semi-finished/export',
    query: { batchIds: row.id }
  });
};

const handleDelete = async (row: any) => {
  try {
    await supplyApi.cancelBatch(row.id);
    ElMessage.success('Đã xóa (hủy) lô thành công');
    await loadData();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Xóa thất bại');
  }
};

const formatDate = (date: any) => {
  if (!date) return '-';
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'DRAFT': return 'info';
    case 'PACKING': return 'warning';
    default: return 'info';
  }
};

onMounted(loadData);
</script>
