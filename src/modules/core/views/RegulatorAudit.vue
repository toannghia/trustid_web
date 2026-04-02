<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { regulatorApi } from '../api/regulator';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Close, Timer } from '@element-plus/icons-vue';

const requests = ref<any[]>([]);
const stats = ref<any[]>([]);
const loading = ref(false);

const pendingCount = computed(() => stats.value.find(s => s.status === 'PENDING')?.count || 0);
const approvedCount = computed(() => stats.value.find(s => s.status === 'APPROVED')?.count || 0);
const rejectedCount = computed(() => stats.value.find(s => s.status === 'REJECTED')?.count || 0);

const fetchData = async () => {
  loading.value = true;
  try {
    const [reqRes, statRes] = await Promise.all([
        regulatorApi.getRequests({ status: 'PENDING' }),
        regulatorApi.getDashboardStats()
    ]);
    requests.value = reqRes.data;
    stats.value = statRes.data;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const handleAction = (id: string, action: 'APPROVED' | 'REJECTED') => {
  const title = action === 'APPROVED' ? 'Phê duyệt hồ sơ' : 'Từ chối hồ sơ';
  ElMessageBox.prompt('Nhập ghi chú / Lý do:', title, {
    confirmButtonText: 'Xác nhận',
    cancelButtonText: 'Hủy',
    inputPattern: action === 'REJECTED' ? /.+/ : undefined,
    inputErrorMessage: 'Vui lòng nhập lý do từ chối'
  }).then(async ({ value }) => {
    try {
        await regulatorApi.approve(id, action, value);
        ElMessage.success('Thực hiện thành công');
        fetchData();
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  });
};

onMounted(fetchData);
</script>

<template>
  <div class="p-6">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Bảng điều khiển - Cơ quan quản lý</h2>
    
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <el-card shadow="hover" class="!border-l-4 !border-l-yellow-500">
            <div class="flex items-center">
                <el-icon class="text-yellow-500 text-4xl mr-4"><Timer /></el-icon>
                <div>
                    <div class="text-gray-500 text-sm font-medium">Hồ sơ chờ duyệt</div>
                    <div class="text-3xl font-bold text-gray-800">{{ pendingCount }}</div>
                </div>
            </div>
        </el-card>

        <el-card shadow="hover" class="!border-l-4 !border-l-green-500">
            <div class="flex items-center">
                <el-icon class="text-green-500 text-4xl mr-4"><Check /></el-icon>
                <div>
                     <div class="text-gray-500 text-sm font-medium">Đã cấp mã</div>
                    <div class="text-3xl font-bold text-gray-800">{{ approvedCount }}</div>
                </div>
            </div>
        </el-card>

        <el-card shadow="hover" class="!border-l-4 !border-l-red-500">
             <div class="flex items-center">
                <el-icon class="text-red-500 text-4xl mr-4"><Close /></el-icon>
                <div>
                    <div class="text-gray-500 text-sm font-medium">Đã từ chối</div>
                    <div class="text-3xl font-bold text-gray-800">{{ rejectedCount }}</div>
                </div>
            </div>
        </el-card>
    </div>

    <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-700">Danh sách chờ duyệt</h3>
            <el-button type="primary" plain size="small" @click="fetchData" :loading="loading">Làm mới</el-button>
        </div>

        <el-table :data="requests" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="tenant.name" label="Doanh nghiệp" min-width="200">
            <template #default="{ row }">
                <div class="font-medium text-blue-600">{{ row.tenant?.name || 'N/A' }}</div>
                <div class="text-xs text-gray-500">MST: {{ row.tenant?.taxCode || '---' }}</div>
            </template>
        </el-table-column>
        <el-table-column prop="requestType" label="Loại yêu cầu" width="180">
            <template #default="{ row }">
                <el-tag v-if="row.requestType === 'GLN_ISSUANCE'" type="warning">Cấp mã vùng trồng</el-tag>
                <el-tag v-else type="info">{{ row.requestType }}</el-tag>
            </template>
        </el-table-column>
        <el-table-column prop="provinceCode" label="Địa bàn" width="150">
             <template #default="{ row }">
                 <div>Tỉnh: {{ row.provinceCode }}</div>
                 <div v-if="row.districtCode" class="text-xs text-gray-500">Huyện: {{ row.districtCode }}</div>
             </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="Ngày gửi" width="160">
             <template #default="{ row }">
                {{ new Date(row.createdAt).toLocaleDateString('vi-VN') }}
             </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="180" fixed="right" align="center">
            <template #default="scope">
            <el-button type="success" size="small" @click="handleAction(scope.row.id, 'APPROVED')">Duyệt</el-button>
            <el-button type="danger" size="small" @click="handleAction(scope.row.id, 'REJECTED')">Từ chối</el-button>
            </template>
        </el-table-column>
        </el-table>
        
        <div v-if="requests.length === 0 && !loading" class="text-center py-8 text-gray-400">
            Không có hồ sơ nào đang chờ duyệt
        </div>
    </div>
  </div>
</template>