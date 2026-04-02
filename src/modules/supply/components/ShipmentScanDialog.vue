<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { shipmentV2Api } from '../api/shipmentV2Api';
import { ElMessage, ElNotification } from 'element-plus';
import { Aim, FullScreen, CircleCheck, Warning, Box } from '@element-plus/icons-vue';

const props = defineProps<{
    modelValue: boolean;
    shipmentId: string;
    trackingCode?: string;
}>();

const emit = defineEmits(['update:modelValue', 'scanned']);

const scanInput = ref('');
const loading = ref(false);
const scannedItems = ref<any[]>([]);
const shipment = ref<any>(null);

const loadData = async () => {
    try {
        const res = await shipmentV2Api.getDetail(props.shipmentId);
        shipment.value = res.data;
        scannedItems.value = res.data.scannedItems?.map((i: any) => ({
            qr: i.itemSerials[0],
            method: i.scanMethod,
            time: new Date(i.scannedAt),
            serial: i.itemSerials[0]
        })) || [];
    } catch (e) {
        ElMessage.error('Lỗi tải thông tin phiếu');
    }
};

const handleOpen = () => {
    loadData();
};

const handleClose = () => {
    emit('update:modelValue', false);
};

const handleScan = async () => {
    if (!scanInput.value) return;
    loading.value = true;
    try {
        const { data } = await shipmentV2Api.scanItem(props.shipmentId, scanInput.value);
        
        if (data.method === 'BOX') {
            ElNotification({
                title: 'Đã nhận Thùng',
                message: `Tự động nhận ${data.count} sản phẩm trong thùng ${scanInput.value}`,
                type: 'success'
            });
        } else {
            ElMessage.success(`Đã nhận: ${data.serial}`);
        }
        
        scannedItems.value.unshift({
            qr: scanInput.value,
            method: data.method,
            time: new Date(),
            serial: data.serial,
            count: data.count
        });

        scanInput.value = '';
        loadData(); // Reload to update totals/progress
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi quét mã');
    } finally {
        loading.value = false;
    }
};

const progress = computed(() => {
    if (!shipment.value?.expectedItems || shipment.value.expectedItems.length === 0) return 0;
    const totalExpected = shipment.value.expectedItems.reduce((sum: number, i: any) => sum + i.quantity, 0);
    const totalScanned = scannedItems.value.length;
    return Math.min(Math.round((totalScanned / totalExpected) * 100), 100);
});

const totalExpected = computed(() => {
    return shipment.value?.expectedItems?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0;
});

const confirmFinish = () => {
    emit('scanned');
    handleClose();
};

</script>

<template>
    <el-dialog 
        :model-value="modelValue" 
        @update:model-value="handleClose"
        @open="handleOpen"
        title="Quét mã Vận đơn - Xuất kho"
        width="900px"
        destroy-on-close
    >
        <div class="scan-container" v-if="shipment">
            <div class="mb-6 bg-gray-50 p-5 rounded-2xl border border-blue-50">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Mã vận đơn</div>
                        <div class="font-mono text-xl text-blue-800 font-bold">{{ trackingCode || shipment.trackingCode }}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Tiến độ quét</div>
                        <div class="flex items-center gap-2">
                             <span class="font-bold text-lg" :class="scannedItems.length >= totalExpected ? 'text-green-600' : 'text-blue-600'">
                                {{ scannedItems.length }} / {{ totalExpected }}
                             </span>
                             <el-tag v-if="scannedItems.length >= totalExpected" type="success" effect="dark" round size="small">Đủ SL</el-tag>
                        </div>
                    </div>
                </div>
                <el-progress :percentage="progress" :stroke-width="12" :color="scannedItems.length >= totalExpected ? '#10b981' : '#3b82f6'" striped striped-flow />
            </div>

            <div class="flex gap-4 items-center mb-6">
                <el-input 
                    v-model="scanInput" 
                    placeholder="Quét mã QR sản phẩm hoặc mã Thùng..." 
                    size="large"
                    class="scan-input"
                    @keyup.enter="handleScan"
                    :prefix-icon="FullScreen"
                >
                    <template #append>
                        <el-button type="primary" :icon="Aim" @click="handleScan" :loading="loading">Xác nhận</el-button>
                    </template>
                </el-input>
            </div>

            <div class="grid grid-cols-3 gap-4">
                <div class="col-span-1">
                    <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 h-full flex flex-col justify-center items-center">
                        <el-icon :size="40" class="mb-2 text-blue-200"><Box /></el-icon>
                        <div class="text-3xl font-bold text-gray-800">{{ scannedItems.length }}</div>
                        <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Đã quét</div>
                    </div>
                </div>
                <!-- Log -->
                <div class="col-span-2">
                    <div class="border rounded-xl h-64 overflow-y-auto p-2">
                        <div v-if="scannedItems.length === 0" class="h-full flex flex-col items-center justify-center text-gray-300">
                            <el-icon :size="40"><Warning /></el-icon>
                            <p class="mt-2">Chưa có dữ liệu quét</p>
                        </div>
                        <div v-for="(item, idx) in scannedItems" :key="idx" class="flex items-center justify-between p-2 border-b last:border-0 hover:bg-gray-50">
                            <div class="flex items-center gap-2">
                                <el-tag :type="item.method === 'BOX' ? 'warning' : 'success'" size="small">{{ item.method }}</el-tag>
                                <span class="text-sm font-mono">{{ item.qr }}</span>
                            </div>
                            <div class="text-xs text-gray-400">
                                {{ item.time.toLocaleTimeString() }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-between w-full">
                <div class="text-xs text-gray-400 text-left italic">
                    * Mẹo: Quét mã Thùng sẽ tự động nhận toàn bộ SP bên trong.<br/>
                    * Hệ thống tự động chặn nếu SP đã bán hoặc bị lỗi.
                </div>
                <el-button type="success" size="large" @click="confirmFinish" :icon="CircleCheck" class="px-10">Xong</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.scan-input :deep(.el-input__wrapper) {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-radius: 12px;
}
</style>
