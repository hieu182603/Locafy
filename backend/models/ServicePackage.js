const mongoose = require('mongoose');

/**
 * ServicePackage – Định nghĩa các gói dịch vụ do Admin tạo.
 *
 * Gói User:   Free, Fast Match
 * Gói Seller: Free, Basic, Pro, Premium
 */
const ServicePackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    // ví dụ: 'user_free', 'user_fast_match', 'seller_free', 'seller_basic', ...

    targetRole: {
      type: String,
      enum: ['user', 'seller'],
      required: true,
    },

    // ── Giá ───────────────────────────────────────────────────────────────
    price: { type: Number, required: true }, // 0 = miễn phí
    durationDays: { type: Number, required: true }, // thời hạn (ngày)

    // ── Hạn mức Seller ────────────────────────────────────────────────────
    maxListings: { type: Number, default: null },     // null = không giới hạn
    maxProperties: { type: Number, default: null },
    boostCredits: { type: Number, default: 0 },       // lượt đẩy tin
    pinCredits: { type: Number, default: 0 },         // lượt ghim tin
    refreshCredits: { type: Number, default: 0 },     // lượt làm mới

    // ── Quyền lợi User ────────────────────────────────────────────────────
    hasFastMatch: { type: Boolean, default: false },
    maxDailyContacts: { type: Number, default: null }, // null = không giới hạn

    // ── Hiển thị ─────────────────────────────────────────────────────────
    description: { type: String, trim: true, default: null },
    features: { type: [String], default: [] }, // danh sách tính năng hiển thị
    isHighlighted: { type: Boolean, default: false }, // highlight trên trang gói

    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ServicePackage', ServicePackageSchema);
