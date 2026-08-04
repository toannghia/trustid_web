<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import TxngStatusHeader from '../components/TxngStatusHeader.vue';
import TxngSyncTimeline from '../components/TxngSyncTimeline.vue';
import TxngChainProgress from '../components/TxngChainProgress.vue';
import TxngSyncLogs from '../components/TxngSyncLogs.vue';
import TxngManualActions from '../components/TxngManualActions.vue';
import txngApi from '@/api/txngApi';
import { ElMessage } from 'element-plus';

const loading = ref(true);
const lastUpdated = ref(new Date());

const summary = ref({
    totalSynced: 0, totalFailed: 0, totalPending: 0,
    successRate: 100, lastSyncAt: null as Date | null,
    tokenStatus: 'EXPIRED',
    entityBreakdown: [] as { entityType: string; synced: number; failed: number }[],
});

const timeline = ref({ timestamps: [] as string[], success: [] as number[], failed: [] as number[] });
const chainStatus = ref({ chains: [] as any[] });
const timeRange = ref('24h');

const fetchData = async () => {
    try {
        const [summaryRes, timelineRes, chainRes] = await Promise.all([
            txngApi.getSummary(),
            txngApi.getTimeline(timeRange.value),
            txngApi.getChainStatus(),
        ]);

        summary.value = summaryRes.data;
        timeline.value = timelineRes.data;
        chainStatus.value = chainRes.data;
        lastUpdated.value = new Date();
    } catch (error) {
        console.error('Failed to fetch TXNG dashboard data', error);
        ElMessage.error('Không thể tải dữ liệu TXNG Dashboard');
    } finally {
        loading.value = false;
    }
};

const onTimeRangeChange = async (range: string) => {
    timeRange.value = range;
    const res = await txngApi.getTimeline(range);
    timeline.value = res.data;
};

const onActionCompleted = () => {
    fetchData();
};

let timer: any;
onMounted(() => {
    fetchData();
    timer = setInterval(fetchData, 30000);
});
onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<template>
    <div class="p-6 bg-gray-50 min-h-screen font-sans">
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">🏛️ TXNG Quốc gia — Giám sát đồng bộ</h1>
                <p class="text-sm text-gray-500 mt-1">Cổng Truy xuất Nguồn gốc Quốc gia (truyxuatnguongoc.gov.vn)</p>
            </div>
            <div class="text-sm text-gray-500">
                Cập nhật: {{ lastUpdated.toLocaleTimeString('vi-VN') }}
            </div>
        </div>

        <div v-loading="loading">
            <!-- 1. Status Header -->
            <TxngStatusHeader :summary="summary" />

            <!-- 2. Timeline Chart -->
            <TxngSyncTimeline
                :data="timeline"
                :range="timeRange"
                @range-change="onTimeRangeChange"
            />

            <!-- 3. Chain Progress -->
            <TxngChainProgress :chains="chainStatus.chains" />

            <!-- 4. Sync Logs -->
            <TxngSyncLogs @retry="onActionCompleted" />

            <!-- 5. Manual Actions -->
            <TxngManualActions @action-completed="onActionCompleted" />
        </div>
    </div>
</template>
