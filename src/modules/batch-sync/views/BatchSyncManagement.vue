<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Download, Plus, Refresh, Search, Document, View, List } from '@element-plus/icons-vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import api from '@/common/utils/api';
import CreateBatchSyncDialog from '../components/CreateBatchSyncDialog.vue';

// --- State ---
const loading = ref(false);
const requests = ref<any[]>([]);
const showCreateDialog = ref(false);

// Detail Dialog State
const showDetailDialog = ref(false);
const selectedRequest = ref<any>(null);
const sgtinList = ref<string[]>([]);
const sgtinPagination = reactive({
  page: 1,
  pageSize: 50,
  total: 0
});

const filter = reactive({
  status: '',
  search: ''
});

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
});

// --- Computed ---
const filteredRequests = computed(() => {
  let result = requests.value;
  
  if (filter.status) {
    result = result.filter(r => r.status === filter.status);
  }
  
  if (filter.search) {
    const s = filter.search.toLowerCase();
    result = result.filter(r => 
      r.request_id?.toLowerCase().includes(s) ||
      r.ref_id?.toLowerCase().includes(s) ||
      r.payload?.product_name?.toLowerCase().includes(s) ||
      r.payload?.gtin?.toLowerCase().includes(s)
    );
  }
  
  return result;
});

// Paginated SGTIN list
const paginatedSgtins = computed(() => {
  const start = (sgtinPagination.page - 1) * sgtinPagination.pageSize;
  const end = start + sgtinPagination.pageSize;
  return sgtinList.value.slice(start, end);
});

// --- Methods ---
const fetchRequests = async () => {
  loading.value = true;
  try {
    // Load from Core API instead of Gateway
    const { data } = await api.get('/supply/batch-sync-requests', {
      params: { 
        page: pagination.page,
        limit: pagination.limit,
        status: filter.status || undefined
      }
    });
    requests.value = data.items || [];
    pagination.total = data.pagination?.total || 0;
  } catch (e: any) {
    console.error(e);
    ElMessage.error('Không thể tải danh sách lệnh đồng bộ');
  } finally {
    loading.value = false;
  }
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    'QUEUED': 'info',
    'PROCESSING': 'warning',
    'SENT_TO_NDA': 'warning',
    'WAITING_NDA_CALLBACK': 'warning',
    'COMPLETED': 'success',
    'FAILED_VALIDATION': 'danger',
    'FAILED_NDA_API': 'danger',
    'FAILED_UNKNOWN': 'danger'
  };
  return map[status] || 'info';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'QUEUED': 'Chờ xử lý',
    'PROCESSING': 'Đang xử lý',
    'SENT_TO_NDA': 'Đang gửi NDA',
    'WAITING_NDA_CALLBACK': 'Chờ NDA phản hồi',
    'COMPLETED': 'Hoàn thành',
    'FAILED_VALIDATION': 'Lỗi dữ liệu',
    'FAILED_NDA_API': 'Lỗi API NDA',
    'FAILED_UNKNOWN': 'Lỗi không xác định'
  };
  return map[status] || status;
};

const handleViewDetail = (row: any) => {
  selectedRequest.value = row;
  showDetailDialog.value = true;
  
  // Parse SGTIN list from result if available
  if (row.result && row.result.sgtins) {
    sgtinList.value = row.result.sgtins;
  } else if (row.result && Array.isArray(row.result)) {
    sgtinList.value = row.result;
  } else {
    sgtinList.value = [];
  }
  sgtinPagination.total = sgtinList.value.length;
  sgtinPagination.page = 1;
};

const handleDownloadSgtins = async (row: any) => {
  try {
    // Fetch detail from Core API to get SGTIN list
    const { data } = await api.get(`/supply/batch-sync-requests/${row.request_id}`);
    
    if (!data.sgtins || data.sgtins.length === 0) {
      ElMessage.warning('Chưa có dữ liệu SGTIN để tải');
      return;
    }
    
    const sgtins = data.sgtins;
    const csvContent = 'STT,SGTIN\n' + sgtins.map((s: string, i: number) => `${i + 1},${s}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sgtins_${row.ref_id || row.request_id}.csv`;
    link.click();
    
    ElMessage.success(`Đã tải ${sgtins.length} SGTIN`);
  } catch (e) {
    ElMessage.error('Không thể tải danh sách SGTIN');
  }
};

const handleCreate = () => {
  showCreateDialog.value = true;
};

const handleDialogSaved = () => {
  showCreateDialog.value = false;
  fetchRequests();
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('vi-VN');
};

const getSgtinIndex = (index: number) => {
  return (sgtinPagination.page - 1) * sgtinPagination.pageSize + index + 1;
};

// --- Lifecycle ---
onMounted(() => {
  fetchRequests();
});
</script>

<template>
  <div>
    <LTEContentHeader 
      title="Đồng bộ Lô hàng (NDA)" 
      :breadcrumbs="[{ title: 'Quản lý Lô' }, { title: 'Đồng bộ NDA' }]" 
    />

    <LTECard variant="primary" outline>
      <div class="mb-4 flex flex-wrap gap-2 items-center justify-between">
        <div class="flex gap-2">
          <el-input 
            v-model="filter.search" 
            placeholder="Tìm theo Sản phẩm, GTIN, Mã lô..." 
            :prefix-icon="Search" 
            class="w-72" 
            clearable 
          />
          <el-select v-model="filter.status" placeholder="Trạng thái" clearable class="w-40">
            <el-option label="Tất cả" value="" />
            <el-option label="Chờ xử lý" value="QUEUED" />
            <el-option label="Đang xử lý" value="PROCESSING" />
            <el-option label="Hoàn thành" value="COMPLETED" />
            <el-option label="Lỗi API NDA" value="FAILED_NDA_API" />
          </el-select>
          <el-button :icon="Refresh" @click="fetchRequests" :loading="loading">Làm mới</el-button>
        </div>
        
        <el-button type="primary" :icon="Plus" @click="handleCreate">
          Tạo đồng bộ mới
        </el-button>
      </div>

      <el-table 
        :data="filteredRequests" 
        v-loading="loading" 
        stripe 
        border
        @row-click="handleViewDetail"
        class="cursor-pointer batch-sync-table"
      >
        <el-table-column type="index" label="STT" width="60" align="center" />

        <el-table-column label="Mã lô" width="180">
          <template #default="{ row }">
            <span class="font-medium text-blue-600">{{ row.ref_id || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Sản phẩm" min-width="180">
          <template #default="{ row }">
            <div class="font-medium">{{ row.product_name || '-' }}</div>
            <div class="text-xs text-gray-500">{{ row.gtin || '-' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Doanh nghiệp/HTX" width="160">
          <template #default="{ row }">
            {{ row.tenant_name || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="Số lượng" width="100" align="right">
          <template #default="{ row }">
            <span class="font-bold">{{ row.quantity?.toLocaleString() || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="Trạng thái" width="120" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="row.error" :content="row.error" placement="top">
              <el-tag :type="getStatusType(row.status)" size="small" class="cursor-help">
                {{ getStatusText(row.status) }}
              </el-tag>
            </el-tooltip>
            <el-tag v-else :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Ngày tạo" width="150">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button-group>
              <el-button 
                type="info" 
                :icon="View" 
                size="small"
                title="Xem chi tiết"
                @click.stop="handleViewDetail(row)"
              />
              <el-button 
                v-if="row.sgtins_count > 0" 
                type="success" 
                :icon="Download" 
                size="small"
                title="Tải danh sách SGTIN"
                @click.stop="handleDownloadSgtins(row)"
              />
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-4 flex justify-between items-center">
        <span class="text-gray-500 text-sm">Tổng: {{ pagination.total }} lệnh</span>
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="prev, pager, next"
          @current-change="fetchRequests"
        />
      </div>
    </LTECard>

    <CreateBatchSyncDialog 
      v-model="showCreateDialog"
      @saved="handleDialogSaved"
    />

    <el-dialog 
      v-model="showDetailDialog" 
      title="Chi tiết lệnh đồng bộ" 
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedRequest" class="space-y-4">
        <div class="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <div class="text-xs text-gray-500">Mã lô SX</div>
            <span class="font-bold text-blue-600">{{ selectedRequest.ref_id }}</span>
          </div>
          <div>
            <div class="text-xs text-gray-500">Request ID</div>
            <code class="text-xs">{{ selectedRequest.request_id }}</code>
          </div>
          <div>
            <div class="text-xs text-gray-500">Sản phẩm</div>
            <span class="font-medium">{{ selectedRequest.product?.name || selectedRequest.product_name || '-' }}</span>
          </div>
          <div>
            <div class="text-xs text-gray-500">GTIN</div>
            <code>{{ selectedRequest.product?.gtin || selectedRequest.gtin || '-' }}</code>
          </div>
          <div>
            <div class="text-xs text-gray-500">Doanh nghiệp/HTX</div>
            <span>{{ selectedRequest.tenant?.name || selectedRequest.tenant_name || '-' }}</span>
          </div>
          <div>
            <div class="text-xs text-gray-500">Số lượng</div>
            <span class="font-bold">{{ selectedRequest.quantity?.toLocaleString() || '-' }}</span>
          </div>
          <div>
            <div class="text-xs text-gray-500">Trạng thái</div>
            <el-tag :type="getStatusType(selectedRequest.gateway_status || selectedRequest.status)" size="small">
              {{ getStatusText(selectedRequest.gateway_status || selectedRequest.status) }}
            </el-tag>
          </div>
          <div>
            <div class="text-xs text-gray-500">Ngày tạo</div>
            <span>{{ formatDate(selectedRequest.created_at) }}</span>
          </div>
        </div>

        <div v-if="selectedRequest.error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div class="text-xs text-red-500 font-bold mb-1">Chi tiết lỗi:</div>
          <div class="text-red-700 text-sm">{{ selectedRequest.error }}</div>
        </div>

        <div v-if="sgtinList.length > 0">
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-bold text-gray-700">
              <el-icon class="mr-1"><List /></el-icon>
              Danh sách SGTIN ({{ sgtinPagination.total.toLocaleString() }})
            </h3>
            <el-button 
              type="success" 
              size="small" 
              :icon="Download"
              @click="handleDownloadSgtins(selectedRequest)"
            >
              Tải CSV
            </el-button>
          </div>
          
          <el-table :data="paginatedSgtins" border stripe max-height="300">
            <el-table-column type="index" label="STT" width="70" :index="getSgtinIndex" />
            <el-table-column label="SGTIN">
              <template #default="{ row }">
                <code class="text-xs">{{ row }}</code>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-if="sgtinPagination.total > sgtinPagination.pageSize"
            class="mt-3 justify-center"
            v-model:current-page="sgtinPagination.page"
            :page-size="sgtinPagination.pageSize"
            :total="sgtinPagination.total"
            layout="prev, pager, next"
          />
        </div>
        <div v-else class="text-center py-8 text-gray-400">
          <el-icon class="text-4xl mb-2"><Document /></el-icon>
          <p>Chưa có dữ liệu SGTIN</p>
          <p class="text-xs">SGTIN sẽ được trả về sau khi NDA xử lý xong</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="showDetailDialog = false">Đóng</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.batch-sync-table :deep(.el-table__row--striped) {
  background-color: #f0f7ff !important;
}

.batch-sync-table :deep(.el-table__row:hover > td) {
  background-color: #e6f0fa !important;
}
</style>
