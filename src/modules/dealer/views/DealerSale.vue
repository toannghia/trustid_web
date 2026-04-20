<template>
  <div class="dealer-sale p-6">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Bán lẻ (Bán cho khách hàng)</h2>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <el-card shadow="hover">
        <template #header>
          <div class="font-bold">1. Thông tin khách hàng (Không bắt buộc)</div>
        </template>
        <el-form :model="form" label-position="top">
          <el-form-item label="Tên khách hàng">
            <el-input v-model="form.customerName" placeholder="Khách lẻ" />
          </el-form-item>
          <el-form-item label="Số điện thoại">
            <el-input v-model="form.customerPhone" placeholder="Nhập số điện thoại" />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="hover">
        <template #header>
          <div class="font-bold">2. Quét mã sản phẩm</div>
        </template>
        <div class="flex gap-2 mb-4">
          <el-input 
            v-model="currentSerial" 
            placeholder="Nhập hoặc quét mã QR/Serial" 
            @keyup.enter="addSerial"
          />
          <el-button type="primary" @click="addSerial">Thêm</el-button>
        </div>

        <el-table :data="scannedItems" style="width: 100%" class="mb-4">
          <el-table-column type="index" width="50" />
          <el-table-column prop="serial" label="Mã Serial" />
          <el-table-column label="Thao tác" width="80" align="center">
            <template #default="{ $index }">
              <el-button type="danger" size="small" circle @click="removeSerial($index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="text-right">
          <el-button 
            type="success" 
            size="large" 
            @click="submitSale" 
            :loading="submitting"
            :disabled="scannedItems.length === 0"
          >
            Hoàn tất Bán hàng ({{ scannedItems.length }} SP)
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const form = reactive({
  customerName: '',
  customerPhone: ''
});

const currentSerial = ref('');
const scannedItems = ref<{ serial: string }[]>([]);
const submitting = ref(false);

const addSerial = () => {
  const s = currentSerial.value.trim();
  if (!s) return;
  if (scannedItems.value.find(i => i.serial === s)) {
    ElMessage.warning('Mã này đã được quét');
    currentSerial.value = '';
    return;
  }
  scannedItems.value.push({ serial: s });
  currentSerial.value = '';
};

const removeSerial = (index: number) => {
  scannedItems.value.splice(index, 1);
};

const submitSale = async () => {
  if (scannedItems.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `Xác nhận bán ${scannedItems.value.length} sản phẩm?`,
      'Xác nhận',
      { type: 'warning' }
    );

    submitting.value = true;
    const payload = {
      customerName: form.customerName || 'Khách lẻ',
      customerPhone: form.customerPhone,
      serials: scannedItems.value.map(i => i.serial)
    };

    const { data } = await api.post('/dealer-dashboard/retail-sale', payload);
    
    ElMessage.success(`Bán hàng thành công! Mã hóa đơn: ${data.receipt}`);
    
    // Reset form
    form.customerName = '';
    form.customerPhone = '';
    scannedItems.value = [];

  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || 'Lỗi khi ghi nhận bán hàng');
    }
  } finally {
    submitting.value = false;
  }
};
</script>
