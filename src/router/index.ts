import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../modules/core/store/auth';
const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../modules/core/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/auth/activate',
    name: 'activate-account',
    component: () => import('../modules/core/views/ActivateAccount.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/auth/forgot-password',
    name: 'forgot-password',
    component: () => import('../modules/core/views/ForgotPassword.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/auth/reset-password',
    name: 'reset-password',
    component: () => import('../modules/core/views/ResetPassword.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/verify/eudr/:id',
    name: 'eudr-verify',
    component: () => import('../modules/farm/views/EudrVerify.vue'),
    meta: { requiresAuth: false, title: 'Xác thực EUDR' }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../modules/core/views/Dashboard.vue'),
        meta: { roles: ['ADMIN', 'REGULATOR'] }
      },
      {
        path: 'tenant-dashboard',
        name: 'tenant-dashboard',
        component: () => import('../modules/core/views/TenantDashboard.vue'),
        meta: { roles: ['TENANT_ADMIN', 'TENANT'] }
      },
      {
        path: 'profile',
        name: 'user-profile',
        component: () => import('@/modules/core/views/UserProfile.vue'),
        meta: { title: 'Thông tin tài khoản' }
      },
      // QUẢN TRỊ HỆ THỐNG (Chỉ dành cho ADMIN)
      {
        path: 'tenants',
        name: 'tenants',
        component: () => import('../modules/core/views/TenantManagement.vue'),
        meta: { roles: ['ADMIN'] }
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/modules/core/views/UserManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      {
        path: 'tenant/settings',
        name: 'tenant-settings',
        component: () => import('../modules/core/views/TenantSettings.vue'),
        meta: { roles: ['TENANT_ADMIN'] }
      },
      {
        path: 'tenant/settings',
        name: 'tenant-settings',
        component: () => import('../modules/core/views/TenantSettings.vue'),
        meta: { roles: ['TENANT_ADMIN'] }
      },
      {
        path: 'gateway-dashboard',
        name: 'gateway-dashboard',
        component: () => import('../modules/gateway-dashboard/views/GatewayDashboard.vue'),
        meta: { roles: ['ADMIN'] }
      },
      // QUẢN LÝ TÀI KHOẢN APP (ADMIN Only)
      {
        path: 'app-users',
        name: 'app-users',
        component: () => import('@/modules/core/views/AppUserManagement.vue'),
        meta: { roles: ['ADMIN'], title: 'Danh sách khách hàng' }
      },
      {
        path: 'app-users/config',
        name: 'app-user-config',
        component: () => import('@/modules/core/views/AppUserConfig.vue'),
        meta: { roles: ['ADMIN'], title: 'Cấu hình hệ thống' }
      },
      {
        path: 'app-users/reports',
        name: 'app-user-reports',
        component: () => import('@/modules/core/views/AppUserReports.vue'),
        meta: { roles: ['ADMIN'], title: 'Báo cáo OTP' }
      },
      {
        path: 'admin/eudr-config',
        name: 'eudr-config',
        component: () => import('@/modules/farm/views/GfwConfig.vue'),
        meta: { roles: ['ADMIN'], title: 'Cấu hình EUDR' }
      },
      {
        path: 'admin/home-stats',
        name: 'home-stats-config',
        component: () => import('@/modules/core/views/HomeStatsConfig.vue'),
        meta: { roles: ['ADMIN'], title: 'Số liệu App' }
      },
      // HỆ THỐNG
      {
        path: 'admin/roles',
        name: 'role-management',
        component: () => import('@/modules/core/views/RoleManagement.vue'),
        meta: { roles: ['ADMIN'], title: 'Quản lý Phân quyền' }
      },
      {
        path: 'notifications/send',
        name: 'notification-send',
        component: () => import('@/modules/core/views/NotificationManagement.vue'),
        meta: { roles: ['ADMIN'], title: 'Gửi Thông báo' }
      },
      // DỮ LIỆU NỀN TẢNG (ADMIN & TENANT_ADMIN)
      {
        path: 'categories',
        name: 'categories',
        component: () => import('../modules/core/views/CategoryManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      {
        path: 'products',
        name: 'products',
        component: () => import('../modules/core/views/ProductManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      {
        path: 'suppliers',
        name: 'suppliers',
        component: () => import('../modules/core/views/SupplierManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      // QUẢN LÝ KHO MÃ
      {
        path: 'codes/generate',
        name: 'code-generate',
        component: () => import('@/modules/core/views/StampManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      {
        path: 'codes/pools',
        name: 'code-pools',
        component: () => import('../modules/core/views/CodePools.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      {
        path: 'codes/batch-sync',
        name: 'batch-sync',
        component: () => import('../modules/batch-sync/views/BatchSyncManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      // PHÊ DUYỆT / GIÁM SÁT (ADMIN & REGULATOR)
      {
        path: 'regulator/audit',
        name: 'regulator-audit',
        component: () => import('../modules/gov/views/GovDashboard.vue'),
        meta: { roles: ['ADMIN', 'REGULATOR'], title: 'Giám sát (Gov)' }
      },
      // SẢN XUẤT (FARM - TENANT)
      {
        path: 'farm/locations',
        name: 'farm-locations',
        component: () => import('../modules/farm/views/LocationManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER', 'TEAM_LEADER'] }
      },
      {
        path: 'farm/locations/:id',
        name: 'farm-location-detail',
        component: () => import('../modules/farm/views/LocationDetail.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER', 'TEAM_LEADER'] }
      },
      {
        path: 'farm/master-areas',
        name: 'master-growing-areas',
        component: () => import('../modules/farm/views/MasterGrowingAreaList.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      {
        path: 'farm/master-areas/:id',
        name: 'master-growing-area-detail',
        component: () => import('../modules/farm/views/MasterGrowingAreaDetail.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      {
        path: 'farm/leader-dashboard',
        name: 'leader-dashboard',
        component: () => import('../modules/farm/views/LeaderDashboard.vue'),
        meta: { roles: ['TEAM_LEADER'], title: 'Bảng điều khiển Đội trưởng' }
      },
      {
        path: 'farm/my-team',
        name: 'my-team-farmers',
        component: () => import('../modules/farm/views/MyTeamFarmers.vue'),
        meta: { roles: ['TEAM_LEADER'], title: 'Quản lý Nông dân' }
      },
      {
        path: 'farm/team-leaders',
        name: 'farm-team-leaders',
        component: () => import('../modules/farm/views/TeamLeaderManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'], title: 'Quản lý Đội trưởng' }
      },
      {
        path: 'farm/team-leaders/:username',
        name: 'farm-team-leader-detail',
        component: () => import('../modules/farm/views/TeamLeaderDetail.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'], title: 'Chi tiết Đội trưởng' }
      },
      {
        path: 'farm/kcs-staff',
        name: 'farm-kcs-staff',
        component: () => import('../modules/farm/views/KcsStaffManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'], title: 'Quản lý Nhân viên KCS' }
      },
      {
        path: 'farm/kcs-staff/:id',
        name: 'farm-kcs-staff-detail',
        component: () => import('../modules/farm/views/KcsDetail.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'], title: 'Chi tiết Nhân viên KCS' }
      },
      {
        path: 'admin/farm-approvals',
        name: 'farm-approvals',
        component: () => import('../modules/farm/views/AdminFarmApproval.vue'),
        meta: { roles: ['ADMIN'], title: 'Kiểm duyệt Ranh giới' }
      },
      {
        path: 'farm/templates',
        name: 'farm-templates',
        component: () => import('../modules/farm/views/TemplateManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] } // Only Admin defines templates
      },
      {
        path: 'farm/cycles',
        name: 'farm-cycles',
        component: () => import('../modules/farm/views/CropCycleManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'] }
      },
      {
        path: 'farm/materials',
        name: 'farm-materials',
        component: () => import('../modules/farm/views/MaterialManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'] }
      },
      {
        path: 'farm/tasks',
        name: 'farm-tasks',
        component: () => import('../modules/farm/views/DailyTasks.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'] }
      },
      {
        path: 'farm/batches',
        name: 'farm-batches',
        component: () => import('../modules/farm/views/BatchManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'] }
      },
      // MODULE ĐẠI LÝ (DEALER)
      {
        path: 'dealer/dashboard',
        name: 'dealer-dashboard',
        component: () => import('../modules/dealer/views/DealerHome.vue'),
        meta: { roles: ['DEALER'], title: 'Tổng quan Đại lý' }
      },
      {
        path: 'dealer/pricing',
        name: 'dealer-pricing',
        component: () => import('../modules/dealer/views/DealerPricing.vue'),
        meta: { roles: ['DEALER'], title: 'Bảng giá Bán lẻ' }
      },
      {
        path: 'dealer/receive',
        name: 'dealer-receive',
        component: () => import('../modules/dealer/views/DealerReceive.vue'),
        meta: { roles: ['DEALER'], title: 'Nhận hàng' }
      },
      {
        path: 'dealer/stock',
        name: 'dealer-stock',
        component: () => import('../modules/dealer/views/DealerStock.vue'),
        meta: { roles: ['DEALER'], title: 'Tồn kho Đại lý' }
      },
      {
        path: 'dealer/sale',
        name: 'dealer-sale',
        component: () => import('../modules/dealer/views/DealerSale.vue'),
        meta: { roles: ['DEALER'], title: 'Bán lẻ (POS)' }
      },
      {
        path: 'dealer/sales',
        name: 'dealer-sale-history',
        component: () => import('../modules/dealer/views/DealerSaleHistory.vue'),
        meta: { roles: ['DEALER'], title: 'Lịch sử Hóa đơn' }
      },
      {
        path: 'dealer/receipt/:id',
        name: 'dealer-receipt-print',
        component: () => import('../modules/dealer/views/ReceiptPrint.vue'),
        meta: { roles: ['DEALER'], title: 'In Hóa Đơn Lẻ' }
      },
      {
        path: 'dealer/customers',
        name: 'dealer-customers',
        component: () => import('../modules/dealer/views/DealerCustomers.vue'),
        meta: { roles: ['DEALER'], title: 'Quản lý Khách hàng' }
      },
      // MODULE TÀI XẾ (DRIVER)
      {
        path: 'driver/dashboard',
        name: 'driver-dashboard',
        component: () => import('../modules/supply/views/DriverDashboard.vue'),
        meta: { roles: ['DRIVER'], title: 'Bảng điều khiển Tài xế' }
      },
      // MODULE CÂY LÂU NĂM / TÀI SẢN (ASSET)
      {
        path: 'perennial-assets',
        name: 'asset-management',
        component: () => import('../modules/asset/views/AssetManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'], title: 'Quản lý Cây lâu năm' }
      },
      {
        path: 'caretaker/assets',
        name: 'caretaker-assets',
        component: () => import('../modules/asset/views/CaretakerAssets.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'], title: 'Danh sách cây' }
      },
      {
        path: 'caretaker/logs',
        name: 'caretaker-logs',
        component: () => import('../modules/asset/views/CaretakerCareLogs.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'], title: 'Nhật ký chăm sóc' }
      },
      {
        path: 'owner/assets',
        name: 'owner-assets',
        component: () => import('../modules/asset/views/OwnerAssets.vue'),
        meta: { roles: ['END_USER', 'ADMIN', 'TENANT_ADMIN'], title: 'Tài sản của tôi' }
      },
      {
        path: 'asset-map',
        name: 'asset-map',
        component: () => import('../modules/asset/views/CropAssetMap.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'], title: 'Bản đồ cây trồng' }
      },
      // Supply Chain Module Routes
      {
        path: '/supply/inventory',
        name: 'InventoryDashboard',
        component: () => import('@/modules/supply/views/InventoryDashboard.vue'),
        meta: { title: 'Tồn Kho' }
      },
      {
        path: '/supply/packaging',
        name: 'SupplyPackaging',
        component: () => import('@/modules/supply/views/PackagingView.vue'),
        meta: { title: 'Đóng gói' }
      },
      {
        path: '/supply/external-batches',
        name: 'ExternalBatches',
        component: () => import('@/modules/supply/views/ExternalBatchManagement.vue'),
        meta: { title: 'Lô nhập ngoài' }
      },
      {
        path: '/supply/batches',
        name: 'SupplyBatches',
        component: () => import('@/modules/supply/views/BatchManagement.vue'),
        meta: { title: 'Lô thành phẩm' }
      },
      {
        path: '/supply/items',
        name: 'SupplyItems',
        component: () => import('@/modules/supply/views/ActiveItemsView.vue'),
        meta: { title: 'Sản phẩm Active' }
      },
      {
        path: '/supply/shipments',
        name: 'SupplyShipments',
        component: () => import('@/modules/supply/views/ShipmentManagement.vue'),
        meta: { title: 'Lịch sử vận đơn' }
      },
      {
        path: '/supply/export-order',
        name: 'ExportOrderList',
        component: () => import('@/modules/supply/views/ExportOrderList.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'], title: 'Danh sách lệnh xuất kho' }
      },
      {
        path: '/supply/export-order/new',
        name: 'ExportOrderCreate',
        component: () => import('@/modules/supply/views/ExportOrderCreate.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'], title: 'Tạo lệnh xuất kho' }
      },
      {
        path: '/supply/export-fulfill',
        name: 'ExportOrderFulfill',
        component: () => import('@/modules/supply/views/ExportOrderFulfill.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER'], title: 'Thực hiện Xuất kho' }
      },
      {
        path: '/supply/dealers',
        name: 'SupplyDealers',
        component: () => import('@/modules/supply/views/DealerManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'], title: 'Quản lý Đại lý' }
      },
      {
        path: '/supply/territories',
        name: 'TerritoryManagement',
        component: () => import('@/modules/supply/views/TerritoryManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'], title: 'Phân vùng quản lý' }
      },
      // VẬN CHUYỂN (TRANSPORT)
      {
        path: '/transport/warehouses',
        name: 'TransportWarehouses',
        component: () => import('@/modules/supply/views/WarehouseManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER'], title: 'Quản lý Kho' }
      },
      {
        path: '/transport/vehicles',
        name: 'TransportVehicles',
        component: () => import('@/modules/supply/views/VehicleManagement.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN'], title: 'Quản lý Xe' }
      },
      {
        path: '/transport/operations',
        name: 'TransportOperations',
        component: () => import('@/modules/supply/views/WarehouseOperations.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER'], title: 'Xuất / Nhập kho' }
      },
      {
        path: '/retail/sales',
        name: 'retail-sales',
        component: () => import('@/modules/retail/views/RetailSale.vue'),
        meta: { roles: ['ADMIN', 'TENANT_ADMIN', 'RETAILER'] }
      },
      {
        path: '/admin/backups',
        name: 'backup-management',
        component: () => import('../modules/core/views/BackupManagement.vue'),
        meta: { roles: ['ADMIN'], title: 'Sao lưu tự động' }
      }
    ]
  },
  // TRANG LỖI 404
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../modules/core/views/NotFound.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// BỘ BẢO VỆ ĐƯỜNG DẪN (GLOBAL NAVIGATION GUARD)
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const token = localStorage.getItem('access_token');

  // 1. Nếu có token nhưng Store bị trống (do F5), phải đợi lấy Profile xong mới chạy tiếp
  if (token && !authStore.user) {
    try {
      await authStore.fetchProfile(); // Đợi API trả về kết quả
    } catch (err) {
      // Nếu token hết hạn, xóa token và đẩy về login
      localStorage.removeItem('access_token');
      return next({ name: 'login' });
    }
  }

  // 2. Kiểm tra nếu trang yêu cầu đăng nhập mà không có token
  if (to.meta.requiresAuth && !token) {
    return next({ name: 'login' });
  }

  // 3. Nếu đã đăng nhập mà cố quay lại trang login -> Đẩy về Dashboard tương ứng
  if (to.name === 'login' && token) {
    const role = authStore.user?.role;
    if (role === 'TENANT_ADMIN' || role === 'TENANT') {
      return next({ name: 'tenant-dashboard' });
    }
    if (role === 'REGULATOR') {
      return next({ name: 'regulator-audit' });
    }
    if (role === 'DEALER') {
      return next({ name: 'dealer-dashboard' });
    }
    if (role === 'DRIVER') {
      return next({ name: 'driver-dashboard' });
    }
    return next({ name: 'dashboard' });
  }

  // 4. Redirect root path
  if (to.path === '/' && token) {
    const role = authStore.user?.role;
    if (role === 'TENANT_ADMIN' || role === 'TENANT') {
      return next({ name: 'tenant-dashboard' });
    }
    if (role === 'REGULATOR') {
      return next({ name: 'regulator-audit' });
    }
    if (role === 'DEALER') {
      return next({ name: 'dealer-dashboard' });
    }
    if (role === 'DRIVER') {
      return next({ name: 'driver-dashboard' });
    }
    if (role === 'TEAM_LEADER') {
      return next({ name: 'leader-dashboard' });
    }
  }

  next(); // Cho phép truy cập
});

export default router;