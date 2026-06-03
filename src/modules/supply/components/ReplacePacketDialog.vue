<template>
  <el-dialog
    v-model="visible"
    title="Thay thế gói hỏng"
    width="500px"
    :close-on-click-modal="false"
    @closed="resetForm"
    @opened="onOpened"
  >
    <el-form label-position="top" class="replace-form">
      <!-- Lý do (đầu tiên, mặc định sẵn) -->
      <el-form-item label="Lý do thay thế" required>
        <el-select
          v-model="form.reason"
          placeholder="Chọn lý do"
          size="large"
          class="w-full"
        >
          <el-option value="QUALITY_DEFECT" label="Hỏng / lỗi chất lượng" />
          <el-option value="TORN_PACKAGING" label="Rách bao bì" />
          <el-option value="DEFORMED" label="Móp / biến dạng" />
          <el-option value="OTHER" label="Khác" />
        </el-select>
      </el-form-item>

      <!-- Bước 1: Mã gói hỏng -->
      <el-form-item label="Bước 1: Quét mã gói cần thay" required>
        <el-input
          v-model="form.damaged_serial"
          :disabled="!!prefillDamaged"
          placeholder="Quét mã gói hỏng..."
          class="font-mono"
          size="large"
          ref="damagedInputRef"
          @keyup.enter="onDamagedEnter"
        >
          <template #prefix>
            <span class="text-red-500 text-lg">✕</span>
          </template>
        </el-input>
        <div v-if="damagedInfo" class="mt-1 text-xs text-gray-500">
          Lô {{ damagedInfo.groupIndex }} — Bao {{ damagedInfo.bagSerial }}
        </div>
        <div v-if="damagedScanned" class="mt-1 text-xs text-green-600 font-semibold">
          ✓ Đã nhận mã hỏng — chuyển sang quét mã thay thế
        </div>
      </el-form-item>

      <!-- Bước 2: Mã gói mới -->
      <el-form-item label="Bước 2: Quét mã gói mới thay vào" required>
        <el-input
          v-model="form.replacement_serial"
          placeholder="Quét mã gói mới..."
          class="font-mono"
          size="large"
          ref="replacementInputRef"
          :disabled="!damagedScanned && !prefillDamaged"
          @keyup.enter="onReplacementEnter"
        >
          <template #prefix>
            <span class="text-green-500 text-lg">✓</span>
          </template>
        </el-input>
      </el-form-item>
    </el-form>

    <!-- Trạng thái xử lý -->
    <div v-if="submitting" class="text-center text-blue-500 text-sm py-2">
      Đang xử lý thay thế...
    </div>

    <template #footer>
      <el-button @click="visible = false">Hủy</el-button>
      <el-button type="warning" @click="submitReplace" :loading="submitting" :disabled="!canSubmit">
        Xác nhận thay
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { productionOrderApi } from '../api/productionOrderApi';

const props = defineProps<{
  modelValue: boolean;
  receiptId: string;
  prefillDamaged?: string;
}>();

const emit = defineEmits(['update:modelValue', 'replaced']);

const visible = ref(props.modelValue);
watch(() => props.modelValue, v => { visible.value = v; });
watch(visible, v => { emit('update:modelValue', v); });

const damagedInputRef = ref();
const replacementInputRef = ref();
const submitting = ref(false);
const damagedScanned = ref(false);

const form = reactive({
  damaged_serial: '',
  replacement_serial: '',
  reason: 'QUALITY_DEFECT',
});

const damagedInfo = ref<{ groupIndex: number; bagSerial: string } | null>(null);

const canSubmit = computed(() =>
  form.damaged_serial.trim() && form.replacement_serial.trim() && form.reason
);

const onOpened = () => {
  if (props.prefillDamaged) {
    form.damaged_serial = props.prefillDamaged;
    damagedScanned.value = true;
    nextTick(() => replacementInputRef.value?.focus());
  } else {
    nextTick(() => damagedInputRef.value?.focus());
  }
};

const onDamagedEnter = () => {
  if (!form.damaged_serial.trim()) return;
  damagedScanned.value = true;
  nextTick(() => replacementInputRef.value?.focus());
};

const onReplacementEnter = () => {
  if (!form.replacement_serial.trim()) return;
  if (canSubmit.value) {
    submitReplace();
  }
};

const submitReplace = async () => {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    await productionOrderApi.replacePacketV2(props.receiptId, {
      damaged_serial: form.damaged_serial.trim(),
      replacement_serial: form.replacement_serial.trim(),
      reason: form.reason,
    });
    ElMessage.success('Thay thế gói thành công');
    emit('replaced');
    visible.value = false;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Thay thế thất bại');
    // Giữ dialog mở để sửa lại
  } finally {
    submitting.value = false;
  }
};

const resetForm = () => {
  form.damaged_serial = '';
  form.replacement_serial = '';
  form.reason = 'QUALITY_DEFECT';
  damagedInfo.value = null;
  damagedScanned.value = false;
};
</script>

<style scoped>
.replace-form :deep(.el-input__inner) {
  font-size: 16px;
}
</style>
