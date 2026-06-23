<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '@/common/utils/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Monitor, Document, List, CaretRight, View, Warning, CircleCheck } from '@element-plus/icons-vue';

interface RunbookParam {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

interface Runbook {
  id: string;
  name: string;
  description: string;
  dangerLevel: 'info' | 'warning' | 'danger';
  category: string;
  params: RunbookParam[];
  isMutating: boolean;
}

const activeTab = ref('runbooks');

// === RUNBOOKS ===
const runbooks = ref<Runbook[]>([]);
const loadingRunbooks = ref(false);
const selectedRunbook = ref<Runbook | null>(null);
const runbookDialogVisible = ref(false);
const runbookParams = ref<Record<string, string>>({});
const runbookPreviewSql = ref('');
const runbookResult = ref<any>(null);
const runbookExecuting = ref(false);
const runbookPreviewing = ref(false);

// === SQL CONSOLE ===
const sqlText = ref('');
const sqlResult = ref<any>(null);
const sqlExecuting = ref(false);
const sqlHistory = ref<string[]>([]);

// === LOGS ===
const logs = ref<any[]>([]);
const logTotal = ref(0);
const logPage = ref(1);
const loadingLogs = ref(false);

// Computed
const dangerColors: Record<string, string> = {
  info: '#409eff',
  warning: '#e6a23c',
  danger: '#f56c6c'
};
const dangerLabels: Record<string, string> = {
  info: 'An toàn',
  warning: 'Cẩn thận',
  danger: 'Nguy hiểm'
};

const sqlResultColumns = computed(() => {
  if (!sqlResult.value?.rows?.length) return [];
  return Object.keys(sqlResult.value.rows[0]);
});

const runbookResultColumns = computed(() => {
  if (!runbookResult.value?.rows?.length) return [];
  return Object.keys(runbookResult.value.rows[0]);
});

// === API Calls ===
async function loadRunbooks() {
  loadingRunbooks.value = true;
  try {
    const { data } = await api.get('/admin/db/runbooks');
    runbooks.value = data;
  } catch (e: any) {
    ElMessage.error('Không thể tải danh sách Runbooks');
  } finally {
    loadingRunbooks.value = false;
  }
}

function openRunbook(rb: Runbook) {
  selectedRunbook.value = rb;
  runbookParams.value = {};
  runbookPreviewSql.value = '';
  runbookResult.value = null;
  rb.params.forEach(p => { runbookParams.value[p.name] = ''; });
  runbookDialogVisible.value = true;
}

async function previewRunbook() {
  if (!selectedRunbook.value) return;
  runbookPreviewing.value = true;
  try {
    const { data } = await api.post(`/admin/db/runbooks/${selectedRunbook.value.id}/preview`, {
      params: runbookParams.value
    });
    runbookPreviewSql.value = data.sql;
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi xem trước');
  } finally {
    runbookPreviewing.value = false;
  }
}

async function executeRunbook() {
  if (!selectedRunbook.value) return;
  const rb = selectedRunbook.value;

  if (rb.isMutating) {
    try {
      const { value: password } = await ElMessageBox.prompt(
        'Nhập mật khẩu Admin để xác thực thực thi:',
        '🔒 Xác thực Bảo mật',
        { inputType: 'password', confirmButtonText: 'Xác nhận & Thực thi', cancelButtonText: 'Hủy' }
      );
      if (!password) return;
      await doExecuteRunbook(password);
    } catch { /* user cancelled */ }
  } else {
    await doExecuteRunbook('');
  }
}

async function doExecuteRunbook(password: string) {
  if (!selectedRunbook.value) return;
  runbookExecuting.value = true;
  try {
    const { data } = await api.post(`/admin/db/runbooks/${selectedRunbook.value.id}/execute`, {
      params: runbookParams.value,
      password
    });
    runbookResult.value = data;
    ElMessage.success(`Hoàn thành! ${data.rowCount} dòng (${data.executionTimeMs}ms)`);
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi thực thi Runbook');
  } finally {
    runbookExecuting.value = false;
  }
}

async function executeSql() {
  const sql = sqlText.value.trim();
  if (!sql) return ElMessage.warning('Nhập câu lệnh SQL');

  const upperSql = sql.toUpperCase();
  const isMutating = ['UPDATE', 'INSERT', 'DELETE'].some(k => upperSql.startsWith(k));

  if (isMutating) {
    try {
      const { value: password } = await ElMessageBox.prompt(
        'Câu lệnh này sẽ thay đổi dữ liệu. Nhập mật khẩu Admin để xác thực:',
        '🔒 Xác thực Bảo mật',
        { inputType: 'password', confirmButtonText: 'Xác nhận & Thực thi', cancelButtonText: 'Hủy' }
      );
      if (!password) return;
      await doExecuteSql(password);
    } catch { /* cancelled */ }
  } else {
    await doExecuteSql(null);
  }
}

async function doExecuteSql(password: string | null) {
  sqlExecuting.value = true;
  try {
    const { data } = await api.post('/admin/db/query', {
      sql: sqlText.value.trim(),
      password
    });
    sqlResult.value = data;
    if (!sqlHistory.value.includes(sqlText.value.trim())) {
      sqlHistory.value.unshift(sqlText.value.trim());
      if (sqlHistory.value.length > 10) sqlHistory.value.pop();
    }
    ElMessage.success(`${data.type}: ${data.rowCount} dòng (${data.executionTimeMs}ms)`);
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi SQL');
    sqlResult.value = null;
  } finally {
    sqlExecuting.value = false;
  }
}

async function loadLogs() {
  loadingLogs.value = true;
  try {
    const { data } = await api.get('/admin/db/logs', { params: { page: logPage.value, limit: 20 } });
    logs.value = data.logs;
    logTotal.value = data.total;
  } catch { /* ignore */ } finally {
    loadingLogs.value = false;
  }
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN');
}

function useSqlHistory(sql: string) {
  sqlText.value = sql;
  activeTab.value = 'console';
}

onMounted(() => {
  loadRunbooks();
});
</script>

<template>
  <div class="db-tools-page">
    <!-- Header -->
    <div class="db-tools-header">
      <div class="header-left">
        <el-icon :size="28" color="#409eff"><Monitor /></el-icon>
        <div>
          <h2>Công cụ Database</h2>
          <p class="header-desc">Quản trị và sửa chữa dữ liệu hệ thống</p>
        </div>
      </div>
      <el-tag type="danger" effect="dark" size="large">
        <el-icon><Warning /></el-icon>
        &nbsp;Chỉ ADMIN
      </el-tag>
    </div>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" class="db-tabs" @tab-change="(t: string) => { if (t === 'logs') loadLogs(); }">
      <!-- TAB 1: Runbooks -->
      <el-tab-pane label="Kịch bản Sửa lỗi" name="runbooks">
        <template #label>
          <span class="tab-label"><el-icon><Document /></el-icon> Runbooks</span>
        </template>

        <div v-loading="loadingRunbooks" class="runbook-grid">
          <div v-for="rb in runbooks" :key="rb.id" class="runbook-card" @click="openRunbook(rb)">
            <div class="rb-header">
              <el-tag
                :color="dangerColors[rb.dangerLevel]"
                effect="dark"
                size="small"
                style="border: none; color: #fff"
              >{{ dangerLabels[rb.dangerLevel] }}</el-tag>
              <span class="rb-category">{{ rb.category }}</span>
            </div>
            <h3 class="rb-name">{{ rb.name }}</h3>
            <p class="rb-desc">{{ rb.description }}</p>
            <div class="rb-footer">
              <span class="rb-params">{{ rb.params.length }} tham số</span>
              <el-icon color="#409eff"><CaretRight /></el-icon>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- TAB 2: SQL Console -->
      <el-tab-pane label="SQL Console" name="console">
        <template #label>
          <span class="tab-label"><el-icon><Monitor /></el-icon> SQL Console</span>
        </template>

        <div class="sql-console">
          <div class="sql-editor-wrap">
            <textarea
              v-model="sqlText"
              class="sql-editor"
              placeholder="SELECT * FROM supply.supply_batches WHERE batch_type = 'EXTERNAL' LIMIT 10;"
              spellcheck="false"
              @keydown.ctrl.enter="executeSql"
              @keydown.meta.enter="executeSql"
            />
            <div class="sql-actions">
              <el-button type="primary" :loading="sqlExecuting" :icon="CaretRight" @click="executeSql">
                Thực thi (Ctrl+Enter)
              </el-button>
              <el-button @click="sqlText = ''; sqlResult = null">Xóa</el-button>
            </div>
          </div>

          <!-- SQL History -->
          <div v-if="sqlHistory.length" class="sql-history">
            <span class="history-label">Lịch sử:</span>
            <el-tag
              v-for="(h, i) in sqlHistory"
              :key="i"
              size="small"
              class="history-tag"
              @click="useSqlHistory(h)"
            >{{ h.substring(0, 60) }}{{ h.length > 60 ? '...' : '' }}</el-tag>
          </div>

          <!-- SQL Result -->
          <div v-if="sqlResult" class="sql-result">
            <div class="result-meta">
              <el-tag :type="sqlResult.type === 'SELECT' ? 'success' : 'warning'" size="small">
                {{ sqlResult.type }}
              </el-tag>
              <span>{{ sqlResult.rowCount }} dòng</span>
              <span>{{ sqlResult.executionTimeMs }}ms</span>
            </div>
            <el-table
              v-if="sqlResult.rows.length"
              :data="sqlResult.rows"
              stripe
              border
              size="small"
              max-height="400"
              style="width: 100%"
            >
              <el-table-column
                v-for="col in sqlResultColumns"
                :key="col"
                :prop="col"
                :label="col"
                min-width="120"
                show-overflow-tooltip
              />
            </el-table>
            <el-empty v-else description="Không có dữ liệu trả về" />
          </div>
        </div>
      </el-tab-pane>

      <!-- TAB 3: Audit Logs -->
      <el-tab-pane label="Nhật ký" name="logs">
        <template #label>
          <span class="tab-label"><el-icon><List /></el-icon> Nhật ký</span>
        </template>

        <el-table v-loading="loadingLogs" :data="logs" stripe border size="small">
          <el-table-column label="Thời gian" width="170">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="username" label="Người thực hiện" width="130" />
          <el-table-column label="Loại" width="100">
            <template #default="{ row }">
              <el-tag :type="row.queryType === 'RUNBOOK' ? 'success' : 'warning'" size="small">
                {{ row.queryType === 'RUNBOOK' ? 'Kịch bản' : row.queryType === 'RAW_SQL' ? 'SQL trực tiếp' : row.queryType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Trạng thái" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'SUCCESS' ? 'success' : 'danger'" size="small">
                {{ row.status === 'SUCCESS' ? 'Thành công' : row.status === 'FAILED' ? 'Thất bại' : row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="rowsAffected" label="Dòng" width="80" />
          <el-table-column prop="executionTimeMs" label="ms" width="70" />
          <el-table-column label="Câu lệnh" min-width="300" show-overflow-tooltip>
            <template #default="{ row }">
              <code class="log-sql">{{ row.queryText }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="ipAddress" label="IP" width="130" />
        </el-table>

        <div class="log-pagination">
          <el-pagination
            v-model:current-page="logPage"
            :total="logTotal"
            :page-size="20"
            layout="prev, pager, next, total"
            @current-change="loadLogs"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- Runbook Dialog -->
    <el-dialog
      v-model="runbookDialogVisible"
      :title="selectedRunbook?.name || 'Runbook'"
      width="720px"
      destroy-on-close
    >
      <template v-if="selectedRunbook">
        <div class="rb-dialog-header">
          <el-tag
            :color="dangerColors[selectedRunbook.dangerLevel]"
            effect="dark"
            size="small"
            style="border: none; color: #fff"
          >{{ dangerLabels[selectedRunbook.dangerLevel] }}</el-tag>
          <span style="margin-left: 8px; color: #909399">{{ selectedRunbook.category }}</span>
        </div>
        <p class="rb-dialog-desc">{{ selectedRunbook.description }}</p>

        <!-- Params form -->
        <el-form label-position="top" class="rb-params-form">
          <el-form-item
            v-for="p in selectedRunbook.params"
            :key="p.name"
            :label="`${p.name} ${p.required ? '(bắt buộc)' : '(tùy chọn)'}`"
          >
            <el-input
              v-model="runbookParams[p.name]"
              :placeholder="p.description"
              clearable
            />
          </el-form-item>
        </el-form>

        <!-- Preview SQL -->
        <div class="rb-actions">
          <el-button :loading="runbookPreviewing" :icon="View" @click="previewRunbook">
            Xem trước SQL
          </el-button>
          <el-button
            type="primary"
            :loading="runbookExecuting"
            :icon="CaretRight"
            @click="executeRunbook"
          >
            {{ selectedRunbook.isMutating ? '🔒 Thực thi (cần mật khẩu)' : 'Thực thi' }}
          </el-button>
        </div>

        <div v-if="runbookPreviewSql" class="rb-preview">
          <h4>SQL sẽ chạy:</h4>
          <pre class="sql-preview-code">{{ runbookPreviewSql }}</pre>
        </div>

        <!-- Runbook Result -->
        <div v-if="runbookResult" class="sql-result" style="margin-top: 16px">
          <div class="result-meta">
            <el-icon color="#67c23a"><CircleCheck /></el-icon>
            <span>{{ runbookResult.rowCount }} dòng</span>
            <span>{{ runbookResult.executionTimeMs }}ms</span>
          </div>
          <el-table
            v-if="runbookResult.rows.length"
            :data="runbookResult.rows"
            stripe
            border
            size="small"
            max-height="300"
            style="width: 100%"
          >
            <el-table-column
              v-for="col in runbookResultColumns"
              :key="col"
              :prop="col"
              :label="col"
              min-width="120"
              show-overflow-tooltip
            />
          </el-table>
          <el-empty v-else description="Thực thi thành công, không có dữ liệu trả về" />
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.db-tools-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.db-tools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  color: #fff;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-left h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}
.header-desc {
  margin: 4px 0 0;
  color: rgba(255,255,255,0.6);
  font-size: 13px;
}

/* Tabs */
.db-tabs {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Runbook Grid */
.runbook-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 8px 0;
}
.runbook-card {
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: #fafafa;
}
.runbook-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.12);
  transform: translateY(-2px);
}
.rb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.rb-category {
  color: #909399;
  font-size: 12px;
}
.rb-name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.rb-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rb-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rb-params {
  font-size: 12px;
  color: #909399;
}

/* SQL Console */
.sql-console {
  padding: 8px 0;
}
.sql-editor-wrap {
  margin-bottom: 12px;
}
.sql-editor {
  width: 100%;
  min-height: 140px;
  padding: 16px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: 2px solid #dcdfe6;
  border-radius: 10px;
  background: #1e1e2e;
  color: #cdd6f4;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.sql-editor:focus {
  border-color: #409eff;
}
.sql-editor::placeholder {
  color: #6c7086;
}
.sql-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.sql-history {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.history-label {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}
.history-tag {
  cursor: pointer;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-tag:hover {
  color: #409eff;
}

/* SQL Result */
.sql-result {
  margin-top: 16px;
}
.result-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #606266;
}

/* Logs */
.log-sql {
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #606266;
}
.log-pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* Runbook Dialog */
.rb-dialog-header {
  margin-bottom: 8px;
}
.rb-dialog-desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
}
.rb-params-form {
  margin-bottom: 16px;
}
.rb-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.rb-preview {
  background: #1e1e2e;
  border-radius: 10px;
  padding: 16px;
}
.rb-preview h4 {
  margin: 0 0 8px;
  color: #cdd6f4;
  font-size: 13px;
}
.sql-preview-code {
  color: #a6e3a1;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  line-height: 1.6;
}
</style>
