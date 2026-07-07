<template>
  <div class="pallet-management">
    <div class="page-header flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 flex items-center justify-center" style="font-size: 20px; line-height: 1;">
          📦
        </div>
        <div>
          <h2 class="text-xl font-bold text-[var(--tid-text-primary)] m-0 leading-tight">Quản lý Pallet</h2>
          <p class="subtitle text-slate-500 text-xs mt-1 m-0">Quản lý pallet tái sử dụng cho quy trình kho vận</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="handleExportCodes" :icon="Download" :loading="exporting">Tải mã vạch</el-button>
        <el-button type="primary" @click="showCreateDialog = true" :icon="Plus">Tạo Pallet</el-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="Trạng thái" clearable style="width: 160px" @change="handleFilterChange">
        <el-option label="Tất cả" value="" />
        <el-option label="🟡 Trống" value="EMPTY" />
        <el-option label="🔵 Đang xếp" value="LOADING" />
        <el-option label="🟢 Đã đầy" value="LOADED" />
        <el-option label="🟠 Đang xuất" value="EXPORTING" />
      </el-select>
      <el-input v-model="searchCode" placeholder="Tìm mã pallet..." clearable style="width: 240px" @input="debouncedSearch" :prefix-icon="Search" />
      <span class="total-count">Tổng: <strong>{{ total }}</strong> pallet</span>
    </div>

    <!-- Table -->
    <el-table :data="pallets" v-loading="loading" stripe @row-click="handleRowClick" style="cursor: pointer;" class="modern-table">
      <el-table-column label="STT" width="60" align="center">
        <template #default="{ $index }">
          {{ (currentPage - 1) * pageSize + $index + 1 }}
        </template>
      </el-table-column>
      <el-table-column prop="palletCode" label="Mã Pallet" min-width="180">
        <template #default="{ row }">
          <strong class="code-text">{{ row.palletCode }}</strong>
        </template>
      </el-table-column>
      <el-table-column label="Trạng thái" width="140">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" effect="light" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Số bao" width="120">
        <template #default="{ row }">
          <span class="font-semibold text-slate-700">{{ row.currentBagCount }} <span v-if="row.maxBags" class="max-label">/ {{ row.maxBags }}</span></span>
        </template>
      </el-table-column>
      <el-table-column label="Giới hạn" width="100">
        <template #default="{ row }">
          {{ row.maxBags || '∞' }}
        </template>
      </el-table-column>
      <el-table-column label="Ngày tạo" width="160">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="Người tạo" prop="creator.fullName" min-width="140" />
      <el-table-column label="Thao tác" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click.stop="viewDetail(row)">Chi tiết</el-button>
          <el-button link type="warning" size="small" @click.stop="editPallet(row)">Sửa</el-button>
          <el-button link type="danger" size="small" @click.stop="deletePallet(row)" :disabled="row.status !== 'EMPTY'">Xoá</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="flex justify-end mt-4">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- Create Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :close-on-click-modal="false"
      :show-close="false"
      width="420px"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            Tạo Pallet mới
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showCreateDialog = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <el-form label-position="top" style="padding: 24px 24px 8px;">
        <el-form-item label="Tiền tố mã pallet">
          <el-input v-model="createForm.prefix" placeholder="PLT" maxlength="10" style="width: 100%" @input="createForm.prefix = createForm.prefix.toUpperCase().replace(/[^A-Z0-9]/g, '')">
            <template #prepend>Prefix</template>
          </el-input>
          <p class="form-hint">Mã tạo ra: <strong class="code-preview">{{ (createForm.prefix || 'PLT').toUpperCase() }}-{{ new Date().getFullYear() }}-0001</strong></p>
        </el-form-item>
        <el-form-item label="Số lượng pallet">
          <el-input-number v-model="createForm.quantity" :min="1" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Giới hạn bao / pallet (tuỳ chọn)">
          <el-input-number v-model="createForm.maxBags" :min="0" :max="999" style="width: 100%" placeholder="0 = không giới hạn" />
          <p class="form-hint">Đặt 0 hoặc bỏ trống = không giới hạn số bao</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showCreateDialog = false" style="border-radius: 8px; padding: 10px 20px;">Huỷ</el-button>
          <el-button type="primary" @click="handleCreate" :loading="creating" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
            Tạo {{ createForm.quantity }} Pallet
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Detail Dialog -->
    <el-dialog
      v-model="showDetailDialog"
      :close-on-click-modal="false"
      :show-close="false"
      width="860px"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            Chi tiết — {{ detailPallet?.palletCode }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showDetailDialog = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <div v-if="detailPallet" v-loading="loadingDetail" style="padding: 24px 24px 8px;">
        <div class="grid grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mã Pallet</div>
            <div class="font-mono font-bold text-[var(--tid-text-primary)] text-sm">{{ detailPallet.palletCode }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trạng thái</div>
            <div>
              <el-tag :type="statusType(detailPallet.status)" effect="light" size="small">
                {{ statusLabel(detailPallet.status) }}
              </el-tag>
            </div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sức chứa</div>
            <div class="font-bold text-slate-700">
              {{ detailPallet.currentBagCount }} / <span class="text-slate-500 font-medium">{{ detailPallet.maxBags || '∞' }}</span> bao
            </div>
          </div>
        </div>
        <el-table :data="detailPallet.bagMappings || []" stripe size="small" empty-text="Pallet chưa có bao nào" class="modern-table">
          <el-table-column label="Mã Bao / Serial" width="130">
            <template #default="{ row }">
              <strong class="font-mono text-xs text-slate-800">{{ row.bagSerial }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="Mã QR" min-width="150">
            <template #default="{ row }">
              <span class="font-mono text-[10px] text-slate-500 break-all">{{ row.bagQrCode || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="productName" label="Sản phẩm" min-width="140">
            <template #default="{ row }">
              <span class="text-xs font-medium text-slate-600">{{ row.productName || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="packetCount" label="Số gói" width="80" align="center">
            <template #default="{ row }">
              <span class="font-semibold text-slate-700">{{ row.packetCount }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Người liên kết" width="100">
            <template #default="{ row }">
              <span class="text-xs text-slate-600">{{ row.linker?.fullName || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Thời gian" width="100">
            <template #default="{ row }">
              <span class="text-xs text-slate-400">{{ formatDate(row.linkedAt) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="" width="50" align="center">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="unlinkBag(row)" :disabled="detailPallet.status === 'EXPORTING'">Gỡ</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="releasePallet" type="warning" :disabled="!detailPallet?.currentBagCount" style="border-radius: 8px; padding: 10px 20px;">Giải phóng tất cả</el-button>
          <el-button @click="showDetailDialog = false" style="border-radius: 8px; padding: 10px 20px;">Đóng</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Edit Dialog -->
    <el-dialog
      v-model="showEditDialog"
      :close-on-click-modal="false"
      :show-close="false"
      width="380px"
      class="branded-pallet-dialog"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            Cập nhật Pallet
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showEditDialog = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <el-form label-position="top" style="padding: 24px 24px 8px;">
        <el-form-item label="Giới hạn bao / pallet">
          <el-input-number v-model="editForm.maxBags" :min="0" :max="999" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showEditDialog = false" style="border-radius: 8px; padding: 10px 20px;">Huỷ</el-button>
          <el-button type="primary" @click="handleUpdate" :loading="updating" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
            Lưu
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Search } from '@element-plus/icons-vue'
import api from '@/common/utils/api'
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const pallets = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const filterStatus = ref('')
const searchCode = ref('')
const exporting = ref(false)

// Create
const showCreateDialog = ref(false)
const creating = ref(false)
const createForm = ref({ quantity: 5, maxBags: 0, prefix: 'PLT' })

// Detail
const showDetailDialog = ref(false)
const loadingDetail = ref(false)
const detailPallet = ref<any>(null)

// Edit
const showEditDialog = ref(false)
const updating = ref(false)
const editForm = ref({ maxBags: 0 })
let editingId = ''

let debounceTimer: any = null
function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => handleFilterChange(), 300)
}

function handleFilterChange() {
  currentPage.value = 1
  fetchPallets()
}

function handleSizeChange(val: number) {
  pageSize.value = val
  currentPage.value = 1
  fetchPallets()
}

async function fetchPallets() {
  loading.value = true
  try {
    const params: any = { page: currentPage.value, limit: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    if (searchCode.value) params.search = searchCode.value
    const { data } = await api.get('/supply/pallets', { params })
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
    const payload: any = { quantity: createForm.value.quantity }
    if (createForm.value.maxBags > 0) payload.maxBags = createForm.value.maxBags
    if (createForm.value.prefix) payload.prefix = createForm.value.prefix
    const { data } = await api.post('/supply/pallets/batch-create', payload)
    ElMessage.success(`Đã tạo ${data.created} pallet`)
    showCreateDialog.value = false
    createForm.value = { quantity: 5, maxBags: 0, prefix: 'PLT' }
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
    const { data } = await api.get(`/supply/pallets/${row.id}`)
    detailPallet.value = data
  } catch (e: any) {
    ElMessage.error('Lỗi tải chi tiết')
  } finally {
    loadingDetail.value = false
  }
}

function handleRowClick(row: any) {
  viewDetail(row)
}

function editPallet(row: any) {
  editingId = row.id
  editForm.value.maxBags = row.maxBags || 0
  showEditDialog.value = true
}

async function handleUpdate() {
  updating.value = true
  try {
    await api.patch(`/supply/pallets/${editingId}`, { maxBags: editForm.value.maxBags || null })
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
    await api.delete(`/supply/pallets/${row.id}`)
    ElMessage.success('Đã xoá')
    fetchPallets()
  } catch {}
}

async function unlinkBag(mapping: any) {
  try {
    await ElMessageBox.confirm(`Gỡ bao ${mapping.bagSerial} khỏi pallet?`, 'Xác nhận')
    await api.post(`/supply/pallets/${detailPallet.value.id}/unlink-bag`, { bagSerial: mapping.bagSerial })
    ElMessage.success('Đã gỡ bao')
    viewDetail(detailPallet.value)
  } catch {}
}

async function releasePallet() {
  try {
    await ElMessageBox.confirm('Giải phóng tất cả bao khỏi pallet?', 'Xác nhận', { type: 'warning' })
    await api.post(`/supply/pallets/${detailPallet.value.id}/release`)
    ElMessage.success('Đã giải phóng pallet')
    showDetailDialog.value = false
    fetchPallets()
  } catch {}
}

async function handleExportCodes() {
  exporting.value = true
  try {
    const { data } = await api.get('/supply/pallets/export-codes')
    // Generate simple CSV
    const csv = ['Mã Pallet,Trạng thái,Giới hạn', ...data.map((p: any) => `${p.palletCode},${p.status},${p.maxBags || '∞'}`)].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pallet-codes-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    ElMessage.success('Đã tải danh sách mã')
  } catch {
    ElMessage.error('Lỗi xuất mã')
  } finally {
    exporting.value = false
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
  fetchPallets()
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function statusType(s: string) {
  const map: Record<string, string> = { EMPTY: 'info', LOADING: '', LOADED: 'success', EXPORTING: 'warning' }
  return map[s] || 'info'
}

function statusLabel(s: string) {
  const map: Record<string, string> = { EMPTY: 'Trống', LOADING: 'Đang xếp', LOADED: 'Đã đầy', EXPORTING: 'Đang xuất' }
  return map[s] || s
}

onMounted(fetchPallets)
</script>

<style scoped>
.pallet-management {
  padding: 24px;
}
.subtitle {
  color: var(--tid-text-secondary);
  font-size: 13px;
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.total-count {
  margin-left: auto;
  color: var(--tid-text-secondary);
  font-size: 13px;
}
.total-count strong {
  color: var(--tid-text-primary);
  font-weight: 700;
}
.code-text {
  color: var(--tid-secondary);
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
}
.max-label {
  color: var(--tid-text-muted);
  font-size: 12px;
}
.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
.form-hint {
  color: var(--tid-text-muted);
  font-size: 12px;
  margin: 4px 0 0;
}
.code-preview {
  color: var(--tid-secondary);
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

/* Modern tables styling matching SemiFinishedImportView.vue */
.modern-table :deep(.el-table__header-wrapper) th {
  background-color: #f8fafc;
  color: var(--tid-text-primary);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  padding: 10px 0;
}

/* Rounded and refined Element Plus dialogs styles */
:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}
:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--tid-border);
}
:deep(.el-dialog__title) {
  font-size: 16px;
  font-weight: 700;
  color: var(--tid-text-primary);
}
:deep(.el-dialog__body) {
  padding: 24px;
}
:deep(.el-dialog__footer) {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--tid-border);
}
</style>

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
