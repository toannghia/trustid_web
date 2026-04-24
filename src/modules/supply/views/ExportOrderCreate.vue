<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex items-center gap-4 mb-6">
      <el-button circle icon="Back" @click="router.back()" />
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tạo lệnh xuất kho</h1>
        <p class="text-sm text-gray-500">Nhập thông tin kho, đại lý nhận và danh sách mã sản phẩm cần xuất</p>
      </div>
    </div>

    <!-- UPPER ROW: COMPACT DETAILS & ACTION -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 flex-align-stretch">
      <!-- DETAILS LEFT -->
      <div class="md:col-span-3">
        <el-card shadow="never" class="h-full rounded-2xl border-none shadow-sm">
          <template #header>
            <div class="flex items-center gap-2 font-bold text-gray-700">
              <el-icon class="text-blue-500"><Document /></el-icon> Thông tin chung
            </div>
          </template>
          <el-form label-position="top" class="compact-form">
            <!-- TỰ ĐỘNG SINH HỆ THỐNG -->
            <div class="flex gap-8 mb-4 pb-4 border-b border-gray-100 text-sm">
              <div>
                <span class="text-gray-400">Số phiếu:</span>
                <span class="ml-2 font-mono font-bold text-blue-700">{{ form.orderCode || '[Đang lấy mã...]' }}</span>
              </div>
              <div>
                <span class="text-gray-400">Ngày tạo:</span>
                <span class="ml-2 font-semibold text-gray-800">{{ currentDate }}</span>
              </div>
              <div>
                <span class="text-gray-400">Người tạo:</span>
                <span class="ml-2 font-semibold text-gray-800">{{ currentUser.fullName || currentUser.username || 'Tài khoản' }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <el-form-item label="Đại lý (Khách hàng)" required class="col-span-2">
                <el-select v-model="form.dealerId" class="w-full" filterable placeholder="Tìm và chọn đại lý...">
                  <el-option v-for="d in dealers" :key="d.id" :label="d.name" :value="d.id">
                    <span style="float: left">{{ d.name }}</span>
                    <span style="float: right; color: #8492a6; font-size: 13px">{{ d.taxCode }}</span>
                  </el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item label="Kho Xuất Hàng" required class="col-span-2">
                <el-select v-model="form.sourceWarehouseId" class="w-full" placeholder="Chọn nhà kho...">
                  <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="Thời gian dự kiến">
                <el-date-picker v-model="form.expectedDeliveryDate" class="w-full" type="datetime" placeholder="VD: 14:00 20/12/2026"/>
              </el-form-item>

              <el-form-item label="Mức ưu tiên">
                <el-select v-model="form.priority" class="w-full">
                  <el-option label="Thấp" value="LOW" />
                  <el-option label="Trung bình" value="MEDIUM" />
                  <el-option label="Cao" value="HIGH" />
                </el-select>
              </el-form-item>

              <el-form-item label="Ghi chú thêm" class="col-span-2">
                <el-input v-model="form.notes" placeholder="Lưu ý vận chuyển..." />
              </el-form-item>
            </div>
          </el-form>
        </el-card>
      </div>

      <!-- ACTION RIGHT -->
      <div class="md:col-span-1">
        <el-card shadow="never" class="h-full rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white flex flex-col justify-center">
          <div class="text-center mb-4">
            <h3 class="font-bold text-gray-800 text-lg mb-1">Xác nhận tạo Lệnh</h3>
            <p class="text-xs text-gray-500">Kiểm tra kỹ lưới SP bên dưới</p>
          </div>
          
          <el-button 
            type="primary" 
            class="w-full mb-3 shadow-md !h-12 !text-base" 
            style="border-radius: 12px; background: linear-gradient(135deg, #1d4ed8, #3b82f6);"
            @click="submitOrder" 
            :loading="saving"
            icon="Check"
          >
            Lưu Lệnh Xuất
          </el-button>

          <el-button class="w-full !h-10 border-dashed border-gray-300 text-gray-600 hover:text-blue-600 hover:border-blue-300" icon="Upload" @click="ElMessage.info('Tính năng đang phát triển!')">
            Import Excel
          </el-button>
        </el-card>
      </div>
    </div>

    <!-- LOWER ROW: BIG GRID FOR ITEMS -->
    <el-card shadow="never" class="rounded-2xl border-none shadow-sm">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2 font-bold text-gray-700 text-lg">
            <el-icon class="text-orange-500"><Box /></el-icon> Danh sách sản phẩm
          </div>
          <el-button type="primary" plain size="small" icon="Plus" @click="addItemRow" class="rounded-lg">
            Thêm dòng sản phẩm
          </el-button>
        </div>
      </template>

      <el-table :data="form.items" stripe style="width: 100%" class="grid-style-table">
        <el-table-column type="index" label="STT" width="60" align="center" />
        
        <el-table-column label="Mã SP / Tên Sản Phẩm" min-width="350">
          <template #default="{ row }">
            <el-select v-model="row.productId" class="w-full custom-product-select" filterable placeholder="Tra cứu theo tên hoặc mã SP...">
              <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id">
                <div class="flex justify-between w-full pr-4">
                  <span class="font-semibold text-gray-800">{{ p.name }}</span>
                  <span class="text-gray-400 font-mono text-xs">{{ p.gtinCode }}</span>
                </div>
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        
        <el-table-column label="Số Lượng (Cái/Thùng)" width="200" align="center">
          <template #default="{ row }">
            <el-input-number v-model="row.expectedQuantity" :min="1" class="!w-full" />
          </template>
        </el-table-column>

        <el-table-column label="Ghi chú riêng" min-width="200">
          <template #default="{ row }">
            <el-input v-model="row.notes" placeholder="Vd: Chọn theo HSD mới nhất..." />
          </template>
        </el-table-column>

        <el-table-column width="80" align="center">
          <template #default="{ $index }">
            <el-button type="danger" text icon="Delete" class="hover:bg-red-50" @click="removeItemRow($index)" />
          </template>
        </el-table-column>
        
        <template #empty>
          <div class="py-10 text-gray-400 flex flex-col items-center gap-2">
            <el-icon :size="48" class="opacity-30"><Box /></el-icon>
            Chưa có dòng sản phẩm nào. Nhấn "Thêm dòng sản phẩm" để bắt đầu.
          </div>
        </template>
      </el-table>
      
      <div class="mt-4 flex justify-between items-center text-sm font-semibold text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
        <span>Tổng số dòng: <span class="text-blue-600">{{ form.items.length }}</span></span>
        <span>Tổng cộng SL: <span class="text-blue-600 text-lg">{{ totalQuantity }}</span></span>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { exportOrderApi } from '../api/exportOrderApi';
import { dealerApi } from '../api/dealerApi';
import { transportApi } from '../api/transportApi';
import { productApi } from '@/modules/core/api/product';
import { useAuthStore } from '@/modules/core/store/auth';
import { ElMessage } from 'element-plus';
import { Back, Delete, Plus, Upload, Document, Box, Check } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const router = useRouter();
const authStore = useAuthStore();
const saving = ref(false);

const currentUser = computed(() => authStore.user || {});
const currentDate = dayjs().format('DD/MM/YYYY HH:mm');

const dealers = ref<any[]>([]);
const warehouses = ref<any[]>([]);
const products = ref<any[]>([]);

const form = reactive({
  orderCode: '',
  dealerId: '',
  sourceWarehouseId: '',
  expectedDeliveryDate: '' as any,
  priority: 'MEDIUM',
  notes: '',
  items: [
    { productId: '', expectedQuantity: 1, notes: '' },
    { productId: '', expectedQuantity: 1, notes: '' },
    { productId: '', expectedQuantity: 1, notes: '' } // default 3 rows layout cho đẹp
  ]
});

const totalQuantity = computed(() => {
  return form.items.filter(i => i.productId).reduce((sum, i) => sum + (i.expectedQuantity || 0), 0);
});

const loadMasterData = async () => {
  try {
    const [dealerRes, productRes, warehouseRes, codeRes] = await Promise.all([
      dealerApi.getList(),
      productApi.getList({}),
      transportApi.getWarehouses(), // Fixed API endpoint
      exportOrderApi.getNextCode().catch(() => ({ data: { code: '' } })) // Lấy mã dự kiến
    ]);
    dealers.value = dealerRes.data;
    products.value = productRes.data;
    warehouses.value = warehouseRes.data;
    if (codeRes.data?.code) {
      form.orderCode = codeRes.data.code;
    }
  } catch (err: any) {
    ElMessage.error('Lỗi tải dữ liệu danh mục: ' + (err.message || 'Server Error'));
  }
};

const addItemRow = () => {
  form.items.push({ productId: '', expectedQuantity: 1, notes: '' });
};

const removeItemRow = (idx: number) => {
  form.items.splice(idx, 1);
};

const submitOrder = async () => {
  if (!form.dealerId) return ElMessage.warning('Vui lòng chọn đại lý');
  if (!form.sourceWarehouseId) return ElMessage.warning('Vui lòng chọn Kho xuất Hàng');
  const validItems = form.items.filter(i => i.productId && i.expectedQuantity > 0);
  if (validItems.length === 0) return ElMessage.warning('Vui lòng thêm ít nhất 1 sản phẩm hợp lệ vào lưới');

  saving.value = true;
  try {
    const payload = {
      ...form,
      items: validItems
    };
    await exportOrderApi.create(payload);
    ElMessage.success('Tạo lệnh xuất kho thành công');
    router.push('/supply/export-order');
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo lệnh');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadMasterData();
});
</script>

<style scoped>
.flex-align-stretch {
  align-items: stretch;
}
.compact-form :deep(.el-form-item) {
  margin-bottom: 12px;
}
.compact-form :deep(.el-form-item__label) {
  margin-bottom: 4px;
  font-weight: 600;
  color: #475569;
}

.grid-style-table {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.grid-style-table :deep(th.el-table__cell) {
  background-color: #f8fafc;
  color: #334155;
  font-weight: bold;
}
.custom-product-select :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border-bottom: 1px dashed #cbd5e1;
  border-radius: 0;
  padding: 0;
  background-color: transparent;
}
.custom-product-select:hover :deep(.el-input__wrapper),
.custom-product-select:focus-within :deep(.el-input__wrapper) {
  border-bottom-color: #3b82f6;
  background-color: #f1f5f9;
}
</style>
