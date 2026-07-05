<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <div class="p-2 bg-red-100 rounded-lg text-red-600"><el-icon><DataLine /></el-icon></div>
          Báo cáo Thu hồi Sản phẩm
        </h2>
        <p class="text-gray-500 text-sm mt-1">Tổng hợp tình hình thu hồi sản phẩm theo thời gian</p>
      </div>
    </div>

    <!-- Filters -->
    <el-card shadow="never" class="!rounded-xl mb-6">
      <div class="flex flex-wrap items-end gap-4">
        <div class="w-80">
          <div class="text-xs font-bold text-gray-500 mb-1 uppercase">Khoảng thời gian</div>
          <el-date-picker v-model="dateRange" type="daterange" range-separator="Đến"
            start-placeholder="Từ ngày" end-placeholder="Đến ngày" format="DD/MM/YYYY"
            class="!w-full" :clearable="false" @change="handleDateChange" />
        </div>
        <el-button type="primary" :icon="Search" @click="fetchReport" :loading="loading">Lấy dữ liệu</el-button>
      </div>
    </el-card>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-500">
        <div class="text-xs text-gray-500 font-medium uppercase">Tổng lệnh</div>
        <div class="text-2xl font-bold mt-1">{{ summary.totalOrders }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
        <div class="text-xs text-gray-500 font-medium uppercase">Tem ảnh hưởng</div>
        <div class="text-2xl font-bold mt-1 text-blue-600">{{ summary.totalAffected }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
        <div class="text-xs text-gray-500 font-medium uppercase">Đã thu hồi</div>
        <div class="text-2xl font-bold mt-1 text-orange-600">{{ summary.totalReturned }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
        <div class="text-xs text-gray-500 font-medium uppercase">Đã hủy</div>
        <div class="text-2xl font-bold mt-1 text-red-600">{{ summary.totalDisposed }}</div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
        <div class="text-xs text-gray-500 font-medium uppercase">Tái nhập kho</div>
        <div class="text-2xl font-bold mt-1 text-green-600">{{ summary.totalRestocked }}</div>
      </div>
    </div>

    <!-- Detail Table -->
    <el-card shadow="never" class="!rounded-xl">
      <el-table :data="orders" v-loading="loading" stripe border>
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column label="Mã lệnh" width="150">
          <template #default="{ row }"><span class="font-mono font-bold text-blue-600">{{ row.code }}</span></template>
        </el-table-column>
        <el-table-column label="Sản phẩm" min-width="200">
          <template #default="{ row }"><span class="font-semibold">{{ row.product?.name || '---' }}</span></template>
        </el-table-column>
        <el-table-column label="Mức độ" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="({ CLASS_I: 'danger', CLASS_II: 'warning', CLASS_III: 'info' } as Record<string, string>)[row.severity] || 'info'" size="small" effect="dark" round>{{ row.severity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Trạng thái" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="({ COMPLETED: 'success', IN_PROGRESS: '', ISSUED: 'warning', DRAFT: 'info' } as Record<string, string>)[row.status] || 'info'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Ảnh hưởng" prop="totalAffected" width="100" align="right" />
        <el-table-column label="Thu hồi" prop="totalReturned" width="100" align="right">
          <template #default="{ row }"><span class="text-orange-600 font-bold">{{ row.totalReturned }}</span></template>
        </el-table-column>
        <el-table-column label="Đã hủy" prop="totalDisposed" width="100" align="right">
          <template #default="{ row }"><span class="text-red-600 font-bold">{{ row.totalDisposed }}</span></template>
        </el-table-column>
        <el-table-column label="Tái nhập" prop="totalRestocked" width="100" align="right">
          <template #default="{ row }"><span class="text-green-600 font-bold">{{ row.totalRestocked }}</span></template>
        </el-table-column>
        <el-table-column label="Ngày tạo" width="140">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleDateString('vi-VN') }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { DataLine, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { recallApi } from '../api/recallApi';
import dayjs from 'dayjs';

const loading = ref(false);
const orders = ref<any[]>([]);
const summary = ref({ totalOrders: 0, totalAffected: 0, totalReturned: 0, totalDisposed: 0, totalRestocked: 0, completedOrders: 0 });

const dateRange = ref<[Date, Date]>([dayjs().startOf('month').toDate(), dayjs().endOf('day').toDate()]);
const filter = reactive({ fromDate: dayjs().startOf('month').toISOString(), toDate: dayjs().endOf('day').toISOString() });

const handleDateChange = (val: [Date, Date]) => {
  if (val?.length === 2) {
    filter.fromDate = dayjs(val[0]).startOf('day').toISOString();
    filter.toDate = dayjs(val[1]).endOf('day').toISOString();
  }
};

const fetchReport = async () => {
  loading.value = true;
  try {
    const { data } = await recallApi.getReport({ fromDate: filter.fromDate, toDate: filter.toDate });
    summary.value = data.summary || summary.value;
    orders.value = data.orders || [];
  } catch (e) {
    ElMessage.error('Lỗi tải báo cáo thu hồi');
  } finally {
    loading.value = false;
  }
};

onMounted(() => fetchReport());
</script>
