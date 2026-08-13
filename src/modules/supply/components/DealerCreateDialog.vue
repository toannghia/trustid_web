<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { dealerApi, type DealerDto } from '../api/dealerApi';
import { regionApi, type RegionDto } from '../api/regionApi';
import { userApi } from '@/modules/core/api/user';
import { ElMessage } from 'element-plus';
import brandLogo from '@/assets/images/TrusID-TV_w.png';
import { UserFilled, Location, Phone, Message, Coordinate, Close } from '@element-plus/icons-vue';
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

const originalFormState = ref('');
const getFullFormState = () => {
    return JSON.stringify({
        form: form.value,
        province: selectedProvince.value,
        ward: selectedWard.value
    });
};

const isFormChanged = computed(() => {
    return getFullFormState() !== originalFormState.value;
});

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
    createAccount: true,
    accountInfo: {
        username: '',
        password: ''
    }
});

const dealerAccounts = ref<any[]>([]);
const showAddAccountForm = ref(false);
const addingAccount = ref(false);
const selectedAccountForDetail = ref<any>(null);
const showAccountDetailModal = ref(false);

const viewAccountDetail = (account: any) => {
    selectedAccountForDetail.value = account;
    showAccountDetailModal.value = true;
};

const getRoleDisplayName = (role: any): string => {
    if (!role) return 'Đại lý';
    if (typeof role === 'object' && role.displayName) return role.displayName;
    const name = typeof role === 'object' ? role.name : role;
    const roleMap: Record<string, string> = {
        'DEALER': 'Đại lý',
        'ADMIN': 'Quản trị viên',
        'REGULATOR': 'Cơ quan quản lý',
        'REGULATOR_OFFICER': 'Cán bộ Sở',
        'PRODUCER': 'Doanh nghiệp',
        'FARMER': 'Nông dân',
        'DRIVER': 'Lái xe',
        'WAREHOUSE': 'Thủ kho',
        'PACKAGER': 'Nhân viên đóng gói',
        'END_USER': 'Người dùng cuối'
    };
    return roleMap[name] || name || 'Đại lý';
};

const newAccount = ref({
    username: '',
    password: '',
    fullName: '',
    email: ''
});

const fetchDealerAccounts = async (tenantId?: string, dealerId?: string) => {
    const dId = dealerId || form.value.id || props.editData?.id;
    const tId = tenantId || form.value.dealerTenantId || props.editData?.dealerTenantId;

    if (!dId && !tId) {
        dealerAccounts.value = [];
        return;
    }

    try {
        const params: any = { page: 1, limit: 100, roleName: 'DEALER' };
        if (dId) params.dealerId = dId;
        else if (tId) params.tenantId = tId;

        const res = await userApi.getList(params);
        const rawList = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
        dealerAccounts.value = rawList.filter((u: any) => {
            const role = u.role?.name || u.role_name || u.role;
            return role === 'DEALER';
        });
    } catch (e) {
        console.error('Failed to fetch dealer accounts', e);
        dealerAccounts.value = [];
    }
};

const toggleAddAccount = () => {
    showAddAccountForm.value = !showAddAccountForm.value;
    if (!showAddAccountForm.value) {
        newAccount.value = { username: '', password: '', fullName: '', email: '' };
    }
};

const quickCreateAccountForDealer = async () => {
    if (!newAccount.value.username || !newAccount.value.password) {
        ElMessage.warning('Vui lòng nhập Tên đăng nhập và Mật khẩu');
        return;
    }

    const dealerId = form.value.id || props.editData?.id;
    let tenantId = form.value.dealerTenantId || props.editData?.dealerTenantId;

    if (!dealerId && !tenantId) {
        ElMessage.warning('Vui lòng lưu thông tin đại lý trước khi tạo tài khoản.');
        return;
    }

    addingAccount.value = true;
    try {
        const res = await userApi.create({
            username: newAccount.value.username,
            password: newAccount.value.password,
            fullName: newAccount.value.fullName || form.value.contactPerson || form.value.name,
            email: newAccount.value.email || form.value.email || undefined,
            roleName: 'DEALER',
            dealerId: dealerId,
            tenantId: tenantId
        });

        const createdUser = res.data;
        const assignedTenantId = createdUser?.tenant?.id || createdUser?.tenantId || tenantId;
        if (assignedTenantId) {
            form.value.dealerTenantId = assignedTenantId;
            if (props.editData) props.editData.dealerTenantId = assignedTenantId;
            tenantId = assignedTenantId;
        }

        ElMessage.success(`Tạo thành công tài khoản "${newAccount.value.username}" cho đại lý!`);
        newAccount.value = { username: '', password: '', fullName: '', email: '' };
        showAddAccountForm.value = false;
        fetchDealerAccounts(tenantId);
    } catch (e: any) {
        ElMessage.error('Tạo tài khoản thất bại: ' + (e.response?.data?.message || e.message));
    } finally {
        addingAccount.value = false;
    }
};

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

    if (!isEditMode.value) {
        if (showAddAccountForm.value && newAccount.value.username && newAccount.value.password) {
            form.value.createAccount = true;
            form.value.accountInfo = {
                username: newAccount.value.username,
                password: newAccount.value.password
            };
        } else if (newAccount.value.username && newAccount.value.password) {
            form.value.createAccount = true;
            form.value.accountInfo = {
                username: newAccount.value.username,
                password: newAccount.value.password
            };
        }
    }

    if (form.value.createAccount && !isEditMode.value) {
        if (!form.value.accountInfo?.username || !form.value.accountInfo?.password) {
            ElMessage.warning('Vui lòng nhập tên đăng nhập và mật khẩu khởi tạo');
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
            if (showAddAccountForm.value && newAccount.value.username && newAccount.value.password) {
                await quickCreateAccountForDealer();
            }

            const res = await dealerApi.update(form.value.id!, form.value);
            const result = res.data;
            ElMessage.success('Cập nhật đại lý thành công');
            emit('updated', result);
        } else {
            const res = await dealerApi.create(form.value);
            const result = res.data;
            if (result.accountLinked) {
                ElMessage.success({
                    message: 'Thêm đại lý thành công! Đại lý này đã có tài khoản trong hệ thống — đã tự động liên kết.',
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
        showAddAccountForm.value = false;
        newAccount.value = { username: '', password: '', fullName: '', email: '' };
        fetchRegions();
        fetchManagers();

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
                originalFormState.value = getFullFormState();
            });

            if (d.dealerTenantId || d.id) {
                fetchDealerAccounts(d.dealerTenantId, d.id);
            } else {
                dealerAccounts.value = [];
            }
        } else {
            form.value = {
                name: '', taxCode: '', address: '', phone: '', email: '',
                contactPerson: '', provinces: [], dealerTenantId: '', managerId: '',
                projectedInfo: {}, coordinate: null, createAccount: true,
                accountInfo: { username: '', password: '' }
            };
            selectedProvince.value = '';
            selectedWard.value = '';
            dealerAccounts.value = [];
            showAddAccountForm.value = true; // Default show form in create mode
            nextTick(() => {
                originalFormState.value = getFullFormState();
            });
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
        width="750px"
        destroy-on-close
        :show-close="false"
        :close-on-click-modal="false"
        class="branded-dealer-dialog"
    >
        <template #header>
            <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                <span style="color: #fff; font-size: 16px; font-weight: 600;">
                    {{ isEditMode ? 'Cập nhật thông tin Đại lý' : 'Thêm đại lý mới' }}
                </span>
                <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="handleClose">
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>

        <el-form :model="form" label-width="130px" v-loading="loading" @submit.prevent="saveDealer" style="padding: 24px 24px 8px; --el-border-radius-base: 8px;">
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

            <!-- Danh sách & Thêm tài khoản mới -->
            <div class="px-2 mb-4">
                <div class="mb-3" v-if="isEditMode || dealerAccounts.length > 0">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Danh sách tài khoản đã gán ({{ dealerAccounts.length }})
                        </span>
                        <span v-if="form.taxCode" class="text-xs text-gray-400">MST: {{ form.taxCode }}</span>
                    </div>

                    <div v-if="dealerAccounts.length > 0" class="flex flex-wrap items-center gap-2 py-1">
                        <el-tag 
                            v-for="acc in dealerAccounts" 
                            :key="acc.id || acc.username" 
                            type="success" 
                            size="large" 
                            effect="plain" 
                            class="cursor-pointer hover:bg-green-50 transition-colors py-1 px-3"
                            @click="viewAccountDetail(acc)"
                        >
                            <span class="font-medium text-sm text-green-700">{{ acc.username }}</span>
                            <span v-if="acc.fullName || acc.full_name" class="text-xs text-gray-500 ml-1">({{ acc.fullName || acc.full_name }})</span>
                        </el-tag>
                    </div>
                    <div v-else class="text-xs text-gray-400 italic py-1">Chưa có tài khoản nào thuộc đại lý này</div>
                </div>

                <div class="flex items-center justify-between py-2 border-t border-gray-100 mt-2">
                    <span class="text-sm font-medium text-gray-700">Tạo tài khoản đăng nhập mới</span>
                    <el-button size="small" type="primary" plain @click="toggleAddAccount">
                        {{ showAddAccountForm ? 'Hủy bỏ' : '+ Thêm tài khoản' }}
                    </el-button>
                </div>

                <div v-if="showAddAccountForm" class="bg-gray-50 p-4 rounded-lg mt-2 border border-blue-100">
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="text-xs text-gray-600 block mb-1">Tên đăng nhập (Username/SĐT) <span class="text-red-500">*</span></label>
                            <el-input v-model="newAccount.username" placeholder="Nhập tên đăng nhập" />
                        </div>
                        <div>
                            <label class="text-xs text-gray-600 block mb-1">Mật khẩu khởi tạo <span class="text-red-500">*</span></label>
                            <el-input v-model="newAccount.password" type="password" show-password placeholder="Nhập mật khẩu" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mb-2">
                        <div>
                            <label class="text-xs text-gray-600 block mb-1">Họ tên đại diện</label>
                            <el-input v-model="newAccount.fullName" placeholder="Mặc định lấy Tên đại lý" />
                        </div>
                        <div>
                            <label class="text-xs text-gray-600 block mb-1">Email liên hệ</label>
                            <el-input v-model="newAccount.email" placeholder="Nhập email (tùy chọn)" />
                        </div>
                    </div>
                    <div v-if="isEditMode" class="flex justify-end mt-3">
                        <el-button type="success" size="small" :loading="addingAccount" @click="quickCreateAccountForDealer">
                            ✓ Thêm nhanh tài khoản này
                        </el-button>
                    </div>
                </div>
            </div>
        </el-form>
        <template #footer>
            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 24px;">
                <el-button @click="handleClose" style="border-radius: 8px; padding: 10px 20px;">Hủy</el-button>
                <el-button 
                    type="primary" 
                    @click="saveDealer" 
                    :disabled="!isFormChanged"
                    :loading="loading"
                    style="border-radius: 8px; padding: 10px 20px; border: none; color: #fff; background: #00875A;"
                >
                    Lưu dữ liệu
                </el-button>
            </div>
        </template>
    </el-dialog>

    <!-- Dialog chi tiết tài khoản -->
    <el-dialog
        v-model="showAccountDetailModal"
        width="450px"
        append-to-body
        :show-close="false"
        class="branded-dealer-dialog"
    >
        <template #header>
            <div style="background: #0F2B46; padding: 16px 24px; display: flex; align-items: center; gap: 14px; width: 100%;">
                <img :src="brandLogo" alt="TrustID" style="height: 28px; object-fit: contain;" />
                <div style="height: 24px; width: 1px; background: rgba(255,255,255,0.3);"></div>
                <span style="color: #fff; font-size: 16px; font-weight: 600;">Thông tin chi tiết tài khoản</span>
                <div style="margin-left: auto; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);" @click="showAccountDetailModal = false">
                    <span style="color: #ffffff; font-size: 16px; font-weight: 300; line-height: 1;">&times;</span>
                </div>
            </div>
        </template>
        <div v-if="selectedAccountForDetail" class="space-y-3 py-1">
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span class="text-xs font-semibold text-gray-500 uppercase">Tên đăng nhập:</span>
                <span class="text-base font-bold text-blue-900">{{ selectedAccountForDetail.username }}</span>
            </div>
            
            <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="p-2.5 border border-gray-100 rounded-md">
                    <span class="text-xs text-gray-400 block mb-1">Họ và tên</span>
                    <span class="font-medium text-gray-800">{{ selectedAccountForDetail.fullName || selectedAccountForDetail.full_name || '—' }}</span>
                </div>
                <div class="p-2.5 border border-gray-100 rounded-md">
                    <span class="text-xs text-gray-400 block mb-1">Vai trò</span>
                    <el-tag size="small" type="primary">{{ getRoleDisplayName(selectedAccountForDetail.role) }}</el-tag>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="p-2.5 border border-gray-100 rounded-md">
                    <span class="text-xs text-gray-400 block mb-1">Email</span>
                    <span class="text-gray-700 truncate block">{{ selectedAccountForDetail.email || '—' }}</span>
                </div>
                <div class="p-2.5 border border-gray-100 rounded-md">
                    <span class="text-xs text-gray-400 block mb-1">Trạng thái</span>
                    <el-tag size="small" :type="selectedAccountForDetail.status === 'ACTIVE' ? 'success' : 'danger'">
                        {{ selectedAccountForDetail.status === 'ACTIVE' ? 'Hoạt động' : (selectedAccountForDetail.status || 'Khóa') }}
                    </el-tag>
                </div>
            </div>

            <div v-if="selectedAccountForDetail.createdAt" class="p-2.5 border border-gray-100 rounded-md text-xs text-gray-500 flex justify-between">
                <span>Ngày tạo:</span>
                <span>{{ new Date(selectedAccountForDetail.createdAt).toLocaleString('vi-VN') }}</span>
            </div>
        </div>

        <template #footer>
            <div style="display: flex; justify-content: flex-end; padding: 0 24px 24px;">
                <el-button @click="showAccountDetailModal = false" style="border-radius: 8px; padding: 10px 20px;">Đóng</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style>
.branded-dealer-dialog {
  border-radius: 8px !important;
  overflow: hidden !important;
  padding: 0 !important;
}
.branded-dealer-dialog .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
}
.branded-dealer-dialog .el-dialog__body {
  padding: 0 !important;
}
.branded-dealer-dialog .el-dialog__footer {
  padding: 0 !important;
}
</style>
