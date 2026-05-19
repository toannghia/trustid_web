<template>
  <el-dialog
    v-model="visible"
    title="Tạo Phiếu Sản Xuất Mới"
    width="760px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @closed="resetForm"
    append-to-body
  >
    <el-form :model="form" label-position="top" :rules="rules" ref="formRef" v-loading="loadingData">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Mã Lệnh Sản Xuất" prop="order_id">
            <el-input :value="order?.orderCode" disabled />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Loại công đoạn" prop="ticket_type">
            <el-select v-model="form.ticket_type" placeholder="Chọn loại phiếu..." class="w-full" @change="onTypeChange">
              <el-option label="1. Đóng gói (PACKAGING)" value="PACKAGING" />
              <el-option label="2. Đóng bao (BAGGING)" value="BAGGING" />
              <el-option label="3. Đóng pallet (PALLET)" value="PALLET" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Khối lượng giao việc (kg)" prop="planned_weight_kg">
            <el-input-number
              v-model="form.planned_weight_kg"
              :min="0.1"
              :max="remainingWeight"
              :precision="1"
              class="w-full"
              controls-position="right"
            />
            <div class="text-xs text-gray-400 mt-1">
              Khối lượng còn lại tối đa cho phép: <strong>{{ remainingWeight.toFixed(1) }} kg</strong>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Giao cho (Người thực hiện)" prop="operator_id">
            <el-select
              v-model="form.operator_id"
              placeholder="Để trống hoặc chỉ định người thực hiện..."
              clearable
              filterable
              class="w-full"
            >
              <el-option
                v-for="op in operators"
                :key="op.id"
                :label="`${op.name} (${op.role?.name || op.roleName || 'Nhân viên'})`"
                :value="op.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="24">
          <div class="p-3 bg-blue-50 rounded border border-blue-100 flex flex-col justify-center mb-4">
            <div class="text-sm font-semibold text-blue-800">Thông tin Lệnh gốc:</div>
            <div class="text-xs text-gray-600 mt-1">
              Sản phẩm: {{ order?.product?.name }} <br/>
              Kế hoạch: {{ order?.plannedWeightKg?.toFixed(1) }} kg | Đã chia phiếu: {{ (order?.actualWeightKg || 0).toFixed(1) }} kg
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- PACKAGING & BAGGING QR/SERIAL SETTINGS -->
      <template v-if="form.ticket_type !== 'PALLET'">
        <el-divider>Cấp phát dải mã Serial tem</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="24" class="mb-4">
            <el-form-item label="Chọn Lô Mã (Code Pool) gợi ý">
              <el-select
                v-model="selectedPoolId"
                placeholder="Chọn lô tem..."
                clearable
                class="w-full"
                @change="onPoolChange"
              >
                <el-option
                  v-for="p in poolList"
                  :key="p.id"
                  :label="`${p.name} (Dải: ${p.prefix}-${p.startSerial} -> ${p.prefix}-${p.endSerial})`"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="Prefix mã" prop="serial_prefix">
              <el-select
                v-model="form.serial_prefix"
                filterable
                allow-create
                placeholder="VD: TR"
                class="w-full"
              >
                <el-option v-for="prefix in prefixList" :key="prefix" :label="prefix" :value="prefix" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Serial Bắt đầu (Số)" prop="serial_range_start">
              <el-input-number
                v-model="form.serial_range_start"
                :min="1"
                class="w-full"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Serial Kết thúc (Số)" prop="serial_range_end">
              <el-input-number
                v-model="form.serial_range_end"
                :min="1"
                class="w-full"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <div v-if="form.serial_prefix && form.serial_range_start && form.serial_range_end" class="text-xs text-green-600 mt-2 p-2 bg-green-50 border rounded">
          Số lượng tem cấp phát dự kiến: <strong>{{ Math.max(0, form.serial_range_end - form.serial_range_start + 1) }} tem</strong>. <br/>
          Dãy mã: <strong>{{ form.serial_prefix }}-{{ String(form.serial_range_start).padStart(5, '0') }}</strong> -> 
          <strong>{{ form.serial_prefix }}-{{ String(form.serial_range_end).padStart(5, '0') }}</strong>
        </div>
      </template>

      <!-- PALLET SETTINGS -->
      <template v-else>
        <el-divider>Cấu hình mã Pallet</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Mã Pallet (Tự đặt/Theo quy trình)" prop="pallet_code">
              <el-input v-model="form.pallet_code" placeholder="VD: PL-2026-001" />
              <div class="text-xs text-gray-400 mt-1">Để trống hệ thống sẽ tự sinh</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Khả năng tái sử dụng Pallet" prop="pallet_is_reusable">
              <el-switch
                v-model="form.pallet_is_reusable"
                active-text="Có (Có thể giải phóng để dùng lại)"
                inactive-text="Không"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Số lượng sản phẩm tối đa trên Pallet" prop="items_per_pallet">
              <el-input-number
                v-model="form.items_per_pallet"
                :min="1"
                class="w-full"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          Phát hành Phiếu
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { codeApi } from '@/modules/core/api/codeApi';
import { userApi } from '@/modules/core/api/user';
import { supplyApi } from '../api/supplyApi';
import { productionOrderApi } from '../api/productionOrderApi';
import type { FormInstance, FormRules } from 'element-plus';

const emit = defineEmits(['success']);

const visible = ref(false);
const submitting = ref(false);
const loadingData = ref(false);
const formRef = ref<FormInstance>();

const order = ref<any>(null);
const poolList = ref<any[]>([]);
const prefixList = ref<string[]>([]);
const operators = ref<any[]>([]);
const selectedPoolId = ref('');

const form = reactive({
  order_id: '',
  ticket_type: 'PACKAGING' as 'PACKAGING' | 'BAGGING' | 'PALLET',
  planned_weight_kg: 10,
  serial_prefix: '',
  serial_range_start: 1,
  serial_range_end: 10,
  excluded_serials: [] as string[],
  pallet_code: '',
  pallet_is_reusable: true,
  items_per_pallet: 50,
  operator_id: ''
});

const rules = reactive<FormRules>({
  ticket_type: [{ required: true, message: 'Vui lòng chọn công đoạn', trigger: 'change' }],
  planned_weight_kg: [{ required: true, message: 'Nhập khối lượng', trigger: 'blur' }]
});

const remainingWeight = computed(() => {
  if (!order.value) return 0;
  // Make sure we don't go negative
  const rem = parseFloat((order.value.plannedWeightKg - (order.value.actualWeightKg || 0)).toFixed(1));
  return rem > 0 ? rem : 0.1;
});

const open = async (targetOrder: any) => {
  order.value = targetOrder;
  form.order_id = targetOrder.id;
  visible.value = true;
  loadingData.value = true;
  
  // Suggest the entire remaining weight for the new ticket
  form.planned_weight_kg = remainingWeight.value;

  try {
    const [poolRes, prefixRes, userRes] = await Promise.all([
      codeApi.getPools(),
      supplyApi.searchSerialPrefixes(targetOrder.productId),
      userApi.getList({ page: 1, limit: 100 })
    ]);
    poolList.value = (poolRes as any).data?.data || (poolRes as any).data || [];
    prefixList.value = (prefixRes as any).data || prefixRes || [];
    operators.value = (userRes as any).data?.items || (userRes as any).data?.data || [];
  } catch (e) {
    console.error('Failed to load code configurations', e);
  } finally {
    loadingData.value = false;
  }
};

const onTypeChange = () => {
  if (form.ticket_type === 'PALLET') {
    form.serial_prefix = '';
  }
};

const onPoolChange = () => {
  if (!selectedPoolId.value) return;
  const pool = poolList.value.find(p => p.id === selectedPoolId.value);
  if (pool) {
    form.serial_prefix = pool.prefix || '';
    form.serial_range_start = pool.startSerial || 1;
    form.serial_range_end = pool.endSerial || 10;
  }
};

const executeSubmit = async () => {
  submitting.value = true;
  try {
    const payload: any = { ...form };
    if (payload.ticket_type === 'PALLET') {
      delete payload.serial_prefix;
      delete payload.serial_range_start;
      delete payload.serial_range_end;
    }
    if (!payload.operator_id) {
      delete payload.operator_id;
    }

    const { data } = await productionOrderApi.createTicket(payload);
    ElMessage.success('Tạo Phiếu Sản Xuất thành công!');
    visible.value = false;
    emit('success', data);
  } catch (err: any) {
    console.error(err);
    ElMessage.error(err?.response?.data?.message || 'Lỗi khi tạo Phiếu');
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
  order.value = null;
  selectedPoolId.value = '';
  form.order_id = '';
  form.ticket_type = 'PACKAGING';
  form.planned_weight_kg = 10;
  form.serial_prefix = '';
  form.serial_range_start = 1;
  form.serial_range_end = 10;
  form.pallet_code = '';
  form.pallet_is_reusable = true;
  form.items_per_pallet = 50;
  form.operator_id = '';
};

defineExpose({ open });
</script>
