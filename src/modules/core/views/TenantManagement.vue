<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { tenantApi } from '../api/tenant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Setting, Top, Edit, CirclePlus, User, CopyDocument, Connection } from '@element-plus/icons-vue';
import TenantFormModal from '../components/TenantFormModal.vue';

const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    ElMessage.success('Đã copy mã DID');
};

const tenants = ref([]);
const loading = ref(false);
const showModal = ref(false);
const currentTenant = ref<any>(null);
const isEdit = ref(false);

const columns = ref([
  { label: 'Doanh nghiệp', prop: 'name', visible: true },
  { label: 'Mã số thuế', prop: 'tax_code', visible: true },
  { label: 'Địa chỉ', prop: 'address', visible: true },
  { label: 'Điện thoại', prop: 'phone', visible: true },
  { label: 'Email', prop: 'email', visible: true },
  { label: 'Modules', prop: 'modules', visible: true }
]);

const filter = reactive({
  search: '',
  province: '',
  ward: ''
});

import { vietnamUnits } from '@/common/data/vietnam-units';

// Use data for filters
const provinces = ref(vietnamUnits.map(p => p.name));

const openCreateModal = () => {
    isEdit.value = false;
    currentTenant.value = null;
    showModal.value = true;
};

const openEditModal = (tenant: any) => {
    isEdit.value = true;
    currentTenant.value = tenant;
    showModal.value = true;
};

const fetchTenants = async () => {
    loading.value = true;
    try {
        // Build Params
        const params: any = { search: filter.search };
        if (filter.province) params.province = filter.province;

        const { data } = await tenantApi.getAll(params);
        tenants.value = data.data || data.items || (Array.isArray(data) ? data : []);
    } catch (e) {
        console.error(e);
        ElMessage.error('Lỗi tải danh sách');
    } finally {
        loading.value = false;
    }
};

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
    return `${baseUrl}${path}`;
};

// ... (Quota & Module Config Mock Logic as before) ...
const quotaModal = ref(false);
const quotaForm = reactive({ tenantId: '', amount: 1000 });
const handleGrantQuota = (row: any) => { quotaForm.tenantId = row.id; quotaForm.amount = 1000; quotaModal.value = true; };
const submitQuota = async () => { /* ... reuse logic ... */ try { await tenantApi.grantQuota(quotaForm.tenantId, quotaForm.amount); ElMessage.success('OK'); quotaModal.value = false; fetchTenants(); } catch(e) { ElMessage.error('Fail'); } };

const moduleModal = ref(false);
const workingTenant = ref<any>(null);
const workingModules = ref({ farm: false, iot: false, retail: false });
const openModuleModal = (row: any) => { 
    workingTenant.value = row; 
    workingModules.value = row.module_config || { farm: true, iot: false, retail: true }; 
    moduleModal.value = true; 
};
const saveModules = async () => {
    if(!workingTenant.value) return;
    try {
        await tenantApi.update(workingTenant.value.id, { module_config: workingModules.value });
        ElMessage.success('Updated'); moduleModal.value = false; fetchTenants();
    } catch(e) { ElMessage.error('Fail'); }
};

// Helper status
const getNdaStatusText = (status: string | undefined | null) => {
    if (!status) return 'Chưa gửi';
    const s = String(status).toUpperCase();
    if (s === 'ACTIVE' || s === 'APPROVED' || s === 'COMPLETED') return 'Đã đồng bộ';
    if (['PENDING', 'QUEUED', 'PROCESSING', 'SENT_TO_NDA'].includes(s)) return 'Chờ duyệt';
    if (s === 'REJECTED' || s.startsWith('FAILED')) {
         if (s.includes('NDA_API')) return 'Lỗi hệ thống NDA';
         if (s.includes('AUTH')) return 'Lỗi xác thực';
         if (s.includes('UNKNOWN')) return 'Lỗi không xác định';
         return 'Lỗi / Từ chối';
    }
    return status;
};

const getNdaStatusType = (status: string | undefined | null) => {
    if (!status) return 'info';
    const s = String(status).toUpperCase();
    if (s === 'ACTIVE' || s === 'APPROVED' || s === 'COMPLETED') return 'success';
    if (['PENDING', 'QUEUED', 'PROCESSING', 'SENT_TO_NDA'].includes(s)) return 'warning';
    if (s === 'REJECTED' || s.startsWith('FAILED')) return 'danger';
    return 'info';
};

onMounted(() => {
    fetchTenants();
});
</script>

<template>
  <div>
    <LTEContentHeader title="Quản lý Doanh nghiệp" :breadcrumbs="[{ title: 'Tenants' }]" />

    <LTECard variant="primary" outline>
      <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
         <div class="flex gap-2 items-center flex-1">
            <el-input v-model="filter.search" placeholder="Tìm tên, MST..." style="width: 200px" @input="fetchTenants" clearable />
            <el-select v-model="filter.province" placeholder="Tỉnh/Thành" clearable @change="fetchTenants" style="width: 150px">
                <el-option v-for="p in provinces" :key="p" :label="p" :value="p" />
            </el-select>
         </div>
         <el-button type="primary" :icon="CirclePlus" @click="openCreateModal">Tạo doanh nghiệp</el-button>
      </div>

      <el-table :data="tenants" v-loading="loading" style="width: 100%" stripe border>
        <el-table-column label="STT" width="60" align="center">
            <template #default="scope">
                {{ scope.$index + 1 }}
            </template>
        </el-table-column>
        <el-table-column label="Thông tin doanh nghiệp" min-width="250" v-if="columns[0].visible">
            <template #default="scope">
                <div class="flex items-start gap-3">
                    <el-image 
                        v-if="scope.row.logo" 
                        :src="getImageUrl(scope.row.logo)" 
                        class="w-12 h-12 object-contain border rounded bg-gray-50 flex-shrink-0"
                    />
                    <div v-else class="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 flex-shrink-0">
                        <el-icon><User /></el-icon>
                    </div>
                    <div>
                        <div class="font-bold text-blue-700 text-base leading-tight">{{ scope.row.name }}</div>
                        <div class="text-xs text-gray-500 mt-1">MST: <span class="font-mono text-black">{{ scope.row.taxCode || scope.row.tax_code }}</span></div>
                    </div>
                </div>
            </template>
        </el-table-column>

        <el-table-column label="Kết nối NDA" width="220">
            <template #default="scope">
                <div v-if="scope.row.isNdaEnabled || scope.row.is_nda_enabled">
                     <div class="mb-2">
                        <el-tag :type="getNdaStatusType(scope.row.ndaStatus || scope.row.nda_status)" size="small">
                            {{ getNdaStatusText(scope.row.ndaStatus || scope.row.nda_status) }}
                        </el-tag>
                     </div>
                     <div v-if="scope.row.ndaDid || scope.row.nda_did" class="flex items-center gap-1 bg-gray-50 p-1 rounded border border-gray-200">
                        <el-icon class="text-blue-500"><Connection /></el-icon>
                        <span class="text-[10px] font-mono truncate w-24 text-gray-600" :title="scope.row.ndaDid || scope.row.nda_did">{{ scope.row.ndaDid || scope.row.nda_did }}</span>
                        <el-icon class="cursor-pointer hover:text-blue-600 ml-auto" @click="copyToClipboard(scope.row.ndaDid || scope.row.nda_did)"><CopyDocument /></el-icon>
                     </div>
                </div>
                <div v-else class="text-xs text-gray-400 italic">Chưa bật đồng bộ</div>
            </template>
        </el-table-column>



        <el-table-column label="Mã tem (QR)" width="200" align="center">
            <template #default="scope">
                 <div class="flex flex-col items-center">
                    <div class="text-sm font-semibold text-gray-700">
                        Hạn mức: <span class="text-blue-600">{{ (scope.row.codeQuota || 0).toLocaleString() }}</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        Đã dùng: {{ (scope.row.totalGenerated || 0).toLocaleString() }}
                    </div>
                     <div class="text-xs text-gray-400">
                        Tổng cộng: {{ ((scope.row.codeQuota || 0) + (scope.row.totalGenerated || 0)).toLocaleString() }}
                    </div>
                 </div>
            </template>
        </el-table-column>

        <el-table-column label="Liên hệ" width="200" v-if="columns[2].visible">
             <template #default="scope">
                <div class="text-xs space-y-1">
                    <div v-if="scope.row.phone"><span class="text-gray-500">Tel:</span> {{ scope.row.phone }}</div>
                    <div v-if="scope.row.email"><span class="text-gray-500">Email:</span> {{ scope.row.email }}</div>
                </div>
             </template>
        </el-table-column>
        
        <el-table-column label="Modules" width="180" v-if="columns[3].visible">
           <template #default="scope">
             <div class="flex flex-wrap gap-1" v-if="scope.row.moduleConfig || scope.row.module_config">
                <el-tag size="small" v-if="(scope.row.moduleConfig || scope.row.module_config).farm">Farm</el-tag>
                <el-tag size="small" type="warning" v-if="(scope.row.moduleConfig || scope.row.module_config).retail">Retail</el-tag>
             </div>
           </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="140" align="center" fixed="right">
          <template #default="scope">
             <div class="flex justify-center gap-2">
                <el-button link type="primary" :icon="Edit" @click="openEditModal(scope.row)" />
                <el-button link type="warning" :icon="Setting" @click="openModuleModal(scope.row)" />
                <el-button link type="success" :icon="CirclePlus" @click="handleGrantQuota(scope.row)" />
             </div>
          </template>
        </el-table-column>
      </el-table>
    </LTECard>

    <TenantFormModal 
        v-model="showModal"
        :is-edit="isEdit"
        :initial-data="currentTenant"
        @saved="fetchTenants"
    />

    <!-- Module Mock Modal Reuse (Simplified) -->
    <el-dialog 
        v-model="moduleModal" 
        title="Module Config" 
        width="90%"
        style="max-width: 400px"
        class="responsive-dialog"
    >
        <div class="space-y-4">
             <div class="flex justify-between"><span class="font-medium">Farm Module</span> <el-switch v-model="workingModules.farm" /></div>
             <div class="flex justify-between"><span class="font-medium">IoT Module</span> <el-switch v-model="workingModules.iot" /></div>
             <div class="flex justify-between"><span class="font-medium">Retail Module</span> <el-switch v-model="workingModules.retail" /></div>
        </div>
        <template #footer><el-button type="primary" @click="saveModules">Save</el-button></template>
    </el-dialog>
    <!-- Quota Mock Modal Reuse -->
    <el-dialog 
        v-model="quotaModal" 
        title="Grant Quota" 
        width="90%"
        style="max-width: 300px"
        class="responsive-dialog"
    >
        <el-input-number v-model="quotaForm.amount" :step="1000" class="w-full"/>
        <template #footer><el-button type="primary" @click="submitQuota">Grant</el-button></template>
    </el-dialog>

  </div>
</template>

