<template>
  <div class="dealer-receive p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Nhận hàng từ Công ty / NSX</h2>
      <div class="flex items-center gap-4">
        <el-radio-group v-model="filterShowAll" @change="loadShipments">
          <el-radio-button :label="false">Chờ nhận</el-radio-button>
          <el-radio-button :label="true">Tất cả phiếu</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="loadShipments">
          <el-icon class="mr-1"><Refresh /></el-icon>
          Làm mới
        </el-button>
      </div>
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
                    <span class="font-bold">{{ scope.row.productName || scope.row.itemCode || scope.row.serialNumber || '---' }}</span>
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

        <el-table-column type="index" width="60" label="STT" align="center" />

        <el-table-column prop="trackingCode" label="Mã phiếu" width="180">
          <template #default="{ row }">
            <el-button link type="primary" class="font-mono font-bold" @click="showShipmentDetail(row.id)">
              {{ row.trackingCode }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="Kho xuất" width="200">
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
              v-if="row.status !== 'AT_DEALER'"
            >
              <el-icon class="mr-1"><Check /></el-icon> Xác nhận nhận
            </el-button>
            <el-tag v-else type="success"><el-icon><Check /></el-icon> Đã nhận</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- DETAIL DIALOG -->
    <el-dialog v-model="detailVisible" title="Thông tin Đơn hàng Chi tiết" width="800px" destroy-on-close>
        <div v-if="currentDetail" v-loading="detailLoading" class="p-2">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl mb-6">
                <div class="space-y-3">
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-500 text-sm">Mã vận đơn</span>
                        <span class="font-bold text-blue-700">{{ currentDetail.trackingCode }}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-500 text-sm">Loại hình</span>
                        <el-tag size="small">{{ currentDetail.type }}</el-tag>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-500 text-sm">Xe vận chuyển</span>
                        <span class="font-medium">{{ currentDetail.vehiclePlate || '---' }}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-500 text-sm">Lái xe</span>
                        <span class="font-medium">
                            <template v-if="currentDetail.externalDriverName">
                                {{ currentDetail.externalDriverName }}
                                <span v-if="currentDetail.externalDriverPhone" class="text-gray-400 text-xs ml-1">({{ currentDetail.externalDriverPhone }})</span>
                                <el-tag size="small" type="warning" class="ml-1">Thuê ngoài</el-tag>
                            </template>
                            <template v-else>
                                {{ currentDetail.sender?.fullName || '---' }}
                            </template>
                        </span>
                    </div>
                </div>
                <div class="space-y-3">
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-500 text-sm">Kho xuất</span>
                        <span class="font-medium capitalize">{{ currentDetail.sourceWarehouse?.name || '---' }}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-500 text-sm">Đích đến</span>
                        <span class="font-medium capitalize text-orange-600">{{ currentDetail.destinationWarehouse?.name || currentDetail.dealer?.name || '---' }}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                         <span class="text-gray-500 text-sm">Trạng thái</span>
                         <el-tag :type="getStatusType(currentDetail.status)">{{ getStatusLabel(currentDetail.status) }}</el-tag>
                    </div>
                </div>
                
                <div class="md:col-span-2 grid grid-cols-2 gap-4 border-t pt-4">
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3">
                        <div class="p-2 bg-blue-50 rounded-full text-blue-500 flex items-center justify-center">
                            <el-icon :size="20"><Calendar /></el-icon>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 mb-0.5">Lịch yêu cầu</div>
                            <div class="font-bold text-gray-800 text-sm">
                                {{ currentDetail.expectedDeliveryTime ? new Date(currentDetail.expectedDeliveryTime).toLocaleDateString('vi-VN') : (currentDetail.createdAt ? new Date(currentDetail.createdAt).toLocaleDateString('vi-VN') : '---') }}
                            </div>
                        </div>
                    </div>
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3">
                        <div class="p-2 rounded-full flex items-center justify-center" :class="currentDetail.endTime ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-400'">
                            <el-icon :size="20"><Clock /></el-icon>
                        </div>
                        <div class="flex-1">
                            <div class="text-xs text-gray-500 mb-0.5">Ngày thực hiện</div>
                            <div class="font-bold text-sm" :class="currentDetail.endTime ? 'text-green-600' : 'text-gray-400'">
                                {{ currentDetail.endTime ? new Date(currentDetail.endTime).toLocaleDateString('vi-VN') : 'Chưa hoàn tất' }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Expected Items Table (Always show if present) -->
            <div v-if="currentDetail.expectedItems?.length" class="mb-6">
                <h4 class="font-bold flex items-center gap-2 mb-3 text-gray-800">
                    <el-icon><Box /></el-icon>
                    Danh mục Hàng hóa
                </h4>
                <el-table :data="currentDetail.expectedItems" size="small" border class="rounded-lg overflow-hidden">
                    <el-table-column type="index" label="STT" width="60" align="center" />
                    <el-table-column label="Sản phẩm" prop="productName">
                        <template #default="{row}">
                            <div class="font-semibold">{{ row.productName || '---' }}</div>
                        </template>
                    </el-table-column>
                    <el-table-column label="Số lượng" prop="quantity" width="120" align="center">
                        <template #default="{row}">
                            <span class="font-bold text-blue-600">{{ row.quantity }}</span>
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <!-- Scanned Serial Items Table (Only show if there are actual scanned serials) -->
            <div v-if="currentDetail.items?.length && currentDetail.items.some((i: any) => i.serialNumber)" class="mb-6">
                <h4 class="font-bold flex items-center gap-2 mb-3 text-gray-800">
                    <el-icon><FullScreen /></el-icon>
                    Chi tiết Mã quét / Serial
                </h4>
                <el-table :data="currentDetail.items" size="small" border class="rounded-lg overflow-hidden">
                    <el-table-column type="index" label="STT" width="60" align="center" />
                    <el-table-column label="Sản phẩm / Serial" prop="serialNumber">
                        <template #default="{row}">
                            <div class="font-mono text-xs">{{ row.serialNumber }}</div>
                            <div class="text-[9px] text-gray-400">Mã gốc: {{ row.itemCode }}</div>
                        </template>
                    </el-table-column>
                    <el-table-column label="Lô SX" prop="batchId" width="120">
                        <template #default="{row}">{{ row.batchId?.substring(0,8) }}</template>
                    </el-table-column>
                    <el-table-column label="P/P Quét" width="100" align="center">
                        <template #default="{row}">
                            <el-tag size="mini" :type="row.scanMethod === 'BOX' ? 'warning' : 'success'">{{ row.scanMethod }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="Thời gian" prop="scannedAt" width="150">
                        <template #default="{row}">{{ row.scannedAt ? new Date(row.scannedAt).toLocaleTimeString() : '-' }}</template>
                    </el-table-column>
                </el-table>
            </div>

            <div v-if="!currentDetail.expectedItems?.length && !(currentDetail.items?.length && currentDetail.items.some((i: any) => i.serialNumber))" class="mb-6">
                <el-empty description="Không có hàng hóa" />
            </div>

            <h4 class="font-bold flex items-center gap-2 mb-4 text-gray-800 border-t pt-4">
                <el-icon><Memo /></el-icon>
                Lịch sử hành trình
            </h4>
            <el-timeline v-if="timelineEvents.length" class="ml-2">
                <el-timeline-item
                    v-for="(event, idx) in timelineEvents"
                    :key="idx"
                    :timestamp="event.time.toLocaleString('vi-VN')"
                    :type="event.type"
                >
                    <div class="text-sm font-bold text-gray-800">{{ event.title }}</div>
                    <div class="text-xs text-gray-500 mt-1">
                        {{ event.description }}
                    </div>
                </el-timeline-item>
            </el-timeline>
            <div v-else class="text-xs text-gray-400 italic ml-2">Chưa có thông tin lịch trình</div>
        </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Refresh, Check, Box, FullScreen, Memo, Calendar, Clock } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const shipments = ref<any[]>([]);
const loading = ref(false);
const confirmingId = ref<string | null>(null);

// Filters & Detailed Dialog State
const filterShowAll = ref(false);
const detailVisible = ref(false);
const detailLoading = ref(false);
const currentDetail = ref<any>(null);

const timelineEvents = computed(() => {
  if (!currentDetail.value) return [];
  const events: any[] = [];

  // 1. Synthesize Creation (Khởi tạo phiếu)
  if (currentDetail.value.createdAt) {
    events.push({
      time: new Date(currentDetail.value.createdAt),
      title: 'Khởi tạo phiếu',
      description: `Tạo bởi: ${currentDetail.value.createdByRole || 'Hệ thống'}`,
      type: 'info'
    });
  }

  // 2. Synthesize Start Time (Bắt đầu vận chuyển)
  if (currentDetail.value.startTime) {
    events.push({
      time: new Date(currentDetail.value.startTime),
      title: 'Bắt đầu vận chuyển',
      description: currentDetail.value.vehiclePlate ? `Xe: ${currentDetail.value.vehiclePlate}` : 'Đã giao cho tài xế',
      type: 'primary'
    });
  }

  // 3. Add Handshake Logs
  if (currentDetail.value.logs && currentDetail.value.logs.length > 0) {
    currentDetail.value.logs.forEach((log: any) => {
      let actionLabel = log.action;
      if (log.action === 'DRIVER_RECEIVE') actionLabel = 'Tài xế xác nhận nhận hàng';
      else if (log.action === 'DRIVER_DELIVER') actionLabel = 'Tài xế xác nhận giao hàng';
      else if (log.action === 'DEALER_CONFIRM') actionLabel = 'Đại lý xác nhận nhận hàng';
      else if (log.action === 'RECEIVER_CONFIRM') actionLabel = 'Người nhận xác nhận';

      events.push({
        time: new Date(log.actionTime),
        title: actionLabel,
        description: `Vị trí GPS: ${log.lat || '---'}, ${log.long || '---'}`,
        type: log.action === 'DEALER_CONFIRM' || log.action === 'RECEIVER_CONFIRM' ? 'success' : 'primary'
      });
    });
  }

  // 4. Synthesize End Time (Hoàn thành giao hàng)
  if (currentDetail.value.endTime) {
    events.push({
      time: new Date(currentDetail.value.endTime),
      title: 'Hoàn thành giao hàng',
      description: 'Người nhận đã xác nhận nhận đủ hàng',
      type: 'success'
    });
  }

  return events;
});

const loadShipments = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/shipments-v2/pending-receive', {
      params: { all: filterShowAll.value }
    });
    shipments.value = data.map((s: any) => ({
      ...s,
      loadingDetails: false,
      items: null, // to be fetched on expand
    }));
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải danh sách phiếu giao hàng');
  } finally {
    loading.value = false;
  }
};

const showShipmentDetail = async (id: string) => {
  detailVisible.value = true;
  detailLoading.value = true;
  currentDetail.value = null;
  try {
    const { data } = await api.get(`/shipments-v2/${id}`);
    currentDetail.value = data;
  } catch (error: any) {
    ElMessage.error('Không thể tải chi tiết phiếu giao hàng');
  } finally {
    detailLoading.value = false;
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
