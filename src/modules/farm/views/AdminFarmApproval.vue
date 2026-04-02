<template>
  <div class="p-6 h-full flex flex-col">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Kiểm duyệt ranh giới vùng trồng</h1>
        <p class="text-sm text-gray-500 mt-1">Quản lý và phê duyệt các yêu cầu thay đổi ranh giới polygon từ Tenant</p>
      </div>

      <!-- Auto Approve Toggle -->
      <div class="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
        <span class="text-sm font-medium text-gray-700">Tự động duyệt ranh giới</span>
        <el-switch
            v-model="autoApprove"
            :loading="savingConfig"
            @change="toggleAutoApprove"
            inline-prompt
            active-text="BẬT"
            inactive-text="TẮT"
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <!-- Search & Filters -->
      <div class="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
        <el-input
            v-model="searchQuery"
            placeholder="Tìm kiếm mẫu duyệt, vùng trồng..."
            class="max-w-md"
            clearable
            :prefix-icon="Search"
            @input="handleSearch"
        />
        <el-button :icon="Refresh" @click="fetchPendingApprovals" :loading="loading">
          Làm mới
        </el-button>
      </div>

      <!-- Table -->
      <div class="flex-1 p-0 overflow-auto">
        <el-table
            v-loading="loading"
            :data="filteredLocations"
            style="width: 100%; height: 100%"
            :empty-text="loading ? 'Đang tải dữ liệu...' : 'Không có yêu cầu phê duyệt ranh giới nào'"
        >
          <el-table-column label="Mã HTX / Vùng trồng" min-width="250">
            <template #default="scope">
              <div class="font-medium text-blue-600">{{ scope.row.name }}</div>
              <div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <el-tag size="small" type="info">{{ scope.row.code }}</el-tag>
                <span>{{ scope.row.tenant?.name || 'Unknown Tenant' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Thông tin cập nhật" min-width="300">
            <template #default="scope">
              <div class="text-sm text-gray-800 flex items-start gap-2">
                <el-icon class="mt-1 text-orange-500"><WarningFilled /></el-icon>
                <span>
                  <strong>Lý do:</strong> 
                  {{ scope.row.updateReason || 'Không có lý do được cung cấp' }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-1 ml-5">
                Diện tích: {{ scope.row.areaM2?.toLocaleString() }} m²
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="updatedAt" label="Ngày yêu cầu" width="180">
            <template #default="scope">
              <span class="text-sm text-gray-600">{{ formatDate(scope.row.updatedAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="Thao tác" width="200" align="center" fixed="right">
            <template #default="scope">
              <div class="flex items-center justify-center gap-2">
                <!-- Check map view -->
                <el-tooltip content="Xem bản đồ" placement="top">
                  <el-button
                      type="primary"
                      plain
                      circle
                      :icon="MapLocation"
                      @click="viewMap(scope.row)"
                  />
                </el-tooltip>
                
                <el-tooltip content="Từ chối" placement="top">
                  <el-button
                      type="danger"
                      circle
                      :icon="Close"
                      @click="handleReject(scope.row)"
                  />
                </el-tooltip>

                <el-tooltip content="Phê duyệt" placement="top">
                  <el-button
                      type="success"
                      circle
                      :icon="Check"
                      @click="handleApprove(scope.row)"
                  />
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Check, Close, WarningFilled, MapLocation } from '@element-plus/icons-vue';
import { farmApi, type Location } from '../api/farmApi';

const router = useRouter();

// State
const loading = ref(false);
const savingConfig = ref(false);
const autoApprove = ref(false);
const pendingLocations = ref<Location[]>([]);
const searchQuery = ref('');

// Computed
const filteredLocations = computed(() => {
  if (!searchQuery.value) return pendingLocations.value;
  const q = searchQuery.value.toLowerCase();
  return pendingLocations.value.filter(loc => 
      loc.name?.toLowerCase().includes(q) || 
      loc.code?.toLowerCase().includes(q) ||
      (loc as any).tenant?.name?.toLowerCase().includes(q)
  );
});

// Loading Config & Data
const fetchConfig = async () => {
  try {
    const res = await farmApi.getFarmConfig();
    const result = (res.data as any).data || res.data;
    autoApprove.value = result.autoApproveBoundary || false;
  } catch (error) {
    ElMessage.error('Không thể tải cấu hình tự động duyệt');
  }
};

const fetchPendingApprovals = async () => {
  loading.value = true;
  try {
    const res = await farmApi.getPendingApprovals();
    pendingLocations.value = (res.data as any).data || res.data || [];
  } catch (error) {
    ElMessage.error('Không thể tải danh sách chờ duyệt');
  } finally {
    loading.value = false;
  }
};

// Actions
const toggleAutoApprove = async (val: string | number | boolean) => {
  savingConfig.value = true;
  try {
    await farmApi.saveFarmConfig({ autoApproveBoundary: !!val });
    ElMessage.success(val ? 'Đã BẬT tự động duyệt ranh giới' : 'Đã TẮT tự động duyệt ranh giới');
  } catch (error) {
    ElMessage.error('Lỗi khi lưu cấu hình');
    autoApprove.value = !val; // revert UI
  } finally {
    savingConfig.value = false;
  }
};

const handleSearch = () => {
  // Handled by computed
};

const viewMap = (row: Location) => {
  // Redirect to detail page to see coordinate & map
  // Note: Detail page shows pending boundary in orange!
  router.push(`/farm/locations/${row.id}`);
};

const handleApprove = async (row: Location) => {
  try {
    await ElMessageBox.confirm(
        `Bạn có chắc chắn muốn PHÊ DUYỆT ranh giới mới của vùng trồng "${row.name}"?`,
        'Xác nhận phê duyệt',
        { confirmButtonText: 'Phê duyệt', cancelButtonText: 'Hủy', type: 'success' }
    );
    
    await farmApi.approveBoundary(row.id);
    ElMessage.success('Đã phê duyệt ranh giới thành công');
    await fetchPendingApprovals(); // reload grid
  } catch {
    // user cancelled
  }
};

const handleReject = async (row: Location) => {
  try {
    await ElMessageBox.confirm(
        `Bạn có chắc chắn muốn TỪ CHỐI ranh giới mới của vùng trồng "${row.name}"? Ranh giới cũ sẽ được giữ nguyên.` ,
        'Xác nhận từ chối',
        { confirmButtonText: 'Từ chối', cancelButtonText: 'Hủy', type: 'error' }
    );
    
    await farmApi.rejectBoundary(row.id);
    ElMessage.success('Đã từ chối ranh giới');
    await fetchPendingApprovals(); // reload grid
  } catch {
    // user cancelled
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

onMounted(() => {
  fetchConfig();
  fetchPendingApprovals();
});
</script>
