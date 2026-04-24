<template>
  <div class="receipt-print min-h-screen bg-gray-100 flex flex-col items-center py-8">
    <div class="w-full max-w-2xl px-4 flex justify-between items-center mb-6 print:hidden">
      <el-button @click="$router.push('/dealer/sales')">
        <el-icon class="mr-1"><Back /></el-icon> Quay lại
      </el-button>
      
      <div class="flex gap-2">
        <el-radio-group v-model="printFormat" size="large">
          <el-radio-button label="80mm">Máy in bill 80mm</el-radio-button>
          <el-radio-button label="a4">Máy in A4</el-radio-button>
        </el-radio-group>
        <el-button type="primary" size="large" @click="handlePrint">
          <el-icon class="mr-1"><Printer /></el-icon> In Hóa Đơn
        </el-button>
      </div>
    </div>

    <!-- MẪU IN BILL 80mm -->
    <div v-if="printFormat === '80mm'" class="receipt-80mm bg-white p-4 shadow-lg text-black receipt-content" v-loading="loading">
      <div v-if="sale" class="w-full text-sm">
        
        <div class="text-center mb-4 border-b pb-4 border-dashed border-gray-400">
          <h2 class="text-xl font-bold uppercase mb-1">Cửa hàng Đại lý</h2>
          <div class="text-xs">Số 1 Đại Lộ, Thành phố</div>
          <div class="text-xs">SĐT: 1900 xxxx</div>
        </div>

        <div class="text-center mb-4">
          <h3 class="text-lg font-bold">HÓA ĐƠN BÁN LẺ</h3>
          <div class="text-xs mt-1">Mã HĐ: {{ sale.receiptNumber || sale.id.split('-')[0] }}</div>
          <div class="text-xs">Ngày: {{ formatDateTime(sale.saleDate) }}</div>
        </div>

        <div class="mb-2 text-xs">
          <div>Khách hàng: <span class="font-bold">{{ sale.customerName || 'Khách lẻ' }}</span></div>
          <div v-if="sale.customerPhone">SĐT: {{ sale.customerPhone }}</div>
        </div>

        <table class="w-full text-xs text-left mb-4">
          <thead>
            <tr class="border-y border-dashed border-gray-400">
              <th class="py-1">Tên hàng</th>
              <th class="py-1 text-center">SL</th>
              <th class="py-1 text-right">T.Tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in sale.items" :key="idx">
              <td class="py-1 pr-1">
                <div>{{ item.productName }}</div>
                <div class="text-[10px] text-gray-500 font-mono">{{ item.serialNumber }}</div>
              </td>
              <td class="py-1 text-center align-top">{{ item.quantity }}</td>
              <td class="py-1 text-right align-top">{{ formatCurrency(item.price) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="border-t border-dashed border-gray-400 pt-2 mb-6">
          <div class="flex justify-between font-bold text-base">
            <span>TỔNG CỘNG:</span>
            <span>{{ formatCurrency(sale.totalAmount) }}</span>
          </div>
          <div class="flex justify-between text-xs mt-1">
            <span>Hình thức TT:</span>
            <span class="uppercase">{{ sale.paymentMethod || 'TIỀN MẶT' }}</span>
          </div>
        </div>

        <div class="text-center text-xs space-y-1">
          <div>Cảm ơn Quý khách & Hẹn gặp lại!</div>
          <div class="text-[10px] text-gray-500">Powered by TrustID</div>
        </div>

      </div>
    </div>


    <!-- MẪU IN A4 -->
    <div v-if="printFormat === 'a4'" class="receipt-a4 bg-white p-8 shadow-lg text-black receipt-content" v-loading="loading">
      <div v-if="sale" class="w-full">
        
        <div class="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            <h2 class="text-3xl font-extrabold uppercase text-gray-800 tracking-wider">ĐẠI LÝ PHÂN PHỐI</h2>
            <div class="mt-1 text-gray-600">Địa chỉ: Số 1 Đường Mới, Quận 1, TP HCM</div>
            <div class="text-gray-600">Hotline: 1900 xxxx</div>
          </div>
          <div class="text-right">
            <h1 class="text-4xl font-bold uppercase text-blue-800 mb-2">HÓA ĐƠN</h1>
            <div class="text-gray-600 font-mono">Mã HĐ: {{ sale.receiptNumber || sale.id.split('-')[0].toUpperCase() }}</div>
            <div class="text-gray-600">Ngày lập: {{ formatDateTime(sale.saleDate) }}</div>
          </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 class="font-bold text-gray-700 uppercase mb-2 text-sm">Thông tin khách hàng</h3>
          <div class="grid grid-cols-2 gap-4">
            <div><span class="text-gray-500 w-20 inline-block">Họ tên:</span> <span class="font-bold text-lg">{{ sale.customerName || 'Khách mua lẻ' }}</span></div>
            <div><span class="text-gray-500 w-20 inline-block">Điện thoại:</span> <span class="font-medium">{{ sale.customerPhone || '---' }}</span></div>
          </div>
        </div>

        <table class="w-full text-left mb-6 border-collapse">
          <thead>
            <tr class="bg-gray-800 text-white">
              <th class="p-3 w-12 text-center rounded-tl-lg">STT</th>
              <th class="p-3">Tên Hàng Hóa, Dịch Vụ</th>
              <th class="p-3 w-40 text-center">Số Serial</th>
              <th class="p-3 w-16 text-center">SL</th>
              <th class="p-3 w-32 text-right">Đơn giá</th>
              <th class="p-3 w-32 text-right rounded-tr-lg">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in sale.items" :key="idx" class="border-b">
              <td class="p-3 text-center border-x">{{ Number(idx) + 1 }}</td>
              <td class="p-3 border-r font-medium">{{ item.productName }}</td>
              <td class="p-3 border-r text-center font-mono text-sm text-gray-600">{{ item.serialNumber }}</td>
              <td class="p-3 border-r text-center">{{ item.quantity }}</td>
              <td class="p-3 border-r text-right">{{ formatCurrency(item.price) }}</td>
              <td class="p-3 border-r text-right font-bold">{{ formatCurrency(Number(item.price) * Number(item.quantity)) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-end border-t-2 pt-4">
          <div class="w-80">
            <div class="flex justify-between mb-2">
              <span class="text-gray-600">Tổng tiền hàng:</span>
              <span>{{ formatCurrency(sale.totalAmount) }}</span>
            </div>
            <div class="flex justify-between mb-2">
              <span class="text-gray-600">Hình thức thanh toán:</span>
              <span class="uppercase font-bold">{{ sale.paymentMethod || 'Tiền mặt' }}</span>
            </div>
            <div class="flex justify-between text-2xl font-bold bg-blue-50 p-2 rounded mt-2 text-blue-800">
              <span>TỔNG CỘNG:</span>
              <span>{{ formatCurrency(sale.totalAmount) }}</span>
            </div>
          </div>
        </div>

        <div class="mt-12 text-center text-gray-500 italic">
          Cảm ơn Quý khách đã tin tưởng và sử dụng sản phẩm. Hóa đơn có giá trị lưu hành nội bộ.
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Back, Printer } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '@/common/utils/api';

const route = useRoute();
const id = route.params.id as string;

const loading = ref(false);
const sale = ref<any>(null);
const printFormat = ref('80mm');

const formatCurrency = (val: number | string) => {
  if (!val) return '0';
  return Number(val).toLocaleString('vi-VN');
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN');
};

const loadSaleDetail = async () => {
  if (!id) return;
  loading.value = true;
  try {
    const { data } = await api.get(`/dealer-dashboard/sale/${id}`);
    sale.value = data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải chi tiết hóa đơn');
  } finally {
    loading.value = false;
  }
};

const handlePrint = () => {
  window.print();
};

onMounted(() => {
  loadSaleDetail();
});
</script>

<style scoped>
/* Khổ 80mm ~ 3.15inch (tương đương 300px màn hình) */
.receipt-80mm {
  width: 302px; 
  margin: 0 auto;
  font-family: 'Courier New', Courier, monospace;
}

/* Khổ A4 ~ 210x297mm (tương đương ~794px width) */
.receipt-a4 {
  width: 794px;
  min-height: 1123px;
  margin: 0 auto;
}

@media print {
  /* Ẩn tất cả UI xung quanh */
  body * {
    visibility: hidden;
  }
  
  .print\:hidden {
    display: none !important;
  }

  /* Chỉ hiện nội dung phiếu in */
  .receipt-content, .receipt-content * {
    visibility: visible;
  }
  
  .receipt-content {
    position: absolute;
    left: 0;
    top: 0;
    box-shadow: none !important;
    background: white;
  }

  /* Can thiệp cấu hình trang in dựa theo loại phiếu */
  @page {
    /* Mặc định cho A4, Chrome auto tính */
    margin: 0;
  }
}
</style>
