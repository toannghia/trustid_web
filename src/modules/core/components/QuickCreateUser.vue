<script setup lang="ts">
import { ref, reactive } from 'vue';
import { userApi } from '../api/user';
import { ElMessage } from 'element-plus';
import { Plus, User, Lock, Message } from '@element-plus/icons-vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const props = defineProps<{
  role: string;
  roleLabel: string;
  tenantId?: string | null;
}>();

const emit = defineEmits(['success', 'close']);

const visible = ref(false);
const submitting = ref(false);

const form = reactive({
  fullName: '',
  username: '',
  email: '',
  password: '',
});

const formRef = ref<any>(null);

const validateFullName = (rule: any, value: any, callback: any) => {
  if (!value) {
    return callback(new Error('Vui lòng nhập họ tên'));
  }
  const regex = /^[\p{L}\s]+$/u;
  if (!regex.test(value)) {
    return callback(new Error('Họ tên chỉ được chứa chữ cái và khoảng trắng'));
  }
  if (value.length < 2 || value.length > 50) {
    return callback(new Error('Họ tên phải từ 2 đến 50 ký tự'));
  }
  callback();
};

const validateUsername = (rule: any, value: any, callback: any) => {
  if (!value) {
    return callback(new Error('Vui lòng nhập tên đăng nhập'));
  }
  
  const isPhonePattern = /^[\+\d]/;
  const phoneRegex = /^(\+?\d{1,3})?\d{9,11}$/;
  const usernameRegex = /^[a-zA-Z_][a-zA-Z0-9_]{3,19}$/;
  
  if (isPhonePattern.test(value)) {
    if (!phoneRegex.test(value)) {
      return callback(new Error('Số điện thoại không hợp lệ (Yêu cầu từ 9-15 số)'));
    }
  } else {
    if (!usernameRegex.test(value)) {
      return callback(new Error('Username: 4–20 ký tự, bắt đầu bằng chữ cái hoặc "_", chỉ chứa chữ, số và "_"'));
    }
  }
  callback();
};

const rules = {
  fullName: [{ required: true, validator: validateFullName, trigger: 'blur' }],
  username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
  email: [
    { required: true, message: 'Vui lòng nhập email', trigger: 'blur' },
    { type: 'email', message: 'Email không hợp lệ', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Vui lòng nhập mật khẩu', trigger: 'blur' },
    { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự', trigger: 'blur' }
  ],
};

const open = () => {
  form.fullName = '';
  form.username = '';
  form.email = '';
  form.password = '';
  visible.value = true;
};

const handleClose = () => {
  visible.value = false;
  emit('close');
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    
    submitting.value = true;
    try {
      const payload = {
        ...form,
        roleName: props.role,
        tenantId: props.tenantId || null
      };
      
      const { data } = await userApi.create(payload);
      const newUser = data.data || data;
      
      ElMessage.success(`Đã tạo ${props.roleLabel} thành công`);
      emit('success', newUser);
      visible.value = false;
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi tạo người dùng';
      ElMessage.error(msg);
    } finally {
      submitting.value = false;
    }
  });
};

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    width="450px"
    append-to-body
    :show-close="false"
    :close-on-click-modal="false"
    destroy-on-close
    class="branded-quick-dialog"
  >
    <template #header>
      <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
        <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
        <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
        <span style="color: #fff; font-size: 16px; font-weight: 600;">
          Thêm nhanh {{ props.roleLabel }}
        </span>
        <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="visible = false">
          <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
        </div>
      </div>
    </template>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      style="padding: 24px 24px 8px; --el-border-radius-base: 8px;"
    >
      <el-form-item label="Họ tên đầy đủ" prop="fullName">
        <el-input v-model="form.fullName" placeholder="VD: Nguyễn Văn A" :prefix-icon="User" @blur="form.fullName = form.fullName.trim()" />
      </el-form-item>
      
      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="Tên đăng nhập" prop="username">
          <el-input v-model="form.username" placeholder="username" :prefix-icon="User" />
        </el-form-item>
        
        <el-form-item label="Mật khẩu" prop="password">
          <el-input v-model="form.password" type="password" placeholder="******" show-password :prefix-icon="Lock" />
        </el-form-item>
      </div>

      <el-form-item label="Email công việc" prop="email">
        <el-input v-model="form.email" placeholder="email@company.com" :prefix-icon="Message" />
      </el-form-item>

      <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
        <p class="text-xs text-blue-700 flex items-center">
          <el-icon class="mr-1 text-blue-500"><Plus /></el-icon>
          Tài khoản này sẽ tự động được gán vai trò: <strong>{{ props.roleLabel }}</strong>
        </p>
      </div>
    </el-form>

    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
        <el-button @click="visible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
        <el-button 
            type="primary" 
            :loading="submitting" 
            @click="handleSubmit"
            style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff; background: #00875A;"
        >
          Tạo & Chọn ngay
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style>
.branded-quick-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-quick-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-quick-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-quick-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>

<style scoped>
.branded-quick-dialog :deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
  font-size: 13px;
  margin-bottom: 4px;
}
</style>
