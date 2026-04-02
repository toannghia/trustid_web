<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, Location } from '@element-plus/icons-vue';
import LTECard from '@/components/lte/LTECard.vue';
import { regionApi, type RegionDto } from '../api/regionApi';
import { VIETNAM_PROVINCES } from '@/common/data/provinces';

const regions = ref<RegionDto[]>([]);
const loading = ref(false);
const showModal = ref(false);
const provinces = ref(VIETNAM_PROVINCES);

const form = ref({
    id: '',
    name: '',
    provinces: [],
    description: '',
    status: 'ACTIVE'
});

const fetchRegions = async () => {
    loading.value = true;
    try {
        regions.value = await regionApi.findAll();
    } catch (error) {
        ElMessage.error('Lỗi tải danh sách vùng');
    } finally {
        loading.value = false;
    }
};

const handleCreate = () => {
    form.value = {
        id: '',
        name: '',
        provinces: [],
        description: '',
        status: 'ACTIVE'
    };
    showModal.value = true;
};

const handleEdit = (row: any) => {
    form.value = { ...row };
    showModal.value = true;
};

const handleDelete = (row: any) => {
    ElMessageBox.confirm(`Xóa vùng ${row.name}?`, 'Cảnh báo', { type: 'warning' })
        .then(async () => {
            await regionApi.delete(row.id);
            ElMessage.success('Đã xóa vùng');
            fetchRegions();
        });
};

const saveRegion = async () => {
    try {
        if (form.value.id) {
            await regionApi.update(form.value.id, form.value);
        } else {
            await regionApi.create(form.value);
        }
        ElMessage.success('Lưu thành công');
        showModal.value = false;
        fetchRegions();
    } catch (error: any) {
        ElMessage.error(error.response?.data?.message || 'Lỗi khi lưu dữ liệu');
    }
};

onMounted(fetchRegions);
</script>

<template>
    <div class="territory-management p-4">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold flex items-center">
                <el-icon class="mr-2"><Location /></el-icon>
                Quản lý Phân vùng (Regions)
            </h2>
            <el-button type="primary" :icon="Plus" @click="handleCreate">Thêm khu vực mới</el-button>
        </div>

        <LTECard>
            <el-table :data="regions" v-loading="loading" border stripe>
                <el-table-column prop="name" label="Tên khu vực" width="200" />
                <el-table-column label="Các tỉnh thành" min-width="300">
                    <template #default="{ row }">
                        <div class="flex flex-wrap gap-1">
                            <el-tag 
                                v-for="p in row.provinces" 
                                :key="p" 
                                size="small" 
                                type="info" 
                                effect="plain"
                            >
                                {{ p }}
                            </el-tag>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="description" label="Ghi chú" />
                <el-table-column prop="status" label="Trạng thái" width="120">
                    <template #default="{ row }">
                        <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                            {{ row.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng' }}
                        </el-tag>
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

        <el-dialog v-model="showModal" :title="form.id ? 'Sửa khu vực' : 'Thêm khu vực'" width="600px">
            <el-form :model="form" label-width="120px">
                <el-form-item label="Tên khu vực" required>
                    <el-input v-model="form.name" placeholder="VD: Miền Bắc, Miền Tây, KV1..." />
                </el-form-item>
                <el-form-item label="Chọn tỉnh thành">
                    <el-select 
                        v-model="form.provinces" 
                        multiple 
                        filterable 
                        placeholder="Chọn các tỉnh thuộc vùng này"
                        class="w-full"
                    >
                        <el-option v-for="p in provinces" :key="p" :label="p" :value="p" />
                    </el-select>
                </el-form-item>
                <el-form-item label="Ghi chú">
                    <el-input v-model="form.description" type="textarea" />
                </el-form-item>
                <el-form-item label="Trạng thái">
                    <el-radio-group v-model="form.status">
                        <el-radio label="ACTIVE">Hoạt động</el-radio>
                        <el-radio label="INACTIVE">Tạm dừng</el-radio>
                    </el-radio-group>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showModal = false">Hủy</el-button>
                <el-button type="primary" @click="saveRegion">Lưu vùng</el-button>
            </template>
        </el-dialog>
    </div>
</template>
