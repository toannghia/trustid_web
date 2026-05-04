<template>
  <el-dialog
    v-model="visible"
    :title="`Thêm Nhanh ${roleName === 'FARMER' ? 'Nông Hộ' : 'Đội Trưởng'}`"
    width="500px"
    @closed="handleClosed"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
      <el-form-item label="Tên đầy đủ" prop="fullName">
        <el-input v-model="form.fullName" placeholder="Nhập họ và tên" />
      </el-form-item>
      <el-form-item label="Số điện thoại / Tên đăng nhập" prop="username">
        <el-input v-model="form.username" placeholder="Nhập số điện thoại" />
      </el-form-item>
      <el-form-item label="Mật khẩu" prop="password">
        <el-input v-model="form.password" type="password" show-password placeholder="Mặc định: 123456" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Hủy</el-button>
        <el-button type="primary" :loading="loading" @click="submitForm">Tạo mới</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { userApi } from '../../core/api/user';

const props = defineProps({
  roleName: {
    type: String,
    required: true
  }
});

const visible = ref(false);
const loading = ref(false);
const formRef = ref<FormInstance>();

const emit = defineEmits(['created']);

const form = reactive({
  fullName: '',
  username: '',
  password: ''
});

const rules = reactive<FormRules>({
  fullName: [{ required: true, message: 'Vui lòng nhập tên', trigger: 'blur' }],
  username: [{ required: true, message: 'Vui lòng nhập SĐT/Username', trigger: 'blur' }]
});

const open = () => {
  visible.value = true;
};

const handleClosed = () => {
  if (formRef.value) formRef.value.resetFields();
  form.password = '';
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
  } catch (e) {
    return; // Validation failed
  }

  loading.value = true;
  try {
    const payload = {
      ...form,
      password: form.password || '123456',
      roleName: props.roleName,
      isActive: true
    };
    const { data } = await userApi.create(payload);
    ElMessage.success('Tạo tài khoản thành công');
    visible.value = false;
    emit('created', data);
  } catch (err: any) {
    console.error('Lỗi khi tạo user:', err);
    const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra';
    ElMessage.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    loading.value = false;
  }
};

defineExpose({ open });
</script>
