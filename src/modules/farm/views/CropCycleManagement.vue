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
                    <el-option label="Đang canh tác" value="ACTIVE" />
                    <el-option label="Đã thu hoạch" value="HARVESTED" />
                    <el-option label="Hoàn thành" value="COMPLETED" />
                    <el-option label="Đã hủy" value="CANCELLED" />
                </el-select>
            </div>

            <!-- Table -->
            <el-card shadow="hover" class="mb-6">
            <el-table :data="filteredCycles" v-loading="loading" style="width: 100%">
                <el-table-column label="STT" width="60" align="center">
                  <template #default="{ $index }">
                    {{ (currentPage - 1) * pageSize + $index + 1 }}
                  </template>
                </el-table-column>
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
                <el-table-column label="Sản phẩm" min-width="200">
                  <template #default="{ row }">
                    <el-tag v-for="cp in (row.cycleProducts || [])" :key="cp.id"
                            size="small" class="mr-1 mb-1" type="success">
                      {{ cp.product?.name || '---' }}
                    </el-tag>
                    <span v-if="!row.cycleProducts?.length" class="text-gray-400">---</span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="Trạng thái" width="120">
                <template #default="{ row }">
                    <el-tag :type="row.status === 'ACTIVE' ? 'success' : row.status === 'CANCELLED' ? 'danger' : 'info'">
                        {{ seasonStatusMap[row.status] || row.status }}
                    </el-tag>
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

            <!-- Pagination -->
            <div class="flex justify-end mt-4">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="totalCycles"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
            </el-card>
        </el-tab-pane>

        <el-tab-pane label="Lô thu hoạch (Batches)" name="batches">
            <BatchManagement />
        </el-tab-pane>
    </el-tabs>

    <!-- Start/Edit Modal -->
    <el-dialog
      v-model="showStartModal"
      width="500px"
      class="branded-crop-cycle-dialog"
      :close-on-click-modal="false"
      :show-close="false"
      @closed="resetForm"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            {{ isEditing ? 'Cập nhật Vụ mùa' : 'Khởi tạo Vụ mùa mới' }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showStartModal = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <el-form :model="form" label-position="top" :rules="rules" ref="formRef" style="padding: 24px 24px 8px;">
        
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

        <el-form-item label="Sản phẩm dự kiến" prop="product_ids">
          <el-select v-model="form.product_ids" multiple filterable placeholder="Chọn sản phẩm..." class="w-full">
            <el-option v-for="p in allProducts" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <div class="text-xs text-gray-500 mt-1">
            Sản phẩm sẽ được gợi ý khi thu hoạch. Có thể thay đổi sau.
          </div>
        </el-form-item>

      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showStartModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button type="success" :loading="submitting" @click="submitForm" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
            {{ isEditing ? 'Cập nhật' : 'Bắt đầu ngay' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <HarvestModal 
        v-if="selectedCycle"
        v-model="showHarvestModal" 
        :cycle-id="selectedCycle?.id"
        :cycle-name="selectedCycle?.name"
        :cycle-products="selectedCycle?.cycleProducts"
        @success="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from 'vue';
import { VideoPlay, Search } from '@element-plus/icons-vue';
import { ElMessage, type FormInstance } from 'element-plus';
import { farmApi, type CropCycle, type Location, type ProcessTemplate } from '../api/farmApi';
import { productApi } from '@/modules/core/api/product';
import dayjs from 'dayjs';
import HarvestModal from '../components/HarvestModal.vue';
import BatchManagement from './BatchManagement.vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
import { seasonStatusMap } from '@/common/utils/vi-labels';

const activeTab = ref('cycles');

const cycles = ref<CropCycle[]>([]);
const locations = ref<Location[]>([]);
const templates = ref<ProcessTemplate[]>([]);
const allProducts = ref<any[]>([]);

const loading = ref(false);
const showStartModal = ref(false);
const showHarvestModal = ref(false); // New state
const selectedCycle = ref<CropCycle | null>(null); // New state

const submitting = ref(false);
const formRef = ref<FormInstance>();

const searchKeyword = ref('');
const filterStatus = ref('');

const currentPage = ref(1);
const pageSize = ref(10);
const totalCycles = ref(0);

const filteredCycles = computed(() => {
    return cycles.value;
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

watch(() => filterStatus.value, () => {
    handleFilterChange();
});

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

const form = reactive({
  name: '',
  location_id: '',
  template_id: '',
  start_date: dayjs().format('YYYY-MM-DD'),
  product_ids: [] as string[]
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
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value
    };
    if (searchKeyword.value) params.search = searchKeyword.value;
    if (filterStatus.value) params.status = filterStatus.value;

    const { data } = await farmApi.getCycles(params);
    if (data && typeof data === 'object' && 'data' in data) {
      cycles.value = data.data || [];
      totalCycles.value = data.total || 0;
    } else {
      cycles.value = data || [];
      totalCycles.value = cycles.value.length;
    }
  } catch (err) {
    ElMessage.error('Không thể tải danh sách vụ mùa');
  } finally {
    loading.value = false;
  }
};

const loadDropdowns = async () => {
    try {
        const [locRes, tplRes, prodRes] = await Promise.all([
            farmApi.getLocations(),
            farmApi.getTemplates(),
            productApi.getList({ limit: 200 })
        ]);
        locations.value = locRes.data;
        templates.value = tplRes.data;
        allProducts.value = prodRes.data?.data || prodRes.data?.items || (Array.isArray(prodRes.data) ? prodRes.data : []);
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
    form.product_ids = [];
    
    showStartModal.value = true;
    await loadDropdowns();
};

const openEditModal = async (row: CropCycle) => {
    isEditing.value = true;
    currentId.value = row.id;
    selectedCycle.value = row;
    
    // Determine IDs. 
    // row.location is object, row.locationId is ID (if api returns it, else use row.location?.id)
    form.name = row.name;
    form.location_id = row.locationId || row.location?.id || '';
    form.template_id = row.templateId || ''; 
    form.start_date = row.startDate ? dayjs(row.startDate).format('YYYY-MM-DD') : '';
    form.product_ids = row.cycleProducts?.map(cp => cp.productId) || [];

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
            await farmApi.updateCycle(currentId.value, {
                location_id: form.location_id,
                template_id: form.template_id,
                name: form.name,
                start_date: form.start_date
            });
            // Update M2M product associations
            const originalProductIds = selectedCycle.value?.cycleProducts?.map(cp => cp.productId) || [];
            const added = form.product_ids.filter(id => !originalProductIds.includes(id));
            const removed = originalProductIds.filter(id => !form.product_ids.includes(id));

            if (added.length > 0) {
                await farmApi.addCycleProducts(currentId.value, added);
            }
            if (removed.length > 0) {
                await Promise.all(removed.map(pid => farmApi.removeCycleProduct(currentId.value!, pid)));
            }
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

<style>
.branded-crop-cycle-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-crop-cycle-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-crop-cycle-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-crop-cycle-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
