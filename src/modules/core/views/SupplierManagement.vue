<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { supplierApi } from '../api/supplier';
import SupplierFormModal from '../components/SupplierFormModal.vue';
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const suppliers = ref([]);
const searchTerm = ref('');
const showModal = ref(false);
const isEdit = ref(false);
const editingSupplier = ref(null);

const fetchSuppliers = async () => {
    try {
        const { data } = await supplierApi.getAll();
        suppliers.value = data.data || data || [];
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
    ElMessageBox.confirm(
        'Bạn có chắc chắn muốn xóa đối tác này không?',
        { confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', type: 'warning' }
    ).then(async () => {
        try {
            await supplierApi.delete(row.id);
            ElMessage.success('Xóa thành công');
            fetchSuppliers();
        } catch (e) {
            ElMessage.error('Xóa thất bại');
        }
    }).catch(() => {});
};

const filteredSuppliers = computed(() => {
    if (!searchTerm.value) return suppliers.value;
    const lower = searchTerm.value.toLowerCase();
    return suppliers.value.filter((s: any) => 
        s.name?.toLowerCase().includes(lower) || 
        s.type?.toLowerCase().includes(lower)
    );
});

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
                <el-table-column type="index" label="#" width="50" align="center" />
                
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
        </LTECard>

        <SupplierFormModal 
            v-model="showModal"
            :is-edit="isEdit"
            :supplier-data="editingSupplier"
            @saved="fetchSuppliers"
        />
    </div>
</template>
