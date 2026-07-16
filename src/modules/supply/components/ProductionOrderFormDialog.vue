<template>
  <el-dialog
    v-model="visible"
    width="820px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @closed="resetForm"
    append-to-body
  >
    <template #header>
      <div class="flex justify-between items-center w-full pr-8">
        <span class="text-lg font-bold text-gray-800">
          {{ editMode ? `Chỉnh sửa Lệnh sản xuất: ${form.order_code}` : 'Tạo Lệnh Sản Xuất Mới' }}
        </span>
        <span class="text-xs text-gray-500 font-normal">
          Người tạo: <strong>{{ editMode ? (form.creator || 'N/A') : (authStore.user?.fullName || authStore.user?.full_name || authStore.user?.username || 'N/A') }}</strong>
          <span class="mx-2">•</span>
          Ngày tạo: <strong>{{ editMode ? (form.created_at || 'N/A') : new Date().toLocaleDateString('vi-VN') }}</strong>
        </span>
      </div>
    </template>

    <el-form :model="form" label-position="top" :rules="rules" ref="formRef" v-loading="loadingData">
      
      <!-- Row 2: Sản phẩm và Ngày thực hiện -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Sản phẩm thành phẩm" prop="product_id">
            <el-select
              v-model="form.product_id"
              placeholder="Chọn sản phẩm đóng gói..."
              filterable
              class="w-full"
              @change="onProductChange"
              :disabled="isFieldLocked('product_id')"
            >
              <el-option
                v-for="p in products"
                :key="p.id"
                :label="`${p.name} (${p.sku || p.gtin || 'Không có SKU'})`"
                :value="p.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Ngày thực hiện theo kế hoạch" prop="planned_date">
            <el-date-picker
              v-model="form.planned_date"
              type="date"
              placeholder="Chọn ngày thực hiện..."
              class="w-full"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :disabled="isFieldLocked('planned_date')"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Row 2b: Dòng quy cách sản phẩm - Dài hết khối hiển thị font và màu đồng bộ -->
      <el-row :gutter="20" v-if="form.product_id && selectedProduct" class="mb-3">
        <el-col :span="24">
          <div class="text-sm text-gray-700 flex items-center justify-between bg-gray-50 p-2.5 rounded border border-gray-200">
            <span>
              ℹ️ Quy cách sản phẩm: <strong>{{ form.unit_weight_kg }} kg/gói</strong>
              <span v-if="form.order_type === 'BAG_PACKAGING'"> | Quy cách đóng bao: <strong>{{ form.packaging_spec }} gói/bao</strong></span>
            </span>
            <el-button type="primary" link size="small" @click="goToProductCatalog">
              ✏️ Cập nhật thông tin sản phẩm
            </el-button>
          </div>
        </el-col>
      </el-row>

      <!-- Dòng quy trình đóng gói & Nguyên liệu nhập ngoài (Nằm thẳng thớm) -->
      <div class="flex items-center gap-8 mb-4 mt-2">
        <!-- Đóng bao checkbox inline -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-700">Đóng bao:</span>
          <el-checkbox
            v-model="orderTypeIsBag"
            :disabled="isFieldLocked('order_type')"
          >
            Có
          </el-checkbox>
        </div>

        <!-- Sử dụng nguyên liệu nhập ngoài B2B inline -->
        <div class="flex items-center gap-4 flex-wrap">
          <el-checkbox 
            v-model="form.source_type_checkbox" 
            :disabled="isFieldLocked('source_type')"
          >
            <span class="font-semibold text-gray-700">Nguyên liệu ngoài farm</span>
          </el-checkbox>

          <div v-if="form.source_type_checkbox" class="flex items-center gap-2">
            <span class="text-xs font-semibold text-gray-500">Loại:</span>
            <el-radio-group v-model="form.source_type" @change="onSourceTypeChange" :disabled="isFieldLocked('source_type')" class="!flex items-center">
              <el-radio label="EXTERNAL" class="!mr-4">Nhập ngoài</el-radio>
              <el-radio label="CROSS_TENANT" class="!mr-0">Nhận B2B (Cross-Tenant)</el-radio>
            </el-radio-group>
          </div>
        </div>
      </div>

      <!-- Dòng chọn lô và khối lượng sản xuất cho lên cùng dòng -->
      <el-row :gutter="20">
        <!-- Chọn Lô (Span 14) -->
        <el-col :span="14">
          <!-- FARM selection -->
          <el-form-item
            v-if="form.source_type === 'FARM'"
            label="Chọn Lô Thu Hoạch"
            prop="farm_batch_code"
          >
            <el-select
              v-model="form.farm_batch_code"
              placeholder="Chọn lô thu hoạch của nông trại..."
              filterable
              class="w-full"
              :disabled="isFieldLocked('farm_batch_code')"
            >
              <el-option
                v-for="h in filteredHarvests"
                :key="h.batchCode"
                :label="`${h.batchCode} (${h.product?.name || h.cropCycle?.location?.plantType || h.productName || 'Chưa rõ SP'}) — Khối lượng còn lại: ${h.quantityKg.toFixed(1)} kg`"
                :value="h.batchCode"
              />
            </el-select>
          </el-form-item>

          <!-- B2B / EXTERNAL selection -->
          <el-form-item
            v-else
            :label="form.source_type === 'CROSS_TENANT' ? 'Chọn Lô Nhận B2B (Cross-Tenant)' : 'Chọn Lô Nguyên Liệu Nhập Ngoài'"
            prop="source_batch_id"
          >
            <el-select
              v-model="form.source_batch_id"
              placeholder="Chọn lô nguyên liệu..."
              filterable
              class="w-full"
              :disabled="isFieldLocked('source_batch_id')"
            >
              <el-option
                v-for="b in filteredSourceBatches"
                :key="b.id"
                :label="`${b.batchCode} (${b.product?.name || 'Không rõ SP'}) — Khối lượng còn lại: ${(b.totalQuantity || b.totalUnitsExpected || 0).toFixed(1)} kg`"
                :value="b.id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- Khối lượng kế hoạch (Span 10) -->
        <el-col :span="10">
          <el-form-item label="Khối lượng kế hoạch" prop="planned_weight">
            <div class="flex gap-1 w-full">
              <el-input-number
                v-model="form.planned_weight"
                :min="0"
                :max="maxPlannedWeight"
                :precision="1"
                class="flex-1"
                controls-position="right"
                :disabled="isFieldLocked('planned_weight')"
              />
              <el-select v-model="form.planned_weight_unit" class="w-[75px]" :disabled="isFieldLocked('planned_weight')">
                <el-option label="kg" value="KG" />
                <el-option label="Yến" value="YEN" />
                <el-option label="Tạ" value="TA" />
                <el-option label="Tấn" value="TON" />
              </el-select>
            </div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider>Thông số sản xuất</el-divider>

      <!-- Row 4: Khối sản xuất hiển thị số gói, số bao, gói/bao dự phòng (Căn hàng hoàn hảo không lệch trên dưới) -->
      <el-row :gutter="20" class="items-start">
        <!-- Cột 1: Số gói dự kiến -->
        <el-col :span="6">
          <el-form-item label="Số gói dự kiến">
            <el-input readonly :model-value="estimatedUnits" class="w-full" disabled />
          </el-form-item>
        </el-col>

        <!-- Cột 2: Số bao dự kiến -->
        <el-col :span="6">
          <el-form-item label="Số bao dự kiến">
            <el-input readonly :model-value="form.order_type === 'BAG_PACKAGING' ? estimatedBags : 0" class="w-full" disabled />
          </el-form-item>
        </el-col>

        <!-- Cột 3: Số gói dự phòng -->
        <el-col :span="6">
          <el-form-item label="Số gói dự phòng">
            <el-input-number 
              v-model="form.spare_packet_quantity" 
              :min="0" 
              controls-position="right" 
              class="w-full"
              :disabled="isFieldLocked('planned_weight')"
            />
          </el-form-item>
        </el-col>

        <!-- Cột 4: Số bao dự phòng -->
        <el-col :span="6">
          <el-form-item label="Số bao dự phòng">
            <el-input-number 
              v-slot
              v-model="form.spare_bag_quantity" 
              :min="0" 
              controls-position="right" 
              class="w-full"
              :disabled="isFieldLocked('planned_weight') || form.order_type !== 'BAG_PACKAGING'"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Summary text block -->
      <el-row :gutter="20" class="mt-2 mb-4" v-if="form.order_type === 'BAG_PACKAGING'">
         <el-col :span="24">
           <div class="text-sm text-gray-600 bg-blue-50/50 p-3 rounded border border-blue-100/70 flex items-center justify-between">
             <span>
               📋 <strong>Dự kiến tổng cộng:</strong> 
               <strong class="text-blue-600">{{ estimatedBags }}</strong> lô (bao) + <strong class="text-blue-600">{{ form.spare_bag_quantity }}</strong> dự phòng = <strong class="text-green-600">{{ estimatedBags + form.spare_bag_quantity }}</strong> mã bao.
             </span>
             <span>
               Tổng số gói: <strong class="text-green-600">{{ estimatedUnits + form.spare_packet_quantity }}</strong> mã gói.
             </span>
           </div>
         </el-col>
      </el-row>



      <!-- Row: Prefix serial + Ghi chú -->
      <el-row :gutter="20" class="mt-4">
        <el-col :span="8">
          <el-form-item label="Mã prefix serial" prop="serial_prefix">
            <el-input
              v-model="form.serial_prefix"
              placeholder="VD: AWD"
              :maxlength="4"
              @input="form.serial_prefix = form.serial_prefix.toUpperCase().replace(/[^A-Z0-9]/g, '')"
              :disabled="isFieldLocked('planned_weight')"
            />
            <div class="text-xs text-gray-400 mt-1">
              <span>{{ form.serial_prefix.length }}/4 ký tự</span>
              <span class="mx-2">·</span>
              <span>Serial: <strong class="text-blue-500">{{ serialPreview }}</strong></span>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="16">
          <el-form-item label="Ghi chú / Chỉ dẫn sản xuất" prop="notes">
            <el-input
              v-model="form.notes"
              type="textarea"
              :rows="3"
              placeholder="Nhập ghi chú hoặc yêu cầu QC..."
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          {{ editMode ? 'Cập nhật Lệnh' : 'Tạo Lệnh Sản Xuất' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/modules/core/store/auth';
import { productApi } from '@/modules/core/api/product';
import { farmApi } from '@/modules/farm/api/farmApi';
import { supplyApi } from '../api/supplyApi';
import { productionOrderApi } from '../api/productionOrderApi';
import type { FormInstance, FormRules } from 'element-plus';
import dayjs from 'dayjs';

const emit = defineEmits(['success']);

const visible = ref(false);
const submitting = ref(false);
const loadingData = ref(false);
const formRef = ref<FormInstance>();

const authStore = useAuthStore();

const products = ref<any[]>([]);
const harvestList = ref<any[]>([]);
const allSourceBatches = ref<any[]>([]);

const editMode = ref(false);
const orderId = ref('');
const editStatus = ref('');

const form = reactive({
  order_code: '',
  creator: '',
  created_at: '',
  order_type: 'BAG_PACKAGING' as 'STANDARD' | 'BAG_PACKAGING',
  product_id: '',
  source_type: 'FARM' as 'FARM' | 'EXTERNAL' | 'CROSS_TENANT',
  source_type_checkbox: false,
  source_batch_id: '',
  farm_batch_code: '',
  planned_weight: 100,
  planned_weight_unit: 'KG', // KG, YEN, TA, TON
  planned_weight_kg: 100,
  unit_weight_kg: 1,
  packaging_spec: 0,
  spare_packet_quantity: 0,
  spare_bag_quantity: 0,
  planned_date: '',
  notes: '',
  serial_prefix: ''
});

const rules = reactive<FormRules>({
  product_id: [{ required: true, message: 'Vui lòng chọn sản phẩm thành phẩm', trigger: 'change' }],
  source_type: [{ required: true, message: 'Vui lòng chọn nguồn gốc nguyên liệu', trigger: 'change' }],
  planned_weight: [{ required: true, message: 'Nhập khối lượng kế hoạch', trigger: 'blur' }],
  planned_date: [{ required: true, message: 'Chọn ngày thực hiện theo kế hoạch', trigger: 'change' }]
});

// Edit lock utility
const isFieldLocked = (fieldName: string) => {
  if (!editMode.value) return false;
  if (editStatus.value === 'DRAFT') return false;
  if (editStatus.value === 'APPROVED') {
    const lockedFields = ['product_id', 'planned_weight', 'unit_weight_kg', 'source_type', 'source_batch_id', 'farm_batch_code', 'planned_date', 'order_type'];
    return lockedFields.includes(fieldName);
  }
  return true; // Locked for in progress / completed
};

// Convert planned_weight + unit to planned_weight_kg
const getUnitMultiplier = (unit: string) => {
  switch (unit) {
    case 'TON': return 1000;
    case 'TA': return 100;
    case 'YEN': return 10;
    default: return 1;
  }
};

watch(() => [form.planned_weight, form.planned_weight_unit], () => {
  form.planned_weight_kg = form.planned_weight * getUnitMultiplier(form.planned_weight_unit);
}, { immediate: true });

// Toggle helper for checkbox
const orderTypeIsBag = computed({
  get: () => form.order_type === 'BAG_PACKAGING',
  set: (val: boolean) => {
    form.order_type = val ? 'BAG_PACKAGING' : 'STANDARD';
  }
});

const selectedProduct = computed(() => {
  return products.value.find(p => p.id === form.product_id);
});

const goToProductCatalog = () => {
  if (form.product_id) {
    window.open(`/products?id=${form.product_id}`, '_blank');
  } else {
    window.open('/products', '_blank');
  }
};

// Filter source batches dynamically based on source_type & selected product
const filteredSourceBatches = computed(() => {
  if (!form.product_id) return [];
  return allSourceBatches.value.filter((b: any) => {
    // B2B: lô nhập về có productId khác (sản phẩm A) → không lọc theo productId
    if (form.source_type === 'CROSS_TENANT') {
      return b.batchType === 'CROSS_TENANT' || b.batchType === 'SEMI_FINISHED';
    }

    const isProductMatch = b.productId === form.product_id || b.product?.id === form.product_id;
    if (!isProductMatch) return false;

    if (form.source_type === 'EXTERNAL') {
      return b.batchType === 'EXTERNAL';
    }
    return true;
  });
});

// Filter harvest lots dynamically based on selected product name or product ID
const filteredHarvests = computed(() => {
  if (!form.product_id || !selectedProduct.value) return [];
  const prodId = form.product_id;
  const prodName = selectedProduct.value.name.toLowerCase();
  return harvestList.value.filter((h: any) => {
    // Match by product ID directly if linked
    if (h.productId === prodId || h.product?.id === prodId) {
      return true;
    }
    // Fallback to name-matching logic for legacy harvests
    const plantType = h.cropCycle?.location?.plantType?.toLowerCase() || h.productName?.toLowerCase() || '';
    return plantType && (prodName.includes(plantType) || plantType.includes(prodName));
  });
});

// Enforce weight logic: default to remaining lot weight, only allow decrease
const selectedLotRemainingWeightKg = computed(() => {
  if (form.source_type === 'FARM') {
    if (!form.farm_batch_code) return Infinity;
    const h = harvestList.value.find(item => item.batchCode === form.farm_batch_code);
    return h ? (h.quantityKg || 0) : Infinity;
  } else {
    if (!form.source_batch_id) return Infinity;
    const b = allSourceBatches.value.find(item => item.id === form.source_batch_id);
    return b ? (b.totalQuantity || b.totalUnitsExpected || 0) : Infinity;
  }
});

const maxPlannedWeight = computed(() => {
  const maxKg = selectedLotRemainingWeightKg.value;
  if (maxKg === Infinity) return 999999999;
  const multiplier = getUnitMultiplier(form.planned_weight_unit);
  return Number((maxKg / multiplier).toFixed(2));
});

// Computed values (Default is exactly 0 if product_id is not selected)
const estimatedUnits = computed(() => {
  if (!form.product_id || !form.planned_weight_kg || !form.unit_weight_kg) return 0;
  return Math.ceil(form.planned_weight_kg / form.unit_weight_kg);
});

const serialPreview = computed(() => {
  const base = form.serial_prefix || 'BKG';
  const year = new Date().getFullYear().toString().slice(-2);
  return `${base}-${year}-00001`;
});

const estimatedBags = computed(() => {
  if (!form.product_id || !form.packaging_spec || form.packaging_spec <= 0) return 0;
  return Math.ceil(estimatedUnits.value / form.packaging_spec);
});

// 10% Spares auto-calculation watches
watch(estimatedUnits, (newVal) => {
  if (!isFieldLocked('planned_weight') && form.product_id) {
    form.spare_packet_quantity = Math.ceil(newVal * 0.1);
  } else if (!form.product_id) {
    form.spare_packet_quantity = 0;
  }
});

watch(estimatedBags, (newVal) => {
  if (!isFieldLocked('planned_weight') && form.product_id) {
    form.spare_bag_quantity = Math.ceil(newVal * 0.1);
  } else if (!form.product_id) {
    form.spare_bag_quantity = 0;
  }
});

// Toggle helper for external / B2B checkbox
watch(() => form.source_type_checkbox, (val) => {
  if (!val) {
    form.source_type = 'FARM';
    form.source_batch_id = '';
  } else {
    if (form.source_type === 'FARM') {
      form.source_type = 'EXTERNAL';
      form.farm_batch_code = '';
    }
  }
});

const open = async (order?: any) => {
  resetForm();
  visible.value = true;
  loadingData.value = true;

  if (order) {
    editMode.value = true;
    orderId.value = order.id;
    editStatus.value = order.status;

    form.order_code = order.orderCode || '';
    form.creator = order.creator?.fullName || order.creator?.username || 'N/A';
    form.created_at = order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : 'N/A';
    form.order_type = order.orderType || 'STANDARD';
    form.product_id = order.productId || '';
    form.source_type = order.sourceType || 'FARM';
    form.source_type_checkbox = order.sourceType !== 'FARM';
    form.source_batch_id = order.sourceBatchId || '';
    form.farm_batch_code = order.farmBatchCode || '';
    form.planned_weight_kg = order.plannedWeightKg || 100;
    form.planned_weight = order.plannedWeightKg || 100;
    form.planned_weight_unit = 'KG';
    form.unit_weight_kg = order.unitWeightKg || 1;
    form.packaging_spec = order.packagingSpec || 0;
    form.spare_packet_quantity = order.sparePacketQuantity || 0;
    form.spare_bag_quantity = order.spareBagQuantity || 0;
    form.planned_date = order.plannedDate ? order.plannedDate.substring(0, 10) : '';
    form.notes = order.notes || '';
  } else {
    editMode.value = false;
    orderId.value = '';
    editStatus.value = '';
    form.planned_date = dayjs().format('YYYY-MM-DD');
    form.order_type = 'BAG_PACKAGING';
  }

  try {
    const [pRes, hRes, extRes] = await Promise.all([
      productApi.getList({}),
      farmApi.getHarvests({}),
      supplyApi.getExternalBatches()
    ]);
    products.value = (pRes as any).data?.data || (pRes as any).data || [];
    harvestList.value = (hRes as any).data?.data || (hRes as any).data || [];
    allSourceBatches.value = (extRes as any).data || extRes || [];
  } catch (e) {
    console.error('Failed to load master data for Production Order Form', e);
    ElMessage.error('Lỗi khi tải danh mục sản phẩm/lô thu hoạch');
  } finally {
    loadingData.value = false;
  }
};

const onProductChange = async () => {
  const p = products.value.find(item => item.id === form.product_id);
  if (p && p.netWeight && Number(p.netWeight) > 0) {
    let weight = Number(p.netWeight);
    const unit = (p.weightUnit || 'kg').toLowerCase();
    if (unit === 'g' || unit === 'ml') weight /= 1000;
    form.unit_weight_kg = weight;
  } else {
    form.unit_weight_kg = 1;
  }
  
  if (p && p.defaultPackagingSpec && Number(p.defaultPackagingSpec) > 0) {
      form.packaging_spec = Number(p.defaultPackagingSpec);
  } else {
      form.packaging_spec = 0;
  }

  // Reset selected lots when product changes
  form.farm_batch_code = '';
  form.source_batch_id = '';

  // Clear weight and data fields to 0 when product changes and no lot is selected
  form.planned_weight = 0;
  form.planned_weight_kg = 0;
  form.spare_packet_quantity = 0;
  form.spare_bag_quantity = 0;
};

// Automatically set planned weight to selected lot's remaining weight
watch(() => form.farm_batch_code, (newVal) => {
  if (newVal && !editMode.value) {
    const h = harvestList.value.find(item => item.batchCode === newVal);
    if (h) {
      form.planned_weight = Number((h.quantityKg || 0).toFixed(1));
      form.planned_weight_unit = 'KG';
    }
  } else if (!newVal && !editMode.value) {
    form.planned_weight = 0;
    form.planned_weight_kg = 0;
    form.spare_packet_quantity = 0;
    form.spare_bag_quantity = 0;
  }
});

watch(() => form.source_batch_id, (newVal) => {
  if (newVal && !editMode.value) {
    const b = allSourceBatches.value.find(item => item.id === newVal);
    if (b) {
      form.planned_weight = Number((b.totalQuantity || b.totalUnitsExpected || 0).toFixed(1));
      form.planned_weight_unit = 'KG';
    }
  } else if (!newVal && !editMode.value) {
    form.planned_weight = 0;
    form.planned_weight_kg = 0;
    form.spare_packet_quantity = 0;
    form.spare_bag_quantity = 0;
  }
});



const onSourceTypeChange = () => {
  form.source_batch_id = '';
  form.farm_batch_code = '';
  form.planned_weight = 0;
  form.planned_weight_kg = 0;
  form.spare_packet_quantity = 0;
  form.spare_bag_quantity = 0;
};

const executeSubmit = async () => {
  if (form.source_type === 'FARM' && !form.farm_batch_code) {
    return ElMessage.warning('Vui lòng chọn Lô Thu Hoạch');
  }
  if (form.source_type !== 'FARM' && !form.source_batch_id) {
    return ElMessage.warning('Vui lòng chọn Lô Nguồn nguyên liệu');
  }

  submitting.value = true;
  try {
    const payload: any = { 
      product_id: form.product_id,
      source_type: form.source_type,
      planned_weight_kg: form.planned_weight_kg,
      unit_weight_kg: form.unit_weight_kg,
      planned_date: form.planned_date,
      notes: form.notes
    };
    
    if (form.source_type === 'FARM') {
      payload.farm_batch_code = form.farm_batch_code;
    } else {
      payload.source_batch_id = form.source_batch_id;
    }

    if (form.order_type === 'BAG_PACKAGING') {
        payload.packaging_spec = form.packaging_spec;
        payload.spare_packet_quantity = form.spare_packet_quantity;
        payload.spare_bag_quantity = form.spare_bag_quantity;
        if (form.serial_prefix) {
          payload.serial_prefix = form.serial_prefix;
        }
    }

    if (editMode.value) {
      const { data } = await productionOrderApi.updateOrder(orderId.value, payload);
      ElMessage.success('Cập nhật Lệnh Sản Xuất thành công!');
      visible.value = false;
      emit('success', data);
    } else {
      if (form.order_type === 'BAG_PACKAGING') {
          const { data } = await productionOrderApi.createBagOrder(payload);
          ElMessage.success('Tạo Lệnh Sản Xuất Đóng Bao thành công!');
          visible.value = false;
          emit('success', data);
      } else {
          const { data } = await productionOrderApi.createOrder(payload);
          ElMessage.success('Tạo Lệnh Sản Xuất thành công!');
          visible.value = false;
          emit('success', data);
      }
    }
  } catch (err: any) {
    console.error(err);
    let msg = 'Lỗi khi lưu Lệnh Sản Xuất';
    if (err?.response?.data?.message) {
      const serverMsg = err.response.data.message;
      msg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
    } else if (err?.message) {
      msg = err.message;
    }
    ElMessage.error(msg);
  } finally {
    submitting.value = false;
  }
};

const submitForm = () => {
  if (!formRef.value) return;
  formRef.value.validate((valid) => {
    if (valid) {
      executeSubmit();
    }
  });
};

const resetForm = () => {
  if (formRef.value) formRef.value.resetFields();
  form.order_code = '';
  form.creator = '';
  form.created_at = '';
  form.order_type = 'STANDARD';
  form.product_id = '';
  form.source_type = 'FARM';
  form.source_type_checkbox = false;
  form.source_batch_id = '';
  form.farm_batch_code = '';
  form.planned_weight = 0;
  form.planned_weight_unit = 'KG';
  form.planned_weight_kg = 0;
  form.unit_weight_kg = 1;
  form.packaging_spec = 0;
  form.spare_packet_quantity = 0;
  form.spare_bag_quantity = 0;
  form.planned_date = '';
  form.notes = '';
  form.serial_prefix = '';
};

defineExpose({ open });
</script>

<style scoped>
/* Scoped styles for precise spacing */
</style>
