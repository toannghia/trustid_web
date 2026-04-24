<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Xuất / Nhập kho & Tồn kho</h1>
      <el-select v-model="currentWarehouseId" placeholder="Chọn kho vận hành..." class="w-64" @change="onWarehouseChange">
        <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
      </el-select>
    </div>
    
    <el-tabs v-model="activeTab" type="border-card">
        <!-- TAB 1: XUẤT KHO -->
        <el-tab-pane label="Xuất kho (Export)" name="export">
            <div class="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- FORM -->
                <div class="md:col-span-1 bg-white p-4 shadow-sm rounded border">
                    <h3 class="font-bold mb-4 text-blue-700 flex items-center">
                      <el-icon class="mr-2"><Promotion /></el-icon> Tạo lệnh xuất hàng
                    </h3>
                    <el-form label-position="top">
                        <el-form-item label="Kho nhận / Người nhận">
                            <el-select v-model="exportForm.receiver_id" placeholder="Chọn kho nhận..." filterable class="w-full">
                                <el-option v-for="u in users" :key="u.id" :label="u.fullName" :value="u.id" />
                            </el-select>
                        </el-form-item>
                        
                        <el-form-item label="Chọn xe vận chuyển">
                            <el-select v-model="exportForm.vehicle_id" placeholder="Chọn xe..." @change="onVehicleSelect" class="w-full">
                                <el-option v-for="v in vehicles" :key="v.id" :label="v.licensePlate + ' (' + v.type + ')'" :value="v.id" />
                            </el-select>
                        </el-form-item>

                        <div class="p-4 bg-blue-50 border border-blue-100 rounded mb-4">
                            <div class="flex justify-between mb-2">
                                <span class="text-sm font-bold">Hàng hóa đã chọn:</span>
                                <el-tag v-if="selectedItems.length" type="success" size="small">{{ selectedItems.length }} mục</el-tag>
                            </div>
                            <div v-if="!selectedItems.length" class="text-xs text-gray-500 italic">Vui lòng chọn từ bảng tồn kho bên cạnh -></div>
                            <div v-else class="max-h-32 overflow-y-auto">
                              <div v-for="(item, idx) in selectedItems" :key="idx" class="text-xs flex justify-between py-1 border-b border-blue-50">
                                <span>Batch: {{ item.batch?.batchCode }}</span>
                                <span class="font-bold">{{ item.quantity }}kg</span>
                              </div>
                            </div>
                        </div>

                        <el-button type="primary" class="w-full" :loading="loading" @click="submitExport" :disabled="!selectedItems.length || !exportForm.receiver_id">
                            Xác nhận Xuất kho & Giao xe
                        </el-button>
                    </el-form>
                </div>

                <!-- STOCK SELECTION -->
                <div class="md:col-span-2 bg-white p-4 shadow-sm rounded border">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="font-bold text-gray-700">Tồn kho tại: {{ currentWarehouse?.name || 'Chưa chọn kho' }}</h3>
                        <el-input v-model="stockSearch" placeholder="Tìm theo batch/serial..." prefix-icon="Search" size="small" class="w-48" />
                    </div>
                    
                    <el-table :data="filteredStock" size="small" border @selection-change="handleStockSelection" height="400">
                        <el-table-column type="selection" width="40" />
                        <el-table-column label="Mã Lô (Batch)" prop="batch.batchCode" />
                        <el-table-column label="Sản phẩm" prop="batch.product.name" />
                        <el-table-column label="Serial" prop="itemSerial">
                            <template #default="{row}">{{ row.itemSerial || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="Số lượng" prop="quantity" width="100">
                             <template #default="{row}">{{ row.quantity }} kg</template>
                        </el-table-column>
                        <el-table-column label="Trạng thái" width="100">
                            <template #default="{row}">
                              <el-tag :type="row.status === 'AVAILABLE' ? 'success' : 'warning'" size="small">{{ row.status }}</el-tag>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </div>
        </el-tab-pane>

        <!-- TAB 2: NHẬP KHO -->
        <el-tab-pane label="Nhập kho (Import)" name="import">
            <div class="p-4">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-lg">Đơn hàng đang đến kho này</h3>
                    <el-button type="primary" plain icon="Refresh" size="small" @click="loadIncoming">Làm mới</el-button>
                </div>
                
                <el-empty v-if="incomingShipments.length === 0" description="Không có hàng đang đến" />

                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div v-for="s in incomingShipments" :key="s.id" class="p-4 border rounded bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start mb-3">
                            <span class="font-bold text-lg text-blue-600 tracking-wider">{{ s.trackingCode }}</span>
                            <el-tag size="small">{{ s.status }}</el-tag>
                        </div>
                        <div class="text-sm text-gray-600 mb-4 space-y-1">
                            <div class="flex items-center"><el-icon class="mr-2"><Van /></el-icon> Xe: {{ s.vehiclePlate }}</div>
                            <div class="flex items-center"><el-icon class="mr-2"><User /></el-icon> Tài xế: {{ s.sender?.fullName || vehicles.find(v => v.id === s.vehicleId)?.defaultDriver?.fullName || '---' }}</div>
                        </div>
                        <el-divider class="my-3" />
                        <el-button type="success" class="w-full" icon="Check" @click="confirmReceipt(s)">Xác nhận Nhập kho</el-button>
                    </div>
                </div>
            </div>
        </el-tab-pane>

        <!-- TAB 3: LỊCH SỬ BIẾN ĐỘNG -->
        <el-tab-pane label="Biến động kho (Logs)" name="logs">
             <div class="p-4">
                <el-table :data="movements" size="small" stripe>
                    <el-table-column label="Thời gian" prop="createdAt" width="160">
                         <template #default="{row}">{{ new Date(row.createdAt).toLocaleString() }}</template>
                    </el-table-column>
                    <el-table-column label="Loại" prop="type" width="100">
                        <template #default="{row}">
                            <el-tag :type="row.type === 'INBOUND' ? 'success' : row.type === 'OUTBOUND' ? 'danger' : 'info'" size="small">
                                {{ row.type }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="Mã Lô" prop="batch.batchCode" />
                    <template v-if="true">
                        <el-table-column label="Số lượng" prop="quantity" width="100" />
                        <el-table-column label="Tham chiếu" prop="referenceType" />
                        <el-table-column label="Ghi chú" prop="notes" />
                    </template>
                </el-table>
            </div>
        </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Promotion, Van, Search, Check, Refresh, User } from '@element-plus/icons-vue';
import { transportApi } from '../api/transportApi';
import { shipmentV2Api } from '../api/shipmentV2Api';
import { userApi } from '@/modules/core/api/user';

const activeTab = ref('export');
const loading = ref(false);
const currentWarehouseId = ref('');
const stockSearch = ref('');

// DATA
const warehouses = ref<any[]>([]);
const vehicles = ref<any[]>([]);
const users = ref<any[]>([]); // Potential receivers
const warehouseStocks = ref<any[]>([]);
const movements = ref<any[]>([]);
const incomingShipments = ref<any[]>([]);

// COMPUTES
const currentWarehouse = computed(() => warehouses.value.find(w => w.id === currentWarehouseId.value));
const filteredStock = computed(() => {
    if (!stockSearch.value) return warehouseStocks.value;
    const s = stockSearch.value.toLowerCase();
    return warehouseStocks.value.filter(item => 
        item.batch?.batchCode?.toLowerCase().includes(s) || 
        item.itemSerial?.toLowerCase().includes(s)
    );
});

// EXPORT STATE
const exportForm = ref({
    receiver_id: '',
    vehicle_id: '',
    vehicle_plate: '',
    driver_id: '',
    source_warehouse_id: '',
    notes: ''
});
const selectedItems = ref<any[]>([]);

// INITIALIZATION
onMounted(async () => {
    await loadInitialData();
});

const loadInitialData = async () => {
    loading.value = true;
    try {
        const [wRes, vRes, uRes] = await Promise.all([
            transportApi.getWarehouses(),
            transportApi.getVehicles(),
            userApi.getList({ page: 1, limit: 100, roleName: 'WAREHOUSE_MANAGER' })
        ]);
        warehouses.value = wRes.data;
        vehicles.value = vRes.data;
        users.value = uRes.data.items || uRes.data;
        
        if (warehouses.value.length) {
            currentWarehouseId.value = warehouses.value[0].id;
            await onWarehouseChange();
        }
    } catch (e) { console.error(e); }
    finally { loading.value = false; }
};

const onWarehouseChange = async () => {
    if (!currentWarehouseId.value) return;
    loading.value = true;
    try {
        const [sRes, mRes] = await Promise.all([
            transportApi.getStock(currentWarehouseId.value),
            transportApi.getInventoryMovements(currentWarehouseId.value)
        ]);
        warehouseStocks.value = sRes.data;
        movements.value = mRes.data;
        await loadIncoming();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const loadIncoming = async () => {
    try {
        const res = await shipmentV2Api.getPendingReceive();
        // In V2, destinationWarehouseId is used. For Dealer, they might use dealerId (handled by backend in getPendingReceive for dealer role)
        // If the user is a WAREHOUSE_MANAGER, they filter by currentWarehouseId.
        incomingShipments.value = res.data.filter((s: any) => s.destinationWarehouseId === currentWarehouseId.value);
    } catch (e) {
        console.error('Lỗi tải hàng đang đến:', e);
    }
};

// HANDLERS
const handleStockSelection = (val: any[]) => {
    selectedItems.value = val;
};

const onVehicleSelect = (id: string) => {
    const v = vehicles.value.find(x => x.id === id);
    if (v) {
        exportForm.value.vehicle_plate = v.licensePlate;
        exportForm.value.driver_id = v.driverId || v.defaultDriverId || '';
    }
};

const submitExport = async () => {
    if (!currentWarehouseId.value) return;
    
    try {
        await ElMessageBox.confirm('Xác nhận xuất kho và giao hàng cho xe này?', 'Xác nhận');
        loading.value = true;
        
        const payload = {
            ...exportForm.value,
            source_warehouse_id: currentWarehouseId.value,
            items: selectedItems.value.map(s => ({
                batch_id: s.batchId,
                quantity: s.quantity,
                serials: s.itemSerial ? [s.itemSerial] : []
            }))
        };

        await transportApi.createShipment(payload);
        ElMessage.success('Đã tạo lệnh xuất kho & giao xe thành công');
        
        // Refresh data
        await onWarehouseChange();
        selectedItems.value = [];
        exportForm.value.receiver_id = '';
        exportForm.value.vehicle_id = '';
    } catch (e) {
        if (e !== 'cancel') ElMessage.error('Lỗi khi thực hiện xuất kho');
    } finally {
        loading.value = false;
    }
};

const confirmReceipt = async (shipment: any) => {
    try {
        await ElMessageBox.confirm(`Xác nhận đã nhận đủ hàng cho đơn ${shipment.trackingCode}?`, 'Nhập kho');
        loading.value = true;
        await shipmentV2Api.confirmReceive(shipment.id);
        ElMessage.success('Sản phẩm đã được nhập kho thành công');
        await onWarehouseChange();
    } catch (e: any) {
        if (e !== 'cancel') ElMessage.error('Lỗi xác nhận nhập kho: ' + (e.response?.data?.message || e.message));
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.el-tabs--border-card {
    border-radius: 8px;
    overflow: hidden;
}
</style>
