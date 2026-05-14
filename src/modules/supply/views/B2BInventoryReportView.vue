<template>
  <div class="p-4 space-y-4">
    <el-card shadow="never">
      <template #header><div class="font-semibold">Báo cáo Xuất Nhập Tồn B2B</div></template>
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <el-select v-model="warehouseId" filterable placeholder="Kho">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
        <el-date-picker v-model="dateFrom" type="date" value-format="YYYY-MM-DD" placeholder="Từ ngày" />
        <el-date-picker v-model="dateTo" type="date" value-format="YYYY-MM-DD" placeholder="Đến ngày" />
        <el-button type="primary" :loading="loading" @click="loadReport">Lấy báo cáo</el-button>
      </div>
      <el-descriptions v-if="report" :column="2" border class="mt-3">
        <el-descriptions-item label="Tồn đầu kỳ">{{ report.opening_balance }}</el-descriptions-item>
        <el-descriptions-item label="Tổng nhập">{{ report.total_inbound }}</el-descriptions-item>
        <el-descriptions-item label="Tổng xuất">{{ report.total_outbound }}</el-descriptions-item>
        <el-descriptions-item label="Tồn cuối kỳ">{{ report.closing_balance }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { transportApi } from '../api/transportApi';
import { inventoryApi } from '../api/inventoryApi';

const warehouses = ref<any[]>([]);
const warehouseId = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const report = ref<any>(null);
const loading = ref(false);

const loadWarehouses = async () => {
  const { data } = await transportApi.getWarehouses();
  warehouses.value = data || [];
};

const loadReport = async () => {
  if (!warehouseId.value || !dateFrom.value || !dateTo.value) return;
  try {
    loading.value = true;
    const { data } = await inventoryApi.getBalanceReport(warehouseId.value, dateFrom.value, dateTo.value);
    report.value = data;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Không lấy được báo cáo');
  } finally {
    loading.value = false;
  }
};

onMounted(loadWarehouses);
</script>
