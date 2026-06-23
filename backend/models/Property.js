const mongoose = require('mongoose');

/**
 * Property – Nhà trọ / toà nhà (do Seller sở hữu/quản lý).
 * Một Property có nhiều Room.
 */
const PropertySchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },

    // ── Thông tin cơ bản ──────────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },

    // ── Địa chỉ ──────────────────────────────────────────────────────────
    addressLine: { type: String, required: true, trim: true }, // số nhà, ngõ, đường
    ward: { type: String, trim: true, default: null },         // phường/xã
    district: { type: String, trim: true, default: null },     // quận/huyện
    province: { type: String, trim: true, default: null },     // tỉnh/thành

    // Toạ độ bản đồ
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    // ── Hình ảnh ─────────────────────────────────────────────────────────
    imageUrls: { type: [String], default: [] },

    // ── Tiện ích chung toà nhà ────────────────────────────────────────────
    commonAmenities: { type: [String], default: [] },
    // ví dụ: ['parking', 'elevator', 'security', 'wifi', ...]

    // ── Trạng thái ────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true }, // false = ẩn khỏi hệ thống
  },
  { timestamps: true }
);

// Geo index để tìm kiếm theo khoảng cách
PropertySchema.index({ location: '2dsphere' });
PropertySchema.index({ seller: 1, isActive: 1 });

module.exports = mongoose.model('Property', PropertySchema);
