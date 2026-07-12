<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { codeApi } from '../api/code';
import { useAuthStore } from '../store/auth';
import { ElMessage } from 'element-plus';
import { tenantApi } from '../api/tenant';
import type { Tenant } from '@/types/core';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import { Search, Refresh } from '@element-plus/icons-vue';

const route = useRoute();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'ADMIN');

// --- STATS ---
const stats = ref({
  total: 0,
  unactivated: 0,
  activated: 0,
  shipped: 0,
  atDealer: 0,
  sold: 0,
  damaged: 0,
});
const statsLoading = ref(false);

// --- ITEMS ---
const itemsLoading = ref(false);
const items = ref<any[]>([]);
const itemTotal = ref(0);
const filter = reactive({
  page: 1,
  limit: 20,
  search: '',
  productStatus: '',
  tenantId: '',
  poolId: '',
  fromDate: '',
  toDate: ''
});

// --- TENANTS & POOLS for filter ---
const tenants = ref<Tenant[]>([]);
const pools = ref<any[]>([]);

// --- STATUS MAP ---
const statusMap: Record<string, { label: string; type: string }> = {
  UNACTIVATED: { label: 'Chưa kích hoạt', type: 'info' },
  ACTIVATED: { label: 'Đã kích hoạt', type: 'success' },
  SHIPPED: { label: 'Đã xuất kho', type: '' },
  AT_DEALER: { label: 'Tại đại lý', type: 'warning' },
  SOLD: { label: 'Đã bán', type: 'danger' },
  DAMAGED: { label: 'Hư hỏng', type: 'danger' },
};

const getStatusLabel = (status: string) => statusMap[status]?.label || status;
const getStatusType = (status: string) => statusMap[status]?.type || 'info';

// --- STAT CARDS ---
const statCards = computed(() => [
  { label: 'Tổng mã', value: stats.value.total, color: '#0F2B46', icon: '📊', desc: 'Tổng số mã đã được tạo trong hệ thống' },
  { label: 'Chưa kích hoạt', value: stats.value.unactivated, color: '#909399', icon: '⚪', filterValue: 'UNACTIVATED', desc: 'Mã chưa được gắn vào sản phẩm hoặc lệnh sản xuất nào' },
  { label: 'Đã kích hoạt', value: stats.value.activated, color: '#00875A', icon: '🟢', filterValue: 'ACTIVATED', desc: 'Mã đã gắn vào sản phẩm (qua sản xuất hoặc đóng bao) nhưng chưa xuất kho' },
  { label: 'Đã xuất kho', value: stats.value.shipped, color: '#409EFF', icon: '📦', filterValue: 'SHIPPED', desc: 'Sản phẩm đã được quét xuất kho cho đại lý' },
  { label: 'Tại đại lý', value: stats.value.atDealer, color: '#E6A23C', icon: '🏪', filterValue: 'AT_DEALER', desc: 'Sản phẩm đã đến đại lý, chờ bán' },
  { label: 'Đã bán', value: stats.value.sold, color: '#8B5CF6', icon: '✅', filterValue: 'SOLD', desc: 'Sản phẩm đã bán cho người tiêu dùng' },
  { label: 'Hư hỏng / Mất', value: stats.value.damaged, color: '#F56C6C', icon: '🔴', filterValue: 'DAMAGED', desc: 'Sản phẩm bị hư hỏng hoặc mất trong quá trình vận chuyển' },
]);

// --- FUNCTIONS ---
const fetchStats = async () => {
  statsLoading.value = true;
  try {
    const { data } = await codeApi.getStats();
    stats.value = data;
  } catch (e) { console.error(e); }
  finally { statsLoading.value = false; }
};

const fetchItems = async () => {
  itemsLoading.value = true;
  try {
    const params: any = { ...filter };
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null) delete params[key];
    });
    const { data } = await codeApi.getStampItems(params);
    items.value = data.data || [];
    itemTotal.value = data.meta?.total || 0;
  } catch (e) {
    console.error(e);
    ElMessage.error('Không thể tải danh sách mã');
  } finally { itemsLoading.value = false; }
};

const fetchTenants = async () => {
  try {
    const { data } = await tenantApi.getAll({ limit: 999, type: 'main' });
    tenants.value = data.data || (Array.isArray(data) ? data : []);
  } catch (e) { console.error(e); }
};

const fetchPools = async () => {
  try {
    const { data } = await codeApi.getPools({ limit: 500 });
    if (data && typeof data === 'object' && 'data' in data) {
      pools.value = data.data || [];
    } else {
      pools.value = Array.isArray(data) ? data : [];
    }
  } catch (e) { console.error(e); }
};

const handleFilter = () => { filter.page = 1; fetchItems(); };
const handleResetFilter = () => {
  filter.search = '';
  filter.productStatus = '';
  filter.tenantId = '';
  filter.poolId = '';
  filter.fromDate = '';
  filter.toDate = '';
  filter.page = 1;
  fetchItems();
  fetchStats();
};

const handlePageChange = (page: number) => { filter.page = page; fetchItems(); };
const handleSizeChange = (size: number) => { filter.limit = size; filter.page = 1; fetchItems(); };

const handleStatCardClick = (filterValue?: string) => {
  if (!filterValue) {
    filter.productStatus = '';
  } else {
    filter.productStatus = filter.productStatus === filterValue ? '' : filterValue;
  }
  filter.page = 1;
  fetchItems();
};

let searchTimeout: any = null;
watch(() => filter.search, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { filter.page = 1; fetchItems(); }, 400);
});

onMounted(() => {
  // Pre-fill poolId from query param (e.g. navigating from CodePoolManagement)
  if (route.query.poolId) {
    filter.poolId = route.query.poolId as string;
  }
  fetchStats();
  fetchItems();
  fetchPools();
  if (isAdmin.value) fetchTenants();
});
</script>

<template>
  <div>
    <LTEContentHeader title="Thống kê Mã" :breadcrumbs="[{ title: 'Code Report' }]" />

    <div class="p-4">
      <!-- SUMMARY CARDS -->
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
        <el-tooltip
          v-for="card in statCards"
          :key="card.label"
          :content="card.desc"
          placement="bottom"
          :show-after="300"
        >
          <div
            class="stat-card rounded-lg p-4 cursor-pointer transition-all hover:shadow-md border"
            :class="{ 'ring-2 ring-offset-1': filter.productStatus === card.filterValue }"
            :style="{ borderLeftColor: card.color, borderLeftWidth: '4px', '--ring-color': card.color }"
            @click="handleStatCardClick(card.filterValue)"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-gray-500 mb-1">{{ card.label }}</div>
                <div class="text-2xl font-bold" :style="{ color: card.color }">
                  {{ card.value.toLocaleString() }}
                </div>
              </div>
              <span class="text-2xl">{{ card.icon }}</span>
            </div>
          </div>
        </el-tooltip>
      </div>

      <!-- FILTER BAR -->
      <div class="mb-4 bg-gray-50 p-3 rounded border flex flex-wrap gap-3 items-end">
        <div class="w-48">
          <div class="text-xs mb-1 text-gray-500">Tìm kiếm</div>
          <el-input v-model="filter.search" placeholder="Mã QR, Serial..." clearable @keyup.enter="handleFilter" />
        </div>

        <div class="w-44">
          <div class="text-xs mb-1 text-gray-500">Trạng thái</div>
          <el-select v-model="filter.productStatus" placeholder="Tất cả" clearable @change="handleFilter">
            <el-option label="Chưa kích hoạt" value="UNACTIVATED" />
            <el-option label="Đã kích hoạt" value="ACTIVATED" />
            <el-option label="Đã xuất kho" value="SHIPPED" />
            <el-option label="Tại đại lý" value="AT_DEALER" />
            <el-option label="Đã bán" value="SOLD" />
            <el-option label="Hư hỏng / Mất" value="DAMAGED" />
          </el-select>
        </div>

        <div v-if="isAdmin" class="w-48">
          <div class="text-xs mb-1 text-gray-500">Doanh nghiệp</div>
          <el-select v-model="filter.tenantId" placeholder="Chọn DN" filterable clearable @change="handleFilter">
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </div>

        <div class="w-48">
          <div class="text-xs mb-1 text-gray-500">Lô mã</div>
          <el-select v-model="filter.poolId" placeholder="Chọn lô mã" filterable clearable @change="handleFilter">
            <el-option v-for="p in pools" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </div>

        <div class="w-80">
          <div class="text-xs mb-1 text-gray-500">Ngày tạo</div>
          <div class="flex items-center">
            <el-date-picker v-model="filter.fromDate" type="date" placeholder="Từ ngày"
              value-format="YYYY-MM-DD" style="width: 140px" @change="handleFilter" />
            <span class="mx-2 text-gray-400">-</span>
            <el-date-picker v-model="filter.toDate" type="date" placeholder="Đến ngày"
              value-format="YYYY-MM-DD" style="width: 140px" @change="handleFilter" />
          </div>
        </div>

        <div class="flex-1 flex justify-end gap-2">
          <el-button type="primary" :icon="Search" @click="handleFilter">Tìm kiếm</el-button>
          <el-button :icon="Refresh" @click="handleResetFilter">Đặt lại</el-button>
        </div>
      </div>

      <!-- TABLE -->
      <el-table :data="items" v-loading="itemsLoading" height="600" border stripe>
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">{{ (filter.page - 1) * filter.limit + $index + 1 }}</template>
        </el-table-column>

        <el-table-column prop="codeString" label="Mã QR" width="220">
          <template #default="{ row }">
            <span class="font-mono text-xs">{{ row.codeString }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="serial" label="Serial" width="140" />

        <el-table-column label="Trạng thái" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.computedStatus)" effect="dark" size="small">
              {{ getStatusLabel(row.computedStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Sản phẩm" min-width="180">
          <template #default="{ row }">
            <span v-if="row.productName" class="text-sm">{{ row.productName }}</span>
            <span v-else class="text-gray-400 text-xs">—</span>
          </template>
        </el-table-column>

        <el-table-column prop="pool.name" label="Lô mã" min-width="150" />

        <el-table-column v-if="isAdmin" label="Doanh nghiệp" min-width="150">
          <template #default="{ row }">{{ row.pool?.tenant?.name || '' }}</template>
        </el-table-column>

        <el-table-column label="Lượt quét" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.scanCount > 0" class="font-bold text-blue-600">{{ row.scanCount }}</span>
            <span v-else class="text-gray-300">0</span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="Ngày tạo" width="160">
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '' }}
          </template>
        </el-table-column>
      </el-table>

      <!-- PAGINATION -->
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="filter.page"
          v-model:page-size="filter.limit"
          :total="itemTotal"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: #fff;
  border: 1px solid #e4e7ed;
}
.stat-card:hover {
  transform: translateY(-2px);
}
</style>
