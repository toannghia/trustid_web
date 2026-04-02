<script setup lang="ts">
import { ref, reactive, watch, nextTick, computed } from 'vue';
import { tenantApi } from '../api/tenant';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Connection, CopyDocument } from '@element-plus/icons-vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import axios from 'axios';
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

const form = reactive({
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

const fileInput = ref<HTMLInputElement | null>(null);

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
        });
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

const triggerUpload = () => fileInput.value?.click();

const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
        const file = target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        try {
             const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/files/upload`, formData, {
                 headers: { 'Content-Type': 'multipart/form-data' }
             });
             form.logo = data.url || data.path || data; 
             // Clear validation for logo if it was erroring
             if (formRef.value) formRef.value.validateField('logo');
        } catch (e) {
            ElMessage.error('Upload logo thất bại');
        }
    }
};

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.veritrust.vn';
    return `${baseUrl}${path}`;
};

const handleSubmit = async (formEl: FormInstance | undefined) => {
    if (!formEl) return;
    
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
                    isNdaEnabled: form.isNdaEnabled
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
            // return false; 
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
        :title="isEdit ? 'Cập nhật Doanh Nghiệp' : 'Thêm Doanh Nghiệp Mới'" 
        width="95%"
        style="max-width: 900px" 
        top="5vh"
        :close-on-click-modal="false"
        @update:model-value="handleClose"
        class="responsive-dialog"
    >
        <el-form 
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="140px"
            label-position="top"
        >
            <el-row :gutter="20">
                <!-- Left Column: Logo -->
                <el-col :xs="24" :sm="6">
                    <el-form-item prop="logo" class="w-full">
                        <div 
                            class="border-2 border-dashed border-gray-300 rounded-lg h-40 w-full flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition relative overflow-hidden"
                            :class="{'border-red-500': form.isNdaEnabled && !form.logo}"
                            @click="openMediaManager"
                        >
                            <img v-if="form.logo" :src="getImageUrl(form.logo)" class="w-full h-full object-contain" />
                            <div v-else class="text-center text-gray-400">
                                <el-icon class="text-3xl mb-2"><Plus /></el-icon>
                                <div class="text-sm">Chọn / Upload Logo <span v-if="form.isNdaEnabled" class="text-red-500">*</span></div>
                            </div>
                        </div>
                    </el-form-item>
                    
                    <div class="mt-4 bg-gray-50 p-2 rounded text-sm mb-4 sm:mb-0">
                         <el-checkbox v-model="form.isNdaEnabled" border class="w-full">
                            <span class="font-bold">Đồng bộ NDA Trace</span>
                         </el-checkbox>
                         <p v-if="form.isNdaEnabled" class="text-xs text-blue-600 mt-1">
                             <span class="font-bold">Lưu ý:</span> Khi bật đồng bộ, bạn cần nhập chính xác MST, GLN và Logo doanh nghiệp.
                         </p>

                         <!-- NDA STATUS & DID DISPLAY -->
                         <div v-if="form.isNdaEnabled" class="mt-3 pt-3 border-t border-gray-200">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-bold text-gray-600">Trạng thái NDA:</span>
                                <el-tag :type="getNdaStatusType(form.ndaStatus)" size="small">
                                    {{ getNdaStatusText(form.ndaStatus) }}
                                </el-tag>
                            </div>
                            
                            <div v-if="form.ndaDid">
                                <span class="text-xs font-bold text-gray-600 mb-1 block">Mã định danh (DID):</span>
                                <el-input v-model="form.ndaDid" readonly size="small" :prefix-icon="Connection">
                                    <template #append>
                                        <el-button @click="copyToClipboard(form.ndaDid)">
                                            <el-icon><CopyDocument /></el-icon>
                                        </el-button>
                                    </template>
                                </el-input>
                            </div>
                         </div>
                    </div>
                </el-col>

                <!-- Right Column: Basic Info -->
                <el-col :xs="24" :sm="18">
                    <el-row :gutter="10">
                        <el-col :span="24">
                            <el-form-item label="Tên Doanh Nghiệp" prop="name">
                                <el-input v-model="form.name" placeholder="Tên đầy đủ của doanh nghiệp" />
                            </el-form-item>
                        </el-col>
                        
                        <el-col :xs="24" :sm="12">
                            <el-form-item label="Mã số thuế" prop="taxCode">
                                <template #label>
                                    Mã số thuế <span v-if="form.isNdaEnabled" class="text-red-500">*</span>
                                </template>
                                <el-input v-model="form.taxCode" placeholder="Nhập MST" />
                            </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                             <el-form-item label="Mã GLN (Global Location Number)" prop="gln">
                                 <template #label>
                                    Mã GLN <span v-if="form.isNdaEnabled" class="text-red-500">*</span>
                                </template>
                                <el-input v-model="form.gln" placeholder="Nhập mã GLN 13 số" maxlength="13" />
                            </el-form-item>
                        </el-col>

                        <el-col :xs="24" :sm="12">
                            <el-form-item label="Email" prop="email">
                                <el-input v-model="form.email" placeholder="Email liên hệ" />
                            </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                             <el-form-item label="Điện thoại" prop="phone">
                                <el-input v-model="form.phone" placeholder="Số điện thoại" />
                            </el-form-item>
                        </el-col>
                        
                        <el-col :xs="24" :sm="12">
                             <el-form-item label="Website" prop="website">
                                <el-input v-model="form.website" placeholder="https://..." />
                            </el-form-item>
                        </el-col>
                        <el-col :xs="24" :sm="12">
                             <el-form-item label="Mã GCP (GS1 Prefix)" prop="gcpPrefix">
                                <el-input v-model="form.gcpPrefix" placeholder="Mã GS1 (Không bắt buộc)" />
                            </el-form-item>
                        </el-col>
                    </el-row>
                </el-col>
            </el-row>

            <el-divider content-position="left">Địa chỉ đăng ký</el-divider>

            <el-row :gutter="15">
                <el-col :xs="24" :sm="8">
                    <el-form-item label="Tỉnh / Thành phố" prop="province">
                        <el-select v-model="form.province" placeholder="Chọn Tỉnh" @change="handleProvinceChange" filterable allow-create class="w-full">
                                <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
                        </el-select>
                    </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="8">
                     <el-form-item label="Phường / Xã" prop="ward">
                        <el-select v-model="form.ward" placeholder="Chọn Xã" filterable allow-create class="w-full">
                            <el-option v-for="w in wards" :key="w.name" :label="w.name" :value="w.name" />
                        </el-select>
                    </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="8">
                    <el-form-item label="Địa chỉ chi tiết" prop="address">
                        <el-input v-model="form.address" placeholder="Số nhà, tên đường..." />
                    </el-form-item>
                </el-col>
            </el-row>

            <div class="mt-2">
                <label class="el-form-item__label block mb-2">Giới thiệu về doanh nghiệp</label>
                <div class="h-48 w-full mb-8">
                    <QuillEditor 
                        :key="quillKey"
                        v-model:content="form.description" 
                        contentType="html" 
                        theme="snow" 
                        toolbar="essential" 
                    />
                </div>
            </div>
        </el-form>

        <template #footer>
            <span class="dialog-footer">
                <el-button @click="handleClose">Hủy bỏ</el-button>
                <el-button type="primary" :loading="submitting" @click="handleSubmit(formRef)">
                    {{ isEdit ? 'Cập nhật' : 'Lưu lại' }}
                </el-button>
            </span>
        </template>
    </el-dialog>

    <MediaManager 
        v-model="showMediaInfo" 
        :multiple="false"
        @select="handleMediaSelect"
    />
</template>
