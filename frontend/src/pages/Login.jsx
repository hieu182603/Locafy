import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const getRedirectPath = (u) => {
    if (redirect) return decodeURIComponent(redirect);
    if (u.role === 'admin') return '/admin?tab=dashboard';
    if (u.role === 'seller') return '/manage?tab=overview';
    return '/user?tab=profile';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const res = await login(identifier.trim(), password);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`Đăng nhập thành công! Chào mừng ${res.user.name || res.user.username}.`);
      setTimeout(() => navigate(getRedirectPath(res.user)), 1000);
    } else {
      setErrorMsg(res.error || 'Email, tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };


  return (
    <main className="min-h-screen md:h-screen w-full flex flex-col md:flex-row bg-surface">
      {/* Back to Home */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 md:bg-white/15 md:hover:bg-white/25 md:text-white md:backdrop-blur-md md:border md:border-white/20 shadow-sm transition-all"
        title="Về trang chủ"
      >
        <i className="fa-solid fa-arrow-left text-[18px]"></i>
      </Link>

      {/* Left Side: Hero */}
      <section className="hidden md:flex relative w-1/2 h-full overflow-hidden">
        <img
          alt="Luxury apartment interior"
          className="absolute inset-0 w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/20 to-transparent"></div>
        <div className="relative z-10 self-end p-16 w-full max-w-2xl">
          <h1 className="font-bold text-4xl text-white mb-4 leading-tight">
            Tìm nơi ở lý tưởng dành cho bạn.
          </h1>
          <p className="text-white/80 text-lg">
            Khám phá những không gian sống đẳng cấp, được tuyển chọn kỹ lưỡng để mang lại cảm hứng mỗi ngày.
          </p>
        </div>
      </section>

      {/* Right Side: Form */}
      <section className="flex-1 min-h-screen md:h-full flex items-center justify-center p-4 bg-stone-50 overflow-y-auto md:overflow-y-hidden">
        <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white p-6 md:p-7 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-stone-200/50">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-blue-950 mb-1">Đăng nhập</h2>
              <p className="text-sm text-stone-500">Chào mừng bạn quay trở lại với Locafy</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identifier */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 block ml-1" htmlFor="identifier">
                  Tên đăng nhập 
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                    <i className="fa-solid fa-user text-[14px]"></i>
                  </div>
                  <input
                    id="identifier"
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Tên đăng nhập hoặc email"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 block ml-1" htmlFor="password">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                    <i className="fa-solid fa-lock text-[14px]"></i>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-blue-600 transition-colors"
                  >
                    <i className={showPassword ? 'fa-solid fa-eye-slash text-[16px]' : 'fa-solid fa-eye text-[16px]'}></i>
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-stone-300"
                  />
                  <span className="text-xs text-stone-600 group-hover:text-blue-700 transition-colors">Ghi nhớ đăng nhập</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  Quên mật khẩu?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang xử lý...
                  </span>
                ) : 'Đăng nhập'}
              </button>
            </form>



            {/* Status Messages */}
            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation shrink-0"></i>
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-circle-check shrink-0"></i>
                <span>{successMsg}</span>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-stone-500">
              Chưa có tài khoản?{' '}
              <Link
                className="text-blue-700 font-bold hover:text-blue-800 transition-colors ml-1"
                to={redirect ? `/register?redirect=${redirect}` : '/register'}
              >
                Đăng ký ngay
              </Link>
            </p>

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

export default Login;
