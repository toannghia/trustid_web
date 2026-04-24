<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Tổng hợp Tồn Kho</h1>
      <el-button type="primary" icon="Refresh" @click="loadSummary" :loading="loading">
        Làm mới
      </el-button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <el-icon class="text-2xl"><Box /></el-icon>
        </div>
        <div>
          <div class="text-sm text-gray-500 font-medium">Tổng số lượng (kg)</div>
          <div class="text-2xl font-bold text-gray-900">{{ totalQuantity.toLocaleString() }}</div>
        </div>
      </div>
      
      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <el-icon class="text-2xl"><Tickets /></el-icon>
        </div>
        <div>
          <div class="text-sm text-gray-500 font-medium">Tổng thực tế xuất bán</div>
          <div class="text-2xl font-bold text-gray-900">{{ availableQuantity.toLocaleString() }}</div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
          <el-icon class="text-2xl"><Lock /></el-icon>
        </div>
        <div>
          <div class="text-sm text-gray-500 font-medium">Đang chờ xuất kho</div>
          <div class="text-2xl font-bold text-gray-900">{{ reservedQuantity.toLocaleString() }}</div>
        </div>
      </div>

      <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
          <el-icon class="text-2xl"><Collection /></el-icon>
        </div>
        <div>
          <div class="text-sm text-gray-500 font-medium">Tổng Sản Phẩm (Mã)</div>
          <div class="text-2xl font-bold text-gray-900">{{ totalProducts }}</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-4">
      <el-input 
        v-model="filters.keyword" 
        placeholder="Tìm kiếm sản phẩm, GTIN..." 
        clearable 
        class="w-64"
        icon="Search"
      />
      <el-select v-model="filters.warehouseId" placeholder="Tất cả kho" clearable class="w-48">
        <el-option v-for="w in uniqueWarehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
    </div>

    <!-- Data Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <el-table 
        v-loading="loading" 
        :data="filteredData" 
        style="width: 100%"
        :default-sort="{ prop: 'productName', order: 'ascending' }"
      >
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column prop="productName" label="Sản Phẩm" min-width="200" sortable>
          <template #default="{ row }">
            <div class="font-medium text-gray-900">{{ row.productName }}</div>
            <div class="text-xs text-gray-500">GTIN: {{ row.gtinCode || '---' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="warehouseName" label="Kho Hàng" min-width="150" sortable>
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.warehouseName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rawQuantity" label="Tồn Kho Thực Tế" width="150" align="right" sortable>
          <template #default="{ row }">
            <span class="font-bold">{{ row.rawQuantity }} kg</span>
          </template>
        </el-table-column>
        <el-table-column prop="reservedQuantity" label="Chờ Xuất Lệnh" width="140" align="right" sortable>
          <template #default="{ row }">
            <span :class="row.reservedQuantity > 0 ? 'text-orange-500' : 'text-gray-400'">
              {{ row.reservedQuantity }} kg
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="availableQuantity" label="Tồn Khả Dụng" width="150" align="right" sortable>
          <template #default="{ row }">
            <span class="font-bold text-green-600">{{ row.availableQuantity }} kg</span>
          </template>
        </el-table-column>
        <el-table-column prop="itemCount" label="Số Tem/Mã" width="120" align="right" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Box, Tickets, Lock, Collection } from '@element-plus/icons-vue';
import { inventoryApi } from '../api/inventoryApi';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const summaryData = ref<any[]>([]);

const filters = ref({
  keyword: '',
  warehouseId: ''
});

const loadSummary = async () => {
  loading.value = true;
  try {
    const { data } = await inventoryApi.getStockSummary();
    summaryData.value = data;
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Có lỗi tải dữ liệu tồn kho');
  } finally {
    loading.value = false;
  }
};

const uniqueWarehouses = computed(() => {
  const map = new Map<string, any>();
  for (const item of summaryData.value) {
    if (!map.has(item.warehouseId)) {
      map.set(item.warehouseId, { id: item.warehouseId, name: item.warehouseName });
    }
  }
  return Array.from(map.values());
});

const filteredData = computed(() => {
  return summaryData.value.filter(item => {
    let match = true;
    if (filters.value.warehouseId && item.warehouseId !== filters.value.warehouseId) {
      match = false;
    }
    if (filters.value.keyword) {
      const kw = filters.value.keyword.toLowerCase();
      const n = (item.productName || '').toLowerCase();
      const g = (item.gtinCode || '').toLowerCase();
      if (!n.includes(kw) && !g.includes(kw)) match = false;
    }
    return match;
  });
});

const totalQuantity = computed(() => {
  return filteredData.value.reduce((sum, i) => sum + i.rawQuantity, 0);
});

const reservedQuantity = computed(() => {
  return filteredData.value.reduce((sum, i) => sum + i.reservedQuantity, 0);
});

const availableQuantity = computed(() => {
  return filteredData.value.reduce((sum, i) => sum + i.availableQuantity, 0);
});

const totalProducts = computed(() => {
  const set = new Set(filteredData.value.map(i => i.productId));
  return set.size;
});

onMounted(() => {
  loadSummary();
});
</script>
