const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { Account, Otp } = require('../models');
const { sendOtpEmail } = require('../utils/mailer');
const authMiddleware = require('../middlewares/authMiddleware');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(03|05|07|08|09)\d{8}$/;
const OTP_TTL_MS = 5 * 60 * 1000;       // 5 phút
const RESET_TTL_MS = 15 * 60 * 1000;    // 15 phút

// ── Token helpers ─────────────────────────────────────────────────────────────

function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'locafy_secret_key_2026_super_secure_fallback',
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'locafy_refresh_secret_key_2026_default_fallback',
    { expiresIn: '30d' }
  );
}

function getPublicUser(user) {
  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    isActive: user.isActive,
    isProfileComplete: user.isProfileComplete,
    verificationStatus: user.verificationStatus || null,
  };
}

// ── 1. REGISTER – Gửi OTP (chưa tạo Account) ────────────────────────────────
// POST /api/auth/register
// Body: { email, phone, password, name, role }
router.post('/register', async (req, res) => {
  const { email, phone, password, name, role } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim();
  const cleanPassword = String(password || '');
  const cleanName = String(name || '').trim();
  const finalRole = role === 'seller' ? 'seller' : 'user';

  if (!cleanEmail || !cleanPhone || !cleanPassword || !cleanName) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin (email, phone, password, name).' });
  }
  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Email không hợp lệ.' });
  }
  if (!PHONE_RE.test(cleanPhone)) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ (10 số, đầu 03/05/07/08/09).' });
  }
  if (cleanPassword.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  try {
    const existingEmail = await Account.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email đã tồn tại. Vui lòng đăng nhập.' });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const code = String(crypto.randomInt(100000, 1000000));
    const payload = { name: cleanName, email: cleanEmail, phone: cleanPhone, password: passwordHash, role: finalRole };
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Dùng đúng field: target + purpose (theo OtpSchema)
    await Otp.findOneAndUpdate(
      { target: cleanEmail, purpose: 'register' },
      { target: cleanEmail, targetType: 'email', purpose: 'register', code, payload, expiresAt, attempts: 0, isUsed: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let emailSent = false;
    let devOtp = null;
    try {
      const mailRes = await sendOtpEmail(cleanEmail, code);
      emailSent = mailRes.sent;
      if (!emailSent) devOtp = code;
    } catch (e) {
      console.error('SMTP error:', e.message);
      devOtp = code;
    }

    res.status(200).json({ ok: true, email: cleanEmail, emailSent, ...(devOtp ? { devOtp } : {}) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Lỗi đăng ký tài khoản.' });
  }
});

// ── 2. RESEND OTP ─────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// Body: { email }
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Email không hợp lệ.' });
  }

  try {
    const otpRecord = await Otp.findOne({ target: cleanEmail, purpose: 'register' });
    if (!otpRecord) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu đăng ký. Vui lòng đăng ký lại.' });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    otpRecord.code = code;
    otpRecord.expiresAt = new Date(Date.now() + OTP_TTL_MS);
    otpRecord.attempts = 0;
    otpRecord.isUsed = false;
    await otpRecord.save();

    let emailSent = false;
    let devOtp = null;
    try {
      const mailRes = await sendOtpEmail(cleanEmail, code);
      emailSent = mailRes.sent;
      if (!emailSent) devOtp = code;
    } catch (e) {
      console.error('SMTP error:', e.message);
      devOtp = code;
    }

    res.status(200).json({ ok: true, emailSent, ...(devOtp ? { devOtp } : {}) });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Lỗi gửi lại mã OTP.' });
  }
});

// ── 3. VERIFY OTP → Tạo Account ──────────────────────────────────────────────
// POST /api/auth/verify-otp
// Body: { email, code }
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanCode = String(code || '').trim();

  if (!cleanEmail || cleanCode.length !== 6) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mã OTP 6 chữ số.' });
  }

  try {
    const otpRecord = await Otp.findOne({ target: cleanEmail, purpose: 'register' });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Mã OTP không tồn tại hoặc đã hết hạn.' });
    }
    if (otpRecord.isUsed) {
      return res.status(400).json({ error: 'Mã OTP đã được sử dụng.' });
    }
    if (otpRecord.expiresAt.getTime() < Date.now()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng đăng ký lại.' });
    }
    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({ error: 'Nhập sai quá 5 lần. Vui lòng đăng ký lại.' });
    }
    if (otpRecord.code !== cleanCode) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      return res.status(400).json({ error: `Mã OTP không đúng. Còn ${remaining} lần thử.` });
    }

    const p = otpRecord.payload;
    const checkDuplicate = await Account.findOne({ email: p.email });
    if (checkDuplicate) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(409).json({ error: 'Tài khoản đã được đăng ký trước đó. Vui lòng đăng nhập.' });
    }

    const newAccount = new Account({
      name: p.name,
      email: p.email,
      phone: p.phone,
      password: p.password,
      role: p.role || 'user',
      isEmailVerified: true,
      isPhoneVerified: false,
      isActive: true,
      isProfileComplete: true,
      verificationStatus: p.role === 'seller' ? 'pending' : null,
    });

    await newAccount.save();
    await Otp.deleteOne({ _id: otpRecord._id });

    const token = generateAccessToken(newAccount);
    const refreshToken = generateRefreshToken(newAccount);

    res.status(201).json({
      ok: true,
      token,
      refreshToken,
      user: getPublicUser(newAccount)
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Lỗi xác thực mã OTP.' });
  }
});

// ── 4. LOGIN ──────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { identifier (email|phone), password }
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  const cleanIdentifier = String(identifier || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!cleanIdentifier || !cleanPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập email/số điện thoại và mật khẩu.' });
  }

  try {
    const user = await Account.findOne({
      $or: [{ email: cleanIdentifier }, { phone: cleanIdentifier }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Email, số điện thoại hoặc mật khẩu không đúng.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa bởi quản trị viên.' });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email, số điện thoại hoặc mật khẩu không đúng.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({ ok: true, token, refreshToken, user: getPublicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập.' });
  }
});

// ── 5. GET ME ─────────────────────────────────────────────────────────────────
// GET /api/auth/me  [auth required]
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await Account.findById(req.user.id)
      .select('-password -passwordResetToken -passwordResetExpires');
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    res.status(200).json({ ok: true, user: getPublicUser(user) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
});

// ── 6. REFRESH TOKEN ──────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Body: { refreshToken }
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Thiếu refresh token.' });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'locafy_refresh_secret_key_2026_default_fallback'
    );
    const user = await Account.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'Người dùng không tồn tại.' });
    if (!user.isActive) return res.status(403).json({ error: 'Tài khoản đã bị khóa.' });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({ ok: true, token: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn.' });
  }
});

// ── 7. LOGOUT ─────────────────────────────────────────────────────────────────
// POST /api/auth/logout  [auth required]
// Client xóa token ở localStorage; endpoint này chỉ để ghi lastLogoutAt (tuỳ chọn)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Ghi thời điểm logout (có thể dùng để invalidate token nếu cần sau này)
    await Account.findByIdAndUpdate(req.user.id, { $set: { lastLogoutAt: new Date() } });
    res.status(200).json({ ok: true, message: 'Đăng xuất thành công.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
});

// ── 8. FORGOT PASSWORD – Gửi OTP đến email ───────────────────────────────────
// POST /api/auth/forgot-password
// Body: { email }
router.post('/forgot-password', async (req, res) => {
  const cleanEmail = String(req.body.email || '').trim().toLowerCase();

  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Email không hợp lệ.' });
  }

  try {
    const user = await Account.findOne({ email: cleanEmail });

    // Luôn trả 200 để tránh user enumeration (không lộ email tồn tại hay không)
    if (!user || !user.isActive) {
      return res.status(200).json({ ok: true, emailSent: false, message: 'Nếu email tồn tại, mã OTP sẽ được gửi đến.' });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Upsert OTP với purpose = 'reset_password'
    await Otp.findOneAndUpdate(
      { target: cleanEmail, purpose: 'reset_password' },
      { target: cleanEmail, targetType: 'email', purpose: 'reset_password', code, expiresAt, attempts: 0, isUsed: false, payload: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let emailSent = false;
    let devOtp = null;
    try {
      const mailRes = await sendOtpEmail(cleanEmail, code);
      emailSent = mailRes.sent;
      if (!emailSent) devOtp = code;
    } catch (e) {
      console.error('SMTP error:', e.message);
      devOtp = code;
    }

    res.status(200).json({
      ok: true,
      email: cleanEmail,
      emailSent,
      ...(devOtp ? { devOtp } : {})
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
});

// ── 9. VERIFY RESET OTP ───────────────────────────────────────────────────────
// POST /api/auth/verify-reset-otp
// Body: { email, code }
// Trả về resetToken (short-lived) để dùng ở bước 10
router.post('/verify-reset-otp', async (req, res) => {
  const { email, code } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanCode = String(code || '').trim();

  if (!cleanEmail || cleanCode.length !== 6) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mã OTP 6 chữ số.' });
  }

  try {
    const otpRecord = await Otp.findOne({ target: cleanEmail, purpose: 'reset_password' });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Mã OTP không tồn tại hoặc đã hết hạn.' });
    }
    if (otpRecord.isUsed) {
      return res.status(400).json({ error: 'Mã OTP đã được sử dụng.' });
    }
    if (otpRecord.expiresAt.getTime() < Date.now()) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng gửi lại.' });
    }
    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({ error: 'Nhập sai quá 5 lần. Vui lòng gửi lại.' });
    }
    if (otpRecord.code !== cleanCode) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      return res.status(400).json({ error: `Mã OTP không đúng. Còn ${remaining} lần thử.` });
    }

    // Đánh dấu đã dùng – chưa xóa, giữ để bước reset-password xác minh lại
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Tạo resetToken tạm (5 phút) để frontend dùng ở bước tiếp theo
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await Account.findOne({ email: cleanEmail });
    if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại.' });

    user.passwordResetToken = tokenHash;
    user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    // Xóa OTP sau khi đã cấp token
    await Otp.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ ok: true, resetToken: rawToken, email: cleanEmail });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
});

// ── 10. RESET PASSWORD ────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Body: { email, resetToken, newPassword }
router.post('/reset-password', async (req, res) => {
  const { resetToken, email, newPassword } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(newPassword || '');

  if (!resetToken || !cleanEmail || cleanPassword.length < 6) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ. Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(String(resetToken)).digest('hex');

    const user = await Account.findOne({
      email: cleanEmail,
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }

    user.password = await bcrypt.hash(cleanPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.status(200).json({ ok: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
});

// ── 10. CHANGE PASSWORD ───────────────────────────────────────────────────────
// POST /api/auth/change-password  [auth required]
// Body: { currentPassword, newPassword }
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const cleanCurrent = String(currentPassword || '');
  const cleanNew = String(newPassword || '');

  if (!cleanCurrent || cleanNew.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
  }
  if (cleanCurrent === cleanNew) {
    return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
  }

  try {
    const user = await Account.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });

    const isMatch = await bcrypt.compare(cleanCurrent, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }

    user.password = await bcrypt.hash(cleanNew, 10);
    await user.save();

    res.status(200).json({ ok: true, message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
});

module.exports = router;
