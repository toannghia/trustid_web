<template>
  <div class="p-4 space-y-4">
    <el-card shadow="never">
      <template #header><div class="font-semibold">Tạo phiếu xuất B2B (nhiều lô)</div></template>
      <el-form label-position="top">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <el-form-item label="Đơn vị nhận">
            <el-select v-model="form.to_tenant_id" filterable>
              <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="Ghi chú">
            <el-input v-model="form.notes" />
          </el-form-item>
          <el-form-item label="Kho xuất">
            <el-select v-model="warehouseId" filterable>
              <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
            </el-select>
          </el-form-item>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <el-select v-model="newBatchId" filterable placeholder="Lô COMPLETED">
            <el-option v-for="b in completedBatches" :key="b.id" :label="`${b.batchCode} (${b.totalQuantity || 0}kg)`" :value="b.id" />
          </el-select>
          <el-input-number v-model="newExpectedQty" :min="0" :step="0.1" class="w-full" />
        </div>
        <div class="mt-2"><el-button @click="addItem">Thêm lô</el-button></div>
        <el-table :data="form.items" class="mt-3" size="small">
          <el-table-column prop="batch_id" label="Batch ID" />
          <el-table-column prop="expected_quantity" label="Expected qty (kg)" />
          <el-table-column label="Thao tác" width="120">
            <template #default="{ $index }"><el-button type="danger" link @click="form.items.splice($index, 1)">Xóa</el-button></template>
          </el-table-column>
        </el-table>
        <div class="mt-3 flex gap-2">
          <el-button type="primary" :loading="creating" @click="createTransfer">Tạo phiếu</el-button>
          <el-button type="success" :disabled="!selectedTransferId" :loading="exporting" @click="confirmExport">Xác nhận xuất (DN1)</el-button>
        </div>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header><div class="font-semibold">Phiếu B2B gần đây</div></template>
      <el-table :data="transfers" size="small">
        <el-table-column prop="id" label="Transfer ID" />
        <el-table-column prop="status" label="Status" width="150" />
        <el-table-column prop="toTenantId" label="To Tenant" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { tenantApi } from '@/modules/core/api/tenant';
import { transportApi } from '../api/transportApi';
import { supplyApi } from '../api/supplyApi';

const tenants = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const batches = ref<any[]>([]);
const transfers = ref<any[]>([]);

const creating = ref(false);
const exporting = ref(false);
const selectedTransferId = ref('');
const warehouseId = ref('');
const newBatchId = ref('');
const newExpectedQty = ref(0);

const form = ref({
  to_tenant_id: '',
  notes: '',
  items: [] as Array<{ batch_id: string; expected_quantity: number }>
});

const completedBatches = computed(() => batches.value.filter(b => b.status === 'COMPLETED'));

const load = async () => {
  const [tRes, wRes, bRes, trRes] = await Promise.all([
    tenantApi.getActive({ limit: 200 }),
    transportApi.getWarehouses(),
    supplyApi.getBatches(),
    supplyApi.listTransfers()
  ]);
  tenants.value = tRes.data?.items || tRes.data || [];
  warehouses.value = wRes.data || [];
  batches.value = bRes.data || [];
  transfers.value = trRes.data || [];
};

const addItem = () => {
  if (!newBatchId.value || newExpectedQty.value <= 0) return;
  form.value.items.push({ batch_id: newBatchId.value, expected_quantity: newExpectedQty.value });
  newBatchId.value = '';
  newExpectedQty.value = 0;
};

const createTransfer = async () => {
  try {
    creating.value = true;
    const { data } = await supplyApi.createTransfer(form.value);
    selectedTransferId.value = data.id;
    ElMessage.success('Đã tạo phiếu');
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Tạo phiếu thất bại');
  } finally {
    creating.value = false;
  }
};

const confirmExport = async () => {
  if (!selectedTransferId.value || !warehouseId.value) return;
  try {
    exporting.value = true;
    await supplyApi.confirmTransferExport(selectedTransferId.value, warehouseId.value);
    ElMessage.success('Đã xác nhận xuất');
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Xác nhận xuất thất bại');
  } finally {
    exporting.value = false;
  }
};

onMounted(load);
</script>
