<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Quản lý Thửa</h1>
      <el-button type="primary" @click="openCreateModal">
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
               <el-input 
                  v-model="form.area_m2" 
                  class="w-full"
                  type="number"
                  :min="0"
                  onkeypress="return event.charCode >= 48 && event.charCode <= 57 || event.charCode === 46"
                  placeholder="Nhập diện tích trên giấy tờ"
                  @input="isAreaAutoFilled = false"
               >
                 <template #append>m²</template>
               </el-input>
             </el-form-item>
          </el-col>
        </el-row>

        <div style="position: relative;">
            <div id="map" style="height: 350px; margin-top: 10px; border-radius: 4px; z-index: 1;"></div>
        </div>
        
        <div class="flex items-center justify-between mt-2 mb-2">
          <div class="text-xs text-gray-500">
            * Sử dụng công cụ vẽ (hình ngũ giác) bên trái bản đồ để khoanh vùng diện tích.
          </div>
          <el-button type="primary" plain size="small" @click="show3DDrawer = true">
            🗺️ Mở bản đồ 3D để vẽ
          </el-button>
        </div>

        <!-- Tolerance Engine Display -->
        <div v-if="drawnAreaM2 > 0 && form.area_m2 > 0" class="mb-4">
            <el-alert
                v-if="areaDifferenceStatus === 'MATCH'"
                title="Diện tích bản đồ khớp với sổ đỏ (Độ lệch an toàn)"
                :description="`Diện tích vẽ: ${drawnAreaM2} m² (Lệch: ${areaDifferencePercent.toFixed(1)}%)`"
                type="success"
                show-icon
                :closable="false"
            />
            <el-alert
                v-else-if="areaDifferenceStatus === 'NEGATIVE_WARNING'"
                title="Chú ý: Diện tích vẽ hơi nhỏ so với Sổ đỏ"
                :description="`Vùng trồng được vẽ ${drawnAreaM2} m², nhỏ hơn Sổ đỏ khoảng ${Math.abs(areaDifferencePercent).toFixed(1)}%. Hệ thống vẫn cho phép lưu, nhưng hãy kiểm tra lại xem có vẽ thiếu không nhé.`"
                type="warning"
                show-icon
                :closable="false"
            />
            <el-alert
                v-else-if="areaDifferenceStatus === 'NEGATIVE_ERROR'"
                title="Lỗi: Hình vẽ quá nhỏ so với Sổ đỏ!"
                :description="`Vùng trồng được vẽ ${drawnAreaM2} m², thiếu hụt hơn ${Math.abs(areaDifferencePercent).toFixed(1)}% so với Sổ đỏ. Vui lòng bấm vào biểu tượng 'Cục tẩy' để xóa hình và khoanh vẽ lại bao quát hơn.`"
                type="error"
                show-icon
                :closable="false"
            />
            <el-alert
                v-else-if="areaDifferenceStatus === 'POSITIVE_ERROR'"
                title="Lỗi: Diện tích vẽ trên bản đồ lớn hơn Sổ đỏ!"
                :description="`Vùng trồng được vẽ ${drawnAreaM2} m², lớn hơn Sổ đỏ khoảng ${areaDifferencePercent.toFixed(1)}%. Hệ thống không cho phép khoanh lấn chiếm quá 5%. Vui lòng bấm vào biểu tượng 'Cục tẩy' xóa hình đi và vẽ lại nhỏ gọn hơn cho khớp.`"
                type="error"
                show-icon
                :closable="false"
            />
        </div>

        <!-- Overlap Display -->
        <div v-if="overlapWarning && form.boundary.length > 0" class="mb-4">
            <el-alert
                title="Cảnh báo: Chồng lấn ranh giới!"
                :description="overlapWarning"
                type="warning"
                show-icon
                :closable="false"
            />
        </div>

        <!-- Spatial Lock Display -->
        <div v-if="isOutsideProvince && form.boundary.length > 0" class="mb-4">
            <el-alert
                title="Lỗi: Vẽ sai ranh giới tỉnh!"
                :description="`Thửa đất bạn vừa vẽ nằm ngoài địa phận tỉnh ${form.province} (thuộc ${drawnProvinceName}). Vui lòng xóa hình và vẽ lại bên trong ranh giới tỉnh.`"
                type="error"
                show-icon
                :closable="false"
            />
        </div>


        <div v-loading="reverseGeocodingLoading" element-loading-text="Đang phân tích địa chỉ tự động...">
          <el-divider content-position="left">Địa chỉ & Tọa độ (GPS)</el-divider>
          <el-row :gutter="20" class="mb-2">
            <el-col :xs="24" :sm="12">
            <el-form-item label="Tỉnh/Thành phố" prop="province">
              <el-select v-model="form.province" placeholder="Chọn Tỉnh/Thành phố" filterable @change="onSearchProvinceChange" class="w-full" clearable :disabled="form.boundary.length > 0">
                <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="Phường/Xã" prop="ward">
              <el-select v-model="form.ward" placeholder="Chọn Phường/Xã" filterable @change="onSearchWardChange" class="w-full" :disabled="!form.province || form.boundary.length > 0" clearable>
                <el-option v-for="w in searchMapWards" :key="w.name" :label="w.name" :value="w.name" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" class="mb-2">
          <el-col :span="24">
            <el-form-item label="Địa chỉ chi tiết" prop="address">
              <el-input v-model="form.address" placeholder="VD: Thôn A, Xã B..." @blur="form.address = form.address?.trim()" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="Vĩ độ (Lat)" prop="lat">
              <el-input v-model="form.lat" type="number" step="0.000001" class="w-full" disabled placeholder="VD: 21.0" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="Kinh độ (Long)" prop="long">
              <el-input v-model="form.long" type="number" step="0.000001" class="w-full" disabled placeholder="VD: 105.8" />
            </el-form-item>
          </el-col>
        </el-row>
        </div>

        <el-alert 
            v-if="isEditing && currentApprovalStatus === 'PENDING'"
            title="Thửa đang chờ Admin duyệt ranh giới mới. Bạn không nên đổi ranh giới trong lúc này."
            type="warning" 
            show-icon 
            class="mb-4" 
            :closable="false"
        />

        <el-form-item v-if="isEditing" :label="`Lý do cập nhật ${isFormChanged ? '(Bắt buộc)' : ''}`" prop="updateReason" :required="isFormChanged">
           <el-input v-model="form.updateReason" type="textarea" placeholder="Nhập lý do thay đổi dữ liệu..." />
        </el-form-item>
        
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="showCreateModal = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button type="primary" :loading="submitting" :disabled="(isEditing && !isFormChanged) || areaDifferenceStatus === 'POSITIVE_ERROR' || areaDifferenceStatus === 'NEGATIVE_ERROR'" @click="submitForm" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
            {{ isEditing ? 'Cập nhật' : 'Tạo mới' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <MasterGrowingAreaModal ref="masterAreaModalRef" @created="fetchMasterGrowingAreas" />
    <QuickUserModal ref="quickUserModalRef" :role-name="currentQuickRole" @created="onQuickUserCreated" />

    <MapLibre3DDrawer
      ref="map3DDrawerRef"
      v-model="show3DDrawer"
      :location="editing3DLocation"
      :locations="filteredExistingLocations"
      :has-error="has3DError"
      mode="draw"
      @boundary-drawn="handle3DBoundaryDrawn"
      @preview-drawn="handlePreviewDrawn"
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
import { Plus, Search, Loading, WarningFilled, Lock } from '@element-plus/icons-vue';
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

const isOutsideProvince = ref(false);
const drawnProvinceName = ref('');
const has3DError = ref(false);
const previousMasterAreaId = ref('');
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

const isAreaAutoFilled = ref(true);
const drawnAreaM2 = ref(0);
const existingLocations = ref<any[]>([]);
const overlapWarning = ref<string | null>(null);

const checkOverlap = () => {
    overlapWarning.value = null;
    if (form.boundary.length === 0) return;
    
    try {
        const currentPoly = turf.polygon(form.boundary);
        const overlapNames: string[] = [];
        let totalOverlapM2 = 0;
        
        for (const loc of existingLocations.value) {
            if (isEditing.value && loc.id === currentId.value) continue;
            
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
                try {
                    const targetPoly = turf.polygon(parsedBoundary);
                    const intersection = turf.intersect(turf.featureCollection([currentPoly, targetPoly]));
                    if (intersection) {
                        const area = turf.area(intersection);
                        if (area > 1) { // > 1 m2
                            overlapNames.push(loc.name || loc.code || 'Thửa hàng xóm');
                            totalOverlapM2 += area;
                        }
                    }
                } catch(e) {}
            }
        }
        
        if (overlapNames.length > 0) {
    overlapWarning.value = `Cảnh báo: Thửa đất bạn vẽ đang chồng lấn với thửa ${overlapNames.join(', ')} (tổng diện tích chồng lấn: ${totalOverlapM2.toFixed(1)} m²). Bạn vẫn có thể lưu, nhưng nên kiểm tra lại trước khi tiếp tục.`;
        }
    } catch(e) {
        console.error('Lỗi tính toán chồng lấn', e);
    }
};

const areaDifferencePercent = computed(() => {
    if (!form.area_m2 || form.area_m2 <= 0) return 0;
    return (Math.abs(drawnAreaM2.value - form.area_m2) / form.area_m2) * 100;
});
const areaDifferenceStatus = computed(() => {
    if (!form.area_m2 || form.area_m2 <= 0) return 'MATCH';
    const diff = (drawnAreaM2.value - form.area_m2) / form.area_m2 * 100;
    
    if (diff > 5) return 'POSITIVE_ERROR'; // Lệch dương > 5% -> Đỏ (Chặn)
    if (diff < -15) return 'NEGATIVE_ERROR'; // Lệch âm > 15% -> Đỏ (Chặn)
    if (diff < -5) return 'NEGATIVE_WARNING'; // Lệch âm 5-15% -> Vàng (Cho phép)
    return 'MATCH'; // -5% đến 5% -> Xanh (An toàn)
});

const masterAnchorPoint = ref<{lng: number, lat: number} | null>(null);



const editing3DLocation = computed(() => {
  const masterArea = masterGrowingAreas.value.find(a => a.id === form.masterGrowingAreaId);

  const loc: any = {
    code: masterArea?.code || form.code,
    name: masterArea?.name || form.name,
    plantType: masterArea?.plantType || '',
    managerName: masterArea?.managerName || '',
    province: form.province,
    ward: form.ward,
    areaM2: form.area_m2,
    coordinate: { coordinates: [form.long, form.lat] },
    boundary: form.boundary.length > 0 ? { type: 'Polygon', coordinates: form.boundary } : null,
  };
  return loc;
});

const handle3DBoundaryDrawn = (data: { coordinates: number[][][]; areaM2: number }) => {
  form.boundary = data.coordinates;
  drawnAreaM2.value = Math.round(data.areaM2 * 10) / 10;
  if (isAreaAutoFilled.value) {
      form.area_m2 = drawnAreaM2.value;
  }
  boundaryChanged.value = true;
  checkOverlap();

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
      // Bỏ qua không xóa các thửa đất màu xanh lá đang hiển thị
      if (layer === existingLocationsLayer) return;
      if (existingLocationsLayer && existingLocationsLayer.hasLayer(layer)) return;
      
      if (layer.pm && layer !== map) {
        map!.removeLayer(layer);
      }
    });
    const polyCoords = data.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
    const polygon = L.polygon(polyCoords as any, { color: '#3b82f6', fillOpacity: 0.2 });
    polygon.addTo(map);
    map.fitBounds(polygon.getBounds(), { padding: [20, 20] });
    if (marker) marker.setLatLng([form.lat, form.long]);
  }

  ElMessage.success(`Polygon đã vẽ trên 3D! Diện tích: ${form.area_m2.toLocaleString()} m²`);
  
  reverseGeocodeToForm(form.long, form.lat);
};

const handlePreviewDrawn = async (data: { coordinates: number[][][]; areaM2: number } | null) => {
    has3DError.value = true; // Khóa nút Lưu trong lúc đang check Mapbox (async)
    if (!data || data.coordinates.length === 0) {
        has3DError.value = false;
        return;
    }

    const drawnAreaM2 = Math.round(data.areaM2 * 10) / 10;
    
    // 1. Check Area (Chỉ cảnh báo nếu người dùng TỰ NHẬP tay diện tích)
    if (form.area_m2 > 0 && !isAreaAutoFilled.value) {
        const diff = Math.abs(drawnAreaM2 - form.area_m2) / form.area_m2 * 100;
        if (diff > 15) {
            ElMessage.warning(`Chú ý: Diện tích vẽ trên 3D (${drawnAreaM2.toLocaleString()} m²) lệch quá 15% so với diện tích khai báo (${form.area_m2.toLocaleString()} m²)!`);
        }
    }

    // 2. Check Overlap
    const drawnPoly = turf.polygon(data.coordinates as any);
    let isOverlapping = false;
    for (const loc of filteredExistingLocations.value) {
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
            try {
                const existingPoly = turf.polygon(parsedBoundary as any);
                const intersection = turf.intersect(turf.featureCollection([drawnPoly, existingPoly]));
                if (intersection && intersection.geometry) {
                    const overlapArea = turf.area(intersection);
                    if (overlapArea > 0.1) {
                        isOverlapping = true;
                        break;
                    }
                }
            } catch (e) {}
        }
    }

    if (isOverlapping) {
        ElMessage.warning('Cảnh báo: Ranh giới vẽ đang bị chồng lấn lên thửa đất khác!');
    }

    // 3. Check Province Lock
    if (form.province) {
        try {
            const center = turf.centerOfMass(drawnPoly);
            const lng = center.geometry.coordinates[0];
            const lat = center.geometry.coordinates[1];
            
            const token = import.meta.env.VITE_MAPBOX_TOKEN;
            if (!token) return;
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&country=vn&language=vi`;
            const res = await fetch(url);
            const mbData = await res.json();
            
            if (mbData.features && mbData.features.length > 0) {
                const feature = mbData.features[0];
                let mbProvince = '';
                
                if (feature.context) {
                    const regionCtx = feature.context.find((c: any) => c.id.startsWith('region') || c.id.startsWith('place'));
                    if (regionCtx) mbProvince = regionCtx.text;
                }
                
                let matchedProv = null;
                if (mbProvince) {
                    const normMbProv = normalizeProvinceName(mbProvince);
                    matchedProv = provinces.value.find(p => normalizeProvinceName(p.name).includes(normMbProv) || normMbProv.includes(normalizeProvinceName(p.name)));
                }
                
                if (!matchedProv) {
                    const fullPlace = (feature.place_name || '').toLowerCase();
                    matchedProv = provinces.value.find(p => fullPlace.includes(normalizeProvinceName(p.name)));
                }

                if (matchedProv) {
                    const currentProvNorm = normalizeProvinceName(form.province);
                    const matchedProvNorm = normalizeProvinceName(matchedProv.name);
                    if (currentProvNorm !== matchedProvNorm) {
                        ElMessage.error(`Lỗi: Vị trí vẽ nằm ngoài ranh giới tỉnh ${form.province}! (Nằm ở ${matchedProv.name}). Vui lòng xóa hình và vẽ lại bên trong ranh giới tỉnh.`);
                        return; // Lỗi -> return luôn để has3DError vẫn = true
                    }
                }
            }
        } catch (e) {}
    }

    // Nếu vượt qua được (hoặc không có) bài kiểm tra Tỉnh -> Mở khóa nút Lưu
    // Cảnh báo chồng lấn vẫn cho phép lưu
    has3DError.value = false;
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
    // Trường hợp 1: Chuyển từ Vùng này sang Vùng khác và đã có ranh giới
    if (previousMasterAreaId.value && form.boundary.length > 0) {
        try {
            await ElMessageBox.confirm(
                'Đổi Vùng trồng lớn sẽ xóa ranh giới bạn đã vẽ hiện tại. Bạn có chắc chắn muốn đổi?',
                'Xác nhận chuyển vùng',
                { confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy', type: 'warning' }
            );
            // Người dùng đồng ý -> Xóa ranh giới
            if (drawnItems) drawnItems.clearLayers();
            form.boundary = [];
            drawnAreaM2.value = 0;
            form.area_m2 = 0;
            isAreaAutoFilled.value = true;
            boundaryChanged.value = true;
            overlapWarning.value = null;
        } catch {
            // Người dùng chọn Hủy -> Rollback lại giá trị dropdown cũ
            form.masterGrowingAreaId = previousMasterAreaId.value;
            return; 
        }
    }
    // Trường hợp 2: Chọn Vùng lần đầu (từ [Trống]) nhưng đã vẽ ranh giới trước đó
    else if (!previousMasterAreaId.value && form.boundary.length > 0 && val) {
        const masterArea = masterGrowingAreas.value.find(a => a.id === val);
        if (masterArea && masterArea.province) {
            try {
                reverseGeocodingLoading.value = true;
                const token = import.meta.env.VITE_MAPBOX_TOKEN;
                if (token) {
                    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${form.long},${form.lat}.json?access_token=${token}&country=vn&language=vi`;
                    const res = await fetch(url);
                    const mbData = await res.json();
                    
                    if (mbData.features && mbData.features.length > 0) {
                        const feature = mbData.features[0];
                        let mbProvince = '';
                        if (feature.context) {
                            const regionCtx = feature.context.find((c: any) => c.id.startsWith('region') || c.id.startsWith('place'));
                            if (regionCtx) mbProvince = regionCtx.text;
                        }
                        
                        let matchedProv = null;
                        if (mbProvince) {
                            const normMbProv = normalizeProvinceName(mbProvince);
                            matchedProv = provinces.value.find(p => normalizeProvinceName(p.name).includes(normMbProv) || normMbProv.includes(normalizeProvinceName(p.name)));
                        }
                        if (!matchedProv) {
                            const fullPlace = (feature.place_name || '').toLowerCase();
                            matchedProv = provinces.value.find(p => fullPlace.includes(normalizeProvinceName(p.name)));
                        }
                        
                        if (matchedProv) {
                            const masterProvNorm = normalizeProvinceName(masterArea.province);
                            const matchedProvNorm = normalizeProvinceName(matchedProv.name);
                            if (masterProvNorm !== matchedProvNorm) {
                                reverseGeocodingLoading.value = false;
                                try {
                                    await ElMessageBox.confirm(
                                        `Ranh giới bạn đã vẽ (nằm ở ${matchedProv.name}) không khớp với Vùng trồng (thuộc ${masterArea.province}). Áp dụng Vùng này sẽ xóa ranh giới hiện tại. Bạn có chắc chắn muốn áp dụng?`,
                                        'Cảnh báo sai tỉnh',
                                        { confirmButtonText: 'Đồng ý (Xóa hình)', cancelButtonText: 'Hủy', type: 'warning' }
                                    );
                                    // Bấm đồng ý -> Xóa hình, cho phép update dropdown
                                    if (drawnItems) drawnItems.clearLayers();
                                    form.boundary = [];
                                    drawnAreaM2.value = 0;
                                    form.area_m2 = 0;
                                    isAreaAutoFilled.value = true;
                                    boundaryChanged.value = true;
                                    overlapWarning.value = null;
                                } catch {
                                    // Hủy dropdown
                                    form.masterGrowingAreaId = '';
                                    return;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore
            } finally {
                reverseGeocodingLoading.value = false;
            }
        }
    }

    previousMasterAreaId.value = val;
    form.leaderId = '';
    form.address = ''; // Reset địa chỉ chi tiết
    teamLeaders.value = [];
    masterAnchorPoint.value = null;
    if (!val) {
        if (existingLocationsLayer) existingLocationsLayer.clearLayers();
        form.province = '';
        form.ward = '';
        searchMapWards.value = [];
        return;
    }
    
    // Geofencing: Auto-fill province and ward
    const masterArea = masterGrowingAreas.value.find(a => a.id === val);
    if (masterArea) {
        if (masterArea.province) {
            form.province = masterArea.province;
            // Load wards for the new province
            const prov = provinces.value.find(p => p.name === masterArea.province);
            if (prov) {
                searchMapWards.value = prov.wards;
            }
            
            // Tải trước Tọa độ Tâm (Anchor Point) để dùng cho Realtime Geofencing
            const addressToGeocode = masterArea.ward 
                ? `${masterArea.ward}, ${masterArea.province}, Vietnam` 
                : `${masterArea.province}, Vietnam`;
            fetchGeocodeCoords(addressToGeocode).then(coords => {
                if (coords) masterAnchorPoint.value = { lng: coords[0], lat: coords[1] };
            });
        }
        if (masterArea.ward) {
            setTimeout(() => {
                form.ward = masterArea.ward || '';
                // Fly map to ward
                if (form.ward && form.province && form.boundary.length === 0) {
                    geocodeAddress(`${form.ward}, ${form.province}, Vietnam`, 14);
                }
            }, 100);
        } else if (masterArea.province) {
            // Fly map to province if no ward is set
            setTimeout(() => {
                if (form.province && form.boundary.length === 0) {
                    geocodeAddress(`${form.province}, Vietnam`, 10);
                }
            }, 100);
        }
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
const searchMapWards = ref<any[]>([]);

const onSearchProvinceChange = () => {
    form.ward = '';
    const prov = provinces.value.find(p => p.name === form.province);
    searchMapWards.value = prov ? prov.wards : [];
    
    // Chỉ dịch chuyển bản đồ nếu chưa vẽ ranh giới
    if (form.province && form.boundary.length === 0) {
        geocodeAddress(`${form.province}, Vietnam`, 10);
    }
};

const onSearchWardChange = () => {
    // Chỉ dịch chuyển bản đồ nếu chưa vẽ ranh giới
    if (form.ward && form.province && form.boundary.length === 0) {
        geocodeAddress(`${form.ward}, ${form.province}, Vietnam`, 14);
    }
};

const fetchGeocodeCoords = async (address: string): Promise<[number, number] | null> => {
    try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token) return null;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&country=vn`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
            return data.features[0].center;
        }
    } catch (e) {
        console.error('Lỗi lấy tọa độ từ Mapbox:', e);
    }
    return null;
};

const geocodeAddress = async (address: string, zoomLevel: number) => {
    const coords = await fetchGeocodeCoords(address);
    if (coords) {
        const [lng, lat] = coords;
        form.lat = Number(lat.toFixed(6));
        form.long = Number(lng.toFixed(6));
        
        if (map && marker) {
             const newPos = new L.LatLng(form.lat, form.long);
             marker.setLatLng(newPos);
             map.setView(newPos, zoomLevel);
        }
    }
};

const reverseGeocodingLoading = ref(false);

const normalizeProvinceName = (s: string) => {
    if (!s) return '';
    return s.toLowerCase().replace(/^(tỉnh|thành phố|thành phố trung ương|tp|xã|phường|thị trấn|quận|huyện)\s+/i, '').trim();
};

const reverseGeocodeToForm = async (lng: number, lat: number) => {
    try {
        reverseGeocodingLoading.value = true;
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (!token) return;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&country=vn&language=vi`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            
            // Fix 2: Chỉ lấy tên đường/số nhà, không lấy full chuỗi dài thò lò
            let shortAddress = feature.text || '';
            if (feature.address) {
                shortAddress = `${feature.address} ${shortAddress}`;
            }
            form.address = shortAddress;
            
            let mbProvince = '';
            
            if (feature.context) {
                const regionCtx = feature.context.find((c: any) => c.id.startsWith('region') || c.id.startsWith('place'));
                if (regionCtx) mbProvince = regionCtx.text;
            }
            
            // Khớp Tỉnh/Thành
            let matchedProv = null;
            if (mbProvince) {
                const normMbProv = normalizeProvinceName(mbProvince);
                matchedProv = provinces.value.find(p => normalizeProvinceName(p.name).includes(normMbProv) || normMbProv.includes(normalizeProvinceName(p.name)));
            }
            
            // Nếu mapbox nhận vùng region sai, thử lục lại toàn bộ place_name
            if (!matchedProv) {
                const fullPlace = (feature.place_name || '').toLowerCase();
                matchedProv = provinces.value.find(p => fullPlace.includes(normalizeProvinceName(p.name)));
            }
            
            if (matchedProv) {
                // Kiểm tra giới hạn tỉnh (Spatial Lock)
                if (form.province) {
                    const currentProvNorm = normalizeProvinceName(form.province);
                    const matchedProvNorm = normalizeProvinceName(matchedProv.name);
                    if (currentProvNorm !== matchedProvNorm) {
                        isOutsideProvince.value = true;
                        drawnProvinceName.value = matchedProv.name;
                    } else {
                        isOutsideProvince.value = false;
                    }
                } else {
                    isOutsideProvince.value = false;
                }

                // Nếu không có Vùng trồng lớn HOẶC đang trống thì mới update Tỉnh
                if (!form.masterGrowingAreaId || !form.province) {
                    form.province = matchedProv.name;
                    searchMapWards.value = matchedProv.wards;
                }
                
                // Fix 1: Gom toàn bộ context và text lại để soi tìm Phường/Xã (vì Mapbox rất hay để lộn xộn ở Vietnam)
                const allTexts = (feature.context || []).map((c: any) => normalizeProvinceName(c.text));
                allTexts.push(normalizeProvinceName(feature.text));
                
                let foundWard = false;
                for (const w of matchedProv.wards) {
                    const normW = normalizeProvinceName(w.name);
                    if (allTexts.some((t: string) => t === normW || t.includes(normW) || normW.includes(t))) {
                        // Nếu không chọn Vùng trồng lớn, HOẶC đang trống, thì mới update Xã
                        if (!form.masterGrowingAreaId || !form.ward) {
                            form.ward = w.name;
                        }
                        foundWard = true;
                        break;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Lỗi Reverse Geocoding:', e);
    } finally {
        reverseGeocodingLoading.value = false;
    }
};

// Map related
let map: L.Map | null = null;
let marker: L.Marker | null = null;
let existingLocationsLayer: L.FeatureGroup | null = null;
let drawnItems: L.FeatureGroup | null = null;

const loadExistingLocationsOnMap = async (masterGrowingAreaId: string) => {
    if (!map || !existingLocationsLayer) return;
    existingLocationsLayer.clearLayers();
    if (!masterGrowingAreaId) return;

    try {
        const { data } = await farmApi.getLocations({ masterGrowingAreaId });
        existingLocations.value = data || [];
        const locationsToDraw = existingLocations.value;
        
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
                    color: '#16a34a', // green-600
                    fillColor: '#22c55e', // green-500
                    fillOpacity: 0.3,
                    weight: 2,
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

const filteredExistingLocations = computed(() => {
    if (!isEditing.value || !currentId.value) return existingLocations.value;
    return existingLocations.value.filter(loc => loc.id !== currentId.value);
});

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

const originalForm = ref<any>({});
const isFormChanged = computed(() => {
    if (!isEditing.value) return true;
    return JSON.stringify({ ...form, updateReason: '' }) !== JSON.stringify({ ...originalForm.value, updateReason: '' });
});

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
  leaderId: '',
  address: '',
  province: '',
  ward: ''
});

const validateName = (rule: any, value: any, callback: any) => {
    if (!value || value.trim().length < 3) {
        callback(new Error('Tên thửa phải có ít nhất 3 ký tự'));
        return;
    }
    if (/^[\d\W_]+$/.test(value)) {
        callback(new Error('Tên thửa không hợp lệ (không được chỉ chứa số hoặc ký tự đặc biệt)'));
        return;
    }
    callback();
};

const validateCode = (rule: any, value: any, callback: any) => {
    if (value) {
        if (value.length < 3 || value.length > 50) {
            callback(new Error('Mã thửa phải từ 3 đến 50 ký tự'));
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            callback(new Error('Mã thửa chỉ được chứa chữ không dấu, số, dấu gạch ngang, gạch dưới'));
            return;
        }
    }
    callback();
};

const validateLat = (rule: any, value: any, callback: any) => {
    if (value < 8.0 || value > 24.0) {
        callback(new Error('Vĩ độ phải nằm trong lãnh thổ Việt Nam (8.0 đến 24.0)'));
        return;
    }
    callback();
};

const validateLong = (rule: any, value: any, callback: any) => {
    if (value < 102.0 || value > 110.0) {
        callback(new Error('Kinh độ phải nằm trong lãnh thổ Việt Nam (102.0 đến 110.0)'));
        return;
    }
    callback();
};

const validateUpdateReason = (rule: any, value: any, callback: any) => {
    if (isEditing.value && isFormChanged.value) {
        if (!value || value.trim().length < 10) {
            callback(new Error('Vui lòng nhập lý do cập nhật dữ liệu rõ ràng (ít nhất 10 ký tự)'));
            return;
        }
        if (value.trim().length > 500) {
            callback(new Error('Lý do cập nhật không được vượt quá 500 ký tự'));
            return;
        }
    }
    callback();
};

const validateArea = (rule: any, value: any, callback: any) => {
    if (value === '' || value === null || value === undefined) {
        callback(new Error('Vui lòng nhập diện tích pháp lý (Sổ đỏ)'));
        return;
    }
    if (Number(value) < 0) {
        callback(new Error('Diện tích không được là số âm'));
        return;
    }
    if (Number(value) > 999999999) { // Giới hạn ~100,000 Hecta
        callback(new Error('Diện tích nhập vào quá lớn (Tối đa 999,999,999 m²)'));
        return;
    }
    callback();
};

const rules = reactive<FormRules>({
  name: [
      { required: true, message: 'Vui lòng nhập tên thửa', trigger: 'blur' },
      { max: 255, message: 'Tên thửa không được vượt quá 255 ký tự', trigger: 'blur' },
      { validator: validateName, trigger: 'blur' }
  ],
  code: [
      { validator: validateCode, trigger: 'blur' }
  ],
  area_m2: [
      { required: true, message: 'Vui lòng nhập diện tích pháp lý (Sổ đỏ)', trigger: 'blur' },
      { validator: validateArea, trigger: 'blur' }
  ],
  masterGrowingAreaId: [{ required: true, message: 'Vui lòng chọn Mã vùng trồng lớn', trigger: 'change' }],
  farmerId: [{ required: !isFarmerRole.value, message: 'Vui lòng chọn Nông hộ', trigger: 'change' }],
  address: [
      { required: true, message: 'Vui lòng nhập địa chỉ chi tiết', trigger: 'blur' },
      { min: 5, max: 255, message: 'Địa chỉ chi tiết phải từ 5 đến 255 ký tự', trigger: 'blur' }
  ],
  lat: [
      { required: true, message: 'Vui lòng nhập Vĩ độ', trigger: 'blur' },
      { validator: validateLat, trigger: 'blur' }
  ],
  long: [
      { required: true, message: 'Vui lòng nhập Kinh độ', trigger: 'blur' },
      { validator: validateLong, trigger: 'blur' }
  ],
  updateReason: [
      { validator: validateUpdateReason, trigger: 'blur' }
  ]
});

const initMap = async () => {
    await nextTick();
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    if (map) {
        map.remove(); // Clean up existing map
    }

    map = L.map('map', {
        minZoom: 4,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0
    }).setView([form.lat, form.long], 12);
    
    L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=' + import.meta.env.VITE_MAPBOX_TOKEN, {
        maxZoom: 20,
        attribution: '© Mapbox',
        noWrap: true
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
    // pmIgnore prevents Geoman from deleting the marker when using the Removal tool
    marker = L.marker([form.lat, form.long], { draggable: true, pmIgnore: true } as any).addTo(map);
    
    // Layer group for polygon
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    existingLocationsLayer = new L.FeatureGroup();
    map.addLayer(existingLocationsLayer);

    // Load existing polygon if any
    if (form.boundary && form.boundary.length > 0) {
        // leaf polygon expects lat, lng
        const polyCoords = form.boundary[0].map((coord: number[]) => [coord[1], coord[0]]);
        
        // Show differently if it's pending approval
        const isPending = isEditing.value && currentApprovalStatus.value === 'PENDING';
        const color = isPending ? '#f59e0b' : '#3b82f6'; // Orange if pending, blue if approved/creating
        
        const polygon = L.polygon(polyCoords, { color, fillOpacity: isPending ? 0.3 : 0.2, dashArray: isPending ? '5, 5' : '' });
        drawnItems?.addLayer(polygon);
        map.fitBounds(polygon.getBounds(), { padding: [20, 20] });
    } else {
        map.setView([form.lat, form.long], 15);
    }

    // Geoman Events
    map.on('pm:create', (e: any) => {
        drawnItems?.clearLayers(); // Only 1 polygon allowed
        e.layer.setStyle({ color: '#3b82f6', fillOpacity: 0.2 }); // Ensure it stays blue
        drawnItems?.addLayer(e.layer);
        
        const geojson = e.layer.toGeoJSON();
        const areaSqMeters = turf.area(geojson);
        drawnAreaM2.value = Math.round(areaSqMeters * 10) / 10;
        if (isAreaAutoFilled.value) {
            form.area_m2 = drawnAreaM2.value;
        }
        form.boundary = geojson.geometry.coordinates; // [ [ [lng, lat], ... ] ]
        boundaryChanged.value = true;
        checkOverlap();
        
        // Update marker to center of polygon
        const center = turf.centerOfMass(geojson);
        form.long = Number(center.geometry.coordinates[0].toFixed(6));
        form.lat = Number(center.geometry.coordinates[1].toFixed(6));
        if (marker) marker.setLatLng([form.lat, form.long]);
        
        reverseGeocodeToForm(form.long, form.lat);
    });

    map.on('pm:remove', () => {
        drawnItems?.clearLayers();
        form.boundary = [];
        drawnAreaM2.value = 0; // Reset area
        form.area_m2 = 0; // Xóa ô diện tích
        isAreaAutoFilled.value = true; // Bật lại tự điền
        boundaryChanged.value = true;
        overlapWarning.value = null;
        
        // UX Improvement: Fly to the currently selected Ward/Province if exists
        if (form.ward && form.province) {
            geocodeAddress(`${form.ward}, ${form.province}, Vietnam`, 14);
        } else if (form.province) {
            geocodeAddress(`${form.province}, Vietnam`, 10);
        }
    });

    // Also handle edits to the drawn layer
    map.on('pm:globaleditmodetoggled', (e: any) => {
        if (!e.enabled) {
            // Edit mode disabled, capture changes
            const layers = drawnItems?.getLayers() || [];
            if (layers.length > 0) {
                const layer = layers[0] as any;
                const geojson = layer.toGeoJSON();
                const areaSqMeters = turf.area(geojson);
                drawnAreaM2.value = Math.round(areaSqMeters * 10) / 10;
                if (isAreaAutoFilled.value) {
                    form.area_m2 = drawnAreaM2.value;
                }
                form.boundary = geojson.geometry.coordinates;
                boundaryChanged.value = true;
                checkOverlap();
                
                const center = turf.centerOfMass(geojson);
                form.long = Number(center.geometry.coordinates[0].toFixed(6));
                form.lat = Number(center.geometry.coordinates[1].toFixed(6));
                if (marker) marker.setLatLng([form.lat, form.long]);
                
                reverseGeocodeToForm(form.long, form.lat);
            }
        }
    });

    // Event: Marker Drag
    marker.on('dragend', (e) => {
        if (form.boundary.length === 0) {
            const latLng = e.target.getLatLng();
            form.lat = Number(latLng.lat.toFixed(6));
            form.long = Number(latLng.lng.toFixed(6));
            reverseGeocodeToForm(form.long, form.lat);
        }
    });

    // Event: Map Click (fallback if no polygon)
    map.on('click', (e) => {
        if (form.boundary.length === 0) {
            form.lat = Number(e.latlng.lat.toFixed(6));
            form.long = Number(e.latlng.lng.toFixed(6));
            if (marker) marker.setLatLng(e.latlng);
            reverseGeocodeToForm(form.long, form.lat);
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
             
             // Reverse geocode if no boundary drawn
             if (form.boundary.length === 0) {
                 reverseGeocodeToForm(newLong as number, newLat as number);
             }
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

const openCreateModal = () => {
    isAreaAutoFilled.value = true;
    isEditing.value = false;
    currentId.value = '';
    previousMasterAreaId.value = '';
    
    form.name = '';
    form.code = '';
    form.area_m2 = 0;
    form.lat = 21.0;
    form.long = 105.8;
    form.boundary = [];
    form.updateReason = '';
    form.masterGrowingAreaId = '';
    form.farmerId = '';
    form.leaderId = '';
    form.address = '';
    form.province = '';
    form.ward = '';
    
    originalForm.value = JSON.parse(JSON.stringify(form));
    showCreateModal.value = true;
};

const openEditModal = async (row: Location) => {
    isAreaAutoFilled.value = false;
    isEditing.value = true;
    currentId.value = row.id;
    previousMasterAreaId.value = row.masterGrowingAreaId || '';
    
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
    
    // Additional address fields
    form.address = row.address || '';
    form.province = row.province || '';
    
    if (form.province) {
        const prov = provinces.value.find(p => p.name === form.province);
        searchMapWards.value = prov ? prov.wards : [];
    }
    
    form.ward = row.ward || '';
    
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
    if (parsedBoundary.length > 0) {
        try {
            const poly = turf.polygon(parsedBoundary);
            const areaSqMeters = turf.area(poly);
            drawnAreaM2.value = Math.round(areaSqMeters * 10) / 10;
        } catch(e) {
            drawnAreaM2.value = 0;
        }
    } else {
        drawnAreaM2.value = 0;
    }
    form.updateReason = ''; // Reset update reason
    boundaryChanged.value = false; // Reset modification flag
    currentApprovalStatus.value = row.approvalStatus || 'APPROVED';
    currentEudrCheckLog.value = row.checkLog || null;

    originalForm.value = JSON.parse(JSON.stringify(form));
    showCreateModal.value = true;
}

const submitForm = async () => {
  if (submitting.value) return;
  if (!formRef.value) return;
  
  if (isOutsideProvince.value) {
      ElMessage.error(`Lỗi: Thửa đất bạn vẽ đang nằm ngoài địa phận tỉnh ${form.province}. Vui lòng vẽ lại!`);
      return;
  }

  submitting.value = true;
  try {
    const isValid = await formRef.value.validate().catch(() => false);
    if (!isValid) return;

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

    // 3. Ràng buộc ranh giới và dung sai
    if (form.boundary.length === 0) {
      ElMessage.error('Vui lòng khoanh vẽ ranh giới thửa đất trên bản đồ!');
      return;
    }
    if (areaDifferencePercent.value > 15) {
      ElMessage.error('Sai lệch diện tích quá lớn (> 15%). Vui lòng xóa hình vẽ lại cho chuẩn khớp với Sổ đỏ!');
      return;
    }

    const payload: any = {
        ...form,
        leaderId: form.leaderId || null,
        code: form.code || undefined,
        updateReason: form.updateReason || undefined,
        address: form.address || undefined
    };
    delete payload.province;
    delete payload.ward;
    
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
};

const resetForm = () => {
  if (formRef.value) formRef.value.resetFields();
  form.area_m2 = 0;
  drawnAreaM2.value = 0;
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
