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

    <!-- Tabs: Giá gốc | Giá theo nhóm KH -->
    <el-tabs v-model="activeTab" type="border-card" class="mb-4" @tab-change="onTabChange">
      <el-tab-pane label="Giá gốc (tất cả)" name="base">
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
                <el-select
                  v-model="row.unit"
                  size="small"
                  placeholder="Chọn đơn vị"
                  filterable
                  allow-create
                  default-first-option
                >
                  <el-option
                    v-for="opt in unitOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </template>
            </el-table-column>
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

            <el-select
              v-model="newPrice.unit"
              placeholder="Đơn vị"
              style="width: 120px"
              filterable
              allow-create
              default-first-option
            >
              <el-option
                v-for="opt in unitOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
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
      </el-tab-pane>

      <!-- Tab: Giá theo nhóm KH -->
      <el-tab-pane label="Giá theo Nhóm KH" name="group">
        <div v-if="customerGroups && customerGroups.length > 0" class="customer-group-tags-container mb-6">
          <div class="flex flex-wrap gap-3 items-center">
            <div
              v-for="g in customerGroups"
              :key="g.id"
              class="group-tag-item"
              :class="{ active: selectedGroupId === g.id }"
              @click="selectGroup(g.id)"
            >
              <span class="group-color-dot" :style="{ backgroundColor: g.color || '#909399' }"></span>
              <span class="group-name">{{ g.name }}</span>
              <span class="group-count">{{ g.customerCount || 0 }} KH</span>
            </div>
            
            <div v-if="selectedGroupObj" class="ml-auto text-sm bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100 flex items-center gap-2">
              <span class="text-gray-500">Chiết khấu mặc định:</span>
              <strong class="text-green-600 font-semibold">{{ selectedGroupObj.discountPercent }}%</strong>
            </div>
          </div>
        </div>

        <el-card shadow="hover" v-if="selectedGroupId">
          <el-table :data="groupRulesComputed" style="width: 100%" v-loading="loadingRules" empty-text="Chưa có rule nào cho nhóm này">
            <el-table-column type="index" width="60" label="STT" />
            <el-table-column label="Sản phẩm" min-width="200">
              <template #default="{ row }">
                <strong>{{ row.productName }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="Giá gốc" width="160" align="right">
              <template #default="{ row }">
                <span class="text-gray-500">{{ formatVND(row.basePrice) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Loại Rule" width="180" align="center">
              <template #default="{ row }">
                <el-select v-model="row.ruleType" size="small" placeholder="Chọn loại" @change="() => computeGroupFinalPrice(row)">
                  <el-option label="Giá cứng" value="fixed_price" />
                  <el-option label="% Chiết khấu" value="discount_percent" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="Giá trị" width="180">
              <template #default="{ row }">
                <el-input-number
                  v-if="row.ruleType === 'fixed_price'"
                  v-model="row.fixedPrice"
                  :min="0"
                  :controls="false"
                  size="small"
                  style="width: 140px"
                  placeholder="Giá bán"
                  @change="() => computeGroupFinalPrice(row)"
                />
                <el-input-number
                  v-else
                  v-model="row.discountPercent"
                  :min="0"
                  :max="100"
                  :precision="1"
                  :controls="false"
                  size="small"
                  style="width: 140px"
                  placeholder="% CK"
                  @change="() => computeGroupFinalPrice(row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="Giá cuối" width="160" align="right">
              <template #default="{ row }">
                <strong class="text-blue-600">{{ formatVND(row.computedFinalPrice) }}</strong>
              </template>
            </el-table-column>
            <el-table-column label="Thao tác" width="160" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="success" size="small" @click="saveGroupRule(row)" :loading="savingRuleId === row.productId">Lưu</el-button>
                <el-button v-if="row.ruleId" type="danger" size="small" link @click="deleteGroupRule(row)">Xóa</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-empty v-else description="Chọn 1 nhóm KH để xem / cài đặt bảng giá riêng" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const route = useRoute();

const prices = ref<any[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const savingId = ref<string | null>(null);
const activeTab = ref('base');

// Customer Groups
const customerGroups = ref<any[]>([]);
const selectedGroupId = ref('');
const groupRules = ref<any[]>([]);
const loadingRules = ref(false);
const savingRuleId = ref<string | null>(null);

// For new product addition
const systemProducts = ref<any[]>([]);
const searchingProducts = ref(false);
const addingNew = ref(false);
const newPrice = ref({
  productId: '',
  sellingPrice: 0,
  unit: 'cái'
});

const unitOptions = ref([
  { label: 'Cái', value: 'cái' },
  { label: 'Hộp', value: 'hộp' },
  { label: 'Thùng', value: 'thùng' },
  { label: 'Chai', value: 'chai' },
  { label: 'Gói', value: 'gói' },
  { label: 'Kg', value: 'kg' },
  { label: 'Lon', value: 'lon' },
  { label: 'Vỉ', value: 'vỉ' },
  { label: 'Tuýp', value: 'tuýp' },
  { label: 'Mét', value: 'mét' },
  { label: 'Lít', value: 'lít' },
  { label: 'Túi', value: 'túi' }
]);

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

const selectedGroupObj = computed(() => {
  return customerGroups.value.find(g => g.id === selectedGroupId.value) || null;
});

// Merge base prices with existing group rules to show all products
const groupRulesComputed = computed(() => {
  return prices.value.map(p => {
    const rule = groupRules.value.find(r => r.productId === p.productId);
    const basePrice = Number(p.sellingPrice) || 0;
    const row: any = {
      productId: p.productId,
      productName: p.productName || p.product?.name,
      basePrice,
      ruleId: rule?.id || null,
      ruleType: rule?.ruleType || 'discount_percent',
      fixedPrice: rule?.fixedPrice ? Number(rule.fixedPrice) : basePrice,
      discountPercent: rule?.discountPercent ? Number(rule.discountPercent) : (Number(selectedGroupObj.value?.discountPercent) || 0),
      computedFinalPrice: basePrice
    };
    computeGroupFinalPrice(row);
    return row;
  });
});

const computeGroupFinalPrice = (row: any) => {
  if (row.ruleType === 'fixed_price') {
    row.computedFinalPrice = Number(row.fixedPrice) || 0;
  } else {
    const disc = Number(row.discountPercent) || 0;
    row.computedFinalPrice = Math.round(row.basePrice * (1 - disc / 100));
  }
};

const loadPrices = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/dealer-prices');
    prices.value = data.map((item: any) => ({
      ...item,
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
      const { data } = await api.get('/products', { params: { search: query, limit: 10 } });
      systemProducts.value = data.data || data;
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
    newPrice.value.productId = '';
    newPrice.value.sellingPrice = 0;
    await loadPrices();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi thêm sản phẩm');
  } finally {
    addingNew.value = false;
  }
};

// --- Group pricing ---

const selectGroup = async (groupId: string) => {
  selectedGroupId.value = groupId;
  await onGroupChange();
};

const loadGroups = async () => {
  try {
    const { data } = await api.get('/customer-groups');
    customerGroups.value = data;
    if (data && data.length > 0 && !selectedGroupId.value) {
      selectedGroupId.value = data[0].id;
      await onGroupChange();
    }
  } catch { /* silent */ }
};

const onGroupChange = async () => {
  if (!selectedGroupId.value) {
    groupRules.value = [];
    return;
  }
  loadingRules.value = true;
  try {
    const { data } = await api.get(`/customer-groups/${selectedGroupId.value}/pricing-rules`);
    groupRules.value = data;
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi tải rules');
  } finally {
    loadingRules.value = false;
  }
};

const saveGroupRule = async (row: any) => {
  savingRuleId.value = row.productId;
  try {
    await api.post('/customer-groups/pricing-rules', {
      groupId: selectedGroupId.value,
      productId: row.productId,
      ruleType: row.ruleType,
      fixedPrice: row.ruleType === 'fixed_price' ? row.fixedPrice : undefined,
      discountPercent: row.ruleType === 'discount_percent' ? row.discountPercent : undefined
    });
    ElMessage.success('Đã lưu rule giá');
    await onGroupChange();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi lưu rule');
  } finally {
    savingRuleId.value = null;
  }
};

const deleteGroupRule = async (row: any) => {
  if (!row.ruleId) return;
  try {
    await ElMessageBox.confirm(
      `Xóa rule giá cho "${row.productName}"? Sẽ trở về CK mặc định nhóm.`,
      'Xác nhận xóa',
      { confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', type: 'warning' }
    );
    await api.delete(`/customer-groups/pricing-rules/${row.ruleId}`);
    ElMessage.success('Đã xóa rule');
    await onGroupChange();
  } catch { /* cancelled */ }
};

const onTabChange = (tab: string) => {
  if (tab === 'group' && customerGroups.value.length === 0) {
    loadGroups();
  }
};

onMounted(async () => {
  await loadPrices();
  await loadGroups();

  // Auto-select group if navigated from DealerCustomerGroups page
  const qGroupId = route.query.groupId as string;
  if (qGroupId) {
    activeTab.value = 'group';
    selectedGroupId.value = qGroupId;
    await onGroupChange();
  }
});
</script>

<style scoped>
.dealer-pricing .el-card {
  border-radius: 8px;
}

.customer-group-tags-container {
  width: 100%;
}

.group-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  user-select: none;
}

.group-tag-item:hover {
  background-color: #e5e7eb;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.group-tag-item.active {
  background-color: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
  box-shadow: 0 4px 6px -1px rgba(64, 158, 255, 0.1), 0 2px 4px -1px rgba(64, 158, 255, 0.06);
}

.group-color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.group-name {
  font-weight: 500;
  font-size: 14px;
}

.group-count {
  font-size: 12px;
  color: #9ca3af;
  background-color: #ffffff;
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.group-tag-item.active .group-count {
  color: #409eff;
  border-color: #d9ecff;
  background-color: #ffffff;
}
</style>
