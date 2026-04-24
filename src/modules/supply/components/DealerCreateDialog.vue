<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { dealerApi, type DealerDto } from '../api/dealerApi';
import { regionApi, type RegionDto } from '../api/regionApi';
import { userApi } from '@/modules/core/api/user';
import { ElMessage } from 'element-plus';
import { UserFilled, Location, Phone, Message, Coordinate } from '@element-plus/icons-vue';
import { VIETNAM_PROVINCES } from '@/common/data/provinces';
import { vietnamUnits } from '@/common/data/vietnam-units';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';

const props = defineProps<{
    modelValue: boolean;
    editData?: DealerDto;
}>();

const isEditMode = computed(() => !!props.editData?.id);

const emit = defineEmits(['update:modelValue', 'created', 'updated']);

const loading = ref(false);
const regions = ref<RegionDto[]>([]);
const selectedRegionId = ref('');
const provinceList = ref(VIETNAM_PROVINCES);

const managers = ref<any[]>([]);

const selectedProvince = ref('');
const selectedWard = ref('');

const wardsList = ref<{ ward_code: string; name: string }[]>([]);

watch(selectedProvince, (newProv) => {
    selectedWard.value = '';
    if (newProv) {
        const p = vietnamUnits.find(u => u.name === newProv || u.short_name === newProv);
        wardsList.value = p ? p.wards : [];
        
        // Auto-match region (Phân vùng) based on selected Province
        const matchingRegion = regions.value.find(r => r.provinces && r.provinces.includes(newProv));
        if (matchingRegion) {
            selectedRegionId.value = matchingRegion.id!;
            form.value.provinces = [...matchingRegion.provinces];
        } else {
            selectedRegionId.value = '';
            form.value.provinces = [newProv]; // Default to just this province if no region matched
        }
    } else {
        wardsList.value = [];
        selectedRegionId.value = '';
        form.value.provinces = [];
    }
});

const form = ref<DealerDto>({
    name: '',
    taxCode: '',
    address: '',
    phone: '',
    email: '',
    contactPerson: '',
    provinces: [],
    dealerTenantId: '',
    managerId: '',
    projectedInfo: {},
    coordinate: null,
    createAccount: false,
    accountInfo: {
        username: '',
        password: ''
    }
});

// Mapbox setup
const mapContainer = ref<HTMLElement | null>(null);
let map: mapboxgl.Map | null = null;
let marker: mapboxgl.Marker | null = null;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const initMap = () => {
    if (!mapContainer.value || !MAPBOX_TOKEN) return;
    
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map = new mapboxgl.Map({
        container: mapContainer.value,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [105.804817, 21.028511], // Default Hanoi
        zoom: 12
    });

    map.on('click', async (e) => {
        const { lng, lat } = e.lngLat;
        updateMarker(lng, lat);
        
        form.value.coordinate = {
            type: 'Point',
            coordinates: [lng, lat]
        };

        // Reverse Geocoding
        try {
            const res = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=vi`);
            if (res.data.features && res.data.features.length > 0) {
                const feature = res.data.features[0];
                
                let rawPlaceName = feature.place_name;
                // Sometimes Mapbox has the house number in feature.address but not in place_name
                if (feature.address && !rawPlaceName.includes(feature.address)) {
                    rawPlaceName = `${feature.address} ${rawPlaceName}`;
                }

                // Clean up address (remove zip codes like 16300, 100000)
                const cleanAddress = rawPlaceName.split(',')
                    .map((c: string) => c.trim())
                    .filter((c: string) => !/^\d{4,6}$/.test(c))
                    .join(', ');
                form.value.address = cleanAddress;
                
                // Helper to normalize strings (remove accents)
                const removeAccents = (str: string) => {
                    return str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase() : '';
                };
                const stripPrefixes = (s: string) => s.replace(/^(phuong|xa|thi tran|quan|huyen|tp|thanh pho|p\.|x\.|tt\.|q\.|h\.)\s+/g, '').trim();

                // Try to extract province from 'region' or 'place' (Mapbox can use either for VN provinces)
                const context = feature.context || [];
                const region = context.find((c: any) => c.id.startsWith('region')) || context.find((c: any) => c.id.startsWith('place'));
                const neighborhood = context.find((c: any) => c.id.startsWith('neighborhood')) || context.find((c: any) => c.id.startsWith('locality'));
                
                if (region) {
                    const provName = removeAccents(region.text);
                    const matchedProv = vietnamUnits.find(u => {
                        const uName = removeAccents(u.name);
                        const uShort = removeAccents(u.short_name);
                        return uName.includes(provName) || uShort.includes(provName) || provName.includes(uShort);
                    });
                    
                    if (matchedProv) {
                        selectedProvince.value = matchedProv.name;
                        
                        // Wait for wardsList to update
                        nextTick(() => {
                            if (wardsList.value.length > 0) {
                                let matchedWard = null;
                                const cleanAddrNoAccents = removeAccents(cleanAddress);
                                const chunksNoAccents = cleanAddrNoAccents.split(',').map(c => stripPrefixes(c.trim()));
                                
                                // 1. Try exact match in address chunks (highest accuracy)
                                matchedWard = wardsList.value.find(w => {
                                    const wNameClean = stripPrefixes(removeAccents(w.name));
                                    return chunksNoAccents.includes(wNameClean);
                                });

                                // 2. Try substring match in address chunks
                                if (!matchedWard) {
                                    matchedWard = wardsList.value.find(w => {
                                        const wNameClean = stripPrefixes(removeAccents(w.name));
                                        return wNameClean.length > 3 && chunksNoAccents.some(c => c.includes(wNameClean));
                                    });
                                }

                                // 3. Fallback to Mapbox neighborhood context
                                if (!matchedWard && neighborhood) {
                                    const wardNameClean = stripPrefixes(removeAccents(neighborhood.text));
                                    matchedWard = wardsList.value.find(w => {
                                        const wNameClean = stripPrefixes(removeAccents(w.name));
                                        return wNameClean === wardNameClean || wNameClean.includes(wardNameClean) || wardNameClean.includes(wNameClean);
                                    });
                                }

                                if (matchedWard) {
                                    selectedWard.value = matchedWard.name;
                                }
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Reverse geocoding error', err);
        }
    });
};

const updateMarker = (lng: number, lat: number) => {
    if (!map) return;
    if (marker) {
        marker.setLngLat([lng, lat]);
    } else {
        marker = new mapboxgl.Marker({ color: '#F56C6C' })
            .setLngLat([lng, lat])
            .addTo(map);
    }
};

const fetchRegions = async () => {
    try {
        regions.value = await regionApi.findAll();
    } catch (e) {
        console.error('Failed to fetch regions', e);
    }
};

const fetchManagers = async () => {
    try {
        const { data } = await userApi.getList({ page: 1, limit: 100 });
        managers.value = data.data || [];
    } catch (e) {
        console.error('Failed to fetch managers', e);
    }
};

const handleRegionChange = (regionId: string) => {
    const region = regions.value.find(r => r.id === regionId);
    if (region && region.provinces) {
        const currentProvinces = new Set(form.value.provinces || []);
        region.provinces.forEach(p => currentProvinces.add(p));
        form.value.provinces = Array.from(currentProvinces);
        ElMessage.success(`Đã thêm ${region.provinces.length} tỉnh từ vùng ${region.name}`);
    }
};

const handleClose = () => {
    emit('update:modelValue', false);
};

const saveDealer = async () => {
    if (!form.value.name) {
        ElMessage.warning('Vui lòng nhập tên đại lý');
        return;
    }
    
    if (form.value.createAccount) {
        if (!form.value.accountInfo?.username || !form.value.accountInfo?.password) {
            ElMessage.warning('Vui lòng nhập tài khoản và mật khẩu');
            return;
        }
    }

    form.value.projectedInfo = {
        province: selectedProvince.value,
        ward: selectedWard.value
    };

    loading.value = true;
    try {
        if (isEditMode.value) {
            // Update mode
            const res = await dealerApi.update(form.value.id!, form.value);
            const result = res.data;
            if (result.accountLinked) {
                ElMessage.success({ message: 'Cập nhật thành công! Đã tự động liên kết tài khoản (MST trùng).', duration: 5000, showClose: true });
            } else if (result.accountCreated) {
                ElMessage.success('Cập nhật và tạo tài khoản thành công');
            } else {
                ElMessage.success('Cập nhật đại lý thành công');
            }
            emit('updated', result);
        } else {
            // Create mode
            const res = await dealerApi.create(form.value);
            const result = res.data;
            if (result.accountLinked) {
                ElMessage.success({
                    message: 'Thêm đại lý thành công! Đại lý này đã có tài khoản trong hệ thống (MST trùng) — đã tự động liên kết.',
                    duration: 5000, showClose: true
                });
            } else if (result.accountCreated) {
                ElMessage.success('Thêm đại lý mới và tạo tài khoản thành công');
            } else {
                ElMessage.success('Thêm đại lý mới thành công');
            }
            emit('created', result);
        }

        handleClose();
        if (marker) { marker.remove(); marker = null; }
    } catch (e: any) {
        ElMessage.error('Lưu thất bại: ' + (e.response?.data?.message || e.message));
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchRegions();
    fetchManagers();
});

watch(() => props.modelValue, (val) => {
    if (val) {
        selectedRegionId.value = '';
        fetchRegions();
        fetchManagers();

        // Pre-populate form in edit mode
        if (props.editData) {
            const d = props.editData;
            form.value = {
                ...d,
                provinces: d.provinces ?? [],
                createAccount: false,
                accountInfo: { username: '', password: '' }
            };
            selectedProvince.value = d.projectedInfo?.province ?? '';
            nextTick(() => {
                selectedWard.value = d.projectedInfo?.ward ?? '';
            });
        } else {
            form.value = {
                name: '', taxCode: '', address: '', phone: '', email: '',
                contactPerson: '', provinces: [], dealerTenantId: '', managerId: '',
                projectedInfo: {}, coordinate: null, createAccount: false,
                accountInfo: { username: '', password: '' }
            };
            selectedProvince.value = '';
            selectedWard.value = '';
        }
    }
});

const handleOpened = () => {
    if (!map) initMap();
    else map.resize();
};

const handleClosed = () => {
    if (map) {
        map.remove();
        map = null;
        marker = null;
    }
};

onUnmounted(() => {
    handleClosed();
});
</script>

<template>
    <el-dialog 
        :model-value="modelValue" 
        @update:model-value="handleClose"
        @opened="handleOpened"
        @closed="handleClosed"
        :title="isEditMode ? 'Cập nhật thông tin Đại lý' : 'Thêm đại lý mới'" 
        width="750px"
        destroy-on-close
    >
        <el-form :model="form" label-width="130px" v-loading="loading" @submit.prevent="saveDealer">
            <el-form-item label="Tên đại lý" required>
                <el-input v-model="form.name" placeholder="Tên DN / Đại lý / Nhà cung cấp" />
            </el-form-item>
            
            <div class="grid grid-cols-2">
                <el-form-item label="Mã số thuế">
                    <el-input v-model="form.taxCode" />
                </el-form-item>
                <el-form-item label="Người liên hệ">
                    <el-input v-model="form.contactPerson" />
                </el-form-item>
                <el-form-item label="Số điện thoại">
                    <el-input v-model="form.phone" />
                </el-form-item>
                <el-form-item label="Email">
                    <el-input v-model="form.email" />
                </el-form-item>
            </div>
            
            <el-form-item label="Quản lý bởi">
                <el-select v-model="form.managerId" placeholder="Mặc định: Người tạo" class="w-full" clearable>
                    <el-option v-for="u in managers" :key="u.id" :label="u.fullName || u.username" :value="u.id" />
                </el-select>
            </el-form-item>

            <el-divider content-position="left">Địa chỉ & Tọa độ</el-divider>
            
            <div class="grid grid-cols-2 gap-4">
                <el-form-item label="Tỉnh/Thành phố">
                    <el-select v-model="selectedProvince" filterable placeholder="Chọn tỉnh" class="w-full" clearable>
                        <el-option v-for="p in vietnamUnits" :key="p.province_code" :label="p.name" :value="p.name" />
                    </el-select>
                </el-form-item>
                <el-form-item label="Quận/Huyện/Xã">
                    <el-select v-model="selectedWard" filterable placeholder="Chọn xã/phường" class="w-full" :disabled="!selectedProvince" clearable>
                        <el-option v-for="w in wardsList" :key="w.ward_code" :label="w.name" :value="w.name" />
                    </el-select>
                </el-form-item>
            </div>
            
            <el-form-item label="Địa chỉ chi tiết">
                <el-input v-model="form.address" type="textarea" rows="2" placeholder="Số nhà, đường phố..." />
            </el-form-item>

            <el-form-item label="Chọn trên bản đồ">
                <div ref="mapContainer" style="width: 100%; height: 250px; border-radius: 8px; overflow: hidden; border: 1px solid #dcdfe6;"></div>
                <div class="text-xs text-gray-500 mt-1 w-full flex justify-between">
                    <span>Click vào bản đồ để chọn tọa độ đại lý</span>
                    <span v-if="form.coordinate" class="text-blue-500">
                        Đã chọn: {{ form.coordinate.coordinates[0].toFixed(5) }}, {{ form.coordinate.coordinates[1].toFixed(5) }}
                    </span>
                </div>
            </el-form-item>

            <el-divider content-position="left">Phân vùng quản lý đại lý</el-divider>
            <div class="mb-4">
                <el-form-item label="Chọn vùng">
                    <el-select v-model="selectedRegionId" placeholder="Tự động nhận diện từ tỉnh" @change="handleRegionChange" class="w-full" clearable>
                        <el-option v-for="r in regions" :key="r.id" :label="r.name" :value="r.id!" />
                    </el-select>
                </el-form-item>
                <div class="text-xs text-gray-500 ml-[130px] -mt-2">
                    Khu vực bán hàng: {{ form.provinces?.length ? form.provinces.join(', ') : 'Chưa phân vùng' }}
                </div>
            </div>
            
            <el-divider content-position="left">Tài khoản đăng nhập</el-divider>

            <!-- Edit mode: show existing account -->
            <template v-if="isEditMode">
                <el-form-item label="Tài khoản">
                    <div v-if="form.dealerTenant" class="flex items-center gap-3 py-1">
                        <el-tag type="success" size="large" effect="plain">
                            <el-icon class="mr-1"><UserFilled /></el-icon>
                            {{ form.dealerTenant?.name || form.dealerTenant?.username || 'Tài khoản đã liên kết' }}
                        </el-tag>
                        <span class="text-xs text-gray-400">MST: {{ form.dealerTenant?.taxCode || '—' }}</span>
                    </div>
                    <div v-else class="flex items-center gap-3">
                        <span class="text-sm text-gray-400">Chưa có tài khoản</span>
                        <el-button size="small" type="primary" plain @click="form.createAccount = !form.createAccount">
                            {{ form.createAccount ? 'Hủy' : '+ Thêm tài khoản' }}
                        </el-button>
                    </div>
                </el-form-item>
                <div v-if="form.createAccount && !form.dealerTenant" class="bg-gray-50 p-4 rounded-lg mb-4 border border-blue-50">
                    <el-form-item label="Username" required>
                        <el-input v-model="form.accountInfo!.username" placeholder="Tên đăng nhập" />
                    </el-form-item>
                    <el-form-item label="Mật khẩu" required>
                        <el-input v-model="form.accountInfo!.password" type="password" show-password placeholder="Mật khẩu khởi tạo" />
                    </el-form-item>
                </div>
            </template>

            <!-- Create mode: toggle to create account -->
            <template v-else>
                <el-form-item label="Tạo tài khoản">
                    <el-switch v-model="form.createAccount" />
                    <span class="text-xs text-gray-400 ml-2">Tạo Tenant & User với quyền DEALER</span>
                </el-form-item>
                <div v-if="form.createAccount" class="bg-gray-50 p-4 rounded-lg mb-4 border border-blue-50">
                    <el-form-item label="Username" required>
                        <el-input v-model="form.accountInfo!.username" placeholder="Tên đăng nhập" />
                    </el-form-item>
                    <el-form-item label="Mật khẩu" required>
                        <el-input v-model="form.accountInfo!.password" type="password" show-password placeholder="Mật khẩu khởi tạo" />
                    </el-form-item>
                </div>
            </template>
        </el-form>
        <template #footer>
            <el-button @click="handleClose">Hủy</el-button>
            <el-button type="primary" @click="saveDealer" :loading="loading">Lưu dữ liệu</el-button>
        </template>
    </el-dialog>
</template>
