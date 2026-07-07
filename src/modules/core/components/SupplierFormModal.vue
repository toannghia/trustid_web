<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { supplierApi } from '../api/supplier';
import { ElMessage } from 'element-plus';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const props = defineProps<{
    modelValue: boolean; // visibility
    isEdit: boolean;
    supplierData: any;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const submitting = ref(false);

const form = reactive({
    id: '',
    name: '',
    type: 'MATERIAL', // Default
    contactInfo: {
        phone: '',
        email: '',
        address: ''
    }
});

watch(() => props.modelValue, (val) => {
    if (val) {
        if (props.isEdit && props.supplierData) {
            initEdit(props.supplierData);
        } else {
            initCreate();
        }
    }
});

const initCreate = () => {
    form.id = '';
    form.name = '';
    form.type = 'MATERIAL';
    form.contactInfo = { phone: '', email: '', address: '' };
};

const initEdit = (row: any) => {
    form.id = row.id;
    form.name = row.name;
    form.type = row.type || 'MATERIAL';
    // Handle JSONB contactInfo
    const info = row.contactInfo || {};
    form.contactInfo = {
        phone: info.phone || '',
        email: info.email || '',
        address: info.address || ''
    };
};

const handleClose = () => {
    emit('update:modelValue', false);
};

const handleSubmit = async () => {
    if (!form.name || !form.type) {
        ElMessage.warning('Vui lòng nhập tên và loại nhà cung cấp');
        return;
    }

    submitting.value = true;
    try {
        const payload = {
            name: form.name,
            type: form.type,
            contactInfo: { ...form.contactInfo }
        };

        if (props.isEdit && form.id) {
            await supplierApi.update(form.id, payload);
            ElMessage.success('Cập nhật thành công');
        } else {
            await supplierApi.create(payload);
            ElMessage.success('Thêm mới thành công');
        }
        emit('saved');
        handleClose();
    } catch (e: any) {
        console.error(e);
        ElMessage.error(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <el-dialog 
        :model-value="modelValue" 
        width="600px" 
        :close-on-click-modal="false"
        :show-close="false"
        class="branded-supplier-dialog"
        @update:model-value="handleClose"
    >
        <template #header>
            <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                <span style="color: #fff; font-size: 16px; font-weight: 600;">
                    {{ isEdit ? 'Cập nhật đối tác' : 'Thêm đối tác mới' }}
                </span>
            </div>
        </template>

        <el-form :model="form" label-position="top" style="padding: 24px 24px 8px;">
            <el-form-item label="Tên nhà cung cấp / đối tác" required>
                <el-input v-model="form.name" placeholder="Nhập tên đối tác..." style="--el-border-radius-base: 8px;" />
            </el-form-item>
            
            <el-form-item label="Loại hình" required>
                <el-select v-model="form.type" placeholder="Chọn loại hình" class="w-full" style="--el-border-radius-base: 8px;">
                    <el-option label="Vật tư (Material)" value="MATERIAL" />
                    <el-option label="Vận chuyển (Logistics)" value="LOGISTICS" />
                    <el-option label="Khác (Other)" value="OTHER" />
                </el-select>
            </el-form-item>

            <div class="grid grid-cols-2 gap-4">
                <el-form-item label="Số điện thoại">
                    <el-input v-model="form.contactInfo.phone" placeholder="Số điện thoại liên hệ" style="--el-border-radius-base: 8px;" />
                </el-form-item>
                <el-form-item label="Email">
                    <el-input v-model="form.contactInfo.email" placeholder="Email liên hệ" style="--el-border-radius-base: 8px;" />
                </el-form-item>
            </div>

            <el-form-item label="Địa chỉ">
                <el-input v-model="form.contactInfo.address" type="textarea" :rows="2" placeholder="Địa chỉ trụ sở..." style="--el-border-radius-base: 8px;" />
            </el-form-item>
        </el-form>

        <template #footer>
            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
                <el-button @click="handleClose" style="border-radius: 8px; padding: 10px 20px;">Hủy bỏ</el-button>
                <el-button 
                    type="primary" 
                    :loading="submitting" 
                    @click="handleSubmit"
                    style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff; background: #00875A; cursor: pointer;"
                >
                    {{ isEdit ? 'Cập nhật' : 'Thêm mới' }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style>
.branded-supplier-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-supplier-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-supplier-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-supplier-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
