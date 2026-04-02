<template>
  <div class="p-4 bg-white min-h-screen">
    <h2 class="text-lg font-bold mb-4 uppercase text-center border-b pb-2">Phiếu Đóng Gói Sản Phẩm</h2>
    
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
             
             <!-- Line 2: Chọn Lô SX -->
             <div class="flex items-center gap-2">
                 <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Chọn Lô SX:</label>
                 <el-select 
                    v-model="selectedHarvestCode" 
                    placeholder="Chọn lô thu hoạch..." 
                    filterable 
                    class="flex-1 min-w-0"
                    @change="onHarvestSelect"
                    size="default"
                 >
                    <el-option 
                        v-for="h in harvestList" 
                        :key="h.id" 
                        :label="`${h.batchCode} (${h.productName || 'Chưa rõ SP'}) - ${h.quantityKg}kg`" 
                        :value="h.batchCode" 
                    />
                 </el-select>
             </div>
        </div>

        <!-- RIGHT COL -->
        <div class="space-y-4">
             <!-- Line 2b: Chọn Tên Sản Phẩm field logic matches Sketch right side -->
             <div class="flex items-center gap-2">
                 <label class="w-32 text-sm font-medium text-gray-700 shrink-0">Tên Sản Phẩm:</label>
                 <el-select 
                    v-model="selectedProductId" 
                    placeholder="Chọn sản phẩm..." 
                    filterable 
                    class="flex-1 min-w-0"
                    @change="onProductSelect"
                    size="default"
                 >
                    <el-option 
                        v-for="p in productList" 
                        :key="p.id" 
                        :label="p.name" 
                        :value="p.id" 
                    />
                 </el-select>
                 <div class="flex items-center gap-1 shrink-0">
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
                 <span class="text-xs text-gray-500 italic shrink-0">* Tự động lấy từ SP</span>
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
             <div v-if="selectedPoolInfo" class="text-xs text-blue-600 mt-1 pl-34">
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
            <el-table-column prop="harvestCode" label="Lô SX" min-width="150" />
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
            <el-button size="large" @click="resetForm">Hủy bỏ</el-button>
            <el-button type="primary" size="large" @click="doSave" :loading="saving" :disabled="tableData.length === 0 && !rangeInput">
                Lưu Dữ Liệu
            </el-button>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router'; // Import Route
import { Delete, HomeFilled, Plus, Refresh } from '@element-plus/icons-vue'; // Import Icon
import { farmApi } from '@/modules/farm/api/farmApi';
import { productApi } from '@/modules/core/api/product';
import { codeApi } from '@/modules/core/api/codeApi';
import { supplyApi } from '../api/supplyApi';
import { transportApi, type Warehouse } from '../api/transportApi';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import dayjs from 'dayjs';

const route = useRoute();

// --- STATE ---
const batchCode = ref('PKG-AUTO');
const currentDate = ref(new Date());

const harvestList = ref<any[]>([]);
const productList = ref<any[]>([]);
const poolList = ref<any[]>([]);
const warehouseList = ref<Warehouse[]>([]);

const selectedHarvestCode = ref('');
const selectedProductId = ref('');
const unitWeight = ref(1);
const harvestQuantity = ref(0);
const previouslyPackagedCount = ref(0);

const scanInput = ref('');
const scanInputRef = ref<any>(null);

const isRangeMode = ref(true);
const rangeInput = ref('');
const rangeStart = ref('');
const rangeEnd = ref('');
const selectedPoolId = ref('');

const isCarton = ref(false);
const cartonCode = ref('');

const selectedPoolInfo = computed(() => {
    if (!selectedPoolId.value) return null;
    return poolList.value.find(p => p.id === selectedPoolId.value) || null;
});

const defaultWarehouse = computed(() => {
    return warehouseList.value.find(w => w.isDefault && w.type === 'PRODUCTION');
});

watch(selectedPoolId, (newId) => {
    // Auto-fill Range inputs if Range mode is active and a pool is selected
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

const tableData = ref<any[]>([]);
const saving = ref(false);
const scanning = ref(false);
const activeBatchId = ref<string | null>(null);
const refreshingProducts = ref(false);

// --- COMPUTED STATS ---
const expectedCount = computed(() => {
    if (!harvestQuantity.value || !unitWeight.value) return 0;
    return Math.floor(harvestQuantity.value / unitWeight.value);
});

const currentCount = computed(() => tableData.value.length + previouslyPackagedCount.value);

const fetchHarvestStats = async (harvestCode: string) => {
    if (!harvestCode) {
        previouslyPackagedCount.value = 0;
        return;
    }
    try {
        const res = await supplyApi.getHarvestStats(harvestCode);
        previouslyPackagedCount.value = res.data?.count || 0;
    } catch (e) {
        console.error('Failed to load harvest stats', e);
        previouslyPackagedCount.value = 0;
    }
};

// --- METHODS ---
const loadMasterData = async () => {
    try {
        const [hRes, pRes, poolRes, warehouseRes] = await Promise.all([
             farmApi.getHarvests({}),
             productApi.getList({}),
             codeApi.getPools(),
             transportApi.getWarehouses()
        ]);
        
        // Handle Harvest
        const hData = hRes.data as any;
        if (Array.isArray(hData)) harvestList.value = hData;
        else harvestList.value = hData.data || hData.items || [];

        // Handle Product
        const pData = pRes.data as any;
        if (Array.isArray(pData)) productList.value = pData;
        else productList.value = pData.data || pData.items || [];

        // Handle Pool
        const poolData = poolRes.data as any;
        if (Array.isArray(poolData)) poolList.value = poolData;
        else poolList.value = poolData.data || poolData.items || [];

        // Handle Warehouses
        warehouseList.value = (warehouseRes.data as any) || [];

    } catch (e) {
        console.error(e);
        ElMessage.error('Lỗi tải dữ liệu danh mục');
    }
};

const goToAddProduct = () => {
    // Open product management in a new tab
    window.open('/products', '_blank');
};

const refreshProducts = async () => {
    refreshingProducts.value = true;
    try {
        const pRes = await productApi.getList({});
        const pData = pRes.data as any;
        if (Array.isArray(pData)) productList.value = pData;
        else productList.value = pData.data || pData.items || [];
        ElMessage.success('Đã cập nhật danh sách sản phẩm mới nhất');
    } catch (e) {
        ElMessage.error('Không thể làm mới danh sách sản phẩm');
    } finally {
        refreshingProducts.value = false;
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
            selectedHarvestCode.value = data.farmBatchCode;
            selectedProductId.value = data.productId;
            
            // Restore snapshot data if needed, or rely on Master Data
            if (data.farmDataSnapshot) {
                harvestQuantity.value = data.farmDataSnapshot.quantityKg;
                unitWeight.value = data.farmDataSnapshot.unitWeight;
            }
            
            await fetchHarvestStats(data.farmBatchCode);
        }
    } catch (e) {
        ElMessage.error('Không tìm thấy lô đóng gói');
    }
};

const onHarvestSelect = async () => {
    const h = harvestList.value.find(item => item.batchCode === selectedHarvestCode.value);
    if (h) {
        harvestQuantity.value = h.quantityKg || 0;
    }
    await fetchHarvestStats(selectedHarvestCode.value);
};

const onProductSelect = () => {
    const p = productList.value.find(item => item.id === selectedProductId.value);
    if (p) {
        // 1. Priority: Use standard netWeight and weightUnit
        if (p.netWeight && Number(p.netWeight) > 0) {
            let weight = Number(p.netWeight);
            const unit = (p.weightUnit || 'kg').toLowerCase();
            // Convert everything to KG for display in "Quy cách (kg)"
            if (unit === 'g' || unit === 'ml') {
                weight = weight / 1000;
            }
            unitWeight.value = weight;
            return;
        }

        // 2. Fallback to old attributes if netWeight is missing
        if (p.attributes?.weightKg) unitWeight.value = Number(p.attributes.weightKg);
        else if (p.attributes?.weight) {
             const wStr = String(p.attributes.weight).toLowerCase();
             if (wStr.includes('kg')) unitWeight.value = parseFloat(wStr.replace('kg',''));
             else if (wStr.includes('g')) unitWeight.value = parseFloat(wStr.replace('g','')) / 1000;
        }
    }
};

const validateSelection = () => {
    if (!selectedHarvestCode.value || !selectedProductId.value) {
        ElMessage.error('Vui lòng chọn Lô SX và Sản phẩm trước khi thêm!');
        return false;
    }
    return true;
};

const startScan = async () => {
    if (scanning.value) return; // Prevent concurrent scans from fast hardware scanners
    if (!validateSelection()) return;

    const code = scanInput.value.trim();
    if (!code) return;
    
    // 1. Check local duplicates
    if (tableData.value.find(x => x.code === code || x.codeString === code)) {
        ElMessage.warning('Mã đã tồn tại trong bảng!');
        scanInput.value = '';
        return;
    }
    
    scanning.value = true;
    try {
        // 2. Validate with Backend
        const res = await codeApi.validate(code);
        const info = res.data; // { valid: true, id, serial, status, poolId ... }
        
        if (!info || !info.valid) {
            if (info && info.message) {
                 ElMessage.error(info.message);
            } else {
                 ElMessage.error('Mã không đúng hoặc không phải mã của công ty!');
            }
            return;
        }
        
        if (info.status === 'ACTIVE' || info.isActive) {
            let msg = `Mã "${code}" đã được kích hoạt trước đó!`;
            if (info.batchInfo) {
                const dateStr = dayjs(info.batchInfo.createdAt).format('DD/MM/YYYY');
                msg += ` (Lô: ${info.batchInfo.batchCode} ngày ${dateStr})`;
            }
            msg += ` Tự động bỏ qua.`;
            ElMessage.warning(msg);
            scanInput.value = '';
            return;
        }
        if (info.status === 'SOLD' || info.isSold) {
            ElMessage.warning(`Mã "${code}" đã bán! Tự động bỏ qua.`);
            scanInput.value = '';
            return;
        }

        
        // 3. Check Pool constraints (if Pool selected)
        if (selectedPoolId.value && info.poolId !== selectedPoolId.value) {
             ElMessage.error(`Mã này thuộc lô khác (${info.poolName}), không phải lô đang chọn!`);
             return;
        }

        // 4. Find Product Name
        const pName = productList.value.find(p => p.id === selectedProductId.value)?.name || '';

        // Double check local duplicate after backend response
        if (tableData.value.find(x => x.code === info.serial || x.codeString === info.codeString)) {
            ElMessage.warning('Mã đã tồn tại trong bảng!');
            scanInput.value = '';
            return;
        }

        // 5. Add to table
        tableData.value.unshift({
            code: info.serial || code, // Prefer readable serial
            codeString: info.codeString || '', // New field
            productName: pName,
            harvestCode: selectedHarvestCode.value,
            parentCode: isCarton.value ? cartonCode.value : ''
        });
        
        scanInput.value = ''; // Reset
        ElMessage.success('Thêm thành công');
        
    } catch (e: any) {
        ElMessage.error('Lỗi kiểm tra mã: ' + (e.response?.data?.message || e.message));
    } finally {
        scanning.value = false;
        nextTick(() => scanInputRef.value?.focus());
    }
};

const addRangeOrPool = async () => {
    if (!validateSelection()) return;

    // With the new Checkbox UI:
    // Case 1: Range Mode (Checkbox is checked)
    // Case 2: Comma Separated Mode (Checkbox is NOT checked)
    // There is no longer a separate "Case: Add whole pool" because 
    // selecting a pool auto-populates the Range Mode inputs with the whole pool boundaries.

    // Case 2: Range Mode (Checkbox is checked)
    if (isRangeMode.value) {
        if (!rangeStart.value.trim() || !rangeEnd.value.trim()) {
            ElMessage.warning('Vui lòng nhập đầy đủ mã bắt đầu và kết thúc');
            return;
        }

        const startVal = rangeStart.value.trim();
        const endVal = rangeEnd.value.trim();

        // 1. Expand the range on the client side
        const matchStart = startVal.match(/(\d+)$/);
        const matchEnd = endVal.match(/(\d+)$/);

        if (!matchStart || !matchEnd) {
             ElMessage.error('Định dạng dãy không hợp lệ, phải kết thúc bằng số (VD: A001 đến A005)');
             return;
        }

        const prefixStart = startVal.substring(0, startVal.length - matchStart[0].length);
        const prefixEnd = endVal.substring(0, endVal.length - matchEnd[0].length);

        if (prefixStart !== prefixEnd) {
             ElMessage.error('Tiền tố của dãy mã bắt đầu và kết thúc phải giống nhau');
             return;
        }

        const startNum = parseInt(matchStart[0], 10);
        const endNum = parseInt(matchEnd[0], 10);
        const paddingLength = matchStart[0].length;

        if (startNum > endNum) {
             ElMessage.error('Mã bắt đầu phải nhỏ hơn hoặc bằng mã kết thúc');
             return;
        }

        // Limit range length to avoid catastrophic UI freezes
        if (endNum - startNum > 2000) {
             ElMessage.error('Dãy mã quá lớn (tối đa 2000 mã/lần)');
             return;
        }
        
        if (!selectedPoolId.value) {
             ElMessage.error('Vui lòng chọn Lô mã để hệ thống đối chiếu trạng thái mã.');
             return;
        }

        let addedStr = 0;
        let skipped = 0;

        scanning.value = true;
        try {
            const res = await codeApi.getItems({ 
                poolId: selectedPoolId.value, 
                limit: 5000 
            });
            const poolItems = res.data.data || [];

            for (let i = startNum; i <= endNum; i++) {
                 const numStr = i.toString().padStart(paddingLength, '0');
                 const serial = `${prefixStart}${numStr}`;

                 // Check local duplicate
                 if (tableData.value.find(x => x.code === serial)) {
                     skipped++;
                     continue;
                 }
                 
                 // Verify with backend items
                 const itemMatches = poolItems.find((x: any) => x.serial === serial);
                 
                 if (itemMatches) {
                     if (itemMatches.status !== 'AVAILABLE') {
                         ElMessage.warning(`Mã ${serial} đang ở trạng thái ${itemMatches.status}, bị bỏ qua.`);
                         skipped++;
                         continue;
                     }
                     // Push valid item
                     tableData.value.unshift({
                          code: serial,
                          codeString: itemMatches.codeString,
                          productName: productList.value.find(x => x.id === selectedProductId.value)?.name || '',
                          harvestCode: selectedHarvestCode.value,
                          parentCode: isCarton.value ? cartonCode.value : ''
                     });
                     addedStr++;
                 } else {
                     ElMessage.warning(`Mã ${serial} không thuộc Lô mã đã chọn.`);
                     skipped++;
                 }
            }

            if (addedStr > 0) {
                 ElMessage.success(`Đã thêm ${addedStr} mã. Bỏ qua ${skipped} mã lỗi/trùng.`);
                 rangeStart.value = '';
                 rangeEnd.value = '';
            } else {
                 ElMessage.warning(`Toàn bộ dãy mã đã tồn tại hoặc không hợp lệ.`);
            }
        } catch(e) {
            console.error(e);
            ElMessage.error('Lỗi khi tra cứu danh sách lô mã từ máy chủ');
        } finally {
            scanning.value = false;
        }
        return;
    }

    // Case 3: Comma Separated Mode (Checkbox is NOT checked)
    if (!isRangeMode.value && rangeInput.value.trim()) {
         const parts = rangeInput.value.split(',').map(s => s.trim());
         let addedStr = 0;
         let skipped = 0;
         
         scanning.value = true;
         try {
             for (const p of parts) {
                 if (!p) continue;

                 // Treat 'p' as a single code string (comma separated list)
                 // Check local duplicate
                 if (tableData.value.find(x => x.code === p || x.codeString === p)) {
                     skipped++;
                     continue;
                 }
                 
                 // Validate with Backend
                 try {
                     const res = await codeApi.validate(p);
                     const info = res.data;
                     if (info && info.valid && info.status !== 'ACTIVE' && info.status !== 'SOLD') {
                          tableData.value.unshift({
                              code: info.serial || p,
                              codeString: info.codeString || '',
                              productName: productList.value.find(x => x.id === selectedProductId.value)?.name || '',
                              harvestCode: selectedHarvestCode.value,
                              parentCode: isCarton.value ? cartonCode.value : ''
                          });
                          addedStr++;
                     } else {
                         skipped++;
                     }
                 } catch (e) {
                     skipped++;
                 }
             }

             if (addedStr > 0) {
                 rangeInput.value = '';
                 ElMessage.success(`Đã thêm ${addedStr} chuỗi/mã. Bỏ qua ${skipped} mã lỗi/trùng.`);
             } else if (skipped > 0) {
                 ElMessage.warning(`Không phát hiện mã hợp lệ, bỏ qua ${skipped} mã.`);
             }
         } finally {
             scanning.value = false;
         }
         return;
    }

    ElMessage.warning('Vui lòng nhập Dãy serial hoặc chọn Lô mã');
};

const removeItem = (index: number) => {
    tableData.value.splice(index, 1);
};

// Watch Range Input and Process? Or Button? 
// User asked for "Quét Mã, hoặc chọn dãy mã". 
// Let's process Range input when saving OR on Enter? Maybe blur.
// Let's assume rangeInput is processed on Save for simplicity or we can add a button "Add Range" if complex.
// For now, I'll process rangeInput into tableData automatically on Save OR add a trigger.
// Let's add manually to table if user wants to see it?
// Updated logic: processRangesAndPools on save is safer, but user wants "Danh sách các mã vừa add vào".
// So I should expand Range here?
// If range is "A1-A100", that's 100 rows.
// Let's just treat it as a "Pending Instruction" in the backend payload, unless user wants to see rows.
// For "Dạng như thế này trên một form", the table shows "Lists just added".
// I'll leave Range expansion to Backend to avoid UI lag, but show "Range X-Y" as one row.

const doSave = async () => {
    if (!selectedHarvestCode.value || !selectedProductId.value) {
        ElMessage.error('Vui lòng chọn Lô SX và Sản phẩm!');
        return;
    }

    saving.value = true;
    try {
        // 1. Create Batch (if not exists)
        if (!activeBatchId.value) {
            const batchRes = await supplyApi.createBatch({
                farm_batch_code: selectedHarvestCode.value,
                product_id: selectedProductId.value
            });
            activeBatchId.value = batchRes.data.id;
            batchCode.value = batchRes.data.batchCode;
        }

        // 2. Add Items
        // We now expand ranges directly in the UI, so we only need to submit the list of codes.
        const codes = tableData.value.map(x => x.code);
        
        const payload = {
            batch_id: activeBatchId.value as string,
            codes: codes.length ? codes : undefined,
            parent_code: isCarton.value ? cartonCode.value : undefined
        };
        const { data } = await supplyApi.addItems(payload);
        
        if (data.skipped > 0) {
            ElNotification({
                title: 'Kết quả lưu dữ liệu',
                message: `Lưu hoàn tất! Đã thêm ${data.added} mã. Bỏ qua ${data.skipped} mã đã tồn tại/kích hoạt.`,
                type: 'success',
                duration: 5000
            });
        } else {
            ElMessage.success(`Lưu thành công ${data.added} mã.`);
        }
        
        // Reset Table
        tableData.value = [];
        rangeInput.value = '';
        selectedPoolId.value = '';
        // cartonCode? keep it.
        
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi lưu dữ liệu');
    } finally {
        saving.value = false;
        nextTick(() => scanInputRef.value?.focus());
    }
};

const resetForm = () => {
    ElMessageBox.confirm('Xóa trắng form?', 'Xác nhận').then(() => {
        selectedHarvestCode.value = '';
        selectedProductId.value = '';
        tableData.value = [];
        activeBatchId.value = null;
        batchCode.value = 'PKG-AUTO';
    }).catch(() => {});
};

onMounted(async () => {
    await loadMasterData();
    await loadBatchIfExists(); // Check url param
});
</script>
