<template>
  <el-dialog
    v-model="visible"
    width="500px"
    class="branded-quick-user-dialog"
    :close-on-click-modal="false"
    :show-close="false"
    @closed="handleClosed"
  >
    <template #header>
      <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
        <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
        <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
        <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
          {{ `Thêm Nhanh ${roleName === 'FARMER' ? 'Nông Hộ' : (roleName === 'TEAM_LEADER' ? 'Đội Trưởng' : 'Nhân Viên KCS')}` }}
        </span>
        <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="visible = false">
          <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
        </div>
      </div>
    </template>
    <el-form :model="form" :rules="rules" ref="formRef" label-position="top" style="padding: 24px 24px 8px;">
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
      <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
        <el-button @click="visible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
        <el-button type="primary" :loading="loading" @click="submitForm" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">Tạo mới</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { userApi } from '../../core/api/user';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

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

<style>
.branded-quick-user-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-quick-user-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-quick-user-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-quick-user-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
