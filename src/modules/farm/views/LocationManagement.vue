<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Thửa</h1>
      <el-button type="primary" @click="showCreateModal = true">
        <el-icon class="mr-2"><Plus /></el-icon>
        Thêm thửa
      </el-button>
    </div>

    <!-- Search Toolbar -->
    <div class="mb-4 flex gap-4 flex-wrap">
        <el-input v-model="searchKeyword" placeholder="Tìm theo tên hoặc mã vùng..." class="w-64" clearable prefix-icon="Search" />
        <el-select v-model="filter.province" placeholder="Tỉnh/Thành" clearable class="w-48" @change="handleFilterProvinceChange">
             <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
        </el-select>
        <el-select v-model="filter.ward" placeholder="Phường/Xã" clearable class="w-48" @change="handleFilterChange" :disabled="!filter.province">
             <el-option v-for="w in filterWards" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
        <el-select v-model="filter.masterGrowingAreaId" placeholder="Vùng trồng lớn" clearable class="w-48" @change="handleFilterChange">
             <el-option v-for="a in masterGrowingAreas" :key="a.id" :label="a.name" :value="a.id" />
        </el-select>
        <el-select v-model="filter.farmerId" placeholder="Nông hộ" clearable filterable class="w-48" @change="handleFilterChange" v-if="!isFarmerRole">
             <el-option v-for="u in farmers" :key="u.id" :label="`${u.fullName} (${u.username})`" :value="u.id" />
        </el-select>
        <el-select v-model="filter.leaderId" placeholder="Đội trưởng" clearable filterable class="w-48" @change="handleFilterChange">
             <el-option v-for="u in allTeamLeaders" :key="u.id" :label="`${u.fullName} (${u.username})`" :value="u.id" />
        </el-select>
    </div>

    <!-- Table -->
    <el-card shadow="hover" class="mb-6">
      <el-table :data="locations" v-loading="loading" style="width: 100%">
        <el-table-column label="STT" width="60" align="center">
          <template #default="{ $index }">
            {{ (currentPage - 1) * pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="name" label="Tên thửa" min-width="220">
          <template #default="{ row }">
            <router-link :to="`/farm/locations/${row.id}`" class="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline">
              {{ row.name }}
            </router-link>
            <div class="text-xs text-gray-400 mt-0.5">{{ [row.code, row.plantType].filter(Boolean).join(' · ') }}</div>
          </template>
        </el-table-column>
        <el-table-column label="EUDR" width="180" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.eudrStatus === 'COMPLIANT'" type="success" effect="dark" size="default">🟢 Hợp lệ</el-tag>
            <el-tag v-else-if="row.eudrStatus === 'NON_COMPLIANT'" type="danger" effect="dark" size="default">
              🔴 Vi phạm {{ row.violationRate ? `(${row.violationRate}%)` : '' }}
            </el-tag>
            <el-tag v-else-if="row.eudrStatus === 'PENDING'" type="warning" effect="dark" size="default">
              <el-icon class="is-loading mr-1"><Loading /></el-icon> Đang kiểm tra
            </el-tag>
            <el-tag v-else-if="row.eudrStatus === 'ERROR'" type="danger" effect="dark" size="default">❌ Lỗi</el-tag>
            <el-tag v-else type="info" size="default">⚪ Chưa kiểm tra</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Mã vùng trồng lớn" min-width="220">
             <template #default="{ row }">
                 <div class="text-sm">
                    <div class="font-medium text-gray-800" v-if="row.masterGrowingArea">{{ row.masterGrowingArea.code }} - {{ row.masterGrowingArea.name }}</div>
                    <div class="text-gray-400 italic" v-else>Chưa gán</div>
                    <div v-if="row.masterGrowingArea?.managerName" class="text-xs text-gray-500 mt-0.5">👤 Quản lý: {{ row.masterGrowingArea.managerName }}</div>
                </div>
            </template>
        </el-table-column>
        <el-table-column label="Người phụ trách" min-width="200">
             <template #default="{ row }">
                 <div class="text-sm">
                    <div v-if="row.farmer">👨‍🌾 <b>{{ row.farmer.fullName }}</b> <span class="text-xs text-gray-500">({{ row.farmer.username }})</span></div>
                    <div v-else class="text-gray-400 italic">Chưa gán Nông hộ</div>
                    <div v-if="row.leader" class="mt-1">🧑‍💼 <b>{{ row.leader.fullName }}</b> <span class="text-xs text-gray-500">({{ row.leader.username }})</span></div>
                    <div v-else class="text-gray-400 italic mt-1">Chưa gán Đội trưởng</div>
                </div>
            </template>
        </el-table-column>
        <el-table-column prop="areaM2" label="Diện tích" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.areaM2">{{ Number(row.areaM2).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) }} m²</span>
            <span v-else class="text-gray-400">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="TT" width="130" align="center">
          <template #default="{ row }">
            <div class="flex flex-col gap-1 items-center">
              <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ row.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động' }}</el-tag>
              <el-tag v-if="row.isOverlapped" type="warning" size="small" effect="dark" title="Thửa này đang bị vẽ lấn ranh với thửa khác">⚠️ Lấn ranh</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="160" align="center" fixed="right">
            <template #default="{ row }">
                <el-button type="primary" link size="small" @click="openEditModal(row)">
                    Sửa
                </el-button>
                <el-button type="info" link size="small" @click="$router.push(`/farm/locations/${row.id}`)">
                    Chi tiết
                </el-button>
                <el-button type="danger" link size="small" @click="handleDelete(row)">
                    Xóa
                </el-button>
            </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="flex justify-end mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalLocations"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- Create/Edit Modal -->
    <el-dialog
      v-model="showCreateModal"
      width="90%"
      style="max-width: 800px"
      class="branded-location-dialog"
      :close-on-click-modal="false"
      :show-close="false"
      @closed="resetForm"
      @opened="initMap"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            {{ isEditing ? 'Cập nhật Thửa' : 'Thêm thửa mới' }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showCreateModal = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <el-form :model="form" label-position="top" :rules="rules" ref="formRef" style="padding: 24px 24px 8px;">
        <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
                 <el-form-item label="Tên thửa" prop="name">
                    <el-input v-model="form.name" placeholder="VD: Ruộng Cầu 2" />
                 </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
                 <el-form-item label="Mã số (Tùy chọn)" prop="code">
                    <el-input v-model="form.code" placeholder="VD: VT-01" />
                 </el-form-item>
            </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="Mã vùng trồng lớn" prop="masterGrowingAreaId">
              <div class="flex items-center gap-2 w-full">
                <el-select v-model="form.masterGrowingAreaId" placeholder="Chọn Mã vùng" clearable filterable class="flex-1" @change="onMasterAreaChange">
                  <el-option v-for="a in masterGrowingAreas" :key="a.id" :label="`${a.code} - ${a.name}`" :value="a.id" />
                </el-select>
                <el-button type="success" plain @click="openMasterGrowingAreaModal">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" v-if="!isFarmerRole">
            <el-form-item label="Nông hộ (Chủ thửa)" prop="farmerId">
              <div class="flex items-center gap-2 w-full">
                <el-select v-model="form.farmerId" placeholder="Chọn Nông hộ" clearable filterable class="flex-1" @change="onFarmerChange">
                  <el-option v-for="u in farmers" :key="u.id" :label="`${u.fullName} (${u.username})`" :value="u.id" />
                </el-select>
                <el-button type="success" plain @click="openQuickUserModal('FARMER')">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="Đội trưởng phụ trách" prop="leaderId">
              <div class="flex items-center gap-2 w-full">
                <el-select v-model="form.leaderId" placeholder="Chọn Đội trưởng" clearable filterable class="flex-1" :disabled="!isFarmerRole && !form.farmerId" @change="handleLeaderChange">
                  <el-option v-for="u in teamLeaders" :key="u.id" :label="`${u.fullName} (${u.username})`" :value="u.id" />
                </el-select>
                <el-button type="success" plain @click="openQuickUserModal('TEAM_LEADER')" :disabled="!isFarmerRole && !form.farmerId">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
             <el-form-item label="Diện tích (m2)" prop="area_m2">
               <el-input-number 
                  v-model="form.area_m2" 
                  :min="500" 
                  class="w-full" 
                  :precision="1" 
                  :formatter="(value: string) => `${value}`.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')"
                  :parser="(value: string) => value.replace(/\\$\\s?|(,*)/g, '')"
               />
             </el-form-item>
          </el-col>
        </el-row>

        <div id="map" style="height: 350px; margin-top: 10px; border-radius: 4px; z-index: 1;"></div>
        <div class="flex items-center justify-between mt-2 mb-4">
          <div class="text-xs text-gray-500">
            * Sử dụng công cụ vẽ (hình ngũ giác) bên trái bản đồ để khoanh vùng diện tích.
          </div>
          <el-button type="primary" plain size="small" @click="show3DDrawer = true">
            🗺️ Mở bản đồ 3D để vẽ
          </el-button>
        </div>

        <el-divider content-position="left">Tọa độ (GPS)</el-divider>
        <el-row :gutter="20" class="mb-2">
          <el-col :xs="24" :sm="12">
            <el-form-item label="Dịch chuyển nhanh bản đồ tới (Tỉnh/Thành)">
              <el-select v-model="searchMapProvince" placeholder="Chọn Tỉnh/Thành phố" filterable @change="onSearchProvinceChange" class="w-full">
                <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="Dịch chuyển nhanh bản đồ tới (Phường/Xã)">
              <el-select v-model="searchMapWard" placeholder="Chọn Phường/Xã" filterable @change="onSearchWardChange" class="w-full" :disabled="!searchMapProvince">
                <el-option v-for="w in searchMapWards" :key="w.name" :label="w.name" :value="w.name" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="Vĩ độ (Lat)" prop="lat">
              <el-input-number v-model="form.lat" :precision="6" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="Kinh độ (Long)" prop="long">
              <el-input-number v-model="form.long" :precision="6" class="w-full" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-alert 
            v-if="isEditing && currentApprovalStatus === 'PENDING'"
            title="Thửa đang chờ Admin duyệt ranh giới mới. Bạn không nên đổi ranh giới trong lúc này."
            type="warning" 
            show-icon 
            class="mb-4" 
            :closable="false"
        />

        <el-form-item v-if="isEditing" label="Lý do cập nhật ranh giới (NẾU CÓ THAY ĐỔI TRÊN BẢN ĐỒ)" prop="updateReason">
           <el-input v-model="form.updateReason" type="textarea" placeholder="Nhập lý do thay đổi để Admin phê duyệt..." />
        </el-form-item>
        
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showCreateModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button type="primary" :loading="submitting" @click="submitForm" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
            {{ isEditing ? 'Cập nhật' : 'Tạo mới' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <MasterGrowingAreaModal ref="masterAreaModalRef" @created="fetchMasterGrowingAreas" />
    <QuickUserModal ref="quickUserModalRef" :role-name="currentQuickRole" @created="onQuickUserCreated" />

    <MapLibre3DDrawer
      v-model="show3DDrawer"
      :location="editing3DLocation"
      mode="draw"
      @boundary-drawn="handle3DBoundaryDrawn"
    />

    <!-- Delete Confirmation Modal -->
    <el-dialog
      v-model="showDeleteModal"
      width="90%"
      style="max-width: 480px"
      :close-on-click-modal="false"
      :show-close="false"
      class="branded-delete-location-dialog"
      @closed="closeDeleteModal"
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            Xác nhận xóa Thửa đất
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showDeleteModal = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <div style="padding: 24px 24px 8px;" class="space-y-4">
        <div class="flex items-start gap-3">
          <el-icon class="text-amber-500 text-2xl mt-0.5"><WarningFilled /></el-icon>
          <div>
            <h4 class="font-bold text-gray-900 mb-1">Bạn có chắc chắn muốn xóa thửa đất này?</h4>
            <p class="text-sm text-gray-500 leading-relaxed">
              Thửa <strong>{{ locationToDelete?.name }}</strong> (Mã: {{ locationToDelete?.code || 'Chưa gán' }}) sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>
        
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs leading-relaxed">
          <strong>Lưu ý:</strong> Việc xóa thửa đất sẽ làm ngừng toàn bộ các chu kỳ cây trồng đang hoạt động liên quan đến thửa này.
        </div>

        <el-checkbox v-model="confirmDeleteCheckbox" class="mt-2" style="white-space: normal; word-break: break-word;">
          <span class="text-sm font-medium text-gray-700">Tôi đã đọc và xác nhận muốn xóa thửa đất này</span>
        </el-checkbox>
      </div>

      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showDeleteModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy bỏ</el-button>
          <el-button
            type="danger"
            :disabled="!confirmDeleteCheckbox"
            :loading="deleting"
            @click="executeDelete"
            style="border-radius: 8px; padding: 10px 20px;"
          >
            Xác nhận xóa
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, nextTick, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, Search, Loading, WarningFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { farmApi, type Location, type MasterGrowingArea } from '../api/farmApi';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
import type { FormInstance, FormRules } from 'element-plus';
import { useAuthStore } from '@/modules/core/store/auth';
import { userApi } from '@/modules/core/api/user';
import MasterGrowingAreaModal from '../components/MasterGrowingAreaModal.vue';
import QuickUserModal from '../components/QuickUserModal.vue';
import MapLibre3DDrawer from '../components/MapLibre3DDrawer.vue';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import * as turf from '@turf/turf';
import { vietnamUnits } from '@/common/data/vietnam-units';

const locations = ref<Location[]>([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);
const totalLocations = ref(0);
const showCreateModal = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const authStore = useAuthStore();
const isFarmerRole = computed(() => authStore.user?.role === 'FARMER');

const showDeleteModal = ref(false);
const locationToDelete = ref<Location | null>(null);
const confirmDeleteCheckbox = ref(false);
const deleting = ref(false);

const masterGrowingAreas = ref<MasterGrowingArea[]>([]);
const farmers = ref<any[]>([]);
const teamLeaders = ref<any[]>([]);
const allTeamLeaders = ref<any[]>([]);

const masterAreaModalRef = ref<any>();
const quickUserModalRef = ref<any>();
const currentQuickRole = ref('FARMER');
const show3DDrawer = ref(false);

// Build a temporary location object for the 3D drawer
const editing3DLocation = computed(() => {
  const loc: any = {
    code: form.code,
    name: form.name,
    plantType: '',
    managerName: '',
    areaM2: form.area_m2,
    coordinate: { coordinates: [form.long, form.lat] },
    boundary: form.boundary.length > 0 ? { type: 'Polygon', coordinates: form.boundary } : null,
  };
  return loc;
});

const handle3DBoundaryDrawn = (data: { coordinates: number[][][]; areaM2: number }) => {
  form.boundary = data.coordinates;
  form.area_m2 = Math.round(data.areaM2 * 10) / 10;
  boundaryChanged.value = true;

  // Update center point from polygon
  if (data.coordinates[0]?.length >= 3) {
    const poly = turf.polygon(data.coordinates);
    const center = turf.centerOfMass(poly);
    form.long = Number(center.geometry.coordinates[0].toFixed(6));
    form.lat = Number(center.geometry.coordinates[1].toFixed(6));
  }

  // Redraw polygon on Leaflet map
  if (map) {
    // Remove existing drawn layers
    map.eachLayer((layer: any) => {
      if (layer.pm && layer !== map) {
        map!.removeLayer(layer);
      }
    });
    const polyCoords = data.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
    const polygon = L.polygon(polyCoords as any, { color: '#16a34a', fillOpacity: 0.2 });
    polygon.addTo(map);
    map.fitBounds(polygon.getBounds(), { padding: [20, 20] });
    if (marker) marker.setLatLng([form.lat, form.long]);
  }

  ElMessage.success(`Polygon đã vẽ trên 3D! Diện tích: ${form.area_m2.toLocaleString()} m²`);
};

const openMasterGrowingAreaModal = () => {
    masterAreaModalRef.value?.open();
};

const openQuickUserModal = (role: string) => {
    currentQuickRole.value = role;
    quickUserModalRef.value?.open();
};

const fetchMasterGrowingAreas = async () => {
    try {
        const { data } = await farmApi.getMasterGrowingAreas();
        masterGrowingAreas.value = data || [];
    } catch (err) {}
};

const fetchUsers = async () => {
    try {
        const resFarmer = await userApi.getList({ page: 1, limit: 1000, roleName: 'FARMER' });
        const data = resFarmer.data;
        farmers.value = data?.data || data?.items || (Array.isArray(data) ? data : []);
    } catch (err) {}
};

const fetchAllLeaders = async () => {
    try {
        const res = await userApi.getList({ page: 1, limit: 1000, roleName: 'TEAM_LEADER' });
        const data = res.data;
        allTeamLeaders.value = data?.data || data?.items || (Array.isArray(data) ? data : []);
    } catch (err) {}
};

const onQuickUserCreated = async (user: any) => {
    if (currentQuickRole.value === 'FARMER') {
        await fetchUsers();
        form.farmerId = user.id;
    } else if (currentQuickRole.value === 'TEAM_LEADER') {
        if (form.masterGrowingAreaId) {
            try {
                const currentLeaders = await farmApi.getMasterGrowingAreaLeaders(form.masterGrowingAreaId);
                const leaderIds = (currentLeaders.data || []).map(l => l.id);
                if (!leaderIds.includes(user.id)) {
                    leaderIds.push(user.id);
                    await farmApi.updateMasterGrowingArea(form.masterGrowingAreaId, { leaderIds });
                }
                await onMasterAreaChange(form.masterGrowingAreaId);
            } catch (err) {
                ElMessage.error('Không thể gán Đội trưởng vào vùng trồng lớn');
            }
        } else {
            teamLeaders.value.push(user);
        }
        form.leaderId = user.id;
    }
};

const onMasterAreaChange = async (val: string) => {
    form.leaderId = '';
    teamLeaders.value = [];
    if (!val) {
        if (existingLocationsLayer) existingLocationsLayer.clearLayers();
        return;
    }
    
    try {
        const { data } = await farmApi.getMasterGrowingAreaLeaders(val);
        teamLeaders.value = data || [];
        await loadExistingLocationsOnMap(val);
    } catch (err) {
        ElMessage.error('Không thể tải danh sách Đội trưởng của vùng này');
    }
};

const onFarmerChange = (val: string) => {
    if (!val) {
        form.leaderId = '';
        return;
    }
    const farmer = farmers.value.find(f => f.id === val);
    const fLeaderId = farmer?.leaderId || farmer?.leader_id;
    if (fLeaderId) {
        form.leaderId = fLeaderId;
        if (!teamLeaders.value.find(l => l.id === fLeaderId)) {
            // Temporary push to show name if missing
            teamLeaders.value.push({ id: fLeaderId, fullName: 'Đội trưởng hiện tại', username: 'N/A' });
        }
    } else {
        form.leaderId = '';
    }
};

const handleLeaderChange = async (newLeaderId: string) => {
    let currentFarmerLeaderId = '';
    if (isFarmerRole.value) {
       currentFarmerLeaderId = authStore.user?.leaderId || '';
    } else if (form.farmerId) {
       const farmer = farmers.value.find(f => f.id === form.farmerId);
       currentFarmerLeaderId = farmer?.leaderId || farmer?.leader_id || '';
    }

    if (currentFarmerLeaderId && newLeaderId && currentFarmerLeaderId !== newLeaderId) {
        try {
            await ElMessageBox.confirm(
                'Nông hộ này đang được quản lý bởi một Đội trưởng khác. Bạn có chắc chắn muốn thay đổi Đội trưởng cho lô thửa này (kèm theo cập nhật cho Nông hộ) không?',
                'Xác nhận thay đổi',
                { confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy', type: 'warning' }
            );
        } catch {
            form.leaderId = currentFarmerLeaderId;
        }
    }
};

const searchKeyword = ref('');
const filter = reactive({
    province: '',
    ward: '',
    masterGrowingAreaId: '',
    farmerId: '',
    leaderId: ''
});
const provinces = ref(vietnamUnits);
const filterWards = ref<any[]>([]);

const handleFilterProvinceChange = () => {
    filter.ward = '';
    const prov = provinces.value.find(p => p.name === filter.province);
    filterWards.value = prov ? prov.wards : [];
    handleFilterChange();
};

// Map Search Helpers
const searchMapProvince = ref('');
const searchMapWard = ref('');
const searchMapWards = ref<any[]>([]);

const onSearchProvinceChange = () => {
    searchMapWard.value = '';
    const prov = provinces.value.find(p => p.name === searchMapProvince.value);
    searchMapWards.value = prov ? prov.wards : [];
    
    if (searchMapProvince.value) {
        geocodeAddress(`${searchMapProvince.value}, Vietnam`, 10);
    }
};

const onSearchWardChange = () => {
    if (searchMapWard.value && searchMapProvince.value) {
        geocodeAddress(`${searchMapWard.value}, ${searchMapProvince.value}, Vietnam`, 14);
    }
};

const geocodeAddress = async (address: string, zoomLevel: number) => {
    try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token) return;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&country=vn`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            form.lat = Number(lat.toFixed(6));
            form.long = Number(lng.toFixed(6));
            
            if (map && marker) {
                 const newPos = new L.LatLng(form.lat, form.long);
                 marker.setLatLng(newPos);
                 map.setView(newPos, zoomLevel);
            }
        }
    } catch (e) {
        console.error('Lỗi lấy tọa độ từ Mapbox:', e);
    }
};

// Map related
let map: L.Map | null = null;
let marker: L.Marker | null = null;
let existingLocationsLayer: L.FeatureGroup | null = null;

const loadExistingLocationsOnMap = async (masterGrowingAreaId: string) => {
    if (!map || !existingLocationsLayer) return;
    existingLocationsLayer.clearLayers();
    if (!masterGrowingAreaId) return;

    try {
        const { data } = await farmApi.getLocations({ masterGrowingAreaId });
        const locationsToDraw = data || [];
        
        let bounds = L.latLngBounds([]);

        locationsToDraw.forEach(loc => {
            // Don't draw the current location being edited
            if (isEditing.value && loc.id === currentId.value) return;

            let parsedBoundary = [];
            const boundarySource = (loc.approvalStatus === 'PENDING' && loc.pendingBoundary)
                ? loc.pendingBoundary 
                : loc.boundary;

            if (boundarySource) {
                if (typeof boundarySource === 'string' && boundarySource.startsWith('{')) {
                    try { parsedBoundary = JSON.parse(boundarySource).coordinates; } catch(e) {}
                } else if (typeof boundarySource === 'object' && boundarySource.coordinates) {
                    parsedBoundary = boundarySource.coordinates;
                }
            }

            if (parsedBoundary && parsedBoundary.length > 0) {
                const polyCoords = parsedBoundary[0].map((coord: number[]) => [coord[1], coord[0]]);
                const polygon = L.polygon(polyCoords, { 
                    color: '#6b7280', // gray-500
                    fillColor: '#9ca3af', // gray-400
                    fillOpacity: 0.3,
                    weight: 1,
                    interactive: true // Set to true to allow tooltip on hover
                });
                polygon.bindTooltip(loc.name || loc.code || 'Thửa', { permanent: false, direction: 'center' });
                
                existingLocationsLayer!.addLayer(polygon);
                bounds.extend(polygon.getBounds());
            }
        });

        if (bounds.isValid() && form.boundary.length === 0) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    } catch (e) {
        console.error('Lỗi khi tải các thửa hiện có:', e);
    }
};

// Edit state
const isEditing = ref(false);
const currentId = ref<string | null>(null);
const currentApprovalStatus = ref<string>('APPROVED');
const currentEudrCheckLog = ref<any>(null);
const boundaryChanged = ref(false);

// --- EUDR Check ---
const pollingTimer = ref<any>(null);

const triggerEudrCheck = async (row: Location) => {
    try {
        await farmApi.requestEudrCheck(row.id);
        ElMessage.info('Đã gửi yêu cầu kiểm tra EUDR. Đang xử lý...');
        // Start polling
        startEudrPolling(row.id);
        // Update table immediately
        const loc = locations.value.find(l => l.id === row.id);
        if (loc) loc.eudrStatus = 'PENDING';
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || 'Không thể gửi yêu cầu kiểm tra EUDR');
    }
};

const startEudrPolling = (locationId: string) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 * 3s = 60s max

    if (pollingTimer.value) clearInterval(pollingTimer.value);

    pollingTimer.value = setInterval(async () => {
        attempts++;
        try {
            const { data } = await farmApi.getEudrStatus(locationId);
            if (data.eudrStatus !== 'PENDING') {
                clearInterval(pollingTimer.value);
                pollingTimer.value = null;

                // Update table row
                const loc = locations.value.find(l => l.id === locationId);
                if (loc) {
                    loc.eudrStatus = data.eudrStatus;
                    loc.violationRate = data.violationRate;
                    loc.lastCheckDate = data.lastCheckDate;
                    loc.checkLog = data.checkLog;
                }

                if (data.eudrStatus === 'COMPLIANT') {
                    ElMessage.success('✅ Thửa HỢP LỆ theo tiêu chuẩn EUDR!');
                } else if (data.eudrStatus === 'NON_COMPLIANT') {
                    ElMessage.warning(`⚠️ Phát hiện vi phạm! Tỷ lệ: ${data.violationRate}%`);
                } else {
                    ElMessage.error('❌ Kiểm tra EUDR gặp lỗi. Vui lòng thử lại.');
                }
            }
        } catch {
            // Silently retry
        }

        if (attempts >= maxAttempts) {
            clearInterval(pollingTimer.value);
            pollingTimer.value = null;
            ElMessage.warning('Kiểm tra EUDR đang mất nhiều thời gian. Vui lòng refresh trang sau.');
        }
    }, 3000);
};

const downloadEudrReport = async (row: Location) => {
    try {
        const { data } = await farmApi.downloadEudrReport(row.id);
        // Open PDF in new tab
        const baseUrl = import.meta.env.VITE_API_URL || '';
        window.open(`${baseUrl}${data.url}`, '_blank');
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || 'Không thể tạo báo cáo EUDR');
    }
};

const form = reactive({
  name: '',
  code: '',
  area_m2: 0,
  lat: 21.0,
  long: 105.8,
  boundary: [] as any[],
  updateReason: '',
  masterGrowingAreaId: '',
  farmerId: '',
  leaderId: ''
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: 'Vui lòng nhập tên', trigger: 'blur' }],
  masterGrowingAreaId: [{ required: true, message: 'Vui lòng chọn Mã vùng trồng lớn', trigger: 'change' }],
  farmerId: [{ required: !isFarmerRole.value, message: 'Vui lòng chọn Nông hộ', trigger: 'change' }],
  lat: [{ required: true, message: 'Nhập Vĩ độ', trigger: 'blur' }],
  long: [{ required: true, message: 'Nhập Kinh độ', trigger: 'blur' }]
});

const initMap = async () => {
    await nextTick();
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    if (map) {
        map.remove(); // Clean up existing map
    }

    map = L.map('map').setView([form.lat, form.long], 12);
    
    L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=' + import.meta.env.VITE_MAPBOX_TOKEN, {
        maxZoom: 20,
        attribution: '© Mapbox'
    }).addTo(map);

    // Geoman controls
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: true,
      drawCircle: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
    });
    
    // Set localization
    map.pm.setLang('vi' as any);

    // Add marker for point (optional, mostly for backward compatibility)
    // We will focus on Polygons for boundaries now
    marker = L.marker([form.lat, form.long], { draggable: true }).addTo(map);
    
    // Layer group for polygon
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    existingLocationsLayer = new L.FeatureGroup();
    map.addLayer(existingLocationsLayer);

    // Load existing polygon if any
    if (form.boundary && form.boundary.length > 0) {
        // leaf polygon expects lat, lng
        const polyCoords = form.boundary[0].map((coord: number[]) => [coord[1], coord[0]]);
        
        // Show differently if it's pending approval
        const isPending = isEditing.value && currentApprovalStatus.value === 'PENDING';
        const color = isPending ? '#f59e0b' : '#16a34a'; // Orange if pending, green if approved
        
        const polygon = L.polygon(polyCoords, { color, fillOpacity: isPending ? 0.3 : 0.2, dashArray: isPending ? '5, 5' : '' });
        drawnItems.addLayer(polygon);
        map.fitBounds(polygon.getBounds(), { padding: [20, 20] });
    } else {
        map.setView([form.lat, form.long], 15);
    }

    // Geoman Events
    map.on('pm:create', (e: any) => {
        drawnItems.clearLayers(); // Only 1 polygon allowed
        drawnItems.addLayer(e.layer);
        
        const geojson = e.layer.toGeoJSON();
        const areaSqMeters = turf.area(geojson);
        form.area_m2 = Math.round(areaSqMeters * 10) / 10;
        form.boundary = geojson.geometry.coordinates; // [ [ [lng, lat], ... ] ]
        boundaryChanged.value = true;
        
        // Update marker to center of polygon
        const center = turf.centerOfMass(geojson);
        form.long = Number(center.geometry.coordinates[0].toFixed(6));
        form.lat = Number(center.geometry.coordinates[1].toFixed(6));
        if (marker) marker.setLatLng([form.lat, form.long]);
    });

    map.on('pm:remove', () => {
        drawnItems.clearLayers();
        form.boundary = [];
        boundaryChanged.value = true;
    });

    // Also handle edits to the drawn layer
    map.on('pm:globaleditmodetoggled', (e: any) => {
        if (!e.enabled) {
            // Edit mode disabled, capture changes
            const layers = drawnItems.getLayers();
            if (layers.length > 0) {
                const layer = layers[0] as any;
                const geojson = layer.toGeoJSON();
                const areaSqMeters = turf.area(geojson);
                form.area_m2 = Math.round(areaSqMeters * 10) / 10;
                form.boundary = geojson.geometry.coordinates;
                boundaryChanged.value = true;
                
                const center = turf.centerOfMass(geojson);
                form.long = Number(center.geometry.coordinates[0].toFixed(6));
                form.lat = Number(center.geometry.coordinates[1].toFixed(6));
                if (marker) marker.setLatLng([form.lat, form.long]);
            }
        }
    });

    // Event: Marker Drag
    marker.on('dragend', (e) => {
        const latLng = e.target.getLatLng();
        form.lat = Number(latLng.lat.toFixed(6));
        form.long = Number(latLng.lng.toFixed(6));
    });

    // Event: Map Click (fallback if no polygon)
    map.on('click', (e) => {
        if (form.boundary.length === 0) {
            form.lat = Number(e.latlng.lat.toFixed(6));
            form.long = Number(e.latlng.lng.toFixed(6));
            if (marker) marker.setLatLng(e.latlng);
        }
    });

    // Load EUDR violation overlay if NON_COMPLIANT
    if (isEditing.value && currentEudrCheckLog.value?.alerts?.length > 0) {
        const alertMarkers = currentEudrCheckLog.value.alerts;
        for (const alert of alertMarkers) {
            if (alert.lat && alert.lng) {
                L.circleMarker([alert.lat, alert.lng], {
                    radius: 6,
                    color: '#dc2626',
                    fillColor: '#ef4444',
                    fillOpacity: 0.7,
                    weight: 2,
                }).addTo(map).bindPopup(`<b>⚠️ Mất rừng</b><br/>Năm: ${alert.year || 'N/A'}<br/>Diện tích: ${alert.lossHa?.toFixed(3) || 'N/A'} ha`);
            }
        }
    }

    if (form.masterGrowingAreaId) {
        loadExistingLocationsOnMap(form.masterGrowingAreaId);
    }
};

// Update marker when inputs change manually
watch(() => [form.lat, form.long], ([newLat, newLong]) => {
    // Only update if map exists and coords are different
    if (marker && map) {
        const cur = marker.getLatLng();
        if (cur.lat !== newLat || cur.lng !== newLong) {
             const newPos = new L.LatLng(newLat as number, newLong as number);
             marker.setLatLng(newPos);
             map.setView(newPos, map.getZoom()); 
        }
    }
});

const handleFilterChange = () => {
    currentPage.value = 1;
    loadData();
};

const handleSizeChange = (val: number) => {
    pageSize.value = val;
    currentPage.value = 1;
    loadData();
};

const handleCurrentChange = (val: number) => {
    currentPage.value = val;
    loadData();
};

let searchTimeout: any = null;
watch(() => searchKeyword.value, () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    handleFilterChange();
  }, 300);
});

const loadData = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      limit: pageSize.value
    };
    if (filter.province) params.province = filter.province;
    if (filter.ward) params.ward = filter.ward;
    if (filter.masterGrowingAreaId) params.masterGrowingAreaId = filter.masterGrowingAreaId;
    if (filter.farmerId) params.farmerId = filter.farmerId;
    if (filter.leaderId) params.leaderId = filter.leaderId;
    if (searchKeyword.value) params.search = searchKeyword.value;
    
    const { data } = (await farmApi.getLocations(params)) as any;
    if (data && typeof data === 'object' && 'data' in data) {
      locations.value = data.data || [];
      totalLocations.value = data.total || 0;
    } else {
      locations.value = data || [];
      totalLocations.value = locations.value.length;
    }
  } catch (err) {
    ElMessage.error('Không thể tải danh sách thửa');
  } finally {
    loading.value = false;
  }
};

const openEditModal = async (row: Location) => {
    isEditing.value = true;
    currentId.value = row.id;
    
    // Populate form
    form.name = row.name;
    form.code = row.code;
    form.area_m2 = row.areaM2;
    form.masterGrowingAreaId = row.masterGrowingAreaId || '';
    
    if (form.masterGrowingAreaId) {
        await onMasterAreaChange(form.masterGrowingAreaId);
    }

    form.farmerId = row.farmerId || '';
    form.leaderId = row.leaderId || '';
    
    // Handle coordinates (GeoJSON Point)
    if (row.coordinate && row.coordinate.coordinates) {
        form.long = row.coordinate.coordinates[0];
        form.lat = row.coordinate.coordinates[1];
    }
    
    // Handle polygon boundary
    let parsedBoundary = [];
    // Load pendingBoundary if waiting for approval, otherwise approved boundary
    const boundarySource = (row.approvalStatus === 'PENDING' && row.pendingBoundary)
        ? row.pendingBoundary 
        : row.boundary;

    if (boundarySource) {
        if (typeof boundarySource === 'string' && boundarySource.startsWith('{')) {
            try {
                const b = JSON.parse(boundarySource);
                parsedBoundary = b.coordinates;
            } catch(e) {}
        } else if (typeof boundarySource === 'object' && boundarySource.coordinates) {
            parsedBoundary = boundarySource.coordinates;
        }
    }
    form.boundary = parsedBoundary;
    form.updateReason = ''; // Reset update reason
    boundaryChanged.value = false; // Reset modification flag
    currentApprovalStatus.value = row.approvalStatus || 'APPROVED';
    currentEudrCheckLog.value = row.checkLog || null;

    showCreateModal.value = true;
}

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      // 1. Cảnh báo nếu đội trưởng trống và yêu cầu xác nhận
      if (!form.leaderId) {
        try {
          await ElMessageBox.confirm(
            'Thửa đất này chưa chọn Đội trưởng phụ trách. Bạn có chắc chắn muốn lưu mà không gán Đội trưởng phụ trách không? (Có thể cập nhật lại sau)',
            'Cảnh báo chưa chọn Đội trưởng',
            {
              confirmButtonText: 'Đồng ý lưu',
              cancelButtonText: 'Hủy',
              type: 'warning',
            }
          );
        } catch {
          return;
        }
      }

      // 2. Cảnh báo nếu đang sửa và thay đổi Đội trưởng phụ trách
      if (isEditing.value && currentId.value) {
        const originalLocation = locations.value.find(l => l.id === currentId.value);
        const originalLeaderId = originalLocation?.leaderId || '';
        const currentLeaderId = form.leaderId || '';
        if (originalLeaderId !== currentLeaderId) {
          try {
            await ElMessageBox.confirm(
              'Đội trưởng phụ trách của thửa này đã thay đổi. Bạn có chắc chắn muốn cập nhật sự thay đổi này không?',
              'Xác nhận thay đổi Đội trưởng',
              {
                confirmButtonText: 'Xác nhận thay đổi',
                cancelButtonText: 'Hủy',
                type: 'warning',
              }
            );
          } catch {
            return;
          }
        }
      }

      submitting.value = true;
      try {
        const payload: any = {
            ...form,
            leaderId: form.leaderId || null,
            code: form.code || undefined,
            updateReason: form.updateReason || undefined
        };
        
        // Only send boundary if user modified it
        if (boundaryChanged.value) {
             payload.boundary = form.boundary.length > 0 ? form.boundary[0] : [];
        } else {
             delete payload.boundary;
        }

        if (isEditing.value && currentId.value) {
            await farmApi.updateLocation(currentId.value, payload);
             ElMessage.success('Cập nhật thửa thành công');
        } else {
            await farmApi.createLocation(payload);
             ElMessage.success('Tạo thửa thành công');
        }
        
        showCreateModal.value = false;
        loadData();
        fetchUsers(); // Refresh farmers list to get updated leaderId
      } catch (err: any) {
        console.error(err);
        const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra';
        ElMessage.error(Array.isArray(msg) ? msg.join(', ') : msg);
      } finally {
        submitting.value = false;
      }
    }
  });
};

const resetForm = () => {
  if (formRef.value) formRef.value.resetFields();
  form.area_m2 = 0;
  form.boundary = [];
  form.updateReason = '';
  boundaryChanged.value = false;
  isEditing.value = false;
  currentId.value = null;
  currentApprovalStatus.value = 'APPROVED';
  form.masterGrowingAreaId = '';
  form.farmerId = '';
  form.leaderId = '';
};

const handleDelete = (row: Location) => {
  locationToDelete.value = row;
  confirmDeleteCheckbox.value = false;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  locationToDelete.value = null;
  confirmDeleteCheckbox.value = false;
};

const executeDelete = async () => {
  if (!locationToDelete.value) return;
  deleting.value = true;
  try {
    await farmApi.deleteLocation(locationToDelete.value.id);
    ElMessage.success('Xóa thửa đất thành công');
    showDeleteModal.value = false;
    loadData();
  } catch (err: any) {
    console.error(err);
    const msg = err.response?.data?.message || err.message || 'Không thể xóa thửa';
    ElMessage.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    deleting.value = false;
  }
};

const route = useRoute();

onMounted(async () => {
    await Promise.all([
        loadData(),
        fetchMasterGrowingAreas(),
        fetchUsers(),
        fetchAllLeaders()
    ]);
    // Handle ?edit=locationId from detail page
    const editId = route.query.edit as string;
    if (editId) {
        const row = locations.value.find(l => l.id === editId);
        if (row) openEditModal(row);
    }
});
</script>

<style>
.branded-location-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-location-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-location-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-location-dialog .el-dialog__footer {
  padding: 0 !important;
}

.branded-delete-location-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-delete-location-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-delete-location-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-delete-location-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
