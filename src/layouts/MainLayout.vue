<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/modules/core/store/auth';
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';
import { Expand, Fold, Loading } from '@element-plus/icons-vue';

const authStore = useAuthStore();
const isLocal = computed(() => {
  const url = import.meta.env.VITE_API_URL || '';
  return url.includes('localhost') || url.includes('127.0.0.1');
});
const isCollapse = ref(false);
const isMobileOpen = ref(false);

/**
 * 1. Logic kiểm soát hiển thị (isLoaded):
 * Đảm bảo rằng nếu có token, hệ thống phải đợi lấy xong Profile 
 * mới vẽ giao diện để tránh lỗi thiếu menu hoặc sai thông tin Header. [cite: 425]
 */
const isLoaded = computed(() => {
  const token = localStorage.getItem('access_token');
  // Nếu không có token, cho phép hiển thị (Router Guard sẽ tự đẩy ra trang Login)
  if (!token) return true; 
  // Nếu có token, chỉ hiển thị khi object user trong store đã có dữ liệu [cite: 426]
  return !!authStore.user;
});

/**
 * 2. Hàm đóng/mở Sidebar
 */
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value;
};
</script>

<template>
  <div v-if="isLoaded" class="flex h-screen w-full overflow-hidden bg-[var(--tid-bg)]">
    <!-- Mobile Backdrop Overlay -->
    <div 
      v-if="isMobileOpen" 
      class="fixed inset-0 bg-black/50 z-[1000] md:hidden transition-opacity"
      @click="isMobileOpen = false"
    ></div>

    <aside 
      :class="[
        'h-full bg-[var(--tid-sidebar-bg)] transition-all duration-300 shadow-xl z-[1001] flex-shrink-0',
        // Desktop behavior
        isCollapse ? 'md:w-[64px]' : 'md:w-[250px]',
        // Mobile behavior (Off-canvas drawer)
        'fixed inset-y-0 left-0 w-[250px] md:relative md:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <Sidebar :is-collapsed="isCollapse" @close-mobile="isMobileOpen = false" />
    </aside>

    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      
      <header class="h-[64px] w-full bg-white border-b z-[1000] sticky top-0 flex-shrink-0 shadow-sm flex items-center">
        <!-- Mobile Toggle Menu -->
        <div 
          class="px-4 cursor-pointer text-gray-500 hover:text-blue-600 transition-colors md:hidden"
          @click="isMobileOpen = true"
        >
          <el-icon :size="24">
            <Expand />
          </el-icon>
        </div>

        <!-- Desktop Toggle Menu -->
        <div 
          class="px-4 cursor-pointer text-gray-500 hover:text-blue-600 transition-colors hidden md:block"
          @click="toggleSidebar"
        >
          <el-icon :size="24">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
        </div>
        
        <Header class="flex-1" />

        <!-- LOCAL DEV Badge in Header -->
        <div v-if="isLocal" class="ml-auto mr-4">
          <span class="badge badge-warning bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold">LOCAL DEV</span>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-6 scroll-smooth bg-[var(--tid-bg)]">
        <div class="mx-auto w-full max-w-[1600px]">
          <router-view />
        </div>
        
        <footer class="mt-8 py-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <strong>TrustID Admin</strong> &copy; 2026. Phát triển bởi <b>Zenpos Team</b>.
        </footer>
      </main>
      
    </div>
  </div>

  <div v-else class="h-screen w-screen flex flex-col items-center justify-center bg-[var(--tid-bg)]">
    <el-icon class="is-loading text-blue-500" :size="45">
      <Loading />
    </el-icon>
    <p class="mt-4 text-gray-600 font-medium animate-pulse text-sm">
      Đang đồng bộ dữ liệu hệ thống...
    </p>
  </div>
</template>

<style scoped>
/* Hiệu ứng chuyển động mượt mà cho Sidebar */
aside {
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Tối ưu thanh cuộn cho vùng nội dung */
main::-webkit-scrollbar {
  width: 6px;
}
main::-webkit-scrollbar-thumb {
  background-color: #ced4da;
  border-radius: 10px;
}
main::-webkit-scrollbar-track {
  background: transparent;
}

/* Đảm bảo nội dung không bị vỡ khi co giãn sidebar */
.flex-1 {
  min-width: 0;
}
</style>