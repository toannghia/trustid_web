<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { codeApi } from '../api/code';
import { ElMessage } from 'element-plus';
import { Download, Search, Refresh, View } from '@element-plus/icons-vue';

// Định nghĩa kiểu dữ liệu để TypeScript không báo lỗi 'never'
interface CodePool {
  id: string;
  name: string;
  quantity: number;
  prefix: string;
  status: 'PENDING' | 'AVAILABLE' | 'EXPORTED';
  created_at: string;
  tenant_name?: string;
}

const loading = ref(false);
const pools = ref<CodePool[]>([]); // Khai báo Generic Type chuẩn

const filter = reactive({
  name: '',
  status: ''
});

const fetchPools = async () => {
  loading.value = true;
  try {
    const { data } = await codeApi.getPools(filter);
    pools.value = data;
  } catch (err) {
    ElMessage.error('Không thể tải danh sách lô mã');
  } finally {
    loading.value = false;
  }
};

const handleDownload = async (pool: CodePool) => {
  try {
    const response = await codeApi.exportExcel(pool.id);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CodePool_${pool.prefix}_${pool.name}.xlsx`);
    document.body.appendChild(link);
    link.click();
    ElMessage.success('Bắt đầu tải về tệp tin lô tem');
  } catch (err) {
    ElMessage.error('Lỗi khi xuất dữ liệu');
  }
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'success';
    case 'PENDING': return 'warning';
    case 'EXPORTED': return 'info';
    default: return 'primary';
  }
};

onMounted(fetchPools);
</script>

<template>
  <div class="code-pools-container">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Quản lý Kho lô tem</h2>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">Trang chủ</el-breadcrumb-item>
        <el-breadcrumb-item>Kho mã</el-breadcrumb-item>
        <el-breadcrumb-item>Danh sách lô mã</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="bg-white p-5 rounded-md shadow-sm border border-gray-100 mb-6">
      <div class="flex flex-wrap gap-4">
        <el-input 
          v-model="filter.name" 
          placeholder="Tìm theo tên lô mã..." 
          class="!w-64"
          :prefix-icon="Search"
          clearable
        />
        <el-select v-model="filter.status" placeholder="Trạng thái" clearable class="!w-48">
          <el-option label="Sẵn sàng" value="AVAILABLE" />
          <el-option label="Đang xử lý" value="PENDING" />
          <el-option label="Đã xuất file" value="EXPORTED" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="fetchPools">Tìm kiếm</el-button>
        <el-button :icon="Refresh" @click="() => { filter.name = ''; filter.status = ''; fetchPools(); }">Làm mới</el-button>
      </div>
    </div>

    <div class="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden">
      <el-table 
        :data="pools" 
        v-loading="loading" 
        style="width: 100%"
        header-cell-class-name="bg-gray-50 text-gray-700 font-bold"
      >
        <el-table-column prop="name" label="Tên lô mã" min-width="200">
          <template #default="scope">
            <span class="font-medium text-blue-600 cursor-pointer">{{ scope.row.name }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="prefix" label="Tiền tố" width="100" />
        
        <el-table-column prop="quantity" label="Số lượng" width="150">
          <template #default="scope">
            <b class="text-gray-800">{{ scope.row.quantity.toLocaleString() }}</b> tem
          </template>
        </el-table-column>

        <el-table-column prop="status" label="Trạng thái" width="130">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" effect="dark" size="small">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="Ngày tạo" width="180">
          <template #default="scope">
            <span class="text-gray-500 text-sm">{{ new Date(scope.row.created_at).toLocaleString('vi-VN') }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="180" fixed="right" align="center">
          <template #default="scope">
            <div class="flex justify-center gap-2">
              <el-tooltip content="Xem chi tiết tem">
                <el-button size="small" :icon="View" circle />
              </el-tooltip>
              <el-tooltip content="Tải file cho nhà in">
                <el-button 
                  size="small" 
                  type="success" 
                  :icon="Download" 
                  circle 
                  @click="handleDownload(scope.row)"
                />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="p-4 flex justify-end bg-gray-50 border-t border-gray-100">
        <el-pagination 
          layout="total, prev, pager, next" 
          :total="pools.length" 
          background 
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Tùy chỉnh Header bảng theo style AdminLTE */
:deep(.el-table__header-wrapper th) {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}
</style>