<template>
  <div class="dealer-customers p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Quản lý Khách hàng</h2>
      <div class="flex gap-2">
        <el-button @click="$router.push('/dealer/customer-groups')" plain>
          <el-icon class="mr-1"><Collection /></el-icon>Nhóm KH
        </el-button>
        <el-input
          v-model="searchQuery"
          placeholder="Tìm tên hoặc SĐT..."
          prefix-icon="Search"
          class="w-64"
          clearable
          @keyup.enter="loadData(1)"
          @clear="loadData(1)"
        >
          <template #append>
            <el-button icon="Search" @click="loadData(1)" />
          </template>
        </el-input>
        <el-button type="primary" @click="showForm()">
          <el-icon class="mr-1"><Plus /></el-icon>Thêm mới
        </el-button>
      </div>
    </div>

    <el-card shadow="hover" class="mb-4">
      <el-table :data="customers" style="width: 100%" v-loading="loading">
        <el-table-column type="index" width="60" label="STT" align="center" />
        <el-table-column prop="name" label="Tên Khách Hàng">
          <template #default="{ row }">
            <span class="font-bold text-gray-800">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="Số điện thoại" width="150" />
        <el-table-column prop="address" label="Địa chỉ" min-width="200">
          <template #default="{ row }">
            <span class="text-gray-500">{{ row.address || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalPurchases" label="Số lần mua" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="success" v-if="row.totalPurchases > 0">{{ row.totalPurchases }} lần</el-tag>
            <span v-else class="text-gray-400">0</span>
          </template>
        </el-table-column>
        <el-table-column label="Nhóm KH" width="140" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.group"
              :color="row.group.color"
              effect="dark"
              size="small"
              style="border: none;"
            >{{ row.group.name }}</el-tag>
            <span v-else class="text-gray-400 text-xs">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="Ngày Tảo" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showForm(row)">
              Sửa
            </el-button>
            <!-- 
            <el-button type="danger" link @click="deleteCustomer(row)">
               Xóa
            </el-button>
            -->
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-4">
        <el-pagination
          v-if="total > 0"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="loadData(1)"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- Dialog Thêm/Sửa KH -->
    <el-dialog
      v-model="dialogVisible"
      :close-on-click-modal="false"
      :show-close="false"
      width="450px"
      class="branded-customer-dialog"
      destroy-on-close
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            {{ form.id ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng' }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="dialogVisible = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <el-form :model="form" label-position="top" @submit.prevent style="padding: 24px 24px 8px;">
        <el-form-item label="Tên khách hàng" required>
          <el-input v-model="form.name" placeholder="Ví dụ: Nguyễn Văn A" />
        </el-form-item>
        <el-form-item label="Số điện thoại" required>
          <el-input v-model="form.phone" placeholder="Nhập số điện thoại" />
        </el-form-item>
        <el-form-item label="Địa chỉ">
          <el-input v-model="form.address" type="textarea" placeholder="Số nhà, đường, phường, quận..." />
        </el-form-item>
        <el-form-item label="Nhóm khách hàng">
          <el-select v-model="form.groupId" placeholder="Chọn nhóm (tùy chọn)" clearable class="w-full">
            <el-option
              v-for="g in customerGroups"
              :key="g.id"
              :label="g.name"
              :value="g.id"
            >
              <span class="flex items-center gap-2">
                <span :style="{ background: g.color, width: '12px', height: '12px', borderRadius: '3px', display: 'inline-block' }"></span>
                {{ g.name }}
                <span v-if="Number(g.discountPercent) > 0" class="text-gray-400 text-xs ml-auto">-{{ g.discountPercent }}%</span>
              </span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="dialogVisible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button type="primary" @click="save" :loading="saving" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
            Lưu
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Search, Plus, Collection } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';
import dayjs from 'dayjs';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const customers = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const searchQuery = ref('');

const dialogVisible = ref(false);
const saving = ref(false);
const form = ref({ id: '', name: '', phone: '', address: '', groupId: '' });
const customerGroups = ref<any[]>([]);

const formatDate = (val: string) => {
  if (!val) return '';
  return dayjs(val).format('DD/MM/YYYY HH:mm');
};

const loadData = async (page = currentPage.value) => {
  currentPage.value = page;
  loading.value = true;
  try {
    const { data } = await api.get('/dealer-customers', {
      params: { page: currentPage.value, limit: pageSize.value, search: searchQuery.value }
    });
    customers.value = data.data;
    total.value = data.meta.total;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || 'Lỗi tải danh sách khách hàng');
  } finally {
    loading.value = false;
  }
};

const showForm = (row?: any) => {
  if (row) {
    form.value = { id: row.id, name: row.name, phone: row.phone, address: row.address, groupId: row.groupId || '' };
  } else {
    form.value = { id: '', name: '', phone: '', address: '', groupId: '' };
  }
  dialogVisible.value = true;
};

const save = async () => {
  if (!form.value.name || !form.value.phone) {
    ElMessage.warning('Vui lòng nhập đầy đủ tên và số điện thoại');
    return;
  }

  saving.value = true;
  try {
    const payload = { ...form.value, groupId: form.value.groupId || null };
    if (form.value.id) {
      await api.put(`/dealer-customers/${form.value.id}`, payload);
    } else {
      await api.post('/dealer-customers', payload);
    }
    ElMessage.success('Lưu thành công');
    dialogVisible.value = false;
    loadData();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi khi lưu');
  } finally {
    saving.value = false;
  }
};

// Phân quyền cho dealer: Admin doanh nghiệp có xem được không? => Theo spec thì API yêu cầu Role DEALER.
onMounted(async () => {
  loadData();
  try {
    const { data } = await api.get('/customer-groups');
    customerGroups.value = data;
  } catch { /* silent */ }
});
</script>

<style>
.branded-customer-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-customer-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-customer-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-customer-dialog .el-dialog__footer {
  padding: 0 !important;
  border-top: none !important;
}
</style>
