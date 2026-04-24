<template>
  <div class="dealer-receive p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Nhận hàng từ Công ty / NSX</h2>
      <el-button type="primary" @click="loadShipments">
        <el-icon class="mr-1"><Refresh /></el-icon>
        Làm mới
      </el-button>
    </div>

    <el-card shadow="hover">
      <el-table 
        :data="shipments" 
        style="width: 100%" 
        v-loading="loading"
        row-key="id"
        @expand-change="handleExpand"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="px-8 py-4 bg-gray-50 border-t border-b" v-loading="row.loadingDetails">
              <div class="font-bold text-sm text-gray-700 mb-2">Chi tiết danh sách sản phẩm:</div>
              <el-table :data="row.items || []" size="small" border style="width: 100%" max-height="300">
                <el-table-column type="index" width="50" label="STT" />
                <el-table-column label="Sản phẩm">
                  <template #default="scope">
                    <span class="font-bold">{{ scope.row.productName || scope.row.itemSerial || '---' }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="Số lượng" width="100" align="center">
                  <template #default="scope">
                    <span class="font-bold text-blue-600">{{ scope.row.quantity || 1 }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="Trạng thái" width="150" />
              </el-table>
              <div v-if="!row.items || row.items.length === 0" class="text-sm text-gray-500 mt-2">
                Không có dữ liệu sản phẩm cho phiếu này.
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="trackingCode" label="Mã phiếu" width="180">
          <template #default="{ row }">
            <span class="font-mono font-bold text-blue-600">{{ row.trackingCode }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Kho xuất xuất" width="200">
          <template #default="{ row }">
            {{ row.sourceWarehouse?.name || 'Công ty phát hành' }}
          </template>
        </el-table-column>
        <el-table-column prop="expectedDeliveryTime" label="Ngày giao dự kiến">
          <template #default="{ row }">
            {{ row.expectedDeliveryTime ? new Date(row.expectedDeliveryTime).toLocaleDateString('vi-VN') : '---' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Trạng thái" width="150" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="dark">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="success" 
              @click="confirmReceive(row)"
              :loading="confirmingId === row.id"
              v-if="row.status !== 'AT_DEALER' && row.status !== 'DELIVERED'"
            >
              <el-icon class="mr-1"><Check /></el-icon> Xác nhận nhận
            </el-button>
            <el-tag v-else type="success"><el-icon><Check /></el-icon> Đã nhận</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh, Check } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const shipments = ref<any[]>([]);
const loading = ref(false);
const confirmingId = ref<string | null>(null);

const loadShipments = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/shipments-v2/pending-receive');
    shipments.value = data.map((s: any) => ({
      ...s,
      loadingDetails: false,
      items: null, // to be fetched on expand
    }));
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải danh sách phiếu chờ');
  } finally {
    loading.value = false;
  }
};

const handleExpand = async (row: any, expandedRows: any[]) => {
  const isExpanded = expandedRows.some(r => r.id === row.id);
  
  if (isExpanded && !row.items) {
    row.loadingDetails = true;
    try {
      const { data } = await api.get(`/shipments-v2/${row.id}`);
      row.items = data.items;
    } catch (error: any) {
      ElMessage.error('Lỗi tải chi tiết sản phẩm của phiếu giao');
      row.items = [];
    } finally {
      row.loadingDetails = false;
    }
  }
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'CREATED': return 'info';
    case 'SCANNING': return 'warning';
    case 'READY': return 'primary';
    case 'WAITING_DRIVER': return 'warning';
    case 'IN_TRANSIT': return 'warning';
    case 'PENDING_DEALER_CONFIRM': return 'info';
    case 'DELIVERED': return 'success';
    case 'AT_DEALER': return 'success';
    default: return 'info';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'CREATED': return 'Mới tạo';
    case 'SCANNING': return 'Đang quét';
    case 'READY': return 'Sẵn sàng';
    case 'WAITING_DRIVER': return 'Chờ tài xế nhận';
    case 'IN_TRANSIT': return 'Đang vận chuyển';
    case 'PENDING_DEALER_CONFIRM': return 'Chờ xác nhận nhận';
    case 'DELIVERED': return 'Tài xế đã giao';
    case 'AT_DEALER': return 'Đã nhận vào kho';
    default: return status;
  }
};

const confirmReceive = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `Xác nhận bạn đã nhận đủ danh sách mã Serial cho phiếu ${row.trackingCode}? Hệ thống sẽ tự động nhập hàng vào kho của đại lý.`,
      'Nhận hàng vào kho',
      {
        confirmButtonText: 'Đồng ý nhận',
        cancelButtonText: 'Hủy',
        type: 'warning',
      }
    );

    confirmingId.value = row.id;
    await api.post(`/shipments-v2/${row.id}/confirm-receive`);
    ElMessage.success('Đã nhận kho thành công! Sản phẩm đã nằm trong Tồn Kho.');
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
