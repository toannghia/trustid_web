<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { productApi } from '../api/product';
import { categoryApi } from '../api/category';
import { tenantApi } from '../api/tenant';
import { txngApi } from '@/api/txngApi';
import { useAuthStore } from '../store/auth';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import { Delete, Edit, Plus, Search, OfficeBuilding, Loading, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import ProductFormModal from '../components/ProductFormModal.vue';
import TrustidTxngResultModal from '@/components/TrustidTxngResultModal.vue';
import brandLogo from '@/assets/images/TrusID-TV_w.png';

import { useRoute } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const products = ref([]);
const categories = ref([]); 
const tenants = ref<any[]>([]);
const showModal = ref(false);
const isEdit = ref(false);
const editingProduct = ref<any>(null);
const searchTerm = ref('');

const showDeleteDialog = ref(false);
const deleteConfirmChecked = ref(false);
const deletingProduct = ref<any>(null);
const deleting = ref(false);

const txngResultModal = reactive({
    visible: false,
    type: 'error' as 'success' | 'warning' | 'error',
    title: 'Thông báo Cổng TXNG Quốc gia',
    productName: '',
    txngId: '',
    maTruyVet: '',
    httpStatus: '',
    endpoint: '',
    rawErrorDetails: null as any,
});

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

const handleDelete = (row: any) => {
    deletingProduct.value = row;
    deleteConfirmChecked.value = false;
    showDeleteDialog.value = true;
};

const confirmDelete = async () => {
    if (!deleteConfirmChecked.value || !deletingProduct.value) return;
    deleting.value = true;
    try {
        await productApi.delete(deletingProduct.value.id);
        ElMessage.success('Xóa sản phẩm thành công');
        showDeleteDialog.value = false;
        fetchProducts();
    } catch (error: any) {
         ElMessage.error(error.response?.data?.message || error.message || 'Xóa thất bại');
    } finally {
        deleting.value = false;
    }
};

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.trustid.com.vn';
    return `${baseUrl}${path}`;
};

const page = ref(1);
const limit = ref(10);
const totalProducts = ref(0);

const fetchProducts = async () => {
    try {
        const params: any = {
            page: page.value,
            limit: limit.value
        };
        if (searchTerm.value) {
            params.search = searchTerm.value;
        }
        if (filter.tenant_id) {
            params.tenantId = filter.tenant_id;
        }
        if (filter.category_id) {
            params.categoryId = filter.category_id;
        }

        const { data } = await productApi.getList(params); 
        products.value = data.data || data.items || data || [];
        totalProducts.value = data.meta?.total || products.value.length;
        
        if (route.query.id) {
            const match = products.value.find((p: any) => p.id === route.query.id);
            if (match) {
                handleEdit(match);
            }
        }
        // Load TXNG sync status for products
        await fetchTxngSyncStatus();
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

const handlePageChange = (val: number) => {
    page.value = val;
    fetchProducts();
};

const handleSizeChange = (val: number) => {
    limit.value = val;
    page.value = 1;
    fetchProducts();
};

const handleFilterChange = () => {
    page.value = 1;
    fetchProducts();
};

import { watch } from 'vue';
let searchTimeout: any = null;
watch(searchTerm, () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        handleFilterChange();
    }, 300);
});

watch(filter, () => {
    handleFilterChange();
}, { deep: true });

const filteredProducts = computed(() => products.value);

// Detail Modal
const showDetailModal = ref(false);
const selectedProduct = ref<any>(null);
const isDescriptionExpanded = ref(false);

const openDetail = (row: any) => {
    selectedProduct.value = row;
    isDescriptionExpanded.value = false;
    showDetailModal.value = true;
};

const handleEditFromDetail = () => {
    const prod = selectedProduct.value;
    showDetailModal.value = false;
    if (prod) {
        handleEdit(prod);
    }
};

const getNdaTooltip = (row: any) => {
    if (row.ndaSyncStatus === 'WAITING') return 'Đang đồng bộ với hệ thống Quốc gia...';
    if (row.ndaSyncStatus === 'SYNCED') return 'Đã xác thực quốc gia (NDA)';
    if (row.ndaSyncStatus === 'FAILED') return 'Lỗi đồng bộ: ' + (row.ndaErrorMsg || 'Không xác định');
    return 'Chưa đồng bộ';
};

// TXNG Sync Status
const txngSyncMap = ref<Map<string, any>>(new Map());

const fetchTxngSyncStatus = async () => {
    try {
        const { data } = await txngApi.getProductSyncStatus();
        const map = new Map();
        (data.items || []).forEach((item: any) => {
            map.set(item.internalId, item);
        });
        txngSyncMap.value = map;
    } catch (e) {
        // Silently fail — TXNG is optional
    }
};

const getTxngStatus = (productId: string) => {
    return txngSyncMap.value.get(productId) || null;
};

const getTxngTooltip = (productId: string) => {
    const info = getTxngStatus(productId);
    if (!info) return 'Chưa đồng bộ TXNG Quốc gia — Bấm để đồng bộ';
    if (info.status === 'CONFIRMED') return `Đã xác nhận TXNG — Mã: ${info.maTruyVet || info.txngId}`;
    if (info.status === 'CREATED') return `Đã gửi TXNG — Mã: ${info.txngId}`;
    return 'Đang xử lý';
};

const validateTxngConditions = (product: any): string[] => {
    const missing: string[] = [];
    if (!product.name || !product.name.trim()) {
        missing.push('Tên sản phẩm không được để trống');
    }
    if (!product.gtinCode || !product.gtinCode.trim()) {
        missing.push('Mã GTIN / Barcode chưa có (Bắt buộc theo chuẩn TXNG Quốc gia)');
    }
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
        missing.push('Sản phẩm phải có ít nhất 1 hình ảnh sản phẩm');
    }
    if (!product.netWeight || Number(product.netWeight) <= 0) {
        missing.push('Trọng lượng sản phẩm phải lớn hơn 0');
    }
    if (!product.weightUnit) {
        missing.push('Đơn vị tính trọng lượng (KG, G, L...) chưa được thiết lập');
    }
    return missing;
};

const analyzeTxngErrorResponse = (errObj: any) => {
    const rawDetails = String(errObj.errorDetails || errObj.message || '');
    const respBody = errObj.responseBody || {};
    const debugMsg = String(respBody.debugMessage || rawDetails || '');
    const errorCode = String(respBody.error || errObj.errorCode || '');

    let userReason = 'Cổng Quốc gia chưa tiếp nhận thông tin sản phẩm.';
    let userAction = 'Vui lòng kiểm tra lại thông tin sản phẩm hoặc thử lại sau.';
    let icon = '⚠️';

    if (debugMsg.includes('NullReferenceException') && debugMsg.includes('ToChuc_SanPhamService')) {
        userReason = 'Hồ sơ Doanh nghiệp / Tổ chức chưa được liên kết hoặc chưa được kích hoạt trên Cổng TXNG Quốc gia.';
        userAction = 'Vui lòng liên hệ Quản trị viên Cổng Quốc gia (truyxuatnguongoc.gov.vn) để xác minh và kích hoạt tài khoản Doanh nghiệp (Mã số thuế / Mã GLN).';
        icon = '🏢';
    } else if (debugMsg.includes('NullReferenceException') && debugMsg.includes('UploadFile')) {
        userReason = 'Máy chủ Cổng Quốc gia không thể tải hình ảnh sản phẩm.';
        userAction = 'Kiểm tra đường dẫn ảnh sản phẩm, đảm bảo hình ảnh ở định dạng công khai JPG/PNG.';
        icon = '🖼️';
    } else if (debugMsg.includes('NullReferenceException') || errorCode === 'ERR_SYS_DEV') {
        userReason = 'Máy chủ Cổng Quốc gia bị lỗi xử lý dữ liệu nội bộ (.NET NullReferenceException trong ToChuc_SanPhamService).';
        userAction = 'Tài khoản Doanh nghiệp chưa có dữ liệu cấu hình ban đầu trên Cổng Quốc gia. Cần liên hệ Cổng Quốc gia khởi tạo hồ sơ Tổ chức.';
        icon = '⚠️';
    } else if (rawDetails.includes('401') || rawDetails.includes('Unauthorized') || rawDetails.includes('token')) {
        userReason = 'Phiên đăng nhập SSO Cổng Quốc gia đã hết hạn.';
        userAction = 'Vào menu Hệ thống → TXNG Quốc gia, bấm nút "Refresh Token" để làm mới kết nối.';
        icon = '🔑';
    } else if (rawDetails.includes('GTIN') || rawDetails.includes('CheckDigit') || rawDetails.includes('maBarcode')) {
        userReason = 'Mã GTIN / Barcode của sản phẩm không đúng định dạng GS1.';
        userAction = 'Kiểm tra và nhập lại mã GTIN chuẩn (8, 13, 14 số).';
        icon = '🏷️';
    }

    return { userReason, userAction, icon, rawDetails, debugMsg, errorCode };
};

const handleSyncTxng = async (row: any) => {
    // GTIN guard — chỉ sản phẩm có GTIN mới đồng bộ được
    if (!row.gtinCode) {
        ElMessageBox.alert(
            'Sản phẩm này chưa có mã GTIN. Vui lòng cập nhật mã GTIN trước khi đồng bộ sang Cổng TXNG Quốc gia.',
            'Không thể đồng bộ',
            { confirmButtonText: 'Đã hiểu', type: 'warning' }
        );
        return;
    }
    // 1. Kiểm tra các điều kiện bắt buộc ở Client trước
    const missingFields = validateTxngConditions(row);
    if (missingFields.length > 0) {
        const listHtml = missingFields.map(f => `<li style="margin-bottom:6px;">❌ ${f}</li>`).join('');
        ElMessageBox.alert(
            `<div style="font-size:14px; line-height:1.5;">
                <p style="margin-bottom:10px; font-weight:600; color:#1e293b;">
                    Sản phẩm <strong>"${row.name}"</strong> chưa đủ điều kiện để đồng bộ sang Cổng TXNG Quốc gia:
                </p>
                <ul style="color:#dc2626; padding-left:16px; margin:10px 0; font-size:13px; list-style-type:none;">
                    ${listHtml}
                </ul>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:6px; margin-top:12px; color:#475569; font-size:12px;">
                    💡 <strong>Hướng dẫn:</strong> Bấm nút <strong>Chỉnh sửa</strong> sản phẩm để cập nhật đầy đủ các trường thông tin bắt buộc nêu trên trước khi thực hiện đồng bộ lại.
                </div>
            </div>`,
            'Cảnh báo điều kiện đồng bộ TXNG',
            {
                dangerouslyUseHTMLString: true,
                confirmButtonText: 'Đã hiểu',
                type: 'warning',
            }
        );
        return;
    }

    // 2. Thực hiện liên kết sản phẩm từ Cổng TXNG (CHỈ ĐỌC, không tạo mới)
    const loading = ElLoading.service({
        lock: true,
        text: `Đang liên kết sản phẩm "${row.name}" với Cổng TXNG Quốc gia...`,
        background: 'rgba(0, 0, 0, 0.7)',
    });

    try {
        const res = await txngApi.linkProduct(row.gtinCode, row.tenantId);
        loading.close();

        txngResultModal.type = 'success';
        txngResultModal.productName = row.name;
        txngResultModal.txngId = res.data?.idSanPham || '';
        txngResultModal.maTruyVet = res.data?.idToChucHoSo || '';
        txngResultModal.visible = true;

        await fetchTxngSyncStatus();
    } catch (e: any) {
        loading.close();
        const errObj = e.response?.data || {};

        txngResultModal.type = 'error';
        txngResultModal.productName = row.name;
        txngResultModal.httpStatus = errObj.httpStatus || e.response?.status || '200';
        txngResultModal.endpoint = errObj.endpoint || 'https://quantri.truyxuatnguongoc.gov.vn/gwdev/tochuc/v5/ToChuc_SanPham';
        txngResultModal.rawErrorDetails = errObj.errorDetails || errObj.message || e.message || errObj;
        txngResultModal.visible = true;
    }
};

const getDisplayAttributes = (attributes: any) => {
    if (!attributes) return {};
    const result: Record<string, any> = {};
    Object.entries(attributes).forEach(([key, value]) => {
        if (key !== 'batchTemplate' && key !== 'txngCategory') {
            result[key] = value;
        }
    });
    return result;
};

const translateAttributeKey = (key: string) => {
    const map: Record<string, string> = {
        govStatus: 'Trạng thái quản lý (Gov)',
        recallReason: 'Lý do thu hồi',
        recallRequestedAt: 'Thời gian yêu cầu thu hồi',
    };
    return map[key] || key;
};

const formatAttributeValue = (key: string, val: any) => {
    if (key === 'govStatus') {
        const statusMap: Record<string, string> = {
            NORMAL: 'Bình thường',
            PENDING_RECALL: 'Chờ thu hồi',
            PARTIAL_RECALL: 'Thu hồi 1 phần',
            RECALLED: 'Đã thu hồi',
            RECALL_REJECTED: 'Từ chối thu hồi',
        };
        return statusMap[val] || val;
    }
    if (key === 'recallRequestedAt' && val) {
        try {
            const date = new Date(val);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });
            }
        } catch (e) {}
    }
    return val;
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
    if (route.query.search) {
        searchTerm.value = String(route.query.search);
    }
    fetchProducts();
    fetchCategories();
    if (isSystemAdmin.value) {
         tenantApi.getAll({}).then(res => {
             const rawData = res.data;
             tenants.value = rawData.items || rawData.data?.items || rawData.data || rawData || [];
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
        <el-table-column label="STT" width="60" align="center">
            <template #default="scope">
                {{ (page - 1) * limit + scope.$index + 1 }}
            </template>
        </el-table-column>
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
        <el-table-column label="Đóng bao" width="100" align="center">
            <template #default="scope">
                <span v-if="scope.row.defaultPackagingSpec">{{ scope.row.defaultPackagingSpec }} gói/bao</span>
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

        <!-- TXNG Status Column -->
        <el-table-column label="TXNG QG" width="120" align="center">
            <template #default="{ row }">
                <el-tooltip :content="getTxngTooltip(row.id)" placement="top">
                    <div class="flex flex-col items-center justify-center cursor-help gap-1">
                        <el-tag v-if="getTxngStatus(row.id)?.status === 'CONFIRMED'" type="success" size="small" effect="dark">✓ TXNG</el-tag>
                        <el-tag v-else-if="getTxngStatus(row.id)?.status === 'CREATED'" type="warning" size="small">Đã gửi</el-tag>
                        <el-tag v-else-if="!row.gtinCode" type="info" size="small" effect="plain">Chưa có GTIN</el-tag>
                        <el-button 
                            v-else 
                            type="primary" 
                            link 
                            size="small" 
                            @click="handleSyncTxng(row)"
                        >
                            + Đồng bộ
                        </el-button>
                    </div>
                </el-tooltip>
            </template>
        </el-table-column>

        <el-table-column label="Thao tác" width="120" fixed="right" align="center">
            <template #default="scope">
                <el-button type="primary" :icon="Edit" circle size="small" @click="handleEdit(scope.row)" />
                <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(scope.row)" />
            </template>
        </el-table-column>
      </el-table>

      <div class="p-4 flex justify-end">
           <el-pagination
               v-model:current-page="page"
               v-model:page-size="limit"
               :total="totalProducts"
               :page-sizes="[10, 50, 100, 500]"
               layout="total, sizes, prev, pager, next, jumper"
               background
               @size-change="handleSizeChange"
               @current-change="handlePageChange"
           />
       </div>

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
        width="95%"
        style="max-width: 720px"
        class="responsive-dialog branded-product-dialog"
        :show-close="false"
    >
        <template #header>
            <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                <div style="width: 1px; height: 20px; background: rgba(255, 255, 255, 0.3);"></div>
                <span style="color: #ffffff; font-size: 16px; font-weight: 600;">Chi tiết Sản phẩm</span>
                <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showDetailModal = false">
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>
        <div v-if="selectedProduct" class="space-y-4">
            <!-- 2-Column Product Header (Left: Image, Right: Info & Status) -->
            <div class="flex flex-col sm:flex-row gap-4 items-start pb-3 border-b">
                <!-- Left: Product Image & Gallery -->
                <div class="w-full sm:w-36 shrink-0 flex flex-col gap-1.5">
                    <el-image 
                        style="width: 100%; height: 130px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc;"
                        :src="getImageUrl(selectedProduct.images?.[0])"
                        :preview-src-list="selectedProduct.images?.map((img: string) => getImageUrl(img)) || []"
                        fit="cover"
                        preview-teleported
                    >
                        <template #error>
                            <div class="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50">
                                <span>🖼️ Không có ảnh</span>
                            </div>
                        </template>
                    </el-image>

                    <!-- Extra image thumbnails if any -->
                    <div v-if="selectedProduct.images && selectedProduct.images.length > 1" class="flex gap-1 overflow-x-auto">
                        <el-image 
                            v-for="(img, idx) in selectedProduct.images.slice(1)" 
                            :key="idx"
                            style="width: 36px; height: 36px; border-radius: 6px; border: 1px solid #cbd5e1;"
                            :src="getImageUrl(img)"
                            fit="cover"
                        />
                    </div>
                </div>

                <!-- Right: Status, Title, Price, TXNG Status Bar -->
                <div class="flex-1 space-y-2 min-w-0">
                    <!-- Top Status Badge & ID -->
                    <div class="flex items-center justify-between gap-2 text-xs">
                        <el-tag :type="selectedProduct.status === 'ACTIVE' ? 'success' : 'info'" size="small">
                            {{ selectedProduct.status === 'ACTIVE' ? '● Hoạt động' : '● Không hoạt động' }}
                        </el-tag>
                        <span class="text-slate-400 font-mono text-[11px]">ID: {{ selectedProduct.id }}</span>
                    </div>

                    <!-- Product Name & Price -->
                    <div>
                        <h3 class="font-bold text-lg text-slate-800 leading-snug break-words">{{ selectedProduct.name }}</h3>
                        <div v-if="selectedProduct.price" class="text-red-600 font-extrabold text-xl mt-0.5">
                            {{ Number(selectedProduct.price).toLocaleString() }} <span class="text-xs font-semibold">đ</span>
                        </div>
                    </div>

                    <!-- TXNG Status Bar Strip -->
                    <div class="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-2 text-xs">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-semibold text-slate-700">🏛️ TXNG QG:</span>
                            <el-tag v-if="getTxngStatus(selectedProduct.id)?.status === 'CONFIRMED'" type="success" size="small" effect="dark">
                                ✓ Đã xác nhận
                            </el-tag>
                            <el-tag v-else-if="getTxngStatus(selectedProduct.id)?.status === 'CREATED'" type="warning" size="small">
                                Đã gửi
                            </el-tag>
                            <span v-else class="text-slate-400 font-medium">Chưa đồng bộ</span>

                            <span v-if="getTxngStatus(selectedProduct.id)?.txngId" class="font-mono bg-white px-1.5 py-0.5 rounded border text-slate-600 text-[11px]">
                                ID: {{ getTxngStatus(selectedProduct.id).txngId }}
                            </span>
                            <span v-if="getTxngStatus(selectedProduct.id)?.maTruyVet" class="font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 font-bold text-[11px]">
                                QG: {{ getTxngStatus(selectedProduct.id).maTruyVet }}
                            </span>
                        </div>

                        <el-button 
                            v-if="!getTxngStatus(selectedProduct.id) || getTxngStatus(selectedProduct.id)?.status === 'CANCELLED'" 
                            type="primary" 
                            size="small" 
                            :disabled="!selectedProduct.gtinCode"
                            @click="handleSyncTxng(selectedProduct)"
                        >
                            {{ selectedProduct.gtinCode ? 'Đồng bộ ngay' : 'Cần có GTIN' }}
                        </el-button>
                        <el-button 
                            v-else 
                            type="info" 
                            plain 
                            size="small" 
                            @click="handleSyncTxng(selectedProduct)"
                        >
                            Đồng bộ lại
                        </el-button>
                    </div>
                </div>
            </div>

            <!-- Balanced 2-Column Attribute Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                <div>
                    <label class="text-slate-400 block mb-0.5 font-medium">Mã GTIN (Barcode)</label>
                    <div class="font-mono font-semibold text-slate-800 text-sm">{{ selectedProduct.gtinCode || '---' }}</div>
                </div>
                <div>
                    <label class="text-slate-400 block mb-0.5 font-medium">Danh mục nội bộ</label>
                    <div class="font-semibold text-slate-800 text-sm">{{ selectedProduct.category?.name || '---' }}</div>
                </div>

                <div class="col-span-1 sm:col-span-2 bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5">
                    <label class="text-emerald-800 font-semibold block mb-0.5 text-[11px]">Ngành hàng Cổng TXNG Quốc gia</label>
                    <div class="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                        <span>🏛️</span>
                        <span>{{ selectedProduct.attributes?.txngCategory || 'Nông sản - Trồng trọt (Lúa gạo, Cà phê, Trái cây, Rau củ)' }}</span>
                    </div>
                </div>

                <div>
                    <label class="text-slate-400 block mb-0.5 font-medium">Trọng lượng (Quy cách)</label>
                    <div class="font-semibold text-slate-800 text-sm">{{ selectedProduct.netWeight || '0' }} {{ selectedProduct.weightUnit || 'kg' }}</div>
                </div>
                <div>
                    <label class="text-slate-400 block mb-0.5 font-medium">Quy cách đóng bao</label>
                    <div class="font-semibold text-slate-800 text-sm">{{ selectedProduct.defaultPackagingSpec ? selectedProduct.defaultPackagingSpec + ' gói/bao' : 'Chưa cài đặt' }}</div>
                </div>

                <div>
                    <label class="text-slate-400 block mb-0.5 font-medium">Hạn sử dụng</label>
                    <div class="font-semibold text-slate-800 text-sm">
                        {{ selectedProduct.expiryDuration || '0' }} 
                        {{ 
                            selectedProduct.expiryUnit === 'DAY' ? 'Ngày' : 
                            selectedProduct.expiryUnit === 'MONTH' ? 'Tháng' : 
                            selectedProduct.expiryUnit === 'YEAR' ? 'Năm' : 'Tháng'
                        }}
                    </div>
                </div>
                <div v-if="selectedProduct.tenant">
                    <label class="text-slate-400 block mb-0.5 font-medium">Doanh nghiệp sở hữu</label>
                    <div class="font-semibold text-blue-700 text-sm flex items-center gap-1">
                        <el-icon><OfficeBuilding /></el-icon>
                        {{ selectedProduct.tenant.name }} 
                    </div>
                </div>
            </div>
            
            <!-- Thuộc tính chi tiết phẳng -->
            <div v-if="selectedProduct.attributes && Object.keys(getDisplayAttributes(selectedProduct.attributes)).length > 0" class="mt-4 border-t pt-4">
                <label class="text-sm text-gray-500 block mb-2 font-semibold">Thuộc tính chi tiết</label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div v-for="(val, key) in getDisplayAttributes(selectedProduct.attributes)" :key="key" class="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100 flex flex-col gap-1 min-h-[56px] justify-center">
                        <span class="text-gray-500 font-medium">{{ translateAttributeKey(key) }}</span>
                        <span class="font-bold text-gray-800 break-all">{{ formatAttributeValue(key, val) }}</span>
                    </div>
                </div>
            </div>

            <!-- Khung mẫu thuộc tính lô sản xuất (nếu có cấu hình) -->
            <div v-if="selectedProduct.attributes && selectedProduct.attributes.batchTemplate && selectedProduct.attributes.batchTemplate.length > 0" class="mt-4 border-t pt-4">
                <label class="text-sm text-gray-500 block mb-2">Cấu hình mẫu thuộc tính lô sản xuất</label>
                <div class="space-y-2">
                    <div v-for="block in selectedProduct.attributes.batchTemplate" :key="block.id" class="bg-blue-50/50 border border-blue-100/60 p-3 rounded-lg">
                        <div class="flex items-center gap-2 font-bold text-blue-900 text-sm mb-1.5">
                            <el-icon v-if="block.icon"><component :is="block.icon" /></el-icon>
                            <span>{{ block.title }}</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5 pl-6">
                            <el-tag v-for="f in block.fields" :key="f.key" size="small" type="info" effect="plain" class="rounded font-medium">
                                {{ f.key }}
                            </el-tag>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mô tả chi tiết (Collapsible) -->
            <div v-if="selectedProduct.description" class="mt-4 border-t pt-4">
                 <div class="flex items-center justify-between mb-2">
                     <label class="text-sm font-semibold text-slate-700">Mô tả chi tiết</label>
                     <button 
                         type="button"
                         @click="isDescriptionExpanded = !isDescriptionExpanded" 
                         class="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer select-none"
                     >
                         <span>{{ isDescriptionExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼' }}</span>
                     </button>
                 </div>

                 <div 
                     class="prose prose-sm max-w-none text-slate-600 text-xs leading-relaxed ql-editor transition-all duration-300 relative"
                     :class="isDescriptionExpanded ? 'max-h-none' : 'max-h-24 overflow-hidden'"
                 >
                     <div v-html="selectedProduct.description"></div>
                     
                     <!-- Gradient fade overlay when collapsed -->
                     <div 
                         v-if="!isDescriptionExpanded" 
                         class="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none"
                     ></div>
                 </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end items-center gap-2 pt-2 border-t">
                <button
                    type="button"
                    @click="handleEditFromDetail"
                    style="background: #0F2B46; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.2s;"
                    onmouseover="this.style.background='#1E3A5F'"
                    onmouseout="this.style.background='#0F2B46'"
                >
                    <el-icon><Edit /></el-icon>
                    <span>Chỉnh sửa</span>
                </button>
                <el-button @click="showDetailModal = false" style="padding: 8px 20px; font-weight: 600;">
                    Đóng
                </el-button>
            </div>
        </template>
    </el-dialog>

    <!-- Modal kết quả / thông báo chuẩn TrustID -->
    <TrustidTxngResultModal
        v-model="txngResultModal.visible"
        :type="txngResultModal.type"
        :title="txngResultModal.title"
        :product-name="txngResultModal.productName"
        :txng-id="txngResultModal.txngId"
        :ma-truy-vet="txngResultModal.maTruyVet"
        :http-status="txngResultModal.httpStatus"
        :endpoint="txngResultModal.endpoint"
        :raw-error-details="txngResultModal.rawErrorDetails"
    />

    <!-- Delete Confirmation Dialog -->
    <el-dialog v-model="showDeleteDialog" width="440px" :show-close="false" class="branded-delete-dialog">
        <template #header>
            <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                <span style="color: #fff; font-size: 16px; font-weight: 600;">Xác nhận xoá sản phẩm</span>
                <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showDeleteDialog = false">
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>

        <div style="padding: 24px 24px 8px;">
            <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px; background: #FEF3F2; border: 1px solid #FECDCA; border-radius: 10px;">
                <span style="font-size: 22px; margin-top: 1px;">⚠️</span>
                <div>
                    <p style="font-weight: 600; color: #B42318; margin-bottom: 4px; font-size: 14px;">Hành động không thể hoàn tác!</p>
                    <p style="font-size: 13px; color: #475467; line-height: 1.5;">
                        Bạn đang chuẩn bị xoá sản phẩm
                        <strong style="color: #0F2B46;">"{{ deletingProduct?.name }}"</strong>.
                    </p>
                </div>
            </div>
            <el-checkbox v-model="deleteConfirmChecked" style="white-space: normal; word-break: break-word;">
                <span style="font-size: 13px; color: #344054;">Tôi xác nhận muốn xoá sản phẩm này và đã hiểu rằng hành động không thể hoàn tác</span>
            </el-checkbox>
        </div>

        <template #footer>
            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
                <el-button @click="showDeleteDialog = false" style="border-radius: 8px; padding: 10px 20px;">Huỷ</el-button>
                <el-button
                    :disabled="!deleteConfirmChecked"
                    :loading="deleting"
                    @click="confirmDelete"
                    style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff;"
                    :style="{ background: deleteConfirmChecked ? '#B42318' : '#D0D5DD', cursor: deleteConfirmChecked ? 'pointer' : 'not-allowed' }"
                >
                    Xoá sản phẩm
                </el-button>
            </div>
        </template>
    </el-dialog>
    </LTECard>
  </div>
</template>

<style>
.branded-product-dialog {
    border-radius: 8px !important;
    overflow: hidden !important;
    padding: 0 !important;
}
.branded-product-dialog .el-dialog__header {
    padding: 0 !important;
    margin: 0 !important;
}
.branded-product-dialog .el-dialog__body {
    padding: 0 !important;
}

.branded-delete-dialog {
    border-radius: 8px !important;
    overflow: hidden !important;
    padding: 0 !important;
}
.branded-delete-dialog .el-dialog__header {
    padding: 0 !important;
    margin: 0 !important;
}
.branded-delete-dialog .el-dialog__body {
    padding: 0 !important;
}
.branded-delete-dialog .el-dialog__footer {
    padding: 0 !important;
}
</style>