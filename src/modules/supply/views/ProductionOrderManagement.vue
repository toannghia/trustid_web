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
          <el-option label="Lỗi sinh mã" value="GENERATION_FAILED" />
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
      size="small"
      style="width: 100%"
      @row-click="goToDetail"
      class="cursor-pointer"
    >
      <el-table-column prop="createdAt" label="Ngày Tạo" width="120" sortable>
        <template #default="{ row }">
          <span class="text-gray-600 font-semibold">{{ formatDate(row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="orderCode" label="Mã Lệnh" width="160" sortable>
        <template #default="{ row }">
          <span class="font-mono font-bold text-blue-600 hover:underline">{{ row.orderCode }}</span>
        </template>
      </el-table-column>
      
      <el-table-column prop="product.name" label="Tên sản phẩm" min-width="220">
        <template #default="{ row }">
          <div>
            <div class="font-semibold text-gray-800">{{ row.product?.name }}</div>
            <div class="text-2xs text-gray-400 font-mono" v-if="row.product?.sku || row.product?.gtin">
              {{ row.product?.sku || row.product?.gtin }}
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="Số gói / Số bao" width="140" align="center">
        <template #default="{ row }">
          <div class="text-xs">
            <div>
              <strong class="text-gray-800">{{ row.plannedUnits }}</strong> <span class="text-gray-500 text-3xs">gói</span>
            </div>
            <div class="text-2xs text-gray-500 mt-0.5" v-if="row.orderType === 'BAG_PACKAGING' && row.packagingSpec">
              <strong class="text-orange-600">{{ Math.ceil(row.plannedUnits / row.packagingSpec) }}</strong> <span class="text-gray-400 text-3xs">bao</span>
            </div>
            <div class="text-3xs text-gray-400 mt-0.5" v-else>
              -
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="notes" label="Ghi chú" min-width="180" :show-overflow-tooltip="true">
        <template #default="{ row }">
          <span class="text-gray-500 italic text-2xs">{{ row.notes || '-' }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="status" label="Trạng thái" width="160" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)" size="small" effect="plain" class="font-semibold rounded-md">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Thao tác" width="220" align="center" fixed="right">
        <template #default="{ row }">
          <div class="flex items-center justify-center gap-1.5" @click.stop>
            <!-- Chi tiết -->
            <el-tooltip content="Chi tiết lệnh" placement="top" :enterable="false">
              <el-button
                type="primary"
                icon="View"
                circle
                size="small"
                @click="goToDetail(row)"
              />
            </el-tooltip>

            <!-- Sửa (Nếu là nháp/đã duyệt) -->
            <el-tooltip v-if="['DRAFT', 'APPROVED'].includes(row.status)" content="Chỉnh sửa" placement="top" :enterable="false">
              <el-button
                type="warning"
                icon="Edit"
                circle
                size="small"
                @click="openEditDialog(row)"
              />
            </el-tooltip>

            <!-- Tải mã gói (Không phải nháp) -->
            <el-tooltip v-if="row.status !== 'DRAFT'" content="Tải mã gói (Excel)" placement="top" :enterable="false">
              <el-button
                type="success"
                icon="Download"
                circle
                size="small"
                @click="handleExportPacketCodes(row)"
              />
            </el-tooltip>

            <!-- Tải mã bao (Chỉ lệnh đóng bao & không phải nháp) -->
            <el-tooltip v-if="row.status !== 'DRAFT' && row.orderType === 'BAG_PACKAGING'" content="Tải mã bao (Excel)" placement="top" :enterable="false">
              <el-button
                type="info"
                icon="Document"
                circle
                size="small"
                @click="handleExportBagCodes(row)"
              />
            </el-tooltip>

            <!-- Đóng bao (Lệnh đóng bao) -->
            <el-tooltip v-if="['APPROVED', 'CODES_READY', 'IN_PROGRESS'].includes(row.status) && row.orderType === 'BAG_PACKAGING'" content="Liên kết đóng bao" placement="top" :enterable="false">
              <el-button
                type="warning"
                icon="Connection"
                circle
                size="small"
                @click="router.push(`/supply/production-orders/${row.id}/bag-packaging`)"
              />
            </el-tooltip>

            <!-- Đóng pallet (Lệnh đóng bao) -->
            <el-tooltip v-if="['APPROVED', 'CODES_READY', 'IN_PROGRESS', 'COMPLETED'].includes(row.status) && row.orderType === 'BAG_PACKAGING'" content="Liên kết pallet" placement="top" :enterable="false">
              <el-button
                color="#e67e22"
                icon="Box"
                circle
                size="small"
                @click="router.push(`/supply/production-orders/${row.id}/pallet-linking`)"
              />
            </el-tooltip>

            <!-- Đóng gói (Lệnh tiêu chuẩn) -->
            <el-tooltip v-if="['APPROVED', 'CODES_READY', 'IN_PROGRESS'].includes(row.status) && row.orderType !== 'BAG_PACKAGING'" content="Thực hiện đóng gói" placement="top" :enterable="false">
              <el-button
                type="success"
                icon="Checked"
                circle
                size="small"
                @click="handleDirectPack(row)"
              />
            </el-tooltip>

            <!-- Retry sinh mã (GENERATION_FAILED) -->
            <el-tooltip v-if="row.status === 'GENERATION_FAILED'" content="Thử lại sinh mã" placement="top" :enterable="false">
              <el-button
                type="warning"
                icon="RefreshRight"
                circle
                size="small"
                @click="handleRetryGenerate(row)"
              />
            </el-tooltip>

            <!-- Xóa lệnh (GENERATION_FAILED / CANCELLED) -->
            <el-tooltip v-if="['GENERATION_FAILED', 'CANCELLED'].includes(row.status)" content="Xóa lệnh" placement="top" :enterable="false">
              <el-button
                type="danger"
                icon="Delete"
                circle
                size="small"
                @click="handleDeleteOrder(row)"
              />
            </el-tooltip>
          </div>
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
import { ElMessage, ElMessageBox } from 'element-plus';
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
  stats.approved = tableData.value.filter(o => ['APPROVED', 'CODES_READY'].includes(o.status)).length;
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
    case 'CODES_READY': return 'primary';
    case 'IN_PROGRESS': return 'warning';
    case 'COMPLETED': return 'success';
    case 'CANCELLED': return 'danger';
    case 'GENERATION_FAILED': return 'danger';
    case 'GENERATING': return 'warning';
    default: return 'info';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'Nháp';
    case 'APPROVED': return 'Đã duyệt';
    case 'CODES_READY': return 'Mã sẵn sàng';
    case 'GENERATING': return 'Đang sinh mã...';
    case 'IN_PROGRESS': return 'Đang SX';
    case 'COMPLETED': return 'Hoàn thành';
    case 'CANCELLED': return 'Đã hủy';
    case 'GENERATION_FAILED': return 'Lỗi sinh mã';
    default: return status;
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

const handleExportPacketCodes = async (row: any) => {
  try {
    ElMessage.info('Đang chuẩn bị file excel mã gói...');
    const res = await productionOrderApi.exportPacketCodesExcel(row.id);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ma_goi_${row.orderCode}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    ElMessage.success('Tải danh sách mã gói thành công!');
  } catch (error: any) {
    console.error(error);
    ElMessage.error('Không thể xuất file mã gói');
  }
};

const handleRetryGenerate = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      'Bạn có chắc muốn thử lại sinh mã cho lệnh này? Hãy đảm bảo hạn mức mã đã được cấp đủ.',
      'Xác nhận thử lại sinh mã',
      { confirmButtonText: 'Thử lại', cancelButtonText: 'Hủy', type: 'warning' }
    );
    await productionOrderApi.retryGenerateCodes(row.id);
    ElMessage.success('Đang thử lại sinh mã... Vui lòng đợi và làm mới trang.');
    fetchOrders();
  } catch (err: any) {
    if (err === 'cancel') return;
    ElMessage.error(err?.response?.data?.message || 'Lỗi khi thử lại sinh mã');
  }
};

const handleDeleteOrder = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `Bạn có chắc muốn xóa lệnh ${row.orderCode}? Hành động này không thể hoàn tác.`,
      'Xác nhận xóa lệnh',
      { confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', type: 'error', confirmButtonClass: 'el-button--danger' }
    );
    await productionOrderApi.deleteOrder(row.id);
    ElMessage.success('Đã xóa lệnh sản xuất thành công!');
    fetchOrders();
  } catch (err: any) {
    if (err === 'cancel') return;
    ElMessage.error(err?.response?.data?.message || 'Lỗi khi xóa lệnh');
  }
};

const handleExportBagCodes = async (row: any) => {
  try {
    ElMessage.info('Đang chuẩn bị file excel mã bao...');
    const res = await productionOrderApi.exportBagCodesExcel(row.id);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ma_bao_${row.orderCode}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    ElMessage.success('Tải danh sách mã bao thành công!');
  } catch (error: any) {
    console.error(error);
    ElMessage.error('Không thể xuất file mã bao');
  }
};

const openCreateDialog = () => {
  createDialogRef.value?.open();
};

const openEditDialog = (row: any) => {
  createDialogRef.value?.open(row);
};

onMounted(() => {
  fetchOrders();
});
</script>
