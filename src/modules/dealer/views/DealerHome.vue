<template>
  <div class="dealer-home p-6">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Tổng quan Đại lý</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <el-card class="box-card" shadow="hover">
        <template #header>
          <div class="card-header flex justify-between items-center">
            <span>Tổng tồn kho</span>
            <el-icon class="text-blue-500" :size="20"><Box /></el-icon>
          </div>
        </template>
        <div class="text-3xl font-bold text-gray-800">{{ stats.currentStock || 0 }}</div>
      </el-card>

      <el-card class="box-card" shadow="hover">
        <template #header>
          <div class="card-header flex justify-between items-center">
            <span>Đơn bán lẻ</span>
            <el-icon class="text-green-500" :size="20"><ShoppingCart /></el-icon>
          </div>
        </template>
        <div class="text-3xl font-bold text-gray-800">{{ stats.totalSales || 0 }}</div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Box, ShoppingCart } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '@/common/utils/api';

const stats = ref({
  currentStock: 0,
  totalSales: 0
});

const loadStats = async () => {
  try {
    const { data } = await api.get('/dealer-dashboard/stats');
    stats.value = data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải thống kê đại lý');
  }
};

onMounted(() => {
  loadStats();
});
</script>

<style scoped>
.box-card {
  border-radius: 8px;
}
.card-header {
  font-weight: 500;
  color: #606266;
}
</style>
