<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import txngApi from '@/api/txngApi';
import { ElMessage } from 'element-plus';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', val: boolean): void }>();

interface CatalogSummary {
    key: string;
    count: number;
    type: 'flat' | 'tree';
}

const CATALOG_LABELS: Record<string, string> = {
    nganhHang: 'Ngành hàng',
    vungTrong: 'Vùng trồng',
    vungTrongXuatKhau: 'Vùng trồng xuất khẩu',
    vungTrongNoiDia: 'Vùng trồng nội địa',
    quyCachDongGoi: 'Quy cách đóng gói',
    nhomThiTruong: 'Nhóm thị trường tiêu thụ',
    maHsGiongCay: 'Mã HS giống cây trồng',
    maHsThuocBVTV: 'Thuốc BVTV (Mã HS)',
    maHsPhanBon: 'Phân bón (Mã HS)',
};

const loading = ref(false);
const allData = ref<Record<string, any>>({});
const summaryList = ref<CatalogSummary[]>([]);
const activeTab = ref('nganhHang');
const search = ref('');

const loadCatalogs = async () => {
    loading.value = true;
    try {
        const res = await txngApi.getCatalogs();
        const data = res.data;
        summaryList.value = data.summary || [];
        // Store all catalog data
        delete data.summary;
        allData.value = data;
    } catch {
        ElMessage.error('Không thể tải danh mục');
    } finally {
        loading.value = false;
    }
};

watch(() => props.visible, (val) => {
    if (val) loadCatalogs();
});

// ========== Tree expand/collapse state ==========
const expandedIds = ref<Set<string>>(new Set());

const toggleExpand = (id: string) => {
    if (expandedIds.value.has(id)) {
        expandedIds.value.delete(id);
    } else {
        expandedIds.value.add(id);
    }
    // Force reactivity
    expandedIds.value = new Set(expandedIds.value);
};

const expandAll = () => {
    const ids = new Set<string>();
    const collectIds = (items: any[]) => {
        for (const item of items) {
            if (item.children && item.children.length > 0) {
                ids.add(item.id);
                collectIds(item.children);
            }
        }
    };
    collectIds(allData.value[activeTab.value] || []);
    expandedIds.value = ids;
};

const collapseAll = () => {
    expandedIds.value = new Set();
};

// ========== Filter + flatten ==========
const currentType = computed(() => {
    const s = summaryList.value.find(s => s.key === activeTab.value);
    return s?.type || 'flat';
});

/** Flatten tree items respecting expand state */
const flattenTree = (items: any[], level = 0): any[] => {
    const result: any[] = [];
    for (const item of items) {
        const hasChildren = item.children && item.children.length > 0;
        result.push({ ...item, _level: level, _hasChildren: hasChildren });
        if (hasChildren && expandedIds.value.has(item.id)) {
            result.push(...flattenTree(item.children, level + 1));
        }
    }
    return result;
};

/** Search within tree (return matching items + ancestors) */
const filterTree = (items: any[], query: string): any[] => {
    const result: any[] = [];
    for (const item of items) {
        const matches = 
            (item.ten && item.ten.toLowerCase().includes(query)) ||
            (item.ma && item.ma.toLowerCase().includes(query)) ||
            (item.id && item.id.toLowerCase().includes(query));
        
        let filteredChildren: any[] = [];
        if (item.children && item.children.length > 0) {
            filteredChildren = filterTree(item.children, query);
        }

        if (matches || filteredChildren.length > 0) {
            result.push({
                ...item,
                children: filteredChildren.length > 0 ? filteredChildren : item.children,
            });
        }
    }
    return result;
};

const displayItems = computed(() => {
    let items = allData.value[activeTab.value] || [];
    
    if (currentType.value === 'tree') {
        if (search.value) {
            items = filterTree(items, search.value.toLowerCase());
        }
        return flattenTree(items);
    }
    
    // Flat filtering
    if (search.value) {
        const q = search.value.toLowerCase();
        items = items.filter((item: any) =>
            (item.ten && item.ten.toLowerCase().includes(q)) ||
            (item.ma && item.ma.toLowerCase().includes(q)) ||
            (item.id && item.id.toLowerCase().includes(q))
        );
    }
    return items;
});

// ========== Sync ==========
const syncingSingle = ref(false);
const handleSyncSingle = async () => {
    syncingSingle.value = true;
    try {
        const res = await txngApi.syncCatalogByKey(activeTab.value);
        const count = res.data?.count || 0;
        if (count > 0) {
            ElMessage.success(`Đồng bộ ${CATALOG_LABELS[activeTab.value] || activeTab.value} thành công: ${count} mục`);
        } else {
            ElMessage.warning(`Đồng bộ ${CATALOG_LABELS[activeTab.value] || activeTab.value}: API trả về 0 mục. Kiểm tra kết nối Cổng TXNG.`);
        }
        await loadCatalogs();
    } catch {
        ElMessage.error('Đồng bộ thất bại');
    } finally {
        syncingSingle.value = false;
    }
};

// ========== Detail Drawer ==========
const detailDrawerVisible = ref(false);
const detailLoading = ref(false);
const detailItem = ref<any>(null);

const showDetail = async (row: any) => {
    detailDrawerVisible.value = true;
    detailLoading.value = true;
    try {
        const res = await txngApi.getCatalogItemDetail(activeTab.value, row.id);
        detailItem.value = res.data.data;
    } catch {
        // Fallback to row data
        detailItem.value = row;
    } finally {
        detailLoading.value = false;
    }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleString('vi-VN');
    } catch {
        return dateStr;
    }
};

/** Get human-readable field labels */
const FIELD_LABELS: Record<string, string> = {
    id: 'ID',
    ma: 'Mã',
    ten: 'Tên',
    idCha: 'ID Cha',
    cap: 'Cấp',
    created: 'Ngày tạo',
    createdBy: 'Người tạo',
    modified: 'Ngày sửa',
    modifiedBy: 'Người sửa',
    parentId: 'Parent ID',
};

const detailFields = computed(() => {
    if (!detailItem.value) return [];
    const skipKeys = ['children', '_level', '_hasChildren', '__v'];
    return Object.entries(detailItem.value)
        .filter(([key]) => !skipKeys.includes(key))
        .map(([key, value]) => ({
            label: FIELD_LABELS[key] || key,
            key,
            value: key.includes('created') || key.includes('modified') || key.includes('Created') || key.includes('Modified')
                ? formatDate(value as string) 
                : value,
        }));
});

const detailChildren = computed(() => {
    if (!detailItem.value?.children) return [];
    return detailItem.value.children;
});
</script>

<template>
    <el-dialog
        :model-value="visible"
        @update:model-value="emit('update:visible', $event)"
        title="📋 Danh mục TXNG Quốc gia"
        width="960px"
        destroy-on-close
    >
        <div class="space-y-4" v-loading="loading">
            <!-- Tab buttons for catalog types -->
            <div class="flex flex-wrap gap-1.5 pb-3 border-b">
                <el-button
                    v-for="s in summaryList"
                    :key="s.key"
                    :type="activeTab === s.key ? 'primary' : 'default'"
                    size="small"
                    @click="activeTab = s.key; search = ''; expandedIds = new Set()"
                >
                    {{ CATALOG_LABELS[s.key] || s.key }}
                    <el-badge v-if="s.count > 0" :value="s.count" :max="999" class="ml-1" />
                </el-button>
            </div>

            <!-- Toolbar -->
            <div class="flex justify-between items-center gap-3">
                <el-input
                    v-model="search"
                    placeholder="Tìm kiếm..."
                    clearable
                    size="small"
                    style="max-width: 300px;"
                    prefix-icon="Search"
                />
                <div class="flex items-center gap-2">
                    <!-- Tree expand/collapse controls -->
                    <template v-if="currentType === 'tree'">
                        <el-button size="small" text type="primary" @click="expandAll">
                            ▶ Mở hết
                        </el-button>
                        <el-button size="small" text type="info" @click="collapseAll">
                            ▼ Thu gọn
                        </el-button>
                    </template>
                    <span class="text-xs text-gray-500">
                        {{ displayItems.length }} mục
                        <template v-if="currentType === 'tree'"> (dạng cây)</template>
                    </span>
                    <el-button size="small" type="success" plain :loading="syncingSingle" @click="handleSyncSingle">
                        🔄 Đồng bộ lại
                    </el-button>
                </div>
            </div>

            <!-- Table -->
            <el-table 
                :data="displayItems" 
                stripe 
                border 
                max-height="450" 
                size="small"
                highlight-current-row
                @row-click="showDetail"
                class="cursor-pointer"
            >
                <el-table-column label="Mã" width="200" align="center">
                    <template #default="{ row }">
                        <span class="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                            {{ row.ma || row.id }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column label="Tên">
                    <template #default="{ row }">
                        <div :style="{ paddingLeft: (row._level || 0) * 24 + 'px' }" class="flex items-center gap-1">
                            <!-- Tree expand/collapse icon -->
                            <template v-if="row._hasChildren">
                                <span 
                                    class="cursor-pointer text-gray-500 hover:text-blue-500 select-none w-4 inline-block text-center"
                                    @click.stop="toggleExpand(row.id)"
                                >
                                    {{ expandedIds.has(row.id) ? '▼' : '▶' }}
                                </span>
                            </template>
                            <span v-else-if="row._level > 0" class="text-gray-300 mr-1 w-4 inline-block text-center">└</span>
                            <span v-else class="w-4 inline-block"></span>
                            <span class="font-medium text-gray-800">{{ row.ten }}</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column v-if="currentType === 'tree'" label="Cấp" width="80" align="center">
                    <template #default="{ row }">
                        <el-tag size="small" :type="row._level === 0 ? 'primary' : row._level === 1 ? 'success' : 'info'">
                            {{ row._level === 0 ? 'Gốc' : `Cấp ${row._level}` }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="" width="60" align="center">
                    <template #default>
                        <el-button link type="primary" size="small">
                            Chi tiết
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!-- Empty state when no data synced -->
            <div v-if="!loading && displayItems.length === 0" class="text-center py-8">
                <p class="text-gray-400 text-sm mb-2">Chưa có dữ liệu. Bấm "Đồng bộ lại" để lấy từ Cổng TXNG Quốc gia.</p>
            </div>
        </div>
    </el-dialog>

    <!-- Detail Drawer -->
    <el-drawer
        v-model="detailDrawerVisible"
        :title="`📄 Chi tiết: ${detailItem?.ten || ''}`"
        size="420px"
        direction="rtl"
    >
        <div v-loading="detailLoading" class="space-y-4">
            <template v-if="detailItem">
                <!-- Basic info -->
                <el-descriptions :column="1" border size="small">
                    <el-descriptions-item 
                        v-for="field in detailFields" 
                        :key="field.key"
                        :label="field.label"
                    >
                        <template v-if="field.key === 'cap'">
                            <el-tag size="small" :type="field.value === 0 ? 'primary' : 'success'">
                                {{ field.value === 0 ? 'Gốc' : `Cấp ${field.value}` }}
                            </el-tag>
                        </template>
                        <template v-else-if="field.key === 'id' || field.key === 'idCha'">
                            <span class="font-mono text-xs text-gray-500 break-all">{{ field.value || '—' }}</span>
                        </template>
                        <template v-else>
                            <span>{{ field.value ?? '—' }}</span>
                        </template>
                    </el-descriptions-item>
                </el-descriptions>

                <!-- Children list -->
                <div v-if="detailChildren.length > 0">
                    <h4 class="text-sm font-semibold text-gray-600 mb-2">
                        📂 Danh mục con ({{ detailChildren.length }})
                    </h4>
                    <el-table :data="detailChildren" stripe border size="small" max-height="250">
                        <el-table-column label="Mã" width="120" align="center">
                            <template #default="{ row }">
                                <span class="font-mono text-xs font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                                    {{ row.ma || row.id?.substring(0, 8) }}
                                </span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="ten" label="Tên">
                            <template #default="{ row }">
                                <span 
                                    class="text-blue-600 cursor-pointer hover:underline"
                                    @click="showDetail(row)"
                                >
                                    {{ row.ten }}
                                </span>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </template>
        </div>
    </el-drawer>
</template>
