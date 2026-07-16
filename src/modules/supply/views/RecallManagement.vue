<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Quản lý Thu hồi Sản phẩm</h2>
        <p class="text-gray-500 text-sm mt-1">Tạo và theo dõi lệnh thu hồi sản phẩm</p>
      </div>
      <div class="flex gap-2">
        <el-button type="danger" @click="showCreateDialog = true">
          <el-icon class="mr-1"><Warning /></el-icon> Tạo lệnh thu hồi
        </el-button>
        <el-button @click="fetchOrders" :loading="loading">
          <el-icon class="mr-1"><Refresh /></el-icon> Làm mới
        </el-button>
      </div>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-400">
        <div class="text-gray-500 text-xs font-medium uppercase">Tổng lệnh</div>
        <div class="text-2xl font-bold mt-1 text-gray-800">{{ stats.total }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
        <div class="text-gray-500 text-xs font-medium uppercase">Nháp</div>
        <div class="text-2xl font-bold mt-1 text-blue-600">{{ stats.draft }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
        <div class="text-gray-500 text-xs font-medium uppercase">Đã phát hành</div>
        <div class="text-2xl font-bold mt-1 text-yellow-600">{{ stats.issued }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
        <div class="text-gray-500 text-xs font-medium uppercase">Đang xử lý</div>
        <div class="text-2xl font-bold mt-1 text-orange-600">{{ stats.inProgress }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
        <div class="text-gray-500 text-xs font-medium uppercase">Hoàn tất</div>
        <div class="text-2xl font-bold mt-1 text-green-600">{{ stats.completed }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-4 items-end">
      <div>
        <div class="text-xs font-bold text-gray-500 mb-1 uppercase">Trạng thái</div>
        <el-select v-model="filterStatus" placeholder="Tất cả" clearable class="w-40" @change="fetchOrders">
          <el-option label="Nháp" value="DRAFT" />
          <el-option label="Đã phát hành" value="ISSUED" />
          <el-option label="Đang xử lý" value="IN_PROGRESS" />
          <el-option label="Hoàn tất" value="COMPLETED" />
          <el-option label="Đã hủy" value="CANCELLED" />
        </el-select>
      </div>
    </div>

    <!-- Orders table -->
    <div class="bg-white rounded-lg shadow-sm">
      <el-table :data="orders" v-loading="loading" stripe style="width: 100%" empty-text="Chưa có lệnh thu hồi nào">
        <el-table-column label="Mã lệnh" width="160">
          <template #default="{ row }">
            <span class="font-mono font-bold text-blue-600 cursor-pointer hover:underline" @click="goToDetail(row.id)">{{ row.code }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Sản phẩm" min-width="200">
          <template #default="{ row }">
            <div class="font-semibold text-gray-800">{{ row.product?.name || '---' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Mức độ" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="recallSeverityType(row.severity)" size="small" effect="dark" round>{{ recallSeverityLabel(row.severity) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Trạng thái" width="140" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="default" effect="plain" round>{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Tiến độ" width="180">
          <template #default="{ row }">
            <div class="text-xs text-gray-500 mb-1">
              {{ row.totalReturned + row.totalDisposed + row.totalRestocked }} / {{ row.totalAffected }} tem
            </div>
            <el-progress
              :percentage="row.totalAffected > 0 ? Math.round(((row.totalReturned + row.totalDisposed + row.totalRestocked) / row.totalAffected) * 100) : 0"
              :stroke-width="6"
              :color="row.status === 'COMPLETED' ? '#67C23A' : '#E6A23C'"
            />
          </template>
        </el-table-column>

        <el-table-column label="Lý do" min-width="200">
          <template #default="{ row }">
            <div class="text-sm text-red-600 line-clamp-2">{{ row.reason }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Ngày tạo" width="150">
          <template #default="{ row }">
            <div class="text-sm text-gray-600">{{ formatDate(row.createdAt) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="goToDetail(row.id)">
              <el-icon class="mr-1"><View /></el-icon> Chi tiết
            </el-button>
            <el-button v-if="row.status === 'DRAFT'" type="danger" size="small" link @click="handleIssue(row)">
              Phát hành
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="p-4 flex justify-center" v-if="total > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchOrders"
        />
      </div>
    </div>

    <!-- Create Recall Order Dialog -->
    <el-dialog v-model="showCreateDialog" title="🚨 Tạo lệnh Thu hồi Sản phẩm" width="720px" @close="resetCreateForm">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Bước 1: Nhập mã QR / Serial để tra cứu sản phẩm</label>
          <div class="flex gap-2">
            <el-input v-model="lookupCode" placeholder="Quét hoặc nhập mã QR/serial..." @keyup.enter="doLookup" clearable />
            <el-button type="primary" @click="doLookup" :loading="lookupLoading" :disabled="!lookupCode.trim()">Tra cứu</el-button>
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
            max-height="280" stripe
          >
            <el-table-column type="selection" width="48" :selectable="(row: any) => row.activeCount > 0" />
            <el-table-column label="Mã lô" prop="batchCode" min-width="140">
              <template #default="{ row }">
                <span class="font-mono text-sm">{{ row.batchCode }}</span>
                <el-tag v-if="row.isScannedItemBatch" type="warning" size="small" class="ml-2">Lô đã quét</el-tag>
              </template>
            </el-table-column>
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
          </el-table>

          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Mức độ nghiêm trọng</label>
              <el-select v-model="createForm.severity" class="w-full">
                <el-option label="Class I — Nguy hiểm sức khỏe" value="CLASS_I" />
                <el-option label="Class II — Vi phạm quy định" value="CLASS_II" />
                <el-option label="Class III — Lỗi nhỏ" value="CLASS_III" />
              </el-select>
            </div>
            <div></div>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Lý do thu hồi <span class="text-red-500">*</span></label>
            <el-input v-model="createForm.reason" type="textarea" :rows="3" placeholder="VD: Phát hiện lỗi sản xuất, sai bao bì..." />
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showCreateDialog = false">Hủy</el-button>
        <el-button
          type="danger"
          :disabled="!lookupResult || selectedBatchIds.length === 0 || !createForm.reason.trim()"
          :loading="creating"
          @click="submitCreate"
        >
          Tạo lệnh thu hồi ({{ selectedBatchIds.length }} lô)
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Refresh, Warning, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { recallApi } from '../api/recallApi';
import api from '@/common/utils/api';
import { recallSeverityLabel, recallSeverityType } from '@/common/utils/status-labels';

const router = useRouter();
const orders = ref<any[]>([]);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterStatus = ref('');

const stats = computed(() => {
  const all = orders.value;
  return {
    total: total.value,
    draft: all.filter(o => o.status === 'DRAFT').length,
    issued: all.filter(o => o.status === 'ISSUED').length,
    inProgress: all.filter(o => o.status === 'IN_PROGRESS').length,
    completed: all.filter(o => o.status === 'COMPLETED').length,
  };
});

const statusType = (s: string) => {
  const map: Record<string, string> = { DRAFT: 'info', ISSUED: 'warning', IN_PROGRESS: '', COMPLETED: 'success', CANCELLED: 'danger' };
  return map[s] || 'info';
};
const statusLabel = (s: string) => {
  const map: Record<string, string> = { DRAFT: 'Nháp', ISSUED: 'Đã phát hành', IN_PROGRESS: 'Đang xử lý', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy' };
  return map[s] || s;
};
const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const fetchOrders = async () => {
  loading.value = true;
  try {
    const { data } = await recallApi.getOrders({
      status: filterStatus.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    });
    orders.value = data.data || [];
    total.value = data.total || 0;
  } catch (e) {
    ElMessage.error('Lỗi tải danh sách lệnh thu hồi');
  } finally {
    loading.value = false;
  }
};

const goToDetail = (id: string) => {
  router.push({ name: 'RecallOrderDetail', params: { id } });
};

const handleIssue = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `Phát hành lệnh thu hồi "${row.code}"? Tất cả tem Active/At Dealer sẽ chuyển sang RECALLED và dealer sẽ nhận thông báo.`,
      '⚠️ Phát hành lệnh thu hồi',
      { confirmButtonText: 'Phát hành', cancelButtonText: 'Hủy', type: 'error' }
    );
    await recallApi.issueOrder(row.id);
    ElMessage.success('Đã phát hành lệnh thu hồi');
    fetchOrders();
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || 'Lỗi phát hành');
  }
};

// ===== Create Dialog =====
const showCreateDialog = ref(false);
const lookupCode = ref('');
const lookupLoading = ref(false);
const lookupResult = ref<any>(null);
const selectedBatchIds = ref<string[]>([]);
const creating = ref(false);
const createForm = ref({ severity: 'CLASS_II', reason: '' });

const resetCreateForm = () => {
  lookupCode.value = '';
  lookupResult.value = null;
  selectedBatchIds.value = [];
  createForm.value = { severity: 'CLASS_II', reason: '' };
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

const submitCreate = async () => {
  if (!lookupResult.value || selectedBatchIds.value.length === 0 || !createForm.value.reason.trim()) return;
  try {
    await ElMessageBox.confirm(
      `Tạo lệnh thu hồi cho ${selectedBatchIds.value.length} lô? Lệnh sẽ ở trạng thái Nháp, bạn cần Phát hành để kích hoạt.`,
      'Xác nhận tạo lệnh',
      { confirmButtonText: 'Tạo', cancelButtonText: 'Hủy', type: 'warning' }
    );
    creating.value = true;
    await recallApi.createOrder({
      productId: lookupResult.value.product.id,
      batchIds: selectedBatchIds.value,
      reason: createForm.value.reason.trim(),
      severity: createForm.value.severity,
      initiatedBy: 'TENANT',
    });
    ElMessage.success('Đã tạo lệnh thu hồi');
    showCreateDialog.value = false;
    fetchOrders();
  } catch (e: any) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || 'Lỗi tạo lệnh');
  } finally {
    creating.value = false;
  }
};

onMounted(() => fetchOrders());
</script>
