<script setup lang="ts">
import { ref, computed } from 'vue';
import txngApi from '@/api/txngApi';
import { ElMessage, ElMessageBox } from 'element-plus';

const emit = defineEmits<{ (e: 'action-completed'): void }>();

const pingResult = ref<{ ssoReachable: boolean; apiReachable: boolean; latencyMs: number } | null>(null);
const pinging = ref(false);
const refreshing = ref(false);
const retryingAll = ref(false);
const syncingCatalogs = ref(false);

const handlePing = async () => {
    pinging.value = true;
    try {
        const res = await txngApi.pingApi();
        pingResult.value = res.data;
        const ok = res.data.ssoReachable && res.data.apiReachable;
        ElMessage[ok ? 'success' : 'warning'](
            `SSO: ${res.data.ssoReachable ? '✓' : '✗'} | API: ${res.data.apiReachable ? '✓' : '✗'} | ${res.data.latencyMs}ms`
        );
    } catch {
        ElMessage.error('Không thể kết nối');
    } finally {
        pinging.value = false;
    }
};

const handleRefreshToken = async () => {
    refreshing.value = true;
    try {
        const res = await txngApi.refreshToken();
        ElMessage.success(`Token refreshed — status: ${res.data.status}`);
        emit('action-completed');
    } catch {
        ElMessage.error('Refresh token thất bại');
    } finally {
        refreshing.value = false;
    }
};

const handleRetryAll = async () => {
    await ElMessageBox.confirm('Thử lại TẤT CẢ sync đã thất bại?', 'Xác nhận', { type: 'warning' });
    retryingAll.value = true;
    try {
        const res = await txngApi.retryAllFailed();
        ElMessage.success(`Đã tạo ${res.data.jobsCreated} retry jobs`);
        emit('action-completed');
    } catch {
        ElMessage.error('Retry thất bại');
    } finally {
        retryingAll.value = false;
    }
};

const handleSyncCatalogs = async () => {
    syncingCatalogs.value = true;
    try {
        const res = await txngApi.syncCatalogs();
        ElMessage.success('Đồng bộ danh mục thành công');
        emit('action-completed');
    } catch {
        ElMessage.error('Đồng bộ danh mục thất bại');
    } finally {
        syncingCatalogs.value = false;
    }
};

const showCatalogModal = ref(false);
const catalogItems = ref<any[]>([]);
const loadingCatalogs = ref(false);
const catalogSearch = ref('');

const handleViewCatalogs = async () => {
    showCatalogModal.value = true;
    loadingCatalogs.value = true;
    try {
        const res = await txngApi.getCatalogs();
        const raw = res.data?.nganhHang || [];
        catalogItems.value = raw;
        // Auto-expand first level
        const ids = new Set<string>();
        for (const item of raw) {
            if (item.children && item.children.length > 0) {
                ids.add(item.id);
            }
        }
        catalogExpanded.value = ids;
    } catch {
        ElMessage.error('Không thể tải danh mục');
    } finally {
        loadingCatalogs.value = false;
    }
};

const catalogExpanded = ref<Set<string>>(new Set());

const toggleCatalogExpand = (id: string) => {
    if (catalogExpanded.value.has(id)) {
        catalogExpanded.value.delete(id);
    } else {
        catalogExpanded.value.add(id);
    }
    catalogExpanded.value = new Set(catalogExpanded.value);
};

/** Flatten tree for display */
const flattenCatalogTree = (items: any[], level = 0): any[] => {
    const result: any[] = [];
    for (const item of items) {
        const hasChildren = item.children && item.children.length > 0;
        result.push({ ...item, _level: level, _hasChildren: hasChildren });
        if (hasChildren && catalogExpanded.value.has(item.id)) {
            result.push(...flattenCatalogTree(item.children, level + 1));
        }
    }
    return result;
};

const filteredCatalogs = computed(() => {
    let items = catalogItems.value;
    if (catalogSearch.value) {
        const q = catalogSearch.value.toLowerCase();
        // For search, flatten everything and filter
        const flatten = (arr: any[]): any[] => {
            const result: any[] = [];
            for (const item of arr) {
                result.push(item);
                if (item.children) result.push(...flatten(item.children));
            }
            return result;
        };
        return flatten(items).filter((item: any) =>
            (item.ten && item.ten.toLowerCase().includes(q)) || 
            (item.ma && item.ma.toLowerCase().includes(q))
        ).map((item: any) => ({ ...item, _level: item.cap || 0, _hasChildren: false }));
    }
    return flattenCatalogTree(items);
});
</script>

<template>
    <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-sm font-semibold text-gray-600 mb-4">Thao tác thủ công</h3>

        <div class="flex flex-wrap gap-3">
            <!-- Ping API -->
            <el-button @click="handlePing" :loading="pinging" type="info" plain>
                🏓 Ping API Cổng TXNG
            </el-button>

            <!-- Refresh Token -->
            <el-button @click="handleRefreshToken" :loading="refreshing" type="primary" plain>
                🔑 Refresh Token
            </el-button>

            <!-- Sync Catalogs -->
            <el-button @click="handleSyncCatalogs" :loading="syncingCatalogs" type="success" plain>
                📋 Đồng bộ danh mục
            </el-button>

            <!-- View Synced Catalogs -->
            <el-button @click="handleViewCatalogs" type="success">
                👁️ Xem danh mục đã đồng bộ
            </el-button>

            <!-- Retry All Failed -->
            <el-button @click="handleRetryAll" :loading="retryingAll" type="warning" plain>
                🔄 Retry tất cả lỗi
            </el-button>
        </div>

        <!-- Dialog Trình xem Danh mục TXNG (Tree) -->
        <el-dialog v-model="showCatalogModal" title="📋 Danh mục Ngành hàng Cổng TXNG Quốc gia" width="750px">
            <div class="space-y-4" v-loading="loadingCatalogs">
                <div class="flex justify-between items-center">
                    <el-input 
                        v-model="catalogSearch" 
                        placeholder="Tìm kiếm ngành hàng / nhóm sản phẩm..." 
                        prefix-icon="Search"
                        clearable
                        style="max-width: 320px;"
                    />
                    <span class="text-xs text-gray-500">Tổng cộng: <strong>{{ filteredCatalogs.length }}</strong> ngành hàng</span>
                </div>

                <el-table :data="filteredCatalogs" stripe border max-height="400" size="small">
                    <el-table-column label="Mã Ngành" width="140" align="center">
                        <template #default="{ row }">
                            <span class="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded">{{ row.ma || row.id?.substring(0, 8) }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="Tên Ngành hàng / Nhóm sản phẩm (Chuẩn Cổng Quốc gia)">
                        <template #default="{ row }">
                            <div :style="{ paddingLeft: (row._level || 0) * 20 + 'px' }" class="flex items-center gap-1">
                                <template v-if="row._hasChildren">
                                    <span 
                                        class="cursor-pointer text-gray-500 hover:text-blue-500 select-none w-4 inline-block text-center"
                                        @click="toggleCatalogExpand(row.id)"
                                    >
                                        {{ catalogExpanded.has(row.id) ? '▼' : '▶' }}
                                    </span>
                                </template>
                                <span v-else-if="row._level > 0" class="text-gray-300 w-4 inline-block text-center">└</span>
                                <span v-else class="w-4 inline-block"></span>
                                <span class="font-medium text-gray-800">{{ row.ten }}</span>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column v-if="!catalogSearch" label="Cấp" width="70" align="center">
                        <template #default="{ row }">
                            <el-tag size="small" :type="row._level === 0 ? 'primary' : 'info'">
                                {{ row._level === 0 ? 'Gốc' : `C${row._level}` }}
                            </el-tag>
                        </template>
                    </el-table-column>
                </el-table>

                <div v-if="!loadingCatalogs && filteredCatalogs.length === 0" class="text-center py-4">
                    <p class="text-gray-400 text-sm">Chưa có dữ liệu. Bấm "📋 Đồng bộ danh mục" trước.</p>
                </div>
            </div>
        </el-dialog>

        <!-- Ping Result -->
        <div v-if="pingResult" class="mt-4 p-3 bg-gray-50 rounded text-sm">
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <span class="text-gray-500">SSO Server:</span>
                    <span :class="pingResult.ssoReachable ? 'text-green-600' : 'text-red-500'" class="ml-2 font-medium">
                        {{ pingResult.ssoReachable ? '✓ Reachable' : '✗ Unreachable' }}
                    </span>
                </div>
                <div>
                    <span class="text-gray-500">API Server:</span>
                    <span :class="pingResult.apiReachable ? 'text-green-600' : 'text-red-500'" class="ml-2 font-medium">
                        {{ pingResult.apiReachable ? '✓ Reachable' : '✗ Unreachable' }}
                    </span>
                </div>
                <div>
                    <span class="text-gray-500">Latency:</span>
                    <span class="ml-2 font-medium">{{ pingResult.latencyMs }}ms</span>
                </div>
            </div>
        </div>
    </div>
</template>
