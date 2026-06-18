<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { blockchainApi } from '../api/blockchainApi';
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus';
import { Refresh, Check, Warning, View, Connection, Coin, Wallet } from '@element-plus/icons-vue';
import { useAuthStore } from '@/modules/core/store/auth';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'ADMIN');

// ===== STATE =====
const loading = ref(false);
const stats = ref<any>({});
const wallet = ref<any>({});
const stamps = ref<any[]>([]);
const groups = ref<any[]>([]);
const stampTotal = ref(0);
const groupTotal = ref(0);
const stampPage = ref(1);
const groupPage = ref(1);
const activeTab = ref('overview');
const stampFilter = ref('ALL');
const searchQuery = ref('');
const verifyResult = ref<any>(null);
const verifyLoading = ref(false);
const groupDetail = ref<any>(null);
const groupDetailVisible = ref(false);

// ===== LOAD DATA =====
const loadStats = async () => {
  try {
    const { data } = await blockchainApi.getStats();
    stats.value = data;
  } catch { /* silent */ }
};

const loadWallet = async () => {
  try {
    const { data } = await blockchainApi.getWalletInfo();
    wallet.value = data;
  } catch { /* silent */ }
};

const loadStamps = async (page = 1) => {
  loading.value = true;
  try {
    const params: any = { page, limit: 15 };
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

const loadGroups = async (page = 1) => {
  loading.value = true;
  try {
    const { data } = await blockchainApi.getGroups({ page, limit: 10 });
    groups.value = data.items || [];
    groupTotal.value = data.total || 0;
    groupPage.value = page;
  } finally {
    loading.value = false;
  }
};

const refreshAll = async () => {
  await Promise.all([loadStats(), loadWallet(), loadStamps(), loadGroups()]);
  ElMessage.success('Đã làm mới dữ liệu');
};

onMounted(() => {
  refreshAll();
});

// ===== ACTIONS =====
const handleVerify = async (batchId: string) => {
  verifyLoading.value = true;
  try {
    const { data } = await blockchainApi.verifyStamp(batchId);
    verifyResult.value = data;
    if (data.verified) {
      ElNotification({ title: 'Xác minh thành công', message: `Batch ${data.batchCode} hợp lệ trên Polygon`, type: 'success' });
    } else {
      ElNotification({ title: 'Xác minh thất bại', message: data.reason || 'Dữ liệu không khớp', type: 'warning' });
    }
  } catch {
    ElMessage.error('Lỗi khi xác minh');
  } finally {
    verifyLoading.value = false;
  }
};

const handleStampNow = async () => {
  try {
    await ElMessageBox.confirm('Bạn muốn ghi nhóm stamp ngay bây giờ?', 'Xác nhận', { type: 'warning' });
    await blockchainApi.triggerStampNow();
    ElMessage.success('Đã gửi yêu cầu tổng hợp. Kiểm tra lại sau 1-2 phút.');
    setTimeout(refreshAll, 5000);
  } catch { /* cancelled */ }
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
const formatPol = (v: number) => v != null ? v.toFixed(6) : '—';

const batchTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    SEMI_FINISHED: 'Bán thành phẩm', CROSS_TENANT: 'Liên kho', EXTERNAL: 'Xuất bên ngoài',
    INTERNAL: 'Nội bộ', FINISHED: 'Thành phẩm', RAW_MATERIAL: 'Nguyên liệu',
    PACKAGING: 'Đóng gói', COMPOSITE: 'Tổng hợp',
  };
  return map[type] || type;
};
const getRowIndex = (index: number) => (stampPage.value - 1) * 15 + index + 1;

const openPolygonscan = () => {
  window.open('https://polygonscan.com/address/0x8a6433A30abF6bE87382615cb82289a0D31E444b', '_blank');
};

const openRelayerWallet = () => {
  window.open('https://polygonscan.com/address/0xF41408649Bb99e2C214fa4763899eC2B0aA9dB74', '_blank');
};

const queuedCount = computed(() => stats.value?.statusDistribution?.find((s: any) => s.status === 'QUEUED')?.count || 0);
</script>

<template>
  <div class="blockchain-dashboard">
    <!-- HEADER -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <h1>Blockchain Dashboard</h1>
          <p class="subtitle">Polygon PoS · Merkle Tree · IPFS Pinning</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="openPolygonscan" :icon="View">Xem Contract</el-button>
        <el-button v-if="isAdmin" @click="openRelayerWallet" :icon="Wallet">Ví Relayer</el-button>
        <el-button :icon="Refresh" @click="refreshAll">Làm mới</el-button>
        <el-button type="primary" @click="handleStampNow" :disabled="Number(queuedCount) === 0">
          ⛓️ Stamp ngay ({{ queuedCount }} chờ)
        </el-button>
      </div>
    </div>

    <!-- STATS CARDS -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon green"><Check /></div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalStamped || 0 }}</span>
          <span class="stat-label">Batch đã stamp</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue"><Connection /></div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalGroups || 0 }}</span>
          <span class="stat-label">Groups on-chain</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange"><Coin /></div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalPolCost != null ? stats.totalPolCost.toFixed(6) : '0' }}</span>
          <span class="stat-label">POL tổng chi phí</span>
        </div>
      </div>
      <div v-if="isAdmin" class="stat-card" :class="{ 'stat-alert': wallet.isLow }">
        <div class="stat-icon" :class="wallet.isLow ? 'red' : 'teal'">
          <Warning v-if="wallet.isLow" /><Coin v-else />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ wallet.pol != null ? wallet.pol.toFixed(4) : (wallet.matic != null ? wallet.matic.toFixed(4) : '—') }}</span>
          <span class="stat-label">Ví Relayer (POL)</span>
          <span v-if="wallet.isLow" class="stat-warn">⚠️ Số dư thấp!</span>
        </div>
      </div>
    </div>

    <!-- TABS -->
    <el-tabs v-model="activeTab" class="dashboard-tabs">
      <!-- TAB: BATCHES -->
      <el-tab-pane label="Danh sách Batch" name="batches">
        <div class="tab-toolbar">
          <el-select v-model="stampFilter" style="width:140px" @change="loadStamps(1)">
            <el-option label="Tất cả" value="ALL" />
            <el-option label="Chưa stamp" value="NONE" />
            <el-option label="Đang chờ" value="QUEUED" />
            <el-option label="Đã stamp" value="STAMPED" />
            <el-option label="Thất bại" value="FAILED" />
          </el-select>
          <el-input v-model="searchQuery" placeholder="Tìm mã lô..." clearable style="width:220px" @clear="loadStamps(1)" @keyup.enter="loadStamps(1)" />
        </div>

        <el-table :data="stamps" v-loading="loading" stripe class="stamp-table">
          <el-table-column label="STT" width="55" align="center">
            <template #default="{ $index }"><span style="font-weight:600;color:var(--el-text-color-secondary)">{{ getRowIndex($index) }}</span></template>
          </el-table-column>
          <el-table-column prop="batchCode" label="Mã lô" width="160" />
          <el-table-column label="Sản phẩm" min-width="200">
            <template #default="{ row }">{{ row.product?.name || '—' }}</template>
          </el-table-column>
          <el-table-column label="Loại" width="140" align="center">
            <template #default="{ row }">
              <el-tag size="small" type="info" effect="plain" round>{{ batchTypeLabel(row.batchType) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Stamp Status" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="statusColor(row.stampStatus)" size="small" effect="dark">
                {{ statusLabel(row.stampStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Group" width="140">
            <template #default="{ row }">
              <span v-if="row.stampGroup" class="link-text" @click="showGroupDetail(row.stampGroup.id)">
                {{ row.stampGroup.groupCode }}
              </span>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="Tx Hash" width="160">
            <template #default="{ row }">
              <a v-if="row.polygonscanUrl" :href="row.polygonscanUrl" target="_blank" class="tx-link">
                {{ shortHash(row.stampGroup?.txHash) }}
              </a>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="" width="100" align="center">
            <template #default="{ row }">
              <el-button v-if="row.stampStatus === 'STAMPED'" size="small" :icon="Check" type="success" plain
                :loading="verifyLoading" @click="handleVerify(row.id)">
                Verify
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination layout="total, prev, pager, next" :total="stampTotal" :page-size="15"
            :current-page="stampPage" @current-change="loadStamps" />
        </div>
      </el-tab-pane>

      <!-- TAB: GROUPS -->
      <el-tab-pane label="Stamp Groups" name="groups">
        <el-table :data="groups" v-loading="loading" stripe>
          <el-table-column prop="groupCode" label="Group Code" width="160" />
          <el-table-column label="Trạng thái" width="130" align="center">
            <template #default="{ row }">
              <el-tag :type="statusColor(row.status)" size="small" effect="dark">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="batchCount" label="Batch" width="80" align="center" />
          <el-table-column label="Merkle Root" min-width="180">
            <template #default="{ row }">
              <code class="hash-code">{{ shortHash(row.merkleRoot) }}</code>
            </template>
          </el-table-column>
          <el-table-column label="Tx Hash" width="180">
            <template #default="{ row }">
              <a v-if="row.polygonscanUrl" :href="row.polygonscanUrl" target="_blank" class="tx-link">
                {{ shortHash(row.txHash) }}
              </a>
              <span v-else>—</span>
            </template>
          </el-table-column>
          <el-table-column label="Gas" width="100" align="right">
            <template #default="{ row }">{{ row.gasUsed?.toLocaleString() || '—' }}</template>
          </el-table-column>
          <el-table-column label="POL" width="110" align="right">
            <template #default="{ row }">{{ formatPol(row.maticCost) }}</template>
          </el-table-column>
          <el-table-column label="Thời gian" width="170">
            <template #default="{ row }">{{ formatDate(row.stampedAt) }}</template>
          </el-table-column>
          <el-table-column width="80" align="center">
            <template #default="{ row }">
              <el-button size="small" :icon="View" circle @click="showGroupDetail(row.id)" />
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination layout="total, prev, pager, next" :total="groupTotal" :page-size="10"
            :current-page="groupPage" @current-change="loadGroups" />
        </div>
      </el-tab-pane>

      <!-- TAB: OVERVIEW -->
      <el-tab-pane label="Tổng quan" name="overview">
        <div class="overview-grid">
          <div class="overview-card">
            <h3>📊 Phân bổ trạng thái</h3>
            <div class="status-bars">
              <div v-for="s in (stats.statusDistribution || [])" :key="s.status" class="status-bar-row">
                <span class="status-bar-label">{{ statusLabel(s.status) }}</span>
                <div class="status-bar-track">
                  <div class="status-bar-fill" :class="s.status.toLowerCase()" 
                    :style="{ width: Math.max(4, (Number(s.count) / Math.max(1, stampTotal)) * 100) + '%' }">
                  </div>
                </div>
                <span class="status-bar-count">{{ s.count }}</span>
              </div>
            </div>
          </div>

          <div class="overview-card">
            <h3>💰 Chi phí Gas theo tháng</h3>
            <div class="cost-list">
              <div v-for="(cost, month) in (stats.monthlyCosts || {})" :key="month" class="cost-row">
                <span class="cost-month">{{ month }}</span>
                <span class="cost-value">{{ Number(cost).toFixed(6) }} POL</span>
              </div>
              <div v-if="!stats.monthlyCosts || Object.keys(stats.monthlyCosts).length === 0" class="empty-state">
                Chưa có dữ liệu chi phí
              </div>
            </div>
          </div>

          <div v-if="isAdmin" class="overview-card wallet-card">
            <h3>🔐 Ví Relayer</h3>
            <div class="wallet-info">
              <div class="wallet-row">
                <span>Địa chỉ:</span>
                <code>{{ wallet.address ? shortHash(wallet.address) : '—' }}</code>
              </div>
              <div class="wallet-row">
                <span>Số dư:</span>
                <strong :class="{ 'text-danger': wallet.isLow }">{{ (wallet.pol || wallet.matic)?.toFixed(4) || '—' }} POL</strong>
              </div>
              <div class="wallet-row">
                <span>Groups ước tính:</span>
                <span>~{{ wallet.estimatedGroupsRemaining || 0 }} nhóm</span>
              </div>
              <div class="wallet-row">
                <span>On-chain Groups:</span>
                <span>{{ wallet.totalGroups || 0 }}</span>
              </div>
              <div class="wallet-row">
                <span>On-chain Batches:</span>
                <span>{{ wallet.totalBatches || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- GROUP DETAIL DIALOG -->
    <el-dialog v-model="groupDetailVisible" :title="`Group: ${groupDetail?.group?.groupCode || ''}`" width="720px">
      <template v-if="groupDetail?.group">
        <div class="detail-grid">
          <div class="detail-item"><label>Status</label><el-tag :type="statusColor(groupDetail.group.status)" effect="dark">{{ statusLabel(groupDetail.group.status) }}</el-tag></div>
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
          <div class="detail-item"><label>Gas / Cost</label><span>{{ groupDetail.group.gasUsed?.toLocaleString() }} / {{ formatPol(groupDetail.group.maticCost) }} POL</span></div>
          <div class="detail-item"><label>Thời gian</label><span>{{ formatDate(groupDetail.group.stampedAt) }}</span></div>
        </div>

        <h4 style="margin: 20px 0 8px">Danh sách Batch ({{ groupDetail.batches?.length || 0 }})</h4>
        <el-table :data="groupDetail.batches" size="small" stripe max-height="300">
          <el-table-column prop="batchCode" label="Mã lô" width="150" />
          <el-table-column label="Sản phẩm"><template #default="{ row }">{{ row.product?.name || '—' }}</template></el-table-column>
          <el-table-column prop="batchType" label="Loại" width="100" />
          <el-table-column label="Merkle Leaf" width="180"><template #default="{ row }"><code class="hash-code">{{ shortHash(row.merkleLeaf) }}</code></template></el-table-column>
        </el-table>
      </template>
    </el-dialog>

    <!-- VERIFY RESULT DIALOG -->
    <el-dialog v-model="verifyResult" title="Kết quả xác minh On-chain" width="500px" @close="verifyResult = null">
      <template v-if="verifyResult">
        <el-result :icon="verifyResult.verified ? 'success' : 'warning'" :title="verifyResult.verified ? 'Dữ liệu hợp lệ' : 'Không thể xác minh'">
          <template #sub-title>
            <div class="verify-details">
              <p><strong>Mã lô:</strong> {{ verifyResult.batchCode || '—' }}</p>
              <p><strong>Group:</strong> {{ verifyResult.groupCode || '—' }}</p>
              <p v-if="verifyResult.txHash"><strong>Tx:</strong> <a :href="verifyResult.polygonscanUrl" target="_blank">{{ shortHash(verifyResult.txHash) }}</a></p>
              <p v-if="verifyResult.stampedAt"><strong>Thời gian:</strong> {{ formatDate(verifyResult.stampedAt) }}</p>
            </div>
          </template>
        </el-result>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.blockchain-dashboard {
  padding: 24px;
  max-width: 1400px;
}

/* HEADER */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.header-icon {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: white;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
}
.page-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin: 0;
}
.subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 2px 0 0;
}

/* STATS */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: box-shadow 0.2s;
}
.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
.stat-card.stat-alert {
  border-color: #ef4444;
  background: #fef2f2;
}
.stat-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.stat-icon.green { background: #dcfce7; color: #16a34a; }
.stat-icon.blue { background: #dbeafe; color: #2563eb; }
.stat-icon.orange { background: #fef3c7; color: #d97706; }
.stat-icon.teal { background: #ccfbf1; color: #0d9488; }
.stat-icon.red { background: #fee2e2; color: #dc2626; }
.stat-content { display: flex; flex-direction: column; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--el-text-color-primary); line-height: 1.2; }
.stat-label { font-size: 13px; color: var(--el-text-color-secondary); margin-top: 2px; }
.stat-warn { font-size: 12px; color: #dc2626; margin-top: 4px; }

/* TABS & TABLE */
.dashboard-tabs { margin-top: 8px; }
.tab-toolbar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.stamp-table { border-radius: 10px; overflow: hidden; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }

/* LINKS */
.tx-link {
  color: #7c3aed;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.tx-link:hover { text-decoration: underline; }
.link-text { color: #2563eb; cursor: pointer; font-size: 13px; }
.link-text:hover { text-decoration: underline; }
.hash-code { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--el-text-color-secondary); }

/* OVERVIEW */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}
.overview-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  padding: 20px;
}
.overview-card h3 { font-size: 15px; font-weight: 600; margin: 0 0 16px; }
.status-bars { display: flex; flex-direction: column; gap: 10px; }
.status-bar-row { display: flex; align-items: center; gap: 10px; }
.status-bar-label { width: 80px; font-size: 13px; color: var(--el-text-color-secondary); }
.status-bar-track { flex: 1; height: 8px; background: var(--el-fill-color-light); border-radius: 4px; overflow: hidden; }
.status-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
.status-bar-fill.none { background: #94a3b8; }
.status-bar-fill.queued { background: #f59e0b; }
.status-bar-fill.stamped { background: #22c55e; }
.status-bar-fill.failed { background: #ef4444; }
.status-bar-count { font-size: 13px; font-weight: 600; min-width: 36px; text-align: right; }

.cost-list { display: flex; flex-direction: column; gap: 8px; }
.cost-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.cost-month { font-weight: 500; }
.cost-value { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
.empty-state { color: var(--el-text-color-placeholder); font-size: 14px; text-align: center; padding: 20px; }

.wallet-info { display: flex; flex-direction: column; gap: 10px; }
.wallet-row { display: flex; justify-content: space-between; font-size: 14px; }
.wallet-row code { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.text-danger { color: #dc2626; }

/* DETAIL */
.detail-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; color: var(--el-text-color-secondary); font-weight: 600; text-transform: uppercase; }
.detail-item code { font-size: 12px; word-break: break-all; font-family: 'JetBrains Mono', monospace; }

.verify-details p { margin: 6px 0; font-size: 14px; }
</style>
