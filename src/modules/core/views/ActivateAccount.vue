<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/common/utils/api';
import logo from '@/assets/images/logo.png';
import logoWhite from '@/assets/images/TrusID-TV_w.png';
import { Check, Close, Loading } from '@element-plus/icons-vue';

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
const token = ref('');
const loading = ref(false);
const status = ref<'pending' | 'success' | 'error'>('pending');
const errorMessage = ref('');

onMounted(() => {
  token.value = route.query.token as string;
  if (!token.value) {
    status.value = 'error';
    errorMessage.value = 'Mã kích hoạt không hợp lệ hoặc thiếu.';
  }
});

const handleActivate = async () => {
  if (!token.value) return;

  loading.value = true;
  try {
    // Call API to activate
    await api.get(`/auth/activate?token=${token.value}`);
    status.value = 'success';
  } catch (error: any) {
    status.value = 'error';
    errorMessage.value = error.response?.data?.message || 'Kích hoạt thất bại. Vui lòng thử lại hoặc liên hệ hỗ trợ.';
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
    class="activation-page relative flex items-center justify-center min-h-screen w-full p-4 overflow-y-auto bg-cover bg-center select-none"
    :style="{ backgroundImage: `url(${bgImage})` }"
  >
    <!-- Dark/Navy Brand Overlay -->
    <div class="absolute inset-0 bg-[#0F2B46]/55 backdrop-blur-[3px] pointer-events-none"></div>

    <!-- Home Button (Trang chủ) -->
    <a 
      href="https://trustid.com.vn/" 
      class="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/10 backdrop-blur-md transition-all duration-300 no-underline shadow-sm"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4.5 h-4.5">
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

      <!-- Right Column: Activation Content -->
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

          <div v-if="status === 'pending'">
            <h2 class="text-2xl font-bold text-gray-800">Kích hoạt tài khoản</h2>
            <p class="text-sm text-gray-500 mt-1">Chào mừng bạn đến với hệ thống quản trị TrustID.</p>
          </div>
          <div v-else-if="status === 'success'">
            <h2 class="text-2xl font-bold text-gray-800">Kích hoạt thành công!</h2>
            <p class="text-sm text-gray-500 mt-1">Tài khoản của bạn đã sẵn sàng sử dụng.</p>
          </div>
          <div v-else>
            <h2 class="text-2xl font-bold text-gray-800">Kích hoạt thất bại</h2>
            <p class="text-sm text-red-500 mt-1">Gặp lỗi trong quá trình kích hoạt tài khoản.</p>
          </div>
        </div>

        <!-- Content according to state -->
        
        <!-- State: PENDING (Ready to activate) -->
        <div v-if="status === 'pending'" class="text-center md:text-left">
          <p class="text-sm text-gray-600 leading-relaxed mb-6">
            Vui lòng nhấn nút bên dưới để xác thực địa chỉ email và chính thức kích hoạt tài khoản của bạn trên hệ thống.
          </p>
          
          <el-button 
            type="primary" 
            class="w-full !h-12 !rounded-lg !bg-[#00875A] hover:!bg-[#006e49] active:!bg-[#00573a] !border-none flex items-center justify-center gap-2 font-semibold text-sm shadow-md transition-all duration-300"
            :loading="loading"
            @click="handleActivate"
          >
            <span>Kích hoạt ngay</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4.5 h-4.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </el-button>
        </div>

        <!-- State: SUCCESS -->
        <div v-if="status === 'success'" class="text-center py-4">
          <div class="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm">
            <el-icon :size="24"><Check /></el-icon>
          </div>
          <p class="text-sm text-gray-600 leading-relaxed mb-6">
            Tài khoản của bạn đã được xác thực thành công. Bạn có thể đăng nhập vào hệ thống ngay bây giờ.
          </p>
          <el-button 
            type="primary"
            class="w-full !h-11 !rounded-lg !bg-[#00875A] hover:!bg-[#006e49] active:!bg-[#00573a] !border-none !text-sm font-semibold transition-all duration-300"
            @click="goToLogin"
          >
            Đi tới Đăng nhập
          </el-button>
        </div>

        <!-- State: ERROR -->
        <div v-if="status === 'error'" class="text-center py-4">
          <div class="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-50 border border-rose-100 text-rose-600 shadow-sm">
            <el-icon :size="24"><Close /></el-icon>
          </div>
          <p class="text-sm text-rose-500 leading-relaxed mb-6 font-medium">
            {{ errorMessage }}
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
.activation-page {
  font-family: 'Be Vietnam Pro', -apple-system, system-ui, sans-serif;
}
</style>
