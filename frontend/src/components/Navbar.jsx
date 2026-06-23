import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const getInitials = (u) => {
    return (u.name || u.username || 'U').substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-0 min-h-[64px] sm:min-h-[80px] flex flex-col md:flex-row md:items-center md:justify-between justify-center gap-2">
        <div className="flex items-center justify-between md:justify-start">
          <Link to="/" className="flex items-center space-x-2 shrink-0">
            <div className="bg-blue-600 text-white p-2 rounded-lg shrink-0">
              <i className="fa-solid fa-house-chimney text-lg"></i>
            </div>
            <span className="text-lg sm:text-xl font-extrabold text-blue-900">Locafy</span>
          </Link>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button" 
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 md:hidden" 
            aria-label="Mở menu"
          >
            <i className="fa-solid fa-bars text-lg"></i>
          </button>
        </div>

        <nav className="hidden md:flex space-x-8 font-medium">
          <Link to="/" className="text-gray-600 hover:text-blue-600">Trang Chủ</Link>
          <Link to="/phong-tro" className="text-gray-600 hover:text-blue-600">Phòng Trọ</Link>
          <a href="#" className="text-gray-600 hover:text-blue-600" onClick={(e) => { e.preventDefault(); alert("Tính năng tìm ở ghép đang được phát triển!"); }}>Tìm Ở Ghép</a>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-lg mt-2">
            <nav className="flex flex-col gap-2 text-sm font-semibold">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">Trang Chủ</Link>
              <Link to="/phong-tro" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50">Phòng Trọ</Link>
              <a href="#" className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50" onClick={(e) => { e.preventDefault(); alert("Tính năng tìm ở ghép đang được phát triển!"); }}>Tìm Ở Ghép</a>
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-1 py-2 mb-1">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full object-cover shrink-0 shadow-sm" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{getInitials(user)}</div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user.name || user.username}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <>
                      <Link to="/admin?tab=dashboard" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Trang quản trị</Link>
                      <Link to="/admin/system-settings" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Cài đặt hệ thống</Link>
                    </>
                  )}
                  {user.role === 'seller' && (
                    <>
                      <Link to="/manage?tab=overview" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Quản lý nhà trọ</Link>
                      <Link to="/manage?tab=add-listing" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Đăng tin mới</Link>
                    </>
                  )}
                  {user.role === 'user' && (
                    <>
                      <Link to="/user?tab=profile" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Cài đặt tài khoản</Link>
                      <Link to="/user?tab=appointments" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Lịch xem phòng</Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Đăng xuất</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">Đăng nhập</Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700">Đăng ký</Link>
                </>
              )}
            </div>
          </div>
        )}

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.role === 'user' && (
                <Link to="/user?tab=notifications" className="relative flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-blue-600 transition" title="Thông báo">
                  <i className="fa-regular fa-bell text-lg"></i>
                </Link>
              )}
              
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 transition duration-200 focus:outline-none cursor-pointer shadow-xs"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                      {getInitials(user)}
                    </div>
                  )}
                  <div className="text-left select-none max-w-[120px]">
                    <p className="text-xs font-bold text-gray-800 leading-tight truncate">{user.name || user.username}</p>
                    <p className="text-[9px] text-gray-400 font-semibold leading-none uppercase tracking-wider mt-0.5">
                      {user.role === 'admin' ? 'Admin' : user.role === 'seller' ? 'Chủ trọ' : 'Người thuê'}
                    </p>
                  </div>
                  <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{user.name || user.username}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    {user.role === 'admin' && (
                      <>
                        <Link to="/admin?tab=dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"><i className="fa-solid fa-gauge text-blue-600 w-4 text-center"></i>Trang quản trị</Link>
                        <Link to="/admin/system-settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"><i className="fa-solid fa-gear text-blue-600 w-4 text-center"></i>Cài đặt hệ thống</Link>
                      </>
                    )}
                    {user.role === 'seller' && (
                      <>
                        <Link to="/manage?tab=overview" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"><i className="fa-solid fa-gauge text-blue-600 w-4 text-center"></i>Quản lý nhà trọ</Link>
                        <Link to="/manage?tab=add-listing" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"><i className="fa-solid fa-circle-plus text-blue-600 w-4 text-center"></i>Đăng tin mới</Link>
                      </>
                    )}
                    {user.role === 'user' && (
                      <>
                        <Link to="/user?tab=profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"><i className="fa-solid fa-gear text-blue-600 w-4 text-center"></i>Cài đặt tài khoản</Link>
                        <Link to="/user?tab=appointments" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"><i className="fa-solid fa-calendar-check text-blue-600 w-4 text-center"></i>Lịch xem phòng</Link>
                        <Link to="/user?tab=favorites" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"><i className="fa-solid fa-heart text-blue-600 w-4 text-center"></i>Yêu thích</Link>
                      </>
                    )}
                    <hr className="border-gray-100 my-1" />
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium text-left"><i className="fa-solid fa-right-from-bracket w-4 text-center"></i>Đăng xuất</button>
                  </div>
                )}
              </div>
              
              {user.role === 'seller' && (
                <Link to="/manage?tab=add-listing" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md transition flex items-center space-x-1">
                  <i className="fa-solid fa-circle-plus"></i>
                  <span>Đăng Tin Miễn Phí</span>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Đăng nhập</Link>
              <Link to="/register" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">Đăng ký</Link>
              <Link to="/login?redirect=manage/seller-post" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-md transition flex items-center space-x-1">
                <i className="fa-solid fa-circle-plus"></i>
                <span className="whitespace-nowrap">Đăng Tin Miễn Phí</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
