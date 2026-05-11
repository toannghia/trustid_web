<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Quản lý Thu hồi Sản phẩm</h2>
        <p class="text-gray-500 text-sm mt-1">Xem và xử lý các yêu cầu thu hồi từ cơ quan quản lý</p>
      </div>
      <div class="flex gap-2">
        <el-button type="danger" @click="openSelfRecallDialog">
          <el-icon class="mr-1"><Warning /></el-icon> Tự thu hồi sản phẩm
        </el-button>
        <el-button @click="fetchRecalls" :loading="loading">
          <el-icon class="mr-1"><Refresh /></el-icon> Làm mới
        </el-button>
      </div>
    </div>

    <!-- Self-recall dialog -->
    <el-dialog v-model="selfRecallVisible" title="🚨 Doanh nghiệp tự thu hồi sản phẩm" width="720px" @close="resetSelfRecall">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Bước 1: Nhập mã QR / Serial của sản phẩm</label>
          <div class="flex gap-2">
            <el-input v-model="lookupCode" placeholder="Quét hoặc nhập mã QR/serial..." @keyup.enter="doLookup" clearable />
            <el-button type="primary" @click="doLookup" :loading="lookupLoading" :disabled="!lookupCode.trim()">
              Tra cứu
            </el-button>
          </div>
        </div>

        <div v-if="lookupResult" class="border-t pt-4">
          <div class="bg-blue-50 rounded p-3 mb-3 text-sm">
            <div><span class="font-semibold">Sản phẩm:</span> {{ lookupResult.product.name }}</div>
            <div><span class="font-semibold">Doanh nghiệp:</span> {{ lookupResult.product.tenantName || '---' }}</div>
          </div>

          <label class="block text-sm font-semibold text-gray-700 mb-2">Bước 2: Chọn các lô cần thu hồi</label>
          <el-table
            :data="lookupResult.batches"
            @selection-change="(rows: any[]) => selectedBatchIds = rows.map(r => r.id)"
            max-height="280"
            stripe
          >
            <el-table-column type="selection" width="48" :selectable="(row: any) => row.activeCount > 0" />
            <el-table-column label="Mã lô" prop="batchCode" min-width="140">
              <template #default="{ row }">
                <span class="font-mono text-sm">{{ row.batchCode }}</span>
                <el-tag v-if="row.isScannedItemBatch" type="warning" size="small" class="ml-2">Lô của mã đã quét</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Loại" prop="batchType" width="90" />
            <el-table-column label="Tem Active" width="100" align="center">
              <template #default="{ row }">
                <span :class="row.activeCount === 0 ? 'text-gray-400' : 'text-green-600 font-semibold'">{{ row.activeCount }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Đã thu hồi" width="100" align="center">
              <template #default="{ row }">
                <span :class="row.recalledCount > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'">{{ row.recalledCount }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Tổng" width="80" align="center" prop="totalCount" />
          </el-table>

          <div class="mt-4">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Bước 3: Lý do thu hồi <span class="text-red-500">*</span></label>
            <el-input v-model="selfRecallReason" type="textarea" :rows="3" placeholder="VD: Phát hiện lỗi sản xuất, sai bao bì..." />
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="selfRecallVisible = false">Hủy</el-button>
        <el-button
          type="danger"
          :disabled="!lookupResult || selectedBatchIds.length === 0 || !selfRecallReason.trim()"
          :loading="selfSubmitting"
          @click="submitSelfRecall"
        >
          Thu hồi {{ selectedBatchIds.length }} lô
        </el-button>
      </template>
    </el-dialog>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
        <div class="text-gray-500 font-medium text-sm">Chờ xác nhận</div>
        <div class="text-3xl font-bold mt-2 text-yellow-600">{{ pendingCount }}</div>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
        <div class="text-gray-500 font-medium text-sm">Đã thu hồi</div>
        <div class="text-3xl font-bold mt-2 text-red-600">{{ recalledCount }}</div>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
        <div class="text-gray-500 font-medium text-sm">Đã từ chối</div>
        <div class="text-3xl font-bold mt-2 text-green-600">{{ rejectedCount }}</div>
      </div>
    </div>

    <!-- Recall list -->
    <div class="bg-white rounded-lg shadow-sm">
      <el-table :data="recalls" v-loading="loading" stripe style="width: 100%" empty-text="Không có yêu cầu thu hồi nào">
        <el-table-column prop="name" label="Sản phẩm" min-width="180">
          <template #default="{ row }">
            <div class="font-semibold text-gray-800">{{ row.name }}</div>
            <div class="text-xs text-gray-400 font-mono">{{ row.id?.substring(0, 8) }}...</div>
          </template>
        </el-table-column>

        <el-table-column label="Trạng thái" width="160" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.govStatus)" size="default" effect="dark" round>
              {{ statusLabel(row.govStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="recallReason" label="Lý do thu hồi" min-width="250">
          <template #default="{ row }">
            <div class="text-sm text-red-600">{{ row.recallReason }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Ngày yêu cầu" width="170">
          <template #default="{ row }">
            <div class="text-sm text-gray-600">{{ formatDate(row.recallRequestedAt) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Ngày xử lý" width="170">
          <template #default="{ row }">
            <div v-if="row.recalledAt" class="text-sm text-red-600">{{ formatDate(row.recalledAt) }}</div>
            <div v-else-if="row.recallRejectedAt" class="text-sm text-green-600">{{ formatDate(row.recallRejectedAt) }}</div>
            <span v-else class="text-gray-400">—</span>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <template v-if="row.govStatus === 'PENDING_RECALL'">
              <el-button type="danger" size="small" @click="handleConfirm(row)" :loading="actionLoading === row.id + '_confirm'">
                Xác nhận Thu hồi
              </el-button>
              <el-button type="success" size="small" plain @click="handleReject(row)" :loading="actionLoading === row.id + '_reject'">
                Từ chối
              </el-button>
            </template>
            <template v-else-if="row.govStatus === 'RECALLED'">
              <el-tag type="danger" effect="plain" size="small">✓ Đã thu hồi</el-tag>
            </template>
            <template v-else-if="row.govStatus === 'RECALL_REJECTED'">
              <el-tooltip :content="row.recallRejectReason" placement="top">
                <el-tag type="success" effect="plain" size="small">✓ Đã từ chối</el-tag>
              </el-tooltip>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Refresh, Warning } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const recalls = ref<any[]>([]);
const loading = ref(false);
const actionLoading = ref('');

const pendingCount = computed(() => recalls.value.filter(r => r.govStatus === 'PENDING_RECALL').length);
const recalledCount = computed(() => recalls.value.filter(r => r.govStatus === 'RECALLED').length);
const rejectedCount = computed(() => recalls.value.filter(r => r.govStatus === 'RECALL_REJECTED').length);

const statusType = (status: string) => {
  if (status === 'PENDING_RECALL') return 'warning';
  if (status === 'RECALLED') return 'danger';
  if (status === 'RECALL_REJECTED') return 'success';
  return 'info';
};

const statusLabel = (status: string) => {
  if (status === 'PENDING_RECALL') return '⏳ Chờ xác nhận';
  if (status === 'RECALLED') return '🚨 Đã thu hồi';
  if (status === 'RECALL_REJECTED') return '✅ Đã từ chối';
  return status;
};

const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

const fetchRecalls = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/api/gov/recalls/pending');
    recalls.value = Array.isArray(data) ? data : [];
  } catch (e) {
    ElMessage.error('Lỗi khi tải danh sách thu hồi');
  } finally {
    loading.value = false;
  }
};

const handleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `Xác nhận thu hồi sản phẩm "${row.name}"?\n\nTất cả tem Active và đang tại đại lý sẽ bị chuyển sang trạng thái RECALLED. Đại lý sẽ nhận thông báo ngừng bán.`,
      '⚠️ Xác nhận Thu hồi',
      { confirmButtonText: 'Thu hồi ngay', cancelButtonText: 'Hủy', type: 'error' }
    );

    actionLoading.value = row.id + '_confirm';
    const { data } = await api.post(`/api/gov/products/${row.id}/confirm-recall`);
    ElMessage.success(data.message || 'Đã xác nhận thu hồi');
    fetchRecalls();
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || 'Lỗi xác nhận thu hồi');
  } finally {
    actionLoading.value = '';
  }
};

const handleReject = async (row: any) => {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      `Nhập lý do từ chối thu hồi sản phẩm "${row.name}":`,
      'Từ chối Thu hồi',
      { confirmButtonText: 'Gửi', cancelButtonText: 'Hủy', inputPlaceholder: 'VD: Sản phẩm đã qua kiểm định chất lượng...' }
    );

    if (!reason?.trim()) {
      ElMessage.warning('Vui lòng nhập lý do');
      return;
    }

    actionLoading.value = row.id + '_reject';
    await api.post(`/api/gov/products/${row.id}/reject-recall`, { reason: reason.trim() });
    ElMessage.success('Đã từ chối yêu cầu thu hồi');
    fetchRecalls();
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || 'Lỗi từ chối thu hồi');
  } finally {
    actionLoading.value = '';
  }
};

// ===== Self-recall (enterprise initiates) =====
const selfRecallVisible = ref(false);
const lookupCode = ref('');
const lookupLoading = ref(false);
const lookupResult = ref<any>(null);
const selectedBatchIds = ref<string[]>([]);
const selfRecallReason = ref('');
const selfSubmitting = ref(false);

const openSelfRecallDialog = () => {
  resetSelfRecall();
  selfRecallVisible.value = true;
};

const resetSelfRecall = () => {
  lookupCode.value = '';
  lookupResult.value = null;
  selectedBatchIds.value = [];
  selfRecallReason.value = '';
};

const doLookup = async () => {
  if (!lookupCode.value.trim()) return;
  lookupLoading.value = true;
  lookupResult.value = null;
  selectedBatchIds.value = [];
  try {
    const { data } = await api.get('/api/gov/lookup-by-code', { params: { code: lookupCode.value.trim() } });
    lookupResult.value = data;
    if (!data.batches?.length) ElMessage.warning('Sản phẩm không có lô nào');
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Không tìm thấy sản phẩm');
  } finally {
    lookupLoading.value = false;
  }
};

const submitSelfRecall = async () => {
  if (!selectedBatchIds.value.length || !selfRecallReason.value.trim()) return;
  try {
    await ElMessageBox.confirm(
      `Doanh nghiệp xác nhận tự thu hồi ${selectedBatchIds.value.length} lô? Tất cả tem Active/At Dealer trong các lô này sẽ chuyển sang RECALLED ngay lập tức.`,
      '⚠️ Xác nhận tự thu hồi',
      { confirmButtonText: 'Thu hồi ngay', cancelButtonText: 'Hủy', type: 'error' }
    );
    selfSubmitting.value = true;
    const { data } = await api.post('/api/gov/recalls/by-batches', {
      batchIds: selectedBatchIds.value,
      reason: selfRecallReason.value.trim(),
      initiatedBy: 'TENANT',
    });
    ElMessage.success(data.message || 'Đã thu hồi thành công');
    selfRecallVisible.value = false;
    fetchRecalls();
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || 'Lỗi thu hồi');
  } finally {
    selfSubmitting.value = false;
  }
};

onMounted(() => fetchRecalls());
</script>
