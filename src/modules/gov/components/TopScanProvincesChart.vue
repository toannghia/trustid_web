<template>
  <div class="top-scan-provinces">
    <h3 class="section-title"><span>📊</span> Top tỉnh theo lượt quét</h3>
    <div ref="chartRef" class="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import api from '@/common/utils/api';

const props = defineProps<{ province?: string }>();
const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;
const topData = ref<{ province: string; count: number }[]>([]);

const fetchData = async () => {
  try {
    const params: any = {};
    if (props.province) params.province = props.province;
    const res = await api.get('/api/gov/top-scan-provinces', { params });
    topData.value = res.data || [];
    await nextTick();
    renderChart();
  } catch (e) {
    console.error('TopScanProvinces fetch error', e);
  }
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);
  const items = [...topData.value].reverse();
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 16, bottom: 10, left: 90 },
    xAxis: { type: 'value', axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
    yAxis: { type: 'category', data: items.map(i => i.province || 'N/A'), axisLabel: { fontSize: 11 } },
    series: [{ type: 'bar', data: items.map(i => i.count), itemStyle: { color: '#f59e0b', borderRadius: [0,4,4,0] }, barWidth: '55%' }],
  });
};

const handleResize = () => {
  if (chart) chart.resize();
};

onMounted(() => {
  fetchData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (chart) {
    chart.dispose();
    chart = null;
  }
});

watch(() => props.province, fetchData);
</script>

<style scoped>
.top-scan-provinces {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.chart-area {
  width: 100%;
  height: 220px;
}
</style>
