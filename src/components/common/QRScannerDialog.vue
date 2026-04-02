<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import { Html5Qrcode } from 'html5-qrcode';
import { ElMessage } from 'element-plus';
import { Loading, Plus, Minus } from '@element-plus/icons-vue';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'scan']);

const scannerId = 'qr-reader';
let html5QrCode: Html5Qrcode | null = null;
const isScanning = ref(false);
const canZoom = ref(false);
const zoomValue = ref(1);
const zoomMin = ref(1);
const zoomMax = ref(1);
const zoomStep = ref(0.1);

const startScanner = async () => {
    try {
        const instance = new Html5Qrcode(scannerId);
        html5QrCode = instance;
        isScanning.value = true;

        const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.7); // 70% of the smallest dimension
            return {
                width: qrboxSize,
                height: qrboxSize
            };
        };

        if (instance) {
            await instance.start(
                { facingMode: 'environment' },
                {
                    fps: 15,
                    qrbox: qrboxFunction,
                    aspectRatio: 1.0
                },
                (decodedText) => {
                    stopScanner();
                    emit('scan', decodedText);
                    emit('update:modelValue', false);
                },
                (errorMessage) => {
                    // Ignore silent errors while scanning
                }
            );

            // Zoom logic: Wait a bit for the video element to be attached and playing
            setTimeout(() => {
                const video = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
                if (video && video.srcObject) {
                    const stream = video.srcObject as MediaStream;
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                        const capabilities = videoTrack.getCapabilities() as any;
                        if (capabilities.zoom) {
                            canZoom.value = true;
                            zoomMin.value = capabilities.zoom.min;
                            zoomMax.value = capabilities.zoom.max;
                            zoomStep.value = capabilities.zoom.step || 0.1;
                            zoomValue.value = capabilities.zoom.min;
                        }
                    }
                }
            }, 1000);
        }
    } catch (err) {
        console.error('QR Scanner error:', err);
        ElMessage.error('Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập.');
        isScanning.value = false;
    }
};

const handleZoomChange = async (val: any) => {
    if (canZoom.value) {
        try {
            const video = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
            if (video && video.srcObject) {
                const stream = video.srcObject as MediaStream;
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    await videoTrack.applyConstraints({
                        advanced: [{ zoom: val }]
                    } as any);
                }
            }
        } catch (err) {
            console.error('Apply zoom error:', err);
        }
    }
};

const stopScanner = async () => {
    if (html5QrCode && isScanning.value) {
        try {
            await html5QrCode.stop();
            await html5QrCode.clear();
        } catch (err) {
            console.error('Stop scanner error:', err);
        } finally {
            html5QrCode = null;
            isScanning.value = false;
        }
    }
};

const handleClose = () => {
    stopScanner();
    emit('update:modelValue', false);
};

const onOpened = () => {
    startScanner();
};

onBeforeUnmount(() => {
    stopScanner();
});
</script>

<template>
    <el-dialog
        :model-value="modelValue"
        title="Quét mã QR"
        width="90%"
        max-width="500px"
        @update:model-value="handleClose"
        @opened="onOpened"
        @closed="handleClose"
        destroy-on-close
    >
        <div class="qr-scanner-container">
            <div :id="scannerId" class="scanner-preview"></div>
            <div v-if="!isScanning" class="loading-state">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>Đang khởi động camera...</span>
            </div>
            <div class="scanner-instruction">
                Hãy đưa mã QR vào khung hình để tự động quét
            </div>

            <div v-if="canZoom" class="zoom-control">
                <div class="flex items-center gap-3 w-full px-4">
                    <el-icon><Minus /></el-icon>
                    <el-slider 
                        v-model="zoomValue" 
                        :min="zoomMin" 
                        :max="zoomMax" 
                        :step="zoomStep"
                        :show-tooltip="false"
                        class="flex-grow"
                        @input="handleZoomChange"
                    />
                    <el-icon><Plus /></el-icon>
                </div>
                <div class="text-xs text-gray-400 mt-1">Phóng to để quét mã dễ hơn</div>
            </div>
        </div>
        <template #footer>
            <el-button @click="handleClose">Hủy</el-button>
        </template>
    </el-dialog>
</template>

<style scoped>
.qr-scanner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    min-height: 300px;
    position: relative;
}

.scanner-preview {
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    border-radius: 12px;
    background: #000;
    position: relative;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.loading-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #666;
}

.scanner-instruction {
    font-size: 16px;
    font-weight: 500;
    color: #409eff;
    text-align: center;
    background: rgba(64, 158, 255, 0.1);
    padding: 10px 20px;
    border-radius: 20px;
    width: 100%;
}

:deep(#qr-reader__dashboard) {
    display: none !important;
}

:deep(#qr-reader video) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
}

:deep(#qr-reader canvas) {
    width: 100% !important;
    height: 100% !important;
}

.zoom-control {
    width: 100%;
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.flex {
    display: flex;
}

.items-center {
    align-items: center;
}

.gap-3 {
    gap: 12px;
}

.flex-grow {
    flex-grow: 1;
}

.px-4 {
    padding-left: 1rem;
    padding-right: 1rem;
}

.text-xs {
    font-size: 0.75rem;
}

.text-gray-400 {
    color: #909399;
}

.mt-1 {
    margin-top: 4px;
}
</style>
