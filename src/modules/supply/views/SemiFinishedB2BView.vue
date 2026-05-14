<template>
  <div class="p-4 space-y-4">
    <el-card shadow="never">
      <template #header>
        <div class="font-semibold">Giai đoạn 3: Bán thành phẩm B2B</div>
      </template>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <el-form label-position="top">
          <el-form-item label="Lô nguồn (batch code)">
            <el-input v-model="refineForm.source_batch_code" placeholder="VD: FARM-20260513-001" />
          </el-form-item>
          <el-form-item label="Sản phẩm bán thành phẩm">
            <el-select v-model="refineForm.product_id" filterable class="w-full">
              <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </el-form-item>
          <div class="grid grid-cols-2 gap-3">
            <el-form-item label="Input weight (kg)">
              <el-input-number v-model="refineForm.input_weight" :min="0" class="w-full" />
            </el-form-item>
            <el-form-item label="Output weight (kg)">
              <el-input-number v-model="refineForm.output_weight" :min="0" class="w-full" />
            </el-form-item>
          </div>
          <el-button type="primary" :loading="savingRefine" @click="submitRefine">Tạo lô bán thành phẩm</el-button>
        </el-form>

        <el-card>
          <template #header>Chi tiết lô bán thành phẩm</template>
          <el-select v-model="selectedSemiBatchId" filterable class="w-full mb-3" placeholder="Chọn lô">
            <el-option v-for="b in semiBatches" :key="b.id" :label="`${b.batchCode} - ${b.status}`" :value="b.id" />
          </el-select>
          <div v-if="selectedSemiBatch">
            <p><b>Batch code:</b> {{ selectedSemiBatch.batchCode }}</p>
            <p><b>Status:</b> {{ selectedSemiBatch.status }}</p>
            <p><b>Input:</b> {{ selectedSemiBatch.inputWeight ?? 0 }} kg</p>
            <p><b>Output:</b> {{ selectedSemiBatch.outputWeight ?? 0 }} kg</p>
            <p><b>Loss %:</b> {{ selectedSemiBatch.lossPercentage ?? 0 }}</p>
            <p><b>Parent batch:</b> {{ selectedSemiBatch.parentBatchId || '-' }}</p>
          </div>
        </el-card>
      </div>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="font-semibold">Tạo phiếu xuất B2B (nhiều lô)</div>
      </template>
      <el-form label-position="top">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <el-form-item label="Đơn vị nhận">
            <el-select v-model="transferForm.to_tenant_id" filterable>
              <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="Ghi chú">
            <el-input v-model="transferForm.notes" placeholder="Tùy chọn" />
          </el-form-item>
          <el-form-item label="Kho xuất">
            <el-select v-model="transferExportWarehouseId" filterable>
              <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
            </el-select>
          </el-form-item>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <el-select v-model="newTransferBatchId" filterable placeholder="Lô COMPLETED để thêm vào phiếu">
            <el-option v-for="b in completedBatches" :key="b.id" :label="`${b.batchCode} (${b.totalQuantity || 0}kg)`" :value="b.id" />
          </el-select>
          <el-input-number v-model="newTransferExpectedQty" :min="0" :step="0.1" class="w-full" />
        </div>
        <div class="mt-2">
          <el-button @click="addTransferItem">Thêm lô</el-button>
        </div>
        <el-table :data="transferForm.items" class="mt-3" size="small">
          <el-table-column prop="batch_id" label="Batch ID" />
          <el-table-column prop="expected_quantity" label="Expected qty (kg)" />
          <el-table-column label="Thao tác" width="120">
            <template #default="{ $index }">
              <el-button type="danger" link @click="transferForm.items.splice($index, 1)">Xóa</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="mt-3 flex gap-2">
          <el-button type="primary" :loading="creatingTransfer" @click="createTransfer">Tạo phiếu</el-button>
          <el-button type="success" :disabled="!selectedTransferId" :loading="exportingTransfer" @click="confirmExportTransfer">Xác nhận xuất (DN1)</el-button>
        </div>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="font-semibold">Nhập phiếu B2B (DN2) + quét FULL/PARTIAL</div>
      </template>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <el-select v-model="selectedTransferId" filterable placeholder="Chọn phiếu">
          <el-option v-for="t in transfers" :key="t.id" :label="`${t.id} - ${t.status}`" :value="t.id" />
        </el-select>
        <el-select v-model="importForm.import_mode">
          <el-option label="FULL" value="FULL" />
          <el-option label="PARTIAL" value="PARTIAL" />
        </el-select>
        <el-select v-model="importForm.target_warehouse_id" filterable placeholder="Kho nguyên liệu DN2">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </div>
      <el-input v-model="scanText" type="textarea" :rows="3" placeholder="Danh sách serial quét, ngăn cách bằng dấu phẩy hoặc xuống dòng" />
      <div class="mt-2 flex gap-2">
        <el-input v-model="importForm.device_id" placeholder="Device ID (optional)" />
        <el-input v-model="importForm.location" placeholder="Location (optional)" />
      </div>
      <div v-if="importForm.import_mode === 'PARTIAL'" class="mt-3">
        <el-table :data="partialRows" size="small">
          <el-table-column prop="batch_id" label="Batch ID" />
          <el-table-column label="Received qty (kg)">
            <template #default="{ row }">
              <el-input-number v-model="row.received_quantity" :min="0" :step="0.1" />
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="mt-3 flex gap-2">
        <el-button type="primary" :loading="importingTransfer" :disabled="!selectedTransferId" @click="confirmImportTransfer">Hoàn tất nhập</el-button>
        <el-button :disabled="!selectedTransferId" @click="loadTransferLogs">Xem audit logs</el-button>
      </div>
      <el-table :data="transferLogs" size="small" class="mt-3">
        <el-table-column prop="action" label="Action" width="130" />
        <el-table-column prop="productItem.serialNumber" label="Serial" />
        <el-table-column prop="scanTimestamp" label="Timestamp" />
        <el-table-column prop="deviceId" label="Device" />
        <el-table-column prop="location" label="Location" />
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="font-semibold">Báo cáo Xuất Nhập Tồn theo kho</div>
      </template>
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <el-select v-model="balanceForm.warehouse_id" filterable placeholder="Kho">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
        <el-date-picker v-model="balanceForm.date_from" type="date" value-format="YYYY-MM-DD" placeholder="Từ ngày" />
        <el-date-picker v-model="balanceForm.date_to" type="date" value-format="YYYY-MM-DD" placeholder="Đến ngày" />
        <el-button type="primary" :loading="loadingBalance" @click="loadBalanceReport">Lấy báo cáo</el-button>
      </div>
      <el-descriptions v-if="balanceReport" :column="2" border class="mt-3">
        <el-descriptions-item label="Tồn đầu kỳ">{{ balanceReport.opening_balance }}</el-descriptions-item>
        <el-descriptions-item label="Tổng nhập">{{ balanceReport.total_inbound }}</el-descriptions-item>
        <el-descriptions-item label="Tổng xuất">{{ balanceReport.total_outbound }}</el-descriptions-item>
        <el-descriptions-item label="Tồn cuối kỳ">{{ balanceReport.closing_balance }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { supplyApi } from '../api/supplyApi';
import { inventoryApi } from '../api/inventoryApi';
import { productApi } from '@/modules/core/api/product';
import { tenantApi } from '@/modules/core/api/tenant';
import { transportApi } from '../api/transportApi';

const products = ref<any[]>([]);
const batches = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const tenants = ref<any[]>([]);
const transfers = ref<any[]>([]);
const transferLogs = ref<any[]>([]);

const savingRefine = ref(false);
const creatingTransfer = ref(false);
const exportingTransfer = ref(false);
const importingTransfer = ref(false);
const loadingBalance = ref(false);

const selectedSemiBatchId = ref('');
const selectedTransferId = ref('');

const refineForm = ref({
  source_batch_code: '',
  product_id: '',
  input_weight: 0,
  output_weight: 0
});

const transferForm = ref({
  to_tenant_id: '',
  notes: '',
  items: [] as Array<{ batch_id: string; expected_quantity: number }>
});
const transferExportWarehouseId = ref('');
const newTransferBatchId = ref('');
const newTransferExpectedQty = ref(0);

const importForm = ref({
  import_mode: 'FULL' as 'FULL' | 'PARTIAL',
  target_warehouse_id: '',
  device_id: '',
  location: ''
});
const partialRows = ref<Array<{ batch_id: string; received_quantity: number }>>([]);
const scanText = ref('');

const balanceForm = ref({
  warehouse_id: '',
  date_from: '',
  date_to: ''
});
const balanceReport = ref<any>(null);

const semiBatches = computed(() => batches.value.filter(b => b.batchType === 'SEMI_FINISHED'));
const completedBatches = computed(() => batches.value.filter(b => b.status === 'COMPLETED'));
const selectedSemiBatch = computed(() => semiBatches.value.find(b => b.id === selectedSemiBatchId.value));

const refreshAll = async () => {
  const [pRes, bRes, wRes, tRes, trRes] = await Promise.all([
    productApi.getList({ limit: 200 }),
    supplyApi.getBatches(),
    transportApi.getWarehouses(),
    tenantApi.getActive({ limit: 200 }),
    supplyApi.listTransfers()
  ]);
  products.value = pRes.data?.items || pRes.data || [];
  batches.value = bRes.data || [];
  warehouses.value = wRes.data || [];
  tenants.value = tRes.data?.items || tRes.data || [];
  transfers.value = trRes.data || [];
};

const submitRefine = async () => {
  try {
    savingRefine.value = true;
    await supplyApi.refineSemiFinished(refineForm.value);
    ElMessage.success('Đã tạo lô bán thành phẩm');
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Tạo lô thất bại');
  } finally {
    savingRefine.value = false;
  }
};

const addTransferItem = () => {
  if (!newTransferBatchId.value || newTransferExpectedQty.value <= 0) return;
  transferForm.value.items.push({ batch_id: newTransferBatchId.value, expected_quantity: newTransferExpectedQty.value });
  newTransferBatchId.value = '';
  newTransferExpectedQty.value = 0;
};

const createTransfer = async () => {
  try {
    creatingTransfer.value = true;
    const { data } = await supplyApi.createTransfer(transferForm.value);
    selectedTransferId.value = data.id;
    ElMessage.success('Đã tạo phiếu chuyển giao');
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Tạo phiếu thất bại');
  } finally {
    creatingTransfer.value = false;
  }
};

const confirmExportTransfer = async () => {
  try {
    if (!selectedTransferId.value || !transferExportWarehouseId.value) return;
    exportingTransfer.value = true;
    await supplyApi.confirmTransferExport(selectedTransferId.value, transferExportWarehouseId.value);
    ElMessage.success('Đã xác nhận xuất');
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Xác nhận xuất thất bại');
  } finally {
    exportingTransfer.value = false;
  }
};

const confirmImportTransfer = async () => {
  try {
    if (!selectedTransferId.value) return;
    importingTransfer.value = true;
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
    ElMessage.success('Đã hoàn tất nhập');
    await refreshAll();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Nhập phiếu thất bại');
  } finally {
    importingTransfer.value = false;
  }
};

const loadTransferLogs = async () => {
  if (!selectedTransferId.value) return;
  const { data } = await supplyApi.getTransferLogs(selectedTransferId.value);
  transferLogs.value = data || [];
};

const loadBalanceReport = async () => {
  try {
    loadingBalance.value = true;
    const { data } = await inventoryApi.getBalanceReport(
      balanceForm.value.warehouse_id,
      balanceForm.value.date_from,
      balanceForm.value.date_to
    );
    balanceReport.value = data;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Không lấy được báo cáo');
  } finally {
    loadingBalance.value = false;
  }
};

onMounted(async () => {
  await refreshAll();
});
</script>
