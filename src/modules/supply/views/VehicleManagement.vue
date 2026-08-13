<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Đội xe</h1>
      <el-button type="primary" @click="showCreateModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Thêm xe mới
      </el-button>
    </div>

    <!-- Search and count -->
    <div class="flex items-center gap-4 mb-4">
      <el-input
        v-model="searchKeyword"
        placeholder="Tìm kiếm biển số xe..."
        clearable
        style="width: 240px"
        @input="debouncedSearch"
      />
      <span class="text-gray-500 text-sm">
        Tổng số: <strong>{{ totalVehicles }}</strong> xe
      </span>
    </div>

    <el-card shadow="hover">
      <el-table :data="vehicles" v-loading="loading" style="width: 100%">
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">
            {{ (currentPage - 1) * pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column label="Ảnh" width="80">
             <template #default="{ row }">
                 <el-image 
                    style="width: 50px; height: 50px" 
                    :src="getImageUrl(row.imageUrl)" 
                    fit="cover" 
                    v-if="row.imageUrl"
                    :preview-src-list="[getImageUrl(row.imageUrl)]"
                    preview-teleported
                 />
                 <div v-else class="w-12 h-12 bg-gray-100 flex items-center justify-center rounded text-gray-400">
                    <el-icon><Picture /></el-icon>
                 </div>
             </template>
        </el-table-column>
        <el-table-column prop="licensePlate" label="Biển số xe" width="150" sortable>
             <template #default="{ row }">
                 <div class="font-bold text-blue-600">{{ row.licensePlate }}</div>
             </template>
        </el-table-column>
        <el-table-column prop="type" label="Loại xe" width="150" />
        <el-table-column prop="capacityKg" label="Tải trọng (kg)" width="150">
             <template #default="{ row }">
                 {{ row.capacityKg?.toLocaleString() }} kg
             </template>
        </el-table-column>
        <el-table-column label="Tài xế mặc định" min-width="200">
            <template #default="{ row }">
                 <div v-if="row.defaultDriver">
                     <div class="font-medium">{{ row.defaultDriver.fullName }}</div>
                     <div class="text-xs text-gray-500">{{ row.defaultDriver.username }}</div>
                 </div>
                 <span v-else class="text-gray-400 italic">Chưa gán</span>
            </template>
        </el-table-column>
        <el-table-column prop="status" label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'AVAILABLE' ? 'success' : 'warning'">{{ row.status === 'AVAILABLE' ? 'Sẵn sàng' : row.status === 'IN_USE' ? 'Đang sử dụng' : row.status === 'MAINTENANCE' ? 'Bảo trì' : row.status }}</el-tag>
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
          :total="totalVehicles"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Create/Edit Modal -->
    <el-dialog
      v-model="showCreateModal"
      width="500px"
      @closed="resetForm"
      :show-close="false"
      :close-on-click-modal="false"
      destroy-on-close
      class="branded-vehicle-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
          <span style="color: #fff; font-size: 16px; font-weight: 600;">
            {{ isEditing ? 'Cập nhật Xe' : 'Thêm Xe mới' }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showCreateModal = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <el-form :model="form" label-position="top" :rules="rules" ref="formRef" style="padding: 24px 24px 8px; --el-border-radius-base: 8px;">
         <el-form-item label="Biển số xe" prop="licensePlate">
            <el-input v-model.trim="form.licensePlate" placeholder="VD: 29C-123.45" maxlength="15" show-word-limit @input="form.licensePlate = form.licensePlate.toUpperCase()" />
         </el-form-item>
         
         <el-form-item label="Loại xe" prop="type">
            <el-select v-model="form.type" placeholder="Chọn loại xe" class="w-full">
                <el-option label="Xe tải nhỏ (Van)" value="Van" />
                <el-option label="Xe tải (Truck)" value="Truck" />
                <el-option label="Container" value="Container" />
                <el-option label="Xe máy" value="Motorbike" />
            </el-select>
         </el-form-item>
         
         <el-form-item label="Tải trọng (kg)" prop="capacityKg">
            <el-input-number v-model="form.capacityKg" :min="1" :max="100000" :precision="0" :step="1" class="w-full" />
         </el-form-item>
         
         <el-form-item label="Hình ảnh xe" prop="imageUrl">
            <div class="flex items-start gap-4">
                <div v-if="form.imageUrl" class="relative group w-32 h-32 border rounded overflow-hidden">
                    <img :src="getImageUrl(form.imageUrl)" class="w-full h-full object-cover" />
                    <!-- Button to remove/change if needed, or just let upload overwrite -->
                </div>
                
                <el-upload
                    class="upload-demo"
                    action="#" 
                    :http-request="handleUploadRequest"
                    :before-upload="beforeImageUpload"
                    :show-file-list="false"
                    accept="image/jpeg,image/png,image/webp"
                >
                    <el-button type="default">
                        <el-icon class="mr-1"><Picture /></el-icon> Tải ảnh lên
                    </el-button>
                </el-upload>
            </div>
         </el-form-item>

          <el-form-item label="Tài xế mặc định" prop="defaultDriverId">
              <div class="flex gap-2">
                  <el-select v-model="form.defaultDriverId" placeholder="Chọn tài xế" class="flex-1" filterable clearable>
                      <el-option 
                         v-for="d in drivers" 
                         :key="d.id" 
                         :label="d.fullName + ' (' + d.username + ')'" 
                         :value="d.id" 
                      />
                  </el-select>
                  <el-button type="success" :icon="Plus" @click="quickCreateRef?.open()">Thêm mới</el-button>
              </div>
          </el-form-item>
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
      role="TRANSPORTER" 
      role-label="Lái xe" 
      @success="handleDriverCreated" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, nextTick } from 'vue';
import { Plus, Picture } from '@element-plus/icons-vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
import { ElMessage } from 'element-plus';
import { transportApi, type TransportVehicle } from '../api/transportApi';
import QuickCreateUser from '../../core/components/QuickCreateUser.vue';
import { fileApi } from '@/modules/core/api/file'; 
import { userApi } from '@/modules/core/api/user'; // Import userApi
import type { FormInstance, FormRules } from 'element-plus';

const vehicles = ref<TransportVehicle[]>([]);
const drivers = ref<any[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const currentPage = ref(1);
const pageSize = ref(10);
const totalVehicles = ref(0);
const searchKeyword = ref('');

const getImageUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
    // Ensure one slash between base and path
    const safeBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const safePath = path.startsWith('/') ? path : `/${path}`;
    return `${safeBase}${safePath}`;
};

const loadDrivers = async () => {
    try {
        const res = await userApi.getList({ page: 1, limit: 100, roleName: 'TRANSPORTER' });
        drivers.value = res.data.data || [];
    } catch (e) {
        console.error('Failed to load drivers', e);
    }
};

const quickCreateRef = ref<any>(null);
const handleDriverCreated = (newUser: any) => {
    loadDrivers();
    form.defaultDriverId = newUser.id;
};

// Edit state
const isEditing = ref(false);
const currentId = ref<string | null>(null);
const originalForm = ref<string>('');

const isFormChanged = computed(() => {
    return JSON.stringify(form) !== originalForm.value;
});

const defaultForm = () => ({
  licensePlate: '',
  type: '',
  capacityKg: 0,
  defaultDriverId: '',
  imageUrl: ''
});

const form = reactive(defaultForm());

const rules = reactive<FormRules>({
  licensePlate: [
      { required: true, message: 'Nhập biển số xe', trigger: 'blur' },
      { whitespace: true, message: 'Biển số không được để trống', trigger: 'blur' },
      { min: 6, max: 15, message: 'Biển số từ 6 đến 15 ký tự', trigger: 'blur' },
      { pattern: /^[A-Z0-9.-]+$/, message: 'Biển số chỉ gồm chữ cái, số, dấu - hoặc .', trigger: 'blur' }
  ],
  type: [{ required: true, message: 'Chọn loại xe', trigger: 'change' }],
  capacityKg: [{ required: true, message: 'Nhập tải trọng', trigger: 'blur' }],
  defaultDriverId: [{ required: true, message: 'Chọn tài xế', trigger: 'change' }]
});

const beforeImageUpload = (file: any) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const isImage = validTypes.includes(file.type);
    const isLt5M = file.size / 1024 / 1024 < 5;

    if (!isImage) {
        ElMessage.error('Hình ảnh phải là định dạng JPG, PNG hoặc WEBP!');
    }
    if (!isLt5M) {
        ElMessage.error('Kích thước ảnh không được vượt quá 5MB!');
    }
    return isImage && isLt5M;
};

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
    const { data } = await transportApi.getVehicles(params);
    vehicles.value = data.data || [];
    totalVehicles.value = data.total || 0;
  } catch (err) {
    ElMessage.error('Không thể tải danh sách xe');
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

const openEditModal = (row: TransportVehicle) => {
    isEditing.value = true;
    currentId.value = row.id;
    
    form.licensePlate = row.licensePlate;
    form.type = row.type || '';
    form.capacityKg = row.capacityKg || 0;
    form.defaultDriverId = row.defaultDriverId || '';
    form.imageUrl = row.imageUrl || '';

    loadDrivers();
    
    nextTick(() => {
        originalForm.value = JSON.stringify(form);
    });

    showCreateModal.value = true;
}

const handleUploadRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
        const { data } = await fileApi.upload(file);
        // data can be { url: "..." } or "..." depending on backend response, usually it wraps in data.url or returns plain string in some legacy apis.
        // Based on file.ts: return api.post(...) -> returns Axios response. 
        // ProductFormModal uses `const url = data.url || data;`
        const url = data.url || data;
        
        // Helper to fix full URL if needed (ProductFormModal has getImageUrl helper), 
        // but let's assume backend returns relative or abs path. 
        // Note: transport-vehicle.entity.ts defines imageUrl as string.
        form.imageUrl = url;
        onSuccess(data);
    } catch (err) {
        console.error(err);
        ElMessage.error('Upload ảnh thất bại');
        onError(err);
    }
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        if (isEditing.value && currentId.value) {
            await transportApi.updateVehicle(currentId.value, form);
             ElMessage.success('Cập nhật xe thành công');
        } else {
            await transportApi.createVehicle(form);
             ElMessage.success('Tạo xe thành công');
        }
        
        showCreateModal.value = false;
        loadData();
      } catch (err: any) {
        console.error(err);
        ElMessage.error('Biển số có thể đã tồn tại!');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const resetForm = () => {
  if (formRef.value) formRef.value.clearValidate();
  Object.assign(form, defaultForm());
  isEditing.value = false;
  currentId.value = null;
  originalForm.value = '';
};

onMounted(() => {
    loadData();
    loadDrivers();
});
</script>

<style>
.branded-vehicle-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-vehicle-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-vehicle-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-vehicle-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
