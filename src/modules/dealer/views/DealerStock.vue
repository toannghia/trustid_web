<template>
  <div class="dealer-stock p-6">
    <!-- Header Page Section -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Tồn Kho Đại Lý</h2>
        <p class="text-sm text-gray-500 mt-1">Báo cáo Nhập - Xuất - Tồn sản phẩm theo kỳ thời gian</p>
      </div>
      
      <!-- Filter controls -->
      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="tới"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          format="DD/MM/YYYY"
          value-format="YYYY-MM-DD"
          @change="loadInventory"
          class="!w-72 shadow-sm"
          :clearable="false"
        />
        
        <el-input 
          v-model="searchQuery" 
          placeholder="Tìm sản phẩm..." 
          prefix-icon="Search" 
          clearable 
          class="w-56 shadow-sm"
        />
        
        <div class="flex items-center bg-white border px-3 h-8 rounded-md shadow-sm">
          <el-checkbox v-model="hideZeroStock" class="!mr-0 font-medium text-xs">
            Ẩn hàng tồn = 0
          </el-checkbox>
        </div>

        <el-button type="primary" @click="loadInventory" :loading="loading" class="shadow-sm">
          <el-icon class="mr-1"><Refresh /></el-icon>Tải lại
        </el-button>
      </div>
    </div>

    <!-- Main Table Card -->
    <el-card shadow="hover" class="!border-gray-100 rounded-xl overflow-hidden">
      <el-table 
        :data="filteredInventory" 
        style="width: 100%" 
        v-loading="loading"
        row-key="productId"
        stripe
        header-cell-class-name="bg-gray-50/70 text-gray-700 font-semibold py-3 border-b"
        cell-class-name="py-3"
      >
        <el-table-column type="index" width="60" label="STT" align="center" />
        
        <el-table-column prop="productName" label="Sản phẩm" min-width="220" class-name="font-semibold text-gray-900" />
        
        <el-table-column prop="beginningStock" label="Đầu kỳ" width="130" align="center">
          <template #default="{ row }">
            <span class="font-semibold text-gray-600">{{ row.beginningStock || 0 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="inflow" label="Nhập trong kỳ" width="140" align="center">
          <template #default="{ row }">
            <span v-if="row.inflow > 0" class="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded text-sm">
              +{{ row.inflow }}
            </span>
            <span v-else class="text-gray-400 font-medium">-</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="outflow" label="Xuất trong kỳ" width="140" align="center">
          <template #default="{ row }">
            <span v-if="row.outflow > 0" class="text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded text-sm">
              -{{ row.outflow }}
            </span>
            <span v-else class="text-gray-400 font-medium">-</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="currentStock" label="Tồn cuối kỳ" width="140" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="row.currentStock > 0 ? 'primary' : 'danger'" 
              effect="light" 
              class="font-bold border-0 !px-3 rounded"
            >
              {{ row.currentStock || 0 }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="120" align="center">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              link 
              @click="showSerials(row)"
              class="hover:text-blue-700 transition-colors font-medium"
            >
              <el-icon class="mr-1"><InfoFilled /></el-icon>Mã Serial
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Dialog for Serial Details -->
    <el-dialog
      v-model="dialogVisible"
      :title="'Chi tiết Mã Serial - ' + selectedProduct?.productName"
      width="1080px"
      class="rounded-xl overflow-hidden"
      destroy-on-close
    >
      <div class="mb-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <span class="text-sm font-medium text-gray-600">
          Danh sách mã serial có sẵn: 
          <span class="text-blue-600 font-bold ml-1">{{ filteredSerials.length }} / {{ selectedProduct?.serials?.length || 0 }}</span>
        </span>
        <el-input
          v-model="serialSearch"
          placeholder="Tìm mã serial/QR..."
          prefix-icon="Search"
          clearable
          class="w-64"
        />
      </div>
      
      <div class="border border-gray-150 rounded-lg overflow-hidden bg-white shadow-inner">
        <el-table
          v-slot:default
          v-if="filteredSerials.length > 0"
          :data="filteredSerials"
          stripe
          style="width: 100%"
          max-height="420"
          header-cell-class-name="bg-gray-50 text-gray-700 font-semibold py-2.5 border-b text-xs"
          cell-class-name="py-2 text-xs"
        >
          <el-table-column type="index" width="60" label="STT" align="center" />
          
          <el-table-column prop="fullQrCode" label="Mã QR" width="170" align="center">
            <template #default="{ row }">
              <span class="font-mono text-gray-600 break-all select-all font-semibold">{{ row.fullQrCode || 'N/A' }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="serialNumber" label="Serial" width="130" align="center">
            <template #default="{ row }">
              <span class="font-mono font-bold text-gray-800">{{ row.serialNumber }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="batchCode" label="Lô" width="140" align="center">
            <template #default="{ row }">
              <span class="font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                {{ row.batchCode || 'N/A' }}
              </span>
            </template>
          </el-table-column>
          
          <el-table-column prop="trackingCode" label="Phiếu nhập / Giao hàng" width="180" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.trackingCode && row.trackingCode !== 'N/A'" type="info" effect="plain" class="font-mono font-bold border-gray-200 text-gray-700">
                {{ row.trackingCode }}
              </el-tag>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="sourceUnit" label="Nguồn từ đơn vị nào" min-width="180">
            <template #default="{ row }">
              <span class="font-medium text-gray-700">{{ row.sourceUnit || 'N/A' }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="importDate" label="Ngày nhập" width="160" align="center">
            <template #default="{ row }">
              <span class="text-gray-600">{{ formatDateDisplay(row.importDate) }}</span>
            </template>
          </el-table-column>
        </el-table>
        
        <div v-else class="text-center py-16 text-gray-400 bg-gray-50/50">
          <p class="text-sm">Không tìm thấy mã serial nào phù hợp hoặc sản phẩm đã hết hàng</p>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-2 border-t pt-4">
          <el-button @click="dialogVisible = false" class="!rounded-lg">Đóng</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Refresh, Search, InfoFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '@/common/utils/api';

const loading = ref(false);
const inventory = ref<any[]>([]);
const searchQuery = ref('');
const hideZeroStock = ref(false);

// Date range default: 1st of current month to today
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const dateRange = ref<[string, string]>([formatDate(firstDayOfMonth), formatDate(today)]);

// Dialog logic
const dialogVisible = ref(false);
const selectedProduct = ref<any>(null);
const serialSearch = ref('');

const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const filteredSerials = computed(() => {
  if (!selectedProduct.value || !selectedProduct.value.serials) return [];
  if (!serialSearch.value) return selectedProduct.value.serials;
  const lower = serialSearch.value.toLowerCase();
  return selectedProduct.value.serials.filter((s: any) => 
    s.serialNumber.toLowerCase().includes(lower) ||
    (s.fullQrCode && s.fullQrCode.toLowerCase().includes(lower))
  );
});

const showSerials = (product: any) => {
  selectedProduct.value = product;
  serialSearch.value = '';
  dialogVisible.value = true;
};

const filteredInventory = computed(() => {
  let list = inventory.value;

  // Filter by product name
  if (searchQuery.value) {
    const lower = searchQuery.value.toLowerCase();
    list = list.filter(i => i.productName.toLowerCase().includes(lower));
  }

  // Filter out products with zero stock
  if (hideZeroStock.value) {
    list = list.filter(i => i.currentStock > 0);
  }

  return list;
});

const loadInventory = async () => {
  loading.value = true;
  try {
    let url = '/dealer-dashboard/inventory';
    if (dateRange.value && dateRange.value.length === 2) {
      url += `?startDate=${dateRange.value[0]}&endDate=${dateRange.value[1]}`;
    }
    const { data } = await api.get(url);
    inventory.value = data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải danh sách tồn kho');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadInventory();
});
</script>

<style scoped>
.dealer-stock {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
