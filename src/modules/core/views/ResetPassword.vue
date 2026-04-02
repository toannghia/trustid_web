<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Lock, Check } from '@element-plus/icons-vue';
import api from '@/common/utils/api';
import logo from '@/assets/images/logo.png';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const success = ref(false);
const token = ref('');
const error = ref('');

const form = reactive({
  password: '',
  confirmPassword: ''
});

onMounted(() => {
  token.value = route.query.token as string;
  if (!token.value) {
    error.value = 'Liên kết không hợp lệ. Vui lòng kiểm tra lại email của bạn.';
  }
});

const handleReset = async () => {
  if (!token.value) return;
  
  if (!form.password || !form.confirmPassword) {
    return ElMessage.warning('Vui lòng nhập đầy đủ mật khẩu mới');
  }

  if (form.password !== form.confirmPassword) {
    return ElMessage.warning('Mật khẩu xác nhận không khớp');
  }

  if (form.password.length < 6) {
    return ElMessage.warning('Mật khẩu phải có ít nhất 6 ký tự');
  }

  loading.value = true;
  try {
    await api.post('/auth/reset-password', {
      token: token.value,
      newPassword: form.password
    });
    
    success.value = true;
    ElMessage.success('Đặt lại mật khẩu thành công');
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Đặt lại mật khẩu thất bại. Liên kết có thể đã hết hạn.';
    ElMessage.error(errorMsg);
  } finally {
    loading.value = false;
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<template>
  <div class="reset-page flex items-center justify-center min-h-screen bg-[#e9ecef]">
    <div class="login-box w-[400px]">
      <div class="login-logo text-center mb-6">
        <router-link to="/" class="no-underline">
          <img :src="logo" alt="TrustID Logo" class="h-24 mx-auto object-contain" />
        </router-link>
      </div>

      <div class="card shadow-lg border-t-4 border-[#9fde03] bg-white rounded-md overflow-hidden">
        <div class="card-body p-8">
          
          <!-- FORM STATE -->
          <div v-if="!success && !error">
            <h2 class="text-xl font-bold text-gray-800 mb-2 text-center">Đặt lại mật khẩu</h2>
             <p class="text-sm text-gray-500 text-center mb-6">
              Nhập mật khẩu mới cho tài khoản của bạn.
            </p>

            <el-form :model="form" @submit.prevent label-position="top">
              <el-form-item label="Mật khẩu mới">
                <el-input
                  v-model="form.password"
                  type="password"
                  placeholder="Nhập mật khẩu mới"
                  :prefix-icon="Lock"
                  show-password
                  size="large"
                />
              </el-form-item>

              <el-form-item label="Xác nhận mật khẩu">
                <el-input
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  :prefix-icon="Lock"
                  show-password
                  size="large"
                  @keyup.enter="handleReset"
                />
              </el-form-item>

              <el-button
                type="primary"
                class="w-full !bg-[#9fde03] hover:!bg-[#8bc302] !text-slate-800 !border-none !text-lg !font-semibold !h-12 mt-2"
                :loading="loading"
                @click="handleReset"
              >
                Lưu mật khẩu mới
              </el-button>
            </el-form>
          </div>

          <!-- SUCCESS STATE -->
          <div v-else-if="success" class="text-center">
            <div class="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600">
              <el-icon :size="32"><Check /></el-icon>
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">Thành công!</h2>
            <p class="text-gray-600 mb-6">
              Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập ngay bây giờ.
            </p>
            <el-button 
              type="primary"
              class="w-full !bg-[#9fde03] hover:!bg-[#8bc302] !text-slate-800 !border-none"
              @click="goToLogin"
            >
              Đăng nhập ngay
            </el-button>
          </div>

          <!-- ERROR STATE (Invalid Token) -->
          <div v-else class="text-center">
             <div class="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600">
              <el-icon :size="32"><Lock /></el-icon>
            </div>
             <h2 class="text-xl font-bold text-gray-800 mb-2">Lỗi xác thực</h2>
             <p class="text-red-500 mb-6">{{ error }}</p>
             <el-button plain @click="goToLogin">Quay lại Đăng nhập</el-button>
          </div>

        </div>
      </div>
      
       <p class="mt-4 text-center text-sm text-gray-500">
        © 2026 <b>TrustID</b>. Bảo lưu mọi quyền.
      </p>
    </div>
  </div>
</template>

<style scoped>
.reset-page {
  font-family: 'Be Vietnam Pro', -apple-system, system-ui, sans-serif;
}
.card {
  transition: transform 0.3s ease;
}
.card:hover {
  transform: translateY(-2px);
}
</style>
