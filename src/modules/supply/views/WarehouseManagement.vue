<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Kho bãi</h1>
      <el-button type="primary" @click="showCreateModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Thêm kho mới
      </el-button>
    </div>

    <!-- Search and count -->
    <div class="flex items-center gap-4 mb-4">
      <el-input
        v-model="searchKeyword"
        placeholder="Tìm kiếm kho bãi..."
        clearable
        style="width: 240px"
        @input="debouncedSearch"
      />
      <span class="text-gray-500 text-sm">
        Tổng số: <strong>{{ totalWarehouses }}</strong> kho bãi
      </span>
    </div>

    <!-- Table -->
    <el-card shadow="hover" class="mb-6">
      <el-table :data="warehouses" v-loading="loading" style="width: 100%">
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">
            {{ (currentPage - 1) * pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="name" label="Tên kho" min-width="180" />
        <el-table-column prop="type" label="Phân loại" width="130">
            <template #default="{ row }">
                <el-tag size="small" :type="getWarehouseTypeTag(row.type)">{{ getWarehouseTypeLabel(row.type) }}</el-tag>
            </template>
        </el-table-column>
        <el-table-column prop="isDefault" label="Mặc định" width="100" align="center">
            <template #default="{ row }">
                <el-tag v-if="row.isDefault" size="small" type="danger" effect="dark">Mặc định</el-tag>
                <span v-else class="text-gray-400">-</span>
            </template>
        </el-table-column>
        <el-table-column label="Địa chỉ" min-width="250">
             <template #default="{ row }">
                 <div class="text-sm">
                    <div v-if="row.address">{{ row.address }}</div>
                    <div class="text-xs text-gray-500 mt-1">
                        {{ [row.projectedInfo?.ward, row.projectedInfo?.province].filter(Boolean).join(', ') }}
                    </div>
                </div>
            </template>
        </el-table-column>
        <el-table-column prop="manager_name" label="Thủ kho" width="180">
            <template #default="{ row }">
                <!-- Assuming backend returns expanded manager object or we just show Name if available -->
                {{ row.manager?.fullName || '---' }}
            </template>
        </el-table-column>
        <el-table-column prop="status" label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="100" align="center" fixed="right">
            <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditModal(row)">
                    Sửa
                </el-button>
            </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalWarehouses"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Create/Edit Modal -->
    <el-dialog
      v-model="showCreateModal"
      width="800px"
      @closed="resetForm"
      @opened="initMap"
      :show-close="false"
      :close-on-click-modal="false"
      destroy-on-close
      class="branded-warehouse-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
          <span style="color: #fff; font-size: 16px; font-weight: 600;">
            {{ isEditing ? 'Cập nhật Kho' : 'Thêm Kho mới' }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showCreateModal = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <el-form :model="form" label-position="top" :rules="rules" ref="formRef" style="padding: 24px 24px 8px; --el-border-radius-base: 8px;">
        <el-row :gutter="20">
            <el-col :span="12">
                 <el-form-item label="Tên kho" prop="name">
                    <el-input v-model.trim="form.name" placeholder="VD: Kho tập kết Bắc Ninh" maxlength="100" show-word-limit />
                 </el-form-item>
            </el-col>
             <el-col :span="12">
                  <el-form-item label="Phân loại" prop="type">
                    <el-select v-model="form.type" placeholder="Chọn loại kho" class="w-full">
                        <el-option label="Kho Sản xuất" value="PRODUCTION" />
                        <el-option label="Kho Thành phẩm" value="FINISHED_GOODS" />
                        <el-option label="Kho Phân phối" value="DISTRIBUTION" />
                    </el-select>
                  </el-form-item>
            </el-col>
        </el-row>
        
        <el-row :gutter="20">
             <el-col :span="12">
                  <el-form-item label="Thủ kho (User)" prop="managerId">
                    <div class="flex gap-2">
                        <el-select v-model="form.managerId" placeholder="Chọn thủ kho" class="flex-1" filterable>
                            <el-option 
                                v-for="user in warehouseManagers" 
                                :key="user.id" 
                                :label="user.fullName + ' (' + user.username + ')'" 
                                :value="user.id" 
                            />
                        </el-select>
                        <el-button type="success" :icon="Plus" @click="quickCreateRef?.open()">Thêm mới</el-button>
                    </div>
                  </el-form-item>
             </el-col>
             <el-col :span="12">
                  <el-form-item label="Kho mặc định" prop="isDefault">
                    <el-switch v-model="form.isDefault" active-text="Bật" inactive-text="Tắt" />
                    <div class="text-xs text-gray-400 mt-1">Sử dụng để tự động nhập kho sau khi đóng gói.</div>
                  </el-form-item>
             </el-col>
        </el-row>
        
        <el-row :gutter="20">
            <el-col :span="12">
                 <el-form-item label="Tỉnh / Thành phố" prop="province">
                    <el-select v-model="form.province" placeholder="Chọn Tỉnh" @change="onProvinceChange" filterable allow-create class="w-full">
                         <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
                    </el-select>
                 </el-form-item>
            </el-col>
            <el-col :span="12">
                  <el-form-item label="Phường / Xã" prop="ward">
                    <el-select v-model="form.ward" placeholder="Chọn Xã" @change="onWardChange" filterable allow-create class="w-full" :disabled="!form.province">
                        <el-option v-for="w in formWards" :key="w.name" :label="w.name" :value="w.name" />
                    </el-select>
                 </el-form-item>
            </el-col>
        </el-row>
        
        <el-form-item label="Địa chỉ chi tiết" prop="address">
           <el-input v-model.trim="form.address" placeholder="Thôn, Xóm, Số nhà..." maxlength="255" show-word-limit />
        </el-form-item>

        <el-divider content-position="left">Tọa độ (GPS)</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Vĩ độ (Lat)" prop="lat">
              <el-input :model-value="form.lat" disabled placeholder="Tự động theo bản đồ" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Kinh độ (Long)" prop="long">
              <el-input :model-value="form.long" disabled placeholder="Tự động theo bản đồ" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>
        <div id="map" style="height: 300px; margin-top: 10px; border-radius: 4px; z-index: 1;"></div>
        <div class="text-xs text-gray-500 mb-4 mt-2">
          * Kéo thả ghim hoặc click trên bản đồ để cập nhật tọa độ chính xác.
        </div>
        
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showCreateModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button 
            type="primary" 
            :loading="submitting" 
            :disabled="isEditing && !isFormChanged"
            @click="submitForm"
            style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff; background: #00875A;"
          >
            {{ isEditing ? 'Cập nhật' : 'Tạo mới' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <QuickCreateUser 
      ref="quickCreateRef" 
      role="WAREHOUSE_MANAGER" 
      role-label="Thủ kho" 
      @success="handleManagerCreated" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, nextTick, watch, computed } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
import { transportApi, type Warehouse } from '../api/transportApi';
import QuickCreateUser from '../../core/components/QuickCreateUser.vue';
import type { FormInstance, FormRules } from 'element-plus';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { vietnamUnits } from '@/common/data/vietnam-units';
import { provinceCoordinates } from '@/common/data/province-coordinates';

const warehouses = ref<Warehouse[]>([]);
const warehouseManagers = ref<any[]>([]); // List of potential managers

const getWarehouseTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    PRODUCTION: 'Kho Sản xuất',
    FINISHED_GOODS: 'Kho Thành phẩm',
    FINISHED: 'Kho Thành phẩm',
    DISTRIBUTION: 'Kho Phân phối',
    MATERIAL: 'Kho Nguyên liệu',
    STORAGE: 'Kho Lưu trữ'
  };
  return map[type] || type;
};

const getWarehouseTypeTag = (type: string) => {
  const map: Record<string, string> = {
    PRODUCTION: 'warning',
    MATERIAL: 'warning',
    FINISHED_GOODS: 'success',
    FINISHED: 'success',
    DISTRIBUTION: 'primary',
    STORAGE: 'info'
  };
  return map[type] || 'info';
};
const loading = ref(false);
const showCreateModal = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const currentPage = ref(1);
const pageSize = ref(10);
const totalWarehouses = ref(0);
const searchKeyword = ref('');

// Load managers
import { userApi } from '@/modules/core/api/user';
const loadManagers = async () => {
    try {
        const res = await userApi.getList({ page: 1, limit: 100, roleName: 'WAREHOUSE_MANAGER' });
        warehouseManagers.value = res.data.data || [];
    } catch (e) {
        console.error('Failed to load managers', e);
    }
};

const quickCreateRef = ref<any>(null);
const handleManagerCreated = (newUser: any) => {
    loadManagers();
    form.managerId = newUser.id;
};

// Filter states
const provinces = ref(vietnamUnits);
const formWards = ref<any[]>([]);

const loadWards = () => {
    const prov = provinces.value.find(p => p.name === form.province);
    formWards.value = prov ? prov.wards : [];
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const normalizeLocationName = (s: string) => {
    if (!s) return '';
    return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/^(tinh|thanh pho|tp\.|tp|quan|huyen|thi xa|tx\.|xa|phuong|thi tran|tt\.)\s+/i, '')
        .trim();
};

const reverseGeocodeToForm = async (lat: number, lng: number) => {
    try {
        if (MAPBOX_TOKEN) {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                
                // 1. Detailed address
                let detailedAddress = feature.text || '';
                if (feature.address) {
                    detailedAddress = `${feature.address} ${detailedAddress}`;
                }
                if (detailedAddress) {
                    form.address = detailedAddress;
                }

                // 2. Separate Hierarchical Candidates
                const wardCandidates: string[] = [];      // Cấp 1: neighborhood, locality, suburb
                const districtCandidates: string[] = [];  // Cấp 2: place (Quận/Huyện)
                const provinceCandidates: string[] = [];  // Cấp 3: region (Tỉnh/Thành)
                const allCandidates: string[] = [];

                data.features.forEach((f: any) => {
                    const text = f.text_vi || f.text;
                    const placeName = f.place_name_vi || f.place_name;
                    if (text) allCandidates.push(text);
                    if (placeName) allCandidates.push(placeName);

                    if (f.id && (f.id.startsWith('locality') || f.id.startsWith('neighborhood'))) {
                        if (text) wardCandidates.push(text);
                    }
                    if (f.id && f.id.startsWith('place')) {
                        if (text) districtCandidates.push(text);
                    }
                    if (f.id && f.id.startsWith('region')) {
                        if (text) provinceCandidates.push(text);
                    }

                    if (f.context) {
                        f.context.forEach((c: any) => {
                            const cText = c.text_vi || c.text;
                            if (cText) allCandidates.push(cText);
                            if (c.id.startsWith('locality') || c.id.startsWith('neighborhood')) {
                                if (cText) wardCandidates.push(cText);
                            } else if (c.id.startsWith('place')) {
                                if (cText) districtCandidates.push(cText);
                            } else if (c.id.startsWith('region')) {
                                if (cText) provinceCandidates.push(cText);
                            }
                        });
                    }
                });

                // 3. Match Province
                let matchedProv = null;
                const provSearchPool = [...provinceCandidates, ...allCandidates];
                for (const prov of provinces.value) {
                    const normP = normalizeLocationName(prov.name);
                    const found = provSearchPool.some((str: string) => {
                        const normStr = normalizeLocationName(str);
                        return normStr === normP || normStr.includes(normP) || normP.includes(normStr);
                    });
                    if (found) {
                        matchedProv = prov;
                        break;
                    }
                }

                if (matchedProv) {
                    form.province = matchedProv.name;
                    loadWards();

                    // 4. Match Ward (Phân cấp chính xác 3 bước)
                    let matchedWard = null;
                    if (formWards.value && formWards.value.length > 0) {
                        // Bước 4.1: Khớp CHÍNH XÁC 100% với cấp Phường/Xã (wardCandidates)
                        for (const w of formWards.value) {
                            const normW = normalizeLocationName(w.name);
                            const found = wardCandidates.some((str: string) => {
                                const normStr = normalizeLocationName(str);
                                return normW === normStr;
                            });
                            if (found) {
                                matchedWard = w;
                                break;
                            }
                        }

                        // Bước 4.2: Nếu chưa tìm thấy, so khớp CHÍNH XÁC NGUYÊN CỤM TỪ với districtCandidates (e.g. Phường Hà Đông, Phường Cầu Giấy)
                        if (!matchedWard) {
                            for (const w of formWards.value) {
                                const normW = normalizeLocationName(w.name);
                                const found = districtCandidates.some((str: string) => {
                                    const normStr = normalizeLocationName(str);
                                    return normW === normStr; // STRICT EQUALITY ONLY! Chặn đứng "nam tu liem" khớp "tu liem"
                                });
                                if (found) {
                                    matchedWard = w;
                                    break;
                                }
                            }
                        }

                        // Bước 4.3: Nếu vẫn chưa thấy, kiểm tra contains trên wardCandidates
                        if (!matchedWard) {
                            for (const w of formWards.value) {
                                const normW = normalizeLocationName(w.name);
                                const found = wardCandidates.some((str: string) => {
                                    const normStr = normalizeLocationName(str);
                                    return normStr.includes(normW) || normW.includes(normStr);
                                });
                                if (found) {
                                    matchedWard = w;
                                    break;
                                }
                            }
                        }
                    }

                    if (matchedWard) {
                        form.ward = matchedWard.name;
                    }
                }
                return;
            }
        }

        // Fallback: Photon API
        const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
        const res = await fetch(photonUrl);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
            const props = data.features[0].properties;
            if (props.name || props.street) {
                form.address = [props.housenumber, props.name || props.street].filter(Boolean).join(' ');
            }
            const candidateStrings = [props.city, props.state, props.district, props.locality, props.name, props.street].filter(Boolean);
            
            let matchedProv = null;
            for (const prov of provinces.value) {
                const normP = normalizeLocationName(prov.name);
                const found = candidateStrings.some((str: string) => {
                    const normStr = normalizeLocationName(str);
                    return normStr === normP || normStr.includes(normP) || normP.includes(normStr);
                });
                if (found) {
                    matchedProv = prov;
                    break;
                }
            }

            if (matchedProv) {
                form.province = matchedProv.name;
                loadWards();
                let matchedWard = null;
                const wardPool = [props.district, props.locality].filter(Boolean);
                if (formWards.value && formWards.value.length > 0) {
                    for (const w of formWards.value) {
                        const normW = normalizeLocationName(w.name);
                        const found = wardPool.some((str: string) => {
                            const normStr = normalizeLocationName(str);
                            return normW === normStr;
                        });
                        if (found) {
                            matchedWard = w;
                            break;
                        }
                    }
                }
                if (matchedWard) {
                    form.ward = matchedWard.name;
                }
            }
        }
    } catch (e) {
        console.error('Reverse geocoding error:', e);
    }
};

const onProvinceChange = async () => {
    form.ward = '';
    loadWards();
    
    // Auto center map
    if (form.province && provinceCoordinates[form.province]) {
        const coords = provinceCoordinates[form.province];
        form.lat = coords.lat;
        form.long = coords.lng;
        
        if (map && marker) {
            const newPos = new L.LatLng(coords.lat, coords.lng);
            marker.setLatLng(newPos);
            map.setView(newPos, 14);
        }
    }
};

const onWardChange = async () => {
    if (!form.ward || !form.province) return;
    try {
        const query = `${form.ward}, ${form.province}, Việt Nam`;
        if (MAPBOX_TOKEN) {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=1`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const [lon, lat] = data.features[0].center;
                form.lat = Number(lat.toFixed(6));
                form.long = Number(lon.toFixed(6));
                if (map && marker) {
                    const newPos = new L.LatLng(form.lat, form.long);
                    marker.setLatLng(newPos);
                    map.setView(newPos, 16);
                }
                return;
            }
        }

        // Fallback: Photon
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(`${form.ward}, ${form.province}`)}&limit=1`;
        const res = await fetch(photonUrl);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            form.lat = Number(lat.toFixed(6));
            form.long = Number(lon.toFixed(6));
            if (map && marker) {
                const newPos = new L.LatLng(form.lat, form.long);
                marker.setLatLng(newPos);
                map.setView(newPos, 16);
            }
        }
    } catch (e) {
        console.error('Geocoding failed', e);
    }
};

// Map related
let map: L.Map | null = null;
let marker: L.Marker | null = null;

// Edit state
const isEditing = ref(false);
const currentId = ref<string | null>(null);
const originalForm = ref<string>('');

const isFormChanged = computed(() => {
    return JSON.stringify(form) !== originalForm.value;
});

const form = reactive({
  name: '',
  address: '',
  province: '',
  ward: '',
  managerId: '',
  type: 'PRODUCTION',
  lat: 21.0,
  long: 105.8,
  isDefault: false
});

const rules = reactive<FormRules>({
  name: [
      { required: true, message: 'Vui lòng nhập tên kho', trigger: 'blur' },
      { whitespace: true, message: 'Tên kho không được chỉ chứa khoảng trắng', trigger: 'blur' },
      { max: 100, message: 'Tên kho không được vượt quá 100 ký tự', trigger: 'blur' }
  ],
  province: [{ required: true, message: 'Chọn Tỉnh/Thành', trigger: 'change' }],
  ward: [{ required: true, message: 'Chọn Phường/Xã', trigger: 'change' }],
  address: [
      { required: true, message: 'Vui lòng nhập địa chỉ chi tiết', trigger: 'blur' },
      { whitespace: true, message: 'Địa chỉ không được chỉ chứa khoảng trắng', trigger: 'blur' },
      { max: 255, message: 'Địa chỉ không được vượt quá 255 ký tự', trigger: 'blur' }
  ],
  managerId: [{ required: true, message: 'Vui lòng chọn Thủ kho', trigger: 'change' }],
  lat: [{ required: true, message: 'Nhập Vĩ độ', trigger: 'blur' }],
  long: [{ required: true, message: 'Nhập Kinh độ', trigger: 'blur' }]
});

const initMap = async () => {
    await nextTick();
    if (map) return; // Map already initialized

    map = L.map('map', {
        minZoom: 4,
        maxBounds: [
            [-85, -180],
            [85, 180]
        ],
        maxBoundsViscosity: 1.0
    }).setView([form.lat, form.long], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        noWrap: true
    }).addTo(map);

    marker = L.marker([form.lat, form.long], { draggable: true }).addTo(map);

    marker.on('dragend', (e) => {
        const latLng = e.target.getLatLng();
        form.lat = Number(latLng.lat.toFixed(6));
        form.long = Number(latLng.lng.toFixed(6));
        reverseGeocodeToForm(form.lat, form.long);
    });

    map.on('click', (e) => {
        form.lat = Number(e.latlng.lat.toFixed(6));
        form.long = Number(e.latlng.lng.toFixed(6));
        if (marker) marker.setLatLng(e.latlng);
        reverseGeocodeToForm(form.lat, form.long);
    });

    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 250);
};

watch(() => [form.lat, form.long], ([newLat, newLong]) => {
    if (marker && map) {
        const cur = marker.getLatLng();
        if (Number(cur.lat.toFixed(6)) !== Number(newLat) || Number(cur.lng.toFixed(6)) !== Number(newLong)) {
             const newPos = new L.LatLng(newLat as number, newLong as number);
             marker.setLatLng(newPos);
             map.panTo(newPos); 
        }
    }
});

const loadData = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value,
    };
    if (searchKeyword.value) {
      params.search = searchKeyword.value;
    }
    const { data } = await transportApi.getWarehouses(params);
    warehouses.value = data.data || [];
    totalWarehouses.value = data.total || 0;
  } catch (err) {
    ElMessage.error('Không thể tải danh sách kho');
  } finally {
    loading.value = false;
  }
};

let debounceTimer: any = null;
const debouncedSearch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    handleFilterChange();
  }, 300);
};

const handleFilterChange = () => {
  currentPage.value = 1;
  loadData();
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
  loadData();
};

const handlePageChange = (val: number) => {
  currentPage.value = val;
  loadData();
};

const openEditModal = (row: Warehouse) => {
    isEditing.value = true;
    currentId.value = row.id;
    
    form.name = row.name;
    form.address = row.address || '';
    form.province = row.projectedInfo?.province || '';
    form.ward = row.projectedInfo?.ward || '';
    form.managerId = row.managerId || '';
    form.type = (row as any).type || 'PRODUCTION';
    
    if (row.coordinate && row.coordinate.coordinates) {
        form.long = row.coordinate.coordinates[0];
        form.lat = row.coordinate.coordinates[1];
    }
    
    form.isDefault = !!row.isDefault;
    
    loadWards();
    loadManagers(); // Refresh user list
    
    // Restore ward selection
    nextTick(() => {
        form.ward = row.projectedInfo?.ward || '';
        originalForm.value = JSON.stringify(form);
    });

    showCreateModal.value = true;
}

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        const payload = {
            ...form,
            projectedInfo: {
                province: form.province,
                ward: form.ward
            }
        };

        if (isEditing.value && currentId.value) {
            await transportApi.updateWarehouse(currentId.value, payload);
             ElMessage.success('Cập nhật kho thành công');
        } else {
            await transportApi.createWarehouse(payload);
             ElMessage.success('Tạo kho thành công');
        }
        
        showCreateModal.value = false;
        loadData();
      } catch (err: any) {
        console.error(err);
        ElMessage.error('Có lỗi xảy ra');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const resetForm = () => {
  if (formRef.value) formRef.value.resetFields();
  form.province = '';
  form.ward = '';
  isEditing.value = false;
  currentId.value = null;
  originalForm.value = '';
  
  // Clean up map instance to prevent memory leaks and ghost events
  if (map) {
      map.remove();
      map = null;
      marker = null;
  }
};

onMounted(() => {
    loadData();
    loadManagers();
});
</script>

<style>
.branded-warehouse-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-warehouse-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-warehouse-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-warehouse-dialog .el-dialog__footer {
  padding: 0 !important;
}
.leaflet-container {
  background-color: #aadaff !important;
}
</style>
