<template>
  <div class="p-4 bg-white min-h-screen">
    <div class="flex justify-between items-center mb-4 border-b pb-2">
        <h2 class="text-lg font-bold uppercase">Phiếu Đóng Gói Sản Phẩm</h2>
        <div class="flex gap-2">
            <el-button type="warning" plain icon="Connection" @click="showReceiveDialog = true">
                Nhận Lô Chuyển Giao (QR)
            </el-button>
            <el-button type="info" plain icon="List" @click="router.push('/supply/batches')">
                Danh sách lô
            </el-button>
        </div>
    </div>
    
    <!-- HEADER SECTION (FORM LINE 1 & 2) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <!-- LEFT COL -->
        <div class="space-y-4">
             <!-- Line 1: Lô Đóng Gói + Ngày -->
             <div class="flex items-center gap-2">
                 <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Lô Đóng Gói:</label>
                 <el-input v-model="batchCode" placeholder="Hệ thống tự sinh..." disabled class="flex-1 min-w-0" size="default" />
                 <el-date-picker v-model="currentDate" type="date" placeholder="Ngày" class="w-40 shrink-0" format="DD/MM/YYYY" readonly size="default" />
             </div>
             
             <!-- Line Source Type: Lô Farm vs Lô Ngoài -->
             <div class="flex items-center gap-2" v-if="!activeBatchId">
                 <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Nguồn gốc lô:</label>
                 <el-radio-group v-model="batchSourceType" size="default">
                     <el-radio-button label="FARM">Từ Farm</el-radio-button>
                     <el-radio-button label="EXTERNAL">Nhập ngoài / Sẵn có</el-radio-button>
                 </el-radio-group>
             </div>

             <!-- Line 2: Chọn Lô SX (Chỉ hiện khi là FARM) -->
             <div class="flex items-center gap-2" v-if="batchSourceType === 'FARM'">
                 <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Chọn Lô SX:</label>
                 <el-select 
                    v-model="selectedHarvestCode" 
                    placeholder="Chọn lô thu hoạch..." 
                    filterable 
                    class="flex-1 min-w-0"
                    @change="onHarvestSelect"
                    size="default"
                    :disabled="!!activeBatchId"
                 >
                    <el-option 
                        v-for="h in harvestList" 
                        :key="h.id" 
                        :label="`${h.batchCode} (${h.productName || 'Chưa rõ SP'}) - ${h.quantityKg}kg`" 
                        :value="h.batchCode" 
                    />
                 </el-select>
             </div>

             <!-- Line 2b: Chọn Lô Nhập Ngoài (Chỉ hiện khi là EXTERNAL) -->
             <div class="flex items-center gap-2" v-if="batchSourceType === 'EXTERNAL' && !activeBatchId">
                 <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Chọn Lô Nhập:</label>
                 <el-select 
                    v-model="selectedExternalBatchId" 
                    placeholder="Chọn lô nhập ngoài/chuyển giao..." 
                    filterable 
                    class="flex-1 min-w-0"
                    @change="onExternalBatchSelect"
                    size="default"
                 >
                    <el-option 
                        v-for="b in externalBatchList" 
                        :key="b.id" 
                        :label="`${b.batchCode} (${b.product?.name}) - Còn lại: ${b.totalUnitsExpected - (b.packCount || 0) - (b.exportedQuantity || 0)}`" 
                        :value="b.id" 
                    />
                 </el-select>
                 <el-button type="primary" link icon="Plus" @click="router.push('/supply/external-batches')">
                    Tạo lô mới
                 </el-button>
             </div>

             <!-- Khi đã có activeBatchId, hiển thị thông tin loại lô -->
             <div class="flex items-center gap-2 text-sm" v-if="activeBatchId">
                 <label class="w-32 font-medium text-gray-700">Loại lô:</label>
                 <el-tag :type="batchTypeTagType">{{ batchTypeLabel }}</el-tag>
                 <span v-if="batchQrSerial" class="ml-2 text-gray-500">QR Lô: <b class="text-blue-600">{{ batchQrSerial }}</b></span>
             </div>
        </div>

        <!-- RIGHT COL -->
        <div class="space-y-4">
             <!-- Line 2b: Chọn Tên Sản Phẩm -->
             <div class="flex items-center gap-2">
                 <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Sản phẩm:</label>
                 <el-select 
                    v-model="selectedProductId" 
                    placeholder="Chọn sản phẩm..." 
                    filterable 
                    class="flex-1 min-w-0"
                    @change="onProductSelect"
                    size="default"
                    :disabled="!!activeBatchId && batchSourceType === 'FARM'"
                 >
                    <el-option 
                        v-for="p in productList" 
                        :key="p.id" 
                        :label="p.name" 
                        :value="p.id" 
                    />
                 </el-select>
                 <div class="flex items-center gap-1 shrink-0" v-if="!activeBatchId">
                     <el-tooltip content="Thêm sản phẩm mới" placement="top">
                        <el-button type="primary" icon="Plus" circle size="small" @click="goToAddProduct" />
                     </el-tooltip>
                     <el-tooltip content="Làm mới danh sách" placement="top">
                        <el-button icon="Refresh" circle size="small" @click="refreshProducts" :loading="refreshingProducts" />
                     </el-tooltip>
                 </div>
             </div>
             
             <!-- Info: Quy cách -->
             <div class="flex items-center gap-2">
                 <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Quy cách (kg):</label>
                 <el-input-number v-model="unitWeight" :precision="2" :step="0.1" class="flex-1 min-w-0" size="default" />
             </div>

             <!-- Default Warehouse Info -->
             <div class="flex items-center gap-2">
                 <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Kho nhập:</label>
                 <div class="flex-1 min-w-0 px-3 py-1 bg-gray-50 rounded border border-dashed border-gray-300 flex items-center gap-2">
                     <el-icon v-if="defaultWarehouse" class="text-orange-500"><HomeFilled /></el-icon>
                     <span v-if="defaultWarehouse" class="text-sm font-medium text-gray-700 truncate">{{ defaultWarehouse.name }}</span>
                     <span v-else class="text-sm text-gray-400 italic">Chưa cấu hình kho mặc định</span>
                     <el-tag v-if="defaultWarehouse" size="small" type="danger" effect="plain" class="ml-auto shrink-0">Mặc định</el-tag>
                 </div>
             </div>
        </div>
    </div>

    <!-- SCANNING & STATS SECTION -->
    <div class="mb-4 border-t pt-4 space-y-4">
        
        <!-- ROW 1: Quét mã | Tiến độ | Đóng thùng -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Scan Input -->
            <div class="flex items-center gap-2">
                <label class="w-32 text-sm font-medium text-gray-700">Quét Mã:</label>
                <el-input 
                    v-model="scanInput" 
                    ref="scanInputRef" 
                    placeholder="Quét mã tem..." 
                    class="flex-1"
                    @keyup.enter="startScan"
                    size="default"
                    :disabled="scanning"
                >
                    <template #append>
                        <el-button @click="startScan" :loading="scanning">Thêm</el-button>
                    </template>
                </el-input>
            </div>
            
            <!-- Stats -->
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1">
                    <label class="text-sm font-medium text-gray-700 whitespace-nowrap">Tiến độ:</label>
                    <div class="flex items-center gap-1">
                        <el-input :value="currentCount" readonly class="w-16 text-center font-bold text-blue-600" size="default" />
                        <span class="text-gray-500">/</span>
                        <el-input :value="expectedCount" readonly class="w-16 text-center" size="default" />
                    </div>
                </div>
                
                <!-- Carton Mode -->
                <div class="flex items-center gap-2 flex-1 min-w-[150px]">
                    <el-checkbox v-model="isCarton" label="Đóng thùng" border size="default" />
                    <el-input 
                        v-if="isCarton" 
                        v-model="cartonCode" 
                        placeholder="Quét mã thùng..." 
                        class="flex-1" 
                        size="default"
                    />
                </div>
            </div>
        </div>
        
        <!-- ROW 2: Code Pool + Range (Full Width) -->
        <div class="space-y-2 border-t pt-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                 <!-- Left: Pool Selection -->
                 <div class="flex items-center gap-2">
                     <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Lô Mã & Dãy:</label>
                     <el-select 
                        v-model="selectedPoolId" 
                        placeholder="Chọn lô mã..." 
                        clearable 
                        class="flex-1 min-w-0" 
                        size="default"
                     >
                         <el-option 
                            v-for="p in poolList" 
                            :key="p.id" 
                            :label="`${p.name}`" 
                            :value="p.id" 
                         />
                     </el-select>
                 </div>
                 
                 <!-- Right: Range Toggle & Input -->
                 <div class="flex items-center gap-2 flex-1">
                     <el-checkbox v-model="isRangeMode" label="Nhập dãy" border size="default" />
                     
                     <!-- Range Mode (Start/End) -->
                     <template v-if="isRangeMode">
                         <el-input v-model="rangeStart" placeholder="Từ" class="flex-1" size="default" />
                         <span class="text-gray-500">-</span>
                         <el-input v-model="rangeEnd" placeholder="Đến" class="flex-1" size="default" />
                     </template>
                     
                     <!-- Single/Comma Mode -->
                     <template v-else>
                         <el-input 
                            v-model="rangeInput" 
                            placeholder="Nhập mã lẻ vd: A001, A002" 
                            class="flex-1"
                            size="default"
                         />
                     </template>
                     <el-button type="primary" size="default" @click="addRangeOrPool">Thêm</el-button>
                 </div>
             </div>

             <!-- Pool Hint Info -->
             <div v-if="selectedPoolInfo" class="text-xs text-blue-600 mt-1 pl-[136px]">
                 Gợi ý: <b>{{ selectedPoolInfo.prefix }}-{{ String(selectedPoolInfo.startSerial).padStart(5, '0') }}</b> 
                 đến <b>{{ selectedPoolInfo.prefix }}-{{ String(selectedPoolInfo.endSerial).padStart(5, '0') }}</b>
                 | Đã dùng: <b>{{ selectedPoolInfo.usedCount || 0 }} / {{ selectedPoolInfo.quantity }}</b> mã
             </div>
        </div>
    </div>

    <!-- TABLE SECTION -->
    <div class="mt-6 border rounded p-2 relative">
        <h3 class="font-bold mb-2 ml-1">Danh sách chờ lưu</h3>
        <el-table :data="tableData" border stripe height="400" style="width: 100%">
            <el-table-column type="index" label="STT" width="60" align="center" />
            <el-table-column prop="codeString" label="Mã Code" min-width="155" />
            <el-table-column prop="code" label="Mã Serial" min-width="120" />
            <el-table-column prop="productName" label="Tên SP" min-width="150" />
            <el-table-column prop="parentCode" label="Thùng / Parent" width="150" />
            <el-table-column label="Hành động" width="100" align="center">
                <template #default="scope">
                    <el-button 
                        type="danger" 
                        icon="Delete" 
                        circle 
                        size="small" 
                        @click="removeItem(scope.$index)" 
                    />
                </template>
            </el-table-column>
        </el-table>
        
        <!-- FOOTER BUTTONS -->
        <div class="flex justify-center gap-4 mt-4">
            <el-button size="large" @click="resetForm">Hủy bỏ / Tải lại</el-button>
            <el-button v-if="activeBatchId" type="danger" size="large" @click="cancelActiveBatch" :loading="canceling">Hủy Lô này</el-button>
            <el-button v-if="activeBatchId" type="success" size="large" @click="finishActiveBatch" :loading="finishing">Đóng Lô (Hoàn tất đóng gói)</el-button>
            <el-button type="primary" size="large" @click="doSave" :loading="saving" :disabled="tableData.length === 0 && !rangeInput">
                Lưu Dữ Liệu Quét Mới
            </el-button>

            <!-- Nút chuyển giao nếu là lô đang Packing/Closed -->
            <el-button v-if="activeBatchId" type="warning" size="large" @click="showTransferDialog = true" plain>
                Chuyển giao cho Tenant khác
            </el-button>
        </div>
    </div>

    <!-- DIALOG: NHẬN LÔ QUA QR -->
    <el-dialog v-model="showReceiveDialog" title="Nhận Lô Chuyển Giao" width="450px">
        <div class="space-y-4">
            <div class="text-sm text-gray-500 mb-2 italic">Hãy quét hoặc nhập mã QR lô hàng (Agricheck code) được dán trên thùng hàng.</div>
            <el-input v-model="receiveQrCode" placeholder="Nhập mã QR lô hàng..." @keyup.enter="handleReceiveBatch">
                <template #append>
                    <el-button @click="handleReceiveBatch" :loading="receiving">Kiểm tra & Nhận</el-button>
                </template>
            </el-input>
            
            <div v-if="scannedBatchInfo" class="p-3 bg-blue-50 border border-blue-100 rounded">
                <div class="font-bold text-blue-700">{{ scannedBatchInfo.productName }}</div>
                <div class="text-sm mt-1">Mã lô gốc: <b>{{ scannedBatchInfo.batchCode }}</b></div>
                <div class="text-sm">Số lượng: <b>{{ scannedBatchInfo.totalUnitsExpected }}</b></div>
                <el-alert v-if="!scannedBatchInfo.isAllowed" type="error" title="Bạn không được quyền nhận lô này" :closable="false" class="mt-2" />
                <el-button v-else type="primary" class="w-full mt-3" @click="confirmReceive" :loading="receiving">Xác nhận "Nhận lô" để đóng gói</el-button>
            </div>
        </div>
    </el-dialog>

    <!-- DIALOG: CHUYỂN GIAO LÔ -->
    <el-dialog v-model="showTransferDialog" title="Chuyển giao lô hàng" width="450px">
        <el-form label-position="top">
            <el-form-item label="Chọn Doanh nghiệp / Tenant nhận:">
                <el-select v-model="transferTargetTenantId" filterable placeholder="Chọn tenant..." class="w-full">
                    <el-option v-for="t in tenantList" :key="t.id" :label="t.name" :value="t.id" />
                </el-select>
            </el-form-item>
            <div class="text-xs text-orange-600 italic mt-1">
                * Sau khi chuyển giao, doanh nghiệp này mới có quyền quét mã QR lô hàng để "Nhận" vè kho của họ.
            </div>
        </el-form>
        <template #footer>
            <el-button @click="showTransferDialog = false">Hủy</el-button>
            <el-button type="primary" @click="handleTransfer" :loading="transferring">Xác nhận chuyển giao</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Delete, HomeFilled, Plus, Refresh, InfoFilled, Connection, List } from '@element-plus/icons-vue';
import { farmApi } from '@/modules/farm/api/farmApi';
import { productApi } from '@/modules/core/api/product';
import { codeApi } from '@/modules/core/api/codeApi';
import { supplyApi } from '../api/supplyApi';
import { transportApi, type Warehouse } from '../api/transportApi';
import api from '@/common/utils/api'; // For generic tenant list
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import dayjs from 'dayjs';

const route = useRoute();
const router = useRouter();

// --- STATE ---
const batchCode = ref('PKG-AUTO');
const currentDate = ref(new Date());
const batchSourceType = ref('FARM'); // FARM | EXTERNAL
const externalQuantity = ref(100);
const batchQrSerial = ref('');

const harvestList = ref<any[]>([]);
const productList = ref<any[]>([]);
const poolList = ref<any[]>([]);
const warehouseList = ref<Warehouse[]>([]);
const availableCodes = ref<any[]>([]);
const tenantList = ref<any[]>([]);

const selectedHarvestCode = ref('');
const selectedExternalBatchId = ref('');
const selectedProductId = ref('');
const unitWeight = ref(1);
const harvestQuantity = ref(0);
const previouslyPackagedCount = ref(0);
const externalBatchList = ref<any[]>([]);

const scanInput = ref('');
const scanInputRef = ref<any>(null);

const isRangeMode = ref(true);
const rangeInput = ref('');
const rangeStart = ref('');
const rangeEnd = ref('');
const selectedPoolId = ref('');

const isCarton = ref(false);
const cartonCode = ref('');

// Dialogs
const showReceiveDialog = ref(false);
const receiveQrCode = ref('');
const receiving = ref(false);
const scannedBatchInfo = ref<any>(null);

const showTransferDialog = ref(false);
const transferTargetTenantId = ref('');
const transferring = ref(false);

const activeBatchId = ref<string | null>(null);
const activeBatchType = ref('FARM');
const activeBatchQrSerial = ref('');

const tableData = ref<any[]>([]);
const saving = ref(false);
const scanning = ref(false);
const finishing = ref(false);
const canceling = ref(false);
const refreshingProducts = ref(false);

// labels mapping
const batchTypeLabel = computed(() => {
    switch(activeBatchType.value) {
        case 'EXTERNAL': return 'Nhập ngoài/Sẵn có';
        case 'CROSS_TENANT': return 'Nhận từ Tenant khác';
        case 'LEGACY': return 'Lô cũ';
        default: return 'Từ Farm';
    }
});

const batchTypeTagType = computed(() => {
    switch(activeBatchType.value) {
        case 'EXTERNAL': return 'success';
        case 'CROSS_TENANT': return 'warning';
        case 'LEGACY': return 'info';
        default: return 'primary';
    }
});

const selectedPoolInfo = computed(() => {
    if (!selectedPoolId.value) return null;
    return poolList.value.find(p => p.id === selectedPoolId.value) || null;
});

const defaultWarehouse = computed(() => {
    return warehouseList.value.find(w => w.isDefault && w.type === 'PRODUCTION');
});

const expectedCount = computed(() => {
    if (batchSourceType.value === 'EXTERNAL') return externalQuantity.value;
    if (!harvestQuantity.value || !unitWeight.value) return 0;
    return Math.floor(harvestQuantity.value / unitWeight.value);
});

const currentCount = computed(() => tableData.value.length + previouslyPackagedCount.value);

// --- WATCHERS ---
watch(selectedPoolId, (newId) => {
    if (newId && isRangeMode.value && selectedPoolInfo.value) {
        const pool = selectedPoolInfo.value;
        const prefix = pool.prefix ? `${pool.prefix}-` : '';
        rangeStart.value = `${prefix}${String(pool.startSerial).padStart(5, '0')}`;
        rangeEnd.value = `${prefix}${String(pool.endSerial).padStart(5, '0')}`;
    } else {
        rangeStart.value = '';
        rangeEnd.value = '';
    }
});

// --- METHODS ---
const loadMasterData = async () => {
    try {
        const [hRes, pRes, poolRes, warehouseRes, tenantRes, extRes] = await Promise.all([
             farmApi.getHarvests({}),
             productApi.getList({}),
             codeApi.getPools(),
             transportApi.getWarehouses(),
             api.get('/tenants/active'),
             supplyApi.getExternalBatches()
        ]);
        
        harvestList.value = (hRes as any).data?.data || (hRes as any).data || [];
        productList.value = (pRes as any).data?.data || (pRes as any).data || [];
        poolList.value = (poolRes as any).data?.data || (poolRes as any).data || [];
        warehouseList.value = (warehouseRes as any).data || [];
        tenantList.value = (tenantRes as any).data?.data || (tenantRes as any).data || [];
        externalBatchList.value = extRes.data?.filter((b: any) => b.status === 'PACKING') || [];

        // Load some available codes for Batch QR assignment
        const codeRes = await codeApi.getItems({ status: 'AVAILABLE', limit: 100 });
        availableCodes.value = codeRes.data?.data || [];

    } catch (e) {
        console.error(e);
        ElMessage.error('Lỗi tải dữ liệu danh mục');
    }
};

const loadBatchIfExists = async () => {
    const id = route.query.batchId as string;
    if (!id) return;
    
    try {
        const { data } = await supplyApi.getBatch(id);
        if (data) {
            activeBatchId.value = data.id;
            batchCode.value = data.batchCode;
            activeBatchType.value = data.batchType;
            batchSourceType.value = (data.batchType === 'FARM') ? 'FARM' : 'EXTERNAL';
            batchQrSerial.value = data.batchQrSerial;
            
            selectedHarvestCode.value = data.farmBatchCode;
            selectedProductId.value = data.productId;
            
            if (data.farmDataSnapshot) {
                harvestQuantity.value = data.farmDataSnapshot.quantityKg;
                unitWeight.value = data.farmDataSnapshot.unitWeightKg || data.farmDataSnapshot.unitWeight;
            }
            
            if (data.batchType === 'EXTERNAL' || data.batchType === 'CROSS_TENANT') {
                externalQuantity.value = data.totalUnitsExpected;
            }

            previouslyPackagedCount.value = data.packCount || 0;
        }
    } catch (e) {
        ElMessage.error('Không tìm thấy lô đóng gói');
    }
};

const handleReceiveBatch = async () => {
    if (!receiveQrCode.value) return;
    receiving.value = true;
    try {
        const { data } = await supplyApi.lookupBatchByQr(receiveQrCode.value);
        scannedBatchInfo.value = data;
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Không tìm thấy lô hàng');
        scannedBatchInfo.value = null;
    } finally {
        receiving.value = false;
    }
};

const confirmReceive = async () => {
    receiving.value = true;
    try {
        const { data } = await supplyApi.receiveBatch(receiveQrCode.value);
        ElMessage.success('Đã nhận lô hàng chuyển giao thành công!');
        showReceiveDialog.value = false;
        router.push({ query: { batchId: data.id }});
        setTimeout(() => loadBatchIfExists(), 100);
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi khi nhận lô');
    } finally {
        receiving.value = false;
    }
};

const handleTransfer = async () => {
    if (!activeBatchId.value || !transferTargetTenantId.value) return;
    transferring.value = true;
    try {
        await supplyApi.transferBatch(activeBatchId.value, transferTargetTenantId.value);
        ElMessage.success('Đã thiết lập quyền nhận lô cho doanh nghiệp được chọn');
        showTransferDialog.value = false;
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi khi chuyển giao');
    } finally {
        transferring.value = false;
    }
};

const onHarvestSelect = async () => {
    const h = harvestList.value.find(item => item.batchCode === selectedHarvestCode.value);
    if (h) {
        harvestQuantity.value = h.quantityKg || 0;
        // Auto select product if harvest has product info
        if (h.productId) selectedProductId.value = h.productId;
        onProductSelect();
    }
    await fetchHarvestStats(selectedHarvestCode.value);
};

const onExternalBatchSelect = () => {
    if (!selectedExternalBatchId.value) return;
    router.push({ query: { batchId: selectedExternalBatchId.value } });
    setTimeout(() => loadBatchIfExists(), 100);
};

const onProductSelect = () => {
    const p = productList.value.find(item => item.id === selectedProductId.value);
    if (p) {
        if (p.netWeight && Number(p.netWeight) > 0) {
            let weight = Number(p.netWeight);
            const unit = (p.weightUnit || 'kg').toLowerCase();
            if (unit === 'g' || unit === 'ml') weight /= 1000;
            unitWeight.value = weight;
        }
    }
};

const fetchHarvestStats = async (harvestCode: string) => {
    if (!harvestCode || batchSourceType.value === 'EXTERNAL') {
        previouslyPackagedCount.value = 0;
        return;
    }
    try {
        const res = await supplyApi.getHarvestStats(harvestCode);
        previouslyPackagedCount.value = res.data?.count || 0;
    } catch (e) {
        previouslyPackagedCount.value = 0;
    }
};

const startScan = async () => {
    if (scanning.value) return;
    if (!selectedProductId.value) { ElMessage.error('Hãy chọn sản phẩm'); return; }

    const code = scanInput.value.trim();
    if (!code) return;
    
    if (tableData.value.find(x => x.code === code || x.codeString === code)) {
        ElMessage.warning('Mã đã tồn tại trong bảng!');
        scanInput.value = '';
        return;
    }
    
    scanning.value = true;
    try {
        const res = await codeApi.validate(code);
        const info = res.data;
        
        if (!info || !info.valid) {
            ElMessage.error(info?.message || 'Mã không đúng hoặc không phải mã của công ty!');
            return;
        }
        
        if (info.status === 'ACTIVE' || info.isActive) {
            ElMessage.warning(`Mã "${code}" đã được kích hoạt!`);
            scanInput.value = '';
            return;
        }
        
        const pName = productList.value.find(p => p.id === selectedProductId.value)?.name || '';
        tableData.value.unshift({
            code: info.serial || code,
            codeString: info.codeString || '',
            productName: pName,
            parentCode: isCarton.value ? cartonCode.value : ''
        });
        
        scanInput.value = '';
        ElMessage.success('Thêm thành công');
    } catch (e: any) {
        ElMessage.error('Lỗi kiểm tra mã: ' + (e.response?.data?.message || e.message));
    } finally {
        scanning.value = false;
        nextTick(() => scanInputRef.value?.focus());
    }
};

const addRangeOrPool = async () => {
    if (!selectedProductId.value) { ElMessage.error('Hãy chọn sản phẩm'); return; }
    
    scanning.value = true;
    try {
        const codes = [];
        if (isRangeMode.value) {
            // Expansion logic simplified for MVP (Frontend match from loaded pool info)
            // Backend will do thorough check anyway.
            if (!rangeStart.value || !rangeEnd.value) return;
            const matchStart = rangeStart.value.match(/(\d+)$/);
            const matchEnd = rangeEnd.value.match(/(\d+)$/);
            if (matchStart && matchEnd) {
                const prefix = rangeStart.value.substring(0, rangeStart.value.length - matchStart[0].length);
                const start = parseInt(matchStart[0]);
                const end = parseInt(matchEnd[0]);
                for(let i=start; i<=end; i++) {
                    codes.push(`${prefix}${String(i).padStart(matchStart[0].length, '0')}`);
                }
            }
        } else {
            codes.push(...rangeInput.value.split(',').map(s => s.trim()).filter(Boolean));
        }

        const pName = productList.value.find(p => p.id === selectedProductId.value)?.name || '';
        codes.forEach(c => {
            if (!tableData.value.find(x => x.code === c)) {
                tableData.value.unshift({
                    code: c,
                    codeString: '',
                    productName: pName,
                    parentCode: isCarton.value ? cartonCode.value : ''
                });
            }
        });
        
        rangeInput.value = '';
        rangeStart.value = '';
        rangeEnd.value = '';
        ElMessage.success(`Đã thêm ${codes.length} mã vào danh sách chờ.`);
    } finally {
        scanning.value = false;
    }
};

const doSave = async () => {
    if (!selectedProductId.value) return ElMessage.error('Hãy chọn sản phẩm');

    saving.value = true;
    try {
        if (!activeBatchId.value) {
            if (batchSourceType.value === 'FARM') {
                const res = await supplyApi.createBatch({
                    farm_batch_code: selectedHarvestCode.value,
                    product_id: selectedProductId.value
                });
                activeBatchId.value = res.data.id;
                batchCode.value = res.data.batchCode;
            } else {
                // This case should ideally be handled by selecting an existing external batch
                // but we keep it as fallback or if user somehow bypasses selection.
                // However, with the new UI, user MUST select an external batch from dropdown.
                if (!selectedExternalBatchId.value) {
                    ElMessage.warning('Vui lòng chọn lô nhập ngoài đã tạo');
                    saving.value = false;
                    return;
                }
                activeBatchId.value = selectedExternalBatchId.value;
            }
        }

        const codes = tableData.value.map(x => x.code);
        const { data } = await supplyApi.addItems({
            batch_id: activeBatchId.value as string,
            codes: codes.length ? codes : undefined,
            parent_code: isCarton.value ? cartonCode.value : undefined
        });
        
        ElNotification({ title: 'Kết quả', message: `Đã lưu ${data.added} mã.`, type: 'success' });
        tableData.value = [];
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi lưu dữ liệu');
    } finally {
        saving.value = false;
    }
};

const finishActiveBatch = async () => {
    if (!activeBatchId.value) return;
    try {
        await ElMessageBox.confirm('Đóng và nhập kho lô hàng này?', 'Xác nhận', { type: 'warning' });
        finishing.value = true;
        await supplyApi.finishBatch(activeBatchId.value);
        ElMessage.success('Thành công!');
        resetForm();
    } catch (e) {
        console.error(e);
    } finally {
        finishing.value = false;
    }
};

const cancelActiveBatch = async () => {
    if (!activeBatchId.value) return;
    try {
        await ElMessageBox.confirm('Hủy bỏ lô hàng này?', 'Cảnh báo', { type: 'error' });
        canceling.value = true;
        await supplyApi.cancelBatch(activeBatchId.value);
        ElMessage.success('Đã hủy!');
        resetForm();
    } catch (e) {
        console.error(e);
    } finally {
        canceling.value = false;
    }
};

const resetForm = () => {
    activeBatchId.value = null;
    batchCode.value = 'PKG-AUTO';
    tableData.value = [];
    selectedHarvestCode.value = '';
    selectedExternalBatchId.value = '';
    selectedProductId.value = '';
    router.replace({ query: {} });
    loadMasterData();
};

const removeItem = (i: number) => tableData.value.splice(i, 1);
const goToAddProduct = () => window.open('/products', '_blank');
const refreshProducts = async () => {
    refreshingProducts.value = true;
    try { await loadMasterData(); ElMessage.success('Cập nhật thành công'); }
    catch(e) { ElMessage.error('Lỗi refresh'); }
    finally { refreshingProducts.value = false; }
};

onMounted(async () => {
    await loadMasterData();
    await loadBatchIfExists();
});
</script>

<style scoped>
.pl-34 { padding-left: 136px; }
</style>
