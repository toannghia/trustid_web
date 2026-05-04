<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Mã Vùng Trồng Lớn</h1>
      <el-button type="primary" @click="showModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Thêm mã vùng
      </el-button>
    </div>

    <el-card shadow="hover">
      <el-table :data="areas" v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column prop="code" label="Mã vùng" width="150" font-weight="bold" />
        <el-table-column prop="name" label="Tên Vùng trồng" min-width="250">
          <template #default="{ row }">
            <router-link :to="`/farm/master-areas/${row.id}`" class="text-blue-600 font-medium hover:underline">
              {{ row.name }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column label="Thông tin chung" min-width="250">
          <template #default="{ row }">
            <div class="text-sm">
              <div v-if="row.ownerName">🏢 {{ row.ownerName }}</div>
              <div v-if="row.managerName">👤 {{ row.managerName }}</div>
              <div v-if="row.plantType">🌱 {{ row.plantType }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ [row.address, row.ward, row.province].filter(Boolean).join(', ') || '—' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Đội trưởng phụ trách" min-width="200">
          <template #default="{ row }">
            <div v-if="row.leaders && row.leaders.length > 0" class="flex flex-wrap gap-1">
              <el-tag v-for="l in row.leaders" :key="l.id" size="small" type="info">{{ l.fullName || l.username }}</el-tag>
            </div>
            <span v-else class="text-gray-400 text-xs">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="maxAreaM2" label="Giới hạn diện tích" width="180" align="right">
          <template #default="{ row }">
            {{ (row.maxAreaM2 / 10000).toFixed(2) }} ha
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditModal(row)">
              Sửa
            </el-button>
            <el-button type="info" link size="small" @click="$router.push(`/farm/master-areas/${row.id}`)">
              Chi tiết
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <MasterGrowingAreaModal ref="modalRef" @created="loadData" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { farmApi, type MasterGrowingArea } from '../api/farmApi';
import MasterGrowingAreaModal from '../components/MasterGrowingAreaModal.vue';

const areas = ref<MasterGrowingArea[]>([]);
const loading = ref(false);
const showModal = ref(false);
const modalRef = ref<any>();

watch(showModal, (val) => {
  if (val) {
    showModal.value = false;
    modalRef.value?.open();
  }
});

const openEditModal = (row: MasterGrowingArea) => {
  modalRef.value?.open(row);
};

const loadData = async () => {
  loading.value = true;
  try {
    const { data } = await farmApi.getMasterGrowingAreas();
    areas.value = data || [];
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không thể tải danh sách');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>
