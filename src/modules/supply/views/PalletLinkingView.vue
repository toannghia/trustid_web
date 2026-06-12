<template>
  <div class="pallet-linking-page">
    <!-- Header phiếu -->
    <div class="receipt-header">
      <div class="header-top">
        <el-button link @click="handleBack" class="back-btn">
          <el-icon><ArrowLeft /></el-icon> Quay lại
        </el-button>
      </div>

      <div class="header-main" v-loading="loadingOrder">
        <div class="header-row1">
          <div class="header-title-group">
            <span class="header-icon">📦</span>
            <div>
              <h2>Liên kết Pallet — {{ orderCode }}</h2>
              <p class="sub">{{ productName }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ô quét mã (1 input duy nhất) -->
    <div class="scan-section">
      <div class="scan-box">
        <div class="scan-hint" v-if="pendingPalletCode">
          <el-tag type="success" size="large">Pallet: {{ pendingPalletCode }}</el-tag>
          <span class="ml-2 text-sm">→ Quét mã bao để liên kết vào pallet</span>
          <el-button link type="danger" size="small" @click="clearPendingPallet" class="ml-2">Huỷ</el-button>
        </div>
        <el-input
          v-model="scanInput"
          :placeholder="pendingPalletCode ? 'Bước 2: Quét mã bao (serial)...' : 'Bước 1: Quét mã pallet trước...'"
          size="large"
          class="scan-input"
          ref="scanInputRef"
          :disabled="scanning"
          @keyup.enter="handleScan"
          clearable
        >
          <template #prefix>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#909399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </template>
          <template #append>
            <el-button @click="handleScan" :loading="scanning" type="primary">Quét</el-button>
          </template>
        </el-input>
      </div>
    </div>

    <!-- Lưới bao đã liên kết -->
    <div class="grid-section">
      <div class="grid-header">
        <h3>Danh sách bao trong pallet <span v-if="pendingPalletCode" class="pallet-badge">{{ pendingPalletCode }}</span></h3>
        <el-button :icon="Refresh" circle @click="refreshPalletDetail" v-if="pendingPalletId" />
      </div>

      <el-table :data="bagMappings" border stripe v-loading="loadingDetail" empty-text="Chưa có bao nào trong pallet" size="small">
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column label="Mã bao" prop="bagSerial" min-width="130">
          <template #default="{ row }">
            <code class="text-green-700 font-bold">{{ row.bagSerial }}</code>
          </template>
        </el-table-column>
        <el-table-column label="Mã QR" prop="bagQrCode" min-width="160">
          <template #default="{ row }">
            <code style="color: #2c6ecb; font-size: 12px;">{{ row.bagQrCode || '—' }}</code>
          </template>
        </el-table-column>
        <el-table-column label="Sản phẩm" prop="productName" min-width="200" />
        <el-table-column label="Số gói" prop="packetCount" width="100" align="center" />
        <el-table-column label="Người liên kết" width="140">
          <template #default="{ row }">
            {{ row.linker?.fullName || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="Thời gian" width="160">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ formatDate(row.linkedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="80" align="center">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="handleUnlinkBag(row)">Gỡ</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Totals below grid -->
      <div class="grid-totals" v-if="pendingPalletId">
        <span><strong>Tổng bao:</strong> {{ palletDetail?.currentBagCount || 0 }}</span>
        <span class="divider">|</span>
        <span><strong>Giới hạn:</strong> {{ palletDetail?.maxBags || '∞' }}</span>
        <span class="divider">|</span>
        <span><strong>Trạng thái:</strong>
          <el-tag :type="statusType(palletDetail?.status)" size="small" effect="light" class="ml-1">{{ statusLabel(palletDetail?.status) }}</el-tag>
        </span>
        <el-progress
          v-if="palletDetail?.maxBags"
          :percentage="Math.min(100, Math.round((palletDetail.currentBagCount / palletDetail.maxBags) * 100))"
          :status="palletDetail.currentBagCount >= palletDetail.maxBags ? 'success' : ''"
          :stroke-width="8"
          style="width: 200px; margin-left: auto;"
        />
      </div>
    </div>

    <!-- Fixed footer -->
    <div class="footer-section">
      <div class="footer-totals">
        <span><strong>Pallet:</strong> {{ pendingPalletCode || '—' }}</span>
        <span class="divider">|</span>
        <span><strong>Số bao:</strong> {{ palletDetail?.currentBagCount || 0 }}</span>
      </div>
      <div class="footer-actions">
        <el-button size="large" @click="handleSaveDraft" :loading="savingDraft">Lưu tạm</el-button>
        <el-button size="large" type="primary" @click="handleComplete" :loading="completing">
          Lưu lại
        </el-button>
      </div>
    </div>

    <!-- Cross-product confirm dialog -->
    <el-dialog v-model="showForceDialog" title="⚠️ Cảnh báo Cross-Product" width="480" :close-on-click-modal="false">
      <el-alert type="warning" :closable="false" show-icon>
        <p>Bao <strong>{{ forceContext.bagSerial }}</strong> chứa sản phẩm <strong>khác loại</strong> với các bao đang có trong pallet.</p>
        <p class="mt-2">Bạn có muốn vẫn liên kết bao này không?</p>
      </el-alert>
      <div style="margin-top: 16px;">
        <el-checkbox v-model="forceConfirmChecked">Tôi xác nhận muốn liên kết bao khác sản phẩm</el-checkbox>
      </div>
      <template #footer>
        <el-button @click="showForceDialog = false; forceConfirmChecked = false">Huỷ</el-button>
        <el-button type="warning" @click="handleForceLink" :disabled="!forceConfirmChecked">Xác nhận liên kết</el-button>
      </template>
    </el-dialog>

    <!-- Transfer pallet confirm dialog -->
    <el-dialog v-model="showTransferDialog" title="⚠️ Bao đã ở pallet khác" width="480" :close-on-click-modal="false">
      <el-alert type="warning" :closable="false" show-icon>
        <p>{{ transferContext.message }}</p>
      </el-alert>
      <div style="margin-top: 16px;">
        <el-checkbox v-model="transferConfirmChecked">Tôi xác nhận muốn chuyển bao sang pallet mới</el-checkbox>
      </div>
      <template #footer>
        <el-button @click="showTransferDialog = false; transferConfirmChecked = false">Huỷ</el-button>
        <el-button type="warning" @click="handleTransferConfirm" :disabled="!transferConfirmChecked" :loading="scanning">Chuyển pallet</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'
import api from '@/common/utils/api'
import { productionOrderApi } from '../api/productionOrderApi'

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string

// Order info
const orderCode = ref('')
const productName = ref('')
const loadingOrder = ref(false)

// Pallet state (scan-based)
const pendingPalletCode = ref('')
const pendingPalletId = ref('')
const palletDetail = ref<any>(null)
const bagMappings = ref<any[]>([])
const loadingDetail = ref(false)

// Scan
const scanInput = ref('')
const scanning = ref(false)
const scanInputRef = ref()

// Force link (cross-product)
const showForceDialog = ref(false)
const forceContext = ref({ bagSerial: '', palletId: '', message: '' })
const forceConfirmChecked = ref(false)

// Transfer pallet
const showTransferDialog = ref(false)
const transferContext = ref({ bagSerial: '', message: '' })
const transferConfirmChecked = ref(false)

// Footer actions
const savingDraft = ref(false)
const completing = ref(false)

function handleBack() {
  router.back()
}

async function loadOrderInfo() {
  loadingOrder.value = true
  try {
    const { data } = await productionOrderApi.getOrderDetail(orderId)
    orderCode.value = data.orderCode
    productName.value = data.product?.name || ''
  } catch {
    ElMessage.error('Không tải được thông tin lệnh sản xuất')
  } finally {
    loadingOrder.value = false
  }
}

async function handleScan() {
  const code = scanInput.value.trim()
  if (!code) return

  // Nếu chưa có pallet → thử tìm pallet trước
  if (!pendingPalletId.value) {
    // Thử tìm pallet bằng code
    scanning.value = true
    try {
      const { data } = await api.get('/supply/pallets', { params: { search: code, limit: 1 } })
      const pallet = (data.items || []).find((p: any) => p.palletCode.toUpperCase() === code.toUpperCase())
      if (pallet) {
        await handleScanPallet(code)
        return
      }
    } catch {}
    scanning.value = false
    // Không phải pallet → cảnh báo
    ElMessage.warning('⚠️ Vui lòng quét mã Pallet trước rồi mới quét mã bao!')
    scanInput.value = ''
    return
  }

  // Đã có pallet → kiểm tra xem có phải quét pallet khác không
  scanning.value = true
  try {
    const { data } = await api.get('/supply/pallets', { params: { search: code, limit: 1 } })
    const pallet = (data.items || []).find((p: any) => p.palletCode.toUpperCase() === code.toUpperCase())
    if (pallet) {
      // Chuyển sang pallet mới
      await handleScanPallet(code)
      return
    }
  } catch {}
  scanning.value = false

  // Không phải pallet → xử lý như mã bao
  await handleScanBag(code)
}

async function handleScanPallet(code: string) {
  scanning.value = true
  try {
    // Find pallet by code
    const { data } = await api.get('/supply/pallets', { params: { search: code, limit: 1 } })
    const pallet = (data.items || []).find((p: any) => p.palletCode === code.toUpperCase())
    if (!pallet) {
      ElMessage.error(`Không tìm thấy pallet ${code}`)
      scanInput.value = ''
      return
    }
    pendingPalletCode.value = pallet.palletCode
    pendingPalletId.value = pallet.id
    ElMessage.success(`✅ Đã quét pallet ${pallet.palletCode} — Giờ quét mã bao`)
    scanInput.value = ''
    await refreshPalletDetail()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi quét pallet')
  } finally {
    scanning.value = false
    await nextTick()
    scanInputRef.value?.focus()
  }
}

async function handleScanBag(serial: string) {
  scanning.value = true
  try {
    const { data } = await api.post(`/supply/pallets/${pendingPalletId.value}/link-bag`, { bagSerial: serial })

    // Backend returns conflict/warning as 200 with flags
    if (data.conflict) {
      transferContext.value = { bagSerial: serial, message: data.message || 'Bao đang ở pallet khác. Xác nhận chuyển sang pallet này?' }
      transferConfirmChecked.value = false
      showTransferDialog.value = true
      scanInput.value = ''
      return
    }

    if (data.crossProductWarning) {
      forceContext.value = { bagSerial: serial, palletId: pendingPalletId.value, message: data.message }
      forceConfirmChecked.value = false
      showForceDialog.value = true
      scanInput.value = ''
      return
    }

    if (data.success) {
      ElMessage.success(`✅ Đã liên kết bao ${serial} vào ${pendingPalletCode.value}`)
      scanInput.value = ''
      await refreshPalletDetail()
    }
  } catch (e: any) {
    const msg = e.response?.data?.message || e.message || 'Lỗi liên kết'
    ElMessage.error(`❌ ${msg}`)
    scanInput.value = ''
  } finally {
    scanning.value = false
    await nextTick()
    scanInputRef.value?.focus()
  }
}

async function handleForceLink() {
  scanning.value = true
  try {
    await api.post(`/supply/pallets/${forceContext.value.palletId}/link-bag`, {
      bagSerial: forceContext.value.bagSerial,
      force: true
    })
    ElMessage.success(`✅ Đã force-link bao ${forceContext.value.bagSerial}`)
    showForceDialog.value = false
    forceConfirmChecked.value = false
    await refreshPalletDetail()
  } catch (e: any) {
    ElMessage.error(`❌ ${e.response?.data?.message || 'Lỗi'}`)
  } finally {
    scanning.value = false
  }
}

async function handleTransferConfirm() {
  scanning.value = true
  try {
    const { data } = await api.post(`/supply/pallets/${pendingPalletId.value}/link-bag`, {
      bagSerial: transferContext.value.bagSerial,
      force: true
    })
    if (data.success) {
      ElMessage.success(`✅ Đã chuyển bao ${transferContext.value.bagSerial} sang ${pendingPalletCode.value}`)
      await refreshPalletDetail()
    }
    showTransferDialog.value = false
    transferConfirmChecked.value = false
  } catch (e: any) {
    ElMessage.error(`❌ ${e.response?.data?.message || 'Lỗi chuyển pallet'}`)
  } finally {
    scanning.value = false
  }
}

async function refreshPalletDetail() {
  if (!pendingPalletId.value) return
  loadingDetail.value = true
  try {
    const { data } = await api.get(`/supply/pallets/${pendingPalletId.value}`)
    palletDetail.value = data
    bagMappings.value = data.bagMappings || []
  } catch {
    ElMessage.error('Lỗi tải chi tiết pallet')
  } finally {
    loadingDetail.value = false
  }
}

function clearPendingPallet() {
  pendingPalletCode.value = ''
  pendingPalletId.value = ''
  palletDetail.value = null
  bagMappings.value = []
}

async function handleUnlinkBag(mapping: any) {
  try {
    await ElMessageBox.confirm(`Gỡ bao ${mapping.bagSerial} khỏi pallet?`, 'Xác nhận')
    await api.post(`/supply/pallets/${pendingPalletId.value}/unlink-bag`, { bagSerial: mapping.bagSerial })
    ElMessage.success('Đã gỡ bao')
    await refreshPalletDetail()
  } catch {}
}

async function handleSaveDraft() {
  savingDraft.value = true
  try {
    ElMessage.success('Đã lưu tạm')
  } finally {
    savingDraft.value = false
  }
}

async function handleComplete() {
  completing.value = true
  try {
    if (!pendingPalletId.value) {
      ElMessage.warning('Chưa có pallet nào được chọn')
      return
    }
    ElMessage.success('Đã lưu liên kết pallet thành công!')
    router.back()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi lưu')
  } finally {
    completing.value = false
  }
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusType(s: string) {
  const map: Record<string, string> = { EMPTY: 'info', LOADING: '', LOADED: 'success', EXPORTING: 'warning' }
  return map[s] || 'info'
}

function statusLabel(s: string) {
  const map: Record<string, string> = { EMPTY: 'Trống', LOADING: 'Đang xếp', LOADED: 'Đã đầy', EXPORTING: 'Đang xuất' }
  return map[s] || s
}

onMounted(async () => {
  await loadOrderInfo()
  await nextTick()
  scanInputRef.value?.focus()
})
</script>

<style scoped>
.pallet-linking-page {
  background: #f5f7fa;
  padding: 20px;
  padding-bottom: 80px;
}

/* Header - synced with BagLinkingView */
.receipt-header {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.back-btn { font-size: 13px; color: #606266; }
.header-row1 {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.header-title-group {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.header-icon {
  font-size: 28px;
  line-height: 1;
  opacity: 0.7;
}
.header-title-group h2 {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  margin: 0;
  line-height: 1.3;
}
.header-title-group .sub {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

/* Scan section - synced with BagLinkingView */
.scan-section {
  margin-bottom: 16px;
}
.scan-box {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.scan-hint {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}
.scan-input :deep(.el-input__inner) {
  font-family: 'Courier New', monospace;
  font-size: 18px;
}

/* Grid - synced with BagLinkingView */
.grid-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  margin-bottom: 0;
  flex: 1;
}
.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.grid-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}
.pallet-badge {
  font-family: 'Courier New', monospace;
  color: #2c6ecb;
  background: #e8f4fd;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
  margin-left: 8px;
}

.grid-totals {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0 4px;
  font-size: 14px;
  color: #303133;
  border-top: 1px solid #ebeef5;
  margin-top: 12px;
}
.grid-totals strong { font-weight: 700; }
.grid-totals .divider, .footer-totals .divider {
  margin: 0 20px;
  color: #c0c4cc;
}

/* Fixed footer - synced with BagLinkingView */
.footer-section {
  position: sticky;
  bottom: -24px;
  margin: 0 -20px -20px;
  background: #fff;
  border-top: 2px solid #ebeef5;
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
}
.footer-totals {
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}
.footer-totals strong {
  font-weight: 700;
  font-size: 18px;
}
.footer-actions {
  display: flex;
  gap: 12px;
}
</style>
