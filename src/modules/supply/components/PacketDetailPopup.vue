<template>
  <el-dialog
    v-model="visible"
    :title="`Chi tiết gói — Bao ${bagSerial}`"
    width="640px"
    :close-on-click-modal="false"
  >
    <div class="mb-4 flex items-center gap-4 text-sm text-gray-600">
      <span><strong>Lô:</strong> {{ groupIndex }}</span>
      <span><strong>Mã QR bao:</strong> <code class="text-green-700">{{ bagQrCode || bagSerial }}</code></span>
      <span><strong>Tổng gói:</strong> {{ packetCount }}</span>
    </div>

    <el-table :data="packets" border stripe size="small" v-loading="loading" max-height="400">
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

    <template #footer>
      <el-button @click="visible = false">Đóng</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { productionOrderApi } from '../api/productionOrderApi';

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
