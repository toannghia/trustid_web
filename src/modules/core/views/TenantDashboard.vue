<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tổng quan Doanh nghiệp</h1>
        <p class="text-sm text-gray-500">Xin chào, {{ user?.fullName }}</p>
      </div>
      <el-button type="primary" @click="refreshData" :loading="loading" class="font-semibold shadow-sm">
        {{ loading ? 'Đang tải...' : 'Làm mới' }}
      </el-button>
    </div>

    <!-- ===== ROW 1: KPI Cards (5 cols) ===== -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <!-- Thành viên -->
      <el-card shadow="hover" class="kpi-card border-l-4 border-blue-500">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="text-gray-500 text-sm font-medium">Thành viên</div>
            <div class="text-3xl font-bold mt-1 text-gray-800">{{ memberTotal }}</div>
          </div>
          <div class="p-2 bg-blue-50 rounded-full text-blue-600"><el-icon size="20"><User /></el-icon></div>
        </div>
        <div class="text-xs text-gray-600 space-y-1">
          <div v-for="role in stats.members?.byRole" :key="role.name" class="flex justify-between">
            <span>{{ viLabel(roleNameMap, role.name) }}</span>
            <span class="font-bold">{{ role.count }}</span>
          </div>
          <div v-if="!stats.members?.byRole?.length" class="italic text-gray-400">Chưa có dữ liệu</div>
        </div>
      </el-card>

      <!-- Sản phẩm -->
      <el-card shadow="hover" class="kpi-card border-l-4 border-orange-500">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="text-gray-500 text-sm font-medium">Sản phẩm</div>
            <div class="text-3xl font-bold mt-1 text-gray-800">{{ productTotal }}</div>
          </div>
          <div class="p-2 bg-orange-50 rounded-full text-orange-600"><el-icon size="20"><Goods /></el-icon></div>
        </div>
        <div class="text-xs text-gray-600 space-y-1">
          <div v-for="cat in stats.products?.byCategory" :key="cat.name" class="flex justify-between">
            <span>{{ cat.name }}</span> <span class="font-bold">{{ cat.count }}</span>
          </div>
          <div v-if="!stats.products?.byCategory?.length" class="italic text-gray-400">Chưa có dữ liệu</div>
        </div>
      </el-card>

      <!-- Mùa vụ -->
      <el-card shadow="hover" class="kpi-card border-l-4 border-green-500">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="text-gray-500 text-sm font-medium">Mùa vụ</div>
            <div class="text-3xl font-bold mt-1 text-gray-800">{{ seasonTotal }}</div>
          </div>
          <div class="p-2 bg-green-50 rounded-full text-green-600"><el-icon size="20"><Calendar /></el-icon></div>
        </div>
        <div class="text-xs text-gray-600 space-y-1">
          <div v-for="st in stats.seasons?.status" :key="st.name" class="flex justify-between">
            <span>{{ viLabel(seasonStatusMap, st.name) }}</span>
            <span class="font-bold">{{ st.count }}</span>
          </div>
          <div v-if="!stats.seasons?.status?.length" class="italic text-gray-400">Chưa có dữ liệu</div>
        </div>
      </el-card>

      <!-- Lô sản xuất -->
      <el-card shadow="hover" class="kpi-card border-l-4 border-cyan-500">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="text-gray-500 text-sm font-medium">Lô Sản Xuất</div>
            <div class="text-3xl font-bold mt-1 text-gray-800">{{ batchTotal }}</div>
          </div>
          <div class="p-2 bg-cyan-50 rounded-full text-cyan-600"><el-icon size="20"><Box /></el-icon></div>
        </div>
        <div class="text-xs text-gray-600 space-y-1">
          <div v-for="st in stats.batches?.status" :key="st.name" class="flex justify-between">
            <span>{{ viLabel(batchStatusMap, st.name) }}</span>
            <span class="font-bold">{{ st.count }}</span>
          </div>
          <div v-if="!stats.batches?.status?.length" class="italic text-gray-400">Chưa có dữ liệu</div>
        </div>
      </el-card>

      <!-- Mã tem -->
      <el-card shadow="hover" class="kpi-card border-l-4 border-amber-500">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="text-gray-500 text-sm font-medium">Mã tem</div>
            <div class="text-3xl font-bold mt-1 text-gray-800">{{ supplyStats.codes?.total?.toLocaleString() || 0 }}</div>
          </div>
          <div class="p-2 bg-amber-50 rounded-full text-amber-600"><el-icon size="20"><Stamp /></el-icon></div>
        </div>
        <div class="text-xs text-gray-600 space-y-1">
          <div class="flex justify-between">
            <span>Đã sử dụng</span> <span class="font-bold">{{ supplyStats.codes?.used?.toLocaleString() || 0 }}</span>
          </div>
          <div class="flex justify-between">
            <span>Chưa sử dụng</span>
            <span class="font-bold">{{ ((supplyStats.codes?.total || 0) - (supplyStats.codes?.used || 0)).toLocaleString() }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- ===== ROW 2: Map (1/2) + Scan Charts (1/2) ===== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Map -->
      <el-card shadow="hover" class="map-card">
        <template #header>
          <div class="font-bold flex items-center gap-2">
            <el-icon><MapLocation /></el-icon>
            Bản đồ Vùng trồng & Điểm quét
          </div>
        </template>
        <FarmMapboxView
          :locations="mapData.locations"
          :scans="mapData.scans"
          :selected-province="tenantProvince"
          height="100%"
          :auto-fit-bounds="!tenantProvince"
        />
      </el-card>

      <!-- Scan Charts Stack -->
      <div class="flex flex-col gap-6">
        <WeeklyScanChart :tenant-id="tenantId" />
        <TopScanProductsChart :tenant-id="tenantId" />
      </div>
    </div>

    <!-- ===== ROW 3: Nhật ký SX + Sản lượng mùa vụ ===== -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <ProductionDiaryReport :tenant-id="tenantId" />
      <SeasonalHarvestChart :tenant-id="tenantId" />
    </div>

    <!-- ===== ROW 4: Supply Chain Stats (5 mini cards) ===== -->
    <div class="mb-6">
      <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span>📦</span> Thống kê Nghiệp vụ Supply Chain
      </h3>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <!-- Nguyên liệu -->
        <el-card shadow="hover" class="supply-card">
          <div class="supply-icon" style="background: #dbeafe; color: #2563eb;">🌾</div>
          <div class="supply-label">Nguyên liệu</div>
          <div class="supply-value">{{ supplyStats.rawMaterial?.total || 0 }} lô</div>
          <div class="supply-detail">
            <span v-for="s in supplyStats.rawMaterial?.byStatus" :key="s.status">
              {{ viLabel(batchStatusMap, s.status) }}: {{ s.count }}
            </span>
          </div>
        </el-card>

        <!-- Bán thành phẩm -->
        <el-card shadow="hover" class="supply-card">
          <div class="supply-icon" style="background: #fef3c7; color: #d97706;">⚙️</div>
          <div class="supply-label">Bán thành phẩm</div>
          <div class="supply-value">{{ supplyStats.semiFinished?.total || 0 }} lô</div>
          <div class="supply-detail">
            <span v-for="s in supplyStats.semiFinished?.byStatus" :key="s.status">
              {{ viLabel(batchStatusMap, s.status) }}: {{ s.count }}
            </span>
          </div>
        </el-card>

        <!-- Đơn hàng xuất -->
        <el-card shadow="hover" class="supply-card">
          <div class="supply-icon" style="background: #d1fae5; color: #059669;">📋</div>
          <div class="supply-label">Đơn hàng xuất</div>
          <div class="supply-value">{{ supplyStats.exportOrders?.total || 0 }} đơn</div>
          <div class="supply-detail">
            <span v-for="s in supplyStats.exportOrders?.byStatus" :key="s.status">
              {{ viLabel(exportOrderStatusMap, s.status) }}: {{ s.count }}
            </span>
          </div>
        </el-card>

        <!-- Đại lý -->
        <el-card shadow="hover" class="supply-card">
          <div class="supply-icon" style="background: #e0e7ff; color: #4f46e5;">🏪</div>
          <div class="supply-label">Đại lý</div>
          <div class="supply-value">{{ supplyStats.dealers?.total || 0 }}</div>
          <div class="supply-detail">
            <span>Hoạt động: {{ supplyStats.dealers?.active || 0 }}</span>
          </div>
        </el-card>

        <!-- Xe vận chuyển -->
        <el-card shadow="hover" class="supply-card">
          <div class="supply-icon" style="background: #fce7f3; color: #db2777;">🚛</div>
          <div class="supply-label">Xe vận chuyển</div>
          <div class="supply-value">{{ supplyStats.vehicles?.total || 0 }} xe</div>
          <div class="supply-detail">
            <span v-for="s in supplyStats.vehicles?.byStatus" :key="s.status">
              {{ viLabel(vehicleStatusMap, s.status) }}: {{ s.count }}
            </span>
          </div>
        </el-card>
      </div>
    </div>

    <!-- ===== ROW 5: Bottom Tabs ===== -->
    <el-card shadow="hover">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="👥 Thành viên mới" name="members">
          <el-table :data="activity.latestMembers" style="width: 100%" stripe size="small">
            <el-table-column type="index" label="STT" width="50" />
            <el-table-column prop="fullName" label="Họ tên" />
            <el-table-column label="Vai trò" width="150">
              <template #default="{row}">
                <el-tag size="small" type="info">{{ viLabel(roleNameMap, row.role?.name || row.roleName || '') }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="email" label="Email" />
            <el-table-column label="Ngày tạo" width="120">
              <template #default="{row}">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="🌾 Mùa vụ gần đây" name="seasons">
          <el-table :data="activity.latestSeasons" style="width: 100%" stripe size="small">
            <el-table-column type="index" label="STT" width="50" />
            <el-table-column prop="name" label="Tên mùa vụ" />
            <el-table-column label="Khu vực">
              <template #default="{row}">{{ row.location?.name || '---' }}</template>
            </el-table-column>
            <el-table-column label="Ngày bắt đầu" width="120">
              <template #default="{row}">{{ formatDate(row.startDate) }}</template>
            </el-table-column>
            <el-table-column label="Trạng thái" width="130">
              <template #default="{row}">
                <el-tag size="small" :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                  {{ viLabel(seasonStatusMap, row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../store/auth';
import { dashboardApi } from '../api/dashboard';
import { User, Goods, MapLocation, Calendar, Box, Stamp } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

// Gov components reused with tenantId
import WeeklyScanChart from '@/modules/gov/components/WeeklyScanChart.vue';
import TopScanProductsChart from '@/modules/gov/components/TopScanProductsChart.vue';
import ProductionDiaryReport from '@/modules/gov/components/ProductionDiaryReport.vue';
import SeasonalHarvestChart from '@/modules/gov/components/SeasonalHarvestChart.vue';

// Mapbox component (replaces old Leaflet)
import FarmMapboxView from '@/modules/core/components/FarmMapboxView.vue';

// Vietnamese labels
import {
  viLabel,
  roleNameMap,
  batchStatusMap,
  seasonStatusMap,
  exportOrderStatusMap,
  vehicleStatusMap,
} from '@/common/utils/vi-labels';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const tenantId = computed(() => user.value?.tenantId || user.value?.tenant?.id || '');
const tenantProvince = computed(() => stats.value?.province || '');

const stats = ref<any>({});
const activity = ref<any>({ latestMembers: [], latestSeasons: [] });
const supplyStats = ref<any>({});
const mapData = ref<{ locations: any[]; scans: any[] }>({ locations: [], scans: [] });
const loading = ref(false);
const activeTab = ref('members');

// Computed totals
const memberTotal = computed(() => stats.value.members?.total ?? (typeof stats.value.members === 'number' ? stats.value.members : 0));
const productTotal = computed(() => stats.value.products?.total ?? (typeof stats.value.products === 'number' ? stats.value.products : 0));
const seasonTotal = computed(() => stats.value.seasons?.total ?? (typeof stats.value.seasons === 'number' ? stats.value.seasons : 0));
const batchTotal = computed(() => stats.value.batches?.total ?? (typeof stats.value.batches === 'number' ? stats.value.batches : 0));

const formatDate = (d: string) => dayjs(d).format('DD/MM/YYYY');

const loadData = async () => {
  loading.value = true;
  try {
    const [statsRes, actRes, mapRes, supplyRes] = await Promise.all([
      dashboardApi.getTenantStats(),
      dashboardApi.getTenantActivity(),
      dashboardApi.getTenantMaps(),
      dashboardApi.getTenantSupplyStats(),
    ]);
    stats.value = statsRes.data;
    activity.value = actRes.data;
    supplyStats.value = supplyRes.data;
    if (mapRes.data) {
      mapData.value = mapRes.data;
    }
  } catch (e) {
    console.error('Failed to load dashboard data', e);
  } finally {
    loading.value = false;
  }
};

const refreshData = () => loadData();

onMounted(loadData);
</script>

<style scoped>
.kpi-card :deep(.el-card__body) {
  padding: 16px;
}

.map-card {
  min-height: 580px;
  display: flex;
  flex-direction: column;
}

.map-card :deep(.el-card__header) {
  flex-shrink: 0;
}

.map-card :deep(.el-card__body) {
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.map-card :deep(.farm-mapbox-container) {
  border-radius: 0 0 8px 8px;
  flex: 1;
  min-height: 500px;
}

/* Supply chain cards */
.supply-card :deep(.el-card__body) {
  padding: 16px;
  text-align: center;
}

.supply-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin: 0 auto 8px;
}

.supply-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.supply-value {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 6px;
}

.supply-detail {
  font-size: 11px;
  color: #9ca3af;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  justify-content: center;
}
</style>
