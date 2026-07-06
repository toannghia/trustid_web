<template>
  <div class="seasonal-harvest">
    <div class="harvest-header">
      <h3 class="section-title"><span>🌾</span> Sản lượng theo mùa vụ</h3>
      <el-date-picker v-model="selectedYear" type="year" placeholder="Năm" size="small" format="YYYY" value-format="YYYY" @change="fetchData" style="width:110px" />
    </div>
    <div ref="chartRef" class="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import api from '@/common/utils/api';

const props = defineProps<{ province?: string; tenantId?: string }>();
const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;
const selectedYear = ref(String(new Date().getFullYear()));
const seasons = ref<Record<string, number>>({});

const fetchData = async () => {
  try {
    const params: any = { year: selectedYear.value };
    if (props.province) params.province = props.province;
    if (props.tenantId) params.tenantId = props.tenantId;
    const { data: res } = await api.get('/api/gov/seasonal-harvest', { params });
    seasons.value = res.seasons;
    await nextTick();
    renderChart();
  } catch (e) { console.error(e); }
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);
  const names = Object.keys(seasons.value);
  const values = Object.values(seasons.value);
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { top: 20, right: 16, bottom: 28, left: 56 },
    xAxis: { type: 'category', data: names, axisLabel: { color: '#6b7280' } },
    yAxis: { type: 'value', name: 'kg', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#6b7280', formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(0)+'T' : String(v) } },
    series: [{ type: 'bar', barWidth: '40%', data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [6,6,0,0] } })) }],
  });
};

onMounted(fetchData);
watch(() => [props.province, props.tenantId], fetchData);
</script>

<style scoped>
.seasonal-harvest { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.harvest-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; display: flex; align-items: center; gap: 8px; }
.chart-area { width: 100%; height: 220px; }
</style>
