const mongoose = require('mongoose');

/**
 * Transaction – Lịch sử giao dịch thanh toán gói dịch vụ.
 * Tích hợp cổng PayOS (orderCode).
 */
const TransactionSchema = new mongoose.Schema(
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

    // ── Thông tin giao dịch ───────────────────────────────────────────────
    amount: { type: Number, required: true },           // số tiền (VNĐ)
    currency: { type: String, default: 'VND' },
    description: { type: String, trim: true, default: null },

    // ── Cổng thanh toán ───────────────────────────────────────────────────
    paymentGateway: {
      type: String,
      enum: ['payos', 'vnpay', 'momo', 'manual'],
      default: 'payos',
    },
    orderCode: {
      // mã đơn hàng phía cổng thanh toán
      type: Number,
      default: null,
      sparse: true,
      unique: true,
    },
    gatewayTransactionId: { type: String, default: null }, // ID từ cổng
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'card', 'qr', 'wallet', 'manual', null],
      default: null,
    },

    // ── Mã giảm giá ───────────────────────────────────────────────────────
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },

    // ── Trạng thái ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: null },

    // ── Webhook / callback raw ────────────────────────────────────────────
    webhookData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

TransactionSchema.index({ account: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ orderCode: 1 }, { sparse: true, unique: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
