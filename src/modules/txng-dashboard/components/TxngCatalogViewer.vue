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

const currentItems = computed(() => {
    const items = allData.value[activeTab.value] || [];
    if (!search.value) return items;
    const q = search.value.toLowerCase();
    return items.filter((item: any) =>
        (item.ten && item.ten.toLowerCase().includes(q)) ||
        (item.ma && item.ma.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q))
    );
});

const currentType = computed(() => {
    const s = summaryList.value.find(s => s.key === activeTab.value);
    return s?.type || 'flat';
});

const syncingSingle = ref(false);
const handleSyncSingle = async () => {
    syncingSingle.value = true;
    try {
        await txngApi.syncCatalogByKey(activeTab.value);
        ElMessage.success(`Đồng bộ ${CATALOG_LABELS[activeTab.value] || activeTab.value} thành công`);
        await loadCatalogs();
    } catch {
        ElMessage.error('Đồng bộ thất bại');
    } finally {
        syncingSingle.value = false;
    }
};

/** Render tree items as flat list with indent */
const flattenTree = (items: any[], level = 0): any[] => {
    const result: any[] = [];
    for (const item of items) {
        result.push({ ...item, _level: level });
        if (item.children && item.children.length > 0) {
            result.push(...flattenTree(item.children, level + 1));
        }
    }
    return result;
};

const displayItems = computed(() => {
    const items = currentItems.value;
    if (currentType.value === 'tree') {
        return flattenTree(items);
    }
    return items;
});
</script>

<template>
    <el-dialog
        :model-value="visible"
        @update:model-value="emit('update:visible', $event)"
        title="📋 Danh mục TXNG Quốc gia"
        width="900px"
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
                    @click="activeTab = s.key; search = ''"
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
            <el-table :data="displayItems" stripe border max-height="450" size="small">
                <el-table-column label="Mã" width="320" align="center">
                    <template #default="{ row }">
                        <span class="font-mono text-xs font-bold bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                            {{ row.ma || row.id }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column label="Tên">
                    <template #default="{ row }">
                        <div :style="{ paddingLeft: (row._level || 0) * 20 + 'px' }">
                            <span v-if="row._level > 0" class="text-gray-400 mr-1">└</span>
                            <span class="font-medium text-gray-800">{{ row.ten }}</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column v-if="currentType === 'tree'" label="Cấp" width="80" align="center">
                    <template #default="{ row }">
                        <el-tag size="small" :type="row._level === 0 ? 'primary' : 'info'">
                            {{ row._level === 0 ? 'Gốc' : `Cấp ${row._level}` }}
                        </el-tag>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </el-dialog>
</template>
