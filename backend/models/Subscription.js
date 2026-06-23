const mongoose = require('mongoose');

/**
 * Subscription – Gói dịch vụ đang / đã dùng của một tài khoản.
 * Mỗi account có thể có nhiều subscription (lịch sử), nhưng chỉ 1 active.
 */
const SubscriptionSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    servicePackage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServicePackage',
      required: true,
    },
    transaction: {
      // thanh toán kích hoạt gói này
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },

    // ── Thời hạn ──────────────────────────────────────────────────────────
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },

    // ── Trạng thái ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },

    // ── Hạn mức còn lại (Seller) – snapshot từ ServicePackage lúc mua ─────
    remainingListings: { type: Number, default: null },
    remainingBoostCredits: { type: Number, default: 0 },
    remainingPinCredits: { type: Number, default: 0 },
    remainingRefreshCredits: { type: Number, default: 0 },

    // ── Ghi chú / mã giảm giá đã dùng ────────────────────────────────────
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true }, // giá thực tế đã trả
  },
  { timestamps: true }
);

SubscriptionSchema.index({ account: 1, status: 1 });
SubscriptionSchema.index({ expiresAt: 1 }); // job kiểm tra hết hạn

module.exports = mongoose.model('Subscription', SubscriptionSchema);
