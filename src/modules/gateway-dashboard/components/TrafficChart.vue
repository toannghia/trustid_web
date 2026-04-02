<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as echarts from 'echarts';

interface ChartData {
  hours: string[];
  success: number[];
  pending: number[];
  error: number[];
}

const props = defineProps<{ data: ChartData }>();

const chartRef = ref<HTMLElement | null>(null);
let myChart: echarts.ECharts | null = null;

const initChart = () => {
  if (!chartRef.value) return;
  
  myChart = echarts.init(chartRef.value);
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['Thành công', 'Đang chờ', 'Lỗi'],
      bottom: 0,          // Di chuyển legend xuống dưới cùng
      left: 'center',     // Căn giữa
      itemGap: 30,        // Khoảng cách giữa các item
      textStyle: {
        fontSize: 13,
        color: '#333'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '5%',          // Thêm khoảng trống phía trên
      bottom: '15%',      // Tăng khoảng trống phía dưới cho legend
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: props.data.hours
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Thành công',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: props.data.success,
        itemStyle: { color: '#28a745' } // Green
      },
      {
        name: 'Đang chờ',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: props.data.pending,
        itemStyle: { color: '#ffc107' } // Yellow
      },
      {
        name: 'Lỗi',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: props.data.error,
        itemStyle: { color: '#dc3545' } // Red
      }
    ]
  };

  myChart.setOption(option);
};

// Re-render when data changes
watch(() => props.data, () => {
  if (myChart) {
    myChart.setOption({
      xAxis: { data: props.data.hours },
      series: [
        { data: props.data.success },
        { data: props.data.pending },
        { data: props.data.error }
      ]
    });
  }
}, { deep: true });

onMounted(() => {
  initChart();
  window.addEventListener('resize', () => myChart?.resize());
});
</script>

<template>
  <div class="bg-white p-4 rounded-lg shadow-md mb-6">
    <h3 class="text-lg font-bold mb-4 text-gray-700">Dòng chảy dữ liệu (24h qua)</h3>
    <div ref="chartRef" class="w-full h-[400px]"></div>
  </div>
</template>
