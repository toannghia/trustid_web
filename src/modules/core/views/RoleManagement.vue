<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { Plus, Delete, Edit, Refresh, Lock, Setting } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';
import { MENU_GROUPS } from '@/config/menuConfig';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const loading = ref(false);
const roles = ref<any[]>([]);
const permissionGroups = ref<Record<string, { key: string; label: string }[]>>({});

const dialogVisible = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const activeTab = ref('permissions');

const form = reactive({
    id: '',
    name: '',
    displayName: '',
    description: '',
    permissions: [] as string[],
    hiddenMenus: [] as string[]
});

const rules = {
    name: [{ required: true, message: 'Vui lòng nhập tên Role', trigger: 'blur' }],
};

const formRef = ref();
const activeGroups = ref<string[]>([]);

// ==================== FETCH DATA ====================
const fetchRoles = async () => {
    loading.value = true;
    try {
        const response = await api.get('/admin/roles');
        roles.value = response.data;
    } catch (error: any) {
        ElMessage.error('Không thể tải danh sách Role: ' + (error.response?.data?.message || error.message));
    } finally {
        loading.value = false;
    }
};

const fetchPermissionGroups = async () => {
    try {
        const response = await api.get('/admin/permission-groups');
        permissionGroups.value = response.data || {};
    } catch (error: any) {
        console.error('Failed to fetch permission groups', error);
    }
};

// ==================== PERMISSION HELPERS ====================
const getGroupSelectedCount = (perms: { key: string; label: string }[]) => {
    return perms.filter(p => form.permissions.includes(p.key)).length;
};

const toggleGroup = (perms: { key: string; label: string }[], checked: boolean) => {
    const keys = perms.map(p => p.key);
    if (checked) {
        form.permissions = [...new Set([...form.permissions, ...keys])];
    } else {
        form.permissions = form.permissions.filter(p => !keys.includes(p));
    }
};

const isGroupAllSelected = (perms: { key: string; label: string }[]) => {
    return perms.every(p => form.permissions.includes(p.key));
};

const isGroupIndeterminate = (perms: { key: string; label: string }[]) => {
    const count = getGroupSelectedCount(perms);
    return count > 0 && count < perms.length;
};

// ==================== MENU VISIBILITY (Tab 2) ====================
// Compute available menus based on selected permissions
const availableMenus = computed(() => {
    return MENU_GROUPS
        .map(g => ({
            ...g,
            items: g.items.filter(item => {
                if (form.permissions.includes('ALL')) return true;
                return form.permissions.includes(item.permission);
            })
        }))
        .filter(g => g.items.length > 0);
});

const isMenuHidden = (path: string) => form.hiddenMenus.includes(path);

const toggleMenuVisibility = (path: string) => {
    if (isMenuHidden(path)) {
        form.hiddenMenus = form.hiddenMenus.filter(p => p !== path);
    } else {
        form.hiddenMenus.push(path);
    }
};

const totalPermissions = computed(() =>
    Object.values(permissionGroups.value).flat().length
);

const totalAvailableMenus = computed(() =>
    availableMenus.value.reduce((acc, g) => acc + g.items.length, 0)
);

const hiddenMenuCount = computed(() => form.hiddenMenus.length);

// ==================== DIALOG HANDLERS ====================
const openCreateDialog = () => {
    isEdit.value = false;
    Object.assign(form, { id: '', name: '', displayName: '', description: '', permissions: [], hiddenMenus: [] });
    activeGroups.value = Object.keys(permissionGroups.value);
    activeTab.value = 'permissions';
    dialogVisible.value = true;
};

const openEditDialog = (role: any) => {
    isEdit.value = true;
    Object.assign(form, {
        id: role.id,
        name: role.name,
        displayName: role.displayName || '',
        description: role.description || '',
        permissions: role.permissions ? [...role.permissions] : [],
        hiddenMenus: role.hiddenMenus ? [...role.hiddenMenus] : []
    });
    activeGroups.value = Object.entries(permissionGroups.value)
        .filter(([, perms]) => perms.some(p => form.permissions.includes(p.key)))
        .map(([group]) => group);
    activeTab.value = 'permissions';
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
                    displayName: form.displayName,
                    description: form.description,
                    permissions: form.permissions,
                    hiddenMenus: form.hiddenMenus
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
        { confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', type: 'warning' }
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

// ==================== GLOBAL MENU CONFIG ====================
const globalMenuConfigs = ref<any[]>([]);
const globalConfigLoading = ref(false);
const globalConfigSaving = ref(false);
const showGlobalConfig = ref(false);

const fetchGlobalMenuConfigs = async () => {
    globalConfigLoading.value = true;
    try {
        const { data } = await api.get('/admin/menu-configs');
        globalMenuConfigs.value = data || [];
    } catch { 
        globalMenuConfigs.value = [];
    } finally {
        globalConfigLoading.value = false;
    }
};

// Build full menu list for global config table
const allMenuItems = computed(() => {
    return MENU_GROUPS.flatMap(g =>
        g.items.map(item => {
            const config = globalMenuConfigs.value.find(c => c.menuPath === item.path);
            return {
                path: item.path,
                label: item.title,
                group: g.label,
                hideForAll: config?.hideForAll || false,
                hiddenForRoles: config?.hiddenForRoles || []
            };
        })
    );
});

const toggleGlobalHideForAll = (path: string) => {
    const item = allMenuItems.value.find(m => m.path === path);
    if (item) item.hideForAll = !item.hideForAll;
};

const saveGlobalMenuConfigs = async () => {
    globalConfigSaving.value = true;
    try {
        const configs = allMenuItems.value
            .filter(m => m.hideForAll || m.hiddenForRoles.length > 0)
            .map(m => ({
                menuPath: m.path,
                menuLabel: m.label,
                hideForAll: m.hideForAll,
                hiddenForRoles: m.hiddenForRoles
            }));
        await api.put('/admin/menu-configs', { configs });
        ElMessage.success('Đã lưu cấu hình menu hệ thống');
        fetchGlobalMenuConfigs();
    } catch (error: any) {
        ElMessage.error('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
        globalConfigSaving.value = false;
    }
};

// Role names for multi-select in global config
const roleNames = computed(() => roles.value.map(r => r.name));

onMounted(() => {
    fetchRoles();
    fetchPermissionGroups();
    fetchGlobalMenuConfigs();
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
                <el-table-column prop="name" label="Mã Role" width="180">
                    <template #default="{ row }">
                        <div class="font-bold text-blue-600">{{ row.name }}</div>
                    </template>
                </el-table-column>

                <el-table-column label="Tên hiển thị" min-width="200">
                    <template #default="{ row }">
                        <span class="font-medium text-gray-800">{{ row.displayName || '—' }}</span>
                    </template>
                </el-table-column>

                <el-table-column label="Số lượng Quyền" width="150" align="center">
                    <template #default="{ row }">
                        <el-tag type="info" round>{{ row.permissions ? row.permissions.length : 0 }} quyền</el-tag>
                    </template>
                </el-table-column>

                <el-table-column label="Menu ẩn" width="120" align="center">
                    <template #default="{ row }">
                        <el-tag v-if="row.hiddenMenus?.length" type="warning" round>{{ row.hiddenMenus.length }} ẩn</el-tag>
                        <span v-else class="text-gray-300">—</span>
                    </template>
                </el-table-column>

                <el-table-column label="Hành động" width="150" align="right">
                    <template #default="{ row }">
                        <el-button-group>
                            <el-button :icon="Edit" size="small" @click="openEditDialog(row)" />
                            <el-button :icon="Delete" type="danger" size="small" text @click="deleteRole(row)" />
                        </el-button-group>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <!-- Global Menu Config Section -->
        <div class="mt-8 bg-white rounded-lg shadow-sm overflow-hidden">
            <div class="p-4 border-b bg-gray-50 flex justify-between items-center cursor-pointer"
                 @click="showGlobalConfig = !showGlobalConfig">
                <div class="flex items-center gap-2">
                    <el-icon><Setting /></el-icon>
                    <span class="font-bold text-gray-700">Cấu hình Menu Hệ thống (Global)</span>
                    <span class="text-xs text-gray-400">— Ẩn menu cho nhóm vai trò hoặc toàn bộ hệ thống</span>
                </div>
                <el-icon class="transition-transform" :class="{ 'rotate-180': showGlobalConfig }">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" /></svg>
                </el-icon>
            </div>
            <div v-show="showGlobalConfig" v-loading="globalConfigLoading">
                <el-table :data="allMenuItems" style="width: 100%" max-height="500">
                    <el-table-column prop="group" label="Nhóm" width="180">
                        <template #default="{ row }">
                            <span class="text-xs text-gray-500 uppercase">{{ row.group }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column prop="label" label="Menu" min-width="200">
                        <template #default="{ row }">
                            <span class="font-medium">{{ row.label }}</span>
                            <span class="text-xs text-gray-400 ml-2">{{ row.path }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="Ẩn toàn hệ thống" width="160" align="center">
                        <template #default="{ row }">
                            <el-switch v-model="row.hideForAll" size="small"
                                active-text="Ẩn" inactive-text=""
                                style="--el-switch-on-color: #ef4444" />
                        </template>
                    </el-table-column>
                    <el-table-column label="Ẩn cho nhóm vai trò" min-width="300">
                        <template #default="{ row }">
                            <el-select v-model="row.hiddenForRoles" multiple collapse-tags collapse-tags-tooltip
                                placeholder="Không ẩn" class="w-full" size="small" :disabled="row.hideForAll">
                                <el-option v-for="r in roleNames" :key="r" :label="r" :value="r" />
                            </el-select>
                        </template>
                    </el-table-column>
                </el-table>
                <div class="p-4 flex justify-end border-t">
                    <el-button type="primary" :loading="globalConfigSaving" @click="saveGlobalMenuConfigs">
                        Lưu cấu hình Global
                    </el-button>
                </div>
            </div>
        </div>

        <!-- Create/Edit Modal -->
        <el-dialog
            v-model="dialogVisible"
            :close-on-click-modal="false"
            :show-close="false"
            width="750px"
            class="branded-role-dialog"
            destroy-on-close
        >
            <template #header>
                <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                    <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                    <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
                    <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
                        {{ isEdit ? 'Cập nhật Role' : 'Tạo Role Mới' }}
                    </span>
                    <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="dialogVisible = false">
                        <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                    </div>
                </div>
            </template>
            <el-form :model="form" :rules="rules" ref="formRef" label-position="top" style="padding: 24px 24px 8px;">
                <div class="grid grid-cols-2 gap-4">
                    <el-form-item label="Tên Role (Mã định danh)" prop="name">
                        <el-input v-model="form.name" placeholder="VD: FARM_MANAGER" :disabled="isEdit" />
                        <div class="text-xs text-gray-400 mt-1">Viết hoa, không dấu, nối bằng gạch dưới.</div>
                    </el-form-item>
                    <el-form-item label="Tên hiển thị">
                        <el-input v-model="form.displayName" placeholder="VD: Quản lý Nông trại" />
                    </el-form-item>
                </div>

                <!-- Tabs: Permissions + Menu Visibility -->
                <el-tabs v-model="activeTab" class="mt-2">
                    <el-tab-pane label="Quyền hạn" name="permissions">
                        <div class="w-full text-xs text-gray-400 mb-2">
                            Đã chọn: <strong class="text-blue-600">{{ form.permissions.length }}</strong> / {{ totalPermissions }} quyền
                        </div>
                        <div class="border rounded-lg max-h-[400px] overflow-y-auto bg-gray-50 w-full">
                            <el-collapse v-model="activeGroups" class="permission-groups">
                                <el-collapse-item
                                    v-for="(perms, group) in permissionGroups"
                                    :key="group" :name="group"
                                >
                                    <template #title>
                                        <div class="flex items-center gap-3 w-full pr-4" @click.stop>
                                            <el-checkbox
                                                :model-value="isGroupAllSelected(perms)"
                                                :indeterminate="isGroupIndeterminate(perms)"
                                                @change="(val: boolean) => toggleGroup(perms, val)"
                                                @click.stop
                                            />
                                            <span class="font-semibold text-gray-700">{{ group }}</span>
                                            <el-tag size="small"
                                                :type="getGroupSelectedCount(perms) > 0 ? 'primary' : 'info'"
                                                round class="ml-auto"
                                            >
                                                {{ getGroupSelectedCount(perms) }}/{{ perms.length }}
                                            </el-tag>
                                        </div>
                                    </template>
                                    <div class="px-8 pb-3">
                                        <el-checkbox-group v-model="form.permissions">
                                            <div class="grid grid-cols-2 gap-1">
                                                <el-checkbox
                                                    v-for="perm in perms"
                                                    :key="perm.key"
                                                    :label="perm.key"
                                                    :value="perm.key"
                                                    class="!mr-0"
                                                >
                                                    <span class="text-sm">{{ perm.label }}</span>
                                                </el-checkbox>
                                            </div>
                                        </el-checkbox-group>
                                    </div>
                                </el-collapse-item>
                            </el-collapse>
                        </div>
                    </el-tab-pane>

                    <el-tab-pane name="menus">
                        <template #label>
                            Menu hiển thị
                            <el-badge v-if="hiddenMenuCount > 0" :value="hiddenMenuCount" type="warning" class="ml-1" />
                        </template>
                        <div class="text-xs text-gray-400 mb-2">
                            Menu khả dụng: <strong class="text-blue-600">{{ totalAvailableMenus }}</strong>
                            | Đã ẩn: <strong class="text-red-500">{{ hiddenMenuCount }}</strong>
                        </div>
                        <div class="border rounded-lg max-h-[400px] overflow-y-auto bg-gray-50">
                            <div v-if="availableMenus.length === 0" class="text-center text-gray-400 py-8">
                                Chưa chọn quyền nào. Vui lòng chọn quyền hạn trước.
                            </div>
                            <div v-for="group in availableMenus" :key="group.label" class="border-b last:border-b-0">
                                <div class="px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-500 uppercase">
                                    {{ group.label }}
                                </div>
                                <div class="px-4 py-1">
                                    <div v-for="item in group.items" :key="item.path"
                                         class="flex items-center justify-between py-2 border-b last:border-b-0 border-gray-100">
                                        <div class="flex items-center gap-2">
                                            <el-icon :size="16" class="text-gray-400">
                                                <component :is="item.icon" />
                                            </el-icon>
                                            <span class="text-sm font-medium">{{ item.title }}</span>
                                            <span class="text-xs text-gray-400">{{ item.path }}</span>
                                        </div>
                                        <el-switch
                                            :model-value="!isMenuHidden(item.path)"
                                            @change="toggleMenuVisibility(item.path)"
                                            size="small"
                                            active-text="Hiện"
                                            inactive-text="Ẩn"
                                            style="--el-switch-on-color: #10b981; --el-switch-off-color: #ef4444"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </el-tab-pane>
                </el-tabs>
            </el-form>

            <template #footer>
                <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
                    <el-button @click="dialogVisible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
                    <el-button type="primary" :loading="submitting" @click="handleSubmit" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
                        {{ isEdit ? 'Cập nhật' : 'Tạo mới' }}
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.permission-groups :deep(.el-collapse-item__header) {
    background: transparent;
    padding: 8px 16px;
    font-size: 14px;
    border-bottom: 1px solid #f0f0f0;
}
.permission-groups :deep(.el-collapse-item__content) {
    padding-bottom: 0;
}
.permission-groups :deep(.el-collapse-item__wrap) {
    border-bottom: 1px solid #f0f0f0;
}
</style>

<style>
.branded-role-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-role-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-role-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-role-dialog .el-dialog__footer {
  padding: 0 !important;
  border-top: none !important;
}
</style>
