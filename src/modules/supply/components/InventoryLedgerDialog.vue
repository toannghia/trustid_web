<template>
  <el-dialog
    v-model="visible"
    title="Sổ Chi Tiết (Thẻ Kho)"
    width="900px"
    @closed="resetData"
    append-to-body
  >
    <div v-loading="loading" class="min-h-[300px]">
      <div v-if="data" class="space-y-4">
        <!-- Header Info -->
        <div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
          <div>
            <div class="text-xs text-gray-500 uppercase font-bold mb-1">Mã Lô</div>
            <div class="font-mono text-blue-600 font-bold">{{ batchCode || '---' }}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500 uppercase font-bold mb-1">Kho chứa</div>
            <div class="font-medium">{{ warehouseName || '---' }}</div>
          </div>
          <div class="col-span-2">
            <div class="text-xs text-gray-500 uppercase font-bold mb-1">Sản phẩm</div>
            <div class="font-bold text-gray-800">{{ productName || '---' }}</div>
          </div>
        </div>

        <!-- Summary Bar -->
        <div class="flex items-center gap-4 text-sm font-medium border-b pb-2">
          <div class="flex-1 text-gray-600">
            Kỳ báo cáo: {{ formatDate(fromDate) }} đến {{ formatDate(toDate) }}
          </div>
        </div>

        <!-- Ledger Table -->
        <el-table :data="data.rows" border class="w-full" size="small" height="400">
          <el-table-column label="Thời gian" width="160">
            <template #default="{ row }">
              <span v-if="row.isOpeningRow" class="font-bold italic text-gray-500">-</span>
              <span v-else>{{ formatDateTime(row.createdAt) }}</span>
            </template>
          </el-table-column>
          
          <el-table-column label="Diễn giải" min-width="250">
            <template #default="{ row }">
              <span v-if="row.isOpeningRow" class="font-bold italic text-gray-600">Số dư đầu kỳ</span>
              <span v-else>
                <div>{{ getReferenceLabel(row.referenceType) }}</div>
                <div class="text-xs text-gray-500">{{ row.notes || '-' }}</div>
                <div v-if="row.itemSerial" class="text-[10px] text-gray-400 font-mono">Mã bao: {{ row.itemSerial }}</div>
              </span>
            </template>
          </el-table-column>
          
          <el-table-column label="Loại" width="100" align="center">
            <template #default="{ row }">
               <span v-if="row.isOpeningRow">-</span>
               <el-tag v-else :type="row.type === 'INBOUND' ? 'success' : 'danger'" size="small">
                 {{ row.type === 'INBOUND' ? 'NHẬP' : 'XUẤT' }}
               </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="Số lượng" width="120" align="right">
            <template #default="{ row }">
              <span v-if="row.isOpeningRow">-</span>
              <span v-else :class="row.type === 'INBOUND' ? 'text-green-600' : 'text-red-600'">
                {{ row.type === 'INBOUND' ? '+' : '-' }}{{ formatNumber(row.quantity) }}
              </span>
            </template>
          </el-table-column>
          
          <el-table-column label="Tồn dư" width="120" align="right">
            <template #default="{ row }">
              <span class="font-bold text-blue-700">{{ formatNumber(row.balance) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <div v-else-if="!loading" class="text-center py-10 text-gray-500">
        Không có dữ liệu
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Đóng</el-button>
        <el-button type="success" plain @click="exportExcel">Xuất Excel</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { reportApi } from '../api/reportApi';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';

const visible = ref(false);
const loading = ref(false);
const data = ref<any>(null);

const batchCode = ref('');
const productName = ref('');
const warehouseName = ref('');
const fromDate = ref('');
const toDate = ref('');

const open = async (
  warehouseId: string, 
  batchId: string, 
  start: string, 
  end: string,
  meta: { batchCode: string, productName: string, warehouseName: string }
) => {
  visible.value = true;
  loading.value = true;
  batchCode.value = meta.batchCode;
  productName.value = meta.productName;
  warehouseName.value = meta.warehouseName;
  fromDate.value = start;
  toDate.value = end;

  try {
    const res = await reportApi.getInventoryLedger({
      warehouseId,
      batchId,
      fromDate: start,
      toDate: end
    });
    data.value = res.data;
  } catch (error) {
    ElMessage.error('Lỗi khi tải dữ liệu thẻ kho');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const resetData = () => {
  data.value = null;
};

const formatDateTime = (date: string) => {
  if (!date) return '-';
  return dayjs(date).format('DD/MM/YYYY HH:mm:ss');
};

const formatDate = (date: string) => {
  if (!date) return '-';
  return dayjs(date).format('DD/MM/YYYY');
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('vi-VN').format(num || 0);
};

const getReferenceLabel = (type: string) => {
  switch (type) {
    case 'PACKAGING': return 'Đóng gói sản phẩm';
    case 'CROSS_TENANT_TRANSFER': return 'Chuyển giao B2B';
    case 'SHIPMENT': return 'Xuất kho vận chuyển';
    case 'REFINEMENT': return 'Chế biến / Tinh chế';
    case 'EXTERNAL_IMPORT': return 'Nhập khẩu / Mua ngoài';
    case 'MANUAL': return 'Điều chỉnh tay';
    default: return type || 'Khác';
  }
};

const exportExcel = () => {
  ElMessage.info('Tính năng xuất Excel đang được phát triển');
};

defineExpose({ open });
</script>
