<template>
  <div class="pallet-management">
    <div class="page-header flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center justify-center" style="font-size: 20px; line-height: 1;">📦</div>
        <div>
          <h2 class="text-xl font-bold text-[var(--tid-text-primary)] m-0 leading-tight">Pallet Bán Thành Phẩm</h2>
          <p class="subtitle">Quản lý pallet gom sản phẩm BTP phục vụ xuất kho theo pallet</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true" :icon="Plus">Tạo mới</el-button>
        <el-button @click="showLinkDialog = true" :icon="Connection">Liên kết</el-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="Trạng thái" clearable style="width: 160px" @change="fetchPallets">
        <el-option label="Tất cả" value="" />
        <el-option label="🟡 Trống" value="EMPTY" />
        <el-option label="🔵 Đang xếp" value="LOADING" />
        <el-option label="🟢 Đã đầy" value="LOADED" />
      </el-select>
      <el-input v-model="searchCode" placeholder="Tìm mã pallet..." clearable style="width: 240px" @input="debouncedSearch" :prefix-icon="Search" />
      <span class="total-count">Tổng: <strong>{{ total }}</strong> pallet</span>
    </div>

    <!-- Table -->
    <el-table :data="pallets" v-loading="loading" stripe @row-click="viewDetail" style="cursor: pointer;" class="modern-table">
      <el-table-column prop="palletCode" label="Mã Pallet" min-width="180">
        <template #default="{ row }"><strong class="code-text">{{ row.palletCode }}</strong></template>
      </el-table-column>
      <el-table-column label="Trạng thái" width="140">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" effect="light" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Số SP" width="120">
        <template #default="{ row }">
          <span class="font-semibold text-slate-700">{{ row.currentBatchCount }} <span v-if="row.maxBatches" class="max-label">/ {{ row.maxBatches }}</span></span>
        </template>
      </el-table-column>
      <el-table-column label="Tổng KL (kg)" width="130">
        <template #default="{ row }">
          <span class="font-semibold" style="color: var(--tid-secondary);">{{ formatWeight(row.totalWeight) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Ngày tạo" width="130">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="Người tạo" prop="creator.fullName" min-width="120" />
      <el-table-column label="Thao tác" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click.stop="viewDetail(row)">Chi tiết</el-button>
          <el-button link type="warning" size="small" @click.stop="editPallet(row)">Sửa</el-button>
          <el-button link type="danger" size="small" @click.stop="deletePallet(row)" :disabled="row.status !== 'EMPTY'">Xoá</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-if="total > pageSize" :current-page="currentPage" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="(p: number) => { currentPage = p; fetchPallets() }" class="pagination" />

    <!-- Create Dialog -->
    <el-dialog v-model="showCreateDialog" title="Tạo Pallet BTP mới" width="420" :close-on-click-modal="false" class="rounded-dialog">
      <el-form label-position="top">
        <el-form-item label="Tiền tố mã pallet">
          <el-input v-model="createForm.prefix" placeholder="SFPLT" maxlength="10" @input="createForm.prefix = createForm.prefix.toUpperCase().replace(/[^A-Z0-9]/g, '')">
            <template #prepend>Prefix</template>
          </el-input>
          <p class="form-hint">Mã tạo ra: <strong class="code-preview">{{ (createForm.prefix || 'SFPLT').toUpperCase() }}-{{ new Date().getFullYear() }}-0001</strong></p>
        </el-form-item>
        <el-form-item label="Số lượng pallet">
          <el-input-number v-model="createForm.quantity" :min="1" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Giới hạn SP / pallet">
          <el-input-number v-model="createForm.maxBatches" :min="0" :max="999" style="width: 100%" />
          <p class="form-hint">0 = không giới hạn</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Huỷ</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">Tạo {{ createForm.quantity }} Pallet</el-button>
      </template>
    </el-dialog>

    <!-- Detail Dialog -->
    <el-dialog v-model="showDetailDialog" :title="`Chi tiết — ${detailPallet?.palletCode}`" width="860" :close-on-click-modal="false" class="rounded-dialog">
      <div v-if="detailPallet" v-loading="loadingDetail">
        <div class="grid grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mã Pallet</div>
            <div class="font-mono font-bold text-[var(--tid-text-primary)] text-sm">{{ detailPallet.palletCode }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trạng thái</div>
            <el-tag :type="statusType(detailPallet.status)" effect="light" size="small">{{ statusLabel(detailPallet.status) }}</el-tag>
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Số SP</div>
            <div class="font-bold text-slate-700">{{ detailPallet.currentBatchCount }} / {{ detailPallet.maxBatches || '∞' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng KL</div>
            <div class="font-bold" style="color: var(--tid-secondary);">{{ formatWeight(detailPallet.totalWeight) }} kg</div>
          </div>
        </div>
        <el-table :data="detailPallet.items || []" stripe size="small" empty-text="Pallet chưa có sản phẩm nào" class="modern-table">
          <el-table-column type="index" label="#" width="40" />
          <el-table-column label="Serial" width="135">
            <template #default="{ row }">
              <div class="flex items-center gap-1" style="display: flex; align-items: center;">
                <strong class="font-mono text-xs text-slate-800">{{ row.itemSerial }}</strong>
                <el-tag v-if="row.item?.isSupplementary" type="warning" size="small" effect="plain" style="margin-left: 4px; padding: 0 4px; height: 18px; line-height: 16px; font-size: 10px;">Bù</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Mã QR" min-width="150">
            <template #default="{ row }">
              <span class="font-mono text-[10px] text-slate-500 break-all">{{ row.item?.fullQrCode || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="batchCode" label="Mã lô" width="110">
            <template #default="{ row }"><span class="font-mono text-xs">{{ row.batchCode || '—' }}</span></template>
          </el-table-column>
          <el-table-column prop="productName" label="Sản phẩm" min-width="140" />
          <el-table-column label="KL (kg)" width="70" align="right">
            <template #default="{ row }"><span class="font-semibold text-xs">{{ formatWeight(row.weight) }}</span></template>
          </el-table-column>
          <el-table-column label="Người gắn" width="90">
            <template #default="{ row }"><span class="text-xs text-slate-600">{{ row.linker?.fullName || '—' }}</span></template>
          </el-table-column>
          <el-table-column label="" width="50" align="center">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="unlinkItem(row)">Gỡ</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="releasePallet" type="warning" :disabled="!detailPallet?.currentBatchCount">Giải phóng tất cả</el-button>
        <el-button @click="showDetailDialog = false">Đóng</el-button>
      </template>
    </el-dialog>

    <!-- Link Dialog -->
    <el-dialog v-model="showLinkDialog" width="860" :close-on-click-modal="false" class="rounded-dialog" @closed="onLinkDialogClosed">
      <template #header>
        <div class="link-dialog-header">
          <span class="link-dialog-title">Liên kết SP vào Pallet BTP</span>
          <el-tag v-if="linkSelectedPallet" :type="linkIsFull ? 'danger' : 'info'" effect="plain" size="default" style="font-size: 13px; font-weight: 700">
            {{ linkTotalCount }}/{{ linkSelectedPallet.maxBatches || '∞' }}
            <template v-if="linkIsFull"> — ĐẦY</template>
          </el-tag>
        </div>
      </template>

      <!-- Inline: Pallet + Serial on same row -->
      <div class="link-input-row">
        <div class="link-input-col" style="flex: 0 0 280px">
          <label class="link-label">Chọn Pallet</label>
          <el-select v-model="linkForm.palletId" filterable placeholder="Chọn pallet..." style="width: 100%" @change="onLinkPalletChange">
            <el-option v-for="(p, idx) in pallets" :key="p.id" :label="`${p.palletCode} (${p.currentBatchCount}/${p.maxBatches || '∞'})`" :value="p.id" :disabled="p.maxBatches && p.currentBatchCount >= p.maxBatches" />
          </el-select>
        </div>
        <div class="link-input-col" style="flex: 1">
          <label class="link-label">Quét/nhập serial BTP</label>
          <el-input v-model="linkForm.serial" placeholder="Quét mã serial..." @keyup.enter="handleLink" ref="serialInputRef" :disabled="linkIsFull || !linkForm.palletId">
            <template #append><el-button @click="handleLink" :loading="linking" :disabled="linkIsFull || !linkForm.palletId">Gắn</el-button></template>
          </el-input>
        </div>
      </div>

      <!-- Items Grid -->
      <div v-if="linkItems.length" class="link-grid">
        <el-table :data="linkItems" size="small" border stripe style="width: 100%" max-height="320">
          <el-table-column label="#" width="36" type="index" />
          <el-table-column label="Serial" prop="serial" min-width="90">
            <template #default="{ row }">
              <span class="code-text" style="font-size: 11px">{{ row.serial }}</span>
              <el-tag v-if="row.isSupplementary" type="warning" size="small" style="margin-left: 6px" effect="plain">Tem bù</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Mã QR" prop="fullQrCode" min-width="140">
            <template #default="{ row }"><span class="code-text" style="font-size: 10px">{{ row.fullQrCode || '—' }}</span></template>
          </el-table-column>
          <el-table-column label="Sản phẩm" prop="productName" min-width="120" />
          <el-table-column label="Lô BTP" prop="batchCode" min-width="100">
            <template #default="{ row }"><span class="code-text" style="font-size: 11px">{{ row.batchCode || '—' }}</span></template>
          </el-table-column>
          <el-table-column label="KL (kg)" width="80" align="right">
            <template #default="{ row }">{{ Number(row.weight || 0).toFixed(1) }}</template>
          </el-table-column>
          <el-table-column label="" width="44" align="center">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="removeLinkItem(row)">✕</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Status message -->
      <div v-if="lastStatus.message" style="margin-top: 12px">
        <el-alert :title="lastStatus.message" :type="lastStatus.type === 'error' ? 'error' : 'success'" show-icon :closable="false" />
      </div>

      <template #footer>
        <el-button @click="showLinkDialog = false">Thoát</el-button>
        <el-button type="primary" @click="showLinkDialog = false; fetchPallets()">Lưu lại</el-button>
      </template>
    </el-dialog>

    <!-- Force Transfer Confirm Dialog -->
    <el-dialog v-model="showForceDialog" title="⚠️ Sản phẩm đã thuộc pallet khác" width="440" :close-on-click-modal="false" class="rounded-dialog">
      <p style="margin-bottom: 12px;">{{ forceInfo.message }}</p>
      <el-checkbox v-model="forceConfirmed" label="Tôi xác nhận chuyển sản phẩm này sang pallet mới" />
      <template #footer>
        <el-button @click="showForceDialog = false; forceConfirmed = false">Huỷ</el-button>
        <el-button type="warning" @click="handleForceLink" :disabled="!forceConfirmed" :loading="linking">Xác nhận chuyển</el-button>
      </template>
    </el-dialog>

    <!-- Edit Dialog -->
    <el-dialog v-model="showEditDialog" title="Cập nhật Pallet BTP" width="380" class="rounded-dialog">
      <el-form label-position="top">
        <el-form-item label="Giới hạn SP / pallet">
          <el-input-number v-model="editForm.maxBatches" :min="0" :max="999" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Huỷ</el-button>
        <el-button type="primary" @click="handleUpdate" :loading="updating">Lưu</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Connection } from '@element-plus/icons-vue'
import { supplyApi } from '../api/supplyApi'

const pallets = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)
const filterStatus = ref('')
const searchCode = ref('')

// Create
const showCreateDialog = ref(false)
const creating = ref(false)
const createForm = ref({ quantity: 5, maxBatches: 10, prefix: 'SFPLT' })

// Detail
const showDetailDialog = ref(false)
const loadingDetail = ref(false)
const detailPallet = ref<any>(null)

// Edit
const showEditDialog = ref(false)
const updating = ref(false)
const editForm = ref({ maxBatches: 0 })
let editingId = ''

// Link
const showLinkDialog = ref(false)
const linking = ref(false)
const serialInputRef = ref<any>(null)
const linkForm = ref({ palletId: '', serial: '' })
const linkItems = ref<{ serial: string; fullQrCode: string; productName: string; batchCode: string; weight: number }[]>([])
const lastStatus = ref<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' })

// Force transfer
const showForceDialog = ref(false)
const forceConfirmed = ref(false)
const forceInfo = ref({ message: '', serial: '' })

// Computed: selected pallet info
const linkSelectedPallet = computed(() => pallets.value.find((p: any) => p.id === linkForm.value.palletId))
const linkTotalCount = computed(() => linkItems.value.length)
const linkIsFull = computed(() => {
  const p = linkSelectedPallet.value
  return p?.maxBatches ? linkTotalCount.value >= p.maxBatches : false
})

let debounceTimer: any = null
function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchPallets(), 300)
}

async function fetchPallets() {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, limit: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    if (searchCode.value) params.search = searchCode.value
    const { data } = await supplyApi.listSFPallets(params)
    pallets.value = data.items
    total.value = data.total
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi tải danh sách')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  creating.value = true
  try {
    const payload: any = { quantity: createForm.value.quantity, prefix: createForm.value.prefix || 'SFPLT' }
    if (createForm.value.maxBatches > 0) payload.maxBatches = createForm.value.maxBatches
    const { data } = await supplyApi.batchCreateSFPallets(payload)
    ElMessage.success(`Đã tạo ${data.created} pallet BTP`)
    showCreateDialog.value = false
    createForm.value = { quantity: 5, maxBatches: 10, prefix: 'SFPLT' }
    fetchPallets()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi tạo pallet')
  } finally {
    creating.value = false
  }
}

async function viewDetail(row: any) {
  showDetailDialog.value = true
  loadingDetail.value = true
  try {
    const { data } = await supplyApi.getSFPalletDetail(row.id)
    detailPallet.value = data
  } catch {
    ElMessage.error('Lỗi tải chi tiết')
  } finally {
    loadingDetail.value = false
  }
}

function editPallet(row: any) {
  editingId = row.id
  editForm.value.maxBatches = row.maxBatches || 0
  showEditDialog.value = true
}

async function handleUpdate() {
  updating.value = true
  try {
    await supplyApi.updateSFPallet(editingId, { maxBatches: editForm.value.maxBatches || null as any })
    ElMessage.success('Đã cập nhật')
    showEditDialog.value = false
    fetchPallets()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi cập nhật')
  } finally {
    updating.value = false
  }
}

async function deletePallet(row: any) {
  try {
    await ElMessageBox.confirm(`Xoá pallet ${row.palletCode}?`, 'Xác nhận', { type: 'warning' })
    await supplyApi.deleteSFPallet(row.id)
    ElMessage.success('Đã xoá')
    fetchPallets()
  } catch {}
}

async function unlinkItem(mapping: any) {
  try {
    await ElMessageBox.confirm(`Gỡ SP ${mapping.itemSerial} khỏi pallet?`, 'Xác nhận')
    await supplyApi.unlinkSFPalletItem(detailPallet.value.id, { serial: mapping.itemSerial })
    ElMessage.success('Đã gỡ')
    viewDetail(detailPallet.value)
  } catch {}
}

async function releasePallet() {
  try {
    await ElMessageBox.confirm('Giải phóng tất cả SP khỏi pallet?', 'Xác nhận', { type: 'warning' })
    await supplyApi.releaseSFPallet(detailPallet.value.id)
    ElMessage.success('Đã giải phóng pallet')
    showDetailDialog.value = false
    fetchPallets()
  } catch {}
}

async function onLinkPalletChange() {
  linkItems.value = []
  lastStatus.value = { type: '', message: '' }
  if (!linkForm.value.palletId) return
  try {
    const { data } = await supplyApi.getSFPalletDetail(linkForm.value.palletId)
    if (data.items && data.items.length > 0) {
      linkItems.value = data.items.map((it: any) => ({
        serial: it.itemSerial || '',
        fullQrCode: it.item?.fullQrCode || '',
        productName: it.productName || '',
        batchCode: it.batchCode || '',
        weight: it.weight || 0,
        isSupplementary: it.item?.isSupplementary || false,
      }))
    }
  } catch {}
  nextTick(() => serialInputRef.value?.focus())
}

function onLinkDialogClosed() {
  linkItems.value = []
  lastStatus.value = { type: '', message: '' }
  linkForm.value = { palletId: '', serial: '' }
  fetchPallets()
}

async function handleLink() {
  const serial = linkForm.value.serial.trim()
  if (!serial || !linkForm.value.palletId) return

  lastStatus.value = { type: '', message: '' }

  // Client-side duplicate check
  if (linkItems.value.some(i => i.serial === serial)) {
    lastStatus.value = { type: 'error', message: `Mã "${serial}" đã có trong pallet` }
    linkForm.value.serial = ''
    nextTick(() => serialInputRef.value?.focus())
    return
  }

  // Full check
  if (linkIsFull.value) {
    lastStatus.value = { type: 'error', message: 'Pallet đã đầy, không thể gắn thêm!' }
    linkForm.value.serial = ''
    return
  }

  linking.value = true
  try {
    const { data } = await supplyApi.linkSFPalletItem(linkForm.value.palletId, { serial })
    if (data.needConfirm) {
      forceInfo.value = { message: data.message, serial }
      showForceDialog.value = true
      forceConfirmed.value = false
    } else if (data.success) {
      const item = data.item

      // Cross-product/batch check against existing items in this session
      if (linkItems.value.length > 0) {
        const first = linkItems.value[0]
        if (item?.productName && first.productName && item.productName !== first.productName) {
          const msg = `Khác SP! Đang chứa "${first.productName}"`
          lastStatus.value = { type: 'error', message: msg }
          try {
            await supplyApi.unlinkSFPalletItem(linkForm.value.palletId, { serial })
          } catch (err) {
            console.error('Failed to unlink mismatched product:', err)
          }
          return
        }
        if (item?.batchCode && first.batchCode && item.batchCode !== first.batchCode) {
          const msg = `Khác lô! Đang chứa "${first.batchCode}"`
          lastStatus.value = { type: 'error', message: msg }
          try {
            await supplyApi.unlinkSFPalletItem(linkForm.value.palletId, { serial })
          } catch (err) {
            console.error('Failed to unlink mismatched batch:', err)
          }
          return
        }
      }

      linkItems.value.push({
        serial: item?.serial || serial,
        fullQrCode: item?.fullQrCode || '',
        productName: item?.productName || '',
        batchCode: item?.batchCode || '',
        weight: item?.weight || 0,
        isSupplementary: item?.isSupplementary || false,
      })
      lastStatus.value = { type: 'success', message: `Gắn thành công SP: ${serial}` }
      fetchPallets()
    }
  } catch (e: any) {
    const msg = e.response?.data?.message || 'Lỗi liên kết'
    lastStatus.value = { type: 'error', message: `${serial}: ${msg}` }
  } finally {
    linking.value = false
    linkForm.value.serial = ''
    nextTick(() => serialInputRef.value?.focus())
  }
}

async function removeLinkItem(row: any) {
  try {
    await supplyApi.unlinkSFPalletItem(linkForm.value.palletId, { serial: row.serial })
    linkItems.value = linkItems.value.filter(i => i.serial !== row.serial)
    lastStatus.value = { type: 'success', message: `Đã gỡ SP: ${row.serial}` }
    fetchPallets()
  } catch (e: any) {
    lastStatus.value = { type: 'error', message: `Gỡ thất bại: ${e.response?.data?.message || 'Lỗi'}` }
  }
}

async function handleForceLink() {
  linking.value = true
  try {
    const { data } = await supplyApi.linkSFPalletItem(linkForm.value.palletId, { serial: forceInfo.value.serial, force: true })
    if (data.success) {
      linkItems.value.push({
        serial: data.item?.serial || forceInfo.value.serial,
        fullQrCode: data.item?.fullQrCode || '',
        productName: data.item?.productName || '',
        batchCode: data.item?.batchCode || '',
        weight: data.item?.weight || 0,
        isSupplementary: data.item?.isSupplementary || false,
      })
      lastStatus.value = { type: 'success', message: `Chuyển và gắn thành công SP: ${forceInfo.value.serial}` }
      fetchPallets()
    }
    showForceDialog.value = false
    forceConfirmed.value = false
    linkForm.value.serial = ''
  } catch (e: any) {
    lastStatus.value = { type: 'error', message: `Chuyển thất bại: ${e.response?.data?.message || 'Lỗi'}` }
  } finally {
    linking.value = false
  }
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatWeight(w: number) {
  if (!w) return '0'
  return Number(w).toFixed(1)
}

function statusType(s: string) {
  const map: Record<string, string> = { EMPTY: 'info', LOADING: '', LOADED: 'success' }
  return map[s] || 'info'
}

function statusLabel(s: string) {
  const map: Record<string, string> = { EMPTY: 'Trống', LOADING: 'Đang xếp', LOADED: 'Đã đầy' }
  return map[s] || s
}

onMounted(fetchPallets)
</script>

<style scoped>
.pallet-management { padding: 24px; }
.subtitle { color: var(--tid-text-secondary); font-size: 13px; margin: 0; }
.header-actions { display: flex; gap: 8px; }
.filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.total-count { margin-left: auto; color: var(--tid-text-secondary); font-size: 13px; }
.total-count strong { color: var(--tid-text-primary); font-weight: 700; }
.code-text { color: var(--tid-secondary); font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; }
.max-label { color: var(--tid-text-muted); font-size: 12px; }
.pagination { margin-top: 24px; display: flex; justify-content: center; }
.form-hint { color: var(--tid-text-muted); font-size: 12px; margin: 4px 0 0; }
.code-preview { color: var(--tid-secondary); font-family: 'Courier New', monospace; font-size: 13px; }
.link-log { max-height: 200px; overflow-y: auto; border-top: 1px solid var(--tid-border); padding-top: 12px; margin-top: 12px; }
.log-item { display: flex; justify-content: space-between; padding: 6px 8px; font-size: 12px; border-bottom: 1px solid rgba(0,0,0,0.04); }
.log-item.error { background: rgba(239, 68, 68, 0.04); }

.modern-table :deep(.el-table__header-wrapper) th {
  background-color: #f8fafc; color: var(--tid-text-primary); font-weight: 700;
  text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding: 10px 0;
}
:deep(.el-dialog) { border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
:deep(.el-dialog__header) { margin-right: 0; padding: 20px 24px 12px; border-bottom: 1px solid var(--tid-border); }
:deep(.el-dialog__title) { font-size: 16px; font-weight: 700; color: var(--tid-text-primary); }
:deep(.el-dialog__body) { padding: 24px; }
:deep(.el-dialog__footer) { padding: 16px 24px 20px; border-top: 1px solid var(--tid-border); }
.link-dialog-header { display: flex; align-items: center; gap: 12px; }
.link-dialog-title { font-size: 16px; font-weight: 700; color: var(--tid-text-primary); }
.link-input-row { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px; }
.link-input-col { display: flex; flex-direction: column; gap: 4px; }
.link-label { font-size: 12px; font-weight: 600; color: var(--tid-text-secondary); }
.link-grid { border-top: 1px solid var(--tid-border); padding-top: 8px; }
</style>
