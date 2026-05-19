<template>
  <div class="p-6 bg-white min-h-screen">
    <!-- Navigation Back -->
    <div class="flex items-center gap-2 mb-4">
      <el-button icon="ArrowLeft" link @click="router.push('/supply/production-orders')">
        Quay lại Danh sách lệnh
      </el-button>
    </div>

    <div v-loading="loadingData" class="space-y-6">
      <!-- Main Order Panel -->
      <div v-if="order" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left 2 columns: Details & Progress -->
        <div class="lg:col-span-2 space-y-6">
          <el-card shadow="never">
            <div class="flex justify-between items-start mb-4">
              <div>
                <span class="text-xs text-gray-500 font-mono block">LỆNH SẢN XUẤT</span>
                <h3 class="text-2xl font-bold text-gray-800 font-mono">{{ order.orderCode }}</h3>
              </div>
              <el-tag :type="getStatusTagType(order.status)" size="large" class="uppercase">
                {{ order.status }}
              </el-tag>
            </div>

            <!-- Basic stats grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-xs">
              <div>
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Sản phẩm</span>
                <span class="text-sm font-semibold text-gray-700">{{ order.product?.name }}</span>
              </div>
              <div>
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Mã SKU / GTIN</span>
                <span class="text-sm font-mono text-gray-700">{{ order.product?.sku || order.product?.gtin || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Nguồn nguyên liệu</span>
                <span class="text-sm text-gray-700 font-semibold">{{ getSourceLabel(order.sourceType) }}</span>
              </div>
              <div>
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Quy cách gói</span>
                <span class="text-sm text-gray-700 font-bold">{{ (order.unitWeightKg || 0).toFixed(1) }} kg/gói</span>
              </div>
              <div>
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Mức dung sai</span>
                <span class="text-sm text-gray-700 font-bold">± {{ order.weightTolerancePct }}%</span>
              </div>
              <div>
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Lô gốc liên kết</span>
                <span class="text-sm text-gray-700 font-mono">{{ order.farmBatchCode || order.sourceBatch?.batchCode || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Ngày tạo lệnh</span>
                <span class="text-sm text-gray-700 font-bold">{{ formatDate(order.createdAt) }}</span>
              </div>
              <div>
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Ngày thực hiện</span>
                <span class="text-sm text-blue-600 font-bold">{{ formatDate(order.plannedDate) }}</span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="mt-6 border-t pt-4">
              <div class="flex justify-between text-sm mb-2">
                <span class="font-semibold text-gray-600">Tiến độ khối lượng hoàn thành:</span>
                <span class="font-bold text-gray-800">{{ (order.actualWeightKg || 0).toFixed(1) }} / {{ order.plannedWeightKg.toFixed(1) }} kg</span>
              </div>
              <el-progress
                :text-inside="true"
                :stroke-width="22"
                :percentage="progressPercentage"
                :status="progressStatus"
              />
            </div>
            
            <div v-if="order.notes" class="mt-4 p-3 bg-yellow-50/50 border border-yellow-100 rounded text-sm text-gray-600">
               <strong>Chỉ dẫn/Ghi chú:</strong> {{ order.notes }}
            </div>
          </el-card>
        </div>

        <!-- Right 1 column: Lifecycle Actions & QC information -->
        <div class="lg:col-span-1 space-y-6">
          <el-card shadow="never" class="h-full flex flex-col justify-between">
            <template #header>
              <span class="font-bold text-sm text-gray-700 uppercase">Hành động & Phê duyệt</span>
            </template>

            <!-- DRAFT Operations -->
            <div v-if="order.status === 'DRAFT'" class="space-y-3">
              <p class="text-xs text-gray-500">Lệnh mới lập. Quản lý cần kiểm tra thông số và xác nhận để bắt đầu chia phiếu.</p>
              
              <el-button type="success" class="w-full" size="large" @click="approveOrder(true)">
                Phê duyệt (APPROVE)
              </el-button>

              <el-button type="danger" class="w-full" plain @click="showRejectionPrompt">
                Từ chối duyệt
              </el-button>
            </div>

            <!-- APPROVED / IN_PROGRESS Operations -->
            <div v-else-if="order.status === 'APPROVED' || order.status === 'IN_PROGRESS'" class="space-y-3">
              <div class="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p class="text-xs text-emerald-800 font-semibold">Lệnh đã được duyệt sản xuất.</p>
                <p class="text-2xs text-emerald-700 mt-1">Phiếu đóng gói đã được tự động khởi tạo dưới nền.</p>
              </div>

              <el-button
                v-if="order.status === 'IN_PROGRESS'"
                type="success"
                class="w-full"
                size="large"
                @click="startDirectPackaging"
              >
                🚀 Bắt đầu đóng gói
              </el-button>

              <el-button type="danger" class="w-full text-red-500 hover:text-white" plain @click="cancelOrder">
                Hủy lệnh sản xuất
              </el-button>
            </div>

            <!-- CLOSED / COMPLETED / CANCELLED -->
            <div v-else class="space-y-2 text-center py-6 text-gray-400">
              <el-icon size="40"><InfoFilled /></el-icon>
              <p class="text-sm font-semibold mt-2">Lệnh sản xuất đã đóng.</p>
              <p class="text-xs">Không thể thực hiện thay đổi vòng đời.</p>
            </div>

            <!-- Logs / Metadata -->
            <div class="border-t pt-4 mt-6 text-2xs text-gray-400 space-y-1">
              <div>Người lập: <strong>{{ order.creator?.fullName || order.creator?.full_name || order.creator?.username || 'N/A' }}</strong></div>
              <div v-if="order.approver?.fullName || order.approver?.full_name || order.approver?.username">
                Người duyệt: <strong>{{ order.approver?.fullName || order.approver?.full_name || order.approver?.username }}</strong>
              </div>
              <div v-if="order.rejectionReason" class="text-red-500 font-semibold mt-1">Lý do từ chối: {{ order.rejectionReason }}</div>
            </div>
          </el-card>
        </div>
      </div>

      <!-- Tickets Panel -->
      <div v-if="order" class="space-y-4">
        <div class="flex justify-between items-center pb-2 border-b border-gray-100">
          <h3 class="text-lg font-bold text-gray-800">Phiếu Sản Xuất Trực Thuộc</h3>
          <el-button
            v-if="order.status === 'APPROVED' || order.status === 'IN_PROGRESS'"
            type="primary"
            size="default"
            @click="openTicketForm"
          >
            + Cấp phiếu mới
          </el-button>
        </div>

        <div v-if="!order.tickets || order.tickets.length === 0" class="py-12 border border-dashed rounded text-center text-gray-400">
          Chưa có phiếu đóng gói nào được phát hành cho lệnh sản xuất này.
        </div>

        <!-- Tickets Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <el-card
            v-for="ticket in order.tickets"
            :key="ticket.id"
            shadow="hover"
            class="border-t-4 cursor-pointer hover:shadow"
            :class="getTicketBorderClass(ticket.status)"
            @click="openTicketExecution(ticket)"
          >
            <!-- Card Header -->
            <div class="flex justify-between items-start mb-3">
              <div>
                <span class="text-2xs text-gray-400 font-mono block">MÃ PHIẾU</span>
                <span class="font-bold text-gray-700 font-mono text-sm">{{ ticket.ticketCode }}</span>
              </div>
              <el-tag :type="getTicketStatusTag(ticket.status)" size="small">
                {{ ticket.status }}
              </el-tag>
            </div>

            <!-- Card Body -->
            <div class="space-y-2 text-xs text-gray-600">
              <div class="flex justify-between">
                <span>Công đoạn:</span>
                <strong class="text-gray-800">{{ getTicketTypeLabel(ticket.ticketType) }}</strong>
              </div>
              <div class="flex justify-between">
                <span>Trọng lượng giao:</span>
                <strong class="text-gray-800">{{ ticket.plannedWeightKg.toFixed(1) }} kg</strong>
              </div>
              <div v-if="ticket.actualWeightKg" class="flex justify-between text-emerald-600 font-semibold">
                <span>Thực tế đóng:</span>
                <strong>{{ ticket.actualWeightKg.toFixed(1) }} kg</strong>
              </div>
              <div class="flex justify-between">
                <span>Người thực hiện:</span>
                <strong class="text-blue-600">{{ ticket.operator?.name || 'Chưa chỉ định' }}</strong>
              </div>
              
              <!-- Pallet Specifics -->
              <div v-if="ticket.ticketType === 'PALLET'" class="border-t pt-2 mt-2 space-y-1">
                <div class="flex justify-between">
                  <span>Mã Pallet:</span>
                  <span class="font-mono font-bold text-orange-600">{{ ticket.palletCode || 'N/A' }}</span>
                </div>
                <div v-if="ticket.palletCode && ticket.status === 'COMPLETED'" class="flex justify-between items-center mt-1">
                  <span class="text-gray-400">Trạng thái:</span>
                  <div class="flex items-center gap-1">
                    <el-tag type="danger" size="small">Đang khóa</el-tag>
                    <el-button type="success" size="2xs" link @click.stop="releasePallet(ticket)">Giải phóng</el-button>
                  </div>
                </div>
              </div>

              <!-- Serial Ranges info -->
              <div v-else-if="ticket.serialPrefix" class="border-t pt-2 mt-2 space-y-0.5 text-2xs text-gray-500 font-mono">
                <div>Dải cấp phát:</div>
                <div class="font-bold text-gray-600">
                  {{ ticket.serialPrefix }}-{{ String(ticket.serialRangeStart).padStart(5, '0') }} ->
                  {{ ticket.serialPrefix }}-{{ String(ticket.serialRangeEnd).padStart(5, '0') }}
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <ProductionTicketFormDialog ref="ticketFormRef" @success="loadOrderDetails(orderId)" />
    <ProductionTicketExecutionDialog ref="ticketExecutionRef" @success="loadOrderDetails(orderId)" />

    <!-- Approve Rejection Reason Dialog -->
    <el-dialog
      v-model="rejectionDialogVisible"
      title="Từ chối phê duyệt Lệnh sản xuất"
      width="400px"
    >
      <el-form label-position="top">
        <el-form-item label="Nhập lý do chi tiết từ chối duyệt Lệnh">
          <el-input v-model="rejectionReason" type="textarea" :rows="3" placeholder="Lý do..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectionDialogVisible = false">Quay lại</el-button>
        <el-button type="danger" :disabled="!rejectionReason.trim()" @click="approveOrder(false)">
          Xác nhận từ chối
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, InfoFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import { productionOrderApi } from '../api/productionOrderApi';
import ProductionTicketFormDialog from '../components/ProductionTicketFormDialog.vue';
import ProductionTicketExecutionDialog from '../components/ProductionTicketExecutionDialog.vue';

const route = useRoute();
const router = useRouter();

const orderId = route.params.id as string;
const loadingData = ref(false);
const order = ref<any>(null);

const ticketFormRef = ref<any>(null);
const ticketExecutionRef = ref<any>(null);

const rejectionDialogVisible = ref(false);
const rejectionReason = ref('');

const loadOrderDetails = async (id: string) => {
  loadingData.value = true;
  try {
    const { data } = await productionOrderApi.getOrderDetail(id);
    order.value = data;
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi khi tải chi tiết Lệnh sản xuất');
  } finally {
    loadingData.value = false;
  }
};

const progressPercentage = computed(() => {
  if (!order.value || !order.value.plannedWeightKg) return 0;
  const pct = Math.floor(((order.value.actualWeightKg || 0) / order.value.plannedWeightKg) * 100);
  return Math.min(100, Math.max(0, pct));
});

const progressStatus = computed(() => {
  const pct = progressPercentage.value;
  if (pct >= 100) return 'success';
  if (order.value?.status === 'CANCELLED') return 'exception';
  if (order.value?.status === 'IN_PROGRESS') return 'warning';
  return '';
});

const getSourceLabel = (src: string) => {
  switch (src) {
    case 'FARM': return 'Từ Farm';
    case 'EXTERNAL': return 'Nhập ngoài';
    case 'CROSS_TENANT': return 'B2B Cross-Tenant';
    default: return src;
  }
};

const getStatusTagType = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'info';
    case 'APPROVED': return 'primary';
    case 'IN_PROGRESS': return 'warning';
    case 'COMPLETED': return 'success';
    case 'CANCELLED': return 'danger';
    default: return 'info';
  }
};

const getTicketTypeLabel = (type: string) => {
  switch (type) {
    case 'PACKAGING': return 'Đóng gói tem lẻ';
    case 'BAGGING': return 'Đóng bao / Kiện';
    case 'PALLET': return 'Đóng Pallet';
    default: return type;
  }
};

const getTicketStatusTag = (status: string) => {
  switch (status) {
    case 'OPEN': return 'info';
    case 'IN_PROGRESS': return 'warning';
    case 'COMPLETED': return 'success';
    case 'REJECTED': return 'danger';
    default: return 'info';
  }
};

const getTicketBorderClass = (status: string) => {
  switch (status) {
    case 'OPEN': return 'border-t-gray-400';
    case 'IN_PROGRESS': return 'border-t-amber-400';
    case 'COMPLETED': return 'border-t-emerald-500';
    case 'REJECTED': return 'border-t-red-500';
    default: return '';
  }
};

const approveOrder = async (isApproved: boolean) => {
  try {
    const payload = {
      approved: isApproved,
      rejection_reason: !isApproved ? rejectionReason.value : undefined
    };
    await productionOrderApi.approveOrder(orderId, payload);
    ElMessage.success(isApproved ? 'Đã duyệt Lệnh sản xuất thành công!' : 'Đã từ chối duyệt Lệnh.');
    rejectionDialogVisible.value = false;
    rejectionReason.value = '';
    await loadOrderDetails(orderId);
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra');
  }
};

const showRejectionPrompt = () => {
  rejectionDialogVisible.value = true;
};

const cancelOrder = () => {
  ElMessageBox.confirm(
    'Bạn chắc chắn muốn hủy Lệnh sản xuất này? Các phiếu trực thuộc chưa hoàn thành cũng sẽ bị đóng.',
    'Cảnh báo',
    {
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Quay lại',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await productionOrderApi.cancelOrder(orderId);
      ElMessage.warning('Đã hủy lệnh sản xuất thành công!');
      await loadOrderDetails(orderId);
    } catch (e: any) {
      ElMessage.error(e.response?.data?.message || 'Không thể hủy lệnh');
    }
  });
};

const startDirectPackaging = async () => {
  const packagingTicket = order.value?.tickets?.find((t: any) => t.ticketType === 'PACKAGING');
  if (!packagingTicket) {
    ElMessage.warning('Không tìm thấy phiếu đóng gói tương ứng.');
    return;
  }
  
  if (packagingTicket.status === 'OPEN') {
    loadingData.value = true;
    try {
      await productionOrderApi.startTicket(packagingTicket.id);
      await loadOrderDetails(orderId);
    } catch (e: any) {
      console.error(e);
      ElMessage.error(e?.response?.data?.message || 'Không thể bắt đầu phiếu đóng gói');
      loadingData.value = false;
      return;
    }
    loadingData.value = false;
  }
  
  // Refetch latest to get accurate state, then open the dialog
  const latestTicket = order.value?.tickets?.find((t: any) => t.ticketType === 'PACKAGING');
  openTicketExecution(latestTicket || packagingTicket);
};

const openTicketForm = () => {
  ticketFormRef.value?.open(order.value);
};

const openTicketExecution = (ticket: any) => {
  ticketExecutionRef.value?.open(ticket.id);
};

const releasePallet = (ticket: any) => {
  ElMessageBox.confirm(
    `Bạn có chắc chắn muốn giải phóng Pallet "${ticket.palletCode}"? Toàn bộ sản phẩm gắn với Pallet này sẽ được giải phóng để sẵn sàng đóng vào Pallet mới.`,
    'Xác nhận giải phóng Pallet',
    {
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await productionOrderApi.releasePalletCode(ticket.id);
      ElMessage.success('Giải phóng Pallet thành công!');
      await loadOrderDetails(orderId);
    } catch (e: any) {
      ElMessage.error(e.response?.data?.message || 'Lỗi khi giải phóng Pallet');
    }
  });
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).format('DD/MM/YYYY');
};

onMounted(() => {
  loadOrderDetails(orderId);
});
</script>
