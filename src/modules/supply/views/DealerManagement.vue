<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { dealerApi, type DealerDto } from '../api/dealerApi';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, Search, UserFilled, Location, Phone, Message, Tools } from '@element-plus/icons-vue';
import LTEContentHeader from '@/components/lte/LTEContentHeader.vue';
import LTECard from '@/components/lte/LTECard.vue';
import DealerCreateDialog from '../components/DealerCreateDialog.vue';
import { userApi } from '@/modules/core/api/user';

const dealers = ref<DealerDto[]>([]);
const loading = ref(false);
const searchTerm = ref('');
const isEdit = ref(false);
const showCreateDialog = ref(false);

const currentPage = ref(1);
const pageSize = ref(10);
const totalDealers = ref(0);

const form = ref<DealerDto>({
    name: '',
    taxCode: '',
    address: '',
    phone: '',
    email: '',
    contactPerson: '',
    provinces: [],
    dealerTenantId: ''
});

const editDealer = ref<DealerDto | undefined>(undefined);

const showAccountsModal = ref(false);
const selectedDealerForAccounts = ref<DealerDto | null>(null);
const dealerAccountsList = ref<any[]>([]);
const loadingAccounts = ref(false);

const openDealerAccountsModal = async (dealer: DealerDto) => {
    selectedDealerForAccounts.value = dealer;
    showAccountsModal.value = true;
    loadingAccounts.value = true;
    dealerAccountsList.value = [];

    try {
        const params: any = { page: 1, limit: 100, roleName: 'DEALER' };
        if (dealer.id) params.dealerId = dealer.id;
        else if (dealer.dealerTenantId) params.tenantId = dealer.dealerTenantId;

        const res = await userApi.getList(params);
        const rawList = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
        dealerAccountsList.value = rawList.filter((u: any) => {
            const role = u.role?.name || u.role_name || u.role;
            return role === 'DEALER';
        });
    } catch (e) {
        console.error('Failed to fetch dealer accounts', e);
        dealerAccountsList.value = [];
    } finally {
        loadingAccounts.value = false;
    }
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

const fetchDealers = async () => {
    loading.value = true;
    try {
        const { data } = await dealerApi.getList({
            page: currentPage.value,
            limit: pageSize.value,
            search: searchTerm.value || undefined
        });
        if (data && Array.isArray(data)) {
            dealers.value = data;
            totalDealers.value = data.length;
        } else {
            dealers.value = data.data || [];
            totalDealers.value = data.total || 0;
        }
    } catch (e: any) {
        ElMessage.error('Lỗi tải danh sách đại lý: ' + (e.response?.data?.message || e.message));
    } finally {
        loading.value = false;
    }
};

let debounceTimer: any = null;
const debouncedSearch = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        handleFilterChange();
    }, 300);
};

const handleFilterChange = () => {
    currentPage.value = 1;
    fetchDealers();
};

const handleSizeChange = (val: number) => {
    pageSize.value = val;
    currentPage.value = 1;
    fetchDealers();
};

const handlePageChange = (val: number) => {
    currentPage.value = val;
    fetchDealers();
};

const handleCreate = () => {
    editDealer.value = undefined;
    isEdit.value = false;
    showCreateDialog.value = true;
};

const handleEdit = (row: DealerDto) => {
    editDealer.value = { ...row };
    isEdit.value = true;
    showCreateDialog.value = true;
};

const handleDelete = (row: DealerDto) => {
    ElMessageBox.confirm('Bạn có chắc chắn muốn xóa đại lý này?', 'Cảnh báo', {
        type: 'warning'
    }).then(async () => {
        try {
            await dealerApi.delete(row.id!);
            ElMessage.success('Xóa đại lý thành công');
            fetchDealers();
        } catch (e) {
            ElMessage.error('Xóa thất bại');
        }
    });
};

const saveDealer = async () => {
    try {
        if (isEdit.value) {
            await dealerApi.update(form.value.id!, form.value);
            ElMessage.success('Cập nhật đại lý thành công');
        } else {
            await dealerApi.create(form.value);
            ElMessage.success('Thêm đại lý mới thành công');
        }
        fetchDealers();
    } catch (e: any) {
        ElMessage.error('Lưu thất bại: ' + (e.response?.data?.message || e.message));
    }
};

onMounted(fetchDealers);
</script>

<template>
    <div class="dealer-management">
        <LTEContentHeader title="Quản lý Hệ thống Đại lý" :breadcrumbs="[{ title: 'Cung ứng' }, { title: 'Đại lý' }]" />

        <LTECard variant="primary" outline>
            <div class="mb-4 flex flex-wrap gap-2 items-center justify-between">
                <div class="flex gap-2">
                    <el-input 
                        v-model="searchTerm" 
                        placeholder="Tìm theo tên, liên hệ, tỉnh thành..." 
                        :prefix-icon="Search" 
                        class="w-80" 
                        clearable 
                        @input="debouncedSearch"
                    />
                </div>
                <el-button type="primary" :icon="Plus" @click="handleCreate">Thêm đại lý</el-button>
            </div>

            <el-table :data="dealers" v-loading="loading" stripe border>
                <el-table-column label="STT" width="60" align="center">
                    <template #default="{ $index }">
                        {{ (currentPage - 1) * pageSize + $index + 1 }}
                    </template>
                </el-table-column>
                <el-table-column prop="name" label="Tên Đại lý / Nhà phân phối" min-width="200">
                    <template #default="{ row }">
                        <div class="font-bold text-blue-700">{{ row.name }}</div>
                        <div class="text-xs text-gray-500" v-if="row.taxCode">MST: {{ row.taxCode }}</div>
                    </template>
                </el-table-column>
                <el-table-column label="Thông tin liên hệ" min-width="200">
                    <template #default="{ row }">
                        <div class="flex flex-col gap-1 text-sm">
                            <div class="flex items-center gap-1" v-if="row.contactPerson">
                                <el-icon class="text-gray-400"><UserFilled /></el-icon>
                                <span>{{ row.contactPerson }}</span>
                            </div>
                            <div class="flex items-center gap-1" v-if="row.phone">
                                <el-icon class="text-gray-400"><Phone /></el-icon>
                                <span>{{ row.phone }}</span>
                            </div>
                            <div class="flex items-center gap-1" v-if="row.email">
                                <el-icon class="text-gray-400"><Message /></el-icon>
                                <span class="text-xs">{{ row.email }}</span>
                            </div>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="Địa chỉ & Khu vực" min-width="250">
                    <template #default="{ row }">
                        <div class="flex items-start gap-1 mb-1">
                            <el-icon class="mt-1 text-red-500"><Location /></el-icon>
                            <span class="text-sm line-clamp-2">{{ row.address }}</span>
                        </div>
                        <div class="flex flex-wrap gap-1 mt-1">
                            <el-tag 
                                v-for="p in row.provinces" 
                                :key="p" 
                                size="small" 
                                type="success" 
                                effect="light"
                                round
                            >
                                {{ p }}
                            </el-tag>
                            <span v-if="!row.provinces?.length" class="text-xs text-gray-400 italic">Chưa gán vùng</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="Người quản lý" min-width="150">
                    <template #default="{ row }">
                        <div v-if="row.manager">
                            <div class="font-bold text-sm text-gray-800">{{ row.manager.fullName || row.manager.username }}</div>
                            <div class="text-xs text-gray-500" v-if="row.manager.email">{{ row.manager.email }}</div>
                        </div>
                        <span v-else class="text-xs text-gray-400">Chưa phân công</span>
                    </template>
                </el-table-column>
                
                <el-table-column label="Tài khoản liên kết" width="160" align="center">
                    <template #default="{ row }">
                        <el-button type="success" plain size="small" @click="openDealerAccountsModal(row)">
                            Xem tài khoản
                        </el-button>
                    </template>
                </el-table-column>
                <el-table-column label="Thao tác" width="100" fixed="right" align="center">
                    <template #default="scope">
                        <el-button type="primary" :icon="Edit" circle size="small" @click="handleEdit(scope.row)" />
                        <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(scope.row)" />
                    </template>
                </el-table-column>
            </el-table>

            <div class="flex justify-end mt-4">
                <el-pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :page-sizes="[10, 20, 50, 100]"
                    layout="total, sizes, prev, pager, next, jumper"
                    :total="totalDealers"
                    background
                    @size-change="handleSizeChange"
                    @current-change="handlePageChange"
                />
            </div>
        </LTECard>

        <!-- Dialog Thêm/Sửa chung -->
        <DealerCreateDialog 
            v-model="showCreateDialog" 
            :edit-data="editDealer"
            @created="fetchDealers" 
            @updated="fetchDealers"
        />

        <!-- Modal Xem danh sách tài khoản của Đại lý -->
        <el-dialog
            v-model="showAccountsModal"
            :title="`Danh sách tài khoản — ${selectedDealerForAccounts?.name || ''}`"
            width="550px"
            append-to-body
        >
            <div v-loading="loadingAccounts" class="py-2">
                <div v-if="dealerAccountsList.length > 0" class="space-y-2">
                    <div class="text-xs font-medium text-gray-500 mb-2">
                        Tổng số tài khoản đã gán: <span class="font-bold text-green-700">{{ dealerAccountsList.length }}</span>
                    </div>

                    <div 
                        v-for="acc in dealerAccountsList" 
                        :key="acc.id || acc.username" 
                        class="p-3 border border-gray-100 rounded-lg flex items-center justify-between bg-gray-50 hover:bg-white hover:shadow-sm transition-all"
                    >
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-sm text-blue-900">{{ acc.username }}</span>
                                <el-tag size="small" type="success" effect="plain">{{ getRoleDisplayName(acc.role) }}</el-tag>
                            </div>
                            <div class="text-xs text-gray-600 mt-1 flex items-center gap-3">
                                <span>Họ tên: <strong class="text-gray-800">{{ acc.fullName || acc.full_name || '—' }}</strong></span>
                                <span v-if="acc.email">Email: {{ acc.email }}</span>
                            </div>
                        </div>
                        <div>
                            <el-tag size="small" :type="acc.status === 'ACTIVE' ? 'success' : 'danger'">
                                {{ acc.status === 'ACTIVE' ? 'Hoạt động' : (acc.status || 'Khóa') }}
                            </el-tag>
                        </div>
                    </div>
                </div>
                <div v-else class="text-center py-8 text-gray-400">
                    <el-icon class="text-3xl mb-2 text-gray-300"><UserFilled /></el-icon>
                    <div class="text-sm">Đại lý này chưa có tài khoản đăng nhập nào.</div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-between items-center">
                    <el-button 
                        type="primary" 
                        plain 
                        size="small" 
                        @click="showAccountsModal = false; handleEdit(selectedDealerForAccounts!)"
                    >
                        + Quản lý / Thêm tài khoản mới
                    </el-button>
                    <el-button @click="showAccountsModal = false">Đóng</el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.dealer-management :deep(.el-card) {
    border-radius: 12px;
}
</style>
