<template>
  <div class="p-6">
    <div style="margin-bottom: 24px;">
      <h1 class="text-2xl font-bold text-gray-900" style="margin-bottom: 16px;">Nhật ký điện tử</h1>
      
      <!-- Compact Filter Bar -->
      <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
          <!-- Date Range Picker -->
          <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="tới"
              start-placeholder="Từ ngày"
              end-placeholder="Đến ngày"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              @change="onDateRangeChange"
              style="width: 260px;"
              :clearable="false"
          />

          <!-- Location Selector -->
          <el-select v-model="filterLocation" placeholder="Tất cả vùng trồng" clearable style="width: 180px;" @change="handleFilterChange">
              <el-option v-for="loc in locations" :key="loc.id" :label="loc.name" :value="loc.id" />
          </el-select>

          <!-- Cycle Selector -->
          <el-select v-model="filterCycle" placeholder="Tất cả vụ mùa" clearable style="width: 180px;" @change="handleFilterChange">
              <el-option v-for="cycle in cycles" :key="cycle.id" :label="cycle.name" :value="cycle.id" />
          </el-select>

          <!-- Status Radio Buttons -->
          <el-radio-group v-model="filterStatus" size="default" @change="handleFilterChange" style="margin-left: auto;">
              <el-radio-button label="">Tất cả</el-radio-button>
              <el-radio-button label="PENDING">Chưa làm</el-radio-button>
              <el-radio-button label="COMPLETED">Đã xong</el-radio-button>
              <el-radio-button label="SKIPPED">Bỏ qua</el-radio-button>
          </el-radio-group>
      </div>
    </div>

    <!-- Overdue Section -->
    <div v-if="overdueTasks.length > 0" class="mb-8">
        <h2 class="text-xl font-bold text-red-600 mb-4 flex items-center">
            <el-icon class="mr-2"><Warning /></el-icon>
            Công việc quá hạn ({{ overdueTasks.length }})
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="task in overdueTasks" :key="task.id" 
                class="bg-red-50 rounded-lg shadow-md border border-red-200 hover:shadow-lg transition-shadow duration-200 flex flex-col overflow-hidden relative"
            >
                <div class="absolute top-0 right-0 p-2">
                     <el-tag type="danger" effect="dark" class="font-bold">Quá hạn {{ getDaysOverdue(task.dueDate) }} ngày</el-tag>
                </div>

                <div class="p-5 flex-1">
                    <div class="text-xs text-red-500 mb-2 flex items-center gap-2 font-semibold">
                        <el-icon><Calendar /></el-icon> Hết hạn: {{ formatDateSimple(task.dueDate) }}
                    </div>
                    <div class="text-xs text-gray-500 mb-2 flex items-center gap-2">
                        <el-icon><Location /></el-icon> {{ task.cropCycle?.location?.name || '---' }}
                        <span class="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span>{{ task.cropCycle?.name || '---' }}</span>
                    </div>

                    <h3 class="text-lg font-bold text-gray-800 mb-1 leading-snug">
                        {{ task.title }}
                    </h3>
                    
                    <div v-if="task.stage" class="inline-block bg-white border border-red-200 text-red-800 text-xs px-2 py-1 rounded mt-1 font-semibold">
                        {{ task.stage }}
                    </div>

                    <p class="text-gray-600 text-sm mt-3 line-clamp-3">
                        {{ task.description || 'Không có mô tả.' }}
                    </p>
                </div>

                <div class="p-4 bg-white border-t border-red-100 flex justify-end">
                     <el-button 
                        type="danger" 
                        size="large" 
                        class="w-full font-bold shadow-sm"
                        @click="openConfirmModal(task)"
                     >
                        <el-icon class="mr-2"><CircleCheck /></el-icon>
                        Xử lý ngay
                     </el-button>
                </div>
            </div>
        </div>
        <el-divider />
    </div>

    <div class="mb-4"></div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <el-skeleton :rows="4" animated v-for="i in 3" :key="i" class="bg-white p-4 rounded shadow" />
    </div>

    <!-- Empty -->
    <div v-else-if="tasks.length === 0" class="text-center py-12 bg-white rounded-lg shadow-sm">
        <el-empty description="Không có công việc nào theo lịch này" />
    </div>

    <!-- Task List (Cards) & Pagination Wrapper -->
    <div v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div v-for="task in tasks" :key="task.id" 
                class="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow duration-200 flex flex-col overflow-hidden relative"
                :class="task.status === 'COMPLETED' ? 'border-green-200 bg-green-50' : task.status === 'SKIPPED' ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200'"
            >
                <!-- Badge Status -->
                <div class="absolute top-0 right-0 p-2">
                     <el-tag v-if="task.status === 'COMPLETED'" type="success" effect="dark">Đã hoàn thành</el-tag>
                     <el-tag v-else-if="task.status === 'SKIPPED'" type="info">Đã bỏ qua</el-tag>
                     <el-tag v-else type="primary" effect="light">Đúng hạn</el-tag>
                </div>

                <div class="p-5 flex-1">
                    <!-- Header: Cycle & Location -->
                    <div class="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-3 border border-gray-100">
                        <div class="flex items-center gap-2 mb-1">
                            <el-icon class="text-blue-500"><Location /></el-icon> 
                            <span class="font-semibold">{{ task.cropCycle?.location?.name || '---' }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                             <span class="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">●</span>
                             <span class="font-medium text-gray-600">{{ task.cropCycle?.name || '---' }}</span>
                        </div>
                    </div>

                    <!-- Dates Block -->
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; font-size: 13px; color: #606266;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <el-icon style="color: #909399;"><Calendar /></el-icon>
                            <span>Ngày theo lịch: <strong style="color: #303133;">{{ formatDateSimple(task.dueDate) }}</strong></span>
                        </div>
                        <div v-if="task.status === 'COMPLETED' && task.completedAt" style="display: flex; align-items: center; gap: 6px; color: #67c23a; font-weight: 500;">
                            <el-icon><CircleCheckFilled /></el-icon>
                            <span>Ngày thực hiện: <strong style="color: #67c23a;">{{ formatDateDetail(task.completedAt) }}</strong></span>
                        </div>
                        <div v-else-if="task.status === 'SKIPPED'" style="display: flex; align-items: center; gap: 6px; color: #909399; font-style: italic;">
                            <el-icon><RemoveFilled /></el-icon>
                            <span>Đã bỏ qua</span>
                        </div>
                    </div>

                    <!-- Title -->
                    <h3 class="text-lg font-bold text-gray-800 mb-1 leading-snug" :class="{'line-through text-gray-400': task.status === 'COMPLETED' || task.status === 'SKIPPED'}">
                        {{ task.title }}
                    </h3>
                    
                    <!-- Stage -->
                    <div v-if="task.stage" class="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded mt-1 font-bold border border-blue-100">
                        {{ task.stage }}
                    </div>

                    <!-- Description -->
                    <p class="text-gray-600 text-sm mt-3 line-clamp-3">
                        {{ cleanDescription(task.description) || 'Không có mô tả chi tiết.' }}
                    </p>
                </div>

                <!-- Footer: Action -->
                <div class="p-4 bg-gray-50 border-t flex justify-end gap-2">
                    <template v-if="task.status === 'PENDING'">
                         <!-- Skip Button -->
                         <el-tooltip content="Bỏ qua công việc này">
                            <el-button 
                                type="info" 
                                plain
                                size="large"
                                @click="openSkipModal(task)"
                            >
                                <el-icon><Close /></el-icon>
                            </el-button>
                         </el-tooltip>

                         <!-- Confirm Button -->
                         <el-button 
                            :class="getJobButtonClass(task.jobType)"
                            size="large" 
                            class="flex-1 font-bold shadow-md hover:scale-[1.02] transition-transform text-white border-none"
                            style="height: 40px; font-size: 15px;"
                            @click="openConfirmModal(task)"
                         >
                            <el-icon class="mr-2"><CircleCheck /></el-icon>
                            Hoàn thành
                         </el-button>
                    </template>
                    <div v-else class="flex flex-col gap-2 w-full">
                         <div class="text-xs text-gray-500 italic text-center">
                             Hoàn thành lúc: {{ task.completedAt ? formatDate(task.completedAt) : '---' }}
                         </div>
                         <el-button 
                            type="primary" 
                            plain 
                            size="default"
                            class="w-full font-bold"
                            @click="viewTaskDetail(task.id)"
                         >
                            <el-icon class="mr-1"><View /></el-icon>
                            Xem chi tiết
                         </el-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Pagination -->
        <div class="flex justify-end mt-6">
            <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[6, 12, 24, 48]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="totalTasks"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
            />
        </div>
    </div>

    <!-- Confirm Modal -->
    <el-dialog
        v-model="showConfirmModal"
        width="600px"
        class="branded-daily-task-dialog"
        :close-on-click-modal="false"
        :show-close="false"
        @closed="resetConfirmForm"
    >
        <template #header>
          <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
            <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
            <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
            <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
              Xác nhận hoàn thành công việc
            </span>
            <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showConfirmModal = false">
              <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
            </div>
          </div>
        </template>
        
        <div style="padding: 24px 24px 8px;">
          <div 
              class="mb-4 p-3 rounded border"
              :class="getJobColorRaw(selectedTask?.jobType)"
          >
              <div class="flex justify-between items-start">
                  <h4 class="font-bold text-gray-800 text-lg">{{ selectedTask?.title }}</h4>
                  <el-tag v-if="selectedTask?.jobType" size="small" effect="plain" class="ml-2 font-bold">{{ selectedTask.jobType }}</el-tag>
              </div>
              <div class="text-sm text-gray-700 mt-1">{{ selectedTask?.description }}</div>
          </div>

          <el-form label-position="top">
               <el-form-item label="Sử dụng vật tư (Nếu có)">
                   <div v-for="(mat, idx) in materialsUsed" :key="idx" class="flex gap-2 mb-2 w-full">
                       <el-select 
                          v-model="mat.material_id" 
                          filterable 
                          placeholder="Chọn vật tư..." 
                          class="flex-1"
                          @change="(val: any) => onMaterialSelect(val, idx)"
                       >
                          <el-option 
                              v-for="m in materialsList" 
                              :key="m.id" 
                              :label="m.name + ' (' + m.stockQuantity + ' ' + m.unit + ')'" 
                              :value="m.id" 
                          />
                       </el-select>
                       <el-input-number v-model="mat.quantity" :min="0.1" placeholder="Số lượng" style="width: 140px;" />
                       <div class="flex items-center text-gray-500 w-10 text-sm">{{ mat.unit }}</div>
                       <el-button type="danger" circle plain :icon="Delete" @click="removeMaterialRow(idx)" />
                   </div>
                   <el-button type="dashed" size="small" @click="addMaterialRow">
                      <el-icon class="mr-1"><Plus /></el-icon> Thêm vật tư
                   </el-button>
               </el-form-item>

               <el-form-item label="Ghi chú thêm">
                   <el-input v-model="confirmNote" type="textarea" :rows="2" placeholder="Ghi chú kết quả, vấn đề phát sinh..." />
               </el-form-item>
               <el-form-item label="Hình ảnh bằng chứng (Tối đa 3 ảnh, mỗi ảnh ≤ 3MB)">
                   <el-upload
                      :action="uploadActionUrl"
                      :headers="uploadHeaders"
                      list-type="picture-card"
                      :limit="3"
                      :before-upload="beforeUpload"
                      :on-success="handleUploadSuccess"
                      :on-remove="handleUploadRemove"
                      :file-list="uploadFileList"
                   >
                       <el-icon><Plus /></el-icon>
                   </el-upload>
               </el-form-item>
          </el-form>
        </div>

        <template #footer>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 24px 24px;">
                 <span class="text-xs text-gray-400">Hành động này sẽ trừ tồn kho và lưu nhật ký</span>
                 <div style="display: flex; gap: 10px;">
                    <el-button @click="showConfirmModal = false" style="border-radius: 8px; padding: 10px 20px;">Đóng</el-button>
                    <el-button type="success" :loading="submitting" @click="submitCompletion" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
                        Lưu kết quả
                    </el-button>
                 </div>
            </div>
        </template>
    </el-dialog>

    <!-- Task Detail Modal -->
    <el-dialog
        v-model="showDetailModal"
        width="600px"
        class="branded-daily-task-dialog"
        :close-on-click-modal="true"
    >
        <template #header>
          <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
            <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
            <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
            <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
              Chi tiết công việc
            </span>
          </div>
        </template>

        <div v-if="detailLoading" style="padding: 40px; text-align: center;">
            <el-icon class="is-loading" :size="32"><Loading /></el-icon>
            <div class="text-gray-500 mt-2 text-sm">Đang tải chi tiết...</div>
        </div>

        <div v-else-if="detailedTask" style="padding: 24px;">
            <div 
                class="mb-4 p-3 rounded border"
                :class="getJobColorRaw(detailedTask.jobType)"
            >
                <div class="flex justify-between items-start">
                    <h4 class="font-bold text-gray-800 text-lg">{{ detailedTask.title }}</h4>
                    <el-tag v-if="detailedTask.jobType" size="small" effect="plain" class="ml-2 font-bold">{{ detailedTask.jobType }}</el-tag>
                </div>
                <div class="text-sm text-gray-700 mt-1">{{ cleanDescription(detailedTask.description) || 'Không có mô tả.' }}</div>
            </div>

            <div class="space-y-4">
                <div class="flex text-sm">
                    <span class="w-32 text-gray-400 shrink-0">Trạng thái:</span>
                    <span class="font-medium">
                        <el-tag v-if="detailedTask.status === 'COMPLETED'" type="success" effect="dark">Đã hoàn thành</el-tag>
                        <el-tag v-else-if="detailedTask.status === 'SKIPPED'" type="info">Đã bỏ qua</el-tag>
                        <el-tag v-else type="primary">Chưa thực hiện</el-tag>
                    </span>
                </div>
                <div class="flex text-sm">
                    <span class="w-32 text-gray-400 shrink-0">Vùng trồng:</span>
                    <span class="text-gray-800 font-medium">{{ detailedTask.cropCycle?.location?.name || '---' }}</span>
                </div>
                <div class="flex text-sm">
                    <span class="w-32 text-gray-400 shrink-0">Vụ mùa:</span>
                    <span class="text-gray-800 font-medium">{{ detailedTask.cropCycle?.name || '---' }}</span>
                </div>
                <div v-if="detailedTask.cropCycle?.cycleProducts && detailedTask.cropCycle.cycleProducts.length > 0" class="flex text-sm">
                    <span class="w-32 text-gray-400 shrink-0">Sản phẩm vụ mùa:</span>
                    <div class="flex gap-1.5 flex-wrap">
                        <el-tag v-for="cp in detailedTask.cropCycle.cycleProducts" :key="cp.id" size="small" :type="cp.isPrimary ? 'success' : 'info'" effect="plain">
                            {{ cp.product?.name }} <span v-if="cp.isPrimary" class="text-[10px] ml-1 font-bold">(Chính)</span>
                        </el-tag>
                    </div>
                </div>
                <div class="flex text-sm">
                    <span class="w-32 text-gray-400 shrink-0">Người thực hiện:</span>
                    <span class="text-gray-800 font-medium">{{ detailedTask.performer?.fullName || detailedTask.performer?.username || '---' }}</span>
                </div>
                <div class="flex text-sm">
                    <span class="w-32 text-gray-400 shrink-0">Hạn hoàn thành:</span>
                    <span class="text-gray-800 font-medium">{{ formatDateSimple(detailedTask.dueDate) }}</span>
                </div>
                <div v-if="detailedTask.completedAt" class="flex text-sm">
                    <span class="w-32 text-gray-400 shrink-0">Thời gian xong:</span>
                    <span class="text-gray-800 font-medium">{{ formatDateSimple(detailedTask.completedAt) }}</span>
                </div>

                <!-- Materials Used -->
                <div v-if="detailedTask.materialsUsed && detailedTask.materialsUsed.length > 0" class="border-t pt-3">
                    <div class="text-xs font-bold text-gray-500 uppercase mb-2">Vật tư đã sử dụng</div>
                    <div class="space-y-1.5">
                        <div v-for="mat in detailedTask.materialsUsed" :key="mat.material_id" class="text-sm text-gray-700 bg-gray-50 p-2 rounded flex justify-between border">
                            <span class="font-medium">{{ getMaterialName(mat.material_id) }}</span>
                            <span class="font-bold text-blue-600">{{ mat.quantity }} {{ mat.unit }}</span>
                        </div>
                    </div>
                </div>

                <!-- Notes / Result -->
                <div v-if="getTaskNote(detailedTask.description)" class="border-t pt-3">
                    <div class="text-xs font-bold text-gray-500 uppercase mb-1">Ghi chú kết quả</div>
                    <p class="text-sm text-gray-700 bg-amber-50/50 p-2 rounded border border-amber-100 whitespace-pre-line">
                        {{ getTaskNote(detailedTask.description) }}
                    </p>
                </div>

                <!-- Evidence Photos -->
                <div v-if="detailedTask.evidencePhotos && detailedTask.evidencePhotos.length > 0" class="border-t pt-3">
                    <div class="text-xs font-bold text-gray-500 uppercase mb-2">Hình ảnh minh chứng ({{ detailedTask.evidencePhotos.length }})</div>
                    <div class="flex gap-3 flex-wrap">
                        <el-image
                            v-for="img in detailedTask.evidencePhotos"
                            :key="img"
                            :src="getImageUrl(img)"
                            class="w-24 h-24 rounded-lg border shadow-sm cursor-pointer"
                            :preview-src-list="detailedTask.evidencePhotos.map(getImageUrl)"
                            fit="cover"
                        />
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div style="display: flex; justify-content: flex-end; padding: 12px 24px; border-top: 1px solid #e5e7eb;">
                <el-button @click="showDetailModal = false" style="border-radius: 8px; padding: 10px 20px;">Đóng</el-button>
            </div>
        </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { CircleCheckFilled, RemoveFilled, Location, Delete, Plus, CircleCheck, Warning, Calendar, Close, Loading, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { farmApi } from '../api/farmApi';
import dayjs from 'dayjs';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

// State
const tasks = ref<any[]>([]);
const overdueTasks = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);

// Date range filter: default to [Today, Today]
const dateRange = ref<[string, string]>([
    dayjs().format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD')
]);
const filterStatus = ref(''); 
const filterLocation = ref('');
const filterCycle = ref('');

const locations = ref<any[]>([]);
const cycles = ref<any[]>([]);

// Pagination State
const currentPage = ref(1);
const pageSize = ref(12);
const totalTasks = ref(0);

// File Upload State (for confirmation)
const uploadFileList = ref<any[]>([]);
const evidencePhotos = ref<string[]>([]);

// Detail Modal State
const showDetailModal = ref(false);
const detailedTask = ref<any>(null);
const detailLoading = ref(false);

// Confirm Modal State
const showConfirmModal = ref(false);
const selectedTask = ref<any>(null);
const confirmNote = ref('');
const materialsUsed = ref<{material_id: string, quantity: number, unit?: string}[]>([]);
const materialsList = ref<any[]>([]);

// File Upload Action and Headers
const uploadActionUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/files/upload?folder=farming-logs`;
});

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
});

// Image Upload logic for Confirm Completion
const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
        ElMessage.error('Chỉ được tải lên file ảnh!');
        return false;
    }
    const isLt3M = file.size / 1024 / 1024 < 3;
    if (!isLt3M) {
        ElMessage.error('Ảnh tải lên không được vượt quá 3MB sau khi nén!');
        return false;
    }
    return true;
};

const handleUploadSuccess = (response: any) => {
    if (response && response.url) {
        evidencePhotos.value.push(response.url);
    }
};

const handleUploadRemove = (file: any) => {
    const url = file.url || file.response?.url;
    const index = evidencePhotos.value.indexOf(url);
    if (index !== -1) {
        evidencePhotos.value.splice(index, 1);
    }
};

// Image URL resolving helper
const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  let baseUrl = import.meta.env.VITE_API_URL || '';
  if (baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.slice(0, -4);
  }
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

// Description and Notes helper functions
const cleanDescription = (desc: string) => {
  if (!desc) return '';
  if (desc.includes('[Note]:')) {
    return desc.split('[Note]:')[0].trim();
  }
  return desc;
};

const getTaskNote = (desc: string) => {
  if (!desc) return '';
  if (desc.includes('\n[Note]: ')) {
    return desc.split('\n[Note]: ')[1] || '';
  }
  if (desc.includes('[Note]:')) {
    return desc.split('[Note]:')[1] || '';
  }
  return '';
};

const getMaterialName = (id: string) => {
    const mat = materialsList.value.find(m => m.id === id);
    return mat ? mat.name : id;
};

// Task Details view hook
const viewTaskDetail = async (id: string) => {
    showDetailModal.value = true;
    detailLoading.value = true;
    detailedTask.value = null;
    try {
        const res = await farmApi.getTaskDetail(id);
        detailedTask.value = res.data;
    } catch (err) {
        ElMessage.error('Không thể tải chi tiết công việc');
        console.error(err);
        showDetailModal.value = false;
    } finally {
        detailLoading.value = false;
    }
};

// Reset handlers
const resetConfirmForm = () => {
    selectedTask.value = null;
    confirmNote.value = '';
    materialsUsed.value = [];
    evidencePhotos.value = [];
    uploadFileList.value = [];
};

const handleFilterChange = () => {
    currentPage.value = 1;
    loadTasks();
};

const onDateRangeChange = () => {
    currentPage.value = 1;
    loadTasks();
};

const handleSizeChange = (val: number) => {
    pageSize.value = val;
    currentPage.value = 1;
    loadTasks();
};

const handleCurrentChange = (val: number) => {
    currentPage.value = val;
    loadTasks();
};

// Initialize
const loadTasks = async () => {
  loading.value = true;
  try {
    const showOverdue = !filterStatus.value || filterStatus.value === 'PENDING';

    const promises: Promise<any>[] = [
        farmApi.getDailyTasks({
            startDate: dateRange.value[0],
            endDate: dateRange.value[1],
            status: filterStatus.value || undefined,
            cycleId: filterCycle.value || undefined,
            locationId: filterLocation.value || undefined,
            page: currentPage.value,
            limit: pageSize.value
        })
    ];

    if (showOverdue) {
        promises.push(
            farmApi.getDailyTasks({
                status: 'PENDING',
                cycleId: filterCycle.value || undefined,
                locationId: filterLocation.value || undefined,
                beforeDate: dateRange.value[0]
            })
        );
    } else {
        promises.push(Promise.resolve({ data: [] }));
    }

    const [todayRes, overdueRes] = await Promise.all(promises);
    
    if (todayRes.data && todayRes.data.data) {
        tasks.value = todayRes.data.data;
        totalTasks.value = todayRes.data.total;
    } else {
        tasks.value = todayRes.data || [];
        totalTasks.value = tasks.value.length;
    }
    
    overdueTasks.value = overdueRes.data || [];
    
  } catch (err) {
    ElMessage.error('Không thể tải danh sách công việc');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const getDaysOverdue = (date: string) => {
    return dayjs().diff(dayjs(date), 'day');
};

const formatDateSimple = (d: string) => dayjs(d).format('DD/MM/YYYY');
const formatDateDetail = (d: string) => dayjs(d).format('HH:mm DD/MM/YYYY');

const getJobButtonClass = (type: string) => {
    switch (type) {
        case 'Bón phân': return '!bg-green-600 hover:!bg-green-700'; // Green
        case 'Phun thuốc': return '!bg-yellow-600 hover:!bg-yellow-700'; // Yellow/Orange
        case 'Tưới nước': return '!bg-cyan-600 hover:!bg-cyan-700'; // Cyan/Blue
        case 'Thu hoạch': return '!bg-orange-600 hover:!bg-orange-700'; // Orange
        case 'Làm đất': return '!bg-amber-700 hover:!bg-amber-800'; // Brown ish
        case 'Xuống giống': return '!bg-lime-600 hover:!bg-lime-700'; // Lime
        default: return '!bg-blue-600 hover:!bg-blue-700'; // Default Blue
    }
};

const openSkipModal = (task: any) => {
    ElMessageBox.confirm(
        'Bạn có chắc chắn muốn bỏ qua công việc này? Hành động này sẽ được ghi lại.',
        'Xác nhận bỏ qua',
        {
          confirmButtonText: 'Bỏ qua',
          cancelButtonText: 'Hủy',
          type: 'warning',
        }
    ).then(async () => {
        try {
            await farmApi.updateTaskStatus(task.id, {
                status: 'SKIPPED',
                notes: 'Đã bỏ qua'
            });
            ElMessage.info('Đã bỏ qua công việc');
            loadTasks();
        } catch (err: any) {
            ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra');
        }
    });
};

const getJobColorRaw = (type: string) => {
    switch (type) {
        case 'Bón phân': return 'bg-green-50 border-green-200 text-green-800';
        case 'Phun thuốc': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
        case 'Tưới nước': return 'bg-cyan-50 border-cyan-200 text-cyan-800';
        case 'Thu hoạch': return 'bg-orange-50 border-orange-200 text-orange-800';
        case 'Làm đất': return 'bg-amber-50 border-amber-200 text-amber-800';
        case 'Xuống giống': return 'bg-lime-50 border-lime-200 text-lime-800';
        default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
};

const loadFilters = async () => {
    try {
        const [locRes, cycleRes, matRes] = await Promise.all([
            farmApi.getLocations(),
            farmApi.getCycles(),
            farmApi.getMaterials()
        ]);
        locations.value = locRes.data;
        cycles.value = cycleRes.data;
        materialsList.value = matRes.data;
    } catch (e) { console.error('Error loading filters/materials', e); }
};

const formatDate = (d: string) => dayjs(d).format('HH:mm DD/MM');

// Modal Actions
const openConfirmModal = (task: any) => {
    selectedTask.value = task;
    confirmNote.value = '';
    materialsUsed.value = [];
    
    // Suggest materials based on template config
    if (task.suggestedMaterials && Array.isArray(task.suggestedMaterials) && task.suggestedMaterials.length > 0) {
        task.suggestedMaterials.forEach((matId: string) => {
            const matInfo = materialsList.value.find(m => m.id === matId);
            if (matInfo) {
                materialsUsed.value.push({ 
                    material_id: matId, 
                    quantity: 1,
                    unit: matInfo.unit 
                });
            }
        });
    }
    
    showConfirmModal.value = true;
};

const addMaterialRow = () => {
    materialsUsed.value.push({ material_id: '', quantity: 1, unit: '' });
};

const removeMaterialRow = (idx: number) => {
    materialsUsed.value.splice(idx, 1);
};

const onMaterialSelect = (id: string, idx: number) => {
    const m = materialsList.value.find(x => x.id === id);
    if (m) {
        materialsUsed.value[idx].unit = m.unit;
    }
};

const submitCompletion = async () => {
    if (!selectedTask.value) return;
    
    // Validate materials
    const validMaterials = materialsUsed.value.filter(m => m.material_id && m.quantity > 0);
    
    for (const mat of validMaterials) {
        const materialInfo = materialsList.value.find(x => x.id === mat.material_id);
        if (materialInfo && mat.quantity > materialInfo.stockQuantity) {
            ElMessage.error(`Số lượng vật tư "${materialInfo.name}" vượt quá tồn kho (${materialInfo.stockQuantity} ${materialInfo.unit})`);
            return;
        }
    }
    
    submitting.value = true;
    try {
        await farmApi.updateTaskStatus(selectedTask.value.id, {
            status: 'COMPLETED',
            notes: confirmNote.value,
            materialsUsed: validMaterials,
            evidencePhotos: evidencePhotos.value
        });

        ElMessage.success('Đã cập nhật công việc!');
        showConfirmModal.value = false;
        loadTasks();
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
        submitting.value = false;
    }
}

onMounted(() => {
    loadFilters(); 
    loadTasks();
});
</script>

<style>
.branded-daily-task-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-daily-task-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-daily-task-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-daily-task-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
