<template>
  <div class="verify-page min-h-screen bg-gray-50 flex flex-col">
    <!-- Header/Logo -->
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex justify-center items-center">
      <div class="flex items-center gap-2">
        <img src="@/assets/images/logo.png" alt="TrustID Logo" class="h-8" @error="(e) => (e.target as HTMLImageElement).src = 'https://trustid.com.vn/logo.png'" />
        <span class="text-xl font-bold text-gray-900 tracking-tight">TrustID</span>
        <span class="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider ml-1">Verified</span>
      </div>
    </header>

    <main class="flex-1 max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-6" v-loading="loading">
      <div v-if="location" class="animate-in fade-in duration-700">
        <!-- Banner -->
        <div class="relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 mb-6 group">
          <img src="@/assets/images/EUDR-3.png" alt="EUDR Banner" class="w-full h-40 sm:h-52 object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-bottom p-6">
            <div class="text-white">
              <h2 class="text-lg sm:text-2xl font-bold uppercase tracking-wide mb-1 line-clamp-2">{{ location.name }}</h2>
              <p class="text-sm opacity-90 font-mono">{{ location.code || location.id }}</p>
            </div>
          </div>
        </div>

        <!-- Status Card -->
        <div class="bg-white rounded-2xl shadow-sm border p-6 sm:p-8 text-center transition-all hover:shadow-md" :class="statusBorderClass">
          <div class="mb-6">
            <img :src="statusIcon" :alt="location.eudrStatus" class="h-32 sm:h-40 mx-auto drop-shadow-md hover:scale-105 transition-transform" />
          </div>
          
          <div class="space-y-2">
            <h3 class="text-2xl font-black uppercase tracking-tight" :class="statusTextClass">
              {{ location.eudrStatus === 'COMPLIANT' ? 'HỢP LỆ (COMPLIANT)' : 'VI PHẠM (NON-COMPLIANT)' }}
            </h3>
            <p class="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
              {{ statusDescription }}
            </p>
          </div>

          <!-- Analysis Details -->
          <div v-if="location.checkLog" class="mt-8 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
            <div class="p-3 bg-gray-50 rounded-xl">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Mất rừng phát hiện</div>
              <div class="text-lg font-bold" :class="location.checkLog.treeCoverLossHa > 0 ? 'text-red-600' : 'text-green-600'">
                {{ location.checkLog.treeCoverLossHa?.toFixed(3) || '0.000' }} ha
              </div>
            </div>
            <div class="p-3 bg-gray-50 rounded-xl">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Thời điểm xác thực</div>
              <div class="text-sm font-bold text-gray-700">
                {{ formatDate(location.lastCheckDate) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Farm Details -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h4 class="font-bold text-gray-900 flex items-center gap-2 mb-2">
             <el-icon><InfoFilled /></el-icon> Chi tiết vùng trồng
          </h4>
          <div class="space-y-3">
            <div class="flex justify-between border-b border-gray-50 pb-2">
              <span class="text-gray-500 text-sm">Chủ vùng trồng:</span>
              <span class="font-medium text-sm">{{ location.managerName || 'N/A' }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-50 pb-2">
              <span class="text-gray-500 text-sm">Địa chỉ:</span>
              <span class="font-medium text-sm text-right max-w-[200px]">{{ location.address || 'N/A' }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-50 pb-2">
              <span class="text-gray-500 text-sm">Diện tích GIS:</span>
              <span class="font-medium text-sm">{{ location.areaM2?.toLocaleString() }} m²</span>
            </div>
          </div>
        </div>

        <!-- Map section -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
           <h4 class="font-bold text-gray-900 flex items-center gap-2 mb-4 px-2">
             <el-icon><MapLocation /></el-icon> Ranh giới (Boundary)
          </h4>
          <div id="verify-map" class="h-64 sm:h-80 rounded-xl border border-gray-100"></div>
          <p class="text-[10px] text-center text-gray-400 mt-3 italic">
            (*) Ảnh vệ tinh được cung cấp bởi Mapbox & GFW Data API.
          </p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="!loading" class="text-center py-12 px-6 bg-white rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <div class="text-5xl">🔍</div>
        <h3 class="text-xl font-bold text-gray-900">Không tìm thấy dữ liệu</h3>
        <p class="text-gray-500 text-sm">Mã vùng trồng này không tồn tại hoặc dữ liệu chưa được công khai.</p>
        <el-button type="primary" @click="goHome">Quay về Trang chủ</el-button>
      </div>
    </main>

    <!-- Footer -->
    <footer class="p-8 text-center space-y-2 opacity-60 grayscale">
      <p class="text-xs text-gray-500">&copy; 2026 Copyright by TrustID Vietnam.</p>
      <div class="flex justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        <span>Transparency</span>
        <span>Sustainability</span>
        <span>EUDR Ready</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { InfoFilled, MapLocation } from '@element-plus/icons-vue';
import { farmApi, type Location } from '../api/farmApi';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import compliantLogo from '@/assets/images/logo-complainte-eudr.png';
import nonCompliantLogo from '@/assets/images/logo-not-complainte-eudr.png';

const route = useRoute();
const router = useRouter();
const location = ref<Location | null>(null);
const loading = ref(true);
let map: L.Map | null = null;

const statusIcon = computed(() => {
  return location.value?.eudrStatus === 'COMPLIANT' ? compliantLogo : nonCompliantLogo;
});

const statusBorderClass = computed(() => {
  return location.value?.eudrStatus === 'COMPLIANT' ? 'border-green-200 bg-green-50/10' : 'border-red-200 bg-red-50/10';
});

const statusTextClass = computed(() => {
  return location.value?.eudrStatus === 'COMPLIANT' ? 'text-green-600' : 'text-red-600';
});

const statusDescription = computed(() => {
  if (location.value?.eudrStatus === 'COMPLIANT') {
    return 'Vùng trồng này đã được xác thực tuân thủ đầy đủ các quy định về chống mất rừng của Liên minh Châu Âu (EUDR).';
  }
  return 'Phát hiện dấu hiệu mất rừng hoặc suy thoái rừng sau thời điểm 31/12/2020. Vùng trồng này hiện không đủ điều kiện xuất khẩu theo chuẩn EUDR.';
});

const formatDate = (d?: string) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('vi-VN', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit' 
  });
};

const goHome = () => window.location.href = 'https://trustid.com.vn';

onMounted(async () => {
  const id = route.params.id as string;
  try {
    const { data } = await farmApi.verifyEudr(id);
    location.value = (data as any).data || data;
    await nextTick();
    if (location.value) initMap();
  } catch (err) {
    console.error('Verification failed', err);
  } finally {
    loading.value = false;
  }
});

const initMap = () => {
  const container = document.getElementById('verify-map');
  if (!container || !location.value) return;

  const loc = location.value;
  let center: [number, number] = [14.0583, 108.2772];
  let zoom = 15;

  if (loc.coordinate?.coordinates) {
    center = [loc.coordinate.coordinates[1], loc.coordinate.coordinates[0]];
  }

  map = L.map('verify-map', { zoomControl: false, attributionControl: false }).setView(center, zoom);
  
  L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=' + import.meta.env.VITE_MAPBOX_TOKEN, {
    maxZoom: 20
  }).addTo(map);

  if (loc.boundary?.coordinates) {
    const coords = loc.boundary.coordinates[0].map((c: number[]) => [c[1], c[0]]);
    const color = loc.eudrStatus === 'COMPLIANT' ? '#16a34a' : '#dc2626';
    const polygon = L.polygon(coords, { color, fillOpacity: 0.2, weight: 3 }).addTo(map);
    map.fitBounds(polygon.getBounds(), { padding: [20, 20] });
  }

  L.marker(center).addTo(map);
};
</script>

<style scoped>
.verify-page {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
.animate-in {
  animation: fadeIn 0.6s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
