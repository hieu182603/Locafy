import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LocafyApi } from '../services/api';

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await LocafyApi.forgotPassword({ identifier: identifier.trim() });
      setSent(true);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

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
          alt="Cozy room interior"
          className="absolute inset-0 w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/20 to-transparent" />
        <div className="relative z-10 self-end p-16 w-full max-w-2xl">
          <h1 className="font-bold text-4xl text-white mb-4 leading-tight">
            Khôi phục tài khoản của bạn.
          </h1>
          <p className="text-white/80 text-lg">
            Nhập email hoặc số điện thoại để nhận hướng dẫn đặt lại mật khẩu.
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
                <i className="fa-solid fa-key text-blue-600 text-xl" />
              </div>
              <h2 className="text-2xl font-bold text-blue-950 mb-1">Quên mật khẩu?</h2>
              <p className="text-sm text-stone-500">
                Nhập email hoặc số điện thoại đã đăng ký. Chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu.
              </p>
            </div>

            {/* Success state */}
            {sent ? (
              <div className="space-y-5">
                <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fa-solid fa-circle-check text-green-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-800">Đã gửi thành công!</p>
                    <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                      Kiểm tra email hoặc tin nhắn SMS. Liên kết đặt lại mật khẩu có hiệu lực trong <strong>15 phút</strong>.
                    </p>
                  </div>
                </div>

                {/* Steps guidance */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">Các bước tiếp theo</p>
                  {[
                    { step: '1', text: 'Mở email hoặc tin nhắn đã nhận' },
                    { step: '2', text: 'Nhấn vào liên kết đặt lại mật khẩu' },
                    { step: '3', text: 'Tạo mật khẩu mới an toàn' },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                        {step}
                      </div>
                      <p className="text-xs text-stone-700">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setSent(false); setIdentifier(''); }}
                    className="flex-1 py-2.5 border border-stone-200 bg-white text-stone-700 font-semibold rounded-full text-sm hover:bg-stone-50 transition-all cursor-pointer"
                  >
                    Thử lại
                  </button>
                  <Link
                    to="/login"
                    className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-full text-sm text-center hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                  >
                    Về đăng nhập
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Identifier field */}
                <div className="space-y-1.5">
                  <label htmlFor="identifier" className="text-xs font-semibold text-stone-600 block ml-1">
                    Email hoặc số điện thoại <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                      <i className="fa-solid fa-envelope text-[14px]" />
                    </div>
                    <input
                      id="identifier"
                      type="text"
                      required
                      autoFocus
                      autoComplete="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="example@email.com hoặc 0912345678"
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400"
                    />
                  </div>
                </div>

                {/* Error message */}
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Info note */}
                <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                  <i className="fa-solid fa-circle-info text-blue-500 text-xs mt-0.5 shrink-0" />
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Nếu tài khoản tồn tại, bạn sẽ nhận được email hoặc SMS với hướng dẫn đặt lại mật khẩu trong vòng vài phút.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !identifier.trim()}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fa-solid fa-spinner fa-spin" /> Đang gửi...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fa-solid fa-paper-plane" /> Gửi hướng dẫn
                    </span>
                  )}
                </button>

                {/* Back to login */}
                <p className="text-center text-sm text-stone-500">
                  Nhớ mật khẩu rồi?{' '}
                  <Link to="/login" className="text-blue-700 font-bold hover:text-blue-800 transition-colors ml-1">
                    Đăng nhập
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

export default ForgotPassword;
