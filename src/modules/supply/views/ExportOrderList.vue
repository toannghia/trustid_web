<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Danh sách Lệnh Xuất Kho</h1>
      <el-button type="primary" icon="Plus" @click="router.push('/supply/export-order/new')">
        Tạo lệnh xuất mới
      </el-button>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-4">
      <el-select v-model="filters.status" placeholder="Trạng thái lệnh" clearable @change="fetchOrders">
        <el-option label="Bản nháp (DRAFT)" value="DRAFT" />
        <el-option label="Đã xác nhận (CONFIRMED)" value="CONFIRMED" />
        <el-option label="Đang lấy hàng (PICKING)" value="PICKING" />
        <el-option label="Đã xuất kho (EXPORTED)" value="EXPORTED" />
        <el-option label="Đã hủy (CANCELLED)" value="CANCELLED" />
      </el-select>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <el-table v-loading="loading" :data="orders" style="width: 100%">
        <el-table-column prop="orderCode" label="Mã Lệnh Xuất" width="180">
          <template #default="{ row }">
            <a href="#" @click.prevent="openDetail(row.id)" class="font-bold text-blue-600 block hover:underline">{{ row.orderCode }}</a>
            <span class="text-xs text-gray-400 block">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Mức ưu tiên" width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.priority === 'HIGH' ? 'danger' : row.priority === 'MEDIUM' ? 'warning' : 'info'"
              size="small"
            >
              {{ row.priority }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Liên kết" min-width="150">
          <template #default="{ row }">
            <div class="text-sm font-semibold text-gray-800">{{ getDealerName(row.dealerId) }}</div>
            <div class="text-xs text-gray-500 mt-1" title="Kho xuất">
              Kho: {{ getWarehouseName(row.sourceWarehouseId) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Tiến độ" width="140">
          <template #default="{ row }">
            <el-progress 
              :percentage="calculateProgress(row.items)" 
              :color="getProgressColor(row.status)"
              :stroke-width="12"
            />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Trạng thái" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status).type" effect="dark">
              {{ getStatusTag(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="120" align="center">
          <template #default="{ row }">
            <el-dropdown trigger="click">
              <el-button type="info" text icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="row.status === 'DRAFT'" @click="confirmOrder(row.id)">Xác nhận phiếu</el-dropdown-item>
                  <el-dropdown-item v-if="row.status === 'DRAFT'" @click="cancelOrder(row.id)">Hủy phiếu</el-dropdown-item>
                  <el-dropdown-item v-if="['CONFIRMED', 'PICKING'].includes(row.status)" @click="goToScan(row.id)">Thực hiện Xuất Kho</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Chi Tiết Dialog -->
    <el-dialog v-model="showDetail" :title="`Chi tiết Lệnh Xuất: ${selectedOrder?.orderCode}`" width="700px">
        <div v-if="selectedOrder" class="space-y-4">
            <el-descriptions border :column="2">
                <el-descriptions-item label="Trạng thái">
                    <el-tag :type="getStatusTag(selectedOrder.status).type">{{ getStatusTag(selectedOrder.status).label }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="Ngày tạo">{{ formatDate(selectedOrder.createdAt) }}</el-descriptions-item>
                <el-descriptions-item label="Đại lý">{{ getDealerName(selectedOrder.dealerId) }}</el-descriptions-item>
                <el-descriptions-item label="Kho xuất">{{ getWarehouseName(selectedOrder.sourceWarehouseId) }}</el-descriptions-item>
                <el-descriptions-item label="Mức ưu tiên" :span="2">
                    <el-tag :type="selectedOrder.priority === 'HIGH' ? 'danger' : selectedOrder.priority === 'MEDIUM' ? 'warning' : 'info'" size="small">
                      {{ selectedOrder.priority }}
                    </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="Ghi chú" :span="2">{{ selectedOrder.notes || 'Không có ghi chú' }}</el-descriptions-item>
            </el-descriptions>

            <h4 class="font-bold text-gray-700 mt-4">Danh sách sản phẩm xuất</h4>
            <el-table :data="selectedOrder.items" border size="small">
                <el-table-column prop="product.name" label="Sản phẩm" />
                <el-table-column prop="expectedQuantity" label="Yêu cầu" width="100" align="center" />
                <el-table-column prop="scannedQuantity" label="Đã lấy" width="100" align="center" />
                <el-table-column prop="notes" label="Ghi chú" />
            </el-table>
        </div>
        <template #footer>
            <el-button @click="showDetail = false">Đóng</el-button>
            <el-button v-if="['CONFIRMED', 'PICKING'].includes(selectedOrder?.status)" type="primary" @click="goToScan(selectedOrder.id)">
                Xử lý kho
            </el-button>
        </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { exportOrderApi } from '../api/exportOrderApi';
import { dealerApi } from '../api/dealerApi';
import { transportApi } from '../api/transportApi';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { MoreFilled, Plus } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const router = useRouter();
const loading = ref(false);
const orders = ref<any[]>([]);

const filters = ref({
  status: ''
});

const dealers = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const showDetail = ref(false);
const selectedOrder = ref<any>(null);

const loadMasterData = async () => {
  try {
    const [dRes, wRes] = await Promise.all([
      dealerApi.getList(),
      transportApi.getWarehouses()
    ]);
    dealers.value = dRes.data;
    warehouses.value = wRes.data;
  } catch (e) {}
};

const getDealerName = (id: string) => {
  const d = dealers.value.find(x => x.id === id);
  return d ? d.name : id;
};

const getWarehouseName = (id: string) => {
  if (!id) return '(Chưa gán)';
  const w = warehouses.value.find(x => x.id === id);
  return w ? w.name : id;
};

const fetchOrders = async () => {
  loading.value = true;
  try {
    const { data } = await exportOrderApi.getOrders(filters.value);
    orders.value = data;
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi tải danh sách lệnh');
  } finally {
    loading.value = false;
  }
};

const openDetail = async (id: string) => {
  try {
    const { data } = await exportOrderApi.getDetail(id);
    selectedOrder.value = data;
    showDetail.value = true;
  } catch(e) {
    ElMessage.error('Lỗi tải chi tiết lệnh');
  }
};

const confirmOrder = async (id: string) => {
  try {
      await ElMessageBox.confirm('Bạn có chắc chắn muốn xác nhận lệnh xuất này?', 'Xác nhận', { type: 'warning' });
      await exportOrderApi.confirm(id);
      ElMessage.success('Xác nhận lệnh xuất thành công');
      fetchOrders();
  } catch (e: any) {
      if (e !== 'cancel') ElMessage.error(e.response?.data?.message || 'Lỗi xác nhận');
  }
};

const cancelOrder = async (id: string) => {
  try {
      await ElMessageBox.confirm('Hủy lệnh xuất này?', 'Xác nhận hủy', { type: 'error' });
      await exportOrderApi.cancel(id);
      ElMessage.success('Đã hủy lệnh xuất');
      fetchOrders();
  } catch (e: any) {
      if (e !== 'cancel') ElMessage.error(e.response?.data?.message || 'Lỗi hủy');
  }
};

const goToScan = (id: string) => {
  router.push({ path: '/supply/export-fulfill', query: { orderId: id } });
};

const formatDate = (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm');

const calculateProgress = (items: any[]) => {
  if (!items || items.length === 0) return 0;
  const expected = items.reduce((sum, item) => sum + item.expectedQuantity, 0);
  const scanned = items.reduce((sum, item) => sum + item.scannedQuantity, 0);
  if (expected === 0) return 0;
  return Math.min(100, Math.round((scanned / expected) * 100));
};

const getProgressColor = (status: string) => {
  if (status === 'EXPORTED') return '#10b981'; // green
  if (status === 'PICKING') return '#f59e0b'; // yellow
  return '#94a3b8'; // gray
};

const getStatusTag = (status: string) => {
  const map: Record<string, { label: string, type: string }> = {
    'DRAFT': { label: 'Bản nháp', type: 'info' },
    'CONFIRMED': { label: 'Đã xác nhận', type: 'primary' },
    'PICKING': { label: 'Đang lấy', type: 'warning' },
    'EXPORTED': { label: 'Đã xuất kho', type: 'success' },
    'CANCELLED': { label: 'Đã hủy', type: 'danger' },
  };
  return map[status] || { label: status, type: 'info' };
};

onMounted(() => {
  loadMasterData();
  fetchOrders();
});
</script>
