<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Refresh, Timer, Cellphone, WarnTriangleFilled, CircleCheckFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '@/common/utils/api';

const loading = ref(false);

const stats = ref({
    totalSent: 0,
    successRate: 0,
    failedCount: 0,
    estimatedCost: 0
});

const recentLogs = ref<any[]>([]);

const fetchReport = async () => {
    loading.value = true;
    try {
        const response = await api.get('/admin/reports/otp');
        const data = response.data.data;
        if (data) {
            stats.value = data.stats;
            recentLogs.value = data.logs;
        }
    } catch (error: any) {
        ElMessage.error('Không thể tải báo cáo: ' + (error.response?.data?.message || error.message));
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchReport();
});
</script>

<template>
    <div class="app-user-reports p-6">
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">Báo cáo OTP & Chi phí</h1>
                <p class="text-gray-500 text-sm mt-1">Thống kê hiệu quả gửi tin nhắn xác thực EndUser</p>
            </div>
            <div class="flex gap-2">
                <el-button :icon="Refresh" circle @click="fetchReport" />
            </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-blue-500">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-500 text-sm font-semibold uppercase">Tổng tin gửi</span>
                    <el-icon class="text-blue-500"><Cellphone /></el-icon>
                </div>
                <div class="text-3xl font-bold text-gray-800">{{ stats.totalSent.toLocaleString() }}</div>
                <div class="text-xs text-gray-400 mt-1">Trong tháng này</div>
            </div>

            <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-green-500">
                 <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-500 text-sm font-semibold uppercase">Tỷ lệ thành công</span>
                    <el-icon class="text-green-500"><CircleCheckFilled /></el-icon>
                </div>
                <div class="text-3xl font-bold text-gray-800">{{ stats.successRate }}%</div>
                 <div class="text-xs text-green-600 mt-1">Ổn định</div>
            </div>

             <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-red-500">
                 <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-500 text-sm font-semibold uppercase">Gửi thất bại</span>
                    <el-icon class="text-red-500"><WarnTriangleFilled /></el-icon>
                </div>
                <div class="text-3xl font-bold text-gray-800">{{ stats.failedCount }}</div>
                 <div class="text-xs text-red-400 mt-1">Cần kiểm tra log</div>
            </div>

             <div class="bg-white p-5 rounded-lg shadow-sm border-l-4 border-orange-500">
                 <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-500 text-sm font-semibold uppercase">Chi phí ước tính</span>
                    <el-icon class="text-orange-500"><Timer /></el-icon>
                </div>
                <div class="text-3xl font-bold text-gray-800">{{ stats.estimatedCost.toLocaleString() }} đ</div>
                 <div class="text-xs text-gray-400 mt-1">~ 500đ / tin Zalo</div>
            </div>
        </div>

        <!-- Recent Logs -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 font-bold text-gray-700">
                Lịch sử gửi tin gần nhất
            </div>
            <el-table :data="recentLogs" v-loading="loading" style="width: 100%">
                 <el-table-column prop="phoneNumber" label="Số điện thoại" width="150" />
                 
                 <el-table-column label="Provider" width="150">
                     <template #default="{ row }">
                         <el-tag v-if="row.provider === 'FIREBASE'" type="warning">FIREBASE</el-tag>
                         <el-tag v-else-if="row.provider === 'ZALO'" type="primary">ZALO ZNS</el-tag>
                         <el-tag v-else-if="row.provider === 'RESEND'" color="#f3e8ff" style="color: #7e22ce; border-color: #d8b4fe">RESEND</el-tag>
                         <el-tag v-else type="info">{{ row.provider }}</el-tag>
                     </template>
                 </el-table-column>

                  <el-table-column label="Trạng thái" width="150">
                     <template #default="{ row }">
                         <div class="flex items-center gap-1" :class="row.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'">
                             <el-icon><component :is="row.status === 'SUCCESS' ? CircleCheckFilled : WarnTriangleFilled" /></el-icon>
                             <span class="font-medium text-xs">{{ row.status }}</span>
                         </div>
                     </template>
                 </el-table-column>
                
                <el-table-column prop="sentAt" label="Thời gian gửi" min-width="180" />
                
                 <el-table-column label="Chi phí" width="120" align="right">
                     <template #default="{ row }">
                         <span v-if="row.cost > 0">{{ row.cost }} đ</span>
                         <span v-else class="text-gray-300">Miễn phí</span>
                     </template>
                 </el-table-column>
            </el-table>
        </div>
    </div>
</template>
