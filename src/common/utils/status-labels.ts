/**
 * Centralized Vietnamese labels for all system status codes.
 * Import these functions instead of hardcoding labels in each view.
 */

// ==================== SHIPMENT STATUS ====================
const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Mới tạo',
  CONFIRMED: 'Đã xác nhận',
  SCANNING: 'Đang quét hàng',
  READY: 'Sẵn sàng giao',
  READY_FOR_PICKUP: 'Chờ lấy hàng',
  WAITING_DRIVER: 'Chờ tài xế nhận',
  PICKED_UP: 'Đã lấy hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  PENDING_DEALER_CONFIRM: 'Chờ xác nhận nhận',
  DELIVERED: 'Tài xế đã giao',
  AT_DEALER: 'Đã nhận vào kho',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả hàng',
};

const SHIPMENT_STATUS_TYPES: Record<string, string> = {
  CREATED: 'info',
  CONFIRMED: 'primary',
  SCANNING: 'warning',
  READY: 'primary',
  READY_FOR_PICKUP: 'primary',
  WAITING_DRIVER: 'warning',
  PICKED_UP: 'primary',
  IN_TRANSIT: 'warning',
  PENDING_DEALER_CONFIRM: 'info',
  DELIVERED: 'success',
  AT_DEALER: 'success',
  CANCELLED: 'danger',
  RETURNED: 'danger',
};

export const shipmentStatusLabel = (status: string) => SHIPMENT_STATUS_LABELS[status] || status;
export const shipmentStatusType = (status: string) => SHIPMENT_STATUS_TYPES[status] || 'info';

// ==================== PRODUCT ITEM STATUS ====================
const ITEM_STATUS_LABELS: Record<string, string> = {
  INACTIVE: 'Chưa kích hoạt',
  ACTIVE: 'Đã kích hoạt',
  AT_DEALER: 'Tại đại lý',
  SOLD: 'Đã bán',
  LOST: 'Thất lạc',
  IN_TRANSIT: 'Đang vận chuyển',
  SCANNED: 'Đã quét',
  AVAILABLE: 'Có sẵn',
  RESERVED: 'Đã đặt trước',
  DAMAGED: 'Hư hỏng',
};

const ITEM_STATUS_TYPES: Record<string, string> = {
  INACTIVE: 'info',
  ACTIVE: 'success',
  AT_DEALER: 'success',
  SOLD: 'warning',
  LOST: 'danger',
  IN_TRANSIT: 'warning',
  SCANNED: 'primary',
  AVAILABLE: 'success',
  RESERVED: 'warning',
  DAMAGED: 'danger',
};

export const itemStatusLabel = (status: string) => ITEM_STATUS_LABELS[status] || status;
export const itemStatusType = (status: string) => ITEM_STATUS_TYPES[status] || 'info';

// ==================== WAREHOUSE STATUS ====================
const WAREHOUSE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
};

export const warehouseStatusLabel = (status: string) => WAREHOUSE_STATUS_LABELS[status] || status;

// ==================== WAREHOUSE TYPE ====================
const WAREHOUSE_TYPE_LABELS: Record<string, string> = {
  PRODUCTION: 'Sản xuất',
  STORAGE: 'Lưu kho',
  FINISHED: 'Thành phẩm',
  DISTRIBUTION: 'Phân phối',
  DEALER: 'Đại lý',
};

export const warehouseTypeLabel = (type: string) => WAREHOUSE_TYPE_LABELS[type] || type;

// ==================== BATCH STATUS ====================
const BATCH_STATUS_LABELS: Record<string, string> = {
  PACKING: 'Đang đóng gói',
  CLOSED: 'Đã đóng',
  SHIPPED: 'Đã xuất',
  COMPLETED: 'Hoàn thành',
};

const BATCH_STATUS_TYPES: Record<string, string> = {
  PACKING: 'warning',
  CLOSED: 'info',
  SHIPPED: 'success',
  COMPLETED: 'success',
};

export const batchStatusLabel = (status: string) => BATCH_STATUS_LABELS[status] || status;
export const batchStatusType = (status: string) => BATCH_STATUS_TYPES[status] || 'info';

// ==================== VEHICLE STATUS ====================
const VEHICLE_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_USE: 'Đang sử dụng',
  MAINTENANCE: 'Bảo trì',
  RETIRED: 'Đã thanh lý',
};

export const vehicleStatusLabel = (status: string) => VEHICLE_STATUS_LABELS[status] || status;

// ==================== STOCK MOVEMENT TYPE ====================
const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  INBOUND: 'Nhập kho',
  OUTBOUND: 'Xuất kho',
  TRANSFER: 'Luân chuyển',
  ADJUSTMENT: 'Điều chỉnh',
  RETURN: 'Trả hàng',
};

export const movementTypeLabel = (type: string) => MOVEMENT_TYPE_LABELS[type] || type;

// ==================== SHIPMENT TYPE ====================
const SHIPMENT_TYPE_LABELS: Record<string, string> = {
  OUTBOUND: 'Xuất kho',
  INBOUND: 'Nhập kho',
  TRANSFER: 'Luân chuyển',
  DEALER_DELIVERY: 'Giao đại lý',
  RETURN: 'Trả hàng',
};

export const shipmentTypeLabel = (type: string) => SHIPMENT_TYPE_LABELS[type] || type;

// ==================== SCAN METHOD ====================
const SCAN_METHOD_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Quét lẻ',
  BOX: 'Quét thùng',
  BAG: 'Quét bao',
};

export const scanMethodLabel = (method: string) => SCAN_METHOD_LABELS[method] || method;

// ==================== CROP CYCLE STATUS ====================
const CROP_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang canh tác',
  COMPLETED: 'Đã thu hoạch',
  INACTIVE: 'Ngừng hoạt động',
  PLANNED: 'Đã lên kế hoạch',
};

export const cropStatusLabel = (status: string) => CROP_STATUS_LABELS[status] || status;

// ==================== USER STATUS ====================
const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  SUSPENDED: 'Bị khóa',
  PENDING: 'Chờ duyệt',
};

export const userStatusLabel = (status: string) => USER_STATUS_LABELS[status] || status;

// ==================== CODE POOL / STAMP STATUS ====================
const STAMP_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang sử dụng',
  INACTIVE: 'Ngừng sử dụng',
  USED: 'Đã sử dụng',
  AVAILABLE: 'Có sẵn',
  EXHAUSTED: 'Đã hết',
};

export const stampStatusLabel = (status: string) => STAMP_STATUS_LABELS[status] || status;

// ==================== EXPORT ORDER STATUS ====================
const EXPORT_ORDER_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Mới tạo',
  CONFIRMED: 'Đã xác nhận',
  PICKING: 'Đang lấy hàng',
  READY: 'Sẵn sàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const exportOrderStatusLabel = (status: string) => EXPORT_ORDER_STATUS_LABELS[status] || status;

// ==================== SEMI-FINISHED STATUS ====================
const SEMI_FINISHED_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  EXPORTED: 'Đã xuất',
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
};

export const semiFinishedStatusLabel = (status: string) => SEMI_FINISHED_STATUS_LABELS[status] || status;

// ==================== LOCATION STATUS ====================
const LOCATION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
};

export const locationStatusLabel = (status: string) => LOCATION_STATUS_LABELS[status] || status;

// ==================== GENERIC STATUS (fallback) ====================
const GENERIC_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  AVAILABLE: 'Có sẵn',
  UNAVAILABLE: 'Không có sẵn',
  PENDING: 'Chờ xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  CREATED: 'Mới tạo',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
};

export const genericStatusLabel = (status: string) => GENERIC_STATUS_LABELS[status] || status;
