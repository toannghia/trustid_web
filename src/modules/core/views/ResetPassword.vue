<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Lock, Check } from '@element-plus/icons-vue';
import api from '@/common/utils/api';
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
  <div 
    class="reset-page relative flex items-center justify-center min-h-screen w-full p-4 overflow-y-auto bg-cover bg-center select-none"
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
          </div>
        </div>

        <div class="relative z-10 pt-6 border-t border-white/10 mt-8">
          <p class="text-[11px] text-white/50 leading-relaxed">
            © 2026 TrustID — Hệ thống định danh số đáng tin cậy.
          </p>
        </div>
      </div>

      <!-- Right Column: Reset Password Form -->
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

          <div v-if="!success && !error">
            <h2 class="text-2xl font-bold text-gray-800">Đặt lại mật khẩu</h2>
            <p class="text-sm text-gray-500 mt-1">Nhập mật khẩu mới cho tài khoản của bạn.</p>
          </div>
          <div v-else-if="success">
            <h2 class="text-2xl font-bold text-gray-800">Thành công!</h2>
            <p class="text-sm text-gray-500 mt-1">Mật khẩu của bạn đã được cập nhật.</p>
          </div>
          <div v-else>
            <h2 class="text-2xl font-bold text-gray-800">Lỗi xác thực</h2>
            <p class="text-sm text-red-500 mt-1">Liên kết không hợp lệ hoặc đã hết hạn.</p>
          </div>
        </div>

        <!-- Form fields -->
        <div v-if="!success && !error">
          <el-form :model="form" label-position="top" @submit.prevent="handleReset">
            <el-form-item label="Mật khẩu mới" class="custom-form-item">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="Nhập mật khẩu mới"
                :prefix-icon="Lock"
                show-password
                size="large"
              />
            </el-form-item>

            <el-form-item label="Xác nhận mật khẩu mới" class="custom-form-item">
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

            <!-- Submit Button -->
            <el-button
              type="primary"
              class="w-full !h-12 !rounded-lg !bg-[#00875A] hover:!bg-[#006e49] active:!bg-[#00573a] !border-none flex items-center justify-center gap-2 font-semibold text-sm shadow-md transition-all duration-300 mt-4"
              :loading="loading"
              @click="handleReset"
            >
              <span>Lưu mật khẩu mới</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4.5 h-4.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            </el-button>
          </el-form>
        </div>

        <!-- SUCCESS STATE -->
        <div v-else-if="success" class="text-center py-4">
          <div class="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm">
            <el-icon :size="24"><Check /></el-icon>
          </div>
          <p class="text-sm text-gray-600 leading-relaxed mb-6">
            Mật khẩu của bạn đã được cập nhật thành công. Hãy quay lại trang đăng nhập để tiếp tục truy cập hệ thống.
          </p>
          <el-button 
            type="primary"
            class="w-full !h-11 !rounded-lg !bg-[#00875A] hover:!bg-[#006e49] active:!bg-[#00573a] !border-none !text-sm font-semibold transition-all duration-300"
            @click="goToLogin"
          >
            Đăng nhập ngay
          </el-button>
        </div>

        <!-- ERROR STATE (Invalid Token) -->
        <div v-else class="text-center py-4">
          <div class="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-50 border border-rose-100 text-rose-600 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-7 h-7">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <p class="text-sm text-rose-500 leading-relaxed mb-6 font-medium">
            {{ error }}
          </p>
          <el-button 
            type="default"
            class="w-full !h-11 !rounded-lg !border-gray-200 hover:!border-[#1A73E8] hover:!text-[#1A73E8] !text-sm font-medium transition-all duration-300"
            @click="goToLogin"
          >
            Quay lại Đăng nhập
          </el-button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.reset-page {
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
</style>
