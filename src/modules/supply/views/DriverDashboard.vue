<template>
  <div class="driver-dashboard">
    <!-- HEADER -->
    <div class="driver-header">
      <div class="header-left">
        <el-icon size="24" color="#fff"><Van /></el-icon>
        <span class="header-title">Vận chuyển</span>
      </div>
      <el-button :icon="Refresh" circle size="small" @click="loadShipments" :loading="loading" />
    </div>

    <!-- STATS -->
    <div class="stats-bar">
      <div class="stat-item stat-all" @click="activeTab = 'all'">
        <span class="stat-count">{{ shipments.length }}</span>
        <span class="stat-label">Tất cả</span>
      </div>
      <div class="stat-item stat-waiting" @click="activeTab = 'waiting'">
        <span class="stat-count">{{ waitingList.length }}</span>
        <span class="stat-label">Chờ nhận</span>
      </div>
      <div class="stat-item stat-transit" @click="activeTab = 'transit'">
        <span class="stat-count">{{ transitList.length }}</span>
        <span class="stat-label">Đang giao</span>
      </div>
      <div class="stat-item stat-done" @click="activeTab = 'done'">
        <span class="stat-count">{{ deliveredList.length }}</span>
        <span class="stat-label">Đã giao</span>
      </div>
    </div>

    <!-- TABS -->
    <div class="tab-bar">
      <div :class="['tab-item', { active: activeTab === 'all' }]" @click="activeTab = 'all'">
        📋 Tất cả
      </div>
      <div :class="['tab-item', { active: activeTab === 'waiting' }]" @click="activeTab = 'waiting'">
        📦 Chờ nhận
      </div>
      <div :class="['tab-item', { active: activeTab === 'transit' }]" @click="activeTab = 'transit'">
        🚛 Đang giao
      </div>
      <div :class="['tab-item', { active: activeTab === 'done' }]" @click="activeTab = 'done'">
        ✅ Đã giao
      </div>
    </div>

    <!-- TAB: TẤT CẢ -->
    <div v-if="activeTab === 'all'" class="tab-content">
      <div v-if="!shipments.length" class="empty-state">
        <div class="empty-icon">📋</div>
        <div>Chưa có phiếu giao hàng nào</div>
      </div>
      <div v-for="s in shipments" :key="s.id" class="ship-card" @click="openDetail(s)">
        <div class="card-top">
          <span class="tracking-code">{{ s.trackingCode }}</span>
          <span :class="['status-badge', getStatusBadgeClass(s.status)]">{{ getStatusLabel(s.status) }}</span>
        </div>
        <div class="card-info">
          <div><span class="label">🏪 Đại lý:</span> {{ s.dealer?.name || '---' }}</div>
          <div v-if="s.dealer?.address"><span class="label">📍 Địa chỉ:</span> {{ s.dealer.address }}</div>
          <div><span class="label">🚗 Xe:</span> {{ s.vehiclePlate || '---' }}</div>
          <div><span class="label">📦 Hàng:</span> {{ s.expectedItems?.length || 0 }} sản phẩm</div>
          <div class="text-xs text-gray-400">
            {{ formatDate(s.createdAt) }}
          </div>
        </div>
        <div class="card-actions">
          <el-button v-if="s.status === 'WAITING_DRIVER' || s.status === 'READY_FOR_PICKUP'" type="warning" size="small" @click.stop="confirmPickup(s)" :loading="actionLoading === s.id" round>
            <el-icon class="mr-1"><Download /></el-icon> Nhận hàng
          </el-button>
          <el-button v-if="s.status === 'IN_TRANSIT'" type="success" size="small" @click.stop="confirmDelivery(s)" :loading="actionLoading === s.id" round>
            <el-icon class="mr-1"><CircleCheck /></el-icon> Xác nhận giao
          </el-button>
          <el-tag v-if="s.status === 'PENDING_DEALER_CONFIRM'" type="info" effect="dark" round size="small">⏳ Đợi đại lý</el-tag>
          <el-tag v-if="s.status === 'DELIVERED'" type="success" effect="dark" round size="small">✅ Hoàn thành</el-tag>
        </div>
      </div>
    </div>

    <!-- TAB: CHỜ NHẬN -->
    <div v-if="activeTab === 'waiting'" class="tab-content">
      <div v-if="!waitingList.length" class="empty-state">
        <div class="empty-icon">📭</div>
        <div>Không có phiếu chờ nhận</div>
      </div>
      <div v-for="s in waitingList" :key="s.id" class="ship-card" @click="openDetail(s)">
        <div class="card-top">
          <span class="tracking-code">{{ s.trackingCode }}</span>
          <span class="status-badge waiting">Chờ nhận</span>
        </div>
        <div class="card-info">
          <div><span class="label">🏭 Kho:</span> {{ s.sourceWarehouse?.name || '---' }}</div>
          <div><span class="label">🏪 Đại lý:</span> {{ s.dealer?.name || '---' }}</div>
          <div v-if="s.dealer?.address"><span class="label">📍 Địa chỉ:</span> {{ s.dealer.address }}</div>
          <div v-if="s.dealer?.contactPerson"><span class="label">👤 Liên hệ:</span> {{ s.dealer.contactPerson }}</div>
          <div v-if="s.dealer?.phone"><span class="label">📞 SĐT:</span> <a :href="'tel:' + s.dealer.phone" class="phone-link">{{ s.dealer.phone }}</a></div>
          <div><span class="label">🚗 Xe:</span> {{ s.vehiclePlate || '---' }}</div>
          <div><span class="label">📦 Hàng:</span> {{ s.expectedItems?.length || 0 }} sản phẩm</div>
        </div>
        <div class="card-actions">
          <el-button type="warning" @click.stop="confirmPickup(s)" :loading="actionLoading === s.id" round>
            <el-icon class="mr-1"><Download /></el-icon> Nhận hàng
          </el-button>
        </div>
      </div>
    </div>

    <!-- TAB: ĐANG GIAO -->
    <div v-if="activeTab === 'transit'" class="tab-content">
      <div v-if="!transitList.length" class="empty-state">
        <div class="empty-icon">🚛</div>
        <div>Không có phiếu đang giao</div>
      </div>
      <div v-for="s in transitList" :key="s.id" class="ship-card" @click="openDetail(s)">
        <div class="card-top">
          <span class="tracking-code">{{ s.trackingCode }}</span>
          <span :class="['status-badge', s.status === 'PENDING_DEALER_CONFIRM' ? 'pending' : 'transit']">
            {{ s.status === 'PENDING_DEALER_CONFIRM' ? 'Chờ đại lý xác nhận' : 'Đang giao' }}
          </span>
        </div>
        <div class="card-info">
          <div><span class="label">🏪 Đại lý:</span> {{ s.dealer?.name || '---' }}</div>
          <div v-if="s.dealer?.address"><span class="label">📍 Địa chỉ:</span> {{ s.dealer.address }}</div>
          <div v-if="s.dealer?.contactPerson"><span class="label">👤 Liên hệ:</span> {{ s.dealer.contactPerson }}</div>
          <div v-if="s.dealer?.phone"><span class="label">📞 SĐT:</span> <a :href="'tel:' + s.dealer.phone" class="phone-link">{{ s.dealer.phone }}</a></div>
          <div><span class="label">🚗 Xe:</span> {{ s.vehiclePlate || '---' }}</div>
          <div><span class="label">📦 Hàng:</span> {{ s.expectedItems?.length || 0 }} sản phẩm</div>
          <div v-if="s.startTime" class="text-xs text-gray-400">
            Nhận lúc: {{ formatDate(s.startTime) }}
          </div>
        </div>
        <div class="card-actions">
          <el-button v-if="s.dealer?.phone" plain size="small" @click.stop="callDealer(s)" round>
            <el-icon class="mr-1"><Phone /></el-icon> Gọi đại lý
          </el-button>
          <el-button v-if="s.status === 'IN_TRANSIT'" type="success" @click.stop="confirmDelivery(s)" :loading="actionLoading === s.id" round>
            <el-icon class="mr-1"><CircleCheck /></el-icon> Xác nhận giao
          </el-button>
          <el-tag v-if="s.status === 'PENDING_DEALER_CONFIRM'" type="info" effect="dark" round>⏳ Đợi đại lý nhận</el-tag>
        </div>
      </div>
    </div>

    <!-- TAB: ĐÃ GIAO -->
    <div v-if="activeTab === 'done'" class="tab-content">
      <div v-if="!deliveredList.length" class="empty-state">
        <div class="empty-icon">📋</div>
        <div>Chưa có phiếu đã giao</div>
      </div>
      <div v-for="s in deliveredList" :key="s.id" class="ship-card done" @click="openDetail(s)">
        <div class="card-top">
          <span class="tracking-code">{{ s.trackingCode }}</span>
          <span class="status-badge done">Đã giao ✓</span>
        </div>
        <div class="card-info">
          <div><span class="label">🏪</span> {{ s.dealer?.name || '---' }}</div>
          <div v-if="s.endTime" class="text-xs text-gray-400">
            Giao lúc: {{ formatDate(s.endTime) }}
          </div>
        </div>
      </div>
    </div>

    <!-- DETAIL DIALOG -->
    <el-dialog v-model="showDetail" :title="'Chi tiết phiếu ' + (currentShipment?.trackingCode || '')" width="520px" class="detail-dialog">
      <div v-if="currentShipment">
        <!-- Status flow -->
        <div class="status-flow">
          <div :class="['flow-step', { active: true }]">
            <div class="flow-dot">1</div>
            <div class="flow-label">Tạo phiếu</div>
          </div>
          <div class="flow-line" :class="{ active: currentShipment.status !== 'WAITING_DRIVER' && currentShipment.status !== 'READY_FOR_PICKUP' }"></div>
          <div :class="['flow-step', { active: ['IN_TRANSIT','PENDING_DEALER_CONFIRM','DELIVERED'].includes(currentShipment.status) }]">
            <div class="flow-dot">2</div>
            <div class="flow-label">Tài xế nhận</div>
          </div>
          <div class="flow-line" :class="{ active: ['PENDING_DEALER_CONFIRM','DELIVERED'].includes(currentShipment.status) }"></div>
          <div :class="['flow-step', { active: ['PENDING_DEALER_CONFIRM','DELIVERED'].includes(currentShipment.status) }]">
            <div class="flow-dot">3</div>
            <div class="flow-label">Tài xế giao</div>
          </div>
          <div class="flow-line" :class="{ active: currentShipment.status === 'DELIVERED' }"></div>
          <div :class="['flow-step', { active: currentShipment.status === 'DELIVERED' }]">
            <div class="flow-dot">4</div>
            <div class="flow-label">Đại lý nhận</div>
          </div>
        </div>

        <!-- Info rows -->
        <div class="detail-section">
          <div class="detail-row"><span class="detail-label">Mã phiếu</span><span class="detail-value font-bold text-blue-600">{{ currentShipment.trackingCode }}</span></div>
          <div class="detail-row"><span class="detail-label">Trạng thái</span><el-tag :type="getStatusType(currentShipment.status)" effect="dark" size="small">{{ getStatusLabel(currentShipment.status) }}</el-tag></div>
          <div class="detail-row"><span class="detail-label">Biển số xe</span><span class="detail-value">{{ currentShipment.vehiclePlate || '---' }}</span></div>
          <div class="detail-row"><span class="detail-label">Kho xuất</span><span class="detail-value">{{ currentShipment.sourceWarehouse?.name || '---' }}</span></div>
          <div class="detail-row"><span class="detail-label">Đại lý nhận</span><span class="detail-value font-bold text-orange-600">{{ currentShipment.dealer?.name || '---' }}</span></div>
          <div v-if="currentShipment.dealer?.address" class="detail-row"><span class="detail-label">Địa chỉ</span><span class="detail-value">{{ currentShipment.dealer.address }}</span></div>
          <div v-if="currentShipment.dealer?.contactPerson" class="detail-row"><span class="detail-label">Người liên hệ</span><span class="detail-value">{{ currentShipment.dealer.contactPerson }}</span></div>
          <div v-if="currentShipment.dealer?.phone" class="detail-row"><span class="detail-label">Số điện thoại</span><span class="detail-value"><a :href="'tel:' + currentShipment.dealer.phone" class="phone-link">{{ currentShipment.dealer.phone }}</a></span></div>
          <div v-if="currentShipment.startTime" class="detail-row"><span class="detail-label">Bắt đầu</span><span class="detail-value">{{ formatDate(currentShipment.startTime) }}</span></div>
          <div v-if="currentShipment.endTime" class="detail-row"><span class="detail-label">Hoàn thành</span><span class="detail-value text-green-600">{{ formatDate(currentShipment.endTime) }}</span></div>
        </div>

        <!-- Items table -->
        <div class="detail-section">
          <h4 class="section-title">📦 Danh sách hàng hóa ({{ currentShipment.expectedItems?.length || 0 }})</h4>
          <el-table v-if="currentShipment.expectedItems?.length" :data="currentShipment.expectedItems" size="small" border stripe>
            <el-table-column type="index" label="#" width="45" />
            <el-table-column label="Sản phẩm">
              <template #default="{row}">{{ row.productName || '---' }}</template>
            </el-table-column>
            <el-table-column label="Số lượng" width="80" align="center">
              <template #default="{row}"><span class="font-bold text-blue-600">{{ row.quantity }}</span></template>
            </el-table-column>
          </el-table>
          <div v-else class="empty-state small">Không có chi tiết hàng hóa</div>
        </div>

        <!-- Action buttons in detail -->
        <div class="detail-actions">
          <el-button v-if="currentShipment.dealer?.phone" plain round @click="callDealer(currentShipment)">
            <el-icon class="mr-1"><Phone /></el-icon> Gọi đại lý
          </el-button>
          <el-button
            v-if="currentShipment.status === 'WAITING_DRIVER' || currentShipment.status === 'READY_FOR_PICKUP'"
            type="warning" round size="large"
            @click="confirmPickupFromDetail"
            :loading="actionLoading === currentShipment.id"
          >
            <el-icon class="mr-1"><Download /></el-icon> Nhận hàng
          </el-button>
          <el-button
            v-if="currentShipment.status === 'IN_TRANSIT'"
            type="success" round size="large"
            @click="confirmDeliveryFromDetail"
            :loading="actionLoading === currentShipment.id"
          >
            <el-icon class="mr-1"><CircleCheck /></el-icon> Xác nhận giao hàng
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Van, Refresh, Download, CircleCheck, Phone } from '@element-plus/icons-vue';
import { transportApi } from '../api/transportApi';

const activeTab = ref('all');
const loading = ref(false);
const actionLoading = ref<string | null>(null);
const shipments = ref<any[]>([]);
const showDetail = ref(false);
const currentShipment = ref<any>(null);

// Clear status-based lists
const waitingList = computed(() => shipments.value.filter(s =>
  s.status === 'WAITING_DRIVER' || s.status === 'READY_FOR_PICKUP'
));
const transitList = computed(() => shipments.value.filter(s =>
  s.status === 'IN_TRANSIT' || s.status === 'PENDING_DEALER_CONFIRM'
));
const deliveredList = computed(() => shipments.value.filter(s =>
  s.status === 'DELIVERED'
));

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    'WAITING_DRIVER': 'warning',
    'READY_FOR_PICKUP': 'warning',
    'IN_TRANSIT': 'primary',
    'PENDING_DEALER_CONFIRM': 'info',
    'DELIVERED': 'success'
  };
  return map[status] || 'info';
};

const getStatusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    'WAITING_DRIVER': 'waiting', 'READY_FOR_PICKUP': 'waiting',
    'IN_TRANSIT': 'transit', 'PENDING_DEALER_CONFIRM': 'pending',
    'DELIVERED': 'done'
  };
  return map[status] || 'waiting';
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    'WAITING_DRIVER': 'Chờ tài xế nhận',
    'READY_FOR_PICKUP': 'Sẵn sàng giao (thuê ngoài)',
    'IN_TRANSIT': 'Đang giao hàng',
    'PENDING_DEALER_CONFIRM': 'Chờ đại lý xác nhận',
    'DELIVERED': 'Đã giao thành công'
  };
  return map[status] || status;
};

const formatDate = (d: string) => new Date(d).toLocaleString('vi-VN');

const loadShipments = async () => {
  loading.value = true;
  try {
    const { data } = await transportApi.getShipments();
    shipments.value = Array.isArray(data) ? data : [];
  } catch {
    ElMessage.error('Lỗi tải danh sách phiếu');
  } finally {
    loading.value = false;
  }
};

const openDetail = async (s: any) => {
  try {
    const { data } = await transportApi.getShipmentDetail(s.id);
    currentShipment.value = data;
    showDetail.value = true;
  } catch {
    ElMessage.error('Lỗi tải chi tiết');
  }
};

const getGPS = (): Promise<{ lat: number; long: number }> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS không khả dụng'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, long: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

const confirmPickup = async (s: any) => {
  try {
    await ElMessageBox.confirm(
      `Xác nhận NHẬN HÀNG phiếu ${s.trackingCode}?\n\nSau khi nhận, phiếu sẽ chuyển sang trạng thái "Đang giao".`,
      '📦 Nhận hàng',
      { type: 'warning', confirmButtonText: 'Xác nhận nhận', cancelButtonText: 'Hủy' }
    );

    actionLoading.value = s.id;
    let gps = { lat: 0, long: 0 };
    try { gps = await getGPS(); } catch { /* fallback */ }

    await transportApi.handshake({
      shipment_id: s.id,
      action: 'DRIVER_RECEIVE',
      lat: gps.lat,
      long: gps.long
    });

    ElMessage.success('✅ Đã nhận hàng! Phiếu chuyển sang "Đang giao"');
    activeTab.value = 'transit';
    await loadShipments();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.message || 'Lỗi nhận hàng');
  } finally {
    actionLoading.value = null;
  }
};

const confirmDelivery = async (s: any) => {
  try {
    await ElMessageBox.confirm(
      `Xác nhận ĐÃ GIAO HÀNG phiếu ${s.trackingCode} cho đại lý "${s.dealer?.name || '---'}"?\n\nSau khi xác nhận, phiếu sẽ hoàn thành.`,
      '🚛 Giao hàng',
      { type: 'success', confirmButtonText: 'Đã giao xong', cancelButtonText: 'Hủy' }
    );

    actionLoading.value = s.id;
    let gps = { lat: 0, long: 0 };
    try { gps = await getGPS(); } catch { /* fallback */ }

    await transportApi.handshake({
      shipment_id: s.id,
      action: 'DRIVER_DELIVER',
      lat: gps.lat,
      long: gps.long
    });

    ElMessage.success('✅ Đã giao hàng thành công!');
    activeTab.value = 'done';
    await loadShipments();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.response?.data?.message || 'Lỗi xác nhận giao');
  } finally {
    actionLoading.value = null;
  }
};

const callDealer = (s: any) => {
  if (s.dealer?.phone) window.open(`tel:${s.dealer.phone}`, '_self');
};

const confirmPickupFromDetail = () => {
  if (!currentShipment.value) return;
  showDetail.value = false;
  confirmPickup(currentShipment.value);
};

const confirmDeliveryFromDetail = () => {
  if (!currentShipment.value) return;
  showDetail.value = false;
  confirmDelivery(currentShipment.value);
};

onMounted(loadShipments);
</script>

<style scoped>
.driver-dashboard {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 20px;
}

/* Header */
.driver-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-left { display: flex; align-items: center; gap: 10px; }
.header-title { color: #fff; font-size: 18px; font-weight: 700; }

/* Stats bar */
.stats-bar {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
.stat-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.15s;
}
.stat-item:active { transform: scale(0.95); }
.stat-all { background: #f8fafc; border: 1px solid #e2e8f0; }
.stat-waiting { background: #fff7ed; border: 1px solid #fed7aa; }
.stat-transit { background: #eff6ff; border: 1px solid #bfdbfe; }
.stat-done { background: #f0fdf4; border: 1px solid #bbf7d0; }
.stat-count { display: block; font-size: 26px; font-weight: 800; }
.stat-all .stat-count { color: #475569; }
.stat-waiting .stat-count { color: #ea580c; }
.stat-transit .stat-count { color: #2563eb; }
.stat-done .stat-count { color: #16a34a; }
.stat-label { font-size: 11px; color: #6b7280; }

/* Tab bar */
.tab-bar {
  display: flex;
  background: #fff;
  border-bottom: 2px solid #e5e7eb;
  padding: 0 8px;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 4px;
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}
.tab-item.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

/* Tab content */
.tab-content {
  padding: 12px 16px;
  max-height: calc(100vh - 230px);
  overflow-y: auto;
}

/* Empty */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #9ca3af;
  font-size: 14px;
}
.empty-state.small { padding: 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }

/* Card */
.ship-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border-left: 4px solid #f59e0b;
  cursor: pointer;
  transition: all 0.15s;
}
.ship-card:active { transform: scale(0.98); }
.tab-content .ship-card:nth-child(n) { border-left-color: inherit; }
div[class*="transit"] .ship-card,
.tab-content:has(.status-badge.transit) .ship-card { border-left-color: #2563eb; }
.ship-card.done { border-left-color: #16a34a; opacity: 0.8; }

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.tracking-code {
  font-size: 16px;
  font-weight: 800;
  color: #1e40af;
  letter-spacing: 0.5px;
}

/* Status badges */
.status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
}
.status-badge.waiting { background: #fef3c7; color: #b45309; }
.status-badge.transit { background: #dbeafe; color: #1d4ed8; }
.status-badge.done { background: #dcfce7; color: #15803d; }
.status-badge.pending { background: #e0e7ff; color: #4338ca; }

/* Card info */
.card-info {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.8;
}
.card-info .label { color: #9ca3af; margin-right: 4px; }
.phone-link { color: #2563eb; text-decoration: none; font-weight: 600; }
.phone-link:hover { text-decoration: underline; }

/* Card actions */
.card-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Status flow */
.status-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0 20px;
  gap: 0;
}
.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.flow-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  background: #e5e7eb;
  color: #9ca3af;
  transition: all 0.3s;
}
.flow-step.active .flow-dot {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}
.flow-label { font-size: 11px; color: #6b7280; }
.flow-step.active .flow-label { color: #2563eb; font-weight: 600; }
.flow-line {
  width: 40px;
  height: 3px;
  background: #e5e7eb;
  margin: 0 4px;
  margin-bottom: 20px;
  border-radius: 2px;
}
.flow-line.active { background: #2563eb; }

/* Detail */
.detail-section {
  margin-bottom: 16px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 13px;
}
.detail-label { color: #6b7280; }
.detail-value { font-weight: 500; }
.section-title { font-size: 14px; font-weight: 700; margin-bottom: 10px; }

.detail-dialog :deep(.el-dialog) {
  border-radius: 16px;
  max-width: 520px;
  margin: 5vh auto;
}

.detail-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  gap: 10px;
}

@media (max-width: 640px) {
  .detail-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 2vh auto;
  }
}

/* Utility */
.mr-1 { margin-right: 4px; }
.font-bold { font-weight: 700; }
.text-blue-600 { color: #2563eb; }
.text-orange-600 { color: #ea580c; }
.text-green-600 { color: #16a34a; }
.text-gray-400 { color: #9ca3af; }
.text-xs { font-size: 12px; }
</style>
