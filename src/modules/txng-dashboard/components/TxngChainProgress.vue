<script setup lang="ts">
const props = defineProps<{
    chains: {
        maTruyVet: string;
        txngId: string;
        tenantId: string;
        completedSteps: number;
        totalSteps: number;
        status: string;
        steps: { name: string; entityType: string; status: string; lastSync: Date | null }[];
        createdAt: Date;
    }[];
}>();

const statusColor = (status: string) => {
    switch (status) {
        case 'CONFIRMED': case 'COMPLETE': return '#67C23A';
        case 'CREATED': case 'IN_PROGRESS': return '#E6A23C';
        case 'FAILED': case 'ERROR': return '#F56C6C';
        default: return '#DCDFE6';
    }
};

const statusIcon = (status: string) => {
    switch (status) {
        case 'CONFIRMED': return '✓';
        case 'CREATED': return '◷';
        case 'FAILED': return '✗';
        default: return '○';
    }
};

const chainStatusBadge = (status: string) => {
    switch (status) {
        case 'COMPLETE': return { text: 'Hoàn thành', type: 'success' as const };
        case 'ERROR': return { text: 'Có lỗi', type: 'danger' as const };
        default: return { text: 'Đang xử lý', type: 'warning' as const };
    }
};

const formatDate = (date: Date | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
    <div class="bg-white rounded-lg shadow p-4 mb-6">
        <h3 class="text-sm font-semibold text-gray-600 mb-4">Tiến trình chuỗi cung ứng (7 mắt xích)</h3>

        <div v-if="chains.length === 0" class="text-center text-gray-400 py-8">
            Chưa có chuỗi cung ứng nào được đồng bộ
        </div>

        <div v-for="chain in chains" :key="chain.maTruyVet" class="border rounded-lg p-4 mb-3 hover:bg-gray-50">
            <div class="flex justify-between items-center mb-3">
                <div>
                    <span class="text-sm font-medium text-gray-700">Mã truy vết: </span>
                    <span class="text-sm font-mono text-blue-600">{{ chain.maTruyVet || 'N/A' }}</span>
                </div>
                <el-tag :type="chainStatusBadge(chain.status).type" size="small">
                    {{ chainStatusBadge(chain.status).text }} ({{ chain.completedSteps }}/{{ chain.totalSteps }})
                </el-tag>
            </div>

            <!-- 7-Step Stepper -->
            <div class="flex items-center gap-1">
                <template v-for="(step, idx) in chain.steps" :key="step.entityType">
                    <div class="flex flex-col items-center flex-1 min-w-0">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            :style="{ backgroundColor: statusColor(step.status) }">
                            {{ statusIcon(step.status) }}
                        </div>
                        <div class="text-[10px] text-gray-500 mt-1 text-center truncate w-full">{{ step.name }}</div>
                        <div class="text-[9px] text-gray-400">{{ formatDate(step.lastSync) }}</div>
                    </div>
                    <div v-if="idx < chain.steps.length - 1"
                        class="h-0.5 flex-shrink-0 w-4"
                        :style="{ backgroundColor: step.status === 'CONFIRMED' ? '#67C23A' : '#DCDFE6' }">
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
