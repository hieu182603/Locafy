const mongoose = require('mongoose');

/**
 * Account – tài khoản đăng nhập của tất cả role (user, seller, admin).
 * Thông tin mở rộng theo role lưu trong SellerProfile hoặc UserPreference.
 */
const AccountSchema = new mongoose.Schema(
  {
    // ── Thông tin cơ bản ────────────────────────────────────────────────
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: true,
    },

    // ── Phân quyền ────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ['user', 'seller', 'admin'],
      required: true,
    },

    // ── Trạng thái tài khoản ─────────────────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      // false = bị khóa bởi admin
      type: Boolean,
      default: true,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },

    // ── Seller riêng ──────────────────────────────────────────────────────
    // Trạng thái xác minh seller (null với role user/admin)
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', null],
      default: null,
    },
    verificationRejectedReason: {
      type: String,
      default: null,
    },

    // ── Bảo mật ───────────────────────────────────────────────────────────
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLogoutAt: { type: Date, default: null },
  },
  {
    timestamps: true, // tự thêm createdAt, updatedAt
  }
);

// ── Index ───────────────────────────────────────────────────────────────────
AccountSchema.index({ role: 1, isActive: 1 });
AccountSchema.index({ verificationStatus: 1 });

module.exports = mongoose.model('Account', AccountSchema);
