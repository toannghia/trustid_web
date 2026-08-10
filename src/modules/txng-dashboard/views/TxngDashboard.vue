<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import TxngQuickMenu from '../components/TxngQuickMenu.vue';
import TxngStatusHeader from '../components/TxngStatusHeader.vue';
import TxngSyncTimeline from '../components/TxngSyncTimeline.vue';
import TxngChainProgress from '../components/TxngChainProgress.vue';
import TxngSyncLogs from '../components/TxngSyncLogs.vue';
import TxngManualActions from '../components/TxngManualActions.vue';
import TxngProductSearch from '../components/TxngProductSearch.vue';
import TxngCatalogViewer from '../components/TxngCatalogViewer.vue';
import TxngVungTrongList from '../components/TxngVungTrongList.vue';
import TxngStageWizard from '../components/TxngStageWizard.vue';
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

// Dialog states
const showProductSearch = ref(false);
const showCatalogViewer = ref(false);
const showVungTrong = ref(false);
const showStageWizard = ref(false);

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

const handleQuickAction = async (action: string) => {
    switch (action) {
        case 'search-gtin':
            showProductSearch.value = true;
            break;
        case 'stage-wizard':
            showStageWizard.value = true;
            break;
        case 'catalogs':
            showCatalogViewer.value = true;
            break;
        case 'vung-trong':
            showVungTrong.value = true;
            break;
        case 'enterprise':
            // TODO: enterprise dialog
            ElMessage.info('Tính năng Doanh nghiệp đang phát triển');
            break;
        case 'locations':
            // TODO: locations dialog
            ElMessage.info('Tính năng Địa điểm SX đang phát triển');
            break;
        case 'sync-catalogs':
            try {
                await txngApi.syncCatalogs();
                ElMessage.success('Đồng bộ danh mục thành công');
                onActionCompleted();
            } catch {
                ElMessage.error('Đồng bộ danh mục thất bại');
            }
            break;
        case 'ping':
            try {
                const res = await txngApi.pingApi();
                const d = res.data;
                const ok = d.ssoReachable && d.apiReachable;
                ElMessage[ok ? 'success' : 'warning'](
                    `SSO: ${d.ssoReachable ? '✓' : '✗'} | API: ${d.apiReachable ? '✓' : '✗'} | ${d.latencyMs}ms`
                );
            } catch {
                ElMessage.error('Không thể kết nối');
            }
            break;
        case 'refresh-token':
            try {
                const res = await txngApi.refreshToken();
                ElMessage.success(`Token refreshed — status: ${res.data.status}`);
                onActionCompleted();
            } catch {
                ElMessage.error('Refresh token thất bại');
            }
            break;
    }
};

const ensureToken = async () => {
    try {
        const res = await txngApi.getTokenHealth();
        if (res.data?.status !== 'VALID') {
            await txngApi.refreshToken();
            ElMessage.success('TXNG Token đã được làm mới tự động');
        }
    } catch {
        try {
            await txngApi.refreshToken();
        } catch {
            ElMessage.warning('Không thể lấy token TXNG — một số chức năng có thể không hoạt động');
        }
    }
};

let timer: any;
onMounted(async () => {
    await ensureToken();
    fetchData();
    timer = setInterval(fetchData, 30000);
});
onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<template>
    <div class="p-6 bg-gray-50 min-h-screen font-sans">
        <div class="flex justify-between items-center mb-4">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">🏛️ TXNG Quốc gia — Giám sát đồng bộ</h1>
                <p class="text-sm text-gray-500 mt-1">Cổng Truy xuất Nguồn gốc Quốc gia (truyxuatnguongoc.gov.vn)</p>
            </div>
            <div class="text-sm text-gray-500">
                Cập nhật: {{ lastUpdated.toLocaleTimeString('vi-VN') }}
            </div>
        </div>

        <!-- 0. Quick Menu (TOP) -->
        <TxngQuickMenu @action="handleQuickAction" />

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

        <!-- Dialogs -->
        <TxngProductSearch v-model:visible="showProductSearch" />
        <TxngCatalogViewer v-model:visible="showCatalogViewer" />
        <TxngVungTrongList v-model:visible="showVungTrong" />
        <TxngStageWizard v-model:visible="showStageWizard" />
    </div>
</template>
