<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Chi tiết Đội trưởng</h1>
      <el-button @click="$router.push('/farm/team-leaders')">
        Quay lại
      </el-button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <el-spinner size="large" />
    </div>

    <template v-else-if="dashboard">
      <!-- Section 1: Hero & Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <!-- Profile Card -->
        <el-card class="col-span-1" shadow="hover">
          <div class="flex flex-col items-center text-center">
            <el-avatar :size="80" :src="dashboard.leader.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" class="mb-4" />
            <h2 class="text-lg font-bold">{{ dashboard.leader.fullName || 'Chưa cập nhật tên' }}</h2>
            <p class="text-gray-500 mb-2">{{ dashboard.leader.username }}</p>
            <el-tag :type="dashboard.leader.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
              {{ dashboard.leader.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa' }}
            </el-tag>
          </div>
        </el-card>

        <!-- Stats Cards -->
        <div class="col-span-3 grid grid-cols-3 gap-6">
          <el-card shadow="hover" class="bg-gradient-to-br from-green-50 to-green-100 border-none">
            <div class="flex flex-col h-full justify-center">
              <p class="text-sm text-green-600 font-medium">Tổng diện tích quản lý</p>
              <p class="text-3xl font-bold text-green-800 mt-2">{{ dashboard.stats.totalAreaHa.toFixed(2) }} <span class="text-lg font-normal">ha</span></p>
            </div>
          </el-card>
          
          <el-card shadow="hover" class="bg-gradient-to-br from-blue-50 to-blue-100 border-none">
            <div class="flex flex-col h-full justify-center">
              <p class="text-sm text-blue-600 font-medium">Số lượng Nông hộ</p>
              <p class="text-3xl font-bold text-blue-800 mt-2">{{ dashboard.stats.totalFarmers }} <span class="text-lg font-normal">hộ</span></p>
            </div>
          </el-card>

          <el-card shadow="hover" class="bg-gradient-to-br from-purple-50 to-purple-100 border-none">
            <div class="flex flex-col h-full justify-center">
              <p class="text-sm text-purple-600 font-medium">Hoàn thành nhật ký</p>
              <p class="text-3xl font-bold text-purple-800 mt-2">{{ dashboard.stats.avgCompletionRate }}<span class="text-lg font-normal">%</span></p>
            </div>
          </el-card>
        </div>
      </div>

      <!-- Section 2: Map -->
      <el-card shadow="hover" class="mb-6">
        <template #header>
          <div class="font-bold">Bản đồ Vùng trồng quản lý</div>
        </template>
        <div id="leader-map" style="height: 400px; width: 100%; border-radius: 8px; z-index: 1;"></div>
      </el-card>

      <!-- Section 3: Split View -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Left: Crop Cycles -->
        <el-card shadow="hover">
          <template #header>
            <div class="font-bold">Mùa vụ đang diễn ra</div>
          </template>
          <el-table :data="dashboard.cropCycles" style="width: 100%" max-height="400">
            <el-table-column prop="name" label="Tên mùa vụ" min-width="150">
              <template #default="{ row }">
                <span class="font-medium text-blue-600">{{ row.name || 'Mùa vụ mặc định' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Thửa đất" min-width="120">
              <template #default="{ row }">
                {{ row.location?.name || '—' }}
              </template>
            </el-table-column>
            <el-table-column label="Bắt đầu" width="120">
              <template #default="{ row }">
                {{ formatDate(row.startDate) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="dashboard.cropCycles.length === 0" description="Không có mùa vụ nào đang hoạt động" />
        </el-card>

        <!-- Right: Farmer Progress -->
        <el-card shadow="hover">
          <template #header>
            <div class="font-bold">Tiến độ Nông hộ</div>
          </template>
          
          <div v-if="dashboard.farmers.length > 0" class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            <div v-for="farmer in dashboard.farmers" :key="farmer.id" class="flex items-center gap-4 p-3 border rounded-lg bg-gray-50">
              <el-avatar :size="40" :src="farmer.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
              <div class="flex-1">
                <div class="flex justify-between mb-1">
                  <span class="font-medium text-gray-800">{{ farmer.fullName || farmer.username }}</span>
                  <span class="text-sm font-bold text-gray-600">{{ farmer.completionRate }}%</span>
                </div>
                <el-progress 
                  :percentage="farmer.completionRate" 
                  :show-text="false"
                  :color="getProgressColor(farmer.completionRate)"
                  :stroke-width="8"
                />
                <div class="text-xs text-gray-500 mt-1">
                  Đã ghi chép: {{ farmer.completedLogs }}/{{ farmer.totalLogs }} công việc | Phụ trách: {{ farmer.locationsCount }} thửa
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="Chưa có nông hộ nào được phân công" />
        </el-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/common/utils/api'; // Using generic api client

const route = useRoute();
const loading = ref(true);
const dashboard = ref<any>(null);
let map: L.Map | null = null;

const getProgressColor = (percentage: number) => {
  if (percentage < 30) return '#ef4444'; // Red
  if (percentage < 70) return '#f59e0b'; // Yellow
  return '#10b981'; // Green
};

const formatDate = (date: string) => {
  if (!date) return '—';
  return dayjs(date).format('DD/MM/YYYY');
};

const loadDashboard = async () => {
  const username = route.params.username;
  try {
    const { data } = await api.get(`/farm/team-leaders/${username}/dashboard`);
    dashboard.value = data;
    loading.value = false; // Must be set before nextTick so v-else renders the map container
    
    // Init map after DOM updates
    nextTick(() => {
      initMap();
    });
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi khi tải thông tin chi tiết');
    loading.value = false;
  }
};

const initMap = () => {
  if (!dashboard.value?.locations || dashboard.value.locations.length === 0) {
    // Empty map
    map = L.map('leader-map').setView([14.0583, 108.2772], 6); // Center VN
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    return;
  }

  // Calculate bounds to fit all locations
  const bounds = L.latLngBounds([]);
  let mapInitialized = false;

  const locations = dashboard.value.locations || [];
  for (const loc of locations) {
    let parsedBoundary: any[] | null = null;
    
    // Parse boundary depending on format
    if (loc.boundary) {
      if (typeof loc.boundary === 'string' && loc.boundary.startsWith('{')) {
        try {
          parsedBoundary = JSON.parse(loc.boundary).coordinates;
        } catch(e) {}
      } else if (typeof loc.boundary === 'object' && loc.boundary.coordinates) {
        parsedBoundary = loc.boundary.coordinates;
      } else if (Array.isArray(loc.boundary)) {
        parsedBoundary = loc.boundary;
      }
    }

    if (parsedBoundary && parsedBoundary.length > 0) {
      if (!mapInitialized) {
        map = L.map('leader-map');
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri'
        }).addTo(map);
        mapInitialized = true;
      }

      try {
        // Convert GeoJSON to Leaflet polygon
        const coords = parsedBoundary[0].map((pt: number[]) => [pt[1], pt[0]] as [number, number]);
        const polygon = L.polygon(coords, {
          color: '#10b981',
          fillColor: '#34d399',
          fillOpacity: 0.4,
          weight: 2
        }).addTo(map!);

        // Bind popup
        const farmerName = loc.farmer?.fullName || 'Chưa giao';
        polygon.bindPopup(`<b>${loc.name}</b><br/>Nông hộ: ${farmerName}<br/>Diện tích: ${(loc.areaM2 / 10000).toFixed(2)} ha`);

        bounds.extend(polygon.getBounds());
      } catch(err) {
        console.error('Error drawing polygon:', err, loc.boundary);
      }
    } else if (loc.coordinate && loc.coordinate.coordinates) {
       // Fallback to point
       if (!mapInitialized) {
        map = L.map('leader-map');
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri'
        }).addTo(map);
        mapInitialized = true;
      }
      const lng = loc.coordinate.coordinates[0];
      const lat = loc.coordinate.coordinates[1];
      const marker = L.circleMarker([lat, lng], { color: '#10b981' }).addTo(map!);
      marker.bindPopup(`<b>${loc.name}</b>`);
      bounds.extend(marker.getLatLng());
    }
  }

  if (!mapInitialized) {
     // No valid geometries found
     map = L.map('leader-map').setView([14.0583, 108.2772], 6); // Center VN
     L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
       maxZoom: 19,
       attribution: 'Tiles &copy; Esri'
     }).addTo(map);
     mapInitialized = true;
  }

  if (map) {
    setTimeout(() => {
      try {
        map!.invalidateSize();
        if (mapInitialized && bounds.isValid()) {
          map!.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch(e) {
        console.error('Error fitting bounds:', e);
      }
    }, 500); // Increased timeout to ensure DOM is ready
  }
};

onMounted(() => {
  loadDashboard();
});
</script>

<style scoped>
/* Optional styling */
</style>
