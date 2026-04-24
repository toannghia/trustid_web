<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/modules/core/store/auth';
import { useRoute, useRouter } from 'vue-router';
import {
  Management, Box, Tickets, User, Van, OfficeBuilding, ShoppingCart,
  Coordinate, Setting, Files, Odometer, ArrowRight, SwitchButton,
  Monitor, Document, List, View, Calendar, Connection, Collection,
  Sell, Goods, UserFilled, Key, Bell, Operation, Finished, DataLine, Postcard,
  Download, Upload, Check, TrendCharts
} from '@element-plus/icons-vue';

interface MenuItem {
  title: string;
  path?: string;
  roles: string[];
  icon?: any;
}

interface MenuGroup {
  label: string;
  icon: any;
  roles: string[];
  items: MenuItem[];
}

const props = defineProps<{ isCollapsed: boolean }>();
const emit = defineEmits(['close-mobile']);

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const userRole = computed(() => authStore.user?.role || 'GUEST');

const openGroups = ref<Set<string>>(new Set());

const menuGroups: MenuGroup[] = [
  {
    label: 'TỔNG QUAN',
    icon: Odometer,
    roles: ['ADMIN', 'REGULATOR', 'TENANT_ADMIN', 'TENANT'],
    items: [
      { title: 'Dashboard', path: '/', roles: ['ADMIN', 'REGULATOR'], icon: Monitor },
      { title: 'Doanh nghiệp', path: '/tenant-dashboard', roles: ['TENANT_ADMIN', 'TENANT'], icon: OfficeBuilding },
      { title: 'Giám sát (Audit)', path: '/regulator/audit', roles: ['ADMIN', 'REGULATOR'], icon: View },
    ]
  },
  {
    label: 'QUẢN LÝ CANH TÁC',
    icon: Management,
    roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'],
    items: [
      { title: 'Duyệt vùng trồng', path: '/admin/farm-approvals', roles: ['ADMIN'], icon: Check },
      { title: 'Việc hôm nay', path: '/farm/tasks', roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'], icon: List },
      { title: 'Vùng trồng', path: '/farm/locations', roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'], icon: Coordinate },
      { title: 'Mùa vụ', path: '/farm/cycles', roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'], icon: Calendar },
      { title: 'Lô thu hoạch', path: '/farm/batches', roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'], icon: Collection },
      { title: 'Quy trình mẫu', path: '/farm/templates', roles: ['ADMIN', 'TENANT_ADMIN'], icon: Document },
      { title: 'Vật tư & Kho nông trại', path: '/farm/materials', roles: ['ADMIN', 'TENANT_ADMIN'], icon: Box },
    ]
  },
  {
    label: 'TÀI SẢN CÂY TRỒNG',
    icon: Connection,
    roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER', 'END_USER'],
    items: [
      { title: 'Bản đồ cây trồng', path: '/asset-map', roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'], icon: Coordinate },
      { title: 'Quản lý tài sản', path: '/perennial-assets', roles: ['ADMIN', 'TENANT_ADMIN'], icon: Management },
      { title: 'Danh sách cây', path: '/caretaker/assets', roles: ['ADMIN', 'TENANT_ADMIN', 'FARMER'], icon: List },
      { title: 'Nhật ký chăm sóc', path: '/caretaker/logs', roles: ['ADMIN', 'FARMER'], icon: Tickets },
      { title: 'Tài sản của tôi', path: '/owner/assets', roles: ['END_USER', 'ADMIN'], icon: User },
    ]
  },
  {
    label: 'SẢN XUẤT & ĐÓNG GÓI',
    icon: Box,
    roles: ['ADMIN', 'TENANT_ADMIN', 'PACKAGER'],
    items: [
      { title: 'Lệnh Đóng gói', path: '/supply/packaging', roles: ['ADMIN', 'TENANT_ADMIN', 'PACKAGER'], icon: Postcard },
      { title: 'Lô nhập ngoài', path: '/supply/external-batches', roles: ['ADMIN', 'TENANT_ADMIN', 'PACKAGER'], icon: Download },
      { title: 'Lô thành phẩm', path: '/supply/batches', roles: ['ADMIN', 'TENANT_ADMIN', 'PACKAGER'], icon: Finished },
      { title: 'Sản phẩm Active', path: '/supply/items', roles: ['ADMIN', 'TENANT_ADMIN', 'PACKAGER'], icon: Goods }
    ]
  },
  {
    label: 'KHO & VẬN CHUYỂN',
    icon: Van,
    roles: ['ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER', 'DRIVER', 'ACCOUNTANT'],
    items: [
      { title: 'Lệnh xuất hàng', path: '/supply/export-order', roles: ['ADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'], icon: Document },
      { title: 'Phiếu xuất kho', path: '/supply/export-fulfill', roles: ['ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER'], icon: Upload },
      { title: 'Quản lý Kho', path: '/transport/warehouses', roles: ['ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER'], icon: OfficeBuilding },
      { title: 'Tồn Kho Tổng Hợp', path: '/supply/inventory', roles: ['ADMIN', 'TENANT_ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER'], icon: Collection },
      { title: 'Quản lý Xe', path: '/transport/vehicles', roles: ['ADMIN', 'TENANT_ADMIN'], icon: Van },
      { title: 'Đơn hàng vận chuyển', path: '/supply/shipments', roles: ['ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER', 'DRIVER'], icon: List },
      { title: 'Nhập kho', path: '/transport/operations', roles: ['ADMIN', 'TENANT_ADMIN', 'WAREHOUSE_MANAGER'], icon: Download },
      
    ]
  },
  {
    label: 'QUẢN LÝ DANH MỤC',
    icon: Files,
    roles: ['ADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'],
    items: [
      { title: 'Sản phẩm', path: '/products', roles: ['ADMIN', 'TENANT_ADMIN'], icon: Goods },
      { title: 'Ngành hàng', path: '/categories', roles: ['ADMIN', 'TENANT_ADMIN'], icon: Operation },
      { title: 'Đối tác & NCC', path: '/suppliers', roles: ['ADMIN', 'TENANT_ADMIN'], icon: UserFilled },
      { title: 'Đại lý', path: '/supply/dealers', roles: ['ADMIN', 'TENANT_ADMIN', 'ACCOUNTANT'], icon: Connection },
      { title: 'Phân vùng quản lý', path: '/supply/territories', roles: ['ADMIN', 'TENANT_ADMIN'], icon: Coordinate },
    ]
  },
  {
    label: 'QUẢN LÝ TRUY XUẤT',
    icon: Tickets,
    roles: ['ADMIN', 'TENANT_ADMIN'],
    items: [
      { title: 'Cấp mã nội bộ', path: '/codes/generate', roles: ['ADMIN', 'TENANT_ADMIN'], icon: Connection },
      { title: 'Kho lô tem', path: '/codes/pools', roles: ['ADMIN', 'TENANT_ADMIN'], icon: Collection },
      { title: 'Đồng bộ Lô (NDA)', path: '/codes/batch-sync', roles: ['ADMIN', 'TENANT_ADMIN'], icon: DataLine }
    ]
  },
  {
    label: 'BÁN LẺ (RETAIL)',
    icon: ShoppingCart,
    roles: ['ADMIN', 'TENANT_ADMIN', 'RETAILER'],
    items: [
      { title: 'Bán hàng', path: '/retail/sales', roles: ['ADMIN', 'TENANT_ADMIN', 'RETAILER'], icon: Sell }
    ]
  },
  {
    label: 'ĐẠI LÝ PHÂN PHỐI',
    icon: Connection,
    roles: ['DEALER'],
    items: [
      { title: 'Tổng quan', path: '/dealer/dashboard', roles: ['DEALER'], icon: DataLine },
      { title: 'Bảng giá', path: '/dealer/pricing', roles: ['DEALER'], icon: View },
      { title: 'Nhận hàng', path: '/dealer/receive', roles: ['DEALER'], icon: Box },
      { title: 'Tồn kho', path: '/dealer/stock', roles: ['DEALER'], icon: Collection },
      { title: 'Khách hàng', path: '/dealer/customers', roles: ['DEALER'], icon: User },
      { title: 'Bán lẻ', path: '/dealer/sale', roles: ['DEALER'], icon: ShoppingCart }
    ]
  },
  {
    label: 'TÀI XẾ VẬN CHUYỂN',
    icon: Van,
    roles: ['DRIVER'],
    items: [
      { title: 'Bảng điều khiển', path: '/driver/dashboard', roles: ['DRIVER'], icon: Van }
    ]
  },
  {
    label: 'THIẾT LẬP HỆ THỐNG',
    icon: Setting,
    roles: ['ADMIN', 'TENANT_ADMIN'],
    items: [
      { title: 'Thông tin tổ chức', path: '/tenant/settings', roles: ['TENANT_ADMIN'], icon: OfficeBuilding },
      { title: 'Quản lý Doanh nghiệp', path: '/tenants', roles: ['ADMIN'], icon: Operation },
      { title: 'NDA Gateway', path: '/gateway-dashboard', roles: ['ADMIN'], icon: Connection },
      { title: 'Người dùng', path: '/users', roles: ['ADMIN', 'TENANT_ADMIN'], icon: User },
      { title: 'Gửi Thông báo', path: '/notifications/send', roles: ['ADMIN'], icon: Bell },
      { title: 'Phân quyền (Roles)', path: '/admin/roles', roles: ['ADMIN'], icon: Key },
      { title: 'Khách hàng App', path: '/app-users', roles: ['ADMIN'], icon: UserFilled },
      { title: 'Cấu hình OTP', path: '/app-users/config', roles: ['ADMIN'], icon: Setting },
      { title: 'Báo cáo OTP', path: '/app-users/reports', roles: ['ADMIN'], icon: DataLine },
      { title: 'Cấu hình EUDR', path: '/admin/eudr-config', roles: ['ADMIN'], icon: Coordinate },
      { title: 'Số liệu App', path: '/admin/home-stats', roles: ['ADMIN'], icon: TrendCharts },
      { title: 'Quản lý Sao lưu', path: '/admin/backups', roles: ['ADMIN'], icon: Document },
    ]
  }
];

// Filter groups and items by role
const filteredGroups = computed(() => {
  const role = userRole.value;
  return menuGroups
    .filter(g => role === 'ADMIN' || g.roles.includes(role))
    .map(g => ({
      ...g,
      items: g.items.filter(i => role === 'ADMIN' || i.roles.includes(role))
    }))
    .filter(g => g.items.length > 0);
});

const isActive = (path?: string) => {
  if (!path) return false;
  if (path === '/') return route.path === '/';
  return route.path === path || route.path.startsWith(path + '/');
};

const isGroupActive = (group: MenuGroup) => {
  return group.items.some(i => isActive(i.path));
};

const toggleGroup = (label: string) => {
  if (openGroups.value.has(label)) {
    openGroups.value.delete(label);
  } else {
    openGroups.value.add(label);
  }
};

const navigateTo = (path?: string) => {
  if (path) {
    router.push(path);
    emit('close-mobile');
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

// Auto-open group that contains current route
watch(() => route.path, () => {
  for (const g of filteredGroups.value) {
    if (isGroupActive(g)) {
      openGroups.value.add(g.label);
    }
  }
}, { immediate: true });
</script>

<template>
  <div class="eco-sidebar">
    <!-- Brand -->
    <div class="eco-brand" :class="{ collapsed: props.isCollapsed }">
      <div class="eco-logo">
        <span>T</span>
      </div>
      <div v-if="!props.isCollapsed" class="eco-brand-text">
        <strong>TrustID</strong>
        <small>Admin Portal</small>
      </div>
    </div>

    <!-- Scrollable Nav -->
    <el-scrollbar class="eco-nav-scroll">
      <nav class="eco-nav">
        <template v-for="group in filteredGroups" :key="group.label">
          <!-- COLLAPSED: show only group icon -->
          <template v-if="props.isCollapsed">
            <el-tooltip
              v-for="item in group.items"
              :key="item.path"
              :content="item.title"
              placement="right"
              :show-after="200"
            >
              <div
                class="eco-icon-item"
                :class="{ active: isActive(item.path) }"
                @click="navigateTo(item.path)"
              >
                <el-icon :size="20"><component :is="group.icon" /></el-icon>
              </div>
            </el-tooltip>
          </template>

          <!-- EXPANDED: full group with label + items -->
          <template v-else>
            <div
              class="eco-group-header"
              @click="toggleGroup(group.label)"
            >
              <span class="eco-group-label">{{ group.label }}</span>
              <svg
                class="eco-chevron"
                :class="{ rotated: openGroups.has(group.label) }"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
              </svg>
            </div>

            <Transition name="slide">
              <div v-show="openGroups.has(group.label)" class="eco-group-items">
                <div
                  v-for="item in group.items"
                  :key="item.path"
                  class="eco-item"
                  :class="{ active: isActive(item.path) }"
                  @click="navigateTo(item.path)"
                >
                  <el-icon class="eco-item-icon" :size="18">
                    <component :is="item.icon || group.icon" />
                  </el-icon>
                  <span class="eco-item-text">{{ item.title }}</span>
                </div>
              </div>
            </Transition>
          </template>
        </template>
      </nav>
    </el-scrollbar>

    <!-- Pinned Footer -->
    <div class="eco-footer" :class="{ collapsed: props.isCollapsed }">
      <el-tooltip content="Cài đặt" placement="right" :disabled="!props.isCollapsed">
        <div class="eco-footer-item" @click="navigateTo('/tenant/settings')">
          <el-icon :size="18"><Setting /></el-icon>
          <span v-if="!props.isCollapsed">Cài đặt</span>
        </div>
      </el-tooltip>
      <el-tooltip content="Đăng xuất" placement="right" :disabled="!props.isCollapsed">
        <div class="eco-footer-item logout" @click="handleLogout">
          <el-icon :size="18"><SwitchButton /></el-icon>
          <span v-if="!props.isCollapsed">Đăng xuất</span>
        </div>
      </el-tooltip>
    </div>
  </div>
</template>

<style scoped>
/* === CONTAINER === */
.eco-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tid-sidebar-bg);
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif;
  overflow: hidden;
}

/* === BRAND === */
.eco-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.eco-brand.collapsed {
  justify-content: center;
  padding: 24px 8px;
}
.eco-logo {
  width: 40px;
  height: 40px;
  background: var(--tid-success);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 135, 90, 0.2);
}
.eco-logo span {
  color: #fff;
  font-weight: 800;
  font-size: 20px;
}
.eco-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
}
.eco-brand-text strong {
  font-family: 'Space Grotesk', sans-serif;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.eco-brand-text small {
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  font-weight: 400;
}

/* === NAV SCROLL === */
.eco-nav-scroll {
  flex: 1;
  min-height: 0;
}
.eco-nav {
  padding: 12px 0;
}

/* === GROUP HEADER (Label) === */
.eco-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 6px;
  cursor: pointer;
  user-select: none;
}
.eco-group-label {
  font-size: 14px; /* Font chữ của menu */
  font-weight: 450;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
  transition: color 0.2s;
}
.eco-group-header:hover .eco-group-label {
  color: rgba(255,255,255,0.8);
}
.eco-chevron {
  width: 14px;
  height: 14px;
  color: rgba(255,255,255,0.3);
  transition: transform 0.25s ease, color 0.2s;
  flex-shrink: 0;
}
.eco-chevron.rotated {
  transform: rotate(0deg);
}
.eco-chevron:not(.rotated) {
  transform: rotate(-90deg);
}

/* === MENU ITEMS === */
.eco-group-items {
  overflow: hidden;
}
.eco-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.8);
  white-space: nowrap;
  overflow: hidden;
}
.eco-item:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.eco-item.active {
  background: var(--tid-sidebar-active);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);
}
.eco-item.active .eco-item-icon {
  color: #fff;
}
.eco-item-icon {
  color: rgba(255,255,255,0.4);
  flex-shrink: 0;
  transition: color 0.15s;
}
.eco-item:hover .eco-item-icon {
  color: rgba(255,255,255,0.8);
}

/* === COLLAPSED ICON ITEMS === */
.eco-icon-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 4px auto;
  border-radius: 10px;
  cursor: pointer;
  color: rgba(255,255,255,0.5);
  transition: all 0.2s ease;
}
.eco-icon-item:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.eco-icon-item.active {
  background: var(--tid-sidebar-active);
  color: #fff;
  box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);
}

/* === PINNED FOOTER === */
.eco-footer {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 12px 8px;
  flex-shrink: 0;
}
.eco-footer.collapsed {
  padding: 12px 4px;
}
.eco-footer.collapsed .eco-footer-item {
  justify-content: center;
  padding: 12px;
}
.eco-footer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  margin: 2px 4px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.6);
  transition: all 0.2s ease;
  white-space: nowrap;
}
.eco-footer-item:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.eco-footer-item.logout:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

/* === SLIDE TRANSITION === */
.slide-enter-active, .slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 800px;
}
.slide-enter-from, .slide-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>