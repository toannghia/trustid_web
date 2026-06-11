<template>
  <div class="bag-linking-page">
    <!-- Header phiếu -->
    <div class="receipt-header">
      <div class="header-top">
        <el-button link @click="handleBack" class="back-btn">
          <el-icon><ArrowLeft /></el-icon> Quay lại
        </el-button>
        <el-button @click="handleExportBagCodes" :loading="exporting" :icon="Download" size="small">Xuất Mã Bao</el-button>
      </div>

      <div class="header-main" v-loading="loadingReceipt">
        <div class="header-row1">
          <div class="header-title-group">
            <span class="header-icon">📦</span>
            <div>
              <h2>Liên kết bao — {{ orderCode }}</h2>
              <p class="sub">{{ productName }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <el-tag :type="receipt?.status === 'COMPLETED' ? 'success' : 'warning'" size="large" effect="light">
              {{ receipt?.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang đóng gói' }}
            </el-tag>
            <el-button
              v-if="receipt?.status === 'COMPLETED'"
              type="warning"
              size="default"
              @click="handleReopen"
              :loading="reopening"
            >
              🔓 Mở lại đóng tiếp
            </el-button>
          </div>
        </div>

        <div class="header-row2">
          <span class="info-item">
            <label>Số phiếu:</label>
            <strong>{{ receipt?.receiptCode || '—' }}</strong>
          </span>
          <span class="info-item">
            <label>Thời gian:</label>
            <strong>{{ formatDate(receipt?.packingTime) }}</strong>
          </span>
          <span class="info-item">
            <label>Người đóng:</label>
            <strong>{{ receipt?.packer?.fullName || receipt?.packer?.username || '—' }}</strong>
          </span>
          <span class="info-item">
            <label>Kho lưu:</label>
            <el-select
              v-model="selectedWarehouseId"
              placeholder="Chọn kho"
              size="small"
              :disabled="receipt?.status === 'COMPLETED'"
              @change="handleWarehouseChange"
              style="width: 140px;"
            >
              <el-option
                v-for="w in warehouses"
                :key="w.id"
                :label="w.name"
                :value="w.id"
              />
            </el-select>
          </span>
        </div>
      </div>
    </div>

    <!-- Ô quét mã (1 input duy nhất) -->
    <div class="scan-section" v-if="receipt?.status !== 'COMPLETED'">
      <div class="scan-box">
        <div class="scan-hint" v-if="pendingBagCode">
          <el-tag type="success" size="large">Đã quét bao: {{ pendingBagCode }}</el-tag>
          <span class="ml-2 text-sm">→ Quét mã gói để liên kết</span>
          <el-button link type="danger" size="small" @click="pendingBagCode = ''" class="ml-2">Hủy</el-button>
        </div>
        <el-input
          v-model="scanInput"
          :placeholder="pendingBagCode ? 'Bước 2: Quét mã gói để liên kết...' : 'Bước 1: Quét mã bao trước (có hậu tố -B)...'"
          size="large"
          class="scan-input"
          ref="scanInputRef"
          :disabled="scanning"
          @keyup.enter="handleScan"
          clearable
        >
          <template #prefix>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#909399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><line x1="7" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="17" y2="7"/></svg>
          </template>
          <template #append>
            <el-button @click="handleScan" :loading="scanning" type="primary">Quét</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <!-- Lưới bao đã quét -->
    <div class="grid-section">
      <div class="grid-header">
        <h3>Danh sách bao đã liên kết</h3>
        <el-button :icon="Refresh" circle @click="fetchBags" />
      </div>

      <el-table :data="bags" border stripe v-loading="loadingBags" empty-text="Chưa có bao nào">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column label="Mã bao" prop="bagSerial" min-width="140">
          <template #default="{ row }">
            <code class="text-green-700 font-bold">{{ row.bagSerial }}</code>
          </template>
        </el-table-column>
        <el-table-column label="Mã QR bao" min-width="200">
          <template #default="{ row }">
            <code class="text-gray-600 text-xs">{{ row.qrCode || row.bagQrCode || '—' }}</code>
          </template>
        </el-table-column>
        <el-table-column label="Số lượng gói" prop="packetCount" width="130" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openPacketDetail(row)">
              <strong>{{ row.packetCount }}</strong> gói
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="Thời gian quét" width="170">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ formatDate(row.scannedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="180" align="center" v-if="receipt?.status !== 'COMPLETED'">
          <template #default="{ row }">
            <el-button size="small" type="warning" @click="openReplaceFromGrid(row)">Thay gói</el-button>
            <el-button size="small" type="danger" @click="handleRemoveBag(row)">Xóa</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Fixed footer -->
    <div class="footer-section">
      <div class="footer-totals">
        <span><strong>Tổng số bao:</strong> {{ receipt?.totalBags || 0 }}</span>
        <span class="divider">|</span>
        <span><strong>Tổng số gói:</strong> {{ receipt?.totalPackets || 0 }}</span>
      </div>
      <div class="footer-actions" v-if="receipt?.status !== 'COMPLETED'">
        <el-button size="large" @click="handleSaveDraft" :loading="savingDraft">Lưu tạm</el-button>
        <el-button size="large" type="primary" @click="handleComplete" :loading="completing">
          Lưu lại
        </el-button>
      </div>
      <div class="footer-actions" v-else>
        <el-button size="large" type="warning" @click="handleReopen" :loading="reopening">
          🔓 Mở lại đóng tiếp
        </el-button>
      </div>
    </div>

    <!-- Popup chi tiết gói -->
    <PacketDetailPopup
      v-model="showPacketDetail"
      :mapping-id="selectedMappingId"
      @replace-from-detail="openReplaceFromDetail"
    />

    <!-- Popup thay gói -->
    <ReplacePacketDialog
      v-model="showReplaceDialog"
      :receipt-id="receipt?.id || ''"
      :prefill-damaged="prefillDamagedSerial"
      @replaced="onReplaced"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Refresh, Download } from '@element-plus/icons-vue';
import { productionOrderApi } from '../api/productionOrderApi';
import { transportApi } from '../api/transportApi';
import PacketDetailPopup from '../components/PacketDetailPopup.vue';
import ReplacePacketDialog from '../components/ReplacePacketDialog.vue';

const route = useRoute();
const router = useRouter();
const orderId = route.params.id as string;

// Receipt state
const receipt = ref<any>(null);
const orderCode = ref('');
const productName = ref('');
const loadingReceipt = ref(false);

// Warehouse
const warehouses = ref<any[]>([]);
const selectedWarehouseId = ref('');

// Scan state
const scanInput = ref('');
const pendingBagCode = ref('');
const scanning = ref(false);
const scanInputRef = ref();

// Grid state
const bags = ref<any[]>([]);
const loadingBags = ref(false);

// Popup state
const showPacketDetail = ref(false);
const selectedMappingId = ref('');
const showReplaceDialog = ref(false);
const prefillDamagedSerial = ref('');

// Action states
const completing = ref(false);
const savingDraft = ref(false);
const exporting = ref(false);
const reopening = ref(false);

const formatDate = (d: string | Date) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { hour12: false });
};

const isBagCode = (code: string) => code.includes('-B');

const extractCodeFromQr = (raw: string): string => {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('Code') || url.searchParams.get('code');
    if (code?.trim()) return code.trim();
  } catch {
    // Not a URL; continue with generic fallback below.
  }
  const idx = trimmed.lastIndexOf('=');
  return idx >= 0 ? trimmed.substring(idx + 1).trim() : trimmed;
};

const getSummaries = (param: { columns: any[]; data: any[] }) => {
  const { columns, data } = param;
  const sums: string[] = [];
  columns.forEach((col, index) => {
    if (index === 0) { sums[index] = 'Tổng cộng'; return; }
    if (col.property === 'packetCount') {
      const total = data.reduce((sum, row) => sum + (row.packetCount || 0), 0);
      sums[index] = `${total} gói`;
    } else if (col.property === 'bagSerial') {
      sums[index] = `${data.length} bao`;
    } else {
      sums[index] = '';
    }
  });
  return sums;
};

// ==================== INIT ====================

const initReceipt = async () => {
  loadingReceipt.value = true;
  try {
    const { data } = await productionOrderApi.getOrCreateReceipt(orderId);
    const result = data.data || data;
    receipt.value = result.receipt;
    orderCode.value = result.order?.orderCode || orderId;
    productName.value = result.order?.productName || '';
    selectedWarehouseId.value = result.receipt?.warehouseId || '';
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Không thể tải phiếu đóng bao');
  } finally {
    loadingReceipt.value = false;
  }
};

const fetchWarehouses = async () => {
  try {
    const { data } = await transportApi.getWarehouses();
    warehouses.value = Array.isArray(data) ? data : (data as any).data || [];
  } catch { /* silent */ }
};

const fetchBags = async () => {
  if (!receipt.value?.id) return;
  loadingBags.value = true;
  try {
    const { data } = await productionOrderApi.getReceiptDetail(receipt.value.id);
    const result = data.data || data;
    bags.value = result.bags || [];
    // Sync totals
    if (result.receipt) {
      receipt.value.totalBags = result.receipt.totalBags;
      receipt.value.totalPackets = result.receipt.totalPackets;
    }
  } catch (e: any) {
    ElMessage.error('Không thể tải danh sách bao');
  } finally {
    loadingBags.value = false;
  }
};

const handleScan = async () => {
  const code = extractCodeFromQr(scanInput.value);
  if (!code) return;

  if (isBagCode(code)) {
    // Quét mã bao
    if (pendingBagCode.value) {
      ElMessage.warning('Vui lòng quét mã gói để gán bao. Không thể quét 2 mã bao liên tiếp.');
      return;
    }
    pendingBagCode.value = code;
    scanInput.value = '';
    ElMessage.info(`Đã nhận mã bao: ${code}. Vui lòng quét mã gói để liên kết.`);
    nextTick(() => scanInputRef.value?.focus());
    return;
  }

  // Bắt buộc quét mã bao trước
  if (!pendingBagCode.value) {
    ElMessage.warning('Vui lòng quét mã bao trước (mã có hậu tố -B), sau đó mới quét mã gói.');
    scanInput.value = '';
    nextTick(() => scanInputRef.value?.focus());
    return;
  }

  // Quét mã gói → gọi API
  scanning.value = true;
  try {
    const payload: any = { packet_code: code };
    if (pendingBagCode.value) {
      payload.bag_code = pendingBagCode.value;
    }
    const { data } = await productionOrderApi.scanBagLink(receipt.value.id, payload);
    const result = data.data || data;

    ElMessage.success(`Đã liên kết Lô ${result.groupIndex} → Bao ${result.bagSerial} (${result.packetCount} gói)`);
    pendingBagCode.value = '';
    scanInput.value = '';

    // Update totals
    if (result.receiptTotals) {
      receipt.value.totalBags = result.receiptTotals.totalBags;
      receipt.value.totalPackets = result.receiptTotals.totalPackets;
    }

    await fetchBags();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Quét mã thất bại');
  } finally {
    scanning.value = false;
    nextTick(() => scanInputRef.value?.focus());
  }
};

// ==================== ACTIONS ====================

const handleWarehouseChange = async (id: string) => {
  if (!receipt.value?.id) return;
  try {
    await productionOrderApi.updateReceiptWarehouse(receipt.value.id, { warehouse_id: id });
  } catch (e: any) {
    ElMessage.error('Cập nhật kho thất bại');
  }
};

const openPacketDetail = (row: any) => {
  selectedMappingId.value = row.id;
  showPacketDetail.value = true;
};

const openReplaceFromGrid = (row: any) => {
  prefillDamagedSerial.value = '';
  showReplaceDialog.value = true;
};

const openReplaceFromDetail = (serial: string) => {
  showPacketDetail.value = false;
  prefillDamagedSerial.value = serial;
  showReplaceDialog.value = true;
};

const onReplaced = () => {
  fetchBags();
};

const handleRemoveBag = (row: any) => {
  ElMessageBox.confirm(
    `Xóa bao ${row.bagSerial} khỏi phiếu? Lô sẽ trở về trạng thái chưa liên kết.`,
    'Xác nhận xóa',
    { confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', type: 'warning' }
  ).then(async () => {
    try {
      const { data } = await productionOrderApi.removeBagFromReceipt(receipt.value.id, row.id);
      const result = data.data || data;
      ElMessage.success('Đã xóa bao');
      if (result.receiptTotals) {
        receipt.value.totalBags = result.receiptTotals.totalBags;
        receipt.value.totalPackets = result.receiptTotals.totalPackets;
      }
      await fetchBags();
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || 'Xóa thất bại');
    }
  }).catch(() => {});
};

const handleSaveDraft = async () => {
  savingDraft.value = true;
  try {
    await productionOrderApi.saveDraftReceipt(receipt.value.id);
    ElMessage.success('Đã lưu tạm phiếu');
  } catch (e: any) {
    ElMessage.error('Lưu tạm thất bại');
  } finally {
    savingDraft.value = false;
  }
};

const handleComplete = async () => {
  ElMessageBox.confirm(
    `Lưu phiếu ${receipt.value.receiptCode} và nhập kho ${receipt.value.totalBags} bao (${receipt.value.totalPackets} gói)?`,
    'Xác nhận lưu phiếu',
    { confirmButtonText: 'Lưu lại', cancelButtonText: 'Hủy', type: 'info' }
  ).then(async () => {
    completing.value = true;
    try {
      await productionOrderApi.completeReceipt(receipt.value.id);
      ElMessage.success('Đã lưu phiếu và nhập kho thành phẩm');
      receipt.value.status = 'COMPLETED';
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || 'Lưu phiếu thất bại');
    } finally {
      completing.value = false;
    }
  }).catch(() => {});
};

const handleReopen = async () => {
  try {
    await ElMessageBox.confirm(
      `Mở lại phiếu ${receipt.value.receiptCode} để đóng tiếp?\nHiện tại: ${receipt.value.totalBags} bao, ${receipt.value.totalPackets} gói.`,
      'Xác nhận mở lại',
      { confirmButtonText: 'Mở lại', cancelButtonText: 'Hủy', type: 'warning' }
    );
    reopening.value = true;
    await productionOrderApi.reopenReceipt(receipt.value.id);
    ElMessage.success('Đã mở lại phiếu — có thể đóng bao tiếp');
    receipt.value.status = 'PACKING';
  } catch (e: any) {
    if (e === 'cancel') return;
    ElMessage.error(e?.response?.data?.message || 'Không thể mở lại phiếu');
  } finally {
    reopening.value = false;
  }
};

const handleExportBagCodes = async () => {
  exporting.value = true;
  try {
    const res = await productionOrderApi.exportBagCodesExcel(orderId);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ma_bao_${orderId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  } catch {
    ElMessage.error('Xuất file thất bại');
  } finally {
    exporting.value = false;
  }
};

const handleBack = () => {
  if (receipt.value?.status !== 'COMPLETED' && bags.value.length > 0) {
    ElMessageBox.confirm(
      'Phiếu chưa hoàn thành. Lưu tạm trước khi thoát?',
      'Lưu tạm',
      { confirmButtonText: 'Lưu tạm & Thoát', cancelButtonText: 'Thoát không lưu', type: 'warning', distinguishCancelAndClose: true }
    ).then(async () => {
      await handleSaveDraft();
      router.back();
    }).catch((action) => {
      if (action === 'cancel') router.back();
    });
  } else {
    router.back();
  }
};

// === Navigation guard ===
const hasUnsavedWork = computed(() =>
  receipt.value?.status !== 'COMPLETED' && bags.value.length > 0
);

// Guard 1: Vue Router (click menu, navigate)
onBeforeRouteLeave(async (_to, _from) => {
  if (!hasUnsavedWork.value) return true;
  try {
    await ElMessageBox.confirm(
      'Phiếu đóng bao chưa hoàn tất. Bạn muốn lưu tạm trước khi rời đi?',
      'Cảnh báo',
      {
        confirmButtonText: 'Lưu tạm & Thoát',
        cancelButtonText: 'Thoát không lưu',
        distinguishCancelAndClose: true,
        type: 'warning',
      }
    );
    await handleSaveDraft();
    return true;
  } catch (action) {
    if (action === 'cancel') return true; // Thoát không lưu
    return false; // Đóng dialog = ở lại
  }
});

// Guard 2: Browser close / refresh / mất điện → trình duyệt hỏi
const onBeforeUnload = (e: BeforeUnloadEvent) => {
  if (hasUnsavedWork.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};

onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload);
  await Promise.all([fetchWarehouses(), initReceipt()]);
  await fetchBags();
  nextTick(() => scanInputRef.value?.focus());
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload);
});
</script>

<style scoped>
.bag-linking-page {
  min-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 20px;
}

.receipt-header {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.back-btn { font-size: 13px; color: #606266; }

.header-row1 {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.header-title-group {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.header-icon {
  font-size: 28px;
  line-height: 1;
  opacity: 0.7;
}
.header-title-group h2 {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  margin: 0;
  line-height: 1.3;
}
.header-title-group .sub {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

.header-row2 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
.info-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #303133;
}
.info-item label {
  color: #909399;
  font-weight: 400;
}
.info-item strong {
  font-weight: 600;
}

.scan-section {
  margin-bottom: 16px;
}
.scan-box {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.scan-hint {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}
.scan-input :deep(.el-input__inner) {
  font-family: 'Courier New', monospace;
  font-size: 18px;
}

.grid-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  margin-bottom: 0;
  flex: 1;
}
.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.grid-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.footer-section {
  position: sticky;
  bottom: -24px;
  margin: 0 -20px -20px;
  background: #fff;
  border-top: 2px solid #ebeef5;
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
}
.footer-totals {
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}
.footer-totals strong {
  font-weight: 700;
  font-size: 18px;
}
.footer-totals .divider {
  margin: 0 20px;
  color: #c0c4cc;
}
.footer-actions {
  display: flex;
  gap: 12px;
}
</style>
