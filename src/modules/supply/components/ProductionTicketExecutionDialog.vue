<template>
  <el-dialog
    v-model="visible"
    :title="`Thực thi Phiếu Sản Xuất - ${ticket?.ticketCode}`"
    width="850px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @closed="resetForm"
    append-to-body
  >
    <div v-loading="loadingData" class="space-y-4">
      <!-- General Status Bar -->
      <div class="flex justify-between items-center bg-gray-50 p-4 border rounded">
        <div>
          <span class="text-xs text-gray-500 font-semibold block uppercase">Trạng thái hiện tại</span>
          <el-tag :type="getStatusTagType(ticket?.status)">{{ ticket?.status }}</el-tag>
        </div>
        <div class="text-right">
          <span class="text-xs text-gray-500 font-semibold block uppercase">Dự kiến</span>
          <strong class="text-blue-600 text-lg">{{ ticket?.plannedWeightKg }} kg</strong>
        </div>
      </div>

      <!-- Action Buttons for starting/rejecting -->
      <div v-if="ticket?.status === 'OPEN'" class="flex justify-center p-6 border border-dashed rounded bg-yellow-50">
        <div class="text-center space-y-3">
          <p class="text-sm text-yellow-800">Phiếu đang ở trạng thái mới mở. Bạn cần bấm bắt đầu sản xuất để kích hoạt.</p>
          <el-button type="warning" size="large" :loading="submitting" @click="startProduction">
            Bắt đầu sản xuất (START)
          </el-button>
        </div>
      </div>

      <!-- In Progress Action Box -->
      <div v-if="ticket?.status === 'IN_PROGRESS'" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Input parameters -->
        <div class="md:col-span-1 space-y-4 bg-gray-50 p-4 border rounded">
          <h4 class="text-sm font-semibold uppercase text-gray-700">Thông số hoàn thành</h4>
          
          <div class="space-y-2">
            <label class="text-xs text-gray-500 font-medium">Khối lượng thực tế (kg)</label>
            <el-input-number
              v-model="executionForm.actual_weight_kg"
              :min="0.1"
              :precision="1"
              class="w-full"
              controls-position="right"
            />
          </div>

          <div class="p-3 bg-white border rounded text-xs space-y-1">
            <div class="text-gray-500">Giới hạn dung sai lệnh gốc:</div>
            <div class="font-bold text-gray-700">
              {{ minWeight }}kg - {{ maxWeight }}kg
            </div>
            <div v-if="isWeightOutOfRange" class="text-red-500 font-semibold mt-1">
              ⚠️ Khối lượng nằm ngoài tầm dung sai cho phép!
            </div>
          </div>

          <el-divider />

          <div class="space-y-3 pt-2">
            <el-button
              type="success"
              class="w-full"
              size="large"
              :disabled="scannedSerials.length === 0 || isWeightOutOfRange"
              :loading="submitting"
              @click="completeProduction"
            >
              Hoàn thành & Nhập kho
            </el-button>

            <el-button
              type="danger"
              class="w-full"
              plain
              @click="showRejectPrompt"
            >
              Hủy / Từ chối (QC Fail)
            </el-button>
          </div>
        </div>

        <!-- Scanning console -->
        <div class="md:col-span-2 space-y-4">
          <div class="bg-slate-900 text-white p-4 rounded-lg shadow-inner">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs text-slate-400 font-mono">CONSOLE QUÉT MÃ (SCANNER LISTENER)</span>
              <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
                ĐÃ QUÉT: {{ scannedSerials.length }}
              </span>
            </div>

            <!-- Custom Enter scan listener input -->
            <el-input
              v-model="scanInput"
              ref="scanInputRef"
              placeholder="Quét tem nhãn thành phẩm (Nhấn ENTER)..."
              class="custom-console-input"
              @keyup.enter="handleScan"
            >
              <template #append>
                <el-button @click="handleScan">Thêm</el-button>
              </template>
            </el-input>

            <div class="text-2xs text-slate-400 mt-2">
              💡 Hỗ trợ đầu đọc mã vạch USB/Bluetooth. Hệ thống tự động tách dòng và lọc mã trùng lặp.
            </div>
          </div>

          <!-- List of scanned serials -->
          <div class="border rounded-lg p-3 bg-white">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-semibold text-gray-700">Danh sách tem đã quét</span>
              <el-button
                v-if="scannedSerials.length > 0"
                type="danger"
                link
                size="small"
                @click="clearScanned"
              >
                Xóa tất cả
              </el-button>
            </div>

            <div v-if="scannedSerials.length === 0" class="py-8 text-center text-gray-400 text-sm italic">
              Chưa có mã nào được quét. Hãy sử dụng đầu đọc quét mã QR/Barcode hoặc gõ thủ công.
            </div>

            <div v-else class="max-h-60 overflow-y-auto flex flex-wrap gap-2 p-1 border border-dashed rounded bg-gray-50">
              <el-tag
                v-for="(serial, index) in scannedSerials"
                :key="serial"
                closable
                type="info"
                class="font-mono text-sm"
                @close="removeSerial(index)"
              >
                {{ serial }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- Closed status preview -->
      <div v-if="ticket?.status === 'COMPLETED' || ticket?.status === 'REJECTED'" class="p-4 bg-gray-50 rounded border space-y-2">
        <h4 class="text-sm font-semibold text-gray-700">Chi tiết thực hiện lịch sử:</h4>
        <div class="text-sm grid grid-cols-2 gap-4">
          <div>Khối lượng thực tế: <strong>{{ ticket?.actualWeightKg }} kg</strong></div>
          <div>Người thực hiện: <strong>{{ ticket?.updatedBy || 'N/A' }}</strong></div>
          <div v-if="ticket?.rejectionReason" class="col-span-2 text-red-500">
            Lý do từ chối: {{ ticket?.rejectionReason }}
          </div>
        </div>

        <el-divider />

        <!-- Serial list overview -->
        <div>
          <span class="text-xs text-gray-500 font-semibold block mb-2">DANH SÁCH SERIAL ĐÃ KÍCH HOẠT:</span>
          <div class="max-h-40 overflow-y-auto p-2 bg-white border rounded font-mono text-xs text-gray-600">
            {{ ticket?.serials?.join(', ') || 'Không có mã nào' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Reject input dialog -->
    <el-dialog
      v-model="rejectPromptVisible"
      title="Lý do từ chối phiếu"
      width="400px"
      append-to-body
    >
      <el-form label-position="top">
        <el-form-item label="Nhập lý do chi tiết (QC fail, lỗi tem, hao hụt quá mức...)">
          <el-input v-model="rejectionReason" type="textarea" :rows="3" placeholder="Lý do..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectPromptVisible = false">Quay lại</el-button>
        <el-button type="danger" :disabled="!rejectionReason.trim()" @click="submitRejection">
          Xác nhận Hủy Phiếu
        </el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { productionOrderApi } from '../api/productionOrderApi';

const emit = defineEmits(['success']);

const visible = ref(false);
const loadingData = ref(false);
const submitting = ref(false);
const ticket = ref<any>(null);

const scanInput = ref('');
const scanInputRef = ref<any>(null);
const scannedSerials = ref<string[]>([]);

const rejectPromptVisible = ref(false);
const rejectionReason = ref('');

const executionForm = reactive({
  actual_weight_kg: 0
});

// Computed tolerance limits from production order
const minWeight = computed(() => {
  if (!ticket.value || !ticket.value.order) return 0.1;
  const o = ticket.value.order;
  const tolerance = (ticket.value.plannedWeightKg * (o.weightTolerancePct || 0)) / 100;
  return Math.max(0.1, parseFloat((ticket.value.plannedWeightKg - tolerance).toFixed(1)));
});

const maxWeight = computed(() => {
  if (!ticket.value || !ticket.value.order) return 999999;
  const o = ticket.value.order;
  const tolerance = (ticket.value.plannedWeightKg * (o.weightTolerancePct || 0)) / 100;
  return parseFloat((ticket.value.plannedWeightKg + tolerance).toFixed(1));
});

const isWeightOutOfRange = computed(() => {
  const w = executionForm.actual_weight_kg;
  return w < minWeight.value || w > maxWeight.value;
});

const open = async (targetTicketId: string) => {
  visible.value = true;
  await loadTicketDetails(targetTicketId);
};

const loadTicketDetails = async (id: string) => {
  loadingData.value = true;
  try {
    const { data } = await productionOrderApi.getTicketDetail(id);
    ticket.value = data;
    executionForm.actual_weight_kg = data.plannedWeightKg;
    
    // Autofocus console input when IN_PROGRESS
    if (data.status === 'IN_PROGRESS') {
      nextTick(() => scanInputRef.value?.focus());
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi khi tải chi tiết phiếu');
  } finally {
    loadingData.value = false;
  }
};

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'OPEN': return 'info';
    case 'IN_PROGRESS': return 'warning';
    case 'COMPLETED': return 'success';
    case 'REJECTED': return 'danger';
    default: return 'info';
  }
};

const startProduction = async () => {
  if (!ticket.value) return;
  submitting.value = true;
  try {
    await productionOrderApi.startTicket(ticket.value.id);
    ElMessage.success('Phiếu đã chuyển sang IN_PROGRESS. Hãy quét mã sản phẩm!');
    await loadTicketDetails(ticket.value.id);
    emit('success');
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không thể bắt đầu thực thi phiếu');
  } finally {
    submitting.value = false;
  }
};

const handleScan = () => {
  const inputVal = scanInput.value.trim();
  if (!inputVal) return;

  // Process comma separated or space separated values
  const rawCodes = inputVal.split(/[\s,]+/);
  const validCodes = rawCodes.map(c => c.trim()).filter(Boolean);

  let addedCount = 0;
  validCodes.forEach(code => {
    if (!scannedSerials.value.includes(code)) {
      scannedSerials.value.unshift(code);
      addedCount++;
    }
  });

  scanInput.value = '';
  if (addedCount > 0) {
    ElMessage.success(`Đã thêm ${addedCount} mã serial.`);
  } else {
    ElMessage.warning('Các mã được quét đã trùng lặp hoặc không hợp lệ.');
  }

  nextTick(() => scanInputRef.value?.focus());
};

const removeSerial = (index: number) => {
  scannedSerials.value.splice(index, 1);
};

const clearScanned = () => {
  scannedSerials.value = [];
};

const completeProduction = async () => {
  if (!ticket.value) return;
  submitting.value = true;
  try {
    const payload = {
      actual_weight_kg: executionForm.actual_weight_kg,
      serials: ticket.value.ticketType !== 'PALLET' ? scannedSerials.value : undefined,
      child_serials: ticket.value.ticketType === 'PALLET' ? scannedSerials.value : undefined
    };

    await productionOrderApi.completeTicket(ticket.value.id, payload);
    ElMessage.success('Hoàn thành phiếu sản xuất và nhập kho thành công!');
    visible.value = false;
    emit('success');
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra khi hoàn thành phiếu');
  } finally {
    submitting.value = false;
  }
};

const showRejectPrompt = () => {
  rejectPromptVisible.value = true;
};

const submitRejection = async () => {
  if (!ticket.value || !rejectionReason.value.trim()) return;
  submitting.value = true;
  try {
    await productionOrderApi.rejectTicket(ticket.value.id, { reason: rejectionReason.value });
    ElMessage.warning('Đã từ chối phiếu sản xuất!');
    rejectPromptVisible.value = false;
    visible.value = false;
    emit('success');
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không thể từ chối phiếu');
  } finally {
    submitting.value = false;
  }
};

const resetForm = () => {
  ticket.value = null;
  scanInput.value = '';
  scannedSerials.value = [];
  rejectionReason.value = '';
  rejectPromptVisible.value = false;
};

defineExpose({ open });
</script>

<style scoped>
.custom-console-input :deep(.el-input__wrapper) {
  background-color: rgb(30, 41, 59) !important;
  color: rgb(248, 250, 252) !important;
  border-color: rgb(71, 85, 105) !important;
  box-shadow: none !important;
}

.custom-console-input :deep(.el-input__inner) {
  color: rgb(248, 250, 252) !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
