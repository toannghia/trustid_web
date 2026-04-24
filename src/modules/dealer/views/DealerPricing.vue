<template>
  <div class="dealer-pricing p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Cài đặt Bảng giá Bán lẻ</h2>
      <div>
        <el-input
          v-model="searchQuery"
          placeholder="Tìm kiếm sản phẩm..."
          prefix-icon="Search"
          class="w-64"
          clearable
        />
        <el-button type="primary"   @click="loadPrices" class="ml-2">
          <el-icon class="mr-1"><Refresh /></el-icon>Làm mới
        </el-button>
      </div>
    </div>

    <el-card shadow="hover" class="mb-4">
      <template #header>
        <div class="card-header flex justify-between items-center text-sm font-medium text-gray-600">
          <span>*Lưu ý: Bảng giá này được dùng tự động nhập giá khi quét mã QR lúc bán lẻ cho khách. Nếu không có ở đây, hệ thống sẽ mặc định giá bán là 0.</span>
        </div>
      </template>
      <el-table :data="filteredPrices" style="width: 100%" v-loading="loading">
        <el-table-column type="index" width="60" label="STT"></el-table-column>
        <el-table-column prop="productName" label="Tên Sản Phẩm" min-width="250">
          <template #default="{row}">
            <strong>{{ row.productName || (row.product?.name) }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="Đơn vị tính" width="150" align="center">
          <template #default="{ row }">
            <el-select v-model="row.unit" size="small" placeholder="Chọn đơn vị">
              <el-option label="Cái" value="cái" />
              <el-option label="Hộp" value="hộp" />
              <el-option label="Thùng" value="thùng" />
              <el-option label="Chai" value="chai" />
              <el-option label="Gói" value="gói" />
              <el-option label="Kg" value="kg" />
            </el-select>
          </template>
        </el-table-column>
        <!-- 
        <el-table-column label="Giá gốc (từ NM)" width="180" align="right">
          <template #default="{ row }">
            {{ row.costPrice ? formatVND(row.costPrice) : 'Chưa cập nhật' }}
          </template>
        </el-table-column>
        -->
        <el-table-column label="Giá bán (VND)" width="220">
          <template #default="{ row }">
            <el-input-number 
              v-model="row.sellingPrice" 
              :min="0" 
              :controls="false"
              style="width: 150px"
              placeholder="Nhập giá bán"
            />
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button 
              type="success" 
              size="small" 
              @click="savePrice(row)"
              :loading="savingId === row.productId"
            >
              Lưu
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Thêm sản phẩm mới vào danh sách giá -->
    <el-card shadow="hover">
      <template #header>
        <div class="font-bold border-b pb-2">Thêm Sản phẩm vào Bảng giá</div>
      </template>
      <div class="flex gap-4 items-center">
        <el-select
          v-model="newPrice.productId"
          filterable
          remote
          reserve-keyword
          placeholder="Tìm sản phẩm trên hệ thống"
          :remote-method="searchSystemProducts"
          :loading="searchingProducts"
          class="flex-1"
        >
          <el-option
            v-for="item in systemProducts"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          >
            <span style="float: left">{{ item.name }}</span>
            <span
              style="
                float: right;
                color: var(--el-text-color-secondary);
                font-size: 13px;
              "
            >
              GTIN: {{ item.gtin || 'N/A' }}
            </span>
          </el-option>
        </el-select>
        
        <el-input-number 
          v-model="newPrice.sellingPrice" 
          :min="0" 
          :controls="false"
          placeholder="Giá bán (VND)"
        />

        <el-select v-model="newPrice.unit" placeholder="Đơn vị" style="width: 120px">
          <el-option label="Cái" value="cái" />
          <el-option label="Hộp" value="hộp" />
          <el-option label="Thùng" value="thùng" />
        </el-select>

        <el-button 
          type="primary" 
          @click="addPrice" 
          :loading="addingNew"
          :disabled="!newPrice.productId"
        >
          Thêm vào BG
        </el-button>
      </div>
    </el-card>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '@/common/utils/api';

const prices = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const savingId = ref<string | null>(null);

// For new product addition
const systemProducts = ref<any[]>([]);
const searchingProducts = ref(false);
const addingNew = ref(false);
const newPrice = ref({
  productId: '',
  sellingPrice: 0,
  unit: 'cái'
});

const formatVND = (val: number | string) => {
  if (!val) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
};

const filteredPrices = computed(() => {
  if (!searchQuery.value) return prices.value;
  const lowerQ = searchQuery.value.toLowerCase();
  return prices.value.filter(p => {
    const name = p.productName || p.product?.name || '';
    return name.toLowerCase().includes(lowerQ);
  });
});

const loadPrices = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/dealer-prices');
    prices.value = data.map((item: any) => ({
      ...item,
      // Ensure we have productId directly on root for template logic
      productId: item.productId || item.product?.id,
      sellingPrice: Number(item.sellingPrice)
    }));
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải danh sách giá');
  } finally {
    loading.value = false;
  }
};

const savePrice = async (row: any) => {
  savingId.value = row.productId;
  try {
    await api.post('/dealer-prices', {
      productId: row.productId,
      sellingPrice: row.sellingPrice,
      unit: row.unit
    });
    ElMessage.success('Đã lưu giá thành công');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi khi lưu giá');
  } finally {
    savingId.value = null;
  }
};

const searchSystemProducts = async (query: string) => {
  if (query) {
    searchingProducts.value = true;
    try {
      // Dùng endpoint tra cứu sản phẩm có sẵn
      const { data } = await api.get('/products', { params: { search: query, limit: 10 } });
      systemProducts.value = data.data || data; // Fallback if no pagination
    } catch (e) {
      systemProducts.value = [];
    } finally {
      searchingProducts.value = false;
    }
  } else {
    systemProducts.value = [];
  }
};

const addPrice = async () => {
  if (!newPrice.value.productId) return;
  addingNew.value = true;
  try {
    await api.post('/dealer-prices', {
      productId: newPrice.value.productId,
      sellingPrice: newPrice.value.sellingPrice,
      unit: newPrice.value.unit
    });
    ElMessage.success('Đã thêm sản phẩm vào bảng giá');
    
    // Reset form
    newPrice.value.productId = '';
    newPrice.value.sellingPrice = 0;
    
    // Reload list
    await loadPrices();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi thêm sản phẩm');
  } finally {
    addingNew.value = false;
  }
};

onMounted(() => {
  loadPrices();
});
</script>

<style scoped>
.dealer-pricing .el-card {
  border-radius: 8px;
}
</style>
