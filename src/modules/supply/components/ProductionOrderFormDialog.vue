<template>
  <el-dialog
    v-model="visible"
    title="Tạo Lệnh Sản Xuất Mới"
    width="820px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @closed="resetForm"
    append-to-body
  >
    <el-form :model="form" label-position="top" :rules="rules" ref="formRef" v-loading="loadingData">
      
      <!-- Row 1: Thông tin nguồn và người tạo -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Người tạo lệnh (User)">
            <el-input :value="authStore.user?.fullName || authStore.user?.full_name || authStore.user?.username || 'N/A'" disabled class="premium-disabled-input" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Ngày tạo lệnh">
            <el-input :value="new Date().toLocaleDateString('vi-VN')" disabled class="premium-disabled-input" />
          </el-form-item>
        </el-col>
      </el-row>

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
            />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Row 3: Nguồn gốc nguyên liệu -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Nguồn gốc nguyên liệu" prop="source_type">
            <el-radio-group v-model="form.source_type" class="w-full-flex" @change="onSourceTypeChange">
              <el-radio-button label="FARM">Từ Farm</el-radio-button>
              <el-radio-button label="EXTERNAL">Nhập ngoài</el-radio-button>
              <el-radio-button label="CROSS_TENANT">Nhận B2B (Cross-Tenant)</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>

        <el-col :span="12">
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
            >
              <el-option
                v-for="h in harvestList"
                :key="h.batchCode"
                :label="`${h.batchCode} (${h.productName || 'Chưa rõ SP'}) - ${h.quantityKg.toFixed(1)}kg`"
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
            >
              <el-option
                v-for="b in filteredSourceBatches"
                :key="b.id"
                :label="`${b.batchCode} (${b.product?.name || 'Không rõ SP'}) - Còn lại: ${(b.totalQuantity || b.totalUnitsExpected || 0).toFixed(1)} kg`"
                :value="b.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider>Thông số sản xuất</el-divider>

      <!-- Row 4: Khối lượng và Quy cách -->
      <el-row :gutter="20">
        <el-col :span="10">
          <el-form-item label="Khối lượng kế hoạch" prop="planned_weight">
            <div class="flex gap-2 w-full">
              <el-input-number
                v-model="form.planned_weight"
                :min="0.1"
                :precision="1"
                class="flex-1"
                controls-position="right"
              />
              <el-select v-model="form.planned_weight_unit" class="w-[90px]">
                <el-option label="kg" value="KG" />
                <el-option label="Yến" value="YEN" />
                <el-option label="Tạ" value="TA" />
                <el-option label="Tấn" value="TON" />
              </el-select>
            </div>
            <div v-if="form.planned_weight_unit !== 'KG'" class="text-xs text-gray-500 mt-1">
              Quy đổi: <strong class="text-blue-600">{{ form.planned_weight_kg.toFixed(1) }} kg</strong>
            </div>
          </el-form-item>
        </el-col>

        <el-col :span="7">
          <el-form-item label="Quy cách đóng gói (kg/gói)" prop="unit_weight_kg">
            <el-input-number
              v-model="form.unit_weight_kg"
              :min="0.1"
              :precision="1"
              class="w-full"
              controls-position="right"
              @change="calculateUnits"
            />
          </el-form-item>
        </el-col>

        <el-col :span="7">
          <el-form-item label="Dung sai cho phép (%)" prop="weight_tolerance_pct">
            <el-input-number
              v-model="form.weight_tolerance_pct"
              :min="0"
              :max="50"
              class="w-full"
              controls-position="right"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mt-2">
        <el-col :span="24">
          <div class="p-3 bg-gray-50 border border-gray-100 rounded text-sm text-gray-600 flex justify-between">
            <span>Số lượng gói dự kiến đóng: <strong class="text-blue-600">{{ estimatedUnits }} gói</strong></span>
            <span>Khoảng khối lượng chấp nhận hoàn thành: <strong class="text-green-600">{{ minAcceptableWeight.toFixed(1) }}kg - {{ maxAcceptableWeight.toFixed(1) }}kg</strong></span>
          </div>
        </el-col>
      </el-row>


      <!-- Cấu hình Đóng gói & Giao việc (Tự động cấp phiếu) -->
      <div class="mt-6 border-t pt-4">
        <h4 class="text-sm font-bold uppercase text-gray-700 mb-3 flex items-center gap-2">
          ⚙️ Cấu hình đóng gói & Giao việc (Tự động cấp phiếu)
        </h4>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Công nhân đóng gói thực hiện" prop="operator_id">
              <el-select v-model="form.operator_id" placeholder="Chọn công nhân đóng gói" clearable class="w-full">
                <el-option
                  v-for="op in operators"
                  :key="op.id"
                  :label="op.fullName || op.full_name || op.username"
                  :value="op.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="Tiền tố Serial đóng gói" prop="serial_prefix">
              <el-select v-model="form.serial_prefix" placeholder="Chọn tiền tố tem QR" clearable class="w-full" @change="onPrefixChange">
                <el-option
                  v-for="pref in prefixList"
                  :key="pref"
                  :label="pref"
                  :value="pref"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" class="mt-2">
          <el-col :span="12">
            <el-form-item label="Số serial bắt đầu" prop="serial_range_start">
              <el-input-number
                v-model="form.serial_range_start"
                :min="1"
                class="w-full"
                controls-position="right"
                placeholder="Ví dụ: 1"
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="Số serial kết thúc" prop="serial_range_end">
              <el-input-number
                v-model="form.serial_range_end"
                :min="1"
                class="w-full"
                controls-position="right"
                placeholder="Ví dụ: 1000"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- Row 5: Ghi chú -->
      <el-row :gutter="20" class="mt-4">
        <el-col :span="24">
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
          Tạo Lệnh Sản Xuất
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
import { userApi } from '@/modules/core/api/user';
import { supplyApi } from '../api/supplyApi';
import { productionOrderApi } from '../api/productionOrderApi';
import type { FormInstance, FormRules } from 'element-plus';

const emit = defineEmits(['success']);

const visible = ref(false);
const submitting = ref(false);
const loadingData = ref(false);
const formRef = ref<FormInstance>();

const authStore = useAuthStore();

const products = ref<any[]>([]);
const harvestList = ref<any[]>([]);
const allSourceBatches = ref<any[]>([]);
const operators = ref<any[]>([]);
const prefixList = ref<any[]>([]);

const form = reactive({
  product_id: '',
  source_type: 'FARM' as 'FARM' | 'EXTERNAL' | 'CROSS_TENANT',
  source_batch_id: '',
  farm_batch_code: '',
  planned_weight: 100,
  planned_weight_unit: 'KG', // KG, YEN, TA, TON
  planned_weight_kg: 100,
  unit_weight_kg: 1,
  weight_tolerance_pct: 5,
  planned_date: '',
  notes: '',
  operator_id: '',
  serial_prefix: '',
  serial_range_start: undefined as number | undefined,
  serial_range_end: undefined as number | undefined,
  excluded_serials: [] as string[]
});

const rules = reactive<FormRules>({
  product_id: [{ required: true, message: 'Vui lòng chọn sản phẩm thành phẩm', trigger: 'change' }],
  source_type: [{ required: true, message: 'Vui lòng chọn nguồn gốc nguyên liệu', trigger: 'change' }],
  planned_weight: [{ required: true, message: 'Nhập khối lượng kế hoạch', trigger: 'blur' }],
  unit_weight_kg: [{ required: true, message: 'Nhập quy cách đóng gói', trigger: 'blur' }],
  planned_date: [{ required: true, message: 'Chọn ngày thực hiện theo kế hoạch', trigger: 'change' }]
});

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

// Filter source batches dynamically based on source_type
const filteredSourceBatches = computed(() => {
  return allSourceBatches.value.filter((b: any) => {
    if (form.source_type === 'EXTERNAL') {
      return b.batchType === 'EXTERNAL';
    }
    if (form.source_type === 'CROSS_TENANT') {
      return b.batchType === 'CROSS_TENANT';
    }
    return true;
  });
});

// Computed values
const estimatedUnits = computed(() => {
  if (!form.planned_weight_kg || !form.unit_weight_kg) return 0;
  return Math.ceil(form.planned_weight_kg / form.unit_weight_kg);
});

const minAcceptableWeight = computed(() => {
  const tolerance = (form.planned_weight_kg * (form.weight_tolerance_pct || 0)) / 100;
  return Math.max(0.1, parseFloat((form.planned_weight_kg - tolerance).toFixed(1)));
});

const maxAcceptableWeight = computed(() => {
  const tolerance = (form.planned_weight_kg * (form.weight_tolerance_pct || 0)) / 100;
  return parseFloat((form.planned_weight_kg + tolerance).toFixed(1));
});

const open = async () => {
  resetForm();
  visible.value = true;
  loadingData.value = true;
  try {
    const [pRes, hRes, extRes, userRes] = await Promise.all([
      productApi.getList({}),
      farmApi.getHarvests({}),
      supplyApi.getExternalBatches(),
      userApi.getList({ page: 1, limit: 100 })
    ]);
    products.value = (pRes as any).data?.data || (pRes as any).data || [];
    harvestList.value = (hRes as any).data?.data || (hRes as any).data || [];
    // Load all external and cross tenant batches returned by the backend
    allSourceBatches.value = (extRes as any).data || extRes || [];
    operators.value = (userRes as any).data?.items || (userRes as any).data?.data || [];
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
  }

  // Load serial prefixes for this product
  form.serial_prefix = '';
  if (form.product_id) {
    try {
      const prefRes = await supplyApi.searchSerialPrefixes(form.product_id);
      prefixList.value = (prefRes as any).data || prefRes || [];
    } catch (e) {
      console.error('Failed to load prefixes for product', e);
    }
  } else {
    prefixList.value = [];
  }
};

const onPrefixChange = async () => {
  if (!form.serial_prefix) {
    form.serial_range_start = undefined;
    form.serial_range_end = undefined;
    return;
  }
  try {
    const res = await supplyApi.getPrefixNextNumber(form.serial_prefix, form.product_id) as any;
    if (res.data && res.data.next_number) {
      const nextNum = parseInt(res.data.next_number, 10);
      if (!isNaN(nextNum)) {
        form.serial_range_start = nextNum;
        if (estimatedUnits.value > 0) {
          form.serial_range_end = nextNum + estimatedUnits.value - 1;
        }
      }
    }
  } catch (e: any) {
    console.error('Failed to get prefix next number', e);
    ElMessage.warning(e.response?.data?.message || 'Không tìm thấy số serial khả dụng tiếp theo cho tiền tố này.');
    form.serial_range_start = undefined;
    form.serial_range_end = undefined;
  }
};

watch(estimatedUnits, (newVal) => {
  if (form.serial_range_start && newVal > 0) {
    form.serial_range_end = form.serial_range_start + newVal - 1;
  }
});

watch(() => form.serial_range_start, (newVal) => {
  if (newVal && estimatedUnits.value > 0) {
    form.serial_range_end = newVal + estimatedUnits.value - 1;
  }
});

const onSourceTypeChange = () => {
  form.source_batch_id = '';
  form.farm_batch_code = '';
};

const calculateUnits = () => {
  // Can be used for custom calculations
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
      weight_tolerance_pct: form.weight_tolerance_pct,
      planned_date: form.planned_date,
      notes: form.notes,
      operator_id: form.operator_id || undefined,
      serial_prefix: form.serial_prefix || undefined,
      serial_range_start: form.serial_range_start || undefined,
      serial_range_end: form.serial_range_end || undefined,
      excluded_serials: form.excluded_serials && form.excluded_serials.length > 0 ? form.excluded_serials : undefined
    };
    
    if (form.source_type === 'FARM') {
      payload.farm_batch_code = form.farm_batch_code;
    } else {
      payload.source_batch_id = form.source_batch_id;
    }

    const { data } = await productionOrderApi.createOrder(payload);
    ElMessage.success('Tạo Lệnh Sản Xuất thành công!');
    visible.value = false;
    emit('success', data);
  } catch (err: any) {
    console.error(err);
    ElMessage.error(err?.response?.data?.message || 'Lỗi khi tạo Lệnh Sản Xuất');
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
  form.product_id = '';
  form.source_type = 'FARM';
  form.source_batch_id = '';
  form.farm_batch_code = '';
  form.planned_weight = 100;
  form.planned_weight_unit = 'KG';
  form.planned_weight_kg = 100;
  form.unit_weight_kg = 1;
  form.weight_tolerance_pct = 5;
  form.planned_date = '';
  form.notes = '';
  form.operator_id = '';
  form.serial_prefix = '';
  form.serial_range_start = undefined;
  form.serial_range_end = undefined;
  form.excluded_serials = [];
};

defineExpose({ open });
</script>

<style scoped>
.premium-disabled-input :deep(.el-input__inner) {
  color: #374151 !important;
  font-weight: 600;
  background-color: #f3f4f6 !important;
}
.w-full-flex {
  display: flex;
  width: 100%;
}
.w-full-flex :deep(.el-radio-button) {
  flex: 1;
  text-align: center;
}
.w-full-flex :deep(.el-radio-button__inner) {
  width: 100%;
}
</style>
