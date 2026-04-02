<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { codeApi } from '../api/code';
import { useAuthStore } from '../store/auth';
import { ElMessage, ElNotification } from 'element-plus';
import { tenantApi } from '../api/tenant';
import type { Tenant } from '@/types/core';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { Download, Plus, Search, View, UploadFilled } from '@element-plus/icons-vue';

interface CodePool {
  id: string;
  name: string;
  quantity: number;
  prefix: string;
  status: string;
  created_at: string;
  tenant?: { id: string; name: string };
  activeCount?: number;
}
const authStore = useAuthStore();
const activeTab = ref('pools');
const loading = ref(false);
const pools = ref<CodePool[]>([]);
const tenants = ref<Tenant[]>([]); 

const isAdmin = computed(() => authStore.user?.role === 'ADMIN');

const getDefaultBatchName = () => {
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}.${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    const username = authStore.user?.username || 'user';
    return `Lô-${dateStr}-${username}`;
};

// --- POOLS STATE ---
const poolFilter = reactive({
    search: '',
    status: '',
    tenantId: ''
});

// --- POOLS STATE ---
const generateForm = reactive({
  name: getDefaultBatchName(), // Set default name
  quantity: 1000,
  prefix: 'ZPS',
  includeLink: true,
  tenantId: ''
});

// --- CODE ITEMS STATE ---
const itemsLoading = ref(false);
const items = ref([]);
const itemTotal = ref(0);
const itemFilter = reactive({
    page: 1,
    limit: 20,
    search: '',
    status: '',
    tenantId: '',
    poolId: '',
    fromDate: '',
    toDate: ''
});




// --- IMPORT STATE ---
const importLoading = ref(false);
const importForm = reactive({
    name: getDefaultBatchName(),
    tenantId: '',
    file: null as File | null
});

// --- FUNCTIONS ---

const handleFileChange = (uploadFile: any) => {
    importForm.file = uploadFile.raw;
};

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
        
        // Reset form
        importForm.name = getDefaultBatchName();
        importForm.file = null; 
        
        activeTab.value = 'pools';
        fetchPools();
    } catch (e: any) {
        console.error(e);
        ElNotification({
            title: 'Import thất bại',
            message: e.response?.data?.message || 'Lỗi khi import file',
            type: 'error',
            duration: 0, // Không tự tắt
            position: 'top-right'
        });
    } finally {
        importLoading.value = false;
    }
};

const handleGenerate = async () => {
  if (generateForm.quantity <= 0) return ElMessage.error('Số lượng phải lớn hơn 0');
  if (!generateForm.name) return ElMessage.error('Vui lòng nhập tên lô mã');
  if (isAdmin.value && !generateForm.tenantId) return ElMessage.error('Vui lòng chọn Doanh nghiệp');

  try {
    loading.value = true;
    const payload = {
        ...generateForm,
        tenantId: generateForm.tenantId || undefined 
    };
    await codeApi.generate(payload);
    ElMessage.success('Sinh mã thành công');
    
    // Reset form but keep some defaults logic if needed, or just switch tab
    // Ideally generate a new default name for the next batch
    generateForm.name = getDefaultBatchName(); 
    
    activeTab.value = 'pools';
    fetchPools();
  } catch (err: any) {
    console.error('GENERATE ERROR:', err);
    console.error('Response Data:', err.response?.data);
    ElMessage.error(err.response?.data?.message || 'Lỗi hệ thống hoặc không đủ hạn mức');
  } finally {
    loading.value = false;
  }
};

const fetchPools = async () => {
  loading.value = true;
  try {
    const params: any = { ...poolFilter };
    Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
    });

    const { data } = await codeApi.getPools(params);
    pools.value = data.data || data.items || (Array.isArray(data) ? data : []);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const handlePoolFilter = () => {
    fetchPools();
};

const handleResetPoolFilter = () => {
    poolFilter.search = '';
    poolFilter.status = '';
    poolFilter.tenantId = '';
    fetchPools();
};

const fetchTenants = async () => {
  try {
    const { data } = await tenantApi.getAll({});
    tenants.value = data.data || (Array.isArray(data) ? data : []);
  } catch (e) {
    console.error(e);
  }
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
  } catch (e) {
    ElMessage.error('Không thể tải file excel');
  }
};



// --- ITEM FUNCTIONS ---
const fetchItems = async () => {
    itemsLoading.value = true;
    try {
        const params: any = {
            ...itemFilter,
            page: itemFilter.page,
            limit: itemFilter.limit
        };
        // Clean empty params
        Object.keys(params).forEach(key => {
            if (params[key] === '' || params[key] === null) delete params[key];
        });

        const { data } = await codeApi.getStampItems(params);
        items.value = data.data;
        itemTotal.value = data.meta.total;
    } catch (e) {
        console.error(e);
        ElMessage.error('Không thể tải danh sách mã');
    } finally {
        itemsLoading.value = false;
    }
};

const viewPoolDetails = (pool: any) => {
    itemFilter.poolId = pool.id;
    // Reset other filters to focus on this pool
    itemFilter.page = 1;
    itemFilter.search = '';
    itemFilter.status = '';
    itemFilter.tenantId = ''; 
    itemFilter.fromDate = '';
    itemFilter.toDate = '';
    
    activeTab.value = 'items';
    fetchItems();
};

const handleFilter = () => {
    itemFilter.page = 1;
    fetchItems();
};

const handleResetFilter = () => {
    itemFilter.search = '';
    itemFilter.status = '';
    itemFilter.tenantId = '';
    itemFilter.poolId = '';
    itemFilter.fromDate = '';
    itemFilter.toDate = '';
    itemFilter.page = 1;
    fetchItems();
};

const handlePageChange = (page: number) => {
    itemFilter.page = page;
    fetchItems();
};

watch(activeTab, (val) => {
    if (val === 'items' && items.value.length === 0) {
        fetchItems();
    }
});

// --- QUOTA LOGIC ---
const currentTenant = ref<Tenant | null>(null);
const adminSelectedTenant = ref<Tenant | null>(null);

const fetchQuotaData = async () => {
    // 1. If Admin: Fetch the selected tenant if ID exists
    if (isAdmin.value) {
        if (generateForm.tenantId) {
             try {
                const { data } = await tenantApi.getById(generateForm.tenantId);
                adminSelectedTenant.value = data;
            } catch (e) {
                console.error(e);
            }
        } else {
            adminSelectedTenant.value = null;
        }
    } 
    // 2. If User: Fetch own data to get fresh quota
    else if (authStore.user?.tenantId) {
        try {
            const { data } = await tenantApi.getById(authStore.user.tenantId);
            currentTenant.value = data;
        } catch (e) {
            console.error(e);
        }
    }
};

// Wrapper for Admin select change
const fetchSelectedTenantQuota = () => {
    fetchQuotaData();
};

const selectedTenantQuota = computed(() => {
    if (isAdmin.value) {
        return adminSelectedTenant.value ? (adminSelectedTenant.value.codeQuota || 0) : null;
    } else {
        return currentTenant.value ? (currentTenant.value.codeQuota || 0) : (authStore.user?.tenant?.codeQuota || 0);
    }
});

const selectedTenantGenerated = computed(() => {
    if (isAdmin.value) {
        return adminSelectedTenant.value ? ((adminSelectedTenant.value as any).totalGenerated || 0) : 0;
    } else {
        // If currentTenant is loaded use it, otherwise fallback (though authStore usually doesn't have totalGenerated) 
        return currentTenant.value ? ((currentTenant.value as any).totalGenerated || 0) : 0;
    }
});

watch(activeTab, (val) => {
    if (val === 'items' && items.value.length === 0) {
        fetchItems();
    }
    if (val === 'generate') {
        fetchQuotaData();
        generateForm.name = getDefaultBatchName();
    }
});

watch(() => authStore.user?.tenantId, (newVal) => {
    if (newVal && !isAdmin.value) {
        fetchQuotaData();
    }
});

onMounted(() => {
  fetchPools();
  if (isAdmin.value) {
    fetchTenants();
  } else {
    fetchQuotaData();
  }
});
</script>

<template>
  <div>
    <LTEContentHeader title="Quản lý Lô mã & Tem" :breadcrumbs="[{ title: 'Stamp Management' }]" />
    
    <div class="p-4">
      <el-tabs v-model="activeTab" type="border-card">
        
        <!-- TAB 1: DANH SÁCH LÔ MÃ -->
        <el-tab-pane label="Danh sách lô mã" name="pools">
            <!-- Pool Filter -->
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

          <el-table :data="pools" v-loading="loading" stripe border style="width: 100%">
            <el-table-column prop="name" label="Tên lô mã" min-width="180">
                 <template #default="{ row }">
                    <span class="font-medium text-blue-600 cursor-pointer hover:underline" @click="viewPoolDetails(row)">{{ row.name }}</span>
                 </template>
            </el-table-column>
            <el-table-column prop="quantity" label="Số lượng" width="120" align="right">
              <template #default="scope">
                {{ scope.row.quantity?.toLocaleString() }}
              </template>
            </el-table-column>
            
            <el-table-column label="Đã kích hoạt" width="140" align="center">
                <template #default="{ row }">
                   <div class="flex items-center justify-center gap-1 font-mono">
                      <span class="text-green-600 font-bold">{{ (row.activeCount || 0).toLocaleString() }}</span>
                      <span class="text-gray-400">/</span>
                      <span class="text-gray-600">{{ row.quantity?.toLocaleString() }}</span>
                   </div>
                   <el-progress 
                      :percentage="Math.min(Math.round(((row.activeCount || 0) / (row.quantity || 1)) * 100), 100)" 
                      :show-text="false" 
                      :stroke-width="4"
                      :color="row.activeCount === row.quantity ? '#67C23A' : '#409EFF'"
                      class="mt-1"
                   />
                </template>
            </el-table-column>
            <el-table-column prop="prefix" label="Tiền tố" width="100" align="center" />
             <el-table-column v-if="isAdmin" prop="tenant.name" label="Doanh nghiệp" min-width="150" />
            <el-table-column prop="status" label="Trạng thái" width="120" align="center">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'ACTIVE' ? 'success' : 'info'">{{ scope.row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="Ngày tạo" width="180">
              <template #default="scope">
                {{ scope.row.created_at ? new Date(scope.row.created_at).toLocaleString('vi-VN') : '' }}
              </template>
            </el-table-column>
            <el-table-column label="Thao tác" width="150" align="center">
              <template #default="scope">
                <div class="flex items-center justify-center gap-2">
                    <el-tooltip content="Xem chi tiết mã">
                        <el-button size="small" :icon="View" circle @click="viewPoolDetails(scope.row)" />
                    </el-tooltip>
                    <el-tooltip content="Tải Excel">
                        <el-button size="small" type="success" :icon="Download" circle @click="downloadExcel(scope.row)" />
                    </el-tooltip>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
  
        <!-- TAB 2: DANH SÁCH MÃ CHI TIẾT -->
        <el-tab-pane label="Tra cứu mã (Chi tiết)" name="items">
            <!-- Filter Bar -->
            <div class="mb-4 bg-gray-50 p-3 rounded border flex flex-wrap gap-3 items-end">
                <div class="w-48">
                    <div class="text-xs mb-1 text-gray-500">Tìm kiếm</div>
                    <el-input v-model="itemFilter.search" placeholder="Mã QR, Serial..." clearable @keyup.enter="handleFilter" />
                </div>
                
                 <div class="w-40">
                    <div class="text-xs mb-1 text-gray-500">Trạng thái</div>
                    <el-select v-model="itemFilter.status" placeholder="Tất cả" clearable @change="handleFilter">
                        <el-option label="Mới tạo (AVAILABLE)" value="AVAILABLE" />
                        <el-option label="Đã kích hoạt (ACTIVE)" value="ACTIVE" />
                        <el-option label="Đã quét (USED)" value="USED" />
                    </el-select>
                </div>

                <div v-if="isAdmin" class="w-48">
                     <div class="text-xs mb-1 text-gray-500">Doanh nghiệp</div>
                     <el-select v-model="itemFilter.tenantId" placeholder="Chọn Tenant" filterable clearable @change="handleFilter">
                        <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
                    </el-select>
                </div>
                
                 <div class="w-48">
                    <div class="text-xs mb-1 text-gray-500">Lô mã</div>
                    <el-select v-model="itemFilter.poolId" placeholder="Chọn lô mã" filterable clearable @change="handleFilter">
                        <el-option v-for="p in pools" :key="p.id" :label="p.name" :value="p.id" />
                    </el-select>
                </div>

                <div class="w-80">
                     <div class="text-xs mb-1 text-gray-500">Ngày tạo</div>
                     <div class="flex items-center">
                        <el-date-picker 
                            v-model="itemFilter.fromDate" 
                            type="date" 
                            placeholder="Từ ngày" 
                            value-format="YYYY-MM-DD"
                            style="width: 140px"
                            @change="handleFilter"
                        />
                        <span class="mx-2 text-gray-400">-</span>
                        <el-date-picker 
                            v-model="itemFilter.toDate" 
                            type="date" 
                            placeholder="Đến ngày" 
                            value-format="YYYY-MM-DD"
                            style="width: 140px"
                            @change="handleFilter"
                        />
                     </div>
                </div>

                <div class="flex-1 flex justify-end gap-2">
                    <el-button type="primary" :icon="Search" @click="handleFilter">Tìm kiếm</el-button>
                    <el-button @click="handleResetFilter">Đặt lại</el-button>
                </div>
            </div>

            <!-- Table -->
            <el-table :data="items" v-loading="itemsLoading" height="600" border stripe>
                <el-table-column prop="codeString" label="Mã QR (Hex)" width="220" font-family="monospace" />
                <el-table-column prop="serial" label="Serial" width="150" />
                <el-table-column prop="status" label="Trạng thái" width="120" align="center">
                    <template #default="{ row }">
                         <el-tag :type="row.status === 'ACTIVE' ? 'success' : row.status === 'USED' ? 'warning' : 'info'">{{ row.status }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="pool.name" label="Thuộc Lô" min-width="150" />
                 <el-table-column v-if="isAdmin" prop="pool.tenant.name" label="Doanh nghiệp" min-width="150" />
                <el-table-column prop="createdAt" label="Ngày tạo" width="160">
                     <template #default="{ row }">
                        {{ row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '' }}
                    </template>
                </el-table-column>
            </el-table>

            <div class="flex justify-end mt-4">
                 <el-pagination
                    v-model:current-page="itemFilter.page"
                    v-model:page-size="itemFilter.limit"
                    :total="itemTotal"
                    :page-sizes="[20, 50, 100, 200]"
                    layout="total, sizes, prev, pager, next, jumper"
                    @size-change="handleFilter"
                    @current-change="handlePageChange"
                />
            </div>
        </el-tab-pane>
  
        <!-- TAB 3: SINH MÃ MỚI -->
        <el-tab-pane label="Sinh mã mới" name="generate">
            <h3 class="text-lg font-bold mb-4 text-gray-700">Cấu hình sinh mã</h3>
            
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
                         <span class="font-bold text-green-600" title="Còn lại (Hạn mức)">{{ selectedTenantQuota.toLocaleString() }}</span>
                    </span>
                </div>
              </el-form-item>
              <el-form-item label="Tiền tố (Prefix)">
                <el-input v-model="generateForm.prefix" maxlength="10" placeholder="ZPS" />
              </el-form-item>
              
              <el-form-item v-if="isAdmin" label="Doanh nghiệp">
                <el-select v-model="generateForm.tenantId" placeholder="Chọn doanh nghiệp (Tạo hộ)" class="w-full" filterable @change="fetchSelectedTenantQuota">
                  <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
                </el-select>
              </el-form-item>
              <el-form-item v-else label="Doanh nghiệp">
                 <span class="font-bold text-gray-700">{{ authStore.user?.tenant_name }}</span>
              </el-form-item>
              
              <el-form-item>
                <el-checkbox v-model="generateForm.includeLink">Tạo sẵn Link truy xuất (QR)</el-checkbox>
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" :icon="Plus" @click="handleGenerate" :loading="loading">
                  Bắt đầu sinh mã
                </el-button>
              </el-form-item>
            </el-form>
        </el-tab-pane>

        <!-- TAB 4: NHẬP EXCEL -->
        <el-tab-pane label="Nhập Excel" name="import">
            <h3 class="text-lg font-bold mb-4 text-gray-700">Nhập mã từ Excel</h3>
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
                    <el-upload
                        class="upload-demo w-full"
                        drag
                        action="#"
                        :auto-upload="false"
                        :limit="1"
                        accept=".xlsx, .xls"
                        :on-change="handleFileChange"
                        :on-remove="() => importForm.file = null"
                    >
                        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                        <div class="el-upload__text">
                            Kéo thả file vào đây hoặc <em>nhấn để tải lên</em>
                        </div>
                        <template #tip>
                            <div class="el-upload__tip">
                                File Excel (.xlsx) chứa cột: Code, Serial, Link (nếu có)
                            </div>
                        </template>
                    </el-upload>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" @click="handleImport" :loading="importLoading">
                        Tiến hành Import
                    </el-button>
                </el-form-item>
            </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>