<template>
  <div class="dealer-groups p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Nhóm Khách Hàng</h2>
      <div class="flex gap-2">
        <el-button type="primary" @click="showForm()">
          <el-icon class="mr-1"><Plus /></el-icon>Thêm nhóm
        </el-button>
        <el-button @click="$router.push('/dealer/customers')" plain>
          <el-icon class="mr-1"><User /></el-icon>Quản lý KH
        </el-button>
      </div>
    </div>

    <el-card shadow="hover">
      <el-table :data="groups" style="width: 100%" v-loading="loading" empty-text="Chưa có nhóm nào">
        <el-table-column type="index" width="60" label="STT" align="center" />
        <el-table-column label="Tên Nhóm" min-width="200">
          <template #default="{ row }">
            <el-tag :color="row.color" effect="dark" style="border: none; font-weight: 600;">
              {{ row.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="Mô tả" min-width="250">
          <template #default="{ row }">
            <span class="text-gray-500">{{ row.description || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Chiết khấu mặc định" width="170" align="center">
          <template #default="{ row }">
            <span v-if="Number(row.discountPercent) > 0" class="font-bold text-green-600">
              -{{ row.discountPercent }}%
            </span>
            <span v-else class="text-gray-400">0%</span>
          </template>
        </el-table-column>
        <el-table-column label="Số KH" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.customerCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Thao tác" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showForm(row)">Sửa</el-button>
            <el-button type="warning" link @click="$router.push(`/dealer/pricing?groupId=${row.id}`)">Bảng giá</el-button>
            <el-button type="danger" link @click="deleteGroup(row)">Xóa</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Dialog Thêm/Sửa Nhóm -->
    <el-dialog
      v-model="dialogVisible"
      :close-on-click-modal="false"
      :show-close="false"
      width="450px"
      class="branded-customer-dialog"
      destroy-on-close
    >
      <template #header>
        <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
          <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
          <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
          <span style="color: #ffffff; font-size: 16px; font-weight: 600;">
            {{ form.id ? 'Sửa Nhóm KH' : 'Thêm Nhóm KH' }}
          </span>
          <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="dialogVisible = false">
            <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
          </div>
        </div>
      </template>
      <el-form :model="form" label-position="top" @submit.prevent style="padding: 24px 24px 8px;">
        <el-form-item label="Tên nhóm" required>
          <el-input v-model="form.name" placeholder="VD: Khách VIP, Đại lý cấp 2..." />
        </el-form-item>
        <el-form-item label="Mô tả">
          <el-input v-model="form.description" type="textarea" placeholder="Mô tả ngắn về nhóm..." />
        </el-form-item>
        <el-form-item label="Chiết khấu mặc định (%)">
          <el-input-number v-model="form.discountPercent" :min="0" :max="100" :precision="1" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Màu nhãn">
          <div class="color-picker-grid">
            <div
              v-for="c in colorPresets"
              :key="c"
              :style="{ backgroundColor: c }"
              class="color-swatch"
              :class="{ active: form.color === c }"
              @click="form.color = c"
            ></div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
          <el-button @click="dialogVisible = false" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
          <el-button type="primary" @click="save" :loading="saving" style="background: #00875A; border-color: #00875A; border-radius: 8px; padding: 10px 20px;">
            Lưu
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus, User } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

const groups = ref<any[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);

const colorPresets = [
  '#1890ff', '#00875A', '#FF6B35', '#E53935',
  '#8E24AA', '#FB8C00', '#00ACC1', '#546E7A'
];

const form = ref({
  id: '',
  name: '',
  description: '',
  discountPercent: 0,
  color: '#1890ff'
});

const loadGroups = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/customer-groups');
    groups.value = data;
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi tải nhóm KH');
  } finally {
    loading.value = false;
  }
};

const showForm = (row?: any) => {
  if (row) {
    form.value = {
      id: row.id,
      name: row.name,
      description: row.description || '',
      discountPercent: Number(row.discountPercent) || 0,
      color: row.color || '#1890ff'
    };
  } else {
    form.value = { id: '', name: '', description: '', discountPercent: 0, color: '#1890ff' };
  }
  dialogVisible.value = true;
};

const save = async () => {
  if (!form.value.name?.trim()) {
    ElMessage.warning('Vui lòng nhập tên nhóm');
    return;
  }
  saving.value = true;
  try {
    if (form.value.id) {
      await api.put(`/customer-groups/${form.value.id}`, form.value);
    } else {
      await api.post('/customer-groups', form.value);
    }
    ElMessage.success('Lưu thành công');
    dialogVisible.value = false;
    loadGroups();
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || 'Lỗi khi lưu');
  } finally {
    saving.value = false;
  }
};

const deleteGroup = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `Xóa nhóm "${row.name}"? Tất cả KH thuộc nhóm này sẽ trở về không có nhóm.`,
      'Xác nhận xóa',
      { confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', type: 'warning' }
    );
    await api.delete(`/customer-groups/${row.id}`);
    ElMessage.success('Đã xóa nhóm');
    loadGroups();
  } catch { /* cancelled */ }
};

onMounted(() => {
  loadGroups();
});
</script>

<style scoped>
.color-picker-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s;
}
.color-swatch:hover {
  transform: scale(1.15);
}
.color-swatch.active {
  border-color: #333;
  box-shadow: 0 0 0 2px rgba(0,0,0,0.15);
  transform: scale(1.1);
}
</style>

<style>
.branded-customer-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-customer-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-customer-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-customer-dialog .el-dialog__footer {
  padding: 0 !important;
  border-top: none !important;
}
</style>
