<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <el-button @click="$router.push({ name: 'RecallManagement' })" :icon="Back" circle />
      <div class="flex-1">
        <h2 class="text-2xl font-bold text-gray-800">Lệnh Thu hồi: {{ order?.code || '...' }}</h2>
        <p class="text-gray-500 text-sm mt-1">{{ order?.product?.name || '' }}</p>
      </div>
      <div class="flex gap-2">
        <el-button v-if="order?.status === 'DRAFT'" type="danger" @click="handleIssue" :loading="actionLoading">
          <el-icon class="mr-1"><Warning /></el-icon> Phát hành
        </el-button>
        <el-button v-if="order?.status !== 'DRAFT' && order?.status !== 'COMPLETED'" type="warning" @click="openScanner">
          📱 Quét nhận & xử lý
        </el-button>
        <el-button v-if="order?.status === 'IN_PROGRESS'" type="success" @click="handleComplete" :loading="actionLoading">
          <el-icon class="mr-1"><Check /></el-icon> Hoàn tất
        </el-button>
        <el-button @click="fetchDetail" :loading="loading" :icon="Refresh" />
      </div>
    </div>

    <div v-loading="loading">
      <!-- Info + Progress -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Order Info -->
        <el-card shadow="never" class="!rounded-xl">
          <template #header><span class="font-bold">Thông tin lệnh</span></template>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">Mã lệnh</span><span class="font-mono font-bold">{{ order?.code }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Trạng thái</span><el-tag :type="statusType(order?.status)" size="small" round>{{ statusLabel(order?.status) }}</el-tag></div>
            <div class="flex justify-between"><span class="text-gray-500">Mức độ</span><el-tag :type="recallSeverityType(order?.severity)" size="small" effect="dark" round>{{ recallSeverityLabel(order?.severity) }}</el-tag></div>
            <div class="flex justify-between"><span class="text-gray-500">Khởi tạo bởi</span><span>{{ order?.initiatedBy === 'GOV' ? 'Cơ quan quản lý' : 'Doanh nghiệp' }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Ngày tạo</span><span>{{ formatDate(order?.createdAt) }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Ngày phát hành</span><span>{{ formatDate(order?.issuedAt) }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Ngày hoàn tất</span><span>{{ formatDate(order?.completedAt) }}</span></div>
            <el-divider />
            <div><span class="text-gray-500 block mb-1">Lý do thu hồi:</span><span class="text-red-600">{{ order?.reason }}</span></div>
          </div>
        </el-card>

        <!-- Progress -->
        <el-card shadow="never" class="!rounded-xl lg:col-span-2">
          <template #header><span class="font-bold">Tiến độ xử lý</span></template>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <div class="text-2xl font-bold text-gray-800">{{ progress.total }}</div>
              <div class="text-xs text-gray-500">Tổng tem</div>
            </div>
            <div class="text-center p-3 bg-blue-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">{{ progress.returned + progress.inspected }}</div>
              <div class="text-xs text-gray-500">Đã nhận về</div>
            </div>
            <div class="text-center p-3 bg-red-50 rounded-lg">
              <div class="text-2xl font-bold text-red-600">{{ progress.disposed }}</div>
              <div class="text-xs text-gray-500">Đã hủy</div>
            </div>
            <div class="text-center p-3 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">{{ progress.restocked }}</div>
              <div class="text-xs text-gray-500">Tái nhập kho</div>
            </div>
          </div>
          <el-progress
            :percentage="progress.total > 0 ? Math.round(((progress.disposed + progress.restocked) / progress.total) * 100) : 0"
            :stroke-width="12"
            :color="[{ color: '#E6A23C', percentage: 50 }, { color: '#67C23A', percentage: 100 }]"
          >
            <template #default="{ percentage }">
              <span class="text-sm font-bold">{{ percentage }}% hoàn tất</span>
            </template>
          </el-progress>
        </el-card>
      </div>

      <!-- Items Table -->
      <el-card shadow="never" class="!rounded-xl">
        <template #header>
          <div class="flex justify-between items-center">
            <span class="font-bold">Danh sách tem thu hồi ({{ items.length }})</span>
            <div class="flex gap-2" v-if="order?.status !== 'DRAFT' && order?.status !== 'COMPLETED'">
              <el-button size="small" type="success" @click="handleBulkReceive" :disabled="!hasReturningItems">
                <el-icon class="mr-1"><Download /></el-icon> Nhận hàng
              </el-button>
              <el-button size="small" type="primary" @click="showInspectDialog = true" :disabled="!hasReturnedItems">
                <el-icon class="mr-1"><Search /></el-icon> Kiểm tra
              </el-button>
              <el-button size="small" type="danger" @click="handleBulkDispose" :disabled="!hasInspectedItems">
                <el-icon class="mr-1"><Delete /></el-icon> Hủy
              </el-button>
              <el-button size="small" type="warning" @click="handleBulkRestock" :disabled="!hasGoodItems">
                <el-icon class="mr-1"><RefreshRight /></el-icon> Tái nhập
              </el-button>
            </div>
          </div>
        </template>

        <el-table :data="items" stripe max-height="500" @selection-change="handleSelection">
          <el-table-column type="selection" width="48" />
          <el-table-column label="Mã lô" width="140">
            <template #default="{ row }">
              <span class="font-mono text-sm">{{ row.batch?.batchCode || '---' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Mã QR" min-width="180">
            <template #default="{ row }">
              <span class="font-mono text-sm text-gray-900 font-semibold">{{ row.qrCode || row.productItem?.fullQrCode || '---' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Serial" width="140">
            <template #default="{ row }">
              <span class="font-mono text-xs text-gray-600">{{ row.productItem?.serialNumber || '---' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Trạng thái" width="140" align="center">
            <template #default="{ row }">
              <el-tag :type="itemStatusType(row.status)" size="small" round>{{ itemStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Kết quả kiểm tra" width="150" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.inspectionResult" :type="inspectionType(row.inspectionResult)" size="small">{{ inspectionLabel(row.inspectionResult) }}</el-tag>
              <span v-else class="text-gray-400">—</span>
            </template>
          </el-table-column>
          <el-table-column label="Ghi chú kiểm tra" min-width="200">
            <template #default="{ row }">
              <span class="text-sm text-gray-600">{{ row.inspectionNotes || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Ngày kiểm tra" width="150">
            <template #default="{ row }">
              <span class="text-sm text-gray-500">{{ formatDate(row.inspectedAt) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- Inspect Dialog -->
    <el-dialog v-model="showInspectDialog" title="🔍 Kiểm tra hiện trạng sản phẩm" width="500px">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold mb-1">Kết quả kiểm tra <span class="text-red-500">*</span></label>
          <el-radio-group v-model="inspectForm.result" class="w-full">
            <el-radio-button value="GOOD">✅ Còn tốt</el-radio-button>
            <el-radio-button value="DEFECTIVE">⚠️ Hỏng/Lỗi</el-radio-button>
            <el-radio-button value="HAZARDOUS">🚨 Nguy hiểm</el-radio-button>
          </el-radio-group>
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">Ghi chú</label>
          <el-input v-model="inspectForm.notes" type="textarea" :rows="3" placeholder="Mô tả tình trạng sản phẩm..." />
        </div>
        <div class="text-sm text-gray-500">Sẽ kiểm tra {{ selectedItems.filter(i => i.status === 'RETURNED').length }} item đã chọn ở trạng thái "Đã nhận".</div>
      </div>
      <template #footer>
        <el-button @click="showInspectDialog = false">Hủy</el-button>
        <el-button type="primary" :disabled="!inspectForm.result" :loading="actionLoading" @click="submitInspect">Xác nhận</el-button>
      </template>
    </el-dialog>

    <!-- Scanner Mode Dialog -->
    <el-dialog v-model="showScannerDialog" title="📱 Quét nhận & xử lý sản phẩm thu hồi" width="700px" :close-on-click-modal="false" @close="scanHistory = []">
      <div class="space-y-4">
        <!-- Warehouse selector -->
        <div>
          <label class="block text-sm font-semibold mb-1">Kho nhận hàng <span class="text-red-500">*</span></label>
          <el-select v-model="scanForm.warehouseId" placeholder="Chọn kho..." class="w-full" filterable>
            <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
          </el-select>
        </div>

        <!-- Scan input -->
        <div>
          <label class="block text-sm font-semibold mb-1">Quét mã QR / Serial</label>
          <div class="flex gap-2">
            <el-input ref="scanInputRef" v-model="scanForm.code" placeholder="Quét hoặc nhập mã..." @keyup.enter="doScanReceive" clearable :disabled="!scanForm.warehouseId" />
            <el-button type="primary" @click="doScanReceive" :loading="scanLoading" :disabled="!scanForm.code.trim() || !scanForm.warehouseId">Quét</el-button>
          </div>
        </div>

        <!-- Inspection + Disposition -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold mb-1">Kết quả kiểm tra</label>
            <el-radio-group v-model="scanForm.inspectionResult" class="w-full">
              <el-radio-button value="GOOD">✅ Tốt</el-radio-button>
              <el-radio-button value="DEFECTIVE">⚠️ Lỗi</el-radio-button>
              <el-radio-button value="HAZARDOUS">🚨 Nguy hiểm</el-radio-button>
            </el-radio-group>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Phương án xử lý</label>
            <el-radio-group v-model="scanForm.disposition" class="w-full">
              <el-radio-button value="RESTOCK">📦 Nhập lại kho</el-radio-button>
              <el-radio-button value="DISPOSE">🗑️ Tiêu hủy</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold mb-1">Ghi chú</label>
          <el-input v-model="scanForm.notes" placeholder="Ghi chú kiểm tra..." />
        </div>

        <!-- Scan History -->
        <div v-if="scanHistory.length > 0" class="border-t pt-3">
          <div class="text-sm font-bold text-gray-700 mb-2">Lịch sử quét ({{ scanHistory.length }} sản phẩm)</div>
          <el-table :data="scanHistory" max-height="200" stripe size="small">
            <el-table-column label="Mã QR" min-width="160">
              <template #default="{ row }">
                <span class="font-mono text-xs text-gray-900 font-semibold">{{ row.qrCode || '---' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Serial" width="120">
              <template #default="{ row }">
                <span class="font-mono text-xs text-gray-600">{{ row.serial }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Lô" prop="batchCode" width="140" />
            <el-table-column label="Kiểm tra" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.inspectionResult === 'GOOD' ? 'success' : row.inspectionResult === 'DEFECTIVE' ? 'warning' : 'danger'" size="small">
                  {{ ({ GOOD: 'Tốt', DEFECTIVE: 'Lỗi', HAZARDOUS: 'Nguy hiểm' } as any)[row.inspectionResult] || row.inspectionResult }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Xử lý" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="row.disposition === 'RESTOCK' ? 'success' : 'danger'" size="small" effect="dark">
                  {{ row.disposition === 'RESTOCK' ? '📦 Nhập kho' : '🗑️ Tiêu hủy' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <template #footer>
        <el-button @click="showScannerDialog = false">Đóng</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Back, Warning, Check, Refresh, Download, Search, Delete, RefreshRight } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { recallApi } from '../api/recallApi';
import { transportApi } from '../api/transportApi';
import { recallSeverityLabel, recallSeverityType } from '@/common/utils/status-labels';

const route = useRoute();
const orderId = route.params.id as string;

const loading = ref(false);
const actionLoading = ref(false);
const order = ref<any>(null);
const items = ref<any[]>([]);
const progress = ref({ total: 0, notified: 0, confirmed: 0, returning: 0, returned: 0, inspected: 0, disposed: 0, restocked: 0 });
const selectedItems = ref<any[]>([]);
const showInspectDialog = ref(false);
const inspectForm = ref({ result: '', notes: '' });

// Scanner Mode state
const showScannerDialog = ref(false);
const scanLoading = ref(false);
const scanInputRef = ref<any>(null);
const warehouses = ref<any[]>([]);
const scanForm = ref({ code: '', inspectionResult: 'GOOD', disposition: 'RESTOCK' as 'DISPOSE' | 'RESTOCK', warehouseId: '', notes: '' });
const scanHistory = ref<any[]>([]);

const openScanner = async () => {
  showScannerDialog.value = true;
  if (!warehouses.value.length) {
    try {
      const { data } = await transportApi.getWarehouses();
      warehouses.value = data.data || data || [];
    } catch { /* ignore */ }
  }
  setTimeout(() => scanInputRef.value?.focus(), 300);
};

const doScanReceive = async () => {
  if (!scanForm.value.code.trim() || !scanForm.value.warehouseId) return;
  scanLoading.value = true;
  try {
    const { data } = await recallApi.scanReceive(orderId, {
      code: scanForm.value.code.trim(),
      inspectionResult: scanForm.value.inspectionResult,
      disposition: scanForm.value.disposition,
      warehouseId: scanForm.value.warehouseId,
      notes: scanForm.value.notes || undefined,
    });
    scanHistory.value.unshift(data);
    ElMessage.success(`✅ ${data.serial} → ${data.disposition === 'RESTOCK' ? 'Nhập kho' : 'Tiêu hủy'}`);
    scanForm.value.code = '';
    fetchDetail();
    setTimeout(() => scanInputRef.value?.focus(), 100);
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi quét');
  } finally {
    scanLoading.value = false;
  }
};

const hasReturningItems = computed(() => selectedItems.value.some(i => i.status === 'RETURNING'));
const hasReturnedItems = computed(() => selectedItems.value.some(i => i.status === 'RETURNED'));
const hasInspectedItems = computed(() => selectedItems.value.some(i => i.status === 'INSPECTED'));
const hasGoodItems = computed(() => selectedItems.value.some(i => i.status === 'INSPECTED' && i.inspectionResult === 'GOOD'));

const statusType = (s: string) => ({ DRAFT: 'info', ISSUED: 'warning', IN_PROGRESS: '', COMPLETED: 'success', CANCELLED: 'danger' }[s] || 'info');
const statusLabel = (s: string) => ({ DRAFT: 'Nháp', ISSUED: 'Đã phát hành', IN_PROGRESS: 'Đang xử lý', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' }[s] || s);
const itemStatusType = (s: string) => ({ NOTIFIED: 'info', CONFIRMED: '', RETURNING: 'warning', RETURNED: '', INSPECTED: 'primary', DISPOSED: 'danger', RESTOCKED: 'success' }[s] || 'info');
const itemStatusLabel = (s: string) => ({ NOTIFIED: 'Đã thông báo', CONFIRMED: 'Đã xác nhận', RETURNING: 'Đang trả', RETURNED: 'Đã nhận', INSPECTED: 'Đã kiểm tra', DISPOSED: 'Đã hủy', RESTOCKED: 'Tái nhập' }[s] || s);
const inspectionType = (r: string) => ({ GOOD: 'success', DEFECTIVE: 'warning', HAZARDOUS: 'danger' }[r] || 'info');
const inspectionLabel = (r: string) => ({ GOOD: 'Còn tốt', DEFECTIVE: 'Hỏng/Lỗi', HAZARDOUS: 'Nguy hiểm' }[r] || r);
const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const handleSelection = (val: any[]) => { selectedItems.value = val; };

const fetchDetail = async () => {
  loading.value = true;
  try {
    const { data } = await recallApi.getOrderDetail(orderId);
    order.value = data.order;
    items.value = data.items || [];
    progress.value = data.progress || progress.value;
  } catch (e) {
    ElMessage.error('Lỗi tải chi tiết lệnh thu hồi');
  } finally {
    loading.value = false;
  }
};

const handleIssue = async () => {
  try {
    await ElMessageBox.confirm('Phát hành lệnh thu hồi? Tem sẽ chuyển RECALLED, dealer nhận thông báo.', '⚠️ Xác nhận', { type: 'error', confirmButtonText: 'Phát hành' });
    actionLoading.value = true;
    await recallApi.issueOrder(orderId);
    ElMessage.success('Đã phát hành');
    fetchDetail();
  } catch (e: any) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e.response?.data?.message || 'Lỗi'); }
  finally { actionLoading.value = false; }
};

const handleComplete = async () => {
  try {
    await ElMessageBox.confirm('Hoàn tất lệnh thu hồi?', 'Xác nhận', { type: 'success', confirmButtonText: 'Hoàn tất' });
    actionLoading.value = true;
    await recallApi.completeOrder(orderId);
    ElMessage.success('Đã hoàn tất lệnh thu hồi');
    fetchDetail();
  } catch (e: any) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e.response?.data?.message || 'Lỗi'); }
  finally { actionLoading.value = false; }
};

const handleBulkReceive = async () => {
  const returningIds = selectedItems.value.filter(i => i.status === 'RETURNING').map(i => i.id);
  if (!returningIds.length) return ElMessage.warning('Chọn items đang trả');
  try {
    const { value: warehouseId } = await ElMessageBox.prompt('Nhập ID kho nhận hàng:', 'Nhận hàng thu hồi');
    if (!warehouseId?.trim()) return;
    actionLoading.value = true;
    await recallApi.receiveReturn(orderId, { itemIds: returningIds, warehouseId: warehouseId.trim() });
    ElMessage.success(`Đã nhận ${returningIds.length} item`);
    fetchDetail();
  } catch (e: any) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e.response?.data?.message || 'Lỗi'); }
  finally { actionLoading.value = false; }
};

const submitInspect = async () => {
  const returnedIds = selectedItems.value.filter(i => i.status === 'RETURNED').map(i => i.id);
  if (!returnedIds.length || !inspectForm.value.result) return;
  actionLoading.value = true;
  try {
    let count = 0;
    for (const itemId of returnedIds) {
      await recallApi.inspectItem(itemId, { result: inspectForm.value.result, notes: inspectForm.value.notes });
      count++;
    }
    ElMessage.success(`Đã kiểm tra ${count} item`);
    showInspectDialog.value = false;
    inspectForm.value = { result: '', notes: '' };
    fetchDetail();
  } catch (e: any) { ElMessage.error(e.response?.data?.message || 'Lỗi kiểm tra'); }
  finally { actionLoading.value = false; }
};

const handleBulkDispose = async () => {
  const ids = selectedItems.value.filter(i => i.status === 'INSPECTED').map(i => i.id);
  if (!ids.length) return;
  try {
    await ElMessageBox.confirm(`Hủy ${ids.length} sản phẩm?`, '⚠️ Xác nhận hủy', { type: 'error' });
    const { value: warehouseId } = await ElMessageBox.prompt('Nhập ID kho:', 'Kho thực hiện hủy');
    if (!warehouseId?.trim()) return;
    actionLoading.value = true;
    await recallApi.disposeItems({ recallOrderId: orderId, itemIds: ids, warehouseId: warehouseId.trim() });
    ElMessage.success(`Đã hủy ${ids.length} item`);
    fetchDetail();
  } catch (e: any) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e.response?.data?.message || 'Lỗi'); }
  finally { actionLoading.value = false; }
};

const handleBulkRestock = async () => {
  const ids = selectedItems.value.filter(i => i.status === 'INSPECTED' && i.inspectionResult === 'GOOD').map(i => i.id);
  if (!ids.length) return;
  try {
    await ElMessageBox.confirm(`Tái nhập ${ids.length} sản phẩm vào kho?`, 'Xác nhận', { type: 'success' });
    const { value: warehouseId } = await ElMessageBox.prompt('Nhập ID kho:', 'Kho tái nhập');
    if (!warehouseId?.trim()) return;
    actionLoading.value = true;
    await recallApi.restockItems({ recallOrderId: orderId, itemIds: ids, warehouseId: warehouseId.trim() });
    ElMessage.success(`Đã tái nhập ${ids.length} item`);
    fetchDetail();
  } catch (e: any) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e.response?.data?.message || 'Lỗi'); }
  finally { actionLoading.value = false; }
};

onMounted(() => fetchDetail());
</script>
