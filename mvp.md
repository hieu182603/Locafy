# PHÂN TÍCH VÀ PHÂN CHIA MVP
## Website giới thiệu phòng trọ cho sinh viên khu vực Hòa Lạc

## 1. Tổng quan

Website kết nối sinh viên có nhu cầu thuê trọ tại Hòa Lạc với chủ trọ hoặc người đăng tin. Hệ thống gồm 3 role chính:

- **User:** Người tìm thuê phòng.
- **Seller:** Chủ trọ, người quản lý hoặc người đăng tin.
- **Admin:** Người vận hành hệ thống.

Ngoài ra có **Guest** là người chưa đăng nhập.

Mục tiêu chính:

- User tìm kiếm, xem và liên hệ phòng trọ.
- Seller đăng và quản lý phòng.
- Admin kiểm duyệt, quản lý tài khoản, gói dịch vụ và doanh thu.
- User và Seller có thể đăng ký, đăng nhập bằng Google.

---

## 2. Xác thực và tài khoản

### 2.1. Đăng ký bằng email hoặc số điện thoại

#### User

- Chọn role User.
- Nhập họ tên.
- Nhập email hoặc số điện thoại.
- Nhập và xác nhận mật khẩu.
- Đồng ý điều khoản.
- Xác thực email hoặc OTP.
- Bổ sung nhu cầu tìm trọ.

#### Seller

- Chọn role Seller.
- Nhập họ tên hoặc tên đơn vị.
- Nhập email hoặc số điện thoại.
- Nhập và xác nhận mật khẩu.
- Đồng ý điều khoản.
- Xác thực email hoặc OTP.
- Bổ sung thông tin seller.
- Gửi hồ sơ xác minh.

### 2.2. Đăng ký và đăng nhập bằng Google

Áp dụng cho cả User và Seller.

#### Luồng đăng ký bằng Google

1. Người dùng chọn **Tiếp tục với Google**.
2. Hệ thống mở màn hình chọn tài khoản Google.
3. Người dùng cấp quyền truy cập email, họ tên và ảnh đại diện.
4. Hệ thống kiểm tra email đã tồn tại hay chưa.
5. Nếu chưa tồn tại, người dùng chọn role User hoặc Seller.
6. Hệ thống tạo tài khoản và chuyển tới bước bổ sung hồ sơ.
7. Nếu email đã tồn tại, hệ thống đăng nhập vào tài khoản tương ứng.

#### Thông tin User cần bổ sung

- Số điện thoại.
- Trường đang học.
- Khu vực mong muốn.
- Khoảng giá mong muốn.
- Loại phòng mong muốn.
- Số người dự kiến ở.
- Ngày dự kiến chuyển vào.

#### Thông tin Seller cần bổ sung

- Số điện thoại.
- Loại seller: chủ trọ, người quản lý hoặc môi giới.
- Địa chỉ liên hệ.
- Thông tin nhà trọ.
- Giấy tờ cá nhân.
- Giấy tờ chứng minh quyền sở hữu hoặc quản lý.

#### Quy tắc nghiệp vụ

- Một email Google chỉ liên kết với một tài khoản.
- Một tài khoản chỉ có một role chính.
- Seller đăng ký bằng Google vẫn phải hoàn thành xác minh trước khi đăng tin công khai.
- Người dùng phải bổ sung số điện thoại nếu Google không cung cấp.
- Có thể hỗ trợ liên kết Google với tài khoản đăng ký thủ công sau khi xác minh.
- Khi hủy liên kết Google, tài khoản phải có mật khẩu để tiếp tục đăng nhập.

### 2.3. Màn hình xác thực

| Mã | Màn hình |
|---|---|
| AUTH-01 | Đăng nhập |
| AUTH-02 | Đăng ký |
| AUTH-03 | Chọn role sau đăng ký Google |
| AUTH-04 | Bổ sung hồ sơ User |
| AUTH-05 | Bổ sung hồ sơ Seller |
| AUTH-06 | Xác thực email hoặc OTP |
| AUTH-07 | Quên mật khẩu |
| AUTH-08 | Đặt lại mật khẩu |
| AUTH-09 | Liên kết tài khoản Google |
| AUTH-10 | Quản lý phiên đăng nhập |

---

## 3. Chức năng theo role

### 3.1. Guest

- Xem trang chủ.
- Xem danh sách phòng.
- Tìm kiếm và lọc phòng.
- Xem thông tin cơ bản.
- Xem bài viết, giới thiệu và chính sách.
- Đăng ký hoặc đăng nhập.

Guest chưa được xem số điện thoại seller, địa chỉ chi tiết, bản đồ chi tiết, nhắn tin, đặt lịch, lưu phòng hoặc báo cáo tin.

### 3.2. User

#### Tài khoản

- Đăng ký, đăng nhập bằng email, số điện thoại hoặc Google.
- Đăng xuất, quên mật khẩu, đổi mật khẩu.
- Cập nhật hồ sơ và ảnh đại diện.
- Liên kết hoặc hủy liên kết Google.
- Thiết lập nhu cầu tìm trọ.

#### Tìm kiếm phòng

- Tìm theo từ khóa, khu vực, trường học.
- Lọc theo giá, diện tích, loại phòng, tiện ích, khoảng cách.
- Lọc theo ngày có thể chuyển vào.
- Sắp xếp theo giá, khoảng cách, ngày đăng.
- Xem phòng trên bản đồ.

#### Chi tiết phòng

- Xem hình ảnh, video, giá, tiền cọc.
- Xem điện, nước, Internet, phí gửi xe.
- Xem diện tích, tiện ích, nội thất, nội quy.
- Xem địa chỉ và bản đồ sau khi đăng nhập.
- Xem thông tin seller.
- Chia sẻ và báo cáo tin.

#### Tương tác

- Lưu phòng yêu thích.
- So sánh phòng.
- Xem lịch sử đã xem.
- Nhắn tin với seller.
- Gửi hình ảnh và thông tin phòng.
- Đặt, đổi hoặc hủy lịch xem phòng.
- Nhận thông báo.

#### Gói dịch vụ

- Xem User Free và Fast Match.
- Mua gói, thanh toán, gia hạn.
- Xem gói đang dùng, lịch sử giao dịch và hóa đơn.

### 3.3. Seller

#### Tài khoản và xác minh

- Đăng ký, đăng nhập bằng email, số điện thoại hoặc Google.
- Cập nhật hồ sơ.
- Xác minh email và số điện thoại.
- Tải giấy tờ cá nhân và giấy tờ nhà trọ.
- Gửi yêu cầu xác minh.
- Xem trạng thái và bổ sung hồ sơ.

#### Quản lý nhà trọ và phòng

- Thêm, sửa, ẩn hoặc xóa nhà trọ.
- Cập nhật địa chỉ và vị trí bản đồ.
- Thêm, sửa, nhân bản phòng.
- Thêm hình ảnh, video.
- Cập nhật giá, diện tích, tiền cọc, điện nước, tiện ích và trạng thái.

#### Quản lý tin đăng

- Tạo tin, lưu nháp, xem trước.
- Gửi admin duyệt.
- Chỉnh sửa và gửi duyệt lại.
- Xem lý do từ chối.
- Ẩn, xóa hoặc đăng lại tin.
- Đẩy tin, ghim tin, mua lượt làm mới.

#### Khách hàng và lịch hẹn

- Xem khách đã liên hệ.
- Ghi chú khách hàng.
- Cập nhật trạng thái khách hàng.
- Trả lời tin nhắn.
- Xác nhận, từ chối hoặc đề xuất lại lịch xem.

#### Gói dịch vụ

- Xem Free, Basic, Pro và Premium.
- So sánh, mua hoặc nâng cấp gói.
- Xem hạn mức tin và lượt đẩy.
- Xem giao dịch và hóa đơn.

### 3.4. Admin

- Đăng nhập admin.
- Xem dashboard tổng quan.
- Quản lý User và Seller.
- Duyệt xác minh Seller.
- Khóa hoặc mở khóa tài khoản.
- Kiểm duyệt tin đăng.
- Xử lý báo cáo và khiếu nại.
- Quản lý gói User và Seller.
- Quản lý giao dịch, đối soát, hoàn tiền, doanh thu.
- Quản lý banner, bài viết, FAQ, chính sách và SEO.

---

# 4. Phân chia các giai đoạn MVP

## MVP 0 – Nền tảng kỹ thuật

### Mục tiêu

Chuẩn bị tài liệu, kiến trúc và môi trường phát triển.

### Phạm vi

- Phân tích nghiệp vụ.
- Thiết kế database và ERD.
- Thiết kế kiến trúc frontend, backend.
- Thiết kế wireframe cơ bản.
- Khởi tạo source code.
- Thiết lập dev, test, production.
- Thiết lập logging, lưu trữ ảnh và dữ liệu mẫu.

### Kết quả

- Tài liệu yêu cầu.
- ERD.
- API convention.
- Wireframe.
- Source code nền.

---

## MVP 1 – Xác thực và tìm kiếm cơ bản

### Mục tiêu

Cho phép người dùng đăng ký, đăng nhập và tìm kiếm phòng.

### Guest

- Trang chủ.
- Danh sách phòng.
- Tìm kiếm và lọc cơ bản.
- Xem thông tin phòng công khai.

### User

- Đăng ký bằng email, số điện thoại hoặc Google.
- Chọn role User sau đăng ký Google.
- Đăng nhập và quên mật khẩu.
- Bổ sung hồ sơ.
- Xem chi tiết phòng.
- Xem địa chỉ, bản đồ và số điện thoại sau khi đăng nhập.
- Lưu phòng yêu thích.

### Seller

- Đăng ký bằng email, số điện thoại hoặc Google.
- Chọn role Seller sau đăng ký Google.
- Bổ sung hồ sơ.
- Gửi hồ sơ xác minh.
- Xem trạng thái xác minh.

### Admin

- Quản lý User và Seller.
- Duyệt hoặc từ chối Seller.
- Khóa hoặc mở khóa tài khoản.

### Tiêu chí hoàn thành

- User và Seller đăng ký, đăng nhập Google thành công.
- Tài khoản được tạo đúng role.
- Seller chưa xác minh không được đăng tin.
- User đăng nhập xem được thông tin liên hệ và bản đồ.

---

## MVP 2 – Seller đăng tin và Admin kiểm duyệt

### Mục tiêu

Tạo nguồn cung phòng và đảm bảo tin được kiểm duyệt.

### Seller

- Tạo và chỉnh sửa nhà trọ.
- Thêm và chỉnh sửa phòng.
- Tải hình ảnh, video.
- Tạo tin, lưu nháp, xem trước.
- Gửi duyệt.
- Chỉnh sửa tin bị từ chối.
- Ẩn hoặc xóa tin.

### Admin

- Xem tin chờ duyệt.
- Duyệt, từ chối hoặc yêu cầu chỉnh sửa.
- Tạm ẩn hoặc khóa tin.
- Xem lịch sử chỉnh sửa.

### User

- Xem tin đã duyệt.
- Tìm kiếm, lọc, lưu và chia sẻ tin.
- Báo cáo tin vi phạm.

### Tiêu chí hoàn thành

- Tin chưa duyệt không xuất hiện công khai.
- Admin xử lý được toàn bộ trạng thái kiểm duyệt.
- Seller xem được lý do từ chối.

---

## MVP 3 – Nhắn tin và lịch xem phòng

### Mục tiêu

Hoàn thiện luồng kết nối User và Seller.

### User

- Nhắn tin Seller.
- Gửi hình ảnh.
- Đặt, đổi hoặc hủy lịch xem.
- Nhận thông báo.
- Chặn và báo cáo Seller.

### Seller

- Trả lời tin nhắn.
- Gửi thông tin phòng.
- Xác nhận, từ chối hoặc đề xuất thời gian khác.
- Ghi chú khách hàng.
- Cập nhật trạng thái khách hàng.

### Admin

- Xem và xử lý báo cáo hội thoại.
- Theo dõi lịch sử xử lý.

### Tiêu chí hoàn thành

- User và Seller nhắn tin hai chiều.
- Lịch hẹn có đầy đủ trạng thái.
- Hai bên nhận được thông báo thay đổi.

---

## MVP 4 – Gói dịch vụ và thanh toán

### Mục tiêu

Tạo doanh thu cho hệ thống.

### User

- Xem User Free và Fast Match.
- Mua và gia hạn Fast Match.
- Xem gói, giao dịch và hóa đơn.
- Nhận quyền lợi sau thanh toán.

### Seller

- Xem Free, Basic, Pro, Premium.
- Mua hoặc nâng cấp gói.
- Xem hạn mức tin và lượt đẩy.
- Mua dịch vụ bổ sung.
- Đẩy và ghim tin.

### Admin

- Tạo và chỉnh sửa gói.
- Cập nhật giá, thời hạn và hạn mức.
- Xem giao dịch, đối soát và hoàn tiền.
- Quản lý mã giảm giá.
- Xem báo cáo doanh thu.

### Tiêu chí hoàn thành

- Thanh toán thành công kích hoạt đúng gói.
- Thanh toán thất bại không kích hoạt gói.
- Hạn mức được áp dụng đúng.
- Gói hết hạn tự động trở về quyền lợi mặc định.

---

## MVP 5 – Báo cáo và tối ưu trải nghiệm

### Mục tiêu

Tăng hiệu quả vận hành và trải nghiệm sử dụng.

### User

- So sánh phòng.
- Xem lịch sử đã xem.
- Lưu tìm kiếm.
- Nhận gợi ý phòng.
- Cài đặt thông báo.

### Seller

- Dashboard nâng cao.
- Báo cáo lượt xem, lượt lưu, liên hệ và lịch hẹn.
- Tỷ lệ chuyển đổi.
- Xuất danh sách khách hàng và báo cáo theo gói.

### Admin

- Báo cáo tăng trưởng User và Seller.
- Báo cáo tin đăng và doanh thu.
- Quản lý banner, bài viết, FAQ, chính sách và SEO.

### Tiêu chí hoàn thành

- Dashboard hiển thị đúng dữ liệu.
- Seller xem được hiệu quả từng tin.
- Admin quản lý được nội dung website.

---

## MVP 6 – Mở rộng sau phiên bản ổn định

- Ứng dụng mobile.
- Tour phòng 360 độ.
- Hợp đồng điện tử.
- Đặt cọc trực tuyến.
- Quản lý hợp đồng thuê.
- Quản lý điện nước.
- Chatbot tư vấn.
- AI gợi ý phòng.
- Phát hiện tin và hình ảnh trùng lặp.
- Tích hợp dịch vụ vận chuyển.

---

# 5. Bảng tổng hợp phạm vi MVP

| Nhóm chức năng | MVP 1 | MVP 2 | MVP 3 | MVP 4 | MVP 5 |
|---|:---:|:---:|:---:|:---:|:---:|
| Đăng ký email/số điện thoại | Có |  |  |  |  |
| Đăng ký và đăng nhập Google | Có |  |  |  |  |
| Chọn role User/Seller | Có |  |  |  |  |
| Xác minh Seller | Có |  |  |  |  |
| Tìm kiếm phòng | Có | Mở rộng |  |  | Tối ưu |
| Chi tiết và bản đồ | Có |  |  |  |  |
| Quản lý nhà trọ/phòng |  | Có |  |  |  |
| Tạo và kiểm duyệt tin |  | Có |  |  |  |
| Báo cáo tin đăng |  | Có |  |  |  |
| Nhắn tin |  |  | Có |  |  |
| Lịch xem phòng |  |  | Có |  |  |
| Quản lý khách hàng |  |  | Có |  | Mở rộng |
| Gói dịch vụ |  |  |  | Có |  |
| Thanh toán |  |  |  | Có |  |
| Đẩy và ghim tin |  |  |  | Có |  |
| Báo cáo Seller |  |  |  | Cơ bản | Nâng cao |
| Báo cáo Admin |  |  |  | Cơ bản | Nâng cao |
| Quản lý nội dung |  |  |  |  | Có |
| Gợi ý phòng |  |  |  |  | Có |

---

# 6. Mức độ ưu tiên

| Mức độ | Chức năng |
|---|---|
| Must have | Đăng ký, đăng nhập, Google OAuth, chọn role, tìm kiếm, chi tiết phòng, xác minh Seller, đăng tin, kiểm duyệt |
| Should have | Yêu thích, nhắn tin, lịch hẹn, báo cáo vi phạm, thông báo |
| Could have | Gói dịch vụ, thanh toán, đẩy tin, báo cáo nâng cao, gợi ý phòng |
| Chưa làm ở bản đầu | Hợp đồng điện tử, đặt cọc, AI, quản lý điện nước, ứng dụng mobile |

---

# 7. Câu hỏi cần xác nhận với khách hàng

## Google OAuth

1. Một email Google có được dùng cho cả User và Seller không?
2. Người dùng có được đổi role sau khi đăng ký không?
3. Có cho phép liên kết Google với tài khoản đã đăng ký thủ công không?
4. Khi hủy liên kết Google, người dùng có bắt buộc đặt mật khẩu không?
5. Có bắt buộc xác thực số điện thoại sau đăng ký Google không?

## Seller

1. Seller phải được xác minh trước khi tạo phòng hay trước khi gửi duyệt?
2. Admin cần kiểm tra những giấy tờ nào?
3. Seller là môi giới có được đăng tin không?
4. Gói Free được quản lý bao nhiêu nhà trọ?
5. Tin đăng có thời hạn bao lâu?

## User

1. User phải đăng nhập để xem địa chỉ hay chỉ để xem số điện thoại?
2. Có giới hạn số lượt liên hệ mỗi ngày không?
3. Fast Match ưu tiên lịch hẹn theo cơ chế nào?
4. Có hiển thị quảng cáo cho User Free không?

## Thanh toán

1. Sử dụng cổng thanh toán nào?
2. Có gia hạn tự động không?
3. Có hoàn tiền không?
4. Khi nâng cấp giữa kỳ, tiền còn lại được xử lý thế nào?
5. Gói hết hạn thì các tin vượt hạn mức xử lý ra sao?

---

# 8. Kết luận

Thứ tự triển khai đề xuất:

1. Xây dựng xác thực, Google OAuth và tìm kiếm phòng.
2. Cho Seller tạo phòng và Admin kiểm duyệt.
3. Hoàn thiện nhắn tin và lịch xem phòng.
4. Triển khai gói dịch vụ và thanh toán.
5. Bổ sung báo cáo, nội dung và tối ưu trải nghiệm.

Đăng ký và đăng nhập Google được đưa vào **MVP 1** để giảm thời gian tạo tài khoản và tăng tỷ lệ đăng ký. Tuy nhiên, Seller đăng ký bằng Google vẫn phải bổ sung số điện thoại và hoàn thành xác minh trước khi đăng tin công khai.
