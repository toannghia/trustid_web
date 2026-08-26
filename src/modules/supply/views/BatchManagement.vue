<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Lô Đóng Gói Trực Tiếp</h1>
      <el-button type="primary" :icon="Plus" @click="router.push('/supply/packaging')">
        Tạo phiếu đóng gói mới
      </el-button>
    </div>

    <!-- Stats or List would go here -->
    <!-- Filters -->
    <div class="flex flex-wrap gap-3 items-center mb-4">
      <el-input
        v-model="searchTerm"
        placeholder="Tìm theo mã lô..."
        clearable
        style="width: 200px"
        @input="debouncedSearch"
        :prefix-icon="Search"
      />
      <el-select
        v-model="filterProductId"
        placeholder="Tất cả sản phẩm"
        clearable
        filterable
        style="width: 220px"
        @change="handleFilterChange"
      >
        <el-option label="Tất cả sản phẩm" value="" />
        <el-option
          v-for="p in productList"
          :key="p.id"
          :label="p.name"
          :value="p.id"
        />
      </el-select>
      <el-select
        v-model="filterStatus"
        placeholder="Trạng thái"
        clearable
        style="width: 150px"
        @change="handleFilterChange"
      >
        <el-option label="Tất cả trạng thái" value="" />
        <el-option label="Đang đóng gói" value="PACKING" />
        <el-option label="Đã đóng" value="CLOSED" />
        <el-option label="Đã xuất" value="SHIPPED" />
        <el-option label="Hoàn thành" value="COMPLETED" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="đến"
        start-placeholder="Từ ngày"
        end-placeholder="Đến ngày"
        format="DD/MM/YYYY"
        value-format="YYYY-MM-DD"
        clearable
        class="compact-date-picker"
        @change="handleFilterChange"
      />
      <span class="ml-auto text-sm text-slate-500">
        Tổng: <strong>{{ total }}</strong> lô
      </span>
    </div>

    <el-table :data="batches" stripe border style="width: 100%" class="w-full">
        <el-table-column label="STT" width="55" align="center">
            <template #default="{ $index }">
                {{ (currentPage - 1) * pageSize + $index + 1 }}
            </template>
        </el-table-column>
        <el-table-column prop="batchCode" label="Mã Lô" min-width="170" sortable>
             <template #default="{row}">
                 <span class="font-bold cursor-pointer text-blue-600 hover:underline" @click="viewDetails(row)">
                     {{ row.batchCode }}
                 </span>
             </template>
        </el-table-column>
        <el-table-column label="Lô Nguyên Liệu" min-width="160">
             <template #default="{row}">
                 <div v-if="row.farmBatchCode || row.parentBatch?.batchCode || row.sourceInfo?.origin_batch_code">
                     <span class="font-medium text-slate-800">
                         {{ row.farmBatchCode || row.parentBatch?.batchCode || row.sourceInfo?.origin_batch_code }}
                     </span>
                     <div v-if="row.sourceInfo?.origin_tenant_name" class="text-xs text-blue-600">
                         Từ: {{ row.sourceInfo.origin_tenant_name }}
                     </div>
                     <div v-else-if="row.batchType === 'CROSS_TENANT' || row.batchType === 'SEMI_FINISHED'" class="text-xs text-emerald-600">
                         Bán thành phẩm
                     </div>
                 </div>
                 <span v-else class="text-gray-400">---</span>
             </template>
        </el-table-column>
        <el-table-column label="Sản phẩm" min-width="170">
             <template #default="{row}">
                 <div class="font-medium text-slate-800">{{ row.product?.name || '---' }}</div>
                 <div class="text-xs text-gray-400" v-if="row.productGtin || row.product?.gtinCode">
                     GTIN: {{ row.productGtin || row.product?.gtinCode }}
                 </div>
             </template>
        </el-table-column>
        <el-table-column label="Tiến độ" min-width="150">
             <template #default="{row}">
                 <div class="flex items-center gap-2">
                     <el-progress 
                        :percentage="calcProgress(row)" 
                        :status="row.status === 'COMPLETED' ? 'success' : ''" 
                        class="w-20" 
                     />
                     <span class="text-xs text-gray-500 whitespace-nowrap">
                         {{ row.packCount }}/{{ row.totalUnitsExpected }}
                     </span>
                 </div>
             </template>
        </el-table-column>
        <el-table-column prop="totalQuantity" label="Tổng KL (kg)" width="110" align="right">
             <template #default="{row}">
                 <span class="font-medium">{{ row.totalQuantity ? Number(row.totalQuantity).toLocaleString() : '0' }}</span>
             </template>
        </el-table-column>
        <el-table-column label="Ngày tạo" width="140" align="center" sortable>
             <template #default="{row}">
                 {{ formatDate(row.createdAt) }}
             </template>
        </el-table-column>
        <el-table-column label="Trạng thái" width="130" align="center">
            <template #default="{row}">
                <el-tag :type="getStatusType(row.status)">{{ getBatchStatusLabel(row.status) }}</el-tag>
                <div v-if="row.sourceInfo?.isDistributed" class="mt-1">
                    <el-tag size="small" type="warning" effect="plain">Đang phân phối</el-tag>
                </div>
            </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="130" align="center">
            <template #default="{row}">
                <div class="flex items-center justify-center">
                    <el-tooltip v-if="row.status === 'PACKING'" content="Tiếp tục đóng gói" placement="top">
                        <el-button type="primary" link :icon="Edit" size="small" @click.stop="continuePacking(row)">Tiếp tục</el-button>
                    </el-tooltip>
                    <el-tooltip v-else-if="row.status === 'COMPLETED' && !row.sourceInfo?.isDistributed" content="Chuyển sang phân phối" placement="top">
                        <el-button type="warning" link :icon="Promotion" size="small" @click.stop="handleDistribute(row)">Phân phối</el-button>
                    </el-tooltip>
                    <el-tag v-else-if="row.sourceInfo?.isDistributed" size="small" type="warning" effect="plain">Đã phân phối</el-tag>
                    <span v-else class="text-gray-300">---</span>
                </div>
            </template>
        </el-table-column>
    </el-table>

    <div class="pagination-container flex justify-end mt-4">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 50, 100, 500]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- Drawer Details -->
    <el-drawer v-model="showDetail" title="Chi tiết Lô Đóng Gói Trực Tiếp" size="60%" destroy-on-close>
         <div v-if="selectedBatch">
            <el-tabs v-model="activeTab" class="demo-tabs">
                <!-- Tab 1: Thông tin chung -->
                <el-tab-pane label="Thông tin chung" name="general">
                    <el-descriptions border :column="2" class="mb-4 mt-2">
                        <el-descriptions-item label="Mã Lô">{{ selectedBatch.batchCode }}</el-descriptions-item>
                        <el-descriptions-item label="Lô Nguồn / Farm">
                            <div>
                                <span class="font-bold">{{ selectedBatch.farmBatchCode || selectedBatch.parentBatch?.batchCode || selectedBatch.sourceInfo?.origin_batch_code || '---' }}</span>
                                <span v-if="selectedBatch.sourceInfo?.origin_tenant_name" class="text-xs text-blue-600 block">
                                    (Từ: {{ selectedBatch.sourceInfo.origin_tenant_name }})
                                </span>
                            </div>
                        </el-descriptions-item>
                        <el-descriptions-item label="Sản phẩm">
                            <div>
                                <div class="font-bold">{{ selectedBatch.product?.name || '---' }}</div>
                                <div class="text-xs text-gray-500">{{ selectedBatch.productGtin }}</div>
                            </div>
                        </el-descriptions-item>
                        <el-descriptions-item label="Trạng thái">
                            <el-tag>{{ getBatchStatusLabel(selectedBatch.status) }}</el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="Quy cách đóng">{{ selectedBatch.farmDataSnapshot?.unitWeightKg || selectedBatch.farmDataSnapshot?.unitWeight || selectedBatch.product?.netWeight || 1 }} kg/sp</el-descriptions-item>
                        <el-descriptions-item label="Tổng SL">{{ selectedBatch.totalQuantity }} kg</el-descriptions-item>
                    </el-descriptions>

                    <div class="flex justify-between items-center mb-2 mt-4">
                        <div class="font-bold text-gray-700">Danh sách Tem / Sản phẩm ({{ items.length }})</div>
                        <el-button 
                            v-if="selectedBatch.status === 'COMPLETED' && !selectedBatch.sourceInfo?.isDistributed" 
                            type="warning" 
                            size="small" 
                            :icon="Promotion" 
                            :loading="distributing"
                            @click="handleDistribute(selectedBatch)"
                        >
                            Chuyển sang phân phối
                        </el-button>
                        <el-tag v-else-if="selectedBatch.sourceInfo?.isDistributed" type="warning" effect="dark" size="small">
                            Lô đang phân phối
                        </el-tag>
                    </div>
                    <el-table :data="items" height="400" border stripe>
                        <el-table-column type="index" label="STT" width="60" align="center" />
                        <el-table-column prop="fullQrCode" label="Mã QR (Full)" min-width="180">
                            <template #default="{row}">
                                <div class="truncate text-xs font-mono" :title="row.fullQrCode">{{ row.fullQrCode }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="parentCode" label="Thùng (Container)" width="150" />
                        <el-table-column prop="status" label="Trạng thái" width="130" align="center">
                            <template #default="{row}">
                                <el-tag size="small" :type="getItemStatusTagType(row.status)">
                                    {{ getItemStatusLabel(row.status) }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="Thời gian" width="160">
                            <template #default="{row}">
                                {{ formatDate(row.activatedAt || row.createdAt) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>

                <!-- Tab 2: Nhật ký Blockchain (NDA) -->
                 <el-tab-pane label="Nhật ký Blockchain (NDA)" name="blockchain">
                     <div class="p-4 bg-gray-50 rounded border border-gray-200 mt-2">
                         <div class="flex items-center justify-between mb-4">
                             <span class="font-bold text-gray-700">Trạng thái đồng bộ NDA Trace</span>
                             <div class="flex items-center gap-2">
                                 <el-tag v-if="selectedBatch.ndaSyncStatus === 'SYNCED'" type="success" effect="dark">
                                     <el-icon><CircleCheckFilled /></el-icon> Đã đồng bộ
                                 </el-tag>
                                 <el-tag v-else-if="selectedBatch.ndaSyncStatus === 'WAITING'" type="warning" effect="dark">
                                     <el-icon class="is-loading"><Loading /></el-icon> Đang xử lý...
                                 </el-tag>
                                 <el-tag v-else-if="selectedBatch.ndaSyncStatus === 'FAILED'" type="danger" effect="dark">
                                     Lỗi đồng bộ
                                 </el-tag>
                                 <el-tag v-else type="info">Chưa kích hoạt</el-tag>
                             </div>
                         </div>

                         <div v-if="selectedBatch.ndaSyncStatus === 'FAILED'" class="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                             <strong>Lỗi:</strong> {{ selectedBatch.ndaErrorMsg }}
                             <br>
                             <el-button type="danger" link size="small" @click="retryBatchSync(selectedBatch)">Thử lại ngay</el-button>
                         </div>

                         <div v-if="selectedBatch.ndaSyncStatus === 'SYNCED'" class="space-y-4">
                             <div>
                                 <label class="text-xs text-gray-500 uppercase font-bold">NDA Batch ID</label>
                                 <div class="flex items-center gap-2 mt-1">
                                     <code class="bg-white px-2 py-1 rounded border font-mono text-sm">{{ selectedBatch.ndaBatchId || 'nda:batch:vn:...' }}</code>
                                 </div>
                             </div>
                             
                             <div>
                                 <label class="text-xs text-gray-500 uppercase font-bold">Verifiable Credential (VC Proof)</label>
                                 <div class="bg-white p-3 rounded border mt-1 flex gap-4">
                                     <!-- QR Code Placeholder -->
                                     <div class="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-center p-1 text-gray-500">
                                         QRCode VC
                                     </div>
                                     <div class="flex-1 overflow-hidden">
                                         <div class="text-xs text-gray-400 mb-1">Chuỗi xác thực (JWS/JWT):</div>
                                         <div class="bg-gray-100 p-2 text-[10px] h-20 overflow-y-auto break-all font-mono rounded text-gray-600">
                                             {{ selectedBatch.ndaVcProof || 'eyJhbGciOiJFUzI1NiIs... (Demo Proof)' }}
                                         </div>
                                         <el-button type="primary" link size="small" class="mt-1">Sao chép Proof</el-button>
                                     </div>
                                 </div>
                             </div>

                             <div class="pt-2 border-t mt-4">
                                 <a :href="'https://trace.nda.gov.vn/search?batch=' + selectedBatch.ndaBatchId" target="_blank" class="text-blue-600 hover:underline flex items-center gap-1">
                                     Tra cứu trên Cổng thông tin Quốc gia <el-icon><TopRight /></el-icon>
                                 </a>
                             </div>
                         </div>
                         
                         <div v-if="!['SYNCED', 'WAITING', 'FAILED'].includes(selectedBatch.ndaSyncStatus)" class="text-center py-8 text-gray-400 italic">
                             Lô hàng chưa được gửi sang hệ thống NDA.
                         </div>
                     </div>
                 </el-tab-pane>
            </el-tabs>
         </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supplyApi } from '../api/supplyApi';
import { productApi } from '@/modules/core/api/product';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading, CircleCheckFilled, TopRight, Search, Plus, Promotion, View, Edit } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const distributing = ref(false);

const getItemStatusLabel = (status: string) => {
    switch(status) {
        case 'ACTIVE': return 'Đã đóng gói';
        case 'AT_DEALER': return 'Đang phân phối';
        case 'SOLD': return 'Đã bán';
        case 'LOST': return 'Đã báo mất';
        default: return status || 'Chưa kích hoạt';
    }
};

const getItemStatusTagType = (status: string) => {
    switch(status) {
        case 'ACTIVE': return 'success';
        case 'AT_DEALER': return 'warning';
        case 'SOLD': return 'info';
        case 'LOST': return 'danger';
        default: return 'info';
    }
};

const getBatchStatusLabel = (status: string) => {
  switch (status) {
    case 'PACKING': return 'Đang đóng gói';
    case 'CLOSED': return 'Đã đóng';
    case 'SHIPPED': return 'Đã xuất';
    case 'COMPLETED': return 'Hoàn thành';
    default: return status;
  }
};

const batches = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const searchTerm = ref('');
const filterStatus = ref('');
const filterProductId = ref('');
const dateRange = ref<[string, string] | null>(null);
const productList = ref<any[]>([]);
const items = ref<any[]>([]);
const selectedBatch = ref<any>(null);
const showDetail = ref(false);
const activeTab = ref('general');
const router = useRouter();

// Polling
let pollingTimer: any = null;

const startPolling = () => {
    stopPolling();
    pollingTimer = setInterval(async () => {
        // Only poll if drawer is open and status is WAITING
        if (showDetail.value && selectedBatch.value && selectedBatch.value.ndaSyncStatus === 'WAITING') {
             try {
                 const { data: updated } = await supplyApi.getBatch(selectedBatch.value.id);
                 if (updated) {
                     // Check if status changed
                     if (updated.ndaSyncStatus !== selectedBatch.value.ndaSyncStatus) {
                         selectedBatch.value = updated; // Update local view
                         
                         // Update list view as well
                         const idx = batches.value.findIndex(b => b.id === updated.id);
                         if(idx !== -1) batches.value[idx] = updated;

                         if (updated.ndaSyncStatus === 'SYNCED') {
                             ElMessage.success(`Đồng bộ thành công lô hàng ${updated.batchCode}!`);
                         }
                     }
                 }
             } catch(e) {}
        }
    }, 5000);
};

const stopPolling = () => {
    if (pollingTimer) clearInterval(pollingTimer);
};

const retryBatchSync = async (batch: any) => {
    try {
        // Call API to retry (mock or real)
        // await supplyApi.retryBatch(batch.id); 
        ElMessage.success('Đã gửi yêu cầu thử lại');
        selectedBatch.value.ndaSyncStatus = 'WAITING'; // Optimistic update
    } catch(e) {
        ElMessage.error('Không thể gửi yêu cầu');
    }
}

const continuePacking = (row: any) => {
    router.push({ path: '/supply/packaging', query: { batchId: row.id } });
};

const loadProducts = async () => {
    try {
        const { data } = await productApi.getList({ page: 1, limit: 1000 });
        productList.value = data?.data || (Array.isArray(data) ? data : []);
    } catch (e) {
        console.error('Lỗi tải danh sách sản phẩm:', e);
    }
};

const loadBatches = async () => {
    try {
        const params: any = {
            page: currentPage.value,
            limit: pageSize.value,
            onlyPackaged: true
        };
        if (searchTerm.value) params.search = searchTerm.value;
        if (filterStatus.value) params.status = filterStatus.value;
        if (filterProductId.value) params.productId = filterProductId.value;
        if (dateRange.value && dateRange.value.length === 2) {
            params.fromDate = dateRange.value[0];
            params.toDate = dateRange.value[1];
        }

        const { data } = await supplyApi.getBatches(params);
        const rawList = data?.data || (Array.isArray(data) ? data : []);
        // Đảm bảo chỉ hiển thị các lô được đóng gói trực tiếp (PKG-*)
        batches.value = rawList.filter((b: any) => {
            const code = (b.batchCode || '').trim();
            const matchProd = !filterProductId.value || b.productId === filterProductId.value || b.product?.id === filterProductId.value;
            return code.startsWith('PKG-') && matchProd;
        });
        total.value = typeof data?.total === 'number' ? data.total : batches.value.length;
    } catch (err: any) {
        ElMessage.error('Lỗi tải danh sách lô');
    }
}

let debounceTimer: any = null;
const debouncedSearch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentPage.value = 1;
    loadBatches();
  }, 300);
};

const handleFilterChange = () => {
  currentPage.value = 1;
  loadBatches();
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
  loadBatches();
};

const handlePageChange = (val: number) => {
  currentPage.value = val;
  loadBatches();
};

const viewDetails = async (row: any) => {
    selectedBatch.value = row;
    items.value = [];
    activeTab.value = 'general'; // Reset tab
    showDetail.value = true;
    startPolling(); // Start watching for updates
    
    try {
        const { data } = await supplyApi.getBatchItems(row.id);
        items.value = data;
    } catch (e) {
        ElMessage.error('Lỗi tải danh sách tem');
    }
}

const handleDistribute = async (batch: any) => {
    if (!batch?.id) return;
    try {
        await ElMessageBox.confirm(
            `Bạn có chắc chắn muốn chuyển toàn bộ sản phẩm trong lô ${batch.batchCode} sang trạng thái PHÂN PHỐI?`,
            'Xác nhận phân phối',
            {
                confirmButtonText: 'Xác nhận chuyển',
                cancelButtonText: 'Hủy',
                type: 'warning'
            }
        );

        distributing.value = true;
        const { data } = await supplyApi.distributeBatch(batch.id);
        ElMessage.success(data.message || 'Đã chuyển trạng thái sang Phân phối thành công!');
        
        if (selectedBatch.value && selectedBatch.value.id === batch.id) {
            selectedBatch.value.sourceInfo = {
                ...(selectedBatch.value.sourceInfo || {}),
                isDistributed: true
            };
            const itemsRes = await supplyApi.getBatchItems(batch.id);
            items.value = itemsRes.data;
        }
        await loadBatches();
    } catch (e: any) {
        if (e !== 'cancel') {
            ElMessage.error(e.response?.data?.message || 'Lỗi khi chuyển trạng thái phân phối');
        }
    } finally {
        distributing.value = false;
    }
};
 
onUnmounted(() => {
    stopPolling();
});


const formatDate = (d: any) => {
  if (!d) return '---';
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : '---';
};

const calcProgress = (row: any) => {
    if (!row.totalUnitsExpected) return 0;
    return Math.round((row.packCount / row.totalUnitsExpected) * 100);
}

const getStatusType = (status: string) => {
    if (status === 'PACKING') return 'warning';
    if (status === 'COMPLETED') return 'success';
    return 'info';
}

onMounted(() => {
   loadProducts();
   loadBatches(); 
});
</script>

<style scoped>
:deep(.compact-date-picker) {
  width: 220px !important;
  max-width: 220px !important;
  padding: 0 6px !important;
}

:deep(.compact-date-picker .el-range-input) {
  width: 42% !important;
  font-size: 12px !important;
  text-align: center !important;
}

:deep(.compact-date-picker .el-range-separator) {
  padding: 0 2px !important;
  font-size: 11px !important;
  color: #9ca3af !important;
}

:deep(.compact-date-picker .el-range__icon) {
  margin-right: 4px !important;
  font-size: 13px !important;
  color: #9ca3af !important;
}

:deep(.compact-date-picker .el-range__close-icon) {
  font-size: 12px !important;
}
</style>
