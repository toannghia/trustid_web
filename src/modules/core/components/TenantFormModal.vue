<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed } from 'vue';
import { tenantApi } from '../api/tenant';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { 
    Plus, Connection, CopyDocument, OfficeBuilding, 
    Postcard, Tickets, Message, Phone, Link, 
    Location, Picture, StarFilled, InfoFilled, Delete, Edit 
} from '@element-plus/icons-vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import MediaManager from './MediaManager.vue';

// Address Data
import { vietnamUnits } from '@/common/data/vietnam-units';

const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    ElMessage.success('Đã copy mã DID');
};

const provinces = ref(vietnamUnits);

const props = defineProps<{
    modelValue: boolean;
    isEdit: boolean;
    initialData: any;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const formRef = ref<FormInstance>();
const submitting = ref(false);
const quillKey = ref(0);
const showMediaInfo = ref(false);

const originalFormState = ref('');
const isFormChanged = computed(() => {
    return JSON.stringify(form) !== originalFormState.value;
});
const isSubmitDisabled = computed(() => {
    return props.isEdit && !isFormChanged.value;
});

const form = reactive<any>({
    id: '',
    name: '',
    taxCode: '',
    gln: '',
    website: '',
    gcpPrefix: '',
    email: '',
    phone: '',
    address: '',
    province: '',
    ward: '',
    logo: '',
    description: '',
    isNdaEnabled: false,
    isTrustedPartner: false,
    trustedPartnerOrder: null,
    ndaStatus: '',
    ndaDid: '',
    moduleConfig: { farm: true, supply: true, retail: true, iot: false }
});

// Dynamic Rules based on NDA Toggle
const rules = computed<FormRules>(() => {
    const baseRules: FormRules = {
        name: [
            { required: true, message: 'Vui lòng nhập tên doanh nghiệp', trigger: 'blur' },
            { min: 3, message: 'Tên quá ngắn', trigger: 'blur' }
        ],
        email: [
            { required: true, message: 'Vui lòng nhập email', trigger: 'blur' },
            { type: 'email', message: 'Email không đúng định dạng', trigger: 'blur' }
        ],
        phone: [
            { required: true, message: 'Vui lòng nhập số điện thoại', trigger: 'blur' }
        ],
        province: [
            { required: true, message: 'Vui lòng chọn Tỉnh/Thành phố', trigger: 'change' }
        ],
        ward: [
            { required: true, message: 'Vui lòng chọn Phường/Xã', trigger: 'change' }
        ],
        address: [
            { required: true, message: 'Vui lòng nhập địa chỉ chi tiết', trigger: 'blur' }
        ]
    };

    if (form.isNdaEnabled) {
        return {
            ...baseRules,
            taxCode: [
                { required: true, message: 'NDA bắt buộc: Vui lòng nhập Mã số thuế', trigger: 'blur' }
            ],
            gln: [
                { required: true, message: 'NDA bắt buộc: Vui lòng nhập mã GLN', trigger: 'blur' },
                { min: 13, max: 13, message: 'Mã GLN phải có 13 số', trigger: 'blur' }
            ],
            logo: [
                { required: true, message: 'NDA bắt buộc: Vui lòng upload Logo', trigger: 'change' }
            ]
        };
    }

    return baseRules;
});

const wards = ref<any[]>([]);

const handleProvinceChange = () => {
    form.ward = '';
    const prov = provinces.value.find(p => p.name === form.province);
    wards.value = prov ? prov.wards : [];
};

watch(() => props.modelValue, (val) => {
    if (val) {
        if (props.isEdit && props.initialData) {
            initEdit(props.initialData);
        } else {
            initCreate();
        }
        quillKey.value++; 
        nextTick(() => {
            formRef.value?.clearValidate();
            originalFormState.value = JSON.stringify(form);
        });
        setTimeout(() => {
            originalFormState.value = JSON.stringify(form);
        }, 100);
    }
});

const initCreate = () => {
    form.id = '';
    form.name = '';
    form.taxCode = '';
    form.gln = '';
    form.website = '';
    form.gcpPrefix = '';
    form.email = '';
    form.phone = '';
    form.address = '';
    form.province = '';
    form.ward = '';
    form.logo = '';
    form.description = '';
    form.isNdaEnabled = false;
    form.isTrustedPartner = false;
    form.trustedPartnerOrder = null;
    form.moduleConfig = { farm: true, supply: true, retail: true, iot: false };
    wards.value = [];
};

const initEdit = (data: any) => {
    form.id = data.id;
    form.name = data.name;
    form.taxCode = data.taxCode || data.tax_code;
    form.gln = data.gln || '';
    form.website = data.website || '';
    form.gcpPrefix = data.gcpPrefix || data.gcp_prefix || '';
    form.email = data.email;
    form.phone = data.phone;
    form.address = data.address;
    form.province = data.province || '';
    form.ward = data.ward || '';
    form.logo = data.logo || '';
    form.description = data.description || '';
    form.isNdaEnabled = data.isNdaEnabled || data.is_nda_enabled || false;
    form.isTrustedPartner = data.isTrustedPartner || data.is_trusted_partner || false;
    form.trustedPartnerOrder = data.trustedPartnerOrder ?? data.trusted_partner_order ?? null;
    form.ndaStatus = data.ndaStatus || data.nda_status || 'NONE';
    form.ndaDid = data.ndaDid || data.nda_did || '';
    form.moduleConfig = data.moduleConfig || data.module_config || { farm: true, supply: true, retail: true, iot: false };

    if (form.province) {
        const prov = provinces.value.find(p => p.name === form.province);
        wards.value = prov ? prov.wards : [];
    }
};

const openMediaManager = () => {
    showMediaInfo.value = true;
};

const handleMediaSelect = (url: any) => {
    // MediaManager might return string or string[]
    form.logo = Array.isArray(url) ? url[0] : url; 
    if (formRef.value) formRef.value.validateField('logo');
};

const removeLogo = (e?: Event) => {
    if (e) e.stopPropagation();
    form.logo = '';
    if (formRef.value && form.isNdaEnabled) {
        formRef.value.validateField('logo');
    }
};

watch(() => form.isTrustedPartner, (enabled) => {
    if (!enabled) {
        form.trustedPartnerOrder = null;
    }
});

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
    return `${baseUrl}${path}`;
};

const handleSubmit = async (formEl: FormInstance | undefined) => {
    if (!formEl || isSubmitDisabled.value) return;
    
    await formEl.validate(async (valid) => {
        if (valid) {
            submitting.value = true;
            try {
                const payload = {
                    ...form,
                    taxCode: form.taxCode?.trim() || null, 
                    gln: form.gln?.trim() || null,
                    website: form.website?.trim() || null,
                    gcpPrefix: form.gcpPrefix?.trim() || null,
                    email: form.email?.trim() || null,
                    phone: form.phone?.trim() || null,
                    address: form.address?.trim() || null,
                    isNdaEnabled: form.isNdaEnabled,
                    isTrustedPartner: form.isTrustedPartner,
                    trustedPartnerOrder: form.isTrustedPartner ? form.trustedPartnerOrder : null
                };
                
                if (props.isEdit && form.id) {
                    await tenantApi.update(form.id, payload);
                    ElMessage.success('Cập nhật thành công');
                } else {
                    await tenantApi.create(payload);
                    ElMessage.success('Tạo mới thành công');
                }
                emit('saved');
                emit('update:modelValue', false);
            } catch (e: any) {
                console.error(e);
                ElMessage.error(e.response?.data?.message || 'Có lỗi xảy ra');
            } finally {
                submitting.value = false;
            }
        } else {
            ElMessage.warning('Vui lòng kiểm tra lại các trường thông tin còn thiếu.');
        }
    });
};

const handleClose = () => {
    emit('update:modelValue', false);
};

// Helper status (duplicated from TenantManagement for consistency)
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
</script>

<template>
    <el-dialog 
        :model-value="modelValue" 
        width="95%"
        style="max-width: 960px" 
        top="4vh"
        :close-on-click-modal="false"
        :show-close="false"
        class="branded-tenant-dialog"
        @update:model-value="handleClose"
    >
        <!-- Header chuẩn TrustID -->
        <template #header>
            <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                    <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                    <span style="color: #fff; font-size: 16px; font-weight: 600; letter-spacing: 0.2px;">
                        {{ isEdit ? 'Cập nhật Doanh nghiệp' : 'Thêm Doanh nghiệp Mới' }}
                    </span>
                </div>
                <div 
                    style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); transition: all 0.2s;" 
                    class="hover:bg-white/20"
                    @click="handleClose"
                >
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>

        <!-- Body mở rộng tự nhiên -->
        <div class="p-6 bg-slate-50/50">
            <el-form 
                ref="formRef"
                :model="form"
                :rules="rules"
                label-position="top"
                style="--el-border-radius-base: 8px;"
            >
                <div class="space-y-5">
                    <!-- TẦNG 1: 2 CỘT ĐỐI XỨNG CÂN BẰNG (Top Section) -->
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        <!-- Cột Trái (4/12): Logo, NDA, Doanh nghiệp uy tín -->
                        <div class="lg:col-span-4 space-y-4">
                            <!-- Card 1: Logo -->
                            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                <div class="flex items-center justify-between mb-3">
                                    <span class="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                        <el-icon class="text-slate-500"><Picture /></el-icon>
                                        Logo Doanh nghiệp
                                        <span v-if="form.isNdaEnabled" class="text-red-500">*</span>
                                    </span>
                                    <span v-if="form.logo" class="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                                        Đã có logo
                                    </span>
                                </div>

                                <el-form-item prop="logo" class="mb-0">
                                    <div 
                                        class="w-full h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group transition-all"
                                        :class="[
                                            form.isNdaEnabled && !form.logo ? 'border-red-400 bg-red-50/20' : 'border-slate-200 hover:border-emerald-500 bg-slate-50/50'
                                        ]"
                                    >
                                        <!-- When logo exists -->
                                        <template v-if="form.logo">
                                            <img :src="getImageUrl(form.logo)" class="w-full h-full object-contain p-2" />
                                            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <el-button size="small" type="primary" :icon="Edit" @click="openMediaManager">
                                                    Đổi ảnh
                                                </el-button>
                                                <el-button size="small" type="danger" :icon="Delete" @click="removeLogo">
                                                    Xóa
                                                </el-button>
                                            </div>
                                        </template>

                                        <!-- When no logo -->
                                        <template v-else>
                                            <div 
                                                class="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center"
                                                @click="openMediaManager"
                                            >
                                                <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2 group-hover:bg-emerald-50 transition-colors">
                                                    <el-icon class="text-xl text-slate-400 group-hover:text-emerald-600 transition-colors"><Plus /></el-icon>
                                                </div>
                                                <div class="text-xs font-medium text-slate-600 group-hover:text-emerald-600">Chọn hoặc Tải Logo</div>
                                                <div class="text-[11px] text-slate-400 mt-1">Định dạng PNG, JPG, SVG</div>
                                            </div>
                                        </template>
                                    </div>
                                </el-form-item>
                            </div>

                            <!-- Card 2: NDA Trace -->
                            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <el-icon class="text-base"><Connection /></el-icon>
                                        </div>
                                        <span class="text-sm font-semibold text-slate-800">Cổng NDA Trace</span>
                                    </div>
                                    <el-switch 
                                        v-model="form.isNdaEnabled"
                                        active-color="#00875A"
                                    />
                                </div>

                                <div v-if="form.isNdaEnabled" class="bg-blue-50/80 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-700 flex items-start gap-1.5 leading-relaxed">
                                    <el-icon class="text-sm shrink-0 mt-0.5"><InfoFilled /></el-icon>
                                    <span>Bắt buộc nhập <strong>Mã số thuế</strong>, <strong>GLN (13 số)</strong> và <strong>Logo</strong> để đồng bộ dữ liệu quốc gia.</span>
                                </div>

                                <!-- NDA Status & DID (When Edit) -->
                                <div v-if="form.isNdaEnabled" class="pt-2 border-t border-slate-100 space-y-2.5">
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-slate-500 font-medium">Trạng thái NDA:</span>
                                        <el-tag :type="getNdaStatusType(form.ndaStatus)" size="small" effect="light" class="font-semibold">
                                            {{ getNdaStatusText(form.ndaStatus) }}
                                        </el-tag>
                                    </div>

                                    <div v-if="form.ndaDid">
                                        <span class="text-[11px] font-medium text-slate-500 mb-1 block">Mã định danh (DID):</span>
                                        <el-input v-model="form.ndaDid" readonly size="small" :prefix-icon="Connection">
                                            <template #append>
                                                <el-button @click="copyToClipboard(form.ndaDid)" title="Copy DID">
                                                    <el-icon><CopyDocument /></el-icon>
                                                </el-button>
                                            </template>
                                        </el-input>
                                    </div>
                                </div>
                            </div>

                            <!-- Card 3: Trusted Partner -->
                            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div class="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                                            <el-icon class="text-base"><StarFilled /></el-icon>
                                        </div>
                                        <span class="text-sm font-semibold text-slate-800">Doanh nghiệp uy tín</span>
                                    </div>
                                    <el-switch 
                                        v-model="form.isTrustedPartner"
                                        active-color="#00875A"
                                    />
                                </div>

                                <div v-if="form.isTrustedPartner" class="pt-2 space-y-1.5">
                                    <span class="text-xs text-slate-600 font-medium block">Thứ tự hiển thị ưu tiên</span>
                                    <el-input-number
                                        v-model="form.trustedPartnerOrder"
                                        :min="0"
                                        :step="1"
                                        :precision="0"
                                        controls-position="right"
                                        placeholder="Ví dụ: 1, 2, 3..."
                                        class="w-full"
                                    />
                                    <p class="text-[11px] text-slate-400">
                                        Hiển thị huy hiệu nổi bật trên ứng dụng di động (số nhỏ đứng trước).
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Cột Phải (8/12): Thông tin Doanh nghiệp -->
                        <div class="lg:col-span-8">
                            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                                <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                                        <el-icon class="text-base"><OfficeBuilding /></el-icon>
                                    </div>
                                    <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Thông tin doanh nghiệp</h4>
                                </div>

                                <div class="space-y-3">
                                    <el-form-item label="Tên Doanh Nghiệp" prop="name" class="mb-3">
                                        <el-input 
                                            v-model="form.name" 
                                            placeholder="Nhập đầy đủ tên doanh nghiệp..." 
                                            :prefix-icon="OfficeBuilding"
                                        />
                                    </el-form-item>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <el-form-item prop="taxCode" class="mb-3">
                                            <template #label>
                                                <span class="text-slate-700 font-medium">Mã số thuế <span v-if="form.isNdaEnabled" class="text-red-500">*</span></span>
                                            </template>
                                            <el-input 
                                                v-model="form.taxCode" 
                                                placeholder="Nhập mã số thuế..." 
                                                :prefix-icon="Postcard"
                                            />
                                        </el-form-item>

                                        <el-form-item prop="gln" class="mb-3">
                                            <template #label>
                                                <span class="text-slate-700 font-medium">Mã GLN (13 số) <span v-if="form.isNdaEnabled" class="text-red-500">*</span></span>
                                            </template>
                                            <el-input 
                                                v-model="form.gln" 
                                                placeholder="Nhập GLN 13 số..." 
                                                maxlength="13" 
                                                :prefix-icon="Tickets"
                                            />
                                        </el-form-item>

                                        <el-form-item label="Email liên hệ" prop="email" class="mb-3">
                                            <el-input 
                                                v-model="form.email" 
                                                placeholder="contact@company.com" 
                                                :prefix-icon="Message"
                                            />
                                        </el-form-item>

                                        <el-form-item label="Số điện thoại" prop="phone" class="mb-3">
                                            <el-input 
                                                v-model="form.phone" 
                                                placeholder="Số điện thoại liên hệ" 
                                                :prefix-icon="Phone"
                                            />
                                        </el-form-item>

                                        <el-form-item label="Website" prop="website" class="mb-0">
                                            <el-input 
                                                v-model="form.website" 
                                                placeholder="https://..." 
                                                :prefix-icon="Link"
                                            />
                                        </el-form-item>

                                        <el-form-item label="Mã GCP (GS1 Prefix)" prop="gcpPrefix" class="mb-0">
                                            <el-input 
                                                v-model="form.gcpPrefix" 
                                                placeholder="Ví dụ: 893..." 
                                                :prefix-icon="Tickets"
                                            />
                                        </el-form-item>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TẦNG 2: ĐỊA CHỈ TRỤ SỞ ĐĂNG KÝ (FULL 12/12) -->
                    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                        <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <div class="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <el-icon class="text-base"><Location /></el-icon>
                            </div>
                            <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Địa chỉ trụ sở đăng ký</h4>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <el-form-item label="Tỉnh / Thành phố" prop="province" class="mb-0">
                                <el-select 
                                    v-model="form.province" 
                                    placeholder="Chọn Tỉnh/TP" 
                                    @change="handleProvinceChange" 
                                    filterable 
                                    allow-create 
                                    class="w-full"
                                >
                                    <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
                                </el-select>
                            </el-form-item>

                            <el-form-item label="Phường / Xã" prop="ward" class="mb-0">
                                <el-select 
                                    v-model="form.ward" 
                                    placeholder="Chọn Phường/Xã" 
                                    filterable 
                                    allow-create 
                                    class="w-full"
                                >
                                    <el-option v-for="w in wards" :key="w.name" :label="w.name" :value="w.name" />
                                </el-select>
                            </el-form-item>

                            <el-form-item label="Địa chỉ chi tiết" prop="address" class="mb-0">
                                <el-input 
                                    v-model="form.address" 
                                    placeholder="Số nhà, tên đường, thôn/xóm..." 
                                    :prefix-icon="Location"
                                />
                            </el-form-item>
                        </div>
                    </div>

                    <!-- TẦNG 3: GIỚI THIỆU VỀ DOANH NGHIỆP (FULL 12/12) -->
                    <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                        <div class="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                <el-icon class="text-base"><Edit /></el-icon>
                            </div>
                            <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Giới thiệu về doanh nghiệp</h4>
                        </div>

                        <div class="rounded-xl border border-slate-200 overflow-hidden bg-white">
                            <QuillEditor 
                                :key="quillKey"
                                v-model:content="form.description" 
                                contentType="html" 
                                theme="snow" 
                                toolbar="essential" 
                            />
                        </div>
                    </div>
                </div>
            </el-form>
        </div>

        <!-- Footer -->
        <template #footer>
            <div style="display: flex; align-items: center; justify-content: flex-end; padding: 16px 24px; background: #fff; border-top: 1px solid #f1f5f9; gap: 10px;">
                <el-button @click="handleClose" style="border-radius: 8px; padding: 9px 20px;">Hủy bỏ</el-button>
                <el-button 
                    type="primary" 
                    :loading="submitting" 
                    :disabled="isSubmitDisabled"
                    @click="handleSubmit(formRef)"
                    :style="{
                        borderRadius: '8px',
                        padding: '9px 24px',
                        fontWeight: '600',
                        background: isSubmitDisabled ? 'rgba(0, 135, 90, 0.35)' : '#00875A',
                        borderColor: isSubmitDisabled ? 'transparent' : '#00875A',
                        color: isSubmitDisabled ? 'rgba(255, 255, 255, 0.85)' : '#fff',
                        cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease-in-out'
                    }"
                >
                    {{ isEdit ? 'Cập nhật' : 'Lưu lại' }}
                </el-button>
            </div>
        </template>
    </el-dialog>

    <MediaManager 
        v-model="showMediaInfo" 
        :multiple="false"
        @select="handleMediaSelect"
    />
</template>

<style scoped>
:deep(.ql-container) {
  min-height: 120px;
  font-family: inherit;
  font-size: 14px;
}
:deep(.ql-toolbar) {
  border-top: none !important;
  border-left: none !important;
  border-right: none !important;
  border-bottom: 1px solid #e2e8f0 !important;
  background: #f8fafc;
}
:deep(.ql-container.ql-snow) {
  border: none !important;
}

</style>

<style>
.branded-tenant-dialog {
  border-radius: 12px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-tenant-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-tenant-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-tenant-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
