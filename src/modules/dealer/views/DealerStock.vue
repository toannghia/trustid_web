<template>
  <div class="dealer-stock p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Tồn kho Đại lý</h2>
      <el-button type="primary" @click="loadInventory">
        <el-icon class="mr-1"><Refresh /></el-icon>
        Làm mới
      </el-button>
    </div>

    <el-card>
      <el-table :data="inventory" style="width: 100%" v-loading="loading">
        <el-table-column prop="itemSerial" label="Mã Serial (QR)" width="250" />
        <el-table-column label="Số lượng" width="150" align="center">
          <template #default="{ row }">
            <el-tag type="info">{{ row.quantity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="Cập nhật lần cuối">
          <template #default="{ row }">
            {{ new Date(row.updatedAt || row.createdAt).toLocaleString('vi-VN') }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '@/common/utils/api';

const inventory = ref([]);
const loading = ref(false);

const loadInventory = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/dealer-dashboard/inventory');
    inventory.value = data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải tồn kho');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadInventory();
});
</script>
