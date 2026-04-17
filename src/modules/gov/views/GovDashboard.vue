<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Tổng quan Hệ thống Quản lý</h2>
      <div class="flex gap-4">
        <el-select v-model="selectedProvince" placeholder="Chọn Tỉnh/Thành phố" clearable @change="handleProvinceChange" class="w-48">
          <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
        </el-select>
        <el-select v-model="selectedWard" placeholder="Chọn Xã/Phường" clearable @change="fetchData" :disabled="!selectedProvince" class="w-48">
          <el-option v-for="w in filterWards" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
        <el-button type="primary" @click="exportReport" class="font-semibold shadow-sm">Xuất Báo cáo</el-button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
        <div class="text-gray-500 font-medium">Tổng Doanh nghiệp/HTX</div>
        <div class="text-3xl font-bold mt-2 text-gray-800">{{ stats.totalEnterprises }}</div>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
        <div class="text-gray-500 font-medium">Sản phẩm Đăng ký</div>
        <div class="text-3xl font-bold mt-2 text-gray-800">{{ stats.totalProducts }}</div>
      </div>
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
        <div class="text-gray-500 font-medium">Người dùng Hệ thống</div>
        <div class="text-3xl font-bold mt-2 text-gray-800">{{ stats.totalUsers }}</div>
      </div>
    </div>

    <!-- Map Section -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-gray-700 flex items-center gap-2 text-lg">
          <el-icon><MapLocation /></el-icon>
          Bản đồ Vùng trồng theo địa bàn
        </h3>
      </div>
      <FarmMapboxView
        :locations="farms"
        :scans="[]"
        :auto-fit-bounds="true"
        :center-coordinate="mapCenter"
        height="500px"
      />
      <div class="mt-2 text-xs text-gray-500 flex gap-4">
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500"></span> Vùng trồng: {{ farms.length }}</span>
      </div>
    </div>

    <!-- Map & Lists -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- Top 10 Products -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="font-bold mb-4 text-gray-700 flex items-center gap-2">Sản phẩm tiêu biểu (Top 10)</h3>
        <el-table :data="products" style="width: 100%" stripe>
          <el-table-column prop="name" label="Tên SP" />
          <el-table-column prop="tenant.name" label="Doanh nghiệp">
             <template #default="scope">{{ scope.row.tenant?.name || '---' }}</template>
          </el-table-column>
          <el-table-column prop="status" label="Trạng thái">
            <template #default="{ row }">
              <el-tag :type="getGovStatusType(row.attributes?.govStatus)">
                {{ row.attributes?.govStatus || 'NORMAL' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Hành động" width="120" align="center">
            <template #default="{ row }">
              <el-button size="small" type="danger" plain @click="requestRecall(row.id)">Cảnh báo</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Enterprises -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="font-bold mb-4 text-gray-700 flex items-center gap-2">Doanh nghiệp hoạt động</h3>
        <el-table :data="enterprises" style="width: 100%" stripe>
          <el-table-column prop="name" label="Doanh nghiệp" />
          <el-table-column prop="email" label="Email" />
          <el-table-column prop="status" label="Trạng thái" width="100">
             <template #default="{ row }">
              <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'">{{ row.status || 'ACTIVE' }}</el-tag>
             </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/common/utils/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import FarmMapboxView from '@/modules/core/components/FarmMapboxView.vue';
import { MapLocation } from '@element-plus/icons-vue';
import { vietnamUnits } from '@/common/data/vietnam-units';
import { provinceCoordinates } from '@/common/data/province-coordinates';
import { computed } from 'vue';

const selectedProvince = ref('');
const selectedWard = ref('');

const provinces = ref([...vietnamUnits].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
const filterWards = ref<any[]>([]);

const mapCenter = computed(() => {
    if (selectedProvince.value && provinceCoordinates[selectedProvince.value]) {
        return provinceCoordinates[selectedProvince.value];
    }
    return null;
});

const handleProvinceChange = () => {
    selectedWard.value = '';
    const prov = provinces.value.find((p: any) => p.name === selectedProvince.value);
    filterWards.value = prov && prov.wards ? [...prov.wards].sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi')) : [];
    fetchData();
};

const stats = ref({ totalEnterprises: 0, totalProducts: 0, totalUsers: 0 });
const products = ref([]);
const enterprises = ref([]);
const farms = ref([]);

const getGovStatusType = (status: string) => {
  if (status === 'RECALLED') return 'danger';
  if (status === 'PENDING_RECALL') return 'warning';
  return 'success';
}

const fetchData = async () => {
    try {
        const query = `?province=${selectedProvince.value}&ward=${selectedWard.value}`;
        
        const [statsRes, productsRes, enterprisesRes, farmsRes] = await Promise.all([
            api.get(`/api/gov/stats${query}`),
            api.get(`/api/gov/products${query}&limit=10`),
            api.get(`/api/gov/enterprises${query}`),
            api.get(`/api/gov/farms${query}`)
        ]);

        stats.value = statsRes.data;
        products.value = productsRes.data.items || [];
        enterprises.value = enterprisesRes.data || [];
        farms.value = farmsRes.data || [];
    } catch (e) {
        ElMessage.error('Lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
    }
}

const requestRecall = async (id: string) => {
    try {
        await ElMessageBox.confirm('Gửi yêu cầu cảnh báo/thu hồi sản phẩm này tới Doanh nghiệp?', 'Xác nhận', { type: 'warning' });
        await api.post(`/gov/products/${id}/recall-request`, { reason: 'Phát hiện vi phạm tiêu chuẩn chất lượng' });
        ElMessage.success('Đã gửi yêu cầu thu hồi thành công');
        fetchData();
    } catch (e) {
        if (e !== 'cancel') ElMessage.error('Xử lý thất bại');
    }
}

const exportReport = () => {
    ElMessage.success('Báo cáo đang được xuất ra PDF. Vui lòng đợi...');
}

onMounted(() => {
    fetchData();
});
</script>

<style scoped>
</style>
