<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useAuthStore } from '../store/auth';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import logo from '@/assets/images/logo.png';
import logoWhite from '@/assets/images/TrusID-TV_w.png';

// Import all background images for random selection
import bg1 from '@/assets/images/bg/16813349.png';
import bg2 from '@/assets/images/bg/bac_son_1.jpeg';
import bg3 from '@/assets/images/bg/hoang-su-phi-ha-giang.jpeg';
import bg4 from '@/assets/images/bg/mu-cang-chai-.jpeg';
import bg5 from '@/assets/images/bg/mu_cang_chai.jpg';
import bg6 from '@/assets/images/bg/pu-luong(1).jpeg';
import bg7 from '@/assets/images/bg/rice_15799117.jpg';
import bg8 from '@/assets/images/bg/sapa-t(1).jpeg';
import bg9 from '@/assets/images/bg/tam-coc.jpeg';
import bg10 from '@/assets/images/bg/y-ty-g.jpeg';

const bgImages = [bg1, bg2, bg3, bg4, bg5, bg6, bg7, bg8, bg9, bg10];
const bgImage = bgImages[Math.floor(Math.random() * bgImages.length)];

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
  <div 
    class="login-page relative flex items-center justify-center min-h-screen w-full p-4 overflow-y-auto bg-cover bg-center select-none"
    :style="{ backgroundImage: `url(${bgImage})` }"
  >
    <!-- Dark/Navy Brand Overlay -->
    <div class="absolute inset-0 bg-[#0F2B46]/55 backdrop-blur-[3px] pointer-events-none"></div>

    <!-- Home Button (Trang chủ) -->
    <a 
      href="https://trustid.com.vn/" 
      class="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/10 backdrop-blur-md transition-all duration-300 no-underline shadow-sm"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      Trang chủ
    </a>

    <!-- Main Card Container -->
    <div class="relative z-10 w-full max-w-[900px] min-h-0 md:min-h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
      
      <!-- Left Column: Branding & Value Proposition (Hidden on mobile) -->
      <div class="hidden md:flex md:w-[50%] bg-[#0F2B46] p-8 md:p-10 flex-col justify-between text-white relative overflow-hidden">
        <!-- Abstract Background Glowing Elements -->
        <div class="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        
        <div class="relative z-10">
          <div class="mb-8 flex flex-col items-center justify-center">
            <img :src="logoWhite" alt="TrustID Logo" class="h-[72px] object-contain" />
            <div class="h-1 w-16 bg-emerald-400 rounded mt-4"></div>
          </div>
          
          <p class="text-white/80 text-sm leading-relaxed text-center mb-6">
            Nền tảng định danh & truy xuất nguồn gốc sản phẩm an toàn, minh bạch bằng công nghệ Blockchain.
          </p>

          <!-- Features list -->
          <div class="space-y-6">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 text-emerald-400">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
              </div>
              <div>
                <h4 class="font-bold text-sm text-white">Xác thực nguồn gốc 100%</h4>
                <p class="text-xs text-white/70 mt-1">Thông tin minh bạch được bảo vệ bằng mã hóa và công nghệ Blockchain.</p>
              </div>
            </div>

            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 text-emerald-400">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <h4 class="font-bold text-sm text-white">Công nghệ định vị DTALS</h4>
                <p class="text-xs text-white/70 mt-1">Định vị thời gian thực chính xác đến cm cho vùng nguyên liệu và phương tiện vận chuyển.</p>
              </div>
            </div>

            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 text-emerald-400">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <h4 class="font-bold text-sm text-white">Nhật ký điện tử một chạm</h4>
                <p class="text-xs text-white/70 mt-1">Xây dựng quy trình mẫu tiêu chuẩn, hỗ trợ nông dân kiểm soát quy trình canh tác chỉ với một chạm.</p>
              </div>
            </div>
            <!--
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4 text-emerald-400">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              </div>
              <div>
                <h4 class="font-bold text-sm text-white">Đáp ứng hồ sơ EUDR</h4>
                <p class="text-xs text-white/70 mt-1">TrustID thu thập dữ và đóng gói dữ liệu, kiểm tra thông tin phá rừng và kết nối hệ thống của EUDR</p>
              </div>
            </div> -->
          </div>
        </div>

        <div class="relative z-10 pt-6 border-t border-white/10 mt-8">
          <p class="text-[11px] text-white/50 leading-relaxed">
            © 2026 TrustID — Hệ thống định danh số đáng tin cậy.
          </p>
        </div>
      </div>

      <!-- Right Column: Login Form -->
      <div class="w-full md:w-[50%] p-8 md:p-10 flex flex-col justify-center bg-white">
        <!-- Logo and System Header -->
        <div class="text-center md:text-left mb-6">
          <div class="flex items-center justify-center md:justify-start gap-3 mb-4">
            <img :src="logo" alt="TrustID Logo" class="h-14 object-contain" />
            <div class="text-left border-l border-gray-200 pl-3">
              <h2 class="text-xs font-bold text-[#0F2B46] uppercase tracking-wider">Hệ thống quản trị</h2>
              <h3 class="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">TRUSTID PLATFORM</h3>
            </div>
          </div>

          <h2 class="text-2xl font-bold text-gray-800">Đăng nhập hệ thống</h2>
          <p class="text-sm text-gray-500 mt-1">Vui lòng nhập thông tin để truy cập quản trị.</p>
        </div>

        <!-- Form fields -->
        <el-form :model="loginForm" label-position="top" @submit.prevent="handleLogin">
          <el-form-item label="Tài khoản đăng nhập" class="custom-form-item">
            <el-input
              v-model="loginForm.username"
              placeholder="Tên đăng nhập hoặc email"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>

          <el-form-item label="Mật khẩu" class="custom-form-item mt-4">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="Nhập mật khẩu"
              :prefix-icon="Lock"
              show-password
              size="large"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <!-- Utilities (Remember & Forgot) -->
          <div class="flex items-center justify-between mt-4 mb-6">
            <el-checkbox v-model="loginForm.remember" class="custom-checkbox">
              Ghi nhớ tài khoản
            </el-checkbox>
            <router-link to="/auth/forgot-password" class="text-sm text-[#1A73E8] hover:text-[#0F2B46] hover:underline no-underline font-medium">
              Quên mật khẩu?
            </router-link>
          </div>

          <!-- Submit Button -->
          <el-button
            type="primary"
            class="w-full !h-12 !rounded-lg !bg-[#00875A] hover:!bg-[#006e49] active:!bg-[#00573a] !border-none flex items-center justify-center gap-2 font-semibold text-sm shadow-md transition-all duration-300"
            :loading="loading"
            @click="handleLogin"
          >
            <span>Đăng nhập</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4.5 h-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </el-button>
        </el-form>

        <!-- Error box -->
        <div v-if="errorDetail" class="error-detail-box mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
          <p class="text-xs text-red-700 font-bold flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
            </svg>
            Chi tiết lỗi kết nối:
          </p>
          <pre class="text-xs text-red-600 whitespace-pre-wrap break-words leading-relaxed font-mono">{{ errorDetail }}</pre>
        </div>

        <!-- Disclaimers / Footnotes -->
        <div class="mt-8 pt-6 border-t border-gray-100 text-center">
          <p class="text-xs text-gray-400">
            Đây là hệ thống quản trị nội bộ của TrustID. Mọi truy cập không được cấp quyền đều bị nghiêm cấm.
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.login-page {
  font-family: 'Be Vietnam Pro', -apple-system, system-ui, sans-serif;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #374151; /* text-gray-700 */
  padding-bottom: 6px !important;
  font-size: 13.5px;
}

:deep(.el-input__wrapper) {
  border-radius: 8px !important;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  background-color: #ffffff !important;
  padding: 4px 12px !important;
  transition: all 0.2s ease;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px #1A73E8 inset !important;
  background-color: #ffffff !important;
}

:deep(.el-input__inner) {
  font-size: 15px !important;
  background-color: transparent !important;
}

/* Fix browser autofill background color showing grey/blue */
:deep(input:-webkit-autofill),
:deep(input:-webkit-autofill:hover),
:deep(input:-webkit-autofill:focus),
:deep(input:-webkit-autofill:active) {
  -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
  -webkit-text-fill-color: #374151 !important;
  transition: background-color 5000s ease-in-out 0s;
}

:deep(.el-checkbox__label) {
  color: #4b5563 !important;
  font-size: 13.5px;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #1A73E8 !important;
  border-color: #1A73E8 !important;
}

:deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #1A73E8 !important;
}
</style>