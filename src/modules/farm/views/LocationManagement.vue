<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Vùng trồng</h1>
      <el-button type="primary" @click="showCreateModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Thêm vùng trồng
      </el-button>
    </div>

    <!-- Search Toolbar -->
    <div class="mb-4 flex gap-4 flex-wrap">
        <el-input v-model="searchKeyword" placeholder="Tìm theo tên hoặc mã vùng..." class="w-64" clearable prefix-icon="Search" @input="loadData" />
        <el-select v-model="filter.province" placeholder="Tỉnh/Thành" clearable class="w-48" @change="handleFilterProvinceChange">
             <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
        </el-select>
        <el-select v-model="filter.ward" placeholder="Phường/Xã" clearable class="w-48" @change="loadData" :disabled="!filter.province">
             <el-option v-for="w in filterWards" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
    </div>

    <!-- Table -->
    <el-card shadow="hover" class="mb-6">
      <el-table :data="locations" v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column prop="name" label="Vùng trồng" min-width="220">
          <template #default="{ row }">
            <router-link :to="`/farm/locations/${row.id}`" class="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline">
              {{ row.name }}
            </router-link>
            <div class="text-xs text-gray-400 mt-0.5">{{ [row.code, row.plantType].filter(Boolean).join(' · ') }}</div>
          </template>
        </el-table-column>
        <el-table-column label="EUDR" width="180" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.eudrStatus === 'COMPLIANT'" type="success" effect="dark" size="default">🟢 Hợp lệ</el-tag>
            <el-tag v-else-if="row.eudrStatus === 'NON_COMPLIANT'" type="danger" effect="dark" size="default">
              🔴 Vi phạm {{ row.violationRate ? `(${row.violationRate}%)` : '' }}
            </el-tag>
            <el-tag v-else-if="row.eudrStatus === 'PENDING'" type="warning" effect="dark" size="default">
              <el-icon class="is-loading mr-1"><Loading /></el-icon> Đang kiểm tra
            </el-tag>
            <el-tag v-else-if="row.eudrStatus === 'ERROR'" type="danger" effect="dark" size="default">❌ Lỗi</el-tag>
            <el-tag v-else type="info" size="default">⚪ Chưa kiểm tra</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Địa chỉ" min-width="220">
             <template #default="{ row }">
                 <div class="text-sm">
                    <div>{{ [row.ward, row.province].filter(Boolean).join(', ') || '—' }}</div>
                    <div v-if="row.managerName" class="text-xs text-gray-400 mt-0.5">👤 {{ row.managerName }}</div>
                </div>
            </template>
        </el-table-column>
        <el-table-column prop="areaM2" label="Diện tích" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.areaM2">{{ row.areaM2?.toLocaleString() }} m²</span>
            <span v-else class="text-gray-400">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="TT" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="120" align="center" fixed="right">
            <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditModal(row)">
                    Sửa
                </el-button>
                <el-button type="info" link size="small" @click="$router.push(`/farm/locations/${row.id}`)">
                    Chi tiết
                </el-button>
            </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create/Edit Modal -->
    <el-dialog
      v-model="showCreateModal"
      :title="isEditing ? 'Cập nhật Vùng trồng' : 'Thêm Vùng trồng mới'"
      width="90%"
      style="max-width: 800px"
      class="responsive-dialog"
      @closed="resetForm"
      @opened="initMap"
    >
      <el-form :model="form" label-position="top" :rules="rules" ref="formRef">
        <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
                 <el-form-item label="Tên vùng trồng" prop="name">
                    <el-input v-model="form.name" placeholder="VD: Ruộng Cầu 2" />
                 </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
                 <el-form-item label="Mã số (Tùy chọn)" prop="code">
                    <el-input v-model="form.code" placeholder="VD: VT-01" />
                 </el-form-item>
            </el-col>
        </el-row>
        
        <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
                 <el-form-item label="Tỉnh / Thành phố" prop="province">
                    <el-select v-model="form.province" placeholder="Chọn Tỉnh" @change="onProvinceChange" filterable allow-create class="w-full">
                         <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
                    </el-select>
                 </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
                  <el-form-item label="Phường / Xã" prop="ward">
                    <el-select v-model="form.ward" placeholder="Chọn Xã" filterable allow-create class="w-full" :disabled="!form.province">
                        <el-option v-for="w in formWards" :key="w.name" :label="w.name" :value="w.name" />
                    </el-select>
                 </el-form-item>
            </el-col>
        </el-row>
        
        <el-form-item label="Địa chỉ chi tiết" prop="address">
           <el-input v-model="form.address" placeholder="Thôn, Xóm, Số nhà..." />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
             <el-form-item label="Diện tích (m2)" prop="area_m2">
               <el-input-number v-model="form.area_m2" :min="500" class="w-full" />
             </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
             <el-form-item label="Loại cây trồng" prop="plant_type">
               <el-input v-model="form.plant_type" placeholder="VD: Lúa, Vải..." />
             </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Người quản lý" prop="manager_name">
           <el-input v-model="form.manager_name" placeholder="Tên cán bộ phụ trách" />
        </el-form-item>

        <el-divider content-position="left">Tọa độ (GPS)</el-divider>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="Vĩ độ (Lat)" prop="lat">
              <el-input-number v-model="form.lat" :precision="6" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="Kinh độ (Long)" prop="long">
              <el-input-number v-model="form.long" :precision="6" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>
        <div id="map" style="height: 350px; margin-top: 10px; border-radius: 4px; z-index: 1;"></div>
        <div class="text-xs text-gray-500 mb-4 mt-2">
          * Sử dụng công cụ vẽ (hình ngũ giác) bên trái bản đồ để khoanh vùng diện tích. Diện tích m² sẽ được tự động tính toán.
        </div>

        <el-alert 
            v-if="isEditing && currentApprovalStatus === 'PENDING'"
            title="Vùng trồng đang chờ Admin duyệt ranh giới mới. Bạn không nên đổi ranh giới trong lúc này."
            type="warning" 
            show-icon 
            class="mb-4" 
            :closable="false"
        />

        <el-form-item v-if="isEditing" label="Lý do cập nhật ranh giới (NẾU CÓ THAY ĐỔI TRÊN BẢN ĐỒ)" prop="updateReason">
           <el-input v-model="form.updateReason" type="textarea" placeholder="Nhập lý do thay đổi để Admin phê duyệt..." />
        </el-form-item>
        
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreateModal = false">Hủy</el-button>
          <el-button type="primary" :loading="submitting" @click="submitForm">
            {{ isEditing ? 'Cập nhật' : 'Tạo mới' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, nextTick, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Search, Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { farmApi, type Location } from '../api/farmApi';
import type { FormInstance, FormRules } from 'element-plus';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import * as turf from '@turf/turf';
import { vietnamUnits } from '@/common/data/vietnam-units';
import { provinceCoordinates } from '@/common/data/province-coordinates';

const locations = ref<Location[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

// Filter states
const searchKeyword = ref('');
const filter = reactive({
    province: '',
    ward: ''
});
const provinces = ref(vietnamUnits);
const filterWards = ref<any[]>([]);
const formWards = ref<any[]>([]);

const handleFilterProvinceChange = () => {
    filter.ward = '';
    const prov = provinces.value.find(p => p.name === filter.province);
    filterWards.value = prov ? prov.wards : [];
    loadData();
};

const loadWards = () => {
    const prov = provinces.value.find(p => p.name === form.province);
    formWards.value = prov ? prov.wards : [];
};

const onProvinceChange = async () => {
    // Clear ward when province changes
    form.ward = '';
    // Load wards for the new province
    loadWards();
    
    // Auto center map only on user change
    if (form.province && provinceCoordinates[form.province]) {
        const coords = provinceCoordinates[form.province];
        form.lat = coords.lat;
        form.long = coords.lng;
        
        // Force reload map
        await nextTick();
        if (map) {
            map.remove();
            map = null;
        }
        
        // Re-init with new center
        initMap();
    }
};

// Map related
let map: L.Map | null = null;
let marker: L.Marker | null = null;

// Edit state
const isEditing = ref(false);
const currentId = ref<string | null>(null);
const currentApprovalStatus = ref<string>('APPROVED');
const currentEudrCheckLog = ref<any>(null);
const boundaryChanged = ref(false);

// --- EUDR Check ---
const pollingTimer = ref<any>(null);

const triggerEudrCheck = async (row: Location) => {
    try {
        await farmApi.requestEudrCheck(row.id);
        ElMessage.info('Đã gửi yêu cầu kiểm tra EUDR. Đang xử lý...');
        // Start polling
        startEudrPolling(row.id);
        // Update table immediately
        const loc = locations.value.find(l => l.id === row.id);
        if (loc) loc.eudrStatus = 'PENDING';
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || 'Không thể gửi yêu cầu kiểm tra EUDR');
    }
};

const startEudrPolling = (locationId: string) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 * 3s = 60s max

    if (pollingTimer.value) clearInterval(pollingTimer.value);

    pollingTimer.value = setInterval(async () => {
        attempts++;
        try {
            const { data } = await farmApi.getEudrStatus(locationId);
            if (data.eudrStatus !== 'PENDING') {
                clearInterval(pollingTimer.value);
                pollingTimer.value = null;

                // Update table row
                const loc = locations.value.find(l => l.id === locationId);
                if (loc) {
                    loc.eudrStatus = data.eudrStatus;
                    loc.violationRate = data.violationRate;
                    loc.lastCheckDate = data.lastCheckDate;
                    loc.checkLog = data.checkLog;
                }

                if (data.eudrStatus === 'COMPLIANT') {
                    ElMessage.success('✅ Vùng trồng HỢP LỆ theo tiêu chuẩn EUDR!');
                } else if (data.eudrStatus === 'NON_COMPLIANT') {
                    ElMessage.warning(`⚠️ Phát hiện vi phạm! Tỷ lệ: ${data.violationRate}%`);
                } else {
                    ElMessage.error('❌ Kiểm tra EUDR gặp lỗi. Vui lòng thử lại.');
                }
            }
        } catch {
            // Silently retry
        }

        if (attempts >= maxAttempts) {
            clearInterval(pollingTimer.value);
            pollingTimer.value = null;
            ElMessage.warning('Kiểm tra EUDR đang mất nhiều thời gian. Vui lòng refresh trang sau.');
        }
    }, 3000);
};

const downloadEudrReport = async (row: Location) => {
    try {
        const { data } = await farmApi.downloadEudrReport(row.id);
        // Open PDF in new tab
        const baseUrl = import.meta.env.VITE_API_URL || '';
        window.open(`${baseUrl}${data.url}`, '_blank');
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || 'Không thể tạo báo cáo EUDR');
    }
};

const form = reactive({
  name: '',
  code: '',
  address: '',
  province: '',
  ward: '',
  area_m2: 0,
  plant_type: '',
  manager_name: '',
  lat: 21.0,
  long: 105.8,
  boundary: [] as any[],
  updateReason: ''
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: 'Vui lòng nhập tên', trigger: 'blur' }],
  province: [{ required: true, message: 'Chọn Tỉnh/Thành', trigger: 'change' }],
  ward: [{ required: true, message: 'Chọn Xã/Phường', trigger: 'change' }],
  lat: [{ required: true, message: 'Nhập Vĩ độ', trigger: 'blur' }],
  long: [{ required: true, message: 'Nhập Kinh độ', trigger: 'blur' }]
});

const initMap = async () => {
    await nextTick();
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    if (map) {
        map.remove(); // Clean up existing map
    }

    map = L.map('map').setView([form.lat, form.long], 12);
    
    L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=' + import.meta.env.VITE_MAPBOX_TOKEN, {
        maxZoom: 20,
        attribution: '© Mapbox'
    }).addTo(map);

    // Geoman controls
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: true,
      drawCircle: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
    });
    
    // Set localization
    map.pm.setLang('vi' as any);

    // Add marker for point (optional, mostly for backward compatibility)
    // We will focus on Polygons for boundaries now
    marker = L.marker([form.lat, form.long], { draggable: true }).addTo(map);
    
    // Layer group for polygon
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Load existing polygon if any
    if (form.boundary && form.boundary.length > 0) {
        // leaf polygon expects lat, lng
        const polyCoords = form.boundary[0].map((coord: number[]) => [coord[1], coord[0]]);
        
        // Show differently if it's pending approval
        const isPending = isEditing.value && currentApprovalStatus.value === 'PENDING';
        const color = isPending ? '#f59e0b' : '#16a34a'; // Orange if pending, green if approved
        
        const polygon = L.polygon(polyCoords, { color, fillOpacity: isPending ? 0.3 : 0.2, dashArray: isPending ? '5, 5' : '' });
        drawnItems.addLayer(polygon);
        map.fitBounds(polygon.getBounds(), { padding: [20, 20] });
    } else {
        map.setView([form.lat, form.long], 15);
    }

    // Geoman Events
    map.on('pm:create', (e: any) => {
        drawnItems.clearLayers(); // Only 1 polygon allowed
        drawnItems.addLayer(e.layer);
        
        const geojson = e.layer.toGeoJSON();
        const areaSqMeters = turf.area(geojson);
        form.area_m2 = Math.round(areaSqMeters);
        form.boundary = geojson.geometry.coordinates; // [ [ [lng, lat], ... ] ]
        boundaryChanged.value = true;
        
        // Update marker to center of polygon
        const center = turf.centerOfMass(geojson);
        form.long = Number(center.geometry.coordinates[0].toFixed(6));
        form.lat = Number(center.geometry.coordinates[1].toFixed(6));
        if (marker) marker.setLatLng([form.lat, form.long]);
    });

    map.on('pm:remove', () => {
        drawnItems.clearLayers();
        form.boundary = [];
        boundaryChanged.value = true;
    });

    // Also handle edits to the drawn layer
    map.on('pm:globaleditmodetoggled', (e: any) => {
        if (!e.enabled) {
            // Edit mode disabled, capture changes
            const layers = drawnItems.getLayers();
            if (layers.length > 0) {
                const layer = layers[0] as any;
                const geojson = layer.toGeoJSON();
                const areaSqMeters = turf.area(geojson);
                form.area_m2 = Math.round(areaSqMeters);
                form.boundary = geojson.geometry.coordinates;
                boundaryChanged.value = true;
                
                const center = turf.centerOfMass(geojson);
                form.long = Number(center.geometry.coordinates[0].toFixed(6));
                form.lat = Number(center.geometry.coordinates[1].toFixed(6));
                if (marker) marker.setLatLng([form.lat, form.long]);
            }
        }
    });

    // Event: Marker Drag
    marker.on('dragend', (e) => {
        const latLng = e.target.getLatLng();
        form.lat = Number(latLng.lat.toFixed(6));
        form.long = Number(latLng.lng.toFixed(6));
    });

    // Event: Map Click (fallback if no polygon)
    map.on('click', (e) => {
        if (form.boundary.length === 0) {
            form.lat = Number(e.latlng.lat.toFixed(6));
            form.long = Number(e.latlng.lng.toFixed(6));
            if (marker) marker.setLatLng(e.latlng);
        }
    });

    // Load EUDR violation overlay if NON_COMPLIANT
    if (isEditing.value && currentEudrCheckLog.value?.alerts?.length > 0) {
        const alertMarkers = currentEudrCheckLog.value.alerts;
        for (const alert of alertMarkers) {
            if (alert.lat && alert.lng) {
                L.circleMarker([alert.lat, alert.lng], {
                    radius: 6,
                    color: '#dc2626',
                    fillColor: '#ef4444',
                    fillOpacity: 0.7,
                    weight: 2,
                }).addTo(map).bindPopup(`<b>⚠️ Mất rừng</b><br/>Năm: ${alert.year || 'N/A'}<br/>Diện tích: ${alert.lossHa?.toFixed(3) || 'N/A'} ha`);
            }
        }
    }
};

// Update marker when inputs change manually
watch(() => [form.lat, form.long], ([newLat, newLong]) => {
    // Only update if map exists and coords are different
    if (marker && map) {
        const cur = marker.getLatLng();
        if (cur.lat !== newLat || cur.lng !== newLong) {
             const newPos = new L.LatLng(newLat as number, newLong as number);
             marker.setLatLng(newPos);
             map.setView(newPos, map.getZoom()); 
        }
    }
});

const loadData = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filter.province) params.province = filter.province;
    if (filter.ward) params.ward = filter.ward;
    // Note: Search keyword filtering is currently done client-side if API doesn't support it, 
    // or pass to API if implemented. Current API implementation might not support 'search' param yet.
    // Based on Controller, we only added province/ward support. 
    // So we'll filter client-side for search for now if API returns all.
    
    const { data } = await farmApi.getLocations(params);
    let result = data || [];
    
    if (searchKeyword.value) {
        const lowerKey = searchKeyword.value.toLowerCase();
        result = result.filter((loc: any) => 
            (loc.name && loc.name.toLowerCase().includes(lowerKey)) || 
            (loc.code && loc.code.toLowerCase().includes(lowerKey))
        );
    }
    
    locations.value = result;
  } catch (err) {
    ElMessage.error('Không thể tải danh sách vùng trồng');
  } finally {
    loading.value = false;
  }
};

const openEditModal = (row: Location) => {
    isEditing.value = true;
    currentId.value = row.id;
    
    // Populate form
    form.name = row.name;
    form.code = row.code;
    form.address = row.address;
    form.province = row.province || '';
    form.ward = row.ward || '';
    form.area_m2 = row.areaM2;
    form.plant_type = row.plantType || '';
    form.manager_name = row.managerName || '';
    
    // Handle coordinates (GeoJSON Point)
    if (row.coordinate && row.coordinate.coordinates) {
        form.long = row.coordinate.coordinates[0];
        form.lat = row.coordinate.coordinates[1];
    }
    
    // Handle polygon boundary
    let parsedBoundary = [];
    // Load pendingBoundary if waiting for approval, otherwise approved boundary
    const boundarySource = (row.approvalStatus === 'PENDING' && row.pendingBoundary)
        ? row.pendingBoundary 
        : row.boundary;

    if (boundarySource) {
        if (typeof boundarySource === 'string' && boundarySource.startsWith('{')) {
            try {
                const b = JSON.parse(boundarySource);
                parsedBoundary = b.coordinates;
            } catch(e) {}
        } else if (typeof boundarySource === 'object' && boundarySource.coordinates) {
            parsedBoundary = boundarySource.coordinates;
        }
    }
    form.boundary = parsedBoundary;
    form.updateReason = ''; // Reset update reason
    boundaryChanged.value = false; // Reset modification flag
    currentApprovalStatus.value = row.approvalStatus || 'APPROVED';
    currentEudrCheckLog.value = row.checkLog || null;
    // Load wards based on saved province
    // Do NOT trigger map auto-center here
    const prov = provinces.value.find(p => p.name === form.province);
    formWards.value = prov ? prov.wards : [];
    
    // Restore ward selection
    nextTick(() => {
        form.ward = row.ward || '';
    });

    showCreateModal.value = true;
}

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        const payload: any = {
            ...form,
            code: form.code || undefined,
            updateReason: form.updateReason || undefined
        };
        
        // Only send boundary if user modified it
        if (boundaryChanged.value) {
             payload.boundary = form.boundary.length > 0 ? form.boundary[0] : [];
        } else {
             delete payload.boundary;
        }

        if (isEditing.value && currentId.value) {
            await farmApi.updateLocation(currentId.value, payload);
             ElMessage.success('Cập nhật vùng trồng thành công');
        } else {
            await farmApi.createLocation(payload);
             ElMessage.success('Tạo vùng trồng thành công');
        }
        
        showCreateModal.value = false;
        loadData();
      } catch (err: any) {
        console.error(err);
        const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra';
        ElMessage.error(Array.isArray(msg) ? msg.join(', ') : msg);
      } finally {
        submitting.value = false;
      }
    }
  });
};

const resetForm = () => {
  if (formRef.value) formRef.value.resetFields();
  form.area_m2 = 0;
  form.province = '';
  form.ward = '';
  form.boundary = [];
  form.updateReason = '';
  boundaryChanged.value = false;
  isEditing.value = false;
  currentId.value = null;
  currentApprovalStatus.value = 'APPROVED';
};

const route = useRoute();

onMounted(async () => {
    await loadData();
    // Handle ?edit=locationId from detail page
    const editId = route.query.edit as string;
    if (editId) {
        const row = locations.value.find(l => l.id === editId);
        if (row) openEditModal(row);
    }
});
</script>
