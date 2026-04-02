<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quy trình mẫu</h1>
      <el-button type="primary" @click="showCreateModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Tạo quy trình
      </el-button>
    </div>



    <!-- Toolbar -->
    <div class="mb-4">
        <el-input v-model="searchKeyword" placeholder="Tìm quy trình..." class="w-64" prefix-icon="Search" clearable />
    </div>

    <!-- Table -->
    <el-card shadow="hover" class="mb-6">
      <el-table :data="filteredTemplates" v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column prop="name" label="Tên quy trình" min-width="250" />
        <el-table-column label="Số lượng việc" width="150" align="center">
          <template #default="{ row }">
            <el-tag effect="plain">{{ row.tasksConfig?.length || 0 }} tasks</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? 'Active' : 'Inactive' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="100" align="center" fixed="right">
            <template #default="{ row }">
                 <el-button type="primary" link size="small" @click="openEditModal(row)">Sửa</el-button>
            </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create/Edit Modal -->
    <el-dialog
      v-model="showCreateModal"
      :title="isEditing ? 'Cập nhật Quy trình mẫu' : 'Thiết lập Quy trình mẫu'"
      width="900px"
      @closed="resetForm"
    >
      <el-form :model="form" label-position="top" :rules="rules" ref="formRef">
        <el-form-item label="Tên quy trình" prop="name">
          <el-input v-model="form.name" placeholder="VD: Quy trình lúa Đông Xuân" />
        </el-form-item>

        <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-gray-700">Các giai đoạn canh tác</h3>
            <el-button type="primary" plain size="small" @click="addStage">
                <el-icon class="mr-1"><Plus /></el-icon> Thêm giai đoạn
            </el-button>
        </div>
        
        <div v-for="(stage, sIndex) in stageGroups" :key="sIndex" class="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50 relative">
          <el-button 
            type="danger" 
            link 
            class="absolute top-2 right-2"
            @click="removeStage(sIndex)"
          >
            <el-icon><Delete /></el-icon> Xóa giai đoạn
          </el-button>

          <el-form-item label="Tên giai đoạn" required>
              <el-input v-model="stage.stageName" placeholder="VD: Giai đoạn 1: Làm đất (0-7 ngày)" class="font-bold" />
          </el-form-item>

          <!-- Tasks in Stage -->
          <div class="pl-4 border-l-2 border-gray-300 ml-2">
              <div v-for="(task, tIndex) in stage.tasks" :key="tIndex" class="mb-3 p-3 bg-white rounded shadow-sm relative group">
                  <el-button 
                    type="danger" 
                    link 
                    size="small"
                    class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="removeTaskFromStage(sIndex, tIndex)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>

                  <el-row :gutter="10">
                    <el-col :span="4">
                        <el-form-item label="Ngày (Offset)" class="mb-0">
                            <el-input-number v-model="task.day_offset" :min="0" :controls="false" class="w-full" placeholder="Ngày..." />
                        </el-form-item>
                    </el-col>
                    <el-col :span="10">
                            <el-form-item label="Loại công việc" class="mb-0">
                                <el-select v-model="task.job_type" placeholder="Chọn loại công việc" allow-create filterable default-first-option>
                                    <el-option
                                        v-for="type in JOB_TYPES"
                                        :key="type"
                                        :label="type"
                                        :value="type"
                                    />
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="10">
                            <el-form-item label="Vật tư gợi ý/Mặc định" class="mb-0">
                                <el-select 
                                    v-model="task.material_ids" 
                                    multiple 
                                    filterable 
                                    placeholder="Chọn vật tư..."
                                    collapse-tags
                                    collapse-tags-tooltip
                                >
                                    <el-option
                                        v-for="mat in materials"
                                        :key="mat.id"
                                        :label="mat.name"
                                        :value="mat.id"
                                    >
                                        <span class="float-start">{{ mat.name }}</span>
                                        <span class="float-end text-gray-400 text-xs ml-2">{{ mat.unit }}</span>
                                    </el-option>
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="14" class="mt-2">
                            <el-form-item label="Tên công việc (Chi tiết)" class="mb-0">
                                <el-input v-model="task.title" placeholder="VD: Bón lót lần 1..." />
                            </el-form-item>
                        </el-col>
                  </el-row>
                  <el-input v-model="task.description" type="textarea" :rows="1" placeholder="Mô tả chi tiết..." class="mt-2" />
                  <div class="mt-1">
                      <el-checkbox v-model="task.is_mandatory" size="small">Bắt buộc</el-checkbox>
                  </div>
              </div>
              
              <el-button type="dashed" size="small" @click="addTaskToStage(sIndex)">
                  <el-icon class="mr-1"><Plus /></el-icon> Thêm việc trong giai đoạn này
              </el-button>
          </div>
        </div>

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreateModal = false">Hủy</el-button>
          <el-button type="primary" :loading="submitting" @click="submitForm">
            {{ isEditing ? 'Cập nhật' : 'Lưu quy trình' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { Plus, Delete, Search } from '@element-plus/icons-vue';
import { ElMessage, type FormInstance } from 'element-plus';
import { farmApi, type ProcessTemplate, type Material } from '../api/farmApi';

const JOB_TYPES = [
    'Làm đất', 'Xuống giống', 'Bón phân', 'Tưới nước', 
    'Phun thuốc', 'Chăm sóc', 'Thu hoạch', 'Khác'
];

const materials = ref<Material[]>([]);

const templates = ref<ProcessTemplate[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const searchKeyword = ref('');

const filteredTemplates = computed(() => {
    if (!searchKeyword.value) return templates.value;
    return templates.value.filter(t => t.name.toLowerCase().includes(searchKeyword.value.toLowerCase()));
});

// Edit State
const isEditing = ref(false);
const currentId = ref<string | null>(null);

// Internal UI Structure
interface TaskUI {
  day_offset: number;
  title: string;
  description: string;
  is_mandatory: boolean;
  job_type: string;
  material_ids: string[];
}

interface StageGroup {
    stageName: string;
    tasks: TaskUI[];
}

const form = reactive({
  name: ''
});

const stageGroups = ref<StageGroup[]>([]);

const rules = {
  name: [{ required: true, message: 'Vui lòng nhập tên quy trình', trigger: 'blur' }]
};

const addStage = () => {
    stageGroups.value.push({
        stageName: '',
        tasks: [{ day_offset: 0, title: '', description: '', is_mandatory: false, job_type: '', material_ids: [] }]
    });
};

const removeStage = (index: number) => {
    stageGroups.value.splice(index, 1);
};

const addTaskToStage = (stageIndex: number) => {
    stageGroups.value[stageIndex].tasks.push({
        day_offset: 0,
        title: '',
        description: '',
        is_mandatory: false,

        job_type: '',
        material_ids: []
    });
};

const removeTaskFromStage = (stageIndex: number, taskIndex: number) => {
     stageGroups.value[stageIndex].tasks.splice(taskIndex, 1);
};

const loadData = async () => {
  loading.value = true;
  try {
    const { data } = await farmApi.getTemplates();
    templates.value = data;
  } catch (err) {
    ElMessage.error('Không thể tải danh sách quy trình');
  } finally {
    loading.value = false;
  }
};

const loadMaterials = async () => {
    try {
        const { data } = await farmApi.getMaterials();
        materials.value = data;
    } catch (err) {
        console.error('Failed to load materials');
    }
}

const openEditModal = (row: ProcessTemplate) => {
    isEditing.value = true;
    currentId.value = row.id;
    form.name = row.name;
    stageGroups.value = [];

    // Reconstruct Stage Groups from flat tasksConfig
    if (row.tasksConfig && row.tasksConfig.length > 0) {
        // Find unique stages, preserve order
        const stages = new Set(row.tasksConfig.map(t => t.stage || 'Giai đoạn chung'));
        
        stages.forEach(stageName => {
            const tasksInStage = row.tasksConfig.filter(t => (t.stage || 'Giai đoạn chung') === stageName);
            stageGroups.value.push({
                stageName: stageName,
                tasks: tasksInStage.map(t => ({
                    day_offset: t.day_offset,
                    title: t.title,
                    description: t.description || '',
                    is_mandatory: !!t.is_mandatory,
                    job_type: t.job_type || '', // Restore job_type
                    material_ids: t.material_ids || [] // Restore material_ids
                }))
            });
        });
    } else {
        addStage();
    }
    
    showCreateModal.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (stageGroups.value.length === 0) {
          ElMessage.warning('Vui lòng thêm ít nhất 1 giai đoạn');
          return;
      }

      // Flatten UI structure to API format
      const flatTasks = stageGroups.value.flatMap(group => {
          return group.tasks.map(task => ({
              stage: group.stageName,
              day_offset: task.day_offset,
              title: task.title,
              description: task.description,
              is_mandatory: task.is_mandatory,

              job_type: task.job_type,
              material_ids: task.material_ids,
              // Helper for backend/display if needed, though we primarily use material_ids now
              suggested_materials: materials.value
                .filter(m => task.material_ids.includes(m.id))
                .map(m => m.name)
          }));
      });

      const payload = {
          name: form.name,
          tasks_config: flatTasks
      };

      submitting.value = true;
      try {
        if (isEditing.value && currentId.value) {
            await farmApi.updateTemplate(currentId.value, payload);
            ElMessage.success('Cập nhật quy trình thành công');
        } else {
            await farmApi.createTemplate(payload);
            ElMessage.success('Tạo quy trình thành công');
        }
        
        showCreateModal.value = false;
        loadData();
      } catch (err: any) {
         ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const resetForm = () => {
  if (formRef.value) formRef.value.resetFields();
  stageGroups.value = [];
  addStage(); // Init with one stage
  isEditing.value = false;
  currentId.value = null;
};

onMounted(() => {
    loadData();
    loadMaterials();
    addStage();
});
</script>

