<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Bán hàng & Tiêu thụ (Retail)</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- SCAN & CART -->
        <div class="lg:col-span-1 space-y-6">
            <!-- SCANNER -->
            <div class="bg-white p-6 shadow-sm rounded-lg border border-blue-100">
                <h3 class="font-bold mb-4 text-blue-700 flex items-center">
                    <el-icon class="mr-2"><FullScreen /></el-icon> Quét sản phẩm
                </h3>
                <div class="flex space-x-2 mb-4">
                    <el-input v-model="scanInput" placeholder="Nhập serial hoặc quét QR..." @keyup.enter="handleScan" clearable>
                        <template #append>
                            <el-button @click="handleScan" icon="Search" />
                        </template>
                    </el-input>
                </div>
                <div class="text-xs text-center text-gray-400">Giao diện giả lập quét QR bằng Serial number</div>
            </div>

            <!-- CART -->
            <div class="bg-white p-6 shadow-sm rounded-lg border">
                <h3 class="font-bold mb-4 flex justify-between items-center">
                    <span>Giỏ hàng</span>
                    <el-tag v-if="cart.length" type="success" size="small">{{ cart.length }} mục</el-tag>
                </h3>
                
                <el-empty v-if="cart.length === 0" description="Giỏ hàng trống" :image-size="60" />

                <div v-else class="space-y-3 mb-6">
                    <div v-for="(item, idx) in cart" :key="idx" class="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                            <div class="font-bold text-sm">{{ item.batch?.product?.name }}</div>
                            <div class="text-xs text-gray-500">SN: {{ item.serialNumber }}</div>
                        </div>
                        <el-button type="danger" link icon="Delete" @click="removeFromCart(idx)" />
                    </div>
                </div>

                <div v-if="cart.length" class="border-t pt-4">
                    <el-form label-position="top">
                        <el-form-item label="Khách hàng (Tên)">
                            <el-input v-model="saleForm.customer_name" placeholder="Tên khách..." />
                        </el-form-item>
                        <el-form-item label="Số điện thoại">
                            <el-input v-model="saleForm.customer_phone" placeholder="SĐT..." />
                        </el-form-item>
                        <el-button type="primary" class="w-full" size="large" @click="submitSale" :loading="loading">
                             XÁC NHẬN BÁN HÀNG
                        </el-button>
                    </el-form>
                </div>
            </div>
        </div>

        <!-- HISTORY -->
        <div class="lg:col-span-2">
            <div class="bg-white p-6 shadow-sm rounded-lg border">
                 <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-gray-700">Lịch sử bán hàng gần đây</h3>
                    <el-button icon="Refresh" size="small" @click="loadSales">Làm mới</el-button>
                </div>

                <el-table :data="sales" border stripe size="small">
                    <el-table-column prop="saleCode" label="Mã đơn" width="150" />
                    <el-table-column label="Khách hàng">
                        <template #default="{row}">
                            {{ row.customerName || 'Khách lẻ' }}<br/>
                            <small class="text-gray-400">{{ row.customerPhone || '' }}</small>
                        </template>
                    </el-table-column>
                    <el-table-column prop="totalItems" label="SL" width="60" align="center" />
                    <el-table-column prop="createdAt" label="Thời gian" width="160">
                        <template #default="{row}">{{ new Date(row.createdAt).toLocaleString() }}</template>
                    </el-table-column>
                </el-table>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { FullScreen, Search, Delete, Refresh } from '@element-plus/icons-vue';
import { retailApi } from '../api/retailApi';
import { ElMessage, ElMessageBox } from 'element-plus';

const scanInput = ref('');
const loading = ref(false);
const cart = ref<any[]>([]);
const sales = ref<any[]>([]);

const saleForm = ref({
    customer_name: '',
    customer_phone: '',
    warehouse_id: 'default' // Will be set from user context normally
});

onMounted(() => {
    loadSales();
});

const loadSales = async () => {
    try {
        const res = await retailApi.getSales();
        sales.value = res.data;
    } catch (e) {}
};

const handleScan = async () => {
    if (!scanInput.value) return;
    
    // Check if already in cart
    if (cart.value.find(x => x.serialNumber === scanInput.value)) {
        ElMessage.warning('Sản phẩm này đã có trong giỏ hàng');
        scanInput.value = '';
        return;
    }

    try {
        loading.value = true;
        const res = await retailApi.scanItem(scanInput.value);
        if (res.data.status === 'SOLD') {
            ElMessage.error('Sản phẩm đã được bán trước đó!');
        } else {
            cart.value.push(res.data);
            ElMessage.success(`Đã thêm: ${res.data.batch?.product?.name}`);
        }
        scanInput.value = '';
    } catch (e) {
        ElMessage.error('Không tìm thấy sản phẩm!');
    } finally {
        loading.value = false;
    }
};

const removeFromCart = (idx: number) => {
    cart.value.splice(idx, 1);
};

const submitSale = async () => {
    if (!cart.value.length) return;
    
    try {
        await ElMessageBox.confirm('Xác nhận hoàn tất đơn bán hàng?', 'Xác nhận bán');
        loading.value = true;
        
        // Mock warehouse_id selection (In real app, get from user profile)
        const warehouseId = 'fcc6c986-e717-48f5-934c-6e69315053ca'; // Mock from existing data if possible
        
        const payload = {
            ...saleForm.value,
            warehouse_id: warehouseId,
            item_serials: cart.value.map(x => x.serialNumber)
        };

        await retailApi.createSale(payload);
        ElMessage.success('Bán hàng thành công!');
        cart.value = [];
        saleForm.value.customer_name = '';
        saleForm.value.customer_phone = '';
        loadSales();
    } catch (e) {
        if (e !== 'cancel') ElMessage.error('Lỗi khi lưu đơn bán hàng');
    } finally {
        loading.value = false;
    }
};
</script>
