<template>
  <div class="pos-container p-4 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold text-gray-800 flex items-center">
        <el-icon class="mr-2 text-blue-600"><ShoppingCart /></el-icon> Bán hàng (POS)
      </h2>
      <el-button type="primary" plain @click="$router.push('/dealer/sales')">
        <el-icon class="mr-1"><List /></el-icon> Lịch sử hóa đơn
      </el-button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
      
      <!-- CỘT TRÁI: QUÉT MÃ & GIỎ HÀNG -->
      <div class="lg:col-span-3 flex flex-col gap-4 h-full">
        <el-card shadow="hover" class="flex-1 flex flex-col" :body-style="{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0px' }">
          
          <!-- Phẩn Quét Mã (Top bar trong card) -->
          <div class="p-4 border-b bg-white flex gap-2">
            <el-input
              v-model="scanInput"
              placeholder="Quét hoặc nhập mã S/N để thêm sản phẩm..."
              ref="scanInputRef"
              @keyup.enter="handleScan"
              clearable
              size="large"
              class="flex-1"
            >
              <template #prefix>
                <el-icon><FullScreen /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" size="large" @click="handleScan" :loading="scanning">
              Thêm
            </el-button>
          </div>
          
          <el-alert
            v-if="scanError"
            :title="scanError"
            type="error"
            show-icon
            @close="scanError = ''"
            class="m-4 mb-0"
          />

          <!-- Lưới sản phẩm -->
          <div class="flex-1 p-4 overflow-auto">
            <el-table :data="cart" style="width: 100%" border size="small" empty-text="Chưa có sản phẩm nào">
              <el-table-column type="index" label="STT" width="50" align="center" />
              
              <el-table-column label="Mã S/N" width="160">
                <template #default="{ row }">
                  <span class="font-mono text-gray-600">{{ row.serialNumber }}</span>
                </template>
              </el-table-column>
              
              <el-table-column prop="productName" label="Tên sản phẩm" min-width="200">
                <template #default="{ row }">
                  <strong class="text-gray-800">{{ row.productName }}</strong>
                </template>
              </el-table-column>
              
              <el-table-column label="SL" width="60" align="center">
                <template #default="{ row }">
                  {{ row.quantity }}
                </template>
              </el-table-column>
              
              <el-table-column label="Đơn giá" width="150">
                <template #default="{ row }">
                  <el-input-number 
                    v-model="row.price" 
                    size="small" 
                    :min="0" 
                    :controls="false"
                    class="w-full"
                  />
                </template>
              </el-table-column>
              
              <el-table-column label="Thành tiền" width="130" align="right">
                <template #default="{ row }">
                  <span class="font-bold text-blue-600">{{ formatCurrency((row.price || 0) * row.quantity) }}</span>
                </template>
              </el-table-column>
              
              <el-table-column label="Xóa" width="60" align="center">
                <template #default="{ $index }">
                  <el-button type="danger" link @click="removeItem($index)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </div>

      <!-- CỘT PHẢI: THÔNG TIN KHÁCH & THANH TOÁN -->
      <div class="flex flex-col gap-4 h-full overflow-y-auto">
        
        <!-- Khách hàng -->
        <el-card shadow="hover" class="mb-0">
          <div class="font-bold text-gray-700 mb-3 pb-2 border-b flex items-center justify-between">
            Thông tin khách hàng
            <el-button type="primary" link @click="$router.push('/dealer/customers')" size="small">
              Quản lý
            </el-button>
          </div>
          
          <el-radio-group v-model="customerType" class="mb-4 w-full flex">
            <el-radio-button label="retail" class="flex-1 text-center">Khách lẻ</el-radio-button>
            <el-radio-button label="loyalty" class="flex-1 text-center">Khách quen</el-radio-button>
          </el-radio-group>

          <div v-if="customerType === 'loyalty'" class="space-y-3">
            <el-autocomplete
              v-if="!customerInfo.id && !showNewCustomerForm"
              v-model="customerSearchText"
              :fetch-suggestions="searchCustomers"
              placeholder="Tìm tên hoặc SĐT khách..."
              class="w-full"
              value-key="name"
              @select="handleSelectCustomer"
            >
              <template #default="{ item }">
                <div class="flex justify-between items-center w-full">
                  <span class="font-bold">{{ item.name }}</span>
                  <span class="text-gray-500 text-sm ml-2">{{ item.phone }}</span>
                </div>
              </template>
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-autocomplete>

            <!-- Khách đã chọn -->
            <div v-if="customerInfo.id" class="p-3 bg-blue-50 border border-blue-100 rounded-lg relative">
              <el-button type="danger" link class="absolute top-1 right-1" @click="clearCustomer">
                <el-icon><Close /></el-icon>
              </el-button>
              <div class="font-bold text-blue-700">{{ customerInfo.name }}</div>
              <div class="text-sm text-gray-600 mt-1">SĐT: {{ customerInfo.phone }}</div>
              <div class="text-sm text-gray-600 mt-1" v-if="customerInfo.address">ĐC: {{ customerInfo.address }}</div>
            </div>

            <!-- Nút Thêm mới (khi chưa chọn khách) -->
            <div v-if="!customerInfo.id && !showNewCustomerForm" class="text-center mt-2">
              <el-button type="primary" link @click="showNewCustomerForm = true">
                + Thêm khách hàng mới
              </el-button>
            </div>

            <!-- Form Thêm Khách Mới Inline -->
            <div v-if="showNewCustomerForm" class="p-3 border rounded-lg bg-gray-50 space-y-3 relative mt-2">
              <el-button type="danger" link class="absolute top-1 right-1 z-10" @click="showNewCustomerForm = false">
                <el-icon><Close /></el-icon>
              </el-button>
              <div class="font-bold text-sm text-gray-600 mb-2">Đăng ký khách mới</div>
              <el-input v-model="newCustomer.name" placeholder="Tên khách hàng (*)" size="small" />
              <el-input v-model="newCustomer.phone" placeholder="Số điện thoại (*)" size="small" />
              <el-input v-model="newCustomer.address" placeholder="Địa chỉ (Tùy chọn)" size="small" />
              <el-button type="primary" size="small" class="w-full mt-2" @click="saveNewCustomer" :loading="savingCustomer">
                Lưu và Chọn
              </el-button>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500 italic text-center p-2">
            Đơn hàng không lưu lịch sử cá nhân.
          </div>
        </el-card>

        <!-- Tổng tiền & Thanh toán -->
        <el-card shadow="hover" class="flex-1 flex flex-col justify-end">
          <div class="space-y-4">
            <div class="flex justify-between items-center text-gray-600">
              <span>Số lượng:</span>
              <span class="font-bold border border-gray-200 px-2 rounded">{{ cart.length }}</span>
            </div>
            
            <div class="flex justify-between items-center text-xl pt-2 border-t border-dashed">
              <span class="font-bold text-gray-800">Tổng tiền:</span>
              <span class="font-bold text-blue-600 text-2xl">{{ formatCurrency(totalAmount) }}</span>
            </div>

            <div class="pt-4 mt-2">
              <span class="text-sm font-medium text-gray-600 mb-2 block">Thanh toán bằng:</span>
              <el-select v-model="paymentMethod" class="w-full" size="large">
                <el-option label="Tiền mặt" value="cash">
                  <span class="flex items-center"><el-icon class="mr-2"><Money /></el-icon>Tiền mặt</span>
                </el-option>
                <el-option label="Chuyển khoản / Quẹt thẻ" value="transfer">
                  <span class="flex items-center"><el-icon class="mr-2"><CreditCard /></el-icon>Chuyển khoản / Quẹt thẻ</span>
                </el-option>
              </el-select>
            </div>

            <el-button 
              type="success" 
              size="large" 
              class="w-full mt-4 h-14 text-lg font-bold" 
              @click="checkout"
              :loading="processing"
              :disabled="cart.length === 0"
            >
              <el-icon class="mr-2"><ShoppingCartFull /></el-icon> THANH TOÁN
            </el-button>
          </div>
        </el-card>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { ShoppingCart, Delete, FullScreen, Search, Close, Money, CreditCard, ShoppingCartFull, List } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const scanInput = ref('');
const scanInputRef = ref<any>(null);
const scanError = ref('');
const scanning = ref(false);
const processing = ref(false);

const cart = ref<any[]>([]);

// Khách hàng
const customerType = ref('retail'); // 'retail' hoặc 'loyalty'
const customerSearchText = ref('');
const customerInfo = ref({ id: '', name: '', phone: '', address: '' });
const showNewCustomerForm = ref(false);
const newCustomer = ref({ name: '', phone: '', address: '' });
const savingCustomer = ref(false);

const paymentMethod = ref('cash');

const totalAmount = computed(() => {
  return cart.value.reduce((sum, item) => sum + ((Number(item.price) || 0) * item.quantity), 0);
});

const formatCurrency = (val: number | string) => {
  if (!val && val !== 0) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

// Theo dõi thay đổi loại KH để focus
watch(customerType, (val) => {
  if (val === 'retail') {
    clearCustomer();
    focusScan();
  }
});

// Tìm khách hàng autocomplete
const searchCustomers = async (queryString: string, cb: (results: any[]) => void) => {
  if (!queryString) {
    cb([]);
    return;
  }
  try {
    const { data } = await api.get(`/dealer-customers/search`, { params: { q: queryString }});
    cb(data);
  } catch (err) {
    cb([]);
  }
};

const handleSelectCustomer = (item: any) => {
  customerInfo.value = {
    id: item.id,
    name: item.name,
    phone: item.phone,
    address: item.address
  };
  customerSearchText.value = '';
  focusScan();
};

const clearCustomer = () => {
  customerInfo.value = { id: '', name: '', phone: '', address: '' };
  customerSearchText.value = '';
  showNewCustomerForm.value = false;
};

// Tạo khách mới trực tiếp trên form
const saveNewCustomer = async () => {
  if (!newCustomer.value.name || !newCustomer.value.phone) {
    ElMessage.warning('Vui lòng nhập Tên và Số điện thoại');
    return;
  }
  savingCustomer.value = true;
  try {
    const { data } = await api.post('/dealer-customers', newCustomer.value);
    ElMessage.success('Đã lưu khách hàng');
    // Trực tiếp chọn
    customerInfo.value = {
      id: data.id,
      name: data.name,
      phone: data.phone,
      address: data.address
    };
    showNewCustomerForm.value = false;
    newCustomer.value = { name: '', phone: '', address: '' };
    focusScan();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lõi khi lưu khách hàng');
  } finally {
    savingCustomer.value = false;
  }
};

const handleScan = async () => {
  const serial = scanInput.value.trim();
  if (!serial) return;

  // Check duplicate
  if (cart.value.some(i => i.serialNumber === serial)) {
    scanError.value = `Sản phẩm ${serial} đã có trong đơn hàng!`;
    scanInput.value = '';
    return;
  }

  scanning.value = true;
  scanError.value = '';

  try {
    // Gọi lookup từ bảng giá đại lý
    const { data } = await api.get(`/dealer-prices/lookup/${serial}`);
    
    // Thêm vào giỏ
    cart.value.unshift({
      serialNumber: data.serialNumber,
      productId: data.productId,
      productName: data.productName,
      price: data.sellingPrice || 0, // Auto-fill giá bán từ bảng giá
      originalPrice: data.sellingPrice,
      quantity: 1
    });

    ElMessage.success(`Đã thêm: ${data.productName}`);
  } catch (err: any) {
    scanError.value = err.response?.data?.message || 'Lỗi khi quét mã S/N';
  } finally {
    scanning.value = false;
    scanInput.value = '';
    focusScan();
  }
};

const removeItem = (index: number) => {
  cart.value.splice(index, 1);
};

const clearCart = () => {
  cart.value = [];
  scanError.value = '';
};

const checkout = async () => {
  if (cart.value.length === 0) return;

  // Check if any price is <= 0
  const zeroPriceItem = cart.value.find(item => item.price <= 0);
  if (zeroPriceItem) {
    const confirm = await ElMessageBox.confirm(
      `Sản phẩm "${zeroPriceItem.productName}" đang có giá 0đ. Bạn có muốn tiếp tục bán?`, 
      'Xác nhận giá 0đ', 
      {
        confirmButtonText: 'Tiếp tục',
        cancelButtonText: 'Hủy',
        type: 'warning'
      }
    ).catch(() => false);

    if (!confirm) return;
  }

  processing.value = true;

  try {
    const payloadInfo = customerType.value === 'loyalty' && customerInfo.value.id
      ? {
          id: customerInfo.value.id,
          name: customerInfo.value.name,
          phone: customerInfo.value.phone,
          address: customerInfo.value.address
        }
      : {
          name: 'Khách lẻ'
        };

    const payload = {
      items: cart.value,
      customerInfo: payloadInfo,
      paymentMethod: paymentMethod.value
    };

    await api.post('/dealer-dashboard/sale', payload);
    
    ElMessage.success('Thanh toán thành công!');
    
    // Reset state after success
    clearCart();
    if (customerType.value === 'loyalty') clearCustomer();
    paymentMethod.value = 'cash';
    
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi khi thanh toán');
  } finally {
    processing.value = false;
    focusScan();
  }
};

const focusScan = () => {
  nextTick(() => {
    if (scanInputRef.value) {
      scanInputRef.value.focus();
    }
  });
};

onMounted(() => {
  focusScan();
});
</script>

<style scoped>
.pos-container {
  height: calc(100vh - 60px);
  overflow: hidden;
}
/* Grid layout height fix */
.h-\[calc\(100vh-140px\)\] {
  height: calc(100vh - 140px);
}

/* Ẩn control tăng giảm của input number trong giỏ hàng */
:deep(.el-input-number .el-input__inner) {
  text-align: right;
  font-weight: 600;
  color: #2563eb;
}
</style>
