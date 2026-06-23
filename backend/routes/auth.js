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
const OTP_TTL_MS = 5 * 60 * 1000; // 5 phút

// ── Token helpers ────────────────────────────────────────────────────────────

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
    { expiresIn: '7d' }
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

// ── 1. REGISTER ──────────────────────────────────────────────────────────────
// Gửi OTP – chưa tạo Account. Payload được lưu vào Otp document.
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

    await Otp.findOneAndUpdate(
      { email: cleanEmail },
      { code, payload, expiresAt, attempts: 0 },
      { upsert: true, new: true }
    );

    let emailSent = false;
    let devOtp = null;

    try {
      const mailRes = await sendOtpEmail(cleanEmail, code);
      emailSent = mailRes.sent;
      if (!emailSent) devOtp = code;
    } catch (e) {
      console.error('SMTP email error:', e);
      devOtp = code;
    }

    res.status(200).json({
      ok: true,
      email: cleanEmail,
      emailSent,
      ...(devOtp ? { devOtp } : {})
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Lỗi đăng ký tài khoản.' });
  }
});

// ── 2. RESEND OTP ────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ error: 'Email không hợp lệ.' });
  }

  try {
    const otpRecord = await Otp.findOne({ email: cleanEmail });
    if (!otpRecord) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu đăng ký cho email này. Vui lòng đăng ký lại.' });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    otpRecord.code = code;
    otpRecord.expiresAt = expiresAt;
    otpRecord.attempts = 0;
    await otpRecord.save();

    let emailSent = false;
    let devOtp = null;

    try {
      const mailRes = await sendOtpEmail(cleanEmail, code);
      emailSent = mailRes.sent;
      if (!emailSent) devOtp = code;
    } catch (e) {
      console.error('SMTP email error:', e);
      devOtp = code;
    }

    res.status(200).json({ ok: true, emailSent, ...(devOtp ? { devOtp } : {}) });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Lỗi gửi lại mã OTP.' });
  }
});

// ── 3. VERIFY OTP → Tạo Account ─────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanCode = String(code || '').trim();

  if (!cleanEmail || cleanCode.length !== 6) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mã OTP 6 chữ số.' });
  }

  try {
    const otpRecord = await Otp.findOne({ email: cleanEmail });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Mã OTP không tồn tại hoặc đã hết hạn.' });
    }
    if (otpRecord.expiresAt.getTime() < Date.now()) {
      await Otp.deleteOne({ email: cleanEmail });
      return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng đăng ký lại.' });
    }
    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ email: cleanEmail });
      return res.status(429).json({ error: 'Bạn đã nhập sai quá 5 lần. Vui lòng đăng ký lại.' });
    }
    if (otpRecord.code !== cleanCode) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ error: 'Mã OTP không đúng. Vui lòng thử lại.' });
    }

    const p = otpRecord.payload;

    // Kiểm tra lần cuối tránh duplicate
    const checkDuplicate = await Account.findOne({ email: p.email });
    if (checkDuplicate) {
      await Otp.deleteOne({ email: cleanEmail });
      return res.status(409).json({ error: 'Tài khoản đã được đăng ký thành công trước đó.' });
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
    await Otp.deleteOne({ email: cleanEmail });

    const token = generateAccessToken(newAccount);
    const refreshToken = generateRefreshToken(newAccount);

    res.status(200).json({
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

// ── 4. LOGIN ─────────────────────────────────────────────────────────────────
// Tìm theo email hoặc phone
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  const cleanIdentifier = String(identifier || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!cleanIdentifier || !cleanPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập email/số điện thoại và mật khẩu.' });
  }

  try {
    const user = await Account.findOne({
      $or: [
        { email: cleanIdentifier },
        { phone: cleanIdentifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Email, số điện thoại hoặc mật khẩu không đúng.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa bởi quản trị viên.' });
    }



    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email, số điện thoại hoặc mật khẩu không đúng.' });
    }

    // Cập nhật lần đăng nhập cuối
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      ok: true,
      token,
      refreshToken,
      user: getPublicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập.' });
  }
});

// ── 5. GET ME ────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await Account.findById(req.user.id).select('-password -passwordResetToken -passwordResetExpires');
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
    }
    res.status(200).json({ ok: true, user: getPublicUser(user) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
});



// ── 7. REFRESH TOKEN ─────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Thiếu Refresh Token.' });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'locafy_refresh_secret_key_2026_default_fallback'
    );
    const user = await Account.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa bởi quản trị viên.' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      ok: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    return res.status(401).json({ error: 'Refresh Token không hợp lệ hoặc đã hết hạn.' });
  }
});

module.exports = router;
