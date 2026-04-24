<template>
  <div class="dealer-customers p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Quản lý Khách hàng</h2>
      <div class="flex gap-2">
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
    <el-dialog v-model="dialogVisible" :title="form.id ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng'" width="450px" destroy-on-close>
      <el-form :model="form" label-position="top" @submit.prevent>
        <el-form-item label="Tên khách hàng" required>
          <el-input v-model="form.name" placeholder="Ví dụ: Nguyễn Văn A" />
        </el-form-item>
        <el-form-item label="Số điện thoại" required>
          <el-input v-model="form.phone" placeholder="Nhập số điện thoại" />
        </el-form-item>
        <el-form-item label="Địa chỉ">
          <el-input v-model="form.address" type="textarea" placeholder="Số nhà, đường, phường, quận..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">Hủy</el-button>
          <el-button type="primary" @click="save" :loading="saving">Lưu</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Search, Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';
import dayjs from 'dayjs';

const customers = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const searchQuery = ref('');

const dialogVisible = ref(false);
const saving = ref(false);
const form = ref({ id: '', name: '', phone: '', address: '' });

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
    form.value = { id: row.id, name: row.name, phone: row.phone, address: row.address };
  } else {
    form.value = { id: '', name: '', phone: '', address: '' };
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
    if (form.value.id) {
      await api.put(`/dealer-customers/${form.value.id}`, form.value);
    } else {
      await api.post('/dealer-customers', form.value);
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
onMounted(() => {
  loadData();
});
</script>
