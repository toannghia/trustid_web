<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { shipmentV2Api } from '../api/shipmentV2Api';
import { dealerApi, type DealerDto } from '../api/dealerApi';
import { transportApi } from '../api/transportApi';
import { userApi } from '../../core/api/user';
import { ElMessage } from 'element-plus';
import { 
  Plus, Delete, Search, Box, OfficeBuilding, User, 
  Van, Timer, Warning, InfoFilled, Check, ArrowRight,
  ShoppingBag, WarningFilled, Search as SearchIcon
} from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import DealerCreateDialog from '../components/DealerCreateDialog.vue';
import dayjs from 'dayjs';

const router = useRouter();
const loading = ref(false);
const warehouses = ref<any[]>([]);
const dealers = ref<DealerDto[]>([]);
const drivers = ref<any[]>([]);
const vehicles = ref<any[]>([]);
const warehouseStock = ref<any[]>([]);
const stockLoading = ref(false);
const showDealerCreate = ref(false);
const productSearchText = ref('');

const form = reactive({
    type: 'INTERNAL_TRANSFER',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    source_warehouse_id: '',
    destination_warehouse_id: '',
    dealer_id: '',
    expected_delivery_time: '',
    driver_id: '',
    vehicle_id: '',
    notes: '',
    items: [] as any[]
});

const filteredStock = computed(() => {
    if (!productSearchText.value) return warehouseStock.value;
    const lowerSearch = productSearchText.value.toLowerCase();
    return warehouseStock.value.filter(item => 
        item.batch?.product?.name?.toLowerCase().includes(lowerSearch) ||
        item.batch?.batchCode?.toLowerCase().includes(lowerSearch)
    );
});

const fetchData = async () => {
    try {
        const [wRes, dRes, uRes, vRes] = await Promise.all([
            transportApi.getWarehouses(),
            dealerApi.getList(),
            userApi.getList({ page: 1, limit: 100, roleName: 'DRIVER' }),
            transportApi.getVehicles()
        ]);
        warehouses.value = wRes.data;
        dealers.value = dRes.data;
        drivers.value = uRes.data;
        vehicles.value = vRes.data;
    } catch (e) {
        ElMessage.error('Lỗi tải dữ liệu danh mục');
    }
};

const onDealerCreated = (newDealer: DealerDto) => {
    dealers.value.unshift(newDealer);
    form.dealer_id = newDealer.id!;
};

const loadStock = async () => {
    if (!form.source_warehouse_id) {
        warehouseStock.value = [];
        return;
    }
    stockLoading.value = true;
    try {
        const res = await transportApi.getStock(form.source_warehouse_id);
        warehouseStock.value = res.data;
    } catch (e) {
        ElMessage.error('Lỗi tải tồn kho');
    } finally {
        stockLoading.value = false;
    }
};

watch(() => form.source_warehouse_id, loadStock);

const addItem = (row: any) => {
    const existing = form.items.find(i => i.productId === row.batch.product.id && i.batchCode === row.batch.batchCode);
    if (existing) {
        ElMessage.warning('Sản phẩm cùng lô này đã có trong danh sách');
        return;
    }
    form.items.push({
        productId: row.batch.product.id,
        productName: row.batch.product.name,
        batchId: row.batch.id,
        batchCode: row.batch.batchCode,
        quantity: 1,
        maxQty: row.quantity
    });
};

const removeItem = (index: number) => {
    form.items.splice(index, 1);
};

const submit = async () => {
    if (!form.source_warehouse_id) return ElMessage.warning('Vui lòng chọn kho xuất');
    if (form.type === 'INTERNAL_TRANSFER' && !form.destination_warehouse_id) return ElMessage.warning('Vui lòng chọn kho nhận');
    if (form.type === 'DEALER_EXPORT' && !form.dealer_id) return ElMessage.warning('Vui lòng chọn đại lý');
    if (form.items.length === 0) return ElMessage.warning('Vui lòng chọn ít nhất 1 sản phẩm');
    
    // Check if any quantity exceeds stock
    const overStockItems = form.items.filter(i => i.quantity > i.maxQty);
    if (overStockItems.length > 0) {
        return ElMessage.error('Có sản phẩm vượt quá tồn kho. Vui lòng kiểm tra lại!');
    }

    loading.value = true;
    try {
        const payload: any = {
            priority: form.priority,
            source_warehouse_id: form.source_warehouse_id,
            notes: form.notes,
            items: form.items,
            driver_id: form.driver_id || undefined,
            vehicle_id: form.vehicle_id || undefined,
            expected_delivery_time: form.expected_delivery_time || undefined
        };

        if (form.type === 'INTERNAL_TRANSFER') {
            await shipmentV2Api.createInternal({
                ...payload,
                destination_warehouse_id: form.destination_warehouse_id
            });
        } else {
            await shipmentV2Api.createDealerExport({
                ...payload,
                dealer_id: form.dealer_id,
                quantity: form.items.reduce((sum, i) => sum + i.quantity, 0)
            });
        }
        ElMessage.success('Tạo lệnh xuất kho thành công');
        router.push('/supply/export-order');
    } catch (e: any) {
        ElMessage.error('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
        loading.value = false;
    }
};

onMounted(fetchData);
</script>

<template>
  <div class="export-order-create p-6 bg-[#f8fafc] min-h-screen">
    <div class="max-w-6xl mx-auto">
      <!-- HEADER -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <el-icon class="text-blue-600"><Plus /></el-icon>
            Tạo Mới Lệnh Xuất Hàng
          </h2>
          <p class="text-gray-500 text-sm mt-1">Vui lòng điền đầy đủ thông tin để khởi tạo quy trình vận chuyển.</p>
        </div>
        <el-button @click="router.push('/supply/export-order')" class="rounded-xl px-6 h-11 border-gray-200">
          Hủy bỏ & Quay lại
        </el-button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- LEFT COLUMN: MAIN INFO -->
        <div class="lg:col-span-2 space-y-6">
          <!-- SECTION 1: THÔNG TIN CƠ BẢN -->
          <el-card class="section-card shadow-sm border-none rounded-2xl overflow-hidden">
            <template #header>
              <div class="flex items-center gap-2 font-bold text-gray-700">
                <el-icon class="text-blue-500"><InfoFilled /></el-icon>
                THÔNG TIN CƠ BẢN
              </div>
            </template>
            
            <el-form :model="form" label-position="top">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="Loại hình lệnh" required>
                    <el-select v-model="form.type" class="w-full custom-select" size="large">
                      <el-option label="Chuyển kho nội bộ" value="INTERNAL_TRANSFER">
                        <div class="flex items-center gap-2">
                          <el-icon><OfficeBuilding /></el-icon> <span>Chuyển kho nội bộ</span>
                        </div>
                      </el-option>
                      <el-option label="Xuất bán đại lý" value="DEALER_EXPORT">
                        <div class="flex items-center gap-2">
                          <el-icon><User /></el-icon> <span>Xuất bán đại lý</span>
                        </div>
                      </el-option>
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="Mức độ ưu tiên" required>
                    <el-select v-model="form.priority" class="w-full" size="large">
                      <el-option label="⚡ Cao (High)" value="HIGH" />
                      <el-option label="🔔 Thường (Medium)" value="MEDIUM" />
                      <el-option label="💤 Thấp (Low)" value="LOW" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20" class="mt-2">
                <el-col :span="12">
                  <el-form-item label="Kho xuất hàng (Nguồn)" required>
                    <el-select v-model="form.source_warehouse_id" placeholder="Chọn kho đi" class="w-full" size="large" filterable>
                      <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item v-if="form.type === 'INTERNAL_TRANSFER'" label="Kho nhận hàng (Đích)" required>
                    <el-select v-model="form.destination_warehouse_id" placeholder="Chọn kho đến" class="w-full" size="large" filterable>
                      <el-option v-for="w in warehouses.filter(x => x.id !== form.source_warehouse_id)" :key="w.id" :label="w.name" :value="w.id" />
                    </el-select>
                  </el-form-item>
                  <el-form-item v-else label="Đại lý nhận hàng" required>
                    <div class="flex gap-2">
                      <el-select v-model="form.dealer_id" placeholder="Chọn đại lý" class="flex-1" size="large" filterable>
                        <el-option v-for="d in dealers" :key="d.id" :label="d.name" :value="d.id" />
                      </el-select>
                      <el-button type="primary" :icon="Plus" class="h-11 rounded-lg" @click="showDealerCreate = true" />
                    </div>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </el-card>

          <!-- SECTION 2: DANH SÁCH SẢN PHẨM -->
          <el-card class="section-card shadow-sm border-none rounded-2xl overflow-hidden">
            <template #header>
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2 font-bold text-gray-700">
                  <el-icon class="text-orange-500"><Box /></el-icon>
                  DANH SÁCH SẢN PHẨM XUẤT
                </div>
                
                <el-popover placement="bottom-end" :width="500" trigger="click" :disabled="!form.source_warehouse_id">
                  <template #reference>
                    <el-button 
                        type="primary" 
                        :icon="Plus" 
                        class="rounded-lg shadow-sm"
                        :disabled="!form.source_warehouse_id"
                    >
                        Thêm sản phẩm
                    </el-button>
                  </template>
                  
                  <div class="p-2">
                    <div class="flex items-center gap-2 mb-4">
                        <el-input 
                            v-model="productSearchText" 
                            placeholder="Tìm sản phẩm, số lô..." 
                            :prefix-icon="SearchIcon"
                            clearable
                        />
                    </div>
                    <el-table 
                        :data="filteredStock" 
                        v-loading="stockLoading" 
                        size="small" 
                        max-height="400"
                        class="selection-table"
                    >
                        <el-table-column label="Sản phẩm / Lô">
                            <template #default="{row}">
                                <div class="flex flex-col">
                                    <span class="font-bold text-gray-700">{{ row.batch?.product?.name }}</span>
                                    <span class="text-[10px] text-gray-400">Lô: {{ row.batch?.batchCode }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column prop="quantity" label="Tồn" width="80" align="center" />
                        <el-table-column width="60" align="center">
                            <template #default="{row}">
                                <el-button type="primary" link :icon="Plus" @click="addItem(row)" />
                            </template>
                        </el-table-column>
                    </el-table>
                  </div>
                </el-popover>
              </div>
            </template>

            <!-- SELECTED ITEMS TABLE -->
            <div class="selected-items-list">
              <el-table :data="form.items" size="default" empty-text="Chưa có sản phẩm nào. Nhấn 'Thêm sản phẩm' để bắt đầu.">
                <el-table-column label="SẢN PHẨM & LÔ">
                  <template #default="{row}">
                    <div class="flex flex-col">
                      <span class="font-bold text-gray-800">{{ row.productName }}</span>
                      <span class="text-[11px] text-gray-400 font-mono">Lô: {{ row.batchCode }}</span>
                    </div>
                  </template>
                </el-table-column>
                
                <el-table-column label="SỐ LƯỢNG XUẤT" width="220">
                  <template #default="{row}">
                    <div class="flex flex-col gap-1">
                      <el-input-number 
                        v-model="row.quantity" 
                        :min="1" 
                        size="default" 
                        class="!w-full"
                        :class="{'is-error': row.quantity > row.maxQty}"
                      />
                      <div v-if="row.quantity > row.maxQty" class="flex items-center gap-1 text-red-500 text-[11px] mt-1 font-medium">
                        <el-icon><WarningFilled /></el-icon>
                        Vượt tồn kho (Hiện có: {{ row.maxQty }})
                      </div>
                      <div v-else class="text-gray-400 text-[11px] mt-1 italic">
                        Tồn khả dụng: {{ row.maxQty }}
                      </div>
                    </div>
                  </template>
                </el-table-column>

                <el-table-column width="80" align="center">
                  <template #default="{$index}">
                    <el-button type="danger" link :icon="Delete" @click="removeItem($index)" />
                  </template>
                </el-table-column>
              </el-table>
              
              <div v-if="!form.source_warehouse_id" class="text-center py-12 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 mb-6">
                <el-icon class="text-4xl text-gray-200 mb-2"><ShoppingBag /></el-icon>
                <p class="text-gray-400 text-sm">Vui lòng chọn <b>Kho xuất hàng</b> để hiển thị danh sách tồn kho</p>
              </div>
            </div>
          </el-card>

          <!-- GHI CHÚ -->
          <el-card class="section-card shadow-sm border-none rounded-2xl overflow-hidden mt-6">
            <template #header>
              <div class="flex items-center gap-2 font-bold text-gray-700">
                <el-icon class="text-purple-500"><InfoFilled /></el-icon>
                GHI CHÚ CHI TIẾT
              </div>
            </template>
            <el-input 
              v-model="form.notes" 
              type="textarea" 
              :rows="3" 
              placeholder="Nhập ghi chú quan trọng cho thủ kho hoặc đơn vị vận chuyển..." 
              class="rounded-xl custom-textarea"
            />
          </el-card>
        </div>

        <!-- RIGHT COLUMN: LOGISTICS & SUBMIT -->
        <div class="space-y-6">
          <el-card class="section-card shadow-sm border-none rounded-2xl overflow-hidden">
            <template #header>
              <div class="flex items-center gap-2 font-bold text-gray-700">
                <el-icon class="text-green-500"><Van /></el-icon>
                ĐIỀU PHỐI VẬN CHUYỂN
              </div>
            </template>
            
            <el-form :model="form" label-position="top">
              <el-form-item label="Thời gian dự kiến giao">
                <el-date-picker
                  v-model="form.expected_delivery_time"
                  type="datetime"
                  placeholder="Chọn thời gian"
                  class="!w-full"
                  size="large"
                />
              </el-form-item>

              <el-form-item label="Tài xế">
                <el-select v-model="form.driver_id" placeholder="Chọn tài xế" class="w-full" size="large" filterable clearable>
                  <el-option v-for="d in drivers" :key="d.id" :label="d.fullName" :value="d.id" />
                </el-select>
              </el-form-item>

              <el-form-item label="Phương tiện">
                <el-select v-model="form.vehicle_id" placeholder="Chọn xe" class="w-full" size="large" filterable clearable>
                  <el-option v-for="v in vehicles" :key="v.id" :label="`${v.licensePlate} (${v.type})`" :value="v.id" />
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- SUMMARY & SUBMIT -->
          <el-card class="summary-card shadow-lg border-none rounded-2xl p-2 bg-white ring-1 ring-gray-100">
            <div class="p-4 border-b border-gray-50 mb-4">
                <h4 class="font-bold text-gray-800 mb-4">Tổng quan Lệnh</h4>
                <div class="flex justify-between items-center mb-3">
                    <span class="text-gray-500 text-sm">Số lượng sản phẩm:</span>
                    <span class="font-bold text-gray-800">{{ form.items.length }} SP</span>
                </div>
                <div class="flex justify-between items-center mb-3">
                    <span class="text-gray-500 text-sm">Tổng số lượng xuất:</span>
                    <span class="text-2xl font-black text-blue-600">{{ form.items.reduce((sum, i) => sum + i.quantity, 0) }}</span>
                </div>
                <div v-if="form.items.some(i => i.quantity > i.maxQty)" class="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2 font-medium animate-pulse">
                    <el-icon><WarningFilled /></el-icon> Có sản phẩm vượt tồn kho
                </div>
            </div>
            
            <div class="p-2">
                <el-button 
                    type="primary" 
                    size="large" 
                    class="w-full !h-14 rounded-xl !text-lg font-bold shadow-md gradient-btn"
                    :loading="loading"
                    :disabled="form.items.some(i => i.quantity > i.maxQty)"
                    @click="submit"
                >
                    Tạo Lệnh Ngay
                </el-button>
            </div>
          </el-card>

          <div class="text-center">
            <el-button type="info" link @click="fetchData" :icon="Timer">Làm mới danh mục</el-button>
          </div>
        </div>
      </div>
    </div>

    <DealerCreateDialog v-model="showDealerCreate" @created="onDealerCreated" />
  </div>
</template>

<style scoped>
.section-card :deep(.el-card__header) {
  background-color: #fcfcfd;
  border-bottom: 1px solid #f1f5f9;
  padding: 16px 24px;
}

.custom-select :deep(.el-input__wrapper),
.custom-textarea :deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  border-radius: 12px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px !important;
}

.is-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.gradient-btn {
    background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
    border: none;
}
.gradient-btn:hover {
    background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%);
}

.section-card {
  transition: all 0.2s;
}
.section-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.selection-table :deep(.el-table__row) {
    cursor: pointer;
}

:deep(.el-input-number.is-controls-right .el-input-number__decrease),
:deep(.el-input-number.is-controls-right .el-input-number__increase) {
  background: #f8fafc;
}
</style>
