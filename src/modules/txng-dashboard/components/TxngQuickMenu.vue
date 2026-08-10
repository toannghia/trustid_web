<script setup lang="ts">
import { ref } from 'vue';
import { Search, Connection, MapLocation, Document, Refresh, Monitor, Key, List, MagicStick } from '@element-plus/icons-vue';

const emit = defineEmits<{
    (e: 'action', action: string): void;
}>();

const menuItems = [
    { key: 'stage-wizard', label: 'Giả lập công đoạn', icon: MagicStick, color: '#8b5cf6' },
    { key: 'search-gtin', label: 'Tìm sản phẩm GTIN', icon: Search, color: '#409eff' },
    { key: 'catalogs', label: 'Danh mục TXNG', icon: List, color: '#67c23a' },
    { key: 'vung-trong', label: 'Vùng trồng', icon: MapLocation, color: '#e6a23c' },
    { key: 'enterprise', label: 'Doanh nghiệp', icon: Document, color: '#f56c6c' },
    { key: 'locations', label: 'Địa điểm SX', icon: Connection, color: '#909399' },
    { key: 'sync-catalogs', label: 'Đồng bộ DM', icon: Refresh, color: '#67c23a' },
    { key: 'ping', label: 'Ping API', icon: Monitor, color: '#409eff' },
    { key: 'refresh-token', label: 'Refresh Token', icon: Key, color: '#e6a23c' },
];
</script>

<template>
    <div class="bg-white rounded-lg shadow p-4 mb-4">
        <div class="flex items-center gap-2 mb-3">
            <el-icon :size="18" color="#409eff"><Connection /></el-icon>
            <h3 class="text-sm font-semibold text-gray-700">Menu nhanh</h3>
        </div>
        <div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
            <div
                v-for="item in menuItems"
                :key="item.key"
                class="flex flex-col items-center gap-1.5 p-2.5 rounded-lg cursor-pointer
                       hover:bg-gray-50 active:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                @click="emit('action', item.key)"
            >
                <div
                    class="w-9 h-9 rounded-lg flex items-center justify-center"
                    :style="{ backgroundColor: item.color + '15' }"
                >
                    <el-icon :size="18" :color="item.color">
                        <component :is="item.icon" />
                    </el-icon>
                </div>
                <span class="text-[10px] text-gray-600 text-center leading-tight font-medium">{{ item.label }}</span>
            </div>
        </div>
    </div>
</template>
