<template>
  <div class="p-6 bg-white min-h-screen">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">📦 Kho dư bán thành phẩm</h2>
        <p class="text-sm text-gray-500 mt-1">Quản lý khối lượng dư thừa sau sơ chế, cho phép gộp đóng bao</p>
      </div>
      <el-button type="warning" plain size="small" :loading="expiring" @click="handleExpire">
        🕐 Xử lý hết hạn
      </el-button>
    </div>

    <div v-loading="loading">
      <div v-if="pools.length === 0" class="py-16 text-center text-gray-400">
        <el-icon size="48"><Box /></el-icon>
        <p class="mt-4 text-lg font-semibold">Chưa có kho dư nào</p>
        <p class="text-sm">Kho dư sẽ tự động tạo khi bạn ghi nhận dư thừa sau hoàn thành phiếu sản xuất</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <el-card
          v-for="pool in pools"
          :key="pool.id"
          shadow="hover"
          class="border-t-4 cursor-pointer hover:shadow-lg transition-shadow"
          :class="pool.availableWeightKg > 0 ? 'border-t-amber-400' : 'border-t-gray-300'"
          @click="openDetail(pool)"
        >
          <div class="flex justify-between items-start mb-3">
            <div>
              <span class="text-2xs text-gray-400 font-semibold block uppercase">Sản phẩm</span>
              <span class="font-bold text-gray-700 text-sm">{{ pool.product?.name || 'N/A' }}</span>
            </div>
            <el-tag :type="pool.availableWeightKg > 0 ? 'warning' : 'info'" size="small">
              {{ pool.availableEntryCount }} lần dư
            </el-tag>
          </div>

          <div class="space-y-2 text-xs text-gray-600">
            <div class="flex justify-between">
              <span>Tổng dư khả dụng:</span>
              <strong class="text-amber-600 text-base">{{ pool.availableWeightKg.toFixed(1) }} kg</strong>
            </div>
            <div class="flex justify-between">
              <span>Tổng tích lũy:</span>
              <strong class="text-gray-700">{{ pool.totalWeightKg.toFixed(1) }} kg</strong>
            </div>
            <div class="flex justify-between">
              <span>Tổng hao hụt:</span>
              <strong class="text-orange-500">{{ pool.totalLossKg.toFixed(1) }} kg</strong>
            </div>
            <div class="flex justify-between">
              <span>Hạn sử dụng:</span>
              <strong class="text-gray-700">{{ pool.expiryDays }} ngày</strong>
            </div>
          </div>

          <div v-if="pool.availableWeightKg > 0" class="mt-4 pt-3 border-t border-gray-100">
            <el-button
              type="warning"
              size="small"
              class="w-full"
              @click.stop="openCreateOrder(pool)"
            >
              🔄 Đóng bao từ dư
            </el-button>
          </div>
        </el-card>
      </div>
    </div>

    <!-- Pool Detail Dialog -->
    <el-dialog
      v-model="detailVisible"
      width="1150px"
      @closed="selectedPool = null"
      class="branded-surplus-dialog"
      :show-close="false"
      style="padding: 0; --el-border-radius-base: 8px;"
    >
      <template #header="{ close }">
        <div style="background-color: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%; border-radius: 8px 8px 0 0;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
          <div>
            <h3 style="margin: 0; color: white; font-size: 16px; font-weight: 600;">Chi tiết kho dư</h3>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">{{ selectedPool?.product?.name || '' }}</p>
          </div>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="close">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>

      <div v-if="selectedPool" class="space-y-4" style="padding: 24px 24px 8px;">
        <!-- Pool summary -->
        <div class="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-xs">
          <div>
            <span class="text-gray-400 font-semibold block uppercase">Khả dụng</span>
            <strong class="text-amber-600 text-lg">{{ selectedPool.availableWeightKg?.toFixed(1) }} kg</strong>
          </div>
          <div>
            <span class="text-gray-400 font-semibold block uppercase">Tổng tích lũy</span>
            <strong class="text-gray-700 text-lg">{{ selectedPool.totalWeightKg?.toFixed(1) }} kg</strong>
          </div>
          <div>
            <span class="text-gray-400 font-semibold block uppercase">Tổng hao hụt</span>
            <strong class="text-orange-500 text-lg">{{ selectedPool.totalLossKg?.toFixed(1) }} kg</strong>
          </div>
          <div>
            <span class="text-gray-400 font-semibold block uppercase">Hạn (ngày)</span>
            <div class="flex items-center gap-2">
              <el-input-number
                v-model="editExpiryDays"
                :min="1"
                :max="365"
                size="small"
                controls-position="right"
                style="width: 100px;"
              />
              <el-button
                v-if="editExpiryDays !== selectedPool.expiryDays"
                type="primary"
                size="small"
                @click="saveExpiry"
              >
                Lưu
              </el-button>
            </div>
          </div>
        </div>

        <!-- Entries table -->
        <el-table :data="detailEntries" stripe size="small" max-height="400">
          <el-table-column label="Mã Lô Nguồn" min-width="200">
            <template #default="{ row }">
              <el-tag size="small" type="warning" effect="plain" class="font-mono">
                {{ row.sourceBatchCode || row.sourceOrder?.sourceBatch?.batchCode || row.sourceOrder?.orderCode || 'N/A' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Nguồn (Lệnh SX)" min-width="130">
            <template #default="{ row }">
              <span class="font-mono text-xs">{{ row.sourceOrder?.orderCode || row.sourceOrderId?.slice(0, 8) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="KL vào" width="80" align="right">
            <template #default="{ row }">
              <span class="text-xs">{{ row.inputWeightKg?.toFixed(1) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="KL ra" width="80" align="right">
            <template #default="{ row }">
              <span class="text-xs">{{ row.outputWeightKg?.toFixed(1) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Tính" width="70" align="right">
            <template #default="{ row }">
              <span class="text-xs text-gray-500">{{ row.calculatedWeightKg?.toFixed(1) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Thực tế" width="80" align="right">
            <template #default="{ row }">
              <strong class="text-xs text-amber-600">{{ row.actualWeightKg?.toFixed(1) }}</strong>
            </template>
          </el-table-column>
          <el-table-column label="Hao hụt" width="80" align="right">
            <template #default="{ row }">
              <span class="text-xs text-orange-500">{{ row.lossWeightKg?.toFixed(1) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Trạng thái" width="100" align="center">
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'AVAILABLE' ? 'success' : row.status === 'USED' ? 'info' : 'danger'"
                size="small"
              >
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Ngày" width="100" align="center">
            <template #default="{ row }">
              <span class="text-2xs text-gray-500">{{ formatDate(row.createdAt) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Hết hạn" width="100" align="center">
            <template #default="{ row }">
              <span class="text-2xs" :class="isExpiringSoon(row) ? 'text-red-500 font-bold' : 'text-gray-400'">
                {{ formatDate(row.expiresAt) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
        <!-- Footer Actions -->
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;">
          <el-button @click="detailVisible = false" style="border-radius: 8px; padding: 10px 20px;">Đóng</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Box, Close } from '@element-plus/icons-vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { surplusApi } from '../api/surplusApi';
import dayjs from 'dayjs';

const router = useRouter();
const loading = ref(false);
const expiring = ref(false);
const pools = ref<any[]>([]);

const detailVisible = ref(false);
const selectedPool = ref<any>(null);
const detailEntries = ref<any[]>([]);
const editExpiryDays = ref(30);

const loadPools = async () => {
  loading.value = true;
  try {
    const { data } = await surplusApi.listPools();
    pools.value = data;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || 'Lỗi khi tải danh sách kho dư');
  } finally {
    loading.value = false;
  }
};

const openDetail = async (pool: any) => {
  selectedPool.value = pool;
  editExpiryDays.value = pool.expiryDays;
  detailVisible.value = true;

  try {
    const { data } = await surplusApi.getPoolDetail(pool.id);
    selectedPool.value = { ...pool, ...data };
    detailEntries.value = data.entries || [];
  } catch (e: any) {
    ElMessage.error('Lỗi khi tải chi tiết kho dư');
  }
};

const saveExpiry = async () => {
  if (!selectedPool.value) return;
  try {
    await surplusApi.updateExpiry(selectedPool.value.id, editExpiryDays.value);
    selectedPool.value.expiryDays = editExpiryDays.value;
    ElMessage.success(`Đã cập nhật hạn sử dụng: ${editExpiryDays.value} ngày`);
    await loadPools();
  } catch (e: any) {
    ElMessage.error('Lỗi khi cập nhật hạn');
  }
};

const openCreateOrder = (pool: any) => {
  // Navigate to create order with surplus source pre-selected
  router.push({
    path: '/supply/production-orders',
    query: { surplusPoolId: pool.id, surplusProductId: pool.productId },
  });
};

const handleExpire = async () => {
  expiring.value = true;
  try {
    const { data } = await surplusApi.expireOldEntries();
    ElMessage.success(`Đã xử lý ${data.expiredCount || 0} phần dư hết hạn`);
    await loadPools();
  } catch (e: any) {
    ElMessage.error('Lỗi khi xử lý hết hạn');
  } finally {
    expiring.value = false;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'AVAILABLE': return 'Khả dụng';
    case 'USED': return 'Đã dùng';
    case 'EXPIRED': return 'Hết hạn';
    default: return status;
  }
};

const formatDate = (d: string) => {
  if (!d) return 'N/A';
  return dayjs(d).format('DD/MM/YYYY');
};

const isExpiringSoon = (entry: any) => {
  if (!entry.expiresAt) return false;
  return dayjs(entry.expiresAt).diff(dayjs(), 'day') <= 3;
};

onMounted(loadPools);
</script>

<style>
.branded-surplus-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-surplus-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-surplus-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-surplus-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
