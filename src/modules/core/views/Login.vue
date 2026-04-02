<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useAuthStore } from '../store/auth';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import logo from '@/assets/images/logo.png';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);

const loginForm = reactive({
  username: '',
  password: '',
  remember: false
});

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    return ElMessage.warning('Vui lòng điền đầy đủ thông tin đăng nhập');
  }

  loading.value = true;
  try {
    await authStore.login({
      username: loginForm.username,
      password: loginForm.password
    });

    ElMessage.success('Đăng nhập thành công');
    router.push('/');
  } catch (error: any) {
    // TRƯỜNG HỢP 1: Không kết nối được đến Server (Lỗi mạng, Server sập, sai URL)
    if (!error.response) {
      ElMessage.error('Lỗi kết nối: không thể kết nối đến máy chủ API. vui lòng kiểm tra lại đường truyền hoặc backend.');
      console.error('Network Error:', error);
    } 
    // TRƯỜNG HỢP 2: Server có phản hồi nhưng trả về lỗi (Sai pass, user không tồn tại...)
    else {
      let serverMessage = error.response?.data?.message;
      if (Array.isArray(serverMessage)) {
        serverMessage = serverMessage[0];
      }
      ElMessage.error(serverMessage || 'Tài khoản hoặc mật khẩu không chính xác');
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page flex items-center justify-center min-h-screen bg-[#e9ecef]">
    <div class="login-box w-[360px]">
      <div class="login-logo text-center mb-4">
        <router-link to="/" class="no-underline">
          <img :src="logo" alt="TrustID Logo" class="h-24 mx-auto object-contain" />
        </router-link>
      </div>

      <div class="card shadow-lg border-t-4 border-tid-secondary bg-white rounded-md overflow-hidden">
        <div class="card-body p-6">
          <p class="login-box-msg text-center mb-6 text-gray-600">
            Đăng nhập để bắt đầu phiên làm việc
          </p>

          <el-form :model="loginForm" label-position="top">
            <el-form-item>
              <el-input
                v-model="loginForm.username"
                placeholder="Tên đăng nhập / email"
                :prefix-icon="User"
                size="large"
              />
            </el-form-item>

            <el-form-item>
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="Mật khẩu"
                :prefix-icon="Lock"
                show-password
                size="large"
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <div class="flex items-center justify-between mb-4">
              <el-checkbox v-model="loginForm.remember" label="Ghi nhớ tài khoản" />
              <router-link to="/auth/forgot-password" class="text-sm text-tid-secondary hover:text-tid-primary hover:underline no-underline">Quên mật khẩu?</router-link>
            </div>

            <el-button
              type="primary"
              class="w-full !bg-tid-secondary hover:!bg-tid-primary !text-white !border-none"
              size="large"
              :loading="loading"
              @click="handleLogin"
            >
              Đăng nhập
            </el-button>
          </el-form>

          <div class="social-auth-links text-center mt-6 pt-4 border-t border-gray-100">
            <div class="mt-4 space-y-2">
              <p class="text-xs text-gray-400">
                Đây là hệ thống nội bộ của TrustID
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <p class="mt-4 text-center text-sm text-gray-500">
        © 2026 <b>TrustID</b>. bảo lưu mọi quyền.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* font chữ đặc trưng của adminlte 4 */
.login-page {
  font-family: 'Be Vietnam Pro', -apple-system, system-ui, sans-serif;
}

/* làm mượt hiệu ứng card */
.card {
  transition: transform 0.3s ease;
}
.card:hover {
  transform: translateY(-2px);
}
</style>