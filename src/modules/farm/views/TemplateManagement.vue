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
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">
            {{ (currentPage - 1) * pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="name" label="Tên quy trình" min-width="250" />
        <el-table-column label="Số lượng việc" width="150" align="center">
          <template #default="{ row }">
            <el-tag effect="plain">{{ row.tasksConfig?.length || 0 }} công việc</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="Trạng thái" width="120">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? 'Hoạt động' : 'Tạm dừng' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="100" align="center" fixed="right">
            <template #default="{ row }">
                 <el-button type="primary" link size="small" @click="openEditModal(row)">Sửa</el-button>
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
          :total="totalTemplates"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- Create/Edit Modal -->
    <el-dialog
      v-model="showCreateModal"
      width="900px"
      class="branded-template-dialog"
      :close-on-click-modal="false"
      :show-close="false"
      @closed="resetForm"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            {{ isEditing ? 'Cập nhật Quy trình mẫu' : 'Thiết lập Quy trình mẫu' }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showCreateModal = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <el-form :model="form" label-position="top" :rules="rules" ref="formRef" style="padding: 24px 24px 8px;">
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
            class="absolute top-2 right-2 z-10"
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
                    class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                            <el-form-item label="Loại công việc" class="mb-0" required>
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
                            <el-form-item label="Tên công việc (Chi tiết)" class="mb-0" required>
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
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showCreateModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button type="primary" :loading="submitting" @click="submitForm" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
            {{ isEditing ? 'Cập nhật' : 'Lưu quy trình' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from 'vue';
import { Plus, Delete, Search } from '@element-plus/icons-vue';
import { ElMessage, type FormInstance } from 'element-plus';
import { farmApi, type ProcessTemplate, type Material } from '../api/farmApi';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

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

const currentPage = ref(1);
const pageSize = ref(10);
const totalTemplates = ref(0);

const filteredTemplates = computed(() => {
    return templates.value;
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

let searchTimeout: any = null;
watch(() => searchKeyword.value, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    handleFilterChange();
  }, 300);
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
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value
    };
    if (searchKeyword.value) params.search = searchKeyword.value;

    const { data } = await farmApi.getTemplates(params);
    if (data && typeof data === 'object' && 'data' in data) {
      templates.value = data.data || [];
      totalTemplates.value = data.total || 0;
    } else {
      templates.value = data || [];
      totalTemplates.value = templates.value.length;
    }
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
  await formRef.value.validate(async (valid, fields) => {
    if (!valid) {
      ElMessage.warning('Vui lòng nhập đầy đủ các thông tin bắt buộc (Tên quy trình...)');
      return;
    }

    if (stageGroups.value.length === 0) {
        ElMessage.warning('Vui lòng thêm ít nhất 1 giai đoạn');
        return;
    }

    // Kiểm tra tên giai đoạn và các công việc bên trong
    for (let i = 0; i < stageGroups.value.length; i++) {
        const stage = stageGroups.value[i];
        if (!stage.stageName || !stage.stageName.trim()) {
            ElMessage.warning(`Vui lòng nhập Tên giai đoạn cho Giai đoạn thứ ${i + 1}`);
            return;
        }

        for (let j = 0; j < stage.tasks.length; j++) {
            const task = stage.tasks[j];
            if (!task.job_type) {
                ElMessage.warning(`Vui lòng chọn Loại công việc cho công việc thứ ${j + 1} của giai đoạn "${stage.stageName}"`);
                return;
            }
            if (!task.title || !task.title.trim()) {
                ElMessage.warning(`Vui lòng nhập Tên công việc (Chi tiết) cho công việc thứ ${j + 1} của giai đoạn "${stage.stageName}"`);
                return;
            }
        }
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

<style>
.branded-template-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-template-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-template-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-template-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>

