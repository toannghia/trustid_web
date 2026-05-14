<template>
  <div class="p-4 space-y-4">
    <el-card shadow="never">
      <template #header><div class="font-semibold">Nhập phiếu B2B (FULL/PARTIAL)</div></template>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        <el-select v-model="selectedTransferId" filterable placeholder="Chọn phiếu">
          <el-option v-for="t in transfers" :key="t.id" :label="`${t.id} - ${t.status}`" :value="t.id" />
        </el-select>
        <el-select v-model="importMode">
          <el-option label="FULL" value="FULL" />
          <el-option label="PARTIAL" value="PARTIAL" />
        </el-select>
        <el-select v-model="warehouseId" filterable placeholder="Kho nguyên liệu DN2">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </div>

      <el-input v-model="scanText" type="textarea" :rows="3" placeholder="Serial quét, phân tách bằng dấu phẩy hoặc xuống dòng" />
      <div class="mt-2 flex gap-2">
        <el-input v-model="deviceId" placeholder="Device ID (optional)" />
        <el-input v-model="location" placeholder="Location (optional)" />
      </div>

      <div v-if="importMode === 'PARTIAL'" class="mt-3">
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
        <el-button type="primary" :loading="importing" :disabled="!selectedTransferId" @click="confirmImport">Hoàn tất nhập</el-button>
        <el-button :disabled="!selectedTransferId" @click="loadLogs">Xem audit logs</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <template #header><div class="font-semibold">Audit logs</div></template>
      <el-table :data="logs" size="small">
        <el-table-column prop="action" label="Action" width="130" />
        <el-table-column prop="productItem.serialNumber" label="Serial" />
        <el-table-column prop="scanTimestamp" label="Timestamp" />
        <el-table-column prop="deviceId" label="Device" />
        <el-table-column prop="location" label="Location" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { transportApi } from '../api/transportApi';
import { supplyApi } from '../api/supplyApi';

const transfers = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const logs = ref<any[]>([]);

const selectedTransferId = ref('');
const importMode = ref<'FULL' | 'PARTIAL'>('FULL');
const warehouseId = ref('');
const importing = ref(false);

const scanText = ref('');
const deviceId = ref('');
const location = ref('');
const partialRows = ref<Array<{ batch_id: string; received_quantity: number }>>([]);

const selectedTransfer = computed(() => transfers.value.find(t => t.id === selectedTransferId.value));

const syncPartialRows = () => {
  const items = selectedTransfer.value?.items || [];
  partialRows.value = items.map((i: any) => ({
    batch_id: i.batchId || i.batch_id,
    received_quantity: i.expectedQuantity || i.expected_quantity || 0
  }));
};

const load = async () => {
  const [trRes, wRes] = await Promise.all([supplyApi.listTransfers(), transportApi.getWarehouses()]);
  transfers.value = trRes.data || [];
  warehouses.value = wRes.data || [];
  if (!selectedTransferId.value && transfers.value.length > 0) selectedTransferId.value = transfers.value[0].id;
  syncPartialRows();
};

const confirmImport = async () => {
  if (!selectedTransferId.value || !warehouseId.value) return;
  try {
    importing.value = true;
    const scanned = scanText.value.split(/[\n,]/g).map(s => s.trim()).filter(Boolean);
    await supplyApi.confirmTransferImport({
      transfer_id: selectedTransferId.value,
      import_mode: importMode.value,
      target_warehouse_id: warehouseId.value,
      scanned_serials: scanned,
      received_items: importMode.value === 'PARTIAL' ? partialRows.value : undefined,
      device_id: deviceId.value || undefined,
      location: location.value || undefined
    });
    ElMessage.success('Đã hoàn tất nhập');
    await load();
    await loadLogs();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Nhập thất bại');
  } finally {
    importing.value = false;
  }
};

const loadLogs = async () => {
  if (!selectedTransferId.value) return;
  const { data } = await supplyApi.getTransferLogs(selectedTransferId.value);
  logs.value = data || [];
};

watch(selectedTransferId, syncPartialRows);
onMounted(load);
</script>
