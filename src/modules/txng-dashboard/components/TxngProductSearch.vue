<script setup lang="ts">
import { ref } from 'vue';
import txngApi from '@/api/txngApi';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'update:visible', val: boolean): void }>();

const gtin = ref('');
const loading = ref(false);
const product = ref<any>(null);
const error = ref('');

const handleSearch = async () => {
    if (!gtin.value.trim()) {
        ElMessage.warning('Vui lòng nhập mã GTIN');
        return;
    }
    loading.value = true;
    product.value = null;
    error.value = '';
    try {
        const res = await txngApi.getProductByGtin(gtin.value.trim());
        product.value = res.data?.data || res.data;
    } catch (e: any) {
        error.value = e?.response?.data?.message || 'Không tìm thấy sản phẩm';
    } finally {
        loading.value = false;
    }
};

const close = () => emit('update:visible', false);
</script>

<template>
    <el-dialog
        :model-value="visible"
        @update:model-value="emit('update:visible', $event)"
        title="🔍 Tra cứu sản phẩm theo mã GTIN"
        width="700px"
        destroy-on-close
    >
        <div class="space-y-4">
            <!-- Search Bar -->
            <div class="flex gap-2">
                <el-input
                    v-model="gtin"
                    placeholder="Nhập mã GTIN (VD: 8936048651234)"
                    clearable
                    size="large"
                    @keyup.enter="handleSearch"
                >
                    <template #prefix>
                        <el-icon><Search /></el-icon>
                    </template>
                </el-input>
                <el-button type="primary" size="large" :loading="loading" @click="handleSearch">
                    Tra cứu
                </el-button>
            </div>

            <!-- Error -->
            <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />

            <!-- Result -->
            <div v-if="product" class="border rounded-lg overflow-hidden">
                <div class="bg-blue-50 px-4 py-3 border-b">
                    <h4 class="font-bold text-blue-800 text-base">{{ product.ten }}</h4>
                    <p class="text-xs text-blue-600 mt-0.5">GTIN: {{ product.gtinCode || gtin }}</p>
                </div>
                <div class="p-4">
                    <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="Mã SP">
                            <span class="font-mono font-bold">{{ product.id || '—' }}</span>
                        </el-descriptions-item>
                        <el-descriptions-item label="Trạng thái">
                            <el-tag :type="product.trangThai === 1 ? 'success' : 'info'" size="small">
                                {{ product.trangThai === 1 ? 'Hoạt động' : product.trangThai === 0 ? 'Chưa kích hoạt' : product.trangThai }}
                            </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="Tổ chức">
                            <div>
                                <span class="font-medium text-gray-800">{{ product.tenToChuc || '—' }}</span>
                                <div v-if="product.idToChucHoSo" class="text-[10px] text-gray-400 font-mono mt-0.5">{{ product.idToChucHoSo }}</div>
                            </div>
                        </el-descriptions-item>
                        <el-descriptions-item label="Nhóm SP">
                            {{ product.idNhomSanPham || '—' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="Đơn vị tính">
                            {{ product.donViTinh || '—' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="Xuất xứ">
                            {{ product.xuatXu || '—' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="Mô tả" :span="2">
                            {{ product.moTa || '—' }}
                        </el-descriptions-item>
                    </el-descriptions>

                    <!-- Hình ảnh if available -->
                    <div v-if="product.hinhAnh" class="mt-3">
                        <p class="text-xs text-gray-500 mb-1">Hình ảnh:</p>
                        <el-image
                            :src="product.hinhAnh"
                            fit="contain"
                            style="max-height: 200px; max-width: 100%;"
                            :preview-src-list="[product.hinhAnh]"
                        />
                    </div>
                </div>
            </div>

            <!-- Empty state -->
            <div v-if="!product && !loading && !error" class="text-center py-8 text-gray-400">
                <el-icon :size="48" class="mb-2"><Search /></el-icon>
                <p>Nhập mã GTIN để tra cứu thông tin sản phẩm trên Cổng TXNG Quốc gia</p>
            </div>
        </div>
    </el-dialog>
</template>
