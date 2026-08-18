<template>
  <el-dialog
    v-model="visible"
    width="800px"
    :close-on-click-modal="false"
    :show-close="false"
    class="branded-pallet-dialog"
  >
    <template #header>
      <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
        <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
        <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
        <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
          {{ `Chi tiết gói — Bao ${bagSerial}` }}
        </span>
        <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="visible = false">
          <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
        </div>
      </div>
    </template>

    <div style="padding: 24px 24px 8px;">
      <div class="mb-4 flex items-center gap-4 text-sm text-gray-600">
        <span><strong>Lô:</strong> {{ groupIndex }}</span>
        <span><strong>Mã QR bao:</strong> <code class="text-green-700">{{ bagQrCode || bagSerial }}</code></span>
        <span><strong>Tổng gói:</strong> {{ packetCount }}</span>
      </div>

    <el-table :data="packets" border stripe size="small" v-loading="loading" max-height="500">
      <el-table-column prop="stt" label="STT" width="60" align="center" />
      <el-table-column prop="serial" label="Mã gói" min-width="140">
        <template #default="{ row }">
          <code :class="{ 'text-red-500 line-through': row.status === 'REPLACED', 'text-blue-600': row.status === 'REPLACEMENT' }">
            {{ row.serial }}
          </code>
          <el-tag v-if="row.status === 'REPLACED'" type="danger" size="small" class="ml-1">Đã thay</el-tag>
          <el-tag v-if="row.status === 'REPLACEMENT'" type="success" size="small" class="ml-1">Thay vào</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Mã QR" min-width="180">
        <template #default="{ row }">
          <code class="text-gray-500 text-xs">{{ row.qrCode || '—' }}</code>
        </template>
      </el-table-column>
      <el-table-column label="Thời gian" width="160">
        <template #default="{ row }">
          <span class="text-xs text-gray-500">{{ formatDate(row.scannedAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Thao tác" width="80" align="center">
        <template #default="{ row }">
          <el-button
            v-if="row.status !== 'REPLACED' && row.status !== 'DAMAGED'"
            link
            type="warning"
            size="small"
            @click="$emit('replace-from-detail', row.serial)"
          >
            Thay
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="replacements.length > 0" class="mt-4">
      <h4 class="text-sm font-semibold text-gray-700 mb-2">Lịch sử thay thế</h4>
      <div v-for="(r, i) in replacements" :key="i" class="text-xs text-gray-500 mb-1">
        <code class="text-red-500">{{ r.originalSerial }}</code> → <code class="text-blue-600">{{ r.replacementSerial }}</code>
        <span class="ml-2">{{ getReasonLabel(r.reason) }}</span>
        <span class="ml-2">{{ formatDate(r.replacedAt) }}</span>
      </div>
    </div>
    </div>
    
    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
        <el-button @click="visible = false" style="border-radius: 8px; padding: 10px 20px;">Đóng</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { productionOrderApi } from '../api/productionOrderApi';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const props = defineProps<{
  modelValue: boolean;
  mappingId: string;
}>();

const emit = defineEmits(['update:modelValue', 'replace-from-detail']);

const visible = ref(props.modelValue);
watch(() => props.modelValue, v => { visible.value = v; });
watch(visible, v => { emit('update:modelValue', v); });

const loading = ref(false);
const packets = ref<any[]>([]);
const replacements = ref<any[]>([]);
const bagSerial = ref('');
const bagQrCode = ref('');
const groupIndex = ref(0);
const packetCount = ref(0);

const reasonLabels: Record<string, string> = {
  TORN_PACKAGING: 'Rách bao bì',
  DEFORMED: 'Móp/biến dạng',
  QUALITY_DEFECT: 'Hỏng/lỗi chất lượng',
  OTHER: 'Khác',
};
const getReasonLabel = (r: string) => reasonLabels[r] || r || '';

const formatDate = (d: string | Date) => {
  if (!d) return '';
  return new Date(d).toLocaleString('vi-VN', { hour12: false });
};

const fetchData = async () => {
  if (!props.mappingId) return;
  loading.value = true;
  try {
    const { data } = await productionOrderApi.getPacketDetail(props.mappingId);
    const result = data.data || data;
    packets.value = result.packets || [];
    replacements.value = result.replacements || [];
    bagSerial.value = result.mapping?.bagSerial || '';
    bagQrCode.value = result.mapping?.bagQrCode || '';
    groupIndex.value = result.mapping?.groupIndex || 0;
    packetCount.value = result.mapping?.packetCount || 0;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Không thể tải chi tiết gói');
  } finally {
    loading.value = false;
  }
};

watch(() => props.mappingId, () => { if (visible.value) fetchData(); });
watch(visible, v => { if (v) fetchData(); });
</script>

<style>
.branded-pallet-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-pallet-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-pallet-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-pallet-dialog .el-dialog__footer {
  padding: 0 !important;
  border-top: none !important;
}
</style>
