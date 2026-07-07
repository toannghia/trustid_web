<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { userApi } from '../api/user';
import { tenantApi } from '../api/tenant';
import { dealerApi } from '@/modules/supply/api/dealerApi';
import type { Tenant } from '@/types/core';
import { ElMessage } from 'element-plus';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { Search, Filter, Delete, Edit, Unlock } from '@element-plus/icons-vue';

import { Plus } from '@element-plus/icons-vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const roles = ref<any[]>([]);

const fetchRoles = async () => {
    try {
        const { data } = await api.get('/admin/roles');
        roles.value = data || [];
    } catch (e) {
        console.error('Failed to fetch roles:', e);
    }
};

import api from '@/common/utils/api';
import { useAuthStore } from '../store/auth';

import { computed } from 'vue';

const authStore = useAuthStore();
const isSystemAdmin = computed(() => authStore.user?.role === 'ADMIN');

const availableRoles = computed(() => {
    if (isSystemAdmin.value) return roles.value;
    const restricted = ['ADMIN', 'REGULATOR_OFFICER'];
    return roles.value.filter(r => !restricted.includes(r.name));
});

const getRoleName = (roleCode: string | any) => {
  const code = typeof roleCode === 'object' ? roleCode?.name : roleCode;
  const found = roles.value.find(r => r.name === code);
  return found?.displayName || code || 'N/A';
};

// Trạng thái dữ liệu
const users = ref([]);
const tenants = ref<Tenant[]>([]);
const dealers = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const isEdit = ref(false);
const currentUser = ref<any>(null);
const totalUsers = ref(0);

// Delete dialog state
const showDeleteDialog = ref(false);
const deleteConfirmChecked = ref(false);
const deletingUser = ref<any>(null);
const deleting = ref(false);

const userForm = reactive({
  full_name: '',
  email: '',
  username: '',
  password: '',
  role: '',
  tenant_id: ''
});

// Bộ lọc nâng cao
const filter = reactive({
  page: 1,
  limit: 10,
  search: '',
  tenantId: '',
  roleName: '',
  showEndUsers: false
});

const handlePageChange = (val: number) => {
    filter.page = val;
    fetchUsers();
};

const handleSizeChange = (val: number) => {
    filter.limit = val;
    filter.page = 1;
    fetchUsers();
};

const handleFilterChange = () => {
    filter.page = 1;
    fetchUsers();
};

import { watch } from 'vue';
let searchTimeout: any = null;
watch(() => filter.search, () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        handleFilterChange();
    }, 300);
});

watch([() => filter.tenantId, () => filter.roleName, () => filter.showEndUsers], () => {
    handleFilterChange();
});

const openCreateModal = () => {
  isEdit.value = false;
  currentUser.value = null;
  Object.assign(userForm, {
    full_name: '',
    email: '',
    username: '',
    password: '',
    role: '',
    tenant_id: ''
  });
  showModal.value = true;
};

const handleEditUser = (user: any) => {
  isEdit.value = true;
  currentUser.value = user;
  
  Object.assign(userForm, {
    full_name: user.full_name || user.fullName,
    email: user.email,
    username: user.username,
    password: '',
    role: user.role?.name || user.role_name || user.role || '',
    tenant_id: user.tenant_id || user.tenant?.id || ''
  });
  showModal.value = true;
  showModal.value = true;
};

const handleUnlockUser = async (user: any) => {
  try {
    await userApi.update(user.id, { status: 'ACTIVE' });
    ElMessage.success('Đã mở khóa tài khoản');
    fetchUsers();
  } catch (error: any) {
    ElMessage.error(error.message || 'Không thể mở khóa');
  }
};

const handleDeleteUser = (user: any) => {
  deletingUser.value = user;
  deleteConfirmChecked.value = false;
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!deleteConfirmChecked.value || !deletingUser.value) return;
  deleting.value = true;
  try {
    await userApi.delete(deletingUser.value.id);
    ElMessage.success('Đã xoá tài khoản thành công');
    showDeleteDialog.value = false;
    fetchUsers();
  } catch (error: any) {
    const msg = error.response?.data?.message || error.message || 'Không thể xoá tài khoản';
    ElMessage.error(msg);
  } finally {
    deleting.value = false;
  }
};

const handleSubmit = async () => {
  if (!userForm.username || !userForm.full_name || !userForm.role) {
    ElMessage.warning('Vui lòng điền đủ thông tin');
    return;
  }
  
  submitting.value = true;
  try {
    const payload: any = {
      fullName: userForm.full_name,
      email: userForm.email,
      username: userForm.username,
      roleName: userForm.role, // Must match CreateUserDto.roleName
      tenantId: userForm.tenant_id || null
    };

    if (userForm.password) {
      payload.password = userForm.password;
    }

    if (isEdit.value && currentUser.value) {
       await userApi.update(currentUser.value.id, payload);
       ElMessage.success('Cập nhật thành công');
    } else {
       await userApi.create(payload);
       ElMessage.success('Tạo người dùng thành công');
    }
    showModal.value = false;
    fetchUsers();
  } catch (error: any) {
    console.error(error);
    const msg = error.response?.data?.message || error.message || 'Có lỗi xảy ra';
    ElMessage.error(msg);
  } finally {
    submitting.value = false;
  }
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const params = Object.fromEntries(
      Object.entries(filter).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    
    // Explicitly define parameters to match backend expectation
    const apiParams = {
      page: params.page,
      limit: params.limit,
      search: params.search,
      tenantId: params.tenantId,
      roleName: params.roleName,
      excludeRole: !filter.showEndUsers ? 'END_USER' : undefined
    };

    const { data } = await userApi.getList(apiParams as any);
    users.value = data.data || data.items || (Array.isArray(data) ? data : []);
    totalUsers.value = data.meta?.total || users.value.length;
  } catch (error) {
    console.error('Error fetching users:', error);
    ElMessage.error('Không thể tải danh sách người dùng');
  } finally {
    loading.value = false;
  }
};

const fetchFilterData = async () => {
  try {
    const { data } = await tenantApi.getAll({});
    tenants.value = data.data || (Array.isArray(data) ? data : []); 
  } catch (e) {
    console.error(e);
  }
};

const getDealerForUser = (user: any) => {
  const tenantId = user.tenant_id || user.tenant?.id;
  if (!tenantId) return null;
  return dealers.value.find(d => d.dealerTenantId === tenantId);
};

onMounted(() => {
  fetchUsers();
  fetchFilterData();
  fetchRoles();
  // Fetch dealers for column lookup
  dealerApi.getList().then(res => {
    dealers.value = res.data || [];
  }).catch(() => {});
});
</script>

<template>
  <div>
    <LTEContentHeader title="Quản lý Người dùng" :breadcrumbs="[{ title: 'Users' }]" />

    <!-- Filter Card -->
    <LTECard title="Bộ lọc tìm kiếm" outline>
      <div class="flex flex-wrap gap-4 items-end">
        <div class="w-64">
          <label class="text-sm font-medium text-gray-700 block mb-1">Từ khóa</label>
          <el-input v-model="filter.search" placeholder="Tên, Username, Email..." :prefix-icon="Search" clearable />
        </div>
        <div class="w-48" v-if="isSystemAdmin">
          <label class="text-sm font-medium text-gray-700 block mb-1">Doanh nghiệp</label>
          <el-select v-model="filter.tenantId" clearable placeholder="Tất cả" class="w-full">
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </div>
        <div class="w-40">
          <label class="text-sm font-medium text-gray-700 block mb-1">Vai trò</label>
          <el-select v-model="filter.roleName" clearable placeholder="Tất cả" class="w-full">
            <el-option v-for="r in roles" :key="r.name" :label="r.displayName || r.name" :value="r.name" />
          </el-select>
        </div>
        <div>
          <el-button type="primary" :icon="Filter" @click="handleFilterChange">Lọc dữ liệu</el-button>
        </div>
        <div class="ml-auto flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700">Hiển thị End User</span>
            <el-switch v-model="filter.showEndUsers" />
        </div>
      </div>
    </LTECard>

    <!-- Data Table Card -->
    <LTECard variant="primary" outline>
      <div class="flex justify-end mb-4">
        <el-button type="primary" :icon="Plus" @click="openCreateModal">Tạo người dùng mới</el-button>
      </div>
      <el-table :data="users" v-loading="loading" class="w-full" stripe border>
        <el-table-column label="STT" width="60" align="center">
          <template #default="scope">
            {{ (filter.page - 1) * filter.limit + scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column label="Họ tên" min-width="180">
          <template #default="scope">
             <div class="font-medium text-gray-800">{{ scope.row.full_name || scope.row.fullName }}</div>
             <div class="text-xs text-secondary">{{ scope.row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="Tên đăng nhập" width="150" />
        <el-table-column label="Tổ chức" min-width="200">
          <template #default="scope">
            <span v-if="scope.row.tenant?.name || scope.row.tenant_name" class="text-blue-600 font-medium">
              🏢 {{ scope.row.tenant?.name || scope.row.tenant_name }}
            </span>
            <span v-else-if="scope.row.regulator?.name || scope.row.regulator_name" class="text-green-600 font-medium">
              🏛️ {{ scope.row.regulator?.name || scope.row.regulator_name }}
            </span>
            <span v-else class="badge bg-secondary text-white px-2 py-1 rounded text-xs">System</span>
          </template>
        </el-table-column>
        <el-table-column label="Đại lý" min-width="160">
          <template #default="scope">
            <template v-if="(scope.row.role?.name || scope.row.role_name || scope.row.role) === 'DEALER'">
              <span v-if="getDealerForUser(scope.row)" class="text-orange-600 font-medium">
                🏪 {{ getDealerForUser(scope.row)?.name }}
              </span>
              <span v-else class="text-xs text-gray-400 italic">Chưa gán đại lý</span>
            </template>
            <span v-else class="text-xs text-gray-300">—</span>
          </template>
        </el-table-column>
        <el-table-column label="Vai trò" width="180">
           <template #default="scope">
              <el-tag effect="dark" :type="(scope.row.role?.name || scope.row.role_name || scope.row.role) === 'ADMIN' ? 'danger' : 'primary'">
                {{ getRoleName(scope.row.role || scope.row.role_name) }}
              </el-tag>
           </template>
        </el-table-column>
        <el-table-column label="Trạng thái" width="120" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 'ACTIVE'" type="success" size="small">Hoạt động</el-tag>
            <el-tag v-else-if="scope.row.status === 'LOCKED' || scope.row.status === 'BLOCKED'" type="danger" size="small">Đã khóa</el-tag>
            <el-tag v-else type="info" size="small">{{ scope.row.status === 'INACTIVE' ? 'Ngừng hoạt động' : scope.row.status === 'PENDING' ? 'Chờ duyệt' : scope.row.status === 'SUSPENDED' ? 'Tạm khóa' : scope.row.status === 'DELETION_REQUESTED' ? 'Yêu cầu xóa' : scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="120" align="center">
          <template #default="scope">
            <div class="flex justify-center gap-1">
               <el-tooltip content="Mở khóa tài khoản" v-if="['LOCKED', 'BLOCKED', 'DELETION_REQUESTED'].includes(scope.row.status)">
                  <el-button type="success" link :icon="Unlock" @click="handleUnlockUser(scope.row)"></el-button>
               </el-tooltip>
               <el-button type="primary" link :icon="Edit" @click="handleEditUser(scope.row)"></el-button>
               <el-button type="danger" link :icon="Delete" @click="handleDeleteUser(scope.row)"></el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="p-4 flex justify-end">
          <el-pagination
              v-model:current-page="filter.page"
              v-model:page-size="filter.limit"
              :total="totalUsers"
              :page-sizes="[10, 50, 100, 500]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
          />
      </div>
    </LTECard>

    <!-- Modal Tạo/Sửa người dùng -->
    <el-dialog
      v-model="showModal"
      width="500px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-user-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
          <span style="color: #fff; font-size: 16px; font-weight: 600;">
            {{ isEdit ? 'Cập nhật thông tin người dùng' : 'Tạo người dùng mới' }}
          </span>
        </div>
      </template>

      <el-form label-position="top" style="padding: 24px 24px 8px;">
        <el-form-item label="Họ tên" required>
          <el-input v-model="userForm.full_name" placeholder="Nhập họ tên" style="--el-border-radius-base: 8px;" />
        </el-form-item>
        <el-form-item label="Email" required>
          <el-input v-model="userForm.email" placeholder="Nhập email" style="--el-border-radius-base: 8px;" />
        </el-form-item>
        <el-form-item label="Tên đăng nhập" required>
          <el-input v-model="userForm.username" placeholder="Nhập username" :disabled="isEdit" style="--el-border-radius-base: 8px;" />
        </el-form-item>
        <el-form-item label="Mật khẩu" :required="!isEdit">
          <el-input v-model="userForm.password" type="password" placeholder="Nhập mật khẩu" show-password style="--el-border-radius-base: 8px;" />
        </el-form-item>
        <el-form-item label="Vai trò" required>
          <el-select v-model="userForm.role" placeholder="Chọn vai trò" class="w-full" style="--el-border-radius-base: 8px;">
            <el-option v-for="r in availableRoles" :key="r.name" :label="r.displayName || r.name" :value="r.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="Doanh nghiệp" v-if="isSystemAdmin">
          <el-select v-model="userForm.tenant_id" placeholder="Chọn doanh nghiệp (Nếu có)" class="w-full" clearable style="--el-border-radius-base: 8px;">
             <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button 
            type="primary" 
            :loading="submitting" 
            @click="handleSubmit"
            style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff; background: #00875A; cursor: pointer;"
          >
            {{ isEdit ? 'Cập nhật' : 'Tạo mới' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Delete Confirmation Dialog -->
    <el-dialog
      v-model="showDeleteDialog"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-delete-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
          <span style="color: #fff; font-size: 16px; font-weight: 600;">Xác nhận xoá tài khoản</span>
        </div>
      </template>

      <div style="padding: 24px 24px 8px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px; background: #FEF3F2; border: 1px solid #FECDCA; border-radius: 10px;">
          <span style="font-size: 22px; margin-top: 1px;">⚠️</span>
          <div>
            <p style="font-weight: 600; color: #B42318; margin-bottom: 4px; font-size: 14px;">Hành động không thể hoàn tác!</p>
            <p style="font-size: 13px; color: #475467; line-height: 1.5;">
              Bạn đang chuẩn bị xoá tài khoản
              <strong style="color: #0F2B46;">"{{ deletingUser?.full_name || deletingUser?.fullName || deletingUser?.username }}"</strong>.
              Tất cả dữ liệu liên quan sẽ bị ảnh hưởng.
            </p>
          </div>
        </div>
        <el-checkbox v-model="deleteConfirmChecked" style="white-space: normal; word-break: break-word;">
          <span style="font-size: 13px; color: #344054;">Tôi xác nhận muốn xoá tài khoản này và đã hiểu rằng hành động không thể hoàn tác</span>
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
            Xoá tài khoản
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style>
.branded-delete-dialog,
.branded-user-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-delete-dialog .el-dialog__header,
.branded-user-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-delete-dialog .el-dialog__body,
.branded-user-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-delete-dialog .el-dialog__footer,
.branded-user-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>