<script setup lang="ts">
import { ref, onMounted } from 'vue';
import txngApi from '@/api/txngApi';
import { ElMessage, ElMessageBox } from 'element-plus';

const emit = defineEmits<{ (e: 'retry'): void }>();

const loading = ref(false);
const logs = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(15);

const filters = ref({
    entityType: '',
    syncStatus: '',
});

const detailVisible = ref(false);
const detailLog = ref<any>(null);

const entityTypes = [
    { label: 'Tất cả', value: '' },
    { label: 'Vùng trồng', value: 'VUNG_TRONG' },
    { label: 'Lệnh SX', value: 'LENH_SAN_XUAT' },
    { label: 'Chuỗi CƯ', value: 'CHUOI_SAN_XUAT' },
    { label: 'Địa điểm', value: 'DIA_DIEM' },
    { label: 'SK Vùng trồng', value: 'SU_KIEN_VUNG_TRONG' },
    { label: 'SK Vận chuyển', value: 'SU_KIEN_VAN_CHUYEN' },
    { label: 'SK Chế biến', value: 'SU_KIEN_CHE_BIEN' },
    { label: 'SK Kho tổng', value: 'SU_KIEN_KHO_TONG' },
    { label: 'SK Đại lý', value: 'SU_KIEN_DAI_LY' },
    { label: 'Ảnh', value: 'ANH_MINH_CHUNG' },
];

const statusTypes = [
    { label: 'Tất cả', value: '' },
    { label: 'Thành công', value: 'SUCCESS' },
    { label: 'Thất bại', value: 'FAILED' },
    { label: 'Đang chờ', value: 'PENDING' },
    { label: 'Đang thử lại', value: 'RETRYING' },
];

const statusTagType = (status: string) => {
    switch (status) {
        case 'SUCCESS': return 'success';
        case 'FAILED': return 'danger';
        case 'RETRYING': return 'warning';
        default: return 'info';
    }
};

const fetchLogs = async () => {
    loading.value = true;
    try {
        const res = await txngApi.getLogs({
            page: page.value,
            limit: limit.value,
            entityType: filters.value.entityType || undefined,
            syncStatus: filters.value.syncStatus || undefined,
        });
        logs.value = res.data.data;
        total.value = res.data.total;
    } catch { /* ignore */ } finally {
        loading.value = false;
    }
};

const showDetail = async (log: any) => {
    const res = await txngApi.getLogDetail(log.id);
    detailLog.value = res.data;
    detailVisible.value = true;
};

const retryLog = async (log: any) => {
    await ElMessageBox.confirm('Thử lại đồng bộ này?', 'Xác nhận');
    await txngApi.retryFailed(log.id);
    ElMessage.success('Đã tạo job retry');
    emit('retry');
    fetchLogs();
};

const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('vi-VN');
};

const getFriendlyDiagnosis = (log: any) => {
    const debugMsg = String(log?.responseBody?.debugMessage || log?.errorMessage || '');
    if (debugMsg.includes('NullReferenceException') && debugMsg.includes('ToChuc_SanPhamService')) {
        return {
            reason: 'Hồ sơ Doanh nghiệp chưa được liên kết/kích hoạt trên Cổng Quốc gia (ToChuc_SanPhamService.DoBusinessInsertAsync NullReferenceException).',
            action: 'Liên hệ Quản trị viên Cổng Quốc gia (truyxuatnguongoc.gov.vn) để xác minh và khởi tạo hồ sơ Tổ chức.'
        };
    }
    if (debugMsg.includes('NullReferenceException') && debugMsg.includes('UploadFile')) {
        return {
            reason: 'Hình ảnh sản phẩm không thể truy cập hoặc không thể tải từ URL.',
            action: 'Kiểm tra đường dẫn ảnh sản phẩm (đảm bảo URL công khai JPG/PNG).'
        };
    }
    if (debugMsg.includes('NullReferenceException')) {
        return {
            reason: 'Máy chủ Cổng Quốc gia bị lỗi xử lý dữ liệu nội bộ (.NET Exception).',
            action: 'Tài khoản Doanh nghiệp bị thiếu dữ liệu cấu hình ban đầu trên Cổng Quốc gia.'
        };
    }
    return {
        reason: 'Cổng Quốc gia chưa chấp nhận bản ghi này.',
        action: 'Kiểm tra lại dữ liệu hoặc bấm "Refresh Token" để làm mới kết nối.'
    };
};

onMounted(fetchLogs);
</script>

<template>
    <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-sm font-semibold text-gray-600">Lịch sử đồng bộ</h3>
            <div class="flex gap-2">
                <el-select v-model="filters.entityType" placeholder="Entity" size="small" style="width: 150px" @change="fetchLogs">
                    <el-option v-for="et in entityTypes" :key="et.value" :label="et.label" :value="et.value" />
                </el-select>
                <el-select v-model="filters.syncStatus" placeholder="Trạng thái" size="small" style="width: 130px" @change="fetchLogs">
                    <el-option v-for="st in statusTypes" :key="st.value" :label="st.label" :value="st.value" />
                </el-select>
            </div>
        </div>

        <el-table :data="logs" v-loading="loading" size="small" stripe @row-click="showDetail" style="cursor: pointer">
            <el-table-column prop="createdAt" label="Thời gian" width="160">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column prop="entityType" label="Loại" width="140" />
            <el-table-column prop="action" label="Hành động" width="90" />
            <el-table-column prop="httpMethod" label="Method" width="70" />
            <el-table-column prop="syncStatus" label="Trạng thái" width="110">
                <template #default="{ row }">
                    <el-tag :type="statusTagType(row.syncStatus)" size="small">{{ row.syncStatus }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="durationMs" label="Thời gian (ms)" width="100">
                <template #default="{ row }">{{ row.durationMs || '—' }}</template>
            </el-table-column>
            <el-table-column prop="errorMessage" label="Lỗi" min-width="200">
                <template #default="{ row }">
                    <span class="text-xs text-red-600 truncate block">{{ row.errorMessage || '—' }}</span>
                </template>
            </el-table-column>
            <el-table-column label="" width="70" fixed="right">
                <template #default="{ row }">
                    <el-button v-if="row.syncStatus === 'FAILED'" type="warning" size="small" link @click.stop="retryLog(row)">
                        Retry
                    </el-button>
                </template>
            </el-table-column>
        </el-table>

        <div class="flex justify-end mt-3">
            <el-pagination
                v-model:current-page="page"
                :page-size="limit"
                :total="total"
                layout="prev, pager, next"
                @current-change="fetchLogs"
            />
        </div>

        <!-- Detail Dialog -->
        <el-dialog v-model="detailVisible" title="Chi tiết Sync Log" width="750px" v-if="detailLog">
            <div class="space-y-4">
                <div class="flex justify-between items-center text-sm bg-gray-50 p-2.5 rounded border">
                    <div><strong>Endpoint:</strong> <code class="text-xs font-mono bg-white px-1 py-0.5 rounded border text-blue-700 ml-1">{{ detailLog.endpoint }}</code></div>
                    <div><strong>HTTP Status:</strong> <el-tag :type="detailLog.httpStatus === 200 && detailLog.txngSuccess !== false ? 'success' : 'danger'" size="small" class="ml-1">{{ detailLog.httpStatus }}</el-tag></div>
                </div>

                <!-- Friendly Diagnosis Box -->
                <div v-if="detailLog.syncStatus === 'FAILED'" class="bg-rose-50 border border-rose-200 p-3.5 rounded-lg text-xs space-y-1.5">
                    <div class="font-bold text-rose-900 text-sm flex items-center gap-1">
                        <span>💡 Chẩn đoán nguyên nhân & Hướng khắc phục:</span>
                    </div>
                    <div class="text-rose-800"><strong>Nguyên nhân:</strong> {{ getFriendlyDiagnosis(detailLog).reason }}</div>
                    <div class="text-rose-700">👉 <strong>Hướng khắc phục:</strong> {{ getFriendlyDiagnosis(detailLog).action }}</div>
                </div>

                <div>
                    <strong class="text-xs text-gray-600 block mb-1">Request Body (Dữ liệu gửi đi):</strong>
                    <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono max-h-52 overflow-auto">{{ JSON.stringify(detailLog.requestBody, null, 2) }}</pre>
                </div>

                <div>
                    <strong class="text-xs text-gray-600 block mb-1">Response Body (Phản hồi từ Cổng Quốc gia):</strong>
                    <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono max-h-52 overflow-auto">{{ JSON.stringify(detailLog.responseBody, null, 2) }}</pre>
                </div>

                <!-- Deep Error Analysis -->
                <div v-if="detailLog.responseBody && (detailLog.responseBody.debugMessage || detailLog.responseBody.errorInFile || detailLog.responseBody.error)" class="bg-red-50 border border-red-200 p-3.5 rounded-lg text-xs space-y-1.5">
                    <div class="font-bold text-red-800 text-sm flex items-center gap-1">
                        <span>🔍 Chi tiết kỹ thuật từ Cổng Quốc gia (Kỹ thuật/Admin):</span>
                    </div>
                    <div v-if="detailLog.responseBody.error" class="text-red-700">
                        <strong>Mã lỗi Cổng:</strong> <code class="bg-white px-1 py-0.5 rounded border border-red-200 font-mono">{{ detailLog.responseBody.error }}</code>
                    </div>
                    <div v-if="detailLog.responseBody.debugMessage" class="text-red-800 font-mono bg-red-100/70 p-2 rounded border border-red-200/60 break-all">
                        <strong>Lỗi hệ thống (Exception):</strong> {{ detailLog.responseBody.debugMessage }}
                    </div>
                    <div v-if="detailLog.responseBody.errorInFile" class="text-gray-600 font-mono text-[11px]">
                        <strong>File máy chủ Cổng QG:</strong> {{ detailLog.responseBody.errorInFile }}
                    </div>
                </div>

                <div v-else-if="detailLog.errorMessage" class="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 font-mono">
                    <strong>Thông báo lỗi:</strong> {{ detailLog.errorMessage }}
                </div>
            </div>
        </el-dialog>
    </div>
</template>
