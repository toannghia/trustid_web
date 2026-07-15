<template>
  <div class="p-6 space-y-6 w-full mx-auto pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between trustid-page-header">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-3" style="color: #0F2B46;">
          <div class="p-2.5 rounded-xl" style="background: #0F2B46;">
            <el-icon color="#fff" size="20"><Upload /></el-icon>
          </div>
          Xuất kho bán thành phẩm B2B
        </h1>
        <p class="text-gray-500 text-sm mt-1 ml-12">Chuyển giao lô bán thành phẩm cho đối tác/doanh nghiệp khác</p>
      </div>
      <el-button @click="router.back()" plain>Quay lại</el-button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Left Column -->
      <div class="lg:col-span-3 space-y-5">

        <!-- Phiếu Header Card -->
        <el-card shadow="never" class="!rounded-xl header-card" style="border: 1px solid #d1dce6; background: linear-gradient(135deg, #f0f4f8 0%, #e8eff5 100%);">
          <div class="flex flex-col md:flex-row justify-between gap-4">
            <div class="flex-1 min-w-0 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div class="flex items-center gap-1 min-w-0">
                   <span class="text-gray-500 whitespace-nowrap">Số phiếu:</span> 
                   <span class="font-bold truncate" style="color: #0F2B46;">{{ transferCode || '---' }}</span>
                </div>
                <div class="flex items-center gap-1">
                   <span class="text-gray-500 whitespace-nowrap">Ngày lập:</span> 
                   <span class="font-medium truncate">{{ currentDate }}</span>
                </div>
                <div class="flex items-center gap-1">
                   <span class="text-gray-500 whitespace-nowrap">Người lập:</span> 
                   <span class="font-medium truncate">{{ currentUser }}</span>
                </div>
                <div class="flex items-center gap-1">
                   <span class="text-gray-500 whitespace-nowrap">Kho xuất:</span>
                   <el-select v-model="warehouseId" filterable size="small" class="!w-40" placeholder="Chọn kho">
                     <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
                   </el-select>
                </div>
              </div>

              <!-- Đối tác nhận (Dropdown saved partners) -->
              <div class="flex flex-wrap items-center gap-2 pt-2" style="border-top: 1px solid #d1dce6;">
                <span class="text-sm text-gray-500 whitespace-nowrap">Đối tác nhận:</span>
                <el-select 
                  v-model="selectedPartnerId" 
                  filterable 
                  size="small" 
                  class="!w-56" 
                  placeholder="Chọn đối tác..."
                  clearable
                  @clear="handlePartnerClear"
                >
                  <el-option 
                    v-for="p in savedPartners" 
                    :key="p.id" 
                    :label="p.alias || p.partnerTenant?.name" 
                    :value="p.id"
                  >
                    <div class="flex justify-between items-center w-full gap-2">
                      <span class="font-semibold truncate flex-1">{{ p.alias || p.partnerTenant?.name }}</span>
                      <span class="text-gray-400 text-[11px] font-mono">{{ p.partnerTenant?.taxCode }}</span>
                      <el-icon 
                        class="text-gray-300 hover:text-red-500 cursor-pointer flex-shrink-0 transition-colors" 
                        @click.stop="removePartner(p)"
                        title="Xóa khỏi danh sách"
                      ><Delete /></el-icon>
                    </div>
                  </el-option>
                </el-select>
                <el-button size="small" icon="Plus" @click="showAddPartnerDialog = true" title="Thêm đối tác mới" style="background: #00875A; color: #fff; border: none;">Thêm</el-button>
                
                <div v-if="resolvedTenant" class="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">
                  <el-icon class="text-green-600"><CircleCheckFilled /></el-icon>
                  <span class="font-bold text-green-700 text-xs truncate max-w-[200px]">{{ resolvedTenant.name }}</span>
                </div>
              </div>
            </div>

            <!-- QR Section -->
            <div v-if="transferCode" class="flex flex-col items-center justify-center md:pl-6 pt-2 md:pt-0" style="border-left: 1px solid #d1dce6;">
              <div class="text-[9px] text-gray-400 mb-1 font-bold uppercase tracking-wider">QR Phiếu</div>
              <div class="qr-box p-1 bg-white rounded-lg shadow-sm" style="border: 1px solid #d1dce6;">
                <canvas ref="qrCanvas" class="w-16 h-16"></canvas>
              </div>
            </div>
          </div>
        </el-card>

        <!-- Scan Section -->
        <el-card shadow="never" class="!rounded-xl" style="border: 1px solid #d1dce6;">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-bold flex items-center gap-2" style="color: #0F2B46;">
              <el-icon><View /></el-icon> Quét mã QR xuất kho
            </div>
            <div class="scan-mode-toggle">
              <div 
                class="mode-item" 
                :class="{ active: scanMode === 'BATCH' }"
                @click="scanMode = 'BATCH'"
              >
                <el-icon class="mr-1"><Memo /></el-icon>
                Nguyên lô
              </div>
              <div 
                class="mode-item" 
                :class="{ active: scanMode === 'ITEM' }"
                @click="scanMode = 'ITEM'"
              >
                <el-icon class="mr-1"><Tickets /></el-icon>
                Từng bao
              </div>
              <div 
                class="mode-item" 
                :class="{ active: scanMode === 'PALLET' }"
                @click="scanMode = 'PALLET'"
              >
                📦 Pallet BTP
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <el-input v-model="scanInput" ref="scanInputRef" :placeholder="scanMode === 'PALLET' ? 'Quét mã pallet BTP...' : 'Quét mã QR sản phẩm...'" @keyup.enter="handleScan" class="flex-1">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button @click="handleScan" style="background: #00875A; color: #fff; border: none;">Xác nhận mã</el-button>
          </div>
          <div class="text-[10px] mt-2 italic" style="color: #0F2B46; opacity: 0.6;">
            * <b>Nguyên lô</b>: Quét 1 tem → thêm toàn bộ lô. * <b>Từng bao</b>: Quét bao nào xuất bao đó. * <b>Pallet BTP</b>: Quét pallet → xuất toàn bộ SP trong pallet.
          </div>
        </el-card>

        <!-- Add Batch Manual (Collapsed) -->
        <el-collapse class="!border-gray-200 !rounded-xl overflow-hidden">
          <el-collapse-item title="＋ Thêm lô thủ công" name="manual">
            <div class="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end p-2">
            <el-form-item label="Chọn lô bán thành phẩm" class="mb-0">
                <el-select v-model="newBatchId" filterable class="w-full" placeholder="Chỉ hiển thị lô còn tồn kho" @change="onBatchSelect">
                  <el-option v-for="b in completedSemiBatches" :key="b.id" :label="b.batchCode" :value="b.id">
                    <div class="flex justify-between items-center w-full gap-4">
                      <span class="font-bold">{{ b.batchCode }}</span>
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] text-gray-400">Tồn:</span>
                        <el-tag size="small" :type="b.availableQuantity > 0 ? 'success' : 'danger'">{{ b.availableQuantity }}kg</el-tag>
                      </div>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="Khối lượng (kg)" class="mb-0">
                <el-input-number v-model="newExpectedQty" :min="0" :max="maxAvailable" :step="0.1" class="!w-full" disabled />
              </el-form-item>
              <el-button type="primary" @click="addItem" :disabled="!newBatchId || newExpectedQty <= 0">Thêm</el-button>
            </div>
          </el-collapse-item>
        </el-collapse>

        <!-- Items Table -->
        <el-card v-if="form.items.length > 0" shadow="never" class="!border-gray-200 !rounded-xl">
          <div class="text-sm font-bold text-gray-700 mb-3">📦 Danh sách lô xuất ({{ form.items.length }} lô)</div>
          <el-table :data="form.items" border size="small" class="modern-table !rounded-lg overflow-hidden" show-summary :summary-method="getSummary">
            <el-table-column label="STT" type="index" width="45" align="center" />
            <el-table-column label="Mã lô" min-width="120">
              <template #default="{ row }">
                <div class="flex flex-col">
                  <span class="font-mono font-bold text-blue-600 text-xs">{{ getBatchCode(row.batch_id) }}</span>
                  <span v-if="row.serials?.length" class="text-[9px] text-green-600 font-bold">Đã quét {{ row.serials.length }} bao</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Sản phẩm" min-width="140">
              <template #default="{ row }">
                <div class="flex flex-col leading-tight">
                  <span class="font-medium text-xs">{{ getBatchInfo(row.batch_id)?.product?.name || '---' }}</span>
                  <span class="text-[9px] text-gray-400">{{ getBatchInfo(row.batch_id)?.productGtin }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="Ngày ĐG" width="100" align="center">
              <template #default="{ row }">
                <span class="text-[11px]">{{ formatDateSimple(getBatchInfo(row.batch_id)?.sourceInfo?.packaging_date) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Số bao" width="80" align="center">
              <template #default="{ row }">
                <span class="font-bold" style="color: #00875A;">{{ row.serials?.length || getBatchPackCount(row.batch_id) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="expected_quantity" label="K.Lượng (kg)" width="110" align="right">
              <template #default="{ row }">
                <span class="font-bold">{{ row.expected_quantity }} kg</span>
              </template>
            </el-table-column>
            <el-table-column label="" width="40" align="center">
              <template #default="{ $index }">
                <el-button type="danger" :icon="Delete" link size="small" @click="form.items.splice($index, 1)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- Notes + Submit -->
        <el-card shadow="never" class="!border-gray-200 !rounded-xl">
          <el-form-item label="Ghi chú chuyển giao" class="!mb-4">
            <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="Nhập ghi chú cho bên nhận (nếu có)..." />
          </el-form-item>
          <div class="flex justify-end gap-3">
            <template v-if="isFormEditable">
              <el-button v-if="!editingId || (editingId && currentStatus === 'DRAFT')" type="info" plain size="large" :loading="creating" :disabled="form.items.length === 0 || !resolvedTenant" @click="saveDraft">
                Lưu tạm
              </el-button>
              <el-button size="large" class="!px-8" :loading="creating" :disabled="form.items.length === 0 || !resolvedTenant" @click="createAndExport" style="background: #00875A; color: #fff; border: none; font-weight: 600;">
                Xác nhận xuất kho
              </el-button>
            </template>
            <template v-else>
              <el-tag :type="getTransferStatusType(currentStatus)" effect="dark" size="large" class="!mr-auto">{{ getTransferStatusLabel(currentStatus) }}</el-tag>
              <el-button size="large" class="!px-8" @click="resetForm" style="background: #0F2B46; color: #fff; border: none; font-weight: 600;">
                Đóng phiếu &amp; Tạo mới
              </el-button>
            </template>
          </div>
        </el-card>
      </div>

      <!-- Right Column: History + Guide -->
      <div class="space-y-6">
        <el-card shadow="never" class="!border-gray-200 !rounded-xl">
          <template #header>
            <div class="flex items-center gap-2 font-bold text-gray-700">
              <el-icon><Clock /></el-icon> Phiếu chuyển gần đây
            </div>
          </template>
          <div v-if="transfers.length === 0" class="py-8 text-center text-gray-400">
            <el-icon size="40" class="mb-2 opacity-20"><Files /></el-icon>
            <p>Chưa có phiếu chuyển nào</p>
          </div>
          <div v-else class="space-y-3">
            <div v-for="t in sortedTransfers" :key="t.id" 
              class="p-3 border rounded-lg transition-colors cursor-pointer group" 
              :class="editingId === t.id ? 'bg-[#f0f7f4]' : 'hover:border-gray-300'"
              :style="editingId === t.id ? 'border-color: #00875A' : ''"
              @click="loadTransferToForm(t)"
            >
              <div class="flex justify-between items-start mb-1">
                <span class="text-xs font-mono font-bold" :style="{ color: editingId === t.id ? '#00875A' : '#0F2B46' }">{{ t.transferCode || '#' + t.id.split('-')[0] }}</span>
                <el-tag size="small" :type="getTransferStatusType(t.status)">{{ getTransferStatusLabel(t.status) }}</el-tag>
              </div>
              <div class="text-[11px] text-gray-500 flex items-center justify-between">
                <span class="flex items-center gap-1"><el-icon><Calendar /></el-icon> {{ formatDate(t.createdAt) }}</span>
                <div class="flex items-center gap-2">
                  <el-button v-if="t.status === 'DRAFT' || t.status === 'PENDING'" type="danger" link size="small" @click.stop="cancelTransfer(t.id)" class="!p-0 !h-auto">
                    Hủy
                  </el-button>
                  <span v-if="editingId === t.id" style="color: #00875A;" class="font-bold text-[10px]">ĐANG MỞ</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="!rounded-xl" style="border: 1px solid #d1dce6; background: #f0f4f8;">
          <div class="flex items-center gap-3 mb-2" style="color: #0F2B46;">
            <el-icon size="20"><InfoFilled /></el-icon>
            <span class="font-bold">Hướng dẫn</span>
          </div>
          <ul class="text-xs space-y-2 list-disc pl-4" style="color: #3a5a7c;">
            <li>Chọn <b>đối tác</b> từ danh sách hoặc bấm <b>Thêm</b> để tra cứu MST.</li>
            <li>Quét QR hoặc thêm lô thủ công — khối lượng tự động.</li>
            <li>Sau khi xác nhận, phiếu QR sẽ được tạo để bên nhận quét.</li>
          </ul>
        </el-card>
      </div>
    </div>

    <!-- Detail Dialog -->
    <el-dialog v-model="detailVisible" title="Chi tiết phiếu chuyển giao" width="700px">
      <div v-if="selectedTransfer" class="space-y-4">
        <div class="flex justify-between items-center bg-gray-50 p-4 rounded-xl border">
          <div>
            <div class="text-xs text-gray-400 mb-1">SỐ PHIẾU</div>
            <div class="font-bold text-lg" style="color: #0F2B46;">{{ selectedTransfer.transferCode || '-' }}</div>
          </div>
          <el-tag :type="getTransferStatusType(selectedTransfer.status)" size="large" effect="dark">{{ getTransferStatusLabel(selectedTransfer.status) }}</el-tag>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="Ngày tạo">{{ formatDate(selectedTransfer.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="Ghi chú">{{ selectedTransfer.notes || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="font-bold text-gray-700 mt-4 mb-2">Danh sách lô hàng:</div>
        <el-table :data="selectedTransfer.items" border size="small">
          <el-table-column label="Mã lô">
            <template #default="{ row }">
              <span class="font-mono font-bold">{{ row.batch?.batchCode || row.batchId }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="expectedQuantity" label="K.Lượng dự kiến (kg)" width="150" align="right" />
          <el-table-column prop="receivedQuantity" label="K.Lượng thực nhận (kg)" width="150" align="right">
            <template #default="{ row }">
              <span :class="row.receivedQuantity ? 'text-green-600 font-bold' : 'text-gray-400'">{{ row.receivedQuantity || '-' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- Success Dialog with QR -->
    <el-dialog v-model="successVisible" title="Xuất kho thành công" width="400px" center :close-on-click-modal="false">
      <div class="flex flex-col items-center text-center space-y-4">
        <el-result icon="success" title="Đã lập phiếu xuất" sub-title="Bên nhận có thể quét mã này để nhập kho nhanh" />
        <div class="p-4 bg-white border-2 border-orange-200 rounded-2xl shadow-sm">
          <canvas ref="qrCanvasSuccess"></canvas>
          <div class="mt-2 font-mono font-bold text-orange-700 text-lg">{{ lastCreatedTransfer?.transferCode }}</div>
        </div>
        <div class="text-sm text-gray-500">
          Chụp ảnh hoặc in mã này gửi cho đối tác
        </div>
        <el-button type="primary" class="w-full" @click="successVisible = false">Hoàn tất</el-button>
      </div>
    </el-dialog>

    <!-- Dialog Thêm Đối tác B2B -->
    <el-dialog 
      v-model="showAddPartnerDialog" 
      title="Thêm đối tác B2B" 
      width="520px" 
      destroy-on-close 
      :close-on-click-modal="false"
    >
      <div class="space-y-4">
        <!-- Search input -->
        <div>
          <el-input 
            v-model="partnerSearchQuery" 
            placeholder="Tìm theo tên doanh nghiệp hoặc mã số thuế..." 
            @input="onPartnerSearchInput"
            clearable
            @clear="searchResults = []; lookedUpPartner = null;"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <div v-if="partnerSearchQuery && partnerSearchQuery.length < 3" class="text-[11px] text-gray-400 mt-1 ml-1">
            Nhập ít nhất 3 ký tự để tìm kiếm
          </div>
        </div>

        <!-- Search results list -->
        <div v-if="searchingPartner" class="text-center py-4 text-gray-400">
          <el-icon class="is-loading" size="20"><Loading /></el-icon>
          <span class="ml-2 text-sm">Đang tìm kiếm...</span>
        </div>

        <div v-else-if="searchResults.length > 0" class="max-h-[240px] overflow-y-auto space-y-2 pr-1">
          <div 
            v-for="t in searchResults" :key="t.id"
            class="p-3 border rounded-xl cursor-pointer transition-all hover:shadow-sm"
            :class="lookedUpPartner?.id === t.id ? 'border-[#00875A] bg-[#f0f7f4]' : 'border-gray-200 hover:border-gray-300'"
            @click="lookedUpPartner = t"
          >
            <div class="flex justify-between items-center">
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm truncate" style="color: #0F2B46;">{{ t.name }}</div>
                <div class="text-[11px] text-gray-400 font-mono">MST: {{ t.taxCode }}</div>
              </div>
              <el-icon v-if="lookedUpPartner?.id === t.id" class="text-[#00875A] text-lg flex-shrink-0"><CircleCheckFilled /></el-icon>
            </div>
          </div>
        </div>

        <div v-else-if="partnerSearchQuery && partnerSearchQuery.length >= 3 && !searchingPartner && searchPerformed" class="p-4 text-center text-gray-400 text-sm">
          Không tìm thấy doanh nghiệp phù hợp
        </div>

        <!-- Selected partner confirmation -->
        <div v-if="lookedUpPartner" class="p-3 rounded-xl flex items-center gap-3" style="background: #f0f7f4; border: 1px solid #b8e0cc;">
          <el-icon class="text-[#00875A] text-lg"><CircleCheckFilled /></el-icon>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm" style="color: #0F2B46;">{{ lookedUpPartner.name }}</div>
            <div class="text-[11px] text-gray-500 font-mono">{{ lookedUpPartner.taxCode }}</div>
          </div>
        </div>

        <el-input v-model="addPartnerNotes" placeholder="Ghi chú (tùy chọn)" />
      </div>
      <template #footer>
        <el-button @click="showAddPartnerDialog = false">Hủy</el-button>
        <el-button :disabled="!lookedUpPartner" :loading="savingPartner" @click="saveNewPartner" style="background: #00875A; color: #fff; border: none;">
          Lưu đối tác
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/modules/core/store/auth';
import { supplyApi } from '../api/supplyApi';
import { tenantApi } from '@/modules/core/api/tenant';
import { transportApi } from '../api/transportApi';
import { b2bPartnerApi } from '../api/b2bPartnerApi';
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus';
import { Upload, DocumentAdd, Plus, Clock, Files, Calendar, InfoFilled, Delete, Search, View, Memo, Tickets, CircleCheckFilled, Loading } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// State
const warehouses = ref<any[]>([]);
const batches = ref<any[]>([]);
const transfers = ref<any[]>([]);
const creating = ref(false);
const warehouseId = ref('');
const newBatchId = ref('');
const newExpectedQty = ref(0);
const maxAvailable = ref(0);
const scanInput = ref('');
const scanMode = ref<'BATCH' | 'ITEM' | 'PALLET'>('BATCH');
const scanInputRef = ref<any>(null);
const detailVisible = ref(false);
const selectedTransfer = ref<any>(null);
const editingId = ref<string | null>(null);
const currentStatus = ref<string>('');
const isFormEditable = computed(() => {
  if (!editingId.value) return true;
  return ['', 'DRAFT', 'PENDING'].includes(currentStatus.value);
});

// Saved B2B Partners
const savedPartners = ref<any[]>([]);
const selectedPartnerId = ref('');
const resolvedTenant = ref<any>(null);

// Add Partner Dialog
const showAddPartnerDialog = ref(false);
const partnerSearchQuery = ref('');
const searchResults = ref<any[]>([]);
const searchPerformed = ref(false);
const addPartnerNotes = ref('');
const lookedUpPartner = ref<any>(null);
const searchingPartner = ref(false);
const savingPartner = ref(false);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Caching keys
const CACHE_KEY_WH = 'vrt_export_warehouse_id';
const CACHE_KEY_PARTNER = 'vrt_export_partner_id';

// Watchers for caching
watch(warehouseId, (val) => {
  if (val) localStorage.setItem(CACHE_KEY_WH, val);
});

watch(selectedPartnerId, (val) => {
  if (val) {
    localStorage.setItem(CACHE_KEY_PARTNER, val);
    const partner = savedPartners.value.find(p => p.id === val);
    if (partner?.partnerTenant) {
      resolvedTenant.value = partner.partnerTenant;
      form.value.to_tenant_id = partner.partnerTenantId;
    }
  } else {
    resolvedTenant.value = null;
    form.value.to_tenant_id = '';
  }
});

// Transfer header
const transferCode = ref('');
const currentDate = dayjs().format('DD/MM/YYYY HH:mm');
const currentUser = computed(() => authStore.user?.full_name || authStore.user?.username || 'N/A');

const form = ref({
  to_tenant_id: '',
  notes: '',
  items: [] as Array<{ batch_id: string; expected_quantity: number; serials?: string[] }>
});

const completedSemiBatches = computed(() => 
  batches.value.filter(b => 
    b.status === 'COMPLETED' && 
    b.batchType === 'SEMI_FINISHED' && 
    (Number(b.availableQuantity) > 0.001)
  )
);
const sortedTransfers = computed(() => [...transfers.value].sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt))));

import QRCode from 'qrcode';

const qrCanvas = ref<HTMLCanvasElement | null>(null);
const qrCanvasSuccess = ref<HTMLCanvasElement | null>(null);
const successVisible = ref(false);
const lastCreatedTransfer = ref<any>(null);

// Focus logic
const focusScan = () => {
  nextTick(() => {
    scanInputRef.value?.focus();
  });
};

const handleGlobalKeyDown = (e: KeyboardEvent) => {
  // Nếu nhấn Enter và không phải đang ở trong một input/textarea khác cần Enter
  const target = e.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  
  if (e.key === 'Enter') {
    // 1. Nếu đang ở Textarea (Ghi chú) -> Để người dùng xuống dòng bình thường
    if (target.tagName === 'TEXTAREA') return;

    // 2. Nếu đang ở ô input khác (như Tra cứu mã DN) -> Để ô đó xử lý Enter của nó (lookupTenant)
    // Sau đó ta đã gọi focusScan() trong lookupTenant rồi nên không cần hijack ở đây.
    if (isInput && target !== scanInputRef.value?.$el.querySelector('input')) return;

    // 3. Nếu Enter ở bất kỳ đâu không phải ô quét mã (và không phải input/textarea), nhảy về ô quét mã
    if (target !== scanInputRef.value?.$el.querySelector('input')) {
      focusScan();
    }
  }
};

onMounted(() => {
  load();
  focusScan();
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeyDown);
});

const generateQR = async (text: string) => {
  if (!text) return;
  await nextTick();
  const options = {
    width: 120,
    margin: 2,
    color: {
      dark: '#c2410c', // orange-700
      light: '#ffffff'
    }
  };
  
  try {
    // Generate for header if exists
    if (qrCanvas.value) {
      await QRCode.toCanvas(qrCanvas.value, text, options);
    }
    // Generate for success dialog if exists
    if (qrCanvasSuccess.value) {
      await QRCode.toCanvas(qrCanvasSuccess.value, text, { ...options, width: 200 });
    }
  } catch (err) {
    console.error('QR generation failed', err);
  }
};

const handlePartnerClear = () => {
  resolvedTenant.value = null;
  form.value.to_tenant_id = '';
  localStorage.removeItem(CACHE_KEY_PARTNER);
};

const onPartnerSearchInput = () => {
  lookedUpPartner.value = null;
  searchPerformed.value = false;
  
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  
  const q = partnerSearchQuery.value.trim();
  if (q.length < 3) {
    searchResults.value = [];
    return;
  }
  
  searchDebounceTimer = setTimeout(async () => {
    searchingPartner.value = true;
    try {
      const { data } = await tenantApi.getActive({ search: q, limit: 15 });
      const myTenantId = authStore.user?.tenantId;
      searchResults.value = (data.data || data || []).filter((t: any) => t.status === 'ACTIVE' && t.id !== myTenantId);
      searchPerformed.value = true;
    } catch (e) {
      searchResults.value = [];
    } finally {
      searchingPartner.value = false;
    }
  }, 400);
};

const saveNewPartner = async () => {
  if (!lookedUpPartner.value) return;
  savingPartner.value = true;
  try {
    await b2bPartnerApi.create({
      partnerTenantId: lookedUpPartner.value.id,
      notes: addPartnerNotes.value || undefined,
    });
    ElMessage.success(`Đã thêm "${lookedUpPartner.value.name}" vào danh sách đối tác`);
    showAddPartnerDialog.value = false;
    partnerSearchQuery.value = '';
    searchResults.value = [];
    addPartnerNotes.value = '';
    lookedUpPartner.value = null;
    searchPerformed.value = false;
    await loadSavedPartners();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Lưu đối tác thất bại');
  } finally {
    savingPartner.value = false;
  }
};

const loadSavedPartners = async () => {
  try {
    const { data } = await b2bPartnerApi.getList();
    savedPartners.value = data || [];
  } catch (e) {
    console.error('Failed to load B2B partners', e);
  }
};

const removePartner = async (partner: any) => {
  try {
    await ElMessageBox.confirm(
      `Xóa "${partner.alias || partner.partnerTenant?.name}" khỏi danh sách đối tác?`,
      'Xác nhận xóa',
      { confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', type: 'warning' }
    );
    await b2bPartnerApi.remove(partner.id);
    if (selectedPartnerId.value === partner.id) {
      selectedPartnerId.value = '';
      resolvedTenant.value = null;
      form.value.to_tenant_id = '';
    }
    await loadSavedPartners();
    ElMessage.success('Đã xóa đối tác khỏi danh sách');
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error('Xóa thất bại');
  }
};

const load = async () => {
  try {
    const [wRes, bRes, trRes] = await Promise.all([
      transportApi.getWarehouses(),
      supplyApi.getBatches(),
      supplyApi.listTransfers()
    ]);
    warehouses.value = wRes.data || [];
    batches.value = bRes.data || [];
    transfers.value = trRes.data || [];

    // Load saved B2B partners
    await loadSavedPartners();

    // Restore Cache
    const cachedWh = localStorage.getItem(CACHE_KEY_WH);
    if (cachedWh && warehouses.value.some(w => w.id === cachedWh)) {
      warehouseId.value = cachedWh;
    }
    
    // Restore cached partner selection
    const cachedPartner = localStorage.getItem(CACHE_KEY_PARTNER);
    if (cachedPartner && !selectedPartnerId.value && savedPartners.value.some(p => p.id === cachedPartner)) {
      selectedPartnerId.value = cachedPartner;
    }

    // Pre-load batches from URL query
    const batchIds = route.query.batchIds as string;
    if (batchIds) {
      for (const id of batchIds.split(',')) {
        const b = batches.value.find(x => x.id === id);
        if (b && b.status === 'COMPLETED' && b.availableQuantity > 0 && !form.value.items.some(i => i.batch_id === b.id)) {
          form.value.items.push({ batch_id: b.id, expected_quantity: b.availableQuantity || 0 });
        }
      }
    }
  } catch (e) {}
};

const onBatchSelect = (batchId: string) => {
  const batch = batches.value.find(b => b.id === batchId);
  if (batch) {
    newExpectedQty.value = batch.availableQuantity || 0;
    maxAvailable.value = batch.availableQuantity || 0;
  }
  focusScan();
};

const handleScan = async () => {
  const code = scanInput.value.trim();
  if (!code) return;

  // ── PALLET MODE: lookup pallet by code ──
  if (scanMode.value === 'PALLET') {
    try {
      const { data: result } = await supplyApi.listSFPallets({ search: code, limit: 1 });
      const pallets = result?.items || [];
      const pallet = pallets.find((p: any) => p.palletCode === code.toUpperCase());
      if (!pallet) { ElMessage.error(`Không tìm thấy pallet BTP "${code}"`); return; }

      const { data: detail } = await supplyApi.getSFPalletDetail(pallet.id);
      if (!detail.items || detail.items.length === 0) { ElMessage.warning('Pallet này đang trống'); return; }

      let addedCount = 0;
      for (const palletItem of detail.items) {
        if (!palletItem.batchId) continue;
        const batch = batches.value.find(b => b.id === palletItem.batchId);
        if (!batch || batch.status !== 'COMPLETED' || batch.availableQuantity <= 0) continue;

        const existing = form.value.items.find(i => i.batch_id === batch.id);
        const unitWeight = palletItem.weight || Number((batch.outputWeight / (batch.packCount || 1)).toFixed(3));

        if (existing) {
          if (existing.serials?.includes(palletItem.itemSerial)) continue;
          existing.serials = [...(existing.serials || []), palletItem.itemSerial];
          existing.expected_quantity = Number((existing.expected_quantity + unitWeight).toFixed(3));
        } else {
          form.value.items.push({ batch_id: batch.id, expected_quantity: unitWeight, serials: [palletItem.itemSerial] });
        }
        addedCount++;
      }

      if (addedCount > 0) ElMessage.success(`Đã thêm ${addedCount} SP từ pallet ${pallet.palletCode}`);
      else ElMessage.warning('Không có SP hợp lệ trong pallet (hết tồn hoặc lô chưa complete)');
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || 'Lỗi tra cứu pallet');
    } finally {
      scanInput.value = '';
      focusScan();
    }
    return;
  }

  // ── BATCH / ITEM MODE ──
  try {
    const { data: items } = await supplyApi.lookupSerials([code]);
    if (!items || items.length === 0) { ElMessage.error('Không tìm thấy sản phẩm từ mã QR này'); return; }
    const item = items[0];
    if (!item.batchId) { ElMessage.error('Sản phẩm này chưa gán vào lô hàng nào'); return; }
    const batch = batches.value.find(b => b.id === item.batchId);
    if (!batch) { ElMessage.error('Không tìm thấy lô hàng'); return; }
    if (batch.status !== 'COMPLETED') { ElMessage.warning(`Lô ${batch.batchCode} chưa COMPLETED`); return; }
    if (batch.availableQuantity <= 0) { ElMessage.error(`Lô ${batch.batchCode} đã hết hàng (Tồn: 0kg)`); return; }

    if (scanMode.value === 'BATCH') {
      if (form.value.items.some(i => i.batch_id === batch.id && !i.serials)) { ElMessage.warning('Lô đã có trong danh sách'); }
      else {
        form.value.items = form.value.items.filter(i => i.batch_id !== batch.id);
        form.value.items.push({ batch_id: batch.id, expected_quantity: batch.availableQuantity || 0 });
        ElMessage.success(`Đã thêm toàn bộ lượng còn lại của lô ${batch.batchCode} (${batch.availableQuantity}kg)`);
      }
    } else {
      let existing = form.value.items.find(i => i.batch_id === batch.id);
      if (existing && !existing.serials) { ElMessage.warning('Lô đang xuất nguyên lô'); return; }
      const unitWeight = Number((batch.outputWeight / (batch.packCount || 1)).toFixed(3));
      
      if (existing) {
        if (existing.serials?.includes(item.serialNumber)) { ElMessage.warning('Bao đã có'); return; }
        if (existing.expected_quantity + unitWeight > batch.availableQuantity) {
          ElMessage.error('Vượt quá tồn kho khả dụng của lô');
          return;
        }
        existing.serials = [...(existing.serials || []), item.serialNumber];
        existing.expected_quantity = Number((existing.expected_quantity + unitWeight).toFixed(3));
        ElMessage.success(`Đã thêm bao ${item.serialNumber}`);
      } else {
        form.value.items.push({ batch_id: batch.id, expected_quantity: unitWeight, serials: [item.serialNumber] });
        ElMessage.success(`Đã thêm bao đầu tiên của lô ${batch.batchCode}`);
      }
    }
  } catch { ElMessage.error('Lỗi khi truy xuất mã QR'); }
  finally { scanInput.value = ''; focusScan(); }
};

const addItem = () => {
  if (!newBatchId.value || newExpectedQty.value <= 0) return;
  if (form.value.items.some(i => i.batch_id === newBatchId.value)) { ElMessage.warning('Lô đã có'); return; }
  form.value.items.push({ batch_id: newBatchId.value, expected_quantity: newExpectedQty.value });
  newBatchId.value = '';
  newExpectedQty.value = 0;
  focusScan();
};

const saveDraft = async () => {
  if (!resolvedTenant.value) { ElMessage.warning('Vui lòng chọn đối tác'); return; }
  creating.value = true;
  try {
    const payload = {
      ...form.value,
      id: editingId.value || undefined,
      status: 'DRAFT'
    };
    const { data: transfer } = await supplyApi.createTransfer(payload);
    ElMessage.success(`Đã lưu tạm phiếu ${transfer.transferCode}`);
    await load();
    // Keep editing if just saved
    editingId.value = transfer.id;
    transferCode.value = transfer.transferCode;
    currentStatus.value = 'DRAFT';
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Lưu tạm thất bại');
  } finally {
    creating.value = false;
  }
};

const createAndExport = async () => {
  if (!warehouseId.value) { ElMessage.warning('Vui lòng chọn kho xuất'); return; }
  if (!resolvedTenant.value) { ElMessage.warning('Vui lòng tra cứu đối tác nhận'); return; }
  const loading = ElLoading.service({ text: 'Đang xử lý xuất kho B2B...' });
  try {
    creating.value = true;
    const payload = {
      ...form.value,
      id: editingId.value || undefined,
      status: 'PENDING'
    };

    // Step 1: Tạo/cập nhật phiếu
    let transfer: any;
    try {
      const res = await supplyApi.createTransfer(payload);
      transfer = res.data;
    } catch (e1: any) {
      const msg = e1?.response?.data?.message || e1?.message || 'Không rõ lỗi';
      ElMessage.error(`Lỗi tạo phiếu: ${msg}`);
      console.error('[B2B Export] createTransfer failed:', e1?.response?.data || e1);
      return;
    }

    // Step 2: Xác nhận xuất kho (reserve hàng)
    try {
      await supplyApi.confirmTransferExport(transfer.id, warehouseId.value);
    } catch (e2: any) {
      const msg = e2?.response?.data?.message || e2?.message || 'Không rõ lỗi';
      ElMessage.error(`Phiếu ${transfer.transferCode} đã tạo nhưng lỗi khi xuất kho: ${msg}`);
      console.error('[B2B Export] confirmExport failed:', e2?.response?.data || e2);
      // Reload để hiển thị phiếu PENDING ở sidebar
      await load();
      editingId.value = transfer.id;
      transferCode.value = transfer.transferCode || '';
      currentStatus.value = 'PENDING';
      return;
    }
    
    lastCreatedTransfer.value = transfer;
    transferCode.value = transfer.transferCode || '';
    
    // Show success dialog with QR
    successVisible.value = true;
    await generateQR(transfer.transferCode || transfer.id);
    
    ElMessage.success(`Phiếu ${transfer.transferCode} đã xuất thành công`);
    
    // Reset form
    resetForm();
    await load();
  } finally { creating.value = false; loading.close(); }
};

const resetForm = () => {
  form.value = { to_tenant_id: '', notes: '', items: [] };
  resolvedTenant.value = null;
  selectedPartnerId.value = '';
  transferCode.value = '';
  editingId.value = null;
  currentStatus.value = '';
};

const loadTransferToForm = async (t: any) => {
  if (editingId.value === t.id) {
    resetForm();
    return;
  }
  
  // If editing another and has items, warn? For now just load.
  editingId.value = t.id;
  currentStatus.value = t.status;
  transferCode.value = t.transferCode;
  form.value.notes = t.notes || '';
  
  // Load items
  form.value.items = (t.items || []).map((i: any) => ({
    batch_id: i.batchId,
    expected_quantity: i.expectedQuantity,
    serials: i.serials
  }));
  
  // Match partner from saved list or lookup directly
  if (t.toTenantId) {
    const matchedPartner = savedPartners.value.find(p => p.partnerTenantId === t.toTenantId);
    if (matchedPartner) {
      selectedPartnerId.value = matchedPartner.id;
    } else {
      try {
        const { data } = await tenantApi.getById(t.toTenantId);
        resolvedTenant.value = data;
        form.value.to_tenant_id = t.toTenantId;
      } catch (e) {}
    }
  }
  
  if (t.transferCode) {
    generateQR(t.transferCode);
  }
  
  ElMessage.info(`Đã tải phiếu ${t.transferCode}`);
  focusScan();
};

const viewTransfer = (t: any) => { 
  if (t.status === 'DRAFT' || t.status === 'PENDING') {
    loadTransferToForm(t);
  } else {
    selectedTransfer.value = t; 
    detailVisible.value = true;
  }
};

const cancelTransfer = (id: string) => {
  ElMessageBox.confirm('Bạn có chắc muốn hủy phiếu này? Nếu là phiếu PENDING, lượng hàng trong phiếu sẽ được giải phóng. Nếu là phiếu DRAFT, phiếu sẽ bị xóa.', 'Xác nhận hủy', {
    confirmButtonText: 'Hủy phiếu',
    cancelButtonText: 'Quay lại',
    type: 'warning',
  }).then(async () => {
    try {
      await supplyApi.cancelTransfer(id);
      if (editingId.value === id) {
        resetForm();
      }
      ElMessage.success('Đã hủy phiếu thành công');
      await load();
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || 'Không thể hủy phiếu');
    }
  });
};

const getBatchInfo = (id: string) => batches.value.find(x => x.id === id);
const getBatchCode = (id: string) => getBatchInfo(id)?.batchCode || id;
const getBatchPackCount = (id: string) => getBatchInfo(id)?.packCount || 0;
const formatDate = (d: any) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-';
const formatDateSimple = (d: any) => d ? dayjs(d).format('DD/MM/YYYY') : '-';
const getTransferStatusType = (s: string) => ({ DRAFT: 'info', PENDING: 'warning', EXPORTED: '', IMPORTING: 'warning', COMPLETED: 'success', PARTIAL_COMPLETED: 'success', CANCELLED: 'danger' }[s] || 'info');
const getTransferStatusLabel = (s: string) => ({ DRAFT: 'Nháp', PENDING: 'Chờ xử lý', EXPORTED: 'Đã xuất', IMPORTING: 'Đang nhập', COMPLETED: 'Hoàn thành', PARTIAL_COMPLETED: 'Hoàn thành một phần', CANCELLED: 'Đã hủy' }[s] || s);

const getSummary = ({ columns, data }: any) => {
  return columns.map((_: any, i: number) => {
    if (i === 3) return 'Tổng cộng';
    if (i === 4) return data.reduce((sum: number, row: any) => sum + (row.serials?.length || getBatchPackCount(row.batch_id)), 0);
    if (i === 5) return data.reduce((sum: number, row: any) => sum + (row.expected_quantity || 0), 0).toFixed(2) + ' kg';
    return '';
  });
};

onMounted(load);
</script>

<style scoped>
.modern-table :deep(.el-table__header-wrapper) th {
  background-color: #0F2B46;
  color: #ffffff;
  font-weight: 700;
}

.modern-table :deep(.el-table__footer-wrapper) td {
  background-color: #f0f4f8;
  font-weight: 700;
  color: #0F2B46;
}

.scan-mode-toggle {
  display: flex;
  background: #e8eff5;
  padding: 4px;
  border-radius: 12px;
  gap: 4px;
}

.mode-item {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
}

.mode-item:hover {
  background: #ffffff;
  color: #00875A;
}

.mode-item.active {
  background: #ffffff;
  color: #0F2B46;
  box-shadow: 0 4px 12px rgba(15, 43, 70, 0.08), 0 1px 3px rgba(15, 43, 70, 0.12);
  transform: translateY(-1px);
}

.mode-item.active i {
  color: #00875A;
}

.header-card :deep(.el-card__body) {
  padding: 12px 20px;
}

.qr-box {
  transition: all 0.3s ease;
}

.qr-box:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(15, 43, 70, 0.1);
}
</style>
