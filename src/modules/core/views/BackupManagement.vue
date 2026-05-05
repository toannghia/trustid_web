<template>
  <div class="backup-management">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-700">Quản lý Sao lưu (Backup)</h2>
      <div class="flex gap-2">
        <el-button type="info" plain :icon="Setting" @click="openConfig">Cấu hình tự động</el-button>
        <el-button type="primary" :loading="running" @click="runBackup">Chạy Backup Ngay</el-button>
      </div>
    </div>

    <!-- Table -->
    <div class="lte-card">
      <div class="lte-card-header flex justify-between items-center">
        <span>Lịch sử Sao lưu Hệ thống lên Google Drive</span>
        <el-tag type="info" size="small">Tổng: {{ total }}</el-tag>
      </div>
      <div class="lte-card-body">
        <el-table :data="logs" stripe border v-loading="loading">
          <el-table-column label="STT" width="70" align="center">
            <template #default="{ $index }">
              {{ (filters.page - 1) * filters.limit + $index + 1 }}
            </template>
          </el-table-column>

          <el-table-column prop="filename" label="Tên file" min-width="250" />

          <el-table-column label="Loại" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="row.type === 'database' ? 'primary' : 'warning'" size="small">
                {{ row.type === 'database' ? 'Database (SQL)' : 'Files (TGZ)' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="Kích thước" width="120" align="right">
            <template #default="{ row }">
              {{ formatSize(row.size) }}
            </template>
          </el-table-column>

          <el-table-column label="Trạng thái" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ formatStatus(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="Thời gian" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="Thao tác" width="120" align="center">
            <template #default="{ row }">
              <el-button
                v-if="row.driveLink"
                size="small"
                type="success"
                plain
                tag="a"
                :href="row.driveLink"
                target="_blank">
                Tải về
              </el-button>
              <span v-else class="text-gray-400 text-sm">-</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="mt-4 flex justify-between items-center">
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span>Hiển thị</span>
            <el-select v-model="filters.limit" class="!w-28" @change="onPageSizeChange">
              <el-option v-for="s in pageSizes" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
            <span>/ trang</span>
          </div>
          <el-pagination
            background
            layout="prev, pager, next, total"
            :total="total"
            :page-size="filters.limit"
            v-model:current-page="filters.page"
            @current-change="fetchData"
          />
        </div>
      </div>
    </div>

    <!-- Config Dialog -->
    <el-dialog v-model="configDialog.visible" title="Cấu hình hệ thống sao lưu" width="580px" destroy-on-close>
      <el-form :model="configForm" label-width="160px" v-loading="configDialog.loading">

        <!-- Lịch tự động -->
        <el-divider content-position="left"><b>Lịch tự động</b></el-divider>

        <el-form-item label="Tự động sao lưu">
          <el-switch v-model="configForm.isAutoEnabled" active-text="Bật" inactive-text="Tắt" />
        </el-form-item>
        <el-form-item label="Giờ chạy hằng ngày">
          <el-time-picker v-model="configForm.time" format="HH:mm" placeholder="Chọn giờ chạy backup" class="!w-full" :disabled="!configForm.isAutoEnabled" />
        </el-form-item>
        <el-form-item label="Số ngày lưu tệp">
          <el-input-number v-model="configForm.keepDays" :min="1" :max="90" class="!w-full" />
        </el-form-item>
        <div class="text-xs text-center text-gray-500 px-4 mb-4">
          Các bản sao lưu trên Google Drive cũ hơn số ngày ở trên sẽ tự động bị dọn dẹp.
        </div>

        <!-- Định dạng tên file -->
        <el-divider content-position="left"><b>Định dạng tên file backup</b></el-divider>

        <el-form-item label="Tiền tố (prefix)">
          <el-input
            v-model="configForm.filePrefix"
            placeholder="vd: trustid, myapp, backup"
            clearable
            maxlength="30"
            show-word-limit>
            <template #prepend>Tên file:</template>
          </el-input>
        </el-form-item>
        <el-form-item label="Định dạng ngày">
          <el-select v-model="configForm.dateFormat" class="!w-full">
            <el-option
              v-for="opt in dateFormatOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value" />
          </el-select>
        </el-form-item>

        <!-- Preview tên file -->
        <div class="file-preview-box">
          <div class="file-preview-label">Xem trước tên file sẽ được tạo:</div>
          <div class="file-preview-item">
            <el-icon class="text-blue-500"><Document /></el-icon>
            <code>{{ previewDbName }}</code>
          </div>
          <div class="file-preview-item">
            <el-icon class="text-orange-400"><FolderOpened /></el-icon>
            <code>{{ previewFilesName }}</code>
          </div>
        </div>

        <!-- Google Drive -->
        <el-divider content-position="left">
          <div class="flex items-center gap-2">
            <b>Tài khoản Google Drive</b>
            <el-tag v-if="gdriveConfigured" type="success" size="small">Đã cấu hình</el-tag>
            <el-tag v-else type="warning" size="small">Chưa cấu hình</el-tag>
            <el-button
              type="primary"
              link
              size="small"
              :icon="QuestionFilled"
              @click="guideDrawer = true">
              Hướng dẫn lấy thông tin
            </el-button>
          </div>
        </el-divider>

        <el-form-item label="Folder ID">
          <el-input v-model="configForm.gdriveFolderId" placeholder="ID thư mục Google Drive nhận backup" clearable />
        </el-form-item>
        <el-form-item label="Client ID">
          <el-input v-model="configForm.gdriveClientId" placeholder="OAuth 2.0 Client ID" clearable />
        </el-form-item>
        <el-form-item label="Client Secret">
          <el-input
            v-model="configForm.gdriveClientSecret"
            :type="showSecret ? 'text' : 'password'"
            placeholder="Để trống nếu không thay đổi"
            clearable>
            <template #suffix>
              <el-icon class="cursor-pointer" @click="showSecret = !showSecret">
                <View v-if="!showSecret" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="Refresh Token">
          <el-input
            v-model="configForm.gdriveRefreshToken"
            :type="showToken ? 'text' : 'password'"
            placeholder="Để trống nếu không thay đổi"
            clearable>
            <template #suffix>
              <el-icon class="cursor-pointer" @click="showToken = !showToken">
                <View v-if="!showToken" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="configDialog.visible = false">Hủy</el-button>
          <el-button type="primary" @click="saveConfig" :loading="configDialog.saving">Lưu thay đổi</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Guide Drawer -->
    <el-drawer
      v-model="guideDrawer"
      title="Hướng dẫn lấy Google Drive Credentials"
      direction="rtl"
      size="480px">
      <div class="guide-content pr-2">

        <el-alert type="info" :closable="false" class="mb-5">
          <template #title>
            Hệ thống dùng <b>OAuth 2.0</b> để kết nối Google Drive. Bạn cần tạo một ứng dụng riêng trên Google Cloud rồi cấp quyền cho tài khoản Drive muốn nhận backup.
          </template>
        </el-alert>

        <!-- Bước 1 -->
        <div class="guide-step">
          <div class="guide-step-header">
            <span class="step-badge">1</span>
            <span>Tạo project trên Google Cloud Console</span>
          </div>
          <div class="guide-step-body">
            <p>Truy cập <a href="https://console.cloud.google.com" target="_blank" class="guide-link">console.cloud.google.com</a>, đăng nhập bằng tài khoản Google muốn dùng làm nơi lưu backup.</p>
            <ul>
              <li>Nhấn <b>Select a project</b> → <b>New Project</b></li>
              <li>Đặt tên project (ví dụ: <code>trustid-backup</code>) → <b>Create</b></li>
            </ul>
          </div>
        </div>

        <!-- Bước 2 -->
        <div class="guide-step">
          <div class="guide-step-header">
            <span class="step-badge">2</span>
            <span>Bật Google Drive API</span>
          </div>
          <div class="guide-step-body">
            <p>Trong project vừa tạo:</p>
            <ul>
              <li>Vào menu <b>APIs & Services</b> → <b>Library</b></li>
              <li>Tìm <b>"Google Drive API"</b> → nhấn <b>Enable</b></li>
            </ul>
          </div>
        </div>

        <!-- Bước 3 -->
        <div class="guide-step">
          <div class="guide-step-header">
            <span class="step-badge">3</span>
            <span>Tạo OAuth 2.0 Client ID &amp; Client Secret</span>
          </div>
          <div class="guide-step-body">
            <p>Truy cập <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="guide-link">APIs &amp; Services → Credentials</a>:</p>
            <ul>
              <li>Nhấn <b>+ Create Credentials</b> → <b>OAuth client ID</b></li>
              <li>Nếu chưa có OAuth consent screen: chọn <b>External</b> → điền tên app → Save</li>
              <li>Application type: chọn <b>Web application</b></li>
              <li>Trong <b>Authorized redirect URIs</b> thêm:<br>
                <code class="guide-code">https://developers.google.com/oauthplayground</code>
              </li>
              <li>Nhấn <b>Create</b> → copy <b>Client ID</b> và <b>Client Secret</b></li>
            </ul>
          </div>
        </div>

        <!-- Bước 4 -->
        <div class="guide-step">
          <div class="guide-step-header">
            <span class="step-badge">4</span>
            <span>Lấy Refresh Token qua OAuth Playground</span>
          </div>
          <div class="guide-step-body">
            <p>Truy cập <a href="https://developers.google.com/oauthplayground" target="_blank" class="guide-link">developers.google.com/oauthplayground</a>:</p>
            <ul>
              <li>Nhấn biểu tượng <b>⚙️ (Settings)</b> góc trên phải</li>
              <li>Tick <b>"Use your own OAuth credentials"</b></li>
              <li>Nhập <b>Client ID</b> và <b>Client Secret</b> vừa tạo → Close</li>
              <li>Ở cột trái, tìm hoặc nhập scope:<br>
                <code class="guide-code">https://www.googleapis.com/auth/drive</code>
              </li>
              <li>Nhấn <b>Authorize APIs</b> → đăng nhập và cấp quyền cho tài khoản Drive đích</li>
              <li>Nhấn <b>Exchange authorization code for tokens</b></li>
              <li>Copy giá trị <b>Refresh token</b> trong phần response</li>
            </ul>
            <el-alert type="warning" :closable="false" class="mt-2">
              <template #title>
                <span class="text-xs">Refresh token chỉ hiển thị <b>một lần</b>. Hãy copy và lưu ngay.</span>
              </template>
            </el-alert>
          </div>
        </div>

        <!-- Bước 5 -->
        <div class="guide-step">
          <div class="guide-step-header">
            <span class="step-badge">5</span>
            <span>Lấy Folder ID của thư mục nhận backup</span>
          </div>
          <div class="guide-step-body">
            <p>Mở <a href="https://drive.google.com" target="_blank" class="guide-link">Google Drive</a> bằng tài khoản đã cấp quyền ở bước 4:</p>
            <ul>
              <li>Tạo hoặc chọn thư mục muốn lưu file backup</li>
              <li>Mở thư mục đó, nhìn URL trên thanh địa chỉ trình duyệt:<br>
                <code class="guide-code">https://drive.google.com/drive/folders/<b>[FOLDER_ID]</b></code>
              </li>
              <li>Copy phần <b>FOLDER_ID</b> (chuỗi ký tự sau <code>/folders/</code>)</li>
            </ul>
          </div>
        </div>

        <!-- Bước 6 -->
        <div class="guide-step">
          <div class="guide-step-header">
            <span class="step-badge">6</span>
            <span>Điền vào form cấu hình</span>
          </div>
          <div class="guide-step-body">
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="Folder ID">Chuỗi ID từ URL thư mục Drive (bước 5)</el-descriptions-item>
              <el-descriptions-item label="Client ID">Dạng <code>xxxx.apps.googleusercontent.com</code></el-descriptions-item>
              <el-descriptions-item label="Client Secret">Dạng <code>GOCSPX-...</code></el-descriptions-item>
              <el-descriptions-item label="Refresh Token">Chuỗi dài bắt đầu bằng <code>1//...</code></el-descriptions-item>
            </el-descriptions>
            <p class="mt-3">Sau khi lưu, nhấn <b>"Chạy Backup Ngay"</b> để kiểm tra kết nối. Nếu thành công sẽ thấy file xuất hiện trong thư mục Drive.</p>
          </div>
        </div>

        <el-alert type="success" :closable="false" class="mt-4">
          <template #title>
            <span class="text-xs">
              <b>Lưu ý bảo mật:</b> Client Secret và Refresh Token được mã hóa trong cơ sở dữ liệu.
              Khi mở lại form cấu hình, hai trường này sẽ hiển thị trống — chỉ cần nhập lại nếu muốn thay đổi tài khoản.
            </span>
          </template>
        </el-alert>

      </div>
    </el-drawer>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Setting, View, Hide, QuestionFilled, Document, FolderOpened } from '@element-plus/icons-vue';
import { backupApi } from '../api/backupApi';

const dateFormatOptions = [
  { value: 'YYYYMMDD_HHmmss', label: 'YYYYMMDD_HHmmss  →  20260505_143000  (mặc định)' },
  { value: 'YYYY-MM-DD_HHmmss', label: 'YYYY-MM-DD_HHmmss  →  2026-05-05_143000' },
  { value: 'YYYYMMDD', label: 'YYYYMMDD  →  20260505  (chỉ ngày)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD  →  2026-05-05  (chỉ ngày)' },
];

const loading = ref(false);
const running = ref(false);
const logs = ref<any[]>([]);
const total = ref(0);

const configDialog = reactive({ visible: false, loading: false, saving: false });
const guideDrawer = ref(false);
const showSecret = ref(false);
const showToken = ref(false);
const configForm = reactive({
  time: new Date(2000, 0, 1, 2, 0),
  keepDays: 7,
  isAutoEnabled: false,
  filePrefix: 'backup',
  dateFormat: 'YYYYMMDD_HHmmss',
  gdriveFolderId: '',
  gdriveClientId: '',
  gdriveClientSecret: '',
  gdriveRefreshToken: '',
});

const gdriveConfigured = computed(() =>
  !!(configForm.gdriveClientId && configForm.gdriveRefreshToken)
);

function buildPreviewDate(format: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return format
    .replace('YYYY', now.getFullYear().toString())
    .replace('MM', pad(now.getMonth() + 1))
    .replace('DD', pad(now.getDate()))
    .replace('HH', pad(now.getHours()))
    .replace('mm', pad(now.getMinutes()))
    .replace('ss', pad(now.getSeconds()));
}

const safePrefix = computed(() =>
  (configForm.filePrefix || 'backup').replace(/[^a-zA-Z0-9_-]/g, '_')
);
const previewDbName = computed(() =>
  `${safePrefix.value}_db_${buildPreviewDate(configForm.dateFormat)}.sql.gz`
);
const previewFilesName = computed(() =>
  `${safePrefix.value}_files_${buildPreviewDate(configForm.dateFormat)}.tar.gz`
);

const pageSizes = [
  { label: '10', value: 10 }, { label: '20', value: 20 }, { label: '50', value: 50 },
];
const filters = reactive({ page: 1, limit: 20 });
const onPageSizeChange = () => { filters.page = 1; fetchData(); };

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await backupApi.list({ page: filters.page, limit: filters.limit });
    logs.value = res.data.items || [];
    total.value = res.data.total || 0;
  } catch (e: any) {
    ElMessage.error('Không tải được lịch sử backup: ' + (e.response?.data?.message || e.message));
  } finally {
    loading.value = false;
  }
};

const openConfig = async () => {
  showSecret.value = false;
  showToken.value = false;
  configDialog.visible = true;
  configDialog.loading = true;
  try {
    const res = await backupApi.getConfig();
    const data = res.data;
    let hours = 2;
    let minutes = 0;
    if (data.cronTime) {
      const parts = data.cronTime.split(' ');
      if (parts.length >= 2) {
        minutes = parseInt(parts[0]) || 0;
        hours = parseInt(parts[1]) || 0;
      }
    }
    configForm.time = new Date(2000, 0, 1, hours, minutes);
    configForm.keepDays = data.keepDays || 7;
    configForm.isAutoEnabled = !!data.isAutoEnabled;
    configForm.filePrefix = data.filePrefix || 'backup';
    configForm.dateFormat = data.dateFormat || 'YYYYMMDD_HHmmss';
    configForm.gdriveFolderId = data.gdriveFolderId || '';
    configForm.gdriveClientId = data.gdriveClientId || '';
    configForm.gdriveClientSecret = '';
    configForm.gdriveRefreshToken = '';
  } catch (err: any) {
    ElMessage.error('Lỗi tải cấu hình: ' + err.message);
    configDialog.visible = false;
  } finally {
    configDialog.loading = false;
  }
};

const saveConfig = async () => {
  configDialog.saving = true;
  try {
    const h = configForm.time.getHours();
    const m = configForm.time.getMinutes();
    const cronTime = `${m} ${h} * * *`;

    const payload: any = {
      cronTime,
      keepDays: configForm.keepDays,
      isAutoEnabled: configForm.isAutoEnabled,
      filePrefix: configForm.filePrefix,
      dateFormat: configForm.dateFormat,
      gdriveFolderId: configForm.gdriveFolderId,
      gdriveClientId: configForm.gdriveClientId,
    };

    if (configForm.gdriveClientSecret) payload.gdriveClientSecret = configForm.gdriveClientSecret;
    if (configForm.gdriveRefreshToken) payload.gdriveRefreshToken = configForm.gdriveRefreshToken;

    await backupApi.updateConfig(payload);
    ElMessage.success('Lưu cấu hình thành công!');
    configDialog.visible = false;
  } catch (err: any) {
    ElMessage.error('Lỗi khi lưu cấu hình: ' + (err.response?.data?.message || err.message));
  } finally {
    configDialog.saving = false;
  }
};

const runBackup = async () => {
  try {
    await ElMessageBox.confirm('Hệ thống sẽ chạy background để tạo bản nén database và file upload. Tiếp tục?', 'Xác nhận chạy Backup', {
      type: 'warning'
    });
    running.value = true;
    const res = await backupApi.runBackup();
    ElMessage.success(res.data?.message || 'Đã gửi lệnh backup. Vui lòng F5 sau vài phút để xem kết quả.');
    setTimeout(fetchData, 2000);
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error('Lỗi khởi chạy: ' + (err.response?.data?.message || err.message));
    }
  } finally {
    running.value = false;
  }
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('vi-VN');
};

const formatStatus = (status: string) => {
  switch (status) {
    case 'success': return 'Thành công';
    case 'failed': return 'Thất bại';
    case 'pending': return 'Đang xử lý';
    case 'deleted': return 'Đã xóa cũ';
    default: return status;
  }
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'success': return 'success';
    case 'failed': return 'danger';
    case 'pending': return 'warning';
    case 'deleted': return 'info';
    default: return 'info';
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.guide-content {
  font-size: 13px;
  line-height: 1.7;
  color: #374151;
}

.guide-step {
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.guide-step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #f8fafc;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #e5e7eb;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.guide-step-body {
  padding: 12px 14px;
}

.guide-step-body p {
  margin: 0 0 8px;
}

.guide-step-body ul {
  margin: 0;
  padding-left: 18px;
}

.guide-step-body li {
  margin-bottom: 5px;
}

.guide-link {
  color: #2563eb;
  text-decoration: underline;
}

.guide-code {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 1px 5px;
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.file-preview-box {
  margin: 0 0 16px 160px;
  background: #f8fafc;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  padding: 10px 14px;
}

.file-preview-label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 6px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.file-preview-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.file-preview-item code {
  font-family: monospace;
  font-size: 12px;
  color: #1e293b;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
