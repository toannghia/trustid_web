<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Check, InfoFilled, Message, Iphone } from '@element-plus/icons-vue';
import api from '@/common/utils/api';

const loading = ref(false);
const submitting = ref(false);

const activeProvider = ref<'FIREBASE' | 'ZALO'>('FIREBASE');

const form = reactive({
    authMethod: 'SMS' as 'SMS' | 'EMAIL',
    maxOtpPerHour: 3,
    fallbackEnabled: false,
    // Firebase Config
    firebaseApiKey: '',
    firebaseProjectId: '',
    firebaseAppId: '',
    // Zalo Config
    zaloAccessToken: '',
    zaloTemplateId: '',
    zaloSecretKey: '',
    // Resend Config
    resendApiKey: '',
    resendFromEmail: 'onboarding@trustid.com.vn'
});

// Real API Call
const fetchConfig = async () => {
    loading.value = true;
    try {
        const response = await api.get('/admin/auth-config');
        const data = response.data;
        
        // Handle new nested response structure
        // data = { status: { activeProvider, ... }, configs: { firebaseConfig, ... } }
        if (data && data.status) {
            const authStatus = data.status;
            const authConfigs = data.configs;

            // Map Backend Provider to UI State
            if (authStatus.activeProvider === 'EMAIL') {
                form.authMethod = 'EMAIL';
            } else {
                form.authMethod = 'SMS';
                activeProvider.value = authStatus.activeProvider; // FIREBASE or ZALO
            }

            form.maxOtpPerHour = authStatus.maxOtpPerHour;
            form.fallbackEnabled = authStatus.fallbackEnabled || false;
            
            if (authConfigs.firebaseConfig) {
                form.firebaseApiKey = authConfigs.firebaseConfig.apiKey;
                form.firebaseProjectId = authConfigs.firebaseConfig.projectId;
                form.firebaseAppId = authConfigs.firebaseConfig.appId;
            }
            if (authConfigs.zaloConfig) {
                form.zaloAccessToken = authConfigs.zaloConfig.accessToken;
                form.zaloTemplateId = authConfigs.zaloConfig.templateId;
                form.zaloSecretKey = authConfigs.zaloConfig.secretKey;
            }
            if (authConfigs.emailConfig) {
                form.resendApiKey = authConfigs.emailConfig.apiKey;
                form.resendFromEmail = authConfigs.emailConfig.fromEmail;
            }
        } else if (data && data.activeProvider) { 
             // Fallback for old structure if API hasn't fully migrated (though user said it updated)
             // ... existing logic ...
            if (data.activeProvider === 'EMAIL') {
                form.authMethod = 'EMAIL';
            } else {
                form.authMethod = 'SMS';
                activeProvider.value = data.activeProvider;
            }
            form.maxOtpPerHour = data.maxOtpPerHour;
            form.fallbackEnabled = data.fallbackEnabled || false;
             if (data.firebaseConfig) {
                form.firebaseApiKey = data.firebaseConfig.apiKey;
                // ...
            }
            // ...
        }

    } catch (error: any) {
        ElMessage.warning('Chưa có cấu hình hoặc lỗi tải: ' + (error.response?.data?.message || error.message));
    } finally {
        loading.value = false;
    }
};

const saveConfig = async () => {
    submitting.value = true;
    try {
        // Determine activeProvider based on Auth Method
        const finalProvider = form.authMethod === 'EMAIL' ? 'EMAIL' : activeProvider.value;

        const payload = {
            activeProvider: finalProvider, 
            maxOtpPerHour: form.maxOtpPerHour,
            fallbackEnabled: form.fallbackEnabled,
            firebaseConfig: {
                apiKey: form.firebaseApiKey,
                projectId: form.firebaseProjectId,
                appId: form.firebaseAppId
            },
            zaloConfig: {
                accessToken: form.zaloAccessToken,
                templateId: form.zaloTemplateId,
                secretKey: form.zaloSecretKey
            },
            emailConfig: {
                apiKey: form.resendApiKey,
                fromEmail: form.resendFromEmail
            }
        };
        await api.put('/admin/auth-config', payload);
        ElMessage.success('Lưu cấu hình thành công!');
    } catch (error: any) {
         ElMessage.error('Lỗi khi lưu: ' + (error.response?.data?.message || error.message));
    } finally {
        submitting.value = false;
    }
};

onMounted(() => {
    fetchConfig();
});
</script>

<template>
    <div class="app-user-config p-6 max-w-5xl mx-auto">
        <div class="mb-8">
            <h1 class="text-2xl font-bold text-gray-800">Cấu hình Hệ thống Đăng ký</h1>
            <p class="text-gray-500 text-sm mt-1">Quản lý phương thức xác thực và nhà cung cấp dịch vụ (OTP/Email)</p>
        </div>

        <el-form :model="form" label-position="top" v-loading="loading">
            <!-- Auth Method Selection -->
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
                 <h3 class="font-bold text-gray-700 mb-4">Phương thức xác thực chính</h3>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div 
                        class="cursor-pointer p-4 rounded-lg border-2 transition-all flex items-center justify-between"
                        :class="form.authMethod === 'SMS' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
                        @click="form.authMethod = 'SMS'"
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <el-icon size="20"><Iphone /></el-icon>
                            </div>
                            <div>
                                <span class="font-bold text-gray-800 block">OTP qua SMS / Zalo</span>
                                <span class="text-xs text-gray-500">Xác thực bằng số điện thoại</span>
                            </div>
                        </div>
                        <el-icon v-if="form.authMethod === 'SMS'" class="text-blue-500"><Check /></el-icon>
                    </div>

                    <div 
                        class="cursor-pointer p-4 rounded-lg border-2 transition-all flex items-center justify-between"
                        :class="form.authMethod === 'EMAIL' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'"
                        @click="form.authMethod = 'EMAIL'"
                    >
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                                <el-icon size="20"><Message /></el-icon>
                            </div>
                            <div>
                                <span class="font-bold text-gray-800 block">OTP qua Email</span>
                                <span class="text-xs text-gray-500">Xác thực bằng địa chỉ Email (Resend)</span>
                            </div>
                        </div>
                        <el-icon v-if="form.authMethod === 'EMAIL'" class="text-purple-500"><Check /></el-icon>
                    </div>
                 </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Left: Provider Selection (Only for SMS) -->
                <div class="md:col-span-1" v-if="form.authMethod === 'SMS'">
                    <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                        <h3 class="font-bold text-gray-700 mb-4">Nhà cung cấp (SMS)</h3>
                        
                        <div 
                            class="cursor-pointer p-4 rounded-lg border-2 mb-3 transition-all flex items-center justify-between"
                            :class="activeProvider === 'FIREBASE' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
                            @click="activeProvider = 'FIREBASE'"
                        >
                            <div class="flex items-center gap-3">
                                <img src="https://firebase.google.com/static/images/brand-guidelines/logo-logomark.png" class="w-8 h-8 object-contain" />
                                <span class="font-medium text-gray-800">Firebase Auth</span>
                            </div>
                            <el-icon v-if="activeProvider === 'FIREBASE'" class="text-blue-500"><Check /></el-icon>
                        </div>

                        <div 
                            class="cursor-pointer p-4 rounded-lg border-2 transition-all flex items-center justify-between"
                            :class="activeProvider === 'ZALO' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
                            @click="activeProvider = 'ZALO'"
                        >
                            <div class="flex items-center gap-3">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/1200px-Icon_of_Zalo.svg.png" class="w-8 h-8 object-contain" />
                                <span class="font-medium text-gray-800">Zalo ZNS</span>
                            </div>
                            <el-icon v-if="activeProvider === 'ZALO'" class="text-blue-500"><Check /></el-icon>
                        </div>

                        <div class="mt-6 p-3 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200 flex gap-2">
                            <el-icon class="mt-0.5"><InfoFilled /></el-icon>
                            <span>
                                Hệ thống sẽ chuyển sang dùng provider này ngay lập tức sau khi Lưu.
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Left: Resend Info (Only for Email) -->
                <div class="md:col-span-1" v-if="form.authMethod === 'EMAIL'">
                    <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                        <h3 class="font-bold text-gray-700 mb-4">Nhà cung cấp (Email)</h3>
                        
                         <div 
                            class="cursor-pointer p-4 rounded-lg border-2 mb-3 transition-all flex items-center justify-between border-purple-500 bg-purple-50"
                        >
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded bg-black text-white flex items-center justify-center font-bold text-xs">R</div>
                                <span class="font-medium text-gray-800">Resend.com</span>
                            </div>
                            <el-icon class="text-purple-500"><Check /></el-icon>
                        </div>
                        
                         <div class="mt-4 text-xs text-gray-500">
                            Resend là dịch vụ gửi email developer-first, với độ tin cậy cao và API đơn giản.
                        </div>
                         <div class="mt-2 text-xs text-blue-500">
                            <a href="https://resend.com" target="_blank" class="hover:underline">Truy cập Dashboard Resend -></a>
                        </div>
                    </div>
                </div>

                <!-- Right: Config Form -->
                <div class="md:col-span-2">
                    <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100 relative">
                        <h3 class="font-bold text-gray-700 mb-6 flex items-center gap-2">
                            <span>Cấu hình chi tiết:</span>
                            <span v-if="form.authMethod === 'SMS'" class="text-blue-600">{{ activeProvider === 'FIREBASE' ? 'Firebase' : 'Zalo ZNS' }}</span>
                            <span v-else class="text-purple-600">Resend Email</span>
                        </h3>
                            
                            <!-- Common Settings -->
                            <div class="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                                <h4 class="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">Chặn Spam (Rate Limit)</h4>
                                <el-form-item label="Số lượng OTP tối đa cho 1 User trong 1 giờ">
                                    <el-input-number v-model="form.maxOtpPerHour" :min="1" :max="10" />
                                </el-form-item>
                                
                                <div class="mt-4 pt-4 border-t border-gray-200" v-if="form.authMethod === 'SMS'">
                                    <el-form-item>
                                        <div class="flex items-center justify-between w-full">
                                            <div>
                                                <div class="font-medium text-gray-800">Dự phòng (Fallback)</div>
                                                <div class="text-xs text-gray-500">Tự động chuyển từ ZNS sang Firebase (hoặc ngược lại) nếu gửi thất bại.</div>
                                            </div>
                                            <el-switch v-model="form.fallbackEnabled" />
                                        </div>
                                    </el-form-item>
                                </div>
                            </div>

                            <!-- Firebase Fields -->
                            <div v-if="form.authMethod === 'SMS' && activeProvider === 'FIREBASE'">
                                <el-form-item label="API Key">
                                    <el-input v-model="form.firebaseApiKey" placeholder="AIzaSy..." show-password />
                                </el-form-item>
                                <el-form-item label="Project ID">
                                    <el-input v-model="form.firebaseProjectId" placeholder="my-project-id" />
                                </el-form-item>
                                <el-form-item label="App ID (Optional)">
                                    <el-input v-model="form.firebaseAppId" />
                                </el-form-item>
                            </div>

                            <!-- Zalo Fields -->
                            <div v-if="form.authMethod === 'SMS' && activeProvider === 'ZALO'">
                                <el-alert
                                    title="Lưu ý quan trọng"
                                    description="Access Token của Zalo chỉ có hiệu lực trong 25 giờ. Vui lòng cập nhật thường xuyên hoặc cấu hình Refresh Token server-side."
                                    type="warning"
                                    show-icon
                                    :closable="false"
                                    class="mb-4"
                                />
                                <el-form-item label="Access Token (OA)">
                                    <el-input v-model="form.zaloAccessToken" type="textarea" :rows="3" placeholder="Zalo OA Access Token..." />
                                </el-form-item>
                                <el-form-item label="Template ID">
                                    <el-input v-model="form.zaloTemplateId" placeholder="Mã mẫu tin ZNS" />
                                </el-form-item>
                                <el-form-item label="Secret Key (App Secret)">
                                    <el-input v-model="form.zaloSecretKey" show-password />
                                </el-form-item>
                            </div>

                            <!-- Resend Fields -->
                            <div v-if="form.authMethod === 'EMAIL'">
                                <el-form-item label="Resend API Key">
                                    <el-input v-model="form.resendApiKey" placeholder="re_123456789..." show-password />
                                    <div class="text-xs text-gray-400 mt-1">Tạo API Key tại <a href="https://resend.com/api-keys" target="_blank" class="text-blue-500">Resend Dashboard</a>.</div>
                                </el-form-item>
                                <el-form-item label="From Email (Sender)">
                                    <el-input v-model="form.resendFromEmail" placeholder="onboarding@trustid.com.vn" />
                                    <div class="text-xs text-gray-400 mt-1">Địa chỉ email đã verify domain.</div>
                                </el-form-item>
                            </div>

                            <div class="mt-8 pt-4 border-t flex justify-end">
                                <el-button @click="fetchConfig">Hủy bỏ</el-button>
                                <el-button type="primary" :loading="submitting" @click="saveConfig">Lưu Cấu Hình</el-button>
                            </div>
                    </div>
                </div>
            </div>
        </el-form>
    </div>
</template>
