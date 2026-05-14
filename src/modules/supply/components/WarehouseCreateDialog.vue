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
                  <el-select v-model="form.ward" placeholder="Chọn Xã" filterable allow-create class="w-full" :disabled="!form.province">
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

const onProvinceChange = async () => {
  form.ward = '';
  loadWards();
  
  if (form.province && provinceCoordinates[form.province]) {
    const coords = provinceCoordinates[form.province];
    form.lat = coords.lat;
    form.long = coords.lng;
    
    await nextTick();
    if (map) {
      map.remove();
      map = null;
    }
    initMap();
  }
};

const initMap = async () => {
  await nextTick();
  const container = L.DomUtil.get('quick-map');
  if(container != null){
    (container as any)._leaflet_id = null;
  }

  map = L.map('quick-map').setView([form.lat, form.long], 12);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  marker = L.marker([form.lat, form.long], { draggable: true }).addTo(map);

  marker.on('dragend', (e) => {
    const latLng = e.target.getLatLng();
    form.lat = Number(latLng.lat.toFixed(6));
    form.long = Number(latLng.lng.toFixed(6));
  });

  map.on('click', (e) => {
    form.lat = Number(e.latlng.lat.toFixed(6));
    form.long = Number(e.latlng.lng.toFixed(6));
    if (marker) marker.setLatLng(e.latlng);
  });
};

watch(() => [form.lat, form.long], ([newLat, newLong]) => {
  if (marker && map) {
    const cur = marker.getLatLng();
    if (cur.lat !== newLat || cur.lng !== newLong) {
      const newPos = new L.LatLng(newLat as number, newLong as number);
      marker.setLatLng(newPos);
      map.setView(newPos, map.getZoom()); 
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
};

defineExpose({ open });
</script>
