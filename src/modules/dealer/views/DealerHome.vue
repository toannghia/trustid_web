<template>
  <div class="dealer-home p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Tổng quan Đại lý</h2>
      <el-button type="primary" @click="loadAllData" :loading="loading">
        <el-icon class="mr-1"><Refresh /></el-icon>Cập nhật
      </el-button>
    </div>

    <!-- STAT CARDS -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <el-card class="box-card" shadow="hover">
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-500 text-sm font-medium">Doanh thu hôm nay</span>
          <el-icon class="text-blue-500 bg-blue-50 p-1.5 rounded-lg" :size="20"><Money /></el-icon>
        </div>
        <div class="text-2xl font-bold text-gray-800">{{ formatCurrency(stats.todayRevenue) }}</div>
      </el-card>

      <el-card class="box-card" shadow="hover">
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-500 text-sm font-medium">Doanh thu tháng này</span>
          <el-icon class="text-green-500 bg-green-50 p-1.5 rounded-lg" :size="20"><TrendCharts /></el-icon>
        </div>
        <div class="text-2xl font-bold text-gray-800">{{ formatCurrency(stats.monthRevenue) }}</div>
      </el-card>

      <el-card class="box-card" shadow="hover">
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-500 text-sm font-medium">Tổng tồn kho</span>
          <el-icon class="text-orange-500 bg-orange-50 p-1.5 rounded-lg" :size="20"><Box /></el-icon>
        </div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.currentStock || 0 }} <span class="text-sm font-normal text-gray-500">sp</span></div>
        <div class="text-xs text-red-500 mt-1" v-if="stats.lowStockCount > 0">
          <el-icon><Warning /></el-icon> {{ stats.lowStockCount }} mã sắp hết
        </div>
      </el-card>

      <el-card class="box-card cursor-pointer" shadow="hover" @click="$router.push('/dealer/receive')">
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-500 text-sm font-medium">Đơn chờ nhận</span>
          <el-icon class="text-purple-500 bg-purple-50 p-1.5 rounded-lg" :size="20"><Van /></el-icon>
        </div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.pendingShipments || 0 }}</div>
      </el-card>
    </div>

    <!-- MAIN CONTENT GRID -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- LEFT COLUMN: Charts & Top products -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- BIỂU ĐỒ DOANH THU -->
        <el-card shadow="never" class="border rounded-xl">
          <template #header>
            <div class="flex justify-between items-center">
              <span class="font-bold text-gray-800">Biểu đồ doanh thu</span>
              <el-radio-group v-model="chartPeriod" size="small" @change="loadChartData">
                <el-radio-button label="7d">7 Ngày</el-radio-button>
                <el-radio-button label="30d">30 Ngày</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          
          <div class="h-64 relative w-full pt-4">
            <!-- Simple CSS Bar chart for universal compatibility -->
            <div v-if="!loadingChart && chartData.length > 0" class="flex items-end justify-between h-full w-full px-2 pb-6 border-b border-gray-200">
              <div v-for="(item, idx) in chartData" :key="idx" class="flex flex-col items-center justify-end w-full group relative">
                <!-- Tooltip -->
                <div class="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-gray-800 text-white text-xs py-1 px-2 rounded-md whitespace-nowrap pointer-events-none transition-opacity z-10">
                  {{ formatDate(item.date) }}: <br/><b>{{ formatCurrency(item.revenue) }}</b>
                </div>
                <!-- Bar -->
                <div class="bg-blue-500 hover:bg-blue-600 rounded-t-sm w-4/5 transition-all duration-300" :style="{ height: getBarHeight(item.revenue) + '%' }"></div>
                <!-- Label -->
                <span class="text-[10px] text-gray-500 mt-2 absolute -bottom-5" v-if="chartData.length <= 14 || idx % 3 === 0">
                  {{ formatShortDate(item.date) }}
                </span>
              </div>
            </div>
            <el-empty v-else-if="!loadingChart" description="Chưa có dữ liệu giao dịch" :image-size="60" />
            <div v-else class="h-full w-full flex items-center justify-center text-gray-400">Đang tải...</div>
          </div>
        </el-card>

        <!-- TOP SẢN PHẨM BÁN CHẠY -->
        <el-card shadow="never" class="border rounded-xl">
          <template #header>
            <span class="font-bold text-gray-800">Top Sản phẩm Bán chạy</span>
          </template>
          <el-table :data="topProducts" style="width: 100%" v-loading="loadingTop">
            <el-table-column type="index" width="50" />
            <el-table-column prop="name" label="Sản phẩm" />
            <el-table-column prop="qty" label="Đã bán" width="100" align="center">
              <template #default="{row}">
                <el-tag type="success" size="small">{{ row.qty }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="revenue" label="Doanh thu" width="150" align="right">
              <template #default="{row}">
                {{ formatCurrency(row.revenue) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>

      </div>

      <!-- RIGHT COLUMN: Activity Timeline -->
      <div class="space-y-6">
        <el-card shadow="never" class="border rounded-xl h-full">
          <template #header>
            <span class="font-bold text-gray-800">Hoạt động Gần đây</span>
          </template>
          
          <div v-if="activities.length > 0" class="pr-2">
            <el-timeline>
              <el-timeline-item
                v-for="activity in activities"
                :key="activity.id"
                :timestamp="formatDateTime(activity.time)"
                placement="top"
                :type="activity.type === 'SALE' ? 'success' : 'primary'"
              >
                <div class="text-sm text-gray-800">{{ activity.description }}</div>
                <div class="text-xs text-green-600 font-bold mt-1" v-if="activity.amount > 0">
                  + {{ formatCurrency(activity.amount) }}
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
          <el-empty v-else description="Chưa có hoạt động" :image-size="80" />
        </el-card>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Box, ShoppingCart, Money, TrendCharts, Van, Warning, Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '@/common/utils/api';

const loading = ref(false);
const loadingChart = ref(false);
const loadingTop = ref(false);

const stats = ref({
  currentStock: 0,
  totalSales: 0,
  todayRevenue: 0,
  monthRevenue: 0,
  pendingShipments: 0,
  lowStockCount: 0
});

const chartPeriod = ref('7d');
const chartData = ref<any[]>([]);
const maxRevenue = ref(1);

const topProducts = ref<any[]>([]);
const activities = ref<any[]>([]);

const formatCurrency = (val: number | string) => {
  if (!val) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
};

const getBarHeight = (val: number) => {
  if (maxRevenue.value <= 0 || !val) return 2; // minimum height 2%
  const pct = (val / maxRevenue.value) * 100;
  return Math.max(pct, 2); 
};

// Data Loaders
const loadStats = async () => {
  try {
    const { data } = await api.get('/dealer-dashboard/stats');
    stats.value = data;
  } catch (error: any) {
    console.error('Error loading stats:', error);
  }
};

const loadChartData = async () => {
  loadingChart.value = true;
  try {
    const { data } = await api.get(`/dealer-dashboard/revenue-chart?period=${chartPeriod.value}`);
    chartData.value = data;
    const maxVal = Math.max(...data.map((d: any) => parseFloat(d.revenue)));
    maxRevenue.value = maxVal > 0 ? maxVal * 1.1 : 1; // plus 10% headroom
  } catch (error: any) {
    console.error('Error loading chart:', error);
  } finally {
    loadingChart.value = false;
  }
};

const loadTopProducts = async () => {
  loadingTop.value = true;
  try {
    const { data } = await api.get('/dealer-dashboard/top-products');
    topProducts.value = data;
  } catch (error: any) {
    console.error('Error loading top products:', error);
  } finally {
    loadingTop.value = false;
  }
};

const loadActivities = async () => {
  try {
    const { data } = await api.get('/dealer-dashboard/recent-activity');
    activities.value = data;
  } catch (error: any) {
    console.error('Error loading activities:', error);
  }
};

const loadAllData = async () => {
  loading.value = true;
  await Promise.all([
    loadStats(),
    loadChartData(),
    loadTopProducts(),
    loadActivities()
  ]);
  loading.value = false;
};

onMounted(() => {
  loadAllData();
});
</script>

<style scoped>
.box-card {
  border-radius: 12px;
  border: none;
  background: white;
}
.box-card:hover {
  transform: translateY(-2px);
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px -10px rgba(0,0,0,0.1);
}
</style>
