<template>
  <div class="p-6 space-y-6 max-w-5xl mx-auto pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <div class="p-2 bg-green-100 rounded-lg text-green-600">
            <el-icon><Download /></el-icon>
          </div>
          Tiếp nhận Bán thành phẩm
        </h1>
        <p class="text-gray-500 text-sm mt-1">Xác nhận nhập kho lô bán thành phẩm B2B từ đối tác</p>
      </div>
      <el-button @click="router.back()" plain>Quay lại</el-button>
    </div>

    <!-- KHỐI 1: TÌM KIẾM & NẠP PHIẾU (Scan & Load) -->
    <el-card shadow="never" class="!border-green-200 !rounded-xl" :class="{ '!bg-green-50/30': selectedTransfer }">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-bold text-green-800 flex items-center gap-2">
          <el-icon><Search /></el-icon> 1. Quét mã nạp phiếu
        </div>
      </div>
      
      <div class="flex gap-3">
        <el-input 
          v-model="scanInput" 
          ref="scanInputRef" 
          placeholder="Quét Mã Phiếu (XK-...) hoặc Mã Serial trên bao hàng..." 
          @keyup.enter="handleScan" 
          class="flex-1 scan-input-large"
          size="large"
          clearable
        >
          <template #prefix><el-icon size="18"><FullScreen /></el-icon></template>
        </el-input>
        <el-button type="success" size="large" @click="handleScan" :loading="scanning" class="!px-8">Nạp Phiếu</el-button>
      </div>
      
      <!-- Hỗ trợ chọn tay nếu không có súng quét -->
      <div class="mt-4 flex items-center gap-2 text-xs text-gray-500 border-t pt-3">
        <span>Hoặc chọn thủ công phiếu đang chờ:</span>
        <el-select 
          v-model="selectedTransferId" 
          filterable 
          size="small"
          class="!w-64" 
          placeholder="Chọn phiếu đang đến..."
          @change="handleManualSelect"
        >
          <el-option 
            v-for="t in pendingTransfers" 
            :key="t.id" 
            :label="`${t.transferCode || t.id.split('-')[0]} - Từ: ${getTenantName(t.fromTenantId)}`" 
            :value="t.id"
          />
        </el-select>
      </div>
    </el-card>

    <!-- KHỐI 2: THÔNG TIN TIẾP NHẬN -->
    <el-card v-if="selectedTransfer" shadow="never" class="!border-gray-200 !rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
      <template #header>
        <div class="flex justify-between items-center h-4">
          <div class="flex items-center gap-2 font-bold text-gray-700">
            <el-icon><List /></el-icon> 2. Thông tin tiếp nhận
          </div>
          <el-tag effect="dark" type="warning" size="small">{{ selectedTransfer.status }}</el-tag>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <!-- Thông tin phiếu gửi -->
        <div class="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-3">
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Thông tin Phiếu xuất</div>
          <div class="grid grid-cols-3 gap-2 text-sm">
             <span class="text-gray-500">Mã phiếu:</span>
             <span class="col-span-2 font-bold text-gray-800 font-mono">{{ selectedTransfer.transferCode || '---' }}</span>
             
             <span class="text-gray-500">Đơn vị xuất:</span>
             <span class="col-span-2 font-bold text-green-700">{{ getTenantName(selectedTransfer.fromTenantId) }}</span>
             
             <span class="text-gray-500">Ngày xuất:</span>
             <span class="col-span-2 font-medium">{{ formatDate(selectedTransfer.updatedAt) }}</span>
             
             <span class="text-gray-500">Ghi chú:</span>
             <span class="col-span-2 text-gray-600 italic">{{ selectedTransfer.notes || 'Không có' }}</span>
          </div>
        </div>

        <!-- Cấu hình nhập -->
        <div class="p-4 bg-blue-50/50 rounded-lg border border-blue-100 space-y-4">
           <div class="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Cấu hình nhập kho</div>
           
           <el-form-item label="Kho nhập về (Bắt buộc)" class="!mb-0 label-bold" required>
             <div class="flex gap-2 w-full">
               <el-select v-model="importForm.target_warehouse_id" filterable class="flex-1" placeholder="Chọn kho nguyên liệu/bán thành phẩm...">
                 <template #prefix><el-icon><House /></el-icon></template>
                 <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
               </el-select>
               <el-button type="primary" plain @click.prevent="fastCreateWarehouse" title="Thêm kho nhanh">
                 <el-icon><Plus /></el-icon>
               </el-button>
             </div>
           </el-form-item>

           <el-form-item label="Chế độ nhập" class="!mb-0 label-bold" required>
             <el-radio-group v-model="importForm.import_mode" class="w-full">
               <el-radio-button label="FULL" class="flex-1">Nhập Toàn Bộ</el-radio-button>
               <el-radio-button label="PARTIAL" class="flex-1">Nhập Một Phần</el-radio-button>
             </el-radio-group>
           </el-form-item>
        </div>
      </div>
    </el-card>

    <!-- KHỐI 3: DANH SÁCH LÔ -->
    <el-card v-if="selectedTransfer" shadow="never" class="!border-gray-200 !rounded-xl animate-in fade-in slide-in-from-top-8 duration-500">
      <template #header>
        <div class="flex justify-between items-center h-4">
          <div class="flex items-center gap-2 font-bold text-gray-700">
            <el-icon><Box /></el-icon> 3. Kiểm đếm hàng hóa
          </div>
          <span class="text-xs font-bold text-gray-500">Tổng: {{ partialRows.length }} Lô</span>
        </div>
      </template>

      <!-- Khối nhập mã khi Partial -->
      <div v-if="importForm.import_mode === 'PARTIAL'" class="mb-4 p-3 bg-orange-50 border border-orange-100 rounded-lg">
         <div class="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
            <el-icon><Warning /></el-icon> Chế độ nhập một phần (Nhập từng bao)
         </div>
         <el-form-item label="Quét mã các bao thực nhận để đối soát (Tùy chọn)" class="!mb-0">
            <el-input 
              v-model="scanText" 
              type="textarea" 
              :rows="2" 
              placeholder="Dán hoặc quét danh sách mã QR thực tế nhận được..."
            />
            <div class="text-[10px] text-gray-400 mt-1">Hệ thống sẽ ghi lại danh sách này làm bằng chứng kiểm kê kho.</div>
         </el-form-item>
      </div>

      <el-table :data="partialRows" border size="small" class="modern-table">
        <el-table-column label="STT" type="index" width="50" align="center" />
        <el-table-column label="Mã lô" min-width="150">
           <template #default="{ row }">
              <span class="font-mono font-bold text-blue-600">{{ row.batchCode || getBatchCode(row.batch_id) }}</span>
           </template>
        </el-table-column>
        <el-table-column label="Sản phẩm" min-width="150">
           <template #default="{ row }">
              <span class="font-medium text-xs">{{ row.productName || getBatchInfo(row.batch_id)?.product?.name || '---' }}</span>
           </template>
        </el-table-column>
        <el-table-column label="K.Lượng Xuất (KG)" width="150" align="right">
            <template #default="{ row }">
               <span class="font-bold text-gray-600">{{ row.expected_quantity }}</span>
            </template>
        </el-table-column>
        
        <el-table-column label="K.Lượng Nhận (KG)" width="180" align="right" class-name="bg-green-50/50">
          <template #default="{ row }">
            <div v-if="importForm.import_mode === 'FULL'" class="font-bold text-green-700">
               {{ row.expected_quantity }} <el-icon><Select /></el-icon>
            </div>
            <div v-else>
               <el-input-number 
                  v-model="row.received_quantity" 
                  :min="0" 
                  :max="row.expected_quantity"
                  :step="0.1" 
                  size="small" 
                  class="!w-full"
                  controls-position="right"
               />
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- KHỐI 4: LỊCH SỬ PHIẾU ĐÃ NHẬP -->
    <el-card v-if="!selectedTransfer" shadow="never" class="!border-gray-200 !rounded-xl mt-6">
      <template #header>
        <div class="flex items-center gap-2 font-bold text-gray-700">
          <el-icon><List /></el-icon> Lịch sử Phiếu đã nhập gần đây
        </div>
      </template>
      <el-table :data="importedTransfers" border stripe class="modern-table" empty-text="Chưa có phiếu nào được nhập">
        <el-table-column label="Mã Phiếu" width="160">
          <template #default="{ row }">
            <span class="font-mono font-bold text-blue-600">{{ row.transferCode }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Ngày Nhập" width="140">
          <template #default="{ row }">
            <div class="flex items-center gap-1 text-xs">
              <el-icon><Calendar /></el-icon> {{ formatDate(row.importedAt || row.updatedAt) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Đơn vị xuất" min-width="180">
          <template #default="{ row }">
            <span class="font-medium text-gray-700">{{ getTenantName(row.fromTenantId) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Trạng thái" width="140" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'COMPLETED' ? 'success' : 'warning'">{{ row.status === 'COMPLETED' ? 'Hoàn thành' : row.status === 'PENDING' ? 'Chờ xử lý' : row.status === 'PROCESSING' ? 'Đang xử lý' : row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Ghi chú" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ row.notes || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link icon="View" @click="viewDetail(row)">Chi tiết</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Dialog xem chi tiết phiếu đã nhập -->
    <el-dialog v-model="detailVisible" title="Chi tiết Phiếu Nhập" width="600px" append-to-body destroy-on-close class="rounded-dialog">
      <div v-if="detailRow" class="space-y-4">
        <div class="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
          <div>
            <div class="text-gray-400 text-[10px] uppercase font-bold">Mã Phiếu</div>
            <div class="font-mono font-bold">{{ detailRow.transferCode }}</div>
          </div>
          <div>
            <div class="text-gray-400 text-[10px] uppercase font-bold">Ngày Nhập</div>
            <div class="font-medium">{{ formatDate(detailRow.importedAt || detailRow.updatedAt) }}</div>
          </div>
          <div>
            <div class="text-gray-400 text-[10px] uppercase font-bold">Đơn vị xuất</div>
            <div class="font-bold text-green-700">{{ getTenantName(detailRow.fromTenantId) }}</div>
          </div>
          <div>
            <div class="text-gray-400 text-[10px] uppercase font-bold">Trạng thái</div>
            <el-tag size="small" type="success">{{ detailRow.status }}</el-tag>
          </div>
        </div>

        <div class="font-bold text-gray-700 flex items-center gap-2">
           <el-icon><Box /></el-icon> Danh sách hàng hóa thực nhập
        </div>

        <el-table :data="detailRow.items" border size="small">
          <el-table-column label="Mã lô" min-width="140">
            <template #default="{ row }">
              <span class="font-mono text-xs">{{ row.batch?.batchCode || row.batchId }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Sản phẩm" min-width="150">
            <template #default="{ row }">
              <span class="text-xs">{{ row.batch?.product?.name || '---' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Khối lượng (KG)" width="120" align="right">
            <template #default="{ row }">
              <span class="font-bold text-blue-600">{{ row.receivedQuantity || row.expectedQuantity }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">Đóng</el-button>
      </template>
    </el-dialog>

    <!-- FOOTER ACTIONS -->
    <div v-if="selectedTransfer" class="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center gap-4 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-4">
       <el-button @click="resetForm" size="large" class="!px-8 !rounded-lg"><el-icon class="mr-2"><Close /></el-icon> Hủy bỏ</el-button>
       <el-button 
         type="success" 
         size="large" 
         class="!px-12 !rounded-lg"
         :loading="importing" 
         @click="submitImport"
       >
         <el-icon class="mr-2"><Check /></el-icon> Xác nhận nhập kho
       </el-button>
    </div>

    <WarehouseCreateDialog 
      ref="warehouseCreateRef" 
      @success="onWarehouseCreated" 
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { supplyApi } from '../api/supplyApi';
import { tenantApi } from '@/modules/core/api/tenant';
import { transportApi } from '../api/transportApi';
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus';
import { 
  Download, CircleCheck, EditPen, CircleCheckFilled, 
  Box, Compass, Search, FullScreen, List, House, Warning, Select, Close, Check, Plus, Calendar, View
} from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { useAuthStore } from '@/modules/core/store/auth';
import WarehouseCreateDialog from '../components/WarehouseCreateDialog.vue';

const router = useRouter();
const authStore = useAuthStore();

// State
const tenants = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const batches = ref<any[]>([]);
const transfers = ref<any[]>([]);

const scanning = ref(false);
const importing = ref(false);

const scanInput = ref('');
const scanInputRef = ref<any>(null);

const selectedTransferId = ref('');
const scanText = ref('');

const importForm = ref({
  import_mode: 'FULL' as 'FULL' | 'PARTIAL',
  target_warehouse_id: '',
  device_id: '',
  location: ''
});

const partialRows = ref<Array<{ batch_id: string; expected_quantity: number; received_quantity: number; batchCode?: string; productName?: string }>>([]);
const detailVisible = ref(false);
const detailRow = ref<any>(null);

// Computed
const pendingTransfers = computed(() => {
  const currentTenantId = authStore.user?.tenantId;
  return transfers.value.filter(t => 
    t.toTenantId === currentTenantId &&
    (t.status === 'EXPORTED' || t.status === 'IMPORTING')
  );
});

const importedTransfers = computed(() => {
  const currentTenantId = authStore.user?.tenantId;
  return transfers.value.filter(t => 
    t.toTenantId === currentTenantId &&
    (t.status === 'COMPLETED' || t.status === 'PARTIAL_COMPLETED')
  );
});

const selectedTransfer = computed(() => {
  return transfers.value.find(t => t.id === selectedTransferId.value);
});

// Methods
const warehouseCreateRef = ref<any>(null);

const load = async () => {
  try {
    const [tRes, wRes, bRes, trRes] = await Promise.all([
      tenantApi.getActive({ limit: 500 }),
      transportApi.getWarehouses(),
      supplyApi.getBatches(),
      supplyApi.listTransfers()
    ]);
    tenants.value = tRes.data?.items || tRes.data || [];
    warehouses.value = wRes.data || [];
    batches.value = bRes.data || [];
    transfers.value = trRes.data || [];
  } catch (e) {}
};

const fastCreateWarehouse = () => {
  console.log('fastCreateWarehouse clicked', warehouseCreateRef.value);
  if (warehouseCreateRef.value) {
    warehouseCreateRef.value.open();
  } else {
    ElMessage.error('Không thể mở form thêm kho lúc này');
  }
};

const onWarehouseCreated = async (newWarehouse: any) => {
  await load();
  importForm.value.target_warehouse_id = newWarehouse.id;
};

const focusScan = () => {
  nextTick(() => {
    scanInputRef.value?.focus();
  });
};

const resetForm = () => {
  selectedTransferId.value = '';
  scanInput.value = '';
  scanText.value = '';
  partialRows.value = [];
  importForm.value = {
    import_mode: 'FULL',
    target_warehouse_id: '',
    device_id: '',
    location: ''
  };
  focusScan();
};

const handleManualSelect = (val: string) => {
  loadTransferData(val);
};

const viewDetail = (row: any) => {
  detailRow.value = row;
  detailVisible.value = true;
};

const handleScan = async () => {
  const code = scanInput.value.trim();
  if (!code) return;
  
  scanning.value = true;
  try {
    // 1. Check if the scanned code is exactly a transferCode (e.g. XK-...)
    const foundTransfer = pendingTransfers.value.find(t => 
      t.transferCode === code || t.id === code || t.id.startsWith(code)
    );
    
    if (foundTransfer) {
      loadTransferData(foundTransfer.id);
      ElMessage.success(`Đã nạp phiếu ${foundTransfer.transferCode || code}`);
      scanInput.value = '';
      return;
    }

    // 2. If not a transfer code, it might be a bag Serial. Look it up.
    const { data: items } = await supplyApi.lookupSerials([code]);
    if (!items || items.length === 0) {
      ElMessage.error(`Mã ${code} không hợp lệ hoặc không tồn tại.`);
      return;
    }

    const item = items[0];
    if (!item.batchId) {
      ElMessage.warning(`Mã ${code} chưa được gán vào lô hàng nào.`);
      return;
    }

    // Find a pending transfer that contains this batch
    const transferByBatch = pendingTransfers.value.find(t => 
      t.items && t.items.some((i: any) => i.batchId === item.batchId)
    );

    if (transferByBatch) {
      loadTransferData(transferByBatch.id);
      ElMessage.success(`Đã tìm thấy phiếu chứa lô hàng này.`);
      
      // Auto switch to PARTIAL if they are scanning bags, maybe helpful
      if (importForm.value.import_mode !== 'PARTIAL') {
         ElMessage.info('Đã chuyển sang chế độ NHẬP MỘT PHẦN (vì bạn vừa quét mã bao).');
         importForm.value.import_mode = 'PARTIAL';
      }
      
      // Add this serial to scanText
      if (!scanText.value.includes(code)) {
         scanText.value = scanText.value ? `${scanText.value}\n${code}` : code;
      }
      
    } else {
      ElMessage.error(`Lô chứa bao này không nằm trong bất kỳ Phiếu đang chờ nhập nào.`);
    }

  } catch (e: any) {
    ElMessage.error('Lỗi truy xuất mã. Vui lòng thử lại.');
  } finally {
    scanning.value = false;
    scanInput.value = '';
    focusScan();
  }
};

const loadTransferData = (transferId: string) => {
  selectedTransferId.value = transferId;
  const t = transfers.value.find(x => x.id === transferId);
  if (t && t.items) {
    partialRows.value = t.items.map((i: any) => ({
      batch_id: i.batchId,
      expected_quantity: i.expectedQuantity,
      received_quantity: i.expectedQuantity,
      batchCode: i.batch?.batchCode,
      productName: i.batch?.product?.name
    }));
  }
};

const submitImport = async () => {
  // STRICT VALIDATIONS
  if (!selectedTransferId.value) {
    ElMessage.error('Lỗi: Chưa có phiếu nào được chọn.');
    return;
  }
  
  if (!importForm.value.target_warehouse_id) {
    ElMessage.error('Lỗi: Bạn bắt buộc phải chọn "Kho nhập về" trước khi xác nhận.');
    return;
  }

  const t = selectedTransfer.value;
  if (!t || (t.status !== 'EXPORTED' && t.status !== 'IMPORTING')) {
    ElMessage.error(`Lỗi: Phiếu này đang ở trạng thái ${t?.status || 'Unknown'}, không thể nhập kho.`);
    return;
  }

  // Check quantities if partial
  if (importForm.value.import_mode === 'PARTIAL') {
    const hasInvalidQty = partialRows.value.some(r => 
      r.received_quantity < 0 || r.received_quantity > r.expected_quantity
    );
    if (hasInvalidQty) {
      ElMessage.error('Lỗi: Khối lượng thực nhận không được nhỏ hơn 0 hoặc lớn hơn khối lượng xuất.');
      return;
    }
  }

  // Confirm dialog
  await ElMessageBox.confirm(
    `Bạn xác nhận sẽ nhập kho phiếu ${t.transferCode || ''} vào kho đã chọn chứ?`,
    'Xác nhận Nhập Kho',
    { confirmButtonText: 'Đồng ý Nhập', cancelButtonText: 'Quay lại', type: 'warning' }
  );

  const loading = ElLoading.service({ text: 'Đang xử lý nghiệp vụ nhập kho...' });
  try {
    importing.value = true;
    
    const scanned = scanText.value
      .split(/[\n,]/g)
      .map(s => s.trim())
      .filter(Boolean);

    await supplyApi.confirmTransferImport({
      transfer_id: selectedTransferId.value,
      import_mode: importForm.value.import_mode,
      target_warehouse_id: importForm.value.target_warehouse_id,
      scanned_serials: scanned,
      received_items: importForm.value.import_mode === 'PARTIAL' ? partialRows.value : undefined,
      device_id: importForm.value.device_id || undefined,
      location: importForm.value.location || undefined
    });
    
    ElMessage.success('Thành công: Lô hàng đã được nhập vào kho của bạn!');
    resetForm();
    await load();
  } catch (e: any) {
    ElMessage.error(`Nhập kho thất bại: ${e?.response?.data?.message || 'Lỗi hệ thống'}`);
  } finally {
    importing.value = false;
    loading.close();
  }
};

// Helpers
const getBatchInfo = (id: string) => {
  return batches.value.find(x => x.id === id);
};

const getBatchCode = (id: string) => {
  const b = getBatchInfo(id);
  return b ? b.batchCode : id;
};

const getTenantName = (id: string) => {
  const t = tenants.value.find(x => x.id === id);
  return t ? t.name : id;
};

const formatDate = (date: any) => {
  if (!date) return '-';
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

onMounted(() => {
  load();
  focusScan();
});
</script>

<style scoped>
.scan-input-large :deep(.el-input__wrapper) {
  padding: 8px 16px;
  font-size: 16px;
}
.label-bold :deep(.el-form-item__label) {
  font-weight: 700;
  color: #374151;
}
.modern-table :deep(.el-table__header-wrapper) th {
  background-color: #f9fafb;
  color: #374151;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
}
</style>
