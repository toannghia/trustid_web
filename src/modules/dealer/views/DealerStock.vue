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
      width="95%"
      class="branded-pallet-dialog custom-width-dialog"
      :show-close="false"
      destroy-on-close
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
          <span style="color: #fff; font-size: 16px; font-weight: 600;">
            Chi tiết Mã Serial - {{ selectedProduct?.productName }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="dialogVisible = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <div style="padding: 24px;">
        <div class="mb-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <span class="text-sm font-medium text-gray-600">
          Danh sách mã serial/gói có sẵn: 
          <span class="text-blue-600 font-bold ml-1">{{ filteredSerials.length }} / {{ selectedProduct?.serials?.length || 0 }}</span>
        </span>
        <el-input
          v-model="serialSearch"
          placeholder="Tìm mã gói/mã bao/QR..."
          prefix-icon="Search"
          clearable
          class="w-72"
        />
      </div>
      
      <div class="border border-gray-150 rounded-lg overflow-hidden bg-white shadow-inner">
        <el-table
          v-slot:default
          v-if="filteredSerials.length > 0"
          :data="filteredSerials"
          stripe
          style="width: 100%"
          max-height="460"
          header-cell-class-name="bg-gray-50 text-gray-700 font-semibold py-2.5 border-b text-xs whitespace-nowrap"
          cell-class-name="py-2.5 text-xs whitespace-nowrap"
        >
          <el-table-column type="index" width="55" label="STT" align="center" fixed="left" />
          
          <el-table-column prop="fullQrCode" label="Mã QR gói" min-width="120" align="center">
            <template #default="{ row }">
              <span class="font-mono text-gray-700 select-all font-semibold whitespace-nowrap">{{ row.fullQrCode || 'N/A' }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="serialNumber" label="Mã gói (Serial)" min-width="120" align="center">
            <template #default="{ row }">
              <span class="font-mono font-bold text-gray-800 whitespace-nowrap">{{ row.serialNumber }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="parentBagSerial" label="Mã bao" min-width="140" align="center">
            <template #default="{ row }">
              <span v-if="row.parentBagSerial" class="font-mono font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100 whitespace-nowrap inline-block">
                {{ row.parentBagSerial }}
              </span>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="batchCode" label="Lô" min-width="140" align="center">
            <template #default="{ row }">
              <span class="font-semibold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 whitespace-nowrap inline-block">
                {{ row.batchCode || 'N/A' }}
              </span>
            </template>
          </el-table-column>
          
          <el-table-column prop="trackingCode" label="Phiếu nhập / Giao hàng" min-width="120" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.trackingCode && row.trackingCode !== 'N/A'" type="info" effect="plain" class="font-mono font-bold border-gray-200 text-gray-700 whitespace-nowrap">
                {{ row.trackingCode }}
              </el-tag>
              <span v-else class="text-gray-400">-</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="sourceUnit" label="Nguồn từ đơn vị nào" min-width="120" show-overflow-tooltip align="center">
            <template #default="{ row }">
              <span class="font-medium text-gray-700 whitespace-nowrap" :title="row.sourceUnit">{{ row.sourceUnit || 'N/A' }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="importDate" label="Ngày nhập" min-width="120" align="center">
            <template #default="{ row }">
              <span class="text-gray-600 whitespace-nowrap">{{ formatDateDisplay(row.importDate) }}</span>
            </template>
          </el-table-column>
        </el-table>
        
        <div v-else class="text-center py-16 text-gray-400 bg-gray-50/50">
          <p class="text-sm">Không tìm thấy mã serial nào phù hợp hoặc sản phẩm đã hết hàng</p>
        </div>
        </div>
      </div>
      
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
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
import brandLogo from '@/assets/images/TrusID-TV_w.png';

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
    (s.serialNumber && s.serialNumber.toLowerCase().includes(lower)) ||
    (s.fullQrCode && s.fullQrCode.toLowerCase().includes(lower)) ||
    (s.parentBagSerial && s.parentBagSerial.toLowerCase().includes(lower)) ||
    (s.batchCode && s.batchCode.toLowerCase().includes(lower)) ||
    (s.trackingCode && s.trackingCode.toLowerCase().includes(lower))
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

<style>
.branded-pallet-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-pallet-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-pallet-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-pallet-dialog .el-dialog__footer {
  padding: 0 !important;
  border-top: none !important;
}
.custom-width-dialog {
  max-width: 1350px !important;
}
</style>
