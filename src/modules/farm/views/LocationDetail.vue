<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <el-button @click="goBack" :icon="ArrowLeft" circle />
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ location?.name || 'Chi tiết Vùng trồng' }}</h1>
        <div class="text-sm text-gray-500 mt-1">
          {{ location?.code }} · {{ [location?.ward, location?.province].filter(Boolean).join(', ') }}
        </div>
      </div>
      <div class="ml-auto flex items-center gap-3">
        <el-tag :type="location?.status === 'ACTIVE' ? 'success' : 'info'" size="large" v-if="location">
          {{ location.status }}
        </el-tag>
        <el-button type="primary" @click="openEditModal" :icon="Edit">Chỉnh sửa</el-button>
      </div>
    </div>

    <div v-loading="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- LEFT: Info + Map -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Basic Info Card -->
        <el-card shadow="hover">
          <template #header>
            <div class="font-bold flex items-center gap-2">
              <el-icon><Coordinate /></el-icon>
              Thông tin chung
            </div>
          </template>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm" v-if="location">
            <div>
              <div class="text-gray-500">Mã số</div>
              <div class="font-medium">{{ location.code || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Loại cây</div>
              <div class="font-medium">{{ location.plantType || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Diện tích</div>
              <div class="font-medium">{{ location.areaM2?.toLocaleString() || '—' }} m²</div>
            </div>
            <div>
              <div class="text-gray-500">Người quản lý</div>
              <div class="font-medium">{{ location.managerName || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Địa chỉ</div>
              <div class="font-medium">{{ location.address || '—' }}</div>
            </div>
            <div>
              <div class="text-gray-500">Tỉnh / Xã</div>
              <div class="font-medium">{{ [location.ward, location.province].filter(Boolean).join(', ') || '—' }}</div>
            </div>
          </div>
        </el-card>

        <!-- Map Card -->
        <el-card shadow="hover">
          <template #header>
            <div class="font-bold flex items-center gap-2">
              <el-icon><MapLocation /></el-icon>
              Bản đồ vùng trồng
            </div>
          </template>
          <div id="detail-map" style="height: 400px; border-radius: 8px; z-index: 1;"></div>
        </el-card>

        <!-- KCS Inspections Card -->
        <el-card shadow="hover">
          <template #header>
            <div class="font-bold flex items-center gap-2">
              <el-icon><DocumentChecked /></el-icon>
              Lịch sử Kiểm định KCS
            </div>
          </template>
          <div v-if="kcsInspections.length === 0" class="text-center text-gray-500 py-4">
            Chưa có biên bản kiểm định nào.
          </div>
          <div v-else class="space-y-4 max-h-[400px] overflow-y-auto">
            <div v-for="ins in kcsInspections" :key="ins.id" class="border rounded p-4 bg-gray-50">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <div class="font-medium text-sm">Nhân viên: {{ ins.inspector?.fullName || ins.inspector?.username || '—' }}</div>
                  <div class="text-xs text-gray-500">{{ formatDate(ins.inspectionDate) }}</div>
                </div>
                <el-tag :type="ins.status === 'PASSED' ? 'success' : 'danger'">
                  {{ ins.status === 'PASSED' ? 'ĐẠT' : 'CHƯA ĐẠT' }}
                </el-tag>
              </div>
              <p class="text-sm text-gray-700 mt-2" v-if="ins.notes"><strong>Ghi chú:</strong> {{ ins.notes }}</p>
              
              <div v-if="ins.reportFiles && ins.reportFiles.length > 0" class="mt-3 flex gap-2 flex-wrap">
                <a v-for="(file, index) in ins.reportFiles" :key="index" :href="getFileUrl(file)" target="_blank" class="inline-flex items-center gap-1 text-sm text-blue-600 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded transition">
                  <el-icon><Link /></el-icon> Biên bản {{ index + 1 }}
                </a>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- RIGHT: EUDR Panel -->
      <div class="space-y-6">
        <!-- EUDR Status Card -->
        <el-card shadow="hover" :class="eudrCardClass">
          <template #header>
            <div class="font-bold flex items-center gap-2">
              <el-icon><DataAnalysis /></el-icon>
              Kiểm tra EUDR
            </div>
          </template>

          <!-- Banner & Description -->
          <div class="mb-4">
            <img src="../../../assets/images/EUDR.jpg" alt="EUDR Certification" class="w-full rounded-md object-cover mb-2" style="max-height: 120px;" />
            <p class="text-xs text-gray-500 text-justify leading-relaxed">
              Quy định chống mất rừng của Liên minh Châu Âu (EUDR) đảm bảo các sản phẩm nông nghiệp không đóng góp vào nạn phá rừng. Kết quả kiểm tra đối soát ranh giới vùng trồng với dữ liệu vệ tinh toàn cầu.
            </p>
          </div>

          <!-- Status Badge -->
          <div class="text-center mb-4">
            <!-- If COMPLIANT -->
            <div v-if="location?.eudrStatus === 'COMPLIANT'" class="inline-flex flex-col items-center justify-center p-4 rounded-xl bg-green-50/50 border border-green-100 w-full min-h-[140px]">
              <img src="../../../assets/images/logo-complainte-eudr.png" alt="Hợp lệ" class="h-28 object-contain drop-shadow-sm transition-transform hover:scale-105" />
            </div>
            
            <!-- If NON_COMPLIANT -->
            <div v-else-if="location?.eudrStatus === 'NON_COMPLIANT'" class="inline-flex flex-col items-center justify-center p-4 rounded-xl bg-red-50/50 border border-red-100 w-full min-h-[140px]">
              <img src="../../../assets/images/logo-not-complainte-eudr.png" alt="Vi phạm" class="h-28 object-contain drop-shadow-sm transition-transform hover:scale-105 mb-2" />
              <span v-if="location?.violationRate" class="text-sm font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                Tỷ lệ vi phạm: {{ location.violationRate }}%
              </span>
            </div>
            
            <!-- Otherwise (PENDING, ERROR, NOT_CHECKED) -->
            <div v-else class="inline-flex flex-col items-center justify-center p-4 rounded-xl border w-full min-h-[140px]" :class="[eudrBgClass, eudrCardClass]">
              <span class="text-4xl mb-2">{{ eudrIcon }}</span>
              <span class="text-lg font-bold" :class="eudrTextClass">{{ eudrLabel }}</span>
            </div>
          </div>

          <!-- Last check info -->
          <div class="space-y-2 text-sm border-t border-gray-100 pt-3" v-if="location?.lastCheckDate">
            <div class="flex justify-between items-center">
              <span class="text-gray-500">Kiểm tra lần cuối</span>
              <span class="font-medium">{{ formatDate(location.lastCheckDate) }}</span>
            </div>
            <div class="flex justify-between items-center" v-if="location?.checkLog?.treeCoverLossHa != null">
              <span class="text-gray-500">Mất rừng phát hiện</span>
              <span class="font-medium" :class="location.checkLog.treeCoverLossHa > 0 ? 'text-red-600' : 'text-gray-900'">{{ location.checkLog.treeCoverLossHa }} ha</span>
            </div>
            <div class="flex justify-between items-center" v-if="location?.checkLog?.farmAreaHa != null">
              <span class="text-gray-500">Diện tích vùng</span>
              <span class="font-medium">{{ location.checkLog.farmAreaHa }} ha</span>
            </div>
            <div class="flex justify-between items-center" v-if="location?.checkLog?.geostoreId">
              <span class="text-gray-500">Geostore ID</span>
              <a :href="gfwMapUrl" target="_blank" class="font-medium text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 group">
                {{ location.checkLog.geostoreId.substring(0, 12) }}...
                <el-icon class="opacity-0 group-hover:opacity-100 transition-opacity"><TopRight /></el-icon>
              </a>
            </div>
          </div>

          <!-- Yearly summary -->
          <div v-if="location?.checkLog?.yearlySummary?.length" class="mt-3 border-t border-gray-100 pt-3">
            <div class="text-sm font-medium text-gray-700 mb-2">Mất rừng theo năm</div>
            <div class="space-y-1">
              <div v-for="item in location.checkLog.yearlySummary" :key="item.year" class="flex justify-between text-sm items-center">
                <span class="text-gray-500">&bull; Năm {{ item.year }}</span>
                <span class="font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">{{ item.lossHa.toFixed(3) }} ha</span>
              </div>
            </div>
          </div>

          <!-- Error message -->
          <div v-if="location?.eudrStatus === 'ERROR' && location?.checkLog?.error" class="mt-3 bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 break-words">
            <strong>Lỗi hệ thống:</strong> {{ location.checkLog.error }}
          </div>

          <!-- Action Buttons -->
          <div class="mt-5 flex flex-col gap-3">
            <el-button
              type="primary"
              class="w-full !m-0 font-medium"
              size="large"
              :loading="location?.eudrStatus === 'PENDING'"
              :disabled="!location?.boundary || location?.eudrStatus === 'PENDING'"
              @click="triggerEudrCheck"
              :icon="Search"
            >
              {{ location?.eudrStatus === 'PENDING' ? 'Đang phân tích dữ liệu vệ tinh...' : 'Kiểm tra chuẩn EUDR' }}
            </el-button>

            <!-- Row for secondary actions -->
            <div class="flex gap-3 w-full" v-if="location?.eudrStatus && location?.eudrStatus !== 'NOT_CHECKED' && location?.eudrStatus !== 'PENDING'">
              <el-button
                v-if="location?.eudrStatus === 'COMPLIANT' || location?.eudrStatus === 'NON_COMPLIANT'"
                type="success"
                class="flex-1 !m-0"
                @click="downloadReport"
                :icon="Download"
              >
                Tải báo cáo
              </el-button>

              <el-button
                type="info"
                class="flex-1 !m-0"
                plain
                @click="resetEudr"
              >
                Làm mới
              </el-button>
            </div>
          </div>

          <!-- No boundary warning -->
          <el-alert
            v-if="location && !location.boundary && !location.pendingBoundary"
            title="Chưa có ranh giới polygon"
            description="Vui lòng vẽ ranh giới vùng trồng trước khi kiểm tra EUDR."
            type="warning"
            show-icon
            :closable="false"
            class="mt-4"
          />
          
          <!-- Pending Boundary Warning -->
          <el-alert
            v-if="location && location.approvalStatus === 'PENDING'"
            title="Ranh giới đang chờ duyệt"
            description="Ranh giới vùng trồng đang chờ Ban quản lý phê duyệt. Trong thời gian này, bạn không thể kiểm tra EUDR."
            type="warning"
            show-icon
            :closable="false"
            class="mt-4"
          />
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Edit, Coordinate, MapLocation, DataAnalysis, Search, Download, TopRight, DocumentChecked, Link } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { farmApi, type Location, type KcsInspection } from '../api/farmApi';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const route = useRoute();
const router = useRouter();
const locationId = computed(() => route.params.id as string);

const location = ref<Location | null>(null);
const loading = ref(false);
const kcsInspections = ref<KcsInspection[]>([]);
let map: L.Map | null = null;
let pollingTimer: any = null;

const goBack = () => router.push('/farm/locations');

const openEditModal = () => {
  // Go back to list and trigger edit — or in-page edit if desired
  router.push({ path: '/farm/locations', query: { edit: locationId.value } });
};

// EUDR computed
const eudrIcon = computed(() => {
  switch (location.value?.eudrStatus) {
    case 'COMPLIANT': return '🟢';
    case 'NON_COMPLIANT': return '🔴';
    case 'PENDING': return '⏳';
    case 'ERROR': return '❌';
    default: return '⚪';
  }
});

const eudrLabel = computed(() => {
  switch (location.value?.eudrStatus) {
    case 'COMPLIANT': return 'Hợp lệ EUDR';
    case 'NON_COMPLIANT': return 'Vi phạm EUDR';
    case 'PENDING': return 'Đang kiểm tra...';
    case 'ERROR': return 'Lỗi kiểm tra';
    default: return 'Chưa kiểm tra';
  }
});

const eudrBgClass = computed(() => {
  switch (location.value?.eudrStatus) {
    case 'COMPLIANT': return 'bg-green-50';
    case 'NON_COMPLIANT': return 'bg-red-50';
    case 'PENDING': return 'bg-yellow-50';
    case 'ERROR': return 'bg-red-50';
    default: return 'bg-gray-50';
  }
});

const eudrTextClass = computed(() => {
  switch (location.value?.eudrStatus) {
    case 'COMPLIANT': return 'text-green-700';
    case 'NON_COMPLIANT': return 'text-red-700';
    case 'PENDING': return 'text-yellow-700';
    case 'ERROR': return 'text-red-700';
    default: return 'text-gray-500';
  }
});

const eudrCardClass = computed(() => {
  switch (location.value?.eudrStatus) {
    case 'COMPLIANT': return 'border-green-200';
    case 'NON_COMPLIANT': return 'border-red-200';
    default: return '';
  }
});

const gfwMapUrl = computed(() => {
  if (!location.value?.checkLog?.geostoreId) return '#';
  
  const geostoreId = location.value.checkLog.geostoreId;
  let lat = 14.0583; // Vietnam default
  let lng = 108.2772;
  let zoom = 13; // Balanced zoom (16 was too close, 14 still a bit much)

  // Try to find the best center point from the polygon boundary first
  if (location.value.boundary?.coordinates?.length) {
    const coords = location.value.boundary.coordinates[0];
    if (coords.length > 0) {
      // Use the first point of the polygon as the center roughly
      lng = coords[0][0];
      lat = coords[0][1];
    }
  } else if (location.value.coordinate?.coordinates) {
    lng = location.value.coordinate.coordinates[0];
    lat = location.value.coordinate.coordinates[1];
  }

  const mapState = {
    zoom,
    center: { lat, lng },
    panelHydrated: true
  };
  
  const mainMapState = {
    showAnalysis: true
  };

  const analysisState = {
    features: ['geostore']
  };

  const encodedMap = btoa(JSON.stringify(mapState));
  const encodedMainMap = btoa(JSON.stringify(mainMapState));
  const encodedAnalysis = btoa(JSON.stringify(analysisState));

  return `https://www.globalforestwatch.org/map/?geostore=${geostoreId}&map=${encodedMap}&mainMap=${encodedMainMap}&analysis=${encodedAnalysis}`;
});

const formatDate = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getFileUrl = (path: string) => {
  if (!path) return '#';
  if (path.startsWith('http')) return path;
  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
  return `${baseUrl}${path}`;
};

// --- Data Loading ---
const loadData = async () => {
  loading.value = true;
  try {
    const { data } = await farmApi.getLocationById(locationId.value);
    location.value = (data as any).data || data;
    
    // Load KCS
    const kcsRes = await farmApi.getKcsInspections(locationId.value);
    kcsInspections.value = (kcsRes.data as any).data || kcsRes.data || [];

    await nextTick();
    initMap();

    // If PENDING, start polling
    if (location.value?.eudrStatus === 'PENDING') {
      startEudrPolling();
    }
  } catch {
    ElMessage.error('Không thể tải thông tin vùng trồng');
    goBack();
  } finally {
    loading.value = false;
  }
};

// --- Map ---
const initMap = () => {
  const container = document.getElementById('detail-map');
  if (!container || !location.value) return;

  if (map) { map.remove(); map = null; }

  const loc = location.value;
  let center: [number, number] = [21.0, 105.8];
  let zoom = 12;

  if (loc.coordinate?.coordinates) {
    center = [loc.coordinate.coordinates[1], loc.coordinate.coordinates[0]];
    zoom = 15;
  }

  map = L.map('detail-map').setView(center, zoom);
  L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=' + import.meta.env.VITE_MAPBOX_TOKEN, {
    maxZoom: 20,
    attribution: '© Mapbox'
  }).addTo(map);

  // Draw boundary polygon
  const targetBoundary = (loc.approvalStatus === 'PENDING' && loc.pendingBoundary) 
      ? loc.pendingBoundary 
      : loc.boundary;

  if (targetBoundary?.coordinates) {
    const coords = targetBoundary.coordinates[0].map((c: number[]) => [c[1], c[0]]);
    // Orange dashed line if pending, Green solid if approved
    const isPending = loc.approvalStatus === 'PENDING' && loc.pendingBoundary;
    const color = isPending ? '#f59e0b' : '#16a34a';
    const polygon = L.polygon(coords, { 
        color, 
        fillOpacity: isPending ? 0.3 : 0.2, 
        weight: 3, 
        dashArray: isPending ? '5, 5' : '' 
    }).addTo(map);
    map.fitBounds(polygon.getBounds(), { padding: [30, 30] });
  }

  // Marker
  L.marker(center).addTo(map);

  // EUDR violation overlay
  if (loc.checkLog?.alerts?.length) {
    for (const alert of loc.checkLog.alerts) {
      if (alert.lat && alert.lng) {
        L.circleMarker([alert.lat, alert.lng], {
          radius: 6, color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.7, weight: 2,
        }).addTo(map).bindPopup(`<b>⚠️ Mất rừng</b><br/>Năm: ${alert.year || 'N/A'}<br/>Diện tích: ${alert.lossHa?.toFixed(3) || 'N/A'} ha`);
      }
    }
  }

  // Yearly summary overlays if available via geostore
  if (loc.checkLog?.yearlySummary?.length && loc.eudrStatus === 'NON_COMPLIANT') {
    // Show a subtle overlay info
  }
};

// --- EUDR Actions ---
const triggerEudrCheck = async () => {
  if (!location.value) return;
  try {
    await farmApi.requestEudrCheck(location.value.id);
    ElMessage.info('Đã gửi yêu cầu kiểm tra EUDR. Đang xử lý...');
    location.value.eudrStatus = 'PENDING';
    startEudrPolling();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không thể gửi yêu cầu kiểm tra EUDR');
  }
};

const startEudrPolling = () => {
  let attempts = 0;
  const maxAttempts = 40; // 40 * 3s = 120s

  if (pollingTimer) clearInterval(pollingTimer);

  pollingTimer = setInterval(async () => {
    attempts++;
    try {
      const res = await farmApi.getEudrStatus(locationId.value);
      const result = (res.data as any).data || res.data;
      if (result.eudrStatus !== 'PENDING') {
        clearInterval(pollingTimer);
        pollingTimer = null;
        // Reload full data
        await loadData();

        if (result.eudrStatus === 'COMPLIANT') {
          ElMessage.success('✅ Vùng trồng HỢP LỆ theo tiêu chuẩn EUDR!');
        } else if (result.eudrStatus === 'NON_COMPLIANT') {
          ElMessage.warning(`⚠️ Phát hiện vi phạm! Tỷ lệ: ${result.violationRate}%`);
        } else {
          ElMessage.error('❌ Kiểm tra EUDR gặp lỗi. Vui lòng thử lại.');
        }
      }
    } catch {
      // Silently retry
    }
    if (attempts >= maxAttempts) {
      clearInterval(pollingTimer);
      pollingTimer = null;
      ElMessage.warning('Kiểm tra EUDR đang mất nhiều thời gian. Vui lòng refresh trang.');
    }
  }, 3000);
};

const downloadReport = async () => {
  if (!location.value) return;
  try {
    const res = await farmApi.downloadEudrReport(location.value.id);
    const result = (res.data as any).data || res.data;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    window.open(`${baseUrl}${result.url}`, '_blank');
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không thể tạo báo cáo EUDR');
  }
};

const resetEudr = async () => {
  if (!location.value) return;
  try {
    await ElMessageBox.confirm('Đặt lại trạng thái EUDR về "Chưa kiểm tra"?', 'Xác nhận', {
      confirmButtonText: 'Đặt lại', cancelButtonText: 'Hủy', type: 'warning'
    });
    await farmApi.resetEudrStatus(location.value.id);
    ElMessage.success('Đã đặt lại trạng thái EUDR');
    await loadData();
  } catch { /* cancelled */ }
};

onMounted(loadData);
onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer);
  if (map) { map.remove(); map = null; }
});
</script>
