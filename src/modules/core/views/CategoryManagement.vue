<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { categoryApi } from '../api/category';
import { ElMessage, ElMessageBox } from 'element-plus'; // Keep ElMessageBox here
import { useAuthStore } from '../store/auth';

const authStore = useAuthStore();
const categoryTree = ref<any[]>([]);
const loading = ref(false);
const filterText = ref('');
const showSharedOnly = ref(false);
const treeRef = ref<any>(null);

const isAdmin = ref(authStore.user?.role === 'ADMIN');

watch([filterText, showSharedOnly], () => {
  treeRef.value?.filter({
    text: filterText.value,
    sharedOnly: showSharedOnly.value
  });
});

const filterNode = (query: any, data: any) => {
  const matchesSearch = query.text ? data.name.toLowerCase().includes(query.text.toLowerCase()) : true;
  
  // Logic: Nếu bật "Chỉ hiện danh mục dùng chung", thì lọc những thằng có tenant === null
  const isShared = !data.tenant && !data.tenantId;
  const isSharedMatch = query.sharedOnly ? isShared : true;
  
  return matchesSearch && isSharedMatch;
};

const fetchCategories = async () => {
  loading.value = true;
  try {
    const { data } = await categoryApi.getTree();
    categoryTree.value = data;
  } finally {
    loading.value = false;
  }
};

const handleEditCategory = (nodeData: any) => {
  ElMessageBox.prompt('Sửa tên danh mục:', 'Cập nhật danh mục', {
    confirmButtonText: 'Lưu',
    cancelButtonText: 'Hủy',
    inputValue: nodeData.name,
    inputPattern: /\S+/,
    inputErrorMessage: 'Tên danh mục không được để trống'
  }).then(async ({ value }) => {
    try {
      await categoryApi.update(nodeData.id, {
        name: value,
        parentId: nodeData.parentId
      });
      ElMessage.success('Cập nhật thành công');
      fetchCategories();
    } catch (error) {
       ElMessage.error('Có lỗi xảy ra');
    }
  });
};

const handleAddCategory = (nodeData: any) => {
  ElMessageBox.prompt('Nhập tên danh mục:', nodeData ? 'Thêm danh mục con' : 'Thêm danh mục gốc', {
    confirmButtonText: 'Xác nhận',
    cancelButtonText: 'Hủy',
    inputPattern: /\S+/,
    inputErrorMessage: 'Tên danh mục không được để trống'
  }).then(async ({ value }) => {
    try {
      await categoryApi.create({
        name: value,
        parentId: nodeData ? nodeData.id : null, 
      });
      ElMessage.success('Thêm danh mục thành công');
      fetchCategories();
    } catch (error) {
       ElMessage.error('Có lỗi xảy ra');
    }
  });
};

const handleDeleteCategory = (nodeData: any) => {
  ElMessageBox.confirm(
    `Bạn có chắc chắn muốn xóa danh mục "${nodeData.name}"?`,
    'Cảnh báo',
    {
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await categoryApi.delete(nodeData.id);
        ElMessage.success('Xóa danh mục thành công');
        fetchCategories();
      } catch (error) {
        ElMessage.error('Không thể xóa danh mục này');
      }
    });
};

onMounted(fetchCategories);
</script>

<template>
  <div class="p-6 bg-white rounded shadow">
    <div class="flex flex-col gap-4 mb-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-bold">Cây danh mục ngành hàng</h2>
        <el-button v-if="isAdmin" type="primary" @click="handleAddCategory(null)">
          Thêm danh mục gốc
        </el-button>
      </div>

      <!-- Chú thích màu sắc (Legend) -->
      <div class="flex gap-4 p-3 bg-gray-50 rounded border border-gray-100 items-center">
        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phân loại:</span>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-indigo-600"></div>
          <span class="text-sm text-indigo-700 font-medium">Danh mục dùng chung (Admin tạo)</span>
        </div>
        <div class="flex items-center gap-2 ml-2">
          <div class="w-3 h-3 rounded-full bg-emerald-600"></div>
          <span class="text-sm text-emerald-700 font-medium">Danh mục của doanh nghiệp (Tenant)</span>
        </div>
      </div>

      <div class="flex items-center gap-4 mt-2">
        <el-input v-model="filterText" placeholder="Tìm kiếm danh mục..." class="flex-1" />
        <div class="flex items-center gap-2 whitespace-nowrap">
          <span class="text-sm text-gray-500">Chỉ hiện danh mục hệ thống:</span>
          <el-switch v-model="showSharedOnly" />
        </div>
      </div>
    </div>

    <el-tree
      ref="treeRef"
      :data="categoryTree"
      :props="{ label: 'name', children: 'children' }"
      node-key="id"
      default-expand-all
      v-loading="loading"
      :filter-node-method="filterNode"
      class="custom-category-tree"
    >
      <template #default="{ node, data }">
        <div class="flex justify-between w-full pr-4 items-center h-10">
          <div class="flex items-center gap-3">
            <span :class="[
              { 'font-bold text-base': node.level === 1 },
              (!data.tenant && !data.tenantId) ? 'text-indigo-700' : 'text-emerald-700'
            ]">
              {{ node.label }}
            </span>
            
            <el-tag 
              v-if="!data.tenant && !data.tenantId" 
              size="small" 
              effect="plain" 
              type="primary"
              class="ml-2"
            >
              Hệ thống
            </el-tag>
            <el-tag 
              v-else 
              size="small" 
              effect="plain" 
              type="success"
              class="ml-2"
            >
              <span v-if="isAdmin">{{ data.tenant?.name || 'Doanh nghiệp' }}</span>
              <span v-else>Của bạn</span>
            </el-tag>
          </div>

          <div class="flex gap-1">
            <el-button v-if="isAdmin" type="primary" link size="small" @click.stop="handleEditCategory(data)">Sửa</el-button>
            <el-button type="primary" link size="small" @click.stop="handleAddCategory(data)">Thêm con</el-button>
            <el-button 
              v-if="isAdmin && (!data.children || data.children.length === 0)" 
              type="danger" link size="small"
              @click.stop="handleDeleteCategory(data)">
              Xóa
            </el-button>
          </div>
        </div>
      </template>
    </el-tree>
  </div>
</template>