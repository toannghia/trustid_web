<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Nhân viên KCS</h1>
      <el-button type="primary" @click="showModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Thêm Nhân viên
      </el-button>
    </div>

    <!-- Search Toolbar -->
    <div class="mb-4 flex gap-4">
      <el-input v-model="searchKeyword" placeholder="Tìm theo tên hoặc số điện thoại..." class="w-64" clearable prefix-icon="Search" />
    </div>

    <!-- Table -->
    <el-card shadow="hover">
      <el-table :data="filteredStaffs" v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column label="Họ tên" min-width="200">
          <template #default="{ row }">
            <div class="font-medium text-blue-600">{{ row.fullName || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="SĐT / Username" width="150" />
        <el-table-column label="Trạng thái" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
              {{ row.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="$router.push(`/farm/kcs-staff/${row.username || row.id}`)">
              Chi tiết
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <QuickUserModal ref="modalRef" role-name="KCS_STAFF" @created="loadData" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Plus, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { userApi } from '../../core/api/user';
import QuickUserModal from '../components/QuickUserModal.vue';

const staffs = ref<any[]>([]);
const loading = ref(false);
const searchKeyword = ref('');
const showModal = ref(false);
const modalRef = ref<any>();

watch(showModal, (val) => {
  if (val) {
    showModal.value = false;
    modalRef.value?.open();
  }
});

const loadData = async () => {
  loading.value = true;
  try {
    const res = await userApi.getList({ page: 1, limit: 1000, roleName: 'KCS_STAFF' });
    const data = res.data;
    staffs.value = data?.data || data?.items || (Array.isArray(data) ? data : []);
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không thể tải dữ liệu');
  } finally {
    loading.value = false;
  }
};

const filteredStaffs = computed(() => {
  if (!searchKeyword.value) return staffs.value;
  const kw = searchKeyword.value.toLowerCase();
  return staffs.value.filter(u => 
    (u.fullName && u.fullName.toLowerCase().includes(kw)) ||
    (u.username && u.username.toLowerCase().includes(kw))
  );
});

onMounted(() => {
  loadData();
});
</script>
