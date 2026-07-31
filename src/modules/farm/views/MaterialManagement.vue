<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Vật tư & Kho</h1>
      <el-button type="primary" @click="showCreateModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Thêm vật tư mới
      </el-button>
    </div>

    <!-- Toolbar -->
    <div class="mb-4 flex gap-4">
        <el-input v-model="searchKeyword" placeholder="Tìm theo tên hoặc mã..." class="w-64" prefix-icon="Search" clearable />
        <el-select v-model="filterType" placeholder="Lọc theo loại" clearable class="w-48">
             <el-option label="Tất cả" value="" />
             <el-option label="Phân bón" value="FERTILIZER" />
             <el-option label="Thuốc BVTV" value="PESTICIDE" />
             <el-option label="Giống" value="SEED" />
             <el-option label="Khác" value="OTHER" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="Trạng thái" clearable class="w-48">
             <el-option label="Tất cả" value="ALL" />
             <el-option label="Đang dùng" value="ACTIVE" />
             <el-option label="Ngừng dùng" value="INACTIVE" />
        </el-select>
    </div>

    <!-- Table -->
    <el-card shadow="hover" class="mb-6">
      <el-table :data="filteredMaterials" v-loading="loading" style="width: 100%">
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">
            {{ (currentPage - 1) * pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="code" label="Mã vật tư" width="120">
            <template #default="{ row }">
                <span class="font-mono text-sm font-semibold text-blue-600">{{ row.code }}</span>
            </template>
        </el-table-column>
        <el-table-column prop="name" label="Tên vật tư" min-width="200" />
        <el-table-column prop="type" label="Loại" width="150">
            <template #default="{ row }">
                <el-tag :type="getMaterialTypeColor(row.type)">{{ getMaterialTypeName(row.type) }}</el-tag>
            </template>
        </el-table-column>
        <el-table-column prop="stockQuantity" label="Tồn kho" width="150" align="right">
          <template #default="{ row }">
             <span class="font-bold" :class="Number(row.stockQuantity) > 0 ? 'text-green-600' : 'text-red-500'">
                 {{ Number(row.stockQuantity).toLocaleString() }}
             </span> 
             <span class="text-xs text-gray-500 ml-1">{{ row.unit }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="Trạng thái" width="120" align="center">
            <template #default="{ row }">
                <el-switch
                    :model-value="row.isActive"
                    @change="handleToggleStatus(row)"
                    active-text="Bật"
                    inactive-text="Tắt"
                    inline-prompt
                    :loading="togglingId === row.id"
                />
            </template>
        </el-table-column>
        <el-table-column prop="description" label="Mô tả" min-width="200" show-overflow-tooltip />
        <el-table-column label="Thao tác" width="150" align="center" fixed="right">
            <template #default="{ row }">
                <div class="flex items-center justify-center gap-2">
                    <el-tooltip content="Sửa thông tin">
                        <el-button type="primary" link :icon="Edit" @click="openEditModal(row)" />
                    </el-tooltip>
                    <el-tooltip :content="row.isActive ? 'Nhập kho' : 'Không thể nhập kho vật tư đang bị khóa'">
                        <el-button type="success" link :icon="Download" @click="openImport(row)" :disabled="!row.isActive" />
                    </el-tooltip>
                    <el-tooltip :content="row.isActive ? 'Phân bổ / Xuất kho' : 'Không thể phân bổ vật tư đang bị khóa'">
                        <el-button type="warning" link :icon="Share" @click="openAllocate(row)" :disabled="!row.isActive" />
                    </el-tooltip>
                </div>
            </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalMaterials"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- Create/Edit Material Modal -->
    <el-dialog
      v-model="showCreateModal"
      width="500px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-material-dialog"
      @closed="resetCreateForm"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
          <span style="color: #fff; font-size: 16px; font-weight: 600;">
            {{ isEditing ? 'Cập nhật Vật tư' : 'Thêm Vật tư mới' }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showCreateModal = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-position="top" style="padding: 24px 24px 8px;">
        <el-row :gutter="20">
          <el-col :span="12">
             <el-form-item label="Loại" prop="type">
               <el-select v-model="createForm.type" class="w-full" @change="onTypeChange">
                 <el-option label="Phân bón" value="FERTILIZER" />
                 <el-option label="Thuốc BVTV" value="PESTICIDE" />
                 <el-option label="Giống" value="SEED" />
                 <el-option label="Khác" value="OTHER" />
               </el-select>
             </el-form-item>
          </el-col>
          <el-col :span="12">
             <el-form-item label="Mã vật tư" prop="code">
               <el-input v-model="createForm.code" placeholder="Auto-generated" :loading="suggestingCode">
                  <template #append>
                      <el-tooltip content="Lấy mã gợi ý">
                          <el-button :icon="Refresh" @click="fetchSuggestedCode" :loading="suggestingCode" />
                      </el-tooltip>
                  </template>
               </el-input>
             </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Tên vật tư" prop="name">
          <el-input v-model="createForm.name" placeholder="VD: Phân Ure" @blur="createForm.name = createForm.name?.trim()" />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
             <el-form-item label="Đơn vị tính" prop="unit">
               <el-select v-model="createForm.unit" filterable allow-create default-first-option placeholder="Chọn hoặc nhập đơn vị" class="w-full" @change="formatUnit" @blur="formatUnit">
                  <el-option v-for="u in standardUnits" :key="u" :label="u" :value="u" />
               </el-select>
             </el-form-item>
          </el-col>
          <el-col :span="12">
             <el-form-item label="Trạng thái">
               <el-switch v-model="createForm.isActive" active-text="Đang dùng" inactive-text="Ngừng dùng" />
             </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Mô tả" prop="description">
          <el-input v-model="createForm.description" type="textarea" @blur="createForm.description = createForm.description?.trim()" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showCreateModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button 
            type="primary" 
            :loading="submitting" 
            :disabled="isEditing && !isCreateFormChanged"
            @click="submitCreateForm"
            style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff; background: #00875A; cursor: pointer;"
          >
            {{ isEditing ? 'Cập nhật' : 'Tạo mới' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Import/Allocate Modal -->
    <el-dialog
      v-model="showInventoryModal"
      width="420px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-material-dialog"
      @closed="resetInventoryForm"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
          <span style="color: #fff; font-size: 16px; font-weight: 600;">
            {{ inventoryForm.type === 'IMPORT' ? 'Nhập kho vật tư' : 'Phân bổ vật tư' }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showInventoryModal = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <div style="padding: 24px 24px 8px;">
        <div v-if="selectedMaterial" class="mb-4 p-3 bg-gray-50 rounded" style="border: 1px solid #e4e7ed; border-radius: 8px;">
            <div class="font-bold text-gray-800">{{ selectedMaterial.name }}</div>
            <div class="text-sm text-gray-500">Mã: {{ selectedMaterial.code }} · Tồn hiện tại: <span class="font-semibold text-blue-600">{{ selectedMaterial.stockQuantity }} {{ selectedMaterial.unit }}</span></div>
        </div>

        <el-form :model="inventoryForm" label-position="top" :rules="inventoryRules" ref="inventoryFormRef">
          <el-form-item :label="inventoryForm.type === 'IMPORT' ? 'Số lượng nhập' : 'Số lượng phân bổ'" prop="quantity">
             <el-input-number v-model="inventoryForm.quantity" class="w-full" style="--el-border-radius-base: 8px;" />
          </el-form-item>
          <el-form-item label="Ghi chú" prop="notes">
             <el-input v-model="inventoryForm.notes" type="textarea" style="--el-border-radius-base: 8px;" @blur="inventoryForm.notes = inventoryForm.notes?.trim()" />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showInventoryModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button 
            type="primary" 
            :loading="submitting" 
            @click="submitInventory"
            style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff; background: #00875A; cursor: pointer;"
          >
            Xác nhận
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from 'vue';
import { Plus, Search, Edit, Download, Share, Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { farmApi, type Material } from '../api/farmApi';
import type { FormInstance, FormRules } from 'element-plus';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const materials = ref<Material[]>([]);
const loading = ref(false);
const submitting = ref(false);
const suggestingCode = ref(false);
const togglingId = ref<string | null>(null);

const searchKeyword = ref('');
const filterType = ref('');
const filterStatus = ref('ALL');

const currentPage = ref(1);
const pageSize = ref(10);
const totalMaterials = ref(0);

const getMaterialTypeName = (type: string) => {
    const map: Record<string, string> = {
        'FERTILIZER': 'Phân bón',
        'PESTICIDE': 'Thuốc BVTV',
        'SEED': 'Giống',
        'OTHER': 'Khác'
    };
    return map[type] || type;
};

const getMaterialTypeColor = (type: string) => {
    const map: Record<string, string> = {
        'FERTILIZER': 'success',
        'PESTICIDE': 'warning',
        'SEED': 'primary',
        'OTHER': 'info'
    };
    return map[type] || 'info';
};

const filteredMaterials = computed(() => {
    return materials.value;
});

const handleFilterChange = () => {
    currentPage.value = 1;
    loadData();
};

const handleSizeChange = (val: number) => {
    pageSize.value = val;
    currentPage.value = 1;
    loadData();
};

const handleCurrentChange = (val: number) => {
    currentPage.value = val;
    loadData();
};

watch([filterType, filterStatus], () => {
    handleFilterChange();
});

let searchTimeout: any = null;
watch(() => searchKeyword.value, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    handleFilterChange();
  }, 300);
});

// Create/Edit Modal State
const showCreateModal = ref(false);
const createFormRef = ref<FormInstance>();
const isEditing = ref(false);
const currentId = ref<string | null>(null);

const createForm = reactive({
  code: '',
  name: '',
  type: 'FERTILIZER',
  unit: 'kg',
  description: '',
  isActive: true
});

const originalCreateForm = reactive({ ...createForm });

const isCreateFormChanged = computed(() => {
    return (
        createForm.code !== originalCreateForm.code ||
        createForm.name !== originalCreateForm.name ||
        createForm.type !== originalCreateForm.type ||
        createForm.unit !== originalCreateForm.unit ||
        createForm.description !== originalCreateForm.description ||
        createForm.isActive !== originalCreateForm.isActive
    );
});

const standardUnits = ['kg', 'lít', 'bao', 'chai', 'hộp', 'gói', 'ml', 'gram'];

const formatUnit = () => {
  if (createForm.unit) {
    createForm.unit = createForm.unit.toLowerCase().trim();
  }
};

const validateCode = (rule: any, value: any, callback: any) => {
  if (value) {
    const regex = /^[a-zA-Z0-9_\-]+$/;
    if (!regex.test(value)) {
      return callback(new Error('Mã vật tư chỉ chứa chữ, số, _, -'));
    }
    if (value.length > 50) {
      return callback(new Error('Mã vật tư tối đa 50 ký tự'));
    }
  }
  callback();
};

const validateName = (rule: any, value: any, callback: any) => {
  if (!value) {
    return callback(new Error('Vui lòng nhập tên vật tư'));
  }
  if (value.length < 2 || value.length > 150) {
    return callback(new Error('Tên vật tư phải từ 2 đến 150 ký tự'));
  }
  callback();
};

const validateType = (rule: any, value: any, callback: any) => {
  if (!value) {
    return callback(new Error('Vui lòng chọn loại vật tư'));
  }
  const allowedTypes = ['FERTILIZER', 'PESTICIDE', 'SEED', 'OTHER'];
  if (!allowedTypes.includes(value)) {
    return callback(new Error('Loại vật tư không hợp lệ'));
  }
  callback();
};

const validateDescription = (rule: any, value: any, callback: any) => {
  if (value && value.length > 255) {
    return callback(new Error('Mô tả tối đa 255 ký tự'));
  }
  callback();
};

const createRules = reactive<FormRules>({
  type: [{ required: true, validator: validateType, trigger: 'change' }],
  code: [{ validator: validateCode, trigger: 'blur' }],
  name: [{ required: true, validator: validateName, trigger: 'blur' }],
  unit: [{ required: true, message: 'Nhập đơn vị tính', trigger: 'change' }],
  description: [{ validator: validateDescription, trigger: 'blur' }]
});

// Inventory Modal State
const showInventoryModal = ref(false);
const inventoryFormRef = ref<FormInstance>();
const selectedMaterial = ref<any>(null);
const inventoryForm = reactive({
    material_id: '',
    type: 'IMPORT',
    quantity: 0,
    notes: ''
});

const validateQuantity = (rule: any, value: any, callback: any) => {
    if (value === undefined || value === null || value <= 0) {
        return callback(new Error('Số lượng phải lớn hơn 0'));
    }
    if (inventoryForm.type === 'ALLOCATE' && selectedMaterial.value) {
        const stock = Number(selectedMaterial.value.stockQuantity) || 0;
        if (value > stock) {
            return callback(new Error(`Vượt quá số lượng tồn kho (${stock})`));
        }
    }
    callback();
};

const validateNotes = (rule: any, value: any, callback: any) => {
    if (value && value.length > 255) {
        return callback(new Error('Ghi chú tối đa 255 ký tự'));
    }
    callback();
};

const inventoryRules = reactive<FormRules>({
    material_id: [{ required: true, message: 'Chọn vật tư', trigger: 'change' }],
    quantity: [{ validator: validateQuantity, trigger: 'blur' }],
    notes: [{ validator: validateNotes, trigger: 'blur' }]
});

const loadData = async () => {
    loading.value = true;
    try {
        const params: any = {
            page: currentPage.value,
            limit: pageSize.value
        };
        if (searchKeyword.value) params.search = searchKeyword.value;
        if (filterType.value) params.type = filterType.value;
        if (filterStatus.value !== 'ALL') {
            params.includeInactive = filterStatus.value === 'INACTIVE';
        } else {
            params.includeInactive = true;
        }

        const { data } = await farmApi.getMaterials(params);
        if (data && typeof data === 'object' && 'data' in data) {
            materials.value = data.data || [];
            totalMaterials.value = data.total || 0;
        } else {
            materials.value = data || [];
            totalMaterials.value = materials.value.length;
        }
    } catch (err) {
        ElMessage.error('Lỗi tải dữ liệu');
    } finally {
        loading.value = false;
    }
};

const fetchSuggestedCode = async () => {
    suggestingCode.value = true;
    try {
        const { data } = await farmApi.suggestMaterialCode(createForm.type);
        createForm.code = data.code;
    } catch (err) {
        ElMessage.error('Không thể lấy mã gợi ý');
    } finally {
        suggestingCode.value = false;
    }
};

const onTypeChange = () => {
    if (!isEditing.value) {
        fetchSuggestedCode();
    }
};

const openEditModal = (row: Material) => {
    isEditing.value = true;
    currentId.value = row.id;
    createForm.code = row.code || '';
    createForm.name = row.name;
    createForm.type = row.type;
    createForm.unit = row.unit;
    createForm.description = row.description || '';
    createForm.isActive = row.isActive;
    Object.assign(originalCreateForm, createForm);
    showCreateModal.value = true;
};

const handleToggleStatus = async (row: Material) => {
    togglingId.value = row.id;
    try {
        const { data } = await farmApi.toggleMaterialStatus(row.id);
        const idx = materials.value.findIndex(m => m.id === row.id);
        if (idx !== -1) materials.value[idx] = data;
        ElMessage.success(`Vật tư đã ${data.isActive ? 'bật' : 'tắt'}`);
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
        togglingId.value = null;
    }
};

const submitCreateForm = async () => {
  if (!createFormRef.value) return;
  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        createForm.name = createForm.name?.trim();
        createForm.unit = createForm.unit?.toLowerCase().trim();
        createForm.description = createForm.description?.trim();

        const payload: any = {
            name: createForm.name,
            type: createForm.type,
            unit: createForm.unit,
            description: createForm.description,
            isActive: createForm.isActive,
        };
        if (createForm.code) payload.code = createForm.code;

        if (isEditing.value && currentId.value) {
            await farmApi.updateMaterial(currentId.value, payload);
            ElMessage.success('Cập nhật vật tư thành công');
        } else {
            await farmApi.createMaterial(payload);
            ElMessage.success('Thêm vật tư thành công');
        }
        showCreateModal.value = false;
        loadData();
      } catch (err: any) {
        console.error(err);
        ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const openImport = (row: any) => {
    if (!row.isActive) {
        ElMessage.warning('Vật tư đang bị khóa, không thể giao dịch');
        return;
    }
    selectedMaterial.value = row;
    inventoryForm.material_id = row.id;
    inventoryForm.type = 'IMPORT';
    inventoryForm.quantity = 0;
    inventoryForm.notes = '';
    showInventoryModal.value = true;
};

const openAllocate = (row: any) => {
    if (!row.isActive) {
        ElMessage.warning('Vật tư đang bị khóa, không thể giao dịch');
        return;
    }
    if (Number(row.stockQuantity) <= 0) {
        ElMessage.warning('Vật tư đã hết trong kho, không thể phân bổ');
        return;
    }
    selectedMaterial.value = row;
    inventoryForm.material_id = row.id;
    inventoryForm.type = 'ALLOCATE';
    inventoryForm.quantity = 0;
    inventoryForm.notes = '';
    showInventoryModal.value = true;
};

const submitInventory = async () => {
    if (!inventoryFormRef.value) return;
    await inventoryFormRef.value.validate(async (valid) => {
        if (valid) {
             submitting.value = true;
            try {
                await farmApi.manageInventory(inventoryForm as any);
                ElMessage.success('Giao dịch kho thành công');
                showInventoryModal.value = false;
                loadData();
            } catch (err: any) {
                ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra');
            } finally {
                submitting.value = false;
            }
        }
    });
};

const resetCreateForm = () => {
    if(createFormRef.value) createFormRef.value.resetFields();
    isEditing.value = false;
    currentId.value = null;
    createForm.code = '';
    createForm.isActive = true;
};
const resetInventoryForm = () => {
    if(inventoryFormRef.value) inventoryFormRef.value.resetFields();
    inventoryForm.quantity = 0;
};

onMounted(() => {
    loadData();
    fetchSuggestedCode();
});
</script>

<style>
.branded-material-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-material-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-material-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-material-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
