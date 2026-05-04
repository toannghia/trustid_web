<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Đội trưởng</h1>
      <el-button type="primary" @click="showModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Thêm Đội trưởng
      </el-button>
    </div>

    <!-- Search Toolbar -->
    <div class="mb-4 flex gap-4">
      <el-input v-model="searchKeyword" placeholder="Tìm theo tên hoặc số điện thoại..." class="w-64" clearable prefix-icon="Search" />
    </div>

    <!-- Table -->
    <el-card shadow="hover">
      <el-table :data="filteredLeaders" v-loading="loading" style="width: 100%">
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
        
        <!-- Cột thống kê -->
        <el-table-column label="Thống kê" min-width="250">
          <template #default="{ row }">
            <div class="text-sm">
              <div>📍 <strong>Số thửa phụ trách:</strong> <span class="text-gray-600">{{ getStats(row.id).locationCount }}</span></div>
              <div>👤 <strong>Số nông hộ trực thuộc:</strong> <span class="text-gray-600">{{ getStats(row.id).farmerCount }}</span></div>
              <div>🌿 <strong>Tổng diện tích:</strong> <span class="text-green-600 font-medium">{{ getStats(row.id).totalAreaHa.toFixed(2) }} ha</span></div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="$router.push(`/farm/team-leaders/${row.username}`)">
              Chi tiết
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <QuickUserModal ref="modalRef" role-name="TEAM_LEADER" @created="loadData" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Plus, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { userApi } from '../../core/api/user';
import { farmApi } from '../api/farmApi';
import QuickUserModal from '../components/QuickUserModal.vue';

const leaders = ref<any[]>([]);
const locations = ref<any[]>([]);
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
    const [resLeaders, resLocations] = await Promise.all([
      userApi.getList({ page: 1, limit: 1000, roleName: 'TEAM_LEADER' }),
      farmApi.getLocations()
    ]);
    const data = resLeaders.data;
    leaders.value = data?.data || data?.items || (Array.isArray(data) ? data : []);
    locations.value = resLocations.data || [];
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không thể tải dữ liệu');
  } finally {
    loading.value = false;
  }
};

const getStats = (leaderId: string) => {
  const leaderLocations = locations.value.filter(l => l.leaderId === leaderId);
  const uniqueFarmers = new Set(leaderLocations.filter(l => l.farmerId).map(l => l.farmerId));
  const totalAreaM2 = leaderLocations.reduce((sum, l) => sum + (l.areaM2 || 0), 0);
  
  return {
    locationCount: leaderLocations.length,
    farmerCount: uniqueFarmers.size,
    totalAreaHa: totalAreaM2 / 10000
  };
};

const filteredLeaders = computed(() => {
  if (!searchKeyword.value) return leaders.value;
  const kw = searchKeyword.value.toLowerCase();
  return leaders.value.filter(u => 
    (u.fullName && u.fullName.toLowerCase().includes(kw)) ||
    (u.username && u.username.toLowerCase().includes(kw))
  );
});

onMounted(() => {
  loadData();
});
</script>
