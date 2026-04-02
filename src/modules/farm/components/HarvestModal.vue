<template>
  <el-dialog
    v-model="visible"
    title="Thu hoạch & Chốt vụ"
    width="500px"
    @closed="resetForm"
  >
    <div class="mb-4 p-3 bg-green-50 rounded border border-green-100 flex items-start gap-3">
        <el-icon class="text-green-600 mt-1" :size="20"><Warning /></el-icon>
        <div class="text-sm text-green-800">
            <p class="font-bold">Bạn đang thực hiện thu hoạch cho vụ: {{ cycleName }}</p>
            <p class="mt-1">Hành động này sẽ tạo <b>Lô sản xuất (Production Batch)</b> và kết thúc vụ mùa hiện tại.</p>
        </div>
    </div>

    <el-form :model="form" label-position="top" :rules="rules" ref="formRef">
        <el-form-item label="Sản lượng thực tế (kg)" prop="quantity_kg">
            <el-input-number v-model="form.quantity_kg" :min="1" class="w-full" size="large" />
        </el-form-item>

        <el-form-item label="Ghi chú / Đánh giá chất lượng" prop="notes">
            <el-input 
                v-model="form.notes" 
                type="textarea" 
                :rows="3" 
                placeholder="VD: Trái đẹp, đạt chuẩn loại 1..." 
            />
        </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Hủy bỏ</el-button>
        <el-button type="success" :loading="submitting" @click="submitHarvest">
          <el-icon class="mr-2"><check /></el-icon>
          Xác nhận Thu hoạch
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { Warning, Check } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { farmApi } from '../api/farmApi';

const props = defineProps<{
    modelValue: boolean;
    cycleId: string;
    cycleName: string;
}>();

const emit = defineEmits(['update:modelValue', 'success']);

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
    quantity_kg: 0,
    notes: ''
});

const rules = reactive<FormRules>({
    quantity_kg: [{ required: true, message: 'Vui lòng nhập sản lượng', trigger: 'blur' }]
});

const submitHarvest = async () => {
    if (!formRef.value) return;
    await formRef.value.validate(async (valid) => {
        if (valid) {
            submitting.value = true;
            try {
                const { data } = await farmApi.createHarvest({
                    crop_cycle_id: props.cycleId,
                    quantity_kg: form.quantity_kg,
                    notes: form.notes
                });

                ElMessageBox.alert(
                    `Đã tạo lô thành công!\nMã lô: ${data.batchCode}`,
                    'Thu hoạch thành công',
                    {
                        confirmButtonText: 'OK',
                        type: 'success',
                        callback: () => {
                            emit('success'); // Parent should reload list
                            visible.value = false;
                        }
                    }
                );
            } catch (err: any) {
                console.error(err);
                ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra khi thu hoạch');
            } finally {
                submitting.value = false;
            }
        }
    });
};

const resetForm = () => {
    if (formRef.value) formRef.value.resetFields();
    form.quantity_kg = 0;
    form.notes = '';
};
</script>
