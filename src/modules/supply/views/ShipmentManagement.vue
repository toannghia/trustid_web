<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Refresh, Search, Van, OfficeBuilding, FullScreen, Plus, User, Box, Memo, Calendar, Clock } from '@element-plus/icons-vue';
import { transportApi } from '../api/transportApi';
import { shipmentV2Api } from '../api/shipmentV2Api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { shipmentTypeLabel, scanMethodLabel } from '@/common/utils/status-labels';
import { useAuthStore } from '@/modules/core/store/auth';
import ShipmentScanDialog from '../components/ShipmentScanDialog.vue';

const authStore = useAuthStore();
const loading = ref(false);
const detailVisible = ref(false);
const detailLoading = ref(false);
const showScanDialog = ref(false);
const shipments = ref<any[]>([]);
const currentDetail = ref<any>(null);
const selectedShipmentForScan = ref<any>(null);

const statusFilter = ref('');
const search = ref('');

const canAction = computed(() => {
    const role = authStore.user?.role || '';
    return ['ADMIN', 'TENANT_ADMIN', 'DRIVER', 'WAREHOUSE_MANAGER', 'ACCOUNTANT'].includes(role);
});

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

    // Deduplicate same-step events if timestamps are identical, sort chronologically
    const seen = new Set<string>();
    return events
        .filter(event => {
            const key = `${event.title}_${event.time.getTime()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => a.time.getTime() - b.time.getTime());
});

const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

onMounted(() => {
    loadShipments();
});

const loadShipments = async () => {
    loading.value = true;
    try {
        const res = await shipmentV2Api.getShipments({
            status: statusFilter.value || undefined,
            search: search.value || undefined,
            page: currentPage.value,
            limit: pageSize.value,
            type: undefined
        });
        const data = res.data;
        if (data && Array.isArray(data)) {
            shipments.value = data;
            total.value = data.length;
        } else {
            shipments.value = data.items || [];
            total.value = data.pagination?.total || 0;
        }
    } catch (e) { ElMessage.error('Lỗi tải danh sách vận chuyển'); }
    finally { loading.value = false; }
};

const handleFilterChange = () => {
    currentPage.value = 1;
    loadShipments();
};

const handleSizeChange = (val: number) => {
    pageSize.value = val;
    currentPage.value = 1;
    loadShipments();
};

const handlePageChange = (val: number) => {
    currentPage.value = val;
    loadShipments();
};

const viewDetail = async (row: any) => {
    detailVisible.value = true;
    detailLoading.value = true;
    try {
        const res = await shipmentV2Api.getDetail(row.id);
        currentDetail.value = res.data;
    } catch (e) { ElMessage.error('Lỗi tải chi tiết'); }
    finally { detailLoading.value = false; }
};

const handleScan = (row: any) => {
    selectedShipmentForScan.value = row;
    showScanDialog.value = true;
};

const getStatusType = (status: string) => {
    switch (status) {
        case 'CREATED': return 'info';
        case 'WAITING_DRIVER': return 'warning';
        case 'READY_FOR_PICKUP': return 'warning';
        case 'IN_TRANSIT': return 'primary';
        case 'PENDING_DEALER_CONFIRM': return 'info';
        case 'DELIVERED': return 'success';
        case 'CANCELLED': return 'danger';
        default: return '';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'CREATED': return 'Chờ quét hàng';
        case 'WAITING_DRIVER': return 'Chờ tài xế nhận';
        case 'READY_FOR_PICKUP': return 'Sẵn sàng giao';
        case 'IN_TRANSIT': return 'Đang vận chuyển';
        case 'PENDING_DEALER_CONFIRM': return 'Chờ đại lý xác nhận';
        case 'DELIVERED': return 'Đã hoàn thành';
        case 'CANCELLED': return 'Đã hủy';
        default: return status;
    }
};

const driverReceive = async () => {
    try {
        await ElMessageBox.confirm('Tài xế xác nhận đã nhận hàng lên xe?', 'Xác nhận');
        await transportApi.handshake({
            shipment_id: currentDetail.value.id,
            action: 'DRIVER_RECEIVE',
            lat: 21.0285, long: 105.8542 // Mock
        });
        ElMessage.success('Xe đã bắt đầu vận chuyển');
        detailVisible.value = false;
        loadShipments();
    } catch (e) { if (e !== 'cancel') ElMessage.error('Lỗi xác nhận'); }
};

const receiverConfirm = async () => {
    try {
        await ElMessageBox.confirm('Xác nhận đã nhận đủ hàng và hoàn tất phiếu?', 'Nhập kho / Giao hàng');
        // Use the new V2 confirmReceive endpoint for multi-warehoue logic
        await shipmentV2Api.confirmReceive(currentDetail.value.id);
        ElMessage.success('Đã xác nhận thành công');
        detailVisible.value = false;
        loadShipments();
    } catch (e: any) { 
        if (e !== 'cancel') ElMessage.error('Lỗi xác nhận: ' + (e.response?.data?.message || e.message)); 
    }
};
</script>

<template>
  <div class="shipment-management p-6 pb-20">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Điều phối & Phân phối Hàng hóa</h1>
       <div class="flex space-x-2">
         <el-button v-if="['ADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'].includes(authStore.user?.role || '')" type="primary" :icon="Plus" @click="$router.push('/supply/export-order')">Tạo lệnh xuất mới</el-button>
         <el-button @click="loadShipments" :icon="Refresh">Làm mới</el-button>
       </div>
    </div>

    <!-- FILTERS -->
    <div class="mb-4 flex flex-wrap gap-4 items-center">
        <el-radio-group v-model="statusFilter" @change="handleFilterChange">
            <el-radio-button label="">Tất cả</el-radio-button>
            <el-radio-button label="CREATED">Mới tạo</el-radio-button>
            <el-radio-button label="READY_FOR_PICKUP">Sẵn sàng giao</el-radio-button>
            <el-radio-button label="IN_TRANSIT">Đang đi</el-radio-button>
            <el-radio-button label="DELIVERED">Hoàn thành</el-radio-button>
        </el-radio-group>
        <el-input v-model="search" placeholder="Mã vận đơn..." class="w-64" prefix-icon="Search" clearable @input="handleFilterChange" />
    </div>

    <!-- TABLE -->
    <el-table :data="shipments" v-loading="loading" border stripe style="width: 100%" class="rounded-xl overflow-hidden shadow-sm">
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">
            {{ (currentPage - 1) * pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="trackingCode" label="Vận đơn" width="160">
            <template #default="{row}">
                <div class="font-mono font-bold text-blue-600 cursor-pointer hover:underline" @click="viewDetail(row)">{{ row.trackingCode }}</div>
                <div class="text-[10px] text-gray-400 mt-0.5">{{ row.id.substring(0, 8) }}...</div>
            </template>
        </el-table-column>
        <el-table-column label="Loại" width="140">
             <template #default="{row}">
                 <el-tag :type="row.type === 'DEALER_EXPORT' ? 'warning' : 'info'" size="small" effect="dark">
                    {{ row.type === 'DEALER_EXPORT' ? 'Xuất Đại lý' : 'Nội bộ' }}
                 </el-tag>
             </template>
        </el-table-column>
        <el-table-column prop="status" label="Trạng thái" width="140">
            <template #default="{row}">
                <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
            </template>
        </el-table-column>
        <el-table-column label="Thông tin Lộ trình">
            <template #default="{row}">
                <div class="text-xs">
                    <div class="flex items-center gap-2">
                        <span class="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">{{ row.sourceWarehouse?.name || '---' }}</span>
                        <span class="text-gray-400">➔</span>
                        <span v-if="row.type === 'INTERNAL_TRANSFER'" class="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-medium">{{ row.destinationWarehouse?.name || '---' }}</span>
                        <span v-else class="bg-orange-50 px-1.5 py-0.5 rounded text-orange-700 font-medium flex items-center gap-1">
                            <el-icon><User /></el-icon>
                            {{ row.dealer?.name || '---' }}
                        </span>
                    </div>
                    <div class="flex items-center mt-2 text-gray-500 gap-3">
                      <span v-if="row.vehiclePlate"><el-icon class="mr-1"><Van /></el-icon>{{ row.vehiclePlate }}</span>
                      <span v-if="row.sender?.fullName || row.vehiclePlate"><el-icon class="mr-1"><User /></el-icon>{{ row.sender?.fullName || '---' }}</span>
                    </div>
                </div>
            </template>
        </el-table-column>
        <el-table-column label="Lịch trình" width="160">
            <template #default="{row}">
                <div class="text-xs space-y-1">
                    <div class="flex items-center gap-1" title="Lịch yêu cầu">
                        <el-icon class="text-gray-400"><Calendar /></el-icon>
                        <span class="text-gray-600">
                            {{ row.expectedDeliveryTime ? new Date(row.expectedDeliveryTime).toLocaleDateString('vi-VN') : (row.createdAt ? new Date(row.createdAt).toLocaleDateString('vi-VN') : '---') }}
                        </span>
                    </div>
                    <div class="flex items-center gap-1" title="Ngày thực hiện">
                        <el-icon :class="row.endTime ? 'text-success' : 'text-gray-400'"><Clock /></el-icon>
                        <span :class="row.endTime ? 'text-green-600 font-medium' : 'text-gray-400'">
                            {{ row.endTime ? new Date(row.endTime).toLocaleDateString('vi-VN') : 'Chưa HT' }}
                        </span>
                    </div>
                </div>
            </template>
        </el-table-column>
        <el-table-column label="Hàng hóa" width="160">
             <template #default="{row}">
                 <div class="text-xs text-gray-700 font-medium">Số loại SP: <span class="font-bold text-gray-900">{{ row.expectedItems ? row.expectedItems.length : 0 }}</span></div>
                 <div class="text-xs text-gray-500 mt-1">Tổng số SP: <span class="font-bold text-blue-600">{{ row.expectedItems ? row.expectedItems.reduce((acc: number, cur: any) => acc + (cur.quantity || 0), 0) : 0 }}</span></div>
             </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="180" fixed="right" align="center">
            <template #default="{row}">
                <el-button v-if="row.status === 'CREATED' && authStore.user?.role === 'WAREHOUSE_MANAGER'" type="warning" size="small" :icon="FullScreen" @click="handleScan(row)">Quét hàng</el-button>
                <el-button type="primary" link @click="viewDetail(row)">Chi tiết</el-button>
            </template>
        </el-table-column>
    </el-table>

    <div class="mt-4 flex justify-end">
        <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 50, 100, 500]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
        />
    </div>


    <!-- SCAN DIALOG -->
    <ShipmentScanDialog 
        v-if="selectedShipmentForScan"
        v-model="showScanDialog" 
        :shipment-id="selectedShipmentForScan.id" 
        :tracking-code="selectedShipmentForScan.trackingCode"
        @scanned="loadShipments" 
    />

    <!-- DETAIL DIALOG -->
    <el-dialog v-model="detailVisible" title="Thông tin Đơn hàng Chi tiết" width="800px" destroy-on-close class="custom-dialog">
        <div v-if="currentDetail" v-loading="detailLoading" class="p-2">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl mb-6">
                <div class="space-y-3">
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-500 text-sm">Mã vận đơn</span>
                        <span class="font-bold text-blue-700">{{ currentDetail.trackingCode }}</span>
                    </div>
                    <div class="flex justify-between border-b pb-2">
                        <span class="text-gray-500 text-sm">Loại hình</span>
                        <el-tag size="small">{{ shipmentTypeLabel(currentDetail.type) }}</el-tag>
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
                        <div v-if="currentDetail.endTime && (currentDetail.expectedDeliveryTime || currentDetail.createdAt)">
                            <el-tag :type="new Date(currentDetail.endTime).setHours(0,0,0,0) > new Date(currentDetail.expectedDeliveryTime || currentDetail.createdAt).setHours(0,0,0,0) ? 'danger' : 'success'" effect="dark" size="small">
                                {{ new Date(currentDetail.endTime).setHours(0,0,0,0) > new Date(currentDetail.expectedDeliveryTime || currentDetail.createdAt).setHours(0,0,0,0) ? 'Trễ lịch' : 'Đúng hạn' }}
                            </el-tag>
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
                            <el-tag size="mini" :type="row.scanMethod === 'BOX' || row.scanMethod === 'BAG' ? 'warning' : 'success'">{{ scanMethodLabel(row.scanMethod) }}</el-tag>
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
            
            <div class="mt-8 flex justify-end gap-3 border-t pt-6" v-if="canAction">
                <el-button 
                    v-if="currentDetail.status === 'CREATED' && authStore.user?.role === 'WAREHOUSE_MANAGER'" 
                    type="warning" 
                    @click="handleScan(currentDetail)"
                >
                    Mở màn hình Quét QR
                </el-button>
                
                <el-button 
                    v-if="currentDetail.status === 'WAITING_DRIVER' && authStore.user?.role === 'DRIVER'" 
                    type="primary" 
                    size="large"
                    @click="driverReceive"
                >
                    Tài xế nhận hàng (Lên xe)
                </el-button>
                
                <el-button 
                    v-if="currentDetail.status === 'IN_TRANSIT'" 
                    type="success" 
                    size="large"
                    @click="receiverConfirm"
                >
                    Hoàn tất Nhận hàng (Destination)
                </el-button>
            </div>
        </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.shipment-management :deep(.el-card) {
    border-radius: 16px;
    border: none;
}
.custom-dialog :deep(.el-dialog__body) {
    padding-top: 10px;
}
</style>
