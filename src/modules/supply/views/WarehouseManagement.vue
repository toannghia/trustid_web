<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Kho bãi</h1>
      <el-button type="primary" @click="showCreateModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Thêm kho mới
      </el-button>
    </div>

    <!-- Table -->
    <el-card shadow="hover" class="mb-6">
      <el-table :data="warehouses" v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column prop="name" label="Tên kho" min-width="180" />
        <el-table-column prop="type" label="Phân loại" width="130">
            <template #default="{ row }">
                <el-tag size="small" :type="row.type === 'PRODUCTION' ? 'warning' : 'success'">{{ row.type }}</el-tag>
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
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status }}</el-tag>
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
    </el-card>

    <!-- Create/Edit Modal -->
    <el-dialog
      v-model="showCreateModal"
      :title="isEditing ? 'Cập nhật Kho' : 'Thêm Kho mới'"
      width="800px"
      @closed="resetForm"
      @opened="initMap"
    >
      <el-form :model="form" label-position="top" :rules="rules" ref="formRef">
        <el-row :gutter="20">
            <el-col :span="12">
                 <el-form-item label="Tên kho" prop="name">
                    <el-input v-model="form.name" placeholder="VD: Kho tập kết Bắc Ninh" />
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
        <div id="map" style="height: 300px; margin-top: 10px; border-radius: 4px; z-index: 1;"></div>
        <div class="text-xs text-gray-500 mb-4 mt-2">
          * Kéo thả ghim hoặc click trên bản đồ để cập nhật tọa độ chính xác.
        </div>
        
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

    <QuickCreateUser 
      ref="quickCreateRef" 
      role="WAREHOUSE_MANAGER" 
      role-label="Thủ kho" 
      @success="handleManagerCreated" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, nextTick, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { transportApi, type Warehouse } from '../api/transportApi';
import QuickCreateUser from '../../core/components/QuickCreateUser.vue';
import type { FormInstance, FormRules } from 'element-plus';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { vietnamUnits } from '@/common/data/vietnam-units';
import { provinceCoordinates } from '@/common/data/province-coordinates';

const warehouses = ref<Warehouse[]>([]);
const warehouseManagers = ref<any[]>([]); // List of potential managers
const loading = ref(false);
const showCreateModal = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

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

const onProvinceChange = async () => {
    form.ward = '';
    loadWards();
    
    // Auto center map
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

// Map related
let map: L.Map | null = null;
let marker: L.Marker | null = null;

// Edit state
const isEditing = ref(false);
const currentId = ref<string | null>(null);

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
  name: [{ required: true, message: 'Vui lòng nhập tên kho', trigger: 'blur' }],
  province: [{ required: true, message: 'Chọn Tỉnh/Thành', trigger: 'change' }],
  lat: [{ required: true, message: 'Nhập Vĩ độ', trigger: 'blur' }],
  long: [{ required: true, message: 'Nhập Kinh độ', trigger: 'blur' }]
});

const initMap = async () => {
    await nextTick();
    // Fix existing leaflet container error
    const container = L.DomUtil.get('map');
    if(container != null){
        (container as any)._leaflet_id = null;
    }

    map = L.map('map').setView([form.lat, form.long], 12);
    
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

const loadData = async () => {
  loading.value = true;
  try {
    const { data } = await transportApi.getWarehouses();
    warehouses.value = data;
  } catch (err) {
    ElMessage.error('Không thể tải danh sách kho');
  } finally {
    loading.value = false;
  }
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
};

onMounted(() => {
    loadData();
    loadManagers();
});
</script>
