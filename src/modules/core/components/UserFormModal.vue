<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { userApi } from '../api/user';
import { ElMessage } from 'element-plus';

const props = defineProps({
    modelValue: Boolean,
    fixedRole: {
        type: String,
        default: 'END_USER'
    },
    tenants: {
        type: Array as any,
        default: () => []
    },
    isSystemAdmin: Boolean
});

const emit = defineEmits(['update:modelValue', 'saved']);

const showModal = ref(props.modelValue);
const submitting = ref(false);

const userForm = reactive({
    full_name: '',
    email: '',
    username: '',
    password: '123456aA@', // Default password
    role: props.fixedRole,
    tenant_id: ''
});

watch(() => props.modelValue, (val) => {
    showModal.value = val;
    if (val) {
        resetForm();
    }
});

watch(() => showModal.value, (val) => {
    emit('update:modelValue', val);
});

const resetForm = () => {
    Object.assign(userForm, {
        full_name: '',
        email: '',
        username: '',
        password: '123456aA@',
        role: props.fixedRole,
        tenant_id: ''
    });
};

const handleSubmit = async () => {
    if (!userForm.username || !userForm.full_name) {
        ElMessage.warning('Vui lòng điền đủ thông tin (Họ tên và Số điện thoại/Username)');
        return;
    }

    submitting.value = true;
    try {
        const payload = {
            fullName: userForm.full_name,
            email: userForm.email || undefined,
            username: userForm.username,
            password: userForm.password,
            roleName: userForm.role,
            tenantId: userForm.tenant_id || null
        };

        const { data } = await userApi.create(payload);
        ElMessage.success('Tạo tài khoản thành công');
        emit('saved', data);
        showModal.value = false;
    } catch (error: any) {
        console.error(error);
        const msg = error.response?.data?.message || 'Không thể tạo tài khoản';
        ElMessage.error(msg);
    } finally {
        submitting.value = false;
    }
};

const handleClose = () => {
    showModal.value = false;
};
</script>

<template>
    <el-dialog
        v-model="showModal"
        title="Thêm mới chủ sở hữu"
        width="95%"
        style="max-width: 450px"
        append-to-body
        :close-on-click-modal="false"
        class="responsive-dialog"
    >
        <el-form label-position="top">
            <el-form-item label="Họ tên" required>
                <el-input v-model="userForm.full_name" placeholder="VD: Nguyễn Văn A" />
            </el-form-item>
            
            <el-form-item label="Số điện thoại (Sử dụng làm Tên đăng nhập)" required>
                <el-input v-model="userForm.username" placeholder="VD: 0988..." />
            </el-form-item>

            <el-form-item label="Email">
                <el-input v-model="userForm.email" placeholder="Nhập email (Nếu có)" />
            </el-form-item>

            <el-form-item label="Mật khẩu mặc định">
                <el-input v-model="userForm.password" type="password" show-password />
                <p class="text-xs text-gray-500 mt-1">* Mật khẩu mặc định khởi tạo là: 123456aA@</p>
            </el-form-item>

            <el-form-item label="Doanh nghiệp liên kết" v-if="isSystemAdmin">
                <el-select v-model="userForm.tenant_id" placeholder="Chọn doanh nghiệp" class="w-full" clearable>
                    <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
                </el-select>
            </el-form-item>
        </el-form>
        
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="handleClose">Hủy</el-button>
                <el-button type="primary" :loading="submitting" @click="handleSubmit">
                    Tạo tài khoản
                </el-button>
            </span>
        </template>
    </el-dialog>
</template>
