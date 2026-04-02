<script setup lang="ts">
import { computed } from 'vue';
import { Connection, Warning, List, Timer, Odometer, Cpu, Check, TrendCharts } from '@element-plus/icons-vue';

interface Props {
  queueStatus: {
    waiting: number;
    active: number;
    completed: number;
    failed?: number;
  };
  connectionStatus: {
    nda_api: string;
    redis: string;
    postgres?: string;
  };
  metrics: {
    error_rate: number;
  };
  todayMetrics?: {
    total_requests: number;
    completed: number;
    failed: number;
    success_rate: number;
    avg_response_time: number;
  };
  systemHealth?: {
    redis_memory_usage: string;
    node_memory_usage: string;
    uptime_human: string;
  };
}

const props = defineProps<Props>();

const totalBacklog = computed(() => props.queueStatus.waiting + props.queueStatus.active);

// Queue Color Logic
const queueColor = computed(() => {
  if (totalBacklog.value > 1000) return 'bg-red-500';
  if (totalBacklog.value > 500) return 'bg-yellow-500';
  return 'bg-blue-500';
});

// Connection Status
const isLive = computed(() => props.connectionStatus.nda_api === 'CONNECTED');

// Error Rate Alert (> 5%)
const isErrorAlarm = computed(() => props.metrics.error_rate > 5);

// Tính tỷ lệ thành công đúng cách (không fallback về 100 nếu API trả 0)
const successRate = computed(() => {
  if (props.todayMetrics?.success_rate !== undefined) {
    return props.todayMetrics.success_rate;
  }
  // Fallback: Nếu không có dữ liệu, tính từ completed/total
  const total = props.todayMetrics?.total_requests || 0;
  const completed = props.todayMetrics?.completed || 0;
  return total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0;
});
</script>

<template>
  <div class="space-y-4 mb-6">
    <!-- Row 1: 6 thẻ nhỏ gọn trên 1 hàng -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      
      <!-- 1. Queue Backlog -->
      <div class="bg-white rounded-lg shadow-sm p-3 border-l-4" 
           :class="totalBacklog > 1000 ? 'border-red-500' : (totalBacklog > 500 ? 'border-yellow-500' : 'border-blue-500')">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] text-gray-400 uppercase font-semibold">Queue</p>
            <h3 class="text-xl font-bold">{{ totalBacklog }}</h3>
          </div>
          <div :class="`p-2 rounded-full ${queueColor} text-white`">
            <el-icon :size="16"><List /></el-icon>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">W: {{ props.queueStatus.waiting }} | A: {{ props.queueStatus.active }}</p>
      </div>

      <!-- 2. NDA Connection -->
      <div class="bg-white rounded-lg shadow-sm p-3 border-l-4"
           :class="isLive ? 'border-green-500' : 'border-red-500'">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] text-gray-400 uppercase font-semibold">NDA</p>
            <h3 class="text-xl font-bold" :class="isLive ? 'text-green-600' : 'text-red-600'">{{ isLive ? 'LIVE' : 'DOWN' }}</h3>
          </div>
          <div class="p-2 rounded-full text-white" :class="isLive ? 'bg-green-500' : 'bg-red-500'">
            <el-icon :size="16"><Connection /></el-icon>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">Redis: {{ props.connectionStatus.redis }}</p>
      </div>

      <!-- 3. Total Requests -->
      <div class="bg-white rounded-lg shadow-sm p-3 border-l-4 border-indigo-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] text-gray-400 uppercase font-semibold">Requests</p>
            <h3 class="text-xl font-bold text-indigo-600">{{ props.todayMetrics?.total_requests ?? 0 }}</h3>
          </div>
          <div class="p-2 rounded-full bg-indigo-100 text-indigo-500">
            <el-icon :size="16"><Odometer /></el-icon>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">✅{{ props.todayMetrics?.completed ?? 0 }} ❌{{ props.todayMetrics?.failed ?? 0 }}</p>
      </div>

      <!-- 4. Success Rate -->
      <div class="bg-white rounded-lg shadow-sm p-3 border-l-4 border-teal-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] text-gray-400 uppercase font-semibold">Thành công</p>
            <h3 class="text-xl font-bold text-teal-600">{{ successRate }}%</h3>
          </div>
          <div class="p-2 rounded-full bg-teal-100 text-teal-500">
            <el-icon :size="16"><Check /></el-icon>
          </div>
        </div>
      </div>

      <!-- 5. Avg Response Time -->
      <div class="bg-white rounded-lg shadow-sm p-3 border-l-4 border-amber-500">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] text-gray-400 uppercase font-semibold">Phản hồi</p>
            <h3 class="text-xl font-bold text-amber-600">{{ props.todayMetrics?.avg_response_time ?? 0 }}<small class="text-sm">ms</small></h3>
          </div>
          <div class="p-2 rounded-full bg-amber-100 text-amber-500">
            <el-icon :size="16"><Timer /></el-icon>
          </div>
        </div>
      </div>

      <!-- 6. Error Rate -->
      <div class="bg-white rounded-lg shadow-sm p-3 border-l-4"
           :class="isErrorAlarm ? 'border-red-600' : 'border-gray-300'">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] text-gray-400 uppercase font-semibold">Lỗi</p>
            <h3 class="text-xl font-bold" :class="isErrorAlarm ? 'text-red-600' : 'text-gray-700'">{{ props.metrics.error_rate }}%</h3>
          </div>
          <div class="p-2 rounded-full" :class="isErrorAlarm ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400'">
            <el-icon :size="16"><Warning /></el-icon>
          </div>
        </div>
        <p class="text-[10px] mt-1" :class="isErrorAlarm ? 'text-red-500 font-bold' : 'text-gray-400'">
          {{ isErrorAlarm ? 'CẢNH BÁO!' : 'Bình thường' }}
        </p>
      </div>

    </div>

    <!-- Row 2: System Health (nhỏ gọn) -->
    <div class="flex items-center gap-4 text-xs text-gray-500 bg-white rounded-lg shadow-sm px-4 py-2">
      <div class="flex items-center gap-1">
        <el-icon :size="14" class="text-gray-400"><Cpu /></el-icon>
        <span>Uptime: <b class="text-gray-700">{{ props.systemHealth?.uptime_human || 'N/A' }}</b></span>
      </div>
      <div class="border-l border-gray-200 h-4"></div>
      <div>RAM: <b class="text-gray-700">{{ props.systemHealth?.node_memory_usage || 'N/A' }}</b></div>
      <div class="border-l border-gray-200 h-4"></div>
      <div>Redis: <b class="text-gray-700">{{ props.systemHealth?.redis_memory_usage || 'N/A' }}</b></div>
    </div>

  </div>
</template>
