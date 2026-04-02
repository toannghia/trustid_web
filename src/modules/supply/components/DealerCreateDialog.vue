<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { dealerApi, type DealerDto } from '../api/dealerApi';
import { regionApi, type RegionDto } from '../api/regionApi';
import { ElMessage } from 'element-plus';
import { UserFilled, Location, Phone, Message, Coordinate } from '@element-plus/icons-vue';
import { VIETNAM_PROVINCES } from '@/common/data/provinces';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'created']);

const loading = ref(false);
const regions = ref<RegionDto[]>([]);
const selectedRegionId = ref('');
const provinceList = ref(VIETNAM_PROVINCES);

const form = ref<DealerDto>({
    name: '',
    taxCode: '',
    address: '',
    phone: '',
    email: '',
    contactPerson: '',
    provinces: [],
    dealerTenantId: '',
    createAccount: false,
    accountInfo: {
        username: '',
        password: ''
    }
});

const fetchRegions = async () => {
    try {
        regions.value = await regionApi.findAll();
    } catch (e) {
        console.error('Failed to fetch regions', e);
    }
};

const handleRegionChange = (regionId: string) => {
    const region = regions.value.find(r => r.id === regionId);
    if (region && region.provinces) {
        // Merge with existing provinces, avoid duplicates
        const currentProvinces = new Set(form.value.provinces || []);
        region.provinces.forEach(p => currentProvinces.add(p));
        form.value.provinces = Array.from(currentProvinces);
        ElMessage.success(`Đã thêm ${region.provinces.length} tỉnh từ vùng ${region.name}`);
    }
};

const handleClose = () => {
    emit('update:modelValue', false);
};

const saveDealer = async () => {
    if (!form.value.name) {
        ElMessage.warning('Vui lòng nhập tên đại lý');
        return;
    }
    
    if (form.value.createAccount) {
        if (!form.value.accountInfo?.username || !form.value.accountInfo?.password) {
            ElMessage.warning('Vui lòng nhập tài khoản và mật khẩu');
            return;
        }
    }

    loading.value = true;
    try {
        const res = await dealerApi.create(form.value);
        ElMessage.success('Thêm đại lý mới thành công');
        emit('created', res.data);
        handleClose();
        // Reset form
        form.value = {
            name: '',
            taxCode: '',
            address: '',
            phone: '',
            email: '',
            contactPerson: '',
            provinces: [],
            dealerTenantId: '',
            createAccount: false,
            accountInfo: { username: '', password: '' }
        };
    } catch (e: any) {
        ElMessage.error('Lưu thất bại: ' + (e.response?.data?.message || e.message));
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchRegions();
});

watch(() => props.modelValue, (val) => {
    if (val) {
        selectedRegionId.value = '';
        fetchRegions();
    }
});
</script>

<template>
    <el-dialog 
        :model-value="modelValue" 
        @update:model-value="handleClose"
        title="Thêm đại lý mới" 
        width="650px"
        destroy-on-close
    >
        <el-form :model="form" label-width="120px" v-loading="loading" @submit.prevent="saveDealer">
            <el-form-item label="Tên đại lý" required>
                <el-input v-model="form.name" placeholder="Tên DN / Đại lý / Nhà cung cấp" />
            </el-form-item>
            <el-form-item label="Mã số thuế">
                <el-input v-model="form.taxCode" />
            </el-form-item>
            <div class="grid grid-cols-2">
                <el-form-item label="Người liên hệ">
                    <el-input v-model="form.contactPerson" />
                </el-form-item>
                <el-form-item label="Số điện thoại">
                    <el-input v-model="form.phone" />
                </el-form-item>
            </div>
            <el-form-item label="Email">
                <el-input v-model="form.email" />
            </el-form-item>
            <el-form-item label="Địa chỉ">
                <el-input v-model="form.address" type="textarea" rows="2" />
            </el-form-item>

            <el-divider content-position="left">Phân vùng quản lý</el-divider>
            <div class="flex gap-4 mb-2">
                <el-form-item label="Chọn vùng" class="flex-1">
                    <el-select v-model="selectedRegionId" placeholder="Chọn vùng để thêm nhanh" @change="handleRegionChange">
                        <el-option v-for="r in regions" :key="r.id" :label="r.name" :value="r.id!" />
                    </el-select>
                </el-form-item>
                <el-form-item label="Tỉnh thành" class="flex-[2]">
                    <el-select v-model="form.provinces" multiple filterable placeholder="Chọn thêm tỉnh lẻ" class="w-full">
                        <el-option v-for="p in provinceList" :key="p" :label="p" :value="p" />
                    </el-select>
                </el-form-item>
            </div>
            
            <el-divider content-position="left">Cấp tài khoản đăng nhập</el-divider>
            <el-form-item label="Tạo tài khoản">
                <el-switch v-model="form.createAccount" />
                <span class="text-xs text-gray-400 ml-2">Tạo Tenant & User với quyền DEALER</span>
            </el-form-item>
            
            <div v-if="form.createAccount" class="bg-gray-50 p-4 rounded-lg mb-4 border border-blue-50">
                <el-form-item label="Username" required>
                    <el-input v-model="form.accountInfo!.username" placeholder="Tên đăng nhập" />
                </el-form-item>
                <el-form-item label="Mật khẩu" required>
                    <el-input v-model="form.accountInfo!.password" type="password" show-password placeholder="Mật khẩu khởi tạo" />
                </el-form-item>
            </div>
        </el-form>
        <template #footer>
            <el-button @click="handleClose">Hủy</el-button>
            <el-button type="primary" @click="saveDealer" :loading="loading">Lưu dữ liệu</el-button>
        </template>
    </el-dialog>
</template>
