<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import txngApi from '@/api/txngApi';
import { ElMessage } from 'element-plus';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', val: boolean): void }>();

const loading = ref(false);
const items = ref<any[]>([]);
const search = ref('');

// Tab: chung / xuatKhau / noiDia
const activeType = ref<'vungTrong' | 'vungTrongXuatKhau' | 'vungTrongNoiDia'>('vungTrong');

const typeOptions = [
    { key: 'vungTrong', label: 'Tất cả vùng trồng' },
    { key: 'vungTrongXuatKhau', label: 'Xuất khẩu' },
    { key: 'vungTrongNoiDia', label: 'Nội địa' },
];

const loadData = async () => {
    loading.value = true;
    try {
        const res = await txngApi.getCatalogByKey(activeType.value);
        items.value = res.data?.items || [];
    } catch {
        ElMessage.error('Không thể tải danh sách vùng trồng');
    } finally {
        loading.value = false;
    }
};

watch(() => props.visible, (val) => {
    if (val) loadData();
});

watch(activeType, () => loadData());

const filteredItems = computed(() => {
    if (!search.value) return items.value;
    const q = search.value.toLowerCase();
    return items.value.filter((item: any) =>
        (item.ten && item.ten.toLowerCase().includes(q)) ||
        (item.ma && item.ma.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q))
    );
});

const syncingSingle = ref(false);
const handleSync = async () => {
    syncingSingle.value = true;
    try {
        await txngApi.syncCatalogByKey(activeType.value);
        ElMessage.success('Đồng bộ vùng trồng thành công');
        await loadData();
    } catch {
        ElMessage.error('Đồng bộ thất bại');
    } finally {
        syncingSingle.value = false;
    }
};
</script>

<template>
    <el-dialog
        :model-value="visible"
        @update:model-value="emit('update:visible', $event)"
        title="🌱 Danh sách mã Vùng trồng"
        width="800px"
        destroy-on-close
    >
        <div class="space-y-4" v-loading="loading">
            <!-- Type tabs -->
            <div class="flex items-center gap-3 pb-3 border-b">
                <el-radio-group v-model="activeType" size="small">
                    <el-radio-button
                        v-for="opt in typeOptions"
                        :key="opt.key"
                        :value="opt.key"
                    >
                        {{ opt.label }}
                    </el-radio-button>
                </el-radio-group>
            </div>

            <!-- Toolbar -->
            <div class="flex justify-between items-center gap-3">
                <el-input
                    v-model="search"
                    placeholder="Tìm kiếm vùng trồng..."
                    clearable
                    size="small"
                    style="max-width: 300px;"
                    prefix-icon="Search"
                />
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500">{{ filteredItems.length }} vùng trồng</span>
                    <el-button size="small" type="success" plain :loading="syncingSingle" @click="handleSync">
                        🔄 Đồng bộ
                    </el-button>
                </div>
            </div>

            <!-- Table -->
            <el-table :data="filteredItems" stripe border max-height="420" size="small">
                <el-table-column type="index" label="#" width="50" align="center" />
                <el-table-column label="Mã vùng trồng" width="320" align="center">
                    <template #default="{ row }">
                        <span class="font-mono text-xs font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded whitespace-nowrap">
                            {{ row.ma || row.id }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column label="Tên vùng trồng">
                    <template #default="{ row }">
                        <span class="font-medium text-gray-800">{{ row.ten }}</span>
                    </template>
                </el-table-column>
            </el-table>

            <!-- Empty -->
            <div v-if="!loading && filteredItems.length === 0" class="text-center py-6 text-gray-400">
                <p>Chưa có dữ liệu. Nhấn <strong>Đồng bộ</strong> để tải từ Cổng TXNG.</p>
            </div>
        </div>
    </el-dialog>
</template>
