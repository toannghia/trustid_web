<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { shipmentV2Api } from '../api/shipmentV2Api';
import { ElMessage } from 'element-plus';
import { 
  Plus, Search, Document, OfficeBuilding, User, Timer, 
  Check, Close, Loading, Van, Warning, Filter, Histogram
} from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const router = useRouter();
const loading = ref(false);
const shipments = ref<any[]>([]);

// Advanced Filters
const filters = reactive({
  keyword: '',
  status: '',
  type: '',
  dateRange: [] as [Date, Date] | []
});

const stats = computed(() => {
  const total = shipments.value.length;
  const pending = shipments.value.filter(s => s.status === 'CREATED' || s.status === 'SCANNING').length;
  const shipping = shipments.value.filter(s => s.status === 'READY' || s.status === 'SHIPPING').length;
  const completed = shipments.value.filter(s => s.status === 'DELIVERED').length;
  return { total, pending, shipping, completed };
});

const fetchShipments = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    
    // Server-side filtering would be better, but we simulate for now
    const res = await shipmentV2Api.getShipments(params);
    let data = res.data;
    
    // Client-side filtering for keyword and date
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      data = data.filter(s => 
        s.id.toLowerCase().includes(kw) || 
        s.trackingCode?.toLowerCase().includes(kw) ||
        s.dealer?.name?.toLowerCase().includes(kw) ||
        s.sourceWarehouse?.name?.toLowerCase().includes(kw)
      );
    }
    
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [start, end] = filters.dateRange;
      data = data.filter(s => dayjs(s.createdAt).isBetween(dayjs(start).startOf('day'), dayjs(end).endOf('day')));
    }
    
    shipments.value = data;
  } catch (e: any) {
    ElMessage.error('Lỗi tải danh sách lệnh: ' + (e.response?.data?.message || e.message));
  } finally {
    loading.value = false;
  }
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'CREATED': return 'info';
    case 'SCANNING': return 'warning';
    case 'READY': return 'primary';
    case 'SHIPPING': return 'primary';
    case 'ARRIVED': return 'info';
    case 'DELIVERED': return 'success';
    case 'CANCELLED': return 'danger';
    default: return 'info';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'CREATED': return 'Mới tạo';
    case 'SCANNING': return 'Đang đóng hàng';
    case 'READY': return 'Sẵn sàng xuất';
    case 'SHIPPING': return 'Đang vận chuyển';
    case 'ARRIVED': return 'Đã đến đích';
    case 'DELIVERED': return 'Hoàn thành';
    case 'CANCELLED': return 'Đã hủy';
    default: return status;
  }
};

const getPriorityType = (priority: string) => {
  switch (priority) {
    case 'HIGH': return 'danger';
    case 'MEDIUM': return 'warning';
    case 'LOW': return 'info';
    default: return 'info';
  }
};

onMounted(fetchShipments);
</script>

<template>
  <div class="export-order-list p-6 bg-[#f8fafc] min-h-screen">
    <!-- METRIC CARDS -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="stat-card bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <el-icon :size="24"><Document /></el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500 font-medium">Tổng số lệnh</div>
          <div class="text-2xl font-bold text-gray-800">{{ stats.total }}</div>
        </div>
      </div>
      <div class="stat-card bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
          <el-icon :size="24"><Timer /></el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500 font-medium">Chờ xử lý</div>
          <div class="text-2xl font-bold text-gray-800">{{ stats.pending }}</div>
        </div>
      </div>
      <div class="stat-card bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <el-icon :size="24"><Van /></el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500 font-medium">Đang giao</div>
          <div class="text-2xl font-bold text-gray-800">{{ stats.shipping }}</div>
        </div>
      </div>
      <div class="stat-card bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
          <el-icon :size="24"><Check /></el-icon>
        </div>
        <div>
          <div class="text-xs text-gray-500 font-medium">Hoàn thành</div>
          <div class="text-2xl font-bold text-gray-800">{{ stats.completed }}</div>
        </div>
      </div>
    </div>

    <el-card class="rounded-2xl shadow-sm border-none mb-6 overflow-hidden">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h2 class="text-xl font-bold text-gray-800">Quản lý Lệnh Xuất hàng</h2>
          </div>
          <el-button type="primary" :icon="Plus" size="large" class="rounded-xl px-6" @click="router.push('/supply/export-order/new')">
            Thêm mới Lệnh
          </el-button>
        </div>
      </template>

      <!-- ADVANCED FILTERS -->
      <div class="filter-bar bg-white px-6 py-4 rounded-2xl border border-gray-100 mb-6 shadow-sm">
        <el-form :inline="true" :model="filters" class="flex items-center justify-between w-full !mb-0 space-x-2">
          <div class="flex items-center gap-4 flex-1 overflow-x-auto no-scrollbar py-1">
            <el-form-item label="Tìm kiếm" class="!mr-0 font-bold shrink-0">
              <el-input
                v-model="filters.keyword"
                placeholder="Mã đơn, đối tác..."
                prefix-icon="Search"
                class="!w-48"
                clearable
                @clear="fetchShipments"
                @keyup.enter="fetchShipments"
              />
            </el-form-item>
            
            <el-form-item label="Trạng thái" class="!mr-0 font-bold shrink-0">
              <el-select v-model="filters.status" placeholder="Chọn" class="!w-36" clearable @change="fetchShipments">
                <el-option label="Mới tạo" value="CREATED" />
                <el-option label="Đang đóng" value="SCANNING" />
                <el-option label="Sẵn sàng" value="READY" />
                <el-option label="Vận chuyển" value="SHIPPING" />
                <el-option label="Hoàn thành" value="DELIVERED" />
                <el-option label="Đã hủy" value="CANCELLED" />
              </el-select>
            </el-form-item>

            <el-form-item label="Loại" class="!mr-0 font-bold shrink-0">
              <el-select v-model="filters.type" placeholder="Chọn" class="!w-36" clearable @change="fetchShipments">
                <el-option label="Nội bộ" value="INTERNAL_TRANSFER" />
                <el-option label="Đại lý" value="DEALER_EXPORT" />
              </el-select>
            </el-form-item>

            <el-form-item label="Thời gian" class="!mr-0 font-bold shrink-0">
              <el-date-picker
                v-model="filters.dateRange"
                type="daterange"
                range-separator="-"
                start-placeholder="Từ"
                end-placeholder="Đến"
                class="!w-56"
                @change="fetchShipments"
              />
            </el-form-item>
          </div>

          <el-button type="primary" plain :icon="Search" @click="fetchShipments" class="rounded-xl px-5 shrink-0">
            Lọc dữ liệu
          </el-button>
        </el-form>
      </div>

      <!-- DATA TABLE -->
      <el-table 
        :data="shipments" 
        v-loading="loading" 
        style="width: 100%" 
        class="rounded-xl overflow-hidden"
        :header-cell-style="{ background: '#f8fafc', fontWeight: 'bold', color: '#64748b' }"
      >
        <el-table-column label="MÃ LỆNH / THÔNG TIN" min-width="250">
          <template #default="{row}">
            <div class="flex flex-col">
              <span class="font-mono font-bold text-blue-600 flex items-center gap-2">
                #{{ row.trackingCode || row.id.split('-')[0].toUpperCase() }}
                <el-tag v-if="row.priority" :type="getPriorityType(row.priority)" size="small" effect="plain" class="text-[10px]">
                  {{ row.priority }}
                </el-tag>
              </span>
              <span class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <el-icon><User /></el-icon> {{ row.sender?.fullName || 'Hệ thống' }}
              </span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="HÀNH TRÌNH" min-width="300">
          <template #default="{row}">
            <div class="flex items-center gap-3">
              <div class="flex flex-col items-end min-w-[120px]">
                <span class="text-sm font-semibold text-gray-700 truncate w-full text-right">{{ row.sourceWarehouse?.name }}</span>
                <span class="text-[10px] text-gray-400">Kho xuất</span>
              </div>
              <div class="flex flex-col items-center">
                <el-icon class="text-gray-300"><Van /></el-icon>
                <div class="w-8 h-px bg-gray-200 mt-1"></div>
              </div>
              <div class="flex flex-col min-w-[120px]">
                <span class="text-sm font-semibold text-gray-700 truncate w-full">
                  {{ row.type === 'INTERNAL_TRANSFER' ? row.destinationWarehouse?.name : row.dealer?.name }}
                </span>
                <span class="text-[10px] text-gray-400">{{ row.type === 'INTERNAL_TRANSFER' ? 'Kho nhận' : 'Đại lý' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="LỊCH TRÌNH" width="180">
          <template #default="{row}">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-1.5 text-xs text-gray-600">
                <el-icon class="text-gray-400"><Timer /></el-icon>
                <span>{{ dayjs(row.createdAt).format('DD/MM/YYYY HH:mm') }}</span>
              </div>
              <div v-if="row.expectedDeliveryTime" class="flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                <el-icon><Van /></el-icon>
                <span>Dự kiến: {{ dayjs(row.expectedDeliveryTime).format('DD/MM') }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="SỐ LƯỢNG" width="100" align="center">
          <template #default="{row}">
             <div class="flex flex-col items-center">
               <span class="text-lg font-bold text-gray-700">{{ row.quantity || row.expectedItems?.length || 0 }}</span>
               <span class="text-[10px] text-gray-400 uppercase">Sản phẩm</span>
             </div>
          </template>
        </el-table-column>

        <el-table-column label="TRẠNG THÁI" width="160" align="center">
          <template #default="{row}">
            <el-tag :type="getStatusType(row.status)" effect="dark" class="rounded-full px-4 border-none shadow-sm">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="THAO TÁC" width="120" fixed="right" align="center">
          <template #default="{row}">
            <div class="flex justify-center gap-1">
              <el-button type="primary" link icon="View" @click="router.push(`/supply/shipments`)">Chi tiết</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-between items-center mt-6 text-gray-500 text-sm">
        <span>Hiển thị {{ shipments.length }} kết quả</span>
        <el-pagination background layout="prev, pager, next" :total="shipments.length" :page-size="10" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.export-order-list :deep(.el-card) {
  transition: transform 0.2s;
}

.stat-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.filter-bar :deep(.el-form-item__label) {
  font-weight: 600;
  color: #475569;
}

:deep(.el-table) {
  --el-table-border-color: #f1f5f9;
}

:deep(.el-table__row) {
  transition: background-color 0.2s;
}
:deep(.el-table__row:hover) {
  background-color: #f8fafc !important;
}
</style>
