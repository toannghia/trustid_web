<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { farmApi } from '../api/farmApi';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Setting, Connection, Key, Refresh, Check, Warning } from '@element-plus/icons-vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';

const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const renewing = ref(false);

const config = reactive({
    gfwEmail: '',
    hasPassword: false,
    currentApiKey: null as string | null,
    apiKeyAlias: null as string | null,
    apiKeyExpiresAt: null as string | null,
    apiKeyCreatedAt: null as string | null,
    status: 'NOT_CONFIGURED',
    lastError: null as string | null,
    domains: ['localhost'] as string[],
});

const form = reactive({
    email: '',
    password: '',
    domains: 'localhost',
});

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'ACTIVE': return { type: 'success' as const, text: '✅ Hoạt động' };
        case 'EXPIRED': return { type: 'warning' as const, text: '⚠️ Hết hạn' };
        case 'ERROR': return { type: 'danger' as const, text: '❌ Lỗi' };
        default: return { type: 'info' as const, text: '⚙️ Chưa cấu hình' };
    }
};

const daysUntilExpiry = computed(() => {
    if (!config.apiKeyExpiresAt) return null;
    const diff = new Date(config.apiKeyExpiresAt).getTime() - Date.now();
    return Math.round(diff / (1000 * 60 * 60 * 24));
});

const expiryWarning = computed(() => {
    if (daysUntilExpiry.value === null) return false;
    return daysUntilExpiry.value <= 30;
});

const fetchConfig = async () => {
    loading.value = true;
    try {
        const { data } = await farmApi.getGfwConfig();
        const cfg = data.data || data;
        Object.assign(config, cfg);
        form.email = cfg.gfwEmail || '';
        form.password = '';
        form.domains = (cfg.domains || ['localhost']).join(', ');
    } catch {
        // First time — no config yet
    } finally {
        loading.value = false;
    }
};

const handleSave = async () => {
    if (!form.email || !form.password) {
        ElMessage.warning('Vui lòng nhập email và mật khẩu GFW');
        return;
    }
    saving.value = true;
    try {
        const domains = form.domains.split(',').map(d => d.trim()).filter(Boolean);
        await farmApi.saveGfwConfig({
            email: form.email,
            password: form.password,
            domains,
        });
        ElMessage.success('Đã lưu thông tin GFW');
        await fetchConfig();
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi lưu cấu hình');
    } finally {
        saving.value = false;
    }
};

const handleTest = async () => {
    testing.value = true;
    try {
        const { data } = await farmApi.testGfwConnection();
        const result = data.data || data;
        if (result.success) {
            ElMessage.success(result.message);
        } else {
            ElMessage.error(result.message);
        }
        await fetchConfig();
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi kết nối');
    } finally {
        testing.value = false;
    }
};

const handleRenew = async () => {
    try {
        await ElMessageBox.confirm(
            'Thao tác này sẽ tạo API key mới và xóa key cũ. Tiếp tục?',
            'Gia hạn API Key',
            { confirmButtonText: 'Gia hạn', cancelButtonText: 'Hủy', type: 'warning' }
        );
    } catch { return; }

    renewing.value = true;
    try {
        const { data } = await farmApi.renewGfwKey();
        const result = data.data || data;
        if (result.success) {
            ElMessage.success(result.message);
        } else {
            ElMessage.error(result.message);
        }
        await fetchConfig();
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi gia hạn');
    } finally {
        renewing.value = false;
    }
};

const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

onMounted(fetchConfig);
</script>

<template>
  <div>
    <LTEContentHeader
      title="Cấu hình EUDR (Global Forest Watch)"
      :breadcrumbs="[{ title: 'Thiết lập hệ thống' }, { title: 'Cấu hình EUDR' }]"
    />

    <div class="max-w-4xl mx-auto" v-loading="loading">

      <!-- Status Card -->
      <LTECard variant="primary" outline class="mb-4">
        <template #header>
          <div class="flex justify-between items-center">
            <div class="font-bold flex items-center gap-2">
              <el-icon><Connection /></el-icon>
              Trạng thái kết nối GFW
            </div>
            <el-tag :type="getStatusBadge(config.status).type" effect="dark" size="large">
              {{ getStatusBadge(config.status).text }}
            </el-tag>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- API Key Info -->
          <div class="bg-gray-50 rounded-lg p-4 border">
            <div class="text-sm text-gray-500 mb-1">API Key</div>
            <div class="text-lg font-mono font-bold" :class="config.currentApiKey ? 'text-green-600' : 'text-gray-400'">
              {{ config.currentApiKey || 'Chưa có' }}
            </div>
            <div v-if="config.apiKeyAlias" class="text-xs text-gray-400 mt-1">{{ config.apiKeyAlias }}</div>
          </div>
          <!-- Expiration -->
          <div class="bg-gray-50 rounded-lg p-4 border">
            <div class="text-sm text-gray-500 mb-1">Hạn sử dụng</div>
            <div class="text-lg font-bold" :class="expiryWarning ? 'text-orange-500' : 'text-gray-700'">
              {{ formatDate(config.apiKeyExpiresAt) }}
            </div>
            <div v-if="daysUntilExpiry !== null" class="text-xs mt-1" :class="expiryWarning ? 'text-orange-500' : 'text-green-600'">
              <el-icon v-if="expiryWarning"><Warning /></el-icon>
              Còn {{ daysUntilExpiry }} ngày
            </div>
          </div>
          <!-- Created At -->
          <div class="bg-gray-50 rounded-lg p-4 border">
            <div class="text-sm text-gray-500 mb-1">Ngày tạo key</div>
            <div class="text-lg font-bold text-gray-700">
              {{ formatDate(config.apiKeyCreatedAt) }}
            </div>
          </div>
        </div>

        <!-- Error message -->
        <div v-if="config.lastError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <strong>Lỗi gần nhất:</strong> {{ config.lastError }}
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-4" v-if="config.gfwEmail">
          <el-button type="primary" :icon="Connection" @click="handleTest" :loading="testing" plain>
            Test kết nối
          </el-button>
          <el-button type="warning" :icon="Refresh" @click="handleRenew" :loading="renewing" plain>
            Gia hạn API Key
          </el-button>
        </div>
      </LTECard>

      <!-- Credentials Form -->
      <LTECard variant="primary" outline>
        <template #header>
          <div class="font-bold flex items-center gap-2">
            <el-icon><Key /></el-icon>
            Thông tin tài khoản GFW
          </div>
        </template>

        <div class="max-w-2xl">
          <el-form label-position="top">
            <el-form-item label="Email đăng ký GFW" required>
              <el-input v-model="form.email" placeholder="your-email@example.com" size="large">
                <template #prefix><el-icon><Setting /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-form-item required>
              <template #label>
                Mật khẩu GFW
                <span v-if="config.hasPassword" class="text-green-600 text-xs ml-2">(đã lưu — nhập mới để thay đổi)</span>
              </template>
              <el-input v-model="form.password" type="password" show-password placeholder="Nhập mật khẩu" size="large">
                <template #prefix><el-icon><Key /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-form-item label="Domains (phân cách bằng dấu phẩy)">
              <el-input v-model="form.domains" placeholder="localhost, yourdomain.com" size="large" />
              <div class="text-xs text-gray-400 mt-1">Danh sách domain được phép sử dụng API key</div>
            </el-form-item>

            <div class="flex justify-end mt-4 border-t pt-4">
              <el-button type="primary" size="large" @click="handleSave" :loading="saving" :icon="Check" style="min-width: 180px">
                Lưu cấu hình
              </el-button>
            </div>
          </el-form>
        </div>

        <!-- Help -->
        <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Hướng dẫn:</strong>
          <ol class="list-decimal ml-5 mt-2 space-y-1">
            <li>Đăng ký tài khoản miễn phí tại <a href="https://www.globalforestwatch.org/" target="_blank" class="underline font-medium">globalforestwatch.org</a></li>
            <li>Nhập email và mật khẩu đã đăng ký vào form trên</li>
            <li>Nhấn "Lưu cấu hình" → hệ thống sẽ tự động tạo API key</li>
            <li>API key sẽ được <strong>tự động gia hạn</strong> trước 7 ngày hết hạn</li>
          </ol>
        </div>
      </LTECard>
    </div>
  </div>
</template>
