<template>
  <div class="blockchain-card">
    <div class="card-header">
      <div class="header-left">
        <span class="icon">⛓️</span>
        <h3>Báo cáo Blockchain</h3>
      </div>
      <el-tag size="small" type="success" effect="dark">Live</el-tag>
    </div>
    <div class="kpi-row">
      <div class="kpi-item">
        <div class="kpi-value text-cyan">{{ data.todayBlocks }}</div>
        <div class="kpi-label">Block hôm nay</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value text-yellow">{{ data.queuedCount }}</div>
        <div class="kpi-label">Chờ băm</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-value text-green">{{ data.stampedCount }}</div>
        <div class="kpi-label">Đã băm</div>
      </div>
    </div>
    <div ref="chartRef" class="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import api from '@/common/utils/api';

const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;

const data = ref({
  todayBlocks: 0,
  queuedCount: 0,
  stampedCount: 0,
  weekly: { days: [] as string[], confirmed: [] as number[], failed: [] as number[] },
});

const fetchData = async () => {
  try {
    const { data: res } = await api.get('/api/gov/blockchain-report');
    data.value = res;
    await nextTick();
    renderChart();
  } catch (e) {
    console.error('BlockchainReport fetch error', e);
  }
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);

  const w = data.value.weekly;
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { top: 30, right: 16, bottom: 24, left: 40 },
    xAxis: {
      type: 'category',
      data: w.days.map(d => d.slice(5)),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        name: 'Confirmed',
        type: 'line',
        smooth: true,
        data: w.confirmed,
        lineStyle: { color: '#22d3ee', width: 2 },
        itemStyle: { color: '#22d3ee' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(34,211,238,0.3)' },
          { offset: 1, color: 'rgba(34,211,238,0.02)' },
        ])},
      },
      {
        name: 'Failed',
        type: 'line',
        smooth: true,
        data: w.failed,
        lineStyle: { color: '#f87171', width: 2 },
        itemStyle: { color: '#f87171' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(248,113,113,0.2)' },
          { offset: 1, color: 'rgba(248,113,113,0.02)' },
        ])},
      },
    ],
  });
};

onMounted(fetchData);

watch(() => chartRef.value, () => {
  if (chartRef.value && data.value.weekly.days.length) renderChart();
});
</script>

<style scoped>
.blockchain-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 12px;
  padding: 20px 24px;
  color: #e2e8f0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.icon { font-size: 20px; }
.kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.kpi-item {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}
.kpi-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}
.kpi-label {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
.text-cyan { color: #22d3ee; }
.text-yellow { color: #facc15; }
.text-green { color: #4ade80; }
.chart-area {
  width: 100%;
  height: 200px;
}
</style>
