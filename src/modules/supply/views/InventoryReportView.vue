<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto pb-24">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <div class="p-2 bg-blue-100 rounded-lg text-blue-600">
            <el-icon><DataLine /></el-icon>
          </div>
          Báo cáo Xuất Nhập Tồn
        </h1>
        <p class="text-gray-500 text-sm mt-1">Tổng hợp số lượng nhập, xuất, và tồn kho cuối kỳ</p>
      </div>
    </div>

    <!-- Filters -->
    <el-card shadow="never" class="!border-gray-200 !rounded-xl">
      <div class="flex flex-wrap items-end gap-4">
        <div class="w-full md:w-64">
          <div class="text-xs font-bold text-gray-500 mb-1 uppercase">Chọn kho</div>
          <el-select v-model="filter.warehouseId" clearable filterable placeholder="Tất cả các kho" class="w-full">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
        </div>

        <div class="w-full md:w-80">
          <div class="text-xs font-bold text-gray-500 mb-1 uppercase">Khoảng thời gian</div>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="Đến"
            start-placeholder="Từ ngày"
            end-placeholder="Đến ngày"
            format="DD/MM/YYYY"
            class="!w-full"
            :clearable="false"
            @change="handleDateChange"
          />
        </div>

        <el-button type="primary" :icon="Search" @click="fetchData" :loading="loading" class="md:mb-0">
          Lấy Dữ Liệu
        </el-button>
        <el-button :icon="Download" plain @click="exportExcel">
          Xuất Excel
        </el-button>
      </div>
    </el-card>

    <!-- Data Table -->
    <el-card shadow="never" class="!border-gray-200 !rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <el-table 
        :data="tableData" 
        style="width: 100%" 
        v-loading="loading"
        border
        stripe
        show-summary
        :summary-method="getSummaries"
      >
        <el-table-column type="index" label="STT" width="60" align="center" />
        
        <el-table-column label="Thông tin Lô / Sản phẩm" min-width="250">
          <template #default="{ row }">
            <div class="font-bold text-gray-800">{{ row.productName || 'Không xác định' }}</div>
            <div class="text-xs text-gray-500 font-mono flex items-center gap-1 mt-1">
              <el-icon><Box /></el-icon> Lô: {{ row.batchCode }}
            </div>
            <div class="text-[10px] text-blue-500 flex items-center gap-1 mt-1">
              <el-icon><House /></el-icon> Kho: {{ row.warehouseName }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Tồn đầu kỳ" prop="openingBalance" width="130" align="right">
          <template #default="{ row }">
            <span class="text-gray-600 font-medium">{{ formatNumber(row.openingBalance) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Nhập trong kỳ" prop="inbound" width="140" align="right">
          <template #default="{ row }">
            <span class="text-green-600 font-bold">+{{ formatNumber(row.inbound) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Xuất trong kỳ" prop="outbound" width="140" align="right">
          <template #default="{ row }">
            <span class="text-red-600 font-bold">-{{ formatNumber(row.outbound) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Tồn cuối kỳ" prop="closingBalance" width="140" align="right" class-name="bg-blue-50">
          <template #default="{ row }">
            <span class="text-blue-700 font-bold text-base">{{ formatNumber(row.closingBalance) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewLedger(row)">
              <el-icon class="mr-1"><Document /></el-icon> Thẻ kho
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <InventoryLedgerDialog ref="ledgerDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { DataLine, Search, Download, Box, House, Document } from '@element-plus/icons-vue';
import { reportApi } from '../api/reportApi';
import { transportApi } from '../api/transportApi';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import InventoryLedgerDialog from '../components/InventoryLedgerDialog.vue';
import type { TableColumnCtx } from 'element-plus';

interface SummaryData {
  openingBalance: number;
  inbound: number;
  outbound: number;
  closingBalance: number;
}

const loading = ref(false);
const warehouses = ref<any[]>([]);
const tableData = ref<any[]>([]);

const dateRange = ref<[Date, Date]>([
  dayjs().startOf('month').toDate(),
  dayjs().endOf('day').toDate()
]);

const filter = reactive({
  warehouseId: '',
  fromDate: dayjs().startOf('month').toISOString(),
  toDate: dayjs().endOf('day').toISOString()
});

const ledgerDialogRef = ref<InstanceType<typeof InventoryLedgerDialog> | null>(null);

const handleDateChange = (val: [Date, Date]) => {
  if (val && val.length === 2) {
    filter.fromDate = dayjs(val[0]).startOf('day').toISOString();
    filter.toDate = dayjs(val[1]).endOf('day').toISOString();
  }
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('vi-VN').format(num || 0);
};

const getSummaries = (param: { columns: TableColumnCtx<any>[]; data: any[] }) => {
  const { columns, data } = param;
  const sums: string[] = [];
  
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = 'Tổng cộng';
      return;
    }
    if (index === 1) {
      sums[index] = '';
      return;
    }
    
    // index 2: opening, 3: inbound, 4: outbound, 5: closing
    if (['openingBalance', 'inbound', 'outbound', 'closingBalance'].includes(column.property)) {
      const values = data.map(item => Number(item[column.property]));
      if (!values.every(value => Number.isNaN(value))) {
        const sum = values.reduce((prev, curr) => {
          const value = Number(curr);
          if (!Number.isNaN(value)) {
            return prev + curr;
          } else {
            return prev;
          }
        }, 0);
        sums[index] = formatNumber(sum);
      } else {
        sums[index] = '';
      }
    } else {
      sums[index] = '';
    }
  });

  return sums;
};

const fetchWarehouses = async () => {
  try {
    const res = await transportApi.getWarehouses();
    warehouses.value = res.data || [];
  } catch (e) {
    console.error('Failed to load warehouses', e);
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await reportApi.getInventorySummary(filter);
    tableData.value = res.data;
  } catch (error) {
    ElMessage.error('Lỗi tải dữ liệu báo cáo');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const viewLedger = (row: any) => {
  if (ledgerDialogRef.value) {
    ledgerDialogRef.value.open(
      row.warehouseId,
      row.batchId,
      filter.fromDate,
      filter.toDate,
      {
        batchCode: row.batchCode,
        productName: row.productName,
        warehouseName: row.warehouseName
      }
    );
  }
};

const exportExcel = () => {
  ElMessage.info('Tính năng xuất Excel đang được phát triển');
};

onMounted(() => {
  fetchWarehouses();
  fetchData();
});
</script>
