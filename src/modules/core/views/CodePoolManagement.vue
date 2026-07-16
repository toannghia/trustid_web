<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { codeApi } from '../api/code';
import { useAuthStore } from '../store/auth';
import { ElMessage, ElNotification } from 'element-plus';
import { tenantApi } from '../api/tenant';
import type { Tenant } from '@/types/core';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import { Download, Plus, Search, View, UploadFilled } from '@element-plus/icons-vue';

const router = useRouter();

interface CodePool {
  id: string;
  name: string;
  quantity: number;
  prefix: string;
  status: string;
  createdAt: string;
  startSerial?: number;
  endSerial?: number;
  tenant?: { id: string; name: string };
  activeCount?: number;
}

const authStore = useAuthStore();
const loading = ref(false);
const pools = ref<CodePool[]>([]);
const tenants = ref<Tenant[]>([]);
const isAdmin = computed(() => authStore.user?.role === 'ADMIN');

// --- DIALOG STATE ---
const generateDialogVisible = ref(false);
const importDialogVisible = ref(false);

const getDefaultBatchName = () => {
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
  const username = authStore.user?.username || 'user';
  return `Lô-${dateStr}-${username}`;
};

// --- POOL FILTER ---
const poolFilter = reactive({
  search: '',
  status: '',
  tenantId: ''
});
const currentPage = ref(1);
const pageSize = ref(10);
const totalPools = ref(0);

// --- GENERATE FORM ---
const generateForm = reactive({
  name: getDefaultBatchName(),
  quantity: 1000,
  prefix: 'ZPS',
  includeLink: true,
  tenantId: ''
});

// --- IMPORT FORM ---
const importLoading = ref(false);
const importForm = reactive({
  name: getDefaultBatchName(),
  tenantId: '',
  file: null as File | null
});

// --- QUOTA ---
const currentTenant = ref<Tenant | null>(null);
const adminSelectedTenant = ref<Tenant | null>(null);

const fetchQuotaData = async () => {
  if (isAdmin.value) {
    if (generateForm.tenantId) {
      try {
        const { data } = await tenantApi.getById(generateForm.tenantId);
        adminSelectedTenant.value = data;
      } catch (e) { console.error(e); }
    } else {
      adminSelectedTenant.value = null;
    }
  } else if (authStore.user?.tenantId) {
    try {
      const { data } = await tenantApi.getById(authStore.user.tenantId);
      currentTenant.value = data;
    } catch (e) { console.error(e); }
  }
};

const selectedTenantQuota = computed(() => {
  if (isAdmin.value) {
    return adminSelectedTenant.value ? (adminSelectedTenant.value.codeQuota || 0) : null;
  }
  return currentTenant.value ? (currentTenant.value.codeQuota || 0) : (authStore.user?.tenant?.codeQuota || 0);
});

const selectedTenantGenerated = computed(() => {
  if (isAdmin.value) {
    return adminSelectedTenant.value ? ((adminSelectedTenant.value as any).totalGenerated || 0) : 0;
  }
  return currentTenant.value ? ((currentTenant.value as any).totalGenerated || 0) : 0;
});

// --- FUNCTIONS ---
const fetchPools = async () => {
  loading.value = true;
  try {
    const params: any = { ...poolFilter, page: currentPage.value, limit: pageSize.value };
    Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });
    const { data } = await codeApi.getPools(params);
    if (data && typeof data === 'object' && 'data' in data) {
      pools.value = data.data || [];
      totalPools.value = data.total || 0;
    } else {
      pools.value = data.data || data.items || (Array.isArray(data) ? data : []);
      totalPools.value = pools.value.length;
    }
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const handlePoolFilter = () => { currentPage.value = 1; fetchPools(); };
const handleResetPoolFilter = () => {
  poolFilter.search = ''; poolFilter.status = ''; poolFilter.tenantId = '';
  currentPage.value = 1; fetchPools();
};

watch([() => poolFilter.status, () => poolFilter.tenantId], () => { currentPage.value = 1; fetchPools(); });

let poolSearchTimeout: any = null;
watch(() => poolFilter.search, () => {
  if (poolSearchTimeout) clearTimeout(poolSearchTimeout);
  poolSearchTimeout = setTimeout(() => { currentPage.value = 1; fetchPools(); }, 300);
});

const handlePoolSizeChange = (val: number) => { pageSize.value = val; currentPage.value = 1; fetchPools(); };
const handlePoolCurrentChange = (val: number) => { currentPage.value = val; fetchPools(); };

const fetchTenants = async () => {
  try {
    const { data } = await tenantApi.getAll({});
    tenants.value = data.data || (Array.isArray(data) ? data : []);
  } catch (e) { console.error(e); }
};

const downloadExcel = async (pool: any) => {
  try {
    const response = await codeApi.exportExcel(pool.id);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${pool.name}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) { ElMessage.error('Không thể tải file excel'); }
};

const handleFileChange = (uploadFile: any) => { importForm.file = uploadFile.raw; };

const handleImport = async () => {
  if (!importForm.name) return ElMessage.error('Vui lòng nhập tên lô mã');
  if (isAdmin.value && !importForm.tenantId) return ElMessage.error('Vui lòng chọn Doanh nghiệp');
  if (!importForm.file) return ElMessage.error('Vui lòng chọn file Excel');
  importLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('name', importForm.name);
    if (importForm.tenantId) formData.append('tenantId', importForm.tenantId);
    formData.append('file', importForm.file);
    await codeApi.importExcel(formData);
    ElMessage.success('Import thành công');
    importForm.name = getDefaultBatchName();
    importForm.file = null;
    importDialogVisible.value = false;
    fetchPools();
  } catch (e: any) {
    ElNotification({ title: 'Import thất bại', message: e.response?.data?.message || 'Lỗi khi import file', type: 'error', duration: 0, position: 'top-right' });
  } finally { importLoading.value = false; }
};

const handleGenerate = async () => {
  if (generateForm.quantity <= 0) return ElMessage.error('Số lượng phải lớn hơn 0');
  if (!generateForm.name) return ElMessage.error('Vui lòng nhập tên lô mã');
  if (isAdmin.value && !generateForm.tenantId) return ElMessage.error('Vui lòng chọn Doanh nghiệp');
  try {
    loading.value = true;
    const payload = { ...generateForm, tenantId: generateForm.tenantId || undefined };
    await codeApi.generate(payload);
    ElMessage.success('Sinh mã thành công');
    generateForm.name = getDefaultBatchName();
    generateDialogVisible.value = false;
    fetchPools();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi hệ thống hoặc không đủ hạn mức');
  } finally { loading.value = false; }
};

const openGenerateDialog = () => {
  generateForm.name = getDefaultBatchName();
  fetchQuotaData();
  generateDialogVisible.value = true;
};

const openImportDialog = () => {
  importForm.name = getDefaultBatchName();
  importForm.file = null;
  importDialogVisible.value = true;
};

onMounted(() => {
  fetchPools();
  if (isAdmin.value) { fetchTenants(); }
  else { fetchQuotaData(); }
});
</script>

<template>
  <div>
    <LTEContentHeader title="Quản lý Cấp mã" :breadcrumbs="[{ title: 'Code Pool Management' }]" />

    <div class="p-4">
      <!-- HEADER ACTIONS -->
      <div class="mb-4 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-700">Danh sách lô mã</h3>
        <div class="flex gap-2">
          <el-button type="primary" :icon="Plus" @click="openGenerateDialog">Tạo mã mới</el-button>
          <el-button type="success" :icon="UploadFilled" @click="openImportDialog">Import Excel</el-button>
        </div>
      </div>

      <!-- FILTER BAR -->
      <div class="mb-4 bg-gray-50 p-3 rounded border flex flex-wrap gap-3 items-end">
        <div class="w-64">
          <div class="text-xs mb-1 text-gray-500">Tìm kiếm theo tên</div>
          <el-input v-model="poolFilter.search" placeholder="Mã vụ vải..." clearable @keyup.enter="handlePoolFilter" />
        </div>
        <div class="w-40">
          <div class="text-xs mb-1 text-gray-500">Trạng thái</div>
          <el-select v-model="poolFilter.status" placeholder="Tất cả" clearable @change="handlePoolFilter">
            <el-option label="Mới tạo (AVAILABLE)" value="AVAILABLE" />
            <el-option label="Đã xuất (EXPORTED)" value="EXPORTED" />
          </el-select>
        </div>
        <div v-if="isAdmin" class="w-48">
          <div class="text-xs mb-1 text-gray-500">Doanh nghiệp</div>
          <el-select v-model="poolFilter.tenantId" placeholder="Chọn Tenant" filterable clearable @change="handlePoolFilter">
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </div>
        <div class="flex-1 flex justify-end gap-2">
          <el-button type="primary" :icon="Search" @click="handlePoolFilter">Tìm kiếm</el-button>
          <el-button @click="handleResetPoolFilter">Đặt lại</el-button>
        </div>
      </div>

      <!-- POOL TABLE -->
      <el-table :data="pools" v-loading="loading" stripe border style="width: 100%">
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">{{ (currentPage - 1) * pageSize + $index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="name" label="Tên lô mã" min-width="180">
          <template #default="{ row }">
            <span class="font-medium text-blue-600 cursor-pointer hover:underline" @click="router.push({ path: '/codes/report', query: { poolId: row.id } })">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="Số lượng" width="120" align="right">
          <template #default="scope">{{ scope.row.quantity?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="Đã kích hoạt" width="140" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-1 font-mono">
              <span class="text-green-600 font-bold">{{ (row.activeCount || row.usedCount || 0).toLocaleString() }}</span>
              <span class="text-gray-400">/</span>
              <span class="text-gray-600">{{ row.quantity?.toLocaleString() }}</span>
            </div>
            <el-progress
              :percentage="Math.min(Math.round(((row.activeCount || row.usedCount || 0) / (row.quantity || 1)) * 100), 100)"
              :show-text="false" :stroke-width="4"
              :color="(row.activeCount || row.usedCount || 0) === row.quantity ? '#67C23A' : '#409EFF'"
              class="mt-1"
            />
          </template>
        </el-table-column>
        <el-table-column label="Serial (Đầu - Cuối)" min-width="160">
          <template #default="{ row }">
            <span v-if="row.startSerial" class="font-mono text-xs">
              {{ row.prefix }}-{{ row.startSerial }} → {{ row.prefix }}-{{ row.endSerial }}
            </span>
            <span v-else class="text-gray-400 text-xs">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="prefix" label="Tiền tố" width="100" align="center" />
        <el-table-column v-if="isAdmin" prop="tenant.name" label="Doanh nghiệp" min-width="150" />
        <el-table-column prop="status" label="Trạng thái" width="120" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'AVAILABLE' ? 'success' : scope.row.status === 'ACTIVE' ? 'primary' : scope.row.status === 'EXPORTED' ? 'warning' : 'info'">
              {{ 
                scope.row.status === 'AVAILABLE' ? 'Sẵn sàng' : 
                scope.row.status === 'ACTIVE' ? 'Đang sử dụng' : 
                scope.row.status === 'EXPORTED' ? 'Đã xuất' : 
                scope.row.status === 'INACTIVE' ? 'Ngừng sử dụng' : 
                scope.row.status === 'EXHAUSTED' ? 'Đã hết' : 
                scope.row.status 
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Người tạo" width="140">
          <template #default="{ row }">
            <span v-if="row.createdBy" class="text-sm">{{ row.createdBy.fullName || row.createdBy.username }}</span>
            <span v-else class="text-gray-400 text-xs">—</span>
          </template>
        </el-table-column>
        <el-table-column label="Lượt tải" width="90" align="center">
          <template #default="{ row }">
            <span v-if="row.downloadCount > 0" class="font-bold text-blue-600">{{ row.downloadCount }}</span>
            <span v-else class="text-gray-300">0</span>
          </template>
        </el-table-column>
        <el-table-column label="Ngày tạo" width="180">
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '' }}
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="120" align="center">
          <template #default="scope">
            <el-tooltip content="Tải Excel">
              <el-button size="small" type="success" :icon="Download" circle @click="downloadExcel(scope.row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>

      <!-- PAGINATION -->
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 50, 100, 500]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalPools"
          @size-change="handlePoolSizeChange"
          @current-change="handlePoolCurrentChange"
        />
      </div>
    </div>

    <!-- DIALOG: TẠO MÃ MỚI -->
    <el-dialog v-model="generateDialogVisible" title="Tạo mã mới" width="560px" destroy-on-close>
      <el-form :model="generateForm" label-width="150px">
        <el-form-item label="Tên lô mã" required>
          <el-input v-model="generateForm.name" placeholder="Ví dụ: Mã vải thiều 2026" />
        </el-form-item>
        <el-form-item label="Số lượng" required>
          <div class="flex items-center gap-2 w-full">
            <el-input-number v-model="generateForm.quantity" :min="1" :step="100" style="width: 150px" />
            <span v-if="selectedTenantQuota !== null" class="text-sm flex items-center gap-1 ml-2">
              <span class="font-bold text-black" title="Đã tạo">{{ selectedTenantGenerated?.toLocaleString() }}</span>
              <span class="text-gray-400">/</span>
              <span class="font-bold text-green-600" title="Hạn mức">{{ selectedTenantQuota.toLocaleString() }}</span>
            </span>
          </div>
        </el-form-item>
        <el-form-item label="Tiền tố (Prefix)">
          <el-input v-model="generateForm.prefix" maxlength="10" placeholder="ZPS" />
        </el-form-item>
        <el-form-item v-if="isAdmin" label="Doanh nghiệp">
          <el-select v-model="generateForm.tenantId" placeholder="Chọn doanh nghiệp" class="w-full" filterable @change="fetchQuotaData">
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="Doanh nghiệp">
          <span class="font-bold text-gray-700">{{ authStore.user?.tenant_name }}</span>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="generateForm.includeLink">Tạo sẵn Link truy xuất (QR)</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateDialogVisible = false">Hủy</el-button>
        <el-button type="primary" :icon="Plus" @click="handleGenerate" :loading="loading">Bắt đầu sinh mã</el-button>
      </template>
    </el-dialog>

    <!-- DIALOG: IMPORT EXCEL -->
    <el-dialog v-model="importDialogVisible" title="Nhập mã từ Excel" width="560px" destroy-on-close>
      <el-form :model="importForm" label-width="150px">
        <el-form-item label="Tên lô mã" required>
          <el-input v-model="importForm.name" placeholder="Ví dụ: Lô nhập khẩu 01" />
        </el-form-item>
        <el-form-item v-if="isAdmin" label="Doanh nghiệp" required>
          <el-select v-model="importForm.tenantId" placeholder="Chọn doanh nghiệp" class="w-full" filterable>
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="Doanh nghiệp">
          <span class="font-bold text-gray-700">{{ authStore.user?.tenant_name }}</span>
        </el-form-item>
        <el-form-item label="File Excel" required>
          <el-upload class="upload-demo w-full" drag action="#" :auto-upload="false" :limit="1"
            accept=".xlsx, .xls" :on-change="handleFileChange" :on-remove="() => importForm.file = null">
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">Kéo thả file vào đây hoặc <em>nhấn để tải lên</em></div>
            <template #tip>
              <div class="el-upload__tip">File Excel (.xlsx) chứa cột: Code, Serial, Link (nếu có)</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importDialogVisible = false">Hủy</el-button>
        <el-button type="primary" @click="handleImport" :loading="importLoading">Tiến hành Import</el-button>
      </template>
    </el-dialog>
  </div>
</template>
