<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Clock, Search, Refresh } from '@element-plus/icons-vue';
import gatewayApi from '@/api/gatewayApi';

interface RequestItem {
  request_id: string;
  command_type: string;
  ref_id?: string;
  tenant_tax_code?: string;
  status: string;
  error?: string;
  created_at: string;
}

const loading = ref(false);
const items = ref<RequestItem[]>([]);
const pagination = ref({ total: 0, limit: 20, offset: 0, has_more: false });

// Filters
const statusFilter = ref('all');
const commandFilter = ref('');
const taxCodeFilter = ref('');

const statusOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'QUEUED', label: '⏳ Đang chờ' },
  { value: 'PROCESSING', label: '⚙️ Đang xử lý' },
  { value: 'SENT_TO_NDA', label: '📤 Đã gửi NDA' },
  { value: 'WAITING_NDA_CALLBACK', label: '🔄 Chờ NDA callback' },
  { value: 'COMPLETED', label: '✅ Hoàn thành' },
  { value: 'FAILED_VALIDATION', label: '❌ Lỗi validation' },
  { value: 'FAILED_NDA_API', label: '❌ Lỗi NDA API' },
  { value: 'FAILED_UNKNOWN', label: '❌ Lỗi không xác định' }
];

const commandOptions = [
  { value: '', label: 'Tất cả lệnh' },
  { value: 'register-tenant', label: 'Đăng ký DN' },
  { value: 'sync-product', label: 'Sync Sản phẩm' },
  { value: 'sync-batch', label: 'Sync Lô hàng' }
];

const fetchRequests = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.append('limit', String(pagination.value.limit));
    params.append('offset', String(pagination.value.offset));
    if (statusFilter.value !== 'all') params.append('status', statusFilter.value);
    if (commandFilter.value) params.append('command_type', commandFilter.value);
    if (taxCodeFilter.value) params.append('tenant_tax_code', taxCodeFilter.value);

    const res = await gatewayApi.get(`/requests?${params.toString()}`);
    items.value = res.data.items || [];
    pagination.value = res.data.pagination || { total: 0, limit: 20, offset: 0, has_more: false };
  } catch (error) {
    console.error('Failed to fetch requests', error);
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page: number) => {
  pagination.value.offset = (page - 1) * pagination.value.limit;
  fetchRequests();
};

const handleFilter = () => {
  pagination.value.offset = 0;
  fetchRequests();
};

const getStatusType = (status: string) => {
  if (status === 'COMPLETED') return 'success';
  if (status.startsWith('FAILED')) return 'danger';
  if (status === 'PROCESSING' || status === 'SENT_TO_NDA') return 'warning';
  return 'info';
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('vi-VN');
};

onMounted(() => {
  fetchRequests();
});

// Auto refresh when filters change
watch([statusFilter, commandFilter], handleFilter);
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-4 mt-6 mb-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold text-gray-700">
        <el-icon class="mr-2"><Clock /></el-icon>
        Danh sách lệnh (Requests)
      </h3>
      <el-button :icon="Refresh" circle @click="fetchRequests" :loading="loading" />
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-4 bg-gray-50 p-3 rounded-lg">
      <el-select v-model="statusFilter" placeholder="Trạng thái" class="w-48">
        <el-option v-for="opt in statusOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
      </el-select>
      <el-select v-model="commandFilter" placeholder="Loại lệnh" class="w-40" clearable>
        <el-option v-for="opt in commandOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
      </el-select>
      <el-input 
        v-model="taxCodeFilter" 
        placeholder="MST (VD: 0108390965)" 
        class="w-48"
        :prefix-icon="Search"
        @keyup.enter="handleFilter"
        clearable
      />
      <el-button type="primary" @click="handleFilter" :loading="loading">Lọc</el-button>
    </div>

    <!-- Table -->
    <el-table :data="items" v-loading="loading" stripe size="small" max-height="400">
      <el-table-column prop="request_id" label="Request ID" width="200">
        <template #default="{ row }">
          <code class="text-xs bg-gray-100 px-1 rounded">{{ row.request_id }}</code>
        </template>
      </el-table-column>
      <el-table-column prop="command_type" label="Loại lệnh" width="130">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.command_type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="tenant_tax_code" label="MST" width="110" />
      <el-table-column prop="status" label="Trạng thái" width="160">
        <template #default="{ row }">
          <el-tag size="small" :type="getStatusType(row.status)">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="error" label="Lỗi" min-width="200">
        <template #default="{ row }">
          <span v-if="row.error" class="text-red-500 text-xs">{{ row.error }}</span>
          <span v-else class="text-gray-400 text-xs">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="Thời gian" width="150">
        <template #default="{ row }">
          <span class="text-xs text-gray-500">{{ formatDate(row.created_at) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div class="flex justify-between items-center mt-4">
      <span class="text-sm text-gray-500">
        Tổng: <b>{{ pagination.total }}</b> requests
      </span>
      <el-pagination 
        layout="prev, pager, next"
        :total="pagination.total"
        :page-size="pagination.limit"
        :current-page="Math.floor(pagination.offset / pagination.limit) + 1"
        @current-change="handlePageChange"
        small
      />
    </div>
  </div>
</template>
