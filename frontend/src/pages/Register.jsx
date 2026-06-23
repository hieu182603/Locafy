import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LocafyApi } from '../services/api';

// Regex validators
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_VN_REGEX = /^(03|05|07|08|09)\d{8}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{4,}$/;

const Register = () => {
  const { register, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  // Step: 1 = role selection, 2 = form info, 3 = OTP
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('user'); // 'user' | 'seller'

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP – 6 individual boxes
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // Resend countdown
  const [resendSeconds, setResendSeconds] = useState(0);
  const resendTimerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const getRedirectPath = (u) => {
    if (redirect) return decodeURIComponent(redirect);
    if (u.role === 'seller') return '/manage?tab=verify&welcome=1';
    return '/user?tab=profile&welcome=1';
  };


  // Start resend countdown
  const startResendCountdown = () => {
    setResendSeconds(60);
    clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(resendTimerRef.current), []);

  // Validate form step 2
  const validateForm = () => {
    if (!name.trim()) return 'Vui lòng nhập tên đăng nhập.';
    if (!USERNAME_REGEX.test(name.trim())) return 'Tên đăng nhập phải chứa ít nhất 4 ký tự và chỉ gồm chữ cái, số, hoặc dấu gạch dưới.';
    if (!EMAIL_REGEX.test(email.trim())) return 'Email không hợp lệ. Vui lòng nhập đúng định dạng (ví dụ: email@domain.com).';
    if (!PHONE_VN_REGEX.test(phone.trim())) return 'Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam gồm 10 chữ số (bắt đầu 03, 05, 07, 08 hoặc 09).';
    if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
    if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp.';
    if (!agreeTerms) return 'Bạn cần đồng ý với điều khoản dịch vụ để tiếp tục.';
    return null;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);
    const res = await register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role,
    });
    setLoading(false);

    if (res.success) {
      setStep(2);
      startResendCountdown();
      if (res.data?.emailSent) {
        setInfoMsg(`Mã OTP đã được gửi đến email ${email.trim()}. Vui lòng kiểm tra hộp thư.`);
      } else if (res.data?.devOtp) {
        setInfoMsg(`[Dev Mode] Mã OTP thử nghiệm của bạn là: ${res.data.devOtp}`);
      } else {
        setInfoMsg('Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.');
      }
    } else {
      setErrorMsg(res.error || 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  // OTP box handlers
  const handleOtpChange = (index, value) => {
    const sanitized = value.replace(/\D/g, '').slice(-1);
    const next = [...otpValues];
    next[index] = sanitized;
    setOtpValues(next);
    if (sanitized && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtpValues(next);
    const lastFilled = Math.min(pasted.length, 5);
    otpRefs.current[lastFilled]?.focus();
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const code = otpValues.join('');
    if (code.length < 6) {
      setErrorMsg('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
      return;
    }

    setLoading(true);
    const res = await verifyOtp(email.trim().toLowerCase(), code);
    setLoading(false);

    if (res.success) {
      setInfoMsg('Xác thực tài khoản thành công!');
      setTimeout(() => navigate(getRedirectPath(res.user)), 1000);
    } else {
      setErrorMsg(res.error || 'Mã OTP không chính xác hoặc đã hết hạn.');
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0) return;
    setErrorMsg('');
    try {
      const data = await LocafyApi.sendOtp(email.trim().toLowerCase());
      startResendCountdown();
      if (data.emailSent) {
        setInfoMsg('Đã gửi lại mã OTP tới email của bạn.');
      } else if (data.devOtp) {
        setInfoMsg(`[Dev Mode] Mã OTP mới: ${data.devOtp}`);
      }
    } catch (err) {
      setErrorMsg(err.data?.error || 'Không gửi lại được mã OTP. Vui lòng thử lại.');
    }
  };

  return (
    <main className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row bg-stone-50 overflow-x-hidden">
      {/* Back to Home */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 lg:bg-white/15 lg:hover:bg-white/25 lg:text-white lg:backdrop-blur-md lg:border lg:border-white/20 shadow-sm transition-all"
        title="Về trang chủ"
      >
        <i className="fa-solid fa-arrow-left text-[18px]"></i>
      </Link>

      {/* Left Side: Hero */}
      <div className="hidden lg:flex w-1/2 h-full relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Căn hộ hiện đại"
            className="w-full h-full object-cover opacity-90"
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 z-10"></div>
        <div className="relative z-20 flex flex-col justify-end p-16 text-white w-full h-full">
          <div>
            <h1 className="font-bold text-4xl mb-6 max-w-md leading-tight">
              Gia nhập cộng đồng Locafy ngay hôm nay.
            </h1>
            <p className="text-lg max-w-sm opacity-90">
              Kết nối nhanh chóng với hàng ngàn phòng trọ và căn hộ chất lượng.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 min-h-screen lg:h-full overflow-y-auto lg:overflow-y-hidden flex items-center justify-center p-4 md:p-6 bg-stone-50">
        <div className="w-full max-w-[540px] bg-white p-6 md:p-7 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-stone-200/50 my-2">



          {/* ── STEP 1: Registration Form ──────────────────────────────── */}
          {(step === 1 || step === 2) && (
            <>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-blue-950 mb-1">Đăng ký tài khoản</h2>
                <p className="text-sm text-stone-500">Chào mừng bạn gia nhập cộng đồng Locafy</p>
              </div>

              {/* Role Selection */}
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2.5">Bạn là:</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`cursor-pointer border-2 py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-3 text-left ${role === 'user' ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-stone-50 hover:bg-stone-100'}`}
                >
                  <i className={`fa-solid fa-user text-[22px] ${role === 'user' ? 'text-blue-600' : 'text-stone-400'}`}></i>
                  <div>
                    <h4 className={`text-sm font-bold ${role === 'user' ? 'text-blue-700' : 'text-stone-700'}`}>Người thuê</h4>
                    <p className="text-[10px] text-stone-500 leading-tight">Tìm phòng ở</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('seller')}
                  className={`cursor-pointer border-2 py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-3 text-left ${role === 'seller' ? 'border-blue-600 bg-blue-50' : 'border-transparent bg-stone-50 hover:bg-stone-100'}`}
                >
                  <i className={`fa-solid fa-house-user text-[22px] ${role === 'seller' ? 'text-blue-600' : 'text-stone-400'}`}></i>
                  <div>
                    <h4 className={`text-sm font-bold ${role === 'seller' ? 'text-blue-700' : 'text-stone-700'}`}>Chủ trọ</h4>
                    <p className="text-[10px] text-stone-500 leading-tight">Quản lý khu trọ</p>
                  </div>
                </button>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* Username */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600 block ml-1" htmlFor="username">
                    Tên đăng nhập
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                      <i className="fa-solid fa-id-badge text-[14px]"></i>
                    </div>
                    <input
                      id="username"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="nguyenvana123"
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400"
                    />
                  </div>
                </div>

                {/* Email + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 block ml-1" htmlFor="email">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                        <i className="fa-solid fa-envelope text-[14px]"></i>
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 block ml-1" htmlFor="phone">
                      Số điện thoại
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                        <i className="fa-solid fa-phone text-[14px]"></i>
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912345678"
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Password + Confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 block ml-1" htmlFor="reg-password">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                        <i className="fa-solid fa-lock text-[14px]"></i>
                      </div>
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Ít nhất 6 ký tự"
                        className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-blue-600 transition-colors"
                      >
                        <i className={showPassword ? 'fa-solid fa-eye-slash text-[14px]' : 'fa-solid fa-eye text-[14px]'}></i>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-600 block ml-1" htmlFor="confirm-password">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-400">
                        <i className="fa-solid fa-key text-[14px]"></i>
                      </div>
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm placeholder:text-stone-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-blue-600 transition-colors"
                      >
                        <i className={showConfirmPassword ? 'fa-solid fa-eye-slash text-[14px]' : 'fa-solid fa-eye text-[14px]'}></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2 cursor-pointer group pt-1">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-stone-300 shrink-0"
                  />
                  <span className="text-xs text-stone-600 group-hover:text-stone-800 transition-colors leading-relaxed">
                    Tôi đồng ý với{' '}
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-700 font-semibold hover:underline">Điều khoản dịch vụ</a>
                    {' '}và{' '}
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-blue-700 font-semibold hover:underline">Chính sách bảo mật</a>
                    {' '}của Locafy.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[44px] bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] mt-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi OTP...
                    </span>
                  ) : 'Đăng ký'}
                </button>
              </form>

              {errorMsg && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                  <i className="fa-solid fa-triangle-exclamation shrink-0 mt-0.5"></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="mt-5 text-center">
                <p className="text-sm text-stone-500">
                  Đã có tài khoản?{' '}
                  <Link
                    className="text-blue-700 font-bold hover:underline ml-1"
                    to={redirect ? `/login?redirect=${redirect}` : '/login'}
                  >
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* ── STEP 2: OTP Verification Modal ────────────────────────── */}
          {step === 2 && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" 
                onClick={() => { setStep(1); setErrorMsg(''); setInfoMsg(''); setOtpValues(['', '', '', '', '', '']); }}
              ></div>
              
              {/* Modal Container */}
              <div className="relative bg-white w-full max-w-[400px] p-6 md:p-10 rounded-[24px] md:rounded-[32px] shadow-2xl animate-in fade-in zoom-in duration-300 z-10 text-center">
                <button 
                  type="button"
                  className="absolute top-6 right-6 text-stone-400 hover:text-blue-600 transition-colors" 
                  onClick={() => { setStep(1); setErrorMsg(''); setInfoMsg(''); setOtpValues(['', '', '', '', '', '']); }}
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
                
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-shield-halved text-blue-600 text-2xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-blue-950 mb-1">Xác thực mã OTP</h3>
                  <p className="text-sm text-stone-500">Mã xác thực 6 chữ số đã được gửi đến email của bạn:</p>
                  <p className="text-xs text-blue-600 font-semibold mt-1">{email}</p>
                </div>

                {infoMsg && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl flex items-start gap-2 text-left">
                    <i className="fa-solid fa-circle-info shrink-0 mt-0.5"></i>
                    <span>{infoMsg}</span>
                  </div>
                )}

                <form onSubmit={handleOtpSubmit}>
                  {/* 6 OTP boxes */}
                  <div className="flex justify-between gap-2 mb-6" onPaste={handleOtpPaste}>
                    {otpValues.map((val, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl bg-stone-50 border-2 border-stone-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        style={{ height: '56px' }}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[44px] bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-spinner fa-spin"></i> Đang xác nhận...
                      </span>
                    ) : 'Xác nhận mã OTP'}
                  </button>
                </form>

                {errorMsg && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 text-left">
                    <i className="fa-solid fa-triangle-exclamation shrink-0 mt-0.5"></i>
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="mt-6 text-center space-y-2">
                  <p className="text-sm text-stone-500">
                    Không nhận được mã?{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendSeconds > 0}
                      className="text-blue-700 font-bold hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {resendSeconds > 0 ? `Gửi lại (${resendSeconds}s)` : 'Gửi lại mã'}
                    </button>
                  </p>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setErrorMsg(''); setInfoMsg(''); setOtpValues(['', '', '', '', '', '']); }}
                    className="text-xs font-semibold text-stone-400 hover:text-blue-600 transition-colors"
                  >
                    <i className="fa-solid fa-arrow-left text-[10px] mr-1"></i> Quay lại chỉnh sửa thông tin
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
};

export default Register;
