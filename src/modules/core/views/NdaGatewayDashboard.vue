<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { gatewayApi } from '../api/gateway';
import { ElMessage } from 'element-plus';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { Connection, DataLine, Files, Timer } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const connections = ref<any>(null);
const stats = ref<any>(null);
const logs = ref<any[]>([]);
const jobs = ref<any>({ pending: [], history: [] });
const loading = ref(false);
let timer: any = null;

const fetchData = async () => {
    loading.value = true;
    try {
        const [connRes, statsRes, logsRes, jobsRes] = await Promise.all([
            gatewayApi.getConnections(),
            gatewayApi.getStats(),
            gatewayApi.getLogs(20),
            gatewayApi.getJobs()
        ]);
        connections.value = connRes.data;
        stats.value = statsRes.data;
        logs.value = logsRes.data.logs;
        jobs.value = jobsRes.data;
    } catch (error: any) {
        console.error('Fetch Gateway Dashboard Error:', error);
        // Fallback or silently fail on auto-refresh
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchData();
    // Auto refresh every 5s for realtime feel
    timer = setInterval(fetchData, 5000);
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});

const getStatusType = (status: string) => {
    if (!status) return 'info';
    return status === 'CONNECTED' ? 'success' : 'danger';
};

const formatTime = (ts: any) => {
    if (!ts) return '';
    return dayjs(ts).format('HH:mm:ss DD/MM/YYYY');
}
</script>

<template>
    <div>
        <LTEContentHeader title="NDA Gateway Dashboard" :breadcrumbs="[{ title: 'Hệ thống' }]" />

        <div class="max-w-7xl mx-auto p-4" v-loading="loading && !connections">
            <!-- 1. Connections -->
            <el-row :gutter="20" class="mb-4">
                <el-col :span="24">
                    <LTECard title="Trạng thái kết nối hệ thống" :icon="Connection">
                        <div v-if="connections" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <!-- Backend -->
                            <div class="border p-4 rounded-md shadow-sm bg-gray-50">
                                <h4 class="font-bold text-gray-700 mb-3 border-b pb-2">Backend Services</h4>
                                
                                <div class="flex justify-between items-center mb-2">
                                    <span>Redis Cache</span>
                                    <el-tag :type="getStatusType(connections.backend?.redis)">{{ connections.backend?.redis || 'UNKNOWN' }}</el-tag>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span>PostgreSQL DB</span>
                                    <el-tag :type="getStatusType(connections.backend?.postgres)">{{ connections.backend?.postgres || 'UNKNOWN' }}</el-tag>
                                </div>
                            </div>
                            
                            <!-- NDA Agent -->
                            <div class="border p-4 rounded-md shadow-sm bg-gray-50">
                                <h4 class="font-bold text-gray-700 mb-3 border-b pb-2">NDA Agent</h4>
                                <div class="flex justify-between items-center mb-2">
                                    <span>Connection</span>
                                    <el-tag :type="getStatusType(connections.nda?.connection)">{{ connections.nda?.connection || 'DISCONNECTED' }}</el-tag>
                                </div>
                                <div class="text-xs text-gray-500 truncate mt-2" title="API URL">
                                    {{ connections.nda?.url || 'N/A' }}
                                </div>
                            </div>

                            <!-- Webhook -->
                            <div class="border p-4 rounded-md shadow-sm bg-gray-50">
                                <h4 class="font-bold text-gray-700 mb-3 border-b pb-2">Webhook Listener</h4>
                                <div class="flex justify-between items-center mb-2">
                                    <span>Ready Status</span>
                                    <el-tag :type="connections.webhook?.ready ? 'success' : 'warning'">{{ connections.webhook?.ready ? 'READY' : 'NOT READY' }}</el-tag>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span>Private Key</span>
                                    <el-tag :type="connections.webhook?.hasPrivateKey ? 'success' : 'danger'">{{ connections.webhook?.hasPrivateKey ? 'LOADED' : 'MISSING' }}</el-tag>
                                </div>
                            </div>
                        </div>
                        <el-empty v-else description="Không thể kết nối Gateway" />
                    </LTECard>
                </el-col>
            </el-row>

            <!-- 2. Command History & Stats -->
             <el-row :gutter="20" class="mb-4">
                <el-col :md="8">
                    <LTECard :no-padding="true">
                        <div class="p-4 border-b">
                            <h3 class="flex items-center gap-2 font-bold text-gray-700"><el-icon><DataLine /></el-icon> Thống kê Queue</h3>
                        </div>
                         <div v-if="stats" class="grid grid-cols-2 gap-4 p-4">
                            <el-statistic title="Waiting" :value="stats.queue?.waiting" />
                            <el-statistic title="Active" :value="stats.queue?.active" value-style="color: #409EFF" />
                            <el-statistic title="Completed" :value="stats.queue?.completed" value-style="color: #67C23A" />
                            <el-statistic title="Failed" :value="stats.queue?.failed" value-style="color: #F56C6C" />
                         </div>
                    </LTECard>

                    <LTECard class="mt-4" title="Lệnh đang chờ / Treo" :icon="Timer">
                         <el-table :data="jobs.pending" style="width: 100%" size="small" empty-text="Không có lệnh nào đang chờ">
                            <el-table-column prop="id" label="ID" width="60" />
                            <el-table-column prop="data.type" label="Loại" />
                            <el-table-column prop="timestamp" label="Tạo lúc">
                                <template #default="{ row }">
                                    {{ formatTime(row.timestamp) }}
                                </template>
                            </el-table-column>
                        </el-table>
                    </LTECard>
                </el-col>
                
                <el-col :md="16">
                     <LTECard title="Lịch sử lệnh (10 lệnh gần nhất)" :icon="DataLine">
                        <el-table :data="jobs.history" style="width: 100%" border size="small">
                            <el-table-column prop="id" label="ID" width="70" />
                            <el-table-column prop="data.type" label="Loại lệnh" width="120" />
                            <el-table-column prop="status" label="Trạng thái" width="100">
                                <template #default="{ row }">
                                    <el-tag :type="row.status === 'completed' ? 'success' : 'danger'" size="small">{{ row.status.toUpperCase() }}</el-tag>
                                </template>
                            </el-table-column>
                             <el-table-column prop="result" label="Kết quả / Lỗi">
                                <template #default="{ row }">
                                    <div v-if="row.status === 'completed'" class="truncate max-w-[200px]" :title="JSON.stringify(row.result)">
                                        {{ row.result?.message || 'OK' }}
                                    </div>
                                    <div v-else class="text-red-500 truncate max-w-[200px]" :title="row.error">
                                        {{ row.error }}
                                    </div>
                                </template>
                            </el-table-column>
                            <el-table-column prop="timestamp" label="Thời gian" width="150">
                                <template #default="{ row }">
                                    {{ formatTime(row.timestamp) }}
                                </template>
                            </el-table-column>
                        </el-table>
                    </LTECard>
                </el-col>
             </el-row>

             <!-- 3. Logs -->
             <el-row :gutter="20">
                <el-col :span="24">
                    <LTECard title="Backend System Logs" :icon="Files">
                        <el-table :data="logs" style="width: 100%" height="200" stripe size="small" :show-header="false">
                            <el-table-column prop="timestamp" width="160">
                                <template #default="{ row }">
                                    <span class="text-gray-500 text-xs">{{ row.timestamp }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column prop="level" width="80">
                                <template #default="{ row }">
                                    <span :class="row.level === 'error' ? 'text-red-600 font-bold' : 'text-blue-600'">{{ row.level.toUpperCase() }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column prop="message" />
                        </el-table>
                    </LTECard>
                </el-col>
             </el-row>
        </div>
    </div>
</template>
