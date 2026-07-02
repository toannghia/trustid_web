<template>
  <div class="weekly-scan">
    <div class="scan-header">
      <h3 class="section-title"><span>📱</span> Lượt quét theo tuần</h3>
      <div class="week-nav">
        <el-button size="small" @click="changeWeek(1)" :icon="ArrowLeft" circle />
        <span class="week-label">{{ weekLabel }}</span>
        <el-button size="small" @click="changeWeek(-1)" :disabled="weekOffset <= 0" :icon="ArrowRight" circle />
      </div>
    </div>
    <div ref="chartRef" class="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import api from '@/common/utils/api';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';

const props = defineProps<{ province?: string }>();
const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;
const weekOffset = ref(0);

const weekStart = ref('');
const weekEnd = ref('');
const scanData = ref<{ label: string; count: number }[]>([]);

const weekLabel = computed(() => {
  if (!weekStart.value) return 'Tuần này';
  return weekOffset.value === 0 ? 'Tuần này' : `${weekStart.value} → ${weekEnd.value}`;
});

const changeWeek = (delta: number) => {
  weekOffset.value += delta;
  fetchData();
};

const fetchData = async () => {
  try {
    const params: any = { weekOffset: weekOffset.value };
    if (props.province) params.province = props.province;
    const { data: res } = await api.get('/api/gov/weekly-scans', { params });
    weekStart.value = res.weekStart;
    weekEnd.value = res.weekEnd;
    scanData.value = res.data;
    await nextTick();
    renderChart();
  } catch (e) {
    console.error('WeeklyScan fetch error', e);
  }
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);

  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { top: 20, right: 16, bottom: 24, left: 46 },
    xAxis: {
      type: 'category',
      data: scanData.value.map(d => d.label),
      axisLabel: { color: '#6b7280', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    series: [{
      type: 'line',
      smooth: true,
      data: scanData.value.map(d => d.count),
      lineStyle: { color: '#6366f1', width: 2.5 },
      itemStyle: { color: '#6366f1' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(99,102,241,0.25)' },
        { offset: 1, color: 'rgba(99,102,241,0.02)' },
      ])},
      symbol: 'circle',
      symbolSize: 6,
    }],
  });
};

onMounted(fetchData);
watch(() => props.province, () => { weekOffset.value = 0; fetchData(); });
</script>

<style scoped>
.weekly-scan {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.scan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.week-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.week-label {
  font-size: 13px;
  color: #6b7280;
  min-width: 100px;
  text-align: center;
}
.chart-area {
  width: 100%;
  height: 220px;
}
</style>
