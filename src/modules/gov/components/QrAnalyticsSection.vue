<template>
  <div class="qr-analytics">
    <h3 class="section-title"><span>📈</span> QR phát hành &amp; Top tỉnh quét</h3>
    <div class="charts-row">
      <div class="chart-half">
        <div ref="qrChartRef" class="chart-area"></div>
      </div>
      <div class="chart-half">
        <div ref="topChartRef" class="chart-area"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import api from '@/common/utils/api';

const props = defineProps<{ province?: string }>();
const qrChartRef = ref<HTMLElement>();
const topChartRef = ref<HTMLElement>();
let qrChart: echarts.ECharts | null = null;
let topChart: echarts.ECharts | null = null;

const qrData = ref<{ month: number; total: number; activated: number }[]>([]);
const topData = ref<{ province: string; count: number }[]>([]);

const monthLabels = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

const fetchData = async () => {
  try {
    const params: any = {};
    if (props.province) params.province = props.province;
    const [qrRes, topRes] = await Promise.all([
      api.get('/api/gov/qr-monthly', { params }),
      api.get('/api/gov/top-scan-provinces', { params }),
    ]);
    qrData.value = qrRes.data.months || [];
    topData.value = topRes.data || [];
    await nextTick();
    renderQrChart();
    renderTopChart();
  } catch (e) { console.error(e); }
};

const renderQrChart = () => {
  if (!qrChartRef.value) return;
  if (!qrChart) qrChart = echarts.init(qrChartRef.value);
  const months = qrData.value;
  qrChart.setOption({
    title: { text: 'QR phát hành theo tháng', textStyle: { fontSize: 13, color: '#6b7280' }, left: 0, top: 0 },
    tooltip: { trigger: 'axis' },
    legend: { data: ['Phát hành', 'Kích hoạt'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { top: 30, right: 10, bottom: 30, left: 40 },
    xAxis: { type: 'category', data: months.map(m => monthLabels[m.month - 1]), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
    series: [
      { name: 'Phát hành', type: 'bar', data: months.map(m => m.total), itemStyle: { color: '#6366f1', borderRadius: [4,4,0,0] }, barGap: '20%' },
      { name: 'Kích hoạt', type: 'bar', data: months.map(m => m.activated), itemStyle: { color: '#10b981', borderRadius: [4,4,0,0] } },
    ],
  });
};

const renderTopChart = () => {
  if (!topChartRef.value) return;
  if (!topChart) topChart = echarts.init(topChartRef.value);
  const items = [...topData.value].reverse();
  topChart.setOption({
    title: { text: 'Top tỉnh lượt quét', textStyle: { fontSize: 13, color: '#6b7280' }, left: 0, top: 0 },
    tooltip: { trigger: 'axis' },
    grid: { top: 30, right: 16, bottom: 8, left: 100 },
    xAxis: { type: 'value', axisLabel: { fontSize: 11 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
    yAxis: { type: 'category', data: items.map(i => i.province || 'N/A'), axisLabel: { fontSize: 11 } },
    series: [{ type: 'bar', data: items.map(i => i.count), itemStyle: { color: '#f59e0b', borderRadius: [0,4,4,0] }, barWidth: '50%' }],
  });
};

onMounted(fetchData);
watch(() => props.province, fetchData);
</script>

<style scoped>
.qr-analytics { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.section-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px; }
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 768px) { .charts-row { grid-template-columns: 1fr; } }
.chart-area { width: 100%; height: 240px; }
</style>
