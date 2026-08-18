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
                {{ productionOrderStatusMap[order.status] || order.status }}
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
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Prefix serial</span>
                <span class="text-sm text-gray-700 font-bold font-mono">{{ order.serialPrefix || 'BKG' }}</span>
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
              <div v-if="order.plannedUnits">
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Số mã gói</span>
                <span class="text-sm text-gray-700 font-bold">{{ order.plannedUnits }}{{ order.sparePacketQuantity ? ` + ${order.sparePacketQuantity} dự phòng` : '' }}</span>
              </div>
              <div v-if="order.packagingSpec">
                <span class="text-2xs text-gray-400 font-semibold block uppercase">Số mã bao</span>
                <span class="text-sm text-gray-700 font-bold">{{ Math.ceil(order.plannedUnits / order.packagingSpec) }}{{ order.spareBagQuantity ? ` + ${order.spareBagQuantity} dự phòng` : '' }}</span>
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
              
              <el-button type="success" class="w-full !ml-0" size="large" @click="approveOrder(true)">
                Phê duyệt (APPROVE)
              </el-button>

              <el-button type="danger" class="w-full !ml-0" plain @click="showRejectionPrompt">
                Từ chối duyệt
              </el-button>

              <el-button type="danger" class="w-full text-red-500 hover:text-white !ml-0" plain @click="cancelOrder">
                Hủy lệnh sản xuất
              </el-button>
            </div>

            <!-- GENERATING Operations -->
            <div v-else-if="order.status === 'GENERATING'" class="space-y-3">
              <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p class="text-xs text-blue-800 font-semibold">⏳ Đang sinh mã gói & mã bao...</p>
                <p class="text-2xs text-blue-700 mt-1">Vui lòng đợi hoặc tải lại trang sau ít giây.</p>
              </div>
              <el-button type="danger" class="w-full text-red-500 hover:text-white" plain @click="cancelOrder">
                Hủy lệnh sản xuất
              </el-button>
            </div>

            <!-- GENERATION_FAILED -->
            <div v-else-if="order.status === 'GENERATION_FAILED'" class="space-y-3">
              <div class="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p class="text-xs text-red-800 font-semibold">❌ Sinh mã thất bại.</p>
                <p class="text-2xs text-red-700 mt-1">Có thể thử lại hoặc hủy lệnh.</p>
              </div>
              <el-button type="warning" class="w-full !ml-0" @click="retryGenerate">
                🔄 Thử lại sinh mã
              </el-button>
              <el-button type="danger" class="w-full text-red-500 hover:text-white !ml-0" plain @click="cancelOrder">
                Hủy lệnh sản xuất
              </el-button>
            </div>

            <!-- APPROVED / CODES_READY / IN_PROGRESS Operations -->
            <div v-else-if="['APPROVED', 'CODES_READY', 'IN_PROGRESS'].includes(order.status)" class="space-y-3">
              <div class="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p class="text-xs text-emerald-800 font-semibold">Lệnh đã được duyệt sản xuất.</p>
                <p class="text-2xs text-emerald-700 mt-1">Phiếu đóng gói đã được tự động khởi tạo dưới nền.</p>
              </div>

              <!-- Button for Bag Packaging orders -->
              <el-button type="warning" class="w-full font-bold !ml-0" size="large" icon="Connection"
                @click="router.push(`/supply/production-orders/${order.id}/bag-packaging`)">
                🔗 Liên kết đóng bao
              </el-button>

              <!-- Download buttons -->
              <div v-if="['CODES_READY', 'IN_PROGRESS'].includes(order.status)" class="flex gap-2 w-full">
                <el-button type="primary" plain class="flex-1 !ml-0" size="default" :loading="downloadingPacket" @click="downloadPacketCodes">
                  📦 Mã gói
                </el-button>
                <el-button type="success" plain class="flex-1 !ml-0" size="default" :loading="downloadingBag" @click="downloadBagCodes">
                  🛍️ Mã bao
                </el-button>
              </div>

              <el-button type="success" class="w-full text-white font-bold shadow !ml-0" size="large" @click="showCompleteDialog">
                ✅ Chốt Lệnh Sản Xuất
              </el-button>
              
              <el-button type="danger" class="w-full text-red-500 hover:text-white !ml-0" plain @click="cancelOrder">
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

      <!-- Packaging Receipts Section (Phiếu đóng bao) -->
        <div v-if="order && order.packagingReceipts && order.packagingReceipts.length > 0" class="space-y-4">
          <div class="flex justify-between items-center pb-2 border-b border-gray-100">
            <h3 class="text-lg font-bold text-gray-800">Phiếu Đóng Bao</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <el-card
              v-for="r in order.packagingReceipts"
              :key="r.id"
              shadow="hover"
              class="border-t-4 cursor-pointer hover:shadow"
              :class="r.status === 'COMPLETED' ? 'border-t-emerald-500' : 'border-t-amber-400'"
              @click="router.push(`/supply/production-orders/${order.id}/bag-packaging`)"
            >
              <div class="flex justify-between items-start mb-3">
                <div>
                  <span class="text-2xs text-gray-400 font-semibold block uppercase">Mã phiếu</span>
                  <span class="font-bold text-gray-700 text-sm">{{ r.receiptCode }}</span>
                </div>
                <el-tag :type="r.status === 'COMPLETED' ? 'success' : 'warning'" size="small">
                  {{ r.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang đóng gói' }}
                </el-tag>
              </div>
              <div class="space-y-2 text-xs text-gray-600">
                <div class="flex justify-between">
                  <span>Tổng bao:</span>
                  <strong class="text-gray-800">{{ r.totalBags }}</strong>
                </div>
                <div class="flex justify-between">
                  <span>Tổng gói:</span>
                  <strong class="text-gray-800">{{ r.totalPackets }}</strong>
                </div>
                <div class="flex justify-between">
                  <span>Người đóng:</span>
                  <strong class="text-blue-600">{{ r.packer?.fullName || r.packer?.full_name || r.packer?.username || 'N/A' }}</strong>
                </div>
                <div class="flex justify-between">
                  <span>Kho lưu:</span>
                  <strong class="text-gray-800">{{ r.warehouse?.name || 'Chưa chọn' }}</strong>
                </div>
                <div class="flex justify-between">
                  <span>Thời gian:</span>
                  <strong class="text-gray-800">{{ formatDateTime(r.packingTime) }}</strong>
                </div>
              </div>
              <div v-if="r.status === 'COMPLETED'" class="mt-3 pt-3 border-t border-gray-100">
                <el-button
                  type="warning"
                  size="small"
                  style="width: 100%;"
                  @click.stop="handleReopenReceipt(r)"
                >
                  🔓 Mở lại đóng tiếp
                </el-button>
              </div>
            </el-card>
          </div>
        </div>

      <!-- Tickets Panel -->
      <div v-if="order && order.tickets && order.tickets.length > 0" class="space-y-4">
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

        <!-- Tickets Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                {{ ticketStatusMap[ticket.status] || ticket.status }}
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

    <!-- Cancel Order Confirmation Dialog -->
    <el-dialog
      v-model="cancelDialogVisible"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">Xác nhận hủy lệnh sản xuất</span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="cancelDialogVisible = false; cancelConfirmed = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <div style="padding: 24px 24px 8px;">
        <div class="space-y-4 mb-4">
          <!-- Warning box -->
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
              <el-icon :size="16"><WarningFilled /></el-icon>
              Thao tác này không thể hoàn tác!
            </p>
            <ul class="text-xs text-red-700 space-y-1 list-disc pl-4">
              <li>Toàn bộ <strong>mã gói</strong> và <strong>mã bao</strong> đã sinh sẽ bị xóa vĩnh viễn</li>
              <li>Các phiếu sản xuất liên quan sẽ bị đóng</li>
              <li>Không thể hủy nếu đã có lô được liên kết bao</li>
            </ul>
          </div>

          <!-- Order code display -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <span class="text-xs text-gray-500 block mb-1">Mã lệnh sản xuất</span>
            <span class="font-mono font-bold text-gray-800 text-lg">{{ order?.orderCode }}</span>
          </div>

          <!-- Confirmation checkbox -->
          <el-checkbox v-model="cancelConfirmed" class="mt-2" style="white-space: normal; word-break: break-word;">
            <span class="text-sm font-medium text-gray-700">Tôi đã đọc kỹ và đồng ý hủy lệnh sản xuất <strong class="text-gray-900 font-mono">{{ order?.orderCode }}</strong></span>
          </el-checkbox>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="cancelDialogVisible = false; cancelConfirmed = false" style="border-radius: 8px; padding: 10px 20px;">Quay lại</el-button>
          <el-button
            type="danger"
            :disabled="!cancelConfirmed"
            :loading="cancelling"
            @click="confirmCancelOrder"
            style="border-radius: 8px; padding: 10px 20px;"
          >
            Xác nhận Hủy Lệnh
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Complete Order Dialog -->
    <el-dialog
      v-model="completeDialogVisible"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">Xác nhận chốt lệnh Sản xuất</span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="completeDialogVisible = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <div style="padding: 24px 24px 8px;">
        <div class="space-y-4 mb-4">
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p class="text-sm font-bold text-emerald-800 mb-2">Thông tin chốt lệnh:</p>
            <ul class="text-xs text-emerald-700 space-y-1 list-disc pl-4">
              <li>Khối lượng kế hoạch: <strong class="text-emerald-900">{{ order?.plannedWeightKg?.toFixed(1) }} kg</strong></li>
              <li>Đã đóng gói thực tế: <strong class="text-emerald-900">{{ (order?.actualWeightKg || 0).toFixed(1) }} kg</strong></li>
              <li>Còn lại chưa đóng: <strong class="text-emerald-900">{{ (order?.plannedWeightKg - (order?.actualWeightKg || 0)).toFixed(1) }} kg</strong></li>
            </ul>
          </div>
          
          <el-checkbox
            v-if="(order?.plannedWeightKg - (order?.actualWeightKg || 0)) > 0"
            v-model="refundUnusedWeight"
            class="!whitespace-normal text-sm text-gray-700 font-semibold"
          >
            Hoàn trả nguyên liệu thừa chưa đóng về kho
          </el-checkbox>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="completeDialogVisible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button
            type="success"
            :loading="completingOrder"
            @click="confirmCompleteOrder"
            style="border-radius: 8px; padding: 10px 20px;"
          >
            Xác nhận Chốt Lệnh
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Reopen Receipt Dialog -->
    <el-dialog
      v-model="reopenDialogVisible"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">Xác nhận mở lại phiếu</span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="reopenDialogVisible = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <div style="padding: 24px 24px 8px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;">
          <el-icon class="text-green-500 mt-1" :size="20"><InfoFilled /></el-icon>
          <div>
            <div class="text-sm font-semibold text-gray-800 mb-1">Mở lại phiếu <span class="text-green-600">{{ selectedReceiptToReopen?.receiptCode }}</span> để đóng tiếp?</div>
            <div class="text-xs text-gray-600">
              Hiện tại đã đóng: <strong class="text-gray-900">{{ selectedReceiptToReopen?.totalBags || 0 }}</strong> bao, 
              <strong class="text-gray-900">{{ selectedReceiptToReopen?.totalPackets || 0 }}</strong> gói.
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="reopenDialogVisible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button
            type="success"
            :loading="reopeningReceipt"
            @click="submitReopenReceipt"
            style="border-radius: 8px; padding: 10px 20px;"
          >
            Mở lại phiếu
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, InfoFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import dayjs from 'dayjs';
import { productionOrderApi } from '../api/productionOrderApi';
import { productionOrderStatusMap } from '@/common/utils/vi-labels';
import ProductionTicketFormDialog from '../components/ProductionTicketFormDialog.vue';
import ProductionTicketExecutionDialog from '../components/ProductionTicketExecutionDialog.vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const route = useRoute();
const router = useRouter();

const orderId = route.params.id as string;
const loadingData = ref(false);
const order = ref<any>(null);

const ticketFormRef = ref<any>(null);
const ticketExecutionRef = ref<any>(null);

const rejectionDialogVisible = ref(false);
const rejectionReason = ref('');
const downloadingPacket = ref(false);
const downloadingBag = ref(false);

// Cancel dialog state
const cancelDialogVisible = ref(false);
const cancelConfirmed = ref(false);
const cancelling = ref(false);

// Complete order dialog state
const completeDialogVisible = ref(false);
const refundUnusedWeight = ref(true);
const completingOrder = ref(false);

// Reopen receipt dialog state
const reopenDialogVisible = ref(false);
const selectedReceiptToReopen = ref<any>(null);
const reopeningReceipt = ref(false);

const downloadPacketCodes = async () => {
  downloadingPacket.value = true;
  try {
    const response = await productionOrderApi.exportPacketCodesExcel(orderId);
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.value?.orderCode || 'packet'}_ma_goi.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('Tải mã gói thành công!');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Lỗi khi tải mã gói');
  } finally {
    downloadingPacket.value = false;
  }
};

const downloadBagCodes = async () => {
  downloadingBag.value = true;
  try {
    const response = await productionOrderApi.exportBagCodesExcel(orderId);
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.value?.orderCode || 'bag'}_ma_bao.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('Tải mã bao thành công!');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Lỗi khi tải mã bao');
  } finally {
    downloadingBag.value = false;
  }
};

const loadOrderDetails = async (id: string) => {
  loadingData.value = true;
  try {
    const res = await productionOrderApi.getOrderDetail(id);
    order.value = (res as any).data?.data || (res as any).data;
  } catch (e) {
    ElMessage.error('Lỗi khi tải chi tiết lệnh');
  } finally {
    loadingData.value = false;
  }
};

const showCompleteDialog = () => {
  refundUnusedWeight.value = true;
  completeDialogVisible.value = true;
};

const confirmCompleteOrder = async () => {
  completingOrder.value = true;
  try {
    await productionOrderApi.completeBagOrder(orderId, { refundUnused: refundUnusedWeight.value });
    ElMessage.success('Chốt lệnh sản xuất thành công');
    completeDialogVisible.value = false;
    loadOrderDetails(orderId);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Lỗi khi chốt lệnh');
  } finally {
    completingOrder.value = false;
  }
};

onMounted(() => {
  loadOrderDetails(orderId);
});

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

const ticketStatusMap: Record<string, string> = {
  OPEN: 'Chưa thực hiện',
  IN_PROGRESS: 'Đang tiến hành',
  COMPLETED: 'Đã hoàn thành',
  REJECTED: 'Đã từ chối',
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
  cancelConfirmed.value = false;
  cancelDialogVisible.value = true;
};

const confirmCancelOrder = async () => {
  if (!cancelConfirmed.value) return;
  cancelling.value = true;
  try {
    await productionOrderApi.cancelOrder(orderId);
    cancelDialogVisible.value = false;
    cancelConfirmed.value = false;
    ElMessage.warning('Đã hủy lệnh sản xuất. Toàn bộ mã gói và mã bao đã được giải phóng.');
    await loadOrderDetails(orderId);
  } catch (e: any) {
    const serverMsg = e.response?.data?.message
      || e.response?.data?.error
      || e.message
      || 'Không thể hủy lệnh — lỗi không xác định';
    ElNotification({
      title: 'Hủy lệnh thất bại',
      message: serverMsg,
      type: 'error',
      duration: 8000,
      position: 'top-right',
    });
    console.error('[cancelOrder] frontend error:', e.response?.data || e);
  } finally {
    cancelling.value = false;
  }
};

const retryGenerate = async () => {
  try {
    await productionOrderApi.retryGenerateCodes(orderId);
    ElMessage.success('Đã bắt đầu thử lại sinh mã. Vui lòng tải lại trang sau ít giây.');
    await loadOrderDetails(orderId);
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Không thể thử lại');
  }
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

const handleReopenReceipt = (r: any) => {
  selectedReceiptToReopen.value = r;
  reopenDialogVisible.value = true;
};

const submitReopenReceipt = async () => {
  if (!selectedReceiptToReopen.value) return;
  reopeningReceipt.value = true;
  try {
    await productionOrderApi.reopenReceipt(selectedReceiptToReopen.value.id);
    ElMessage.success(`Đã mở lại phiếu ${selectedReceiptToReopen.value.receiptCode}`);
    await loadOrderDetails(orderId);
    reopenDialogVisible.value = false;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Không thể mở lại phiếu');
  } finally {
    reopeningReceipt.value = false;
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).format('DD/MM/YYYY');
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).format('HH:mm:ss DD/MM/YYYY');
};

onMounted(() => {
  loadOrderDetails(orderId);
});
</script>

<style>
.branded-pallet-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-pallet-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-pallet-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-pallet-dialog .el-dialog__footer {
  padding: 0 !important;
  border-top: none !important;
}
</style>
