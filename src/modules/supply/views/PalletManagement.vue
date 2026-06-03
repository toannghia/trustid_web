<template>
  <div class="pallet-management">
    <div class="page-header">
      <div>
        <h2>📦 Quản lý Pallet</h2>
        <p class="subtitle">Quản lý pallet tái sử dụng cho quy trình kho vận</p>
      </div>
      <div class="header-actions">
        <el-button @click="handleExportCodes" :icon="Download" :loading="exporting">Tải mã vạch</el-button>
        <el-button type="primary" @click="showCreateDialog = true" :icon="Plus">Tạo Pallet</el-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="Trạng thái" clearable style="width: 160px" @change="fetchPallets">
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
    <el-table :data="pallets" v-loading="loading" stripe @row-click="handleRowClick" style="cursor: pointer;">
      <el-table-column prop="palletCode" label="Mã Pallet" width="180">
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
          <span>{{ row.currentBagCount }} <span v-if="row.maxBags" class="max-label">/ {{ row.maxBags }}</span></span>
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
      <el-table-column label="Người tạo" prop="creator.fullName" width="140" />
      <el-table-column label="Thao tác" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click.stop="viewDetail(row)">Chi tiết</el-button>
          <el-button link type="warning" size="small" @click.stop="editPallet(row)">Sửa</el-button>
          <el-button link type="danger" size="small" @click.stop="deletePallet(row)" :disabled="row.status !== 'EMPTY'">Xoá</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > pageSize"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next"
      @current-change="handlePageChange"
      class="pagination"
    />

    <!-- Create Dialog -->
    <el-dialog v-model="showCreateDialog" title="Tạo Pallet mới" width="420" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="Số lượng pallet">
          <el-input-number v-model="createForm.quantity" :min="1" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Giới hạn bao / pallet (tuỳ chọn)">
          <el-input-number v-model="createForm.maxBags" :min="0" :max="999" style="width: 100%" placeholder="0 = không giới hạn" />
          <p class="form-hint">Đặt 0 hoặc bỏ trống = không giới hạn số bao</p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Huỷ</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">Tạo {{ createForm.quantity }} Pallet</el-button>
      </template>
    </el-dialog>

    <!-- Detail Dialog -->
    <el-dialog v-model="showDetailDialog" :title="`Chi tiết — ${detailPallet?.palletCode}`" width="680" :close-on-click-modal="false">
      <div v-if="detailPallet" v-loading="loadingDetail">
        <div class="detail-header">
          <el-tag :type="statusType(detailPallet.status)" effect="dark" size="large">{{ statusLabel(detailPallet.status) }}</el-tag>
          <span>{{ detailPallet.currentBagCount }} / {{ detailPallet.maxBags || '∞' }} bao</span>
        </div>
        <el-table :data="detailPallet.bagMappings || []" stripe size="small" max-height="400" empty-text="Pallet chưa có bao nào">
          <el-table-column prop="bagSerial" label="Mã Bao" width="160" />
          <el-table-column prop="productName" label="Sản phẩm" />
          <el-table-column prop="packetCount" label="Số gói" width="80" />
          <el-table-column label="Người liên kết" width="140">
            <template #default="{ row }">
              {{ row.linker?.fullName || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="Thời gian" width="140">
            <template #default="{ row }">
              {{ formatDate(row.linkedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="" width="80">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="unlinkBag(row)" :disabled="detailPallet.status === 'EXPORTING'">Gỡ</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="releasePallet" type="warning" :disabled="!detailPallet?.currentBagCount">Giải phóng tất cả</el-button>
        <el-button @click="showDetailDialog = false">Đóng</el-button>
      </template>
    </el-dialog>

    <!-- Edit Dialog -->
    <el-dialog v-model="showEditDialog" title="Cập nhật Pallet" width="380">
      <el-form label-position="top">
        <el-form-item label="Giới hạn bao / pallet">
          <el-input-number v-model="editForm.maxBags" :min="0" :max="999" style="width: 100%" />
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
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Search } from '@element-plus/icons-vue'
import api from '@/common/utils/api'

const pallets = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)
const filterStatus = ref('')
const searchCode = ref('')
const exporting = ref(false)

// Create
const showCreateDialog = ref(false)
const creating = ref(false)
const createForm = ref({ quantity: 5, maxBags: 0 })

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
  debounceTimer = setTimeout(() => fetchPallets(), 300)
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
    const { data } = await api.post('/supply/pallets/batch-create', payload)
    ElMessage.success(`Đã tạo ${data.created} pallet`)
    showCreateDialog.value = false
    createForm.value = { quantity: 5, maxBags: 0 }
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
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0 0 4px;
  font-size: 22px;
  color: #1a1a2e;
}
.subtitle {
  color: #888;
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
  color: #666;
  font-size: 13px;
}
.code-text {
  color: #2c6ecb;
  font-family: 'Courier New', monospace;
}
.max-label {
  color: #999;
  font-size: 12px;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
}
.form-hint {
  color: #999;
  font-size: 12px;
  margin: 4px 0 0;
}
</style>
