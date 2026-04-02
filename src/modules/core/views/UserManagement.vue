<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { userApi } from '../api/user';
import { tenantApi } from '../api/tenant';
import type { Tenant } from '@/types/core';
import { ElMessage } from 'element-plus';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { Search, Filter, Delete, Edit, Unlock } from '@element-plus/icons-vue';

import { Plus } from '@element-plus/icons-vue';

// Role Mapping
const roleMap: Record<string, string> = {
  'ADMIN': 'Quản trị hệ thống',
  'TENANT_ADMIN': 'Quản lý doanh nghiệp',
  'REGULATOR_OFFICER': 'Cơ quan quản lý',
  'FARMER': 'Nông dân',
  'WORKER': 'Công nhân sản xuất',
  'TRANSPORTER': 'Nhân viên vận chuyển',
  'PACKER': 'Nhân viên đóng gói',
  'WAREHOUSE_MANAGER': 'Thủ kho',
  'END_USER': 'Người tiêu dùng'
};

import { useAuthStore } from '../store/auth';

import { computed } from 'vue';

const authStore = useAuthStore();
const isSystemAdmin = computed(() => authStore.user?.role === 'ADMIN');

const availableRoles = computed(() => {
    if (isSystemAdmin.value) return roleMap;
    // Tenant Admin cannot create System Admin, Tenant Admins or Regulators
    const restricted = ['ADMIN', 'REGULATOR_OFFICER']; 
    // They can create other operational roles
    return Object.fromEntries(
        Object.entries(roleMap).filter(([code]) => !restricted.includes(code))
    );
});

const getRoleName = (roleCode: string | any) => {
  const code = typeof roleCode === 'object' ? roleCode?.name : roleCode;
  return roleMap[code] || code || 'N/A';
};

// Trạng thái dữ liệu
const users = ref([]);
const tenants = ref<Tenant[]>([]);
const loading = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const isEdit = ref(false);
const currentUser = ref<any>(null);

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

onMounted(() => {
  fetchUsers();
  fetchFilterData();
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
          <el-input v-model="filter.search" placeholder="Tên, Username, Email..." :prefix-icon="Search" @input="fetchUsers" />
        </div>
        <div class="w-48" v-if="isSystemAdmin">
          <label class="text-sm font-medium text-gray-700 block mb-1">Doanh nghiệp</label>
          <el-select v-model="filter.tenantId" clearable placeholder="Tất cả" @change="fetchUsers" class="w-full">
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </div>
        <div class="w-40">
          <label class="text-sm font-medium text-gray-700 block mb-1">Vai trò</label>
          <el-select v-model="filter.roleName" clearable placeholder="Tất cả" @change="fetchUsers" class="w-full">
            <el-option v-for="(label, code) in roleMap" :key="code" :label="label" :value="code" />
          </el-select>
        </div>
        <div>
          <el-button type="primary" :icon="Filter" @click="fetchUsers">Lọc dữ liệu</el-button>
        </div>
        <div class="ml-auto flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700">Hiển thị End User</span>
            <el-switch v-model="filter.showEndUsers" @change="fetchUsers" />
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
            <el-tag v-else type="info" size="small">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="120" align="center">
          <template #default="scope">
            <div class="flex justify-center gap-1">
               <el-tooltip content="Mở khóa tài khoản" v-if="['LOCKED', 'BLOCKED', 'DELETION_REQUESTED'].includes(scope.row.status)">
                  <el-button type="success" link :icon="Unlock" @click="handleUnlockUser(scope.row)"></el-button>
               </el-tooltip>
               <el-button type="primary" link :icon="Edit" @click="handleEditUser(scope.row)"></el-button>
               <el-button type="danger" link :icon="Delete"></el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </LTECard>

    <!-- Modal Tạo/Sửa người dùng -->
    <el-dialog
      v-model="showModal"
      :title="isEdit ? 'Cập nhật người dùng' : 'Tạo người dùng mới'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top">
        <el-form-item label="Họ tên" required>
          <el-input v-model="userForm.full_name" placeholder="Nhập họ tên" />
        </el-form-item>
        <el-form-item label="Email" required>
          <el-input v-model="userForm.email" placeholder="Nhập email" />
        </el-form-item>
        <el-form-item label="Tên đăng nhập" required>
          <el-input v-model="userForm.username" placeholder="Nhập username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="Mật khẩu" :required="!isEdit">
          <el-input v-model="userForm.password" type="password" placeholder="Nhập mật khẩu" show-password />
        </el-form-item>
        <el-form-item label="Vai trò" required>
          <el-select v-model="userForm.role" placeholder="Chọn vai trò" class="w-full">
            <el-option v-for="(label, code) in availableRoles" :key="code" :label="label" :value="code" />
          </el-select>
        </el-form-item>
        <el-form-item label="Doanh nghiệp" v-if="isSystemAdmin">
          <el-select v-model="userForm.tenant_id" placeholder="Chọn doanh nghiệp (Nếu có)" class="w-full" clearable>
             <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showModal = false">Hủy</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? 'Cập nhật' : 'Tạo mới' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>