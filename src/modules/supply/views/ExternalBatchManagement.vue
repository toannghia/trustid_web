<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supplyApi, CreateExternalBatchDto, ExportBatchDto, AssignCodesToBatchDto } from '../api/supplyApi';
import { productApi } from '@/modules/core/api/product';
import { tenantApi } from '@/modules/core/api/tenant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  Plus, Edit, Delete, Box, Download, Connection, 
  Search, Refresh, Close, VideoPlay, ArrowRight,
  Picture, Operation, Tickets, List, Coordinate,
  Management, Calendar, Setting, Stamp
} from '@element-plus/icons-vue';

const router = useRouter();

// State
const loading = ref(false);
const batches = ref<any[]>([]);
const products = ref<any[]>([]);
const tenants = ref<any[]>([]);
const searchQuery = ref('');

// Dialogs
const showBatchDialog = ref(false);
const isEdit = ref(false);

const SUGGESTED_FIELDS = [
  { key: 'Giống cây', category: 'crop' },
  { key: 'Độ cao trồng', category: 'crop' },
  { key: 'Nguồn nước', category: 'aqua' },
  { key: 'Mật độ nuôi', category: 'aqua' },
  { key: 'Giống vật nuôi', category: 'livestock' },
  { key: 'Thức ăn', category: 'livestock' },
  { key: 'Hạn sử dụng', category: 'general' },
  { key: 'Mã vùng trồng', category: 'general' },
  { key: 'Phương pháp chế biến', category: 'general' },
];

const initialSourceInfo = () => ({
  // Nhóm 1: Nguồn gốc
  supplier: '',
  supplierAddress: '',
  supplierPhone: '',
  supplierCert: '',
  // Nhóm 2: Canh tác
  plantingDate: null,
  growingRegion: '',
  farmArea: null,
  cultivationProcess: '',
  fertilizers: '',
  pesticides: '',
  // Nhóm 3: Thu hoạch
  harvestDate: null,
  totalWeightKg: null,
  unitWeightKg: null,
  harvestMethod: '',
  // Nhóm 4: Chế biến
  processingDate: null,
  processingMethod: '',
  storageCondition: '',
  // Nhóm 5: Chất lượng
  qualityGrade: '',
  moisturePercent: null,
  labTestResult: '',
  certifications: [],
  // Nhóm 6: Tùy chỉnh (Array of objects for UI)
  customFields: [],
  note: ''
});

const batchForm = ref<any>({
  id: null,
  product_id: '',
  batch_type: 'EXTERNAL',
  quantity: 1,
  qr_code_serial: '',
  source_info: initialSourceInfo(),
  images: []
});

const activeSections = ref(['general', 'origin']);
const uploadFileList = ref<any[]>([]);

const querySearchFields = (queryString: string, cb: any) => {
  const results = queryString
    ? SUGGESTED_FIELDS.filter(f => f.key.toLowerCase().includes(queryString.toLowerCase()))
    : SUGGESTED_FIELDS;
  cb(results.map(f => ({ value: f.key })));
};

const addCustomField = () => {
  batchForm.value.source_info.customFields.push({ key: '', value: '' });
};

const removeCustomField = (index: any) => {
  batchForm.value.source_info.customFields.splice(index, 1);
};

const handleUploadSuccess = (res: any) => {
  if (res.url) {
    batchForm.value.images.push(res.url);
  }
};

const handleRemoveImage = (file: any) => {
  const url = file.url || file.response?.url;
  batchForm.value.images = batchForm.value.images.filter((u: string) => u !== url);
};

const showExportDialog = ref(false);
const exportForm = ref<ExportBatchDto>({
  sourceBatchId: '',
  quantity: 0,
  targetTenantId: '',
  qrCodeSerial: ''
});
const selectedBatchForExport = ref<any>(null);

const showReceiveDialog = ref(false);
const receiveQr = ref('');

// Assign Codes Dialog
const showAssignDialog = ref(false);
const assignBatch = ref<any>(null);
const assignForm = ref({
  start_serial: '',
  end_serial: '',
  excluded_serials: [] as string[]
});
const newExcludedSerial = ref('');
const assignLoading = ref(false);
const assignResult = ref<any>(null);

const assignSummary = computed(() => {
  const s = assignForm.value.start_serial;
  const e = assignForm.value.end_serial;
  if (!s || !e) return null;
  // Simple estimate based on serial format PREFIX-NNNNN
  const sNum = parseInt(s.replace(/\D/g, '')) || 0;
  const eNum = parseInt(e.replace(/\D/g, '')) || 0;
  if (eNum < sNum) return null;
  const total = eNum - sNum + 1;
  const damaged = assignForm.value.excluded_serials.length;
  return { total, damaged, willAssign: total - damaged };
});

const openAssignDialog = (row: any) => {
  assignBatch.value = row;
  assignForm.value = { start_serial: '', end_serial: '', excluded_serials: [] };
  newExcludedSerial.value = '';
  assignResult.value = null;
  showAssignDialog.value = true;
};

const addExcludedSerial = () => {
  const s = newExcludedSerial.value.trim();
  if (s && !assignForm.value.excluded_serials.includes(s)) {
    assignForm.value.excluded_serials.push(s);
  }
  newExcludedSerial.value = '';
};

const removeExcludedSerial = (serial: string) => {
  assignForm.value.excluded_serials = assignForm.value.excluded_serials.filter(s => s !== serial);
};

const handleAssignCodes = async () => {
  if (!assignBatch.value) return;
  assignLoading.value = true;
  try {
    const res = await supplyApi.assignCodesToBatch(assignBatch.value.id, assignForm.value);
    assignResult.value = res.data;
    ElMessage.success(`Đã gán ${res.data.assigned} mã thành công!`);
    fetchData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi khi gán mã');
  } finally {
    assignLoading.value = false;
  }
};

// Computed
const filteredBatches = computed(() => {
  if (!searchQuery.value) return batches.value;
  const q = searchQuery.value.toLowerCase();
  return batches.value.filter(b => 
    b.batchCode.toLowerCase().includes(q) || 
    b.product?.name?.toLowerCase().includes(q)
  );
});

// Actions
const fetchData = async () => {
  loading.value = true;
  try {
    const [batchesRes, productsRes, tenantsRes]: any[] = await Promise.all([
      supplyApi.getExternalBatches(),
      productApi.getList({ limit: 100 }),
      tenantApi.getActive({ limit: 100 })
    ]);
    
    // Defensive data parsing
    batches.value = batchesRes.data?.data || batchesRes.data || [];
    products.value = productsRes.data?.items || productsRes.data?.data || productsRes.data || [];
    tenants.value = tenantsRes.data?.items || tenantsRes.data?.data || tenantsRes.data || [];
    
    console.log('Loaded batches:', batches.value.length);
  } catch (error: any) {
    console.error('Fetch error details:', error);
    const msg = error.response?.data?.message || error.message || 'Không thể tải dữ liệu';
    ElMessage.error(`Lỗi: ${msg}`);
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  isEdit.value = false;
  batchForm.value = {
    id: null,
    product_id: '',
    batch_type: 'EXTERNAL',
    quantity: 1,
    qr_code_serial: '',
    source_info: initialSourceInfo(),
    images: []
  };
  uploadFileList.value = [];
  activeSections.value = ['general', 'origin'];
  showBatchDialog.value = true;
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  const source = row.sourceInfo || {};
  
  // Convert customFields object from DB to array for UI
  const customFieldsArr: any[] = [];
  if (source.customFields && typeof source.customFields === 'object') {
    Object.entries(source.customFields).forEach(([key, value]) => {
      customFieldsArr.push({ key, value });
    });
  }

  batchForm.value = {
    id: row.id,
    product_id: row.productId,
    batch_type: row.batchType,
    quantity: row.totalUnitsExpected,
    qr_code_serial: row.batchQrSerial,
    images: row.images || [],
    source_info: {
      ...initialSourceInfo(),
      ...source,
      customFields: customFieldsArr
    }
  };

  uploadFileList.value = (row.images || []).map((url: string) => ({
    name: url.split('/').pop(),
    url: url
  }));
  
  activeSections.value = ['general', 'origin'];
  showBatchDialog.value = true;
};

const saveBatch = async () => {
  try {
    const payload = JSON.parse(JSON.stringify(batchForm.value));
    
    // Convert customFields array back to object for DB
    const customFieldsObj: Record<string, any> = {};
    payload.source_info.customFields.forEach((f: any) => {
      if (f.key && f.value) customFieldsObj[f.key] = f.value;
    });
    payload.source_info.customFields = customFieldsObj;

    if (isEdit.value) {
      await supplyApi.updateExternalBatch(payload.id, payload);
      ElMessage.success('Cập nhật thành công');
    } else {
      await supplyApi.createExternalBatch(payload);
      ElMessage.success('Tạo lô mới thành công');
    }
    showBatchDialog.value = false;
    fetchData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Có lỗi xảy ra');
  }
};

const onProductSelect = () => {
  const p = products.value.find(item => item.id === batchForm.value.product_id);
  if (p && p.netWeight && !batchForm.value.source_info.unitWeightKg) {
    let weight = Number(p.netWeight);
    const unit = (p.weightUnit || 'kg').toLowerCase();
    if (unit === 'g' || unit === 'ml') weight /= 1000;
    batchForm.value.source_info.unitWeightKg = weight;
  }
};

const fieldLabels: Record<string, string> = {
  supplier: 'Nhà cung cấp',
  supplierAddress: 'Địa chỉ',
  supplierPhone: 'SĐT',
  supplierCert: 'Chứng nhận NCC',
  plantingDate: 'Ngày trồng',
  growingRegion: 'Vùng trồng',
  farmArea: 'Diện tích (ha)',
  cultivationProcess: 'Quy trình',
  fertilizers: 'Phân bón',
  pesticides: 'Thuốc BVTV',
  harvestDate: 'Ngày thu hoạch',
  totalWeightKg: 'KL cả lô (kg)',
  unitWeightKg: 'KL đơn vị (kg)',
  harvestMethod: 'P/P Thu hoạch',
  processingDate: 'Ngày chế biến',
  processingMethod: 'P/P Chế biến',
  storageCondition: 'Bảo quản',
  qualityGrade: 'Phân loại',
  moisturePercent: 'Độ ẩm (%)',
  labTestResult: 'Kiểm định',
  certifications: 'Chứng chỉ',
  note: 'Ghi chú'
};

const getFieldLabel = (key: string) => fieldLabels[key] || key;

const isMetadataField = (key: string) => {
  return ['id', 'customFields'].indexOf(key) === -1;
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `Bạn có chắc chắn muốn xóa lô ${row.batchCode}?`,
    'Xác nhận xóa',
    { type: 'warning' }
  ).then(async () => {
    try {
      await supplyApi.deleteExternalBatch(row.id);
      ElMessage.success('Đã xóa lô');
      fetchData();
    } catch (error: any) {
      ElMessage.error(error.response?.data?.message || 'Không thể xóa lô');
    }
  });
};

const openExportDialog = (row: any) => {
  selectedBatchForExport.value = row;
  const available = row.totalUnitsExpected - row.packCount - (row.exportedQuantity || 0);
  exportForm.value = {
    sourceBatchId: row.id,
    quantity: available,
    targetTenantId: '',
    qrCodeSerial: ''
  };
  showExportDialog.value = true;
};

const handleExport = async () => {
  try {
    await supplyApi.exportBatch(exportForm.value);
    ElMessage.success('Xuất lô thành công');
    showExportDialog.value = false;
    fetchData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi khi xuất lô');
  }
};

const onReceive = async () => {
  if (!receiveQr.value) return;
  try {
    await supplyApi.receiveBatch(receiveQr.value);
    ElMessage.success('Đã nhận lô hàng thành công');
    showReceiveDialog.value = false;
    receiveQr.value = '';
    fetchData();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi khi nhận lô');
  }
};

const startPacking = (row: any) => {
  router.push({
    path: '/supply/packaging',
    query: { batchId: row.id }
  });
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'PACKING': return 'primary';
    case 'COMPLETED': return 'success';
    case 'CLOSED': return 'info';
    case 'CANCELLED': return 'danger';
    default: return 'info';
  }
};

const getBatchTypeLabel = (type: string) => {
  switch (type) {
    case 'FARM': return 'Từ Farm';
    case 'EXTERNAL': return 'Nhập ngoài';
    case 'CROSS_TENANT': return 'Nhận chuyển giao';
    case 'EXPORTED': return 'Đã xuất';
    default: return type;
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Quản lý Lô nhập ngoài</h1>
        <p class="text-gray-500 text-sm">Quản lý các lô hàng nhập từ nguồn ngoài hoặc chuyển giao giữa các chi nhánh</p>
      </div>
      <div class="flex gap-3">
        <el-button type="warning" icon="Connection" @click="showReceiveDialog = true">
          Nhận lô chuyển giao (QR)
        </el-button>
        <el-button type="primary" icon="Plus" @click="handleAdd">
          Thêm lô nhập ngoài
        </el-button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center">
      <div class="w-80">
        <el-input
          v-model="searchQuery"
          placeholder="Tìm theo mã lô hoặc sản phẩm..."
          :prefix-icon="Search"
          clearable
        />
      </div>
      <el-button :icon="Refresh" @click="fetchData">Làm mới</el-button>
    </div>

    <!-- Table -->
    <el-card shadow="never" class="!border-none !rounded-xl shadow-md">
      <el-table :data="filteredBatches" v-loading="loading" style="width: 100%">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="px-12 py-4 bg-gray-50 border-y border-gray-100">
              <div class="grid grid-cols-3 gap-6">
                <!-- Meta Sections -->
                <div class="space-y-4">
                  <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <el-icon><Management /></el-icon> Nguồn gốc & Canh tác
                  </h4>
                  <div class="grid grid-cols-1 gap-1">
                    <template v-for="(val, key) in row.sourceInfo" :key="key">
                      <div v-if="val && isMetadataField(key) && ['supplier', 'supplierAddress', 'plantingDate', 'growingRegion', 'cultivationProcess'].includes(key)" class="flex text-sm">
                        <span class="w-28 text-gray-400">{{ getFieldLabel(key) }}:</span>
                        <span class="text-gray-700 font-medium">{{ val }}</span>
                      </div>
                    </template>
                  </div>
                </div>

                <div class="space-y-4">
                  <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <el-icon><Box /></el-icon> Thu hoạch & Chất lượng
                  </h4>
                  <div class="grid grid-cols-1 gap-1">
                    <template v-for="(val, key) in row.sourceInfo" :key="key">
                      <div v-if="val && isMetadataField(key) && ['harvestDate', 'totalWeightKg', 'unitWeightKg', 'qualityGrade', 'labTestResult'].includes(key)" class="flex text-sm">
                        <span class="w-32 text-gray-400">{{ getFieldLabel(key) }}:</span>
                        <span class="text-gray-700 font-medium">{{ val }}</span>
                      </div>
                    </template>
                  </div>
                </div>

                <div class="space-y-4">
                  <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <el-icon><Operation /></el-icon> Thông tin bổ sung
                  </h4>
                  <div class="grid grid-cols-1 gap-1">
                    <!-- Custom Fields -->
                    <template v-if="row.sourceInfo?.customFields">
                      <div v-for="(val, key) in row.sourceInfo.customFields" :key="key" class="flex text-sm">
                        <span class="w-32 text-gray-400">{{ key }}:</span>
                        <span class="text-gray-700 font-medium">{{ val }}</span>
                      </div>
                    </template>
                    <!-- Images -->
                    <div v-if="row.images?.length" class="mt-2 flex gap-2 overflow-x-auto pb-2">
                      <el-image 
                        v-for="img in row.images" 
                        :key="img" 
                        :src="img" 
                        class="w-12 h-12 rounded border"
                        :preview-src-list="row.images"
                        fit="cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="batchCode" label="Mã Lô" width="220">
          <template #default="{ row }">
            <span class="font-mono font-bold text-blue-600">{{ row.batchCode }}</span>
            <div class="text-[10px] text-gray-400" v-if="row.batchQrSerial">
              Serial: {{ row.batchQrSerial || 'Dán nhãn sau' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Sản phẩm" min-width="200">
          <template #default="{ row }">
            <div class="font-medium text-gray-700">{{ row.product?.name || 'N/A' }}</div>
            <div class="text-xs text-gray-400" v-if="row.sourceInfo?.supplier">Nguồn: {{ row.sourceInfo.supplier }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Loại" width="130">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ getBatchTypeLabel(row.batchType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Dự kiến" width="100" align="center">
          <template #default="{ row }">
            <div class="text-sm font-bold text-gray-700">{{ row.totalUnitsExpected }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Tiến độ" width="180">
          <template #default="{ row }">
            <div class="space-y-1">
              <el-progress 
                :percentage="Math.min(100, Math.round(((row.packCount + (row.exportedQuantity || 0)) / row.totalUnitsExpected) * 100))" 
                :status="row.status === 'COMPLETED' ? 'success' : ''"
                :stroke-width="6"
              />
              <div class="text-[10px] text-gray-400 flex justify-between">
                <span>Gói: {{ row.packCount }}</span>
                <span>Xuất: {{ row.exportedQuantity }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Trạng thái" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="260" fixed="right">
          <template #default="{ row }">
            <div class="flex gap-1">
              <el-tooltip content="Gán mã QR cho bao/thùng" v-if="row.status === 'PACKING'">
                <el-button type="primary" :icon="Stamp" circle size="small" @click="openAssignDialog(row)" />
              </el-tooltip>
              <el-tooltip content="Bắt đầu đóng gói" v-if="row.status === 'PACKING'">
                <el-button type="success" :icon="VideoPlay" circle size="small" @click="startPacking(row)" />
              </el-tooltip>
              <el-tooltip content="Xuất chuyển giao">
                <el-button type="warning" :icon="Download" circle size="small" @click="openExportDialog(row)" />
              </el-tooltip>
              <el-button :icon="Edit" circle size="small" @click="handleEdit(row)" v-if="row.status === 'PACKING'" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(row)" v-if="row.packCount === 0 && row.exportedQuantity === 0" />
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="showBatchDialog"
      :title="isEdit ? 'Cập nhật lô nhập ngoài' : 'Tạo mới lô nhập ngoài'"
      width="780px"
      destroy-on-close
      custom-class="batch-dialog"
    >
      <el-form :model="batchForm" label-width="150px" label-position="left">
        <el-collapse v-model="activeSections">
          <!-- Phàn 1: Chung -->
          <el-collapse-item title="THÔNG TIN CHUNG" name="general">
            <template #title>
              <div class="flex items-center gap-2 font-bold text-blue-600">
                <el-icon><Operation /></el-icon> THÔNG TIN CHUNG
              </div>
            </template>
            <div class="grid grid-cols-2 gap-x-8">
              <el-form-item label="Sản phẩm" required>
                <el-select v-model="batchForm.product_id" filterable placeholder="Chọn sản phẩm" class="w-full" @change="onProductSelect">
                  <el-option
                    v-for="p in products"
                    :key="p.id"
                    :label="p.name"
                    :value="p.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="Số lượng dự kiến" required>
                <el-input-number v-model="batchForm.quantity" :min="1" class="!w-full" />
              </el-form-item>
              <el-form-item label="Mã QR định danh">
                <el-input v-model="batchForm.qr_code_serial" placeholder="Serial mã tem từ kho" />
              </el-form-item>
            </div>
          </el-collapse-item>

          <!-- Phần 2: Nguồn gốc -->
          <el-collapse-item name="origin">
            <template #title>
              <div class="flex items-center gap-2 font-bold text-orange-600">
                <el-icon><Management /></el-icon> NGUỒN GỐC & NHÀ CUNG CẤP
              </div>
            </template>
            <div class="grid grid-cols-2 gap-x-8">
              <el-form-item label="Nhà cung cấp">
                <el-input v-model="batchForm.source_info.supplier" placeholder="Tên trang trại / NCC" />
              </el-form-item>
              <el-form-item label="Điện thoại">
                <el-input v-model="batchForm.source_info.supplierPhone" />
              </el-form-item>
              <el-form-item label="Địa chỉ" class="col-span-2">
                <el-input v-model="batchForm.source_info.supplierAddress" type="textarea" :rows="1" />
              </el-form-item>
              <el-form-item label="Số chứng nhận">
                <el-input v-model="batchForm.source_info.supplierCert" placeholder="VietGAP, GlobalGAP..." />
              </el-form-item>
            </div>
          </el-collapse-item>

          <!-- Phần 3: Canh tác -->
          <el-collapse-item name="farming">
            <template #title>
              <div class="flex items-center gap-2 font-bold text-green-600">
                <el-icon><List /></el-icon> QUY TRÌNH CANH TÁC
              </div>
            </template>
            <div class="grid grid-cols-2 gap-x-8">
              <el-form-item label="Ngày gieo trồng">
                <el-date-picker v-model="batchForm.source_info.plantingDate" type="date" class="!w-full" />
              </el-form-item>
              <el-form-item label="Vùng trồng">
                <el-input v-model="batchForm.source_info.growingRegion" />
              </el-form-item>
              <el-form-item label="Phân bón">
                <el-input v-model="batchForm.source_info.fertilizers" />
              </el-form-item>
              <el-form-item label="Thuốc BVTV">
                <el-input v-model="batchForm.source_info.pesticides" />
              </el-form-item>
            </div>
          </el-collapse-item>

          <!-- Phần 4: Thu hoạch -->
          <el-collapse-item name="harvest">
            <template #title>
              <div class="flex items-center gap-2 font-bold text-purple-600">
                <el-icon><Calendar /></el-icon> THÔNG TIN THU HOẠCH
              </div>
            </template>
            <div class="grid grid-cols-2 gap-x-8">
              <el-form-item label="Ngày thu hoạch">
                <el-date-picker v-model="batchForm.source_info.harvestDate" type="date" class="!w-full" />
              </el-form-item>
              <el-form-item label="Khối lượng cả lô">
                <el-input-number v-model="batchForm.source_info.totalWeightKg" :min="0" class="!w-full" />
              </el-form-item>
              <el-form-item label="Trọng lượng đơn vị">
                <el-input-number v-model="batchForm.source_info.unitWeightKg" :min="0" :precision="3" class="!w-full" />
              </el-form-item>
              <el-form-item label="P/P Thu hoạch">
                <el-input v-model="batchForm.source_info.harvestMethod" />
              </el-form-item>
            </div>
          </el-collapse-item>

          <!-- Phần 5: Tuỳ chỉnh -->
          <el-collapse-item name="custom">
            <template #title>
              <div class="flex items-center gap-2 font-bold text-gray-600">
                <el-icon><Setting /></el-icon> TRƯỜNG TÙY CHỈNH & GỢI Ý
              </div>
            </template>
            <div v-for="(field, index) in batchForm.source_info.customFields" :key="index" class="flex gap-2 mb-2">
              <el-autocomplete
                v-model="field.key"
                :fetch-suggestions="querySearchFields"
                placeholder="Tên trường (VD: Giống cây)"
                class="flex-1"
              />
              <el-input v-model="field.value" placeholder="Giá trị" class="flex-1" />
              <el-button type="danger" :icon="Delete" circle @click="removeCustomField(index)" />
            </div>
            <el-button type="primary" link icon="Plus" @click="addCustomField">Thêm trường dữ liệu</el-button>
          </el-collapse-item>

          <!-- Phần 6: Ảnh -->
          <el-collapse-item name="images">
            <template #title>
              <div class="flex items-center gap-2 font-bold text-blue-500">
                <el-icon><Picture /></el-icon> HÌNH ẢNH & CHỨNG NHẬN
              </div>
            </template>
            <el-upload
              action="/files/upload?folder=batch-docs"
              list-type="picture-card"
              :on-success="handleUploadSuccess"
              :on-remove="handleRemoveImage"
              :file-list="uploadFileList"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-collapse-item>
        </el-collapse>

        <el-form-item label="Ghi chú" class="mt-4">
          <el-input v-model="batchForm.source_info.note" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchDialog = false">Hủy</el-button>
        <el-button type="primary" @click="saveBatch">Lưu thông tin</el-button>
      </template>
    </el-dialog>

    <!-- Dialog Xuất Lô -->
    <el-dialog
      v-model="showExportDialog"
      title="Xuất lô cho đối tác (Sub-Batch)"
      width="500px"
    >
      <div v-if="selectedBatchForExport" class="mb-4 p-3 bg-gray-50 rounded border border-dashed">
        <div class="text-sm font-bold text-gray-700">Lô gốc: {{ selectedBatchForExport.batchCode }}</div>
        <div class="text-xs text-gray-500">Sản phẩm: {{ selectedBatchForExport.product?.name }}</div>
      </div>

      <el-form :model="exportForm" label-width="140px">
        <el-form-item label="Tenant nhận" required>
          <el-select v-model="exportForm.targetTenantId" filterable placeholder="Chọn đối tác nhận" class="w-full">
            <el-option
              v-for="t in tenants"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Số lượng xuất" required>
          <el-input-number v-model="exportForm.quantity" :min="1" class="!w-full" />
        </el-form-item>
        <el-form-item label="Dán mã QR mới">
          <el-input v-model="exportForm.qrCodeSerial" placeholder="Serial tem từ kho cho kiện hàng mới" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showExportDialog = false">Hủy</el-button>
        <el-button type="warning" @click="handleExport">Thực hiện xuất</el-button>
      </template>
    </el-dialog>

    <!-- Dialog Nhận Lô -->
    <el-dialog
      v-model="showReceiveDialog"
      title="Quét nhận lô từ Tenant khác"
      width="400px"
      center
    >
      <div class="text-center py-4">
        <el-icon :size="60" class="text-blue-500 mb-4"><Connection /></el-icon>
        <p class="mb-4 text-sm text-gray-600">Nhập hoặc quét mã QR trên kiện hàng được chuyển giao từ đối tác</p>
        <el-input 
          v-model="receiveQr" 
          placeholder="Quét mã QR tại đây..." 
          @keyup.enter="onReceive"
          size="large"
          class="!w-full"
          autofocus
        />
      </div>
      <template #footer>
        <el-button @click="showReceiveDialog = false">Đóng</el-button>
        <el-button type="primary" @click="onReceive">Xác nhận nhận lô</el-button>
      </template>
    </el-dialog>

    <!-- Dialog Gán Mã -->
    <el-dialog
      v-model="showAssignDialog"
      title="Gán mã QR cho bao / thùng"
      width="600px"
      destroy-on-close
    >
      <div v-if="assignBatch" class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div class="text-sm font-bold text-blue-700">Lô: {{ assignBatch.batchCode }}</div>
        <div class="text-xs text-blue-500">{{ assignBatch.product?.name }} | Đã gán: {{ assignBatch.packCount }} mã</div>
      </div>

      <el-form :model="assignForm" label-width="160px" label-position="left">
        <el-form-item label="Serial bắt đầu" required>
          <el-input v-model="assignForm.start_serial" placeholder="VD: ZPS-00001" />
        </el-form-item>
        <el-form-item label="Serial kết thúc" required>
          <el-input v-model="assignForm.end_serial" placeholder="VD: ZPS-00050" />
        </el-form-item>

        <el-form-item label="Mã tem hỏng/mất">
          <div class="w-full">
            <div class="flex gap-2 mb-2">
              <el-input
                v-model="newExcludedSerial"
                placeholder="VD: ZPS-00012"
                @keyup.enter="addExcludedSerial"
                class="flex-1"
              />
              <el-button type="danger" plain @click="addExcludedSerial" :icon="Plus">Thêm</el-button>
            </div>
            <div v-if="assignForm.excluded_serials.length" class="flex flex-wrap gap-1">
              <el-tag
                v-for="s in assignForm.excluded_serials"
                :key="s"
                closable
                type="danger"
                @close="removeExcludedSerial(s)"
              >
                {{ s }}
              </el-tag>
            </div>
          </div>
        </el-form-item>

        <!-- Summary Preview -->
        <div v-if="assignSummary" class="p-4 bg-gray-50 rounded-lg border mb-4">
          <div class="text-sm font-bold text-gray-700 mb-2">📊 Tổng kết dự kiến</div>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-2xl font-bold text-blue-600">{{ assignSummary.total }}</div>
              <div class="text-xs text-gray-400">Tổng dải</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-red-500">{{ assignSummary.damaged }}</div>
              <div class="text-xs text-gray-400">Hỏng/Mất</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-green-600">{{ assignSummary.willAssign }}</div>
              <div class="text-xs text-gray-400">Sẽ gán</div>
            </div>
          </div>
        </div>

        <!-- Result -->
        <div v-if="assignResult" class="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
          <div class="text-sm font-bold text-green-700 mb-1">✅ Kết quả gán mã</div>
          <div class="text-sm text-green-600">Đã gán: {{ assignResult.assigned }} | Hỏng: {{ assignResult.damaged }} | Tổng lô: {{ assignResult.batchPackCount }}</div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showAssignDialog = false">Đóng</el-button>
        <el-button type="primary" @click="handleAssignCodes" :loading="assignLoading" :disabled="!assignForm.start_serial || !assignForm.end_serial">
          Gán mã đợt này
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
