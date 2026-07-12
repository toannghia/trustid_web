<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, Monitor, Collection, Finished, Connection, Van, View, MapLocation, ShoppingCart } from '@element-plus/icons-vue';
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
    'EXPORTED': 'Lô đã xuất khẩu',
    'BAG_PACKAGING': 'Lô đóng gói bao'
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string) => {
  const labels: any = {
    'AVAILABLE': 'Sẵn sàng',
    'ACTIVE': 'Đã kích hoạt',
    'ACTIVATED': 'Đã kích hoạt',
    'INACTIVE': 'Chưa kích hoạt',
    'UNACTIVATED': 'Chưa kích hoạt',
    'EXPORTED': 'Đã xuất file',
    'SHIPPED': 'Đã xuất cho đại lý',
    'SOLD': 'Đã bán',
    'AT_DEALER': 'Tại đại lý',
    'LOST': 'Thất lạc',
    'DAMAGED': 'Hư hỏng / Thất lạc',
    'LINKED': 'Đã liên kết',
    'PACKAGED': 'Đã đóng gói'
  };
  return labels[status] || status;
};

const getStatusType = (status: string) => {
  const types: any = {
    'ACTIVE': 'success',
    'ACTIVATED': 'success',
    'SHIPPED': '',
    'SOLD': 'warning',
    'AT_DEALER': 'primary',
    'LOST': 'danger',
    'DAMAGED': 'danger',
    'UNACTIVATED': 'info',
    'LINKED': 'success',
    'PACKAGED': 'success'
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

const getTransferStatusLabel = (status: string) => {
  const labels: any = {
    'PENDING': 'Chờ xử lý',
    'DRAFT': 'Nháp',
    'EXPORTED': 'Đã xuất',
    'IMPORTING': 'Đang nhập',
    'COMPLETED': 'Hoàn tất',
    'PARTIAL_COMPLETED': 'Nhập một phần',
    'CANCELLED': 'Đã hủy'
  };
  return labels[status] || status;
};

const auditData = ref<any>(null);

const unifiedTimeline = computed(() => {
  if (!auditData.value) return [];
  const events: any[] = [];

  // Logistics movements
  if (auditData.value.logistics_info?.movements) {
    for (const move of auditData.value.logistics_info.movements) {
      events.push({
        eventType: 'logistics',
        timestamp: new Date(move.time),
        data: move,
      });
    }
  }

  // B2B Transfer
  if (auditData.value.b2b_transfer_info) {
    events.push({
      eventType: 'b2b_transfer',
      timestamp: new Date(auditData.value.b2b_transfer_info.exported_at || auditData.value.b2b_transfer_info.imported_at || 0),
      data: auditData.value.b2b_transfer_info,
    });
  }

  // Distribution (Export to Dealer)
  if (auditData.value.distribution_info) {
    events.push({
      eventType: 'distribution',
      timestamp: new Date(auditData.value.distribution_info.scanned_at),
      data: auditData.value.distribution_info,
    });
  }

  // Dealer Receive
  if (auditData.value.dealer_receive_info) {
    events.push({
      eventType: 'dealer_receive',
      timestamp: new Date(auditData.value.dealer_receive_info.received_at),
      data: auditData.value.dealer_receive_info,
    });
  }

  // Dealer Sale
  if (auditData.value.sale_info) {
    events.push({
      eventType: 'sale',
      timestamp: new Date(auditData.value.sale_info.sale_date),
      data: auditData.value.sale_info,
    });
  }

  // Consumer Scans
  if (auditData.value.scan_info?.history) {
    for (const scan of auditData.value.scan_info.history) {
      events.push({
        eventType: 'scan',
        timestamp: new Date(scan.time),
        data: scan,
      });
    }
  }

  // Sort chronologically; when same time, use logical priority
  const priority: Record<string, number> = {
    distribution: 1,
    dealer_receive: 2,
    b2b_transfer: 3,
    logistics: 4,
    sale: 5,
    scan: 6,
  };
  events.sort((a, b) => {
    const diff = a.timestamp.getTime() - b.timestamp.getTime();
    if (diff !== 0) return diff;
    return (priority[a.eventType] || 99) - (priority[b.eventType] || 99);
  });
  return events;
});
const showPacketsDialog = ref(false);

const handleAuditPacket = async (packetCode: string) => {
  showPacketsDialog.value = false;
  searchCode.value = packetCode;
  await handleSearch();
};

const handleSearch = async () => {
  if (!searchCode.value) return;
  
  loading.value = true;
  try {
    auditData.value = await traceabilityApi.auditCode(searchCode.value);
  } catch (err: any) {
    const status = err.response?.status;
    const message = err.response?.data?.message;
    
    if (status === 403) {
      ElMessage.warning(message || 'Bạn không có quyền xem mã này');
    } else {
      ElMessage.error(message || 'Không tìm thấy thông tin mã');
    }
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
          placeholder="Nhập mã QR TrustID..."
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
                <el-tag :type="getStatusType(auditData.code_info.status)">{{ getStatusLabel(auditData.code_info.status) }}</el-tag>
              </div>
            </template>
            <div class="info-item">
              <label>Mã QR TrustID:</label>
              <code class="code-string-prominent">{{ auditData.code_info.code_string }}</code>
            </div>
            <div class="info-item">
              <label>Serial:</label>
              <span class="serial-text">{{ auditData.code_info.serial || 'N/A' }}</span>
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
            <div class="info-item" v-if="auditData.bag_info && auditData.bag_info.is_bag">
              <label>Số gói trong bao:</label>
              <strong>
                {{ auditData.bag_info.packet_count }} gói
                <el-button type="primary" link size="small" @click="showPacketsDialog = true" style="margin-left: 8px;">
                  (Xem danh sách)
                </el-button>
              </strong>
            </div>
          </el-card>

          <el-card class="info-card mt-4">
            <template #header>
              <div class="card-header">
                <span>Thống kê quét</span>
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
                    <h3>{{ auditData.production_info.batch_type === 'SEMI_FINISHED' ? 'Đóng gói Bán thành phẩm' : auditData.production_info.batch_type === 'BAG_PACKAGING' ? 'Đóng gói Bao' : 'Đóng gói Thành phẩm' }}</h3>
                    <p>Gắn vào sản phẩm <strong>{{ auditData.production_info.product_name }}</strong></p>
                    <div class="meta-info">
                      <span>Lô: {{ auditData.production_info.batch_code }}</span>
                      <span v-if="auditData.production_info.activated_by_name">Bởi: {{ auditData.production_info.activated_by_name }}</span>
                      <span>Tại: {{ auditData.production_info.tenant_name }}</span>
                    </div>
                    <div class="meta-info mt-1">
                      <span>Trạng thái: {{ getStatusLabel(auditData.production_info.status) }}</span>
                    </div>
                  </div>
                </el-timeline-item>

                <!-- Stage 3b: Bag Mapping -->
                <el-timeline-item
                  v-if="auditData.bag_info"
                  :timestamp="auditData.bag_info.linked_at ? formatDate(auditData.bag_info.linked_at) : 'Đã liên kết'"
                  placement="top"
                  type="warning"
                >
                  <div class="timeline-content">
                    <h3>Liên kết Bao</h3>
                    <p>Thuộc bao <strong>{{ auditData.bag_info.bag_qr_code ? `${auditData.bag_info.bag_qr_code} (${auditData.bag_info.bag_serial})` : auditData.bag_info.bag_serial }}</strong></p>
                    <div class="meta-info">
                      <span>Nhóm lô: {{ auditData.bag_info.group_index }}</span>
                      <span>Số gói trong bao: {{ auditData.bag_info.packet_count }}</span>
                      <span>Trạng thái lô: {{ getStatusLabel(auditData.bag_info.lot_status) }}</span>
                    </div>
                  </div>
                </el-timeline-item>

                <!-- Unified Timeline: all events sorted by timestamp -->
                <el-timeline-item
                  v-for="(evt, idx) in unifiedTimeline"
                  :key="'evt-' + idx"
                  :timestamp="formatDate(evt.timestamp)"
                  placement="top"
                  :type="evt.eventType === 'logistics' ? (evt.data.type === 'INBOUND' ? 'success' : 'info') : evt.eventType === 'b2b_transfer' ? 'warning' : evt.eventType === 'distribution' ? 'primary' : evt.eventType === 'dealer_receive' ? 'primary' : evt.eventType === 'sale' ? 'warning' : 'danger'"
                >
                  <div class="timeline-content">
                    <!-- Logistics Movement -->
                    <template v-if="evt.eventType === 'logistics'">
                      <h3>{{ getMovementTypeLabel(evt.data.type) }}</h3>
                      <p>Tại: <strong>{{ evt.data.warehouse }}</strong></p>
                      <div class="meta-info mb-1">
                        <span>Người thực hiện: {{ evt.data.performed_by }}</span>
                        <span v-if="evt.data.reference_code" class="ml-2">| Phiếu: <strong>{{ evt.data.reference_code }}</strong></span>
                      </div>
                      <div class="meta-info mb-1" v-if="evt.data.transfer_from || evt.data.transfer_to">
                        <span>📦 Từ: <strong>{{ evt.data.transfer_from }}</strong> → <strong>{{ evt.data.transfer_to }}</strong></span>
                        <span v-if="evt.data.transfer_status">Trạng thái: {{ getTransferStatusLabel(evt.data.transfer_status) }}</span>
                      </div>
                      <div class="meta-info mb-1" v-if="evt.data.vehicle_plate || evt.data.driver_name">
                        <span v-if="evt.data.vehicle_plate">🚛 Xe: <strong>{{ evt.data.vehicle_plate }}</strong></span>
                        <span v-if="evt.data.driver_name">Tài xế: {{ evt.data.driver_name }}<template v-if="evt.data.driver_phone"> ({{ evt.data.driver_phone }})</template></span>
                      </div>
                      <p class="notes" v-if="evt.data.notes">{{ evt.data.notes }}</p>
                    </template>

                    <!-- B2B Transfer -->
                    <template v-else-if="evt.eventType === 'b2b_transfer'">
                      <h3>Xuất bán thành phẩm (B2B)</h3>
                      <p>Phiếu: <strong>{{ evt.data.transfer_code }}</strong>
                        <el-tag size="small" :type="evt.data.status === 'COMPLETED' ? 'success' : evt.data.status === 'EXPORTED' ? '' : 'info'" class="ml-2">
                          {{ getTransferStatusLabel(evt.data.status) }}
                        </el-tag>
                      </p>
                      <div class="meta-info mb-1">
                        <span>📦 Từ: <strong>{{ evt.data.from_tenant }}</strong> → <strong>{{ evt.data.to_tenant }}</strong></span>
                      </div>
                      <div class="meta-info mb-1">
                        <span>K.lượng xuất: {{ evt.data.expected_quantity }} kg</span>
                        <span v-if="evt.data.received_quantity">K.lượng nhận: {{ evt.data.received_quantity }} kg</span>
                        <span v-if="evt.data.exported_by">Người xuất: {{ evt.data.exported_by }}</span>
                      </div>
                      <div class="meta-info" v-if="evt.data.imported_at">
                        <span>Ngày nhập: {{ formatDate(evt.data.imported_at) }}</span>
                      </div>
                    </template>

                    <!-- Distribution (Export to Dealer) -->
                    <template v-else-if="evt.eventType === 'distribution'">
                      <h3>Xuất kho cho Đại lý</h3>
                      <p>Đại lý: <strong>{{ evt.data.dealer_name || 'N/A' }}</strong></p>
                      <div class="meta-info">
                        <span>Phiếu xuất: {{ evt.data.export_order_code }}</span>
                        <span>Trạng thái: {{ evt.data.export_status }}</span>
                        <span>Phương thức: {{ evt.data.scan_method === 'BOX' ? 'Quét bao' : 'Quét lẻ' }}</span>
                      </div>
                    </template>

                    <!-- Dealer Receive -->
                    <template v-else-if="evt.eventType === 'dealer_receive'">
                      <h3>Đại lý nhận hàng</h3>
                      <p>Người nhận: <strong>{{ evt.data.receiver_name || 'N/A' }}</strong></p>
                      <div class="meta-info">
                        <span>Phiếu giao hàng: {{ evt.data.tracking_code }}</span>
                      </div>
                    </template>

                    <!-- Dealer Sale -->
                    <template v-else-if="evt.eventType === 'sale'">
                      <h3>Đại lý bán cho khách hàng</h3>
                      <p>Khách hàng: <strong>{{ evt.data.customer_name || 'Khách lẻ' }}</strong></p>
                      <div class="meta-info">
                        <span>Hóa đơn: {{ evt.data.receipt_number }}</span>
                        <span v-if="evt.data.customer_phone">SĐT: {{ evt.data.customer_phone }}</span>
                        <span>Thanh toán: {{ evt.data.payment_method === 'cash' ? 'Tiền mặt' : evt.data.payment_method === 'transfer' ? 'Chuyển khoản' : evt.data.payment_method || 'N/A' }}</span>
                      </div>
                      <div class="meta-info mt-1" v-if="evt.data.item_price">
                        <span>Đơn giá: {{ Number(evt.data.item_price).toLocaleString('vi-VN') }}đ</span>
                      </div>
                    </template>

                    <!-- Consumer Scan -->
                    <template v-else-if="evt.eventType === 'scan'">
                      <h3>Người dùng quét</h3>
                      <p>Được quét tại: <strong>{{ evt.data.location }}</strong></p>
                      <p class="meta-info">Thiết bị: {{ evt.data.device }}</p>
                    </template>
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

    <!-- Dialog hiển thị danh sách mã gói trong bao -->
    <el-dialog
      v-if="auditData && auditData.bag_info"
      v-model="showPacketsDialog"
      title="Danh sách mã gói trong bao"
      width="650px"
      destroy-on-close
    >
      <div style="margin-bottom: 16px; font-size: 14px;">
        <span>Bao: </span>
        <strong style="color: var(--el-color-primary);">{{ auditData.bag_info.bag_qr_code }} ({{ auditData.bag_info.bag_serial }})</strong>
      </div>
      
      <el-table :data="auditData.bag_info.packets || []" stripe style="width: 100%" max-height="400">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column prop="code_string" label="Mã QR Gói" />
        <el-table-column prop="serial" label="Serial" width="120" />
        <el-table-column label="Hành động" width="120" align="center">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="handleAuditPacket(scope.row.code_string)">
              Audit mã này
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showPacketsDialog = false">Đóng</el-button>
        </div>
      </template>
    </el-dialog>
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

.code-string-prominent {
  background: #f0f2f5;
  padding: 6px 12px;
  border-radius: 6px;
  font-family: monospace;
  word-break: break-all;
  font-size: 15px;
  font-weight: 700;
  color: #2c3e50;
  border: 1px solid #dcdfe6;
  display: inline-block;
}

.serial-text {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
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
