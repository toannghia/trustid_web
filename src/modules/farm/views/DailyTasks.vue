<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Việc nhà nông hôm nay</h1>
      <div class="flex gap-4 items-center flex-wrap">
            <el-select v-model="filterLocation" placeholder="Lọc theo vùng trồng" clearable class="w-48" @change="loadTasks">
                <el-option v-for="loc in locations" :key="loc.id" :label="loc.name" :value="loc.id" />
            </el-select>
            <el-select v-model="filterCycle" placeholder="Lọc theo vụ mùa" clearable class="w-48" @change="loadTasks">
                <el-option v-for="cycle in cycles" :key="cycle.id" :label="cycle.name" :value="cycle.id" />
            </el-select>
            <el-radio-group v-model="filterStatus" size="default" @change="loadTasks">
                <el-radio-button label="">Tất cả</el-radio-button>
                <el-radio-button label="PENDING">Chưa làm</el-radio-button>
                <el-radio-button label="COMPLETED">Đã xong</el-radio-button>
            </el-radio-group>
            <el-date-picker
                v-model="selectedDate"
                type="date"
                placeholder="Chọn ngày"
                format="DD/MM/YYYY"
                value-format="YYYY-MM-DD"
                @change="loadTasks"
                class="w-40"
            />
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
                        <el-icon><Location /></el-icon> {{ task.location?.name }}
                        <span class="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span>{{ task.cycle?.name }}</span>
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

    <!-- Today/Filter Section Header -->
    <div class="flex items-center gap-2 mb-4">
        <h2 class="text-xl font-bold text-gray-800">Công việc theo lịch ({{ formatDateSimple(selectedDate) }})</h2>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <el-skeleton :rows="4" animated v-for="i in 3" :key="i" class="bg-white p-4 rounded shadow" />
    </div>

    <!-- Empty -->
    <div v-else-if="tasks.length === 0" class="text-center py-12 bg-white rounded-lg shadow-sm">
        <el-empty description="Không có công việc nào theo lịch này" />
    </div>

    <!-- Task List (Cards) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="task in tasks" :key="task.id" 
            class="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow duration-200 flex flex-col overflow-hidden relative"
            :class="task.status === 'COMPLETED' ? 'border-green-200 bg-green-50' : 'border-gray-200'"
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
                        <span class="font-semibold">{{ task.location?.name }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                         <span class="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">●</span>
                         <span class="font-medium text-gray-600">{{ task.cycle?.name }}</span>
                    </div>
                </div>

                <!-- Title -->
                <h3 class="text-lg font-bold text-gray-800 mb-1 leading-snug" :class="{'line-through text-gray-500': task.status === 'COMPLETED'}">
                    {{ task.title }}
                </h3>
                
                <!-- Stage -->
                <div v-if="task.stage" class="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded mt-1 font-bold border border-blue-100">
                    {{ task.stage }}
                </div>

                <!-- Description -->
                <p class="text-gray-600 text-sm mt-3 line-clamp-3">
                    {{ task.description || 'Không có mô tả chi tiết.' }}
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
                 <div v-else class="text-sm text-gray-500 italic w-full text-center py-2">
                     Hoàn thành lúc: {{ task.completedAt ? formatDate(task.completedAt) : '---' }}
                 </div>
            </div>
        </div>
    </div>

    <!-- Confirm Modal -->
    <el-dialog
        v-model="showConfirmModal"
        title="Xác nhận hoàn thành công việc"
        width="600px"
        align-center
        @closed="resetConfirmForm"
    >
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
        </el-form>

        <template #footer>
            <div class="flex justify-between items-center">
                 <span class="text-xs text-gray-400">Hành động này sẽ trừ tồn kho và lưu nhật ký</span>
                 <div>
                    <el-button @click="showConfirmModal = false">Đóng</el-button>
                    <el-button type="success" size="large" :loading="submitting" @click="submitCompletion">
                        Lưu kết quả
                    </el-button>
                 </div>
            </div>
        </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { CircleCheckFilled, RemoveFilled, Location, Delete, Plus, CircleCheck, Warning, Calendar, Close } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { farmApi } from '../api/farmApi';
import dayjs from 'dayjs';

// State
const tasks = ref<any[]>([]);
const overdueTasks = ref<any[]>([]); // New state
const loading = ref(false);
const submitting = ref(false);
const selectedDate = ref(dayjs().format('YYYY-MM-DD'));
const filterStatus = ref(''); 
const filterLocation = ref('');
const filterCycle = ref('');

const locations = ref<any[]>([]);
const cycles = ref<any[]>([]);

// Confirm Modal State
const showConfirmModal = ref(false);
const selectedTask = ref<any>(null);
const confirmNote = ref('');
const materialsUsed = ref<{material_id: string, quantity: number, unit?: string}[]>([]);
const materialsList = ref<any[]>([]);

// Initialize
const loadTasks = async () => {
  loading.value = true;
  try {
    const commonParams = [
        filterStatus.value || undefined,
        filterCycle.value || undefined,
        filterLocation.value || undefined
    ] as const;

    // Parallel fetch: Today's tasks + Overdue tasks (if date is today or future, and status is not COMPLETED/SKIPPED specific filter)
    // Actually we always check overdue if we are in "All" or "PENDING" mode.
    // If user filtered "COMPLETED", overdue PENDING tasks shouldn't show? 
    // Usually "Daily Tasks" implies actionable items, so showing overdue pending is always good unless filtered out.
    // Let's assume we show overdue if filterStatus is empty or 'PENDING'.
    
    const showOverdue = !filterStatus.value || filterStatus.value === 'PENDING';

    const promises: Promise<any>[] = [
        farmApi.getDailyTasks(selectedDate.value, ...commonParams)
    ];

    if (showOverdue) {
        // Fetch tasks BEFORE selectedDate with status PENDING
        // Note: farmApi/backend updated to support beforeDate
        // status forced to PENDING for overdue
        promises.push(farmApi.getDailyTasks(undefined, 'PENDING', filterCycle.value || undefined, filterLocation.value || undefined, selectedDate.value));
    } else {
        promises.push(Promise.resolve({ data: [] }));
    }

    const [todayRes, overdueRes] = await Promise.all(promises);
    
    tasks.value = todayRes.data;
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
    
    // Suggest materials based on template config (suggestedMaterials is array of IDs)
    if (task.suggestedMaterials && Array.isArray(task.suggestedMaterials) && task.suggestedMaterials.length > 0) {
        task.suggestedMaterials.forEach((matId: string) => {
            const matInfo = materialsList.value.find(m => m.id === matId);
            if (matInfo) {
                materialsUsed.value.push({ 
                    material_id: matId, 
                    quantity: 1, // Default quantity, user must adjust
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

const resetConfirmForm = () => {
    selectedTask.value = null;
    confirmNote.value = '';
    materialsUsed.value = [];
};

const submitCompletion = async () => {
    if (!selectedTask.value) return;
    
    // Validate materials
    const validMaterials = materialsUsed.value.filter(m => m.material_id && m.quantity > 0);
    
    submitting.value = true;
    try {
        await farmApi.updateTaskStatus(selectedTask.value.id, {
            status: 'COMPLETED',
            notes: confirmNote.value,
            materialsUsed: validMaterials
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
