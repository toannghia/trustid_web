<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Warning, Back } from '@element-plus/icons-vue';

const router = useRouter();

const goHome = () => {
  router.push('/');
};
</script>

<template>
  <div class="not-found-container flex flex-col items-center justify-center min-h-[80vh] text-center">
    <div class="error-code text-[120px] font-bold text-gray-200 leading-none mb-4 relative">
      404
      <el-icon class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-400 opacity-80" :size="80">
        <Warning />
      </el-icon>
    </div>

    <h3 class="text-2xl font-bold text-gray-700 mb-2 uppercase tracking-wide">
      Ối! Không tìm thấy trang
    </h3>
    <p class="text-gray-500 max-w-md mx-auto mb-8">
      Chúng tôi không thể tìm thấy trang mà bạn đang yêu cầu. 
      Có thể đường dẫn đã bị thay đổi hoặc không còn tồn tại nữa.
    </p>

    <el-button 
      type="primary" 
      size="large" 
      class="!px-8 !rounded-full shadow-md hover:shadow-lg transition-all"
      :icon="Back"
      @click="goHome"
    >
      Quay về Trang chủ
    </el-button>

    <div class="mt-12 text-sm text-gray-400">
      Nếu bạn nghĩ đây là một lỗi kỹ thuật, vui lòng liên hệ 
      <a href="mailto:support@zenpos.vn" class="text-blue-500 hover:underline">Bộ phận hỗ trợ Zenpos</a>.
    </div>
  </div>
</template>

<style scoped>
.error-code {
  font-family: 'Be Vietnam Pro', -apple-system, system-ui, sans-serif;
  user-select: none;
}

/* Hiệu ứng rung nhẹ cho icon cảnh báo */
.el-icon {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(-50%, -60%); }
  50% { transform: translate(-50%, -40%); }
}
</style>