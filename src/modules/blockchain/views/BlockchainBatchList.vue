<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { blockchainApi } from '../api/blockchainApi';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Check, View, Coin } from '@element-plus/icons-vue';
import { useAuthStore } from '@/modules/core/store/auth';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'ADMIN');

const loading = ref(false);
const stamps = ref<any[]>([]);
const stampTotal = ref(0);
const stampPage = ref(1);
const stampLimit = ref(20);
const stampFilter = ref('ALL');
const searchQuery = ref('');
const verifyResult = ref<any>(null);
const verifyLoading = ref(false);
const groupDetail = ref<any>(null);
const groupDetailVisible = ref(false);

const loadStamps = async (page = 1) => {
  loading.value = true;
  try {
    const params: any = { page, limit: stampLimit.value };
    if (stampFilter.value !== 'ALL') params.status = stampFilter.value;
    if (searchQuery.value) params.search = searchQuery.value;
    const { data } = await blockchainApi.getStamps(params);
    stamps.value = data.items || [];
    stampTotal.value = data.total || 0;
    stampPage.value = page;
  } finally {
    loading.value = false;
  }
};

let debounceTimer: any = null;
const debouncedSearch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadStamps(1);
  }, 300);
};

const handleSizeChange = (val: number) => {
  stampLimit.value = val;
  loadStamps(1);
};

onMounted(() => loadStamps());

const handleVerify = async (batchId: string) => {
  verifyLoading.value = true;
  try {
    const { data } = await blockchainApi.verifyStamp(batchId);
    verifyResult.value = data;
    ElMessage[data.verified ? 'success' : 'warning'](
      data.verified ? `Batch ${data.batchCode} hợp lệ on-chain ✅` : 'Không thể xác minh'
    );
  } catch {
    ElMessage.error('Lỗi khi xác minh');
  } finally {
    verifyLoading.value = false;
  }
};

const stampLoading = ref<Record<string, boolean>>({});

const handleStampBatch = async (batchId: string) => {
  try {
    await ElMessageBox.confirm('Xác nhận đóng dấu blockchain ngay lập tức cho lô này?', 'Đóng dấu đơn lẻ', {
      type: 'info',
      confirmButtonText: 'Đóng dấu',
      cancelButtonText: 'Hủy'
    });
    
    stampLoading.value[batchId] = true;
    const { data } = await blockchainApi.stampSingleBatch(batchId);
    if (data.success) {
      ElMessage.success('Đóng dấu thành công!');
      loadStamps(stampPage.value);
    } else {
      ElMessage.error(data.error || 'Đóng dấu thất bại');
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || 'Lỗi hệ thống khi đóng dấu');
    }
  } finally {
    stampLoading.value[batchId] = false;
  }
};

const showGroupDetail = async (groupId: string) => {
  try {
    const { data } = await blockchainApi.getGroupDetail(groupId);
    groupDetail.value = data;
    groupDetailVisible.value = true;
  } catch {
    ElMessage.error('Lỗi khi tải chi tiết group');
  }
};

const downloadMetadata = async (groupCode: string) => {
  try {
    const response = await blockchainApi.getMetadata(groupCode);
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${groupCode}-metadata.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    ElMessage.error('Không thể tải file metadata');
  }
};

// ===== HELPERS =====
const batchTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    SEMI_FINISHED: 'Bán thành phẩm',
    CROSS_TENANT: 'Liên kho',
    EXTERNAL: 'Xuất bên ngoài',
    INTERNAL: 'Nội bộ',
    FINISHED: 'Thành phẩm',
    RAW_MATERIAL: 'Nguyên liệu',
    PACKAGING: 'Đóng gói',
    COMPOSITE: 'Tổng hợp',
  };
  return map[type] || type;
};

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    NONE: 'info', QUEUED: 'warning', STAMPED: 'success', FAILED: 'danger',
    PENDING: 'warning', CONFIRMED: 'success',
  };
  return map[s] || 'info';
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    NONE: 'Chưa stamp', QUEUED: 'Đang chờ', STAMPED: 'Đã stamp', FAILED: 'Thất bại',
    PENDING: 'Đang xử lý', CONFIRMED: 'Đã xác nhận',
  };
  return map[s] || s;
};

const formatDate = (d: string) => d ? new Date(d).toLocaleString('vi-VN') : '—';
const shortHash = (h: string) => h ? `${h.slice(0, 8)}...${h.slice(-6)}` : '—';

const getRowIndex = (index: number) => (stampPage.value - 1) * stampLimit.value + index + 1;
</script>

<template>
  <div class="batch-list-page">
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <div>
          <h1>Danh sách Batch</h1>
          <p class="subtitle">Quản lý trạng thái stamp blockchain cho từng lô sản xuất</p>
        </div>
      </div>
      <el-button :icon="Refresh" @click="loadStamps(1)">Làm mới</el-button>
    </div>

    <!-- FILTERS -->
    <div class="filter-bar">
      <el-select v-model="stampFilter" style="width:160px" @change="loadStamps(1)">
        <el-option label="Tất cả" value="ALL" />
        <el-option label="Chưa stamp" value="NONE" />
        <el-option label="Đang chờ" value="QUEUED" />
        <el-option label="Đã stamp" value="STAMPED" />
        <el-option label="Thất bại" value="FAILED" />
      </el-select>
      <el-input v-model="searchQuery" placeholder="Tìm mã lô..." clearable style="width:260px"
        @input="debouncedSearch" @clear="loadStamps(1)" @keyup.enter="loadStamps(1)" />
      <span class="total-count">Tổng: {{ stampTotal }} batch</span>
    </div>

    <!-- TABLE -->
    <el-table :data="stamps" v-loading="loading" stripe class="batch-table" border>
      <el-table-column label="STT" width="60" align="center" fixed>
        <template #default="{ $index }">
          <span class="stt">{{ getRowIndex($index) }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="batchCode" label="Mã lô" width="170" fixed>
        <template #default="{ row }">
          <span class="batch-code">{{ row.batchCode }}</span>
        </template>
      </el-table-column>

      <el-table-column label="Sản phẩm" min-width="240">
        <template #default="{ row }">{{ row.product?.name || '—' }}</template>
      </el-table-column>

      <el-table-column label="Loại" width="140" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="info" effect="plain" round>
            {{ batchTypeLabel(row.batchType) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Trạng thái" width="130" align="center">
        <template #default="{ row }">
          <el-tag :type="statusColor(row.stampStatus)" size="small" effect="dark">
            {{ statusLabel(row.stampStatus) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Nhóm stamp" width="150">
        <template #default="{ row }">
          <span v-if="row.stampGroup" class="link-text" @click="showGroupDetail(row.stampGroup.id)">
            {{ row.stampGroup.groupCode }}
          </span>
          <span v-else class="text-muted">—</span>
        </template>
      </el-table-column>

      <el-table-column label="Tx Hash" width="170">
        <template #default="{ row }">
          <a v-if="row.polygonscanUrl" :href="row.polygonscanUrl" target="_blank" class="tx-link">
            {{ shortHash(row.stampGroup?.txHash) }}
          </a>
          <span v-else class="text-muted">—</span>
        </template>
      </el-table-column>

      <el-table-column label="Thao tác" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.stampStatus === 'STAMPED'" size="small" :icon="Check" type="success" plain
            :loading="verifyLoading" @click="handleVerify(row.id)">
            Verify
          </el-button>
          <el-button v-else-if="isAdmin" size="small" :icon="Coin" type="primary" plain
            :loading="stampLoading[row.id]" @click="handleStampBatch(row.id)">
            Stamp
          </el-button>
          <span v-else class="text-muted">—</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- PAGINATION -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="stampPage"
        v-model:page-size="stampLimit"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="stampTotal"
        @size-change="handleSizeChange"
        @current-change="loadStamps"
      />
    </div>

    <!-- GROUP DETAIL DIALOG -->
    <el-dialog v-model="groupDetailVisible" :title="`Nhóm: ${groupDetail?.group?.groupCode || ''}`" width="700px">
      <template v-if="groupDetail?.group">
        <div class="detail-grid">
          <div class="detail-item"><label>Trạng thái</label><el-tag :type="statusColor(groupDetail.group.status)" effect="dark">{{ statusLabel(groupDetail.group.status) }}</el-tag></div>
          <div class="detail-item"><label>Merkle Root</label><code>{{ groupDetail.group.merkleRoot }}</code></div>
          <div class="detail-item">
            <label>Metadata Hash (Local Server)</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <code>{{ groupDetail.group.ipfsCid }}</code>
              <el-button type="primary" link size="small" @click="downloadMetadata(groupDetail.group.groupCode)">
                Tải Metadata JSON
              </el-button>
            </div>
          </div>
          <div class="detail-item"><label>Tx Hash</label>
            <a v-if="groupDetail.group.polygonscanUrl" :href="groupDetail.group.polygonscanUrl" target="_blank" class="tx-link">{{ groupDetail.group.txHash }}</a>
          </div>
          <div class="detail-item"><label>Thời gian</label><span>{{ formatDate(groupDetail.group.stampedAt) }}</span></div>
        </div>
      </template>
    </el-dialog>

    <!-- VERIFY RESULT -->
    <el-dialog v-model="verifyResult" title="Kết quả xác minh On-chain" width="480px" @close="verifyResult = null">
      <template v-if="verifyResult">
        <el-result :icon="verifyResult.verified ? 'success' : 'warning'" :title="verifyResult.verified ? 'Dữ liệu hợp lệ' : 'Không thể xác minh'">
          <template #sub-title>
            <p><strong>Mã lô:</strong> {{ verifyResult.batchCode || '—' }}</p>
            <p><strong>Group:</strong> {{ verifyResult.groupCode || '—' }}</p>
            <p v-if="verifyResult.txHash"><strong>Tx:</strong> <a :href="verifyResult.polygonscanUrl" target="_blank">{{ shortHash(verifyResult.txHash) }}</a></p>
          </template>
        </el-result>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.batch-list-page {
  padding: 24px;
  max-width: 1400px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.header-icon {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}
.page-header h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0;
}
.subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 2px 0 0;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.total-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-left: auto;
}

.batch-table {
  border-radius: 10px;
  overflow: hidden;
}
.stt {
  font-weight: 600;
  color: var(--el-text-color-secondary);
}
.batch-code {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.tx-link {
  color: #0ea5e9;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.tx-link:hover { text-decoration: underline; }
.link-text { color: #2563eb; cursor: pointer; font-size: 13px; }
.link-text:hover { text-decoration: underline; }
.text-muted { color: var(--el-text-color-placeholder); }

.detail-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; color: var(--el-text-color-secondary); font-weight: 600; text-transform: uppercase; }
.detail-item code { font-size: 12px; word-break: break-all; font-family: 'JetBrains Mono', monospace; }
</style>
