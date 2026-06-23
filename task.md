Bạn hãy đóng vai trò là một **Kỹ sư Frontend React / UI-UX Expert** chuyên nghiệp. Nhiệm vụ của bạn là đọc các trang giao diện HTML tĩnh ở dự án gốc tại `e:\quên\Locafy` và chuyển đổi/viết lại toàn bộ chúng thành các Component React chất lượng cao trong dự án `e:\quên\Locafyy` sử dụng **React 19 + Vite + Tailwind CSS v4**.

---

## 1. Nghiên cứu tài liệu MVP & Phạm vi thực hiện
Đọc kỹ tệp yêu cầu tại [mvp.md](file:///e:/quên/Locafyy/mvp.md) trước khi thực hiện. Bạn chỉ được phép làm các màn hình và tính năng nằm trong phạm vi MVP. Bỏ qua/Không chuyển đổi các tính năng chưa làm ở bản đầu.

### Các màn hình và chức năng CẦN làm (Theo MVP):
- **Guest / Renter (Người dùng chung)**: Trang chủ, Tìm kiếm & Lọc nâng cao (có Bản đồ), Chi tiết phòng trọ (gửi tin nhắn, đặt lịch hẹn trực tiếp), Đăng ký/Đăng nhập (đăng nhập truyền thống, không dùng Google OAuth).
- **Renter Dashboard**: Hồ sơ cá nhân (thông tin, đổi mật khẩu), Lịch hẹn xem phòng (danh sách, trạng thái, hủy lịch), Danh sách yêu thích, Thông báo hệ thống, Hộp thư chat trực tuyến (Socket.io).
- **Seller Dashboard**: Trang tổng quan (thống kê phòng, tin đăng, lịch hẹn, doanh thu), Quản lý phòng trọ (thêm mới, sửa, ẩn/hiện/xóa), Đăng tin & gửi Admin duyệt, Hồ sơ xác minh chủ trọ (tải ảnh căn cước/giấy tờ nhà trọ), Quản lý lịch hẹn của khách, Chat trực tuyến (Socket.io), Gói dịch vụ & Hóa đơn (PayOS).
- **Admin Dashboard**: Duyệt xác minh chủ trọ, Kiểm duyệt tin đăng (phê duyệt hoặc từ chối kèm lý do), Quản lý tài khoản (khóa/mở khóa), Quản lý báo cáo vi phạm, Cấu hình hệ thống (FAQ, bài viết, banner, SEO).

### Các tính năng BỎ QUA (Không làm ở bản đầu):
- Hợp đồng điện tử (E-contracts) -> Bỏ qua tệp `manage/contract-builder.html`.
- Quản lý điện nước chi tiết (chỉ để các trường nhập giá điện/nước cơ bản khi tạo phòng).
- Chatbot AI tư vấn & gợi ý tự động.
- Đặt cọc trực tuyến.

---

## 2. Bản đồ chuyển đổi từ HTML (`Locafy`) sang React (`Locafyy`)

Hãy thực hiện chuyển đổi và tích hợp giao diện từ các tệp nguồn sang các tệp đích tương ứng:

### 2.1. Các trang dùng chung (Root Pages)
- **Trang chủ**: Nguồn `Locafy/index.html` ➔ Đích `Locafyy/frontend/src/pages/Home.jsx`.
- **Tìm kiếm & Lọc**: Nguồn `Locafy/phong-tro.html` ➔ Đích `Locafyy/frontend/src/pages/Search.jsx`.
- **Chi tiết phòng**: Nguồn `Locafy/house-detail.html` ➔ Đích `Locafyy/frontend/src/pages/Detail.jsx`.
- **Auth (Đăng nhập / Đăng ký)**: Nguồn `Locafy/login.html` & `register.html` ➔ Đích `Locafyy/frontend/src/pages/Login.jsx` & `Register.jsx`.

### 2.2. Khách thuê Dashboard
- Nguồn:
  - `Locafy/user/account-settings.html` (Cài đặt tài khoản)
  - `Locafy/user/appointments.html` (Lịch hẹn)
  - `Locafy/user/favorites.html` (Yêu thích)
  - `Locafy/user/notification.html` (Thông báo)
- Đích: Tích hợp vào các Tab tương ứng trong `Locafyy/frontend/src/pages/user/UserDashboard.jsx`.
- **QUAN TRỌNG**: Giữ lại các logic kết nối Socket.io Chat và danh sách thanh toán hóa đơn qua PayOS đã được viết sẵn trong `UserDashboard.jsx`. Chỉ cải tiến phần thiết kế bao quanh chứ không ghi đè làm hỏng logic kết nối thật.

### 2.3. Chủ trọ Dashboard
- Nguồn:
  - `Locafy/manage/dashboard.html` (Thống kê)
  - `Locafy/manage/room-management.html` (Danh sách phòng)
  - `Locafy/manage/add-room.html` / `seller-edit.html` (Thêm & Sửa phòng)
  - `Locafy/manage/appointment-management.html` (Duyệt lịch hẹn)
  - `Locafy/manage/tenant-management.html` (Quản lý khách trọ cơ bản)
  - `Locafy/manage/payment.html` (Gói dịch vụ)
  - `Locafy/manage/account-settings.html` (Hồ sơ xác minh chủ nhà)
- Đích: Tích hợp vào các Tab tương ứng trong `Locafyy/frontend/src/pages/manage/LandlordDashboard.jsx`.
- **QUAN TRỌNG**: Giữ nguyên logic kết nối socket.io real-time chat và logic tạo link/webhook thanh toán dịch vụ qua PayOS đã có trong `LandlordDashboard.jsx`.

### 2.4. Admin Dashboard
- Nguồn: Các file trong thư mục `Locafy/admin/` (dashboard, verify-landlord, room-censorship, user-management, reports-violations, content-management, system-settings, track-bookings).
- Đích: Tích hợp vào các Tab tương ứng trong `Locafyy/frontend/src/pages/admin/AdminDashboard.jsx`.

---

## 3. Quy chuẩn Thiết kế & CSS (Tailwind v4)
- **Hệ màu**: Khách thuê / chung dùng màu Royal Blue (`brand-500`), Chủ trọ dùng màu Emerald Green (`seller-500`).
- **Góc bo & Bóng đổ Premium**: Sử dụng các biến tùy chỉnh trong `index.css`: `rounded-premium-lg` (16px), `rounded-premium-xl` (20px), `shadow-premium-md`, `shadow-premium-lg`.
- **Hiệu ứng**: Sử dụng class `hover-lift` để thẻ trồi lên nhẹ khi hover và các chuyển động transition mượt mà.
- **Font & Icon**: Dùng font `Be Vietnam Pro` mặc định và bộ thư viện Font Awesome 6 cho icon.

---

## 4. Tương tác API và Quản lý State
- Gọi trực tiếp các API trong `LocafyApi` (`api.js`) thay vì dùng dữ liệu giả.
- Sử dụng context `useAuth()` để quản lý đăng nhập, lấy token và thông tin profile.
- Tự động bắt lỗi form nhập liệu chặt chẽ ở phía client (validation).
