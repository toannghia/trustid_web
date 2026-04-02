<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { Plus, Delete, Edit, Refresh, Lock } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const loading = ref(false);
const roles = ref<any[]>([]);
const permissions = ref<any[]>([]);

const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);

const form = reactive({
    id: '',
    name: '',
    description: '',
    permissions: [] as string[]
});

const rules = {
    name: [{ required: true, message: 'Vui lòng nhập tên Role', trigger: 'blur' }],
};

const formRef = ref();

// Fetch Roles
const fetchRoles = async () => {
    loading.value = true;
    try {
        const response = await api.get('/admin/roles');
        roles.value = response.data; // Fixed: Backend returns array directly
    } catch (error: any) {
        ElMessage.error('Không thể tải danh sách Role: ' + (error.response?.data?.message || error.message));
    } finally {
        loading.value = false;
    }
};

// Fetch Permissions
const fetchPermissions = async () => {
    try {
        const response = await api.get('/admin/permissions');
        permissions.value = response.data || []; // Fixed: Backend returns array directly
    } catch (error: any) {
        console.error('Failed to fetch permissions', error);
    }
};

const openCreateDialog = () => {
    isEdit.value = false;
    form.id = '';
    form.name = '';
    form.description = '';
    form.permissions = [];
    dialogVisible.value = true;
};

const openEditDialog = (role: any) => {
    isEdit.value = true;
    form.id = role.id;
    form.name = role.name;
    form.description = role.description;
    // Map existing permissions
    form.permissions = role.permissions ? role.permissions.map((p: any) => typeof p === 'string' ? p : p.code) : [];
    dialogVisible.value = true;
};

const handleSubmit = async () => {
    if (!formRef.value) return;
    
    await formRef.value.validate(async (valid: boolean) => {
        if (valid) {
            submitting.value = true;
            try {
                const payload = {
                    name: form.name,
                    description: form.description,
                    permissions: form.permissions
                };

                if (isEdit.value) {
                    await api.put(`/admin/roles/${form.id}`, payload);
                    ElMessage.success('Cập nhật Role thành công');
                } else {
                    await api.post('/admin/roles', payload);
                    ElMessage.success('Tạo Role mới thành công');
                }
                dialogVisible.value = false;
                fetchRoles();
            } catch (error: any) {
                ElMessage.error('Lỗi: ' + (error.response?.data?.message || error.message));
            } finally {
                submitting.value = false;
            }
        }
    });
};

const deleteRole = (role: any) => {
    ElMessageBox.confirm(
        `Bạn có chắc chắn muốn xóa Role "${role.name}"? Hành động này không thể hoàn tác.`,
        'Xác nhận xóa',
        {
            confirmButtonText: 'Xóa',
            cancelButtonText: 'Hủy',
            type: 'warning',
        }
    ).then(async () => {
        try {
            await api.delete(`/admin/roles/${role.id}`);
            ElMessage.success('Đã xóa Role thành công');
            fetchRoles();
        } catch (error: any) {
             ElMessage.error('Không thể xóa: ' + (error.response?.data?.message || error.message));
        }
    }).catch(() => {});
};

onMounted(() => {
    fetchRoles();
    fetchPermissions();
});
</script>

<template>
    <div class="role-management p-6">
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">Quản lý Phân quyền</h1>
                <p class="text-gray-500 text-sm mt-1">Cấu hình các nhóm quyền (Role) và gán quyền chi tiết</p>
            </div>
            <div class="flex gap-2">
                <el-button :icon="Refresh" circle @click="fetchRoles" />
                <el-button type="primary" :icon="Plus" @click="openCreateDialog">Thêm Role Mới</el-button>
            </div>
        </div>

        <!-- Roles Table -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
            <el-table :data="roles" v-loading="loading" style="width: 100%">
                <el-table-column prop="name" label="Tên Role" width="200">
                    <template #default="{ row }">
                        <div class="font-bold text-blue-600">{{ row.name }}</div>
                    </template>
                </el-table-column>
                
                <el-table-column prop="description" label="Mô tả" min-width="200" />
                
                <el-table-column label="Số lượng Quyền" width="150" align="center">
                    <template #default="{ row }">
                        <el-tag type="info" round>{{ row.permissions ? row.permissions.length : 0 }} permissions</el-tag>
                    </template>
                </el-table-column>
                
                <el-table-column label="Hành động" width="150" align="right">
                    <template #default="{ row }">
                        <el-button-group>
                            <el-button :icon="Edit" size="small" @click="openEditDialog(row)" />
                            <el-button 
                                :icon="Delete" 
                                type="danger" 
                                size="small"
                                text
                                @click="deleteRole(row)"
                            />
                        </el-button-group>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <!-- Create/Edit Modal -->
        <el-dialog 
            v-model="dialogVisible" 
            :title="isEdit ? 'Cập nhật Role' : 'Tạo Role Mới'" 
            width="600px" 
            destroy-on-close
        >
            <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
                <el-form-item label="Tên Role (Mã định danh)" prop="name">
                    <el-input v-model="form.name" placeholder="VD: ADMIN, MANAGER, SUPPORT..." :disabled="isEdit" />
                    <div class="text-xs text-gray-400 mt-1">Nên đặt tên viết hoa, không dấu, nối bằng gạch dưới.</div>
                </el-form-item>
                
                <el-form-item label="Mô tả" prop="description">
                    <el-input v-model="form.description" type="textarea" :rows="2" placeholder="Mô tả chi tiết về vai trò này..." />
                </el-form-item>

                <el-form-item label="Danh sách Quyền (Permissions)">
                    <div class="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-gray-50">
                        <el-checkbox-group v-model="form.permissions">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <el-checkbox 
                                    v-for="perm in permissions" 
                                    :key="perm" 
                                    :label="perm" 
                                    class="!mr-0 w-full"
                                >
                                    {{ perm }}
                                </el-checkbox>
                            </div>
                        </el-checkbox-group>
                        <div v-if="permissions.length === 0" class="text-center text-gray-400 py-4">
                            Không tải được danh sách quyền hoặc trống.
                        </div>
                    </div>
                </el-form-item>
            </el-form>
            
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="dialogVisible = false">Hủy</el-button>
                    <el-button type="primary" :loading="submitting" @click="handleSubmit">
                        {{ isEdit ? 'Cập nhật' : 'Tạo mới' }}
                    </el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>
