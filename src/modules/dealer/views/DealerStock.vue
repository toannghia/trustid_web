<template>
  <div class="dealer-stock p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Tồn Kho Đại Lý</h2>
      <div class="flex gap-2">
        <el-input 
          v-model="searchQuery" 
          placeholder="Tìm sản phẩm..." 
          prefix-icon="Search" 
          clearable 
          class="w-64"
        />
        <el-button type="primary" @click="loadInventory" :loading="loading">
          <el-icon class="mr-1"><Refresh /></el-icon>Làm mới
        </el-button>
      </div>
    </div>

    <el-card shadow="hover">
      <el-table 
        :data="filteredInventory" 
        style="width: 100%" 
        v-loading="loading"
        row-key="productId"
        :expand-row-keys="expandedKeys"
        @expand-change="handleExpand"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="px-8 py-4 bg-gray-50 border-t border-b">
              <div class="flex justify-between mb-2">
                <span class="font-bold text-sm text-gray-700">Chi tiết Mã Serial ({{ row.serials.length }})</span>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                <div v-for="item in row.serials" :key="item.serialNumber" class="bg-white border rounded px-2 py-1 flex items-center justify-between text-xs">
                  <span class="font-mono text-gray-600">{{ item.serialNumber }}</span>
                  <el-tag :type="item.status === 'AT_DEALER' ? 'success' : 'warning'" size="small">
                    {{ item.status === 'AT_DEALER' ? 'Có sẵn' : item.status }}
                  </el-tag>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column type="index" width="60" label="STT" />
        <el-table-column prop="productName" label="Sản phẩm" class-name="font-semibold" />
        <el-table-column prop="quantity" label="Số lượng tồn" width="200" align="center">
          <template #default="{ row }">
            <el-badge :value="row.quantity" class="mt-1" type="primary" />
          </template>
        </el-table-column>
        <el-table-column label="Trạng thái phân phối" width="200" align="center">
          <template #default>
            <el-tag type="success">Sẵn sàng bán lẻ</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '@/common/utils/api';

const loading = ref(false);
const inventory = ref<any[]>([]);
const searchQuery = ref('');
const expandedKeys = ref<string[]>([]);

const filteredInventory = computed(() => {
  if (!searchQuery.value) return inventory.value;
  const lower = searchQuery.value.toLowerCase();
  return inventory.value.filter(i => i.productName.toLowerCase().includes(lower));
});

const loadInventory = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/dealer-dashboard/inventory');
    inventory.value = data;
    
    // Auto-expand first item if any
    if (data.length > 0) {
      expandedKeys.value = [data[0].productId];
    } else {
      expandedKeys.value = [];
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải danh sách tồn kho');
  } finally {
    loading.value = false;
  }
};

const handleExpand = (row: any, expandedRows: any[]) => {
  expandedKeys.value = expandedRows.map(r => r.productId);
};

onMounted(() => {
  loadInventory();
});
</script>

<style scoped>
:deep(.el-table__expanded-cell) {
  padding: 0 !important;
}
</style>
