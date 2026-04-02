<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tổng quan Doanh nghiệp</h1>
        <p class="text-sm text-gray-500">Xin chào, {{ user?.fullName }}</p>
      </div>
      <div>
          <el-button type="primary" @click="refreshToken">Làm mới</el-button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <!-- Members -->
        <el-card shadow="hover" class="border-l-4 border-blue-500">
             <div class="flex justify-between items-start mb-4">
                <div>
                     <div class="text-gray-500 text-sm font-medium">Thành viên</div>
                     <div class="text-3xl font-bold mt-1 text-gray-800">{{ stats.members?.total ?? (typeof stats.members === 'number' ? stats.members : 0) }}</div>
                </div>
                <div class="p-2 bg-blue-50 rounded-full text-blue-600"><el-icon size="20"><User /></el-icon></div>
             </div>
             <div class="text-xs text-gray-600 space-y-1">
                 <div v-for="role in stats.members?.byRole" :key="role.name" class="flex justify-between">
                     <span>{{ role.name }}</span> <span class="font-bold">{{ role.count }}</span>
                 </div>
                 <div v-if="!stats.members?.byRole?.length" class="italic text-gray-400">Chưa có dữ liệu phân loại</div>
             </div>
        </el-card>

        <!-- Products -->
        <el-card shadow="hover" class="border-l-4 border-orange-500">
             <div class="flex justify-between items-start mb-4">
                <div>
                     <div class="text-gray-500 text-sm font-medium">Sản phẩm</div>
                     <div class="text-3xl font-bold mt-1 text-gray-800">{{ stats.products?.total ?? (typeof stats.products === 'number' ? stats.products : 0) }}</div>
                </div>
                 <div class="p-2 bg-orange-50 rounded-full text-orange-600"><el-icon size="20"><Goods /></el-icon></div>
             </div>
             <div class="text-xs text-gray-600 space-y-1">
                 <div v-for="cat in stats.products?.byCategory" :key="cat.name" class="flex justify-between">
                     <span>{{ cat.name }}</span> <span class="font-bold">{{ cat.count }}</span>
                 </div>
                  <div v-if="!stats.products?.byCategory?.length" class="italic text-gray-400">Chưa có dữ liệu phân loại</div>
             </div>
        </el-card>

        <!-- Seasons -->
        <el-card shadow="hover" class="border-l-4 border-green-500">
             <div class="flex justify-between items-start mb-4">
                <div>
                     <div class="text-gray-500 text-sm font-medium">Mùa vụ</div>
                     <div class="text-3xl font-bold mt-1 text-gray-800">{{ stats.seasons?.total ?? (typeof stats.seasons === 'number' ? stats.seasons : 0) }}</div>
                </div>
                 <div class="p-2 bg-green-50 rounded-full text-green-600"><el-icon size="20"><Calendar /></el-icon></div>
             </div>
             <div class="text-xs text-gray-600 space-y-1">
                 <div v-for="st in stats.seasons?.status" :key="st.name" class="flex justify-between">
                     <span>{{ st.name === 'ACTIVE' ? 'Đang canh tác' : (st.name === 'HARVESTED' ? 'Đã thu hoạch' : st.name) }}</span> 
                     <span class="font-bold">{{ st.count }}</span>
                 </div>
                  <div v-if="!stats.seasons?.status?.length" class="italic text-gray-400">Chưa có dữ liệu phân loại</div>
             </div>
        </el-card>

        <!-- Batches -->
        <el-card shadow="hover" class="border-l-4 border-purple-500">
             <div class="flex justify-between items-start mb-4">
                <div>
                     <div class="text-gray-500 text-sm font-medium">Lô Sản Xuất</div>
                     <div class="text-3xl font-bold mt-1 text-gray-800">{{ stats.batches?.total ?? (typeof stats.batches === 'number' ? stats.batches : 0) }}</div>
                </div>
                 <div class="p-2 bg-purple-50 rounded-full text-purple-600"><el-icon size="20"><Box /></el-icon></div>
             </div>
              <div class="text-xs text-gray-600 space-y-1">
                 <div v-for="st in stats.batches?.status" :key="st.name" class="flex justify-between">
                     <span>{{ st.name }}</span> <span class="font-bold">{{ st.count }}</span>
                 </div>
                  <div v-if="!stats.batches?.status?.length" class="italic text-gray-400">Chưa có dữ liệu phân loại</div>
             </div>
        </el-card>
    </div>

    <!-- Map Section -->
    <div class="mb-6">
        <el-card shadow="hover" >
            <template #header>
                <div class="flex justify-between items-center">
                    <div class="font-bold flex items-center gap-2">
                         <el-icon><MapLocation /></el-icon>
                         Bản đồ Vùng trồng & Điểm quét sản phẩm
                    </div>
                </div>
            </template>
            <div ref="mapContainer" class="w-full h-[400px] z-0"></div>
            <div class="mt-2 text-xs text-gray-500 flex gap-4">
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500"></span> Vùng trồng</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500"></span> Điểm quét</span>
            </div>
        </el-card>
    </div>

    <!-- Recent Lists -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Members -->
        <el-card shadow="hover">
            <template #header>
                <div class="font-bold">Thành viên mới</div>
            </template>
            <el-table :data="activity.latestMembers" style="width: 100%" stripe>
                <el-table-column prop="fullName" label="Họ tên" />
                <el-table-column prop="email" label="Email" />
                <el-table-column label="Ngày tạo" width="120">
                    <template #default="{row}">
                        {{ formatDate(row.createdAt) }}
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <!-- Recent Seasons -->
        <el-card shadow="hover">
            <template #header>
                <div class="font-bold">Mùa vụ gần đây</div>
            </template>
            <el-table :data="activity.latestSeasons" style="width: 100%" stripe>
                <el-table-column prop="name" label="Tên mùa vụ" />
                <el-table-column label="Khu vực">
                    <template #default="{row}">
                        {{ row.location?.name || '---' }}
                    </template>
                </el-table-column>
                 <el-table-column label="Ngày bắt đầu" width="120">
                    <template #default="{row}">
                        {{ formatDate(row.startDate) }}
                    </template>
                </el-table-column>
                <el-table-column label="Trạng thái" width="100">
                    <template #default="{row}">
                        <el-tag size="small">{{ row.status }}</el-tag>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { useAuthStore } from '../store/auth'; 
import { dashboardApi } from '../api/dashboard';
import { User, Goods, MapLocation, Calendar, Box } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const stats = ref<any>({});
const activity = ref<any>({ latestMembers: [], latestSeasons: [] });
const mapContainer = ref<HTMLElement | null>(null);
const map = ref<any>(null);

const formatDate = (d: string) => dayjs(d).format('DD/MM/YYYY');

const loadData = async () => {
    try {
        const statsRes = await dashboardApi.getTenantStats();
        console.log('Tenant Stats RES:', statsRes);
        stats.value = statsRes.data;

        const actRes = await dashboardApi.getTenantActivity();
        console.log('Tenant Activity RES:', actRes);
        activity.value = actRes.data;

        // Load Map Data
        const mapRes = await dashboardApi.getTenantMaps();
        console.log('Tenant Maps RES:', mapRes);
        if (mapRes.data) {
            initMap(mapRes.data);
        }
    } catch (e) {
        console.error("Failed to load dashboard data", e);
    }
};

const initMap = (data: { locations: any[], scans: any[] }) => {
    if (!mapContainer.value) return;
    
    // If map already exists, remove it (re-init) but usually we just want to clear layers
    if (map.value) {
        map.value.remove();
    }

    // Default center (Vietnam)
    const defaultCenter = [14.0583, 108.2772];
    map.value = L.map(mapContainer.value).setView(defaultCenter as any, 6);

    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
    
    // Define base layers
    const satelliteLayer = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN_HERE' 
        ? L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`, {
            maxZoom: 20,
            attribution: '© Mapbox'
        })
        : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        });

    const darkLayer = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN_HERE'
        ? L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`, {
            maxZoom: 20,
            attribution: '© Mapbox'
        })
        : L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        });

    const outdoorsLayer = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN_HERE'
        ? L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`, {
            maxZoom: 20,
            attribution: '© Mapbox'
        })
        : L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; OpenTopoMap'
        });

    const esriTerrainLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    });

    const baseMaps = {
        "Vệ tinh (Mapbox)": satelliteLayer,
        "Giao diện Tối (Mapbox)": darkLayer,
        "Ngoài trời (Mapbox)": outdoorsLayer,
        "Địa hình (Esri)": esriTerrainLayer
    };

    // Add default layer
    satelliteLayer.addTo(map.value);

    // Add layer control
    L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map.value);

    const bounds = L.latLngBounds([]);

    // 1. Plot Planting Areas (Locations) - Green Markers
    data.locations.forEach((loc: any) => {
        // Assume coordinate is GeoJSON string or object? 
        // Backend entity said: @Column({ type: 'geometry', ... }) coordinate: string;
        // If coordinate is GeoJSON string '{"type":"Point","coordinates":[lng,lat]}', parse it.
        // If it's WKT 'POINT(lng lat)', pass.
        // For MVP, let's assume if it exists, try to parse coordinates. 
        // If user hasn't implemented saving coordinates properly, this might be empty.
        
        let lat = 0, lng = 0;
        try {
            if (typeof loc.coordinate === 'string' && loc.coordinate.startsWith('{')) {
                const geo = JSON.parse(loc.coordinate);
                if (geo.type === 'Point') {
                    lng = geo.coordinates[0];
                    lat = geo.coordinates[1]; // GeoJSON is usually [lng, lat]
                }
            } else if (loc.coordinate && typeof loc.coordinate === 'object') {
                 // Postgres might return object directly
                 lng = loc.coordinate.coordinates[0];
                 lat = loc.coordinate.coordinates[1];
            }
        } catch(e) {}

        if (lat && lng) {
             const marker = L.circleMarker([lat, lng], {
                color: 'green',
                fillColor: '#28a745',
                fillOpacity: 0.8,
                radius: 8
            }).addTo(map.value);
            marker.bindPopup(`
                <div class="p-1">
                    <div class="font-bold text-base mb-1">${loc.name}</div>
                    ${loc.code ? `<div class="text-xs">🔢 <b>Mã vùng:</b> ${loc.code}</div>` : ''}
                    ${loc.plantType ? `<div class="text-xs">🌱 <b>Loại cây:</b> ${loc.plantType}</div>` : ''}
                    ${loc.areaM2 ? `<div class="text-xs">📐 <b>Diện tích:</b> ${loc.areaM2?.toLocaleString()} m²</div>` : ''}
                    ${loc.managerName ? `<div class="text-xs">👤 <b>Người phụ trách:</b> ${loc.managerName}</div>` : ''}
                    ${loc.address ? `<div class="text-xs mt-1 text-gray-500">📍 ${loc.address}</div>` : ''}
                </div>
            `);
            bounds.extend([lat, lng]);
        }
    });

    // 2. Plot Scans - Red/Blue Markers
    data.scans.forEach((scan: any) => {
        if (scan.lat && scan.lng) {
            const marker = L.circleMarker([scan.lat, scan.lng], {
                color: 'red',
                fillColor: '#dc3545',
                fillOpacity: 0.8,
                radius: 6
            }).addTo(map.value);
            marker.bindPopup(`<b>Quét mã: ${scan.codeString}</b><br>${scan.address || ''}<br>${formatDate(scan.createdAt)}`);
            bounds.extend([scan.lat, scan.lng]);
        }
    });

    // Add Archipelago Labels
    const islands = [
        { pos: [16.5839161, 112.4743021], text: 'Quần đảo<br/>Hoàng Sa' },
        { pos: [10.6921803, 115.7505101], text: 'Quần đảo<br/>Trường Sa' }
    ];

    islands.forEach(island => {
        const icon = L.divIcon({
            className: 'island-label',
            html: `<div style="color: #FFF04D; font-size: 12px; font-weight: bold; text-align: center; line-height: 1.2; text-shadow: 1px 1px 3px black, -1px -1px 3px black;">${island.text}</div>`,
            iconSize: [120, 48],
            iconAnchor: [60, 24]
        });
        L.marker(island.pos as any, { icon, interactive: false }).addTo(map.value);
    });

    // Make sure bounds includes the archipelagos so they're visible if that's intended
    // Usually, we only fitBounds to actual data points so it doesn't zoom out too far empty space.
    // If the user wants to see them whenever viewing Vietnam, that's fine, but typically we just
    // fit bounds on actual user data. We leave bounds untouched here so we focus on farm locations.

    if (bounds.isValid()) {
        map.value.fitBounds(bounds, { padding: [50, 50] });
    }
};

const refreshToken = () => {
    loadData();
}

onMounted(() => {
    loadData();
});
</script>

<style scoped>
/* Stats card custom styles if needed */
</style>
