<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900">Bảng điều khiển Đội trưởng</h1>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <el-card shadow="hover" class="bg-blue-50 border-blue-100">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-100 rounded-lg text-blue-600">
            <el-icon :size="24"><Location /></el-icon>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Số thửa canh tác</p>
            <p class="text-2xl font-bold text-gray-900">{{ locations.length }}</p>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="bg-green-50 border-green-100">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-100 rounded-lg text-green-600">
            <el-icon :size="24"><User /></el-icon>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Số nông hộ quản lý</p>
            <p class="text-2xl font-bold text-gray-900">{{ uniqueFarmersCount }}</p>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="bg-purple-50 border-purple-100">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-purple-100 rounded-lg text-purple-600">
            <el-icon :size="24"><DataLine /></el-icon>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tổng diện tích (ha)</p>
            <p class="text-2xl font-bold text-gray-900">{{ (totalAreaM2 / 10000).toFixed(2) }} ha</p>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Map View -->
    <el-card shadow="hover" class="w-full">
      <template #header>
        <div class="font-medium text-lg">Bản đồ Vùng trồng quản lý</div>
      </template>
      <div v-loading="loading">
        <div id="leader-map" style="height: 600px; width: 100%; border-radius: 8px; z-index: 1;"></div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { Location, User, DataLine } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { farmApi } from '../api/farmApi';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const locations = ref<any[]>([]);
const loading = ref(false);
let map: L.Map | null = null;

const uniqueFarmersCount = computed(() => {
  const ids = new Set(locations.value.filter(l => l.farmerId).map(l => l.farmerId));
  return ids.size;
});

const totalAreaM2 = computed(() => {
  return locations.value.reduce((sum, l) => sum + (l.areaM2 || 0), 0);
});

const loadData = async () => {
  loading.value = true;
  try {
    const { data } = await farmApi.getLeaderMap();
    locations.value = data || [];
    initMap();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi khi tải dữ liệu bản đồ');
  } finally {
    loading.value = false;
  }
};

const initMap = async () => {
  await nextTick();
  if (map) {
    map.remove();
  }

  map = L.map('leader-map').setView([14.0583, 108.2772], 6); // Center Vietnam default

  L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=' + import.meta.env.VITE_MAPBOX_TOKEN, {
    maxZoom: 20,
    attribution: '© Mapbox'
  }).addTo(map);

  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  if (locations.value.length === 0) return;

  const bounds = new L.LatLngBounds([]);

  locations.value.forEach(loc => {
    // Determine boundary
    const boundarySource = (loc.approvalStatus === 'PENDING' && loc.pendingBoundary)
        ? loc.pendingBoundary 
        : loc.boundary;
        
    let parsedBoundary = null;
    if (boundarySource) {
        if (typeof boundarySource === 'string' && boundarySource.startsWith('{')) {
            try {
                parsedBoundary = JSON.parse(boundarySource).coordinates;
            } catch(e) {}
        } else if (typeof boundarySource === 'object' && boundarySource.coordinates) {
            parsedBoundary = boundarySource.coordinates;
        }
    }

    if (parsedBoundary && parsedBoundary.length > 0) {
      const polyCoords = parsedBoundary[0].map((coord: number[]) => [coord[1], coord[0]]);
      const polygon = L.polygon(polyCoords, {
        color: '#16a34a',
        fillOpacity: 0.4,
        weight: 2
      });

      const popupContent = `
        <div class="text-sm">
          <p class="font-bold text-base mb-1">${loc.name}</p>
          <p><strong>Nông hộ:</strong> ${loc.farmer?.fullName || 'Chưa gán'}</p>
          <p><strong>Cây trồng:</strong> ${loc.plantType || 'N/A'}</p>
          <p><strong>Diện tích:</strong> ${loc.areaM2 ? loc.areaM2.toLocaleString() : 0} m2</p>
          <p><strong>Trạng thái EUDR:</strong> ${loc.eudrStatus}</p>
        </div>
      `;

      polygon.bindPopup(popupContent);
      drawnItems.addLayer(polygon);
      bounds.extend(polygon.getBounds());
    } else if (loc.coordinate && loc.coordinate.coordinates) {
      const point = [loc.coordinate.coordinates[1], loc.coordinate.coordinates[0]] as L.LatLngExpression;
      const marker = L.circleMarker(point, {
        color: '#16a34a',
        radius: 8,
        fillOpacity: 0.8
      });
      const popupContent = `
        <div class="text-sm">
          <p class="font-bold text-base mb-1">${loc.name}</p>
          <p><strong>Nông hộ:</strong> ${loc.farmer?.fullName || 'Chưa gán'}</p>
          <p><strong>Diện tích:</strong> ${loc.areaM2 ? loc.areaM2.toLocaleString() : 0} m2</p>
        </div>
      `;
      marker.bindPopup(popupContent);
      drawnItems.addLayer(marker);
      bounds.extend([point]);
    }
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
};

onMounted(() => {
  loadData();
});
</script>
