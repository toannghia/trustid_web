<template>
  <div class="p-6 bg-white min-h-screen">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
      <div>
        <el-button link icon="Back" @click="router.back()" class="mb-2">Quay lại</el-button>
        <h2 class="text-xl font-bold uppercase text-gray-800">Quản Lý Đóng Bao - {{ orderId }}</h2>
        <p class="text-sm text-gray-500 mt-1">Liên kết mã gói vào mã bao và xử lý mã lỗi</p>
      </div>
      <div class="flex gap-2">
        <el-button type="success" @click="handleExportBagCodes" :loading="exporting">
          Xuất Mã Bao
        </el-button>
        <el-button type="primary" @click="handleCompleteOrder" :loading="completing">
          Hoàn Thành Lệnh
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="custom-tabs">
      <!-- Tab 1: Tiến độ Đóng Bao -->
      <el-tab-pane label="Tiến Độ Đóng Bao" name="progress">
        <div class="mt-4" v-loading="loading">
          <div class="flex justify-between mb-4">
             <h3 class="text-lg font-semibold text-gray-700">Danh Sách Các Bao</h3>
             <el-button icon="Refresh" @click="fetchLotMappings" circle></el-button>
          </div>
          
          <el-table :data="lotMappings" border stripe>
            <el-table-column prop="groupIndex" label="Lô (Group)" width="100" align="center" />
            <el-table-column label="Mã Gói (Từ - Đến)">
              <template #default="{ row }">
                <span class="font-mono text-blue-600">{{ row.packetSerialStart }}</span>
                -
                <span class="font-mono text-blue-600">{{ row.packetSerialEnd }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="packetCount" label="Số lượng gói" width="120" align="center" />
            <el-table-column prop="bagSerial" label="Mã Bao (Serial)" align="center">
              <template #default="{ row }">
                <span v-if="row.bagSerial" class="font-mono font-bold text-green-600">{{ row.bagSerial }}</span>
                <span v-else class="text-gray-400 italic">Chưa liên kết</span>
              </template>
            </el-table-column>
            <el-table-column prop="lotStatus" label="Trạng thái" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="row.lotStatus === 'LINKED' ? 'success' : (row.lotStatus === 'DISSOLVED' ? 'danger' : 'warning')">
                  {{ row.lotStatus }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- Tab 2: Quét Mã Đóng Bao -->
      <el-tab-pane label="Quét Mã Đóng Bao" name="link">
        <div class="mt-4 max-w-2xl bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div class="mb-4 text-sm text-gray-600">
            <strong>Hướng dẫn:</strong> Quét một mã gói bất kỳ thuộc lô cần đóng và mã của bao lớn tương ứng để tạo liên kết tự động cho toàn bộ lô.
          </div>
          <el-form :model="linkForm" :rules="linkRules" ref="linkFormRef" label-position="top">
            <el-form-item label="Quét Mã Gói (Bất kỳ mã nào trong bao)" prop="packet_code">
              <el-input v-model="linkForm.packet_code" placeholder="Quét/Nhập mã gói bất kỳ" class="font-mono text-lg" size="large" />
            </el-form-item>
            
            <el-form-item label="Quét Mã Bao Lớn (Mã có hậu tố -B)" prop="bag_code" class="mt-4">
              <el-input v-model="linkForm.bag_code" placeholder="Quét/Nhập mã bao" class="font-mono text-lg" size="large" />
            </el-form-item>

            <el-form-item class="mt-6 text-right">
              <el-button type="primary" @click="submitLinkBag" :loading="linking" size="large" class="w-full">
                Xác Nhận Liên Kết
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- Tab 3: Thay Thế Mã Gói -->
      <el-tab-pane label="Thay Thế Mã Lỗi" name="replace">
         <div class="mt-4 max-w-2xl bg-orange-50 p-6 rounded-lg border border-orange-200">
          <div class="mb-4 text-sm text-orange-700">
            <strong>Lưu ý:</strong> Sử dụng chức năng này khi một gói trong quy trình đóng bao bị hỏng (rách, in mờ, v.v.). Bạn có thể thay thế bằng một gói dự phòng hoặc một gói từ lô chưa đóng bao.
          </div>
          <el-form :model="replaceForm" :rules="replaceRules" ref="replaceFormRef" label-position="top">
            <el-form-item label="Mã Serial Hỏng (Cần thay thế)" prop="damaged_serial">
              <el-input v-model="replaceForm.damaged_serial" placeholder="Quét/Nhập serial gói hỏng" class="font-mono" />
            </el-form-item>
            
            <el-form-item label="Mã Serial Mới (Thay thế)" prop="replacement_serial" class="mt-4">
              <el-input v-model="replaceForm.replacement_serial" placeholder="Quét/Nhập serial gói mới" class="font-mono" />
            </el-form-item>

            <el-form-item label="Lý do thay thế" prop="reason" class="mt-4">
              <el-input v-model="replaceForm.reason" type="textarea" :rows="2" placeholder="Ví dụ: Rách nhãn, mã mờ..." />
            </el-form-item>

            <el-form-item class="mt-6 text-right">
              <el-button type="warning" @click="submitReplacePacket(false)" :loading="replacing" size="large" class="w-full">
                Xác Nhận Thay Thế
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus';
import { productionOrderApi } from '../api/productionOrderApi';

const route = useRoute();
const router = useRouter();
const orderId = route.params.id as string;

const activeTab = ref('progress');
const loading = ref(false);
const lotMappings = ref<any[]>([]);

// Link Form State
const linkFormRef = ref<FormInstance>();
const linking = ref(false);
const linkForm = reactive({
  packet_code: '',
  bag_code: ''
});
const linkRules = {
  packet_code: [{ required: true, message: 'Vui lòng nhập/quét mã gói', trigger: 'blur' }],
  bag_code: [{ required: true, message: 'Vui lòng nhập/quét mã bao', trigger: 'blur' }]
};

// Replace Form State
const replaceFormRef = ref<FormInstance>();
const replacing = ref(false);
const replaceForm = reactive({
  damaged_serial: '',
  replacement_serial: '',
  reason: ''
});
const replaceRules = {
  damaged_serial: [{ required: true, message: 'Vui lòng nhập mã lỗi', trigger: 'blur' }],
  replacement_serial: [{ required: true, message: 'Vui lòng nhập mã thay thế', trigger: 'blur' }],
  reason: [{ required: true, message: 'Vui lòng nhập lý do', trigger: 'blur' }]
};

// Action States
const completing = ref(false);
const exporting = ref(false);

const fetchLotMappings = async () => {
  loading.value = true;
  try {
    const { data } = await productionOrderApi.getLotMappings(orderId);
    lotMappings.value = data.data || data;
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Không thể tải tiến độ đóng bao');
  } finally {
    loading.value = false;
  }
};

const submitLinkBag = () => {
  if (!linkFormRef.value) return;
  linkFormRef.value.validate(async (valid) => {
    if (valid) {
      linking.value = true;
      try {
        await productionOrderApi.linkBag(orderId, {
          packet_code: linkForm.packet_code.trim(),
          bag_code: linkForm.bag_code.trim()
        });
        ElMessage.success('Liên kết thành công');
        linkFormRef.value.resetFields();
        fetchLotMappings();
        activeTab.value = 'progress';
      } catch (error: any) {
        ElMessage.error(error?.response?.data?.message || 'Liên kết thất bại');
      } finally {
        linking.value = false;
      }
    }
  });
};

const submitReplacePacket = (confirmDissolve = false) => {
  if (!replaceFormRef.value) return;
  replaceFormRef.value.validate(async (valid) => {
    if (valid) {
      replacing.value = true;
      try {
        const { data } = await productionOrderApi.replacePacket(orderId, {
          damaged_serial: replaceForm.damaged_serial.trim(),
          replacement_serial: replaceForm.replacement_serial.trim(),
          reason: replaceForm.reason.trim(),
          confirm_dissolve: confirmDissolve
        });
        
        if (data && data.requires_confirmation) {
          ElMessageBox.confirm(
            data.warning || 'Mã thay thế nằm ở lô khác và sẽ gây hủy lô đó. Bạn có đồng ý?',
            'Cảnh báo thay thế',
            { confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy', type: 'warning' }
          ).then(() => {
            submitReplacePacket(true);
          }).catch(() => {
            replacing.value = false;
          });
          return;
        }

        ElMessage.success('Thay thế mã gói thành công');
        replaceFormRef.value.resetFields();
        fetchLotMappings();
        activeTab.value = 'progress';
      } catch (error: any) {
        ElMessage.error(error?.response?.data?.message || 'Thay thế thất bại');
      } finally {
        replacing.value = false;
      }
    }
  });
};

const handleCompleteOrder = async () => {
  ElMessageBox.confirm(
    'Hoàn thành lệnh sản xuất sẽ thu hồi các mã chưa sử dụng và chốt số lượng. Tiếp tục?',
    'Xác nhận hoàn thành',
    { confirmButtonText: 'Đồng ý', cancelButtonText: 'Hủy', type: 'warning' }
  ).then(async () => {
    completing.value = true;
    try {
      await productionOrderApi.completeBagOrder(orderId);
      ElMessage.success('Lệnh sản xuất đã được hoàn thành');
      router.push('/supply/production-orders');
    } catch (error: any) {
      ElMessage.error(error?.response?.data?.message || 'Hoàn thành thất bại');
    } finally {
      completing.value = false;
    }
  }).catch(() => {});
};

const handleExportBagCodes = async () => {
  exporting.value = true;
  try {
    const res = await productionOrderApi.exportBagCodesExcel(orderId);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ma_bao_${orderId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  } catch (error: any) {
    ElMessage.error('Xuất file thất bại');
  } finally {
    exporting.value = false;
  }
};

onMounted(() => {
  fetchLotMappings();
});
</script>

<style scoped>
.custom-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 600;
}
</style>
