<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Goods, Search, Refresh, View, Hide } from '@element-plus/icons-vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import api from '@/common/utils/api';

interface DisplayProduct {
  id: string;
  name: string;
  gtinCode: string | null;
  price: number | null;
  image: string | null;
  tenantName: string | null;
  tenantId: string | null;
  categoryName: string | null;
  isConsumerVisible: boolean;
  showPrice: boolean;
}

const loading = ref(false);
const products = ref<DisplayProduct[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const searchText = ref('');
const filterVisible = ref<string>(''); // '', 'true', 'false'
const selectedIds = ref<string[]>([]);

const tenants = ref<{ id: string; name: string }[]>([]);
const filterTenantId = ref('');
const hideDisabled = ref(false);

const fetchTenants = async () => {
  try {
    const { data } = await api.get('/tenants');
    tenants.value = (data || []).map((t: any) => ({ id: t.id, name: t.name }));
  } catch { /* ignore */ }
};

const fetchProducts = async () => {
  loading.value = true;
  try {
    const params: any = { page: page.value, limit: limit.value };
    if (searchText.value) params.search = searchText.value;
    if (hideDisabled.value) {
      params.isConsumerVisible = 'true';
    } else if (filterVisible.value) {
      params.isConsumerVisible = filterVisible.value;
    }
    if (filterTenantId.value) params.tenantId = filterTenantId.value;

    const { data } = await api.get('/admin/consumer-display', { params });
    products.value = data.data;
    total.value = data.meta.total;
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi tải danh sách');
  } finally {
    loading.value = false;
  }
};

const toggleVisibility = async (row: DisplayProduct) => {
  try {
    await api.put(`/admin/consumer-display/${row.id}`, {
      isConsumerVisible: row.isConsumerVisible,
    });
    ElMessage.success(row.isConsumerVisible ? 'Đã bật hiển thị' : 'Đã tắt hiển thị');
    if (!row.isConsumerVisible) {
      row.showPrice = true;
    }
  } catch (e: any) {
    row.isConsumerVisible = !row.isConsumerVisible;
    ElMessage.error('Lỗi cập nhật');
  }
};

const toggleShowPrice = async (row: DisplayProduct) => {
  try {
    await api.put(`/admin/consumer-display/${row.id}`, {
      showPrice: row.showPrice,
    });
    ElMessage.success(row.showPrice ? 'Đã bật hiển thị giá' : 'Đã ẩn giá');
  } catch (e: any) {
    row.showPrice = !row.showPrice;
    ElMessage.error('Lỗi cập nhật');
  }
};

const handleSelectionChange = (rows: DisplayProduct[]) => {
  selectedIds.value = rows.map(r => r.id);
};

const bulkUpdate = async (visible: boolean) => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('Vui lòng chọn sản phẩm');
    return;
  }

  const action = visible ? 'BẬT hiển thị' : 'TẮT hiển thị';
  try {
    await ElMessageBox.confirm(
      `${action} cho ${selectedIds.value.length} sản phẩm đã chọn?`,
      'Xác nhận',
      { confirmButtonText: 'Xác nhận', cancelButtonText: 'Hủy', type: 'warning' }
    );

    await api.put('/admin/consumer-display/bulk/update', {
      productIds: selectedIds.value,
      isConsumerVisible: visible,
    });

    ElMessage.success(`Đã ${action} cho ${selectedIds.value.length} sản phẩm`);
    fetchProducts();
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('Lỗi cập nhật hàng loạt');
    }
  }
};

const formatPrice = (price: number | null) => {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

const handlePageChange = (newPage: number) => {
  page.value = newPage;
  fetchProducts();
};

const handleSearch = () => {
  page.value = 1;
  fetchProducts();
};

watch([filterVisible, filterTenantId], () => {
  page.value = 1;
  fetchProducts();
});

onMounted(() => {
  fetchProducts();
  fetchTenants();
});
</script>

<template>
  <div>
    <LTEContentHeader title="Cấu hình hiển thị SP Consumer" :breadcrumbs="[
      { title: 'Hệ thống' },
      { title: 'Cấu hình hiển thị SP' },
    ]" />

    <div class="max-w-7xl mx-auto">
      <!-- Stats Summary -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="background: linear-gradient(135deg, #00875A, #047857); border-radius: 12px; padding: 20px; color: #fff; box-shadow: 0 4px 12px rgba(0,135,90,0.3);">
          <div style="font-size: 28px; font-weight: 700;">{{ products.filter(p => p.isConsumerVisible).length }}</div>
          <div style="font-size: 13px; opacity: 0.85; margin-top: 4px;">Đang hiển thị (trang này)</div>
        </div>
        <div style="background: linear-gradient(135deg, #64748b, #475569); border-radius: 12px; padding: 20px; color: #fff; box-shadow: 0 4px 12px rgba(100,116,139,0.3);">
          <div style="font-size: 28px; font-weight: 700;">{{ products.filter(p => !p.isConsumerVisible).length }}</div>
          <div style="font-size: 13px; opacity: 0.85; margin-top: 4px;">Đang ẩn (trang này)</div>
        </div>
        <div style="background: linear-gradient(135deg, #0F2B46, #1e3a5f); border-radius: 12px; padding: 20px; color: #fff; box-shadow: 0 4px 12px rgba(15,43,70,0.3);">
          <div style="font-size: 28px; font-weight: 700;">{{ total }}</div>
          <div style="font-size: 13px; opacity: 0.85; margin-top: 4px;">Tổng sản phẩm</div>
        </div>
      </div>

      <LTECard variant="primary" outline>
        <template #header>
          <div class="font-bold flex items-center gap-2">
            <el-icon><Goods /></el-icon>
            Danh sách sản phẩm
          </div>
        </template>

        <!-- Filters - tất cả trên cùng 1 hàng -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <el-input v-model="searchText" placeholder="Tìm theo tên SP, GTIN..." :prefix-icon="Search"
            style="width: 220px;" clearable @keyup.enter="handleSearch" @clear="handleSearch" />
          <el-select v-model="filterVisible" placeholder="Trạng thái" clearable style="width: 150px;">
            <el-option label="Đang hiển thị" value="true" />
            <el-option label="Đang ẩn" value="false" />
          </el-select>
          <el-select v-model="filterTenantId" placeholder="Doanh nghiệp" clearable filterable style="width: 220px;">
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
          <el-button :icon="Search" type="primary" @click="handleSearch">Tìm</el-button>
          <el-button :icon="Refresh" @click="searchText = ''; filterVisible = ''; filterTenantId = ''; hideDisabled = false; handleSearch()">
            Đặt lại
          </el-button>
          <el-checkbox v-model="hideDisabled" @change="handleSearch"
            style="margin-left: 8px;">
            Ẩn SP đang tắt
          </el-checkbox>
        </div>

        <!-- Bulk Actions toolbar (chỉ hiện khi có chọn) -->
        <div v-if="selectedIds.length > 0"
          style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px 12px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
          <span style="font-size: 13px; color: #0369a1;">Đã chọn <b>{{ selectedIds.length }}</b> sản phẩm →</span>
          <el-button type="success" size="small" :icon="View" @click="bulkUpdate(true)">
            Bật hiển thị
          </el-button>
          <el-button type="danger" size="small" :icon="Hide" @click="bulkUpdate(false)">
            Tắt hiển thị
          </el-button>
        </div>

        <!-- Table -->
        <el-table :data="products" v-loading="loading" stripe border
          @selection-change="handleSelectionChange" row-key="id"
          :header-cell-style="{ background: '#f8fafc', fontWeight: 'bold' }">
          <el-table-column type="selection" width="45" />

          <el-table-column label="Ảnh" width="70" align="center">
            <template #default="{ row }">
              <el-image v-if="row.image" :src="row.image" fit="cover"
                style="width: 40px; height: 40px; border-radius: 6px;" />
              <div v-else style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 11px;">
                N/A
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Tên sản phẩm" prop="name" min-width="200">
            <template #default="{ row }">
              <div>
                <div style="font-weight: 500;">{{ row.name }}</div>
                <div v-if="row.gtinCode" style="font-size: 12px; color: #9ca3af;">GTIN: {{ row.gtinCode }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Doanh nghiệp" prop="tenantName" min-width="150">
            <template #default="{ row }">
              <span style="color: #4b5563;">{{ row.tenantName || '—' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="Danh mục" prop="categoryName" width="130">
            <template #default="{ row }">
              <el-tag size="small" type="info" effect="plain">{{ row.categoryName || '—' }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="Giá gốc" width="130" align="right">
            <template #default="{ row }">
              <span style="font-weight: 500;">{{ formatPrice(row.price) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="Hiển thị Consumer" width="160" align="center">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <el-switch v-model="row.isConsumerVisible" @change="toggleVisibility(row)"
                  style="--el-switch-on-color: #00875A; --el-switch-off-color: #dcdfe6;" />
                <el-tag :type="row.isConsumerVisible ? 'success' : 'info'" size="small" effect="dark"
                  style="min-width: 42px; text-align: center;">
                  {{ row.isConsumerVisible ? 'Bật' : 'Tắt' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="Hiện giá" width="140" align="center">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <el-switch v-model="row.showPrice" @change="toggleShowPrice(row)"
                  :disabled="!row.isConsumerVisible"
                  style="--el-switch-on-color: #0F2B46; --el-switch-off-color: #dcdfe6;" />
                <el-tag v-if="row.isConsumerVisible" :type="row.showPrice ? '' : 'warning'" size="small"
                  :effect="row.showPrice ? 'dark' : 'light'"
                  :style="row.showPrice ? 'background: #0F2B46; border-color: #0F2B46; min-width: 42px; text-align: center;' : 'min-width: 42px; text-align: center;'">
                  {{ row.showPrice ? 'Có' : 'Ẩn' }}
                </el-tag>
                <el-tag v-else type="info" size="small" effect="light" style="min-width: 42px; text-align: center;">—</el-tag>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- Pagination -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
          <span style="font-size: 13px; color: #6b7280;">
            Hiển thị {{ products.length }} / {{ total }} sản phẩm
          </span>
          <el-pagination
            v-model:current-page="page"
            :page-size="limit"
            :total="total"
            layout="prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </LTECard>
    </div>
  </div>
</template>
