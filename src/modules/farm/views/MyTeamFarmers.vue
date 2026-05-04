<template>
  <div class="p-6 space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Nông dân (Đội của tôi)</h1>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <el-card shadow="hover" class="bg-green-50 border-green-100">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-100 rounded-lg text-green-600">
            <el-icon :size="24"><User /></el-icon>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Số nông hộ quản lý</p>
            <p class="text-2xl font-bold text-gray-900">{{ farmers.length }}</p>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="bg-blue-50 border-blue-100">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-100 rounded-lg text-blue-600">
            <el-icon :size="24"><Location /></el-icon>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Tổng số thửa canh tác</p>
            <p class="text-2xl font-bold text-gray-900">{{ locations.length }}</p>
          </div>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="eco-card border-none">
      <el-table :data="farmers" v-loading="loading" stripe style="width: 100%">
        <el-table-column label="Họ tên Nông dân" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <el-avatar :size="36" :src="row.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
              <div>
                <div class="font-medium text-gray-900">{{ row.fullName }}</div>
                <div class="text-xs text-gray-500">{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Liên hệ" prop="phone" min-width="150" />
        <el-table-column label="Số lô thửa" align="center" width="120">
          <template #default="{ row }">
            <el-tag type="success" effect="plain">{{ getFarmerLocations(row.id).length }} thửa</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewFarmer(row)">Xem chi tiết</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Modal Xem Lô thửa của Nông dân -->
    <el-dialog v-model="showLocations" :title="`Lô thửa của ${selectedFarmer?.fullName}`" width="800px">
      <el-table :data="farmerLocations" stripe border>
        <el-table-column prop="code" label="Mã lô" width="120" />
        <el-table-column prop="name" label="Tên Lô thửa" />
        <el-table-column label="Diện tích">
          <template #default="{ row }">
            {{ row.areaM2 ? row.areaM2.toLocaleString() + ' m²' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Hành động" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="goToLocation(row.id)">Quản lý</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Location, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { farmApi } from '../api/farmApi';

const router = useRouter();
const locations = ref<any[]>([]);
const loading = ref(false);

const showLocations = ref(false);
const selectedFarmer = ref<any>(null);

const farmers = computed(() => {
  const map = new Map<string, any>();
  locations.value.forEach(loc => {
    if (loc.farmer && !map.has(loc.farmer.id)) {
      map.set(loc.farmer.id, loc.farmer);
    }
  });
  return Array.from(map.values());
});

const getFarmerLocations = (farmerId: string) => {
  return locations.value.filter(l => l.farmer?.id === farmerId);
};

const farmerLocations = computed(() => {
  if (!selectedFarmer.value) return [];
  return getFarmerLocations(selectedFarmer.value.id);
});

const loadData = async () => {
  loading.value = true;
  try {
    const { data } = await farmApi.getLeaderMap();
    locations.value = data || [];
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi tải danh sách nông dân');
  } finally {
    loading.value = false;
  }
};

const viewFarmer = (farmer: any) => {
  selectedFarmer.value = farmer;
  showLocations.value = true;
};

const goToLocation = (locationId: string) => {
  showLocations.value = false;
  router.push(`/farm/locations/${locationId}`);
};

onMounted(() => {
  loadData();
});
</script>
