<template>
  <div class="p-6 space-y-6 pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-3" style="color: #0F2B46;">
          <div class="p-2.5 rounded-xl" style="background: #0F2B46;">
            <el-icon class="text-white"><Download /></el-icon>
          </div>
          Tiếp nhận Bán thành phẩm
        </h1>
        <p class="text-gray-500 text-sm mt-1">Xác nhận nhập kho lô bán thành phẩm B2B từ đối tác</p>
      </div>
      <el-button @click="router.back()" plain>Quay lại</el-button>
    </div>

    <!-- KHỐI 1: TÌM KIẾM & NẠP PHIẾU -->
    <el-card shadow="never" class="!border-green-200 !rounded-xl !py-0" :class="{ '!bg-green-50/30': selectedTransfer }">
      <div class="flex items-center gap-3">
        <div class="text-sm font-bold flex items-center gap-2 whitespace-nowrap" style="color: #0F2B46;">
          <el-icon><Search /></el-icon> Quét mã nạp phiếu
        </div>
        <el-input 
          v-model="scanInput" 
          ref="scanInputRef" 
          placeholder="Quét Mã Phiếu (XK-...) hoặc Mã Serial trên bao hàng..." 
          @keyup.enter="handleScan" 
          class="flex-1"
          clearable
        >
          <template #prefix><el-icon><FullScreen /></el-icon></template>
        </el-input>
        <el-button type="success" @click="handleScan" :loading="scanning" class="!px-6" style="background: #00875A; border-color: #00875A;">Nạp Phiếu</el-button>
        <div class="border-l pl-3 flex items-center gap-2 text-xs text-gray-400 whitespace-nowrap">
          <span>Chọn tay:</span>
          <el-select 
            v-model="selectedTransferId" 
            filterable 
            size="small"
            class="!w-52" 
            placeholder="Phiếu đang chờ..."
            @change="handleManualSelect"
          >
            <el-option 
              v-for="t in pendingTransfers" 
              :key="t.id" 
              :label="`${t.transferCode || t.id.split('-')[0]} - ${getTenantName(t.fromTenantId)}`" 
              :value="t.id"
            />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- KHỐI 2: THÔNG TIN TIẾP NHẬN -->
    <el-card v-if="selectedTransfer" shadow="never" class="!border-gray-200 !rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
      <template #header>
        <div class="flex justify-between items-center h-4">
          <div class="flex items-center gap-2 font-bold" style="color: #0F2B46;">
            <el-icon><List /></el-icon> 2. Thông tin tiếp nhận
          </div>
          <el-tag effect="dark" :type="getTransferStatusType(selectedTransfer.status)" size="small">{{ getTransferStatusLabel(selectedTransfer.status) }}</el-tag>
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
          <div class="flex items-center gap-2 font-bold" style="color: #0F2B46;">
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
    <el-card v-if="!selectedTransfer" shadow="never" class="!border-[#0F2B46]/20 !rounded-xl mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 font-bold" style="color: #0F2B46;">
            <el-icon><List /></el-icon> Lịch sử Phiếu đã nhập
            <el-tag size="small" effect="plain" class="ml-2">{{ filteredImportedTransfers.length }}</el-tag>
          </div>
          <div class="flex items-center gap-3">
            <el-input 
              v-model="historySearch" 
              placeholder="Tìm mã phiếu..." 
              :prefix-icon="Search" 
              clearable 
              size="small" 
              class="!w-52"
            />
            <el-select v-model="historyStatusFilter" size="small" clearable placeholder="Trạng thái" class="!w-40">
              <el-option label="Hoàn thành" value="COMPLETED" />
              <el-option label="Hoàn thành một phần" value="PARTIAL_COMPLETED" />
            </el-select>
            <el-select v-model="historyTenantFilter" size="small" filterable clearable placeholder="Đơn vị xuất" class="!w-48">
              <el-option 
                v-for="tid in uniqueFromTenants" 
                :key="tid" 
                :label="getTenantName(tid)" 
                :value="tid" 
              />
            </el-select>
          </div>
        </div>
      </template>
      <el-table :data="paginatedImportedTransfers" border stripe class="modern-table" empty-text="Chưa có phiếu nào được nhập">
        <el-table-column label="STT" width="55" align="center">
          <template #default="{ $index }">
            {{ (historyPage - 1) * historyPageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column label="Mã Phiếu" width="180">
          <template #default="{ row }">
            <span class="font-mono font-bold cursor-pointer hover:underline" style="color: #0F2B46;" @click="viewDetail(row)">{{ row.transferCode }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Ngày Nhập" width="180">
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
            <el-tag size="small" :type="getTransferStatusType(row.status)">{{ getTransferStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Ghi chú" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ row.notes || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip content="Xem chi tiết" placement="top">
              <el-button type="primary" :icon="View" circle size="small" @click="viewDetail(row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="filteredImportedTransfers.length > historyPageSize" class="flex justify-end mt-4">
        <el-pagination 
          v-model:current-page="historyPage" 
          :page-size="historyPageSize" 
          :total="filteredImportedTransfers.length" 
          layout="total, prev, pager, next" 
          small 
        />
      </div>
    </el-card>

    <!-- Dialog xem chi tiết phiếu đã nhập -->
    <el-dialog v-model="detailVisible" width="900px" append-to-body destroy-on-close :show-close="false" class="branded-import-detail-dialog">
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="color: #fff; font-size: 16px; font-weight: 600;">Chi tiết Phiếu Nhập</span>
            <span v-if="detailRow" class="px-2 py-0.5 text-xs font-mono font-bold text-blue-200 bg-white/10 border border-white/20 rounded">
              {{ detailRow.transferCode }}
            </span>
            <el-tag v-if="detailRow" :type="getTransferStatusType(detailRow.status)" effect="dark" size="small">
              {{ getTransferStatusLabel(detailRow.status) }}
            </el-tag>
          </div>
          <el-button type="info" link :icon="Close" @click="detailVisible = false" style="color: rgba(255,255,255,0.8); font-size: 20px;" />
        </div>
      </template>

      <div v-if="detailRow" style="padding: 24px;" class="space-y-5">
        <!-- Thông tin tổng quan -->
        <el-descriptions border :column="3" class="detail-descriptions">
          <el-descriptions-item label="Mã Phiếu">
            <span class="font-mono font-bold" style="color: #0F2B46;">{{ detailRow.transferCode }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="Ngày Nhập">
            {{ formatDate(detailRow.importedAt || detailRow.updatedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="Trạng thái">
            <el-tag size="small" :type="getTransferStatusType(detailRow.status)">{{ getTransferStatusLabel(detailRow.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Đơn vị xuất">
            <span class="font-bold" style="color: #00875A;">{{ getTenantName(detailRow.fromTenantId) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="Tổng số lô">
            <span class="font-bold">{{ detailRow.items?.length || 0 }}</span> lô
          </el-descriptions-item>
          <el-descriptions-item label="Tổng khối lượng">
            <span class="text-lg font-bold" style="color: #0F2B46;">{{ detailRow.items?.reduce((s: number, i: any) => s + (Number(i.receivedQuantity || i.expectedQuantity) || 0), 0).toLocaleString() }}</span>
            <span class="text-gray-400 ml-1">kg</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- Ghi chú -->
        <div v-if="detailRow.notes" class="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div class="text-xs text-gray-400 uppercase font-bold mb-1">Ghi chú</div>
          <div class="text-sm text-gray-700">{{ detailRow.notes }}</div>
        </div>

        <!-- Danh sách hàng hóa -->
        <div>
          <div class="flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wide" style="color: #0F2B46;">
            <div class="w-1 h-5 bg-blue-500 rounded-full"></div>
            <el-icon><Box /></el-icon> Danh sách hàng hóa thực nhập
          </div>
          <el-table :data="detailRow.items" border size="small" stripe>
            <el-table-column label="STT" type="index" width="50" align="center" />
            <el-table-column label="Mã lô" min-width="160">
              <template #default="{ row }">
                <span class="font-mono font-bold" style="color: #0F2B46;">{{ row.batch?.batchCode || row.batchId }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Sản phẩm" min-width="180">
              <template #default="{ row }">
                <span class="text-sm font-medium text-gray-700">{{ row.batch?.product?.name || '---' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Khối lượng (KG)" width="130" align="right">
              <template #default="{ row }">
                <span class="font-bold" style="color: #00875A;">{{ (Number(row.receivedQuantity || row.expectedQuantity) || 0).toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Số bao" width="90" align="center">
              <template #default="{ row }">
                <span class="font-bold text-gray-700">{{ row.batch?.packCount || '---' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Mã" width="80" align="center">
              <template #default="{ row }">
                <el-tooltip content="Xem danh sách mã" placement="top">
                  <el-button type="primary" size="small" link @click="loadBatchCodes(row.batch?.id || row.batchId)" :loading="loadingCodesForBatch === (row.batch?.id || row.batchId)">
                    <el-icon><List /></el-icon>
                  </el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- Danh sách mã (hiện khi bấm "Xem mã") -->
        <div v-if="batchCodesVisible && batchCodesList.length > 0" class="border border-blue-200 rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5" style="background: #0F2B46;">
            <div class="text-white text-xs font-bold flex items-center gap-2">
              <el-icon><List /></el-icon>
              Danh sách mã — {{ batchCodesLabel }}
              <el-tag effect="dark" size="small" type="info" class="ml-1">{{ batchCodesList.length }} mã</el-tag>
            </div>
            <el-button size="small" link style="color: rgba(255,255,255,0.8);" @click="batchCodesVisible = false">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <div class="max-h-60 overflow-y-auto">
            <el-table :data="batchCodesList" size="small" stripe>
              <el-table-column label="STT" type="index" width="50" align="center" />
              <el-table-column label="Serial" min-width="150">
                <template #default="{ row }">
                  <span class="font-mono text-xs font-bold" style="color: #0F2B46;">{{ row.serialNumber }}</span>
                </template>
              </el-table-column>
              <el-table-column label="QR Code" min-width="200">
                <template #default="{ row }">
                  <span class="font-mono text-xs text-gray-500">{{ row.fullQrCode || '---' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Trạng thái" width="100" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : row.status === 'SOLD' ? 'danger' : 'info'" effect="light">
                    {{ productItemStatusMap[row.status] || row.status }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; padding: 12px 24px; border-top: 1px solid #e5e7eb;">
          <el-button @click="detailVisible = false" style="border-radius: 8px; padding: 10px 24px;">Đóng</el-button>
        </div>
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
import { productItemStatusMap } from '@/common/utils/vi-labels';

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

// Batch codes viewer
const batchCodesVisible = ref(false);
const batchCodesList = ref<any[]>([]);
const batchCodesLabel = ref('');
const loadingCodesForBatch = ref('');

const loadBatchCodes = async (batchId: string) => {
  if (!batchId) return;
  loadingCodesForBatch.value = batchId;
  try {
    const { data } = await supplyApi.getBatchItems(batchId);
    batchCodesList.value = data || [];
    // Find batch code for label
    const item = detailRow.value?.items?.find((i: any) => (i.batch?.id || i.batchId) === batchId);
    batchCodesLabel.value = item?.batch?.batchCode || batchId;
    batchCodesVisible.value = true;
  } catch (e) {
    ElMessage.error('Không thể tải danh sách mã.');
  } finally {
    loadingCodesForBatch.value = '';
  }
};
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

// History filters & pagination
const historySearch = ref('');
const historyStatusFilter = ref('');
const historyTenantFilter = ref('');
const historyPage = ref(1);
const historyPageSize = 10;

const uniqueFromTenants = computed(() => {
  const ids = new Set(importedTransfers.value.map((t: any) => t.fromTenantId));
  return Array.from(ids);
});

const filteredImportedTransfers = computed(() => {
  let list = importedTransfers.value;
  if (historySearch.value) {
    const q = historySearch.value.toLowerCase();
    list = list.filter((t: any) => t.transferCode?.toLowerCase().includes(q));
  }
  if (historyStatusFilter.value) {
    list = list.filter((t: any) => t.status === historyStatusFilter.value);
  }
  if (historyTenantFilter.value) {
    list = list.filter((t: any) => t.fromTenantId === historyTenantFilter.value);
  }
  return list;
});

const paginatedImportedTransfers = computed(() => {
  const start = (historyPage.value - 1) * historyPageSize;
  return filteredImportedTransfers.value.slice(start, start + historyPageSize);
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

const getTransferStatusLabel = (s: string) => {
  const map: Record<string, string> = {
    DRAFT: 'Nháp',
    PENDING: 'Chờ xử lý',
    EXPORTED: 'Đã xuất',
    IMPORTING: 'Đang nhập',
    COMPLETED: 'Hoàn thành',
    PARTIAL_COMPLETED: 'Hoàn thành một phần',
    CANCELLED: 'Đã hủy'
  };
  return map[s] || s;
};

const getTransferStatusType = (s: string) => {
  const map: Record<string, string> = {
    DRAFT: 'info',
    PENDING: 'warning',
    EXPORTED: '',
    IMPORTING: 'warning',
    COMPLETED: 'success',
    PARTIAL_COMPLETED: 'success',
    CANCELLED: 'danger'
  };
  return map[s] || 'info';
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
  background-color: #0F2B46;
  color: #fff;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
}
</style>

<style>
.branded-import-detail-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-import-detail-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-import-detail-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-import-detail-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
