<template>
  <div class="production-diary">
    <h3 class="section-title">
      <span>📋</span> Báo cáo Nhật ký sản xuất
    </h3>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon bg-blue">🌾</div>
        <div class="kpi-body">
          <div class="kpi-value">{{ data.monitoredLocations }}</div>
          <div class="kpi-label">Vùng trồng giám sát</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon bg-green">📝</div>
        <div class="kpi-body">
          <div class="kpi-value">{{ data.cyclesWithLogs }}</div>
          <div class="kpi-label">Lô có nhật ký</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon bg-orange">📊</div>
        <div class="kpi-body">
          <div class="kpi-value">{{ data.completionRate }}%</div>
          <div class="kpi-label">Nhật ký đầy đủ</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon bg-purple-alt">🔄</div>
        <div class="kpi-body">
          <div class="kpi-value">{{ data.recentUpdates }}</div>
          <div class="kpi-label">Cập nhật 7 ngày</div>
        </div>
      </div>
    </div>
    <div ref="chartRef" class="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import api from '@/common/utils/api';

const props = defineProps<{ province?: string }>();
const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;

const data = ref({
  monitoredLocations: 0,
  cyclesWithLogs: 0,
  completionRate: 0,
  recentUpdates: 0,
  weeklyChart: [] as { week: string; count: number }[],
});

const fetchData = async () => {
  try {
    const params: any = {};
    if (props.province) params.province = props.province;
    const { data: res } = await api.get('/api/gov/production-diary', { params });
    data.value = res;
    await nextTick();
    renderChart();
  } catch (e) {
    console.error('ProductionDiary fetch error', e);
  }
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);

  const weeks = data.value.weeklyChart;
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { top: 20, right: 16, bottom: 24, left: 46 },
    xAxis: {
      type: 'category',
      data: weeks.map(w => 'W' + w.week.split('-')[1]),
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    series: [{
      type: 'line',
      smooth: true,
      data: weeks.map(w => w.count),
      lineStyle: { color: '#3b82f6', width: 2.5 },
      itemStyle: { color: '#3b82f6' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(59,130,246,0.2)' },
        { offset: 1, color: 'rgba(59,130,246,0.02)' },
      ])},
    }],
  });
};

onMounted(fetchData);
watch(() => props.province, fetchData);
</script>

<style scoped>
.production-diary {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
@media (min-width: 768px) {
  .kpi-grid { grid-template-columns: repeat(4, 1fr); }
}
.kpi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
}
.kpi-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.bg-blue { background: #dbeafe; }
.bg-green { background: #dcfce7; }
.bg-orange { background: #ffedd5; }
.bg-purple-alt { background: #e0e7ff; }
.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}
.kpi-label {
  font-size: 12px;
  color: #6b7280;
}
.chart-area {
  width: 100%;
  height: 200px;
}
</style>
