<template>
  <div class="dealer-receive p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Nhận hàng từ NSX</h2>
      <el-button type="primary" @click="loadShipments">
        <el-icon class="mr-1"><Refresh /></el-icon>
        Làm mới
      </el-button>
    </div>

    <el-card>
      <el-table :data="shipments" style="width: 100%" v-loading="loading">
        <el-table-column prop="trackingCode" label="Mã phiếu" width="180" />
        <el-table-column label="Kho xuất" width="200">
          <template #default="{ row }">
            {{ row.sourceWarehouse?.name || 'N/A' }}
          </template>
        </el-table-column>
        <el-table-column prop="expectedDeliveryTime" label="Ngày dự kiến">
          <template #default="{ row }">
            {{ row.expectedDeliveryTime ? new Date(row.expectedDeliveryTime).toLocaleDateString('vi-VN') : 'Không có' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Trạng thái" width="150">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="150" align="center">
          <template #default="{ row }">
            <el-button 
              type="success" 
              size="small" 
              @click="confirmReceive(row)"
              :loading="confirmingId === row.id"
              v-if="row.status !== 'AT_DEALER'"
            >
              Xác nhận nhận
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const shipments = ref([]);
const loading = ref(false);
const confirmingId = ref<string | null>(null);

const loadShipments = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/shipments-v2/pending-receive');
    shipments.value = data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải danh sách phiếu chờ');
  } finally {
    loading.value = false;
  }
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'CREATED': return 'info';
    case 'SCANNING': return 'warning';
    case 'READY': return 'primary';
    case 'IN_TRANSIT': return 'warning';
    case 'DELIVERED': return 'success';
    default: return 'info';
  }
};

const confirmReceive = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `Bạn xác nhận đã nhận đủ hàng cho phiếu ${row.trackingCode}?`,
      'Xác nhận nhận hàng',
      {
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy',
        type: 'warning',
      }
    );

    confirmingId.value = row.id;
    await api.post(`/shipments-v2/${row.id}/confirm-receive`);
    ElMessage.success('Xác nhận nhận hàng thành công');
    loadShipments();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || 'Lỗi khi xác nhận nhận hàng');
    }
  } finally {
    confirmingId.value = null;
  }
};

onMounted(() => {
  loadShipments();
});
</script>
