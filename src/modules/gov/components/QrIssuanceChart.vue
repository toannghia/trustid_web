<template>
  <div class="qr-issuance">
    <h3 class="section-title"><span>📈</span> QR phát hành &amp; kích hoạt</h3>
    <div ref="chartRef" class="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import api from '@/common/utils/api';

const props = defineProps<{ province?: string; ward?: string }>();
const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;
const qrData = ref<{ month: number; total: number; activated: number }[]>([]);
const monthLabels = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

const fetchData = async () => {
  try {
    const params: any = {};
    if (props.province) params.province = props.province;
    if (props.ward) params.ward = props.ward;
    const res = await api.get('/api/gov/qr-monthly', { params });
    qrData.value = res.data.months || [];
    await nextTick();
    renderChart();
  } catch (e) {
    console.error('QrIssuance fetch error', e);
  }
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);
  const months = qrData.value;
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['Phát hành', 'Kích hoạt'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 20, right: 10, bottom: 30, left: 40 },
    xAxis: { type: 'category', data: months.map(m => monthLabels[m.month - 1]), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
    series: [
      { name: 'Phát hành', type: 'bar', data: months.map(m => m.total), itemStyle: { color: '#0F2B46', borderRadius: [4,4,0,0] }, barGap: '20%' },
      { name: 'Kích hoạt', type: 'bar', data: months.map(m => m.activated), itemStyle: { color: '#00875A', borderRadius: [4,4,0,0] } },
    ],
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

watch(() => [props.province, props.ward], fetchData);
</script>

<style scoped>
.qr-issuance {
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
