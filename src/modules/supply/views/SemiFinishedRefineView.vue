<template>
  <div class="w-full p-4 space-y-1 pb-20">
    <!-- Header with Stepper Progress -->
    <div class="flex items-center justify-between mb-2">
      <div class="text-xl font-bold text-gray-800 flex items-center gap-2">
        <el-icon class="text-blue-600"><Operation /></el-icon>
        Tinh chế bán thành phẩm
      </div>
      <div class="flex items-center gap-4 text-xs font-medium text-gray-400">
        <div class="flex items-center gap-1 text-green-600"><el-icon><CircleCheckFilled /></el-icon> Lô nguồn</div>
        <div class="w-8 h-[1px] bg-gray-200"></div>
        <div class="flex items-center gap-1 text-green-600"><el-icon><CircleCheckFilled /></el-icon> Định lượng</div>
        <div class="w-8 h-[1px] bg-gray-200"></div>
        <div class="flex items-center gap-1 text-green-600"><el-icon><CircleCheckFilled /></el-icon> Đóng gói</div>
        <div class="w-8 h-[1px] bg-gray-200"></div>
        <div class="flex items-center gap-1 text-blue-600 border border-blue-200 bg-blue-50 px-2 py-0.5 rounded">4 Serial</div>
      </div>
    </div>

    <el-alert
      v-if="draftBlocked"
      type="error"
      show-icon
      :closable="false"
      class="!mb-3"
      :title="draftBlocked"
    />

    <el-form label-position="top" class="space-y-1">
      <!-- SECTION 1: Thông tin lô nguồn -->
      <el-card shadow="never" class="!border-gray-200 !rounded-xl">
        <template #header>
          <div class="flex justify-between items-center h-4">
            <div class="flex items-center gap-2 font-bold text-gray-700">
              <el-icon><FolderOpened /></el-icon> Thông tin lô nguồn
            </div>
            <el-tag effect="light" type="info" class="font-mono">{{ customBatchCode || nextBatchCode }}</el-tag>
          </div>
        </template>
        
        <div class="grid grid-cols-1 md:grid-cols-[1.5fr_120px_2.5fr_1fr_1.2fr] gap-6">
          <el-form-item label="Lô nguồn">
            <el-select v-model="selectedSourceBatchId" filterable class="w-full" placeholder="Chọn lô nguồn">
              <el-option
                v-for="b in sourceBatches"
                :key="b.id"
                :label="b.batchCode"
                :value="b.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Tồn kho">
            <div class="h-8 flex items-center font-bold text-blue-700 bg-blue-50 px-3 rounded border border-blue-100">
              {{ selectedSourceStock.toLocaleString() }} kg
            </div>
          </el-form-item>
          <el-form-item label="Sản phẩm">
            <el-input :value="selectedProductName" readonly disabled class="!bg-gray-50" />
          </el-form-item>
          <el-form-item label="Tỉnh/Thành">
            <el-input :value="sourceProvinceName" readonly disabled class="!bg-gray-50" />
          </el-form-item>
          <el-form-item label="Mã lô nội bộ">
            <div class="flex gap-1">
              <el-input v-model="customBatchCode" placeholder="Nhập mã lô..." class="font-mono" clearable />
              <el-button @click="resetToAutoCode" title="Tạo tự động">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </el-form-item>
        </div>
      </el-card>

      <!-- SECTION 2: Định lượng trích xuất -->
      <el-card shadow="never" class="!border-gray-200 !rounded-xl">
        <template #header>
          <div class="flex items-center gap-2 font-bold text-gray-700 h-4">
            <el-icon><ScaleToOriginal /></el-icon> Định lượng trích xuất
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <el-form-item label="Khối lượng trích xuất">
            <div class="flex gap-0 w-full">
              <el-input-number v-model="displayInputWeight" :min="0" :step="0.1" controls-position="right" class="!flex-1 !w-auto custom-number-input" />
              <el-select v-model="inputWeightUnit" class="!w-24 custom-unit-select">
                <el-option v-for="u in weightUnits" :key="u.value" :label="u.label" :value="u.value" />
              </el-select>
            </div>
          </el-form-item>
          <el-form-item label="Quy cách (kg/bao)">
            <el-select v-model="packageWeightKg" class="w-full">
              <el-option v-for="w in packageWeightOptions" :key="w" :label="`${w} kg`" :value="w" />
            </el-select>
          </el-form-item>
          <el-form-item label="Số bao đóng">
            <el-input-number v-model="bagCount" :min="0" :step="1" class="w-full font-bold" />
          </el-form-item>
        </div>

        <!-- Quick Stats Row -->
        <div class="grid grid-cols-4 gap-4">
          <div class="stat-box">
            <div class="stat-label">Quy đổi</div>
            <div class="stat-value">{{ currentInputWeightKg.toLocaleString() }} kg</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Output</div>
            <div class="stat-value">{{ computedOutputWeight.toFixed(2) }} kg</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Hao hụt</div>
            <div class="stat-value text-orange-600">{{ computedLossPct.toFixed(2) }}%</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Tổng bao</div>
            <div class="stat-value">{{ bagCount }} bao</div>
          </div>
        </div>
      </el-card>

      <!-- SECTION 3: Thông tin đóng gói (Blue Highlight) -->
      <el-card shadow="never" class="!border-blue-400 !border-2 !rounded-xl packaging-info-card">
        <template #header>
          <div class="flex justify-between items-center h-4">
            <div class="flex items-center gap-2 font-bold text-blue-800">
              <el-icon><Box /></el-icon> Thông tin đóng gói
            </div>
            <el-tag size="small" type="primary" effect="plain" class="!text-[10px] uppercase">Bắt buộc</el-tag>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
          <el-form-item label="Ngày đóng gói" required>
            <el-date-picker v-model="packagingInfo.date" type="date" placeholder="Chọn ngày" format="DD/MM/YYYY" class="!w-full" />
          </el-form-item>
          <el-form-item label="Người đóng gói" required>
            <el-input v-model="packagingInfo.packer" placeholder="Người thực hiện" readonly class="!bg-gray-50">
              <template #prefix><el-icon><User /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item label="Địa điểm (Tỉnh)" required>
            <el-select v-model="packagingInfo.location" filterable class="w-full" placeholder="Chọn tỉnh/thành">
              <template #prefix><el-icon><Location /></el-icon></template>
              <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="Kho lưu trữ" required>
            <el-select v-model="packagingInfo.warehouse_id" filterable class="w-full" placeholder="Chọn kho lưu">
              <template #prefix><el-icon><House /></el-icon></template>
              <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
            </el-select>
          </el-form-item>
        </div>
      </el-card>

      <!-- SECTION 4: Kích hoạt Serial -->
      <el-card shadow="never" class="!border-gray-200 !rounded-xl">
        <template #header>
          <div class="flex justify-between items-center h-4">
            <div class="flex items-center gap-2 font-bold text-gray-700">
              <el-icon><CircleCheck /></el-icon> Kích hoạt serial thành phẩm
            </div>
            <div class="flex items-center gap-2">
               <el-tag size="small" type="info" effect="plain">{{ serialMode === 'RANGE' ? 'Theo dải' : 'Quét lẻ' }}</el-tag>
               <div class="text-xs font-bold text-green-600 ml-2">Tiến độ gán mã: {{ serialRows.length }} / {{ bagCount }} bao <el-icon><SuccessFilled /></el-icon></div>
            </div>
          </div>
        </template>

        <el-tabs v-model="serialMode" class="custom-tabs" @tab-change="handleTabChange">
          <el-tab-pane label="Gán mã theo dải (batch range)" name="RANGE">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_2.5fr_1fr] gap-4 mb-4 mt-2 items-start">
              <el-form-item label="Tiền tố dải mã">
                <el-select v-model="rangeConfig.prefix" filterable class="w-full" @change="handlePrefixChange">
                  <el-option v-for="p in availablePrefixes" :key="p" :label="p" :value="p" />
                </el-select>
              </el-form-item>
              <el-form-item label="Số thứ tự đầu">
                <el-input v-model="rangeConfig.startNumber" placeholder="00003" @input="debouncedGenerateRange" />
              </el-form-item>
              <el-form-item label="Số thứ tự cuối">
                <el-input :value="rangeConfig.endNumber" readonly class="!bg-gray-50 font-mono" />
              </el-form-item>

              <el-form-item>
                <template #label>
                   <div class="flex justify-between w-full">
                     <span class="text-red-600 font-bold">Mã bị hỏng / loại bỏ</span>
                     <span class="text-[10px] text-gray-400 font-normal">Đã loại: {{ voidSerials.length }} mã</span>
                   </div>
                </template>
                <div class="flex gap-1">
                  <el-input 
                    v-model="voidInput" 
                    placeholder="Quét hoặc nhập số serial/QR..." 
                    @keyup.enter="addVoidSerial"
                  />
                  <el-button type="danger" plain @click="addVoidSerial">Loại</el-button>
                </div>
              </el-form-item>

              <el-form-item label="Tổng hợp lệ">
                <div class="h-8 flex items-center justify-between px-2 bg-gray-50 border rounded font-bold text-gray-700 text-xs">
                  {{ serialRows.length }}/{{ bagCount }}
                  <el-icon class="text-green-500"><CircleCheckFilled /></el-icon>
                </div>
              </el-form-item>
            </div>
          </el-tab-pane>

          <el-tab-pane label="Quét mã QR đơn lẻ" name="SCAN">
             <div class="flex items-center gap-3 mb-4 mt-2">
              <el-input 
                v-model="serialInput" 
                placeholder="Quét mã QR bao/kiện... (Tự động Enter)" 
                class="!flex-1"
                @keyup.enter="addSerial" 
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <el-button type="primary" @click="addSerial">Thêm mã</el-button>
            </div>
          </el-tab-pane>
        </el-tabs>

        <div class="flex justify-between items-center mb-2 px-1">
          <div class="text-sm font-bold text-gray-700">Danh sách serial ({{ serialRows.length }} mã)</div>
          <el-input v-model="searchSerial" placeholder="Tìm serial..." size="small" class="!w-48">
             <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>

        <el-table :data="displaySerialRows" size="small" border stripe max-height="400" class="modern-table">
          <el-table-column type="index" label="#" width="50" align="center" />
          <el-table-column prop="serial" label="Serial number" width="160" class-name="font-mono font-bold" />
          <el-table-column prop="qrCode" label="Nội dung mã QR">
            <template #default="{ row }">
              <span class="text-gray-400 text-[11px] font-mono">{{ row.qrCode || '---' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="TT" width="80" align="center">
            <template #default="{ row }">
              <el-button 
                v-if="serialMode === 'RANGE'"
                type="danger" 
                link 
                :icon="Delete"
                @click="handleVoidInTable(row.serial)"
                title="Loại bỏ mã này"
              />
              <el-tag v-else size="small" type="success" effect="plain" class="!px-1 font-bold !text-[9px]">OK</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="serialMode === 'SCAN'" label="" width="50" align="center">
            <template #default="{ $index }">
              <el-button type="danger" link @click="removeSerial($index)"><el-icon><Delete /></el-icon></el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="flex justify-between items-center mt-3 px-1 text-[11px] text-gray-400">
           <div>Hiển thị {{ displaySerialRows.length }} / {{ serialRows.length }} mã</div>
        </div>

        <div class="mt-4 pt-4 border-t border-dashed">
           <div class="text-[11px] text-gray-400 italic">
              * Lưu ý: Mã bị hỏng sẽ được hệ thống loại bỏ khỏi dải số và tự động bù thêm mã mới để đảm bảo đủ số lượng bao.
           </div>
        </div>
      </el-card>

      <!-- Footer Actions -->
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center gap-4 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
         <el-button @click="goBack" size="large" class="!px-8 !rounded-lg"><el-icon class="mr-2"><Back /></el-icon> Hủy & Quay lại</el-button>
         <el-button type="primary" size="large" :disabled="!canSubmit" :loading="saving" @click="submit" class="!px-12 !rounded-lg !bg-blue-700 !border-blue-700">
            <el-icon class="mr-2"><CircleCheckFilled /></el-icon> Thực hiện đóng gói
         </el-button>
      </div>
    </el-form>
  </div>

</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Operation, FolderOpened, ScaleToOriginal, Box, CircleCheck, CircleCheckFilled, SuccessFilled, Search, Delete, Back, Bottom, Warning, Location, House, User, Refresh } from '@element-plus/icons-vue';
import { productApi } from '@/modules/core/api/product';
import { supplyApi } from '../api/supplyApi';
import type { SemiFinishedDraftPayload } from '../api/supplyApi';
import { transportApi } from '../api/transportApi';
import { useAuthStore } from '@/modules/core/store/auth';

const router = useRouter();
const authStore = useAuthStore();

const products = ref<any[]>([]);
const batches = ref<any[]>([]);
const externalBatches = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const saving = ref(false);
let previewTimer: any = null;
let rangeDebounceTimer: any = null;
let draftSaveTimer: any = null;
let draftHeartbeatTimer: any = null;
const draftLockToken = ref('');
const draftBlocked = ref('');
const applyingDraft = ref(false);

import { VIETNAM_PROVINCES } from '@/common/data/provinces';

const provinces = VIETNAM_PROVINCES;



const weightUnits = [
  { label: 'Tấn', value: 'ton', rate: 1000 },
  { label: 'Tạ', value: 'quintal', rate: 100 },
  { label: 'Yến', value: 'yen', rate: 10 },
  { label: 'Kg', value: 'kg', rate: 1 }
];
const inputWeightUnit = ref('ton');
const displayInputWeight = ref(0);

const goBack = async () => {
  await saveDraftNow();
  await releaseDraftLock();
  router.push('/supply/semi-finished');
};
const selectedSourceBatchId = ref('');
const packageWeightOptions = [5, 10, 25, 50];
const packageWeightKg = ref<number>(50);
const bagCount = ref<number>(0);
const serialInput = ref('');
const serialRows = ref<Array<{ serial: string; qrCode?: string; status?: string }>>([]);

const extractCodeFromQr = (raw: string): string => {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('Code') || url.searchParams.get('code');
    if (code?.trim()) return code.trim();
  } catch {
    // Not a URL; continue with generic fallback below.
  }
  const idx = trimmed.lastIndexOf('=');
  return idx >= 0 ? trimmed.substring(idx + 1).trim() : trimmed;
};

// --- RANGE MODE STATES ---
const serialMode = ref<'SCAN' | 'RANGE'>('RANGE');
const availablePrefixes = ref<string[]>([]);
const rangeConfig = ref({
  prefix: '',
  startNumber: '',
  endNumber: '',
  voidSerials: [] as string[]
});
const qrInputRef = ref<any>(null);
const createdBatchCode = ref('');
const nextBatchCode = ref('');
const customBatchCode = ref('');

const form = ref({
  source_batch_code: '',
  product_id: '',
  input_weight: 0,
  output_weight: 0,
  production_address: ''
});

const packagingInfo = ref({
  date: new Date(),
  packer: authStore.user?.fullName || authStore.user?.username || '',
  location: '',
  warehouse_id: ''
});

const voidInput = ref('');
const voidSerials = ref<string[]>([]);
const searchSerial = ref('');

const addVoidSerial = () => {
  if (!canEditDraft.value) {
    ElMessage.error(draftBlocked.value || 'Chưa khóa được phiếu lưu tạm.');
    return;
  }
  let val = voidInput.value.trim();
  if (!val) return;

  if (/^\d+$/.test(val) && rangeConfig.value.prefix) {
    const targetLength = rangeConfig.value.startNumber.length || 5;
    const padded = val.padStart(targetLength, '0');
    val = rangeConfig.value.prefix + padded;
  }

  if (!voidSerials.value.includes(val)) {
    voidSerials.value.push(val);
    generateRange();
    ElMessage.warning(`Đã loại bỏ mã ${val} khỏi dải số.`);
  }
  voidInput.value = '';
};

const handleVoidInTable = (serial: string) => {
  if (!canEditDraft.value) {
    ElMessage.error(draftBlocked.value || 'Chưa khóa được phiếu lưu tạm.');
    return;
  }
  if (!voidSerials.value.includes(serial)) {
    voidSerials.value.push(serial);
    generateRange();
    ElMessage.warning(`Đã loại bỏ mã ${serial} và bù mã mới.`);
  }
};

const displaySerialRows = computed(() => {
  if (!searchSerial.value) return serialRows.value;
  return serialRows.value.filter(r => r.serial.toLowerCase().includes(searchSerial.value.toLowerCase()));
});

const selectedProductName = computed(() => {
  const p = products.value.find(p => p.id === form.value.product_id);
  return p ? p.name : '---';
});

const sourceProvinceName = computed(() => {
  if (!form.value.production_address) return '---';
  // Tìm theo code hoặc name
  const p = provinces.find(p => p.code === form.value.production_address || p.name === form.value.production_address);
  return p ? p.name : form.value.production_address;
});

const selectedSourceStock = computed(() => {
  if (!selectedSourceBatch.value) return 0;
  return Number(selectedSourceBatch.value.availableQuantity ?? selectedSourceBatch.value.totalQuantity ?? 0);
});

const farmSourceBatches = computed(() =>
  batches.value.filter(
    b =>
      (b.batchType || '').toUpperCase() === 'FARM' &&
      Number(b.availableQuantity ?? b.totalQuantity ?? 0) > 0.001 &&
      !String(b.batchCode || '').toUpperCase().startsWith('PKG-')
  )
);
const sourceBatches = computed(() =>
  [...farmSourceBatches.value, ...externalBatches.value].filter(
    b =>
      ['FARM', 'EXTERNAL'].includes((b.batchType || '').toUpperCase()) &&
      Number(b.availableQuantity ?? b.totalQuantity ?? 0) > 0.001
  )
);

watch(selectedSourceBatchId, (newId) => {
  if (newId) {
    const batch = sourceBatches.value.find(b => b.id === newId);
    if (batch) {
      form.value.source_batch_code = batch.batchCode;
      if (batch.productId) {
        form.value.product_id = batch.productId;
      }
      if (batch.sourceInfo?.production_address) {
        form.value.production_address = batch.sourceInfo.production_address;
      }
      if (displayInputWeight.value === 0) {
        const qtyKg = Number(batch.totalQuantity || 0);
        if (qtyKg >= 1000) {
          inputWeightUnit.value = 'ton';
          displayInputWeight.value = qtyKg / 1000;
        } else {
          inputWeightUnit.value = 'kg';
          displayInputWeight.value = qtyKg;
        }
      }
    }
  } else {
    form.value.source_batch_code = '';
    form.value.product_id = '';
  }
});

const currentInputWeightKg = computed(() => {
  const unit = weightUnits.find(u => u.value === inputWeightUnit.value);
  return displayInputWeight.value * (unit?.rate || 1);
});

const selectedSourceBatch = computed(() => sourceBatches.value.find(b => b.id === selectedSourceBatchId.value));
const computedOutputWeight = computed(() => Number(packageWeightKg.value || 0) * Number(bagCount.value || 0));
const computedLossPct = computed(() => {
  const input = currentInputWeightKg.value;
  if (input <= 0) return 0;
  const loss = ((input - computedOutputWeight.value) / input) * 100;
  return Math.max(0, loss);
});
const validationMessage = computed(() => {
  if (!selectedSourceBatch.value) return 'Vui lòng chọn lô nguồn.';
  if (!form.value.product_id) return 'Vui lòng chọn sản phẩm bán thành phẩm.';
  if (currentInputWeightKg.value <= 0) return 'Khối lượng trích xuất phải lớn hơn 0.';
  if (currentInputWeightKg.value > Number(selectedSourceBatch.value.totalQuantity || 0)) return 'Khối lượng trích xuất vượt quá tồn lô nguồn.';
  if (computedOutputWeight.value <= 0) return 'Số bao đóng được phải lớn hơn 0.';
  if (computedOutputWeight.value > currentInputWeightKg.value) return 'Output vượt quá Input, vui lòng kiểm tra lại quy cách hoặc số bao.';
  return '';
});
const canEditDraft = computed(() => !!draftLockToken.value && !draftBlocked.value);
const canSubmit = computed(() => canEditDraft.value && validationMessage.value.length === 0);

const getDraftClientId = () => {
  const key = 'supply_semi_finished_draft_web_client_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
};

const buildDraftPayload = (): SemiFinishedDraftPayload => ({
  sourceBatchId: selectedSourceBatchId.value,
  sourceBatchCode: selectedSourceBatch.value?.batchCode || form.value.source_batch_code,
  productId: form.value.product_id,
  inputWeightKg: currentInputWeightKg.value,
  packageWeightKg: packageWeightKg.value,
  bagCount: bagCount.value,
  warehouseId: packagingInfo.value.warehouse_id,
  nextCode: nextBatchCode.value,
  customBatchCode: customBatchCode.value,
  packagingDate: packagingInfo.value.date?.toISOString?.() || new Date().toISOString(),
  packer: packagingInfo.value.packer,
  productionAddress: form.value.production_address,
  locationName: packagingInfo.value.location,
  serialMode: serialMode.value,
  serialRows: serialRows.value.map((row) => ({
    serialNumber: row.serial,
    fullQrCode: row.qrCode,
    status: row.status,
  })),
  rangeConfig: {
    ...rangeConfig.value,
    voidSerials: [...voidSerials.value],
  },
  manualCode: serialInput.value,
  scanStarted: serialRows.value.length > 0,
  editConfig: false,
  updatedAt: new Date().toISOString(),
});

const applyDraftPayload = (payload: SemiFinishedDraftPayload) => {
  applyingDraft.value = true;
  selectedSourceBatchId.value = payload.sourceBatchId || '';
  form.value.source_batch_code = payload.sourceBatchCode || '';
  form.value.product_id = payload.productId || '';
  form.value.production_address = payload.productionAddress || '';
  const inputKg = Number(payload.inputWeightKg || 0);
  if (inputKg >= 1000) {
    inputWeightUnit.value = 'ton';
    displayInputWeight.value = inputKg / 1000;
  } else {
    inputWeightUnit.value = 'kg';
    displayInputWeight.value = inputKg;
  }
  packageWeightKg.value = Number(payload.packageWeightKg || 50);
  bagCount.value = Number(payload.bagCount || 0);
  packagingInfo.value.warehouse_id = payload.warehouseId || '';
  packagingInfo.value.location = payload.locationName || '';
  packagingInfo.value.packer = payload.packer || packagingInfo.value.packer;
  packagingInfo.value.date = payload.packagingDate ? new Date(payload.packagingDate) : new Date();
  nextBatchCode.value = payload.nextCode || '';
  customBatchCode.value = payload.customBatchCode || payload.nextCode || '';
  serialMode.value = payload.serialMode || 'SCAN';
  rangeConfig.value = {
    prefix: payload.rangeConfig?.prefix || '',
    startNumber: payload.rangeConfig?.startNumber || '',
    endNumber: payload.rangeConfig?.endNumber || '',
    voidSerials: Array.isArray(payload.rangeConfig?.voidSerials) ? payload.rangeConfig.voidSerials : [],
  };
  voidSerials.value = [...rangeConfig.value.voidSerials];
  serialRows.value = (payload.serialRows || []).map((row: any) => ({
    serial: row.serialNumber || row.serial,
    qrCode: row.fullQrCode || row.qrCode,
    status: row.status || 'AVAILABLE',
  })).filter((row) => row.serial);
  serialInput.value = payload.manualCode || '';
  setTimeout(() => {
    applyingDraft.value = false;
  }, 0);
};

const openDraftLock = async () => {
  try {
    const { data } = await supplyApi.openSemiFinishedPackagingDraft({
      client_id: getDraftClientId(),
      client_label: 'Web',
    });
    draftLockToken.value = data.lock_token;
    draftBlocked.value = '';
    if (data.payload) {
      applyDraftPayload(data.payload);
      ElMessage.success('Đã khôi phục phiếu lưu tạm từ backend.');
    }
  } catch (e: any) {
    const raw = e?.response?.data?.message;
    draftBlocked.value = typeof raw === 'string'
      ? raw
      : 'Phiếu lưu tạm đang được mở ở thiết bị khác hoặc không thể khóa backend.';
    draftLockToken.value = '';
  }
};

const saveDraftNow = async () => {
  if (!draftLockToken.value || draftBlocked.value || applyingDraft.value) return;
  try {
    await supplyApi.saveSemiFinishedPackagingDraft({
      lock_token: draftLockToken.value,
      payload: buildDraftPayload(),
    });
  } catch (e: any) {
    draftBlocked.value = e?.response?.data?.message || 'Không thể lưu phiếu nháp lên backend. Vui lòng mở lại màn hình.';
  }
};

const scheduleSaveDraft = () => {
  if (!draftLockToken.value || draftBlocked.value || applyingDraft.value) return;
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    saveDraftNow();
  }, 500);
};

const startDraftHeartbeat = () => {
  if (draftHeartbeatTimer) clearInterval(draftHeartbeatTimer);
  draftHeartbeatTimer = setInterval(async () => {
    if (!draftLockToken.value) return;
    try {
      const { data } = await supplyApi.heartbeatSemiFinishedPackagingDraft(draftLockToken.value);
      draftLockToken.value = data.lock_token || draftLockToken.value;
    } catch {
      draftBlocked.value = 'Phiên lưu tạm đã hết hạn hoặc mất kết nối. Vui lòng mở lại màn hình.';
      draftLockToken.value = '';
    }
  }, 4 * 60 * 1000);
};

const releaseDraftLock = async () => {
  if (!draftLockToken.value) return;
  const token = draftLockToken.value;
  draftLockToken.value = '';
  await supplyApi.releaseSemiFinishedPackagingDraft(token).catch(() => {});
};

const loadNextBatchCode = async () => {
  // Ưu tiên lấy theo địa điểm đóng gói mới, nếu chưa chọn thì lấy theo địa điểm sản xuất lô nguồn
  const locationName = packagingInfo.value.location || form.value.production_address;
  if (!locationName) return;
  
  const province = provinces.find(p => p.name === locationName || p.code === locationName);
  const code = province ? province.code : '';
  
  const { data } = await supplyApi.getNextSemiFinishedBatchCode(code || undefined);
  nextBatchCode.value = data?.next_batch_code || '';
  if (!customBatchCode.value || customBatchCode.value === nextBatchCode.value) {
    customBatchCode.value = nextBatchCode.value;
  }
};

const resetToAutoCode = async () => {
  await loadNextBatchCode();
  customBatchCode.value = nextBatchCode.value;
};

watch([currentInputWeightKg, packageWeightKg], ([weight, spec]) => {
  if (applyingDraft.value) return;
  if (weight > 0 && spec > 0) {
    bagCount.value = Math.floor(weight / spec);
  }
});

const fetchPrefixes = async () => {
  try {
    const resBatches = await supplyApi.getBatches();
    batches.value = resBatches.data || [];
    
    const resWarehouses = await transportApi.getWarehouses();
    warehouses.value = resWarehouses.data || [];
    
    const resPrefixes = await supplyApi.searchSerialPrefixes();
    availablePrefixes.value = resPrefixes.data || [];
  } catch (e) {}
};

const handlePrefixChange = async (prefix: string) => {
  if (!prefix) return;
  try {
    const res = await supplyApi.getPrefixNextNumber(prefix) as any;
    // Sử dụng tiền tố thực tế từ server (bao gồm cả ký tự phân cách như '-')
    rangeConfig.value.prefix = res.data.real_prefix;
    rangeConfig.value.startNumber = res.data.next_number;
    generateRange();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Không tìm thấy số tiếp theo');
    rangeConfig.value.startNumber = '';
  }
};

const generateRange = async () => {
  if (serialMode.value !== 'RANGE') return;
  const { prefix, startNumber } = rangeConfig.value;
  if (!prefix || !startNumber || isNaN(Number(startNumber))) {
    serialRows.value = [];
    rangeConfig.value.endNumber = '';
    return;
  }

  const targetCount = bagCount.value;
  if (targetCount <= 0) {
    serialRows.value = [];
    rangeConfig.value.endNumber = '';
    return;
  }

  // Gom danh sách mã bị hỏng
  const allVoids = voidSerials.value.map(s => s.toUpperCase());

  const finalRows: any[] = [];
  let currentNum = parseInt(startNumber, 10);
  const numLength = startNumber.length;
  
  // Guard vòng lặp: không tìm quá xa so với dải dự kiến
  const maxSearch = targetCount + 500;
  let searchCount = 0;

  while (finalRows.length < targetCount && searchCount < maxSearch) {
    // Mỗi lần check một cụm 50 mã để tối ưu network
    const batchSize = Math.min(50, targetCount * 2);
    const batchSerials: string[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      const serialNumStr = String(currentNum).padStart(numLength, '0');
      const fullSerial = `${prefix}${serialNumStr}`.toUpperCase();
      batchSerials.push(fullSerial);
      currentNum++;
    }

    try {
      const res = await supplyApi.lookupSerials(batchSerials);
      const codeMap = new Map(res.data.map((c: any) => [c.serialNumber, c]));
      
      for (const s of batchSerials) {
        if (finalRows.length >= targetCount) break;
        searchCount++;
        
        const codeInfo = codeMap.get(s);
        const isVoid = allVoids.includes(s);
        // CHỈ CHẤP NHẬN MÃ: Chưa hỏng VÀ Trạng thái là AVAILABLE
        const isAvailable = codeInfo && codeInfo.status === 'AVAILABLE';
        
        if (!isVoid && isAvailable) {
          finalRows.push({ 
            serial: s, 
            qrCode: codeInfo.fullQrCode,
            status: codeInfo.status
          });
        }
      }
    } catch (e) { 
      break; 
    }
    
    if (searchCount >= maxSearch) break;
  }

  serialRows.value = finalRows;
  
  if (finalRows.length > 0) {
    const lastSerial = finalRows[finalRows.length - 1].serial;
    const match = lastSerial.match(/(\d+)$/);
    rangeConfig.value.endNumber = match ? match[0] : '';
  } else {
    rangeConfig.value.endNumber = '';
  }
};

const debouncedGenerateRange = () => {
  if (rangeDebounceTimer) clearTimeout(rangeDebounceTimer);
  rangeDebounceTimer = setTimeout(() => {
    generateRange();
  }, 400);
};

watch(bagCount, () => {
  if (serialMode.value === 'RANGE') debouncedGenerateRange();
});

const handleTabChange = (val: any) => {
  if (val === 'SCAN') {
    serialRows.value = [];
  } else {
    generateRange();
  }
};

const load = async () => {
  fetchPrefixes();
  const [pRes, bRes, extRes] = await Promise.all([
    productApi.getList({ limit: 200 }),
    supplyApi.getBatches(),
    supplyApi.getExternalBatches()
  ]);
  products.value = pRes.data?.items || pRes.data || [];
  batches.value = (bRes.data as any)?.data?.items || (bRes.data as any)?.items || (bRes.data as any)?.data || bRes.data || [];
  const extList = (extRes.data as any)?.data?.items || (extRes.data as any)?.items || (extRes.data as any)?.data || extRes.data || [];
  externalBatches.value = extList.filter((b: any) => (b.batchType || '').toUpperCase() === 'EXTERNAL');
  await loadNextBatchCode();
  await openDraftLock();
  startDraftHeartbeat();
};

const addSerial = async () => {
  if (!canEditDraft.value) {
    ElMessage.error(draftBlocked.value || 'Chưa khóa được phiếu lưu tạm.');
    return;
  }
  const input = extractCodeFromQr(serialInput.value);
  if (!input) return;
  
  try {
    // Tra cứu mã từ DB
    const res = await supplyApi.lookupSerials([input]);
    
    if (res.data && res.data.length > 0) {
      const item = res.data[0];
      
      // 1. Kiểm tra trùng lặp trong danh sách hiện tại
      if (serialRows.value.some(r => r.serial === item.serialNumber)) {
        ElMessage.warning(`Mã ${item.serialNumber} đã có trong danh sách.`);
        serialInput.value = '';
        return;
      }

      // 2. Kiểm tra trạng thái mã (Chỉ chấp nhận AVAILABLE)
      if (item.status !== 'AVAILABLE') {
        const statusText = item.status === 'ACTIVE' ? 'Đã kích hoạt' : (item.status === 'SOLD' ? 'Đã bán' : item.status);
        ElMessage.error(`Mã ${item.serial} không hợp lệ (Trạng thái: ${statusText}).`);
        serialInput.value = '';
        return;
      }

      // Hợp lệ -> Thêm vào danh sách
      serialRows.value.unshift({ 
        serial: item.serialNumber, 
        qrCode: item.fullQrCode,
        status: item.status
      });
      scheduleSaveDraft();

      // Thông báo khi đủ số lượng
      if (serialRows.value.length === bagCount.value) {
        ElMessage.success('Đã quét đủ số lượng bao theo kế hoạch!');
      } else if (serialRows.value.length > bagCount.value) {
        ElMessage.warning('Số lượng quét đang vượt quá dự kiến.');
      }
    } else {
      // 3. Không tìm thấy mã
      ElMessage.error(`Mã vừa quét không tồn tại trong kho mã của bạn.`);
    }
  } catch (e) {
    ElMessage.error('Lỗi kiểm tra mã QR. Vui lòng thử lại.');
  }
  serialInput.value = '';
};

const removeSerial = (idx: number) => {
  if (!canEditDraft.value) {
    ElMessage.error(draftBlocked.value || 'Chưa khóa được phiếu lưu tạm.');
    return;
  }
  serialRows.value.splice(idx, 1);
  scheduleSaveDraft();
};

const submit = async () => {
  try {
    // --- CHI TIẾT LỖI CỤ THỂ ---
    if (!selectedSourceBatch.value) {
      ElMessage.error('Lỗi: Bạn chưa chọn Lô nguồn để trích xuất.');
      return;
    }
    if (!form.value.product_id) {
      ElMessage.error('Lỗi: Bạn chưa chọn Sản phẩm bán thành phẩm mục tiêu.');
      return;
    }
    if (currentInputWeightKg.value <= 0) {
      ElMessage.error('Lỗi: Khối lượng trích xuất (Input) phải lớn hơn 0.');
      return;
    }
    if (computedOutputWeight.value <= 0) {
      ElMessage.error('Lỗi: Khối lượng đầu ra không hợp lệ.');
      return;
    }
    if (!packagingInfo.value.location) {
      ElMessage.error('Lỗi: Vui lòng chọn Địa điểm (Tỉnh/Thành) đóng gói.');
      return;
    }
    if (!packagingInfo.value.warehouse_id) {
      ElMessage.error('Lỗi: Bạn phải chọn Kho lưu trữ để nhập kho sản phẩm.');
      return;
    }
    if (bagCount.value <= 0) {
      ElMessage.error('Lỗi: Số bao đóng gói phải lớn hơn 0. Vui lòng kiểm tra lại định lượng.');
      return;
    }
    if (serialRows.value.length === 0) {
      ElMessage.error('Lỗi: Bạn chưa gán mã Serial cho bao nào. Vui lòng quét mã hoặc tạo dải mã.');
      return;
    }
    if (serialRows.value.length !== bagCount.value) {
      ElMessage.error(`Lỗi: Số lượng mã đã gán (${serialRows.value.length}) không khớp với số bao dự kiến (${bagCount.value}). Vui lòng kiểm tra lại.`);
      return;
    }

    form.value.source_batch_code = selectedSourceBatch.value.batchCode;
    form.value.input_weight = currentInputWeightKg.value;
    form.value.output_weight = Number(computedOutputWeight.value.toFixed(2));
    
    const province = provinces.find(p => p.name === packagingInfo.value.location);
    const provinceCode = province ? province.code : '';

    const payload = {
      ...form.value,
      serials: serialRows.value.map(r => r.serial),
      expected_code: nextBatchCode.value,
      custom_batch_code: customBatchCode.value !== nextBatchCode.value ? customBatchCode.value : undefined,
      packer: packagingInfo.value.packer,
      production_address: provinceCode, // Lưu MÃ TỈNH 2 ký tự để không lỗi giao diện
      warehouse_id: packagingInfo.value.warehouse_id,
      packaging_date: packagingInfo.value.date.toISOString(),
      location_name: packagingInfo.value.location,
      package_weight: packageWeightKg.value
    };
    
    saving.value = true;
    await supplyApi.refineSemiFinished(payload as any);
    await supplyApi.clearSemiFinishedPackagingDraft().catch(() => {});
    draftLockToken.value = '';
    ElMessage.success('Thành công: Đã tạo lô bán thành phẩm và nhập kho hoàn tất.');
    router.push('/supply/semi-finished');
  } catch (e: any) {
    const errorMsg = e?.response?.data?.message || e.message || 'Lỗi hệ thống không xác định';
    ElMessage.error(`Lưu thất bại: ${errorMsg}`);
  } finally {
    saving.value = false;
  }
};

watch(
  [() => form.value.production_address, () => packagingInfo.value.location],
  () => {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      loadNextBatchCode().catch(() => {});
    }, 250);
  }
);

watch(
  [
    selectedSourceBatchId,
    displayInputWeight,
    inputWeightUnit,
    packageWeightKg,
    bagCount,
    serialMode,
    serialRows,
    voidSerials,
    rangeConfig,
    serialInput,
    customBatchCode,
    nextBatchCode,
    () => packagingInfo.value.date,
    () => packagingInfo.value.packer,
    () => packagingInfo.value.location,
    () => packagingInfo.value.warehouse_id,
    () => form.value.source_batch_code,
    () => form.value.product_id,
    () => form.value.production_address,
  ],
  () => scheduleSaveDraft(),
  { deep: true }
);

onBeforeUnmount(() => {
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  if (draftHeartbeatTimer) clearInterval(draftHeartbeatTimer);
  releaseDraftLock();
});

onMounted(load);
</script>
<style scoped>
.stat-box {
  background-color: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.stat-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  font-weight: bold;
  margin-bottom: 4px;
}
.stat-value {
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
}
.packaging-info-card :deep(.el-card__header) {
  border-bottom: none;
  padding-bottom: 0;
}
.packaging-info-card :deep(.el-form-item__label) {
  font-weight: bold;
  color: #475569;
  font-size: 12px;
}
.custom-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
.custom-tabs :deep(.el-tabs__item) {
  font-weight: bold;
  font-size: 13px;
  text-transform: capitalize;
}
.modern-table :deep(th) {
  background-color: #f8fafc !important;
  color: #64748b;
  font-size: 11px;
  text-transform: uppercase;
}
.custom-number-input :deep(.el-input__inner) {
  font-weight: bold;
}
.custom-unit-select :deep(.el-input__wrapper) {
  border-left: none;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.custom-number-input :deep(.el-input__wrapper) {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}
</style>
