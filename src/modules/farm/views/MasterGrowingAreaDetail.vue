<template>
  <div class="p-6 space-y-6" v-loading="loading">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <el-button link @click="$router.push('/farm/master-areas')">
          <el-icon :size="20"><Back /></el-icon>
        </el-button>
        <h1 class="text-2xl font-bold text-gray-900">
          Chi tiết Vùng Trồng: <span class="text-blue-600">{{ area?.code }}</span>
        </h1>
      </div>
    </div>

    <!-- Basic Info -->
    <el-card shadow="hover">
      <el-descriptions border :column="3">
        <el-descriptions-item label="Tên Vùng trồng" span="2">
          <span class="font-medium text-lg">{{ area?.name }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="Trạng thái">
          <el-tag :type="area?.status === 'ACTIVE' ? 'success' : 'info'">
            {{ area?.status }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Vị trí">
          {{ [area?.ward, area?.province].filter(Boolean).join(', ') || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Tổng diện tích hiện có">
          <span class="font-bold text-green-600">{{ (totalUsedAreaM2 / 10000).toFixed(2) }} ha</span>
        </el-descriptions-item>
        <el-descriptions-item label="Giới hạn tối đa">
          {{ area?.maxAreaM2 ? (area.maxAreaM2 / 10000).toFixed(2) : 10 }} ha
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- Map View -->
    <el-card shadow="hover" class="w-full">
      <template #header>
        <div class="font-medium text-lg">Bản đồ các Thửa canh tác</div>
      </template>
      <div id="master-map" style="height: 600px; width: 100%; border-radius: 8px; z-index: 1;"></div>
    </el-card>

    <!-- Location List -->
    <el-card shadow="hover">
      <template #header>
        <div class="font-medium text-lg">Danh sách Thửa canh tác ({{ locations.length }})</div>
      </template>
      <el-table :data="locations" style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column prop="name" label="Tên thửa" min-width="150">
          <template #default="{ row }">
            <router-link :to="`/farm/locations/${row.id}`" class="text-blue-600 hover:underline">
              {{ row.name }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column label="Nông hộ" min-width="150">
          <template #default="{ row }">
            {{ row.farmer?.fullName || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="Đội trưởng" min-width="150">
          <template #default="{ row }">
            {{ row.leader?.fullName || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="areaM2" label="Diện tích" width="120" align="right">
          <template #default="{ row }">
            {{ row.areaM2 ? row.areaM2.toLocaleString() : 0 }} m²
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Back } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { farmApi, type MasterGrowingArea, type Location } from '../api/farmApi';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const route = useRoute();
const id = route.params.id as string;

const area = ref<MasterGrowingArea | null>(null);
const locations = ref<Location[]>([]);
const loading = ref(false);
let map: L.Map | null = null;

const totalUsedAreaM2 = computed(() => {
  return locations.value.reduce((sum, l) => sum + (l.areaM2 || 0), 0);
});

const loadData = async () => {
  if (!id) return;
  loading.value = true;
  try {
    const { data } = await farmApi.getMasterGrowingAreaMapDetail(id);
    area.value = data;
    locations.value = data.locations || [];
    initMap();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không thể tải chi tiết Mã vùng trồng');
  } finally {
    loading.value = false;
  }
};

const initMap = async () => {
  await nextTick();
  if (map) {
    map.remove();
  }

  map = L.map('master-map').setView([14.0583, 108.2772], 6);

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
        color: '#2563eb',
        fillOpacity: 0.3,
        weight: 2
      });

      const popupContent = `
        <div class="text-sm">
          <p class="font-bold text-base mb-1">${loc.name}</p>
          <p><strong>Nông hộ:</strong> ${loc.farmer?.fullName || '—'}</p>
          <p><strong>Đội trưởng:</strong> ${loc.leader?.fullName || '—'}</p>
          <p><strong>Diện tích:</strong> ${loc.areaM2 ? loc.areaM2.toLocaleString() : 0} m2</p>
        </div>
      `;

      polygon.bindPopup(popupContent);
      drawnItems.addLayer(polygon);
      bounds.extend(polygon.getBounds());
    } else if (loc.coordinate && loc.coordinate.coordinates) {
      const point = [loc.coordinate.coordinates[1], loc.coordinate.coordinates[0]] as L.LatLngExpression;
      const marker = L.circleMarker(point, {
        color: '#2563eb',
        radius: 8,
        fillOpacity: 0.8
      });
      const popupContent = `
        <div class="text-sm">
          <p class="font-bold text-base mb-1">${loc.name}</p>
          <p><strong>Nông hộ:</strong> ${loc.farmer?.fullName || '—'}</p>
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
