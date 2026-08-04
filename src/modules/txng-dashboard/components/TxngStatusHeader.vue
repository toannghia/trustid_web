<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    summary: {
        totalSynced: number;
        totalFailed: number;
        totalPending: number;
        successRate: number;
        lastSyncAt: Date | null;
        tokenStatus: string;
        entityBreakdown: { entityType: string; synced: number; failed: number }[];
    };
}>();

const tokenColor = computed(() => {
    switch (props.summary.tokenStatus) {
        case 'VALID': return '#67C23A';
        case 'EXPIRED': return '#F56C6C';
        default: return '#909399';
    }
});

const tokenLabel = computed(() => {
    switch (props.summary.tokenStatus) {
        case 'VALID': return '🟢 Token hợp lệ';
        case 'EXPIRED': return '🔴 Token hết hạn';
        case 'NOT_CONFIGURED': return '⚪ Chưa cấu hình';
        default: return '⚪ Không xác định';
    }
});

const entityTypeLabels: Record<string, string> = {
    VUNG_TRONG: 'Vùng trồng',
    LENH_SAN_XUAT: 'Lệnh SX',
    CHUOI_SAN_XUAT: 'Chuỗi CƯ',
    DIA_DIEM: 'Địa điểm',
    SU_KIEN_VUNG_TRONG: 'SK Vùng trồng',
    SU_KIEN_VAN_CHUYEN: 'SK Vận chuyển',
    SU_KIEN_CHE_BIEN: 'SK Chế biến',
    SU_KIEN_CHUNG_NHAN: 'SK Chứng nhận',
    SU_KIEN_KHO_TONG: 'SK Kho tổng',
    SU_KIEN_DAI_LY: 'SK Đại lý',
    SU_KIEN_CUA_HANG: 'SK Cửa hàng',
    ANH_MINH_CHUNG: 'Ảnh minh chứng',
    DANH_MUC: 'Danh mục',
};
</script>

<template>
    <div class="mb-6">
        <!-- Stat Cards -->
        <div class="grid grid-cols-5 gap-4 mb-4">
            <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div class="text-sm text-gray-500">Đã đồng bộ</div>
                <div class="text-2xl font-bold text-green-600">{{ summary.totalSynced }}</div>
            </div>
            <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <div class="text-sm text-gray-500">Đang chờ</div>
                <div class="text-2xl font-bold text-yellow-600">{{ summary.totalPending }}</div>
            </div>
            <div class="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                <div class="text-sm text-gray-500">Lỗi</div>
                <div class="text-2xl font-bold text-red-600">{{ summary.totalFailed }}</div>
            </div>
            <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div class="text-sm text-gray-500">Tỷ lệ thành công</div>
                <div class="text-2xl font-bold text-blue-600">{{ summary.successRate }}%</div>
            </div>
            <div class="bg-white rounded-lg shadow p-4 border-l-4" :style="{ borderColor: tokenColor }">
                <div class="text-sm text-gray-500">Token TXNG</div>
                <div class="text-lg font-semibold" :style="{ color: tokenColor }">{{ tokenLabel }}</div>
            </div>
        </div>

        <!-- Entity Breakdown -->
        <div class="bg-white rounded-lg shadow p-4" v-if="summary.entityBreakdown.length > 0">
            <h3 class="text-sm font-semibold text-gray-600 mb-3">Phân loại theo thực thể</h3>
            <div class="grid grid-cols-4 gap-2">
                <div v-for="item in summary.entityBreakdown" :key="item.entityType"
                    class="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                    <span class="text-xs text-gray-600">{{ entityTypeLabels[item.entityType] || item.entityType }}</span>
                    <div class="flex gap-2">
                        <span class="text-xs text-green-600 font-medium">✓{{ item.synced }}</span>
                        <span class="text-xs text-red-500 font-medium" v-if="item.failed > 0">✗{{ item.failed }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
