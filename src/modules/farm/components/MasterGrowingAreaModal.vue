<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? 'Cập nhật Vùng trồng' : 'Thêm Mã Vùng Trồng Nhanh'"
    width="800px"
    @closed="handleClosed"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Mã vùng trồng" prop="code">
            <el-input v-model="form.code" placeholder="Nhập mã vùng (VD: MVT-01)" :disabled="isEdit" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Tên vùng trồng" prop="name">
            <el-input v-model="form.name" placeholder="Nhập tên vùng (VD: Vùng Trồng Vải Lục Ngạn)" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Tỉnh/Thành phố" prop="province">
            <el-select v-model="form.province" placeholder="Chọn Tỉnh" @change="onProvinceChange" filterable allow-create class="w-full">
                <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Phường/Xã" prop="ward">
            <el-select v-model="form.ward" placeholder="Chọn Xã" filterable allow-create class="w-full" :disabled="!form.province">
                <el-option v-for="w in formWards" :key="w.name" :label="w.name" :value="w.name" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Địa chỉ chi tiết" prop="address">
        <el-input v-model="form.address" placeholder="Thôn, Xóm, Số nhà..." />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Đơn vị sở hữu" prop="ownerName">
            <el-input v-model="form.ownerName" placeholder="Tên đơn vị, HTX..." />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Người quản lý" prop="managerName">
            <el-input v-model="form.managerName" placeholder="Tên người quản lý chung" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="Loại cây trồng" prop="plantType">
            <el-input v-model="form.plantType" placeholder="VD: Lúa, Vải..." />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Giới hạn diện tích (m2)" prop="maxAreaM2">
            <el-input-number v-model="form.maxAreaM2" :min="1000" class="w-full" />
            <div class="text-xs text-gray-400 mt-1">Mặc định: 100,000 m2 (10ha)</div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Danh sách Đội trưởng" prop="leaderIds">
        <div class="flex items-center gap-2 w-full">
          <el-select v-model="form.leaderIds" multiple placeholder="Chọn các Đội trưởng phụ trách" filterable class="flex-1">
            <el-option v-for="u in teamLeaders" :key="u.id" :label="`${u.fullName} (${u.username})`" :value="u.id" />
          </el-select>
          <el-button type="success" plain @click="openQuickUserModal">
            <el-icon><Plus /></el-icon>
            Thêm Nhanh
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="Danh sách Nhân viên KCS" prop="kcsStaffIds">
        <el-select v-model="form.kcsStaffIds" multiple placeholder="Chọn Nhân viên KCS phụ trách (Tùy chọn)" filterable class="w-full">
          <el-option v-for="u in kcsStaffs" :key="u.id" :label="`${u.fullName} (${u.username})`" :value="u.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Hủy</el-button>
        <el-button type="primary" :loading="loading" @click="submitForm">{{ isEdit ? 'Cập nhật' : 'Tạo mới' }}</el-button>
      </span>
    </template>
  </el-dialog>
  
  <QuickUserModal ref="quickUserModalRef" role-name="TEAM_LEADER" @created="fetchLeaders" />
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { farmApi } from '../api/farmApi';

import { userApi } from '@/modules/core/api/user';
import { vietnamUnits } from '@/common/data/vietnam-units';
import { Plus } from '@element-plus/icons-vue';
import QuickUserModal from './QuickUserModal.vue';

const visible = ref(false);
const loading = ref(false);
const formRef = ref<FormInstance>();
const isEdit = ref(false);
const currentId = ref('');

const emit = defineEmits(['created', 'updated']);

const teamLeaders = ref<any[]>([]);
const kcsStaffs = ref<any[]>([]);
const provinces = ref(vietnamUnits);
const formWards = ref<any[]>([]);

const form = reactive({
  code: '',
  name: '',
  address: '',
  province: '',
  ward: '',
  ownerName: '',
  managerName: '',
  plantType: '',
  leaderIds: [] as string[],
  kcsStaffIds: [] as string[],
  maxAreaM2: 100000
});

const rules = reactive<FormRules>({
  code: [{ required: true, message: 'Vui lòng nhập mã', trigger: 'blur' }],
  name: [{ required: true, message: 'Vui lòng nhập tên', trigger: 'blur' }]
});

const onProvinceChange = () => {
  form.ward = '';
  loadWards();
};

const loadWards = () => {
  const prov = provinces.value.find(p => p.name === form.province);
  formWards.value = prov ? prov.wards : [];
};

const quickUserModalRef = ref<InstanceType<typeof QuickUserModal>>();

const openQuickUserModal = () => {
  quickUserModalRef.value?.open();
};

const fetchLeaders = async () => {
    try {
        const resLeader = await userApi.getList({ page: 1, limit: 1000, roleName: 'TEAM_LEADER' });
        const data = resLeader.data;
        teamLeaders.value = data?.data || data?.items || (Array.isArray(data) ? data : []);
    } catch (err) {}
};

const fetchKcsStaffs = async () => {
    try {
        const resKcs = await userApi.getList({ page: 1, limit: 1000, roleName: 'KCS_STAFF' });
        const data = resKcs.data;
        kcsStaffs.value = data?.data || data?.items || (Array.isArray(data) ? data : []);
    } catch (err) {}
};

const open = async (editData?: any) => {
  await fetchLeaders();
  await fetchKcsStaffs();
  
  if (editData) {
    isEdit.value = true;
    currentId.value = editData.id;
    form.code = editData.code || '';
    form.name = editData.name || '';
    form.address = editData.address || '';
    form.province = editData.province || '';
    form.ward = editData.ward || '';
    form.ownerName = editData.ownerName || '';
    form.managerName = editData.managerName || '';
    form.plantType = editData.plantType || '';
    form.maxAreaM2 = editData.maxAreaM2 || 100000;
    
    // Set leaderIds
    if (editData.leaders && editData.leaders.length > 0) {
      form.leaderIds = editData.leaders.map((l: any) => l.id);
    } else {
      form.leaderIds = [];
    }

    // Set kcsStaffIds
    if (editData.kcsStaffs && editData.kcsStaffs.length > 0) {
      form.kcsStaffIds = editData.kcsStaffs.map((k: any) => k.id);
    } else {
      form.kcsStaffIds = [];
    }

    loadWards();
  } else {
    isEdit.value = false;
    currentId.value = '';
    Object.assign(form, {
      code: '', name: '', address: '', province: '', ward: '',
      ownerName: '', managerName: '', plantType: '',
      leaderIds: [], maxAreaM2: 100000
    });
  }
  
  visible.value = true;
};

const handleClosed = () => {
  if (formRef.value) formRef.value.resetFields();
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
  } catch (e) {
    return; // Validation failed
  }

  loading.value = true;
  try {
    if (isEdit.value) {
        const { data } = await farmApi.updateMasterGrowingArea(currentId.value, form);
        ElMessage.success('Cập nhật mã vùng trồng thành công');
        visible.value = false;
        emit('updated', data);
    } else {
        const { data } = await farmApi.createMasterGrowingArea(form);
        ElMessage.success('Tạo mã vùng trồng thành công');
        visible.value = false;
        emit('created', data);
    }
  } catch (err: any) {
    console.error('Lỗi khi lưu vùng trồng:', err);
    const msg = err.response?.data?.message || err.message || 'Có lỗi xảy ra';
    ElMessage.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    loading.value = false;
  }
};

defineExpose({ open });
</script>
