<template>
  <div class="top-scan-products">
    <h3 class="section-title"><span>🏆</span> Top sản phẩm theo lượt quét</h3>
    <div ref="chartRef" class="chart-area"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import * as echarts from 'echarts';
import api from '@/common/utils/api';

const props = defineProps<{ tenantId?: string; province?: string; ward?: string }>();

const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;
const topData = ref<{ productName: string; count: number }[]>([]);

const fetchData = async () => {
  try {
    const params: any = {};
    if (props.tenantId) params.tenantId = props.tenantId;
    if (props.province) params.province = props.province;
    if (props.ward) params.ward = props.ward;
    const res = await api.get('/api/gov/top-scan-products', { params });
    topData.value = res.data || [];
    await nextTick();
    renderChart();
  } catch (e) {
    console.error('TopScanProducts fetch error', e);
  }
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);
  const items = [...topData.value].reverse();

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const d = params[0];
        return `<b>${d.name}</b><br/>Lượt quét: <b>${d.value.toLocaleString()}</b>`;
      },
    },
    grid: { top: 10, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { fontSize: 11 },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
    },
    yAxis: {
      type: 'category',
      data: items.map(i => i.productName || 'N/A'),
      axisLabel: {
        fontSize: 11,
        formatter: (value: string) => {
          return value.length > 20 ? value.slice(0, 18) + '...' : value;
        }
      },
    },
    series: [{
      type: 'bar',
      data: items.map(i => i.count),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#0F2B46' },
          { offset: 1, color: '#00875A' },
        ]),
        borderRadius: [0, 4, 4, 0],
      },
      barWidth: '55%',
      label: {
        show: true,
        position: 'right',
        fontSize: 11,
        color: '#6b7280',
        formatter: '{c}',
      },
    }],
  });
};

const handleResize = () => {
  if (chart) chart.resize();
};

onMounted(() => {
  fetchData();
  window.addEventListener('resize', handleResize);
});

watch(() => [props.tenantId, props.province, props.ward], fetchData);

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (chart) {
    chart.dispose();
    chart = null;
  }
});
</script>

<style scoped>
.top-scan-products {
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
  height: 360px;
}
</style>
