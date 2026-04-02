<script setup lang="ts">
import { ref, reactive } from 'vue';
import { userApi } from '../api/user';
import { ElMessage } from 'element-plus';
import { Plus, User, Lock, Message } from '@element-plus/icons-vue';

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

const rules = {
  fullName: [{ required: true, message: 'Vui lòng nhập họ tên', trigger: 'blur' }],
  username: [{ required: true, message: 'Vui lòng nhập tên đăng nhập', trigger: 'blur' }],
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
    :title="`Thêm nhanh ${props.roleLabel}`"
    width="450px"
    append-to-body
    :close-on-click-modal="false"
    class="quick-create-dialog"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="mt-2"
    >
      <el-form-item label="Họ tên đầy đủ" prop="fullName">
        <el-input v-model="form.fullName" placeholder="VD: Nguyễn Văn A" :prefix-icon="User" />
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
      <div class="flex justify-end gap-2">
        <el-button @click="visible = false">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          Tạo & Chọn ngay
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.quick-create-dialog :deep(.el-dialog__header) {
  margin-right: 0;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 15px;
}

.quick-create-dialog :deep(.el-dialog__body) {
  padding-top: 20px;
}

.quick-create-dialog :deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
  font-size: 13px;
  margin-bottom: 4px;
}
</style>
