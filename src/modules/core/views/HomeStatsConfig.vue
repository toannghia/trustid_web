<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '../store/auth';
import { ElMessage } from 'element-plus';
import { Check, Refresh, TrendCharts, DataLine, InfoFilled } from '@element-plus/icons-vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import api from '@/common/utils/api';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const loading = ref(false);
const saving = ref(false);

const form = reactive({
  totalVerifications: { baseValue: 2400000, dailyGrowth: 3500, randomVariation: 500, baseDate: '', suffix: '+' },
  successRate: { baseValue: 98.5, dailyGrowth: 0, randomVariation: 0, baseDate: '', suffix: '%' },
  totalProducts: { baseValue: 840, dailyGrowth: 2, randomVariation: 0, baseDate: '', suffix: '+' },
  blockchainTransactions: { baseValue: 1200000, dailyGrowth: 2800, randomVariation: 300, baseDate: '', suffix: '' },
  counterfeitDetected: { baseValue: 134, dailyGrowth: 3, randomVariation: 1, baseDate: '', suffix: '' },
  certifications: [
    { name: 'VietGAP', productCount: 312, color: 'green', icon: 'eco' },
    { name: 'EUDR', productCount: 98, color: 'blue', icon: 'public' },
    { name: 'GlobalG.A.P', productCount: 67, color: 'orange', icon: 'local_offer' },
  ] as Array<{ name: string; productCount: number; color: string; icon: string }>,
  chartMode: 'auto' as 'manual' | 'auto',
  chartData: [
    { label: 'T2', value: 80 }, { label: 'T3', value: 100 },
    { label: 'T4', value: 70 }, { label: 'T5', value: 120 },
    { label: 'T6', value: 140 }, { label: 'T7', value: 190 },
    { label: 'CN', value: 180 },
  ] as Array<{ label: string; value: number }>,
  chartAutoConfig: { baseDaily: 150, variation: 60 },
});

// Preview computed values
const preview = computed(() => {
  const computeMetric = (m: any) => {
    if (!m) return 0;
    const baseDate = new Date(m.baseDate || new Date().toISOString());
    const now = new Date();
    const daysSince = Math.max(0, (now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.round(m.baseValue + daysSince * m.dailyGrowth));
  };

  const formatValue = (val: number, suffix: string) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M${suffix}`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K${suffix}`;
    return `${val}${suffix}`;
  };

  return {
    totalVerifications: formatValue(computeMetric(form.totalVerifications), form.totalVerifications.suffix),
    successRate: `${Math.min(100, computeMetric(form.successRate) || form.successRate.baseValue)}${form.successRate.suffix}`,
    totalProducts: formatValue(computeMetric(form.totalProducts), form.totalProducts.suffix),
    blockchainTx: formatValue(computeMetric(form.blockchainTransactions), form.blockchainTransactions.suffix || ''),
    counterfeit: `${computeMetric(form.counterfeitDetected)}`,
  };
});

// Preview for 30 days from now
const previewIn30Days = computed(() => {
  const computeMetric30d = (m: any) => {
    if (!m) return 0;
    const baseDate = new Date(m.baseDate || new Date().toISOString());
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const daysSince = Math.max(0, (future.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.round(m.baseValue + daysSince * m.dailyGrowth));
  };

  const formatValue = (val: number, suffix: string) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M${suffix}`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K${suffix}`;
    return `${val}${suffix}`;
  };

  return {
    totalVerifications: formatValue(computeMetric30d(form.totalVerifications), form.totalVerifications.suffix),
    totalProducts: formatValue(computeMetric30d(form.totalProducts), form.totalProducts.suffix),
    blockchainTx: formatValue(computeMetric30d(form.blockchainTransactions), form.blockchainTransactions.suffix || ''),
    counterfeit: `${computeMetric30d(form.counterfeitDetected)}`,
  };
});

const colorOptions = [
  { label: 'Xanh lá', value: 'green' },
  { label: 'Xanh dương', value: 'blue' },
  { label: 'Cam', value: 'orange' },
  { label: 'Đỏ', value: 'red' },
  { label: 'Teal', value: 'teal' },
  { label: 'Vàng', value: 'yellow' },
];

const addCertification = () => {
  form.certifications.push({ name: '', productCount: 0, color: 'green', icon: 'eco' });
};

const removeCertification = (index: number) => {
  form.certifications.splice(index, 1);
};

const fetchConfig = async () => {
  loading.value = true;
  try {
    const tenantId = user.value?.tenantId || user.value?.tenant_id;
    if (!tenantId) return;

    const { data } = await api.get(`/tenants/${tenantId}/home-stats/config`);
    if (data) {
      Object.assign(form, data);
    }
  } catch (e: any) {
    console.warn('No config yet, using defaults:', e.message);
  } finally {
    loading.value = false;
  }
};

const saveConfig = async () => {
  saving.value = true;
  try {
    const tenantId = user.value?.tenantId || user.value?.tenant_id;
    if (!tenantId) {
      ElMessage.error('Không tìm thấy tenant');
      return;
    }

    // Set baseDate to today if empty
    const today = new Date().toISOString().split('T')[0];
    for (const key of ['totalVerifications', 'successRate', 'totalProducts', 'blockchainTransactions', 'counterfeitDetected']) {
      if (!(form as any)[key].baseDate) {
        (form as any)[key].baseDate = today;
      }
    }

    await api.put(`/tenants/${tenantId}/home-stats/config`, { ...form });
    ElMessage.success('Đã lưu cấu hình số liệu trang chủ!');
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || 'Lỗi khi lưu');
  } finally {
    saving.value = false;
  }
};

watch(() => user.value, (newVal) => {
  if (newVal?.tenantId || newVal?.tenant_id) {
    fetchConfig();
  }
}, { immediate: true });

onMounted(() => fetchConfig());
</script>

<template>
  <div>
    <LTEContentHeader title="Số liệu Trang chủ App" :breadcrumbs="[{ title: 'Cấu hình hiển thị' }]" />

    <div class="max-w-6xl mx-auto" v-loading="loading">
      <!-- Preview Panel -->
      <div class="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 mb-6 text-white shadow-xl">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <el-icon><TrendCharts /></el-icon>
            Xem trước giá trị hiện tại
          </h3>
          <el-tag effect="dark" type="success" size="small">LIVE PREVIEW</el-tag>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="bg-white/10 rounded-lg p-4 backdrop-blur">
            <div class="text-2xl font-bold text-green-400">{{ preview.totalVerifications }}</div>
            <div class="text-xs text-white/60 mt-1">Lượt xác thực</div>
            <div class="text-[10px] text-white/40 mt-1">30 ngày tới: {{ previewIn30Days.totalVerifications }}</div>
          </div>
          <div class="bg-white/10 rounded-lg p-4 backdrop-blur">
            <div class="text-2xl font-bold text-blue-400">{{ preview.successRate }}</div>
            <div class="text-xs text-white/60 mt-1">Tỷ lệ thật</div>
          </div>
          <div class="bg-white/10 rounded-lg p-4 backdrop-blur">
            <div class="text-2xl font-bold text-emerald-400">{{ preview.totalProducts }}</div>
            <div class="text-xs text-white/60 mt-1">Sản phẩm</div>
            <div class="text-[10px] text-white/40 mt-1">30 ngày tới: {{ previewIn30Days.totalProducts }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white/10 rounded-lg p-3 backdrop-blur">
            <div class="text-lg font-bold">{{ preview.blockchainTx }}</div>
            <div class="text-xs text-white/60">Giao dịch blockchain</div>
          </div>
          <div class="bg-white/10 rounded-lg p-3 backdrop-blur">
            <div class="text-lg font-bold text-red-400">{{ preview.counterfeit }}</div>
            <div class="text-xs text-white/60">Hàng giả phát hiện</div>
          </div>
        </div>
      </div>

      <!-- Config Form -->
      <el-form :model="form" label-position="top">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- LEFT: Main Stats -->
          <LTECard variant="primary" outline>
            <template #header>
              <div class="font-bold flex items-center gap-2">
                <el-icon><DataLine /></el-icon>
                Số liệu chính (Hiển thị trên đầu trang)
              </div>
            </template>

            <!-- Lượt xác thực -->
            <div class="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
              <h4 class="font-bold text-gray-700 mb-3">📊 Lượt xác thực</h4>
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="Giá trị cơ sở">
                    <el-input-number v-model="form.totalVerifications.baseValue" :min="0" :step="10000" class="w-full" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="Tăng mỗi ngày">
                    <el-input-number v-model="form.totalVerifications.dailyGrowth" :min="0" :step="100" class="w-full" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="Biên độ ngẫu nhiên (±)">
                    <el-input-number v-model="form.totalVerifications.randomVariation" :min="0" :step="50" class="w-full" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="Ngày bắt đầu tính">
                    <el-date-picker v-model="form.totalVerifications.baseDate" type="date" value-format="YYYY-MM-DD" class="w-full" placeholder="Hôm nay" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <!-- Tỷ lệ thật -->
            <div class="bg-green-50 p-4 rounded-lg mb-4 border border-green-100">
              <h4 class="font-bold text-gray-700 mb-3">✅ Tỷ lệ thật (%)</h4>
              <el-row :gutter="12">
                <el-col :span="12">
                  <el-form-item label="Giá trị (%)">
                    <el-input-number v-model="form.successRate.baseValue" :min="0" :max="100" :precision="1" :step="0.5" class="w-full" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="Hậu tố">
                    <el-input v-model="form.successRate.suffix" placeholder="%" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <!-- Sản phẩm -->
            <div class="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <h4 class="font-bold text-gray-700 mb-3">📦 Sản phẩm</h4>
              <el-row :gutter="12">
                <el-col :span="8">
                  <el-form-item label="Giá trị cơ sở">
                    <el-input-number v-model="form.totalProducts.baseValue" :min="0" :step="10" class="w-full" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="Tăng mỗi ngày">
                    <el-input-number v-model="form.totalProducts.dailyGrowth" :min="0" :step="1" class="w-full" />
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="Ngày bắt đầu">
                    <el-date-picker v-model="form.totalProducts.baseDate" type="date" value-format="YYYY-MM-DD" class="w-full" placeholder="Hôm nay" />
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </LTECard>

          <!-- RIGHT: Blockchain & Chart -->
          <div class="space-y-6">
            <!-- Blockchain Stats -->
            <LTECard variant="primary" outline>
              <template #header>
                <div class="font-bold flex items-center gap-2">
                  <el-icon><DataLine /></el-icon>
                  Blockchain Stats
                </div>
              </template>

              <div class="bg-indigo-50 p-4 rounded-lg mb-4 border border-indigo-100">
                <h4 class="font-bold text-gray-700 mb-3">🔗 Giao dịch Blockchain</h4>
                <el-row :gutter="12">
                  <el-col :span="8">
                    <el-form-item label="Giá trị cơ sở">
                      <el-input-number v-model="form.blockchainTransactions.baseValue" :min="0" :step="10000" class="w-full" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="Tăng/ngày">
                      <el-input-number v-model="form.blockchainTransactions.dailyGrowth" :min="0" :step="100" class="w-full" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="Biên độ (±)">
                      <el-input-number v-model="form.blockchainTransactions.randomVariation" :min="0" :step="50" class="w-full" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <div class="bg-red-50 p-4 rounded-lg border border-red-100">
                <h4 class="font-bold text-gray-700 mb-3">🚫 Hàng giả phát hiện</h4>
                <el-row :gutter="12">
                  <el-col :span="8">
                    <el-form-item label="Giá trị cơ sở">
                      <el-input-number v-model="form.counterfeitDetected.baseValue" :min="0" :step="5" class="w-full" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="Tăng/ngày">
                      <el-input-number v-model="form.counterfeitDetected.dailyGrowth" :min="0" :step="1" class="w-full" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="Biên độ (±)">
                      <el-input-number v-model="form.counterfeitDetected.randomVariation" :min="0" :step="1" class="w-full" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>
            </LTECard>

            <!-- Chart Config -->
            <LTECard variant="primary" outline>
              <template #header>
                <div class="font-bold flex items-center gap-2">
                  <el-icon><TrendCharts /></el-icon>
                  Biểu đồ 7 ngày
                </div>
              </template>

              <div class="mb-4">
                <el-radio-group v-model="form.chartMode" class="mb-4">
                  <el-radio-button value="auto">Tự động (Ngẫu nhiên)</el-radio-button>
                  <el-radio-button value="manual">Nhập tay</el-radio-button>
                </el-radio-group>
              </div>

              <!-- Auto mode -->
              <div v-if="form.chartMode === 'auto'" class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div class="flex items-center gap-2 mb-3">
                  <el-icon class="text-blue-500"><InfoFilled /></el-icon>
                  <span class="text-sm text-gray-600">Hệ thống tự tạo chart với giá trị ngẫu nhiên ổn định trong ngày</span>
                </div>
                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item label="Lượt/ngày trung bình">
                      <el-input-number v-model="form.chartAutoConfig.baseDaily" :min="10" :step="10" class="w-full" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="Biên độ (±)">
                      <el-input-number v-model="form.chartAutoConfig.variation" :min="0" :step="10" class="w-full" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <!-- Manual mode -->
              <div v-else class="space-y-2">
                <div v-for="(item, i) in form.chartData" :key="i" class="flex items-center gap-3 bg-gray-50 p-2 rounded">
                  <span class="w-10 text-center font-medium text-gray-600">{{ item.label }}</span>
                  <el-input-number v-model="item.value" :min="0" :step="10" size="small" class="flex-1" />
                </div>
              </div>
            </LTECard>
          </div>
        </div>

        <!-- Certifications -->
        <LTECard variant="primary" outline class="mt-6">
          <template #header>
            <div class="flex justify-between items-center">
              <div class="font-bold flex items-center gap-2">
                <el-icon><DataLine /></el-icon>
                Chứng nhận được xác thực
              </div>
              <el-button size="small" type="primary" @click="addCertification">+ Thêm chứng nhận</el-button>
            </div>
          </template>

          <div v-if="form.certifications.length === 0" class="text-center text-gray-400 py-8">
            Chưa có chứng nhận nào. Nhấn "Thêm chứng nhận" để bắt đầu.
          </div>

          <div class="space-y-3">
            <div v-for="(cert, i) in form.certifications" :key="i"
              class="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <el-form-item label="Tên" class="mb-0 flex-1">
                <el-input v-model="cert.name" placeholder="VD: VietGAP, EUDR..." />
              </el-form-item>
              <el-form-item label="Số sản phẩm" class="mb-0 w-40">
                <el-input-number v-model="cert.productCount" :min="0" :step="10" class="w-full" />
              </el-form-item>
              <el-form-item label="Màu" class="mb-0 w-32">
                <el-select v-model="cert.color" class="w-full">
                  <el-option v-for="c in colorOptions" :key="c.value" :label="c.label" :value="c.value">
                    <span class="flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: c.value }"></span>
                      {{ c.label }}
                    </span>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-button type="danger" size="small" circle @click="removeCertification(i)" class="mt-5">
                ×
              </el-button>
            </div>
          </div>
        </LTECard>

        <!-- Save Button -->
        <div class="flex justify-end mt-6 border-t pt-4 sticky bottom-0 bg-white py-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] -mx-4 px-4 bg-opacity-95 backdrop-blur rounded-b-lg">
          <el-button @click="fetchConfig" :icon="Refresh">Đặt lại</el-button>
          <el-button type="primary" size="large" @click="saveConfig" :loading="saving" style="min-width: 180px">
            <el-icon class="mr-2"><Check /></el-icon> Lưu cấu hình
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>
