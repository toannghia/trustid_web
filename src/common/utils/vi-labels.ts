/**
 * Vietnamese label mappings for status codes, role names, and enum values.
 * Centralised utility so all dashboards share the same translations.
 */

// ========== Helper ==========
export const viLabel = (map: Record<string, string>, code: string): string =>
  map[code] || code;

// ========== Vai trò thành viên ==========
// Source: RoleType enum + seed.ts operational roles
export const roleNameMap: Record<string, string> = {
  ADMIN: 'Quản trị hệ thống',
  TENANT: 'Chủ doanh nghiệp',
  TENANT_ADMIN: 'Quản trị viên',
  REGULATOR: 'Cán bộ giám sát',
  USER: 'Người dùng',
  END_USER: 'Người dùng cuối',
  DRIVER: 'Tài xế',
  RETAILER: 'Nhà bán lẻ',
  WAREHOUSE_MANAGER: 'Quản lý kho',
  FARMER: 'Nông dân',
  ACCOUNTANT: 'Kế toán',
  DEALER: 'Đại lý',
  TEAM_LEADER: 'Tổ trưởng',
  KCS_STAFF: 'Nhân viên KCS',
  WORKER: 'Công nhân',
  TRANSPORTER: 'Vận chuyển',
  PACKER: 'Thợ đóng gói',
  FARM_LEADER: 'Tổ trưởng nông trại',
};

// ========== Trạng thái lô sản xuất (SupplyBatch.status) ==========
export const batchStatusMap: Record<string, string> = {
  PACKING: 'Đang đóng gói',
  CLOSED: 'Đã đóng',
  SHIPPED: 'Đã xuất kho',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

// ========== Loại lô (SupplyBatch.batchType) ==========
export const batchTypeMap: Record<string, string> = {
  FARM: 'Nguyên liệu',
  EXTERNAL: 'Nhập ngoài',
  LEGACY: 'Kế thừa',
  CROSS_TENANT: 'Liên DN',
  EXPORTED: 'Đã xuất',
  SEMI_FINISHED: 'Bán thành phẩm',
};

// ========== Trạng thái mùa vụ (CropCycle.status) ==========
export const seasonStatusMap: Record<string, string> = {
  ACTIVE: 'Đang canh tác',
  HARVESTED: 'Đã thu hoạch',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

// ========== Trạng thái đơn hàng xuất (ExportOrder.status) ==========
export const exportOrderStatusMap: Record<string, string> = {
  DRAFT: 'Nháp',
  CONFIRMED: 'Đã xác nhận',
  PICKING: 'Đang soạn hàng',
  EXPORTED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

// ========== Trạng thái lệnh sản xuất (ProductionOrder.status) ==========
export const productionOrderStatusMap: Record<string, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  GENERATING: 'Đang tạo mã',
  CODES_READY: 'Mã sẵn sàng',
  GENERATION_FAILED: 'Tạo mã thất bại',
  IN_PROGRESS: 'Đang sản xuất',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

// ========== Trạng thái xe (TransportVehicle.status) ==========
export const vehicleStatusMap: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_TRANSIT: 'Đang vận chuyển',
  MAINTENANCE: 'Bảo trì',
};

// ========== Trạng thái người dùng ==========
export const userStatusMap: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  BLOCKED: 'Đã khóa',
  INACTIVE: 'Ngừng hoạt động',
};

// ========== Trạng thái đại lý ==========
export const dealerStatusMap: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
};

// ========== Loại nguồn sản xuất ==========
export const productionSourceTypeMap: Record<string, string> = {
  FARM: 'Nông trại',
  EXTERNAL: 'Nhập ngoài',
  CROSS_TENANT: 'Liên doanh nghiệp',
  SEMI_FINISHED: 'Bán thành phẩm',
};

// ========== Trạng thái tem / sản phẩm (ProductItem.status) ==========
export const productItemStatusMap: Record<string, string> = {
  INACTIVE: 'Chưa kích hoạt',
  ACTIVE: 'Đã kích hoạt',
  AT_DEALER: 'Tại đại lý',
  SOLD: 'Đã bán',
  LOST: 'Thất lạc',
};

