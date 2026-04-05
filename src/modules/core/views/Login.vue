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
const errorDetail = ref('');

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
  errorDetail.value = '';
  try {
    await authStore.login({
      username: loginForm.username,
      password: loginForm.password
    });

    ElMessage.success('Đăng nhập thành công');
    router.push('/');
  } catch (error: any) {
    console.error('[Login Error]', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
    });

    // TRƯỜNG HỢP 1: Không kết nối được đến Server (CORS, mạng, server sập, timeout)
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorDetail.value = `⏱ Hết thời gian chờ kết nối đến API (${error.config?.baseURL || 'N/A'}).\nVui lòng kiểm tra backend có đang chạy không.`;
      } else if (error.message === 'Network Error') {
        errorDetail.value = `🔌 Không thể kết nối đến máy chủ API.\n\n` +
          `🔗 URL đang gọi: ${error.config?.baseURL || 'N/A'}${error.config?.url || ''}\n\n` +
          `Nguyên nhân có thể:\n` +
          `• Backend chưa chạy hoặc đã sập\n` +
          `• Lỗi CORS - domain hiện tại chưa được cho phép\n` +
          `• Sai URL API trong cấu hình (.env)\n` +
          `• Mất kết nối internet`;
      } else {
        errorDetail.value = `❌ Lỗi không xác định: ${error.message}`;
      }
      ElMessage.error('Lỗi kết nối: không thể kết nối đến máy chủ API');
    }
    // TRƯỜNG HỢP 2: Server trả về lỗi xác thực (401)
    else if (error.response.status === 401) {
      let serverMessage = error.response?.data?.message;
      if (Array.isArray(serverMessage)) {
        serverMessage = serverMessage[0];
      }
      errorDetail.value = '';
      ElMessage.error(serverMessage || 'Tài khoản hoặc mật khẩu không chính xác');
    }
    // TRƯỜNG HỢP 3: Lỗi server khác (500, 502, 503...)
    else {
      const status = error.response.status;
      let serverMessage = error.response?.data?.message;
      if (Array.isArray(serverMessage)) {
        serverMessage = serverMessage[0];
      }
      errorDetail.value = `⚠️ Máy chủ trả về lỗi HTTP ${status}.\n${serverMessage || 'Không có thông tin chi tiết.'}`;
      ElMessage.error(`Lỗi máy chủ (HTTP ${status}). Vui lòng thử lại sau.`);
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

          <!-- Chi tiết lỗi kết nối (hiển thị khi có lỗi) -->
          <div v-if="errorDetail" class="error-detail-box mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-xs text-red-700 font-semibold mb-1">📋 Chi tiết lỗi:</p>
            <pre class="text-xs text-red-600 whitespace-pre-wrap break-words leading-relaxed">{{ errorDetail }}</pre>
          </div>

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