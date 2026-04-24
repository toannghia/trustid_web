```
<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../store/auth';
import { tenantApi } from '../api/tenant';
import { ElMessage } from 'element-plus';
import { Plus, Loading, CircleCheckFilled, WarningFilled, Refresh, OfficeBuilding, Check } from '@element-plus/icons-vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import axios from 'axios';
import MediaManager from '../components/MediaManager.vue';

// Address Data
import { vietnamUnits } from '@/common/data/vietnam-units';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const loading = ref(false);
const saving = ref(false);
const quillKey = ref(0);
const showMediaManager = ref(false);

const provinces = ref(vietnamUnits);
const wards = ref<any[]>([]);

const tenantForm = reactive({
    id: '',
    name: '',
    tax_code: '',
    gln: '',
    website: '',
    logo: '',
    email: '',
    phone: '',
    address: '',
    province: '',
    ward: '',
    gcpPrefix: '',
    description: '',
    is_nda_enabled: false,
    nda_sync_status: 'NONE',
    nda_error_msg: '',
    did: ''
});

const rules = computed(() => {
    const baseRules = {
        name: [{ required: true, message: 'Vui lòng nhập tên doanh nghiệp', trigger: 'blur' }],
        email: [{ type: 'email', message: 'Email không đúng định dạng', trigger: 'blur' }],
        province: [{ required: true, message: 'Vui lòng chọn Tỉnh/Thành phố', trigger: 'change' }],
        ward: [{ required: true, message: 'Vui lòng chọn Phường/Xã', trigger: 'change' }],
        address: [{ required: true, message: 'Vui lòng nhập địa chỉ chi tiết', trigger: 'blur' }],
    };

    if (tenantForm.is_nda_enabled) {
        return {
            ...baseRules,
            tax_code: [{ required: true, message: 'NDA: Vui lòng nhập Mã số thuế', trigger: 'blur' }],
            gln: [
                { required: true, message: 'NDA: Vui lòng nhập mã GLN', trigger: 'blur' },
                { min: 13, max: 13, message: 'Mã GLN phải có 13 số', trigger: 'blur' }
            ],
            logo: [{ required: true, message: 'NDA: Vui lòng upload Logo', trigger: 'change' }]
        };
    }
    return baseRules;
});

const formRef = ref<any>(null);

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
    return `${baseUrl}${path}`;
};

const handleProvinceChange = () => {
    tenantForm.ward = '';
    const prov = provinces.value.find(p => p.name === tenantForm.province);
    wards.value = prov ? prov.wards : [];
};

const fetchData = async () => {
    loading.value = true;
    try {
        const tenantId = user.value?.tenantId || user.value?.tenant_id;
        
        console.log('Fetching Tenant Data for ID:', tenantId); // DEBUG

        if (!tenantId) {
             // Don't show error if just waiting for user to load, unless we timed out or explicit check
             console.warn('Tenant ID missing, waiting for user data...');
             return; 
        }
        
        const { data } = await tenantApi.getById(tenantId);
        const tenant = data.data || data;
        
        console.log('Success Backend Response:', tenant); // DEBUG

        tenantForm.id = tenant.id;
        tenantForm.name = tenant.name;
        tenantForm.tax_code = tenant.taxCode || tenant.tax_code;
        tenantForm.gln = tenant.gln || '';
        tenantForm.logo = tenant.logo || '';
        tenantForm.website = tenant.website || '';
        
        tenantForm.email = tenant.email || '';
        tenantForm.phone = tenant.phone || '';
        tenantForm.address = tenant.address || '';
        tenantForm.province = tenant.province || '';
        tenantForm.ward = tenant.ward || '';
        tenantForm.gcpPrefix = tenant.gcpPrefix || tenant.gcp_prefix || '';
        tenantForm.description = tenant.description || '';
        
        tenantForm.is_nda_enabled = tenant.isNdaEnabled || tenant.is_nda_enabled || false;
        tenantForm.nda_sync_status = tenant.ndaStatus || tenant.nda_status || 'NONE'; 
        tenantForm.nda_error_msg = tenant.ndaErrorMsg || tenant.nda_error_msg || '';
        tenantForm.did = tenant.ndaDid || tenant.nda_did || '';
        
        if (tenantForm.province) {
            const prov = provinces.value.find(p => p.name === tenantForm.province);
            wards.value = prov ? prov.wards : [];
        }

        quillKey.value++;

    } catch (e: any) {
        console.error('API Error Detail:', e);
        const msg = e.response?.data?.message || e.message || 'Lỗi không xác định';
        ElMessage.error(`Lỗi tải thông tin: ${msg}`);
    } finally {
        loading.value = false;
    }
};

watch(() => user.value, (newVal) => {
    if (newVal?.tenantId) {
        fetchData();
    }
}, { immediate: true });

const openMediaManager = () => {
    showMediaManager.value = true;
};

const handleMediaSelect = (url: any) => {
    tenantForm.logo = Array.isArray(url) ? url[0] : url; 
    if (tenantForm.is_nda_enabled && formRef.value) {
        formRef.value.validateField('logo');
    }
};

const handleSave = async () => {
    if (!formRef.value) return;
    
    await formRef.value.validate(async (valid: boolean) => {
        if (valid) {
                await submitData();
        } else {
                ElMessage.warning('Vui lòng kiểm tra lại thông tin hồ sơ');
        }
    });
};

const submitData = async () => {
    saving.value = true;
    try {
        const payload = {
            name: tenantForm.name,
            taxCode: tenantForm.tax_code,
            gln: tenantForm.gln,
            logo: tenantForm.logo,
            website: tenantForm.website,
            email: tenantForm.email,
            phone: tenantForm.phone,
            address: tenantForm.address,
            province: tenantForm.province,
            ward: tenantForm.ward,
            gcpPrefix: tenantForm.gcpPrefix,
            description: tenantForm.description,
            isNdaEnabled: tenantForm.is_nda_enabled
        };

        await tenantApi.update(tenantForm.id, payload);
        ElMessage.success('Cập nhật thông tin thành công');
        fetchData(); // Reload to get updated status
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
        saving.value = false;
    }
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'PENDING': return { type: 'warning', text: 'Đang chờ duyệt' };
        case 'ACTIVE': return { type: 'success', text: 'Đã kết nối' };
        case 'REJECTED': return { type: 'danger', text: 'Bị từ chối' };
        default: return { type: 'info', text: 'Chưa đăng ký' };
    }
};

onMounted(() => {
    fetchData();
});
</script>

<template>
  <div>
    <LTEContentHeader title="Thông tin Doanh nghiệp" :breadcrumbs="[{ title: 'Tenant Settings' }]" />

    <LTECard variant="primary" outline>
        <template #header>
            <div class="flex justify-between items-center">
                <div class="font-bold flex items-center gap-2">
                    <el-icon><OfficeBuilding /></el-icon>
                    Hồ sơ Doanh nghiệp
                </div>
                <div class="flex items-center gap-2">
                     <el-tag :type="getStatusBadge(tenantForm.nda_sync_status).type" effect="dark" v-if="tenantForm.is_nda_enabled">
                         {{ getStatusBadge(tenantForm.nda_sync_status).text }}
                     </el-tag>
                </div>
            </div>
        </template>

        <div v-loading="loading" class="max-w-5xl mx-auto py-4">
             <!-- NDA Status & Registration -->
             <div class="mb-6 bg-gray-50 border rounded-lg p-4">
                 <div class="flex items-center justify-between">
                     <div>
                         <div class="text-lg font-bold flex items-center gap-2">
                             Kết nối Cổng truy xuất Quốc gia (NDA)
                             <el-switch 
                                v-model="tenantForm.is_nda_enabled" 
                                active-text="Đang BẬT" 
                                inactive-text="Đang TẮT" 
                                style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                                :disabled="tenantForm.nda_sync_status === 'SYNCED' || tenantForm.nda_sync_status === 'PENDING'"
                            />
                         </div>
                         <div class="text-sm text-gray-500 mt-1">Đồng bộ dữ liệu sản phẩm và lô hàng lên hệ thống quốc gia.</div>
                     </div>
                     <div>
                         <el-button 
                            v-if="tenantForm.is_nda_enabled && tenantForm.nda_sync_status === 'NONE'" 
                            type="success" 
                            :icon="CircleCheckFilled"
                            @click="handleSave"
                         >
                             Đăng ký kết nối
                         </el-button>
                         <el-button 
                            v-if="tenantForm.nda_sync_status === 'FAILED'" 
                            type="warning" 
                            :icon="WarningFilled"
                            @click="handleSave"
                         >
                             Gửi lại hồ sơ
                         </el-button>
                     </div>
                 </div>

                 <div v-if="tenantForm.did" class="mt-3 bg-white p-2 rounded border border-green-200 text-green-800 text-sm font-mono inline-flex items-center gap-2">
                    <el-icon><Refresh /></el-icon> DID: {{ tenantForm.did }}
                </div>
                
                <div v-if="tenantForm.nda_sync_status === 'FAILED' && tenantForm.nda_error_msg" class="mt-3 bg-red-50 p-3 rounded border border-red-200 text-red-700 text-sm">
                    <strong>Lý do từ chối:</strong> {{ tenantForm.nda_error_msg }}
                </div>
             </div>

             <!-- Main Form -->
             <el-form ref="formRef" :model="tenantForm" :rules="rules" label-position="top">
                <el-row :gutter="30">
                    <!-- Left Column: Logo & NDA Required Fields -->
                    <el-col :span="8">
                        <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 h-full">
                            <h3 class="font-bold text-gray-700 mb-4 border-b pb-2 border-blue-200">Thông tin định danh</h3>
                            
                            <el-form-item prop="logo" class="w-full">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Logo Doanh nghiệp <span v-if="tenantForm.is_nda_enabled" class="text-red-500">*</span></label>
                                <div 
                                    class="border-2 border-dashed border-gray-300 rounded-lg h-48 w-full flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition relative overflow-hidden bg-white"
                                    :class="{'border-red-500': tenantForm.is_nda_enabled && !tenantForm.logo}"
                                    @click="openMediaManager"
                                >
                                    <img v-if="tenantForm.logo" :src="getImageUrl(tenantForm.logo)" class="w-full h-full object-contain" />
                                    <div v-else class="text-center text-gray-400">
                                            <el-icon class="text-4xl mb-2"><Plus /></el-icon>
                                            <div class="text-sm">Chọn / Upload Logo</div>
                                    </div>
                                </div>
                            </el-form-item>

                            <el-form-item label="Mã số thuế" prop="tax_code">
                                <template #label>
                                    Mã số thuế <span v-if="tenantForm.is_nda_enabled" class="text-red-500">*</span>
                                </template>
                                <el-input v-model="tenantForm.tax_code" placeholder="Nhập MST" />
                            </el-form-item>

                            <el-form-item label="Mã GLN" prop="gln">
                                <template #label>
                                    Mã GLN (Global Location Number) <span v-if="tenantForm.is_nda_enabled" class="text-red-500">*</span>
                                </template>
                                <el-input v-model="tenantForm.gln" placeholder="Nhập mã GLN 13 số" maxlength="13" />
                            </el-form-item>
                            
                            <el-form-item label="Mã GCP (GS1 Prefix)" prop="gcpPrefix">
                                <el-input v-model="tenantForm.gcpPrefix" placeholder="Mã GS1 (Không bắt buộc)" />
                            </el-form-item>
                        </div>
                    </el-col>

                    <!-- Right Column: General Info -->
                    <el-col :span="16">
                         <!-- Row 1: Name & Email -->
                         <el-row :gutter="15">
                            <el-col :span="14">
                                <el-form-item label="Tên Doanh Nghiệp" prop="name">
                                    <el-input v-model="tenantForm.name" placeholder="Tên đầy đủ của doanh nghiệp" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="10">
                                <el-form-item label="Email" prop="email">
                                    <el-input v-model="tenantForm.email" placeholder="Email liên hệ" />
                                </el-form-item>
                            </el-col>
                         </el-row>

                         <!-- Row 2: Phone & Website -->
                         <el-row :gutter="15">
                             <el-col :span="10">
                                <el-form-item label="Điện thoại" prop="phone">
                                    <el-input v-model="tenantForm.phone" placeholder="Số điện thoại" />
                                </el-form-item>
                             </el-col>
                             <el-col :span="14">
                                <el-form-item label="Website" prop="website">
                                    <el-input v-model="tenantForm.website" placeholder="https://..." />
                                </el-form-item>
                             </el-col>
                         </el-row>

                         <el-divider content-position="left">Địa chỉ đăng ký</el-divider>

                         <!-- Row 3: Address (Province | Ward | Detail) -->
                         <el-row :gutter="15">
                            <el-col :span="8">
                                <el-form-item label="Tỉnh / Thành phố" prop="province">
                                    <el-select v-model="tenantForm.province" placeholder="Chọn Tỉnh" @change="handleProvinceChange" filterable allow-create class="w-full">
                                            <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
                                    </el-select>
                                </el-form-item>
                            </el-col>
                            <el-col :span="8">
                                 <el-form-item label="Phường / Xã" prop="ward">
                                    <el-select v-model="tenantForm.ward" placeholder="Chọn Xã" filterable allow-create class="w-full">
                                        <el-option v-for="w in wards" :key="w.name" :label="w.name" :value="w.name" />
                                    </el-select>
                                </el-form-item>
                            </el-col>
                            <el-col :span="8">
                                <el-form-item label="Địa chỉ chi tiết" prop="address">
                                    <el-input v-model="tenantForm.address" placeholder="Số nhà, tên đường..." />
                                </el-form-item>
                            </el-col>
                         </el-row>

                         <el-divider content-position="left">Giới thiệu</el-divider>
                         <div class="h-48 w-full mb-8">
                            <QuillEditor 
                                :key="quillKey"
                                v-model:content="tenantForm.description" 
                                contentType="html" 
                                theme="snow" 
                                toolbar="essential" 
                            />
                        </div>

                    </el-col>
                </el-row>
             </el-form>

             <div class="flex justify-end mt-8 border-t pt-4 sticky bottom-0 bg-white py-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] -mx-4 px-4 bg-opacity-95 backdrop-blur">
                 <el-button type="primary" size="large" @click="handleSave" :loading="saving" style="min-width: 150px">
                     <el-icon class="mr-2"><Check /></el-icon> Cập nhật thông tin
                 </el-button>
             </div>
        </div>
    </LTECard>

    <MediaManager 
        v-model="showMediaManager" 
        :multiple="false"
        @select="handleMediaSelect"
    />
  </div>
</template>
