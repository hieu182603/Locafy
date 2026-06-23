const mongoose = require('mongoose');

/**
 * Otp – Mã xác thực một lần (email hoặc SMS).
 * Tự xoá sau khi hết hạn nhờ TTL index.
 */
const OtpSchema = new mongoose.Schema(
  {
    // Định danh nhận OTP (email hoặc số điện thoại)
    target: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    targetType: {
      type: String,
      enum: ['email', 'phone'],
      default: 'email',
    },

    code: {
      type: String,
      required: true,
      trim: true,
    },

    purpose: {
      type: String,
      enum: [
        'register',        // xác thực đăng ký
        'login',           // đăng nhập OTP
        'reset_password',  // đặt lại mật khẩu
        'verify_phone',    // xác minh số điện thoại
      ],
      required: true,
    },

    // Payload tuỳ ý (lưu dữ liệu tạm khi đăng ký)
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB tự xoá khi quá expiresAt
    },

    attempts: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Chỉ cho phép 1 OTP active cùng lúc cho mỗi (target, purpose)
OtpSchema.index({ target: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model('Otp', OtpSchema);
