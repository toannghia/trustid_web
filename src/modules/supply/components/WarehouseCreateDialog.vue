<template>
  <el-dialog
    v-model="visible"
    title="Thêm Kho mới"
    width="800px"
    @closed="resetForm"
    @opened="initMap"
    append-to-body
  >
    <el-form :model="form" label-position="top" :rules="rules" ref="formRef" v-loading="loadingData">
      <el-row :gutter="20">
          <el-col :span="12">
               <el-form-item label="Tên kho" prop="name">
                  <el-input v-model="form.name" placeholder="VD: Kho tập kết Bắc Ninh" />
               </el-form-item>
          </el-col>
           <el-col :span="12">
                <el-form-item label="Phân loại" prop="type">
                  <el-select v-model="form.type" placeholder="Chọn loại kho" class="w-full">
                      <el-option label="Kho Nguyên Liệu" value="MATERIAL" />
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
         <el-input v-model="form.address" placeholder="Thôn, Xóm, Số nhà..." />
      </el-form-item>

      <el-divider content-position="left">Tọa độ (GPS)</el-divider>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Vĩ độ (Lat)" prop="lat">
            <el-input-number v-model="form.lat" :precision="6" class="w-full" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Kinh độ (Long)" prop="long">
            <el-input-number v-model="form.long" :precision="6" class="w-full" />
          </el-form-item>
        </el-col>
      </el-row>
      <div id="quick-map" style="height: 300px; margin-top: 10px; border-radius: 4px; z-index: 1;"></div>
      <div class="text-xs text-gray-500 mb-4 mt-2">
        * Kéo thả ghim hoặc click trên bản đồ để cập nhật tọa độ chính xác.
      </div>
      
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          Tạo mới
        </el-button>
      </span>
    </template>
  </el-dialog>

  <QuickCreateUser 
    ref="quickCreateRef" 
    role="WAREHOUSE_MANAGER" 
    role-label="Thủ kho" 
    @success="handleManagerCreated" 
  />
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { transportApi } from '../api/transportApi';
import { userApi } from '@/modules/core/api/user';
import QuickCreateUser from '../../core/components/QuickCreateUser.vue';
import type { FormInstance, FormRules } from 'element-plus';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { vietnamUnits } from '@/common/data/vietnam-units';
import { provinceCoordinates } from '@/common/data/province-coordinates';

const emit = defineEmits(['success']);

const visible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const warehouseManagers = ref<any[]>([]);
const loadingData = ref(false);

const quickCreateRef = ref<any>(null);

const provinces = ref(vietnamUnits);
const formWards = ref<any[]>([]);

let map: L.Map | null = null;
let marker: L.Marker | null = null;

const form = reactive({
  name: '',
  address: '',
  province: '',
  ward: '',
  managerId: '',
  type: 'MATERIAL',
  lat: 21.0,
  long: 105.8,
  isDefault: false
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: 'Vui lòng nhập tên kho', trigger: 'blur' }],
  province: [{ required: true, message: 'Chọn Tỉnh/Thành', trigger: 'change' }],
  lat: [{ required: true, message: 'Nhập Vĩ độ', trigger: 'blur' }],
  long: [{ required: true, message: 'Nhập Kinh độ', trigger: 'blur' }]
});

const open = async () => {
  visible.value = true;
  loadingData.value = true;
  try {
    const res = await userApi.getList({ page: 1, limit: 100, roleName: 'WAREHOUSE_MANAGER' });
    warehouseManagers.value = res.data.data || [];
  } catch (e) {
    console.error('Failed to load managers', e);
  } finally {
    loadingData.value = false;
  }
};

const handleManagerCreated = (newUser: any) => {
  warehouseManagers.value.push(newUser);
  form.managerId = newUser.id;
};

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

const initMap = async () => {
  await nextTick();
  if (map) return;

  map = L.map('quick-map', {
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
        const { data } = await transportApi.createWarehouse(payload);
        ElMessage.success('Tạo kho thành công');
        visible.value = false;
        emit('success', data);
      } catch (err: any) {
        console.error(err);
        ElMessage.error(err?.response?.data?.message || 'Có lỗi xảy ra');
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
  if (map) {
    map.remove();
    map = null;
    marker = null;
  }
};

defineExpose({ open });
</script>
