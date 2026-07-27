<script setup lang="ts">
import { computed } from 'vue';
import { InfoFilled, Document, Cpu } from '@element-plus/icons-vue';
import logo from '@/assets/images/logo.png';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const copyrightInfo = {
  name: 'HỆ THỐNG ĐỊNH DANH, XÁC THỰC VÀ TRUY XUẤT NGUỒN GỐC SẢN PHẨM (TRUSTID)',
  shortName: 'TRUSTID',
  version: '1.0.0',
  releaseDate: '2026',
  author: 'TOÀN DANH NGHĨA',
  owner: 'CÔNG TY CỔ PHẦN ZENPOS / CÔNG TY TNHH HẠT GIỐNG VÀNG',
  techStack: [
    'Vue 3 (Composition API, TypeScript)',
    'Element Plus UI Framework',
    'NestJS / Node.js Backend Engine',
    'Smart Contract / Blockchain Anti-Counterfeiting Verification',
  ],
};
</script>

<template>
  <el-dialog
    v-model="visible"
    title="Thông tin bản quyền phần mềm"
    width="560px"
    align-center
    destroy-on-close
    class="copyright-dialog"
  >
    <div class="space-y-4 text-sm text-gray-700">
      <!-- Header Banner -->
      <div class="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <div class="w-12 h-12 rounded-xl bg-white border border-blue-100 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
          <img :src="logo" alt="TrustID Logo" class="w-full h-full object-contain" />
        </div>
        <div>
          <h3 class="font-bold text-base text-gray-900 leading-tight">
            {{ copyrightInfo.shortName }}
          </h3>
          <p class="text-xs text-blue-700 font-medium mt-0.5">
            Phiên bản {{ copyrightInfo.version }} &bull; Copyright &copy; {{ copyrightInfo.releaseDate }}
          </p>
        </div>
      </div>

      <!-- Detail Info Cards -->
      <div class="grid grid-cols-1 gap-3">
        <!-- Tên đầy đủ -->
        <div class="p-3 bg-gray-50 border border-gray-100 rounded-md">
          <div class="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1">
            <el-icon><Document /></el-icon>
            TÊN CHƯƠNG TRÌNH MÁY TÍNH
          </div>
          <p class="font-medium text-gray-800 leading-snug">
            {{ copyrightInfo.name }}
          </p>
        </div>

        <!-- Chủ sở hữu & Tác giả -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 bg-gray-50 border border-gray-100 rounded-md">
            <div class="text-xs text-gray-500 font-semibold mb-1">TÁC GIẢ SÁNG TẠO</div>
            <p class="font-semibold text-gray-800">{{ copyrightInfo.author }}</p>
          </div>
          <div class="p-3 bg-gray-50 border border-gray-100 rounded-md">
            <div class="text-xs text-gray-500 font-semibold mb-1">CHỦ SỞ HỮU QUYỀN</div>
            <p class="font-semibold text-gray-800">{{ copyrightInfo.owner }}</p>
          </div>
        </div>

        <!-- Công nghệ cốt lõi -->
        <div class="p-3 bg-gray-50 border border-gray-100 rounded-md">
          <div class="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-1.5">
            <el-icon><Cpu /></el-icon>
            NỀN TẢNG CÔNG NGHỆ
          </div>
          <ul class="list-disc list-inside space-y-1 text-xs text-gray-600">
            <li v-for="(tech, index) in copyrightInfo.techStack" :key="index">
              {{ tech }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Legal Disclaimer -->
      <div class="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 leading-relaxed flex gap-2">
        <el-icon class="text-amber-600 flex-shrink-0 mt-0.5" :size="16"><InfoFilled /></el-icon>
        <div>
          <span class="font-bold">Cảnh báo pháp lý:</span> Phần mềm được bảo hộ theo Luật Sở hữu trí tuệ Việt Nam. Mọi hành vi sao chép, giải mã mã nguồn (reverse engineering) hoặc phân phối trái phép đều bị nghiêm cấm.
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <el-button type="primary" class="px-6" @click="visible = false">
          Đã hiểu & Đóng
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
:deep(.copyright-dialog .el-dialog__header) {
  margin-right: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}
</style>
