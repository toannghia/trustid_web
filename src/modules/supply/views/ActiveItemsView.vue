<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Danh sách Sản phẩm Active</h1>
       <div class="flex gap-2">
           <el-input 
             v-model="searchSerial" 
             placeholder="Tìm theo số serial..." 
             @input="debouncedSearch" 
             @keyup.enter="handleFilterChange" 
             clearable 
             class="w-64"
           >
                <template #prefix><el-icon><Search /></el-icon></template>
           </el-input>
           <el-button type="primary" @click="handleFilterChange">Tìm kiếm</el-button>
       </div>
    </div>

    <!-- Count summary -->
    <div class="flex items-center justify-between mb-4">
      <span class="text-gray-500 text-sm">
        Tổng số: <strong>{{ totalItems }}</strong> sản phẩm đã kích hoạt
      </span>
    </div>

    <el-card shadow="hover" class="mb-6">
      <el-table :data="items" v-loading="loading" border stripe style="width: 100%">
          <el-table-column label="STT" width="60" align="center">
            <template #default="{ $index }">
              {{ (currentPage - 1) * pageSize + $index + 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="fullQrCode" label="QR Code (Hex)" min-width="200" show-overflow-tooltip sortable />
          <!-- <el-table-column prop="serialNumber" label="Serial" width="150" sortable /> -->
          <el-table-column prop="parentCode" label="Mã Thùng" width="150" />
          <el-table-column label="Lô SX" width="200">
               <template #default="{row}">
                   {{ row.batch?.batchCode }}
               </template>
          </el-table-column>
          <el-table-column label="Sản phẩm" min-width="200">
               <template #default="{row}">
                   <div v-if="row.batch">
                       <div class="font-bold">{{ row.batch.product ? row.batch.product.name : '---' }}</div>
                       <div class="text-xs text-gray-500">{{ row.batch.productGtin }}</div>
                   </div>
               </template>
          </el-table-column>
          <el-table-column label="Thời gian kích hoạt" width="180">
               <template #default="{row}">
                   {{ formatDate(row.activatedAt) }}
               </template>
          </el-table-column>
          <el-table-column label="Trạng thái" width="100" align="center">
              <template #default="{row}">
                  <el-tag type="success">{{ row.status === 'ACTIVE' ? 'Đã kích hoạt' : row.status === 'INACTIVE' ? 'Chưa kích hoạt' : row.status === 'AT_DEALER' ? 'Tại đại lý' : row.status === 'SOLD' ? 'Đã bán' : row.status }}</el-tag>
              </template>
          </el-table-column>
      </el-table>

      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalItems"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { supplyApi } from '../api/supplyApi';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';

const items = ref<any[]>([]);
const searchSerial = ref('');
const loading = ref(false);

const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);

const loadItems = async () => {
    loading.value = true;
    try {
        const { data } = await supplyApi.getAllItems({ 
            status: 'ACTIVE',
            serial: searchSerial.value,
            page: currentPage.value,
            limit: pageSize.value
        });
        items.value = data.data || [];
        totalItems.value = data.total || 0;
    } catch (err: any) {
        ElMessage.error('Lỗi tải danh sách');
    } finally {
        loading.value = false;
    }
}

let debounceTimer: any = null;
const debouncedSearch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    handleFilterChange();
  }, 300);
};

const handleFilterChange = () => {
  currentPage.value = 1;
  loadItems();
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
  loadItems();
};

const handlePageChange = (val: number) => {
  currentPage.value = val;
  loadItems();
};

const formatDate = (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm');

onMounted(() => {
   loadItems(); 
});
</script>
