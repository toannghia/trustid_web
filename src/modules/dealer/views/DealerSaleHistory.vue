<template>
  <div class="dealer-sale-history p-6 relative">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Lịch sử Hóa đơn Bán lẻ</h2>
      <el-button type="primary" @click="loadData(1)" :loading="loading">
        <el-icon class="mr-1"><Refresh /></el-icon> Làm mới
      </el-button>
    </div>

    <el-card shadow="hover" class="border rounded-xl">
      <el-table :data="tableData" style="width: 100%" v-loading="loading">
        <el-table-column type="index" width="60" label="STT" />
        
        <el-table-column prop="receiptNumber" label="Mã Hóa đơn" width="180">
          <template #default="{row}">
            <span class="font-mono font-bold text-blue-600">{{ row.receiptNumber || row.id.split('-')[0].toUpperCase() }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="saleDate" label="Thời gian" width="180">
          <template #default="{row}">
            {{ formatDateTime(row.saleDate) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="customerName" label="Khách hàng">
          <template #default="{row}">
            <div class="font-medium">{{ row.customerName || 'Khách lẻ' }}</div>
            <div class="text-xs text-gray-500">{{ row.customerPhone || '---' }}</div>
          </template>
        </el-table-column>
        
        <el-table-column label="SP/Số lượng" width="120" align="center">
          <template #default="{row}">
            <el-tag size="small" type="info">{{ row.items ? row.items.length : 0 }} SP</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="totalAmount" label="Tổng tiền (VND)" width="180" align="right">
          <template #default="{row}">
            <div class="font-bold text-green-600">{{ formatCurrency(row.totalAmount) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="160" align="center" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              <el-icon class="mr-1"><View /></el-icon> Chi tiết
            </el-button>
            <el-button type="success" link size="small" @click="printReceipt(row)">
              <el-icon class="mr-1"><Printer /></el-icon> In
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-6 flex justify-end">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="totalItems"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Dialog Chi tiết -->
    <el-dialog v-model="showDetail" title="Chi tiết Hóa đơn" width="600px">
      <div v-if="selectedSale" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-gray-500">Mã hóa đơn</div>
            <div class="font-mono font-bold">{{ selectedSale.receiptNumber || selectedSale.id.split('-')[0] }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Thời gian</div>
            <div class="font-medium">{{ formatDateTime(selectedSale.saleDate) }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Khách hàng</div>
            <div class="font-medium">{{ selectedSale.customerName || 'Khách lẻ' }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500">Phương thức TT</div>
            <div class="font-medium uppercase">{{ selectedSale.paymentMethod || 'CASH' }}</div>
          </div>
        </div>

        <el-divider />

        <div>
          <div class="text-sm text-gray-500 mb-2">Danh sách Sản phẩm</div>
          <el-table :data="selectedSale.items" size="small" border>
            <el-table-column prop="productName" label="Tên SP" />
            <el-table-column prop="serialNumber" label="S/N" width="140" class-name="font-mono text-xs" />
            <el-table-column prop="price" label="Đơn giá" width="120" align="right">
              <template #default="{row}">{{ formatCurrency(row.price) }}</template>
            </el-table-column>
          </el-table>
        </div>

        <div class="flex justify-end pt-4">
          <div class="text-xl font-bold">
            Tổng cộng: <span class="text-green-600 ml-2">{{ formatCurrency(selectedSale.totalAmount) }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh, View, Printer } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import api from '@/common/utils/api';

const router = useRouter();

const loading = ref(false);
const tableData = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);

const showDetail = ref(false);
const selectedSale = ref<any>(null);

const formatCurrency = (val: number | string) => {
  if (!val) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN');
};

const loadData = async (page = 1) => {
  loading.value = true;
  currentPage.value = page;
  try {
    const { data } = await api.get(`/dealer-dashboard/sales?page=${page}&limit=${pageSize.value}`);
    tableData.value = data.items || [];
    totalItems.value = data.total || 0;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải danh sách hóa đơn');
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (val: number) => {
  loadData(val);
};

const viewDetail = (row: any) => {
  selectedSale.value = row;
  showDetail.value = true;
};

const printReceipt = (row: any) => {
  router.push(`/dealer/receipt/${row.id}`);
};

onMounted(() => {
  loadData();
});
</script>
