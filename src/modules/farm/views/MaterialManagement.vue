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
        <el-input v-model="searchKeyword" placeholder="Tìm vật tư..." class="w-64" prefix-icon="Search" clearable />
        <el-select v-model="filterType" placeholder="Lọc theo loại" clearable class="w-48">
             <el-option label="Tất cả" value="" />
             <el-option label="Phân bón" value="FERTILIZER" />
             <el-option label="Thuốc BVTV" value="PESTICIDE" />
             <el-option label="Giống" value="SEED" />
             <el-option label="Khác" value="OTHER" />
        </el-select>
    </div>

    <!-- Table -->
    <el-card shadow="hover" class="mb-6">
      <el-table :data="filteredMaterials" v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
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
        <el-table-column prop="description" label="Mô tả" min-width="200" show-overflow-tooltip />
        <el-table-column label="Thao tác" width="150" align="center" fixed="right">
            <template #default="{ row }">
                <div class="flex items-center justify-center gap-2">
                    <el-tooltip content="Sửa thông tin">
                        <el-button type="primary" link :icon="Edit" @click="openEditModal(row)" />
                    </el-tooltip>
                    <el-tooltip content="Nhập kho">
                        <el-button type="success" link :icon="Download" @click="openImport(row)" />
                    </el-tooltip>
                    <el-tooltip content="Phân bổ / Xuất kho">
                        <el-button type="warning" link :icon="Share" @click="openAllocate(row)" />
                    </el-tooltip>
                </div>
            </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create/Edit Material Modal -->
    <el-dialog
      v-model="showCreateModal"
      :title="isEditing ? 'Cập nhật Vật tư' : 'Thêm Vật tư mới'"
      width="500px"
      @closed="resetCreateForm"
    >
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-position="top">
        <el-form-item label="Tên vật tư" prop="name">
          <el-input v-model="createForm.name" placeholder="VD: Phân Ure" />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
             <el-form-item label="Loại" prop="type">
               <el-select v-model="createForm.type" class="w-full">
                 <el-option label="Phân bón" value="FERTILIZER" />
                 <el-option label="Thuốc BVTV" value="PESTICIDE" />
                 <el-option label="Giống" value="SEED" />
                 <el-option label="Khác" value="OTHER" />
               </el-select>
             </el-form-item>
          </el-col>
          <el-col :span="12">
             <el-form-item label="Đơn vị tính" prop="unit">
               <el-input v-model="createForm.unit" placeholder="VD: kg, lít" />
             </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Mô tả" prop="description">
          <el-input v-model="createForm.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreateModal = false">Hủy</el-button>
          <el-button type="primary" :loading="submitting" @click="submitCreateForm">
            {{ isEditing ? 'Cập nhật' : 'Tạo mới' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Import/Allocate Modal -->
    <el-dialog
      v-model="showInventoryModal"
      :title="inventoryForm.type === 'IMPORT' ? 'Nhập kho' : 'Phân bổ vật tư'"
      width="400px"
      @closed="resetInventoryForm"
    >
      <div v-if="selectedMaterial" class="mb-4 p-3 bg-gray-50 rounded">
          <div class="font-bold">{{ selectedMaterial.name }}</div>
          <div class="text-sm text-gray-500">Tồn hiện tại: {{ selectedMaterial.stockQuantity }} {{ selectedMaterial.unit }}</div>
      </div>

      <el-form :model="inventoryForm" label-position="top" :rules="inventoryRules" ref="inventoryFormRef">
        <el-form-item :label="inventoryForm.type === 'IMPORT' ? 'Số lượng nhập' : 'Số lượng phân bổ'" prop="quantity">
           <el-input-number v-model="inventoryForm.quantity" :min="0.1" class="w-full" />
        </el-form-item>
        <el-form-item label="Ghi chú">
           <el-input v-model="inventoryForm.notes" type="textarea" />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showInventoryModal = false">Hủy</el-button>
          <el-button type="primary" :loading="submitting" @click="submitInventory">
            Xác nhận
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { Plus, Box, Search, Edit, Download, Share } from '@element-plus/icons-vue'; // Import icons
import { ElMessage } from 'element-plus';
import { farmApi, type Material } from '../api/farmApi';
import type { FormInstance, FormRules } from 'element-plus';

const materials = ref<Material[]>([]);
const loading = ref(false);
const submitting = ref(false);

const searchKeyword = ref('');
const filterType = ref('');

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
    return materials.value.filter(item => {
        const matchesName = item.name.toLowerCase().includes(searchKeyword.value.toLowerCase());
        const matchesType = filterType.value ? item.type === filterType.value : true;
        return matchesName && matchesType;
    });
});

// Create/Edit Modal State
const showCreateModal = ref(false);
const createFormRef = ref<FormInstance>();
const isEditing = ref(false);
const currentId = ref<string | null>(null);

const createForm = reactive({
  name: '',
  type: 'FERTILIZER',
  unit: 'kg',
  description: ''
});

const createRules = reactive<FormRules>({
  name: [{ required: true, message: 'Nhập tên vật tư', trigger: 'blur' }],
  type: [{ required: true, message: 'Chọn loại', trigger: 'change' }],
  unit: [{ required: true, message: 'Nhập đơn vị tính', trigger: 'blur' }]
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
const inventoryRules = reactive<FormRules>({
    material_id: [{ required: true, message: 'Chọn vật tư', trigger: 'change' }],
    quantity: [{ required: true, message: 'Nhập số lượng', trigger: 'blur' }]
});

const loadData = async () => {
    loading.value = true;
    try {
        const { data } = await farmApi.getMaterials();
        materials.value = data;
    } catch (err) {
        ElMessage.error('Lỗi tải dữ liệu');
    } finally {
        loading.value = false;
    }
};

const openEditModal = (row: Material) => {
    isEditing.value = true;
    currentId.value = row.id;
    createForm.name = row.name;
    createForm.type = row.type;
    createForm.unit = row.unit;
    createForm.description = row.description;
    showCreateModal.value = true;
};

const submitCreateForm = async () => {
  if (!createFormRef.value) return;
  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        if (isEditing.value && currentId.value) {
            await farmApi.updateMaterial(currentId.value, createForm);
            ElMessage.success('Cập nhật vật tư thành công');
        } else {
            await farmApi.createMaterial(createForm);
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
    selectedMaterial.value = row;
    inventoryForm.material_id = row.id;
    inventoryForm.type = 'IMPORT';
    inventoryForm.quantity = 0;
    inventoryForm.notes = '';
    showInventoryModal.value = true;
};

const openAllocate = (row: any) => {
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
};
const resetInventoryForm = () => {
    if(inventoryFormRef.value) inventoryFormRef.value.resetFields();
    inventoryForm.quantity = 0;
};

onMounted(loadData);
</script>
```
