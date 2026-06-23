import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="space-y-4">
          <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold text-lg tracking-wider inline-block">
            Locafy
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Locafy - Mạng lưới kết nối người thuê và cho thuê bất động sản, phòng trọ, căn hộ mini hàng đầu Việt Nam.
          </p>
          <div className="flex space-x-4 pt-2">
            <a href="#" className="text-slate-400 hover:text-white text-xl"><i className="fa-brands fa-facebook"></i></a>
            <a href="#" className="text-slate-400 hover:text-white text-xl"><i className="fa-brands fa-youtube"></i></a>
            <a href="#" className="text-slate-400 hover:text-white text-xl"><i className="fa-brands fa-tiktok"></i></a>
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Về chúng tôi</h4>
          <ul className="space-y-2.5 text-sm">
            <li><a href="#" className="hover:text-blue-400 transition">Giới thiệu dịch vụ</a></li>
            <li><a href="#" className="hover:text-blue-400 transition">Quy chế hoạt động</a></li>
            <li><a href="#" className="hover:text-blue-400 transition">Chính sách bảo mật</a></li>
            <li><a href="#" className="hover:text-blue-400 transition">Giải quyết khiếu nại</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Hỗ trợ khách hàng</h4>
          <ul className="space-y-2.5 text-sm">
            <li><a href="#" className="hover:text-blue-400 transition">Bảng giá dịch vụ</a></li>
            <li><a href="#" className="hover:text-blue-400 transition">Hướng dẫn đăng tin</a></li>
            <li><a href="#" className="hover:text-blue-400 transition">Quy định đăng tin</a></li>
            <li><a href="#" className="hover:text-blue-400 transition">Liên hệ trợ giúp</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Liên hệ</h4>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-start space-x-2">
              <i className="fa-solid fa-envelope mt-1 text-blue-400"></i>
              <span>hotro@locafy.vn</span>
            </li>
            <li className="flex items-start space-x-2">
              <i className="fa-solid fa-phone mt-1 text-blue-400"></i>
              <span>1900 123 456 (8:00 - 21:00)</span>
            </li>
            <li className="flex items-start space-x-2">
              <i className="fa-solid fa-location-dot mt-1 text-blue-400"></i>
              <span>Tòa nhà Locafy, Cầu Giấy, Hà Nội</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>© 2026 Locafy.vn. Toàn bộ bản quyền được bảo lưu.</p>
      </div>
    </footer>
  );
};

export default Footer;
