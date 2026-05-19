<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { productApi } from '../api/product';
import { fileApi } from '../api/file';
import { tenantApi } from '../api/tenant'; 
import { useAuthStore } from '../store/auth';
import { ElMessage } from 'element-plus';
import { Plus, Delete, Upload, Connection } from '@element-plus/icons-vue';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import MediaManager from './MediaManager.vue';

const props = defineProps<{
    modelValue: boolean; // control visibility
    isEdit: boolean;
    productData: any;
    categories: any[];
    tenants: any[];
    isSystemAdmin: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

const authStore = useAuthStore();
const submitting = ref(false);
const quillKey = ref(0);
const dynamicAttrs = ref<{key: string, value: string}[]>([{ key: '', value: '' }]);
const showMediaManager = ref(false); // Media Manager Visibility

// NDA Logic
const currentTenantNdaEnabled = ref(false);

const productForm = reactive({
    id: '',
    name: '',
    gtin_code: '',
    gpc_code: '', 
    category_id: '',
    tenant_id: '',
    attributes: {},
    price: 0,
    expiryDuration: 0,
    expiryUnit: 'MONTH',
    netWeight: 0,
    weightUnit: 'kg',
    images: [] as string[], // Explicit array of strings
    short_description: '',
    description: '',
    hasNoGtin: false
});

// Price Formatting
const displayPrice = computed({
    get: () => {
        if (!productForm.price) return '';
        return new Intl.NumberFormat('vi-VN').format(productForm.price);
    },
    set: (val) => {
        // Handled by @input to allow typing
    }
});

const handlePriceInput = (val: string) => {
    // Remove non-numeric chars
    const clean = val.replace(/\D/g, '');
    productForm.price = clean ? parseInt(clean) : 0;
};


const handleMediaSelect = (selected: any) => {
    // selected can be string or string[]
    if (Array.isArray(selected)) {
        selected.forEach(url => {
            if (!productForm.images.includes(url)) {
                productForm.images.push(url);
            }
        });
    } else {
         if (!productForm.images.includes(selected)) {
            productForm.images.push(selected);
        }
    }
};

const openMediaManager = () => {
    showMediaManager.value = true;
};
// ... existing code ...


// Watch for modal opening to initialize data
watch(() => props.modelValue, async (val) => {
    if (val) {
        // Check NDA status
        await checkTenantNdaStatus();
        
        if (props.isEdit && props.productData) {
            initEdit(props.productData);
        } else {
            initCreate();
        }
    }
});

const checkTenantNdaStatus = async () => {
    // If Admin, depends on selected tenant (handled in watcher of tenant_id later if needed, but for now simple check)
    // If Tenant Admin, check authStore or fetch
    if (!props.isSystemAdmin) {
        if (authStore.user?.tenant_id) {
             // Best to fetch latest status or rely on passed prop if available. 
             // We'll fetch to be safe or check if authStore has it. 
             // Assuming authStore.user might be stale on 'isNdaEnabled', let's quick fetch or assume we need to pass it in.
             // For now, let's try to trust authStore if updated, or fetch.
             try {
                const { data } = await tenantApi.getById(authStore.user.tenant_id);
                currentTenantNdaEnabled.value = (data.data || data).isNdaEnabled;
             } catch(e) { }
        }
    } else {
        // For admin, we update based on selected tenant in form
        // We'll watch productForm.tenant_id
        currentTenantNdaEnabled.value = false; 
    }
};

// Admin watches tenant selection
watch(() => productForm.tenant_id, async (newVal) => {
    if (props.isSystemAdmin && newVal) {
        try {
            const { data } = await tenantApi.getById(newVal);
            currentTenantNdaEnabled.value = (data.data || data).isNdaEnabled;
        } catch(e) {}
    }
});

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
    return `${baseUrl}${path}`;
};

const batchTemplate = ref<any[]>([]);

const supportedIcons = [
  { label: 'DNA (Sinh học)', value: 'Cpu' },
  { label: 'Địa điểm (Sản xuất)', value: 'Location' },
  { label: 'Bảo vệ (Kiểm định)', value: 'Shield' },
  { label: 'Hộp hàng (Sản phẩm)', value: 'Box' },
  { label: 'Biểu đồ (Thống kê)', value: 'TrendCharts' },
  { label: 'Lịch trình (Thời gian)', value: 'Calendar' },
  { label: 'Chứng chỉ (Danh hiệu)', value: 'Medal' },
  { label: 'Tài liệu (Hồ sơ)', value: 'Document' }
];

const addTemplateBlock = () => {
    batchTemplate.value.push({
        id: 'block_' + Date.now(),
        title: '',
        icon: 'Shield',
        fields: [{ key: '' }]
    });
};

const removeTemplateBlock = (bIndex: any) => {
    batchTemplate.value.splice(bIndex, 1);
};

const addTemplateField = (bIndex: any) => {
    batchTemplate.value[bIndex].fields.push({ key: '' });
};

const removeTemplateField = (bIndex: any, fIndex: any) => {
    batchTemplate.value[bIndex].fields.splice(fIndex, 1);
};

const initCreate = () => {
    productForm.id = '';
    productForm.name = '';
    productForm.gtin_code = '';
    productForm.gpc_code = '';
    productForm.category_id = '';
    productForm.tenant_id = props.isSystemAdmin ? '' : (authStore.user?.tenant_id || '');
    productForm.price = 0;
    productForm.expiryDuration = 0;
    productForm.expiryUnit = 'MONTH';
    productForm.netWeight = 0;
    productForm.weightUnit = 'kg';
    productForm.images = [];
    productForm.short_description = '';
    productForm.description = '';
    productForm.hasNoGtin = false;
    dynamicAttrs.value = [{ key: '', value: '' }];
    batchTemplate.value = [];
    quillKey.value++;
};

const initEdit = (row: any) => {
    productForm.id = row.id;
    productForm.name = row.name;
    const gtin = row.gtinCode || row.gtin_code;
    productForm.gtin_code = gtin || '';
    productForm.hasNoGtin = !gtin;
    productForm.gpc_code = row.gpcCode || row.gpc_code || '';
    productForm.category_id = row.category?.id || row.categoryId;
    productForm.price = row.price || 0;
    productForm.expiryDuration = row.expiryDuration || row.expiry_duration || 0;
    productForm.expiryUnit = row.expiryUnit || row.expiry_unit || 'MONTH';
    productForm.netWeight = row.netWeight || row.net_weight || 0;
    productForm.weightUnit = row.weightUnit || row.weight_unit || 'kg';
    
    // Admin Tenant
    if (props.isSystemAdmin) {
        productForm.tenant_id = row.tenant?.id || row.tenantId || '';
    }

    // Attributes & batchTemplate
    dynamicAttrs.value = [];
    batchTemplate.value = [];
    if (row.attributes) {
        Object.entries(row.attributes).forEach(([key, value]) => {
            if (key === 'batchTemplate' && Array.isArray(value)) {
                batchTemplate.value = JSON.parse(JSON.stringify(value));
            } else {
                dynamicAttrs.value.push({ key, value: String(value) });
            }
        });
    }
    if (dynamicAttrs.value.length === 0) {
        dynamicAttrs.value.push({ key: '', value: '' });
    }

    productForm.images = row.images || [];
    productForm.short_description = row.shortDescription || '';
    productForm.description = row.description || '';
    quillKey.value++;
};

const addAttr = () => dynamicAttrs.value.push({ key: '', value: '' });
const removeAttr = (index: number) => dynamicAttrs.value.splice(index, 1);
const removeImage = (index: number) => productForm.images.splice(index, 1);

const handleUploadRequest = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
        const { data } = await fileApi.upload(file);
        const url = data.url || data; 
        productForm.images.push(url);
        onSuccess(data);
    } catch (err) {
        console.error(err);
        ElMessage.error('Upload thất bại');
        onError(err);
    }
};

const handleClose = () => {
    emit('update:modelValue', false);
};

const handleSubmit = async () => {
    // 1. Basic Validation
    if (!productForm.name || !productForm.category_id) {
        ElMessage.warning('Vui lòng nhập tên sản phẩm và danh mục');
        return;
    }
    
    // 2. Tenant Validation
    if (props.isSystemAdmin && !productForm.tenant_id) {
        ElMessage.warning('Vui lòng chọn doanh nghiệp');
        return;
    }

    // 3. NDA Validation
    if (currentTenantNdaEnabled.value && !productForm.hasNoGtin) {
        // GTIN: Required, numeric, 8/12/13/14 chars
        const gtinRegex = /^\d{8,14}$/;
        if (!productForm.gtin_code) {
             ElMessage.warning('Doanh nghiệp đã kết nối NDA: Vui lòng nhập Mã GTIN');
             return;
        }
        if (!gtinRegex.test(productForm.gtin_code) || ![8, 12, 13, 14].includes(productForm.gtin_code.length)) {
             ElMessage.warning('Mã GTIN không hợp lệ (Phải là số, độ dài 8, 12, 13 hoặc 14 ký tự)');
             return;
        }
        
        // Image: Required
        if (productForm.images.length === 0) {
            ElMessage.warning('Doanh nghiệp đã kết nối NDA: Vui lòng upload ít nhất 1 ảnh sản phẩm');
            return;
        }
    }

    const attrObject: Record<string, any> = {};
    dynamicAttrs.value.forEach(item => {
        if (item.key) attrObject[item.key] = item.value;
    });

    const cleanTemplate = batchTemplate.value
        .map(block => ({
            id: block.id,
            title: block.title?.trim(),
            icon: block.icon,
            fields: (block.fields || [])
                .map((f: any) => ({ key: f.key?.trim() }))
                .filter((f: any) => f.key)
        }))
        .filter(block => block.title);

    if (cleanTemplate.length > 0) {
        attrObject.batchTemplate = cleanTemplate;
    }
    
    const cleanImages = productForm.images.filter(url => url && url.trim() !== '');

    const payload: any = {
        name: productForm.name,
        gtinCode: productForm.hasNoGtin ? null : productForm.gtin_code,
        gpcBrickCode: productForm.gpc_code,
        categoryId: productForm.category_id,
        attributes: attrObject,
        price: productForm.price,
        expiryDuration: productForm.expiryDuration,
        expiryUnit: productForm.expiryUnit,
        netWeight: productForm.netWeight,
        weightUnit: productForm.weightUnit,
        images: cleanImages,
        shortDescription: productForm.short_description,
        description: productForm.description
    };

    if (props.isSystemAdmin) {
        payload.tenantId = productForm.tenant_id;
    }

    submitting.value = true;
    try {
        if (props.isEdit && productForm.id) {
            await productApi.update(productForm.id, payload);
            ElMessage.success('Cập nhật sản phẩm thành công');
        } else {
            await productApi.create(payload);
            ElMessage.success('Tạo sản phẩm thành công');
        }
        emit('saved');
        handleClose();
    } catch (e: any) {
        console.error(e);
        ElMessage.error(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
        submitting.value = false;
    }
};

// Lưu và đồng bộ NDA
const handleSubmitWithSync = async () => {
    // Reuse validation from handleSubmit
    if (!productForm.name || !productForm.category_id) {
        ElMessage.warning('Vui lòng nhập tên sản phẩm và danh mục');
        return;
    }
    
    if (props.isSystemAdmin && !productForm.tenant_id) {
        ElMessage.warning('Vui lòng chọn doanh nghiệp');
        return;
    }

    // NDA requires GTIN and image
    const gtinRegex = /^\d{8,14}$/;
    if (!productForm.gtin_code || !gtinRegex.test(productForm.gtin_code)) {
        ElMessage.warning('Đồng bộ NDA yêu cầu Mã GTIN hợp lệ (8-14 chữ số)');
        return;
    }
    if (productForm.images.length === 0) {
        ElMessage.warning('Đồng bộ NDA yêu cầu ít nhất 1 ảnh sản phẩm');
        return;
    }

    const attrObject: Record<string, any> = {};
    dynamicAttrs.value.forEach(item => {
        if (item.key) attrObject[item.key] = item.value;
    });

    const cleanTemplate = batchTemplate.value
        .map(block => ({
            id: block.id,
            title: block.title?.trim(),
            icon: block.icon,
            fields: (block.fields || [])
                .map((f: any) => ({ key: f.key?.trim() }))
                .filter((f: any) => f.key)
        }))
        .filter(block => block.title);

    if (cleanTemplate.length > 0) {
        attrObject.batchTemplate = cleanTemplate;
    }
    
    const cleanImages = productForm.images.filter(url => url && url.trim() !== '');

    const payload: any = {
        name: productForm.name,
        gtinCode: productForm.hasNoGtin ? null : productForm.gtin_code,
        gpcBrickCode: productForm.gpc_code,
        categoryId: productForm.category_id,
        attributes: attrObject,
        price: productForm.price,
        expiryDuration: productForm.expiryDuration,
        expiryUnit: productForm.expiryUnit,
        netWeight: productForm.netWeight,
        weightUnit: productForm.weightUnit,
        images: cleanImages,
        shortDescription: productForm.short_description,
        description: productForm.description,
        syncNda: true // Flag để backend sync
    };

    if (props.isSystemAdmin) {
        payload.tenantId = productForm.tenant_id;
    }

    submitting.value = true;
    try {
        if (props.isEdit && productForm.id) {
            await productApi.update(productForm.id, payload);
            // Then trigger sync
            await productApi.syncNda(productForm.id);
            ElMessage.success('Cập nhật sản phẩm và gửi yêu cầu đồng bộ NDA thành công');
        } else {
            // Create with sync flag
            await productApi.createAndSync(payload);
            ElMessage.success('Tạo sản phẩm và gửi yêu cầu đồng bộ NDA thành công');
        }
        emit('saved');
        handleClose();
    } catch (e: any) {
        console.error(e);
        ElMessage.error(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
        submitting.value = false;
    }
};
</script>

<template>
    <el-dialog 
        :model-value="modelValue" 
        :title="isEdit ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'" 
        width="95%"
        style="max-width: 800px" 
        :close-on-click-modal="false"
        @update:model-value="handleClose"
        class="responsive-dialog"
    >
      <el-form :model="productForm" label-position="top">
        <div class="flex flex-col gap-4">
            <!-- Row 1: Name & Category -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <el-form-item label="Tên sản phẩm" required class="col-span-2">
                    <el-input v-model="productForm.name" />
                </el-form-item>
                <el-form-item label="Danh mục" required class="col-span-1">
                    <el-tree-select v-model="productForm.category_id" :data="categories" :props="{ label: 'name', value: 'id' }" class="w-full" check-strictly />
                </el-form-item>
            </div>
            
            <!-- Row 2: GTIN & GPC -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <el-form-item class="col-span-1 mb-2 sm:mb-4">
                    <template #label>
                        <div class="flex items-center justify-between w-full min-h-[24px]">
                            <span class="whitespace-nowrap">Mã GTIN <span class="text-xs text-gray-400 font-normal ml-1 sm:inline hidden">(Mã vạch GS1)</span></span>
                            <el-checkbox v-model="productForm.hasNoGtin" size="small" class="!mr-0">Không có mã GTIN</el-checkbox>
                        </div>
                        <div class="flex items-center mt-[-4px]">
                            <span v-if="currentTenantNdaEnabled && !productForm.hasNoGtin" class="text-red-500 ml-1">*</span>
                            <el-tag v-if="currentTenantNdaEnabled && !productForm.hasNoGtin" size="small" type="success" class="ml-2 py-0 h-4 leading-4">NDA Enabled</el-tag>
                        </div>
                    </template>
                    <el-input v-model="productForm.gtin_code" :disabled="productForm.hasNoGtin" maxlength="14" placeholder="VD: 893..." show-word-limit />
                </el-form-item>

                <el-form-item class="col-span-1">
                    <template #label>
                        <div class="flex items-center min-h-[24px]">
                            <span class="whitespace-nowrap">GPC Code <span class="text-xs text-gray-400 font-normal ml-1 sm:inline hidden">(Phân loại Global)</span></span>
                        </div>
                    </template>
                    <el-input v-model="productForm.gpc_code" placeholder="VD: 10000045" />
                </el-form-item>
            </div>

            <!-- Row 3: Price, Weight, Shelf Life -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <el-form-item label="Giá bán" class="col-span-1">
                    <el-input 
                        v-model="displayPrice"
                        placeholder="0"
                        @input="handlePriceInput"
                        input-style="text-align: right"
                    >
                        <template #append>VNĐ</template>
                    </el-input>
                </el-form-item>
                
                <el-form-item label="Trọng lượng (Quy cách)" class="col-span-1">
                     <div class="flex">
                        <el-input-number v-model="productForm.netWeight" :min="0" :precision="2" controls-position="right" class="w-full !rounded-r-none" style="width: 60%" />
                        <el-select v-model="productForm.weightUnit" placeholder="" class="!w-[40%] !rounded-l-none -ml-px">
                            <el-option label="g" value="g" />
                            <el-option label="kg" value="kg" />
                            <el-option label="ml" value="ml" />
                            <el-option label="l" value="l" />
                        </el-select>
                     </div>
                </el-form-item>

                <el-form-item label="Hạn sử dụng" class="col-span-1">
                    <div class="flex">
                        <el-input-number v-model="productForm.expiryDuration" :min="0" controls-position="right" class="w-full !rounded-r-none" style="width: 60%" />
                        <el-select v-model="productForm.expiryUnit" placeholder="" class="!w-[40%] !rounded-l-none -ml-px">
                            <el-option label="Ngày" value="DAY" />
                            <el-option label="Tháng" value="MONTH" />
                            <el-option label="Năm" value="YEAR" />
                    </el-select>
                    </div>
                </el-form-item>
            </div>
            
             <el-form-item label="Doanh nghiệp" v-if="isSystemAdmin" required>
                <el-select v-model="productForm.tenant_id" placeholder="Chọn doanh nghiệp" class="w-full" filterable :disabled="!isSystemAdmin">
                    <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
                </el-select>
            </el-form-item>

            <el-form-item label="Mô tả ngắn" class="col-span-2">
                <el-input v-model="productForm.short_description" type="textarea" :rows="2" placeholder="Tóm tắt về sản phẩm..." />
            </el-form-item>
            
            <el-form-item label="Mô tả chi tiết" class="col-span-2">
                <div class="border rounded overflow-hidden flex flex-col resize-y overflow-y-auto" style="min-height: 200px; max-height: 600px; height: 300px">
                    <QuillEditor :key="quillKey" theme="snow" v-model:content="productForm.description" contentType="html" toolbar="full" />
                </div>
            </el-form-item>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <!-- Attributes -->
            <div class="bg-gray-50 p-3 rounded col-span-2">
                <span class="text-sm font-bold block mb-2 text-gray-700">Thuộc tính bổ sung</span>
                <div v-for="(attr, index) in dynamicAttrs" :key="'attr-'+index" class="flex gap-2 mb-2">
                    <el-input v-model="attr.key" placeholder="Key" size="small" />
                    <el-input v-model="attr.value" placeholder="Value" size="small" />
                    <el-button type="danger" :icon="Delete" circle size="small" @click="removeAttr(index)" />
                </div>
                <el-button type="dashed" class="w-full" :icon="Plus" size="small" @click="addAttr">Thêm</el-button>
            </div>

            <!-- Batch Template Builder (Cấu hình mẫu thuộc tính lô hàng) -->
            <div class="bg-gray-50 p-3 rounded col-span-2 border border-dashed border-gray-300">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-bold text-gray-700 flex items-center gap-1">
                        <el-icon><Connection /></el-icon> Mẫu khung thuộc tính lô sản xuất/nhập khẩu
                    </span>
                    <el-button type="primary" :icon="Plus" size="small" link @click="addTemplateBlock">Thêm Khối mới</el-button>
                </div>
                
                <div v-if="batchTemplate.length === 0" class="text-xs text-gray-400 text-center py-4 bg-white rounded border border-dashed">
                    Chưa cấu hình mẫu khối thuộc tính nào cho lô hàng. Lô hàng sẽ dùng thuộc tính phẳng mặc định.
                </div>

                <div v-else class="flex flex-col gap-3">
                    <div v-for="(block, bIndex) in batchTemplate" :key="block.id" class="bg-white p-3 rounded border shadow-sm">
                        <div class="flex gap-2 items-center mb-2">
                            <el-input v-model="block.title" placeholder="Tên khối (VD: Dữ liệu Kiểm định)" size="small" style="flex: 2" />
                            <el-select v-model="block.icon" placeholder="Icon" size="small" style="width: 150px">
                                <el-option v-for="ico in supportedIcons" :key="ico.value" :label="ico.label" :value="ico.value">
                                    <span class="flex items-center gap-2">
                                        <el-icon><component :is="ico.value" /></el-icon>
                                        <span>{{ ico.label }}</span>
                                    </span>
                                </el-option>
                            </el-select>
                            <el-button type="danger" :icon="Delete" circle size="small" @click="removeTemplateBlock(bIndex)" />
                        </div>

                        <!-- Fields inside block -->
                        <div class="pl-4 border-l-2 border-blue-200 mt-2">
                            <div v-for="(field, fIndex) in block.fields" :key="fIndex" class="flex gap-2 mb-2 items-center">
                                <el-input v-model="field.key" placeholder="Tên trường (VD: Tỷ lệ nảy mầm)" size="small" />
                                <el-button type="danger" :icon="Delete" circle size="small" @click="removeTemplateField(bIndex, fIndex)" />
                            </div>
                            <el-button type="dashed" size="small" class="w-full mt-1" :icon="Plus" @click="addTemplateField(bIndex)">Thêm trường dữ liệu</el-button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Images -->
            <div class="bg-gray-50 p-3 rounded col-span-2">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm font-bold text-gray-700">Hình ảnh sản phẩm</span>
                    <span v-if="currentTenantNdaEnabled" class="text-red-500 text-xs">(Bắt buộc với NDA)</span>
                </div>
                
                <div class="flex flex-wrap gap-2 mb-3">
                    <div v-for="(img, index) in productForm.images" :key="'img-'+index" class="relative group w-24 h-24 border rounded overflow-hidden">
                        <img :src="getImageUrl(img)" class="w-full h-full object-cover" />
                        <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                             <el-button type="danger" :icon="Delete" circle size="small" @click="removeImage(index)" />
                        </div>
                    </div>
                    
                    <div 
                        class="w-24 h-24 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center hover:border-blue-500 cursor-pointer bg-white"
                        @click="openMediaManager"
                    >
                        <el-icon class="text-xl text-gray-400"><Plus /></el-icon>
                        <span class="text-xs text-gray-400 mt-1">Thêm ảnh</span>
                    </div>
                </div>
            </div>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleClose">Hủy bỏ</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? 'Cập nhật' : 'Tạo mới' }}
          </el-button>
          <el-button 
            v-if="currentTenantNdaEnabled" 
            type="success" 
            :loading="submitting" 
            @click="handleSubmitWithSync"
          >
            {{ isEdit ? 'Cập nhật & Đồng bộ NDA' : 'Tạo & Đồng bộ NDA' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <MediaManager 
        v-model="showMediaManager" 
        :multiple="true"
        @select="handleMediaSelect"
    />
</template>
