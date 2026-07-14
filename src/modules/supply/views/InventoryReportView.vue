<template>
  <div class="p-4 space-y-4 w-full pb-16">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
      <div>
        <h1 class="text-xl font-bold text-gray-800 flex items-center gap-2">
          <div class="p-1.5 bg-blue-100 rounded-lg text-blue-600">
            <el-icon><DataLine /></el-icon>
          </div>
          Báo cáo Xuất Nhập Tồn
        </h1>
        <p class="text-gray-500 text-xs mt-0.5">Tổng hợp số lượng nhập, xuất, và tồn kho cuối kỳ</p>
      </div>
    </div>

    <!-- Filters -->
    <el-card shadow="never" class="!border-gray-200 !rounded-xl" body-style="padding: 12px 16px;">
      <div class="flex flex-wrap items-end gap-3">
        <div class="w-full md:w-56">
          <div class="text-[10px] font-bold text-gray-500 mb-1 uppercase">Chọn kho</div>
          <el-select v-model="filter.warehouseId" clearable filterable placeholder="Tất cả các kho" class="w-full" size="default">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
        </div>

        <div class="w-full md:w-56">
          <div class="text-[10px] font-bold text-gray-500 mb-1 uppercase">Sản phẩm</div>
          <el-select v-model="filter.productId" clearable filterable placeholder="Tất cả sản phẩm" class="w-full" size="default">
            <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </div>

        <div class="w-full md:w-72">
          <div class="text-[10px] font-bold text-gray-500 mb-1 uppercase">Khoảng thời gian</div>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="Đến"
            start-placeholder="Từ ngày"
            end-placeholder="Đến ngày"
            format="DD/MM/YYYY"
            class="!w-full"
            :clearable="false"
            size="default"
            @change="handleDateChange"
          />
        </div>

        <div class="flex items-center h-8 md:mb-0 mb-1">
          <el-checkbox v-model="hideZeroRows" class="text-xs">Ẩn dòng không phát sinh/tồn kho</el-checkbox>
        </div>

        <div class="flex gap-2 ml-auto">
          <el-button type="primary" :icon="Search" @click="fetchData" :loading="loading" size="default">
            Lấy Dữ Liệu
          </el-button>
          <el-button type="success" plain :icon="Download" @click="exportExcel" size="default">
            Xuất Excel
          </el-button>
          <el-button type="danger" plain :icon="Document" @click="exportPDF" :loading="exporting" size="default">
            Xuất PDF / In
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Data Table -->
    <el-card shadow="never" class="!border-gray-200 !rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500" body-style="padding: 0;">
      <el-table 
        ref="reportTableRef"
        :data="paginatedTableData" 
        row-key="id"
        style="width: 100%" 
        v-loading="loading"
        border
        stripe
        show-summary
        :summary-method="getSummaries"
        :row-class-name="tableRowClassName"
        @row-click="handleRowClick"
        size="small"
      >
        <el-table-column type="index" label="STT" width="45" align="center">
          <template #default="{ row }">
            <span :class="row.isProductGroup ? 'font-bold text-xs' : 'text-slate-500 font-mono text-[10px]'">
              {{ row.isProductGroup ? row.stt : '' }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column label="Sản phẩm / Lô" min-width="180">
          <template #default="{ row }">
            <span v-if="row.isProductGroup" class="text-xs">
              {{ row.productName }} 
              <span v-if="row.gtinCode" class="text-slate-400 font-normal font-mono text-[10px]">
                ({{ row.gtinCode }})
              </span>
            </span>
            <span v-else class="pl-4 font-mono text-[11px]">
              {{ row.batchCode }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="Kho" min-width="100">
          <template #default="{ row }">
            <span v-if="!row.isProductGroup" class="text-slate-700 text-xs">
              {{ row.warehouseName }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="Tồn đầu kỳ" prop="openingBalance" width="95" align="right">
          <template #default="{ row }">
            <span class="text-slate-700 font-medium text-xs">{{ formatNumber(row.openingBalance) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Nhập trong kỳ" prop="inbound" width="95" align="right">
          <template #default="{ row }">
            <span class="text-emerald-700 font-semibold text-xs">+{{ formatNumber(row.inbound) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Xuất trong kỳ" prop="outbound" width="95" align="right">
          <template #default="{ row }">
            <span class="text-rose-700 font-semibold text-xs">-{{ formatNumber(row.outbound) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Thu hồi nhập" prop="recallInbound" width="75" align="right">
          <template #default="{ row }">
            <span v-if="row.recallInbound > 0" class="text-amber-700 font-medium text-xs">⟲{{ formatNumber(row.recallInbound) }}</span>
            <span v-else class="text-slate-300 text-xs">0</span>
          </template>
        </el-table-column>

        <el-table-column label="Hủy" prop="disposed" width="60" align="right">
          <template #default="{ row }">
            <span v-if="row.disposed > 0" class="text-red-900 font-medium text-xs">🗑{{ formatNumber(row.disposed) }}</span>
            <span v-else class="text-slate-300 text-xs">0</span>
          </template>
        </el-table-column>

        <el-table-column label="Đang thu hồi" prop="recalledCount" width="75" align="right">
          <template #default="{ row }">
            <span v-if="row.recalledCount > 0" class="text-orange-600 font-semibold text-xs">⚠{{ formatNumber(row.recalledCount) }}</span>
            <span v-else class="text-slate-300 text-xs">0</span>
          </template>
        </el-table-column>

        <el-table-column label="Tồn cuối kỳ" prop="closingBalance" width="95" align="right" class-name="bg-slate-50">
          <template #default="{ row }">
            <span class="text-slate-900 font-bold text-xs">{{ formatNumber(row.closingBalance) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="70" align="center">
          <template #default="{ row }">
            <el-button v-if="!row.isProductGroup" type="primary" link size="small" @click="viewLedger(row)">
              Thẻ
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div v-if="totalProducts > 0" class="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 bg-white border-t border-gray-100 rounded-b-xl">
        <div class="text-xs text-gray-500">
          Hiển thị từ {{ (currentPage - 1) * pageSize + 1 }} đến {{ Math.min(currentPage * pageSize, totalProducts) }} trong tổng số {{ totalProducts }} sản phẩm
        </div>
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalProducts"
          size="small"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <InventoryLedgerDialog ref="ledgerDialogRef" />

    <!-- Hidden PDF Print Template -->
    <div style="position: absolute; left: -9999px; top: -9999px; overflow: hidden; height: 0; width: 0;">
      <div v-for="(pageRows, pageIdx) in printPages" :key="pageIdx" :ref="el => { if (el) printPageRefs[pageIdx] = el as HTMLElement }" class="print-page">
        <div class="flex flex-col justify-between h-full">
          <div>
            <!-- Header (Page 1 only) -->
            <div v-if="pageIdx === 0" class="print-header">
              <div class="flex justify-between items-start">
                <div class="header-company">
                  <div>ĐƠN VỊ: {{ authStore.user?.tenant_name || 'HỆ THỐNG TRUSTID' }}</div>
                  <div class="text-slate-500 font-normal text-[10px] mt-0.5">Hệ thống Xác thực & Truy xuất Nguồn gốc</div>
                </div>
                <div class="text-right text-[10px] font-mono text-slate-500 italic">
                  Mẫu số S21-DN<br/>
                  (Ban hành theo TT số 200/2014/TT-BTC)
                </div>
              </div>
              
              <h1 class="print-title text-center text-xl font-bold mt-4 uppercase text-slate-800">
                Báo cáo Xuất Nhập Tồn Kho
              </h1>
              <div class="text-center text-xs text-slate-500 mt-1 italic">
                <span>Kỳ báo cáo: Từ ngày {{ formatDateShort(filter.fromDate) }} đến ngày {{ formatDateShort(filter.toDate) }}</span>
                <span class="mx-2">•</span>
                <span>Kho: {{ getWarehouseName(filter.warehouseId) }}</span>
              </div>
            </div>
            
            <!-- Header (Page 2+) -->
            <div v-else class="print-header-sub flex justify-between items-center pb-2 mb-2 border-b border-slate-300">
              <div class="text-xs font-bold text-slate-700">Báo cáo Xuất Nhập Tồn - Trang {{ pageIdx + 1 }}</div>
              <div class="text-[10px] text-slate-500 italic">Kỳ: {{ formatDateShort(filter.fromDate) }} - {{ formatDateShort(filter.toDate) }}</div>
            </div>

            <!-- Print Table -->
            <table class="print-table w-full text-xs mt-2">
              <thead>
                <tr>
                  <th class="w-[4%] text-center">STT</th>
                  <th class="w-[28%] text-left">Sản phẩm / Lô</th>
                  <th class="w-[18%] text-left">Kho</th>
                  <th class="w-[8%] text-right">Tồn đầu</th>
                  <th class="w-[8%] text-right">Nhập</th>
                  <th class="w-[8%] text-right">Nhập TH</th>
                  <th class="w-[8%] text-right">Xuất</th>
                  <th class="w-[8%] text-right">Xuất Hủy</th>
                  <th class="w-[8%] text-right">Tồn cuối</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in pageRows" :key="row.id" :class="{'font-bold bg-slate-50': row.isProductGroup, 'total-row bg-slate-100 font-bold': row.isTotalRow}">
                  <td class="text-center">{{ row.isProductGroup ? row.stt : '' }}</td>
                  <td :class="{'pl-3': !row.isProductGroup && !row.isTotalRow, 'text-bold': row.isProductGroup || row.isTotalRow}">
                    <div v-if="row.isProductGroup">
                      {{ row.productName }} <span v-if="row.gtinCode" class="text-slate-500 font-normal font-mono text-[9px]">({{ row.gtinCode }})</span>
                    </div>
                    <div v-else-if="row.isTotalRow">
                      TỔNG CỘNG
                    </div>
                    <div v-else>
                      Lô: {{ row.batchCode }}
                    </div>
                  </td>
                  <td>
                    <span v-if="!row.isProductGroup && !row.isTotalRow">{{ row.warehouseName }}</span>
                  </td>
                  <td class="text-right">{{ formatNumber(row.openingBalance) }}</td>
                  <td class="text-right text-emerald-700">{{ formatNumber(row.inbound) }}</td>
                  <td class="text-right text-amber-700">{{ formatNumber(row.recallInbound) }}</td>
                  <td class="text-right text-rose-700">{{ formatNumber(row.outbound) }}</td>
                  <td class="text-right text-red-900">{{ formatNumber(row.disposed) }}</td>
                  <td class="text-right font-bold text-slate-800">{{ formatNumber(row.closingBalance) }}</td>
                </tr>
              </tbody>
            </table>

            <!-- Signatures (Last page only) -->
            <div v-if="pageIdx === printPages.length - 1" class="grid grid-cols-3 text-center mt-6 text-xs">
              <div>
                <div class="font-bold">Người lập biểu</div>
                <div class="text-slate-400 text-[9px] mt-0.5">(Ký, họ tên)</div>
                <div class="h-12"></div>
                <div class="font-bold text-slate-700 mt-6">{{ authStore.user?.fullName }}</div>
              </div>
              <div>
                <div class="font-bold">Thủ kho</div>
                <div class="text-slate-400 text-[9px] mt-0.5">(Ký, họ tên)</div>
                <div class="h-12"></div>
                <div class="w-24 border-b border-dashed border-slate-300 mx-auto mt-6"></div>
              </div>
              <div>
                <div class="text-slate-500 italic text-[10px] mb-1">Ngày ..... tháng ..... năm 20...</div>
                <div class="font-bold">Giám đốc</div>
                <div class="text-slate-400 text-[9px] mt-0.5">(Ký, đóng dấu, họ tên)</div>
                <div class="h-12"></div>
                <div class="w-24 border-b border-dashed border-slate-300 mx-auto mt-6"></div>
              </div>
            </div>
          </div>
          
          <div class="mt-4 flex justify-between text-[10px] text-slate-400 border-t border-slate-200 pt-2 italic">
            <span>Hệ thống Xác thực & Truy xuất Nguồn gốc TrustID</span>
            <span>Trang {{ pageIdx + 1 }} / {{ printPages.length }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from 'vue';
import { DataLine, Search, Download, Box, House, Document, Collection } from '@element-plus/icons-vue';
import { reportApi } from '../api/reportApi';
import { transportApi } from '../api/transportApi';
import { useAuthStore } from '@/modules/core/store/auth';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import InventoryLedgerDialog from '../components/InventoryLedgerDialog.vue';
import type { TableColumnCtx } from 'element-plus';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';

const loading = ref(false);
const exporting = ref(false);
const warehouses = ref<any[]>([]);
const tableData = ref<any[]>([]);
const printPages = ref<any[][]>([]);
const printPageRefs = ref<HTMLElement[]>([]);
const hideZeroRows = ref(true);


const authStore = useAuthStore();

const dateRange = ref<[Date, Date]>([
  dayjs().startOf('month').toDate(),
  dayjs().endOf('day').toDate()
]);

const filter = reactive({
  warehouseId: '',
  productId: '',
  fromDate: dayjs().startOf('month').toISOString(),
  toDate: dayjs().endOf('day').toISOString()
});

const ledgerDialogRef = ref<InstanceType<typeof InventoryLedgerDialog> | null>(null);

const handleDateChange = (val: [Date, Date]) => {
  if (val && val.length === 2) {
    filter.fromDate = dayjs(val[0]).startOf('day').toISOString();
    filter.toDate = dayjs(val[1]).endOf('day').toISOString();
  }
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('vi-VN').format(num || 0);
};

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '';
  return dayjs(dateStr).format('DD/MM/YYYY');
};

const getWarehouseName = (id: string) => {
  if (!id) return 'Tất cả các kho';
  const wh = warehouses.value.find(w => w.id === id);
  return wh ? wh.name : 'Không xác định';
};

// Row styling function to highlight and make product summary rows bold
const tableRowClassName = ({ row }: { row: any }) => {
  if (row.isProductGroup) {
    return 'product-group-row cursor-pointer';
  }
  return '';
};

// Compute unique products from response data for dropdown filter
const products = computed(() => {
  const map = new Map();
  tableData.value.forEach(item => {
    if (item.productId && !map.has(item.productId)) {
      map.set(item.productId, item.productName || 'Sản phẩm không xác định');
    }
  });
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
});

// Group data by product with product and zero-row filtering applied
const groupedTableData = computed(() => {
  const groups: { [key: string]: any } = {};
  
  tableData.value.forEach(item => {
    // 1. Filter by product if selected
    if (filter.productId && item.productId !== filter.productId) {
      return;
    }
    
    // 2. Filter zero rows if enabled
    const isZero = Number(item.openingBalance || 0) === 0 &&
                   Number(item.inbound || 0) === 0 &&
                   Number(item.outbound || 0) === 0 &&
                   Number(item.recallInbound || 0) === 0 &&
                   Number(item.disposed || 0) === 0 &&
                   Number(item.recalledCount || 0) === 0 &&
                   Number(item.closingBalance || 0) === 0;

    if (hideZeroRows.value && isZero) {
      return;
    }
    
    const prodId = item.productId || 'unknown';
    if (!groups[prodId]) {
      groups[prodId] = {
        id: `prod_${prodId}`,
        isProductGroup: true,
        productId: prodId,
        productName: item.productName || 'Sản phẩm không xác định',
        gtinCode: item.gtinCode || '',
        openingBalance: 0,
        inbound: 0,
        outbound: 0,
        recallInbound: 0,
        disposed: 0,
        recalledCount: 0,
        closingBalance: 0,
        children: []
      };
    }
    
    // Accumulate sums for parent row
    groups[prodId].openingBalance += Number(item.openingBalance || 0);
    groups[prodId].inbound += Number(item.inbound || 0);
    groups[prodId].outbound += Number(item.outbound || 0);
    groups[prodId].recallInbound += Number(item.recallInbound || 0);
    groups[prodId].disposed += Number(item.disposed || 0);
    groups[prodId].recalledCount += Number(item.recalledCount || 0);
    groups[prodId].closingBalance += Number(item.closingBalance || 0);
    
    // Push child row
    groups[prodId].children.push({
      id: `child_${item.batchId}_${item.warehouseId}`,
      isProductGroup: false,
      productId: prodId,
      productName: item.productName || '',
      gtinCode: item.gtinCode || '',
      batchCode: item.batchCode || '',
      warehouseName: item.warehouseName || '',
      warehouseId: item.warehouseId,
      batchId: item.batchId,
      openingBalance: Number(item.openingBalance || 0),
      inbound: Number(item.inbound || 0),
      outbound: Number(item.outbound || 0),
      recallInbound: Number(item.recallInbound || 0),
      disposed: Number(item.disposed || 0),
      recalledCount: Number(item.recalledCount || 0),
      closingBalance: Number(item.closingBalance || 0)
    });
  });
  
  const result = Object.values(groups);
  result.forEach((group: any, groupIdx: number) => {
    group.stt = groupIdx + 1;
  });
  return result;
});

// Pagination State
const currentPage = ref(1);
const pageSize = ref(20);

const totalProducts = computed(() => groupedTableData.value.length);

const paginatedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return groupedTableData.value.slice(start, end);
});

const handlePageChange = (val: number) => {
  currentPage.value = val;
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
};

// Reset page when dataset changes
watch(groupedTableData, () => {
  currentPage.value = 1;
});

const reportTableRef = ref<any>(null);

const handleRowClick = (row: any) => {
  if (row.isProductGroup && reportTableRef.value) {
    reportTableRef.value.toggleRowExpansion(row);
  }
};


// Calculate summaries dynamically over currently visible (filtered) rows
const getSummaries = (param: { columns: TableColumnCtx<any>[]; data: any[] }) => {
  const { columns } = param;
  const sums: string[] = [];
  
  const visibleDetailRows: any[] = [];
  groupedTableData.value.forEach(group => {
    visibleDetailRows.push(...group.children);
  });
  
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '';
      return;
    }
    if (index === 1) {
      sums[index] = 'TỔNG CỘNG';
      return;
    }
    
    // summable columns
    if (['openingBalance', 'inbound', 'outbound', 'recallInbound', 'disposed', 'recalledCount', 'closingBalance'].includes(column.property)) {
      const values = visibleDetailRows.map(item => Number(item[column.property]));
      if (!values.every(value => Number.isNaN(value))) {
        const sum = values.reduce((prev, curr) => {
          const value = Number(curr);
          if (!Number.isNaN(value)) {
            return prev + curr;
          } else {
            return prev;
          }
        }, 0);
        sums[index] = formatNumber(sum);
      } else {
        sums[index] = '';
      }
    } else {
      sums[index] = '';
    }
  });

  return sums;
};

const fetchWarehouses = async () => {
  try {
    const res = await transportApi.getWarehouses();
    warehouses.value = res.data || [];
  } catch (e) {
    console.error('Failed to load warehouses', e);
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await reportApi.getInventorySummary(filter);
    tableData.value = res.data;
  } catch (error) {
    ElMessage.error('Lỗi tải dữ liệu báo cáo');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const viewLedger = (row: any) => {
  if (ledgerDialogRef.value) {
    ledgerDialogRef.value.open(
      row.warehouseId,
      row.batchId,
      filter.fromDate,
      filter.toDate,
      {
        batchCode: row.batchCode,
        productName: row.productName,
        warehouseName: row.warehouseName
      }
    );
  }
};

// Prepare flat data chunked into pages for printing/PDF using filtered visible set
const preparePrintData = () => {
  const flatRows: any[] = [];
  
  groupedTableData.value.forEach(prodGroup => {
    flatRows.push({
      id: prodGroup.id,
      isProductGroup: true,
      stt: prodGroup.stt,
      productName: prodGroup.productName,
      gtinCode: prodGroup.gtinCode,
      openingBalance: prodGroup.openingBalance,
      inbound: prodGroup.inbound,
      outbound: prodGroup.outbound,
      recallInbound: prodGroup.recallInbound,
      disposed: prodGroup.disposed,
      recalledCount: prodGroup.recalledCount,
      closingBalance: prodGroup.closingBalance
    });
    
    prodGroup.children.forEach((child: any) => {
      flatRows.push({
        id: child.id,
        isProductGroup: false,
        stt: '',
        batchCode: child.batchCode,
        warehouseName: child.warehouseName,
        openingBalance: child.openingBalance,
        inbound: child.inbound,
        outbound: child.outbound,
        recallInbound: child.recallInbound,
        disposed: child.disposed,
        recalledCount: child.recalledCount,
        closingBalance: child.closingBalance
      });
    });
  });
  
  // Total Row over visible set
  const totalRow = {
    id: 'total_row',
    isTotalRow: true,
    openingBalance: 0,
    inbound: 0,
    outbound: 0,
    recallInbound: 0,
    disposed: 0,
    recalledCount: 0,
    closingBalance: 0
  };
  
  groupedTableData.value.forEach(prodGroup => {
    totalRow.openingBalance += prodGroup.openingBalance;
    totalRow.inbound += prodGroup.inbound;
    totalRow.outbound += prodGroup.outbound;
    totalRow.recallInbound += prodGroup.recallInbound;
    totalRow.disposed += prodGroup.disposed;
    totalRow.recalledCount += prodGroup.recalledCount;
    totalRow.closingBalance += prodGroup.closingBalance;
  });
  
  flatRows.push(totalRow);
  
  // Chunking
  const pages: any[][] = [];
  let currentPage: any[] = [];
  let limit = 8;
  
  for (let i = 0; i < flatRows.length; i++) {
    currentPage.push(flatRows[i]);
    if (currentPage.length === limit || i === flatRows.length - 1) {
      pages.push(currentPage);
      currentPage = [];
      limit = 12;
    }
  }
  
  printPages.value = pages;
};

// Export to PDF using html2canvas & jsPDF
const exportPDF = async () => {
  exporting.value = true;
  printPageRefs.value = [];
  
  try {
    preparePrintData();
    // Wait for Vue to render the hidden elements
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = 297;
    const pdfHeight = 210;
    
    for (let i = 0; i < printPages.value.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      
      const el = printPageRefs.value[i];
      if (!el) continue;
      
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }
    
    const dateStr = dayjs().format('YYYYMMDD');
    pdf.save(`BaoCao_XuatNhapTon_${dateStr}.pdf`);
    ElMessage.success('Tải báo cáo PDF thành công!');
  } catch (error) {
    console.error('Export PDF error:', error);
    ElMessage.error('Lỗi khi xuất PDF');
  } finally {
    exporting.value = false;
  }
};

// Export to Excel using client-side ExcelJS generating pure OpenXML workbook
const exportExcel = async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo Xuất Nhập Tồn');

    // Enable gridlines
    worksheet.views = [{ showGridLines: true }];

    // Set Column widths
    worksheet.columns = [
      { key: 'stt', width: 6 },
      { key: 'name', width: 35 },
      { key: 'warehouse', width: 22 },
      { key: 'opening', width: 15 },
      { key: 'inbound', width: 15 },
      { key: 'recallInbound', width: 15 },
      { key: 'outbound', width: 15 },
      { key: 'disposed', width: 12 },
      { key: 'closing', width: 15 }
    ];

    // Style helper definitions
    const fontTimes = { name: 'Times New Roman', size: 11 };
    const fontTimesBold = { name: 'Times New Roman', size: 11, bold: true };
    const fontTitle = { name: 'Times New Roman', size: 16, bold: true };
    const borderThin = {
      top: { style: 'thin' as const, color: { argb: 'D1D5DB' } },
      left: { style: 'thin' as const, color: { argb: 'D1D5DB' } },
      bottom: { style: 'thin' as const, color: { argb: 'D1D5DB' } },
      right: { style: 'thin' as const, color: { argb: 'D1D5DB' } }
    };

    // Row 1: ĐƠN VỊ
    const row1 = worksheet.addRow([`ĐƠN VỊ: ${authStore.user?.tenant_name || 'HỆ THỐNG TRUSTID'}`]);
    row1.getCell(1).font = fontTimesBold;
    worksheet.mergeCells('A1:C1');

    // Row 2: Subtitle / Form Template
    const row2 = worksheet.addRow(['Hệ thống Xác thực & Truy xuất Nguồn gốc', '', '', '', '', '', '', '', 'Mẫu số S21-DN']);
    row2.getCell(1).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '4B5563' } };
    row2.getCell(9).font = { name: 'Times New Roman', size: 9, italic: true };
    row2.getCell(9).alignment = { horizontal: 'right' };
    worksheet.mergeCells('A2:C2');
    
    // Empty row
    worksheet.addRow([]);

    // Row 4: Title
    const rowTitle = worksheet.addRow(['BÁO CÁO XUẤT NHẬP TỒN KHO']);
    rowTitle.getCell(1).font = fontTitle;
    rowTitle.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A4:I4');

    // Row 5: Period
    const rowPeriod = worksheet.addRow([`Kỳ báo cáo: Từ ngày ${dayjs(filter.fromDate).format('DD/MM/YYYY')} đến ngày ${dayjs(filter.toDate).format('DD/MM/YYYY')}`]);
    rowPeriod.getCell(1).font = { name: 'Times New Roman', size: 11, italic: true };
    rowPeriod.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A5:I5');

    // Row 6: Warehouse filter
    const rowWh = worksheet.addRow([`Kho: ${getWarehouseName(filter.warehouseId)}`]);
    rowWh.getCell(1).font = { name: 'Times New Roman', size: 11, italic: true };
    rowWh.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A6:I6');

    // Empty row
    worksheet.addRow([]);

    // Table Header Row
    const headerRow = worksheet.addRow([
      'STT',
      'Sản phẩm / Lô',
      'Kho',
      'Tồn đầu kỳ',
      'Nhập trong kỳ',
      'Nhập thu hồi',
      'Xuất trong kỳ',
      'Xuất hủy',
      'Tồn cuối kỳ'
    ]);
    
    headerRow.eachCell((cell) => {
      cell.font = fontTimesBold;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F1F5F9' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = borderThin;
    });

    groupedTableData.value.forEach(prodGroup => {
      // Product Summary Row
      const pRow = worksheet.addRow([
        prodGroup.stt,
        `${prodGroup.productName} ${prodGroup.gtinCode ? '(' + prodGroup.gtinCode + ')' : ''}`,
        '',
        prodGroup.openingBalance,
        prodGroup.inbound,
        prodGroup.recallInbound,
        prodGroup.outbound,
        prodGroup.disposed,
        prodGroup.closingBalance
      ]);

      pRow.eachCell((cell, colNumber) => {
        cell.font = fontTimesBold;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8FAFC' }
        };
        cell.border = borderThin;
        
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center' };
        } else if (colNumber >= 4) {
          cell.alignment = { horizontal: 'right' };
          cell.numFmt = '#,##0';
        } else if (colNumber === 2) {
          cell.alignment = { horizontal: 'left' };
        }
      });

      // Children Detail Rows
      prodGroup.children.forEach((child: any) => {
        const cRow = worksheet.addRow([
          '',
          `Lô: ${child.batchCode}`,
          child.warehouseName,
          child.openingBalance,
          child.inbound,
          child.recallInbound,
          child.outbound,
          child.disposed,
          child.closingBalance
        ]);

        cRow.eachCell((cell, colNumber) => {
          cell.font = fontTimes;
          cell.border = borderThin;
          
          if (colNumber === 1) {
            cell.alignment = { horizontal: 'center' };
          } else if (colNumber >= 4) {
            cell.alignment = { horizontal: 'right' };
            cell.numFmt = '#,##0';
          } else {
            cell.alignment = { horizontal: 'left' };
          }
        });
      });
    });

    // Grand Totals Row
    const totals = {
      openingBalance: 0,
      inbound: 0,
      outbound: 0,
      recallInbound: 0,
      disposed: 0,
      closingBalance: 0
    };
    
    groupedTableData.value.forEach(prodGroup => {
      totals.openingBalance += prodGroup.openingBalance;
      totals.inbound += prodGroup.inbound;
      totals.outbound += prodGroup.outbound;
      totals.recallInbound += prodGroup.recallInbound;
      totals.disposed += prodGroup.disposed;
      totals.closingBalance += prodGroup.closingBalance;
    });

    const totalRow = worksheet.addRow([
      '',
      'TỔNG CỘNG',
      '',
      totals.openingBalance,
      totals.inbound,
      totals.recallInbound,
      totals.outbound,
      totals.disposed,
      totals.closingBalance
    ]);

    totalRow.eachCell((cell, colNumber) => {
      cell.font = fontTimesBold;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E2E8F0' }
      };
      cell.border = borderThin;
      
      if (colNumber >= 4) {
        cell.alignment = { horizontal: 'right' };
        cell.numFmt = '#,##0';
      } else if (colNumber === 2) {
        cell.alignment = { horizontal: 'left' };
      }
    });

    // Empty row before signatures
    worksheet.addRow([]);

    // Signatures
    const sigRow1 = worksheet.addRow([
      'Người lập biểu', '', '',
      'Thủ kho', '', '',
      `Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}`
    ]);
    sigRow1.getCell(1).font = fontTimesBold;
    sigRow1.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells(sigRow1.number, 1, sigRow1.number, 3);

    sigRow1.getCell(4).font = fontTimesBold;
    sigRow1.getCell(4).alignment = { horizontal: 'center' };
    worksheet.mergeCells(sigRow1.number, 4, sigRow1.number, 6);

    sigRow1.getCell(7).font = { name: 'Times New Roman', size: 11, italic: true };
    sigRow1.getCell(7).alignment = { horizontal: 'center' };
    worksheet.mergeCells(sigRow1.number, 7, sigRow1.number, 9);

    const sigRow2 = worksheet.addRow([
      '(Ký, họ tên)', '', '',
      '(Ký, họ tên)', '', '',
      'Giám đốc'
    ]);
    sigRow2.getCell(1).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '4B5563' } };
    sigRow2.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells(sigRow2.number, 1, sigRow2.number, 3);

    sigRow2.getCell(4).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '4B5563' } };
    sigRow2.getCell(4).alignment = { horizontal: 'center' };
    worksheet.mergeCells(sigRow2.number, 4, sigRow2.number, 6);

    sigRow2.getCell(7).font = fontTimesBold;
    sigRow2.getCell(7).alignment = { horizontal: 'center' };
    worksheet.mergeCells(sigRow2.number, 7, sigRow2.number, 9);

    const sigRow3 = worksheet.addRow([
      '', '', '',
      '', '', '',
      '(Ký, đóng dấu, họ tên)'
    ]);
    sigRow3.getCell(7).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '4B5563' } };
    sigRow3.getCell(7).alignment = { horizontal: 'center' };
    worksheet.mergeCells(sigRow3.number, 7, sigRow3.number, 9);

    // Let's add spacing for the actual signatures
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Signature names row
    const sigRowNames = worksheet.addRow([
      authStore.user?.fullName || '', '', '',
      '', '', '',
      ''
    ]);
    sigRowNames.getCell(1).font = fontTimesBold;
    sigRowNames.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells(sigRowNames.number, 1, sigRowNames.number, 3);

    // Write to buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BaoCao_XuatNhapTon_${dayjs().format('YYYYMMDD')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    ElMessage.success('Xuất file Excel thành công!');
  } catch (error) {
    console.error('Export Excel error:', error);
    ElMessage.error('Lỗi khi xuất file Excel');
  }
};

onMounted(() => {
  fetchWarehouses();
  fetchData();
});
</script>

<style scoped>
/* Compressing Padding for Compact Screen Presentation */
:deep(.el-table .el-table__cell) {
  padding: 4px 0 !important;
}
:deep(.el-table--small .el-table__cell) {
  padding: 4px 0 !important;
  font-size: 11px;
}
:deep(.el-card__body) {
  padding: 12px 16px !important;
}

/* Make the bottom grand totals row extremely prominent and bold */
:deep(.el-table__footer-wrapper td.el-table__cell),
:deep(.el-table__footer td.el-table__cell),
:deep(.el-table__footer-wrapper td),
:deep(.el-table__footer td) {
  font-weight: bold !important;
  font-size: 13.5px !important;
  background-color: #cbd5e1 !important; /* dark prominent background */
  color: #0f172a !important;
}

/* Make product group summary rows prominent and bold */
:deep(.el-table .product-group-row) {
  background-color: #f1f5f9 !important;
  font-weight: bold !important;
  color: #0f172a !important;
}
:deep(.el-table .product-group-row td.el-table__cell) {
  font-size: 12.5px !important;
  font-weight: bold !important;
}

/* Allow headers to wrap to save horizontal width */
:deep(.el-table th.el-table__cell > .cell) {
  white-space: normal !important;
  line-height: 1.2 !important;
  padding: 0 4px !important;
  font-size: 11px;
}

/* Accounting Report Print Styles */
.print-page {
  width: 297mm;
  height: 210mm;
  background-color: #ffffff;
  color: #1e293b;
  padding: 15mm 20mm;
  box-sizing: border-box;
  font-family: 'Times New Roman', Times, serif;
}
.print-header {
  border-bottom: 2px double #475569;
  padding-bottom: 8px;
  margin-bottom: 10px;
}
.header-company {
  font-size: 12px;
  font-weight: bold;
}
.print-title {
  font-size: 20px;
  font-weight: bold;
  letter-spacing: 0.5px;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
.print-table th {
  background-color: #f8fafc;
  color: #1e293b;
  font-weight: bold;
  font-size: 11px;
  padding: 6px 8px;
  border: 1px solid #94a3b8;
  text-transform: uppercase;
}
.print-table td {
  padding: 6px 8px;
  font-size: 11px;
  border: 1px solid #cbd5e1;
  color: #334155;
}
.print-table tr.total-row td {
  background-color: #f1f5f9;
  border-top: 1px solid #475569;
  border-bottom: 2px double #475569;
}
</style>
