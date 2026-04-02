<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/modules/core/store/auth';
import { User, SwitchButton, CaretBottom } from '@element-plus/icons-vue';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const handleLogout = () => {
  authStore.logout();
};
</script>

<template>
  <div class="flex items-center justify-end h-full px-6 bg-white w-full shadow-sm">
    <el-dropdown trigger="click" class="user-dropdown">
      <div class="flex items-center gap-3 cursor-pointer p-1.5 rounded-md hover:bg-gray-100 transition-all">
        <div class="text-right leading-tight hidden sm:block">
          <div class="text-[13px] font-bold text-gray-800">
            {{ user?.username || user?.full_name || 'Đang tải...' }}
          </div>
          <div class="text-[11px] text-gray-500 font-medium truncate max-w-[150px]">
            {{ user?.tenant_name || user?.role || 'Guest' }}
          </div>
        </div>
        
        <el-avatar :size="38" :src="user?.avatar" class="bg-blue-600 shadow-sm border border-blue-100">
          {{ !user?.avatar ? (user?.full_name?.charAt(0).toUpperCase() || 'U') : '' }}
        </el-avatar>
        <el-icon class="text-gray-400"><CaretBottom /></el-icon>
      </div>

      <template #dropdown>
        <el-dropdown-menu class="w-56">
          <el-dropdown-item :icon="User" @click="$router.push({ name: 'user-profile' })">Thông tin tài khoản</el-dropdown-item>
          <el-dropdown-item divided :icon="SwitchButton" @click="handleLogout" class="!text-red-500 font-medium">
            Thoát hệ thống
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped>
.user-dropdown :deep(.el-tooltip__trigger:focus-visible) {
  outline: none;
}
</style>