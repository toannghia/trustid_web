<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Search, Lock, Unlock, View, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '@/common/utils/api';

const loading = ref(false);
const users = ref<any[]>([]);
const totalUsers = ref(0);
const query = reactive({
    page: 1,
    limit: 10,
    search: '',
    status: ''
});

const dialogVisible = ref(false);
const selectedUser = ref<any>(null);
const historyLoading = ref(false);
const scanHistory = ref<any[]>([]);

// Real API Call
const fetchUsers = async () => {
    loading.value = true;
    try {
        const response = await api.get('/admin/end-users', {
            params: {
                page: query.page,
                limit: query.limit,
                search: query.search || undefined,
                status: query.status || undefined
            }
        });
        users.value = response.data.data;
        totalUsers.value = response.data.meta.total;
    } catch (error: any) {
        ElMessage.error(error.message || 'Không thể tải danh sách người dùng');
    } finally {
        loading.value = false;
    }
};

const handleSearch = () => {
    query.page = 1;
    fetchUsers();
};

const handleStatusChange = () => {
    query.page = 1;
    fetchUsers();
};

const handlePageChange = (page: number) => {
    query.page = page;
    fetchUsers();
};

const viewDetails = (user: any) => {
    selectedUser.value = user;
    dialogVisible.value = true;
    fetchHistory(user.id);
};

const fetchHistory = async (userId: string) => {
    historyLoading.value = true;
    scanHistory.value = [];
    try {
        const response = await api.get(`/admin/end-users/${userId}/history`);
        scanHistory.value = response.data.data;
    } catch (error: any) {
        ElMessage.error('Không thể tải lịch sử quét: ' + (error.response?.data?.message || error.message));
    } finally {
        historyLoading.value = false;
    }
};

const toggleBlockUser = (user: any) => {
    const action = user.status === 'ACTIVE' ? 'KHÓA' : 'MỞ KHÓA';
    const newStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    
    ElMessageBox.confirm(
        `Bạn có chắc chắn muốn ${action} tài khoản ${user.phoneNumber}?`,
        'Xác nhận',
        {
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Hủy',
            type: 'warning',
        }
    ).then(async () => {
        try {
            await api.put(`/admin/end-users/${user.id}/status`, { status: newStatus });
            user.status = newStatus;
            ElMessage.success(`${action} thành công`);
        } catch (error: any) {
            ElMessage.error(`Lỗi: ${error.response?.data?.message || error.message}`);
        }
    }).catch(() => {});
};

onMounted(() => {
    fetchUsers();
});
</script>

<template>
    <div class="app-user-management p-6">
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">Quản lý Khách hàng App</h1>
                <p class="text-gray-500 text-sm mt-1">Danh sách người dùng đăng ký qua Ứng dụng di động</p>
            </div>
            <div class="flex gap-2">
                <el-button :icon="Refresh" circle @click="fetchUsers" />
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-4 flex-wrap">
            <div class="flex-1 min-w-[300px]">
                <el-input 
                    v-model="query.search" 
                    placeholder="Tìm kiếm theo Tên, SĐT hoặc Email..." 
                    :prefix-icon="Search"
                    clearable
                    @input="handleSearch"
                />
            </div>
            <div class="w-[200px]">
                <el-select v-model="query.status" placeholder="Trạng thái" clearable @change="handleStatusChange">
                    <el-option label="Hoạt động" value="ACTIVE" />
                    <el-option label="Đã khóa" value="BLOCKED" />
                    <el-option label="Yêu cầu xóa" value="DELETION_REQUESTED" />
                </el-select>
            </div>
        </div>

        <!-- User Table -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
            <el-table :data="users" v-loading="loading" style="width: 100%">
                <el-table-column label="Thông tin cá nhân" min-width="250">
                    <template #default="{ row }">
                        <div class="flex items-center gap-3">
                            <el-avatar :src="row.avatar" :size="40">{{ row.fullName.charAt(0) }}</el-avatar>
                            <div>
                                <div class="font-medium text-gray-900">{{ row.fullName }}</div>
                                <div class="text-gray-500 text-xs">ID: {{ row.id }}</div>
                            </div>
                        </div>
                    </template>
                </el-table-column>
                
                <el-table-column prop="phoneNumber" label="Số điện thoại" width="140" />
                <el-table-column prop="email" label="Email" min-width="180">
                     <template #default="{ row }">
                        <span v-if="row.email" class="text-gray-700">{{ row.email }}</span>
                        <span v-else class="text-gray-400 italic">--</span>
                    </template>
                </el-table-column>
                
                <el-table-column label="Trạng thái" width="150">
                    <template #default="{ row }">
                        <el-tag v-if="row.status === 'ACTIVE'" type="success" effect="dark" size="small" class="rounded-full px-3">Active</el-tag>
                        <el-tag v-else-if="row.status === 'BLOCKED'" type="danger" effect="dark" size="small" class="rounded-full px-3">Blocked</el-tag>
                        <el-tag v-else-if="row.status === 'DELETION_REQUESTED'" type="warning" effect="dark" size="small" class="rounded-full px-3">Yêu cầu xóa</el-tag>
                        <el-tag v-else type="info" effect="plain" size="small" class="rounded-full px-3">{{ row.status }}</el-tag>
                    </template>
                </el-table-column>
                
                <el-table-column prop="createdAt" label="Ngày đăng ký" width="150" />
                
                <el-table-column label="Hành động" width="150" align="right">
                    <template #default="{ row }">
                        <el-button-group>
                            <el-button :icon="View" size="small" @click="viewDetails(row)" />
                            <el-button 
                                :icon="row.status === 'ACTIVE' ? Lock : Unlock" 
                                :type="row.status === 'ACTIVE' ? 'danger' : 'success'" 
                                size="small"
                                text
                                @click="toggleBlockUser(row)"
                            />
                        </el-button-group>
                    </template>
                </el-table-column>
            </el-table>
            
            <div class="p-4 flex justify-end">
                <el-pagination
                    v-model:current-page="query.page"
                    v-model:page-size="query.limit"
                    :total="totalUsers"
                    layout="prev, pager, next"
                    background
                    @current-change="handlePageChange"
                />
            </div>
        </div>

        <!-- Detail Dialog -->
        <el-dialog 
            v-model="dialogVisible" 
            title="Chi tiết Khách hàng" 
            width="95%"
            style="max-width: 800px"
            destroy-on-close
            class="responsive-dialog"
        >
            <div v-if="selectedUser" class="flex flex-col sm:flex-row gap-6">
                <!-- User Info Sidebar -->
                <div class="w-full sm:w-1/3 bg-gray-50 p-4 rounded-lg text-center">
                    <el-avatar :src="selectedUser.avatar" :size="100" class="mb-4">{{ selectedUser.fullName.charAt(0) }}</el-avatar>
                    <h2 class="text-xl font-bold">{{ selectedUser.fullName }}</h2>
                    <p class="text-gray-500 font-medium">{{ selectedUser.phoneNumber }}</p>
                    <p class="text-gray-500 text-sm mb-4">{{ selectedUser.email }}</p>
                    
                    <div class="text-left space-y-3 text-sm border-t pt-4">
                        <div class="flex justify-between">
                            <span class="text-gray-500">Trạng thái:</span>
                            <span :class="selectedUser.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'">{{ selectedUser.status }}</span>
                        </div>
                         <div class="flex justify-between">
                            <span class="text-gray-500">Ngày tham gia:</span>
                            <span>{{ selectedUser.createdAt }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">Hoạt động cuối:</span>
                            <span>{{ selectedUser.lastActive }}</span>
                        </div>
                    </div>
                </div>

                <!-- Scan History -->
                <div class="flex-1">
                    <h3 class="font-bold text-lg mb-3">Lịch sử Quét mã</h3>
                    <el-table :data="scanHistory" v-loading="historyLoading" size="small" height="300">
                        <el-table-column prop="productName" label="Sản phẩm" />
                        <el-table-column prop="code" label="Mã Tem" width="120" />
                        <el-table-column prop="scanTime" label="Thời gian" width="150" />
                        <el-table-column prop="location" label="Vị trí" />
                    </el-table>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<style scoped>
.app-user-management :deep(.el-table th.el-table__cell) {
    background-color: #f8f9fa;
    color: #606266;
    font-weight: 600;
}
</style>
