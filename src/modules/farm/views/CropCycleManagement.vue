<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Vụ mùa</h1>
      <el-button type="success" @click="openStartModal">
        <el-icon class="mr-2"><VideoPlay /></el-icon>
        Bắt đầu vụ mới
      </el-button>
    </div>



    <!-- Tabs -->
    <el-tabs v-model="activeTab" class="mb-4">
        <el-tab-pane label="Danh sách mùa vụ" name="cycles">
            <!-- Toolbar -->
            <div class="mb-4 flex gap-4">
                <el-input v-model="searchKeyword" placeholder="Tìm vụ mùa..." class="w-64" prefix-icon="Search" clearable />
                <el-select v-model="filterStatus" placeholder="Trạng thái" clearable class="w-40">
                    <el-option label="Tất cả" value="" />
                    <el-option label="Đang diễn ra" value="ACTIVE" />
                    <el-option label="Hoàn thành" value="COMPLETED" />
                    <el-option label="Đã hủy" value="CANCELLED" />
                </el-select>
            </div>

            <!-- Table -->
            <el-card shadow="hover" class="mb-6">
            <el-table :data="filteredCycles" v-loading="loading" style="width: 100%">
                <el-table-column type="index" label="STT" width="60" align="center" />
                <el-table-column prop="name" label="Tên vụ mùa" min-width="200" />
                <el-table-column label="Vùng trồng" min-width="150">
                    <template #default="{ row }">
                        {{ row.location?.name || '---' }}
                    </template>
                </el-table-column>
                <el-table-column label="Ngày xuống giống" width="150">
                <template #default="{ row }">
                    {{ formatDate(row.startDate) }}
                </template>
                </el-table-column>
                <el-table-column prop="status" label="Trạng thái" width="120">
                <template #default="{ row }">
                    <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status }}</el-tag>
                </template>
                </el-table-column>
                <el-table-column label="Thao tác" width="200" align="center" fixed="right">
                    <template #default="{ row }">
                        <el-button 
                            v-if="row.status === 'ACTIVE'"
                            type="success" 
                            link 
                            size="small" 
                            @click="openHarvestModal(row)"
                        >
                            Thu hoạch
                        </el-button>
                        <el-button type="primary" link size="small" @click="openEditModal(row)">Sửa</el-button>
                    </template>
                </el-table-column>
            </el-table>
            </el-card>
        </el-tab-pane>

        <el-tab-pane label="Lô thu hoạch (Batches)" name="batches">
            <BatchManagement />
        </el-tab-pane>
    </el-tabs>

    <!-- Start/Edit Modal -->
    <el-dialog
      v-model="showStartModal"
      :title="isEditing ? 'Cập nhật Vụ mùa' : 'Khởi tạo Vụ mùa mới'"
      width="500px"
      @closed="resetForm"
    >
      <el-form :model="form" label-position="top" :rules="rules" ref="formRef">
        
        <el-form-item label="Tên vụ mùa" prop="name">
          <el-input v-model="form.name" placeholder="VD: Vụ Vải thiều 2026" />
        </el-form-item>

        <el-form-item label="Chọn Vùng trồng" prop="location_id">
          <el-select v-model="form.location_id" placeholder="Chọn vùng trồng" class="w-full" :disabled="isEditing">
            <el-option 
                v-for="loc in locations" 
                :key="loc.id" 
                :label="loc.name" 
                :value="loc.id" 
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Áp dụng Quy trình mẫu" prop="template_id">
          <el-select v-model="form.template_id" placeholder="Chọn quy trình" class="w-full" :disabled="isEditing">
            <el-option 
                v-for="tpl in templates" 
                :key="tpl.id" 
                :label="tpl.name" 
                :value="tpl.id" 
            />
          </el-select>
          <div class="text-xs text-gray-500 mt-1" v-if="!isEditing">
              Hệ thống sẽ tự động sinh các đầu việc hàng ngày dựa trên ngày bắt đầu.
          </div>
        </el-form-item>

        <el-form-item label="Ngày bắt đầu (Xuống giống)" prop="start_date">
          <el-date-picker
            v-model="form.start_date"
            type="date"
            placeholder="Chọn ngày"
            class="w-full"
            format="DD/MM/YYYY"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showStartModal = false">Hủy</el-button>
          <el-button type="success" :loading="submitting" @click="submitForm">
            {{ isEditing ? 'Cập nhật' : 'Bắt đầu ngay' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <HarvestModal 
        v-if="selectedCycle"
        v-model="showHarvestModal" 
        :cycle-id="selectedCycle?.id"
        :cycle-name="selectedCycle?.name"
        @success="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { VideoPlay, Search } from '@element-plus/icons-vue';
import { ElMessage, type FormInstance } from 'element-plus';
import { farmApi, type CropCycle, type Location, type ProcessTemplate } from '../api/farmApi';
import dayjs from 'dayjs';
import HarvestModal from '../components/HarvestModal.vue';
import BatchManagement from './BatchManagement.vue';

const activeTab = ref('cycles');

const cycles = ref<CropCycle[]>([]);
const locations = ref<Location[]>([]);
const templates = ref<ProcessTemplate[]>([]);

const loading = ref(false);
const showStartModal = ref(false);
const showHarvestModal = ref(false); // New state
const selectedCycle = ref<CropCycle | null>(null); // New state

const submitting = ref(false);
const formRef = ref<FormInstance>();

const searchKeyword = ref('');
const filterStatus = ref('');

const filteredCycles = computed(() => {
    return cycles.value.filter(c => {
        const matchesName = c.name.toLowerCase().includes(searchKeyword.value.toLowerCase());
        const matchesStatus = filterStatus.value ? c.status === filterStatus.value : true;
        return matchesName && matchesStatus;
    });
});

// Edit State
const isEditing = ref(false);
const currentId = ref<string | null>(null);

const form = reactive({
  name: '',
  location_id: '',
  template_id: '',
  start_date: dayjs().format('YYYY-MM-DD')
});

const rules = {
  name: [{ required: true, message: 'Nhập tên vụ', trigger: 'blur' }],
  location_id: [{ required: true, message: 'Chọn vùng trồng', trigger: 'change' }],
  template_id: [{ required: true, message: 'Chọn quy trình', trigger: 'change' }],
  start_date: [{ required: true, message: 'Chọn ngày bắt đầu', trigger: 'change' }]
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('DD/MM/YYYY');
};

const loadData = async () => {
  loading.value = true;
  try {
    const { data } = await farmApi.getCycles();
    cycles.value = data;
  } catch (err) {
    ElMessage.error('Không thể tải danh sách vụ mùa');
  } finally {
    loading.value = false;
  }
};

const loadDropdowns = async () => {
    try {
        const [locRes, tplRes] = await Promise.all([
            farmApi.getLocations(),
            farmApi.getTemplates()
        ]);
        locations.value = locRes.data;
        templates.value = tplRes.data;
    } catch (err) {
        ElMessage.error('Lỗi tải dữ liệu danh mục');
    }
}

const openStartModal = async () => {
    isEditing.value = false;
    currentId.value = null;
    form.name = '';
    form.location_id = '';
    form.template_id = '';
    form.start_date = dayjs().format('YYYY-MM-DD');
    
    showStartModal.value = true;
    await loadDropdowns();
};

const openEditModal = async (row: CropCycle) => {
    isEditing.value = true;
    currentId.value = row.id;
    
    // Determine IDs. 
    // row.location is object, row.locationId is ID (if api returns it, else use row.location?.id)
    form.name = row.name;
    form.location_id = row.locationId || row.location?.id || '';
    form.template_id = row.templateId || ''; 
    form.start_date = row.startDate ? dayjs(row.startDate).format('YYYY-MM-DD') : '';

    showStartModal.value = true;
    await loadDropdowns();
}

const openHarvestModal = (row: CropCycle) => {
    selectedCycle.value = row;
    showHarvestModal.value = true;
}

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        if (isEditing.value && currentId.value) {
            await farmApi.updateCycle(currentId.value, form);
            ElMessage.success('Cập nhật vụ mùa thành công');
        } else {
            await farmApi.startCycle(form);
            ElMessage.success('Khởi tạo vụ mùa thành công! Các công việc đã được sinh tự động.');
        }
        showStartModal.value = false;
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
  isEditing.value = false;
  currentId.value = null;
};

onMounted(loadData);
</script>
