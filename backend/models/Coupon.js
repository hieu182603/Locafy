const mongoose = require('mongoose');

/**
 * Coupon – Mã giảm giá cho gói dịch vụ (MVP 4).
 */
const CouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },

    discountType: {
      type: String,
      enum: ['percent', 'fixed'],   // % hoặc số tiền cố định (VNĐ)
      required: true,
    },
    discountValue: { type: Number, required: true },  // phần trăm hoặc VNĐ
    maxDiscount: { type: Number, default: null },      // trần giảm tối đa (dùng với percent)

    // Giới hạn áp dụng
    applicablePackages: { type: [mongoose.Schema.Types.ObjectId], ref: 'ServicePackage', default: [] },
    // [] = áp dụng cho tất cả gói

    minOrderAmount: { type: Number, default: 0 },     // giá tối thiểu của gói
    maxUsageTotal: { type: Number, default: null },    // null = không giới hạn
    maxUsagePerUser: { type: Number, default: 1 },

    usedCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    description: { type: String, trim: true, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  },
  { timestamps: true }
);

CouponSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('Coupon', CouponSchema);
