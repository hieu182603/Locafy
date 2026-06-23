const mongoose = require('mongoose');

/**
 * SellerProfile – thông tin bổ sung của Seller (1-1 với Account).
 * Tách ra để Account không phình to và dễ mở rộng sau.
 */
const SellerProfileSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      unique: true,
    },

    // ── Loại seller ──────────────────────────────────────────────────────
    sellerType: {
      type: String,
      enum: ['owner', 'manager', 'broker'], // chủ trọ, quản lý, môi giới
      required: true,
    },

    // ── Thông tin kinh doanh ──────────────────────────────────────────────
    businessName: { type: String, trim: true, default: null },
    contactAddress: { type: String, trim: true, default: null },
    description: { type: String, trim: true, default: null },

    // ── Giấy tờ xác minh ──────────────────────────────────────────────────
    idCardFrontUrl: { type: String, default: null },   // CCCD mặt trước
    idCardBackUrl: { type: String, default: null },    // CCCD mặt sau
    propertyDocUrls: { type: [String], default: [] },  // giấy tờ nhà/quản lý

    verificationSubmittedAt: { type: Date, default: null },

    // ── Gói dịch vụ đang dùng (ref sang Subscription) ─────────────────────
    // (không đặt trực tiếp – dùng Subscription để tra cứu)

    // ── Thống kê nhanh (cache, cập nhật bởi job/hook) ────────────────────
    totalProperties: { type: Number, default: 0 },
    totalListings: { type: Number, default: 0 },
    totalActiveListings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SellerProfile', SellerProfileSchema);
