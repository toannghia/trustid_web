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
      <el-table :data="staffs" v-loading="loading" style="width: 100%">
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">
            {{ (currentPage - 1) * pageSize + $index + 1 }}
          </template>
        </el-table-column>
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

      <!-- Pagination -->
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalStaffs"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
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

const currentPage = ref(1);
const pageSize = ref(10);
const totalStaffs = ref(0);

watch(showModal, (val) => {
  if (val) {
    showModal.value = false;
    modalRef.value?.open();
  }
});

const handleFilterChange = () => {
    currentPage.value = 1;
    loadData();
};

const handleSizeChange = (val: number) => {
    pageSize.value = val;
    currentPage.value = 1;
    loadData();
};

const handleCurrentChange = (val: number) => {
    currentPage.value = val;
    loadData();
};

let searchTimeout: any = null;
watch(() => searchKeyword.value, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    handleFilterChange();
  }, 300);
});

const loadData = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value,
      roleName: 'KCS_STAFF'
    };
    if (searchKeyword.value) {
      params.search = searchKeyword.value;
    }
    const res = await userApi.getList(params);
    const data = res.data;
    staffs.value = data?.data || data?.items || (Array.isArray(data) ? data : []);
    totalStaffs.value = data?.total || staffs.value.length;
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không thể tải dữ liệu');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>
