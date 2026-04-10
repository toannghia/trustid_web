<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { Promotion, Warning, Checked, Bell, Setting, Search, Refresh, Upload, Picture, Close, CircleCheck, Timer, ChatDotSquare, Switch, ArrowRight } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { notificationApi } from '../api/notification';
import api from '@/common/utils/api';

// ===== TAB STATE =====
const activeMainTab = ref<'broadcast' | 'welcome'>('broadcast');

// ===== BROADCAST TAB (Existing) =====
const loading = ref(false);
const historyLoading = ref(false);
const history = ref<any[]>([]);
const totalHistory = ref(0);
const query = reactive({
    page: 1,
    limit: 10
});

const form = reactive({
    type: 'BROADCAST',
    title: '',
    body: '',
    targetRoles: [] as string[],
    metadata: {}
});

const roles = [
    { label: 'Người tiêu dùng', value: 'END_USER', icon: Bell },
    { label: 'Nông dân / HTX', value: 'FARMER', icon: Promotion },
    { label: 'Nhà phân phối', value: 'DISTRIBUTOR', icon: Refresh },
    { label: 'Brand / Doanh nghiệp', value: 'TENANT_ADMIN', icon: Setting },
];

const types = [
    { label: 'Cảnh báo khẩn', value: 'ALERT', icon: Warning, color: '#F87171' },
    { label: 'Chứng nhận', value: 'CERT', icon: Checked, color: '#FB923C' },
    { label: 'Thông báo chung', value: 'BROADCAST', icon: Bell, color: '#60A5FA' },
    { label: 'Hệ thống', value: 'SYSTEM', icon: Setting, color: '#94A3B8' },
];

const fetchHistory = async () => {
    historyLoading.value = true;
    try {
        const response = await notificationApi.getAdminList(query);
        history.value = response.data.data;
        totalHistory.value = response.data.meta.total;
    } catch (error: any) {
        ElMessage.error('Không thể tải lịch sử thông báo');
    } finally {
        historyLoading.value = false;
    }
};

const handleSend = async () => {
    if (!form.title || !form.body || form.targetRoles.length === 0) {
        ElMessage.warning('Vui lòng điền đầy đủ thông tin và chọn đối tượng nhận');
        return;
    }

    loading.value = true;
    try {
        await notificationApi.send({
            type: form.type,
            title: form.title,
            body: form.body,
            targetRoles: form.targetRoles,
            metadata: form.metadata
        });
        ElMessage.success('Gửi thông báo thành công');
        // Reset form
        form.title = '';
        form.body = '';
        fetchHistory();
    } catch (error: any) {
        ElMessage.error(error.response?.data?.message || 'Lỗi khi gửi thông báo');
    } finally {
        loading.value = false;
    }
};

const handlePageChange = (page: number) => {
    query.page = page;
    fetchHistory();
};

// ===== WELCOME CONFIG TAB =====
const welcomeLoading = ref(false);
const welcomeSaving = ref(false);
const uploadingImage = ref(false);

const welcomeForm = reactive({
    isActive: false,
    title: 'Chào mừng bạn đến với TrustID! 🎉',
    body: 'Xin chào {{tên}}, tài khoản của bạn đã được kích hoạt thành công. Bắt đầu quét QR để xác thực hàng thật ngay hôm nay!',
    ctaText: 'Bắt đầu quét QR ngay',
    ctaAction: 'scan_qr',
    imageUrl: null as string | null,
    imagePosition: 'above_title',
    features: [
        { key: 'scan_qr', label: 'Quét QR xác thực', enabled: true },
        { key: 'scan_history', label: 'Lịch sử quét', enabled: true },
        { key: 'fake_alert', label: 'Cảnh báo hàng giả', enabled: true },
        { key: 'cert', label: 'Chứng nhận SP', enabled: true },
        { key: 'blockchain', label: 'Blockchain hash', enabled: true },
        { key: 'journey', label: 'Hành trình SP', enabled: true },
    ],
    delaySeconds: 3,
    showAsModal: true,
    saveToInbox: true,
    pushEnabled: false,
});

const imagePositions = [
    { label: 'Trên tiêu đề', value: 'above_title' },
    { label: 'Giữa nội dung', value: 'middle' },
    { label: 'Dưới CTA', value: 'below_cta' },
];

const templateVars = [
    { label: '{{tên}}', desc: 'Tên người dùng' },
    { label: '{{ngày}}', desc: 'Ngày hiện tại' },
    { label: '{{SP}}', desc: 'Tên sản phẩm' },
];

const previewTitle = computed(() => {
    return welcomeForm.title
        ?.replace(/\{\{tên\}\}/g, 'Toan Nghĩa')
        .replace(/\{\{ngày\}\}/g, new Date().toLocaleDateString('vi-VN'))
        .replace(/\{\{SP\}\}/g, 'TrustID') || '';
});

const previewBody = computed(() => {
    return welcomeForm.body
        ?.replace(/\{\{tên\}\}/g, 'Toan Nghĩa')
        .replace(/\{\{ngày\}\}/g, new Date().toLocaleDateString('vi-VN'))
        .replace(/\{\{SP\}\}/g, 'TrustID') || '';
});

const enabledFeatures = computed(() => {
    return welcomeForm.features.filter(f => f.enabled);
});

const fetchWelcomeConfig = async () => {
    welcomeLoading.value = true;
    try {
        const res = await notificationApi.getWelcomeConfig();
        const data = res.data;
        Object.assign(welcomeForm, {
            isActive: data.isActive ?? false,
            title: data.title || welcomeForm.title,
            body: data.body || welcomeForm.body,
            ctaText: data.ctaText || welcomeForm.ctaText,
            ctaAction: data.ctaAction || welcomeForm.ctaAction,
            imageUrl: data.imageUrl || null,
            imagePosition: data.imagePosition || 'above_title',
            features: data.features?.length ? data.features : welcomeForm.features,
            delaySeconds: data.delaySeconds ?? 3,
            showAsModal: data.showAsModal ?? true,
            saveToInbox: data.saveToInbox ?? true,
            pushEnabled: data.pushEnabled ?? false,
        });
    } catch (error: any) {
        console.warn('No welcome config yet, using defaults');
    } finally {
        welcomeLoading.value = false;
    }
};

const saveWelcomeConfig = async () => {
    welcomeSaving.value = true;
    try {
        await notificationApi.updateWelcomeConfig({ ...welcomeForm });
        ElMessage.success('Lưu cấu hình chào mừng thành công!');
    } catch (error: any) {
        ElMessage.error(error.response?.data?.message || 'Lỗi khi lưu cấu hình');
    } finally {
        welcomeSaving.value = false;
    }
};

const insertTemplate = (varStr: string) => {
    welcomeForm.body += varStr;
};

const handleImageUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
        ElMessage.warning('Ảnh tối đa 2MB');
        return;
    }

    uploadingImage.value = true;
    try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post('/files/upload?folder=welcome', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        welcomeForm.imageUrl = res.data.url;
        ElMessage.success('Tải ảnh thành công');
    } catch (error: any) {
        ElMessage.error('Lỗi tải ảnh');
    } finally {
        uploadingImage.value = false;
        input.value = '';
    }
};

const removeImage = () => {
    welcomeForm.imageUrl = null;
};

// ===== INIT =====
onMounted(() => {
    fetchHistory();
    fetchWelcomeConfig();
});
</script>

<template>
    <div class="notification-management p-6 max-w-7xl mx-auto">
        <div class="mb-8">
            <h1 class="text-2xl font-bold text-gray-800">Admin — Soạn & gửi thông báo</h1>
            <p class="text-gray-500 text-sm mt-1">Gửi thông báo hệ thống & cấu hình chào mừng tự động cho người dùng
                App</p>
        </div>

        <!-- Main Tabs -->
        <div class="main-tabs mb-6">
            <button :class="['main-tab', activeMainTab === 'broadcast' && 'active']"
                @click="activeMainTab = 'broadcast'">
                <el-icon>
                    <Promotion />
                </el-icon>
                Gửi thông báo
            </button>
            <button :class="['main-tab', activeMainTab === 'welcome' && 'active']"
                @click="activeMainTab = 'welcome'">
                <el-icon>
                    <ChatDotSquare />
                </el-icon>
                Chào mừng tự động
                <span v-if="welcomeForm.isActive" class="active-badge">ON</span>
            </button>
        </div>

        <!-- ===== TAB 1: BROADCAST (Existing) ===== -->
        <div v-show="activeMainTab === 'broadcast'" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Left Side: Form -->
            <div class="space-y-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <!-- 1. CHỌN ĐỐI TƯỢNG NHẬN -->
                <section>
                    <h3 class="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">1. CHỌN ĐỐI TƯỢNG NHẬN
                    </h3>
                    <div class="grid grid-cols-2 gap-3">
                        <div v-for="role in roles" :key="role.value"
                            @click="form.targetRoles.includes(role.value) ? form.targetRoles = form.targetRoles.filter(r => r !== role.value) : form.targetRoles.push(role.value)"
                            :class="[
                                'p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3',
                                form.targetRoles.includes(role.value) ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                            ]">
                            <div
                                :class="['w-10 h-10 rounded-lg flex items-center justify-center', form.targetRoles.includes(role.value) ? 'bg-blue-500 text-white' : 'bg-white text-gray-400']">
                                <el-icon :size="20">
                                    <component :is="role.icon" />
                                </el-icon>
                            </div>
                            <div>
                                <div class="font-bold text-sm"
                                    :class="form.targetRoles.includes(role.value) ? 'text-blue-700' : 'text-gray-700'">
                                    {{ role.label }}</div>
                                <div class="text-[10px] text-gray-400 uppercase font-medium">Nhóm người dùng</div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- 2. LOẠI THÔNG BÁO -->
                <section>
                    <h3 class="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">2. LOẠI THÔNG BÁO</h3>
                    <div class="flex flex-wrap gap-2">
                        <button v-for="t in types" :key="t.value" @click="form.type = t.value" :class="[
                            'px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all border-2',
                            form.type === t.value ? 'bg-white border-blue-500 text-blue-600' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
                        ]">
                            <el-icon :color="t.color">
                                <component :is="t.icon" />
                            </el-icon>
                            {{ t.label }}
                        </button>
                    </div>
                </section>

                <!-- 3. NỘI DUNG -->
                <section>
                    <h3 class="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">3. NỘI DUNG</h3>
                    <div class="space-y-4">
                        <el-input v-model="form.title" placeholder="Tiêu đề thông báo..." class="custom-input" />
                        <el-input v-model="form.body" type="textarea" :rows="4"
                            placeholder="Nhập nội dung thông báo... VD: Lô hàng #XYZ bị phát hiện vấn đề..."
                            class="custom-textarea" />
                    </div>
                </section>

                <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div class="text-sm text-gray-500">
                        Gửi đến: <span class="font-bold text-gray-800">{{ form.targetRoles.length }} nhóm</span> đối
                        tượng
                    </div>
                    <el-button type="primary" size="large" class="px-8 font-bold rounded-lg h-12" :loading="loading"
                        @click="handleSend">
                        Gửi ngay <el-icon class="ml-2">
                            <Promotion />
                        </el-icon>
                    </el-button>
                </div>
            </div>

            <!-- Right Side: History -->
            <div class="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider">Lịch sử đã gửi</h3>
                    <el-button :icon="Search" circle size="small" />
                </div>

                <div v-if="history.length === 0 && !historyLoading" class="text-center py-20 opacity-30">
                    <el-icon :size="48">
                        <Promotion />
                    </el-icon>
                    <p class="mt-2 text-sm font-medium">Chưa có thông báo nào được gửi</p>
                </div>

                <div v-else class="space-y-4">
                    <div v-for="item in history" :key="item.id"
                        class="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2">
                                <div
                                    class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                    <el-icon>
                                        <Bell />
                                    </el-icon>
                                </div>
                                <div>
                                    <h4 class="font-bold text-sm text-gray-800">{{ item.title }}</h4>
                                    <p class="text-[10px] text-gray-400 uppercase">{{ item.type }}</p>
                                </div>
                            </div>
                            <span class="text-[10px] text-gray-400">{{ new Date(item.sentAt).toLocaleString() }}</span>
                        </div>
                        <p class="text-xs text-gray-600 line-clamp-2">{{ item.body }}</p>
                        <div class="mt-3 flex gap-1 flex-wrap">
                            <span v-for="role in item.targetRoles" :key="role"
                                class="px-2 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500 font-medium">
                                {{ role }}
                            </span>
                        </div>
                    </div>

                    <div class="pt-4 flex justify-center">
                        <el-pagination small layout="prev, pager, next" :total="totalHistory"
                            :page-size="query.limit" @current-change="handlePageChange" />
                    </div>
                </div>
            </div>
        </div>

        <!-- ===== TAB 2: WELCOME CONFIG ===== -->
        <div v-show="activeMainTab === 'welcome'" v-loading="welcomeLoading">
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <!-- LEFT: Config Form (2 cols) -->
                <div class="xl:col-span-2 space-y-6">

                    <!-- 1. NỘI DUNG THÔNG BÁO CHÀO MỪNG -->
                    <div class="wc-card">
                        <div class="wc-card-header">
                            <span class="wc-step">1</span>
                            <h3>Nội dung thông báo chào mừng</h3>
                        </div>
                        <div class="space-y-4 p-5">
                            <div>
                                <label class="wc-label">Tiêu đề thông báo</label>
                                <el-input v-model="welcomeForm.title" placeholder="VD: Chào mừng đến với TrustID!"
                                    class="custom-input" />
                            </div>
                            <div>
                                <label class="wc-label">Nội dung chính</label>
                                <div class="template-toolbar mb-2">
                                    <button v-for="v in templateVars" :key="v.label" @click="insertTemplate(v.label)"
                                        class="tpl-btn" :title="v.desc">
                                        {{ v.label }}
                                    </button>
                                    <button class="tpl-btn tpl-bold" title="In đậm">B</button>
                                </div>
                                <el-input v-model="welcomeForm.body" type="textarea" :rows="3"
                                    placeholder="Xin chào {{tên}}, tài khoản của bạn đã được kích hoạt..."
                                    class="custom-textarea" />
                            </div>
                            <div>
                                <label class="wc-label">Nút CTA</label>
                                <el-input v-model="welcomeForm.ctaText" placeholder="Bắt đầu quét QR ngay"
                                    class="custom-input" />
                            </div>
                        </div>
                    </div>

                    <!-- 2. HÌNH ẢNH ĐÍNH KÈM -->
                    <div class="wc-card">
                        <div class="wc-card-header">
                            <span class="wc-step">2</span>
                            <h3>Hình ảnh đính kèm</h3>
                        </div>
                        <div class="p-5 space-y-4">
                            <!-- Upload Zone -->
                            <div v-if="!welcomeForm.imageUrl" class="upload-zone" @click="($refs.imgInput as any)?.click()">
                                <el-icon :size="40" color="#94A3B8">
                                    <Picture />
                                </el-icon>
                                <p class="text-sm text-gray-500 mt-2">Kéo thả hoặc bấm để tải ảnh lên</p>
                                <p class="text-xs text-gray-400 mt-1">PNG, JPG, WebP · Tối đa 2MB · Khuyến nghị
                                    1200×400px</p>
                                <input ref="imgInput" type="file" accept="image/*" hidden @change="handleImageUpload" />
                            </div>
                            <!-- Preview -->
                            <div v-else class="image-preview">
                                <img :src="welcomeForm.imageUrl" alt="Welcome Banner" />
                                <button class="remove-img" @click="removeImage">
                                    <el-icon>
                                        <Close />
                                    </el-icon>
                                </button>
                            </div>

                            <!-- Position Selector -->
                            <div>
                                <label class="wc-label">Vị trí hiển thị ảnh</label>
                                <div class="flex gap-2 mt-2">
                                    <button v-for="pos in imagePositions" :key="pos.value"
                                        @click="welcomeForm.imagePosition = pos.value" :class="[
                                            'px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all',
                                            welcomeForm.imagePosition === pos.value
                                                ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                        ]">
                                        {{ pos.label }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 3. TÍNH NĂNG GIỚI THIỆU -->
                    <div class="wc-card">
                        <div class="wc-card-header">
                            <span class="wc-step">3</span>
                            <h3>Tính năng giới thiệu</h3>
                        </div>
                        <div class="p-5">
                            <div class="grid grid-cols-2 gap-3">
                                <div v-for="(feature, idx) in welcomeForm.features" :key="feature.key" :class="[
                                    'feature-tag',
                                    feature.enabled && 'active'
                                ]" @click="welcomeForm.features[idx].enabled = !feature.enabled">
                                    <span class="feature-dot" :class="feature.enabled ? 'bg-emerald-500' : 'bg-gray-300'"></span>
                                    {{ feature.label }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 4. CẤU HÌNH KÍCH HOẠT -->
                    <div class="wc-card">
                        <div class="wc-card-header">
                            <span class="wc-step">4</span>
                            <h3>Cấu hình kích hoạt</h3>
                        </div>
                        <div class="p-5 space-y-5">
                            <!-- Toggle: Active -->
                            <div class="config-row">
                                <div>
                                    <div class="config-title">Gửi khi đăng nhập lần đầu</div>
                                    <div class="config-desc">Trigger: first_login event · tự động 100%</div>
                                </div>
                                <el-switch v-model="welcomeForm.isActive" active-color="#3B82F6" />
                            </div>

                            <!-- Delay -->
                            <div class="config-row">
                                <div>
                                    <div class="config-title">Delay sau đăng nhập</div>
                                    <div class="config-desc">Chờ X giây để app load xong</div>
                                </div>
                                <el-input-number v-model="welcomeForm.delaySeconds" :min="0" :max="30" size="small"
                                    class="w-20" controls-position="right" />
                            </div>

                            <!-- Modal Overlay -->
                            <div class="config-row">
                                <div>
                                    <div class="config-title">Hiển thị dạng modal overlay</div>
                                    <div class="config-desc">Popup toàn màn hình khi mở app</div>
                                </div>
                                <el-switch v-model="welcomeForm.showAsModal" active-color="#3B82F6" />
                            </div>

                            <!-- Save to Inbox -->
                            <div class="config-row">
                                <div>
                                    <div class="config-title">Lưu vào hộp thư thông báo</div>
                                    <div class="config-desc">Người dùng đọc lại được sau</div>
                                </div>
                                <el-switch v-model="welcomeForm.saveToInbox" active-color="#3B82F6" />
                            </div>

                            <!-- Push Notification (Disabled) -->
                            <div class="config-row opacity-50">
                                <div>
                                    <div class="config-title">Gửi thêm push notification
                                        <span class="text-[10px] ml-2 px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full font-medium">Coming soon</span>
                                    </div>
                                    <div class="config-desc">FCM · Android & iOS</div>
                                </div>
                                <el-switch :model-value="false" disabled />
                            </div>
                        </div>
                    </div>

                    <!-- SAVE BUTTON -->
                    <div class="flex items-center gap-4">
                        <el-button size="default" @click="fetchWelcomeConfig">Preview</el-button>
                        <el-button type="primary" size="large"
                            class="flex-1 font-bold rounded-xl h-14 text-base"
                            :loading="welcomeSaving" @click="saveWelcomeConfig">
                            Lưu cấu hình & kích hoạt
                        </el-button>
                    </div>

                    <!-- AUTOMATED FLOW TIMELINE -->
                    <div class="wc-card">
                        <div class="p-5">
                            <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">LUỒNG TỰ ĐỘNG
                            </h4>
                            <div class="flow-timeline">
                                <div class="flow-step">
                                    <div class="flow-icon bg-blue-500">
                                        <el-icon color="#fff" :size="16"><CircleCheck /></el-icon>
                                    </div>
                                    <div>
                                        <div class="flow-title">Người dùng đăng nhập lần đầu</div>
                                        <div class="flow-desc">Event: first_login · is_first_login = true trong DB</div>
                                    </div>
                                </div>
                                <div class="flow-step">
                                    <div class="flow-icon bg-amber-500">
                                        <el-icon color="#fff" :size="16"><Search /></el-icon>
                                    </div>
                                    <div>
                                        <div class="flow-title">Hệ thống kiểm tra điều kiện</div>
                                        <div class="flow-desc">welcome_sent = false → proceed · Merge (Biến) với profile</div>
                                    </div>
                                </div>
                                <div class="flow-step">
                                    <div class="flow-icon bg-emerald-500">
                                        <el-icon color="#fff" :size="16"><ChatDotSquare /></el-icon>
                                    </div>
                                    <div>
                                        <div class="flow-title">Gửi in-app + lưu inbox</div>
                                        <div class="flow-desc">Modal overlay sau {{ welcomeForm.delaySeconds }}s · Ghi notification record vào DB</div>
                                    </div>
                                </div>
                                <div class="flow-step last">
                                    <div class="flow-icon bg-gray-500">
                                        <el-icon color="#fff" :size="16"><Checked /></el-icon>
                                    </div>
                                    <div>
                                        <div class="flow-title">Đánh dấu & tracking</div>
                                        <div class="flow-desc">welcome_sent = true · Ghi delivered_at, read_at, cta_clicked</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT: Live Preview (1 col) -->
                <div class="xl:col-span-1">
                    <div class="sticky top-6">
                        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">
                            PREVIEW · MÀN HÌNH NGƯỜI DÙNG
                        </div>
                        <div class="phone-preview">
                            <!-- Status bar -->
                            <div class="phone-statusbar">
                                <span>9:14</span>
                                <div class="flex gap-1 items-center">
                                    <div class="w-4 h-2 bg-white/60 rounded-sm"></div>
                                    <div class="w-4 h-2 bg-white/60 rounded-sm"></div>
                                    <div class="w-6 h-3 border border-white/60 rounded-sm">
                                        <div class="w-3 h-full bg-emerald-400 rounded-sm"></div>
                                    </div>
                                </div>
                            </div>
                            <!-- App bar -->
                            <div class="phone-appbar">
                                <span class="text-white/60">&lt;</span>
                                <span class="font-bold text-white">Thông báo</span>
                                <span></span>
                            </div>
                            <!-- Notification card preview -->
                            <div class="phone-content">
                                <div class="phone-notif-card">
                                    <div class="text-[10px] text-blue-300 font-bold tracking-wider mb-1">TrustID · Chào mừng</div>
                                    <!-- Image preview -->
                                    <div v-if="welcomeForm.imageUrl && welcomeForm.imagePosition === 'above_title'"
                                        class="phone-banner">
                                        <img :src="welcomeForm.imageUrl" alt="Banner" />
                                    </div>
                                    <!-- Badge -->
                                    <div class="phone-badge">🎉 CHÀO MỪNG · LẦN ĐẦU ĐĂNG NHẬP</div>
                                    <!-- Title -->
                                    <h3 class="text-white font-bold text-sm mt-2">{{ previewTitle }}</h3>
                                    <!-- Image middle -->
                                    <div v-if="welcomeForm.imageUrl && welcomeForm.imagePosition === 'middle'"
                                        class="phone-banner mt-2">
                                        <img :src="welcomeForm.imageUrl" alt="Banner" />
                                    </div>
                                    <!-- Body -->
                                    <p class="text-gray-400 text-xs mt-2 leading-relaxed">{{ previewBody }}</p>
                                    <!-- Features -->
                                    <div v-if="enabledFeatures.length" class="mt-3 space-y-1">
                                        <div v-for="f in enabledFeatures.slice(0, 3)" :key="f.key"
                                            class="flex items-center gap-2 text-xs text-gray-300">
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                            {{ f.label }}
                                        </div>
                                    </div>
                                    <!-- Image below -->
                                    <div v-if="welcomeForm.imageUrl && welcomeForm.imagePosition === 'below_cta'"
                                        class="phone-banner mt-3">
                                        <img :src="welcomeForm.imageUrl" alt="Banner" />
                                    </div>
                                    <!-- CTA -->
                                    <button class="phone-cta">{{ welcomeForm.ctaText }}</button>
                                    <div class="text-center text-[10px] text-gray-500 mt-2">Bỏ qua · Xem lại trong
                                        Thông báo</div>
                                </div>
                            </div>
                            <div class="text-center text-[10px] text-gray-400 mt-3 px-4">
                                Live preview · Chỉnh nội dung bên trái để cập nhật
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* ===== EXISTING STYLES ===== */
.custom-input :deep(.el-input__wrapper) {
    box-shadow: none;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 8px 12px;
}

.custom-textarea :deep(.el-textarea__inner) {
    box-shadow: none;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 12px;
}

.notification-management :deep(.el-button--primary) {
    background-color: #1E40AF;
    border-color: #1E40AF;
}

.notification-management :deep(.el-button--primary:hover) {
    background-color: #1D4ED8;
    border-color: #1D4ED8;
}

/* ===== MAIN TABS ===== */
.main-tabs {
    display: flex;
    gap: 4px;
    background: #F1F5F9;
    padding: 4px;
    border-radius: 12px;
    width: fit-content;
}

.main-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #64748B;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
}

.main-tab:hover {
    color: #334155;
}

.main-tab.active {
    background: #fff;
    color: #1E40AF;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.active-badge {
    font-size: 10px;
    padding: 2px 6px;
    background: #10B981;
    color: #fff;
    border-radius: 4px;
    font-weight: 700;
}

/* ===== WELCOME CARD ===== */
.wc-card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #E5E7EB;
    overflow: hidden;
}

.wc-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid #F1F5F9;
}

.wc-card-header h3 {
    font-size: 15px;
    font-weight: 700;
    color: #1E293B;
}

.wc-step {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #1E40AF;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    flex-shrink: 0;
}

.wc-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #64748B;
    margin-bottom: 6px;
}

/* ===== TEMPLATE TOOLBAR ===== */
.template-toolbar {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.tpl-btn {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    background: #EFF6FF;
    color: #2563EB;
    border: 1px solid #BFDBFE;
    cursor: pointer;
    transition: all 0.15s;
}

.tpl-btn:hover {
    background: #DBEAFE;
}

.tpl-bold {
    font-weight: 900;
    font-size: 14px;
}

/* ===== UPLOAD ZONE ===== */
.upload-zone {
    border: 2px dashed #CBD5E1;
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: #FAFBFC;
}

.upload-zone:hover {
    border-color: #3B82F6;
    background: #EFF6FF;
}

.image-preview {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #E5E7EB;
}

.image-preview img {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.remove-img {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.9);
    color: #fff;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ===== FEATURE TAGS ===== */
.feature-tag {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    background: #F8FAFC;
    color: #64748B;
    border: 1px solid #E2E8F0;
}

.feature-tag:hover {
    border-color: #CBD5E1;
}

.feature-tag.active {
    background: #ECFDF5;
    color: #059669;
    border-color: #A7F3D0;
}

.feature-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* ===== CONFIG ROWS ===== */
.config-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #F1F5F9;
}

.config-row:last-child {
    border-bottom: none;
}

.config-title {
    font-size: 14px;
    font-weight: 600;
    color: #1E293B;
}

.config-desc {
    font-size: 11px;
    color: #94A3B8;
    margin-top: 2px;
}

/* ===== FLOW TIMELINE ===== */
.flow-timeline {
    position: relative;
}

.flow-step {
    display: flex;
    gap: 16px;
    padding-bottom: 24px;
    position: relative;
    padding-left: 4px;
}

.flow-step:not(.last)::before {
    content: '';
    position: absolute;
    left: 19px;
    top: 40px;
    bottom: 0;
    width: 2px;
    background: #E2E8F0;
}

.flow-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.flow-title {
    font-size: 13px;
    font-weight: 700;
    color: #1E293B;
}

.flow-desc {
    font-size: 11px;
    color: #94A3B8;
    margin-top: 2px;
}

/* ===== PHONE PREVIEW ===== */
.phone-preview {
    width: 100%;
    max-width: 320px;
    margin: 0 auto;
    background: #131722;
    border-radius: 28px;
    padding: 12px;
    border: 3px solid #2D3748;
    min-height: 580px;
}

.phone-statusbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px 8px;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
}

.phone-appbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    font-size: 16px;
}

.phone-content {
    padding: 8px;
}

.phone-notif-card {
    background: #1D263B;
    border-radius: 16px;
    padding: 16px;
}

.phone-banner {
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 2px;
}

.phone-banner img {
    width: 100%;
    height: 100px;
    object-fit: cover;
}

.phone-badge {
    display: inline-block;
    font-size: 9px;
    font-weight: 800;
    color: #FCD34D;
    background: rgba(252, 211, 77, 0.1);
    padding: 3px 8px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    margin-top: 8px;
}

.phone-cta {
    display: block;
    width: 100%;
    margin-top: 16px;
    padding: 12px;
    border-radius: 10px;
    background: #10B981;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    border: none;
    cursor: default;
    text-align: center;
}
</style>
