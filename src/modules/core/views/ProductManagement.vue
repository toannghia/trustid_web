<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { productApi } from '../api/product';
import { categoryApi } from '../api/category';
import { tenantApi } from '../api/tenant';
import { useAuthStore } from '../store/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Plus, Search, OfficeBuilding, Loading, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import ProductFormModal from '../components/ProductFormModal.vue';

const authStore = useAuthStore();
const products = ref([]);
const categories = ref([]); 
const tenants = ref<any[]>([]);
const showModal = ref(false);
const isEdit = ref(false);
const editingProduct = ref<any>(null);
const searchTerm = ref('');

const isSystemAdmin = computed(() => {
    return authStore.user?.role === 'ADMIN';
});

const filter = reactive({
    tenant_id: '',
    category_id: ''
});

const handleCreate = () => {
    isEdit.value = false;
    editingProduct.value = null;
    showModal.value = true;
};

const handleEdit = (row: any) => {
    isEdit.value = true;
    editingProduct.value = row;
    showModal.value = true;
};

const handleDelete = async (row: any) => {
  ElMessageBox.confirm(
    'Bạn có chắc chắn muốn xóa sản phẩm này không?',
    {
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await productApi.delete(row.id);
        ElMessage.success('Xóa sản phẩm thành công');
        fetchProducts();
      } catch (error) {
         ElMessage.error('Xóa thất bại');
      }
    })
    .catch(() => {});
};

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.veritrust.vn';
    return `${baseUrl}${path}`;
};

const fetchProducts = async () => {
    try {
        const { data } = await productApi.getList({}); 
        products.value = data.data || data.items || data || [];
    } catch (e: any) {
        console.error(e);
        ElMessage.error('Lỗi tải sản phẩm: ' + (e.response?.data?.message || e.message));
    }
};

const fetchCategories = async () => {
    try {
        const { data } = await categoryApi.getTree();
        categories.value = data.data || data || [];
    } catch(e) {}
};

// Recursive helper to get all category IDs including children
const getAllCategoryIds = (catId: string, categoryList: any[]): string[] => {
    const ids = [catId];
    
    const findNode = (nodes: any[], id: string): any => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };
    
    const targetNode = findNode(categoryList, catId);
    if (!targetNode) return ids;

    const traverse = (node: any) => {
        ids.push(node.id);
        if (node.children) {
            node.children.forEach(traverse);
        }
    };
    
    if (targetNode.children) {
        targetNode.children.forEach(traverse);
    }
    
    return [...new Set(ids)];
};

const filteredProducts = computed(() => {
    let result = products.value;

    if (searchTerm.value) {
        const lower = searchTerm.value.toLowerCase();
        result = result.filter((p: any) => 
            p.name?.toLowerCase().includes(lower) || 
            p.gtinCode?.toLowerCase().includes(lower)
        );
    }

    if (filter.tenant_id) {
        result = result.filter((p: any) => p.tenant?.id === filter.tenant_id || p.tenantId === filter.tenant_id);
    }

    if (filter.category_id) {
        const relevantIds = getAllCategoryIds(filter.category_id, categories.value);
        result = result.filter((p: any) => {
             const pCatId = p.category?.id || p.categoryId;
             return relevantIds.includes(pCatId);
        });
    }

    return result;
});

// Detail Modal
const showDetailModal = ref(false);
const selectedProduct = ref<any>(null);

const openDetail = (row: any) => {
    selectedProduct.value = row;
    showDetailModal.value = true;
};

const getNdaTooltip = (row: any) => {
    if (row.ndaSyncStatus === 'WAITING') return 'Đang đồng bộ với hệ thống Quốc gia...';
    if (row.ndaSyncStatus === 'SYNCED') return 'Đã xác thực quốc gia (NDA)';
    if (row.ndaSyncStatus === 'FAILED') return 'Lỗi đồng bộ: ' + (row.ndaErrorMsg || 'Không xác định');
    return 'Chưa đồng bộ';
};

const handleRetryNda = async (row: any) => {
    try {
        await productApi.update(row.id, { retryNda: true }); // Assuming backend supports this trigger or just update triggers sync
        ElMessage.success('Đã gửi yêu cầu đồng bộ lại');
        fetchProducts();
    } catch (e) {
        ElMessage.error('Lỗi khi gửi yêu cầu');
    }
};

onMounted(() => {
    fetchProducts();
    fetchCategories();
    if (isSystemAdmin.value) {
         tenantApi.getAll({}).then(res => {
             tenants.value = res.data.data || res.data || [];
         }).catch(() => {});
    }
});

</script>

<template>
  <div>
    <LTEContentHeader title="Quản lý Sản phẩm" :breadcrumbs="[{ title: 'Products' }]" />

    <LTECard variant="primary" outline>
    <div class="mb-4 flex flex-wrap gap-2 items-center justify-between">
            <div class="flex gap-2">
                 <el-input v-model="searchTerm" placeholder="Tìm kiếm theo tên, GTIN..." :prefix-icon="Search" class="w-64" clearable />
                 
                 <el-select v-if="isSystemAdmin" v-model="filter.tenant_id" placeholder="Lọc theo Doanh nghiệp" clearable class="w-56" filterable>
                     <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
                 </el-select>

                 <el-tree-select 
                    v-model="filter.category_id" 
                    :data="categories" 
                    :props="{ label: 'name', value: 'id' }" 
                    placeholder="Lọc theo Danh mục" 
                    class="w-56" 
                    check-strictly 
                    clearable 
                />
            </div>
            
            <el-button type="primary" :icon="Plus" @click="handleCreate">Thêm sản phẩm</el-button>
        </div>

        <el-table :data="filteredProducts" class="w-full" stripe border>
        <el-table-column type="index" label="STT" width="60" align="center" />
        <el-table-column label="Ảnh" width="80" align="center">
            <template #default="scope">
                <el-image 
                    v-if="scope.row.images && scope.row.images.length > 0"
                    style="width: 50px; height: 50px"
                    :src="getImageUrl(scope.row.images[0])"
                    :preview-src-list="scope.row.images.map((img: string) => getImageUrl(img))"
                    fit="cover"
                    preview-teleported
                />
                <div v-else class="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No Img</div>
            </template>
        </el-table-column>
        <el-table-column prop="gtinCode" label="Mã GTIN" width="150">
            <template #default="scope">
                <span class="text-blue-600 cursor-pointer hover:underline font-medium" @click="openDetail(scope.row)">
                    {{ scope.row.gtinCode }}
                </span>
            </template>
        </el-table-column>
        <el-table-column prop="name" label="Tên sản phẩm" min-width="200">
             <template #default="scope">
                <span class="text-blue-600 cursor-pointer hover:underline font-bold" @click="openDetail(scope.row)">
                    {{ scope.row.name }}
                </span>
            </template>
        </el-table-column>
        <el-table-column label="Giá bán" width="120" align="right">
             <template #default="scope">
                <span v-if="scope.row.price" class="font-mono">{{ Number(scope.row.price).toLocaleString() }} đ</span>
                <span v-else class="text-gray-400">-</span>
            </template>
        </el-table-column>
        
        <el-table-column label="Danh mục" min-width="150">
            <template #default="scope">
                <el-tag size="small" type="info">{{ scope.row.category?.name || '---' }}</el-tag>
            </template>
        </el-table-column>
        <el-table-column label="Quy cách" width="100" align="center">
            <template #default="scope">
                <span v-if="scope.row.netWeight">{{ scope.row.netWeight }} {{ scope.row.weightUnit }}</span>
                <span v-else class="text-gray-400">---</span>
            </template>
        </el-table-column>
                <el-table-column v-if="isSystemAdmin" label="Doanh nghiệp" min-width="150">
             <template #default="scope">
                <div class="flex items-center gap-1 text-gray-600">
                    <el-icon><OfficeBuilding /></el-icon>
                    <span>{{ scope.row.tenant?.name || '---' }}</span>
                </div>
            </template>
        </el-table-column>

        <!-- NDA Status Column -->
        <el-table-column label="Trạng thái NDA" width="140" align="center">
            <template #default="{ row }">
                 <div v-if="!row.tenant?.isNdaEnabled && !row.isNdaEnabled" class="text-gray-300 text-xs">---</div>
                 <div v-else>
                     <el-tooltip :content="getNdaTooltip(row)" placement="top">
                         <div class="flex items-center justify-center gap-1 cursor-help">
                             <el-icon v-if="row.ndaSyncStatus === 'WAITING'" class="text-yellow-500 is-loading" size="18"><Loading /></el-icon>
                             <el-icon v-else-if="row.ndaSyncStatus === 'SYNCED'" class="text-green-500" size="18"><CircleCheckFilled /></el-icon>
                             <el-icon v-else-if="row.ndaSyncStatus === 'FAILED'" class="text-red-500" size="18"><WarningFilled /></el-icon>
                             <span v-else class="text-gray-400 text-xs">Chưa đồng bộ</span>
                         </div>
                     </el-tooltip>
                     
                     <el-button 
                        v-if="row.ndaSyncStatus === 'FAILED'" 
                        type="danger" 
                        link 
                        size="small" 
                        class="mt-1"
                        @click="handleRetryNda(row)"
                     >
                        Thử lại
                     </el-button>
                 </div>
            </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="120" fixed="right" align="center">
            <template #default="scope">
                <el-button type="primary" :icon="Edit" circle size="small" @click="handleEdit(scope.row)" />
                <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(scope.row)" />
            </template>
        </el-table-column>
      </el-table>

    <!-- Refactored Modal -->
    <ProductFormModal
        v-model="showModal"
        :is-edit="isEdit"
        :product-data="editingProduct"
        :categories="categories"
        :tenants="tenants"
        :is-system-admin="isSystemAdmin"
        @saved="fetchProducts"
    />

    <!-- Modal Chi tiết sản phẩm -->
    <el-dialog 
        v-model="showDetailModal" 
        title="Chi tiết sản phẩm" 
        width="95%"
        style="max-width: 600px"
        class="responsive-dialog"
    >
        <div v-if="selectedProduct" class="space-y-4">
            <!-- Images Gallery -->
             <div v-if="selectedProduct.images && selectedProduct.images.length > 0" class="flex gap-2 overflow-x-auto pb-2 border-b">
                  <el-image 
                     v-for="(img, idx) in selectedProduct.images" 
                     :key="idx"
                     style="width: 100px; height: 100px; border-radius: 8px; border: 1px solid #eee"
                     :src="getImageUrl(img)"
                     :preview-src-list="selectedProduct.images.map((img: string) => getImageUrl(img))"
                     :initial-index="idx"
                     fit="cover"
                     preview-teleported
                 />
             </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm text-gray-500 block">ID Sản phẩm</label>
                    <div class="font-mono text-xs bg-gray-100 p-1 rounded">{{ selectedProduct.id }}</div>
                </div>
                <div>
                     <label class="text-sm text-gray-500 block">Trạng thái</label>
                     <el-tag :type="selectedProduct.status === 'ACTIVE' ? 'success' : 'info'">{{ selectedProduct.status }}</el-tag>
                </div>
            </div>

            <div>
                 <label class="text-sm text-gray-500 block">Tên sản phẩm</label>
                 <div class="font-bold text-lg">{{ selectedProduct.name }}</div>
                 <div v-if="selectedProduct.price" class="text-red-600 font-bold text-xl mt-1">
                    {{ Number(selectedProduct.price).toLocaleString() }} đ
                 </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                     <label class="text-sm text-gray-500 block">Mã GTIN</label>
                     <div class="font-medium">{{ selectedProduct.gtinCode }}</div>
                </div>
                <div>
                     <label class="text-sm text-gray-500 block">Danh mục</label>
                     <div class="font-medium">{{ selectedProduct.category?.name || '---' }}</div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                     <label class="text-sm text-gray-500 block">Trọng lượng (Quy cách)</label>
                     <div class="font-medium">{{ selectedProduct.netWeight || '0' }} {{ selectedProduct.weightUnit || 'kg' }}</div>
                </div>
                <div>
                     <label class="text-sm text-gray-500 block">Hạn sử dụng</label>
                     <div class="font-medium">
                        {{ selectedProduct.expiryDuration || '0' }} 
                        {{ 
                            selectedProduct.expiryUnit === 'DAY' ? 'Ngày' : 
                            selectedProduct.expiryUnit === 'MONTH' ? 'Tháng' : 
                            selectedProduct.expiryUnit === 'YEAR' ? 'Năm' : 'Tháng'
                        }}
                     </div>
                </div>
            </div>
            
            <div v-if="selectedProduct.attributes && Object.keys(selectedProduct.attributes).length > 0" class="mt-4 border-t pt-4">
                <label class="text-sm text-gray-500 block mb-2">Thuộc tính chi tiết</label>
                <div class="grid grid-cols-2 gap-2">
                    <div v-for="(val, key) in selectedProduct.attributes" :key="key" class="flex justify-between bg-gray-50 p-2 rounded text-sm">
                        <span class="text-gray-500">{{ key }}:</span>
                        <span class="font-medium">{{ val }}</span>
                    </div>
                </div>
            </div>

            <div v-if="selectedProduct.description" class="mt-4 border-t pt-4">
                 <label class="text-sm text-gray-500 block">Mô tả chi tiết</label>
                 <div class="prose prose-sm max-w-none mt-2 ql-editor" v-html="selectedProduct.description"></div>
            </div>

            <div v-if="selectedProduct.tenant" class="mt-4 border-t pt-4">
                 <label class="text-sm text-gray-500 block">Doanh nghiệp sở hữu</label>
                 <div class="font-medium text-blue-700 flex items-center gap-1">
                    <el-icon><OfficeBuilding /></el-icon>
                    {{ selectedProduct.tenant.name }} 
                 </div>
            </div>
        </div>
    </el-dialog>
    </LTECard>
  </div>
</template>