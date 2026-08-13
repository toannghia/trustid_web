<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { supplierApi } from '../api/supplier';
import SupplierFormModal from '../components/SupplierFormModal.vue';
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const suppliers = ref([]);
const searchTerm = ref('');
const showModal = ref(false);
const isEdit = ref(false);
const editingSupplier = ref(null);

const showDeleteDialog = ref(false);
const deleteConfirmChecked = ref(false);
const deletingSupplier = ref<any>(null);
const deleting = ref(false);

const page = ref(1);
const limit = ref(10);
const totalSuppliers = ref(0);

const handlePageChange = (val: number) => {
    page.value = val;
    fetchSuppliers();
};

const handleSizeChange = (val: number) => {
    limit.value = val;
    page.value = 1;
    fetchSuppliers();
};

const handleFilterChange = () => {
    page.value = 1;
    fetchSuppliers();
};

import { watch } from 'vue';
let searchTimeout: any = null;
watch(searchTerm, () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        handleFilterChange();
    }, 300);
});

const fetchSuppliers = async () => {
    try {
        const params: any = {
            page: page.value,
            limit: limit.value
        };
        if (searchTerm.value) {
            params.search = searchTerm.value;
        }
        const { data } = await supplierApi.getAll(params);
        if (data && data.data && Array.isArray(data.data)) {
            suppliers.value = data.data;
            totalSuppliers.value = data.meta?.total || data.data.length;
        } else {
            suppliers.value = data.data || data || [];
            totalSuppliers.value = suppliers.value.length;
        }
    } catch (e) {
        console.error(e);
        ElMessage.error('Lỗi tải danh sách nhà cung cấp');
    }
};

const handleCreate = () => {
    isEdit.value = false;
    editingSupplier.value = null;
    showModal.value = true;
};

const handleEdit = (row: any) => {
    isEdit.value = true;
    editingSupplier.value = row;
    showModal.value = true;
};

const handleDelete = (row: any) => {
    deletingSupplier.value = row;
    deleteConfirmChecked.value = false;
    showDeleteDialog.value = true;
};

const confirmDelete = async () => {
    if (!deleteConfirmChecked.value || !deletingSupplier.value) return;
    deleting.value = true;
    try {
        await supplierApi.delete(deletingSupplier.value.id);
        ElMessage.success('Xóa đối tác thành công');
        showDeleteDialog.value = false;
        fetchSuppliers();
    } catch (e: any) {
        ElMessage.error('Xóa thất bại: ' + (e.response?.data?.message || e.message));
    } finally {
        deleting.value = false;
    }
};

const filteredSuppliers = computed(() => suppliers.value);

const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
        'MATERIAL': 'Vật tư',
        'LOGISTICS': 'Vận chuyển',
        'OTHER': 'Khác'
    };
    return map[type] || type;
};

const getStatusType = (type: string) => {
     const map: Record<string, string> = {
        'MATERIAL': 'success',
        'LOGISTICS': 'warning',
        'OTHER': 'info'
    };
    return map[type] || '';
};

onMounted(() => {
    fetchSuppliers();
});
</script>

<template>
    <div>
        <LTEContentHeader title="Quản lý Đối tác & Nhà cung cấp" :breadcrumbs="[{ title: 'Suppliers' }]" />

        <LTECard variant="primary" outline>
            <div class="mb-4 flex justify-between items-center">
                <el-input 
                    v-model="searchTerm" 
                    placeholder="Tìm kiếm đối tác..." 
                    :prefix-icon="Search" 
                    class="w-64" 
                    clearable 
                />
                <el-button type="primary" :icon="Plus" @click="handleCreate">Thêm đối tác</el-button>
            </div>

            <el-table :data="filteredSuppliers" stripe border style="width: 100%">
                <el-table-column label="STT" width="50" align="center">
                    <template #default="scope">
                        {{ (page - 1) * limit + scope.$index + 1 }}
                    </template>
                </el-table-column>
                
                <el-table-column prop="name" label="Tên đối tác" min-width="200">
                    <template #default="scope">
                        <span class="font-bold text-gray-700">{{ scope.row.name }}</span>
                    </template>
                </el-table-column>

                <el-table-column prop="type" label="Loại hình" width="150">
                    <template #default="scope">
                         <el-tag :type="getStatusType(scope.row.type)" effect="plain">
                             {{ getTypeLabel(scope.row.type) }}
                         </el-tag>
                    </template>
                </el-table-column>

                <el-table-column label="Thông tin liên hệ" min-width="250">
                    <template #default="scope">
                        <div class="text-xs space-y-1">
                            <div v-if="scope.row.contactInfo?.phone">
                                <span class="text-gray-500">SĐT:</span> {{ scope.row.contactInfo.phone }}
                            </div>
                            <div v-if="scope.row.contactInfo?.email">
                                <span class="text-gray-500">Email:</span> {{ scope.row.contactInfo.email }}
                            </div>
                            <div v-if="scope.row.contactInfo?.address">
                                <span class="text-gray-500">Đ/c:</span> {{ scope.row.contactInfo.address }}
                            </div>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="Thao tác" width="120" fixed="right" align="center">
                    <template #default="scope">
                        <div class="flex justify-center gap-2">
                            <el-button type="primary" :icon="Edit" circle size="small" @click="handleEdit(scope.row)" />
                            <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(scope.row)" />
                        </div>
                    </template>
                </el-table-column>
            </el-table>

            <div class="p-4 flex justify-end">
                <el-pagination
                    v-model:current-page="page"
                    v-model:page-size="limit"
                    :total="totalSuppliers"
                    :page-sizes="[10, 50, 100, 500]"
                    layout="total, sizes, prev, pager, next, jumper"
                    background
                    @size-change="handleSizeChange"
                    @current-change="handlePageChange"
                />
            </div>
        </LTECard>

        <SupplierFormModal 
            v-model="showModal"
            :is-edit="isEdit"
            :supplier-data="editingSupplier"
            @saved="fetchSuppliers"
        />

        <!-- Delete Confirmation Dialog -->
        <el-dialog v-model="showDeleteDialog" width="440px" :show-close="false" class="branded-delete-dialog">
            <template #header>
                <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                    <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                    <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                    <span style="color: #fff; font-size: 16px; font-weight: 600;">Xác nhận xoá đối tác</span>
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
                            Bạn đang chuẩn bị xoá đối tác
                            <strong style="color: #0F2B46;">"{{ deletingSupplier?.name }}"</strong>.
                        </p>
                    </div>
                </div>
                <el-checkbox v-model="deleteConfirmChecked" style="white-space: normal; word-break: break-word;">
                    <span style="font-size: 13px; color: #344054;">Tôi xác nhận muốn xoá đối tác này và đã hiểu rằng hành động không thể hoàn tác</span>
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
                        Xoá đối tác
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<style>
.branded-delete-dialog {
    border-radius: 8px !important;
    overflow: hidden !important;
    padding: 0 !important;
}
.branded-delete-dialog .el-dialog__header {
    padding: 0 !important;
    margin: 0 !important;
}
.branded-delete-dialog .el-dialog__body {
    padding: 0 !important;
}
.branded-delete-dialog .el-dialog__footer {
    padding: 0 !important;
}
</style>
