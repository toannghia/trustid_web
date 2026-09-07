<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue';
import { tenantApi } from '../api/tenant';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
    Setting, Top, Edit, CirclePlus, User, CopyDocument, 
    Connection, Histogram, Coordinate, ShoppingCart, Cpu 
} from '@element-plus/icons-vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
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
  { label: 'Uy tín', prop: 'trusted', visible: true },
  { label: 'Modules', prop: 'modules', visible: true }
]);

const filter = reactive({
  search: '',
  province: '',
  ward: '',
  trustedOnly: false,
  type: 'main'
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

const page = ref(1);
const limit = ref(10);
const totalTenants = ref(0);

const handlePageChange = (val: number) => {
    page.value = val;
    fetchTenants();
};

const handleSizeChange = (val: number) => {
    limit.value = val;
    page.value = 1;
    fetchTenants();
};

const handleFilterChange = () => {
    page.value = 1;
    fetchTenants();
};

import { watch } from 'vue';
let searchTimeout: any = null;
watch(() => filter.search, () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        handleFilterChange();
    }, 300);
});

watch([() => filter.province, () => filter.trustedOnly, () => filter.type], () => {
    handleFilterChange();
});

const fetchTenants = async () => {
    loading.value = true;
    try {
        // Build Params
        const params: any = { 
            search: filter.search,
            page: page.value,
            limit: limit.value
        };
        if (filter.province) params.province = filter.province;
        if (filter.trustedOnly) params.isTrustedPartner = true;
        if (filter.type) params.type = filter.type;

        const { data } = await tenantApi.getAll(params);
        if (data && data.data && Array.isArray(data.data)) {
            tenants.value = data.data;
            totalTenants.value = data.meta?.total || data.data.length;
        } else {
            tenants.value = data.data || data.items || (Array.isArray(data) ? data : []);
            totalTenants.value = tenants.value.length;
        }
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

const isTrustedPartner = (row: any) => row.isTrustedPartner || row.is_trusted_partner || false;
const trustedPartnerOrder = (row: any) => row.trustedPartnerOrder ?? row.trusted_partner_order ?? null;

// ... (Quota & Module Config Logic) ...
const quotaModal = ref(false);
const quotaTenant = ref<any>(null);
const quotaForm = reactive({ tenantId: '', amount: 1000 });
const submittingQuota = ref(false);

const handleGrantQuota = (row: any) => { 
    quotaTenant.value = row;
    quotaForm.tenantId = row.id; 
    quotaForm.amount = 1000; 
    quotaModal.value = true; 
};

const submitQuota = async () => { 
    if (!quotaForm.tenantId) return;
    if (!quotaForm.amount || quotaForm.amount <= 0) {
        ElMessage.warning('Vui lòng nhập số lượng mã tem hợp lệ');
        return;
    }
    submittingQuota.value = true;
    try { 
        await tenantApi.grantQuota(quotaForm.tenantId, quotaForm.amount); 
        ElMessage.success(`Cấp thành công ${quotaForm.amount.toLocaleString()} mã tem`); 
        quotaModal.value = false; 
        fetchTenants(); 
    } catch(e: any) { 
        console.error(e);
        ElMessage.error(e.response?.data?.message || 'Lỗi khi cấp hạn mức mã tem'); 
    } finally {
        submittingQuota.value = false;
    }
};

const moduleModal = ref(false);
const workingTenant = ref<any>(null);
const workingModules = ref({ farm: false, retail: false, iot: false });
const originalModules = ref({ farm: false, retail: false, iot: false });
const savingModules = ref(false);

const isModulesChanged = computed(() => {
    return workingModules.value.farm !== originalModules.value.farm ||
           workingModules.value.retail !== originalModules.value.retail ||
           workingModules.value.iot !== originalModules.value.iot;
});

const openModuleModal = (row: any) => { 
    workingTenant.value = row; 
    const config = row.module_config || row.moduleConfig || {};
    const initConf = {
        farm: config.farm ?? true,
        retail: config.retail ?? true,
        iot: config.iot ?? false
    };
    workingModules.value = { ...initConf }; 
    originalModules.value = { ...initConf };
    moduleModal.value = true; 
};

const saveModules = async () => {
    if (!workingTenant.value || !isModulesChanged.value) return;
    savingModules.value = true;
    try {
        const tenant = workingTenant.value;
        const newModuleConfig = {
            farm: workingModules.value.farm,
            retail: workingModules.value.retail,
            iot: workingModules.value.iot,
            supply: true
        };

        const payload = {
            ...tenant,
            name: tenant.name,
            taxCode: tenant.taxCode || tenant.tax_code,
            gln: tenant.gln || '',
            website: tenant.website || '',
            gcpPrefix: tenant.gcpPrefix || tenant.gcp_prefix || '',
            email: tenant.email,
            phone: tenant.phone,
            address: tenant.address,
            province: tenant.province || '',
            ward: tenant.ward || '',
            logo: tenant.logo || '',
            description: tenant.description || '',
            isNdaEnabled: tenant.isNdaEnabled || tenant.is_nda_enabled || false,
            isTrustedPartner: tenant.isTrustedPartner || tenant.is_trusted_partner || false,
            trustedPartnerOrder: tenant.trustedPartnerOrder ?? tenant.trusted_partner_order ?? null,
            module_config: newModuleConfig,
            moduleConfig: newModuleConfig
        };

        await tenantApi.update(tenant.id, payload);
        ElMessage.success('Cập nhật cấu hình phân hệ thành công'); 
        moduleModal.value = false; 
        fetchTenants();
    } catch (e: any) { 
        console.error('Lỗi saveModules:', e);
        const errorMsg = Array.isArray(e.response?.data?.message)
            ? e.response.data.message.join(', ')
            : (e.response?.data?.message || e.message || 'Cập nhật phân hệ thất bại');
        ElMessage.error(errorMsg); 
    } finally {
        savingModules.value = false;
    }
};

// --- RESOURCE QUOTA MANAGEMENT ---
const resourceQuotaModal = ref(false);
const resourceQuotaTenant = ref<any>(null);
const resourceQuotaLoading = ref(false);
const resourceQuotaSaving = ref(false);

const currentResourceQuota = reactive({
    CATEGORY: -1 as number,
    USER: -1 as number,
    PRODUCT: -1 as number,
});

const resourceQuotaForm = reactive({
    CATEGORY: -1 as number, // -1 = unlimited
    USER: -1 as number,
    PRODUCT: -1 as number,
});

const isResourceQuotaChanged = computed(() => {
    if (resourceQuotaLoading.value) return false;
    return resourceQuotaForm.PRODUCT !== currentResourceQuota.PRODUCT ||
           resourceQuotaForm.CATEGORY !== currentResourceQuota.CATEGORY ||
           resourceQuotaForm.USER !== currentResourceQuota.USER;
});

const openResourceQuotaModal = async (row: any) => {
    resourceQuotaTenant.value = row;
    resourceQuotaForm.CATEGORY = -1;
    resourceQuotaForm.USER = -1;
    resourceQuotaForm.PRODUCT = -1;
    currentResourceQuota.CATEGORY = -1;
    currentResourceQuota.USER = -1;
    currentResourceQuota.PRODUCT = -1;
    resourceQuotaModal.value = true;
    resourceQuotaLoading.value = true;
    try {
        const { data } = await tenantApi.getQuotas(row.id);
        const quotas = Array.isArray(data) ? data : (data.data || []);
        for (const q of quotas) {
            const type = q.resourceType || q.resource_type;
            const limit = q.limitAmount ?? q.limit_amount ?? -1;
            if (type === 'CATEGORY') {
                resourceQuotaForm.CATEGORY = limit;
                currentResourceQuota.CATEGORY = limit;
            }
            if (type === 'USER') {
                resourceQuotaForm.USER = limit;
                currentResourceQuota.USER = limit;
            }
            if (type === 'PRODUCT') {
                resourceQuotaForm.PRODUCT = limit;
                currentResourceQuota.PRODUCT = limit;
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        resourceQuotaLoading.value = false;
    }
};

const saveResourceQuota = async () => {
    if (!resourceQuotaTenant.value || !isResourceQuotaChanged.value) return;
    resourceQuotaSaving.value = true;
    try {
        const tenantId = resourceQuotaTenant.value.id;
        await Promise.all([
            tenantApi.setQuota(tenantId, 'CATEGORY', resourceQuotaForm.CATEGORY),
            tenantApi.setQuota(tenantId, 'USER', resourceQuotaForm.USER),
            tenantApi.setQuota(tenantId, 'PRODUCT', resourceQuotaForm.PRODUCT),
        ]);
        ElMessage.success('Đã lưu cấu hình hạn mức tài nguyên');
        resourceQuotaModal.value = false;
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi lưu hạn mức tài nguyên');
    } finally {
        resourceQuotaSaving.value = false;
    }
};

const getQuotaDisplayText = (val: number) => {
    if (val === -1 || val === null || val === undefined) return 'Không giới hạn';
    return val.toLocaleString();
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
            <el-select v-model="filter.type" placeholder="Loại doanh nghiệp" @change="fetchTenants" style="width: 180px">
                <el-option label="Doanh nghiệp chính" value="main" />
                <el-option label="Đại lý / Chi nhánh" value="dealer" />
                <el-option label="Tất cả" value="all" />
            </el-select>
            <el-switch
                v-model="filter.trustedOnly"
                active-text="Chỉ DN uy tín"
                @change="fetchTenants"
            />
         </div>
         <el-button type="primary" :icon="CirclePlus" @click="openCreateModal">Tạo doanh nghiệp</el-button>
      </div>

      <el-table :data="tenants" v-loading="loading" style="width: 100%" stripe border>
        <el-table-column label="STT" width="60" align="center">
            <template #default="scope">
                {{ (page - 1) * limit + scope.$index + 1 }}
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
                        <div class="font-bold text-blue-700 text-base leading-tight flex flex-wrap items-center gap-1.5">
                            <span>{{ scope.row.name }}</span>
                            <el-tag v-if="scope.row.isDealer" type="warning" size="small" effect="light">Đại lý</el-tag>
                        </div>
                        <div class="text-xs text-gray-500 mt-1">MST: <span class="font-mono text-black">{{ scope.row.taxCode || scope.row.tax_code }}</span></div>
                        <div v-if="scope.row.isDealer && scope.row.parentTenant" class="text-xs text-amber-600 mt-0.5">
                            Thuộc DN: <span class="font-semibold">{{ scope.row.parentTenant.name }}</span>
                        </div>
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

        <el-table-column label="Uy tín" width="140" align="center" v-if="columns[5].visible">
            <template #default="scope">
                <div v-if="isTrustedPartner(scope.row)" class="flex flex-col items-center gap-1">
                    <el-tag type="success" size="small">Đang hiển thị</el-tag>
                    <span v-if="trustedPartnerOrder(scope.row) !== null" class="text-xs text-gray-500">
                        Thứ tự: {{ trustedPartnerOrder(scope.row) }}
                    </span>
                </div>
                <el-tag v-else type="info" size="small">Không hiển thị</el-tag>
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
        
        <el-table-column label="Modules" width="220" v-if="columns[6].visible">
           <template #default="scope">
             <div class="flex flex-wrap gap-1" v-if="scope.row.moduleConfig || scope.row.module_config">
                <el-tag size="small" type="success" v-if="(scope.row.moduleConfig || scope.row.module_config).farm">Farm</el-tag>
                <el-tag size="small" type="warning" v-if="(scope.row.moduleConfig || scope.row.module_config).retail">Retail</el-tag>
                <el-tag size="small" color="#f3e8ff" style="color: #7e22ce; border-color: #e9d5ff;" v-if="(scope.row.moduleConfig || scope.row.module_config).iot">IoT</el-tag>
             </div>
             <span v-else class="text-xs text-slate-400 italic">Mặc định</span>
           </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="160" align="center" fixed="right">
          <template #default="scope">
             <div class="flex justify-center gap-2">
                <el-tooltip content="Chỉnh sửa" placement="top">
                    <el-button link type="primary" :icon="Edit" @click="openEditModal(scope.row)" />
                </el-tooltip>
                <el-tooltip content="Module" placement="top">
                    <el-button link type="warning" :icon="Setting" @click="openModuleModal(scope.row)" />
                </el-tooltip>
                <el-tooltip content="Hạn mức mã tem" placement="top">
                    <el-button link type="success" :icon="CirclePlus" @click="handleGrantQuota(scope.row)" />
                </el-tooltip>
                <el-tooltip content="Giới hạn tài nguyên" placement="top">
                    <el-button link type="danger" :icon="Histogram" @click="openResourceQuotaModal(scope.row)" />
                </el-tooltip>
             </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="p-4 flex justify-end">
          <el-pagination
              v-model:current-page="page"
              v-model:page-size="limit"
              :total="totalTenants"
              :page-sizes="[10, 50, 100, 500]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
          />
      </div>
    </LTECard>

    <TenantFormModal 
        v-model="showModal"
        :is-edit="isEdit"
        :initial-data="currentTenant"
        @saved="fetchTenants"
    />

    <!-- Branded Module Config Modal -->
    <el-dialog 
        v-model="moduleModal" 
        width="95%"
        style="max-width: 540px" 
        :close-on-click-modal="false"
        :show-close="false"
        class="branded-module-dialog"
    >
        <template #header>
            <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                    <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                    <div>
                        <div style="color: #fff; font-size: 16px; font-weight: 600; letter-spacing: 0.2px;">
                            Cấu hình phân hệ hoạt động
                        </div>
                        <div v-if="workingTenant" style="color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 2px;" class="truncate max-w-[340px]">
                            {{ workingTenant.name }}
                        </div>
                    </div>
                </div>
                <div 
                    style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); transition: all 0.2s;" 
                    class="hover:bg-white/20"
                    @click="moduleModal = false"
                >
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>

        <div class="p-6 bg-slate-50/50 space-y-3.5">
            <!-- Farm Module -->
            <div 
                class="rounded-xl border p-4 transition-all flex items-center justify-between gap-3 cursor-pointer"
                :class="workingModules.farm ? 'bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-100' : 'bg-white/60 border-slate-200 opacity-75'"
                @click="workingModules.farm = !workingModules.farm"
            >
                <div class="flex items-start gap-3">
                    <div 
                        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                        :class="workingModules.farm ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'"
                    >
                        <el-icon class="text-xl"><Coordinate /></el-icon>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-slate-800 text-sm">Nông trại (Farm Module)</span>
                            <el-tag :type="workingModules.farm ? 'success' : 'info'" size="small" effect="light" class="text-[11px] font-semibold">
                                {{ workingModules.farm ? 'Đang bật' : 'Đang tắt' }}
                            </el-tag>
                        </div>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                            Quản lý vùng trồng, lô thửa, nhật ký canh tác điện tử, mùa vụ & thu hoạch.
                        </p>
                    </div>
                </div>
                <div @click.stop>
                    <el-switch 
                        v-model="workingModules.farm" 
                        active-color="#00875A"
                    />
                </div>
            </div>

            <!-- Retail Module -->
            <div 
                class="rounded-xl border p-4 transition-all flex items-center justify-between gap-3 cursor-pointer"
                :class="workingModules.retail ? 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-100' : 'bg-white/60 border-slate-200 opacity-75'"
                @click="workingModules.retail = !workingModules.retail"
            >
                <div class="flex items-start gap-3">
                    <div 
                        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                        :class="workingModules.retail ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'"
                    >
                        <el-icon class="text-xl"><ShoppingCart /></el-icon>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-slate-800 text-sm">Phân phối & Bán lẻ (Retail Module)</span>
                            <el-tag :type="workingModules.retail ? 'warning' : 'info'" size="small" effect="light" class="text-[11px] font-semibold">
                                {{ workingModules.retail ? 'Đang bật' : 'Đang tắt' }}
                            </el-tag>
                        </div>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                            Quản lý mạng lưới đại lý, điểm bán lẻ, kích hoạt bảo hành & xuất bán POS.
                        </p>
                    </div>
                </div>
                <div @click.stop>
                    <el-switch 
                        v-model="workingModules.retail" 
                        active-color="#00875A"
                    />
                </div>
            </div>

            <!-- IoT Module -->
            <div 
                class="rounded-xl border p-4 transition-all flex items-center justify-between gap-3 cursor-pointer"
                :class="workingModules.iot ? 'bg-white border-purple-300 shadow-sm ring-1 ring-purple-100' : 'bg-white/60 border-slate-200 opacity-75'"
                @click="workingModules.iot = !workingModules.iot"
            >
                <div class="flex items-start gap-3">
                    <div 
                        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                        :class="workingModules.iot ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-400'"
                    >
                        <el-icon class="text-xl"><Cpu /></el-icon>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-slate-800 text-sm">Thiết bị IoT (IoT Module)</span>
                            <el-tag :type="workingModules.iot ? '' : 'info'" size="small" effect="light" class="text-[11px] font-semibold" :style="workingModules.iot ? 'background-color: #f3e8ff; color: #7e22ce; border-color: #e9d5ff;' : ''">
                                {{ workingModules.iot ? 'Đang bật' : 'Đang tắt' }}
                            </el-tag>
                        </div>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                            Kết nối trạm khí tượng, cảm biến đo độ ẩm đất, vi khí hậu & giám sát tự động.
                        </p>
                    </div>
                </div>
                <div @click.stop>
                    <el-switch 
                        v-model="workingModules.iot" 
                        active-color="#00875A"
                    />
                </div>
            </div>
        </div>

        <!-- Footer -->
        <template #footer>
            <div style="display: flex; align-items: center; justify-content: flex-end; padding: 16px 24px; background: #fff; border-top: 1px solid #f1f5f9; gap: 10px;">
                <el-button @click="moduleModal = false" style="border-radius: 8px; padding: 9px 20px;">Hủy bỏ</el-button>
                <el-button 
                    type="primary" 
                    :loading="savingModules" 
                    :disabled="!isModulesChanged"
                    @click="saveModules"
                    :style="{
                        borderRadius: '8px',
                        padding: '9px 24px',
                        fontWeight: '600',
                        background: !isModulesChanged ? 'rgba(0, 135, 90, 0.35)' : '#00875A',
                        borderColor: !isModulesChanged ? 'transparent' : '#00875A',
                        color: !isModulesChanged ? 'rgba(255, 255, 255, 0.85)' : '#fff',
                        cursor: !isModulesChanged ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease-in-out'
                    }"
                >
                    Lưu cấu hình
                </el-button>
            </div>
        </template>
    </el-dialog>
    <!-- Grant Quota Modal -->
    <el-dialog 
        v-model="quotaModal" 
        :show-close="false"
        width="90%"
        style="max-width: 420px"
        class="responsive-dialog branded-module-dialog"
    >
        <!-- Custom Branded Header -->
        <template #header>
            <div style="background: #0F2B46; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img :src="brandLogo" alt="TrustID Logo" style="height: 28px; width: auto; object-fit: contain;" />
                    <div style="width: 1px; height: 18px; background: rgba(255, 255, 255, 0.25);"></div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; line-height: 1.2;">
                            Thêm hạn mức mã tem
                        </span>
                        <span v-if="quotaTenant?.name" style="color: rgba(255, 255, 255, 0.7); font-size: 11px; margin-top: 2px;">
                            {{ quotaTenant.name }}
                        </span>
                    </div>
                </div>
                <div 
                    style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); transition: all 0.2s;" 
                    class="hover:bg-white/20"
                    @click="quotaModal = false"
                >
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>

        <div class="p-6 bg-slate-50/50">
            <label class="block text-xs font-semibold text-slate-700 mb-2">
                Số lượng mã tem cấp thêm:
            </label>
            <el-input-number 
                v-model="quotaForm.amount" 
                :min="1" 
                :step="1000" 
                class="w-full"
                controls-position="right"
            />
        </div>

        <!-- Footer -->
        <template #footer>
            <div style="display: flex; align-items: center; justify-content: flex-end; padding: 16px 24px; background: #fff; border-top: 1px solid #f1f5f9; gap: 10px;">
                <el-button @click="quotaModal = false" style="border-radius: 8px; padding: 9px 20px;">Hủy bỏ</el-button>
                <el-button 
                    type="primary" 
                    :loading="submittingQuota" 
                    @click="submitQuota"
                    style="border-radius: 8px; padding: 9px 24px; font-weight: 600; background: #00875A; border: none; color: #fff;"
                >
                    Cấp hạn mức
                </el-button>
            </div>
        </template>
    </el-dialog>

    <!-- Resource Quota Management Modal -->
    <el-dialog
        v-model="resourceQuotaModal"
        :show-close="false"
        width="90%"
        style="max-width: 480px"
        class="responsive-dialog branded-module-dialog"
        :close-on-click-modal="false"
    >
        <!-- Custom Branded Header -->
        <template #header>
            <div style="background: #0F2B46; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img :src="brandLogo" alt="TrustID Logo" style="height: 28px; width: auto; object-fit: contain;" />
                    <div style="width: 1px; height: 18px; background: rgba(255, 255, 255, 0.25);"></div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; line-height: 1.2;">
                            Cấu hình hạn mức tài nguyên
                        </span>
                        <span v-if="resourceQuotaTenant?.name" style="color: rgba(255, 255, 255, 0.7); font-size: 11px; margin-top: 2px;">
                            {{ resourceQuotaTenant.name }}
                        </span>
                    </div>
                </div>
                <div 
                    style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); transition: all 0.2s;" 
                    class="hover:bg-white/20"
                    @click="resourceQuotaModal = false"
                >
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>

        <div class="p-6 bg-slate-50/50" v-loading="resourceQuotaLoading">
            <div class="mb-4 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2">
                <span class="font-bold">ℹ️ Lưu ý:</span>
                <span>Đặt giá trị <b>-1</b> để Không giới hạn số lượng tài nguyên.</span>
            </div>

            <div class="space-y-3.5">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                        Số lượng sản phẩm tối đa:
                    </label>
                    <el-input-number
                        v-model="resourceQuotaForm.PRODUCT"
                        :min="-1"
                        :step="1"
                        controls-position="right"
                        class="w-full"
                    />
                    <div class="text-[11px] text-slate-400 mt-1">
                        Hạn mức đang áp dụng: <span class="font-semibold text-slate-600">{{ getQuotaDisplayText(currentResourceQuota.PRODUCT) }}</span>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                        Số lượng danh mục tối đa:
                    </label>
                    <el-input-number
                        v-model="resourceQuotaForm.CATEGORY"
                        :min="-1"
                        :step="1"
                        controls-position="right"
                        class="w-full"
                    />
                    <div class="text-[11px] text-slate-400 mt-1">
                        Hạn mức đang áp dụng: <span class="font-semibold text-slate-600">{{ getQuotaDisplayText(currentResourceQuota.CATEGORY) }}</span>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                        Số tài khoản người dùng tối đa:
                    </label>
                    <el-input-number
                        v-model="resourceQuotaForm.USER"
                        :min="-1"
                        :step="1"
                        controls-position="right"
                        class="w-full"
                    />
                    <div class="text-[11px] text-slate-400 mt-1">
                        Hạn mức đang áp dụng: <span class="font-semibold text-slate-600">{{ getQuotaDisplayText(currentResourceQuota.USER) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <template #footer>
            <div style="display: flex; align-items: center; justify-content: flex-end; padding: 16px 24px; background: #fff; border-top: 1px solid #f1f5f9; gap: 10px;">
                <el-button @click="resourceQuotaModal = false" style="border-radius: 8px; padding: 9px 20px;">Hủy bỏ</el-button>
                <el-button 
                    type="primary" 
                    :loading="resourceQuotaSaving" 
                    :disabled="!isResourceQuotaChanged"
                    @click="saveResourceQuota"
                    :style="{
                        borderRadius: '8px',
                        padding: '9px 24px',
                        fontWeight: '600',
                        background: !isResourceQuotaChanged ? 'rgba(0, 135, 90, 0.35)' : '#00875A',
                        borderColor: !isResourceQuotaChanged ? 'transparent' : '#00875A',
                        color: !isResourceQuotaChanged ? 'rgba(255, 255, 255, 0.85)' : '#fff',
                        cursor: !isResourceQuotaChanged ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease-in-out'
                    }"
                >
                    Lưu hạn mức
                </el-button>
            </div>
        </template>
    </el-dialog>

  </div>
</template>

<style>
.branded-module-dialog {
  border-radius: 12px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-module-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-module-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-module-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
