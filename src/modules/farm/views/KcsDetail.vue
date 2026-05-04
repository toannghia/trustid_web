<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Chi tiết Nhân viên KCS</h1>
      <el-button @click="$router.back()">
        Quay lại
      </el-button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <el-spinner size="large" />
    </div>

    <div v-else-if="profile" class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- Left Column: Profile Card -->
      <div class="col-span-1">
        <el-card shadow="hover" class="sticky top-6">
          <div class="flex flex-col items-center text-center">
            <el-avatar :size="100" :src="profile.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" class="mb-4" />
            <h2 class="text-lg font-bold">{{ profile.fullName || 'Chưa cập nhật tên' }}</h2>
            <p class="text-gray-500 mb-2">{{ profile.username }}</p>
            <el-tag :type="profile.status === 'ACTIVE' ? 'success' : 'danger'" size="small" class="mb-4">
              {{ profile.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa' }}
            </el-tag>
          </div>

          <el-divider />

          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-gray-500">Vùng trồng giao:</span>
              <span class="font-bold">{{ stats.totalAssignedAreas }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-500">Nhiệm vụ chờ:</span>
              <span class="font-bold text-orange-500">{{ stats.pendingInspections }}</span>
            </div>
          </div>
        </el-card>
      </div>

      <!-- Right Column: Tabs -->
      <div class="col-span-3">
        <el-card shadow="hover" class="min-h-[500px]">
          <el-tabs v-model="activeTab" @tab-change="handleTabChange">
            
            <!-- Tab 1: Upcoming/Pending Tasks -->
            <el-tab-pane label="Nhiệm vụ kiểm định (Đến hạn)" name="upcoming">
              <div class="flex justify-between mb-4">
                <el-input v-model="searchUpcoming" placeholder="Tìm kiếm theo mã vùng..." class="w-64" clearable>
                  <template #prefix><el-icon><Search /></el-icon></template>
                </el-input>
              </div>
              
              <el-table :data="filteredUpcomingInspections" v-loading="loadingInspections" style="width: 100%">
                <el-table-column label="Ngày tạo" width="120">
                  <template #default="{ row }">
                    {{ formatDate(row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="Vùng/Thửa" min-width="150">
                  <template #default="{ row }">
                    <span class="font-medium">{{ row.location?.name || '—' }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="Trạng thái" width="120">
                  <template #default>
                    <el-tag type="warning">Đang chờ</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="Thao tác" width="100" align="center">
                  <template #default="{ row }">
                    <el-button type="primary" link @click="openActionModal(row)">Xử lý</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <!-- Tab 2: Assigned Areas -->
            <el-tab-pane label="Vùng trồng phân công" name="areas">
              <el-table :data="assignedAreas" v-loading="loadingAreas" style="width: 100%">
                <el-table-column prop="code" label="Mã vùng" width="120" />
                <el-table-column prop="name" label="Tên vùng trồng" min-width="180">
                  <template #default="{ row }">
                    <span class="font-medium text-blue-600">{{ row.name }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="Diện tích" width="120">
                  <template #default="{ row }">
                    {{ (row.maxAreaM2 / 10000).toFixed(2) }} ha
                  </template>
                </el-table-column>
                <el-table-column prop="province" label="Tỉnh/Thành" width="150" />
              </el-table>
            </el-tab-pane>

            <!-- Tab 3: Inspection History -->
            <el-tab-pane label="Lịch sử kiểm định" name="history">
              <div class="flex gap-4 mb-4">
                <el-select v-model="filterStatus" placeholder="Trạng thái" clearable style="width: 150px">
                  <el-option label="Đạt (PASSED)" value="PASSED" />
                  <el-option label="Không đạt (FAILED)" value="FAILED" />
                </el-select>
              </div>

              <el-table :data="filteredHistoryInspections" v-loading="loadingInspections" style="width: 100%">
                <el-table-column label="Ngày kiểm định" width="150">
                  <template #default="{ row }">
                    {{ formatDate(row.inspectionDate || row.updatedAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="Vùng/Thửa" min-width="150">
                  <template #default="{ row }">
                    <span class="font-medium">{{ row.location?.name || '—' }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="Kết quả" width="120">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'PASSED' ? 'success' : 'danger'">
                      {{ row.status === 'PASSED' ? 'ĐẠT' : 'KHÔNG ĐẠT' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="notes" label="Ghi chú" min-width="200" show-overflow-tooltip />
              </el-table>
            </el-tab-pane>

          </el-tabs>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import api from '@/common/utils/api';

const route = useRoute();
const identifier = route.params.id; // username or id

const loading = ref(true);
const loadingAreas = ref(false);
const loadingInspections = ref(false);

const profile = ref<any>(null);
const stats = ref<any>({ totalAssignedAreas: 0, pendingInspections: 0 });

const activeTab = ref('upcoming');

// Data
const assignedAreas = ref<any[]>([]);
const inspections = ref<any[]>([]);

// Filters
const searchUpcoming = ref('');
const filterStatus = ref('');

const filteredUpcomingInspections = computed(() => {
  let list = inspections.value.filter(i => i.status === 'PENDING');
  if (searchUpcoming.value) {
    const q = searchUpcoming.value.toLowerCase();
    list = list.filter(i => i.location?.name?.toLowerCase().includes(q) || i.location?.code?.toLowerCase().includes(q));
  }
  return list;
});

const filteredHistoryInspections = computed(() => {
  let list = inspections.value.filter(i => i.status !== 'PENDING');
  if (filterStatus.value) {
    list = list.filter(i => i.status === filterStatus.value);
  }
  return list;
});

const formatDate = (date: string) => {
  if (!date) return '—';
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

const loadProfile = async () => {
  try {
    const { data } = await api.get(`/farm/kcs/${identifier}/profile`);
    profile.value = data.profile;
    stats.value = data.stats;
  } catch (error: any) {
    ElMessage.error('Lỗi khi tải thông tin KCS');
  }
};

const loadAssignedAreas = async () => {
  loadingAreas.value = true;
  try {
    const { data } = await api.get(`/farm/kcs/${identifier}/assigned-areas`);
    assignedAreas.value = data;
  } catch (error) {
    ElMessage.error('Lỗi khi tải danh sách vùng trồng');
  } finally {
    loadingAreas.value = false;
  }
};

const loadInspections = async () => {
  loadingInspections.value = true;
  try {
    const { data } = await api.get(`/farm/kcs/${identifier}/inspections`);
    inspections.value = data;
  } catch (error) {
    ElMessage.error('Lỗi khi tải danh sách kiểm định');
  } finally {
    loadingInspections.value = false;
  }
};

const handleTabChange = (tabName: string) => {
  if (tabName === 'areas' && assignedAreas.value.length === 0) {
    loadAssignedAreas();
  } else if (tabName === 'upcoming' || tabName === 'history') {
    if (inspections.value.length === 0) {
      loadInspections();
    }
  }
};

const openActionModal = (row: any) => {
  ElMessage.info(`Mở popup xử lý cho thửa: ${row.location?.name}`);
  // Implement action modal logic here
};

onMounted(async () => {
  loading.value = true;
  await loadProfile();
  await loadInspections(); // Load by default for upcoming tab
  loading.value = false;
});
</script>
