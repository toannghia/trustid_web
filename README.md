# TrustID Web - Hệ thống Quản trị Truy xuất Nguồn gốc & Chuỗi cung ứng Blockchain

![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4fc08d?style=flat-square&logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646cff?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8?style=flat-square&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Supported-2496ed?style=flat-square&logo=docker&logoColor=white)

**TrustID Web** (Trustid Blockchain Traceability Platform) là giao diện Web quản trị thuộc hệ sinh thái Trustid, tích hợp các công nghệ bản đồ số GIS, quét mã QR/Barcode thời gian thực, quản trị kho vận (WMS) nâng cao, và đối soát đóng dấu dữ liệu chống giả mạo lên mạng lưới Blockchain.

Hệ thống được thiết kế theo cấu trúc **Module-based** phân quyền chặt chẽ, tối ưu hóa hiệu năng hiển thị và đáp ứng các tiêu chuẩn bảo mật nghiêm ngặt.

---

## 🛠️ Công nghệ & Thư viện Cốt lõi

| Công nghệ | Vai trò / Thư viện sử dụng |
| :--- | :--- |
| **Core Framework** | **Vue 3** (Composition API, `<script setup>`), **Vite** (Build Tool), **TypeScript** |
| **UI & Styling** | **Tailwind CSS** (v3), **Element Plus** (Bộ UI Component tiếng Việt mặc định) |
| **State & Routing** | **Pinia** (Quản lý trạng thái), **Vue Router** (Định tuyến & Bảo vệ phân quyền) |
| **Bản đồ số & GIS** | **Leaflet**, **@geoman-io/leaflet-geoman-free** (Vẽ ranh giới vùng trồng), **Turf.js** (Tính diện tích vùng), **Mapbox GL / Maplibre GL** |
| **Thanh toán & POS** | Hỗ trợ quét mã QR/Barcode qua Camera Web (**html5-qrcode**), tạo mã QR động (**qrcode**) |
| **Báo cáo & Đồ thị** | **ECharts** (Biểu đồ thống kê), **ExcelJS** (Xuất excel nhị phân chuẩn kế toán), **jsPDF** & **html2canvas** (Xuất báo cáo PDF) |

---

## 📂 Cơ cấu Thư mục và Kiến trúc Module

Hệ thống áp dụng kiến trúc **Feature-based/Module-based** giúp quản lý mã nguồn dễ dàng khi mở rộng dự án. Tất cả mã nguồn chức năng nằm trong `src/modules/`.

```text
Trustid_web/
├── public/                 # Tài nguyên tĩnh công khai (logo, icons, fallback images)
├── src/
│   ├── api/                # Cấu hình HTTP Client (Axios interceptor, Base API)
│   ├── assets/             # Stylesheet toàn cục (main.css, tailwind.css)
│   ├── common/             # Tiện ích dùng chung (utils, status-labels, vi-labels, map fixes)
│   ├── components/         # Các UI component dùng chung cho toàn hệ thống
│   ├── config/             # Cấu hình tĩnh toàn cục
│   ├── layouts/            # Layouts chính (MainLayout chứa sidebar, EmptyLayout)
│   ├── router/             # Định tuyến Vue Router (`index.ts` điều hướng và kiểm tra quyền)
│   ├── types/              # Định nghĩa Typescript dùng chung toàn hệ thống
│   ├── App.vue             # Component gốc của ứng dụng
│   ├── main.ts             # Điểm khởi đầu ứng dụng (khởi tạo Pinia, Router, ElementPlus Việt hóa)
│   └── modules/            # Các modules chức năng độc lập:
│       ├── core/           # Đăng nhập, Profile, MenuConfig, Dashboard hệ thống, User/Tenant management
│       ├── farm/           # Quản lý nông trại (Vùng trồng GIS, EUDR, Crop Cycle, Nhật ký, KCS)
│       ├── supply/         # Quản lý chế biến & Chuỗi cung ứng (Lệnh SX, Đóng bao, Pallet, WMS, Xuất nhập kho, Thu hồi)
│       ├── dealer/         # Phân hệ cho Đại lý (Nhận hàng, Tồn kho, POS bán lẻ, Lịch sử hóa đơn)
│       ├── gov/            # Phân hệ cho cơ quan quản lý nhà nước (Giám sát, Báo cáo kiểm duyệt)
│       ├── blockchain/     # Quản lý đối soát và kiểm tra dấu tem Blockchain
│       ├── miniapp/        # Quản trị và phân tích dữ liệu ứng dụng Zalo Mini App
│       ├── retail/         # Quản lý kênh bán lẻ đại trà
│       └── batch-sync/     # Quản lý đồng bộ lô mã sản xuất
```

### Chi tiết các Module chức năng chính:

*   **`core`**: Xử lý xác thực (JWT), cấu hình phân quyền động (`RoleManagement.vue`), quản lý doanh nghiệp (`TenantManagement.vue`) và thống kê tổng hợp Dashboard.
*   **`farm`**: Quản lý ranh giới bản đồ đa giác (Polygon GeoJSON) của vùng trồng sử dụng Leaflet. Đánh giá kiểm định EUDR (EU Deforestation Regulation) và cảnh báo phá rừng tích hợp dữ liệu GFW (Global Forest Watch).
*   **`supply`**: Quản lý chuỗi cung ứng khép kín từ lúc nhận nguyên liệu thô (External Batch) -> Đưa vào sản xuất (Production Order) -> Đóng bao liên kết mã (Bag Linking) -> Đóng Pallet (Pallet Linking) -> Xuất kho vận chuyển (Fulfillment/Shipment) -> Nhận/Xuất kho tại các chi nhánh B2B -> Quản lý thu hồi sản phẩm lỗi (Recall).
*   **`dealer`**: Module chuyên biệt cho các đại lý phân phối sản phẩm. Hỗ trợ quét mã QR khi nhận hàng chuyển từ tổng kho về, quản lý bảng giá bán lẻ theo nhóm khách hàng, tích hợp màn hình bán lẻ POS tự động in hóa đơn nhiệt.
*   **`gov`**: Bảng điều khiển dành riêng cho các thanh tra sở/ngành quản lý dữ liệu truy xuất và báo cáo xuất nhập tồn toàn hệ thống.
*   **`blockchain`**: Lưu trữ mã băm dữ liệu (txHash) của các lô hàng đã đóng dấu điện tử lên mạng lưới Blockchain công khai/nội bộ để đảm bảo tính bất biến của thông tin.

---

## 🔐 Phân Quyền Người Dùng (Role-Based Access Control)

Các tuyến đường (Routes) được bảo vệ bằng Navigation Guard kiểm tra vai trò người dùng trong `src/router/index.ts`. Các vai trò khả dụng bao gồm:

| Vai trò (Role) | Phạm vi truy cập & Chức năng chính |
| :--- | :--- |
| **`ADMIN`** | Quản trị tối cao hệ thống: Quản lý Tenants, Người dùng, Phân quyền, Gửi thông báo toàn hệ thống, Cấu hình dữ liệu nền. |
| **`REGULATOR`** | Cơ quan quản lý: Giám sát vùng trồng, xem báo cáo thanh tra chất lượng, kiểm định đa giác vùng trồng, Dashboard Gov. |
| **`TENANT_ADMIN`**| Quản trị viên của doanh nghiệp: Quản lý nhân viên nội bộ, sản phẩm, kho hàng, vùng trồng, lệnh sản xuất của doanh nghiệp. |
| **`FARMER`** | Nông dân sản xuất: Nhật ký chăm sóc cây trồng, khai báo thu hoạch lô sản phẩm, quản lý diện tích ranh giới rẫy vườn. |
| **`TEAM_LEADER`** | Đội trưởng đội sản xuất: Quản lý danh sách nông dân trong đội, giao việc, duyệt nhật ký nông hộ. |
| **`PACKAGER`** | Nhân viên đóng gói: Quét mã QR liên kết sản phẩm vào bao, liên kết bao vào pallet tại nhà máy. |
| **`WAREHOUSE_MANAGER`**| Thủ kho: Quản lý xuất/nhập/tồn kho nguyên liệu và thành phẩm, kiểm tra xuất kho B2B và B2C. |
| **`DEALER`** | Đại lý/Nhà phân phối: Nhận hàng ký gửi, bán lẻ trực tiếp (POS), quản lý khách hàng thân thiết và giá bán lẻ. |
| **`DRIVER`** | Tài xế vận chuyển: Quản lý hành trình giao nhận hàng hóa từ kho tổng tới các kho đại lý. |

---

## 🚀 Hướng dẫn Cài đặt cục bộ (Local Development)

### Yêu cầu hệ thống (Prerequisites)
*   **Node.js**: Phiên bản **20.x** (LTS khuyến nghị)
*   **NPM**: Phiên bản **10.x** trở lên

### Các bước cài đặt:

1.  **Clone mã nguồn** và di chuyển vào thư mục dự án Web:
    ```bash
    cd Trustid_web
    ```

2.  **Cài đặt các gói phụ thuộc (Dependencies)**:
    ```bash
    npm install
    # Hoặc nếu xảy ra xung đột phiên bản dependencies hệ thống cũ:
    npm install --legacy-peer-deps
    ```

3.  **Cấu hình biến môi trường**:
    Tạo hoặc chỉnh sửa file `.env` tại thư mục gốc của dự án:
    ```env
    # URL kết nối tới Backend API chính
    VITE_API_URL=http://localhost:3000
    
    VITE_GATEWAY_ADMIN_KEY=xxx
    ```

4.  **Khởi chạy dự án ở chế độ phát triển (Development)**:
    ```bash
    npm run dev
    ```
    Mặc định ứng dụng sẽ chạy tại địa chỉ: `http://localhost:5173` (hoặc cổng tiếp theo khả dụng).

5.  **Biên dịch tối ưu hóa và Đóng gói (Build Production)**:
    ```bash
    npm run build
    ```
    Thư mục đầu ra sau khi build thành công sẽ nằm ở `./dist/`.

---

## 🐳 Đóng gói bằng Docker & Nginx (Production Deployment)

Hệ thống hỗ trợ quy trình build đa tầng (**Multi-stage Build**) để giảm kích thước ảnh Docker và bảo mật ứng dụng tĩnh.

### 1. Cấu hình Dockerfile hoạt động qua 2 tầng:
*   **Tầng 1 (Build)**: Sử dụng base image `node:20-alpine`, copy source code và thực hiện build static files với cấu hình cấp phát tài nguyên RAM tăng cường: `NODE_OPTIONS="--max-old-space-size=4096"` tránh lỗi tràn bộ nhớ trên các máy chủ CI/CD tài nguyên yếu.
*   **Tầng 2 (Serve)**: Sử dụng ảnh siêu nhẹ `nginx:alpine`, sao chép thư mục sản phẩm build tĩnh `/app/dist` vào `/usr/share/nginx/html` và ghi đè tệp cấu hình `nginx.conf` tùy chỉnh.

### 2. Cấu hình Định tuyến Nginx (`nginx.conf`)
Tệp `nginx.conf` chịu trách nhiệm cấu hình:
1.  **SPA Routing**: Chuyển hướng toàn bộ các URL không tồn tại về `index.html` (`try_files $uri /index.html;`) để Vue Router đảm nhận xử lý định tuyến phía client.
2.  **Reverse Proxy cho Gateway API**: Định tuyến các yêu cầu bắt đầu bằng prefix `/gateway-api/` chuyển thẳng đến cổng Gateway hành chính bảo mật:
    ```nginx
    location /gateway-api/ {
        resolver 8.8.8.8 valid=30s;
        set $gateway_upstream https://nda.veritrust.vn;
        proxy_pass $gateway_upstream/admin/v1/;
        proxy_ssl_server_name on;
        proxy_set_header Host nda.veritrust.vn;
        proxy_set_header X-Real-IP $remote_addr;
    }
    ```

### 3. Lệnh đóng gói và chạy Docker:

*   **Đóng gói ảnh Docker (Build Image)**:
    ```bash
    docker build -t trustid-web .
    ```

*   **Khởi chạy Container**:
    ```bash
    docker run -d --name trustid-frontend -p 80:80 --restart always trustid-web
    ```

---

## 📝 Quy chuẩn Phát triển dành cho Lập trình viên mới

Nếu bạn là lập trình viên mới tham gia dự án, vui lòng tuân thủ các quy tắc sau:

1.  **Định nghĩa kiểu dữ liệu (TypeScript)**:
    Tuyệt đối không lạm dụng kiểu dữ liệu `any`. Hãy viết interface hoặc type đầy đủ trong thư mục `src/types/` hoặc định nghĩa cục bộ trong module nếu kiểu đó không tái sử dụng.
2.  **Thêm các trang và định tuyến mới**:
    *   Tạo Component/View trong thư mục `views` của module tương ứng (ví dụ: `src/modules/supply/views/NewFeature.vue`).
    *   Khai báo route trong `src/router/index.ts`. Nhớ gán vai trò được quyền truy cập tại thuộc tính `meta.roles` và chỉ định trang có yêu cầu đăng nhập không bằng `meta.requiresAuth: true`.
3.  **Đa ngôn ngữ & Nhãn trạng thái**:
    Không tự viết cứng (hardcode) các từ tiếng Việt hiển thị trên UI đối với các trạng thái nghiệp vụ. Hãy tham khảo và tái sử dụng các bộ nhãn dịch tại:
    *   `src/common/utils/vi-labels.ts` (Dịch tên trạng thái, phân loại lô, đơn vị tính).
    *   `src/common/utils/status-labels.ts` (Định dạng màu sắc/badge trạng thái chuỗi cung ứng).
4.  **Kiểm tra chất lượng trước khi Commit/Push**:
    Trước khi gửi code lên nhánh chính, hãy luôn chạy trình kiểm tra lỗi cú pháp và kiểu dữ liệu:
    ```bash
    # Chạy kiểm tra tĩnh lỗi cú pháp typescript
    npx vue-tsc --noEmit
    ```
