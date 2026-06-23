import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { LocafyApi } from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Password strength
  const strength = (() => {
    if (!newPass) return 0;
    let s = 0;
    if (newPass.length >= 8) s++;
    if (/[A-Z]/.test(newPass)) s++;
    if (/[0-9]/.test(newPass)) s++;
    if (/[^A-Za-z0-9]/.test(newPass)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-green-500'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPass.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPass !== confirmPass) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!token) {
      setErrorMsg('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      return;
    }
    setLoading(true);
    try {
      await LocafyApi.resetPassword({ token, newPassword: newPass });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng gửi yêu cầu mới.');
    } finally {
      setLoading(false);
    }
  };

  // No token provided
  const invalidToken = !token;

  return (
    <main className="min-h-screen md:h-screen w-full flex flex-col md:flex-row bg-surface">
      {/* Back button */}
      <Link
        to="/login"
        className="absolute top-6 left-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 md:bg-white/15 md:hover:bg-white/25 md:text-white md:backdrop-blur-md md:border md:border-white/20 shadow-sm transition-all"
        title="Quay lại đăng nhập"
      >
        <i className="fa-solid fa-arrow-left text-[18px]" />
      </Link>

      {/* Left Side: Hero */}
      <section className="hidden md:flex relative w-1/2 h-full overflow-hidden">
        <img
          alt="Modern apartment interior"
          className="absolute inset-0 w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/20 to-transparent" />
        <div className="relative z-10 self-end p-16 w-full max-w-2xl">
          <h1 className="font-bold text-4xl text-white mb-4 leading-tight">
            Tạo mật khẩu mới an toàn.
          </h1>
          <p className="text-white/80 text-lg">
            Chọn mật khẩu mạnh để bảo vệ tài khoản Locafy của bạn.
          </p>
        </div>
      </section>

      {/* Right Side: Form */}
      <section className="flex-1 min-h-screen md:h-full flex items-center justify-center p-4 bg-stone-50 overflow-y-auto md:overflow-y-hidden">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white p-6 md:p-7 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-stone-200/50">

            {/* Icon header */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                <i className="fa-solid fa-shield-halved text-blue-600 text-xl" />
              </div>
              <h2 className="text-2xl font-bold text-blue-950 mb-1">Đặt lại mật khẩu</h2>
              <p className="text-sm text-stone-500">
                Tạo mật khẩu mới ít nhất 6 ký tự để đăng nhập lại vào tài khoản.
              </p>
            </div>

            {/* Invalid token state */}
            {invalidToken && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fa-solid fa-triangle-exclamation text-red-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800">Liên kết không hợp lệ</p>
                    <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                      Liên kết đặt lại mật khẩu này không hợp lệ hoặc đã hết hạn (có hiệu lực trong 15 phút).
                    </p>
                  </div>
                </div>
                <Link
                  to="/forgot-password"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all text-sm"
                >
                  <i className="fa-solid fa-rotate-left" />
                  Gửi lại yêu cầu mới
                </Link>
              </div>
            )}

            {/* Success state */}
            {!invalidToken && success && (
              <div className="space-y-5">
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fa-solid fa-circle-check text-green-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-800">Đặt lại thành công!</p>
                    <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                      Mật khẩu mới đã được lưu. Bạn sẽ được chuyển về trang đăng nhập sau 4 giây.
                    </p>
                  </div>
                </div>
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all text-sm"
                >
                  <i className="fa-solid fa-right-to-bracket" />
                  Đăng nhập ngay
                </Link>
              </div>
            )}

            {/* Form */}
            {!invalidToken && !success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div className="space-y-1.5">
                  <label htmlFor="newPass" className="text-xs font-semibold text-stone-600 block ml-1">
                    Mật khẩu mới <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                      <i className="fa-solid fa-lock text-[14px]" />
                    </div>
                    <input
                      id="newPass"
                      type={showNew ? 'text' : 'password'}
                      required
                      autoFocus
                      autoComplete="new-password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full pl-10 pr-12 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <i className={showNew ? 'fa-solid fa-eye-slash text-[16px]' : 'fa-solid fa-eye text-[16px]'} />
                    </button>
                  </div>

                  {/* Password strength bar */}
                  {newPass && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-stone-200'}`}
                          />
                        ))}
                      </div>
                      <p className={`text-[10px] font-bold ${['', 'text-red-500', 'text-amber-500', 'text-yellow-600', 'text-green-600'][strength]}`}>
                        {strengthLabel && `Độ mạnh: ${strengthLabel}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPass" className="text-xs font-semibold text-stone-600 block ml-1">
                    Xác nhận mật khẩu <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                      <i className="fa-solid fa-lock-open text-[14px]" />
                    </div>
                    <input
                      id="confirmPass"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className={`w-full pl-10 pr-12 py-2.5 bg-stone-50 border rounded-xl focus:ring-4 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400 ${
                        confirmPass && confirmPass !== newPass
                          ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                          : confirmPass && confirmPass === newPass
                          ? 'border-green-300 focus:ring-green-500/10 focus:border-green-500'
                          : 'border-stone-200 focus:ring-blue-500/10 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <i className={showConfirm ? 'fa-solid fa-eye-slash text-[16px]' : 'fa-solid fa-eye text-[16px]'} />
                    </button>
                    {/* Match indicator */}
                    {confirmPass && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        {confirmPass === newPass ? (
                          <i className="fa-solid fa-circle-check text-green-500 text-sm" />
                        ) : (
                          <i className="fa-solid fa-circle-xmark text-red-400 text-sm" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Password requirements */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Yêu cầu mật khẩu</p>
                  {[
                    { check: newPass.length >= 8, label: 'Ít nhất 8 ký tự' },
                    { check: /[A-Z]/.test(newPass), label: 'Có chữ hoa' },
                    { check: /[0-9]/.test(newPass), label: 'Có chữ số' },
                    { check: /[^A-Za-z0-9]/.test(newPass), label: 'Có ký tự đặc biệt (!@#$...)' },
                  ].map(({ check, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <i className={`fa-solid ${check ? 'fa-circle-check text-green-500' : 'fa-circle text-stone-300'} text-xs`} />
                      <span className={`text-[11px] ${check ? 'text-green-700 font-semibold' : 'text-stone-500'}`}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Error message */}
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !newPass || !confirmPass}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fa-solid fa-spinner fa-spin" /> Đang cập nhật...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fa-solid fa-check" /> Đặt lại mật khẩu
                    </span>
                  )}
                </button>

                {/* Back link */}
                <p className="text-center text-sm text-stone-500">
                  <Link to="/forgot-password" className="text-blue-700 font-bold hover:text-blue-800 transition-colors">
                    <i className="fa-solid fa-arrow-left text-xs mr-1" /> Gửi lại yêu cầu
                  </Link>
                </p>
              </form>
            )}

            {/* Footer links */}
            <div className="mt-6 flex justify-center gap-8 opacity-40">
              <span className="text-[10px] uppercase tracking-widest font-bold">Privacy</span>
              <span className="text-[10px] uppercase tracking-widest font-bold">Terms</span>
              <span className="text-[10px] uppercase tracking-widest font-bold">Help</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ResetPassword;
