const mongoose = require('mongoose');

/**
 * Notification – Thông báo trong app cho User và Seller.
 */
const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    // ── Phân loại ─────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: [
        // Lịch hẹn
        'appointment_new',
        'appointment_confirmed',
        'appointment_proposed',
        'appointment_cancelled',
        'appointment_reminder',
        // Tin nhắn
        'message_new',
        // Listing
        'listing_approved',
        'listing_rejected',
        'listing_expiring',
        // Tài khoản
        'account_verified',
        'account_rejected',
        // Gói dịch vụ
        'subscription_activated',
        'subscription_expiring',
        'subscription_expired',
        // Thanh toán
        'payment_success',
        'payment_failed',
        // Hệ thống
        'system',
      ],
      required: true,
    },

    title: { type: String, required: true, trim: true },
    body: { type: String, trim: true, default: null },

    // ── Liên kết sâu (deep link) ──────────────────────────────────────────
    // entityType và entityId để FE điều hướng khi nhấn thông báo
    entityType: {
      type: String,
      enum: ['listing', 'appointment', 'conversation', 'subscription', 'payment', null],
      default: null,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // ── Trạng thái ────────────────────────────────────────────────────────
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Tự xoá thông báo cũ hơn 90 ngày
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('Notification', NotificationSchema);
