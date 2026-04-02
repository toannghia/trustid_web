<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { dealerApi, type DealerDto } from '../api/dealerApi';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, Search, UserFilled, Location, Phone, Message, Tools } from '@element-plus/icons-vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import DealerCreateDialog from '../components/DealerCreateDialog.vue';

const dealers = ref<DealerDto[]>([]);
const loading = ref(false);
const searchTerm = ref('');
const isEdit = ref(false);
const showModal = ref(false);
const showCreateDialog = ref(false);

const form = ref<DealerDto>({
    name: '',
    taxCode: '',
    address: '',
    phone: '',
    email: '',
    contactPerson: '',
    provinces: [],
    dealerTenantId: ''
});

const fetchDealers = async () => {
    loading.value = true;
    try {
        const { data } = await dealerApi.getList();
        dealers.value = data;
    } catch (e: any) {
        ElMessage.error('Lỗi tải danh sách đại lý: ' + (e.response?.data?.message || e.message));
    } finally {
        loading.value = false;
    }
};

const filteredDealers = computed(() => {
    if (!searchTerm.value) return dealers.value;
    const lower = searchTerm.value.toLowerCase();
    return dealers.value.filter(d => 
        d.name.toLowerCase().includes(lower) || 
        d.contactPerson?.toLowerCase().includes(lower) ||
        d.taxCode?.toLowerCase().includes(lower) ||
        d.provinces?.some(p => p.toLowerCase().includes(lower))
    );
});

const handleCreate = () => {
    showCreateDialog.value = true;
};

const handleEdit = (row: DealerDto) => {
    isEdit.value = true;
    form.value = { ...row };
    showCreateDialog.value = false;
    showModal.value = true;
};

const handleDelete = (row: DealerDto) => {
    ElMessageBox.confirm('Bạn có chắc chắn muốn xóa đại lý này?', 'Cảnh báo', {
        type: 'warning'
    }).then(async () => {
        try {
            await dealerApi.delete(row.id!);
            ElMessage.success('Xóa đại lý thành công');
            fetchDealers();
        } catch (e) {
            ElMessage.error('Xóa thất bại');
        }
    });
};

const saveDealer = async () => {
    try {
        if (isEdit.value) {
            await dealerApi.update(form.value.id!, form.value);
            ElMessage.success('Cập nhật đại lý thành công');
        } else {
            await dealerApi.create(form.value);
            ElMessage.success('Thêm đại lý mới thành công');
        }
        showModal.value = false;
        fetchDealers();
    } catch (e: any) {
        ElMessage.error('Lưu thất bại: ' + (e.response?.data?.message || e.message));
    }
};

onMounted(fetchDealers);
</script>

<template>
    <div class="dealer-management">
        <LTEContentHeader title="Quản lý Hệ thống Đại lý" :breadcrumbs="[{ title: 'Cung ứng' }, { title: 'Đại lý' }]" />

        <LTECard variant="primary" outline>
            <div class="mb-4 flex flex-wrap gap-2 items-center justify-between">
                <div class="flex gap-2">
                    <el-input 
                        v-model="searchTerm" 
                        placeholder="Tìm theo tên, liên hệ, tỉnh thành..." 
                        :prefix-icon="Search" 
                        class="w-80" 
                        clearable 
                    />
                </div>
                <el-button type="primary" :icon="Plus" @click="handleCreate">Thêm đại lý</el-button>
            </div>

            <el-table :data="filteredDealers" v-loading="loading" stripe border>
                <el-table-column type="index" label="STT" width="60" align="center" />
                <el-table-column prop="name" label="Tên Đại lý / Nhà phân phối" min-width="200">
                    <template #default="{ row }">
                        <div class="font-bold text-blue-700">{{ row.name }}</div>
                        <div class="text-xs text-gray-500" v-if="row.taxCode">MST: {{ row.taxCode }}</div>
                    </template>
                </el-table-column>
                <el-table-column label="Thông tin liên hệ" min-width="200">
                    <template #default="{ row }">
                        <div class="flex flex-col gap-1 text-sm">
                            <div class="flex items-center gap-1" v-if="row.contactPerson">
                                <el-icon class="text-gray-400"><UserFilled /></el-icon>
                                <span>{{ row.contactPerson }}</span>
                            </div>
                            <div class="flex items-center gap-1" v-if="row.phone">
                                <el-icon class="text-gray-400"><Phone /></el-icon>
                                <span>{{ row.phone }}</span>
                            </div>
                            <div class="flex items-center gap-1" v-if="row.email">
                                <el-icon class="text-gray-400"><Message /></el-icon>
                                <span class="text-xs">{{ row.email }}</span>
                            </div>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="Địa chỉ & Khu vực" min-width="250">
                    <template #default="{ row }">
                        <div class="flex items-start gap-1 mb-1">
                            <el-icon class="mt-1 text-red-500"><Location /></el-icon>
                            <span class="text-sm line-clamp-2">{{ row.address }}</span>
                        </div>
                        <div class="flex flex-wrap gap-1 mt-1">
                            <el-tag 
                                v-for="p in row.provinces" 
                                :key="p" 
                                size="small" 
                                type="success" 
                                effect="light"
                                round
                            >
                                {{ p }}
                            </el-tag>
                            <span v-if="!row.provinces?.length" class="text-xs text-gray-400 italic">Chưa gán vùng</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="dealerTenantId" label="Tenant Mapping" width="150">
                    <template #default="{ row }">
                        <el-tag v-if="row.dealerTenantId" type="warning" size="small">Linked Account</el-tag>
                        <span v-else class="text-xs text-gray-300">No link</span>
                    </template>
                </el-table-column>
                <el-table-column label="Thao tác" width="100" fixed="right" align="center">
                    <template #default="scope">
                        <el-button type="primary" :icon="Edit" circle size="small" @click="handleEdit(scope.row)" />
                        <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(scope.row)" />
                    </template>
                </el-table-column>
            </el-table>
        </LTECard>

        <!-- New Create Dialog -->
        <DealerCreateDialog v-model="showCreateDialog" @created="fetchDealers" />

        <!-- Dialog Sửa -->
        <el-dialog 
            v-model="showModal" 
            title="Cập nhật thông tin Đại lý" 
            width="600px"
            destroy-on-close
        >
            <el-form :model="form" label-width="120px" @submit.prevent="saveDealer">
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
                <el-form-item label="Khu vực (Tỉnh)">
                    <el-select v-model="form.provinces" multiple filterable allow-create default-first-option placeholder="Chọn tỉnh thành quản lý" class="w-full">
                        <el-option label="Hà Nội" value="Hà Nội" />
                        <el-option label="TP HCM" value="TP HCM" />
                        <el-option label="Đà Nẵng" value="Đà Nẵng" />
                    </el-select>
                </el-form-item>
                <el-form-item label="Tài khoản liên kết">
                    <el-input v-model="form.dealerTenantId" placeholder="UUID của Tenant nếu đại lý có tài khoản riêng" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showModal = false">Hủy</el-button>
                <el-button type="primary" @click="saveDealer">Lưu dữ liệu</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.dealer-management :deep(.el-card) {
    border-radius: 12px;
}
</style>
