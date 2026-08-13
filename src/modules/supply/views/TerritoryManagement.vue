<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { Plus, Edit, Delete, Location } from '@element-plus/icons-vue';
import LTECard from '@/components/lte/LTECard.vue';
import { regionApi, type RegionDto } from '../api/regionApi';
import { VIETNAM_PROVINCES } from '@/common/data/provinces';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const regions = ref<RegionDto[]>([]);
const loading = ref(false);
const showModal = ref(false);
const showDeleteDialog = ref(false);
const deleteConfirmChecked = ref(false);
const deletingRegion = ref<any>(null);
const deleting = ref(false);
const provinces = ref(VIETNAM_PROVINCES);

const formRef = ref<FormInstance>();
const rules = ref<FormRules>({
    name: [
        { required: true, message: 'Vui lòng nhập tên khu vực', trigger: 'blur' },
        { min: 3, max: 100, message: 'Độ dài từ 3 đến 100 ký tự', trigger: 'blur' }
    ],
    provinces: [
        { type: 'array', required: true, message: 'Vui lòng chọn ít nhất 1 tỉnh', trigger: 'change' }
    ],
    description: [
        { max: 255, message: 'Ghi chú không được vượt quá 255 ký tự', trigger: 'blur' }
    ]
});

const form = ref({
    id: '',
    name: '',
    provinces: [] as string[],
    description: '',
    status: 'ACTIVE'
});

const originalForm = ref(JSON.stringify(form.value));

const isFormChanged = computed(() => {
    return JSON.stringify(form.value) !== originalForm.value;
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
    originalForm.value = JSON.stringify(form.value);
    showModal.value = true;
    nextTick(() => {
        formRef.value?.clearValidate();
    });
};

const handleEdit = (row: any) => {
    form.value = { ...row };
    originalForm.value = JSON.stringify(form.value);
    showModal.value = true;
    nextTick(() => {
        formRef.value?.clearValidate();
    });
};

const handleDelete = (row: any) => {
    deletingRegion.value = row;
    deleteConfirmChecked.value = false;
    showDeleteDialog.value = true;
};

const confirmDelete = async () => {
    if (!deleteConfirmChecked.value || !deletingRegion.value) return;
    deleting.value = true;
    try {
        await regionApi.delete(deletingRegion.value.id);
        ElMessage.success('Đã xoá vùng thành công');
        showDeleteDialog.value = false;
        fetchRegions();
    } catch (error: any) {
        ElMessage.error(error.response?.data?.message || 'Không thể xoá vùng');
    } finally {
        deleting.value = false;
    }
};

const saveRegion = async () => {
    if (!formRef.value) return;
    
    await formRef.value.validate(async (valid) => {
        if (valid) {
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
        }
    });
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

        <!-- Modal Thêm/Sửa Khu vực -->
        <el-dialog v-model="showModal" width="600px" :show-close="false" destroy-on-close class="branded-dialog">
            <template #header>
                <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                    <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                    <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                    <span style="color: #fff; font-size: 16px; font-weight: 600;">
                        {{ form.id ? 'Sửa thông tin khu vực' : 'Thêm khu vực mới' }}
                    </span>
                    <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showModal = false">
                        <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                    </div>
                </div>
            </template>
            <el-form ref="formRef" :model="form" :rules="rules" label-position="top" style="padding: 24px 24px 8px;">
                <el-form-item label="Tên khu vực" prop="name">
                    <el-input v-model="form.name" placeholder="VD: Miền Bắc, Miền Tây, KV1..." style="--el-border-radius-base: 8px;" />
                </el-form-item>
                <el-form-item label="Chọn tỉnh thành" prop="provinces">
                    <el-select 
                        v-model="form.provinces" 
                        multiple 
                        filterable 
                        placeholder="Chọn các tỉnh thuộc vùng này"
                        class="w-full"
                        style="--el-border-radius-base: 8px;"
                    >
                        <el-option v-for="p in provinces" :key="p.code" :label="p.name" :value="p.name" />
                    </el-select>
                </el-form-item>
                <el-form-item label="Ghi chú" prop="description">
                    <el-input v-model="form.description" type="textarea" style="--el-border-radius-base: 8px;" />
                </el-form-item>
                <el-form-item label="Trạng thái">
                    <el-radio-group v-model="form.status">
                        <el-radio label="ACTIVE">Hoạt động</el-radio>
                        <el-radio label="INACTIVE">Tạm dừng</el-radio>
                    </el-radio-group>
                </el-form-item>
            </el-form>
            <template #footer>
                <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
                    <el-button @click="showModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
                    <el-button type="primary" @click="saveRegion" :disabled="!isFormChanged" style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff; background: #00875A;">
                        Lưu vùng
                    </el-button>
                </div>
            </template>
        </el-dialog>

        <!-- Delete Confirmation Dialog -->
        <el-dialog v-model="showDeleteDialog" width="440px" :show-close="false" class="branded-delete-dialog">
            <template #header>
                <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                    <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                    <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                    <span style="color: #fff; font-size: 16px; font-weight: 600;">Xác nhận xoá khu vực</span>
                    <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showDeleteDialog = false">
                        <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                    </div>
                </div>
            </template>

            <div style="padding: 24px 24px 8px;">
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px; background: #FEF3F2; border: 1px solid #FECDCA; border-radius: 10px;">
                    <span style="font-size: 22px; margin-top: 1px;">⚠️</span>
                    <div>
                        <p style="font-weight: 600; color: #B42318; margin-bottom: 4px; font-size: 14px;">Hành động không thể hoàn tác!</p>
                        <p style="font-size: 13px; color: #475467; line-height: 1.5;">
                            Bạn đang chuẩn bị xoá khu vực
                            <strong style="color: #0F2B46;">"{{ deletingRegion?.name }}"</strong>.
                        </p>
                    </div>
                </div>
                <el-checkbox v-model="deleteConfirmChecked" style="white-space: normal; word-break: break-word;">
                    <span style="font-size: 13px; color: #344054;">Tôi xác nhận muốn xoá khu vực này và đã hiểu rằng hành động không thể hoàn tác</span>
                </el-checkbox>
            </div>

            <template #footer>
                <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
                    <el-button @click="showDeleteDialog = false" style="border-radius: 8px; padding: 10px 20px;">Huỷ</el-button>
                    <el-button
                        :disabled="!deleteConfirmChecked"
                        :loading="deleting"
                        @click="confirmDelete"
                        style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff;"
                        :style="{ background: deleteConfirmChecked ? '#B42318' : '#D0D5DD', cursor: deleteConfirmChecked ? 'pointer' : 'not-allowed' }"
                    >
                        Xoá khu vực
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<style>
.branded-dialog,
.branded-delete-dialog {
    border-radius: 8px !important;
    overflow: hidden !important;
    padding: 0 !important;
}
.branded-dialog .el-dialog__header,
.branded-delete-dialog .el-dialog__header {
    padding: 0 !important;
    margin: 0 !important;
}
.branded-dialog .el-dialog__body,
.branded-delete-dialog .el-dialog__body {
    padding: 0 !important;
}
.branded-dialog .el-dialog__footer,
.branded-delete-dialog .el-dialog__footer {
    padding: 0 !important;
}
</style>
