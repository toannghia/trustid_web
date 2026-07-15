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
            <el-table
              :data="cart"
              style="width: 100%"
              border
              size="small"
              empty-text="Chưa có sản phẩm nào"
              show-summary
              :summary-method="getSummaries"
            >
              <el-table-column type="index" label="STT" width="50" align="center" />
              
              <el-table-column label="Mã QR (Serial)" width="280">
                <template #default="{ row }">
                  <div class="flex items-center gap-1">
                    <span class="font-mono text-gray-700 font-semibold">{{ row.qrCode || row.serialNumber }}</span>
                    <span class="font-mono text-gray-400 text-xs ml-1" v-if="row.qrCode && row.qrCode !== row.serialNumber">({{ row.serialNumber }})</span>
                  </div>
                  <div v-if="row.isBag && row.packets?.length" class="mt-1">
                    <el-button type="primary" link size="small" @click="showPackets(row)">
                      <el-icon class="mr-0.5"><View /></el-icon>Xem {{ row.packets.length }} gói
                    </el-button>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="productName" label="Tên sản phẩm" min-width="200">
                <template #default="{ row }">
                  <strong class="text-gray-800">{{ row.productName }}</strong>
                </template>
              </el-table-column>
              
              <el-table-column label="SL" width="80" align="center">
                <template #default="{ row }">
                  <template v-if="row.isBag">
                    <el-tooltip :content="`Bao gồm ${row.quantity} gói`" placement="top">
                      <span class="font-bold text-orange-600">{{ row.quantity }}</span>
                    </el-tooltip>
                  </template>
                  <template v-else>
                    {{ row.quantity }}
                  </template>
                </template>
              </el-table-column>
              
              <el-table-column label="Đơn giá" width="140">
                <template #default="{ row }">
                  <div class="price-cell">
                    <template v-if="row.editingPrice">
                      <div class="flex items-center gap-1">
                        <el-input-number
                          v-model="row.price"
                          size="small"
                          :min="0"
                          :controls="false"
                          class="w-full"
                          @blur="row.editingPrice = false"
                          @keyup.enter="row.editingPrice = false"
                        />
                        <el-button type="success" size="small" circle @click="row.editingPrice = false" class="p-1">
                          <el-icon><Check /></el-icon>
                        </el-button>
                      </div>
                    </template>
                    <template v-else>
                      <div class="cursor-pointer hover:bg-gray-100 p-1.5 rounded flex items-center justify-between group/price" @click="row.editingPrice = true" title="Nhấp để sửa đơn giá">
                        <div class="flex flex-col">
                          <span class="font-bold text-gray-800">{{ formatCurrency(row.price) }}</span>
                          <span v-if="row.discountPercent > 0" class="text-[10px] text-gray-400 line-through">{{ formatCurrency(row.basePrice) }}</span>
                        </div>
                        <div class="flex items-center gap-1">
                          <el-tag v-if="row.discountPercent > 0" size="small" type="danger" effect="dark" class="scale-90">-{{ row.discountPercent }}%</el-tag>
                          <el-icon class="text-gray-400 opacity-0 group-hover/price:opacity-100 transition-opacity"><Edit /></el-icon>
                        </div>
                      </div>
                    </template>
                  </div>
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
              <div v-if="customerInfo.groupName" class="mt-2">
                <el-tag :color="customerInfo.groupColor" effect="dark" size="small" style="border: none;">
                  {{ customerInfo.groupName }}
                </el-tag>
                <span v-if="customerInfo.groupDiscount > 0" class="text-xs text-green-600 ml-1 font-bold">
                  CK {{ customerInfo.groupDiscount }}%
                </span>
              </div>
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

            <div class="pt-2">
              <el-checkbox v-model="autoPrint" size="large">
                Thanh toán và in hoá đơn
              </el-checkbox>
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

  <!-- Dialog xem danh sách gói trong bao -->
  <el-dialog
    v-model="packetsDialogVisible"
    :title="`Danh sách gói trong bao: ${packetsDialogBag}`"
    width="550px"
    destroy-on-close
  >
    <el-table :data="packetsDialogData" border size="small" style="width: 100%">
      <el-table-column type="index" label="STT" width="60" align="center" />
      <el-table-column label="Serial" min-width="180">
        <template #default="{ row }">
          <span class="font-mono text-sm">{{ row.serial }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Mã QR" min-width="220">
        <template #default="{ row }">
          <span class="font-mono text-sm text-blue-600">{{ row.qrCode }}</span>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="packetsDialogVisible = false">Đóng</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ShoppingCart, Delete, FullScreen, Search, Close, Money, CreditCard, ShoppingCartFull, List, View, Edit, Check } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const router = useRouter();

const scanInput = ref('');
const scanInputRef = ref<any>(null);
const scanError = ref('');
const scanning = ref(false);
const processing = ref(false);

const cart = ref<any[]>([]);

// Packets dialog
const packetsDialogVisible = ref(false);
const packetsDialogData = ref<any[]>([]);
const packetsDialogBag = ref('');

// Khách hàng
const customerType = ref('retail'); // 'retail' hoặc 'loyalty'
const customerSearchText = ref('');
const customerInfo = ref({ id: '', name: '', phone: '', address: '', groupName: '', groupColor: '', groupDiscount: 0 });
const showNewCustomerForm = ref(false);
const newCustomer = ref({ name: '', phone: '', address: '' });
const savingCustomer = ref(false);

const paymentMethod = ref('cash');
const autoPrint = ref(true);

const totalAmount = computed(() => {
  return cart.value.reduce((sum, item) => sum + ((Number(item.price) || 0) * item.quantity), 0);
});

const formatCurrency = (val: number | string) => {
  if (!val && val !== 0) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

const totalQuantity = computed(() => {
  return cart.value.reduce((sum, item) => sum + (item.quantity || 0), 0);
});

const getSummaries = (param: any) => {
  const { columns, data } = param;
  const sums: string[] = [];
  columns.forEach((column: any, index: number) => {
    if (index === 0) {
      sums[index] = '';
      return;
    }
    if (index === 1) {
      sums[index] = 'Tổng cộng';
      return;
    }
    if (column.label === 'SL') {
      sums[index] = String(totalQuantity.value);
      return;
    }
    if (column.label === 'Thành tiền') {
      sums[index] = formatCurrency(totalAmount.value);
      return;
    }
    sums[index] = '';
  });
  return sums;
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
    address: item.address,
    groupName: item.group?.name || '',
    groupColor: item.group?.color || '',
    groupDiscount: Number(item.group?.discountPercent) || 0
  };
  customerSearchText.value = '';
  // Re-resolve prices for existing cart items with group pricing
  reResolvePrices();
  focusScan();
};

const clearCustomer = () => {
  customerInfo.value = { id: '', name: '', phone: '', address: '', groupName: '', groupColor: '', groupDiscount: 0 };
  customerSearchText.value = '';
  showNewCustomerForm.value = false;
  // Re-resolve prices to base (no group discount)
  reResolvePrices();
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
      address: data.address,
      groupName: data.group?.name || '',
      groupColor: data.group?.color || '',
      groupDiscount: Number(data.group?.discountPercent) || 0
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

  scanning.value = true;
  scanError.value = '';

  try {
    // 1. Cắt link QR code nếu người dùng quét URL
    let cleanInput = serial;
    if (serial.startsWith('http://') || serial.startsWith('https://')) {
      try {
        const url = new URL(serial);
        const codeVal = url.searchParams.get('Code') || url.searchParams.get('code') || url.searchParams.get('id');
        if (codeVal) {
          cleanInput = codeVal.trim();
        } else {
          const idx = serial.lastIndexOf('=');
          if (idx >= 0) {
            cleanInput = serial.substring(idx + 1).trim();
          }
        }
      } catch {
        const idx = serial.lastIndexOf('=');
        if (idx >= 0) {
          cleanInput = serial.substring(idx + 1).trim();
        }
      }
    }

    // 2. Gọi lookup từ bảng giá đại lý (truyền customerId nếu có)
    const lookupParams: any = {};
    if (customerInfo.value.id) {
      lookupParams.customerId = customerInfo.value.id;
    }
    const { data } = await api.get(`/dealer-prices/lookup/${encodeURIComponent(cleanInput)}`, { params: lookupParams });
    
    // 3. Kiểm tra trùng lặp dựa trên serial thực tế đã được giải quyết
    if (cart.value.some(i => i.serialNumber === data.serialNumber)) {
      scanError.value = `Sản phẩm ${data.qrCode || data.serialNumber} (${data.serialNumber}) đã có trong đơn hàng!`;
      return;
    }

    // 4. Cross-check: quét gói lẻ nhưng bao đã có trong giỏ
    if (!data.isBag) {
      const parentBag = cart.value.find(i => i.isBag && i.packets?.some((p: any) => p.serial === data.serialNumber));
      if (parentBag) {
        scanError.value = `Gói ${data.qrCode || data.serialNumber} đã nằm trong bao ${parentBag.qrCode || parentBag.serialNumber} đang có trong đơn hàng. Không thể thêm gói lẻ khi đã quét cả bao.`;
        return;
      }
    }

    // 5. Cross-check: quét bao nhưng có gói trong bao đã quét lẻ rồi
    if (data.isBag && data.packets?.length) {
      const packetSerials = data.packets.map((p: any) => p.serial);
      const conflictItem = cart.value.find(i => !i.isBag && packetSerials.includes(i.serialNumber));
      if (conflictItem) {
        scanError.value = `Bao ${data.qrCode || data.serialNumber} chứa gói ${conflictItem.qrCode || conflictItem.serialNumber} đã có trong đơn hàng. Vui lòng xóa gói lẻ trước khi quét bao.`;
        return;
      }
    }

    // Thêm vào giỏ
    const qty = data.isBag ? (data.bagQuantity || 1) : 1;
    cart.value.unshift({
      serialNumber: data.serialNumber,
      qrCode: data.qrCode,
      productId: data.productId,
      productName: data.productName,
      price: data.finalPrice || data.sellingPrice || 0,
      basePrice: data.basePrice || data.sellingPrice || 0,
      discountPercent: data.discountPercent || 0,
      discountAmount: data.discountAmount || 0,
      groupName: data.groupName || '',
      originalPrice: data.sellingPrice,
      quantity: qty,
      isBag: data.isBag || false,
      packets: data.packets || [],
      editingPrice: false
    });

    const label = data.isBag ? `${data.productName} (Bao ${qty} gói)` : data.productName;
    ElMessage.success(`Đã thêm: ${label}`);
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

const showPackets = (row: any) => {
  packetsDialogBag.value = row.qrCode || row.serialNumber;
  packetsDialogData.value = row.packets || [];
  packetsDialogVisible.value = true;
};

const clearCart = () => {
  cart.value = [];
  scanError.value = '';
};

// Re-resolve all cart item prices when customer changes
const reResolvePrices = async () => {
  if (cart.value.length === 0) return;
  const customerId = customerInfo.value.id || undefined;
  for (const item of cart.value) {
    try {
      const params: any = {};
      if (customerId) params.customerId = customerId;
      const { data } = await api.get(`/dealer-prices/lookup/${encodeURIComponent(item.serialNumber)}`, { params });
      item.price = data.finalPrice || data.sellingPrice || 0;
      item.basePrice = data.basePrice || data.sellingPrice || 0;
      item.discountPercent = data.discountPercent || 0;
      item.discountAmount = data.discountAmount || 0;
      item.groupName = data.groupName || '';
    } catch { /* keep current price */ }
  }
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

    const { data } = await api.post('/dealer-dashboard/sale', payload);
    
    ElMessage.success('Thanh toán thành công!');
    
    const saleId = data?.id;
    
    // Reset state after success
    clearCart();
    if (customerType.value === 'loyalty') clearCustomer();
    paymentMethod.value = 'cash';

    if (autoPrint.value && saleId) {
      router.push(`/dealer/receipt/${saleId}`);
    }
    
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
.h-\[calc\(100vh-140px\)\] {
  height: calc(100vh - 140px);
}
:deep(.el-input-number .el-input__inner) {
  text-align: right;
  font-weight: 600;
  color: #2563eb;
}

/* Group pricing display */
.price-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.price-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.base-price {
  text-decoration: line-through;
  color: #9ca3af;
  font-size: 12px;
}
.discount-badge {
  font-size: 11px;
  padding: 0 4px;
  height: 18px;
  line-height: 18px;
}

/* Highlight summary row */
:deep(.el-table__footer-wrapper tbody td) {
  background-color: #e2e8f0 !important; /* slate-200 for stronger highlight background */
}
:deep(.el-table__footer-wrapper .cell) {
  font-weight: bold !important;
  font-size: 14px !important;
}
:deep(.el-table__footer-wrapper tbody td:nth-child(2) .cell) {
  text-align: left !important;
  color: #0f172a !important;
}
:deep(.el-table__footer-wrapper tbody td:nth-child(4) .cell) {
  color: #ea580c !important; /* orange color for total quantity */
}
:deep(.el-table__footer-wrapper tbody td:nth-child(6) .cell) {
  color: #1d4ed8 !important; /* strong blue color for total money */
}
</style>
