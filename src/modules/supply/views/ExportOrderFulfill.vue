<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { shipmentV2Api } from '../api/shipmentV2Api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Box, Van, Check, Search, Loading, Warning } from '@element-plus/icons-vue';
import ShipmentScanDialog from '../components/ShipmentScanDialog.vue';

const loading = ref(false);
const shipments = ref<any[]>([]);
const selectedShipment = ref<any>(null);
const showScanDialog = ref(false);

const loadShipments = async () => {
    loading.value = true;
    try {
        const res = await shipmentV2Api.getPendingExport();
        shipments.value = res.data;
    } catch (e) {
        ElMessage.error('Lỗi tải danh sách phiếu chờ xuất');
    } finally {
        loading.value = false;
    }
};

const viewDetail = async (row: any) => {
    try {
        const res = await shipmentV2Api.getDetail(row.id);
        selectedShipment.value = res.data;
    } catch (e) {
        ElMessage.error('Lỗi tải chi tiết phiếu');
    }
};

const startScan = (row: any) => {
    selectedShipment.value = row;
    showScanDialog.value = true;
};

const handleScanSuccess = () => {
    if (selectedShipment.value) {
        viewDetail(selectedShipment.value);
    }
    loadShipments();
};

const confirmExport = async (row: any) => {
    try {
        await ElMessageBox.confirm(
            `Xác nhận hoàn tất xuất kho cho phiếu ${row.trackingCode}? Thao tác này sẽ trừ tồn kho thực tế.`,
            'Xác nhận xuất kho',
            { type: 'warning' }
        );
        
        await shipmentV2Api.confirmExport(row.id);
        ElMessage.success('Xuất kho thành công');
        selectedShipment.value = null;
        loadShipments();
    } catch (e: any) {
        if (e !== 'cancel') {
            ElMessage.error('Lỗi: ' + (e.response?.data?.message || e.message));
        }
    }
};

const getProgress = (shipment: any) => {
    if (!shipment?.expectedItems || shipment.expectedItems.length === 0) return 100;
    const totalExpected = shipment.expectedItems.reduce((sum: number, i: any) => sum + i.quantity, 0);
    const totalScanned = shipment.scannedItems?.length || 0;
    return Math.min(Math.round((totalScanned / totalExpected) * 100), 100);
};

const isFullyScanned = (shipment: any) => {
    if (!shipment?.expectedItems || shipment.expectedItems.length === 0) return true;
    const totalExpected = shipment.expectedItems.reduce((sum: number, i: any) => sum + i.quantity, 0);
    const totalScanned = shipment.scannedItems?.length || 0;
    return totalScanned >= totalExpected;
};

onMounted(loadShipments);
</script>

<template>
    <div class="export-fulfill-view p-6">
        <el-row :gutter="20">
            <!-- LEFT: PENDING LIST -->
            <el-col :span="10">
                <el-card class="rounded-xl shadow-sm h-[calc(100vh-120px)] flex flex-col">
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h3 class="font-bold text-gray-700 flex items-center gap-2">
                                <el-icon class="text-blue-500"><Loading v-if="loading" /><Van v-else /></el-icon>
                                Phiếu chờ xuất kho
                            </h3>
                            <el-button :icon="Search" circle size="small" @click="loadShipments" />
                        </div>
                    </template>
                    
                    <el-table :data="shipments" v-loading="loading" highlight-current-row @current-change="viewDetail" class="cursor-pointer">
                        <el-table-column label="Mã phiếu / Ngày" min-width="150">
                            <template #default="{row}">
                                <div class="font-bold text-blue-600 underline">{{ row.trackingCode }}</div>
                                <div class="text-[10px] text-gray-400">{{ new Date(row.createdAt).toLocaleString() }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column label="Đích đến">
                            <template #default="{row}">
                                <div v-if="row.type === 'INTERNAL_TRANSFER'" class="flex items-center gap-1">
                                    <el-tag size="small" type="info">Nội bộ</el-tag>
                                    <span class="text-xs">{{ row.destinationWarehouse?.name }}</span>
                                </div>
                                <div v-else class="flex items-center gap-1">
                                    <el-tag size="small" type="success">Đại lý</el-tag>
                                    <span class="text-xs">{{ row.dealer?.name }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column width="80" align="center">
                            <template #default="{row}">
                                <el-progress type="circle" :percentage="getProgress(row)" :width="30" :stroke-width="4" />
                            </template>
                        </el-table-column>
                    </el-table>
                </el-card>
            </el-col>

            <!-- RIGHT: DETAIL & SCAN -->
            <el-col :span="14">
                <el-card v-if="selectedShipment" class="rounded-xl shadow-md h-[calc(100vh-120px)] border-blue-100 bg-blue-50/10 flex flex-col">
                    <template #header>
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="text-xs text-gray-400 block mb-1">CHI TIẾT PHIẾU</span>
                                <h2 class="text-xl font-bold text-gray-800">{{ selectedShipment.trackingCode }}</h2>
                            </div>
                            <div class="flex gap-2">
                                <el-button type="primary" :icon="Box" @click="startScan(selectedShipment)">Quét mã QR</el-button>
                                <el-button 
                                    type="success" 
                                    :icon="Check" 
                                    @click="confirmExport(selectedShipment)"
                                    :disabled="!isFullyScanned(selectedShipment)"
                                >
                                    Hoàn tất xuất
                                </el-button>
                            </div>
                        </div>
                    </template>

                    <div class="flex-1 overflow-auto pr-2">
                        <!-- ORDER INFO -->
                        <div class="grid grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100">
                            <div>
                                <div class="text-xs text-gray-400 uppercase font-bold mb-1">Kho xuất</div>
                                <div class="text-gray-700 font-medium">{{ selectedShipment.sourceWarehouse?.name }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-400 uppercase font-bold mb-1">Người điều phối</div>
                                <div class="text-gray-700 font-medium">{{ selectedShipment.sender?.fullName }}</div>
                            </div>
                            <div class="col-span-2" v-if="selectedShipment.notes">
                                <div class="text-xs text-gray-400 uppercase font-bold mb-1">Ghi chú</div>
                                <div class="text-gray-600 text-sm italic">"{{ selectedShipment.notes }}"</div>
                            </div>
                        </div>

                        <!-- EXPECTED ITEMS -->
                        <h4 class="font-bold mb-3 flex items-center gap-2 text-gray-700">
                            <el-icon class="text-orange-500"><Warning /></el-icon> Danh sách hàng cần lấy
                        </h4>
                        <el-table :data="selectedShipment.expectedItems || []" border size="small" class="rounded-lg overflow-hidden mb-6">
                            <el-table-column prop="productName" label="Sản phẩm" />
                            <el-table-column prop="quantity" label="Yêu cầu" width="100" align="center" />
                            <el-table-column label="Đã quét" width="100" align="center">
                                <template #default="{row}">
                                    <b :class="selectedShipment.scannedItems?.filter((i:any) => i.batch?.product?.id === row.productId).length >= row.quantity ? 'text-green-600' : 'text-orange-600'">
                                        {{ selectedShipment.scannedItems?.filter((i:any) => i.batch?.product?.id === row.productId).length || 0 }}
                                    </b>
                                </template>
                            </el-table-column>
                        </el-table>

                        <!-- SCANNED LOG -->
                        <h4 class="font-bold mb-3 flex items-center gap-2 text-gray-700">
                            <el-icon class="text-green-500"><Check /></el-icon> Nhật ký quét thực tế
                        </h4>
                        <el-table :data="selectedShipment.scannedItems || []" size="small" border height="250" class="rounded-lg overflow-hidden">
                            <el-table-column label="Thời gian" width="100">
                                <template #default="{row}">
                                    {{ new Date(row.scannedAt).toLocaleTimeString() }}
                                </template>
                            </el-table-column>
                            <el-table-column label="Sản phẩm">
                                <template #default="{row}">
                                    <div class="font-bold text-xs">{{ row.batch?.product?.name }}</div>
                                    <div class="text-[10px] text-gray-400">{{ row.itemSerials[0] }}</div>
                                </template>
                            </el-table-column>
                            <el-table-column prop="scanMethod" label="P.Thức" width="80">
                                <template #default="{row}">
                                    <el-tag size="small" :type="row.scanMethod === 'BOX' ? 'warning' : 'info'">{{ row.scanMethod }}</el-tag>
                                </template>
                            </el-table-column>
                        </el-table>
                    </div>
                </el-card>

                <div v-else class="h-full flex items-center justify-center text-gray-300 flex-col gap-4">
                    <el-icon :size="80"><Box /></el-icon>
                    <span>Chọn một phiếu bên trái để bắt đầu xuất kho</span>
                </div>
            </el-col>
        </el-row>

        <ShipmentScanDialog 
            v-if="selectedShipment"
            v-model="showScanDialog"
            :shipment-id="selectedShipment.id"
            :tracking-code="selectedShipment.trackingCode"
            @scanned="handleScanSuccess"
        />
    </div>
</template>

<style scoped>
.export-fulfill-view :deep(.el-card__body) {
    height: 100%;
    display: flex;
    flex-direction: column;
}
</style>
