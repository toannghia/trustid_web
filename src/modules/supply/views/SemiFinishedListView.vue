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

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 items-center mb-4">
        <el-input
          v-model="searchTerm"
          placeholder="Tìm theo mã lô, sản phẩm..."
          clearable
          style="width: 280px"
          @input="debouncedSearch"
          :prefix-icon="Search"
        />
        <el-select
          v-model="filterStatus"
          placeholder="Trạng thái"
          clearable
          style="width: 160px"
          @change="handleFilterChange"
        >
          <el-option label="Tất cả trạng thái" value="" />
          <el-option label="Đang hoạt động" value="ACTIVE" />
          <el-option label="Hoàn thành" value="COMPLETED" />
          <el-option label="Đã xuất" value="EXPORTED" />
        </el-select>
        <span class="ml-auto text-sm text-slate-500">
          Tổng: <strong>{{ total }}</strong> lô
        </span>
      </div>

      <el-table 
          v-loading="loading" 
          :data="batches" 
          border 
          stripe 
          class="modern-table"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" align="center" :selectable="canSelectRow" />
          <el-table-column label="STT" width="60" align="center">
            <template #default="{ $index }">
              {{ (currentPage - 1) * pageSize + $index + 1 }}
            </template>
          </el-table-column>
        
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
              {{ row.status === 'EXPORTED' ? 'Đã xuất' : row.status === 'ACTIVE' ? 'Đang hoạt động' : row.status === 'COMPLETED' ? 'Hoàn thành' : row.status }}
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

      <div class="pagination-container flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 50, 100, 500]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>

      <!-- Dialog chi tiết lô -->
      <el-dialog v-model="detailVisible" title="Chi tiết lô bán thành phẩm" width="700px">
        <div v-if="selectedBatch" class="space-y-4">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="Mã lô">
                <div class="flex items-center gap-2">
                  <template v-if="editingBatchCode">
                    <el-input v-model="newBatchCode" size="small" class="!w-48 font-mono" />
                    <el-button size="small" type="primary" :loading="savingBatchCode" @click="saveBatchCode">Lưu</el-button>
                    <el-button size="small" @click="cancelEditBatchCode">Hủy</el-button>
                  </template>
                  <template v-else>
                    <span class="font-mono font-bold">{{ selectedBatch.batchCode }}</span>
                    <el-button size="small" link type="primary" @click="startEditBatchCode">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                  </template>
                </div>
              </el-descriptions-item>
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
                <span>
                  Danh sách Serial ({{ originalItemCount }} mã
                  <template v-if="supplementaryItemCount > 0">
                    + {{ supplementaryItemCount }} tem bù
                  </template>
                  )
                </span>
                <el-button
                  v-if="isAdminOrTenantAdmin"
                  type="warning"
                  size="small"
                  plain
                  @click="showSupplementaryDialog = true"
                >
                  🏷️ Cấp tem bù
                </el-button>
              </div>
              <el-table :data="batchItems" border size="small" height="300px">
                <el-table-column type="index" label="#" width="50" align="center" />
                <el-table-column prop="serialNumber" label="Serial Number" width="160" />
                <el-table-column prop="fullQrCode" label="QR Code Content" min-width="200" show-overflow-tooltip />
                <el-table-column prop="status" label="Status" width="120" align="center">
                  <template #default="{ row }">
                    <el-tag
                      v-if="isAdminOrTenantAdmin && row.isSupplementary"
                      size="small"
                      type="warning"
                      effect="light"
                    >
                      🏷️ Tem bù
                    </el-tag>
                    <el-tag v-else size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status === 'ACTIVE' ? 'Đang hoạt động' : row.status === 'INACTIVE' ? 'Ngừng hoạt động' : row.status }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
        </div>
      </el-dialog>

      <!-- Dialog Cấp Tem Bù -->
      <el-dialog
        v-model="showSupplementaryDialog"
        title="🏷️ Cấp tem bù"
        width="560px"
        :close-on-click-modal="false"
      >
        <div v-if="selectedBatch" class="space-y-4">
          <!-- Info -->
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="Lô">{{ selectedBatch.batchCode }}</el-descriptions-item>
            <el-descriptions-item label="Sản phẩm">{{ selectedBatch.product?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Mã gốc hiện tại">{{ originalItemCount }}</el-descriptions-item>
            <el-descriptions-item label="Tem bù đã cấp">{{ supplementaryItemCount }}</el-descriptions-item>
          </el-descriptions>

          <!-- Step 1: Chọn mã -->
          <el-card shadow="never" class="!border-blue-200">
            <template #header>
              <div class="text-sm font-bold text-blue-700">Bước 1: Chọn mã từ kho</div>
            </template>
            <div class="grid grid-cols-3 gap-4">
              <el-form-item label="Tiền tố" size="small">
                <el-select v-model="suppPrefix" filterable class="w-full" @change="handleSuppPrefixChange">
                  <el-option v-for="p in suppPrefixes" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>
              <el-form-item label="Số bắt đầu" size="small">
                <el-input v-model="suppStartNumber" placeholder="00030" />
              </el-form-item>
              <el-form-item label="Số lượng" size="small">
                <el-input-number v-model="suppQuantity" :min="1" :max="50" class="w-full" />
              </el-form-item>
            </div>
            <div v-if="suppPreviewSerials.length > 0" class="mt-2">
              <div class="text-xs text-gray-500 mb-1">Sẽ lấy {{ suppPreviewSerials.length }} mã:</div>
              <div class="flex flex-wrap gap-1">
                <el-tag v-for="s in suppPreviewSerials" :key="s" size="small" effect="plain" class="!text-[10px] font-mono">
                  {{ s }}
                </el-tag>
              </div>
            </div>
          </el-card>

          <!-- Step 2: Lý do -->
          <el-card shadow="never" class="!border-orange-200">
            <template #header>
              <div class="text-sm font-bold text-orange-700">Bước 2: Lý do cấp bù</div>
            </template>
            <div class="grid grid-cols-2 gap-4">
              <el-form-item label="Lý do" size="small">
                <el-select v-model="suppReason" class="w-full">
                  <el-option label="Mất tem" value="LOST_LABEL" />
                  <el-option label="Hỏng tem" value="DAMAGED_LABEL" />
                  <el-option label="Khác" value="OTHER" />
                </el-select>
              </el-form-item>
              <el-form-item label="Ghi chú (tùy chọn)" size="small">
                <el-input v-model="suppNote" placeholder="VD: Rơi khi vận chuyển đợt 3" />
              </el-form-item>
            </div>
          </el-card>

          <!-- Step 3: Cảnh báo -->
          <el-alert type="warning" :closable="false" show-icon>
            <template #title>
              Mã bù <strong>KHÔNG</strong> tính vào số lượng lô. Chỉ dùng để dán thay thế tem bị mất/hỏng.
            </template>
          </el-alert>
        </div>

        <template #footer>
          <el-button @click="showSupplementaryDialog = false">Hủy</el-button>
          <el-button
            type="warning"
            :loading="suppSaving"
            :disabled="suppPreviewSerials.length === 0 || !suppReason"
            @click="submitSupplementaryCodes"
          >
            Xác nhận cấp {{ suppPreviewSerials.length }} tem bù
          </el-button>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supplyApi } from '../api/supplyApi';
import { Bottom, Calendar, Delete, Upload, Download, Plus, Search, Refresh, ShoppingCart, User, Edit } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { ElMessageBox, ElMessage } from 'element-plus';
import { VIETNAM_PROVINCES } from '@/common/data/provinces';
import { useAuthStore } from '@/modules/core/store/auth';

const router = useRouter();
const authStore = useAuthStore();
const batches = ref<any[]>([]);
const loading = ref(false);
const detailVisible = ref(false);
const selectedBatch = ref<any>(null);
const batchItems = ref<any[]>([]);
const selectedBatches = ref<any[]>([]);

const editingBatchCode = ref(false);
const newBatchCode = ref('');
const savingBatchCode = ref(false);

// --- Supplementary codes state ---
const showSupplementaryDialog = ref(false);
const suppPrefixes = ref<string[]>([]);
const suppPrefix = ref('');
const suppStartNumber = ref('');
const suppQuantity = ref(1);
const suppReason = ref('LOST_LABEL');
const suppNote = ref('');
const suppPreviewSerials = ref<string[]>([]);
const suppSaving = ref(false);
let suppRealPrefix = '';

const isAdminOrTenantAdmin = computed(() => {
  const user = authStore.user as any;
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
  return roleName === 'ADMIN' || roleName === 'TENANT_ADMIN';
});

const originalItemCount = computed(() =>
  batchItems.value.filter(i => !i.isSupplementary).length
);

const supplementaryItemCount = computed(() =>
  batchItems.value.filter(i => i.isSupplementary).length
);

const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const searchTerm = ref('');
const filterStatus = ref('');

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
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value,
      batchType: 'SEMI_FINISHED'
    };
    if (searchTerm.value) params.search = searchTerm.value;
    if (filterStatus.value) params.status = filterStatus.value;
    
    const { data } = await supplyApi.getBatches(params);
    batches.value = data.data || [];
    total.value = data.total || 0;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

let debounceTimer: any = null;
const debouncedSearch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentPage.value = 1;
    loadData();
  }, 300);
};

const handleFilterChange = () => {
  currentPage.value = 1;
  loadData();
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
  loadData();
};

const handlePageChange = (val: number) => {
  currentPage.value = val;
  loadData();
};

const goToCreate = () => {
  router.push('/supply/semi-finished/refine');
};

const viewDetail = async (row: any) => {
  selectedBatch.value = row;
  detailVisible.value = true;
  batchItems.value = [];
  editingBatchCode.value = false;
  try {
    const { data } = await supplyApi.getBatchItems(row.id);
    batchItems.value = data || [];
  } catch (error) {
    console.error('Lỗi khi lấy danh sách item:', error);
  }
};

const startEditBatchCode = () => {
  newBatchCode.value = selectedBatch.value.batchCode;
  editingBatchCode.value = true;
};

const cancelEditBatchCode = () => {
  editingBatchCode.value = false;
};

const saveBatchCode = async () => {
  if (!newBatchCode.value.trim()) {
    ElMessage.warning('Mã lô không được để trống');
    return;
  }
  savingBatchCode.value = true;
  try {
    await supplyApi.updateBatchCode(selectedBatch.value.id, newBatchCode.value.trim());
    ElMessage.success('Đã cập nhật mã lô thành công');
    selectedBatch.value.batchCode = newBatchCode.value.trim();
    editingBatchCode.value = false;
    await loadData();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Cập nhật mã lô thất bại');
  } finally {
    savingBatchCode.value = false;
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

// --- Supplementary codes logic ---
const loadSuppPrefixes = async () => {
  try {
    const res = await supplyApi.searchSerialPrefixes();
    suppPrefixes.value = res.data || [];
  } catch (e) {}
};

const handleSuppPrefixChange = async (prefix: string) => {
  if (!prefix) return;
  try {
    const res = await supplyApi.getPrefixNextNumber(prefix) as any;
    suppRealPrefix = res.data.real_prefix || prefix;
    suppStartNumber.value = res.data.next_number;
    generateSuppPreview();
  } catch (e) {
    suppStartNumber.value = '';
    suppPreviewSerials.value = [];
  }
};

const generateSuppPreview = () => {
  if (!suppRealPrefix || !suppStartNumber.value || suppQuantity.value <= 0) {
    suppPreviewSerials.value = [];
    return;
  }
  const start = parseInt(suppStartNumber.value, 10);
  const numLen = suppStartNumber.value.length;
  const serials: string[] = [];
  for (let i = 0; i < suppQuantity.value; i++) {
    serials.push(`${suppRealPrefix}${String(start + i).padStart(numLen, '0')}`);
  }
  suppPreviewSerials.value = serials;
};

const submitSupplementaryCodes = async () => {
  if (!selectedBatch.value || suppPreviewSerials.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `Bạn sắp cấp ${suppPreviewSerials.value.length} tem bù cho lô ${selectedBatch.value.batchCode}. Tiếp tục?`,
      'Xác nhận cấp tem bù',
      { type: 'warning', confirmButtonText: 'Cấp tem bù', cancelButtonText: 'Hủy' }
    );
  } catch { return; }

  suppSaving.value = true;
  try {
    await supplyApi.createSupplementaryCodes(selectedBatch.value.id, {
      serials: suppPreviewSerials.value,
      reason: suppReason.value,
      note: suppNote.value || undefined
    });
    ElMessage.success(`Đã cấp ${suppPreviewSerials.value.length} tem bù thành công!`);
    showSupplementaryDialog.value = false;

    // Reset form
    suppPreviewSerials.value = [];
    suppQuantity.value = 1;
    suppNote.value = '';

    // Refresh items
    const { data } = await supplyApi.getBatchItems(selectedBatch.value.id);
    batchItems.value = data || [];
  } catch (e: any) {
    const resp = e?.response?.data;
    const status = e?.response?.status || '???';
    let msg = '';
    if (resp?.message) {
      msg = Array.isArray(resp.message) ? resp.message.join('; ') : resp.message;
    } else {
      msg = e?.message || 'Lỗi không xác định';
    }
    ElMessage.error({ message: `[${status}] ${msg}`, duration: 8000, showClose: true });
    console.error('[Cấp tem bù] Error:', status, resp || e);
  } finally {
    suppSaving.value = false;
  }
};

// Watch for changes
import { watch } from 'vue';
watch([() => suppStartNumber.value, () => suppQuantity.value], () => {
  generateSuppPreview();
});

watch(showSupplementaryDialog, (val) => {
  if (val) loadSuppPrefixes();
});

onMounted(loadData);
</script>
