<script setup lang="ts">
import { ref, computed } from 'vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
import { CircleCheckFilled, CircleCloseFilled, WarningFilled, InfoFilled, CopyDocument } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps<{
    modelValue: boolean;
    type: 'success' | 'warning' | 'error';
    title?: string;
    productName?: string;
    txngId?: string;
    maTruyVet?: string;
    httpStatus?: number | string;
    endpoint?: string;
    rawErrorDetails?: any;
}>();

const emit = defineEmits(['update:modelValue', 'close']);

const showTechnicalDetails = ref(false);

const handleClose = () => {
    emit('update:modelValue', false);
    emit('close');
};

const copyTechnicalLog = () => {
    const text = `Endpoint: ${props.endpoint}\nStatus: ${props.httpStatus}\nDetails:\n${typeof props.rawErrorDetails === 'object' ? JSON.stringify(props.rawErrorDetails, null, 2) : props.rawErrorDetails}`;
    navigator.clipboard.writeText(text);
    ElMessage.success('Đã sao chép phản hồi kỹ thuật vào bộ nhớ tạm');
};

const errorAnalysis = computed(() => {
    const rawDetails = typeof props.rawErrorDetails === 'object' 
        ? JSON.stringify(props.rawErrorDetails) 
        : String(props.rawErrorDetails || '');
    
    const debugMsg = rawDetails;
    const errorCode = props.rawErrorDetails?.error || '';

    let userReason = 'Cổng Quốc gia chưa tiếp nhận thông tin sản phẩm này.';
    let userAction = 'Vui lòng kiểm tra lại thông tin sản phẩm hoặc thử lại sau.';
    let icon = WarningFilled;
    let badgeTitle = 'Chưa đủ điều kiện kích hoạt';

    if (debugMsg.includes('NullReferenceException') && debugMsg.includes('ToChuc_SanPhamService')) {
        userReason = 'Hồ sơ Doanh nghiệp / Tổ chức chưa được liên kết hoặc chưa được kích hoạt trên Cổng TXNG Quốc gia.';
        userAction = 'Liên hệ Quản trị viên Cổng Quốc gia (truyxuatnguongoc.gov.vn) để xác minh và kích hoạt tài khoản Doanh nghiệp (Mã số thuế / Mã GLN).';
        badgeTitle = 'Hồ sơ Doanh nghiệp chưa duyệt trên Cổng Quốc gia';
    } else if (debugMsg.includes('NullReferenceException') && debugMsg.includes('UploadFile')) {
        userReason = 'Máy chủ Cổng Quốc gia không thể tải hình ảnh sản phẩm.';
        userAction = 'Kiểm tra đường dẫn ảnh sản phẩm, đảm bảo hình ảnh ở định dạng công khai (JPG/PNG).';
        badgeTitle = 'Lỗi hình ảnh sản phẩm';
    } else if (debugMsg.includes('NullReferenceException') || errorCode === 'ERR_SYS_DEV') {
        userReason = 'Máy chủ Cổng Quốc gia bị lỗi xử lý dữ liệu nội bộ (.NET Server Exception).';
        userAction = 'Tài khoản Doanh nghiệp chưa có dữ liệu khởi tạo ban đầu trên Cổng Quốc gia. Cần liên hệ Cổng Quốc gia tạo cấu hình Tổ chức.';
        badgeTitle = 'Lỗi dữ liệu cấu hình Cổng Quốc gia';
    } else if (rawDetails.includes('401') || rawDetails.includes('Unauthorized') || rawDetails.includes('token')) {
        userReason = 'Phiên kết nối (Token SSO) với Cổng Quốc gia đã hết hạn.';
        userAction = 'Vào menu Hệ thống → TXNG Quốc gia và nhấn "Refresh Token" để làm mới kết nối.';
        badgeTitle = 'Phiên đăng nhập Cổng hết hạn';
    } else if (rawDetails.includes('GTIN') || rawDetails.includes('CheckDigit') || rawDetails.includes('maBarcode')) {
        userReason = 'Mã GTIN / Barcode của sản phẩm không đúng chuẩn GS1.';
        userAction = 'Kiểm tra và cập nhật lại Mã GTIN chuẩn (8, 13, 14 chữ số).';
        badgeTitle = 'Mã GTIN / Barcode chưa chuẩn';
    }

    return {
        userReason,
        userAction,
        icon,
        badgeTitle,
        rawDetails
    };
});
</script>

<template>
    <el-dialog
        :model-value="modelValue"
        width="90%"
        style="max-width: 580px; border-radius: 12px; overflow: hidden; padding: 0;"
        :show-close="false"
        :close-on-click-modal="false"
        @update:model-value="handleClose"
        align-center
        class="trustid-result-dialog"
    >
        <!-- TrustID Brand Header -->
        <template #header>
            <div style="background: #0F2B46; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; width: 100%; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img :src="brandLogo" alt="TrustID" style="height: 24px; object-fit: contain;" />
                    <div style="height: 20px; width: 1px; background: rgba(255,255,255,0.25);"></div>
                    <span style="color: #fff; font-size: 15px; font-weight: 600; letter-spacing: 0.2px;">
                        {{ title || 'Thông báo Cổng TXNG Quốc gia' }}
                    </span>
                </div>
                <button 
                    @click="handleClose"
                    style="background: transparent; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 18px; line-height: 1; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.2s;"
                    onmouseover="this.style.color='#fff'"
                    onmouseout="this.style.color='rgba(255,255,255,0.7)'"
                >
                    ✕
                </button>
            </div>
        </template>

        <!-- Body Content -->
        <div style="padding: 20px 24px 16px;">
            <!-- Status Banner -->
            <div 
                v-if="type === 'success'"
                style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px;"
            >
                <el-icon style="color: #059669; font-size: 22px; margin-top: 1px;"><CircleCheckFilled /></el-icon>
                <div>
                    <div style="color: #065F46; font-weight: 700; font-size: 15px; margin-bottom: 2px;">
                        Đồng bộ Cổng TXNG Quốc gia thành công!
                    </div>
                    <div style="color: #047857; font-size: 13px;">
                        Sản phẩm <strong style="color: #065F46;">"{{ productName }}"</strong> đã được ghi nhận trên Cổng Quốc gia.
                    </div>
                </div>
            </div>

            <div 
                v-else
                style="background: #FEF2F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px;"
            >
                <el-icon style="color: #E11D48; font-size: 22px; margin-top: 1px;"><CircleCloseFilled /></el-icon>
                <div>
                    <div style="color: #9F1239; font-weight: 700; font-size: 15px; margin-bottom: 2px;">
                        Đồng bộ sang Cổng TXNG Quốc gia thất bại
                    </div>
                    <div style="color: #BE123C; font-size: 13px;">
                        Sản phẩm <strong style="color: #881337;">"{{ productName }}"</strong> chưa được tiếp nhận.
                    </div>
                </div>
            </div>

            <!-- Success Details Block -->
            <div v-if="type === 'success'" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
                    <div>
                        <span style="color: #64748B; font-size: 12px; display: block; margin-bottom: 2px;">Mã TXNG ID</span>
                        <code style="background: #fff; border: 1px solid #CBD5E1; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-weight: 600; color: #0F172A;">
                            {{ txngId || '---' }}
                        </code>
                    </div>
                    <div>
                        <span style="color: #64748B; font-size: 12px; display: block; margin-bottom: 2px;">Mã truy vết Quốc gia</span>
                        <code style="background: #fff; border: 1px solid #A7F3D0; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-weight: 700; color: #059669;">
                            {{ maTruyVet || 'Đã kích hoạt' }}
                        </code>
                    </div>
                </div>
            </div>

            <!-- User Guidance Card (For Error) -->
            <div v-else style="background: #FFF1F2; border-left: 4px solid #E11D48; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 16px;">
                <div style="font-weight: 700; color: #881337; font-size: 13.5px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    <span>📌 Nguyên nhân:</span>
                    <span>{{ errorAnalysis.userReason }}</span>
                </div>
                <div style="color: #9F1239; font-size: 12.5px; line-height: 1.55; margin-top: 6px;">
                    <strong style="color: #881337;">👉 Hướng khắc phục:</strong> {{ errorAnalysis.userAction }}
                </div>
            </div>

            <!-- Collapsible Technical Log (For Admin / IT) -->
            <div style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; background: #FAFAFA;">
                <button 
                    @click="showTechnicalDetails = !showTechnicalDetails"
                    style="width: 100%; background: #F1F5F9; border: none; padding: 10px 14px; text-align: left; font-size: 12px; font-weight: 600; color: #475569; display: flex; align-items: center; justify-content: space-between; cursor: pointer;"
                >
                    <span style="display: flex; align-items: center; gap: 6px;">
                        🔍 Xem phản hồi kỹ thuật gốc từ Cổng Quốc gia (Dành cho Admin / Kỹ thuật)
                    </span>
                    <span>{{ showTechnicalDetails ? '▲' : '▼' }}</span>
                </button>

                <div v-if="showTechnicalDetails" style="padding: 12px 14px; background: #0F172A; color: #E2E8F0; font-family: monospace; font-size: 11px; line-height: 1.5; max-height: 180px; overflow-y: auto; word-break: break-all;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: #94A3B8;">HTTP Status: <strong style="color: #38BDF8;">{{ httpStatus || '200' }}</strong></span>
                        <button @click="copyTechnicalLog" style="background: rgba(255,255,255,0.1); border: none; color: #94A3B8; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                            Copy Log
                        </button>
                    </div>
                    <div style="color: #94A3B8; margin-bottom: 4px; word-break: break-all;">Endpoint: {{ endpoint || 'https://quantri.truyxuatnguongoc.gov.vn/gwdev/tochuc/v5/ToChuc_SanPham' }}</div>
                    <div style="white-space: pre-wrap; color: #FCA5A5; margin-top: 4px;">{{ errorAnalysis.rawDetails }}</div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div style="padding: 12px 24px 20px; display: flex; justify-content: flex-end; background: #fff; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
            <button 
                @click="handleClose"
                style="background: #0F2B46; color: #fff; border: none; padding: 9px 28px; border-radius: 8px; font-weight: 600; font-size: 13.5px; cursor: pointer; transition: background 0.2s, transform 0.1s;"
                onmouseover="this.style.background='#1E3A5F'"
                onmouseout="this.style.background='#0F2B46'"
            >
                Đã hiểu
            </button>
        </div>
    </el-dialog>
</template>

<style scoped>
:deep(.trustid-result-dialog .el-dialog__header) {
    padding: 0 !important;
    margin-right: 0 !important;
}
:deep(.trustid-result-dialog .el-dialog__body) {
    padding: 0 !important;
}
</style>
