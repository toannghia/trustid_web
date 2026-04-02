<script setup lang="ts">
interface TenantStat {
  tax_code: string;
  name: string;
  request_count: number;
}

interface ErrorStat {
  code: string;
  message: string;
  count: number;
  rate: string; // e.g. "80%"
}

defineProps<{
  topTenants: TenantStat[];
  topErrors: ErrorStat[];
}>();
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Top Tenants -->
    <div class="bg-white p-4 rounded-lg shadow-md">
      <h3 class="text-lg font-bold mb-4 text-gray-700">🏆 Top Doanh nghiệp gửi đồng bộ</h3>
      <el-table :data="topTenants" stripe style="width: 100%">
        <el-table-column prop="tax_code" label="MST" width="120" />
        <el-table-column prop="name" label="Doanh nghiệp" />
        <el-table-column prop="request_count" label="Requests" width="100" align="right">
          <template #default="scope">
            <span class="font-bold text-blue-600">{{ scope.row.request_count.toLocaleString() }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Top Errors -->
    <div class="bg-white p-4 rounded-lg shadow-md">
      <h3 class="text-lg font-bold mb-4 text-gray-700">⚠️ Danh sách lỗi phổ biến (Hôm nay)</h3>
      <el-table :data="topErrors" stripe style="width: 100%">
        <el-table-column prop="code" label="Mã lỗi" width="80">
          <template #default="scope">
            <el-tag type="danger" size="small">{{ scope.row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="Mô tả" />
        <el-table-column prop="count" label="Số lượng" width="90" align="center" />
        <el-table-column prop="rate" label="Tỷ trọng" width="80" align="right">
          <template #default="scope">
            <span class="font-bold text-red-500">{{ scope.row.rate }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
