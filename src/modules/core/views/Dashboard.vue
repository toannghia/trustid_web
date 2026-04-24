<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { dashboardApi } from '../api/dashboard';
import * as echarts from 'echarts';
import { codeApi } from '../api/codeApi';
import { ElMessage, ElMessageBox } from 'element-plus';
import { User, OfficeBuilding, Goods, PriceTag, Timer, DataLine, Search, MapLocation } from '@element-plus/icons-vue';
import FarmMapboxView from '../components/FarmMapboxView.vue';

// ... (stats, lists defs)

const quickScanCode = ref('');
const scanning = ref(false);

const onQuickScan = async () => {
    if (!quickScanCode.value.trim()) return;
    scanning.value = true;
    try {
        let location = undefined;
        // Attempt to get location quietly
        if (navigator.geolocation) {
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
                });
                location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            } catch (err) {
                console.warn('Could not get location for scan log', err);
            }
        }

        const { data } = await codeApi.validate(quickScanCode.value.trim(), location);
        if (data.valid) {
             ElMessageBox.alert(
                `<div class="text-left">
                    <p><b>Trạng thái:</b> <span class="text-green-600">Hợp lệ</span></p>
                    <p><b>Serial:</b> ${data.serial}</p>
                    <p><b>Lô Mã:</b> ${data.poolName || '---'}</p>
                    <p><b>Trạng thái mã:</b> ${data.status}</p>
                </div>`,
                'Thông tin mã',
                {
                    dangerouslyUseHTMLString: true,
                    confirmButtonText: 'OK',
                    type: 'success'
                }
            );
        } else {
             ElMessage.error(data.message || 'Mã không hợp lệ');
        }
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi kiểm tra mã');
    } finally {
        scanning.value = false;
        quickScanCode.value = '';
    }
};

// ... (existing functions)

// ...




const stats = ref({
  users: 0, newUsers: 0,
  tenants: 0, newTenants: 0,
  products: 0, activeProducts: 0,
  codes: 0, usedCodes: 0
});

const lists = ref({
    latestUsers: [],
    latestTenants: [],
    latestProducts: []
});

const activeTab = ref('products'); // Change default tab here: 'users', 'products', 'tenants'
const activeStatTab = ref('tenant');
const chartRef = ref(null);

// Aggregate stats from backend
const mockTenantStats = ref<any[]>([]);
const mockProductStats = ref<any[]>([]);
const mockCategoryStats = ref<any[]>([]);

const mapLocations = ref<any[]>([]);
const mapScans = ref<any[]>([]);
const mapTenantFilter = ref('');
const tenantsList = ref<any[]>([]);
const mapLoading = ref(false);

const loadMapData = async () => {
    mapLoading.value = true;
    try {
        const tenantId = mapTenantFilter.value || undefined;
        const { data } = await dashboardApi.getAdminLocationsMap(tenantId);
        mapLocations.value = data.locations || [];
        mapScans.value = data.scans || [];
    } catch (e) {
        console.error('Failed to load map locations', e);
    } finally {
        mapLoading.value = false;
    }
};

const loadTenants = async () => {
    try {
        const { data } = await dashboardApi.getTenantsList();
        tenantsList.value = data || [];
    } catch (e) {
        console.error('Failed to load tenants', e);
    }
};

const onTenantFilterChange = () => {
    loadMapData();
};

// Pending Approvals
const pendingApprovals = ref<any[]>([]);
const loadPendingApprovals = async () => {
    try {
        const { data } = await dashboardApi.getPendingApprovals();
        pendingApprovals.value = data || [];
    } catch(e) {
        console.error('Failed to load pending approvals', e);
    }
};

const handleApprove = async (id: string, name: string) => {
    try {
        await ElMessageBox.confirm(`Xác nhận phê duyệt thay đổi ranh giới mới của ${name}?`, 'Xác nhận', { type: 'warning' });
        await dashboardApi.approveBoundary(id);
        ElMessage.success('Đã phê duyệt ranh giới');
        loadPendingApprovals();
        loadMapData(); // Refresh map with new polygons
    } catch(e) {
        if (e !== 'cancel') ElMessage.error('Có lỗi xảy ra khi phê duyệt');
    }
};

const handleReject = async (id: string, name: string) => {
    try {
        await ElMessageBox.confirm(`Từ chối thay đổi ranh giới của ${name}?`, 'Cảnh báo', { type: 'error' });
        await dashboardApi.rejectBoundary(id);
        ElMessage.success('Đã từ chối ranh giới');
        loadPendingApprovals();
    } catch(e) {
        if (e !== 'cancel') ElMessage.error('Có lỗi xảy ra khi từ chối');
    }
};

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
    return `${baseUrl}${path}`;
};

const initChart = (data: any[]) => {
  if (!chartRef.value || !data || data.length === 0) return;
  const myChart = echarts.init(chartRef.value);
  
  const option = {
    title: { text: '', left: 'center' }, // removed title since we have a header for the col
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '75%'], // slightly smaller inside the smaller container
        center: ['50%', '50%'],
        data: data,
        label: {
          show: false // hide labels to save space
        },
        emphasis: {
            itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
        }
      }
    ]
  };
  myChart.setOption(option);
};

onMounted(async () => {
  try {
    const { data } = await dashboardApi.getSystemStats();
    const payload = data.data || data; 

    if (payload.counts) {
        stats.value = payload.counts;
    }
    if (payload.lists) {
        lists.value = payload.lists;
    }
    if (payload.charts && payload.charts.productsByCategory) {
        initChart(payload.charts.productsByCategory);
    }
    if (payload.topStats) {
        mockTenantStats.value = payload.topStats.topTenants || [];
        mockProductStats.value = payload.topStats.topProducts || [];
        mockCategoryStats.value = payload.topStats.topCategories || [];
    }
    
  } catch (e) {
    console.error('Dashboard load error', e);
  }

  // Load map and approvals data
  loadTenants();
  loadMapData();
  loadPendingApprovals();
});
</script>

<template>
  <div class="p-6">
      <h2 class="text-2xl font-bold mb-6 text-gray-800">Bảng điều khiển</h2>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Users -->
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500 hover:shadow-md transition">
        <div class="flex justify-between items-start">
            <div>
                <div class="text-gray-500 text-sm font-medium">Người dùng</div>
                <div class="text-3xl font-bold mt-1 text-gray-800">{{ stats.users }}</div>
                <div class="text-xs text-green-600 mt-2 flex items-center">
                    <el-icon class="mr-1"><Top /></el-icon>
                    +{{ stats.newUsers }} hôm nay
                </div>
            </div>
            <div class="p-3 bg-blue-50 rounded-full text-blue-600">
                <el-icon class="text-xl"><User /></el-icon>
            </div>
        </div>
      </div>

      <!-- Tenants -->
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500 hover:shadow-md transition">
         <div class="flex justify-between items-start">
            <div>
                <div class="text-gray-500 text-sm font-medium">Doanh nghiệp</div>
                <div class="text-3xl font-bold mt-1 text-gray-800">{{ stats.tenants }}</div>
                 <div class="text-xs text-green-600 mt-2 flex items-center">
                    <el-icon class="mr-1"><Top /></el-icon>
                    +{{ stats.newTenants }} hôm nay
                </div>
            </div>
            <div class="p-3 bg-purple-50 rounded-full text-purple-600">
                <el-icon class="text-xl"><OfficeBuilding /></el-icon>
            </div>
        </div>
      </div>

      <!-- Products -->
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500 hover:shadow-md transition">
         <div class="flex justify-between items-start">
            <div>
                <div class="text-gray-500 text-sm font-medium">Sản phẩm</div>
                <div class="text-3xl font-bold mt-1 text-gray-800">{{ stats.products }}</div>
                 <div class="text-xs text-gray-500 mt-2">
                    {{ stats.activeProducts }} đang hoạt động
                </div>
            </div>
            <div class="p-3 bg-orange-50 rounded-full text-orange-600">
                <el-icon class="text-xl"><Goods /></el-icon>
            </div>
        </div>
      </div>

       <!-- Codes -->
      <div class="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500 hover:shadow-md transition">
         <div class="flex justify-between items-start">
            <div>
                <div class="text-gray-500 text-sm font-medium">Mã Tem (Codes)</div>
                <div class="text-3xl font-bold mt-1 text-gray-800">{{ stats.codes.toLocaleString() }}</div>
                 <div class="text-xs text-gray-500 mt-2">
                    {{ stats.usedCodes.toLocaleString() }} đã sử dụng
                </div>
            </div>
            <div class="p-3 bg-green-50 rounded-full text-green-600">
                <el-icon class="text-xl"><PriceTag /></el-icon>
            </div>
        </div>
      </div>
    </div>

    <!-- Middle Section: Chart and Stats -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Chart -->
        <div class="bg-white p-6 rounded-lg shadow-sm col-span-1">
             <h3 class="font-bold mb-4 text-gray-700 flex items-center gap-2">
                 Tỷ trọng ngành hàng
             </h3>
             <div class="h-64" ref="chartRef"></div>
        </div>

        <!-- Aggregated Stats Table Section -->
        <div class="bg-white p-6 rounded-lg shadow-sm col-span-2">
            <h3 class="font-bold mb-4 text-gray-700 flex items-center gap-2">
                <el-icon><DataLine /></el-icon> Số liệu tổng hợp & Thống kê lượt quét
            </h3>
            <el-tabs v-model="activeStatTab">
                <el-tab-pane label="Top Doanh nghiệp" name="tenant">
                    <el-table :data="mockTenantStats" size="small" stripe border>
                        <el-table-column prop="name" label="Tên Doanh nghiệp" />
                        <el-table-column prop="productCount" label="Sản phẩm" align="center" width="90" />
                        <el-table-column prop="userCount" label="Users" align="center" width="70" />
                        <el-table-column prop="scanCount" label="Lượt quét" align="center" width="100">
                             <template #default="{ row }">
                                 <span class="font-semibold text-blue-600">{{ row.scanCount.toLocaleString() }}</span>
                             </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
                <el-tab-pane label="Theo Sản phẩm" name="product">
                    <el-table :data="mockProductStats" size="small" stripe border>
                        <el-table-column prop="name" label="Tên Sản phẩm" />
                        <el-table-column prop="tenant" label="Doanh nghiệp" />
                        <el-table-column prop="scanCount" label="Lượt quét" align="center" width="100">
                            <template #default="{ row }">
                                 <span class="font-semibold text-blue-600">{{ row.scanCount.toLocaleString() }}</span>
                             </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
                <el-tab-pane label="Theo Danh mục" name="category">
                    <el-table :data="mockCategoryStats" size="small" stripe border>
                        <el-table-column prop="name" label="Danh mục (Ngành)" />
                        <el-table-column prop="productCount" label="Số sản phẩm" align="center" width="120" />
                        <el-table-column prop="scanCount" label="Tổng lượt quét" align="center" width="120">
                            <template #default="{ row }">
                                 <span class="font-semibold text-blue-600">{{ row.scanCount.toLocaleString() }}</span>
                             </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>

    <!-- Map Section -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-gray-700 flex items-center gap-2 text-lg">
                <el-icon><MapLocation /></el-icon>
                Bản đồ Vùng trồng toàn hệ thống
            </h3>
            <el-select
                v-model="mapTenantFilter"
                placeholder="Tất cả doanh nghiệp"
                clearable
                class="w-64"
                @change="onTenantFilterChange"
            >
                <el-option
                    v-for="t in tenantsList"
                    :key="t.id"
                    :label="t.name"
                    :value="t.id"
                />
            </el-select>
        </div>
        <FarmMapboxView
            :locations="mapLocations"
            :scans="mapScans"
            :auto-fit-bounds="false"
            height="500px"
            @select="(loc) => console.log('Selected location:', loc)"
        />
        <div class="mt-2 text-xs text-gray-500 flex gap-4">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-green-500"></span> Vùng trồng: {{ mapLocations.length }}</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-500"></span> Lượt quét: {{ mapScans.length }}</span>
        </div>
    </div>

    <!-- Bottom Section: Detailed Lists -->
    <div class="bg-white rounded-lg shadow-sm p-6">
        <el-tabs v-model="activeTab">
            <el-tab-pane label="Phê duyệt vùng trồng" name="approvals">
                 <el-table :data="pendingApprovals" stripe style="width: 100%">
                    <el-table-column type="index" label="STT" width="60" />
                    <el-table-column prop="name" label="Tên vùng trồng" />
                    <el-table-column label="Doanh nghiệp">
                        <template #default="scope">{{ scope.row.tenant?.name || '---' }}</template>
                    </el-table-column>
                    <el-table-column prop="updateReason" label="Lý do thay đổi" />
                    <el-table-column label="Diện tích dự kiến">
                        <template #default="{ row }">{{ row.areaM2?.toLocaleString() }} m²</template>
                    </el-table-column>
                    <el-table-column label="Ngày cập nhật" width="120">
                        <template #default="{ row }">{{ new Date(row.updatedAt).toLocaleDateString() }}</template>
                    </el-table-column>
                    <el-table-column label="Thao tác" width="200" align="center">
                        <template #default="{ row }">
                            <el-button type="success" size="small" @click="handleApprove(row.id, row.name)">Duyệt</el-button>
                            <el-button type="danger" size="small" @click="handleReject(row.id, row.name)">Từ chối</el-button>
                        </template>
                    </el-table-column>
                 </el-table>
                 <div v-if="pendingApprovals.length === 0" class="text-gray-500 text-center py-6">
                     Không có yêu cầu duyệt ranh giới nào.
                 </div>
            </el-tab-pane>
            <el-tab-pane label="Sản phẩm mới nhất" name="products">
                 <el-table :data="lists.latestProducts" stripe style="width: 100%">
                    <el-table-column label="Ảnh" width="70">
                        <template #default="scope">
                             <el-image 
                                v-if="scope.row.images && scope.row.images.length"
                                :src="getImageUrl(scope.row.images[0])"
                                class="w-10 h-10 rounded"
                                fit="cover"
                                :preview-src-list="scope.row.images.map((img: string) => getImageUrl(img))"
                                preview-teleported
                             >
                                <template #error>
                                    <div class="w-10 h-10 bg-gray-100 flex items-center justify-center text-xs text-gray-400">Err</div>
                                </template>
                             </el-image>
                        </template>
                    </el-table-column>
                    <el-table-column prop="name" label="Tên sản phẩm" />
                    <el-table-column prop="gtinCode" label="GTIN" />
                    <el-table-column label="Doanh nghiệp">
                        <template #default="scope">{{ scope.row.tenant?.name }}</template>
                    </el-table-column>
                      <el-table-column label="Danh mục">
                        <template #default="scope">{{ scope.row.category?.name }}</template>
                    </el-table-column>
                    <el-table-column label="Ngày tạo" width="180">
                        <template #default="scope">{{ new Date(scope.row.createdAt).toLocaleDateString() }}</template>
                    </el-table-column>
                </el-table>
            </el-tab-pane>
            <el-tab-pane label="Người dùng mới nhất" name="users">
                <el-table :data="lists.latestUsers" stripe style="width: 100%">
                    <el-table-column type="index" label="STT" width="60" />
                    <el-table-column prop="username" label="Tên đăng nhập" />
                    <el-table-column prop="fullName" label="Họ tên" />
                    <el-table-column label="Doanh nghiệp">
                        <template #default="scope">
                            {{ scope.row.tenant?.name || '---' }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="role" label="Vai trò">
                         <template #default="scope">
                            <el-tag size="small">{{ scope.row.role?.name || scope.row.role }}</el-tag>
                         </template>
                    </el-table-column>
                    <el-table-column prop="status" label="Trạng thái">
                        <template #default="scope">
                            <el-tag :type="scope.row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
                                {{ scope.row.status }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="Ngày tạo" width="120">
                        <template #default="scope">{{ new Date(scope.row.createdAt).toLocaleDateString() }}</template>
                    </el-table-column>
                </el-table>
            </el-tab-pane>

            <el-tab-pane label="Doanh nghiệp mới nhất" name="tenants">
                 <el-table :data="lists.latestTenants" stripe style="width: 100%">
                    <el-table-column prop="name" label="Tên doanh nghiệp" />
                    <el-table-column prop="taxCode" label="Mã số thuế" />
                    <el-table-column prop="email" label="Email" />
                    <el-table-column prop="phone" label="SĐT" />
                    <el-table-column label="Ngày tạo" width="180">
                        <template #default="scope">{{ new Date(scope.row.createdAt).toLocaleDateString() }}</template>
                    </el-table-column>
                </el-table>
            </el-tab-pane>

             
        </el-tabs>
    </div>
  </div>
</template>