<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { supplyApi, CreateExternalBatchDto, ExportBatchDto, AssignCodesToBatchDto } from '../api/supplyApi';
import { productApi } from '@/modules/core/api/product';
import { tenantApi } from '@/modules/core/api/tenant';
import { transportApi } from '../api/transportApi';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  Plus, Edit, Delete, Box, Download, Connection, 
  Search, Refresh, Close, VideoPlay, ArrowRight,
  Picture, Operation, Tickets, List, Coordinate,
  Management, Calendar, Setting, Stamp, CopyDocument, View
} from '@element-plus/icons-vue';

import MediaManager from '@/modules/core/components/MediaManager.vue';

const router = useRouter();

// State
const loading = ref(false);
const batches = ref<any[]>([]);
const products = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const tenants = ref<any[]>([]);
const searchQuery = ref('');
const productFilter = ref('');
const hideEmptyStock = ref(true);

// Pagination State
const currentPage = ref(1);
const pageSize = ref(10);
const totalBatches = ref(0);
const statsData = ref({
  allCount: 0,
  hasStock: 0,
  zeroStock: 0,
  totalWeight: 0
});

const weightUnits = [
  { label: 'Tấn', value: 'ton', rate: 1000 },
  { label: 'Tạ', value: 'quintal', rate: 100 },
  { label: 'Yến', value: 'yen', rate: 10 },
  { label: 'Kg', value: 'kg', rate: 1 }
];
const inputUnit = ref('ton');
const displayQuantity = ref(1);

// Dialogs
const showBatchDialog = ref(false);
const showBatchId = ref(false);
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

import { VIETNAM_PROVINCES } from '@/common/data/provinces';

const provinces = VIETNAM_PROVINCES;



const initialSourceInfo = () => ({
  // Nhóm 1: Thông tin Sơ chế & Nhập kho
  processingUnit: '',
  production_address: '', // Địa điểm sơ chế (Tỉnh/Thành)
  // Nhóm 2: Nguồn gốc & Canh tác
  seedOwner: '',
  seedBatchCode: '',
  growingRegion: '',
  plantingDate: null,
  harvestDate: null,
  cultivationProcess: '',
  farmingLogs: [],
  // Nhóm 3: Tùy chỉnh & Ghi chú
  customFields: [],
  customBlocks: [],
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

const addFarmingLog = () => {
  if (!batchForm.value.source_info.farmingLogs) {
    batchForm.value.source_info.farmingLogs = [];
  }
  batchForm.value.source_info.farmingLogs.push({
    completedAt: null,
    title: '',
    description: '',
    images: []
  });
};

const removeFarmingLog = (index: number) => {
  batchForm.value.source_info.farmingLogs.splice(index, 1);
};

const showLogMediaManager = ref(false);
const activeLogIndexForMedia = ref<number | null>(null);

const openLogMediaManager = (index: number) => {
  activeLogIndexForMedia.value = index;
  showLogMediaManager.value = true;
};

const handleLogMediaSelect = (selected: any) => {
  const index = activeLogIndexForMedia.value;
  if (index === null || index === undefined) return;
  
  if (!batchForm.value.source_info.farmingLogs[index]) return;
  
  if (!batchForm.value.source_info.farmingLogs[index].images) {
    batchForm.value.source_info.farmingLogs[index].images = [];
  }
  
  if (Array.isArray(selected)) {
    selected.forEach(url => {
      if (!batchForm.value.source_info.farmingLogs[index].images.includes(url)) {
        batchForm.value.source_info.farmingLogs[index].images.push(url);
      }
    });
  } else {
    if (!batchForm.value.source_info.farmingLogs[index].images.includes(selected)) {
      batchForm.value.source_info.farmingLogs[index].images.push(selected);
    }
  }
};

const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
  return `${baseUrl}${path}`;
};

const activeSections = ref(['general', 'origin']);
const uploadFileList = ref<any[]>([]);

const selectedBatchToCopy = ref('');

const supportedIcons = [
  { label: 'DNA (Sinh học)', value: 'Cpu' },
  { label: 'Địa điểm (Sản xuất)', value: 'Location' },
  { label: 'Bảo vệ (Kiểm định)', value: 'Shield' },
  { label: 'Hộp hàng (Sản phẩm)', value: 'Box' },
  { label: 'Biểu đồ (Thống kê)', value: 'TrendCharts' },
  { label: 'Lịch trình (Thời gian)', value: 'Calendar' },
  { label: 'Chứng chỉ (Danh hiệu)', value: 'Medal' },
  { label: 'Tài liệu (Hồ sơ)', value: 'Document' }
];

const addCustomBlock = () => {
  if (!batchForm.value.source_info.customBlocks) {
    batchForm.value.source_info.customBlocks = [];
  }
  batchForm.value.source_info.customBlocks.push({
    id: 'block_' + Date.now(),
    title: '',
    icon: 'Shield',
    fields: [{ key: '', value: '' }]
  });
};

const removeCustomBlock = (index: any) => {
  batchForm.value.source_info.customBlocks.splice(index, 1);
};

const addBlockField = (bIndex: any) => {
  batchForm.value.source_info.customBlocks[bIndex].fields.push({ key: '', value: '' });
};

const removeBlockField = (bIndex: any, fIndex: any) => {
  batchForm.value.source_info.customBlocks[bIndex].fields.splice(fIndex, 1);
};

const handleCopyStructure = (batchId: string) => {
  if (!batchId) return;
  const targetBatch = batches.value.find(b => b.id === batchId);
  if (targetBatch && targetBatch.sourceInfo) {
    const source = targetBatch.sourceInfo;
    let blocks: any[] = [];
    if (source.customBlocks && Array.isArray(source.customBlocks)) {
      blocks = JSON.parse(JSON.stringify(source.customBlocks));
    } else if (source.customFields && typeof source.customFields === 'object') {
      const fields = Object.entries(source.customFields).map(([key, value]) => ({
        key,
        value: ''
      }));
      if (fields.length > 0) {
        blocks.push({
          id: 'block_default',
          title: 'Thông tin bổ sung',
          icon: 'Box',
          fields: fields
        });
      }
    }
    
    // Reset values to blank for fresh entry
    blocks.forEach(block => {
      block.id = 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      block.fields.forEach((f: any) => {
        f.value = '';
      });
    });

    batchForm.value.source_info.customBlocks = blocks;
    ElMessage.success(`Đã sao chép cấu trúc từ lô ${targetBatch.batchCode}!`);
  }
  selectedBatchToCopy.value = ''; // Reset selection
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
const filteredBatches = computed(() => batches.value);

const stats = computed(() => {
  return {
    totalCount: totalBatches.value,
    totalWeight: statsData.value.totalWeight,
    zeroStock: statsData.value.zeroStock,
    hasStock: statsData.value.hasStock,
    allCount: statsData.value.allCount
  };
});

// Actions
const fetchData = async () => {
  loading.value = true;
  try {
    const [batchesRes, productsRes, tenantsRes, warehousesRes]: any[] = await Promise.all([
      supplyApi.getExternalBatches({
        page: currentPage.value,
        limit: pageSize.value,
        search: searchQuery.value || undefined,
        productId: productFilter.value || undefined,
        hideEmptyStock: hideEmptyStock.value ? 'true' : 'false'
      }),
      productApi.getList({ limit: 100 }),
      tenantApi.getActive({ limit: 100 }),
      transportApi.getWarehouses()
    ]);
    
    // Defensive data parsing
    const resData = batchesRes.data;
    if (resData && typeof resData === 'object' && 'data' in resData) {
      batches.value = resData.data || [];
      totalBatches.value = resData.total || 0;
      if (resData.stats) {
        statsData.value = {
          allCount: resData.stats.allCount || 0,
          hasStock: resData.stats.hasStock || 0,
          zeroStock: resData.stats.zeroStock || 0,
          totalWeight: resData.stats.totalWeight || 0
        };
      }
    } else {
      batches.value = Array.isArray(resData) ? resData : [];
      totalBatches.value = batches.value.length;
      // Fallback
      const all = batches.value;
      const zeroStock = all.filter(b => (Number(b.totalQuantity) || 0) < 0.01).length;
      const hasStock = all.filter(b => (Number(b.totalQuantity) || 0) >= 0.01).length;
      statsData.value = {
        allCount: all.length,
        hasStock,
        zeroStock,
        totalWeight: all.reduce((acc, b) => acc + (Number(b.totalQuantity) || 0), 0)
      };
    }
    
    products.value = productsRes.data?.items || productsRes.data?.data || productsRes.data || [];
    tenants.value = tenantsRes.data?.items || tenantsRes.data?.data || tenantsRes.data || [];
    warehouses.value = warehousesRes.data || [];
    
    console.log('Loaded batches:', batches.value.length);
  } catch (error: any) {
    console.error('Fetch error details:', error);
    const msg = error.response?.data?.message || error.message || 'Không thể tải dữ liệu';
    ElMessage.error(`Lỗi: ${msg}`);
  } finally {
    loading.value = false;
  }
};

// Reset to page 1 on filter changes
watch([productFilter, hideEmptyStock], () => {
  currentPage.value = 1;
  fetchData();
});

let searchTimeout: any = null;
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchData();
  }, 300);
});

// Pagination handlers
const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
  fetchData();
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  fetchData();
};

const handleAdd = () => {
  isEdit.value = false;
  showBatchId.value = false;
  batchForm.value = {
    id: null,
    product_id: '',
    batch_type: 'EXTERNAL',
    quantity: 1,
    target_warehouse_id: '',
    qr_code_serial: '',
    source_info: initialSourceInfo(),
    images: [],
    edit_reason: ''
  };
  uploadFileList.value = [];
  activeSections.value = ['general', 'origin'];
  displayQuantity.value = 1;
  inputUnit.value = 'ton';
  showBatchDialog.value = true;
};

const handleCopyBatchId = (id: string) => {
  if (!id) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(id).then(() => {
      ElMessage.success('Đã sao chép ID lô thành công!');
    }).catch(() => {
      ElMessage.error('Không thể sao chép ID.');
    });
  } else {
    const input = document.createElement('input');
    input.setAttribute('value', id);
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    ElMessage.success('Đã sao chép ID lô thành công!');
  }
};

const handleEdit = (row: any) => {
  isEdit.value = true;
  showBatchId.value = false;
  const source = row.sourceInfo || {};
  
  // Convert customFields object from DB to array for UI
  const customFieldsArr: any[] = [];
  if (source.customFields && typeof source.customFields === 'object') {
    Object.entries(source.customFields).forEach(([key, value]) => {
      customFieldsArr.push({ key, value });
    });
  }

  // Load customBlocks from DB
  let customBlocksArr: any[] = [];
  if (source.customBlocks && Array.isArray(source.customBlocks)) {
    customBlocksArr = JSON.parse(JSON.stringify(source.customBlocks));
  } else if (source.customFields && typeof source.customFields === 'object') {
    // Backward compatibility: Convert flat customFields to a default "Thông tin bổ sung" block
    const fields = Object.entries(source.customFields).map(([key, value]) => ({
      key,
      value: String(value)
    }));
    if (fields.length > 0) {
      customBlocksArr.push({
        id: 'block_default',
        title: 'Thông tin bổ sung',
        icon: 'Box',
        fields: fields
      });
    }
  }

  const qty = Number(row.totalUnitsExpected || 0);
  displayQuantity.value = qty;
  inputUnit.value = 'kg';

  batchForm.value = {
    id: row.id,
    batch_code: row.batchCode,
    product_name: row.product?.name || 'N/A',
    product_id: row.productId,
    batch_type: row.batchType,
    quantity: qty,
    target_warehouse_id: row.warehouseStocks?.[0]?.warehouseId || '',
    qr_code_serial: row.batchQrSerial,
    images: row.images || [],
    edit_reason: '',
    source_info: {
      ...initialSourceInfo(),
      ...source,
      customFields: customFieldsArr,
      customBlocks: customBlocksArr
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
  // Kiểm tra các trường bắt buộc
  if (!batchForm.value.product_id) {
    ElMessage.warning('Vui lòng chọn Sản phẩm');
    return;
  }
  if (!batchForm.value.target_warehouse_id) {
    ElMessage.warning('Vui lòng chọn Kho nhập hàng');
    return;
  }
  if (!displayQuantity.value || displayQuantity.value <= 0) {
    ElMessage.warning('Vui lòng nhập Khối lượng nhập hợp lệ');
    return;
  }
  if (!batchForm.value.source_info.production_address) {
    ElMessage.warning('Vui lòng chọn Địa điểm sơ chế (Tỉnh)');
    return;
  }
  if (!batchForm.value.source_info.seedBatchCode) {
    ElMessage.warning('Vui lòng nhập Mã hiệu lô giống');
    return;
  }
  if (!batchForm.value.source_info.plantingDate) {
    ElMessage.warning('Vui lòng chọn Ngày gieo trồng');
    return;
  }
  if (!batchForm.value.source_info.harvestDate) {
    ElMessage.warning('Vui lòng chọn Ngày thu hoạch');
    return;
  }

  if (isEdit.value && !batchForm.value.edit_reason) {
    ElMessage.warning('Vui lòng nhập Lý do chỉnh sửa để tiếp tục');
    return;
  }
  try {
    const payload = JSON.parse(JSON.stringify(batchForm.value));
    
    // Calculate quantity in KG
    const unitObj = weightUnits.find(u => u.value === inputUnit.value);
    const rate = unitObj ? unitObj.rate : 1;
    payload.quantity = displayQuantity.value * rate;

    // Convert customFields array back to object for DB
    const customFieldsObj: Record<string, any> = {};
    payload.source_info.customFields.forEach((f: any) => {
      if (f.key && f.value) customFieldsObj[f.key] = f.value;
    });

    // Clean and validate customBlocks
    const cleanBlocks = (payload.source_info.customBlocks || [])
      .map((block: any) => ({
        id: block.id,
        title: block.title?.trim(),
        icon: block.icon || 'Shield',
        fields: (block.fields || [])
          .map((f: any) => ({ key: f.key?.trim(), value: f.value?.trim() }))
          .filter((f: any) => f.key)
      }))
      .filter((block: any) => block.title);

    payload.source_info.customBlocks = cleanBlocks;

    // Synchronize flat customFields with customBlocks for backward compatibility
    const syncedFields: Record<string, any> = {};
    cleanBlocks.forEach((block: any) => {
      block.fields.forEach((f: any) => {
        syncedFields[f.key] = f.value;
      });
    });
    // Add legacy fields if any not present in blocks
    Object.entries(customFieldsObj).forEach(([k, v]) => {
      if (!(k in syncedFields)) {
        syncedFields[k] = v;
      }
    });
    payload.source_info.customFields = syncedFields;

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
  if (p) {
    if (p.netWeight && !batchForm.value.source_info.unitWeightKg) {
      let weight = Number(p.netWeight);
      const unit = (p.weightUnit || 'kg').toLowerCase();
      if (unit === 'g' || unit === 'ml') weight /= 1000;
      batchForm.value.source_info.unitWeightKg = weight;
    }

    // Auto-load template if in create mode
    if (!isEdit.value) {
      if (p.attributes && p.attributes.batchTemplate) {
        const template = JSON.parse(JSON.stringify(p.attributes.batchTemplate));
        batchForm.value.source_info.customBlocks = template.map((block: any) => ({
          id: block.id,
          title: block.title,
          icon: block.icon,
          fields: (block.fields || []).map((f: any) => ({ key: f.key, value: '' }))
        }));
        ElMessage.success(`Đã áp dụng mẫu khung thuộc tính của sản phẩm ${p.name}!`);
      } else {
        batchForm.value.source_info.customBlocks = [];
      }
    }
  }
};

const fieldLabels: Record<string, string> = {
  processingUnit: 'Đơn vị sơ chế',
  processingLocation: 'Địa điểm sơ chế',
  seedOwner: 'Chủ lô hạt giống',
  seedBatchCode: 'Mã hiệu lô giống',
  growingRegion: 'Khu vực trồng',
  plantingDate: 'Ngày gieo trồng',
  harvestDate: 'Ngày thu hoạch',
  cultivationProcess: 'Quy trình canh tác',
  note: 'Ghi chú'
};

const getFieldLabel = (key: string) => fieldLabels[key] || key;

const isMetadataField = (key: string) => {
  return ['id', 'customFields'].indexOf(key) === -1;
};

const formatMetadataValue = (key: string, val: any) => {
  if (!val) return '';
  if (key.toLowerCase().includes('date') || key === 'plantingDate' || key === 'harvestDate') {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {}
  }
  return val;
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
        <h1 class="text-2xl font-bold text-gray-800">Quản lý lô nguyên liệu nhập ngoài</h1>
        <p class="text-gray-500 text-sm">Quản lý các lô nguyên liệu nhập từ nguồn ngoài hoặc chuyển giao giữa các chi nhánh</p>
      </div>
      <div class="flex gap-3">
        <el-button @click="router.push('/supply/surplus')" class="!bg-amber-50 !text-amber-700 !border-amber-300 hover:!bg-amber-100">
          📦 Kho dư
        </el-button>
        <el-button type="warning" icon="Connection" @click="showReceiveDialog = true">
          Nhận lô chuyển giao (QR)
        </el-button>
        <el-button type="primary" icon="Plus" @click="handleAdd">
          Nhập lô nguyên liệu ngoài
        </el-button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-4 gap-6 mb-6">
      <el-card shadow="never" class="!bg-blue-50 border-none">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-500 rounded-lg text-white">
            <el-icon :size="24"><Box /></el-icon>
          </div>
          <div>
            <div class="text-sm text-blue-600 font-medium">Tổng số lô</div>
            <div class="text-2xl font-bold text-blue-900">{{ stats.allCount }}</div>
          </div>
        </div>
      </el-card>
      <el-card shadow="never" class="!bg-green-50 border-none">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-500 rounded-lg text-white">
            <el-icon :size="24"><Operation /></el-icon>
          </div>
          <div>
            <div class="text-sm text-green-600 font-medium">Tổng tồn kho</div>
            <div class="text-2xl font-bold text-green-900">{{ stats.totalWeight.toLocaleString() }} kg</div>
          </div>
        </div>
      </el-card>
      <el-card shadow="never" class="!bg-emerald-50 border-none cursor-pointer" @click="hideEmptyStock = false">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-emerald-500 rounded-lg text-white">
            <el-icon :size="24"><Coordinate /></el-icon>
          </div>
          <div>
            <div class="text-sm text-emerald-600 font-medium">Còn tồn kho</div>
            <div class="text-2xl font-bold text-emerald-900">{{ stats.hasStock }}</div>
          </div>
        </div>
      </el-card>
      <el-card shadow="never" class="!bg-red-50 border-none cursor-pointer" @click="hideEmptyStock = true">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-red-400 rounded-lg text-white">
            <el-icon :size="24"><Close /></el-icon>
          </div>
          <div>
            <div class="text-sm text-red-500 font-medium">Đã hết tồn kho</div>
            <div class="text-2xl font-bold text-red-700">{{ stats.zeroStock }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Filter Bar -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center gap-4">
      <div class="flex gap-4 flex-1">
        <div class="w-80">
          <el-input
            v-model="searchQuery"
            placeholder="Tìm theo mã lô hoặc sản phẩm..."
            :prefix-icon="Search"
            clearable
          />
        </div>
        <div class="w-64">
          <el-select v-model="productFilter" placeholder="Lọc theo sản phẩm" clearable class="w-full">
            <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </div>
      </div>
      <el-button-group>
        <el-button :icon="Refresh" @click="fetchData">Làm mới</el-button>
        <el-button 
          :type="hideEmptyStock ? 'warning' : 'default'" 
          @click="hideEmptyStock = !hideEmptyStock"
        >
          <el-icon class="mr-1"><View /></el-icon>
          {{ hideEmptyStock ? 'Đang ẩn lô hết tồn' : 'Ẩn lô hết tồn' }}
        </el-button>
      </el-button-group>
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
                      <div v-if="val && isMetadataField(key) && ['seedOwner', 'seedBatchCode', 'growingRegion', 'plantingDate', 'harvestDate', 'cultivationProcess', 'processingUnit', 'production_address'].includes(key)" class="flex text-sm">
                        <span class="w-32 text-gray-400">{{ getFieldLabel(key) }}:</span>
                        <span class="text-gray-700 font-medium">{{ formatMetadataValue(key, val) }}</span>
                      </div>
                    </template>
                  </div>
                  <div v-if="row.sourceInfo?.farmingLogs && row.sourceInfo.farmingLogs.length" class="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
                    <h5 class="text-xs font-bold text-gray-500 flex items-center gap-1">
                      <el-icon class="text-green-600"><Calendar /></el-icon>
                      Nhật ký canh tác ({{ row.sourceInfo.farmingLogs.length }})
                    </h5>
                    <div v-for="(log, idx) in row.sourceInfo.farmingLogs" :key="idx" class="text-xs bg-white p-2.5 rounded border border-gray-200 shadow-xs">
                      <div class="flex justify-between font-bold text-blue-600 mb-1">
                        <span>{{ log.title }}</span>
                        <span class="text-gray-400 font-normal">{{ formatMetadataValue('completedAt', log.completedAt) }}</span>
                      </div>
                      <p class="text-gray-600" v-if="log.description">{{ log.description }}</p>
                      <div v-if="log.images?.length" class="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
                        <el-image 
                          v-for="img in log.images" 
                          :key="img" 
                          :src="img" 
                          class="w-8 h-8 rounded border"
                          :preview-src-list="log.images"
                          fit="cover"
                        />
                      </div>
                    </div>
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
                        <span class="text-gray-700 font-medium">{{ formatMetadataValue(key, val) }}</span>
                      </div>
                    </template>
                  </div>
                </div>

                <div class="space-y-4 col-span-2 sm:col-span-1">
                  <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <el-icon><Operation /></el-icon> Thông tin bổ sung (Khối thông tin)
                  </h4>
                  <div class="flex flex-col gap-3">
                    <!-- If has customBlocks, render block by block -->
                    <template v-if="row.sourceInfo?.customBlocks && row.sourceInfo.customBlocks.length">
                      <div 
                        v-for="block in row.sourceInfo.customBlocks" 
                        :key="block.id"
                        class="bg-white p-2.5 rounded border border-gray-200 shadow-sm"
                      >
                        <div class="flex items-center gap-1.5 font-bold text-xs text-blue-600 mb-1.5 pb-1 border-b border-gray-100">
                          <el-icon><component :is="block.icon || 'Shield'" /></el-icon>
                          <span>{{ block.title }}</span>
                        </div>
                        <div class="grid grid-cols-1 gap-1 pl-4 border-l border-blue-100">
                          <div v-for="f in block.fields" :key="f.key" class="flex text-xs">
                            <span class="w-28 text-gray-400">{{ f.key }}:</span>
                            <span class="text-gray-700 font-medium">{{ f.value }}</span>
                          </div>
                        </div>
                      </div>
                    </template>
                    <!-- Fallback to legacy customFields if customBlocks is empty -->
                    <template v-else-if="row.sourceInfo?.customFields && Object.keys(row.sourceInfo.customFields).length">
                      <div class="grid grid-cols-1 gap-1">
                        <div v-for="(val, key) in row.sourceInfo.customFields" :key="key" class="flex text-sm">
                          <span class="w-32 text-gray-400">{{ key }}:</span>
                          <span class="text-gray-700 font-medium">{{ val }}</span>
                        </div>
                      </div>
                    </template>
                    <div v-else class="text-xs text-gray-400 italic">Không có thuộc tính bổ sung</div>
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

              <!-- ★ Lịch sử đóng gói -->
              <div v-if="row.childBatches?.length || row.productionOrders?.length" class="mt-5 border-t border-gray-200 pt-4">
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <el-icon class="text-orange-500"><Tickets /></el-icon> Lịch sử đóng gói / Sản xuất
                  <el-tag size="small" type="warning" class="ml-1">{{ (row.childBatches?.length || 0) + (row.productionOrders?.length || 0) }} phiếu</el-tag>
                </h4>

                <!-- Lô bán thành phẩm -->
                <div v-if="row.childBatches?.length" class="mb-3">
                  <div class="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                    <el-icon><Box /></el-icon> Lô bán thành phẩm ({{ row.childBatches.length }})
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full text-xs border-collapse">
                      <thead>
                        <tr class="bg-blue-50 text-blue-700">
                          <th class="px-3 py-1.5 text-left font-semibold border-b border-blue-100">Mã lô</th>
                          <th class="px-3 py-1.5 text-left font-semibold border-b border-blue-100">Sản phẩm</th>
                          <th class="px-3 py-1.5 text-right font-semibold border-b border-blue-100">KL nhập (kg)</th>
                          <th class="px-3 py-1.5 text-right font-semibold border-b border-blue-100">KL xuất (kg)</th>
                          <th class="px-3 py-1.5 text-right font-semibold border-b border-blue-100">Số bao</th>
                          <th class="px-3 py-1.5 text-center font-semibold border-b border-blue-100">Trạng thái</th>
                          <th class="px-3 py-1.5 text-left font-semibold border-b border-blue-100">Nơi SX</th>
                          <th class="px-3 py-1.5 text-left font-semibold border-b border-blue-100">Ngày đóng gói</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="child in row.childBatches" :key="child.id" class="hover:bg-blue-50/50 transition-colors">
                          <td class="px-3 py-1.5 border-b border-gray-100">
                            <span class="font-mono font-bold text-blue-600">{{ child.batchCode }}</span>
                          </td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-gray-700">{{ child.productName || '-' }}</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-right font-medium text-orange-600">{{ child.inputWeight?.toLocaleString() || '-' }}</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-right font-medium text-green-600">{{ child.outputWeight?.toLocaleString() || '-' }}</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-right font-bold text-gray-800">{{ child.packCount || 0 }}</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-center">
                            <el-tag size="small" :type="child.status === 'COMPLETED' ? 'success' : 'primary'" effect="light">
                              {{ child.status === 'COMPLETED' ? 'Hoàn thành' : child.status }}
                            </el-tag>
                          </td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-gray-600">{{ child.productionAddress || '-' }}</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-gray-500">{{ child.packagingDate ? formatMetadataValue('date', child.packagingDate) : formatMetadataValue('date', child.createdAt) }}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="bg-gray-50 font-semibold text-gray-700">
                          <td class="px-3 py-1.5" colspan="2">Tổng cộng</td>
                          <td class="px-3 py-1.5 text-right text-orange-600">{{ row.childBatches.reduce((s: number, c: any) => s + (Number(c.inputWeight) || 0), 0).toLocaleString() }}</td>
                          <td class="px-3 py-1.5 text-right text-green-600">{{ row.childBatches.reduce((s: number, c: any) => s + (Number(c.outputWeight) || 0), 0).toLocaleString() }}</td>
                          <td class="px-3 py-1.5 text-right font-bold">{{ row.childBatches.reduce((s: number, c: any) => s + (Number(c.packCount) || 0), 0) }}</td>
                          <td colspan="3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <!-- Phiếu sản xuất -->
                <div v-if="row.productionOrders?.length">
                  <div class="text-xs font-semibold text-purple-600 mb-2 flex items-center gap-1">
                    <el-icon><List /></el-icon> Phiếu sản xuất ({{ row.productionOrders.length }})
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full text-xs border-collapse">
                      <thead>
                        <tr class="bg-purple-50 text-purple-700">
                          <th class="px-3 py-1.5 text-left font-semibold border-b border-purple-100">Mã phiếu</th>
                          <th class="px-3 py-1.5 text-left font-semibold border-b border-purple-100">Sản phẩm</th>
                          <th class="px-3 py-1.5 text-right font-semibold border-b border-purple-100">KL kế hoạch</th>
                          <th class="px-3 py-1.5 text-right font-semibold border-b border-purple-100">KL thực tế</th>
                          <th class="px-3 py-1.5 text-right font-semibold border-b border-purple-100">SL kế hoạch</th>
                          <th class="px-3 py-1.5 text-right font-semibold border-b border-purple-100">SL thực tế</th>
                          <th class="px-3 py-1.5 text-center font-semibold border-b border-purple-100">Trạng thái</th>
                          <th class="px-3 py-1.5 text-left font-semibold border-b border-purple-100">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="order in row.productionOrders" :key="order.id" class="hover:bg-purple-50/50 transition-colors">
                          <td class="px-3 py-1.5 border-b border-gray-100">
                            <span class="font-mono font-bold text-purple-600">{{ order.orderCode }}</span>
                          </td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-gray-700">{{ order.productName || '-' }}</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-right text-gray-600">{{ order.plannedWeightKg?.toLocaleString() || '-' }} kg</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-right font-medium text-green-600">{{ order.actualWeightKg?.toLocaleString() || '-' }} kg</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-right text-gray-600">{{ order.plannedUnits || '-' }}</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-right font-bold text-gray-800">{{ order.actualUnits || '-' }}</td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-center">
                            <el-tag size="small" :type="order.status === 'COMPLETED' ? 'success' : order.status === 'IN_PROGRESS' ? 'warning' : 'info'" effect="light">
                              {{ order.status }}
                            </el-tag>
                          </td>
                          <td class="px-3 py-1.5 border-b border-gray-100 text-gray-500">{{ formatMetadataValue('date', order.createdAt) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">
            {{ (currentPage - 1) * pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="batchCode" label="Mã Lô" width="220">
          <template #default="{ row }">
            <div class="flex flex-col">
              <span class="font-mono font-bold text-blue-600">{{ row.batchCode }}</span>
              <span v-if="row.batchQrSerial" class="text-xs text-gray-400">QR: {{ row.batchQrSerial }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Mã hiệu lô" width="150">
          <template #default="{ row }">
            <span class="font-medium text-gray-700">{{ row.sourceInfo?.seedBatchCode || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Sản phẩm" min-width="200">
          <template #default="{ row }">
            <div class="flex flex-col">
              <span class="font-bold text-gray-800">{{ row.product?.name || 'N/A' }}</span>
              <span v-if="row.sourceInfo?.seedOwner" class="text-xs text-gray-400">Chủ giống: {{ row.sourceInfo.seedOwner }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Kho nhập" width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-1 text-gray-600">
              <el-icon><Box /></el-icon>
              <span>{{ row.warehouseStocks?.[0]?.warehouse?.name || 'Chưa xác định' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Khối lượng (kg)" width="150" align="right">
          <template #default="{ row }">
            <div class="flex flex-col items-end">
              <span class="font-bold text-gray-900">{{ (Number(row.totalUnitsExpected) || 0).toLocaleString() }}</span>
              <span class="text-[10px] text-gray-400 uppercase">Tồn: {{ (Number(row.totalQuantity) || 0).toLocaleString() }} kg</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="200" fixed="right">
          <template #default="{ row }">
            <div class="flex gap-2">
              <el-tooltip content="Xuất lô B2B" placement="top" v-if="Number(row.totalQuantity) > 0.001">
                <el-button type="warning" :icon="Download" circle size="small" @click="openExportDialog(row)" />
              </el-tooltip>
              <el-tooltip content="Chỉnh sửa" placement="top">
                <el-button type="primary" :icon="Edit" circle size="small" @click="handleEdit(row)" />
              </el-tooltip>
              <el-tooltip content="Xóa" placement="top">
                <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(row)" />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 50, 100, 500]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalBatches"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="showBatchDialog"
      width="1000px"
      :close-on-click-modal="false"
      class="rounded-xl"
    >
      <template #header>
        <div class="flex items-center justify-between pr-6 py-2 border-b border-gray-100">
          <div class="flex items-center gap-3 flex-wrap">
            <span class="text-base font-bold text-gray-800">
              {{ isEdit ? 'Chỉnh sửa lô nhập ngoài' : 'Nhập lô nguyên liệu ngoài' }}
            </span>
            <template v-if="isEdit">
              <!-- Hiển thị Mã lô -->
              <span class="px-2 py-0.5 text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded">
                Mã lô: {{ batchForm.batch_code || 'N/A' }}
              </span>
              <!-- Xem/Sao chép ID -->
              <div class="flex items-center gap-2">
                <el-button 
                  v-if="!showBatchId"
                  type="primary" 
                  link 
                  size="small" 
                  :icon="View"
                  @click="showBatchId = true"
                >
                  Xem ID Lô
                </el-button>
                <div v-else class="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                  <span class="text-[10px] font-mono text-gray-500">ID: {{ batchForm.id }}</span>
                  <el-button 
                    type="primary" 
                    link 
                    size="small" 
                    :icon="CopyDocument" 
                    class="!p-0 !h-auto ml-1 font-bold text-blue-600 hover:text-blue-800"
                    @click="handleCopyBatchId(batchForm.id)"
                  >
                    Sao chép
                  </el-button>
                  <el-button 
                    type="danger" 
                    link 
                    size="small" 
                    :icon="Close" 
                    class="!p-0 !h-auto ml-1 font-bold"
                    @click="showBatchId = false"
                  />
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
      <el-form :model="batchForm" label-width="150px" label-position="left">
        <el-collapse v-model="activeSections">
          <!-- Phàn 1: Chung -->
          <el-collapse-item name="general">
            <template #title>
              <div class="flex items-center gap-2 font-bold text-blue-600 uppercase">
                <el-icon><Operation /></el-icon> Thông tin Sơ chế & Nhập kho
              </div>
            </template>
            <div class="grid grid-cols-2 gap-x-8">
              <el-form-item label="Tên sản phẩm" required>
                <el-select v-model="batchForm.product_id" filterable placeholder="Chọn sản phẩm" class="w-full">
                  <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="Kho nhập hàng" required>
                <el-select v-model="batchForm.target_warehouse_id" filterable placeholder="Chọn kho nhập nguyên liệu" class="w-full">
                  <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="Khối lượng nhập" required>
                <div class="flex w-full gap-2">
                  <el-input-number v-model="displayQuantity" :min="0.1" :step="0.1" class="!flex-1" />
                  <el-select v-model="inputUnit" class="!w-32">
                    <el-option v-for="u in weightUnits" :key="u.value" :label="u.label" :value="u.value" />
                  </el-select>
                </div>
                <div class="text-xs text-gray-400 mt-1" v-if="inputUnit !== 'kg'">
                  Quy đổi: {{ (displayQuantity * (weightUnits.find(u => u.value === inputUnit)?.rate || 1)).toLocaleString() }} kg
                </div>
              </el-form-item>
              <el-form-item label="Đơn vị sơ chế">
                <el-input v-model="batchForm.source_info.processingUnit" placeholder="Tên đơn vị thực hiện sơ chế" />
              </el-form-item>
              <el-form-item label="Địa điểm sơ chế (Tỉnh)" required>
                <el-select 
                  v-model="batchForm.source_info.production_address" 
                  placeholder="Chọn tỉnh/thành" 
                  class="w-full"
                  filterable
                >
                  <el-option v-for="p in provinces" :key="p.code" :label="p.name" :value="p.name" />
                </el-select>
              </el-form-item>
              <el-form-item label="Mã QR định danh (nếu có)">
                <el-input v-model="batchForm.qr_code_serial" placeholder="Serial mã tem định danh lô" />
              </el-form-item>
            </div>
          </el-collapse-item>

          <!-- Phần 2: Nguồn gốc & Canh tác -->
          <el-collapse-item name="farming">
            <template #title>
              <div class="flex items-center gap-2 font-bold text-green-600 uppercase">
                <el-icon><Management /></el-icon> Thông tin Canh tác & Nguồn gốc
              </div>
            </template>
            <div class="grid grid-cols-2 gap-x-8">
              <el-form-item label="Chủ lô hạt giống">
                <el-input v-model="batchForm.source_info.seedOwner" placeholder="Tên chủ sở hữu lô giống" />
              </el-form-item>
              <el-form-item label="Mã hiệu lô giống" required>
                <el-input v-model="batchForm.source_info.seedBatchCode" placeholder="Số hiệu/Mã lô giống" />
              </el-form-item>
              <el-form-item label="Khu vực trồng">
                <el-input v-model="batchForm.source_info.growingRegion" placeholder="Xã, Huyện, Tỉnh..." />
              </el-form-item>
              <el-form-item label="Ngày gieo trồng" required>
                <el-date-picker v-model="batchForm.source_info.plantingDate" type="date" class="!w-full" />
              </el-form-item>
              <el-form-item label="Ngày thu hoạch" required>
                <el-date-picker v-model="batchForm.source_info.harvestDate" type="date" class="!w-full" />
              </el-form-item>
              <div class="col-span-2 mt-4">
                <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <span class="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <el-icon class="text-green-600"><Calendar /></el-icon>
                    Nhật ký canh tác lô ngoài
                  </span>
                  <el-button type="primary" size="small" :icon="Plus" plain @click="addFarmingLog">
                    Thêm nhật ký công việc
                  </el-button>
                </div>
                
                <div v-if="!batchForm.source_info.farmingLogs || batchForm.source_info.farmingLogs.length === 0" class="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-lg border border-dashed mb-4">
                  Chưa có nhật ký canh tác nào cho lô ngoài này. Hãy thêm nhật ký công việc ở trên.
                </div>
                
                <div v-else class="flex flex-col gap-4 mb-4">
                  <div 
                    v-for="(log, lIndex) in batchForm.source_info.farmingLogs" 
                    :key="lIndex"
                    class="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm relative"
                  >
                    <el-button 
                      type="danger" 
                      :icon="Delete" 
                      size="small" 
                      circle 
                      plain 
                      class="absolute top-2.5 right-2.5 z-10"
                      @click="removeFarmingLog(Number(lIndex))" 
                    />
                    <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                      <el-form-item label="Ngày thực hiện" required class="!mb-0">
                        <el-date-picker v-model="log.completedAt" type="date" placeholder="Chọn ngày" class="!w-full" />
                      </el-form-item>
                      <el-form-item label="Công việc" required class="!mb-0">
                        <el-input v-model="log.title" placeholder="Ví dụ: Bón phân, Tưới nước, Làm cỏ..." />
                      </el-form-item>
                      <el-form-item label="Nội dung" class="col-span-2 !mb-0">
                        <el-input v-model="log.description" type="textarea" :rows="2" placeholder="Chi tiết các công việc đã thực hiện..." />
                      </el-form-item>
                      <el-form-item label="Ảnh minh chứng" class="col-span-2 !mb-0">
                        <div class="flex flex-wrap gap-2">
                          <div 
                            v-for="(img, imgIndex) in log.images" 
                            :key="imgIndex" 
                            class="relative group w-20 h-20 border rounded overflow-hidden"
                          >
                            <el-image :src="getImageUrl(img)" class="w-full h-full object-cover" fit="cover" />
                            <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                              <el-button 
                                type="danger" 
                                :icon="Delete" 
                                circle 
                                size="small" 
                                @click="log.images.splice(imgIndex, 1)" 
                              />
                            </div>
                          </div>
                          
                          <div 
                            class="w-20 h-20 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center hover:border-blue-500 cursor-pointer bg-white"
                            @click="openLogMediaManager(Number(lIndex))"
                          >
                            <el-icon class="text-lg text-gray-400"><Plus /></el-icon>
                            <span class="text-[10px] text-gray-400 mt-1">Chọn ảnh</span>
                          </div>
                        </div>
                      </el-form-item>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-item>

          <!-- Phần 3: Các khối dữ liệu tùy chỉnh (Custom Blocks) -->
          <el-collapse-item name="customBlocks">
            <template #title>
              <div class="flex items-center justify-between w-full pr-4 font-bold text-blue-600 uppercase">
                <div class="flex items-center gap-2">
                  <el-icon><Setting /></el-icon> Các khối thông tin bổ sung (Custom Blocks)
                </div>
                <div class="flex gap-2 items-center" @click.stop>
                  <!-- Quick copy from batch structure dropdown -->
                  <el-select 
                    v-model="selectedBatchToCopy" 
                    placeholder="Sao chép khung từ lô cũ..." 
                    size="small" 
                    style="width: 220px;"
                    @change="handleCopyStructure"
                    clearable
                  >
                    <el-option 
                      v-for="b in filteredBatches.slice(0, 10)" 
                      :key="b.id" 
                      :label="b.batchCode + ' (' + b.product?.name + ')'" 
                      :value="b.id" 
                    />
                  </el-select>
                  <el-button type="primary" size="small" :icon="Plus" plain @click="addCustomBlock">Thêm Khối mới</el-button>
                </div>
              </div>
            </template>
            
            <div v-if="!batchForm.source_info.customBlocks || batchForm.source_info.customBlocks.length === 0" class="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-lg border border-dashed">
              Chưa có khối thông tin bổ sung nào. Bạn có thể tự thêm khối mới hoặc chọn mẫu tự động khi chọn sản phẩm.
            </div>

            <div v-else class="flex flex-col gap-4">
              <div 
                v-for="(block, bIndex) in batchForm.source_info.customBlocks" 
                :key="block.id" 
                class="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                <!-- Block Header -->
                <div class="flex justify-between items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <div class="flex items-center gap-2 flex-1">
                    <el-input 
                      v-model="block.title" 
                      placeholder="Tên khối (VD: Dữ liệu Kiểm định)" 
                      size="small"
                      style="max-width: 250px"
                    />
                    <el-select v-model="block.icon" placeholder="Icon" size="small" style="width: 150px">
                      <el-option v-for="ico in supportedIcons" :key="ico.value" :label="ico.label" :value="ico.value">
                        <span class="flex items-center gap-2">
                          <el-icon><component :is="ico.value" /></el-icon>
                          <span>{{ ico.label }}</span>
                        </span>
                      </el-option>
                    </el-select>
                  </div>
                  <el-button type="danger" :icon="Delete" size="small" circle plain @click="removeCustomBlock(bIndex)" />
                </div>

                <!-- Block Fields -->
                <div class="pl-4 border-l-2 border-blue-200 flex flex-col gap-2">
                  <div v-for="(field, fIndex) in block.fields" :key="fIndex" class="flex gap-2 items-center">
                    <el-input 
                      v-model="field.key" 
                      placeholder="Tên trường (VD: Độ ẩm)" 
                      size="small" 
                      style="flex: 1"
                    />
                    <el-input 
                      v-model="field.value" 
                      placeholder="Giá trị (VD: 12.8%)" 
                      size="small" 
                      style="flex: 1"
                    />
                    <el-button type="danger" :icon="Delete" size="small" circle plain @click="removeBlockField(bIndex, fIndex)" />
                  </div>
                  
                  <el-button type="dashed" size="small" class="w-full mt-1" :icon="Plus" @click="addBlockField(bIndex)">
                    Thêm trường dữ liệu
                  </el-button>
                </div>
              </div>
            </div>
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

        <!-- Lý do chỉnh sửa -->
        <div v-if="isEdit" class="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
          <el-form-item label="Lý do chỉnh sửa" required class="!mb-0">
            <el-input 
              v-model="batchForm.edit_reason" 
              type="textarea" 
              :rows="2" 
              placeholder="Nhập lý do thay đổi thông tin phiếu nhập..." 
            />
          </el-form-item>
        </div>

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

    <MediaManager 
      v-model="showLogMediaManager" 
      :multiple="true"
      @select="handleLogMediaSelect"
    />
  </div>
</template>

<style scoped>
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
