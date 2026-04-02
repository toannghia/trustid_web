<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Danh sách Sản phẩm Active</h1>
       <div class="flex gap-2">
           <el-input v-model="searchSerial" placeholder="Tìm theo số serial..." @keyup.enter="loadItems" clearable class="w-64">
                <template #prefix><el-icon><Search /></el-icon></template>
           </el-input>
           <el-button type="primary" @click="loadItems">Tìm kiếm</el-button>
       </div>
    </div>

    <el-table :data="items" border stripe style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
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
                <el-tag type="success">{{ row.status }}</el-tag>
            </template>
        </el-table-column>
    </el-table>
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

const loadItems = async () => {
    try {
        const { data } = await supplyApi.getAllItems({ 
            status: 'ACTIVE',
            serial: searchSerial.value 
        });
        items.value = data;
    } catch (err: any) {
        ElMessage.error('Lỗi tải danh sách');
    }
}

const formatDate = (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm');

onMounted(() => {
   loadItems(); 
});
</script>
