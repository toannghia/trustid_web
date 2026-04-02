<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { shipmentV2Api } from '../api/shipmentV2Api';
import { dealerApi, type DealerDto } from '../api/dealerApi';
import { transportApi } from '../api/transportApi';
import { supplyApi } from '../api/supplyApi';
import { ElMessage } from 'element-plus';
import { Box, Van, User, OfficeBuilding, Memo } from '@element-plus/icons-vue';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'created']);

const loading = ref(false);
const dealers = ref<DealerDto[]>([]);
const warehouses = ref<any[]>([]);
const batches = ref<any[]>([]);
const vehicles = ref<any[]>([]);
const drivers = ref<any[]>([]);

const form = reactive({
    type: 'INTERNAL_TRANSFER',
    source_warehouse_id: '',
    destination_warehouse_id: '',
    dealer_id: '',
    batch_id: '',
    quantity: 1,
    notes: '',
    driver_id: '',
    vehicle_id: '',
    vehicle_plate: ''
});

const handleClose = () => {
    emit('update:modelValue', false);
};

const fetchData = async () => {
    try {
        const [wRes, dRes, bRes, vRes] = await Promise.all([
            transportApi.getWarehouses(),
            dealerApi.getList(),
            supplyApi.getBatches(),
            transportApi.getVehicles()
        ]);
        warehouses.value = wRes.data;
        dealers.value = dRes.data;
        batches.value = bRes.data;
        vehicles.value = vRes.data;
        
        // Mocking drivers for now or fetch from user management
        // For production, this should be a real API
    } catch (e) {
        console.error(e);
    }
};

const onVehicleChange = (val: string) => {
    const v = vehicles.value.find(x => x.id === val);
    if (v) {
        form.vehicle_plate = v.plateNumber;
        form.driver_id = v.driverId; // Auto-assign if vehicle has a driver
    }
};

const submit = async () => {
    loading.value = true;
    try {
        if (form.type === 'INTERNAL_TRANSFER') {
            await shipmentV2Api.createInternal({
                source_warehouse_id: form.source_warehouse_id,
                destination_warehouse_id: form.destination_warehouse_id,
                batch_id: form.batch_id || undefined,
                notes: form.notes,
                driver_id: form.driver_id,
                vehicle_id: form.vehicle_id,
                vehicle_plate: form.vehicle_plate
            });
        } else {
            await shipmentV2Api.createDealerExport({
                dealer_id: form.dealer_id,
                source_warehouse_id: form.source_warehouse_id,
                batch_id: form.batch_id || undefined,
                quantity: form.quantity,
                notes: form.notes
            });
        }
        ElMessage.success('Tạo yêu cầu xuất kho thành công');
        emit('created');
        handleClose();
    } catch (e: any) {
        ElMessage.error('Lỗi khi tạo: ' + (e.response?.data?.message || e.message));
    } finally {
        loading.value = false;
    }
};

onMounted(fetchData);
</script>

<template>
    <el-dialog 
        :model-value="modelValue" 
        @update:model-value="handleClose"
        title="Tạo yêu cầu Xuất kho / Chuyển kho"
        width="650px"
        destroy-on-close
    >
        <el-form :model="form" label-width="140px" v-loading="loading">
            <el-form-item label="Loại nghiệp vụ" required>
                <el-radio-group v-model="form.type">
                    <el-radio-button label="INTERNAL_TRANSFER">Chuyển kho nội bộ</el-radio-button>
                    <el-radio-button label="DEALER_EXPORT">Xuất bán Đại lý</el-radio-button>
                </el-radio-group>
            </el-form-item>

            <el-divider content-position="left">Thông tin nguồn & Đích</el-divider>

            <el-form-item label="Kho xuất" required>
                <el-select v-model="form.source_warehouse_id" placeholder="Chọn kho đi" class="w-full">
                    <el-option v-for="w in warehouses" :key="w.id" :label="`${w.name} (${w.type})`" :value="w.id" />
                </el-select>
            </el-form-item>

            <el-form-item v-if="form.type === 'INTERNAL_TRANSFER'" label="Kho nhận" required>
                <el-select v-model="form.destination_warehouse_id" placeholder="Chọn kho đến" class="w-full">
                    <el-option v-for="w in warehouses.filter(x => x.id !== form.source_warehouse_id)" :key="w.id" :label="w.name" :value="w.id" />
                </el-select>
            </el-form-item>

            <el-form-item v-if="form.type === 'DEALER_EXPORT'" label="Đại lý nhận" required>
                <el-select v-model="form.dealer_id" placeholder="Chọn đại lý" class="w-full" filterable>
                    <el-option v-for="d in dealers" :key="d.id" :label="d.name" :value="d.id" />
                </el-select>
            </el-form-item>

            <el-divider content-position="left">Chi tiết hàng hóa</el-divider>

            <el-form-item label="Theo lô hàng">
                <el-select v-model="form.batch_id" placeholder="Chọn lô (Nếu xuất cả bô)" class="w-full" clearable>
                    <el-option v-for="b in batches" :key="b.id" :label="`${b.batchCode} - ${b.product?.name}`" :value="b.id" />
                </el-select>
                <div class="text-xs text-gray-400 mt-1 italic">Để trống nếu muốn quét lẻ nhiều lô khác nhau</div>
            </el-form-item>

            <el-form-item v-if="form.type === 'DEALER_EXPORT'" label="Số lượng dự kiến" required>
                <el-input-number v-model="form.quantity" :min="1" />
                <span class="ml-2 text-gray-400 text-sm">(Thủ kho sẽ quét đủ số lượng này)</span>
            </el-form-item>

            <el-divider v-if="form.type === 'INTERNAL_TRANSFER'" content-position="left">Vận chuyển</el-divider>

            <div v-if="form.type === 'INTERNAL_TRANSFER'" class="bg-gray-50 p-4 rounded-lg mb-4">
                <el-form-item label="Phương tiện">
                    <el-select v-model="form.vehicle_id" placeholder="Chọn xe" class="w-full" @change="onVehicleChange">
                        <el-option v-for="v in vehicles" :key="v.id" :label="`${v.plateNumber} (${v.type})`" :value="v.id" />
                    </el-select>
                </el-form-item>
                <el-form-item label="Lái xe">
                    <el-input v-model="form.driver_id" placeholder="Hệ thống tự nhận từ xe hoặc nhập ID" />
                </el-form-item>
            </div>

            <el-form-item label="Ghi chú">
                <el-input v-model="form.notes" type="textarea" placeholder="Nội dung yêu cầu..." />
            </el-form-item>
        </el-form>

        <template #footer>
            <el-button @click="handleClose">Hủy bỏ</el-button>
            <el-button type="primary" :loading="loading" @click="submit" :disabled="!form.source_warehouse_id">
                Xác nhận tạo
            </el-button>
        </template>
    </el-dialog>
</template>
