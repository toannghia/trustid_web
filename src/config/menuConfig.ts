/**
 * Shared menu configuration — used by Sidebar + RoleManagement
 * Each menu item maps to a permission key from PERMISSION_GROUPS
 */
import {
  Management, Box, Tickets, User, Van, OfficeBuilding, ShoppingCart,
  Coordinate, Setting, Files, Odometer, Monitor, Document, List, View, Calendar, Connection, Collection,
  Sell, Goods, UserFilled, Key, Bell, Operation, Finished, DataLine, Postcard,
  Download, Upload, Check, TrendCharts, Warning
} from '@element-plus/icons-vue';

export interface MenuItemConfig {
  title: string;
  path: string;
  permission: string;
  icon?: any;
}

export interface MenuGroupConfig {
  label: string;
  icon: any;
  items: MenuItemConfig[];
}

export const MENU_GROUPS: MenuGroupConfig[] = [
  {
    label: 'TỔNG QUAN',
    icon: Odometer,
    items: [
      { title: 'Dashboard', path: '/', permission: 'DASHBOARD_SYSTEM_VIEW', icon: Monitor },
      { title: 'Doanh nghiệp', path: '/tenant-dashboard', permission: 'DASHBOARD_TENANT_VIEW', icon: OfficeBuilding },
      { title: 'Giám sát (Audit)', path: '/regulator/audit', permission: 'DASHBOARD_GOV_VIEW', icon: View },
    ]
  },
  {
    label: 'QUẢN LÝ VÙNG TRỒNG',
    icon: Coordinate,
    items: [
      { title: 'Quản lý Thửa', path: '/farm/locations', permission: 'FARM_LOCATION_VIEW', icon: Coordinate },
      { title: 'Mã vùng lớn', path: '/farm/master-areas', permission: 'FARM_AREA_MANAGE', icon: OfficeBuilding },
      { title: 'Đội trưởng', path: '/farm/team-leaders', permission: 'FARM_LEADER_MANAGE', icon: UserFilled },
      { title: 'Nhân viên KCS', path: '/farm/kcs-staff', permission: 'FARM_KCS_MANAGE', icon: UserFilled },
    ]
  },
  {
    label: 'CANH TÁC',
    icon: Management,
    items: [
      { title: 'Vật tư & Kho nông trại', path: '/farm/materials', permission: 'FARM_MATERIAL_VIEW', icon: Box },
      { title: 'Duyệt vùng trồng', path: '/admin/farm-approvals', permission: 'FARM_APPROVAL_MANAGE', icon: Check },
      { title: 'Mùa vụ', path: '/farm/cycles', permission: 'FARM_CYCLE_VIEW', icon: Calendar },
      { title: 'Quy trình mẫu', path: '/farm/templates', permission: 'FARM_TEMPLATE_MANAGE', icon: Document },
      { title: 'Việc hôm nay', path: '/farm/tasks', permission: 'FARM_TASK_VIEW', icon: List },
      { title: 'Lô thu hoạch', path: '/farm/batches', permission: 'FARM_BATCH_VIEW', icon: Collection },
    ]
  },
  {
    label: 'ĐỘI CỦA TÔI',
    icon: UserFilled,
    items: [
      { title: 'Quản lý Nông dân', path: '/farm/my-team', permission: 'TEAM_VIEW', icon: User },
    ]
  },
  {
    label: 'NGUYÊN LIỆU',
    icon: Box,
    items: [
      { title: 'Lô nhập ngoài', path: '/supply/external-batches', permission: 'MATERIAL_EXTERNAL_VIEW', icon: Download },
      { title: 'Bán thành phẩm', path: '/supply/semi-finished', permission: 'MATERIAL_SEMI_VIEW', icon: TrendCharts },
      { title: 'Xuất B2B', path: '/supply/semi-finished/export', permission: 'MATERIAL_B2B_MANAGE', icon: Upload },
      { title: 'Nhập B2B', path: '/supply/semi-finished/import', permission: 'MATERIAL_B2B_MANAGE', icon: Download },
      { title: 'Pallet BTP', path: '/supply/semi-finished/pallets', permission: 'MATERIAL_PALLET_MANAGE', icon: Box },
    ]
  },
  {
    label: 'SẢN XUẤT & ĐÓNG GÓI',
    icon: Box,
    items: [
      { title: 'Lệnh Sản Xuất', path: '/supply/production-orders', permission: 'PRODUCTION_ORDER_VIEW', icon: Tickets },
      { title: 'Quản lý Pallet', path: '/supply/pallets', permission: 'PALLET_MANAGE', icon: Box },
      { title: 'Sản phẩm Active', path: '/supply/items', permission: 'PACKAGING_ITEM_VIEW', icon: Goods },
    ]
  },
  {
    label: 'KHO & VẬN CHUYỂN',
    icon: Van,
    items: [
      { title: 'Lệnh xuất hàng', path: '/supply/export-order', permission: 'EXPORT_ORDER_VIEW', icon: Document },
      { title: 'Phiếu xuất kho', path: '/supply/export-fulfill', permission: 'EXPORT_FULFILL_MANAGE', icon: Upload },
      { title: 'Quản lý Kho', path: '/transport/warehouses', permission: 'WAREHOUSE_VIEW', icon: OfficeBuilding },
      { title: 'Tồn Kho Tổng Hợp', path: '/supply/inventory', permission: 'INVENTORY_VIEW', icon: Collection },
      { title: 'Báo cáo Xuất Nhập Tồn', path: '/supply/inventory/report', permission: 'INVENTORY_REPORT', icon: DataLine },
      { title: 'Quản lý Xe', path: '/transport/vehicles', permission: 'VEHICLE_MANAGE', icon: Van },
      { title: 'Đơn hàng vận chuyển', path: '/supply/shipments', permission: 'SHIPMENT_VIEW', icon: List },
      { title: 'Nhập kho', path: '/transport/operations', permission: 'INBOUND_MANAGE', icon: Download },
      { title: 'Xử lý Thu hồi', path: '/supply/recalls', permission: 'RECALL_MANAGE', icon: Warning },
    ]
  },
  {
    label: 'DANH MỤC',
    icon: Files,
    items: [
      { title: 'Sản phẩm', path: '/products', permission: 'PRODUCT_VIEW', icon: Goods },
      { title: 'Ngành hàng', path: '/categories', permission: 'CATEGORY_MANAGE', icon: Operation },
      { title: 'Đối tác & NCC', path: '/suppliers', permission: 'SUPPLIER_MANAGE', icon: UserFilled },
      { title: 'Đại lý', path: '/supply/dealers', permission: 'DEALER_VIEW', icon: Connection },
      { title: 'Phân vùng quản lý', path: '/supply/territories', permission: 'TERRITORY_MANAGE', icon: Coordinate },
    ]
  },
  {
    label: 'CẤP MÃ',
    icon: Tickets,
    items: [
      { title: 'Quản lý lô mã', path: '/codes/manage', permission: 'CODE_GENERATE', icon: Connection },
      { title: 'Thống kê', path: '/codes/report', permission: 'CODE_VIEW', icon: DataLine },
      { title: 'Đồng bộ Lô (NDA)', path: '/codes/batch-sync', permission: 'CODE_BATCH_SYNC', icon: DataLine },
      { title: 'Tra cứu Audit', path: '/traceability/audit', permission: 'TRACE_AUDIT', icon: View },
    ]
  },
  {
    label: 'ĐẠI LÝ PHÂN PHỐI',
    icon: Connection,
    items: [
      { title: 'Tổng quan', path: '/dealer/dashboard', permission: 'DEALER_DASHBOARD', icon: DataLine },
      { title: 'Bảng giá', path: '/dealer/pricing', permission: 'DEALER_PRICING', icon: View },
      { title: 'Nhận hàng', path: '/dealer/receive', permission: 'DEALER_RECEIVE', icon: Box },
      { title: 'Tồn kho', path: '/dealer/stock', permission: 'DEALER_STOCK', icon: Collection },
      { title: 'Khách hàng', path: '/dealer/customers', permission: 'DEALER_CUSTOMER', icon: User },
      { title: 'Bán lẻ', path: '/dealer/sale', permission: 'DEALER_SALE', icon: ShoppingCart },
      { title: 'Lịch sử hóa đơn', path: '/dealer/sales', permission: 'DEALER_HISTORY', icon: List },
    ]
  },
  {
    label: 'TÀI XẾ VẬN CHUYỂN',
    icon: Van,
    items: [
      { title: 'Bảng điều khiển', path: '/driver/dashboard', permission: 'DRIVER_DASHBOARD', icon: Van },
    ]
  },
  {
    label: 'BLOCKCHAIN',
    icon: Connection,
    items: [
      { title: 'Tổng quan', path: '/blockchain/dashboard', permission: 'BLOCKCHAIN_VIEW', icon: Connection },
      { title: 'Danh sách Batch', path: '/blockchain/batches', permission: 'BLOCKCHAIN_MANAGE', icon: List },
    ]
  },
  {
    label: 'HỆ THỐNG',
    icon: Setting,
    items: [
      { title: 'Danh sách Doanh nghiệp', path: '/tenants', permission: 'SYSTEM_TENANT_MANAGE', icon: Operation },
      { title: 'NDA Gateway', path: '/gateway-dashboard', permission: 'SYSTEM_GATEWAY', icon: Connection },
      { title: 'Người dùng', path: '/users', permission: 'USER_VIEW', icon: User },
      { title: 'Gửi Thông báo', path: '/notifications/send', permission: 'SYSTEM_NOTIFICATION', icon: Bell },
      { title: 'Phân quyền (Roles)', path: '/admin/roles', permission: 'ROLE_VIEW', icon: Key },
      { title: 'Khách hàng App', path: '/app-users', permission: 'SYSTEM_APP_USER', icon: UserFilled },
      { title: 'Cấu hình OTP', path: '/app-users/config', permission: 'SYSTEM_OTP_CONFIG', icon: Setting },
      { title: 'Báo cáo OTP', path: '/app-users/reports', permission: 'SYSTEM_OTP_REPORT', icon: DataLine },
      { title: 'Cấu hình EUDR', path: '/admin/eudr-config', permission: 'SYSTEM_EUDR', icon: Coordinate },
      { title: 'Số liệu App', path: '/admin/home-stats', permission: 'SYSTEM_HOME_STATS', icon: TrendCharts },
      { title: 'Quản lý Sao lưu', path: '/admin/backups', permission: 'SYSTEM_BACKUP', icon: Document },
      { title: 'Mini App Analytics', path: '/admin/miniapp-analytics', permission: 'SYSTEM_MINIAPP', icon: TrendCharts },
      { title: 'Công cụ Database', path: '/admin/db-tools', permission: 'SYSTEM_DB_TOOLS', icon: Monitor },
    ]
  },
];
