const mongoose = require('mongoose');

/**
 * SavedSearch – Tìm kiếm đã lưu của User (MVP 5).
 * Hệ thống có thể gửi thông báo khi có tin mới khớp.
 */
const SavedSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    name: { type: String, trim: true, default: null }, // tên người dùng đặt

    // ── Bộ lọc đã lưu ────────────────────────────────────────────────────
    filters: {
      keyword: { type: String, default: null },
      area: { type: String, default: null },          // khu vực / tên trường
      district: { type: String, default: null },
      province: { type: String, default: null },
      minPrice: { type: Number, default: null },
      maxPrice: { type: Number, default: null },
      minArea: { type: Number, default: null },
      maxArea: { type: Number, default: null },
      roomType: { type: String, default: null },
      amenities: { type: [String], default: [] },
      maxOccupants: { type: Number, default: null },
      availableFrom: { type: Date, default: null },
    },

    // ── Thông báo ─────────────────────────────────────────────────────────
    notifyEnabled: { type: Boolean, default: true },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SavedSearchSchema.index({ user: 1 });

module.exports = mongoose.model('SavedSearch', SavedSearchSchema);
