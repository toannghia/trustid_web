<template>
  <div class="p-6 space-y-6 w-full mx-auto pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <div class="p-2 bg-orange-100 rounded-lg text-orange-600">
            <el-icon><Upload /></el-icon>
          </div>
          Xuất kho bán thành phẩm B2B
        </h1>
        <p class="text-gray-500 text-sm mt-1">Chuyển giao lô bán thành phẩm cho đối tác/doanh nghiệp khác</p>
      </div>
      <el-button @click="router.back()" plain>Quay lại</el-button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Left Column -->
      <div class="lg:col-span-3 space-y-5">

        <!-- Phiếu Header Card -->
        <el-card shadow="never" class="!border-orange-200 !bg-orange-50/40 !rounded-xl header-card">
          <div class="flex flex-col md:flex-row justify-between gap-4">
            <div class="flex-1 min-w-0 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div class="flex items-center gap-1 min-w-0">
                   <span class="text-gray-500 whitespace-nowrap">Số phiếu:</span> 
                   <span class="font-bold text-orange-700 truncate">{{ transferCode || '---' }}</span>
                </div>
                <div class="flex items-center gap-1">
                   <span class="text-gray-500 whitespace-nowrap">Ngày lập:</span> 
                   <span class="font-medium truncate">{{ currentDate }}</span>
                </div>
                <div class="flex items-center gap-1">
                   <span class="text-gray-500 whitespace-nowrap">Người lập:</span> 
                   <span class="font-medium truncate">{{ currentUser }}</span>
                </div>
                <div class="flex items-center gap-1">
                   <span class="text-gray-500 whitespace-nowrap">Kho xuất:</span>
                   <el-select v-model="warehouseId" filterable size="small" class="!w-40" placeholder="Chọn kho">
                     <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
                   </el-select>
                </div>
              </div>

              <!-- Tenant Lookup -->
              <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-orange-200">
                <span class="text-sm text-gray-500 whitespace-nowrap">Đối tác nhận:</span>
                <el-input v-model="tenantCodeInput" size="small" placeholder="Mã số thuế..." class="!w-32" @keyup.enter="lookupTenant" clearable />
                <el-button size="small" type="warning" @click="lookupTenant" :loading="lookingUp">Tra cứu</el-button>
                
                <div v-if="resolvedTenant" class="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">
                  <el-icon class="text-green-600"><CircleCheckFilled /></el-icon>
                  <span class="font-bold text-green-700 text-xs truncate max-w-[200px]">{{ resolvedTenant.name }}</span>
                </div>
                <el-tag v-else-if="tenantCodeInput" size="small" type="info" effect="plain" class="!text-[10px]">Chưa xác thực</el-tag>
              </div>
            </div>

            <!-- QR Section -->
            <div v-if="transferCode" class="flex flex-col items-center justify-center md:border-l md:border-orange-200 md:pl-6 pt-2 md:pt-0">
              <div class="text-[9px] text-gray-400 mb-1 font-bold uppercase tracking-wider">QR Phiếu</div>
              <div class="qr-box p-1 bg-white rounded-lg border border-orange-100 shadow-sm">
                <canvas ref="qrCanvas" class="w-16 h-16"></canvas>
              </div>
            </div>
          </div>
        </el-card>

        <!-- Scan Section -->
        <el-card shadow="never" class="!border-orange-200 !rounded-xl">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-bold text-orange-800 flex items-center gap-2">
              <el-icon><View /></el-icon> Quét mã QR xuất kho
            </div>
            <div class="scan-mode-toggle">
              <div 
                class="mode-item" 
                :class="{ active: scanMode === 'BATCH' }"
                @click="scanMode = 'BATCH'"
              >
                <el-icon class="mr-1"><Memo /></el-icon>
                Nguyên lô
              </div>
              <div 
                class="mode-item" 
                :class="{ active: scanMode === 'ITEM' }"
                @click="scanMode = 'ITEM'"
              >
                <el-icon class="mr-1"><Tickets /></el-icon>
                Từng bao
              </div>
              <div 
                class="mode-item" 
                :class="{ active: scanMode === 'PALLET' }"
                @click="scanMode = 'PALLET'"
              >
                📦 Pallet BTP
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <el-input v-model="scanInput" ref="scanInputRef" :placeholder="scanMode === 'PALLET' ? 'Quét mã pallet BTP...' : 'Quét mã QR sản phẩm...'" @keyup.enter="handleScan" class="flex-1">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button type="warning" @click="handleScan">Xác nhận mã</el-button>
          </div>
          <div class="text-[10px] text-orange-600 mt-2 italic">
            * <b>Nguyên lô</b>: Quét 1 tem → thêm toàn bộ lô. * <b>Từng bao</b>: Quét bao nào xuất bao đó. * <b>Pallet BTP</b>: Quét pallet → xuất toàn bộ SP trong pallet.
          </div>
        </el-card>

        <!-- Add Batch Manual (Collapsed) -->
        <el-collapse class="!border-gray-200 !rounded-xl overflow-hidden">
          <el-collapse-item title="＋ Thêm lô thủ công" name="manual">
            <div class="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end p-2">
            <el-form-item label="Chọn lô bán thành phẩm" class="mb-0">
                <el-select v-model="newBatchId" filterable class="w-full" placeholder="Chỉ hiển thị lô còn tồn kho" @change="onBatchSelect">
                  <el-option v-for="b in completedSemiBatches" :key="b.id" :label="b.batchCode" :value="b.id">
                    <div class="flex justify-between items-center w-full gap-4">
                      <span class="font-bold">{{ b.batchCode }}</span>
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] text-gray-400">Tồn:</span>
                        <el-tag size="small" :type="b.availableQuantity > 0 ? 'success' : 'danger'">{{ b.availableQuantity }}kg</el-tag>
                      </div>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="Khối lượng (kg)" class="mb-0">
                <el-input-number v-model="newExpectedQty" :min="0" :max="maxAvailable" :step="0.1" class="!w-full" disabled />
              </el-form-item>
              <el-button type="primary" @click="addItem" :disabled="!newBatchId || newExpectedQty <= 0">Thêm</el-button>
            </div>
          </el-collapse-item>
        </el-collapse>

        <!-- Items Table -->
        <el-card v-if="form.items.length > 0" shadow="never" class="!border-gray-200 !rounded-xl">
          <div class="text-sm font-bold text-gray-700 mb-3">📦 Danh sách lô xuất ({{ form.items.length }} lô)</div>
          <el-table :data="form.items" border size="small" class="modern-table !rounded-lg overflow-hidden" show-summary :summary-method="getSummary">
            <el-table-column label="STT" type="index" width="45" align="center" />
            <el-table-column label="Mã lô" min-width="120">
              <template #default="{ row }">
                <div class="flex flex-col">
                  <span class="font-mono font-bold text-blue-600 text-xs">{{ getBatchCode(row.batch_id) }}</span>
                  <span v-if="row.serials?.length" class="text-[9px] text-green-600 font-bold">Đã quét {{ row.serials.length }} bao</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Sản phẩm" min-width="140">
              <template #default="{ row }">
                <div class="flex flex-col leading-tight">
                  <span class="font-medium text-xs">{{ getBatchInfo(row.batch_id)?.product?.name || '---' }}</span>
                  <span class="text-[9px] text-gray-400">{{ getBatchInfo(row.batch_id)?.productGtin }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Ngày ĐG" width="100" align="center">
              <template #default="{ row }">
                <span class="text-[11px]">{{ formatDateSimple(getBatchInfo(row.batch_id)?.sourceInfo?.packaging_date) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Số bao" width="80" align="center">
              <template #default="{ row }">
                <span class="font-bold text-orange-600">{{ row.serials?.length || getBatchPackCount(row.batch_id) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="expected_quantity" label="K.Lượng (kg)" width="110" align="right">
              <template #default="{ row }">
                <span class="font-bold">{{ row.expected_quantity }} kg</span>
              </template>
            </el-table-column>
            <el-table-column label="" width="40" align="center">
              <template #default="{ $index }">
                <el-button type="danger" :icon="Delete" link size="small" @click="form.items.splice($index, 1)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- Notes + Submit -->
        <el-card shadow="never" class="!border-gray-200 !rounded-xl">
          <el-form-item label="Ghi chú chuyển giao" class="!mb-4">
            <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="Nhập ghi chú cho bên nhận (nếu có)..." />
          </el-form-item>
          <div class="flex justify-end gap-3">
            <el-button v-if="!editingId || (editingId && currentStatus === 'DRAFT')" type="info" plain size="large" :loading="creating" :disabled="form.items.length === 0 || !resolvedTenant" @click="saveDraft">
              💾 Lưu tạm
            </el-button>
            <el-button type="primary" size="large" class="!px-8" :loading="creating" :disabled="form.items.length === 0 || !resolvedTenant" @click="createAndExport">
              🚀 Xác nhận xuất kho
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- Right Column: History + Guide -->
      <div class="space-y-6">
        <el-card shadow="never" class="!border-gray-200 !rounded-xl">
          <template #header>
            <div class="flex items-center gap-2 font-bold text-gray-700">
              <el-icon><Clock /></el-icon> Phiếu chuyển gần đây
            </div>
          </template>
          <div v-if="transfers.length === 0" class="py-8 text-center text-gray-400">
            <el-icon size="40" class="mb-2 opacity-20"><Files /></el-icon>
            <p>Chưa có phiếu chuyển nào</p>
          </div>
          <div v-else class="space-y-3">
            <div v-for="t in sortedTransfers" :key="t.id" 
              class="p-3 border rounded-lg hover:border-orange-300 transition-colors cursor-pointer group" 
              :class="{ 'border-orange-400 bg-orange-50': editingId === t.id }"
              @click="loadTransferToForm(t)"
            >
              <div class="flex justify-between items-start mb-1">
                <span class="text-xs font-mono font-bold" :class="editingId === t.id ? 'text-orange-700' : 'text-orange-600'">{{ t.transferCode || '#' + t.id.split('-')[0] }}</span>
                <el-tag size="small" :type="getTransferStatusType(t.status)">{{ t.status }}</el-tag>
              </div>
              <div class="text-[11px] text-gray-500 flex items-center justify-between">
                <span class="flex items-center gap-1"><el-icon><Calendar /></el-icon> {{ formatDate(t.createdAt) }}</span>
                <div class="flex items-center gap-2">
                  <el-button v-if="t.status === 'DRAFT' || t.status === 'PENDING'" type="danger" link size="small" @click.stop="cancelTransfer(t.id)" class="!p-0 !h-auto">
                    Hủy
                  </el-button>
                  <span v-if="editingId === t.id" class="text-orange-600 font-bold text-[10px]">ĐANG MỞ</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="!border-blue-100 !bg-blue-50/30 !rounded-xl">
          <div class="flex items-center gap-3 text-blue-700 mb-2">
            <el-icon size="20"><InfoFilled /></el-icon>
            <span class="font-bold">Hướng dẫn</span>
          </div>
          <ul class="text-xs text-blue-600 space-y-2 list-disc pl-4">
            <li>Nhập <b>mã số thuế</b> đối tác rồi bấm <b>Tra cứu</b>.</li>
            <li>Quét QR hoặc thêm lô thủ công — khối lượng tự động.</li>
            <li>Sau khi xác nhận, phiếu QR sẽ được tạo để bên nhận quét.</li>
          </ul>
        </el-card>
      </div>
    </div>

    <!-- Detail Dialog -->
    <el-dialog v-model="detailVisible" title="Chi tiết phiếu chuyển giao" width="700px">
      <div v-if="selectedTransfer" class="space-y-4">
        <div class="flex justify-between items-center bg-gray-50 p-4 rounded-xl border">
          <div>
            <div class="text-xs text-gray-400 mb-1">SỐ PHIẾU</div>
            <div class="font-bold text-lg text-orange-600">{{ selectedTransfer.transferCode || '-' }}</div>
          </div>
          <el-tag :type="getTransferStatusType(selectedTransfer.status)" size="large" effect="dark">{{ selectedTransfer.status }}</el-tag>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Ngày tạo">{{ formatDate(selectedTransfer.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="Ghi chú">{{ selectedTransfer.notes || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="font-bold text-gray-700 mt-4 mb-2">Danh sách lô hàng:</div>
        <el-table :data="selectedTransfer.items" border size="small">
          <el-table-column label="Mã lô">
            <template #default="{ row }">
              <span class="font-mono font-bold">{{ row.batch?.batchCode || row.batchId }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="expectedQuantity" label="K.Lượng dự kiến (kg)" width="150" align="right" />
          <el-table-column prop="receivedQuantity" label="K.Lượng thực nhận (kg)" width="150" align="right">
            <template #default="{ row }">
              <span :class="row.receivedQuantity ? 'text-green-600 font-bold' : 'text-gray-400'">{{ row.receivedQuantity || '-' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- Success Dialog with QR -->
    <el-dialog v-model="successVisible" title="Xuất kho thành công" width="400px" center :close-on-click-modal="false">
      <div class="flex flex-col items-center text-center space-y-4">
        <el-result icon="success" title="Đã lập phiếu xuất" sub-title="Bên nhận có thể quét mã này để nhập kho nhanh" />
        <div class="p-4 bg-white border-2 border-orange-200 rounded-2xl shadow-sm">
          <canvas ref="qrCanvasSuccess"></canvas>
          <div class="mt-2 font-mono font-bold text-orange-700 text-lg">{{ lastCreatedTransfer?.transferCode }}</div>
        </div>
        <div class="text-sm text-gray-500">
          Chụp ảnh hoặc in mã này gửi cho đối tác
        </div>
        <el-button type="primary" class="w-full" @click="successVisible = false">Hoàn tất</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/modules/core/store/auth';
import { supplyApi } from '../api/supplyApi';
import { tenantApi } from '@/modules/core/api/tenant';
import { transportApi } from '../api/transportApi';
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus';
import { Upload, DocumentAdd, Plus, Clock, Files, Calendar, InfoFilled, Delete, Search, View, Memo, Tickets } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// State
const warehouses = ref<any[]>([]);
const batches = ref<any[]>([]);
const transfers = ref<any[]>([]);
const creating = ref(false);
const warehouseId = ref('');
const newBatchId = ref('');
const newExpectedQty = ref(0);
const maxAvailable = ref(0);
const scanInput = ref('');
const scanMode = ref<'BATCH' | 'ITEM' | 'PALLET'>('BATCH');
const scanInputRef = ref<any>(null);
const detailVisible = ref(false);
const selectedTransfer = ref<any>(null);
const editingId = ref<string | null>(null);
const currentStatus = ref<string>('');

// Tenant lookup
const tenantCodeInput = ref('');
const resolvedTenant = ref<any>(null);
const lookingUp = ref(false);

// Caching keys
const CACHE_KEY_WH = 'vrt_export_warehouse_id';
const CACHE_KEY_TENANT = 'vrt_export_tenant_code';

// Watchers for caching
watch(warehouseId, (val) => {
  if (val) localStorage.setItem(CACHE_KEY_WH, val);
});

// Transfer header
const transferCode = ref('');
const currentDate = dayjs().format('DD/MM/YYYY HH:mm');
const currentUser = computed(() => authStore.user?.full_name || authStore.user?.username || 'N/A');

const form = ref({
  to_tenant_id: '',
  notes: '',
  items: [] as Array<{ batch_id: string; expected_quantity: number; serials?: string[] }>
});

const completedSemiBatches = computed(() => 
  batches.value.filter(b => 
    b.status === 'COMPLETED' && 
    b.batchType === 'SEMI_FINISHED' && 
    (Number(b.availableQuantity) > 0.001)
  )
);
const sortedTransfers = computed(() => [...transfers.value].sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt))));

import QRCode from 'qrcode';

const qrCanvas = ref<HTMLCanvasElement | null>(null);
const qrCanvasSuccess = ref<HTMLCanvasElement | null>(null);
const successVisible = ref(false);
const lastCreatedTransfer = ref<any>(null);

// Focus logic
const focusScan = () => {
  nextTick(() => {
    scanInputRef.value?.focus();
  });
};

const handleGlobalKeyDown = (e: KeyboardEvent) => {
  // Nếu nhấn Enter và không phải đang ở trong một input/textarea khác cần Enter
  const target = e.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  
  if (e.key === 'Enter') {
    // 1. Nếu đang ở Textarea (Ghi chú) -> Để người dùng xuống dòng bình thường
    if (target.tagName === 'TEXTAREA') return;

    // 2. Nếu đang ở ô input khác (như Tra cứu mã DN) -> Để ô đó xử lý Enter của nó (lookupTenant)
    // Sau đó ta đã gọi focusScan() trong lookupTenant rồi nên không cần hijack ở đây.
    if (isInput && target !== scanInputRef.value?.$el.querySelector('input')) return;

    // 3. Nếu Enter ở bất kỳ đâu không phải ô quét mã (và không phải input/textarea), nhảy về ô quét mã
    if (target !== scanInputRef.value?.$el.querySelector('input')) {
      focusScan();
    }
  }
};

onMounted(() => {
  load();
  focusScan();
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
});

const generateQR = async (text: string) => {
  if (!text) return;
  await nextTick();
  const options = {
    width: 120,
    margin: 2,
    color: {
      dark: '#c2410c', // orange-700
      light: '#ffffff'
    }
  };
  
  try {
    // Generate for header if exists
    if (qrCanvas.value) {
      await QRCode.toCanvas(qrCanvas.value, text, options);
    }
    // Generate for success dialog if exists
    if (qrCanvasSuccess.value) {
      await QRCode.toCanvas(qrCanvasSuccess.value, text, { ...options, width: 200 });
    }
  } catch (err) {
    console.error('QR generation failed', err);
  }
};

const lookupTenant = async (codeOrEvent?: string | any) => {
  let targetCode = typeof codeOrEvent === 'string' ? codeOrEvent : tenantCodeInput.value;
  targetCode = (targetCode || '').trim();

  if (!targetCode || targetCode.includes('[object')) return;

  // Đã tra cứu thành công mã này rồi thì không làm gì cả
  if (resolvedTenant.value && (resolvedTenant.value.taxCode === targetCode || resolvedTenant.value.id === targetCode)) return;

  lookingUp.value = true;
  try {
    const { data } = await tenantApi.lookupByCode(targetCode);
    resolvedTenant.value = data;
    form.value.to_tenant_id = data.id;
    // Lưu lại mã thành công gần nhất
    localStorage.setItem(CACHE_KEY_TENANT, targetCode);
    focusScan();
  } catch (e: any) {
    resolvedTenant.value = null;
    ElMessage.error(e?.response?.data?.message || 'Không tìm thấy doanh nghiệp');
  } finally {
    lookingUp.value = false;
  }
};

const load = async () => {
  try {
    const [wRes, bRes, trRes] = await Promise.all([
      transportApi.getWarehouses(),
      supplyApi.getBatches(),
      supplyApi.listTransfers()
    ]);
    warehouses.value = wRes.data || [];
    batches.value = bRes.data || [];
    transfers.value = trRes.data || [];

    // Restore Cache
    const cachedWh = localStorage.getItem(CACHE_KEY_WH);
    if (cachedWh && warehouses.value.some(w => w.id === cachedWh)) {
      warehouseId.value = cachedWh;
    }
    
    const cachedTenant = localStorage.getItem(CACHE_KEY_TENANT);
    if (cachedTenant && !tenantCodeInput.value) {
      tenantCodeInput.value = cachedTenant;
      lookupTenant(); // Auto lookup if cached
    }

    // Pre-load batches from URL query
    const batchIds = route.query.batchIds as string;
    if (batchIds) {
      for (const id of batchIds.split(',')) {
        const b = batches.value.find(x => x.id === id);
        if (b && b.status === 'COMPLETED' && b.availableQuantity > 0 && !form.value.items.some(i => i.batch_id === b.id)) {
          form.value.items.push({ batch_id: b.id, expected_quantity: b.availableQuantity || 0 });
        }
      }
    }
  } catch (e) {}
};

const onBatchSelect = (batchId: string) => {
  const batch = batches.value.find(b => b.id === batchId);
  if (batch) {
    newExpectedQty.value = batch.availableQuantity || 0;
    maxAvailable.value = batch.availableQuantity || 0;
  }
  focusScan();
};

const handleScan = async () => {
  const code = scanInput.value.trim();
  if (!code) return;

  // ── PALLET MODE: lookup pallet by code ──
  if (scanMode.value === 'PALLET') {
    try {
      const { data: result } = await supplyApi.listSFPallets({ search: code, limit: 1 });
      const pallets = result?.items || [];
      const pallet = pallets.find((p: any) => p.palletCode === code.toUpperCase());
      if (!pallet) { ElMessage.error(`Không tìm thấy pallet BTP "${code}"`); return; }

      const { data: detail } = await supplyApi.getSFPalletDetail(pallet.id);
      if (!detail.items || detail.items.length === 0) { ElMessage.warning('Pallet này đang trống'); return; }

      let addedCount = 0;
      for (const palletItem of detail.items) {
        if (!palletItem.batchId) continue;
        const batch = batches.value.find(b => b.id === palletItem.batchId);
        if (!batch || batch.status !== 'COMPLETED' || batch.availableQuantity <= 0) continue;

        const existing = form.value.items.find(i => i.batch_id === batch.id);
        const unitWeight = palletItem.weight || Number((batch.outputWeight / (batch.packCount || 1)).toFixed(3));

        if (existing) {
          if (existing.serials?.includes(palletItem.itemSerial)) continue;
          existing.serials = [...(existing.serials || []), palletItem.itemSerial];
          existing.expected_quantity = Number((existing.expected_quantity + unitWeight).toFixed(3));
        } else {
          form.value.items.push({ batch_id: batch.id, expected_quantity: unitWeight, serials: [palletItem.itemSerial] });
        }
        addedCount++;
      }

      if (addedCount > 0) ElMessage.success(`Đã thêm ${addedCount} SP từ pallet ${pallet.palletCode}`);
      else ElMessage.warning('Không có SP hợp lệ trong pallet (hết tồn hoặc lô chưa complete)');
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || 'Lỗi tra cứu pallet');
    } finally {
      scanInput.value = '';
      focusScan();
    }
    return;
  }

  // ── BATCH / ITEM MODE ──
  try {
    const { data: items } = await supplyApi.lookupSerials([code]);
    if (!items || items.length === 0) { ElMessage.error('Không tìm thấy sản phẩm từ mã QR này'); return; }
    const item = items[0];
    if (!item.batchId) { ElMessage.error('Sản phẩm này chưa gán vào lô hàng nào'); return; }
    const batch = batches.value.find(b => b.id === item.batchId);
    if (!batch) { ElMessage.error('Không tìm thấy lô hàng'); return; }
    if (batch.status !== 'COMPLETED') { ElMessage.warning(`Lô ${batch.batchCode} chưa COMPLETED`); return; }
    if (batch.availableQuantity <= 0) { ElMessage.error(`Lô ${batch.batchCode} đã hết hàng (Tồn: 0kg)`); return; }

    if (scanMode.value === 'BATCH') {
      if (form.value.items.some(i => i.batch_id === batch.id && !i.serials)) { ElMessage.warning('Lô đã có trong danh sách'); }
      else {
        form.value.items = form.value.items.filter(i => i.batch_id !== batch.id);
        form.value.items.push({ batch_id: batch.id, expected_quantity: batch.availableQuantity || 0 });
        ElMessage.success(`Đã thêm toàn bộ lượng còn lại của lô ${batch.batchCode} (${batch.availableQuantity}kg)`);
      }
    } else {
      let existing = form.value.items.find(i => i.batch_id === batch.id);
      if (existing && !existing.serials) { ElMessage.warning('Lô đang xuất nguyên lô'); return; }
      const unitWeight = Number((batch.outputWeight / (batch.packCount || 1)).toFixed(3));
      
      if (existing) {
        if (existing.serials?.includes(item.serialNumber)) { ElMessage.warning('Bao đã có'); return; }
        if (existing.expected_quantity + unitWeight > batch.availableQuantity) {
          ElMessage.error('Vượt quá tồn kho khả dụng của lô');
          return;
        }
        existing.serials = [...(existing.serials || []), item.serialNumber];
        existing.expected_quantity = Number((existing.expected_quantity + unitWeight).toFixed(3));
        ElMessage.success(`Đã thêm bao ${item.serialNumber}`);
      } else {
        form.value.items.push({ batch_id: batch.id, expected_quantity: unitWeight, serials: [item.serialNumber] });
        ElMessage.success(`Đã thêm bao đầu tiên của lô ${batch.batchCode}`);
      }
    }
  } catch { ElMessage.error('Lỗi khi truy xuất mã QR'); }
  finally { scanInput.value = ''; focusScan(); }
};

const addItem = () => {
  if (!newBatchId.value || newExpectedQty.value <= 0) return;
  if (form.value.items.some(i => i.batch_id === newBatchId.value)) { ElMessage.warning('Lô đã có'); return; }
  form.value.items.push({ batch_id: newBatchId.value, expected_quantity: newExpectedQty.value });
  newBatchId.value = '';
  newExpectedQty.value = 0;
  focusScan();
};

const saveDraft = async () => {
  if (!resolvedTenant.value) { ElMessage.warning('Vui lòng chọn đối tác'); return; }
  creating.value = true;
  try {
    const payload = {
      ...form.value,
      id: editingId.value || undefined,
      status: 'DRAFT'
    };
    const { data: transfer } = await supplyApi.createTransfer(payload);
    ElMessage.success(`Đã lưu tạm phiếu ${transfer.transferCode}`);
    await load();
    // Keep editing if just saved
    editingId.value = transfer.id;
    transferCode.value = transfer.transferCode;
    currentStatus.value = 'DRAFT';
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Lưu tạm thất bại');
  } finally {
    creating.value = false;
  }
};

const createAndExport = async () => {
  if (!warehouseId.value) { ElMessage.warning('Vui lòng chọn kho xuất'); return; }
  if (!resolvedTenant.value) { ElMessage.warning('Vui lòng tra cứu đối tác nhận'); return; }
  const loading = ElLoading.service({ text: 'Đang xử lý xuất kho B2B...' });
  try {
    creating.value = true;
    const payload = {
      ...form.value,
      id: editingId.value || undefined,
      status: 'PENDING'
    };

    // Step 1: Tạo/cập nhật phiếu
    let transfer: any;
    try {
      const res = await supplyApi.createTransfer(payload);
      transfer = res.data;
    } catch (e1: any) {
      const msg = e1?.response?.data?.message || e1?.message || 'Không rõ lỗi';
      ElMessage.error(`Lỗi tạo phiếu: ${msg}`);
      console.error('[B2B Export] createTransfer failed:', e1?.response?.data || e1);
      return;
    }

    // Step 2: Xác nhận xuất kho (reserve hàng)
    try {
      await supplyApi.confirmTransferExport(transfer.id, warehouseId.value);
    } catch (e2: any) {
      const msg = e2?.response?.data?.message || e2?.message || 'Không rõ lỗi';
      ElMessage.error(`Phiếu ${transfer.transferCode} đã tạo nhưng lỗi khi xuất kho: ${msg}`);
      console.error('[B2B Export] confirmExport failed:', e2?.response?.data || e2);
      // Reload để hiển thị phiếu PENDING ở sidebar
      await load();
      editingId.value = transfer.id;
      transferCode.value = transfer.transferCode || '';
      currentStatus.value = 'PENDING';
      return;
    }
    
    lastCreatedTransfer.value = transfer;
    transferCode.value = transfer.transferCode || '';
    
    // Show success dialog with QR
    successVisible.value = true;
    await generateQR(transfer.transferCode || transfer.id);
    
    ElMessage.success(`Phiếu ${transfer.transferCode} đã xuất thành công`);
    
    // Reset form
    resetForm();
    await load();
  } finally { creating.value = false; loading.close(); }
};

const resetForm = () => {
  form.value = { to_tenant_id: '', notes: '', items: [] };
  resolvedTenant.value = null;
  tenantCodeInput.value = '';
  transferCode.value = '';
  editingId.value = null;
  currentStatus.value = '';
};

const loadTransferToForm = async (t: any) => {
  if (editingId.value === t.id) {
    resetForm();
    return;
  }
  
  // If editing another and has items, warn? For now just load.
  editingId.value = t.id;
  currentStatus.value = t.status;
  transferCode.value = t.transferCode;
  form.value.notes = t.notes || '';
  
  // Load items
  form.value.items = (t.items || []).map((i: any) => ({
    batch_id: i.batchId,
    expected_quantity: i.expectedQuantity,
    serials: i.serials
  }));
  
  // Lookup tenant name
  if (t.toTenantId) {
    try {
      const { data } = await tenantApi.getById(t.toTenantId);
      resolvedTenant.value = data;
      tenantCodeInput.value = data.taxCode || '';
    } catch (e) {}
  }
  
  if (t.transferCode) {
    generateQR(t.transferCode);
  }
  
  ElMessage.info(`Đã tải phiếu ${t.transferCode}`);
  focusScan();
};

const viewTransfer = (t: any) => { 
  if (t.status === 'DRAFT' || t.status === 'PENDING') {
    loadTransferToForm(t);
  } else {
    selectedTransfer.value = t; 
    detailVisible.value = true;
  }
};

const cancelTransfer = (id: string) => {
  ElMessageBox.confirm('Bạn có chắc muốn hủy phiếu này? Nếu là phiếu PENDING, lượng hàng trong phiếu sẽ được giải phóng. Nếu là phiếu DRAFT, phiếu sẽ bị xóa.', 'Xác nhận hủy', {
    confirmButtonText: 'Hủy phiếu',
    cancelButtonText: 'Quay lại',
    type: 'warning',
  }).then(async () => {
    try {
      await supplyApi.cancelTransfer(id);
      if (editingId.value === id) {
        resetForm();
      }
      ElMessage.success('Đã hủy phiếu thành công');
      await load();
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || 'Không thể hủy phiếu');
    }
  });
};

const getBatchInfo = (id: string) => batches.value.find(x => x.id === id);
const getBatchCode = (id: string) => getBatchInfo(id)?.batchCode || id;
const getBatchPackCount = (id: string) => getBatchInfo(id)?.packCount || 0;
const formatDate = (d: any) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-';
const formatDateSimple = (d: any) => d ? dayjs(d).format('DD/MM/YYYY') : '-';
const getTransferStatusType = (s: string) => ({ DRAFT: 'info', PENDING: 'info', EXPORTED: 'warning', COMPLETED: 'success', CANCELLED: 'danger' }[s] || 'info');

const getSummary = ({ columns, data }: any) => {
  return columns.map((_: any, i: number) => {
    if (i === 3) return 'Tổng cộng';
    if (i === 4) return data.reduce((sum: number, row: any) => sum + (row.serials?.length || getBatchPackCount(row.batch_id)), 0);
    if (i === 5) return data.reduce((sum: number, row: any) => sum + (row.expected_quantity || 0), 0).toFixed(2) + ' kg';
    return '';
  });
};

onMounted(load);
</script>

<style scoped>
.modern-table :deep(.el-table__header-wrapper) th {
  background-color: #f9fafb;
  color: #374151;
  font-weight: 700;
}

.scan-mode-toggle {
  display: flex;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 12px;
  gap: 4px;
}

.mode-item {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
}

.mode-item:hover {
  background: #ffffff;
  color: #60a5fa;
}

.mode-item.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.mode-item.active i {
  color: #3b82f6;
}

.header-card :deep(.el-card__body) {
  padding: 12px 20px;
}

.qr-box {
  transition: all 0.3s ease;
}

.qr-box:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(194, 65, 12, 0.1);
}
</style>
