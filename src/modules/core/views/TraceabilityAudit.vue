<script setup lang="ts">
import { ref } from 'vue';
import { Search, Monitor, Collection, Finished, Connection, Van, View, MapLocation } from '@element-plus/icons-vue';
import { traceabilityApi } from '../api/traceability';
import { ElMessage } from 'element-plus';

const searchCode = ref('');
const loading = ref(false);
const getBatchTypeLabel = (type: string) => {
  const labels: any = {
    'FARM': 'Lô vùng trồng',
    'SEMI_FINISHED': 'Lô bán thành phẩm',
    'CROSS_TENANT': 'Lô nhập từ đối tác',
    'EXTERNAL': 'Lô nhập ngoài',
    'LEGACY': 'Lô hệ thống cũ',
    'EXPORTED': 'Lô đã xuất khẩu'
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string) => {
  const labels: any = {
    'AVAILABLE': 'Sẵn sàng',
    'ACTIVE': 'Đã kích hoạt',
    'INACTIVE': 'Chưa kích hoạt',
    'EXPORTED': 'Đã xuất file',
    'SOLD': 'Đã bán',
    'AT_DEALER': 'Tại đại lý',
    'LOST': 'Thất lạc'
  };
  return labels[status] || status;
};

const getStatusType = (status: string) => {
  const types: any = {
    'ACTIVE': 'success',
    'SOLD': 'warning',
    'LOST': 'danger',
    'AT_DEALER': 'primary'
  };
  return types[status] || 'info';
};

const getMovementTypeLabel = (type: string) => {
  const labels: any = {
    'INBOUND': 'Nhập kho',
    'OUTBOUND': 'Xuất kho',
    'ADJUSTMENT': 'Điều chỉnh'
  };
  return labels[type] || type;
};

const auditData = ref<any>(null);

const handleSearch = async () => {
  if (!searchCode.value) return;
  
  loading.value = true;
  try {
    auditData.value = await traceabilityApi.auditCode(searchCode.value);
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Không tìm thấy thông tin mã');
    auditData.value = null;
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('vi-VN');
};

</script>

<template>
  <div class="audit-container">
    <div class="header-section">
      <div class="title-group">
        <h1>Tra cứu Audit Mã</h1>
        <p>Kiểm tra lịch sử vòng đời và trạng thái vận hành của mã truy xuất</p>
      </div>
      
      <div class="search-box">
        <el-input
          v-model="searchCode"
          placeholder="Nhập Serial hoặc mã QR (TrustID)..."
          class="audit-input"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button :loading="loading" type="primary" @click="handleSearch">KIỂM TRA</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <div v-if="auditData" class="audit-content">
      <el-row :gutter="24">
        <!-- Sidebar: Basic Info -->
        <el-col :span="8">
          <el-card class="info-card info-code">
            <template #header>
              <div class="card-header">
                <span>Thông tin mã</span>
                <el-tag :type="getStatusType(auditData.code_info.status)">{{ auditData.code_info.status }}</el-tag>
              </div>
            </template>
            <div class="info-item">
              <label>Serial:</label>
              <strong>{{ auditData.code_info.serial || 'N/A' }}</strong>
            </div>
            <div class="info-item">
              <label>Mã QR TrustID:</label>
              <code class="code-string">{{ auditData.code_info.code_string }}</code>
            </div>
            <div class="info-item">
              <label>Ngày tạo mã:</label>
              <span>{{ formatDate(auditData.code_info.created_at) }}</span>
            </div>
            <div class="info-item">
              <label>User tạo:</label>
              <span>{{ auditData.issuance_info.created_by }}</span>
            </div>
            <div class="info-item">
              <label>Tenant sở hữu:</label>
              <strong>{{ auditData.issuance_info.tenant_name }}</strong>
            </div>
          </el-card>

          <el-card class="info-card mt-4" v-if="auditData.production_info">
            <template #header>
              <div class="card-header">
                <span>Thông tin sản xuất</span>
              </div>
            </template>
            <div class="info-item">
              <label>Sản phẩm:</label>
              <strong>{{ auditData.production_info.product_name }}</strong>
            </div>
            <div class="info-item">
              <label>Mã lô (Batch):</label>
              <el-tag size="small">{{ auditData.production_info.batch_code }}</el-tag>
            </div>
            <div class="info-item">
              <label>Loại lô:</label>
              <el-tag type="info" size="small">{{ getBatchTypeLabel(auditData.production_info.batch_type) }}</el-tag>
            </div>
            <div class="info-item">
              <label>Trạng thái:</label>
              <el-tag :type="getStatusType(auditData.production_info.status)" size="small">{{ getStatusLabel(auditData.production_info.status) }}</el-tag>
            </div>
            <div class="info-item">
              <label>Kích hoạt lúc:</label>
              <span>{{ formatDate(auditData.production_info.activated_at) }}</span>
            </div>
          </el-card>

          <el-card class="info-card mt-4">
            <template #header>
              <div class="card-header">
                <span>Thống kê quét (Consumer)</span>
              </div>
            </template>
            <div class="scan-stats">
              <div class="stat-box">
                <span class="stat-value">{{ auditData.scan_info.total_scans }}</span>
                <span class="stat-label">Lượt quét</span>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- Main Content: Lifecycle Timeline -->
        <el-col :span="16">
          <el-card class="timeline-card">
            <template #header>
              <div class="card-header">
                <span>Vòng đời mã (Lifecycle)</span>
              </div>
            </template>

            <div class="lifecycle-timeline">
              <el-timeline>
                <!-- Stage 1: Issuance (Oldest) -->
                <el-timeline-item
                  :timestamp="formatDate(auditData.issuance_info.created_at)"
                  placement="top"
                  type="primary"
                  :hollow="true"
                >
                  <div class="timeline-content">
                    <h3>Khởi tạo dải mã (Pool)</h3>
                    <p>Mã được tạo trong lô <strong>{{ auditData.issuance_info.pool_name }}</strong></p>
                    <div class="meta-info">
                      <span>Tiền tố: {{ auditData.issuance_info.prefix }}</span>
                      <span>Nguồn: {{ auditData.issuance_info.source }}</span>
                      <span>Người tạo: {{ auditData.issuance_info.created_by }}</span>
                    </div>
                  </div>
                </el-timeline-item>

                <!-- Stage 2: Exported (Printed) -->
                <el-timeline-item
                  v-if="auditData.issuance_info.export_status === 'EXPORTED'"
                  timestamp="Đã thực hiện"
                  placement="top"
                  type="warning"
                >
                  <div class="timeline-content">
                    <h3>Đã xuất file In ấn (Excel)</h3>
                    <p>Dải mã đã được xuất ra file Excel để phục vụ in tem vật lý.</p>
                  </div>
                </el-timeline-item>

                <!-- Stage 3: Packaging -->
                <el-timeline-item
                  v-if="auditData.production_info"
                  :timestamp="formatDate(auditData.production_info.production_date)"
                  placement="top"
                  type="success"
                >
                  <div class="timeline-content">
                    <h3>{{ auditData.production_info.batch_type === 'SEMI_FINISHED' ? 'Đóng gói Bán thành phẩm' : 'Đóng gói Thành phẩm' }}</h3>
                    <p>Gắn vào sản phẩm <strong>{{ auditData.production_info.product_name }}</strong></p>
                    <div class="meta-info">
                      <span>Lô: {{ auditData.production_info.batch_code }}</span>
                      <span>Bởi: {{ auditData.production_info.activated_by_name }}</span>
                      <span>Tại: {{ auditData.production_info.tenant_name }}</span>
                    </div>
                    <div class="meta-info mt-1">
                      <span>Trạng thái: {{ auditData.production_info.status }}</span>
                    </div>
                  </div>
                </el-timeline-item>

                <!-- Stage 4: Logistics -->
                <el-timeline-item
                  v-for="(move, idx) in auditData.logistics_info.movements"
                  :key="'move-' + idx"
                  :timestamp="formatDate(move.time)"
                  placement="top"
                  :type="move.type === 'INBOUND' ? 'success' : 'info'"
                >
                  <div class="timeline-content">
                    <h3>{{ getMovementTypeLabel(move.type) }}</h3>
                    <p>Tại: <strong>{{ move.warehouse }}</strong></p>
                    <div class="meta-info mb-1">
                      <span>Người thực hiện: {{ move.performed_by }}</span>
                      <span v-if="move.reference_code" class="ml-2">| Phiếu: <strong>{{ move.reference_code }}</strong></span>
                    </div>
                    <p class="notes" v-if="move.notes">{{ move.notes }}</p>
                  </div>
                </el-timeline-item>

                <!-- Stage 5: Consumer Scans -->
                <el-timeline-item
                  v-for="(scan, idx) in auditData.scan_info.history"
                  :key="'scan-' + idx"
                  :timestamp="formatDate(scan.time)"
                  placement="top"
                  type="danger"
                >
                  <div class="timeline-content">
                    <h3>Tương tác người tiêu dùng</h3>
                    <p>Được quét tại: <strong>{{ scan.location }}</strong></p>
                    <p class="meta-info">Thiết bị: {{ scan.device }}</p>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </div>
          </el-card>

          <!-- Consumer Scan History Table -->
          <el-card class="mt-4" v-if="auditData.scan_info.history.length > 0">
            <template #header>
              <div class="card-header">
                <span>Lịch sử quét chi tiết</span>
              </div>
            </template>
            <el-table :data="auditData.scan_info.history" stripe style="width: 100%">
              <el-table-column label="Thời gian" width="180">
                <template #default="scope">
                  {{ formatDate(scope.row.time) }}
                </template>
              </el-table-column>
              <el-table-column prop="location" label="Vị trí / Địa chỉ" />
              <el-table-column prop="device" label="Device ID" width="200" show-overflow-tooltip />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div v-else-if="!loading" class="empty-state">
      <el-empty description="Nhập mã Serial hoặc quét QR để bắt đầu kiểm tra" />
    </div>
  </div>
</template>

<style scoped>
.audit-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 100px);
}

.header-section {
  background: #fff;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  margin-bottom: 24px;
  text-align: center;
}

.title-group h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.title-group p {
  color: #666;
  font-size: 16px;
  margin-bottom: 24px;
}

.search-box {
  max-width: 600px;
  margin: 0 auto;
}

.audit-input :deep(.el-input__wrapper) {
  padding: 12px 16px;
  font-size: 16px;
  border-radius: 12px 0 0 12px;
}

.audit-input :deep(.el-input-group__append) {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
  border-radius: 0 12px 12px 0;
  padding: 0 24px;
  font-weight: 600;
}

.info-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.card-header {
  font-weight: 700;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
}

.info-item label {
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.code-string {
  background: #f0f2f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  word-break: break-all;
}

.stat-box {
  text-align: center;
  padding: 16px;
  background: #fdf6ec;
  border-radius: 12px;
  border: 1px solid #faecd8;
}

.stat-value {
  display: block;
  font-size: 32px;
  font-weight: 800;
  color: #e6a23c;
}

.stat-label {
  font-size: 13px;
  color: #af7a2e;
}

.timeline-card {
  border-radius: 16px;
  border: none;
}

.lifecycle-timeline {
  padding: 20px;
}

.timeline-content h3 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 4px;
}

.timeline-content p {
  font-size: 14px;
  color: #555;
  margin-bottom: 8px;
}

.meta-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
}

.notes {
  font-style: italic;
  color: #888;
  font-size: 13px;
  padding-left: 12px;
  border-left: 2px solid #eee;
}

.mt-4 {
  margin-top: 16px;
}

.empty-state {
  margin-top: 60px;
}
</style>
