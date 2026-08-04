<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import * as echarts from 'echarts';

const props = defineProps<{
    data: { timestamps: string[]; success: number[]; failed: number[] };
    range: string;
}>();

const emit = defineEmits<{ (e: 'range-change', range: string): void }>();

const chartRef = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;

const renderChart = () => {
    if (!chartRef.value) return;
    if (!chart) {
        chart = echarts.init(chartRef.value);
    }

    const hours = props.data.timestamps.map(t => {
        const d = new Date(t);
        return `${d.getHours()}:00`;
    });

    chart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['Thành công', 'Thất bại'], top: 5 },
        grid: { left: 50, right: 20, bottom: 30, top: 40 },
        xAxis: { type: 'category', data: hours, boundaryGap: false },
        yAxis: { type: 'value', minInterval: 1 },
        series: [
            {
                name: 'Thành công',
                type: 'line',
                data: props.data.success,
                smooth: true,
                areaStyle: { opacity: 0.15 },
                lineStyle: { color: '#67C23A', width: 2 },
                itemStyle: { color: '#67C23A' },
            },
            {
                name: 'Thất bại',
                type: 'line',
                data: props.data.failed,
                smooth: true,
                areaStyle: { opacity: 0.15 },
                lineStyle: { color: '#F56C6C', width: 2 },
                itemStyle: { color: '#F56C6C' },
            },
        ],
    });
};

watch(() => props.data, renderChart, { deep: true });
onMounted(renderChart);
</script>

<template>
    <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex justify-between items-center mb-3">
            <h3 class="text-sm font-semibold text-gray-600">Biểu đồ đồng bộ theo thời gian</h3>
            <div class="flex gap-2">
                <el-button :type="range === '24h' ? 'primary' : 'default'" size="small" @click="emit('range-change', '24h')">24h</el-button>
                <el-button :type="range === '7d' ? 'primary' : 'default'" size="small" @click="emit('range-change', '7d')">7 ngày</el-button>
                <el-button :type="range === '30d' ? 'primary' : 'default'" size="small" @click="emit('range-change', '30d')">30 ngày</el-button>
            </div>
        </div>
        <div ref="chartRef" style="width: 100%; height: 250px;"></div>
    </div>
</template>
