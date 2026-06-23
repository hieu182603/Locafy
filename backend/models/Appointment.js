const mongoose = require('mongoose');

/**
 * Appointment – Lịch hẹn xem phòng giữa User và Seller.
 * Thay thế Booking.js cũ (Booking trong dự án này là lịch hẹn, không phải thuê).
 */
const AppointmentSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    // ── Thời gian hẹn ─────────────────────────────────────────────────────
    scheduledAt: { type: Date, required: true },

    // Seller đề xuất thời gian khác
    proposedAt: { type: Date, default: null },
    proposedNote: { type: String, default: null },

    // ── Trạng thái ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'pending',     // user vừa đặt, chờ seller xác nhận
        'confirmed',   // seller đã xác nhận
        'proposed',    // seller đề xuất thời gian khác, chờ user phản hồi
        'cancelled',   // một trong hai huỷ
        'completed',   // đã xem phòng xong
        'no_show',     // user không đến
      ],
      default: 'pending',
    },
    cancelledBy: {
      type: String,
      enum: ['user', 'seller', null],
      default: null,
    },
    cancelReason: { type: String, default: null },

    // ── Ghi chú ──────────────────────────────────────────────────────────
    userNote: { type: String, default: null },   // ghi chú từ user
    sellerNote: { type: String, default: null },  // ghi chú nội bộ seller

    // ── Phản hồi sau xem phòng ────────────────────────────────────────────
    userRating: { type: Number, min: 1, max: 5, default: null },
    userFeedback: { type: String, default: null },
  },
  { timestamps: true }
);

AppointmentSchema.index({ user: 1, status: 1 });
AppointmentSchema.index({ seller: 1, status: 1, scheduledAt: 1 });
AppointmentSchema.index({ listing: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
