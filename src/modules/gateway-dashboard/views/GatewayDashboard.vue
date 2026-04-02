<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import DashboardHeader from '../components/DashboardHeader.vue';
import TrafficChart from '../components/TrafficChart.vue';
import DashboardTables from '../components/DashboardTables.vue';
import RequestsList from '../components/RequestsList.vue';
import gatewayApi from '@/api/gatewayApi';
import { ElMessage } from 'element-plus';

// --- State ---
const loading = ref(true);
const lastUpdated = ref(new Date());

const queueStatus = ref({ waiting: 0, active: 0, completed: 0 });
const connectionStatus = ref({ nda_api: 'UNKNOWN', redis: 'UNKNOWN' });
const metrics = ref({ error_rate: 0 });
const todayMetrics = ref({ total_requests: 0, completed: 0, failed: 0, success_rate: 100, avg_response_time: 0 });
const systemHealth = ref({ redis_memory_usage: 'N/A', node_memory_usage: 'N/A', uptime_human: 'N/A' });

const chartData = ref({
  hours: [] as string[],
  success: [] as number[],
  pending: [] as number[],
  error: [] as number[]
});

const topTenants = ref([]);
const topErrors = ref([]);

// --- API Calls ---
const fetchData = async () => {
  try {
    // 1. Summary, Connections, Top Tenants, Timeseries (Parallel)
    const [summaryRes, connRes, topTenantsRes, timeseriesRes, logsRes] = await Promise.all([
      gatewayApi.get('/stats/summary'),
      gatewayApi.get('/connections'),
      gatewayApi.get('/stats/top-tenants'),
      gatewayApi.get('/stats/timeseries?range=24h'),
      gatewayApi.get('/logs?limit=100') // Lấy 100 logs gần nhất để phân tích lỗi
    ]);

    // Update Header Data
    queueStatus.value = summaryRes.data.queue_status || { waiting: 0, active: 0, completed: 0 };
    
    // Update today_metrics
    if (summaryRes.data.today_metrics) {
      const tm = summaryRes.data.today_metrics;
      todayMetrics.value = {
        total_requests: tm.total_requests || 0,
        completed: tm.completed || 0,
        failed: tm.failed || 0,
        success_rate: tm.success_rate || 100,
        avg_response_time: tm.avg_response_time || 0
      };
      // Calculate Error Rate
      const total = tm.total_requests || 0;
      const failed = tm.failed || 0;
      metrics.value.error_rate = total > 0 ? parseFloat(((failed / total) * 100).toFixed(1)) : 0;
    }

    // Update system_health
    if (summaryRes.data.system_health) {
      systemHealth.value = summaryRes.data.system_health;
    }

    connectionStatus.value = connRes.data.connections || { nda_api: 'UNKNOWN', redis: 'UNKNOWN' };
    
    // Update Top Tenants
    topTenants.value = topTenantsRes.data || [];

    // Process Timeseries Data for Chart
    const timeseriesData = timeseriesRes.data || [];
    if (timeseriesData.length > 0) {
      chartData.value = {
        hours: timeseriesData.map((d: any) => {
          const date = new Date(d.timestamp);
          return `${date.getHours()}h`;
        }),
        success: timeseriesData.map((d: any) => d.completed || 0),
        pending: timeseriesData.map((d: any) => (d.incoming || 0) - (d.completed || 0) - (d.errors || 0)),
        error: timeseriesData.map((d: any) => d.errors || 0)
      };
    }

    // Process Top Errors from Logs
    const logs = logsRes.data?.data || [];
    const errorCounts: Record<string, { message: string; count: number }> = {};
    
    logs.forEach((log: any) => {
      if (log.status?.startsWith('FAILED') && log.error) {
        // Extract error code from error message (e.g., "E54: Invalid GTIN")
        const match = log.error.match(/^(E\d+|[A-Z_]+)/);
        const code = match ? match[1] : 'UNKNOWN';
        if (!errorCounts[code]) {
          errorCounts[code] = { message: log.error.substring(0, 50), count: 0 };
        }
        errorCounts[code].count++;
      }
    });

    const totalErrors = Object.values(errorCounts).reduce((sum, e) => sum + e.count, 0);
    topErrors.value = Object.entries(errorCounts)
      .map(([code, data]) => ({
        code,
        message: data.message,
        count: data.count,
        rate: totalErrors > 0 ? `${((data.count / totalErrors) * 100).toFixed(1)}%` : '0%'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) as any;

    lastUpdated.value = new Date();
  } catch (error) {
    console.error('Failed to fetch dashboard data', error);
    ElMessage.error('Không thể tải dữ liệu Dashboard. Kiểm tra kết nối Gateway.');
  } finally {
    loading.value = false;
  }
};

let timer: any;
onMounted(() => {
  fetchData();
  // Auto refresh every 30s
  timer = setInterval(fetchData, 30000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="p-6 bg-gray-50 min-h-screen font-sans">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Gateway Monitor</h1>
      <div class="text-sm text-gray-500">
        Cập nhật lần cuối: {{ lastUpdated.toLocaleTimeString() }}
      </div>
    </div>

    <div v-loading="loading">
      <!-- 1. Phòng cấp cứu -->
      <DashboardHeader 
        :queueStatus="queueStatus"
        :connectionStatus="connectionStatus"
        :metrics="metrics"
        :todayMetrics="todayMetrics"
        :systemHealth="systemHealth"
      />

      <!-- 2. Dòng chảy dữ liệu -->
      <TrafficChart :data="chartData" />

      <!-- 3. Danh sách lệnh -->
      <RequestsList />

      <!-- 4. Bảng phong thần -->
      <DashboardTables 
        :topTenants="topTenants"
        :topErrors="topErrors"
      />
    </div>
  </div>
</template>
