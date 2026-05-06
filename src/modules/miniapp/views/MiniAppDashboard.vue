<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { DataLine, User, Cellphone, View, Refresh } from '@element-plus/icons-vue';
import { miniappApi, type MiniAppSummary, type MiniAppEvent } from '../api/miniappApi';

const loading = ref(false);
const eventsLoading = ref(false);

const dateRange = ref<[string, string] | null>(null);
const eventLimit = ref(100);

const summary = ref<MiniAppSummary>({
  total: 0,
  unique_sessions: 0,
  by_event: [],
  by_platform: [],
});
const recentEvents = ref<MiniAppEvent[]>([]);

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Xem trang',
  product_view: 'Xem sản phẩm',
  enterprise_view: 'Xem doanh nghiệp',
  cta_click: 'Click cài app',
  scan: 'Quét QR',
};

const eventLabel = (event: string) => EVENT_LABELS[event] ?? event;

const eventTagType = (event: string): '' | 'success' | 'warning' | 'danger' | 'info' => {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    page_view: '',
    product_view: 'success',
    enterprise_view: 'warning',
    cta_click: 'danger',
    scan: 'info',
  };
  return map[event] ?? '';
};

const totalByEvent = computed(() =>
  summary.value.by_event.reduce((sum, r) => sum + parseInt(r.count), 0)
);

const fetchSummary = async () => {
  loading.value = true;
  try {
    const [from, to] = dateRange.value ?? [undefined, undefined];
    const res = await miniappApi.getSummary(from, to);
    summary.value = res.data;
  } catch {
    ElMessage.error('Không tải được thống kê');
  } finally {
    loading.value = false;
  }
};

const fetchEvents = async () => {
  eventsLoading.value = true;
  try {
    const res = await miniappApi.getRecentEvents(eventLimit.value);
    recentEvents.value = res.data;
  } catch {
    ElMessage.error('Không tải được danh sách events');
  } finally {
    eventsLoading.value = false;
  }
};

const refresh = async () => {
  await Promise.all([fetchSummary(), fetchEvents()]);
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

onMounted(refresh);
</script>

<template>
  <div class="miniapp-dashboard">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2>Mini App Analytics</h2>
        <p class="subtitle">Thống kê hành vi người dùng từ Zalo Mini App TrustID</p>
      </div>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="→"
          start-placeholder="Từ ngày"
          end-placeholder="Đến ngày"
          value-format="YYYY-MM-DD"
          style="width: 280px"
          @change="fetchSummary"
        />
        <el-button :icon="Refresh" :loading="loading" @click="refresh">Làm mới</el-button>
      </div>
    </div>

    <!-- KPI Cards -->
    <el-row :gutter="16" class="kpi-row" v-loading="loading">
      <el-col :xs="12" :sm="6">
        <div class="kpi-card">
          <el-icon class="kpi-icon blue"><DataLine /></el-icon>
          <div class="kpi-value">{{ summary.total.toLocaleString() }}</div>
          <div class="kpi-label">Tổng Events</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="kpi-card">
          <el-icon class="kpi-icon green"><User /></el-icon>
          <div class="kpi-value">{{ summary.unique_sessions.toLocaleString() }}</div>
          <div class="kpi-label">Phiên duy nhất</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="kpi-card">
          <el-icon class="kpi-icon purple"><Cellphone /></el-icon>
          <div class="kpi-value">
            {{ summary.by_platform.find(p => p.platform === 'zalo')?.count ?? 0 }}
          </div>
          <div class="kpi-label">Events từ Zalo</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="kpi-card">
          <el-icon class="kpi-icon orange"><View /></el-icon>
          <div class="kpi-value">
            {{ summary.by_event.find(e => e.event === 'page_view')?.count ?? 0 }}
          </div>
          <div class="kpi-label">Lượt xem trang</div>
        </div>
      </el-col>
    </el-row>

    <!-- Charts row -->
    <el-row :gutter="16" class="charts-row">
      <!-- Event breakdown -->
      <el-col :xs="24" :md="14">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">Phân tích theo loại Event</span>
          </template>
          <el-table :data="summary.by_event" v-loading="loading" stripe size="small">
            <el-table-column label="Loại Event" min-width="140">
              <template #default="{ row }">
                <el-tag :type="eventTagType(row.event)" size="small">{{ eventLabel(row.event) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="event" label="Event ID" min-width="140" />
            <el-table-column label="Số lượng" width="100" align="right">
              <template #default="{ row }">
                <strong>{{ parseInt(row.count).toLocaleString() }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="Tỷ lệ" width="120">
              <template #default="{ row }">
                <div class="progress-bar-wrap">
                  <div
                    class="progress-bar-fill"
                    :style="{ width: totalByEvent > 0 ? (parseInt(row.count) / totalByEvent * 100).toFixed(1) + '%' : '0%' }"
                  />
                  <span class="progress-label">
                    {{ totalByEvent > 0 ? (parseInt(row.count) / totalByEvent * 100).toFixed(1) : 0 }}%
                  </span>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- Platform breakdown -->
      <el-col :xs="24" :md="10">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">Phân tích theo Platform</span>
          </template>
          <el-table :data="summary.by_platform" v-loading="loading" stripe size="small">
            <el-table-column prop="platform" label="Platform" />
            <el-table-column label="Số lượng" align="right">
              <template #default="{ row }">
                <strong>{{ parseInt(row.count).toLocaleString() }}</strong>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- Recent Events Table -->
    <el-card shadow="never" class="events-card">
      <template #header>
        <div class="events-header">
          <span class="card-title">Events gần nhất</span>
          <div class="events-controls">
            <el-select v-model="eventLimit" style="width: 120px" @change="fetchEvents">
              <el-option :value="50" label="50 events" />
              <el-option :value="100" label="100 events" />
              <el-option :value="200" label="200 events" />
            </el-select>
          </div>
        </div>
      </template>
      <el-table
        :data="recentEvents"
        v-loading="eventsLoading"
        stripe
        size="small"
        max-height="480"
      >
        <el-table-column label="Thời gian" width="155">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="Event" width="140">
          <template #default="{ row }">
            <el-tag :type="eventTagType(row.event)" size="small">{{ eventLabel(row.event) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="page" label="Trang" min-width="160" show-overflow-tooltip />
        <el-table-column prop="platform" label="Platform" width="80" align="center" />
        <el-table-column prop="display_name" label="Người dùng" min-width="140" show-overflow-tooltip />
        <el-table-column label="Meta" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.meta" class="meta-json">{{ JSON.stringify(row.meta) }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="session_id" label="Session" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="session-id">{{ row.session_id?.slice(0, 8) ?? '—' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.miniapp-dashboard {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.page-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.subtitle {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* KPI */
.kpi-row { margin-bottom: 4px; }
.kpi-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
  border: 1px solid var(--el-border-color-lighter);
  margin-bottom: 16px;
}
.kpi-icon {
  font-size: 32px;
  margin-bottom: 10px;
}
.kpi-icon.blue { color: #1a73e8; }
.kpi-icon.green { color: #00875a; }
.kpi-icon.purple { color: #7c3aed; }
.kpi-icon.orange { color: #ea580c; }
.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}
.kpi-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* Charts */
.charts-row { margin-bottom: 4px; }
.card-title {
  font-weight: 600;
  font-size: 15px;
}

/* Progress bar */
.progress-bar-wrap {
  position: relative;
  height: 18px;
  background: #f0f0f0;
  border-radius: 9px;
  overflow: hidden;
}
.progress-bar-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  background: #1a73e8;
  border-radius: 9px;
  transition: width 0.4s ease;
}
.progress-label {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 600;
  color: #333;
  line-height: 1;
}

/* Events table */
.events-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.events-controls {
  display: flex;
  gap: 8px;
}
.meta-json {
  font-family: monospace;
  font-size: 11px;
  color: #666;
}
.session-id {
  font-family: monospace;
  font-size: 11px;
  color: #888;
}
.text-muted { color: #aaa; }
</style>
