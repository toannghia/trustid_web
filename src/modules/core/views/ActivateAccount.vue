<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/common/utils/api';
import logo from '@/assets/images/logo.png';
import { Check, Close, Loading } from '@element-plus/icons-vue';

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
  <div class="activation-page flex items-center justify-center min-h-screen bg-[#e9ecef]">
    <div class="activation-box w-[480px]">
      <div class="text-center mb-6">
        <img :src="logo" alt="TrustID Logo" class="h-24 mx-auto object-contain" />
      </div>

      <div class="card shadow-lg border-t-4 border-[#9fde03] bg-white rounded-md overflow-hidden">
        <div class="card-body p-8 text-center">
          
          <!-- State: PENDING (Ready to activate) -->
          <div v-if="status === 'pending'">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Kích hoat tài khoản</h2>
            <p class="text-gray-600 mb-8">
              Chào mừng bạn đến với <b>TrustID</b>. <br>
              Vui lòng nhấn nút bên dưới để xác thực email và kích hoạt tài khoản của bạn.
            </p>
            
            <el-button 
              type="primary" 
              class="!bg-[#9fde03] hover:!bg-[#8bc302] !text-slate-800 !border-none !px-8 !py-5 !text-lg !font-semibold"
              :loading="loading"
              @click="handleActivate"
            >
              Kích hoạt ngay
            </el-button>
          </div>

          <!-- State: SUCCESS -->
          <div v-if="status === 'success'">
            <div class="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600">
              <el-icon :size="32"><Check /></el-icon>
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">Kích hoạt thành công!</h2>
            <p class="text-gray-600 mb-8">
              Tài khoản của bạn đã được kích hoạt. Bạn có thể đăng nhập ngay bây giờ.
            </p>
            <el-button 
              type="primary"
              class="!bg-[#9fde03] hover:!bg-[#8bc302] !text-slate-800 !border-none !px-6"
              @click="goToLogin"
            >
              Đi tới Đăng nhập
            </el-button>
          </div>

          <!-- State: ERROR -->
          <div v-if="status === 'error'">
            <div class="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600">
              <el-icon :size="32"><Close /></el-icon>
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">Kích hoạt thất bại</h2>
            <p class="text-red-500 mb-8">
              {{ errorMessage }}
            </p>
            <el-button 
              plain
              @click="goToLogin"
            >
              Quay về Đăng nhập
            </el-button>
          </div>

        </div>
      </div>

      <p class="mt-6 text-center text-sm text-gray-500">
        © 2026 <b>TrustID</b>. Bảo lưu mọi quyền.
      </p>
    </div>
  </div>
</template>

<style scoped>
.activation-page {
  font-family: 'Be Vietnam Pro', -apple-system, system-ui, sans-serif;
}
.card {
  transition: transform 0.3s ease;
}
.card:hover {
  transform: translateY(-2px);
}
</style>
