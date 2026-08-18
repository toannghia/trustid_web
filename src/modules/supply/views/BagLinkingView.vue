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

    <!-- Dialog Xác nhận mở lại phiếu -->
    <el-dialog
      v-model="reopenDialogVisible"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">Xác nhận mở lại phiếu</span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="reopenDialogVisible = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <div style="padding: 24px 24px 8px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;">
          <el-icon class="text-green-500 mt-1" :size="20"><InfoFilled /></el-icon>
          <div>
            <div class="text-sm font-semibold text-gray-800 mb-1">Mở lại phiếu <span class="text-green-600">{{ receipt?.receiptCode }}</span> để đóng tiếp?</div>
            <div class="text-xs text-gray-600">
              Hiện tại đã đóng: <strong class="text-gray-900">{{ receipt?.totalBags || 0 }}</strong> bao, 
              <strong class="text-gray-900">{{ receipt?.totalPackets || 0 }}</strong> gói.
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="reopenDialogVisible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button
            type="success"
            :loading="reopening"
            @click="submitReopen"
            style="border-radius: 8px; padding: 10px 20px;"
          >
            Mở lại phiếu
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Dialog Cảnh báo chưa lưu -->
    <el-dialog
      v-model="unsavedDialogVisible"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">Xác nhận thoát</span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="handleUnsavedAction('cancel')">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <div style="padding: 24px 24px 8px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;">
          <el-icon class="text-green-500 mt-1" :size="20"><InfoFilled /></el-icon>
          <div>
            <div class="text-sm font-semibold text-green-800 mb-1">Phiếu đóng bao chưa hoàn tất!</div>
            <div class="text-xs text-gray-700">
              Bạn có muốn lưu lại phiếu đang làm dang dở trước khi rời đi không? Nếu thoát không lưu, dữ liệu vừa quét sẽ bị mất.
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="handleUnsavedAction('discard')" style="border-radius: 8px; padding: 10px 20px;">Thoát không lưu</el-button>
          <el-button
            type="primary"
            :loading="savingDraft"
            @click="handleUnsavedAction('save')"
            style="border-radius: 8px; padding: 10px 20px;"
          >
            Lưu tạm & Thoát
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Dialog Xác nhận lưu phiếu -->
    <el-dialog
      v-model="completeDialogVisible"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">Xác nhận lưu phiếu</span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="completeDialogVisible = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <div style="padding: 24px 24px 8px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;">
          <el-icon class="text-green-500 mt-1" :size="20"><InfoFilled /></el-icon>
          <div>
            <div class="text-sm font-semibold text-green-800 mb-1">Lưu phiếu {{ receipt?.receiptCode }}?</div>
            <div class="text-xs text-gray-700">
              Hành động này sẽ đóng phiếu và nhập kho thành phẩm tổng cộng <strong class="text-gray-900">{{ receipt?.totalBags || 0 }}</strong> bao 
              (<strong class="text-gray-900">{{ receipt?.totalPackets || 0 }}</strong> gói).
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="completeDialogVisible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button
            type="primary"
            :loading="completing"
            @click="submitComplete"
            style="border-radius: 8px; padding: 10px 20px;"
          >
            Lưu lại
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Dialog Xác nhận xóa -->
    <el-dialog
      v-model="removeDialogVisible"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">Xác nhận xóa</span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="removeDialogVisible = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <div style="padding: 24px 24px 8px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;">
          <el-icon class="text-red-500 mt-1" :size="20"><WarningFilled /></el-icon>
          <div>
            <div class="text-sm font-semibold text-red-800 mb-1">Xóa bao {{ bagToRemove?.bagSerial }} khỏi phiếu?</div>
            <div class="text-xs text-gray-700">
              Bao này sẽ được hủy liên kết khỏi phiếu. Hành động này không thể hoàn tác.
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="removeDialogVisible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button
            type="danger"
            :loading="removingBag"
            @click="submitRemoveBag"
            style="border-radius: 8px; padding: 10px 20px;"
          >
            Xác nhận Xóa
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Refresh, Download, InfoFilled } from '@element-plus/icons-vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
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
const reopenDialogVisible = ref(false);
const isDirty = ref(false);

const unsavedDialogVisible = ref(false);
let unsavedDialogResolve: ((value: boolean | 'save' | 'discard') => void) | null = null;

const completeDialogVisible = ref(false);
const removeDialogVisible = ref(false);
const bagToRemove = ref<any>(null);
const removingBag = ref(false);

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
    isDirty.value = true;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Quét mã thất bại');
  } finally {
    scanning.value = false;
    nextTick(() => scanInputRef.value?.focus());
  }
};

// ==================== ACTIONS ====================

const handleWarehouseChange = (id: string) => {
  isDirty.value = true;
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
  isDirty.value = true;
};

const handleRemoveBag = (row: any) => {
  bagToRemove.value = row;
  removeDialogVisible.value = true;
};

const submitRemoveBag = async () => {
  if (!bagToRemove.value) return;
  removingBag.value = true;
  try {
    const { data } = await productionOrderApi.removeBagFromReceipt(receipt.value.id, bagToRemove.value.id);
    const result = data.data || data;
    ElMessage.success('Đã xóa bao');
    if (result.receiptTotals) {
      receipt.value.totalBags = result.receiptTotals.totalBags;
      receipt.value.totalPackets = result.receiptTotals.totalPackets;
    }
    await fetchBags();
    removeDialogVisible.value = false;
    isDirty.value = true;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Xóa thất bại');
  } finally {
    removingBag.value = false;
  }
};

const handleSaveDraft = async (): Promise<boolean> => {
  if (!selectedWarehouseId.value) {
    ElMessage.warning('Vui lòng chọn Kho lưu trước khi lưu phiếu!');
    // Cuộn lên chỗ chọn kho lưu để người dùng dễ thấy
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
  }

  savingDraft.value = true;
  try {
    if (selectedWarehouseId.value && selectedWarehouseId.value !== receipt.value?.warehouseId) {
      await productionOrderApi.updateReceiptWarehouse(receipt.value.id, { warehouse_id: selectedWarehouseId.value });
      receipt.value.warehouseId = selectedWarehouseId.value;
    }
    await productionOrderApi.saveDraftReceipt(receipt.value.id);
    ElMessage.success('Đã lưu tạm phiếu');
    isDirty.value = false;
    return true;
  } catch (e: any) {
    ElMessage.error('Lưu tạm thất bại');
    return false;
  } finally {
    savingDraft.value = false;
  }
};

const promptUnsavedChanges = (): Promise<boolean | 'save' | 'discard'> => {
  return new Promise((resolve) => {
    unsavedDialogVisible.value = true;
    unsavedDialogResolve = resolve;
  });
};

const handleUnsavedAction = async (action: 'save' | 'discard' | 'cancel') => {
  if (action === 'save') {
    const success = await handleSaveDraft();
    if (!success) {
      // Đóng dialog cảnh báo và hủy việc chuyển trang (trả về false) để người dùng chọn kho
      unsavedDialogVisible.value = false;
      if (unsavedDialogResolve) unsavedDialogResolve(false);
      unsavedDialogResolve = null;
      return;
    }
    unsavedDialogVisible.value = false;
    if (unsavedDialogResolve) unsavedDialogResolve('save');
  } else if (action === 'discard') {
    unsavedDialogVisible.value = false;
    if (unsavedDialogResolve) unsavedDialogResolve('discard');
  } else {
    unsavedDialogVisible.value = false;
    if (unsavedDialogResolve) unsavedDialogResolve(false);
  }
  unsavedDialogResolve = null;
};

const handleComplete = () => {
  if (!selectedWarehouseId.value) {
    ElMessage.warning('Vui lòng chọn Kho lưu trước khi chốt phiếu!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  completeDialogVisible.value = true;
};

const submitComplete = async () => {
  completing.value = true;
  try {
    if (selectedWarehouseId.value && selectedWarehouseId.value !== receipt.value?.warehouseId) {
      await productionOrderApi.updateReceiptWarehouse(receipt.value.id, { warehouse_id: selectedWarehouseId.value });
      receipt.value.warehouseId = selectedWarehouseId.value;
    }
    await productionOrderApi.completeReceipt(receipt.value.id);
    ElMessage.success('Đã lưu phiếu và nhập kho thành phẩm');
    receipt.value.status = 'COMPLETED';
    completeDialogVisible.value = false;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Lưu phiếu thất bại');
  } finally {
    completing.value = false;
  }
};

const handleReopen = () => {
  reopenDialogVisible.value = true;
};

const submitReopen = async () => {
  reopening.value = true;
  try {
    await productionOrderApi.reopenReceipt(receipt.value.id);
    ElMessage.success('Đã mở lại phiếu — có thể đóng bao tiếp');
    receipt.value.status = 'PACKING';
    reopenDialogVisible.value = false;
  } catch (e: any) {
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
  router.back();
};

// === Navigation guard ===
const hasUnsavedWork = computed(() =>
  receipt.value?.status !== 'COMPLETED' && isDirty.value
);

// Guard 1: Vue Router (click menu, navigate)
onBeforeRouteLeave(async (_to, _from) => {
  if (!hasUnsavedWork.value) return true;
  
  const action = await promptUnsavedChanges();
  if (action === 'save' || action === 'discard') {
    return true;
  }
  return false;
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
