<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch, computed } from 'vue';
import { assetApi } from '../api/asset.api';
import { userApi } from '../../core/api/user';
import { tenantApi } from '../../core/api/tenant';
import { categoryApi } from '../../core/api/category';
import { productApi } from '../../core/api/product';
import { farmApi } from '../../farm/api/farmApi';
import { useAuthStore } from '../../core/store/auth';
import ProductFormModal from '../../core/components/ProductFormModal.vue';
import UserFormModal from '../../core/components/UserFormModal.vue';
import { ElMessage } from 'element-plus';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import { Search, Plus, Filter, Edit, Delete, Calendar, View, User as UserIcon, Location as LocationIcon, Camera, OfficeBuilding } from '@element-plus/icons-vue';
import QRScannerDialog from '@/components/common/QRScannerDialog.vue';
import type { PerennialAsset } from '@/types/asset';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { vietnamUnits } from '@/common/data/vietnam-units';
import { provinceCoordinates } from '@/common/data/province-coordinates';

// State
const assets = ref<PerennialAsset[]>([]);
const loading = ref(false);
const submitting = ref(false);
const showModal = ref(false);
const caretakers = ref<any[]>([]);
const owners = ref<any[]>([]);
const assetTypes = ref<any[]>([]);
const locations = ref<any[]>([]);
const templates = ref<any[]>([]);
const products = ref<any[]>([]);
const showProductModal = ref(false);
const showUserModal = ref(false);
const tenants = ref<any[]>([]);
const authStore = useAuthStore();
const isSystemAdmin = computed(() => authStore.user?.role === 'ADMIN');
const isEdit = ref(false);
const currentEditId = ref<string | null>(null);
const detailVisible = ref(false);
const historyVisible = ref(false);
const selectedAssetData = ref<any>(null);
const showQrScanner = ref(false);

const provinces = ref(vietnamUnits);
const formWards = ref<any[]>([]);

const form = reactive({
    assetName: '',
    qrCode: '',
    productId: '',
    caretakerId: '',
    currentOwnerId: '',
    createOwnerAccount: false,
    ownerFullName: '',
    ownerPhone: '',
    ownerEmail: '',
    farmLocationId: '',
    careProcessId: '',
    province: '',
    ward: '',
    locationLat: 21.0,
    locationLong: 105.8
});

const filter = reactive({
    search: '',
    status: '',
    caretakerId: ''
});

const loadWards = () => {
    const prov = provinces.value.find(p => p.name === form.province);
    formWards.value = prov ? prov.wards : [];
};

const onProvinceChange = async () => {
    form.ward = '';
    loadWards();
    
    if (form.province && provinceCoordinates[form.province]) {
        const coords = provinceCoordinates[form.province];
        form.locationLat = coords.lat;
        form.locationLong = coords.lng;
        
        await nextTick();
        if (map) {
            map.setView([form.locationLat, form.locationLong], 12);
            if (marker) marker.setLatLng([form.locationLat, form.locationLong]);
        }
    }
};

const onProductChange = (productId: string) => {
    const product = products.value.find(p => p.id === productId);
    if (product) {
        form.assetName = product.name;
    }
};

// Map related
let map: L.Map | null = null;
let marker: L.Marker | null = null;

const initMap = async () => {
    await nextTick();
    const mapContainer = document.getElementById('asset-map');
    if (!mapContainer) return;

    if (map) {
        map.remove(); // Clean up existing map
    }

    map = L.map('asset-map').setView([form.locationLat, form.locationLong], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add marker
    marker = L.marker([form.locationLat, form.locationLong], { draggable: true }).addTo(map);

    // Event: Marker Drag
    marker.on('dragend', (e) => {
        const latLng = e.target.getLatLng();
        form.locationLat = Number(latLng.lat.toFixed(6));
        form.locationLong = Number(latLng.lng.toFixed(6));
    });

    // Event: Map Click
    map.on('click', (e) => {
        form.locationLat = Number(e.latlng.lat.toFixed(6));
        form.locationLong = Number(e.latlng.lng.toFixed(6));
        if (marker) marker.setLatLng(e.latlng);
    });
};

// Update marker when inputs change manually
watch(() => [form.locationLat, form.locationLong], ([newLat, newLong]) => {
    if (marker && map) {
        const cur = marker.getLatLng();
        if (cur.lat !== newLat || cur.lng !== newLong) {
             const newPos = new L.LatLng(newLat as number, newLong as number);
             marker.setLatLng(newPos);
             map.panTo(newPos);
        }
    }
});

const fetchAssets = async () => {
    loading.value = true;
    try {
        const { data } = await assetApi.list({ 
            search: filter.search,
            caretakerId: filter.caretakerId 
        });
        assets.value = data;
    } catch (error) {
        ElMessage.error('Không thể tải danh sách tài sản');
    } finally {
        loading.value = false;
    }
};

const fetchInitialData = async () => {
    try {
        // Lấy danh sách nông dân
        const { data: userData } = await userApi.getList({ page: 1, limit: 100, roleName: 'FARMER' });
        caretakers.value = userData.data;

        // Lấy danh sách chủ sở hữu hiện có
        const { data: ownerData } = await userApi.getList({ page: 1, limit: 100, roleName: 'END_USER' });
        owners.value = ownerData.data;

        // Lấy danh sách vùng trồng
        const { data: locData } = await farmApi.getLocations();
        locations.value = locData;

        // Lấy danh sách quy trình
        const { data: tempData } = await farmApi.getTemplates();
        templates.value = tempData;

        // Lấy danh sách sản phẩm
        const { data: prodData } = await productApi.getList({ page: 1, limit: 100 });
        products.value = prodData.data || prodData;

        // Lấy danh sách doanh nghiệp nếu là admin
        if (isSystemAdmin.value) {
            const { data: tenantData } = await tenantApi.getAll({});
            tenants.value = tenantData.data || tenantData;
        }
    } catch (e) {
        console.error(e);
    }
};

const resetForm = () => {
    Object.assign(form, {
        assetName: '',
        qrCode: '',
        productId: '',
        caretakerId: '',
        currentOwnerId: '',
        createOwnerAccount: false,
        ownerFullName: '',
        ownerPhone: '',
        ownerEmail: '',
        farmLocationId: '',
        careProcessId: '',
        province: '',
        ward: '',
        locationLat: 21.0,
        locationLong: 105.8
    });
    isEdit.value = false;
    currentEditId.value = null;
};

const openCreateModal = () => {
    resetForm();
    showModal.value = true;
};

const openEditModal = async (asset: PerennialAsset) => {
    isEdit.value = true;
    currentEditId.value = asset.id;
    loading.value = true;
    try {
        const { data } = await assetApi.getDetail(asset.id);
        const assetInfo = data.asset;
        Object.assign(form, {
            assetName: assetInfo.assetName,
            qrCode: assetInfo.qrCode,
            productId: assetInfo.productId,
            caretakerId: assetInfo.caretakerId,
            currentOwnerId: assetInfo.currentOwnerId,
            farmLocationId: assetInfo.farmLocationId,
            careProcessId: assetInfo.careProcessId,
            province: assetInfo.province,
            ward: assetInfo.ward,
            locationLat: Number(assetInfo.locationLat),
            locationLong: Number(assetInfo.locationLong)
        });
        showModal.value = true;
    } catch (error) {
        ElMessage.error('Không thể tải chi tiết tài sản');
    } finally {
        loading.value = false;
    }
};

const openDetail = async (assetId: string) => {
    try {
        const { data } = await assetApi.getDetail(assetId);
        selectedAssetData.value = data;
        detailVisible.value = true;
    } catch (error) {
        ElMessage.error('Không thể tải chi tiết');
    }
};

const openHistory = async (assetId: string) => {
    try {
        const { data } = await assetApi.getDetail(assetId);
        selectedAssetData.value = data;
        historyVisible.value = true;
    } catch (error) {
        ElMessage.error('Không thể tải lịch sử');
    }
};

const onQrScanInModal = (code: string) => {
    // Reuse sanitization logic: Extract code from URL if present
    let sanitizedCode = code;
    if (code.includes('?Code=')) {
        sanitizedCode = code.split('?Code=')[1].split('&')[0];
    } else if (code.includes('?code=')) {
        sanitizedCode = code.split('?code=')[1].split('&')[0];
    }
    form.qrCode = sanitizedCode;
    ElMessage.success(`Đã nhận diện mã: ${sanitizedCode}`);
};

const handleSubmit = async () => {
    if (!form.qrCode) {
        ElMessage.warning('Vui lòng nhập hoặc quét mã QR định danh');
        return;
    }
    if (!form.productId && !form.assetName) {
        ElMessage.warning('Vui lòng chọn sản phẩm hoặc nhập tên tài sản');
        return;
    }

    submitting.value = true;
    try {
        const payload: any = {};
        for (const [key, value] of Object.entries(form)) {
            if (value !== '') {
                payload[key] = value;
            }
        }
        
        if (isEdit.value && currentEditId.value) {
            await assetApi.update(currentEditId.value, payload);
            ElMessage.success('Cập nhật tài sản thành công');
        } else {
            await assetApi.create(payload);
            ElMessage.success('Khởi tạo tài sản thành công');
        }
        showModal.value = false;
        fetchAssets();
    } catch (error: any) {
         ElMessage.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
        submitting.value = false;
    }
};

const onOwnerSaved = (newOwner: any) => {
    fetchInitialData();
    form.currentOwnerId = newOwner.id;
    showUserModal.value = false;
};

onMounted(() => {
    fetchAssets();
    fetchInitialData();
});
</script>

<template>
    <div>
        <LTEContentHeader title="Quản lý Tài sản / Cây lâu năm" :breadcrumbs="[{ title: 'Assets' }]" />

        <LTECard title="Danh sách tài sản" outline>
            <template #header>
                <div class="flex flex-wrap gap-4 items-center w-full">
                    <div class="flex-grow flex flex-wrap gap-2 sm:max-w-4xl">
                        <el-input v-model="filter.search" placeholder="Số hiệu, tên cây..." :prefix-icon="Search"
                            class="!w-[200px]" clearable @keyup.enter="fetchAssets" />
                        
                        <el-select v-model="filter.caretakerId" placeholder="Lọc theo Nông dân" clearable @change="fetchAssets" class="!w-[200px]">
                            <template #prefix>
                                <el-icon><UserIcon /></el-icon>
                            </template>
                            <el-option v-for="item in caretakers" :key="item.id" :label="item.fullName" :value="item.id" />
                        </el-select>

                        <el-button type="primary" :icon="Filter" @click="fetchAssets">Lọc</el-button>
                    </div>
                    <el-button type="primary" :icon="Plus" @click="openCreateModal">
                        Khởi tạo cây mới
                    </el-button>
                </div>
            </template>

            <el-table :data="assets" v-loading="loading" stripe border>
                <el-table-column prop="qrCode" label="Mã QR / Định danh" width="180" />
                <el-table-column prop="assetName" label="Tên tài sản" min-width="200" />
                <el-table-column label="Trạng thái" width="150" align="center">
                    <template #default="{ row }">
                        <el-tag :type="row.status === 'PENDING' ? 'info' : 'success'">
                            {{ row.status === 'PENDING' ? 'Chờ trồng' : 'Đang phát triển' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="Chăm sóc bởi" width="180">
                    <template #default="{ row }">
                        {{ row.caretaker?.fullName || 'Chưa gán' }}
                    </template>
                </el-table-column>
                <el-table-column label="Chủ sở hữu" width="180">
                    <template #default="{ row }">
                        {{ row.currentOwner?.fullName || 'Chưa gán' }}
                    </template>
                </el-table-column>
                <el-table-column label="Thao tác" width="150" align="center">
                    <template #default="{ row }">
                        <el-button-group>
                            <el-button link type="primary" :icon="View" @click="openDetail(row.id)">Chi tiết</el-button>
                            <el-button link type="primary" :icon="Calendar" @click="openHistory(row.id)">Nhật ký</el-button>
                            <el-button link type="warning" :icon="Edit" @click="openEditModal(row)">Sửa</el-button>
                        </el-button-group>
                    </template>
                </el-table-column>
            </el-table>
        </LTECard>

        <!-- Modal Khởi tạo -->
        <el-dialog 
            v-model="showModal" 
            :title="isEdit ? 'Sửa thông tin tài sản' : 'Khởi tạo tài sản lâu năm'" 
            width="95%"
            style="max-width: 650px"
            @opened="initMap"
            class="responsive-dialog"
        >
            <el-form :model="form" label-position="top">
                <el-row :gutter="20">
                    <el-col :span="24">
                        <el-form-item label="Sản phẩm / Tên tài sản" required>
                            <div class="flex gap-2">
                                <el-select 
                                    v-model="form.productId" 
                                    placeholder="Chọn sản phẩm để định danh tài sản" 
                                    class="w-full" 
                                    clearable 
                                    filterable
                                    @change="onProductChange"
                                >
                                    <template #prefix>
                                        <el-icon><OfficeBuilding /></el-icon>
                                    </template>
                                    <el-option v-for="item in products" :key="item.id" :label="item.name" :value="item.id">
                                        <div class="flex justify-between items-center">
                                            <span>{{ item.name }}</span>
                                            <span class="text-xs text-gray-400">{{ item.gtinCode }}</span>
                                        </div>
                                    </el-option>
                                </el-select>
                                <el-button type="primary" :icon="Plus" @click="showProductModal = true">
                                    Thêm mới
                                </el-button>
                            </div>
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-row :gutter="20">
                    <el-col :span="24">
                        <el-form-item label="Mã QR định danh" required>
                            <div class="flex gap-2">
                                <el-input v-model="form.qrCode" placeholder="Quét hoặc nhập mã QR" />
                                <el-button type="primary" plain @click="showQrScanner = true">
                                    <el-icon class="mr-1"><Camera /></el-icon>
                                    Quét QR
                                </el-button>
                            </div>
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-row :gutter="20">
                    <el-col :span="24">
                        <el-form-item label="Người chăm sóc (Nông dân)">
                            <el-select v-model="form.caretakerId" placeholder="Chọn nông dân" class="w-full" clearable>
                                <el-option v-for="item in caretakers" :key="item.id" :label="item.fullName" :value="item.id" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-row :gutter="20">
                    <el-col :span="24">
                        <el-form-item label="Vùng trồng">
                            <el-select v-model="form.farmLocationId" placeholder="Chọn vùng trồng" class="w-full" clearable>
                                <el-option v-for="item in locations" :key="item.id" :label="item.name" :value="item.id" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-row :gutter="20">
                    <el-col :span="24">
                        <el-form-item label="Quy trình canh tác">
                            <el-select v-model="form.careProcessId" placeholder="Chọn quy trình" class="w-full" clearable>
                                <el-option v-for="item in templates" :key="item.id" :label="item.name" :value="item.id" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>

                <div class="bg-blue-50 p-4 rounded-lg mb-4">
                    <h5 class="flex items-center gap-2 mb-3 text-blue-700 font-bold">
                        <UserIcon class="w-4 h-4" /> Thông tin chủ sở hữu
                    </h5>
                    
                    <el-form-item label="Chọn chủ sở hữu">
                        <div class="flex gap-2">
                            <el-select v-model="form.currentOwnerId" placeholder="Tìm tên hoặc SĐT" class="flex-grow" filterable clearable>
                                <el-option v-for="item in owners" :key="item.id" :label="`${item.fullName} (${item.username})`" :value="item.id" />
                            </el-select>
                            <el-button type="success" :icon="Plus" @click="showUserModal = true">Thêm mới</el-button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">* Nếu chủ sở hữu chưa có tài khoản, hãy nhấn "Thêm mới".</p>
                    </el-form-item>
                </div>

                <el-row :gutter="20">
                    <el-col :xs="24" :sm="12">
                         <el-form-item label="Tỉnh / Thành phố">
                            <el-select v-model="form.province" placeholder="Chọn Tỉnh" @change="onProvinceChange" filterable class="w-full">
                                 <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
                            </el-select>
                         </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                          <el-form-item label="Phường / Xã">
                            <el-select v-model="form.ward" placeholder="Chọn Xã" filterable class="w-full" :disabled="!form.province">
                                <el-option v-for="w in formWards" :key="w.name" :label="w.name" :value="w.name" />
                            </el-select>
                         </el-form-item>
                    </el-col>
                </el-row>

                <el-row :gutter="20">
                    <el-col :xs="24" :sm="12">
                        <el-form-item label="Vĩ độ (Lat)">
                            <el-input-number v-model="form.locationLat" :precision="6" :step="0.0001" class="w-full" controls-position="right" />
                        </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                        <el-form-item label="Kinh độ (Long)">
                            <el-input-number v-model="form.locationLong" :precision="6" :step="0.0001" class="w-full" controls-position="right" />
                        </el-form-item>
                    </el-col>
                </el-row>
                
                <div id="asset-map" class="h-64 rounded-lg border mt-2 mb-4"></div>
                <p class="text-xs text-gray-500 italic mb-4">* Click trên bản đồ hoặc kéo ghim để xác định vị trí tài sản.</p>
            </el-form>

            <template #footer>
                <el-button @click="showModal = false">Hủy</el-button>
                <el-button type="primary" :loading="submitting" @click="handleSubmit">
                    {{ isEdit ? 'Cập nhật thông tin' : 'Xác nhận khởi tạo mẫu' }}
                </el-button>
            </template>
        </el-dialog>

        <!-- Trình quét mã QR cho Modal -->
        <QRScannerDialog 
            v-model="showQrScanner" 
            @scan="onQrScanInModal" 
        />

        <!-- Dialog Chi tiết -->
        <el-dialog v-model="detailVisible" title="Chi tiết tài sản" width="90%" style="max-width: 800px">
            <div v-if="selectedAssetData?.asset">
                <el-descriptions border :column="2">
                    <el-descriptions-item label="Mã QR">{{ selectedAssetData.asset.qrCode }}</el-descriptions-item>
                    <el-descriptions-item label="Tên tài sản">{{ selectedAssetData.asset.assetName }}</el-descriptions-item>
                    <el-descriptions-item label="Người chăm sóc">{{ selectedAssetData.asset.caretaker?.fullName }}</el-descriptions-item>
                    <el-descriptions-item label="Chủ sở hữu">{{ selectedAssetData.asset.currentOwner?.fullName }}</el-descriptions-item>
                    <el-descriptions-item label="Vùng trồng">{{ selectedAssetData.asset.farmLocation?.name }}</el-descriptions-item>
                    <el-descriptions-item label="Vị trí">{{ selectedAssetData.asset.province }} - {{ selectedAssetData.asset.ward }}</el-descriptions-item>
                </el-descriptions>
                
                <div v-if="selectedAssetData.asset.product" class="mt-4 p-4 border rounded bg-gray-50">
                    <h4 class="font-bold mb-2">Thông tin sản phẩm gốc</h4>
                    <p><strong>GTIN:</strong> {{ selectedAssetData.asset.product.gtinCode }}</p>
                    <p><strong>Tên:</strong> {{ selectedAssetData.asset.product.name }}</p>
                </div>
            </div>
        </el-dialog>

        <!-- Dialog Nhật ký -->
        <el-dialog v-model="historyVisible" title="Nhật ký chăm sóc" width="90%" style="max-width: 900px">
            <el-table :data="selectedAssetData?.logs" stripe border max-height="500">
                <el-table-column prop="performedAt" label="Thời gian" width="180">
                    <template #default="{ row }">
                        {{ new Date(row.performedAt).toLocaleString() }}
                    </template>
                </el-table-column>
                <el-table-column prop="description" label="Nội dung" />
                <el-table-column label="Hình ảnh" width="200">
                    <template #default="{ row }">
                        <div class="flex gap-1 overflow-x-auto">
                            <el-image 
                                v-for="(img, idx) in row.images" 
                                :key="idx" 
                                :src="img" 
                                :preview-src-list="row.images"
                                class="w-12 h-12 rounded object-cover"
                            />
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>

        <!-- Modals bổ sung -->
        <ProductFormModal
            v-model="showProductModal"
            :is-edit="false"
            :product-data="null"
            :categories="assetTypes"
            :tenants="tenants"
            :is-system-admin="isSystemAdmin"
            @saved="fetchInitialData"
        />

        <UserFormModal
            v-model="showUserModal"
            fixed-role="END_USER"
            :tenants="tenants"
            :is-system-admin="isSystemAdmin"
            @saved="onOwnerSaved"
        />
    </div>
</template>

<style scoped>
.bg-blue-50 {
    background-color: #f0f7ff;
}
.text-blue-700 {
    color: #1a56db;
}
#asset-map {
    z-index: 1;
}
</style>
