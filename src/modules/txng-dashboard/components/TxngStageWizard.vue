<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Check, Close, Loading, Upload, Right, Back } from '@element-plus/icons-vue';
import txngApi from '@/api/txngApi';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
}>();

const dialogVisible = computed({
    get: () => props.visible,
    set: (v) => emit('update:visible', v),
});

// ========== STAGE DEFINITIONS ==========
const STAGES = [
    { key: 'lenhSanXuat', label: 'Lệnh sản xuất', icon: '📋', required: true },
    { key: 'khoiTaoChuoi', label: 'Khởi tạo chuỗi (mã truy vết)', icon: '🔗', required: true },
    { key: 'vungTrong', label: 'Vùng trồng', icon: '🌱' },
    { key: 'vanChuyen', label: 'Vận chuyển', icon: '🚛' },
    { key: 'cheBien', label: 'Chế biến, đóng gói', icon: '🏭' },
    { key: 'khoTong', label: 'Kho tổng', icon: '📦' },
    { key: 'daiLy', label: 'Đại lý', icon: '🏪' },
    { key: 'cuaHang', label: 'Cửa hàng, siêu thị', icon: '🛒' },
];

// ========== STATE ==========
type WizardStep = 'setup' | 'running' | 'done';
const step = ref<WizardStep>('setup');
const sessionId = ref('');
const gtin = ref('');
const selectedStages = ref<string[]>(['lenhSanXuat', 'khoiTaoChuoi', 'vungTrong']);
const currentStageIdx = ref(0);
const isProcessing = ref(false);

const templates = ref<Record<string, any>>({});
const formData = ref<Record<string, any>>({});
const results = ref<Array<{
    stageKey: string;
    stageLabel: string;
    success: boolean;
    txngId?: string;
    error?: string;
    durationMs: number;
}>>([]);

// Context from product lookup
const context = reactive({
    idToChucHoSo: '',
    idSanPham: '',
    idVungTrong: '',
    idLenhSanXuat: '',
    idChuoiSanXuat: '',
    traceCode: '',
    gtin: '',
});

// Image upload
const imageFile = ref<File | null>(null);

// ========== COMPUTED ==========
const activeStages = computed(() =>
    STAGES.filter(s => selectedStages.value.includes(s.key))
);

const currentStage = computed(() => activeStages.value[currentStageIdx.value]);
const currentForm = computed(() => formData.value[currentStage.value?.key] || {});
const progress = computed(() =>
    activeStages.value.length ? Math.round((currentStageIdx.value / activeStages.value.length) * 100) : 0
);

// ========== METHODS ==========
const lookupGtin = async () => {
    if (!gtin.value) return;
    try {
        const res = await txngApi.getProductByGtin(gtin.value);
        // Response structure: { success, data: { id, idToChucHoSo, gtinCode, ... } }
        const product = res.data?.data || res.data;
        if (product && (product.id || product.gtinCode)) {
            context.idToChucHoSo = product.idToChucHoSo || '';
            context.idSanPham = product.id || '';
            context.gtin = gtin.value;

            const tenSP = product.ten || product.gtinCode || gtin.value;
            ElMessage.success(`Tìm thấy: ${tenSP}`);

            // Auto-fetch vùng trồng cho tổ chức này
            if (context.idToChucHoSo) {
                try {
                    const vtRes = await txngApi.getCatalogByKey('vungTrong');
                    const vtItems = vtRes.data?.items || vtRes.data || [];
                    if (Array.isArray(vtItems) && vtItems.length > 0) {
                        // Lấy vùng trồng đầu tiên làm default
                        context.idVungTrong = vtItems[0].id || '';
                        ElMessage.info(`Vùng trồng: ${vtItems[0].ten || vtItems[0].id?.slice(0, 8)}...`);
                    }
                } catch {
                    // Vùng trồng không bắt buộc
                }
            }
        } else {
            ElMessage.warning('Không tìm thấy sản phẩm');
        }
    } catch {
        ElMessage.error('Lỗi tra cứu GTIN');
    }
};

const loadTemplates = async () => {
    try {
        const res = await txngApi.stageGetTemplates(context);
        templates.value = res.data;
        // Pre-fill form data
        for (const stage of activeStages.value) {
            formData.value[stage.key] = { ...(templates.value[stage.key] || {}) };
        }
    } catch {
        ElMessage.warning('Không thể tải template mẫu');
    }
};

const startWizard = async () => {
    if (!gtin.value) {
        ElMessage.warning('Vui lòng nhập GTIN');
        return;
    }
    sessionId.value = crypto.randomUUID();
    await loadTemplates();
    step.value = 'running';
    currentStageIdx.value = 0;
};

const executeCurrentStage = async () => {
    const stage = currentStage.value;
    if (!stage) return;

    isProcessing.value = true;
    try {
        let result: any;

        if (stage.key === 'lenhSanXuat') {
            const res = await txngApi.stageCreateLenhSX({
                sessionId: sessionId.value,
                data: formData.value[stage.key],
                gtin: gtin.value,
            });
            result = res.data.result;
            if (result.success && result.txngId) {
                context.idLenhSanXuat = result.txngId;
                // Update downstream templates
                for (const k of ['vungTrong', 'vanChuyen', 'cheBien', 'khoTong', 'daiLy', 'cuaHang']) {
                    if (formData.value[k]) {
                        formData.value[k].idLenhSanXuat = result.txngId;
                    }
                }
            }
        } else if (stage.key === 'khoiTaoChuoi') {
            // First event creates the chain — use vungTrong template
            const eventData = {
                ...formData.value['vungTrong'] || formData.value[stage.key] || {},
                idLenhSanXuat: context.idLenhSanXuat,
            };
            const res = await txngApi.stageCreateEvent({
                sessionId: sessionId.value,
                stageKey: stage.key,
                stepOrder: currentStageIdx.value,
                data: eventData,
                gtin: gtin.value,
            });
            result = res.data.result;
            if (result.success && result.txngId) {
                context.idChuoiSanXuat = result.txngId;
                context.traceCode = result.txngId;
            }
        } else {
            // All other stages: create event
            const eventData = {
                ...formData.value[stage.key],
                idLenhSanXuat: context.idLenhSanXuat,
            };
            const res = await txngApi.stageCreateEvent({
                sessionId: sessionId.value,
                stageKey: stage.key,
                stepOrder: currentStageIdx.value,
                data: eventData,
                gtin: gtin.value,
                traceCode: context.traceCode,
            });
            result = res.data.result;
        }

        results.value.push({
            stageKey: stage.key,
            stageLabel: stage.label,
            success: result?.success ?? false,
            txngId: result?.txngId,
            error: result?.error,
            durationMs: result?.durationMs ?? 0,
        });

        // Upload image if provided
        if (imageFile.value && result?.success && result?.txngId) {
            try {
                await txngApi.stageUploadImage(
                    result.txngId, imageFile.value,
                    sessionId.value, currentStageIdx.value + 100,
                );
                imageFile.value = null;
            } catch {
                ElMessage.warning('Upload ảnh thất bại — sự kiện vẫn đã tạo');
            }
        }

        if (result?.success) {
            ElMessage.success(`✅ ${stage.label} — thành công`);
        } else {
            ElMessage.error(`❌ ${stage.label} — ${result?.error || 'thất bại'}`);
        }
    } catch (err: any) {
        results.value.push({
            stageKey: stage.key,
            stageLabel: stage.label,
            success: false,
            error: err.message,
            durationMs: 0,
        });
        ElMessage.error(`❌ ${stage.label} — ${err.message}`);
    } finally {
        isProcessing.value = false;
    }
};

const nextStage = () => {
    if (currentStageIdx.value < activeStages.value.length - 1) {
        currentStageIdx.value++;
        imageFile.value = null;
    } else {
        step.value = 'done';
    }
};

const prevStage = () => {
    if (currentStageIdx.value > 0) currentStageIdx.value--;
};

const handleImageChange = (uploadFile: any) => {
    imageFile.value = uploadFile.raw;
};

const resetWizard = () => {
    step.value = 'setup';
    results.value = [];
    formData.value = {};
    currentStageIdx.value = 0;
    imageFile.value = null;
    context.idLenhSanXuat = '';
    context.idChuoiSanXuat = '';
    context.traceCode = '';
};

const getResultIcon = (r: any) => r.success ? '✅' : '❌';
const totalDuration = computed(() => results.value.reduce((s, r) => s + r.durationMs, 0));
const successCount = computed(() => results.value.filter(r => r.success).length);
</script>

<template>
    <el-dialog
        v-model="dialogVisible"
        title="🧪 Giả lập công đoạn TXNG"
        width="900px"
        :close-on-click-modal="false"
        destroy-on-close
        @close="resetWizard"
    >
        <!-- ===== STEP 1: SETUP ===== -->
        <div v-if="step === 'setup'" class="space-y-6">
            <!-- GTIN Input -->
            <div>
                <h3 class="text-sm font-semibold text-gray-700 mb-2">1. Nhập mã sản phẩm</h3>
                <div class="flex gap-2">
                    <el-input
                        v-model="gtin"
                        placeholder="Nhập GTIN (ví dụ: 8938568611005)"
                        clearable
                        size="large"
                        class="flex-1"
                        @keyup.enter="lookupGtin"
                    />
                    <el-button type="primary" size="large" @click="lookupGtin">Tra cứu</el-button>
                </div>
                <div v-if="context.idSanPham" class="mt-2 p-3 bg-green-50 rounded text-xs text-green-700 space-y-1">
                    <div>✅ <strong>idSanPham:</strong> {{ context.idSanPham }}</div>
                    <div>✅ <strong>idToChucHoSo:</strong> {{ context.idToChucHoSo }}</div>
                    <div :class="context.idVungTrong ? '' : 'text-orange-500'">
                        {{ context.idVungTrong ? '✅' : '⚠️' }}
                        <strong>idVungTrong:</strong> {{ context.idVungTrong || '(chưa có — nhập thủ công)' }}
                    </div>
                </div>
            </div>

            <!-- Stage Selection -->
            <div>
                <h3 class="text-sm font-semibold text-gray-700 mb-2">2. Chọn công đoạn</h3>
                <el-checkbox-group v-model="selectedStages" class="flex flex-col gap-2">
                    <el-checkbox
                        v-for="s in STAGES"
                        :key="s.key"
                        :value="s.key"
                        :disabled="s.required"
                        class="!mr-0"
                    >
                        <span class="text-base">{{ s.icon }} {{ s.label }}</span>
                        <el-tag v-if="s.required" size="small" type="info" class="ml-2">bắt buộc</el-tag>
                    </el-checkbox>
                </el-checkbox-group>
            </div>

            <div class="flex justify-end">
                <el-button type="primary" size="large" :disabled="!gtin" @click="startWizard">
                    🚀 Bắt đầu giả lập ({{ activeStages.length }} bước)
                </el-button>
            </div>
        </div>

        <!-- ===== STEP 2: RUNNING ===== -->
        <div v-else-if="step === 'running'" class="space-y-4">
            <!-- Progress -->
            <div class="flex items-center gap-3 mb-4">
                <el-progress :percentage="progress" :stroke-width="8" class="flex-1" />
                <span class="text-xs text-gray-500">
                    {{ currentStageIdx + 1 }} / {{ activeStages.length }}
                </span>
            </div>

            <!-- Stage tabs -->
            <div class="flex gap-1 overflow-x-auto pb-2">
                <div
                    v-for="(s, i) in activeStages"
                    :key="s.key"
                    class="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap cursor-pointer border transition-all"
                    :class="{
                        'bg-blue-500 text-white border-blue-500': i === currentStageIdx,
                        'bg-green-50 text-green-700 border-green-200': results.find(r => r.stageKey === s.key && r.success),
                        'bg-red-50 text-red-700 border-red-200': results.find(r => r.stageKey === s.key && !r.success),
                        'bg-gray-50 text-gray-500 border-gray-200': !results.find(r => r.stageKey === s.key) && i !== currentStageIdx,
                    }"
                    @click="currentStageIdx = i"
                >
                    {{ s.icon }} {{ s.label }}
                </div>
            </div>

            <!-- Current stage form -->
            <div v-if="currentStage" class="border rounded-lg p-4 bg-gray-50">
                <h3 class="text-base font-semibold mb-3">
                    {{ currentStage.icon }} {{ currentStage.label }}
                </h3>

                <!-- Dynamic form fields -->
                <div class="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto">
                    <template v-for="(val, key) in currentForm" :key="key">
                        <div v-if="typeof val !== 'object'" class="col-span-1">
                            <label class="text-xs text-gray-500 block mb-1">{{ key }}</label>
                            <el-input
                                v-model="formData[currentStage.key][key]"
                                size="small"
                                :placeholder="String(key)"
                            />
                        </div>
                        <div v-else class="col-span-2 p-2 bg-white rounded border">
                            <label class="text-xs text-gray-500 block mb-1 font-semibold">{{ key }} (object)</label>
                            <div class="grid grid-cols-2 gap-2">
                                <div v-for="(subVal, subKey) in val" :key="subKey">
                                    <label class="text-xs text-gray-400">{{ subKey }}</label>
                                    <el-input
                                        v-model="formData[currentStage.key][key][subKey]"
                                        size="small"
                                    />
                                </div>
                            </div>
                        </div>
                    </template>
                </div>

                <!-- Image upload -->
                <div class="mt-3 pt-3 border-t">
                    <label class="text-xs text-gray-500 block mb-1">📸 Ảnh minh chứng (tùy chọn)</label>
                    <el-upload
                        :auto-upload="false"
                        :limit="1"
                        accept="image/*"
                        :on-change="handleImageChange"
                    >
                        <el-button size="small" :icon="Upload">Chọn ảnh</el-button>
                    </el-upload>
                </div>
            </div>

            <!-- Action buttons -->
            <div class="flex justify-between">
                <el-button @click="prevStage" :disabled="currentStageIdx === 0" :icon="Back">
                    Quay lại
                </el-button>
                <div class="flex gap-2">
                    <el-button
                        type="primary"
                        :loading="isProcessing"
                        @click="executeCurrentStage"
                        :disabled="!!results.find(r => r.stageKey === currentStage?.key)"
                    >
                        🚀 Gửi lên TXNG
                    </el-button>
                    <el-button
                        type="success"
                        :icon="Right"
                        :disabled="!results.find(r => r.stageKey === currentStage?.key)"
                        @click="nextStage"
                    >
                        {{ currentStageIdx === activeStages.length - 1 ? 'Hoàn thành' : 'Bước tiếp' }}
                    </el-button>
                </div>
            </div>
        </div>

        <!-- ===== STEP 3: DONE ===== -->
        <div v-else-if="step === 'done'" class="space-y-4">
            <div class="text-center py-4">
                <div class="text-4xl mb-2">{{ successCount === results.length ? '🎉' : '⚠️' }}</div>
                <h2 class="text-xl font-bold">
                    {{ successCount === results.length ? 'Hoàn thành!' : 'Hoàn thành với lỗi' }}
                </h2>
                <p class="text-sm text-gray-500">
                    {{ successCount }}/{{ results.length }} thành công |
                    Tổng thời gian: {{ (totalDuration / 1000).toFixed(1) }}s
                </p>
                <div v-if="context.traceCode" class="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <strong>Mã truy vết:</strong> {{ context.traceCode }}
                </div>
            </div>

            <!-- Results timeline -->
            <div class="space-y-2">
                <div
                    v-for="(r, i) in results"
                    :key="i"
                    class="flex items-center gap-3 p-3 rounded-lg border"
                    :class="r.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
                >
                    <span class="text-lg">{{ getResultIcon(r) }}</span>
                    <div class="flex-1">
                        <div class="font-medium text-sm">{{ r.stageLabel }}</div>
                        <div class="text-xs text-gray-500">
                            {{ r.durationMs }}ms
                            <span v-if="r.txngId"> | ID: {{ r.txngId.slice(0, 12) }}...</span>
                            <span v-if="r.error" class="text-red-500"> | {{ r.error }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex justify-between">
                <el-button @click="resetWizard">🔄 Chạy lại</el-button>
                <el-button type="primary" @click="dialogVisible = false">Đóng</el-button>
            </div>
        </div>
    </el-dialog>
</template>
