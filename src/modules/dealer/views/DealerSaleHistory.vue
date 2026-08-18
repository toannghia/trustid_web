<template>
  <div class="dealer-sale-history p-6 relative">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Lịch sử Hóa đơn Bán lẻ</h2>
      <el-button type="primary" @click="loadData(1)" :loading="loading">
        <el-icon class="mr-1"><Refresh /></el-icon> Làm mới
      </el-button>
    </div>

    <el-card shadow="hover" class="border rounded-xl">
      <el-table :data="tableData" style="width: 100%" v-loading="loading">
        <el-table-column type="index" width="60" label="STT" />
        
        <el-table-column prop="receiptNumber" label="Mã Hóa đơn" width="180">
          <template #default="{row}">
            <span 
              class="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors inline-block"
              @click="viewDetail(row)"
              title="Click để xem chi tiết hóa đơn"
            >
              {{ row.receiptNumber || row.id.split('-')[0].toUpperCase() }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="saleDate" label="Thời gian" width="180">
          <template #default="{row}">
            {{ formatDateTime(row.saleDate) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="customerName" label="Khách hàng">
          <template #default="{row}">
            <div class="font-medium">{{ row.customerName || 'Khách lẻ' }}</div>
            <div class="text-xs text-gray-500">{{ row.customerPhone || '---' }}</div>
          </template>
        </el-table-column>
        
        <el-table-column label="SP/Số lượng" width="120" align="center">
          <template #default="{row}">
            <el-tag size="small" type="info">{{ getTotalQty(row) }} SP</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="totalAmount" label="Tổng tiền (VND)" width="180" align="right">
          <template #default="{row}">
            <div class="font-bold text-green-600">{{ formatCurrency(row.totalAmount) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="160" align="center" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              <el-icon class="mr-1"><View /></el-icon> Chi tiết
            </el-button>
            <el-button type="success" link size="small" @click="printReceipt(row)">
              <el-icon class="mr-1"><Printer /></el-icon> In
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-6 flex justify-end">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="totalItems"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- Dialog Chi tiết -->
    <el-dialog v-model="showDetail" title="Chi tiết Hóa đơn" width="840px" destroy-on-close class="rounded-xl">
      <div v-if="selectedSale" class="space-y-4 text-sm">
        <!-- Metadata Header Card -->
        <div class="bg-gray-50/80 p-3.5 rounded-lg border border-gray-200/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
          <div>
            <div class="text-gray-400 mb-0.5">Mã hóa đơn</div>
            <div class="font-mono font-bold text-blue-600 text-sm">{{ selectedSale.receiptNumber || selectedSale.id.split('-')[0] }}</div>
          </div>
          <div>
            <div class="text-gray-400 mb-0.5">Thời gian</div>
            <div class="font-medium text-gray-800">{{ formatDateTime(selectedSale.saleDate) }}</div>
          </div>
          <div>
            <div class="text-gray-400 mb-0.5">Khách hàng</div>
            <div class="font-medium text-gray-800">{{ selectedSale.customerName || 'Khách lẻ' }}</div>
          </div>
          <div>
            <div class="text-gray-400 mb-0.5">Số điện thoại</div>
            <div class="font-mono text-gray-800">{{ selectedSale.customerPhone || '---' }}</div>
          </div>
          <div>
            <div class="text-gray-400 mb-0.5">Phương thức TT</div>
            <el-tag size="small" type="info" effect="light" class="font-medium">{{ getPaymentMethodLabel(selectedSale.paymentMethod || 'CASH') }}</el-tag>
          </div>
        </div>

        <div>
          <div class="font-semibold text-gray-700 mb-2 flex items-center justify-between">
            <span>Danh sách Sản phẩm</span>
            <span class="text-xs font-normal text-gray-500">Tổng {{ selectedSale.items ? selectedSale.items.length : 0 }} dòng</span>
          </div>

          <div class="border rounded-lg overflow-hidden shadow-sm">
            <el-table :data="selectedSale.items" size="small" row-key="serialNumber"
              :tree-props="{ children: '_children' }" class="w-full" max-height="320">
              <el-table-column label="Tên SP" min-width="170" show-overflow-tooltip>
                <template #default="{row}">
                  <div v-if="!row._isPacketRow">
                    <span class="font-medium text-gray-800">{{ row.productName }}</span>
                  </div>
                  <div v-else class="text-gray-400 text-xs pl-2">{{ row.productName || '—' }}</div>
                </template>
              </el-table-column>
              <el-table-column label="Đơn vị" width="70" align="center">
                <template #default="{row}">
                  <el-tag v-if="row.isBag" type="primary" size="small" effect="plain">Bao</el-tag>
                  <el-tag v-else-if="!row._isPacketRow" type="success" size="small" effect="plain">Gói</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="Mã QR / Serial" min-width="200" show-overflow-tooltip>
                <template #default="{row}">
                  <div class="font-mono text-gray-800 font-semibold leading-tight text-xs">{{ row.qrCode || row.serialNumber }}</div>
                  <div class="font-mono text-gray-400 text-[11px] leading-none mt-0.5" v-if="row.qrCode && row.qrCode !== row.serialNumber">
                    ({{ row.serialNumber }})
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="SL" width="60" align="center">
                <template #default="{row}">
                  <span v-if="!row._isPacketRow" class="font-semibold text-gray-700" :class="row.isBag ? 'text-blue-600 font-bold' : ''">
                    {{ row.quantity || 1 }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="Đơn giá" width="115" align="right">
                <template #default="{row}">
                  <span v-if="!row._isPacketRow" class="text-gray-600 font-mono">{{ formatCurrency(row.price) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Thành tiền" width="125" align="right">
                <template #default="{row}">
                  <span v-if="!row._isPacketRow" class="font-bold text-green-600 font-mono">
                    {{ formatCurrency((row.price || 0) * (row.isBag ? 1 : (row.quantity || 1))) }}
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- Packets grid for bag items -->
          <template v-for="item in (selectedSale.items || [])" :key="'packets-' + item.serialNumber">
            <div v-if="item.isBag && item.packets && item.packets.length > 0" class="mt-3 bg-blue-50/40 p-3 rounded-lg border border-blue-100">
              <div class="flex items-center gap-2 mb-2">
                <el-tag type="primary" size="small" effect="dark" class="font-mono">📦 {{ item.qrCode || item.serialNumber }}</el-tag>
                <span class="text-xs font-medium text-gray-600">Chi tiết {{ item.packets.length }} gói trong bao:</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                <div v-for="(pkt, idx) in item.packets" :key="pkt.serial"
                  class="bg-white border border-gray-200/90 rounded px-2 py-1 text-[11px] font-mono flex items-center justify-between shadow-2xs hover:border-blue-400 transition-colors">
                  <span class="text-gray-400 select-none">{{ Number(idx) + 1 }}.</span>
                  <span class="font-semibold text-gray-700 truncate" :title="pkt.qrCode || pkt.serial">{{ pkt.qrCode || pkt.serial }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-gray-100">
          <el-button type="success" plain size="default" @click="printReceipt(selectedSale)">
            <el-icon class="mr-1"><Printer /></el-icon> In Hóa Đơn
          </el-button>

          <div class="text-lg font-bold text-gray-800">
            Tổng cộng: <span class="text-xl text-green-600 ml-2 font-mono">{{ formatCurrency(selectedSale.totalAmount) }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh, View, Printer } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import api from '@/common/utils/api';

const router = useRouter();

const loading = ref(false);
const tableData = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);

const showDetail = ref(false);
const selectedSale = ref<any>(null);

const formatCurrency = (val: number | string) => {
  if (!val) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN');
};

const getPaymentMethodLabel = (method: string) => {
  const map: Record<string, string> = {
    CASH: 'Tiền mặt',
    TRANSFER: 'Chuyển khoản / Quẹt thẻ',
    BANK_TRANSFER: 'Chuyển khoản',
    CARD: 'Thẻ'
  };
  return map[method?.toUpperCase()] || method;
};

const getTotalQty = (sale: any) => {
  if (!sale.items || !Array.isArray(sale.items)) return 0;
  return sale.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
};

const loadData = async (page = 1) => {
  loading.value = true;
  currentPage.value = page;
  try {
    const { data } = await api.get(`/dealer-dashboard/sales?page=${page}&limit=${pageSize.value}`);
    tableData.value = data.items || [];
    totalItems.value = data.total || 0;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải danh sách hóa đơn');
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (val: number) => {
  loadData(val);
};

const viewDetail = (row: any) => {
  selectedSale.value = row;
  showDetail.value = true;
};

const printReceipt = (row: any) => {
  router.push(`/dealer/receipt/${row.id}`);
};

onMounted(() => {
  loadData();
});
</script>
