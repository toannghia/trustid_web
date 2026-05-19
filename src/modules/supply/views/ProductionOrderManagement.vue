<template>
  <div class="p-6 bg-white min-h-screen">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
      <div>
        <h2 class="text-xl font-bold uppercase text-gray-800">Quản Lý Lệnh Sản Xuất</h2>
        <p class="text-sm text-gray-500 mt-1">Lập kế hoạch, theo dõi và phê duyệt tiến trình đóng gói & đóng kiện</p>
      </div>
      <el-button type="primary" size="large" @click="openCreateDialog">
        + Tạo Lệnh Sản Xuất
      </el-button>
    </div>

    <!-- Filters Bar -->
    <div class="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-center">
      <div class="flex flex-col gap-1 w-48">
        <label class="text-xs text-gray-500 font-semibold uppercase">Trạng thái</label>
        <el-select v-model="filters.status" placeholder="Tất cả trạng thái" clearable @change="fetchOrders">
          <el-option label="Nháp (DRAFT)" value="DRAFT" />
          <el-option label="Đã duyệt (APPROVED)" value="APPROVED" />
          <el-option label="Đang đóng gói (IN_PROGRESS)" value="IN_PROGRESS" />
          <el-option label="Hoàn thành (COMPLETED)" value="COMPLETED" />
          <el-option label="Đã Hủy (CANCELLED)" value="CANCELLED" />
        </el-select>
      </div>

      <div class="flex flex-col gap-1 w-64">
        <label class="text-xs text-gray-500 font-semibold uppercase">Tìm kiếm</label>
        <el-input
          v-model="filters.search"
          placeholder="Nhập mã lệnh, tên sản phẩm..."
          clearable
          @input="debouncedSearch"
        />
      </div>

      <el-button class="mt-4" icon="Refresh" @click="fetchOrders">Làm mới</el-button>
    </div>

    <!-- Stats summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <el-card shadow="never" class="border-l-4 border-l-gray-400">
        <div class="text-xs font-semibold text-gray-500 uppercase">Lệnh Nháp</div>
        <div class="text-2xl font-bold text-gray-800 mt-1">{{ stats.draft }}</div>
      </el-card>
      <el-card shadow="never" class="border-l-4 border-l-blue-500">
        <div class="text-xs font-semibold text-gray-500 uppercase">Đã Duyệt</div>
        <div class="text-2xl font-bold text-blue-600 mt-1">{{ stats.approved }}</div>
      </el-card>
      <el-card shadow="never" class="border-l-4 border-l-amber-500">
        <div class="text-xs font-semibold text-gray-500 uppercase">Đang Sản Xuất</div>
        <div class="text-2xl font-bold text-amber-600 mt-1">{{ stats.in_progress }}</div>
      </el-card>
      <el-card shadow="never" class="border-l-4 border-l-emerald-500">
        <div class="text-xs font-semibold text-gray-500 uppercase">Hoàn Thành</div>
        <div class="text-2xl font-bold text-emerald-600 mt-1">{{ stats.completed }}</div>
      </el-card>
    </div>

    <!-- Data Table -->
    <el-table
      v-loading="loading"
      :data="tableData"
      border
      stripe
      style="width: 100%"
      @row-click="goToDetail"
      class="cursor-pointer"
    >
      <el-table-column prop="orderCode" label="Mã Lệnh" width="160" sortable>
        <template #default="{ row }">
          <span class="font-mono font-bold text-blue-600">{{ row.orderCode }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="product.name" label="Sản phẩm thành phẩm" min-width="200">
        <template #default="{ row }">
          <div>
            <div class="font-semibold text-gray-800">{{ row.product?.name }}</div>
            <div class="text-2xs text-gray-400 font-mono">{{ row.product?.sku || row.product?.gtin }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="sourceType" label="Nguồn gốc" width="140">
        <template #default="{ row }">
          <el-tag :type="getSourceTagType(row.sourceType)" size="small">
            {{ getSourceLabel(row.sourceType) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Quy cách đóng gói" width="150" align="right">
        <template #default="{ row }">
          <span class="font-semibold text-gray-700">{{ (row.unitWeightKg || 0).toFixed(1) }} kg/gói</span>
        </template>
      </el-table-column>

      <el-table-column label="Khối lượng Kế hoạch" width="160" align="right">
        <template #default="{ row }">
          <span class="font-bold text-gray-800">{{ row.plannedWeightKg.toFixed(1) }} kg</span>
        </template>
      </el-table-column>

      <el-table-column label="Tiến độ thực tế" width="200">
        <template #default="{ row }">
          <div class="w-full">
            <el-progress
              :percentage="getProgressPercentage(row)"
              :status="getProgressStatus(row)"
            />
            <div class="text-2xs text-gray-500 mt-1 text-right">
              {{ (row.actualWeightKg || 0).toFixed(1) }} / {{ row.plannedWeightKg.toFixed(1) }} kg
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="status" label="Trạng thái" width="140" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="plannedDate" label="Ngày Thực Hiện" width="130">
        <template #default="{ row }">
          {{ formatDate(row.plannedDate) }}
        </template>
      </el-table-column>

      <el-table-column prop="createdAt" label="Ngày Tạo" width="130">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column prop="creator" label="Người tạo" min-width="140">
        <template #default="{ row }">
          <span>{{ row.creator?.fullName || row.creator?.full_name || row.creator?.username || 'N/A' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="Hành động" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" link @click.stop="goToDetail(row)">
            Chi tiết
          </el-button>
          <el-button
            v-if="row.status === 'IN_PROGRESS'"
            type="success"
            size="small"
            link
            @click.stop="handleDirectPack(row)"
          >
            Đóng gói
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div class="flex justify-end mt-4">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pagination.total"
        @size-change="fetchOrders"
        @current-change="fetchOrders"
      />
    </div>

    <!-- Create Form Dialog -->
    <ProductionOrderFormDialog ref="createDialogRef" @success="handleCreateSuccess" />

    <!-- Ticket Execution Dialog -->
    <ProductionTicketExecutionDialog ref="executionDialogRef" @success="fetchOrders" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { productionOrderApi } from '../api/productionOrderApi';
import ProductionOrderFormDialog from '../components/ProductionOrderFormDialog.vue';
import ProductionTicketExecutionDialog from '../components/ProductionTicketExecutionDialog.vue';
import dayjs from 'dayjs';

const router = useRouter();

const loading = ref(false);
const tableData = ref<any[]>([]);
const createDialogRef = ref<any>(null);
const executionDialogRef = ref<any>(null);

const filters = reactive({
  status: '',
  search: ''
});

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
});

const stats = reactive({
  draft: 0,
  approved: 0,
  in_progress: 0,
  completed: 0
});

const fetchOrders = async () => {
  loading.value = true;
  try {
    const params = {
      status: filters.status || undefined,
      search: filters.search || undefined,
      page: pagination.page,
      limit: pagination.limit
    };
    const { data } = await productionOrderApi.getOrders(params);
    tableData.value = data.items || [];
    pagination.total = data.pagination?.total || 0;

    // Load simple stats counters locally (or mock based on list data)
    updateStatsSummary();
  } catch (e) {
    console.error('Lỗi khi tải danh sách lệnh', e);
  } finally {
    loading.value = false;
  }
};

const updateStatsSummary = () => {
  stats.draft = tableData.value.filter(o => o.status === 'DRAFT').length;
  stats.approved = tableData.value.filter(o => o.status === 'APPROVED').length;
  stats.in_progress = tableData.value.filter(o => o.status === 'IN_PROGRESS').length;
  stats.completed = tableData.value.filter(o => o.status === 'COMPLETED').length;
};

let searchTimeout: any = null;
const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.page = 1;
    fetchOrders();
  }, 300);
};

const getSourceLabel = (src: string) => {
  switch (src) {
    case 'FARM': return 'Từ Farm';
    case 'EXTERNAL': return 'Nhập ngoài';
    case 'CROSS_TENANT': return 'B2B Cross-Tenant';
    default: return src;
  }
};

const getSourceTagType = (src: string) => {
  switch (src) {
    case 'FARM': return 'primary';
    case 'EXTERNAL': return 'success';
    case 'CROSS_TENANT': return 'warning';
    default: return 'info';
  }
};

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'info';
    case 'APPROVED': return 'primary';
    case 'IN_PROGRESS': return 'warning';
    case 'COMPLETED': return 'success';
    case 'CANCELLED': return 'danger';
    default: return 'info';
  }
};

const getProgressPercentage = (row: any) => {
  if (!row.plannedWeightKg) return 0;
  const pct = Math.floor(((row.actualWeightKg || 0) / row.plannedWeightKg) * 100);
  return Math.min(100, Math.max(0, pct));
};

const getProgressStatus = (row: any) => {
  const pct = getProgressPercentage(row);
  if (pct >= 100) return 'success';
  if (row.status === 'CANCELLED') return 'exception';
  if (row.status === 'IN_PROGRESS') return 'warning';
  return '';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).format('DD/MM/YYYY');
};

const handleCreateSuccess = () => {
  filters.status = '';
  filters.search = '';
  pagination.page = 1;
  fetchOrders();
};

const goToDetail = (row: any) => {
  router.push(`/supply/production-orders/${row.id}`);
};

const handleDirectPack = async (row: any) => {
  loading.value = true;
  try {
    const { data: order } = await productionOrderApi.getOrderDetail(row.id);
    const packagingTicket = order.tickets?.find((t: any) => t.ticketType === 'PACKAGING');
    if (!packagingTicket) {
      ElMessage.warning('Không tìm thấy phiếu đóng gói tương ứng cho lệnh này.');
      return;
    }
    
    // Auto-start the ticket if it is currently OPEN
    if (packagingTicket.status === 'OPEN') {
      await productionOrderApi.startTicket(packagingTicket.id);
    }
    
    executionDialogRef.value?.open(packagingTicket.id);
  } catch (err: any) {
    console.error(err);
    ElMessage.error(err?.response?.data?.message || 'Không thể khởi động đóng gói');
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  createDialogRef.value?.open();
};

onMounted(() => {
  fetchOrders();
});
</script>
