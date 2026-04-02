<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { supplierApi } from '../api/supplier';
import { ElMessage } from 'element-plus';

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
        :title="isEdit ? 'Cập nhật đối tác' : 'Thêm đối tác mới'" 
        width="600px" 
        :close-on-click-modal="false"
        @update:model-value="handleClose"
    >
        <el-form :model="form" label-position="top">
            <el-form-item label="Tên nhà cung cấp / đối tác" required>
                <el-input v-model="form.name" placeholder="Nhập tên đối tác..." />
            </el-form-item>
            
            <el-form-item label="Loại hình" required>
                <el-select v-model="form.type" placeholder="Chọn loại hình" class="w-full">
                    <el-option label="Vật tư (Material)" value="MATERIAL" />
                    <el-option label="Vận chuyển (Logistics)" value="LOGISTICS" />
                    <el-option label="Khác (Other)" value="OTHER" />
                </el-select>
            </el-form-item>

            <div class="grid grid-cols-2 gap-4">
                <el-form-item label="Số điện thoại">
                    <el-input v-model="form.contactInfo.phone" placeholder="Số điện thoại liên hệ" />
                </el-form-item>
                <el-form-item label="Email">
                    <el-input v-model="form.contactInfo.email" placeholder="Email liên hệ" />
                </el-form-item>
            </div>

            <el-form-item label="Địa chỉ">
                <el-input v-model="form.contactInfo.address" type="textarea" :rows="2" placeholder="Địa chỉ trụ sở..." />
            </el-form-item>
        </el-form>

        <template #footer>
            <span class="dialog-footer">
                <el-button @click="handleClose">Hủy bỏ</el-button>
                <el-button type="primary" :loading="submitting" @click="handleSubmit">
                    {{ isEdit ? 'Cập nhật' : 'Thêm mới' }}
                </el-button>
            </span>
        </template>
    </el-dialog>
</template>
