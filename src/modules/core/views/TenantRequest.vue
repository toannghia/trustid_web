<script setup lang="ts">
import { ref, reactive } from 'vue';
import { regulatorApi } from '../api/regulator';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const requestForm = reactive({
  target_ref_id: '', // chọn từ danh sách vùng trồng
  province_code: '', // ví dụ: 'BG' cho bắc giang
  request_type: 'GLN_ISSUANCE' as 'GLN_ISSUANCE' | 'PROCESS_TEMPLATE'
});

const submitRequest = async () => {
  loading.value = true;
  try {
    await regulatorApi.sendRequest(requestForm);
    ElMessage.success('hồ sơ đã được gửi tới cơ quan quản lý');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 bg-white shadow rounded">
    <h2 class="text-xl font-bold mb-6">đăng ký cấp mã vùng trồng (gln)</h2>
    <el-form :model="requestForm" label-position="top">
      <el-form-item label="loại yêu cầu">
        <el-select v-model="requestForm.request_type" class="w-full">
          <el-option label="cấp mã định danh vùng trồng (gln)" value="GLN_ISSUANCE" />
          <el-option label="phê duyệt quy trình sản xuất" value="PROCESS_TEMPLATE" />
        </el-select>
      </el-form-item>
      <el-form-item label="mã tỉnh/thành phố tiếp nhận">
        <el-input v-model="requestForm.province_code" placeholder="ví dụ: 18 (bắc giang)" />
      </el-form-item>
      <el-button type="primary" class="w-full" @click="submitRequest" :loading="loading">
        gửi hồ sơ phê duyệt
      </el-button>
    </el-form>
  </div>
</template>