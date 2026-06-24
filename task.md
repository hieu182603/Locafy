Chào Claude, dự án này đã được cài đặt bộ kỹ năng `taste-skill` của Leonxlnx tại thư mục `.agents/skills/`. 

Tôi muốn bạn sử dụng các hướng dẫn trong các skill này (đặc biệt là `design-taste-frontend`, `high-end-visual-design`, `minimalist-ui` và `redesign-existing-projects`) để tiến hành thiết kế lại toàn bộ giao diện màn hình của admin 
Hãy tuân thủ nghiêm ngặt các yêu cầu sau:

1. THIẾT LẬP PHONG CÁCH (DESIGN READ & DIALS):
- Hãy đưa ra một dòng "Design Read" trước khi bắt đầu code.
- Thiết lập cấu hình 3 Dials phù hợp với Dashboard quản lý cao cấp:
  * DESIGN_VARIANCE: 6 (bố cục hiện đại, bento-grid nhẹ, tránh chia cột đều tẻ nhạt).
  * MOTION_INTENSITY: 5 (chuyển động tinh tế ở các nút bấm, tab transition, loading state mượt mà dùng springy transition).
  * VISUAL_DENSITY: 6 (mật độ thông tin tối ưu cho bảng điều khiển, sạch sẽ nhưng không bị quá trống trải).
- Vibe thiết kế: Modern SaaS / Clean Technical Portal. Đồng bộ với hệ thống màu thương hiệu Locafy trong index.css (Primary Blue/Indigo làm chủ đạo, Emerald Green làm điểm nhấn trạng thái, nền xám nhạt trung tính).

1. YÊU CẦU NÂNG CẤP THẨM MỸ (ANTI-SLOP):
- Nâng cấp cấu trúc các Box/Cards: Hạn chế lạm dụng card lồng card. Sử dụng khoảng trắng (negative space), các đường phân tách mảnh (1px border-gray-100) và hiệu ứng hover-lift để nhóm thông tin.
- Thiết kế lại các khu vực:
  * Phần thống kê (Stats): Thiết kế theo dạng Bento Grid nhẹ với kích thước các ô bất đối xứng thay vì 4 cột bằng nhau đơn điệu.
  * Danh sách tin đăng & Danh sách cuộc hẹn: Chuyển đổi giao diện danh sách thô thành dạng danh sách có nhịp điệu, badge trạng thái bo tròn mềm mại và tương phản tốt theo chuẩn WCAG.
  * Form đăng tin/chỉnh sửa: Thiết kế nhãn (label) rõ ràng phía trên input, căn chỉnh độ tương phản của placeholder, thêm tactile feedback (scale-[0.98]) khi click nút bấm.
  * Trạng thái trống (Empty States) và Đang tải (Loading States): Tạo các empty state tinh tế có icon và thông điệp rõ ràng, sử dụng skeleton loader khớp với hình dáng thật của card.

1. NGUYÊN TẮC BẢO TOÀN LOGIC (QUAN TRỌNG):
- Giữ nguyên 100% logic JavaScript/React hiện có: Các hàm useEffect, xử lý sự kiện (event handlers), các hàm gọi API (LocafyApi), logic Socket.io, và các state quản lý dữ liệu.
- Chỉ chỉnh sửa phần JSX (HTML) và các class CSS/Tailwind để thay đổi skin giao diện và cấu trúc layout.
- Không thay đổi tên các prop, hàm callback hoặc import thư viện không có sẵn.

Hãy thực hiện phân tích file LandlordDashboard.jsx trước, đưa ra giải pháp cấu trúc lại giao diện, sau đó tiến hành cập nhật file một cách hoàn chỉnh nhất.
