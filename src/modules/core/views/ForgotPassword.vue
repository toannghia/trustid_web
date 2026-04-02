<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Message, Back } from '@element-plus/icons-vue';
import api from '@/common/utils/api';
import logo from '@/assets/images/logo.png';

const router = useRouter();
const loading = ref(false);
const submitted = ref(false);

const form = reactive({
  email: ''
});

const handleBack = () => {
  router.push('/login');
};

const handleSubmit = async () => {
  if (!form.email) {
    return ElMessage.warning('Vui lòng nhập địa chỉ email của bạn');
  }

  loading.value = true;
  try {
    await api.post('/auth/forgot-password/init', { email: form.email });
    submitted.value = true;
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra. Vui lòng kiểm tra lại email hoặc thử lại sau.';
    ElMessage.error(errorMsg);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="forgot-page flex items-center justify-center min-h-screen bg-[#e9ecef]">
    <div class="login-box w-[400px]">
      <div class="login-logo text-center mb-6">
        <router-link to="/" class="no-underline">
          <img :src="logo" alt="TrustID Logo" class="h-24 mx-auto object-contain" />
        </router-link>
      </div>

      <div class="card shadow-lg border-t-4 border-[#9fde03] bg-white rounded-md overflow-hidden">
        <div class="card-body p-8">
          
          <div v-if="!submitted">
            <h2 class="text-xl font-bold text-gray-800 mb-2 text-center">Quên mật khẩu?</h2>
            <p class="text-sm text-gray-500 text-center mb-6">
              Nhập email đăng ký của bạn. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
            </p>

            <el-form :model="form" @submit.prevent>
              <el-form-item>
                <el-input
                  v-model="form.email"
                  placeholder="Nhập địa chỉ email"
                  :prefix-icon="Message"
                  size="large"
                  @keyup.enter="handleSubmit"
                />
              </el-form-item>

              <el-button
                type="primary"
                class="w-full !bg-[#9fde03] hover:!bg-[#8bc302] !text-slate-800 !border-none !text-lg !font-semibold !h-12"
                :loading="loading"
                @click="handleSubmit"
              >
                Gửi yêu cầu
              </el-button>
            </el-form>
          </div>

          <div v-else class="text-center">
             <div class="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600">
              <el-icon :size="32"><Message /></el-icon>
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">Đã gửi email!</h2>
            <p class="text-gray-600 mb-6">
              Vui lòng kiểm tra hộp thư đến (và thư rác) của địa chỉ <b>{{ form.email }}</b> để lấy lại mật khẩu.
            </p>
             <el-button 
              plain
              class="w-full"
              @click="handleBack"
            >
              Quay lại Đăng nhập
            </el-button>
          </div>

          <div class="mt-6 text-center border-t border-gray-100 pt-4" v-if="!submitted">
            <a 
              href="#" 
              @click.prevent="handleBack"
              class="text-sm text-gray-500 hover:text-[#9fde03] flex items-center justify-center gap-1"
            >
              <el-icon><Back /></el-icon> Quay lại Đăng nhập
            </a>
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
.forgot-page {
  font-family: 'Be Vietnam Pro', -apple-system, system-ui, sans-serif;
}
.card {
  transition: transform 0.3s ease;
}
.card:hover {
  transform: translateY(-2px);
}
</style>
